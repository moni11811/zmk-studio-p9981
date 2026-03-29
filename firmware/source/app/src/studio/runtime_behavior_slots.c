/*
 * Copyright (c) 2026 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#include <string.h>

#include <zephyr/sys/iterable_sections.h>

#include <zmk/studio/runtime_behaviors.h>

const struct zmk_studio_runtime_behavior_slot *
zmk_studio_runtime_behavior_find_slot_by_device(const struct device *device) {
    if (!device) {
        return NULL;
    }

    STRUCT_SECTION_FOREACH(zmk_studio_runtime_behavior_slot, slot) {
        if (slot->device == device) {
            return slot;
        }
    }

    return NULL;
}

const struct zmk_studio_runtime_behavior_slot *
zmk_studio_runtime_behavior_find_slot_by_name(const char *name) {
    if (!name) {
        return NULL;
    }

    STRUCT_SECTION_FOREACH(zmk_studio_runtime_behavior_slot, slot) {
        if (slot->device && strcmp(slot->device->name, name) == 0) {
            return slot;
        }
    }

    return NULL;
}

const struct zmk_studio_runtime_behavior_slot *
zmk_studio_runtime_behavior_find_free_slot(enum behavior_runtime_config_type type) {
    STRUCT_SECTION_FOREACH(zmk_studio_runtime_behavior_slot, slot) {
        if (slot->type == type && slot->active && !*slot->active) {
            return slot;
        }
    }

    return NULL;
}

bool zmk_studio_runtime_behavior_is_active_device(const struct device *device) {
    const struct zmk_studio_runtime_behavior_slot *slot =
        zmk_studio_runtime_behavior_find_slot_by_device(device);
    return slot && slot->active && *slot->active;
}

bool zmk_studio_runtime_behavior_is_active_name(const char *name) {
    const struct zmk_studio_runtime_behavior_slot *slot =
        zmk_studio_runtime_behavior_find_slot_by_name(name);
    return slot && slot->active && *slot->active;
}
