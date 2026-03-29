/*
 * Copyright (c) 2024 The ZMK Contributors
 *
 * SPDX-License-Identifier: MIT
 */

#include <ctype.h>
#include <stdio.h>
#include <string.h>

#include <zephyr/logging/log.h>
#include <zephyr/settings/settings.h>
#include <zephyr/sys/util.h>

LOG_MODULE_DECLARE(zmk, CONFIG_ZMK_LOG_LEVEL);

#include <pb_encode.h>
#include <drivers/behavior.h>
#include <zmk/behavior.h>
#include <zmk/hid.h>
#include <zmk/keymap.h>
#include <zmk/matrix.h>
#include <zmk/studio/combo_subsystem.h>
#include <zmk/studio/macro_subsystem.h>
#include <zmk/studio/rpc.h>
#include <zmk/studio/runtime_behaviors.h>

ZMK_RPC_SUBSYSTEM(behaviors)

#define BEHAVIOR_RESPONSE(type, ...) ZMK_RPC_RESPONSE(behaviors, type, __VA_ARGS__)

#define BEHAVIOR_SETTINGS_SUBTREE "bb9981/studio_behaviors"
#define RUNTIME_BEHAVIOR_SETTINGS_SUBTREE "bb9981/studio_runtime_behaviors"
#define BEHAVIOR_META_SETTINGS_SUBTREE "bb9981/studio_behavior_meta"
#define BEHAVIOR_SETTINGS_NAME_LEN 48
#define MAX_BEHAVIOR_META_OVERRIDES 128

struct persisted_behavior_binding {
    char behavior_dev[BEHAVIOR_SETTINGS_NAME_LEN];
    uint32_t param1;
    uint32_t param2;
};

struct persisted_hold_tap_runtime_config {
    uint32_t tapping_term_ms;
    int32_t quick_tap_ms;
    int32_t require_prior_idle_ms;
    uint32_t flavor;
    char hold_behavior_dev[BEHAVIOR_SETTINGS_NAME_LEN];
    char tap_behavior_dev[BEHAVIOR_SETTINGS_NAME_LEN];
};

struct persisted_tap_dance_runtime_config {
    uint32_t tapping_term_ms;
    uint8_t binding_count;
    struct persisted_behavior_binding bindings[ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS];
};

struct persisted_sticky_key_runtime_config {
    uint32_t release_after_ms;
    uint8_t quick_release;
    uint8_t lazy;
    uint8_t ignore_modifiers;
    char behavior_dev[BEHAVIOR_SETTINGS_NAME_LEN];
};

struct persisted_behavior_runtime_config {
    uint8_t type;
    union {
        struct persisted_hold_tap_runtime_config hold_tap;
        struct persisted_tap_dance_runtime_config tap_dance;
        struct persisted_sticky_key_runtime_config sticky_key;
    } data;
};

struct persisted_runtime_behavior_slot {
    uint8_t active;
    char display_name[BEHAVIOR_SETTINGS_NAME_LEN];
    struct persisted_behavior_runtime_config runtime;
};

struct persisted_behavior_metadata {
    uint8_t hidden;
    char display_name[BEHAVIOR_SETTINGS_NAME_LEN];
};

struct behavior_metadata_override {
    char behavior_name[BEHAVIOR_SETTINGS_NAME_LEN];
    bool hidden;
    char display_name[BEHAVIOR_SETTINGS_NAME_LEN];
};

static struct behavior_metadata_override behavior_metadata_overrides[MAX_BEHAVIOR_META_OVERRIDES];

static struct behavior_metadata_override *find_behavior_metadata_override(const char *behavior_name,
                                                                         bool create);
static bool is_behavior_hidden(const char *behavior_name);
static const char *get_behavior_display_name_override(const char *behavior_name);

static const struct zmk_studio_runtime_behavior_slot *
runtime_slot_for_device(const struct device *device) {
    return zmk_studio_runtime_behavior_find_slot_by_device(device);
}

static bool is_active_behavior_device(const struct device *device) {
    if (!device) {
        return false;
    }

    const struct zmk_studio_runtime_behavior_slot *slot = runtime_slot_for_device(device);
    return !slot || (slot->active && *slot->active);
}

static bool is_listable_behavior_device(const struct device *device) {
    return is_active_behavior_device(device) && !is_behavior_hidden(device->name);
}

static const struct zmk_behavior_ref *find_behavior_ref(const struct device *device) {
    STRUCT_SECTION_FOREACH(zmk_behavior_ref, item) {
        if (item->device == device) {
            return item;
        }
    }

    return NULL;
}

static int resolve_behavior_id(uint32_t behavior_id, const char **behavior_name,
                               const struct device **device,
                               const struct zmk_studio_runtime_behavior_slot **slot,
                               bool allow_hidden) {
    const char *resolved_name = zmk_behavior_find_behavior_name_from_local_id(behavior_id);
    if (!resolved_name) {
        return -ENOENT;
    }

    const struct device *resolved_device = behavior_get_binding(resolved_name);
    if (!resolved_device) {
        return -ENOENT;
    }

    const struct zmk_studio_runtime_behavior_slot *resolved_slot =
        runtime_slot_for_device(resolved_device);
    if (resolved_slot && (!resolved_slot->active || !*resolved_slot->active)) {
        return -ENOENT;
    }

    if (behavior_name) {
        *behavior_name = resolved_name;
    }

    if (device) {
        *device = resolved_device;
    }

    if (slot) {
        *slot = resolved_slot;
    }

    if (!allow_hidden && is_behavior_hidden(resolved_name)) {
        return -ENOENT;
    }

    return 0;
}

static const char *resolve_active_behavior_name(uint32_t behavior_id) {
    const char *behavior_name = NULL;
    return resolve_behavior_id(behavior_id, &behavior_name, NULL, NULL, false) == 0
               ? behavior_name
               : NULL;
}

static bool normalize_display_name(char dest[BEHAVIOR_SETTINGS_NAME_LEN], const char *src) {
    if (!src) {
        return false;
    }

    while (*src != '\0' && isspace((unsigned char)*src)) {
        src++;
    }

    size_t len = strlen(src);
    while (len > 0 && isspace((unsigned char)src[len - 1])) {
        len--;
    }

    if (len == 0) {
        return false;
    }

    len = MIN(len, BEHAVIOR_SETTINGS_NAME_LEN - 1);
    memcpy(dest, src, len);
    dest[len] = '\0';
    return true;
}

