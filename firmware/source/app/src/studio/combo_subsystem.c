/*
 * Copyright (c) 2025 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#include <string.h>
#include <stdio.h>

#include <zephyr/logging/log.h>

LOG_MODULE_DECLARE(zmk_studio, CONFIG_ZMK_STUDIO_LOG_LEVEL);

#include <zmk/studio/combo_subsystem.h>
#include <zmk/studio/rpc.h>

#define MAX_COMBOS 32
#define MAX_COMBO_KEYS 8

struct combo_rpc {
    uint16_t id;
    char name[32];
    int32_t key_positions[MAX_COMBO_KEYS];
    uint16_t key_position_count;
    uint32_t behavior_id;
    uint32_t behavior_param1;
    uint32_t behavior_param2;
    int32_t timeout_ms;
    int32_t require_prior_idle_ms;
    bool slow_release;
    uint32_t layer_mask;
};

static struct combo_rpc runtime_combos[MAX_COMBOS];
static uint16_t runtime_combo_count = 0;
static bool combos_dirty = false;

ZMK_RPC_SUBSYSTEM(combos)

#define COMBOS_RESPONSE(type, ...) ZMK_RPC_RESPONSE(combos, type, __VA_ARGS__)

static void fill_combo_details(zmk_combos_ComboDetails *dest, const struct combo_rpc *src) {
    *dest = (zmk_combos_ComboDetails)zmk_combos_ComboDetails_init_zero;
    dest->id = src->id;
    strncpy(dest->name, src->name, sizeof(dest->name) - 1);
    dest->key_positions_count = src->key_position_count;
    for (int i = 0; i < src->key_position_count; i++) {
        dest->key_positions[i] = src->key_positions[i];
    }
    dest->binding.behavior_id = src->behavior_id;
    dest->binding.param1 = src->behavior_param1;
    dest->binding.param2 = src->behavior_param2;
    dest->timeout_ms = src->timeout_ms;
    dest->require_prior_idle_ms = src->require_prior_idle_ms;
    dest->slow_release = src->slow_release;
    dest->layer_mask = src->layer_mask;
}

static zmk_studio_Response list_all_combos(const zmk_studio_Request *req) {
    zmk_combos_ListAllCombosResponse resp = zmk_combos_ListAllCombosResponse_init_zero;

    resp.combos_count = runtime_combo_count;
    for (int i = 0; i < runtime_combo_count; i++) {
        resp.combos[i] = (zmk_combos_ComboSummary){
            .id = runtime_combos[i].id,
            .key_count = runtime_combos[i].key_position_count,
        };
        strncpy(resp.combos[i].name, runtime_combos[i].name, sizeof(resp.combos[i].name) - 1);
    }

    return COMBOS_RESPONSE(list_all_combos, resp);
}

static zmk_studio_Response get_combo_details(const zmk_studio_Request *req) {
    uint32_t combo_id = req->subsystem.combos.request_type.get_combo_details.combo_id;

    if (combo_id >= runtime_combo_count) {
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    zmk_combos_ComboDetails resp = zmk_combos_ComboDetails_init_zero;
    fill_combo_details(&resp, &runtime_combos[combo_id]);

    return COMBOS_RESPONSE(get_combo_details, resp);
}

static zmk_studio_Response set_combo(const zmk_studio_Request *req) {
    const zmk_combos_SetComboRequest *set_req = &req->subsystem.combos.request_type.set_combo;
    uint32_t combo_id = set_req->combo_id;

    if (combo_id >= runtime_combo_count) {
        return COMBOS_RESPONSE(set_combo,
                               zmk_combos_SetComboResponseCode_SET_COMBO_ERR_INVALID_ID);
    }

    if (set_req->key_positions_count > MAX_COMBO_KEYS) {
        return COMBOS_RESPONSE(set_combo,
                               zmk_combos_SetComboResponseCode_SET_COMBO_ERR_TOO_MANY_KEYS);
    }

    struct combo_rpc *combo = &runtime_combos[combo_id];
    memset(combo->key_positions, 0, sizeof(combo->key_positions));
    combo->key_position_count = set_req->key_positions_count;
    for (int i = 0; i < set_req->key_positions_count; i++) {
        combo->key_positions[i] = set_req->key_positions[i];
    }

    strncpy(combo->name, set_req->name, sizeof(combo->name) - 1);
    combo->name[sizeof(combo->name) - 1] = '\0';
    combo->behavior_id = set_req->binding.behavior_id;
    combo->behavior_param1 = set_req->binding.param1;
    combo->behavior_param2 = set_req->binding.param2;
    combo->timeout_ms = set_req->timeout_ms;
    combo->require_prior_idle_ms = set_req->require_prior_idle_ms;
    combo->slow_release = set_req->slow_release;
    combo->layer_mask = set_req->layer_mask;

    combos_dirty = true;

    return COMBOS_RESPONSE(set_combo, zmk_combos_SetComboResponseCode_SET_COMBO_OK);
}

static zmk_studio_Response create_combo(const zmk_studio_Request *req) {
    zmk_combos_CreateComboResponse resp = zmk_combos_CreateComboResponse_init_zero;

    if (runtime_combo_count >= MAX_COMBOS) {
        resp.which_result = zmk_combos_CreateComboResponse_err_tag;
        resp.result.err = true;
        return COMBOS_RESPONSE(create_combo, resp);
    }

    struct combo_rpc *combo = &runtime_combos[runtime_combo_count];
    memset(combo, 0, sizeof(*combo));
    combo->id = runtime_combo_count;
    snprintf(combo->name, sizeof(combo->name), "Combo %d", runtime_combo_count + 1);
    combo->timeout_ms = 50;
    combo->require_prior_idle_ms = -1;
    combo->layer_mask = 0xFFFFFFFF;

    runtime_combo_count++;
    combos_dirty = true;

    resp.which_result = zmk_combos_CreateComboResponse_ok_tag;
    resp.result.ok = combo->id;

    return COMBOS_RESPONSE(create_combo, resp);
}

static zmk_studio_Response delete_combo(const zmk_studio_Request *req) {
    uint32_t combo_id = req->subsystem.combos.request_type.delete_combo.combo_id;

    if (combo_id >= runtime_combo_count) {
        return COMBOS_RESPONSE(delete_combo, false);
    }

    for (int i = combo_id; i < runtime_combo_count - 1; i++) {
        runtime_combos[i] = runtime_combos[i + 1];
        runtime_combos[i].id = i;
    }

    memset(&runtime_combos[runtime_combo_count - 1], 0, sizeof(runtime_combos[0]));
    runtime_combo_count--;
    combos_dirty = true;

    return COMBOS_RESPONSE(delete_combo, true);
}

static zmk_studio_Response save_changes(const zmk_studio_Request *req) {
    (void)req;
    combos_dirty = false;
    return COMBOS_RESPONSE(save_changes, zmk_combos_SaveChangesErrorCode_SAVE_CHANGES_OK);
}

static zmk_studio_Response discard_changes(const zmk_studio_Request *req) {
    (void)req;
    combos_dirty = false;
    return COMBOS_RESPONSE(discard_changes, true);
}

static zmk_studio_Response check_unsaved_changes(const zmk_studio_Request *req) {
    (void)req;
    return COMBOS_RESPONSE(check_unsaved_changes, combos_dirty);
}

static int combo_settings_reset(void) {
    runtime_combo_count = 0;
    combos_dirty = false;
    memset(runtime_combos, 0, sizeof(runtime_combos));
    return 0;
}

bool zmk_studio_combos_uses_behavior(uint32_t behavior_id) {
    for (int combo_idx = 0; combo_idx < runtime_combo_count; combo_idx++) {
        if (runtime_combos[combo_idx].behavior_id == behavior_id) {
            return true;
        }
    }

    return false;
}

ZMK_RPC_SUBSYSTEM_HANDLER(combos, list_all_combos, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, get_combo_details, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, set_combo, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, create_combo, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, delete_combo, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, save_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, discard_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(combos, check_unsaved_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);

ZMK_RPC_SUBSYSTEM_SETTINGS_RESET(combos, combo_settings_reset);
