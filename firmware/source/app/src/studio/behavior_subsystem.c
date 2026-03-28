/*
 * Copyright (c) 2024 The ZMK Contributors
 *
 * SPDX-License-Identifier: MIT
 */

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
#include <zmk/studio/rpc.h>

ZMK_RPC_SUBSYSTEM(behaviors)

#define BEHAVIOR_RESPONSE(type, ...) ZMK_RPC_RESPONSE(behaviors, type, __VA_ARGS__)

#define BEHAVIOR_SETTINGS_SUBTREE "bb9981/studio_behaviors"
#define BEHAVIOR_SETTINGS_NAME_LEN 48

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

static bool encode_behavior_summaries(pb_ostream_t *stream, const pb_field_t *field,
                                      void *const *arg) {
    STRUCT_SECTION_FOREACH(zmk_behavior_local_id_map, beh) {
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
    bool ret = true;

    LOG_DBG("Encoding the %d metadata sets with %p", state->sets_len, state->sets);

    for (int i = 0; i < state->sets_len; i++) {
        LOG_DBG("Encoding set %d", i);
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
        ret = pb_encode_submessage(stream, &zmk_behaviors_BehaviorBindingParametersSet_msg, &msg);
        if (!ret) {
            LOG_WRN("Failed to encode submessage for set %d", i);
            break;
        }
    }

    return ret;
}

static bool encode_behavior_name(pb_ostream_t *stream, const pb_field_t *field, void *const *arg) {
    struct zmk_behavior_ref *zbm = (struct zmk_behavior_ref *)*arg;

    if (!pb_encode_tag_for_field(stream, field)) {
        return false;
    }

    return pb_encode_string(stream, zbm->metadata.display_name, strlen(zbm->metadata.display_name));
}

static struct encode_metadata_sets_state state = {};

zmk_studio_Response get_behavior_details(const zmk_studio_Request *req) {
    uint32_t behavior_id = req->subsystem.behaviors.request_type.get_behavior_details.behavior_id;
    const char *behavior_name = zmk_behavior_find_behavior_name_from_local_id(behavior_id);

    LOG_DBG("behavior_id %d, name %s", behavior_id, behavior_name);

    if (!behavior_name) {
        LOG_WRN("No behavior found for ID %d", behavior_id);
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    const struct device *device = behavior_get_binding(behavior_name);

    struct zmk_behavior_ref *zbm = NULL;
    STRUCT_SECTION_FOREACH(zmk_behavior_ref, item) {
        if (item->device == device) {
            zbm = item;
            break;
        }
    }

    __ASSERT(zbm != NULL, "Can't find a device without also having metadata");

    struct behavior_parameter_metadata desc = {0};
    int ret = behavior_get_parameter_metadata(device, &desc);
    if (ret < 0) {
        LOG_DBG("Failed to fetch the metadata for %s! %d", zbm->metadata.display_name, ret);
    } else {
        LOG_DBG("Got metadata with %d sets", desc.sets_len);
    }

    zmk_behaviors_GetBehaviorDetailsResponse resp =
        zmk_behaviors_GetBehaviorDetailsResponse_init_zero;
    resp.id = behavior_id;
    resp.display_name.funcs.encode = encode_behavior_name;
    resp.display_name.arg = zbm;

    state.sets = desc.sets;
    state.sets_len = desc.sets_len;

    resp.metadata.funcs.encode = encode_metadata_sets;
    resp.metadata.arg = &state;

    return BEHAVIOR_RESPONSE(get_behavior_details, resp);
}

static int encode_keymap_binding(const struct zmk_behavior_binding *binding,
                                 zmk_keymap_BehaviorBinding *resp) {
    if (!binding || !binding->behavior_dev) {
        return -EINVAL;
    }

    zmk_behavior_local_id_t behavior_id = zmk_behavior_get_local_id(binding->behavior_dev);
    if (behavior_id == 0) {
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
    const char *behavior_name = zmk_behavior_find_behavior_name_from_local_id(binding->behavior_id);
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

static void copy_behavior_name(char dest[BEHAVIOR_SETTINGS_NAME_LEN], const char *src) {
    if (!src) {
        dest[0] = '\0';
        return;
    }

    strncpy(dest, src, BEHAVIOR_SETTINGS_NAME_LEN - 1);
    dest[BEHAVIOR_SETTINGS_NAME_LEN - 1] = '\0';
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

SETTINGS_STATIC_HANDLER_DEFINE(studio_behavior_runtime, BEHAVIOR_SETTINGS_SUBTREE, NULL,
                               behavior_runtime_settings_load_cb, NULL, NULL);

static zmk_studio_Response get_behavior_runtime_config(const zmk_studio_Request *req) {
    uint32_t behavior_id =
        req->subsystem.behaviors.request_type.get_behavior_runtime_config.behavior_id;
    const char *behavior_name = zmk_behavior_find_behavior_name_from_local_id(behavior_id);
    if (!behavior_name) {
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    const struct device *device = behavior_get_binding(behavior_name);
    if (!device) {
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
    const char *behavior_name = zmk_behavior_find_behavior_name_from_local_id(config->behavior_id);
    if (!behavior_name) {
        return BEHAVIOR_RESPONSE(
            set_behavior_runtime_config,
            zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_ID);
    }

    const struct device *device = behavior_get_binding(behavior_name);
    if (!device) {
        return BEHAVIOR_RESPONSE(
            set_behavior_runtime_config,
            zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_ID);
    }

    struct behavior_runtime_config runtime = {0};
    int ret = 0;

    switch (config->which_config_type) {
    case zmk_behaviors_BehaviorRuntimeConfig_hold_tap_tag: {
        const char *hold_behavior_name =
            zmk_behavior_find_behavior_name_from_local_id(config->config_type.hold_tap.hold_behavior_id);
        const char *tap_behavior_name =
            zmk_behavior_find_behavior_name_from_local_id(config->config_type.hold_tap.tap_behavior_id);
        if (!hold_behavior_name || !tap_behavior_name) {
            return BEHAVIOR_RESPONSE(
                set_behavior_runtime_config,
                zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_BINDING);
        }

        runtime = (struct behavior_runtime_config){
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
        break;
    }
    case zmk_behaviors_BehaviorRuntimeConfig_tap_dance_tag:
        if (config->config_type.tap_dance.bindings_count == 0 ||
            config->config_type.tap_dance.bindings_count > ZMK_BEHAVIOR_RUNTIME_CONFIG_MAX_BINDINGS) {
            return BEHAVIOR_RESPONSE(
                set_behavior_runtime_config,
                zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_CONFIG);
        }

        runtime.type = BEHAVIOR_RUNTIME_CONFIG_TYPE_TAP_DANCE;
        runtime.data.tap_dance.tapping_term_ms = config->config_type.tap_dance.tapping_term_ms;
        runtime.data.tap_dance.binding_count = config->config_type.tap_dance.bindings_count;
        for (size_t i = 0; i < config->config_type.tap_dance.bindings_count; i++) {
            ret = decode_keymap_binding(&config->config_type.tap_dance.bindings[i],
                                        &runtime.data.tap_dance.bindings[i]);
            if (ret < 0) {
                return BEHAVIOR_RESPONSE(
                    set_behavior_runtime_config,
                    zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_BINDING);
            }
        }
        break;
    case zmk_behaviors_BehaviorRuntimeConfig_sticky_key_tag: {
        const char *sticky_behavior_name =
            zmk_behavior_find_behavior_name_from_local_id(config->config_type.sticky_key.behavior_id);
        if (!sticky_behavior_name) {
            return BEHAVIOR_RESPONSE(
                set_behavior_runtime_config,
                zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_BINDING);
        }

        runtime = (struct behavior_runtime_config){
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
        break;
    }
    default:
        return BEHAVIOR_RESPONSE(
            set_behavior_runtime_config,
            zmk_behaviors_SetBehaviorRuntimeConfigResponseCode_SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_CONFIG);
    }

    ret = behavior_set_runtime_config(device, &runtime);
    if (ret < 0) {
        return BEHAVIOR_RESPONSE(set_behavior_runtime_config, map_runtime_config_error(ret));
    }

    ret = save_behavior_runtime_config(behavior_name, &runtime);
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

ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, list_all_behaviors, ZMK_STUDIO_RPC_HANDLER_UNSECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, get_behavior_details, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, get_behavior_runtime_config,
                          ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(behaviors, set_behavior_runtime_config,
                          ZMK_STUDIO_RPC_HANDLER_SECURED);