static int encode_keymap_binding(const struct zmk_behavior_binding *binding,
                                 zmk_keymap_BehaviorBinding *resp) {
    if (!binding || !binding->behavior_dev) {
        return -EINVAL;
    }

    const struct zmk_studio_runtime_behavior_slot *slot =
        zmk_studio_runtime_behavior_find_slot_by_name(binding->behavior_dev);
    if (slot && (!slot->active || !*slot->active)) {
        return -ENOENT;
    }

    zmk_behavior_local_id_t behavior_id = zmk_behavior_get_local_id(binding->behavior_dev);
    if (behavior_id == UINT16_MAX) {
        return -ENOENT;
    }

    *resp = (zmk_keymap_BehaviorBinding){
        .behavior_id = behavior_id,
        .param1 = binding->param1,
        .param2 = binding->param2,
    };

    return 0;
}

static int decode_keymap_binding(const zmk_keymap_BehaviorBinding *binding,
                                 struct zmk_behavior_binding *resp) {
    const char *behavior_name = resolve_active_behavior_name(binding->behavior_id);
    if (!behavior_name) {
        return -ENOENT;
    }

    *resp = (struct zmk_behavior_binding){
        .behavior_dev = (char *)behavior_name,
        .param1 = binding->param1,
        .param2 = binding->param2,
    };

    return 0;
}

static bool encode_behavior_summaries(pb_ostream_t *stream, const pb_field_t *field,
                                      void *const *arg) {
    STRUCT_SECTION_FOREACH(zmk_behavior_local_id_map, beh) {
        if (!device_is_ready(beh->device) || !is_active_behavior_device(beh->device)) {
            continue;
        }

        if (!pb_encode_tag_for_field(stream, field)) {
            return false;
        }

        if (!pb_encode_varint(stream, beh->local_id)) {
            LOG_ERR("Failed to encode behavior ID");
            return false;
        }
    }

    return true;
}

zmk_studio_Response list_all_behaviors(const zmk_studio_Request *req) {
    LOG_DBG("");
    zmk_behaviors_ListAllBehaviorsResponse beh_resp =
        zmk_behaviors_ListAllBehaviorsResponse_init_zero;
    beh_resp.behaviors.funcs.encode = encode_behavior_summaries;

    return BEHAVIOR_RESPONSE(list_all_behaviors, beh_resp);
}

struct encode_metadata_sets_state {
    const struct behavior_parameter_metadata_set *sets;
    size_t sets_len;
    size_t i;
};

static bool encode_value_description_name(pb_ostream_t *stream, const pb_field_t *field,
                                          void *const *arg) {
    struct behavior_parameter_value_metadata *state =
        (struct behavior_parameter_value_metadata *)*arg;

    if (!state->display_name) {
        return true;
    }

    if (!pb_encode_tag_for_field(stream, field)) {
        return false;
    }

    return pb_encode_string(stream, state->display_name, strlen(state->display_name));
}

static bool encode_value_description(pb_ostream_t *stream, const pb_field_t *field,
                                     void *const *arg) {
    struct encode_metadata_sets_state *state = (struct encode_metadata_sets_state *)*arg;

    const struct behavior_parameter_metadata_set *set = &state->sets[state->i];

    bool is_param1 = field->tag == zmk_behaviors_BehaviorBindingParametersSet_param1_tag;
    size_t values_len = is_param1 ? set->param1_values_len : set->param2_values_len;
    const struct behavior_parameter_value_metadata *values =
        is_param1 ? set->param1_values : set->param2_values;

    for (int val_i = 0; val_i < values_len; val_i++) {
        const struct behavior_parameter_value_metadata *val = &values[val_i];

        if (!pb_encode_tag_for_field(stream, field)) {
            return false;
        }

        zmk_behaviors_BehaviorParameterValueDescription desc =
            zmk_behaviors_BehaviorParameterValueDescription_init_zero;
        desc.name.funcs.encode = encode_value_description_name;
        desc.name.arg = (void *)val;

        switch (val->type) {
        case BEHAVIOR_PARAMETER_VALUE_TYPE_VALUE:
            desc.which_value_type = zmk_behaviors_BehaviorParameterValueDescription_constant_tag;
            desc.value_type.constant = val->value;
            break;
        case BEHAVIOR_PARAMETER_VALUE_TYPE_RANGE:
            desc.which_value_type = zmk_behaviors_BehaviorParameterValueDescription_range_tag;
            desc.value_type.range.min = val->range.min;
            desc.value_type.range.max = val->range.max;
            break;
        case BEHAVIOR_PARAMETER_VALUE_TYPE_NIL:
            desc.which_value_type = zmk_behaviors_BehaviorParameterValueDescription_nil_tag;
            break;
        case BEHAVIOR_PARAMETER_VALUE_TYPE_HID_USAGE:
            desc.which_value_type = zmk_behaviors_BehaviorParameterValueDescription_hid_usage_tag;
            desc.value_type.hid_usage.consumer_max = ZMK_HID_CONSUMER_MAX_USAGE;
            desc.value_type.hid_usage.keyboard_max = ZMK_HID_KEYBOARD_MAX_USAGE;
            break;
        case BEHAVIOR_PARAMETER_VALUE_TYPE_LAYER_ID:
            desc.which_value_type = zmk_behaviors_BehaviorParameterValueDescription_layer_id_tag;
            break;
        default:
            LOG_ERR("Unknown value description type %d", val->type);
            return false;
        }

        if (!pb_encode_submessage(stream, &zmk_behaviors_BehaviorParameterValueDescription_msg,
                                  &desc)) {
            LOG_WRN("Failed to encode submessage for set %d, value %d!", state->i, val_i);
            return false;
        }
    }

    return true;
}

static bool encode_metadata_sets(pb_ostream_t *stream, const pb_field_t *field, void *const *arg) {
    struct encode_metadata_sets_state *state = (struct encode_metadata_sets_state *)*arg;

    for (int i = 0; i < state->sets_len; i++) {
        if (!pb_encode_tag_for_field(stream, field)) {
            return false;
        }

        state->i = i;
        zmk_behaviors_BehaviorBindingParametersSet msg =
            zmk_behaviors_BehaviorBindingParametersSet_init_zero;
        msg.param1.funcs.encode = encode_value_description;
        msg.param1.arg = state;
        msg.param2.funcs.encode = encode_value_description;
        msg.param2.arg = state;

        if (!pb_encode_submessage(stream, &zmk_behaviors_BehaviorBindingParametersSet_msg, &msg)) {
            LOG_WRN("Failed to encode submessage for set %d", i);
            return false;
        }
    }

    return true;
}

