/*
 * Copyright (c) 2020 The ZMK Contributors
 *
 * SPDX-License-Identifier: MIT
 */

#pragma once

#include <stdbool.h>
#include <stdint.h>

enum zmk_activity_state { ZMK_ACTIVITY_ACTIVE, ZMK_ACTIVITY_IDLE, ZMK_ACTIVITY_SLEEP };

enum zmk_activity_state zmk_activity_get_state(void);
bool zmk_activity_get_idle_enabled(void);
void zmk_activity_set_idle_enabled(bool enabled);
uint32_t zmk_activity_get_idle_timeout_ms(void);
void zmk_activity_set_idle_timeout_ms(uint32_t timeout_ms);
bool zmk_activity_get_sleep_enabled(void);
void zmk_activity_set_sleep_enabled(bool enabled);
uint32_t zmk_activity_get_sleep_timeout_ms(void);
void zmk_activity_set_sleep_timeout_ms(uint32_t timeout_ms);
bool zmk_activity_get_sleep_while_usb_powered(void);
void zmk_activity_set_sleep_while_usb_powered(bool enabled);
void zmk_activity_wake(void);
