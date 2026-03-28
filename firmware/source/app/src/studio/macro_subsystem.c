/*
 * Copyright (c) 2025 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#include <string.h>
#include <stdio.h>

#include <zephyr/logging/log.h>

LOG_MODULE_DECLARE(zmk_studio, CONFIG_ZMK_STUDIO_LOG_LEVEL);

#include <zmk/studio/rpc.h>

#define MAX_MACROS 32
#define MAX_MACRO_STEPS 64

enum macro_step_type {
    MACRO_STEP_TAP = 0,
    MACRO_STEP_PRESS = 1,
    MACRO_STEP_RELEASE = 2,
    MACRO_STEP_WAIT = 3,
    MACRO_STEP_PAUSE_FOR_RELEASE = 4,
};

struct macro_step_rpc {
    enum macro_step_type type;
    uint32_t behavior_id;
    uint32_t param1;
    uint32_t param2;
    uint32_t duration_ms;
};

struct macro_rpc {
    uint16_t id;
    char name[32];
    uint16_t step_count;
    struct macro_step_rpc steps[MAX_MACRO_STEPS];
    uint32_t default_wait_ms;
    uint32_t default_tap_ms;
};

static struct macro_rpc runtime_macros[MAX_MACROS];
static uint16_t runtime_macro_count = 0;
static bool macros_dirty = false;

ZMK_RPC_SUBSYSTEM(macros)

#define MACROS_RESPONSE(type, ...) ZMK_RPC_RESPONSE(macros, type, __VA_ARGS__)

static void macro_step_to_proto(zmk_macros_MacroStep *dest, const struct macro_step_rpc *src) {
    *dest = (zmk_macros_MacroStep){
        .type = (zmk_macros_MacroStepType)src->type,
        .behavior_id = src->behavior_id,
        .param1 = src->param1,
        .param2 = src->param2,
        .duration_ms = src->duration_ms,
    };
}

static void macro_step_from_proto(struct macro_step_rpc *dest, const zmk_macros_MacroStep *src) {
    *dest = (struct macro_step_rpc){
        .type = (enum macro_step_type)src->type,
        .behavior_id = src->behavior_id,
        .param1 = src->param1,
        .param2 = src->param2,
        .duration_ms = src->duration_ms,
    };
}

static void fill_macro_details(zmk_macros_MacroDetails *dest, const struct macro_rpc *src) {
    *dest = (zmk_macros_MacroDetails)zmk_macros_MacroDetails_init_zero;
    dest->id = src->id;
    strncpy(dest->name, src->name, sizeof(dest->name) - 1);
    dest->steps_count = src->step_count;

    for (int i = 0; i < src->step_count; i++) {
        macro_step_to_proto(&dest->steps[i], &src->steps[i]);
    }

    dest->default_wait_ms = src->default_wait_ms;
    dest->default_tap_ms = src->default_tap_ms;
}

static zmk_studio_Response list_all_macros(const zmk_studio_Request *req) {
    zmk_macros_ListAllMacrosResponse resp = zmk_macros_ListAllMacrosResponse_init_zero;

    resp.macros_count = runtime_macro_count;
    for (int i = 0; i < runtime_macro_count; i++) {
        resp.macros[i] = (zmk_macros_MacroSummary){
            .id = runtime_macros[i].id,
            .step_count = runtime_macros[i].step_count,
        };
        strncpy(resp.macros[i].name, runtime_macros[i].name, sizeof(resp.macros[i].name) - 1);
    }

    return MACROS_RESPONSE(list_all_macros, resp);
}

static zmk_studio_Response get_macro_details(const zmk_studio_Request *req) {
    uint32_t macro_id = req->subsystem.macros.request_type.get_macro_details.macro_id;

    if (macro_id >= runtime_macro_count) {
        return ZMK_RPC_SIMPLE_ERR(GENERIC);
    }

    zmk_macros_MacroDetails resp = zmk_macros_MacroDetails_init_zero;
    fill_macro_details(&resp, &runtime_macros[macro_id]);

    return MACROS_RESPONSE(get_macro_details, resp);
}

static zmk_studio_Response set_macro_steps(const zmk_studio_Request *req) {
    const zmk_macros_SetMacroStepsRequest *set_req =
        &req->subsystem.macros.request_type.set_macro_steps;
    uint32_t macro_id = set_req->macro_id;

    if (macro_id >= runtime_macro_count) {
        return MACROS_RESPONSE(
            set_macro_steps,
            zmk_macros_SetMacroStepsResponseCode_SET_MACRO_STEPS_ERR_INVALID_ID);
    }

    if (set_req->steps_count > MAX_MACRO_STEPS) {
        return MACROS_RESPONSE(
            set_macro_steps,
            zmk_macros_SetMacroStepsResponseCode_SET_MACRO_STEPS_ERR_TOO_MANY_STEPS);
    }

    struct macro_rpc *macro = &runtime_macros[macro_id];
    memset(macro->steps, 0, sizeof(macro->steps));
    macro->step_count = set_req->steps_count;
    strncpy(macro->name, set_req->name, sizeof(macro->name) - 1);
    macro->name[sizeof(macro->name) - 1] = '\0';
    macro->default_wait_ms = set_req->default_wait_ms;
    macro->default_tap_ms = set_req->default_tap_ms;

    for (int i = 0; i < set_req->steps_count; i++) {
        macro_step_from_proto(&macro->steps[i], &set_req->steps[i]);
    }

    macros_dirty = true;

    return MACROS_RESPONSE(set_macro_steps,
                           zmk_macros_SetMacroStepsResponseCode_SET_MACRO_STEPS_OK);
}

static zmk_studio_Response create_macro(const zmk_studio_Request *req) {
    zmk_macros_CreateMacroResponse resp = zmk_macros_CreateMacroResponse_init_zero;

    if (runtime_macro_count >= MAX_MACROS) {
        resp.which_result = zmk_macros_CreateMacroResponse_err_tag;
        resp.result.err = true;
        return MACROS_RESPONSE(create_macro, resp);
    }

    struct macro_rpc *new_macro = &runtime_macros[runtime_macro_count];
    memset(new_macro, 0, sizeof(*new_macro));
    new_macro->id = runtime_macro_count;
    snprintf(new_macro->name, sizeof(new_macro->name), "Macro %d", runtime_macro_count + 1);
    new_macro->default_wait_ms = 30;
    new_macro->default_tap_ms = 30;

    runtime_macro_count++;
    macros_dirty = true;

    resp.which_result = zmk_macros_CreateMacroResponse_ok_tag;
    resp.result.ok = new_macro->id;

    return MACROS_RESPONSE(create_macro, resp);
}

static zmk_studio_Response delete_macro(const zmk_studio_Request *req) {
    uint32_t macro_id = req->subsystem.macros.request_type.delete_macro.macro_id;

    if (macro_id >= runtime_macro_count) {
        return MACROS_RESPONSE(delete_macro, false);
    }

    for (int i = macro_id; i < runtime_macro_count - 1; i++) {
        runtime_macros[i] = runtime_macros[i + 1];
        runtime_macros[i].id = i;
    }

    memset(&runtime_macros[runtime_macro_count - 1], 0, sizeof(runtime_macros[0]));
    runtime_macro_count--;
    macros_dirty = true;

    return MACROS_RESPONSE(delete_macro, true);
}

static zmk_studio_Response save_changes(const zmk_studio_Request *req) {
    (void)req;
    macros_dirty = false;
    return MACROS_RESPONSE(save_changes, zmk_macros_SaveChangesErrorCode_SAVE_CHANGES_OK);
}

static zmk_studio_Response discard_changes(const zmk_studio_Request *req) {
    (void)req;
    macros_dirty = false;
    return MACROS_RESPONSE(discard_changes, true);
}

static zmk_studio_Response check_unsaved_changes(const zmk_studio_Request *req) {
    (void)req;
    return MACROS_RESPONSE(check_unsaved_changes, macros_dirty);
}

static int macro_settings_reset(void) {
    runtime_macro_count = 0;
    macros_dirty = false;
    memset(runtime_macros, 0, sizeof(runtime_macros));
    return 0;
}

ZMK_RPC_SUBSYSTEM_HANDLER(macros, list_all_macros, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, get_macro_details, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, set_macro_steps, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, create_macro, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, delete_macro, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, save_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, discard_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(macros, check_unsaved_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);

ZMK_RPC_SUBSYSTEM_SETTINGS_RESET(macros, macro_settings_reset);