struct encode_string_state {
    const char *value;
};

static bool encode_string_value(pb_ostream_t *stream, const pb_field_t *field, void *const *arg) {
    const struct encode_string_state *state = (const struct encode_string_state *)*arg;

    if (!state->value) {
        return true;
    }

    if (!pb_encode_tag_for_field(stream, field)) {
        return false;
    }

    return pb_encode_string(stream, state->value, strlen(state->value));
}

static struct encode_metadata_sets_state metadata_state = {};

static const char *get_behavior_display_name(const char *behavior_name,
                                             const struct zmk_behavior_ref *zbm) {
    const char *display_name = get_behavior_display_name_override(behavior_name);

    if ((!display_name || display_name[0] == '\0') && zbm) {
        display_name = zbm->metadata.display_name;
    }

    if (!display_name || display_name[0] == '\0') {
        display_name = behavior_name;
    }

    return display_name;
}

zmk_studio_Response get_behavior_details(const zmk_studio_Request *req) {
    const uint32_t behavior_id =
        req->subsystem.behaviors.request_type.get_behavior_details.behavior_id;
    const char *behavior_name = NULL;
    const struct device *device = NULL;
    const struct zmk_studio_runtime_behavior_slot *slot = NULL;

    if (resolve_behavior_id(behavior_id, &behavior_name, &device, &slot, true) < 0) {
        LOG_WRN("No behavior found for ID %d", behavior_id);
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    const struct zmk_behavior_ref *zbm = find_behavior_ref(device);
    if (!zbm) {
        LOG_WRN("Can't find behavior metadata for %s", behavior_name);
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    struct behavior_parameter_metadata desc = {0};
    int ret = behavior_get_parameter_metadata(device, &desc);
    if (ret < 0) {
        LOG_DBG("Failed to fetch the metadata for %s! %d", behavior_name, ret);
    }

    struct encode_string_state display_name_state = {
        .value = get_behavior_display_name(behavior_name, zbm),
    };

    zmk_behaviors_GetBehaviorDetailsResponse resp =
        zmk_behaviors_GetBehaviorDetailsResponse_init_zero;
    resp.id = behavior_id;
    resp.display_name.funcs.encode = encode_string_value;
    resp.display_name.arg = &display_name_state;
    resp.is_user_defined = slot != NULL;

    metadata_state.sets = desc.sets;
    metadata_state.sets_len = desc.sets_len;

    resp.metadata.funcs.encode = encode_metadata_sets;
    resp.metadata.arg = &metadata_state;

    return BEHAVIOR_RESPONSE(get_behavior_details, resp);
}

static void copy_behavior_name(char dest[BEHAVIOR_SETTINGS_NAME_LEN], const char *src) {
    if (!src) {
        dest[0] = '\0';
        return;
    }

    strncpy(dest, src, BEHAVIOR_SETTINGS_NAME_LEN - 1);
    dest[BEHAVIOR_SETTINGS_NAME_LEN - 1] = '\0';
}

static struct behavior_metadata_override *find_behavior_metadata_override(const char *behavior_name,
                                                                         bool create) {
    if (!behavior_name || behavior_name[0] == '\0') {
        return NULL;
    }

    for (size_t i = 0; i < ARRAY_SIZE(behavior_metadata_overrides); i++) {
        struct behavior_metadata_override *entry = &behavior_metadata_overrides[i];

        if (entry->behavior_name[0] != '\0' && strcmp(entry->behavior_name, behavior_name) == 0) {
            return entry;
        }
    }

    if (!create) {
        return NULL;
    }

    for (size_t i = 0; i < ARRAY_SIZE(behavior_metadata_overrides); i++) {
        struct behavior_metadata_override *entry = &behavior_metadata_overrides[i];

        if (entry->behavior_name[0] == '\0') {
            copy_behavior_name(entry->behavior_name, behavior_name);
            entry->hidden = false;
            entry->display_name[0] = '\0';
            return entry;
        }
    }

    return NULL;
}

static bool is_behavior_hidden(const char *behavior_name) {
    const struct behavior_metadata_override *entry =
        find_behavior_metadata_override(behavior_name, false);
    return entry ? entry->hidden : false;
}

static const char *get_behavior_display_name_override(const char *behavior_name) {
    const struct behavior_metadata_override *entry =
        find_behavior_metadata_override(behavior_name, false);
    return entry && entry->display_name[0] != '\0' ? entry->display_name : NULL;
}

static int save_behavior_metadata(const char *behavior_name, bool hidden,
                                  const char *display_name_override) {
#if IS_ENABLED(CONFIG_SETTINGS)
    if (!behavior_name || behavior_name[0] == '\0') {
        return -EINVAL;
    }

    struct persisted_behavior_metadata persisted = {
        .hidden = hidden,
    };
    copy_behavior_name(persisted.display_name, display_name_override);

    char path[96];
    snprintf(path, sizeof(path), "%s/%s", BEHAVIOR_META_SETTINGS_SUBTREE, behavior_name);
    return settings_save_one(path, &persisted, sizeof(persisted));
#else
    ARG_UNUSED(behavior_name);
    ARG_UNUSED(hidden);
    ARG_UNUSED(display_name_override);
    return 0;
#endif
}

static int delete_behavior_runtime_config(const char *behavior_name) {
#if IS_ENABLED(CONFIG_SETTINGS)
    if (!behavior_name || behavior_name[0] == '\0') {
        return -EINVAL;
    }

    char path[96];
    snprintf(path, sizeof(path), "%s/%s", BEHAVIOR_SETTINGS_SUBTREE, behavior_name);
    return settings_delete(path);
#else
    ARG_UNUSED(behavior_name);
    return 0;
#endif
}

static int save_behavior_runtime_config(const char *behavior_name,
                                        const struct behavior_runtime_config *config) {
    struct persisted_behavior_runtime_config persisted = {0};

    persisted.type = config->type;

    switch (config->type) {
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP:
        persisted.data.hold_tap.tapping_term_ms = config->data.hold_tap.tapping_term_ms;
        persisted.data.hold_tap.quick_tap_ms = config->data.hold_tap.quick_tap_ms;
        persisted.data.hold_tap.require_prior_idle_ms =
            config->data.hold_tap.require_prior_idle_ms;
        persisted.data.hold_tap.flavor = config->data.hold_tap.flavor;
        copy_behavior_name(persisted.data.hold_tap.hold_behavior_dev,
                           config->data.hold_tap.hold_behavior_dev);
        copy_behavior_name(persisted.data.hold_tap.tap_behavior_dev,
                           config->data.hold_tap.tap_behavior_dev);
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE:
        if (config->data.tap_dance.binding_count > ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS) {
            return -EINVAL;
        }

        persisted.data.tap_dance.tapping_term_ms = config->data.tap_dance.tapping_term_ms;
        persisted.data.tap_dance.binding_count = config->data.tap_dance.binding_count;
        for (size_t i = 0; i < config->data.tap_dance.binding_count; i++) {
            copy_behavior_name(persisted.data.tap_dance.bindings[i].behavior_dev,
                               config->data.tap_dance.bindings[i].behavior_dev);
            persisted.data.tap_dance.bindings[i].param1 = config->data.tap_dance.bindings[i].param1;
            persisted.data.tap_dance.bindings[i].param2 = config->data.tap_dance.bindings[i].param2;
        }
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY:
        persisted.data.sticky_key.release_after_ms = config->data.sticky_key.release_after_ms;
        persisted.data.sticky_key.quick_release = config->data.sticky_key.quick_release;
        persisted.data.sticky_key.lazy = config->data.sticky_key.lazy;
        persisted.data.sticky_key.ignore_modifiers = config->data.sticky_key.ignore_modifiers;
        copy_behavior_name(persisted.data.sticky_key.behavior_dev,
                           config->data.sticky_key.behavior_dev);
        break;
    default:
        return -EINVAL;
    }

#if IS_ENABLED(CONFIG_SETTINGS)
    char path[96];
    snprintf(path, sizeof(path), "%s/%s", BEHAVIOR_SETTINGS_SUBTREE, behavior_name);
    return settings_save_one(path, &persisted, sizeof(persisted));
#else
    return 0;
#endif
}

static int save_runtime_behavior_slot(
    const struct zmk_studio_runtime_behavior_slot *slot,
    const struct behavior_runtime_config *config) {
#if IS_ENABLED(CONFIG_SETTINGS)
    if (!slot || !slot->device || !slot->active || !*slot->active) {
        return -EINVAL;
    }

    struct persisted_runtime_behavior_slot persisted = {0};
    persisted.active = 1;
    copy_behavior_name(persisted.display_name, slot->display_name);

    persisted.runtime.type = config->type;

    switch (config->type) {
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP:
        persisted.runtime.data.hold_tap.tapping_term_ms = config->data.hold_tap.tapping_term_ms;
        persisted.runtime.data.hold_tap.quick_tap_ms = config->data.hold_tap.quick_tap_ms;
        persisted.runtime.data.hold_tap.require_prior_idle_ms =
            config->data.hold_tap.require_prior_idle_ms;
        persisted.runtime.data.hold_tap.flavor = config->data.hold_tap.flavor;
        copy_behavior_name(persisted.runtime.data.hold_tap.hold_behavior_dev,
                           config->data.hold_tap.hold_behavior_dev);
        copy_behavior_name(persisted.runtime.data.hold_tap.tap_behavior_dev,
                           config->data.hold_tap.tap_behavior_dev);
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE:
        if (config->data.tap_dance.binding_count > ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS) {
            return -EINVAL;
        }

        persisted.runtime.data.tap_dance.tapping_term_ms = config->data.tap_dance.tapping_term_ms;
        persisted.runtime.data.tap_dance.binding_count = config->data.tap_dance.binding_count;
        for (size_t i = 0; i < config->data.tap_dance.binding_count; i++) {
            copy_behavior_name(persisted.runtime.data.tap_dance.bindings[i].behavior_dev,
                               config->data.tap_dance.bindings[i].behavior_dev);
            persisted.runtime.data.tap_dance.bindings[i].param1 =
                config->data.tap_dance.bindings[i].param1;
            persisted.runtime.data.tap_dance.bindings[i].param2 =
                config->data.tap_dance.bindings[i].param2;
        }
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY:
        persisted.runtime.data.sticky_key.release_after_ms =
            config->data.sticky_key.release_after_ms;
        persisted.runtime.data.sticky_key.quick_release = config->data.sticky_key.quick_release;
        persisted.runtime.data.sticky_key.lazy = config->data.sticky_key.lazy;
        persisted.runtime.data.sticky_key.ignore_modifiers =
            config->data.sticky_key.ignore_modifiers;
        copy_behavior_name(persisted.runtime.data.sticky_key.behavior_dev,
                           config->data.sticky_key.behavior_dev);
        break;
    default:
        return -EINVAL;
    }

    char path[112];
    snprintf(path, sizeof(path), "%s/%s", RUNTIME_BEHAVIOR_SETTINGS_SUBTREE, slot->device->name);
    return settings_save_one(path, &persisted, sizeof(persisted));
#else
    ARG_UNUSED(slot);
    ARG_UNUSED(config);
    return 0;
#endif
}

static int delete_runtime_behavior_slot_settings(const struct zmk_studio_runtime_behavior_slot *slot) {
#if IS_ENABLED(CONFIG_SETTINGS)
    char path[112];
    snprintf(path, sizeof(path), "%s/%s", RUNTIME_BEHAVIOR_SETTINGS_SUBTREE, slot->device->name);
    return settings_delete(path);
#else
    ARG_UNUSED(slot);
    return 0;
#endif
}

static int apply_persisted_behavior_runtime_config(
    const char *behavior_name, const struct persisted_behavior_runtime_config *persisted) {
    const struct device *device = behavior_get_binding(behavior_name);
    if (!device) {
        return -ENOENT;
    }

    struct behavior_runtime_config runtime = {0};

    switch (persisted->type) {
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP: {
        const struct device *hold_behavior =
            behavior_get_binding(persisted->data.hold_tap.hold_behavior_dev);
        const struct device *tap_behavior =
            behavior_get_binding(persisted->data.hold_tap.tap_behavior_dev);
        if (!hold_behavior || !tap_behavior) {
            return -ENOENT;
        }

        runtime = (struct behavior_runtime_config){
            .type = BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP,
            .data.hold_tap =
                {
                    .tapping_term_ms = persisted->data.hold_tap.tapping_term_ms,
                    .quick_tap_ms = persisted->data.hold_tap.quick_tap_ms,
                    .require_prior_idle_ms = persisted->data.hold_tap.require_prior_idle_ms,
                    .flavor = persisted->data.hold_tap.flavor,
                    .hold_behavior_dev = hold_behavior->name,
                    .tap_behavior_dev = tap_behavior->name,
                },
        };
        break;
    }
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE:
        if (persisted->data.tap_dance.binding_count == 0 ||
            persisted->data.tap_dance.binding_count > ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS) {
            return -EINVAL;
        }

        runtime.type = BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE;
        runtime.data.tap_dance.tapping_term_ms = persisted->data.tap_dance.tapping_term_ms;
        runtime.data.tap_dance.binding_count = persisted->data.tap_dance.binding_count;

        for (size_t i = 0; i < persisted->data.tap_dance.binding_count; i++) {
            const struct device *binding_dev =
                behavior_get_binding(persisted->data.tap_dance.bindings[i].behavior_dev);
            if (!binding_dev) {
                return -ENOENT;
            }

            runtime.data.tap_dance.bindings[i] = (struct zmk_behavior_binding){
                .behavior_dev = (char *)binding_dev->name,
                .param1 = persisted->data.tap_dance.bindings[i].param1,
                .param2 = persisted->data.tap_dance.bindings[i].param2,
            };
        }
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY: {
        const struct device *child_behavior =
            behavior_get_binding(persisted->data.sticky_key.behavior_dev);
        if (!child_behavior) {
            return -ENOENT;
        }

        runtime = (struct behavior_runtime_config){
            .type = BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY,
            .data.sticky_key =
                {
                    .release_after_ms = persisted->data.sticky_key.release_after_ms,
                    .quick_release = persisted->data.sticky_key.quick_release,
                    .lazy = persisted->data.sticky_key.lazy,
                    .ignore_modifiers = persisted->data.sticky_key.ignore_modifiers,
                    .behavior_dev = child_behavior->name,
                },
        };
        break;
    }
    default:
        return -EINVAL;
    }

    return behavior_set_runtime_config(device, &runtime);
}

static int behavior_runtime_settings_load_cb(const char *name, size_t len, settings_read_cb read_cb,
                                             void *cb_arg) {
    if (!name || name[0] == '\0' || strchr(name, '/')) {
        return -ENOENT;
    }

    if (len != sizeof(struct persisted_behavior_runtime_config)) {
        LOG_WRN("Skipping unexpected runtime behavior config size for %s", name);
        return 0;
    }

    struct persisted_behavior_runtime_config persisted = {0};
    int rc = read_cb(cb_arg, &persisted, sizeof(persisted));
    if (rc < 0) {
        return rc;
    }

    int apply_rc = apply_persisted_behavior_runtime_config(name, &persisted);
    if (apply_rc < 0) {
        LOG_WRN("Skipping invalid stored runtime behavior config for %s: %d", name, apply_rc);
    }

    return 0;
}

static int runtime_behavior_slot_settings_load_cb(const char *name, size_t len,
                                                  settings_read_cb read_cb, void *cb_arg) {
    if (!name || name[0] == '\0' || strchr(name, '/')) {
        return -ENOENT;
    }

    const struct zmk_studio_runtime_behavior_slot *slot =
        zmk_studio_runtime_behavior_find_slot_by_name(name);
    if (!slot) {
        return 0;
    }

    if (len != sizeof(struct persisted_runtime_behavior_slot)) {
        LOG_WRN("Skipping unexpected runtime behavior slot size for %s", name);
        return 0;
    }

    struct persisted_runtime_behavior_slot persisted = {0};
    int rc = read_cb(cb_arg, &persisted, sizeof(persisted));
    if (rc < 0) {
        return rc;
    }

    *slot->active = persisted.active;

    if (!persisted.active) {
        if (slot->display_name && slot->display_name_len > 0) {
            slot->display_name[0] = '\0';
        }
        return 0;
    }

    if (!normalize_display_name(slot->display_name, persisted.display_name)) {
        copy_behavior_name(slot->display_name, "Custom Behavior");
    }

    const int apply_rc = apply_persisted_behavior_runtime_config(name, &persisted.runtime);
    if (apply_rc < 0) {
        *slot->active = false;
        if (slot->display_name && slot->display_name_len > 0) {
            slot->display_name[0] = '\0';
        }
        LOG_WRN("Skipping invalid stored runtime behavior slot config for %s: %d", name, apply_rc);
    }

    return 0;
}

static int behavior_metadata_settings_load_cb(const char *name, size_t len,
                                              settings_read_cb read_cb, void *cb_arg) {
    if (!name || name[0] == '\0' || strchr(name, '/')) {
        return -ENOENT;
    }

    if (len != sizeof(struct persisted_behavior_metadata)) {
        LOG_WRN("Skipping unexpected behavior metadata size for %s", name);
        return 0;
    }

    if (!behavior_get_binding(name)) {
        return 0;
    }

    struct persisted_behavior_metadata persisted = {0};
    int rc = read_cb(cb_arg, &persisted, sizeof(persisted));
    if (rc < 0) {
        return rc;
    }

    struct behavior_metadata_override *entry = find_behavior_metadata_override(name, true);
    if (!entry) {
        LOG_WRN("No free metadata override slot for %s", name);
        return 0;
    }

    entry->hidden = persisted.hidden;
    if (!normalize_display_name(entry->display_name, persisted.display_name)) {
        entry->display_name[0] = '\0';
    }

    return 0;
}

SETTINGS_STATIC_HANDLER_DEFINE(studio_behavior_runtime, BEHAVIOR_SETTINGS_SUBTREE, NULL,
                               behavior_runtime_settings_load_cb, NULL, NULL);
SETTINGS_STATIC_HANDLER_DEFINE(studio_runtime_behavior_slots, RUNTIME_BEHAVIOR_SETTINGS_SUBTREE,
                               NULL, runtime_behavior_slot_settings_load_cb, NULL, NULL);
SETTINGS_STATIC_HANDLER_DEFINE(studio_behavior_meta, BEHAVIOR_META_SETTINGS_SUBTREE, NULL,
                               behavior_metadata_settings_load_cb, NULL, NULL);

static int decode_runtime_config_from_proto(const zmk_behaviors_BehaviorRuntimeConfig *config,
                                            struct behavior_runtime_config *runtime) {
    int ret = 0;

    switch (config->which_config_type) {
    case zmk_behaviors_BehaviorRuntimeConfig_hold_tap_tag: {
        const char *hold_behavior_name =
            resolve_active_behavior_name(config->config_type.hold_tap.hold_behavior_id);
        const char *tap_behavior_name =
            resolve_active_behavior_name(config->config_type.hold_tap.tap_behavior_id);
        if (!hold_behavior_name || !tap_behavior_name) {
            return -ENOENT;
        }

        *runtime = (struct behavior_runtime_config){
            .type = BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP,
            .data.hold_tap =
                {
                    .tapping_term_ms = config->config_type.hold_tap.tapping_term_ms,
                    .quick_tap_ms = config->config_type.hold_tap.quick_tap_ms,
                    .require_prior_idle_ms = config->config_type.hold_tap.require_prior_idle_ms,
                    .flavor = config->config_type.hold_tap.flavor,
                    .hold_behavior_dev = hold_behavior_name,
                    .tap_behavior_dev = tap_behavior_name,
                },
        };
        return 0;
    }
    case zmk_behaviors_BehaviorRuntimeConfig_tap_dance_tag:
        if (config->config_type.tap_dance.bindings_count == 0 ||
            config->config_type.tap_dance.bindings_count > ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS) {
            return -EINVAL;
        }

        runtime->type = BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE;
        runtime->data.tap_dance.tapping_term_ms = config->config_type.tap_dance.tapping_term_ms;
        runtime->data.tap_dance.binding_count = config->config_type.tap_dance.bindings_count;

        for (size_t i = 0; i < config->config_type.tap_dance.bindings_count; i++) {
            ret = decode_keymap_binding(&config->config_type.tap_dance.bindings[i],
                                        &runtime->data.tap_dance.bindings[i]);
            if (ret < 0) {
                return ret;
            }
        }

        return 0;
    case zmk_behaviors_BehaviorRuntimeConfig_sticky_key_tag: {
        const char *sticky_behavior_name =
            resolve_active_behavior_name(config->config_type.sticky_key.behavior_id);
        if (!sticky_behavior_name) {
            return -ENOENT;
        }

        *runtime = (struct behavior_runtime_config){
            .type = BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY,
            .data.sticky_key =
                {
                    .release_after_ms = config->config_type.sticky_key.release_after_ms,
                    .quick_release = config->config_type.sticky_key.quick_release,
                    .lazy = config->config_type.sticky_key.lazy,
                    .ignore_modifiers = config->config_type.sticky_key.ignore_modifiers,
                    .behavior_dev = sticky_behavior_name,
                },
        };
        return 0;
    }
    default:
        return -EINVAL;
    }
}

static zmk_studio_Response get_behavior_runtime_config(const zmk_studio_Request *req) {
    const uint32_t behavior_id =
        req->subsystem.behaviors.request_type.get_behavior_runtime_config.behavior_id;
    const char *behavior_name = NULL;
    const struct device *device = NULL;

    if (resolve_behavior_id(behavior_id, &behavior_name, &device, NULL, false) < 0) {
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    struct behavior_runtime_config runtime = {0};
    int ret = behavior_get_runtime_config(device, &runtime);
    if (ret < 0) {
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    zmk_behaviors_BehaviorRuntimeConfig resp = zmk_behaviors_BehaviorRuntimeConfig_init_zero;
    resp.behavior_id = behavior_id;

    switch (runtime.type) {
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP:
        resp.which_config_type = zmk_behaviors_BehaviorRuntimeConfig_hold_tap_tag;
        resp.config_type.hold_tap.tapping_term_ms = runtime.data.hold_tap.tapping_term_ms;
        resp.config_type.hold_tap.quick_tap_ms = runtime.data.hold_tap.quick_tap_ms;
        resp.config_type.hold_tap.require_prior_idle_ms =
            runtime.data.hold_tap.require_prior_idle_ms;
        resp.config_type.hold_tap.flavor = runtime.data.hold_tap.flavor;
        resp.config_type.hold_tap.hold_behavior_id =
            zmk_behavior_get_local_id(runtime.data.hold_tap.hold_behavior_dev);
        resp.config_type.hold_tap.tap_behavior_id =
            zmk_behavior_get_local_id(runtime.data.hold_tap.tap_behavior_dev);
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE:
        if (runtime.data.tap_dance.binding_count > ARRAY_SIZE(resp.config_type.tap_dance.bindings)) {
            return ZMK_RPC_SIMPLE_ERR(GENERIC);
        }

        resp.which_config_type = zmk_behaviors_BehaviorRuntimeConfig_tap_dance_tag;
        resp.config_type.tap_dance.tapping_term_ms = runtime.data.tap_dance.tapping_term_ms;
        resp.config_type.tap_dance.bindings_count = runtime.data.tap_dance.binding_count;
        for (size_t i = 0; i < runtime.data.tap_dance.binding_count; i++) {
            ret = encode_keymap_binding(&runtime.data.tap_dance.bindings[i],
                                        &resp.config_type.tap_dance.bindings[i]);
            if (ret < 0) {
                return ZMK_RPC_SIMPLE_ERR(GENERIC);
            }
        }
        break;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY:
        resp.which_config_type = zmk_behaviors_BehaviorRuntimeConfig_sticky_key_tag;
        resp.config_type.sticky_key.release_after_ms = runtime.data.sticky_key.release_after_ms;
        resp.config_type.sticky_key.quick_release = runtime.data.sticky_key.quick_release;
        resp.config_type.sticky_key.lazy = runtime.data.sticky_key.lazy;
        resp.config_type.sticky_key.ignore_modifiers = runtime.data.sticky_key.ignore_modifiers;
        resp.config_type.sticky_key.behavior_id =
            zmk_behavior_get_local_id(runtime.data.sticky_key.behavior_dev);
        break;
    default:
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    return BEHAVIOR_RESPONSE(get_behavior_runtime_config, resp);
}

static zmk_behaviors_SetBehaviorRuntimeConfigResponseCode map_runtime_config_error(int err) {
    switch (err) {
    case -ENOTSUP:
        return zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_NOT_SUPPORTED;
    case -ERANGE:
        return zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_OUT_OF_RANGE;
    case -ENOENT:
        return zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_BINDING;
    case -EINVAL:
    default:
        return zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_CONFIG;
    }
}

static zmk_studio_Response set_behavior_runtime_config(const zmk_studio_Request *req) {
    const zmk_behaviors_BehaviorRuntimeConfig *config =
        &req->subsystem.behaviors.request_type.set_behavior_runtime_config.config;
    const char *behavior_name = NULL;
    const struct device *device = NULL;
    const struct zmk_studio_runtime_behavior_slot *slot = NULL;

    if (resolve_behavior_id(config->behavior_id, &behavior_name, &device, &slot, false) < 0) {
        return BEHAVIOR_RESPONSE(
            set_behavior_runtime_config,
            zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_ID);
    }

    struct behavior_runtime_config runtime = {0};
    int ret = decode_runtime_config_from_proto(config, &runtime);
    if (ret < 0) {
        return BEHAVIOR_RESPONSE(set_behavior_runtime_config, map_runtime_config_error(ret));
    }

    ret = behavior_set_runtime_config(device, &runtime);
    if (ret < 0) {
        return BEHAVIOR_RESPONSE(set_behavior_runtime_config, map_runtime_config_error(ret));
    }

    ret = slot ? save_runtime_behavior_slot(slot, &runtime)
               : save_behavior_runtime_config(behavior_name, &runtime);
    if (ret < 0) {
        LOG_WRN("Failed to persist runtime behavior config for %s: %d", behavior_name, ret);
        return BEHAVIOR_RESPONSE(
            set_behavior_runtime_config,
            zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_PERSIST);
    }

    return BEHAVIOR_RESPONSE(
        set_behavior_runtime_config,
        zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_OK);
}

static zmk_behaviors_CreateBehaviorResponse make_create_behavior_error(
    zmk_behaviors_CreateBehaviorResponseCode code) {
    zmk_behaviors_CreateBehaviorResponse resp = zmk_behaviors_CreateBehaviorResponse_init_zero;
    resp.which_result = zmk_behaviors_CreateBehaviorResponse_err_tag;
    resp.result.err = code;
    return resp;
}

static bool keymap_uses_behavior(uint32_t behavior_id) {
    for (int layer = 0; layer < ZMK_KEYMAP_LAYERS_LEN; layer++) {
        for (int position = 0; position < ZMK_KEYMAP_LEN; position++) {
            const struct zmk_behavior_binding *binding =
                zmk_keymap_get_layer_binding_at_idx(layer, position);

            if (!binding || !binding->behavior_dev) {
                continue;
            }

            if (zmk_behavior_get_local_id(binding->behavior_dev) == behavior_id) {
                return true;
            }
        }
    }

    return false;
}

static bool behavior_config_uses_behavior(uint32_t candidate_id, uint32_t target_id) {
    if (candidate_id == target_id) {
        return false;
    }

    const char *behavior_name = NULL;
    const struct device *device = NULL;
    if (resolve_behavior_id(candidate_id, &behavior_name, &device, NULL, false) < 0) {
        return false;
    }

    struct behavior_runtime_config runtime = {0};
    if (behavior_get_runtime_config(device, &runtime) < 0) {
        return false;
    }

    switch (runtime.type) {
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_HOLD_TAP:
        return zmk_behavior_get_local_id(runtime.data.hold_tap.hold_behavior_dev) == target_id ||
               zmk_behavior_get_local_id(runtime.data.hold_tap.tap_behavior_dev) == target_id;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE:
        for (size_t i = 0; i < runtime.data.tap_dance.binding_count; i++) {
            if (zmk_behavior_get_local_id(runtime.data.tap_dance.bindings[i].behavior_dev) ==
                target_id) {
                return true;
            }
        }
        return false;
    case BEHAVIOR_RUNTIME_CONFIG_TYPE_STICKY_KEY:
        return zmk_behavior_get_local_id(runtime.data.sticky_key.behavior_dev) == target_id;
    default:
        return false;
    }
}

static bool any_behavior_config_uses_behavior(uint32_t behavior_id) {
    STRUCT_SECTION_FOREACH(zmk_behavior_local_id_map, beh) {
        if (!device_is_ready(beh->device) || !is_listable_behavior_device(beh->device)) {
            continue;
        }

        if (behavior_config_uses_behavior(beh->local_id, behavior_id)) {
            return true;
        }
    }

    return false;
}

static zmk_studio_Response create_behavior(const zmk_studio_Request *req) {
    const zmk_behaviors_CreateBehaviorRequest *create_req =
        &req->subsystem.behaviors.request_type.create_behavior;
    char display_name[BEHAVIOR_SETTINGS_NAME_LEN];

    if (!normalize_display_name(display_name, create_req->display_name)) {
        return BEHAVIOR_RESPONSE(
            create_behavior,
            make_create_behavior_error(
                zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_INVALID_NAME));
    }

    struct behavior_runtime_config runtime = {0};
    int ret = decode_runtime_config_from_proto(&create_req->config, &runtime);
    if (ret < 0) {
        return BEHAVIOR_RESPONSE(
            create_behavior,
            make_create_behavior_error(ret == -ENOENT
                                           ? zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_INVALID_BINDING
                                           : zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_INVALID_CONFIG));
    }

    const struct zmk_studio_runtime_behavior_slot *slot =
        zmk_studio_runtime_behavior_find_free_slot(runtime.type);
    if (!slot) {
        return BEHAVIOR_RESPONSE(
            create_behavior,
            make_create_behavior_error(
                zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_NO_SLOT));
    }

    copy_behavior_name(slot->display_name, display_name);
    *slot->active = true;

    ret = behavior_set_runtime_config(slot->device, &runtime);
    if (ret < 0) {
        *slot->active = false;
        slot->display_name[0] = '\0';
        return BEHAVIOR_RESPONSE(
            create_behavior,
            make_create_behavior_error(ret == -ENOENT
                                           ? zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_INVALID_BINDING
                                           : zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_INVALID_CONFIG));
    }

    ret = save_runtime_behavior_slot(slot, &runtime);
    if (ret < 0) {
        *slot->active = false;
        slot->display_name[0] = '\0';
        return BEHAVIOR_RESPONSE(
            create_behavior,
            make_create_behavior_error(
                zmk_behaviors_CreateBehaviorResponseCode_CREATE_BEHAVIOR_ERR_PERSIST));
    }

    zmk_behaviors_CreateBehaviorResponse resp = zmk_behaviors_CreateBehaviorResponse_init_zero;
    resp.which_result = zmk_behaviors_CreateBehaviorResponse_ok_tag;
    resp.result.ok = zmk_behavior_get_local_id(slot->device->name);

    return BEHAVIOR_RESPONSE(create_behavior, resp);
}

static zmk_studio_Response delete_behavior(const zmk_studio_Request *req) {
    const uint32_t behavior_id = req->subsystem.behaviors.request_type.delete_behavior.behavior_id;
    const char *behavior_name = NULL;
    const struct device *device = NULL;
    const struct zmk_studio_runtime_behavior_slot *slot = NULL;

    if (resolve_behavior_id(behavior_id, &behavior_name, &device, &slot, false) < 0) {
        return BEHAVIOR_RESPONSE(
            delete_behavior,
            zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_INVALID_ID);
    }

    if (keymap_uses_behavior(behavior_id) || zmk_studio_macros_uses_behavior(behavior_id) ||
        zmk_studio_combos_uses_behavior(behavior_id) || any_behavior_config_uses_behavior(behavior_id)) {
        return BEHAVIOR_RESPONSE(
            delete_behavior,
            zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_IN_USE);
    }

    if (slot) {
        int ret = delete_runtime_behavior_slot_settings(slot);
        if (ret < 0) {
            return BEHAVIOR_RESPONSE(
                delete_behavior,
                zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_PERSIST);
        }

        *slot->active = false;
        if (slot->display_name && slot->display_name_len > 0) {
            slot->display_name[0] = '\0';
        }
    } else {
        struct behavior_runtime_config runtime = {0};
        if (behavior_get_runtime_config(device, &runtime) < 0) {
            return BEHAVIOR_RESPONSE(
                delete_behavior,
                zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_NOT_USER_DEFINED);
        }

        struct behavior_metadata_override *override =
            find_behavior_metadata_override(behavior_name, true);
        if (!override) {
            return BEHAVIOR_RESPONSE(
                delete_behavior,
                zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_PERSIST);
        }

        bool previous_hidden = override->hidden;
        char previous_display_name[BEHAVIOR_SETTINGS_NAME_LEN];
        copy_behavior_name(previous_display_name, override->display_name);

        override->hidden = true;
        override->display_name[0] = '\0';

        int meta_ret = save_behavior_metadata(behavior_name, true, NULL);
        int config_ret = delete_behavior_runtime_config(behavior_name);
        if (meta_ret < 0 || (config_ret < 0 && config_ret != -ENOENT)) {
            override->hidden = previous_hidden;
            copy_behavior_name(override->display_name, previous_display_name);
            if (meta_ret >= 0) {
                (void)save_behavior_metadata(
                    behavior_name, previous_hidden,
                    previous_display_name[0] != '\0' ? previous_display_name : NULL);
            }
            return BEHAVIOR_RESPONSE(
                delete_behavior,
                zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_ERR_PERSIST);
        }
    }

    return BEHAVIOR_RESPONSE(delete_behavior,
                             zmk_behaviors_DeleteBehaviorResponseCode_DELETE_BEHAVIOR_OK);
}

static zmk_studio_Response rename_behavior(const zmk_studio_Request *req) {
    const zmk_behaviors_RenameBehaviorRequest *rename_req =
        &req->subsystem.behaviors.request_type.rename_behavior;
    const char *behavior_name = NULL;
    const struct device *device = NULL;
    const struct zmk_studio_runtime_behavior_slot *slot = NULL;
    char display_name[BEHAVIOR_SETTINGS_NAME_LEN];

    if (!normalize_display_name(display_name, rename_req->display_name)) {
        return BEHAVIOR_RESPONSE(
            rename_behavior,
            zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_ERR_INVALID_NAME);
    }

    if (resolve_behavior_id(rename_req->behavior_id, &behavior_name, &device, &slot, false) < 0) {
        return BEHAVIOR_RESPONSE(
            rename_behavior,
            zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_ERR_INVALID_ID);
    }

    if (slot) {
        char previous_name[BEHAVIOR_SETTINGS_NAME_LEN];
        copy_behavior_name(previous_name, slot->display_name);
        copy_behavior_name(slot->display_name, display_name);

        struct behavior_runtime_config runtime = {0};
        int ret = behavior_get_runtime_config(device, &runtime);
        if (ret < 0 || save_runtime_behavior_slot(slot, &runtime) < 0) {
            copy_behavior_name(slot->display_name, previous_name);
            return BEHAVIOR_RESPONSE(
                rename_behavior,
                zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_ERR_PERSIST);
        }
    } else {
        struct behavior_metadata_override *override =
            find_behavior_metadata_override(behavior_name, true);
        if (!override) {
            return BEHAVIOR_RESPONSE(
                rename_behavior,
                zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_ERR_PERSIST);
        }

        bool previous_hidden = override->hidden;
        char previous_name[BEHAVIOR_SETTINGS_NAME_LEN];
        copy_behavior_name(previous_name, override->display_name);

        override->hidden = false;
        copy_behavior_name(override->display_name, display_name);

        if (save_behavior_metadata(behavior_name, false, override->display_name) < 0) {
            override->hidden = previous_hidden;
            copy_behavior_name(override->display_name, previous_name);
            return BEHAVIOR_RESPONSE(
                rename_behavior,
                zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_ERR_PERSIST);
        }
    }

    return BEHAVIOR_RESPONSE(rename_behavior,
                             zmk_behaviors_RenameBehaviorResponseCode_RENAME_BEHAVIOR_OK);
}

ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, list_all_behaviors, ZMK_STUDIO_RPC_HANDLER_UNSECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, get_behavior_details, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, get_behavior_runtime_config,
                          ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, set_behavior_runtime_config,
                          ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, create_behavior, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, delete_behavior, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, rename_behavior, ZMK_STUDIO_RPC_HANDLER_SECURED);
