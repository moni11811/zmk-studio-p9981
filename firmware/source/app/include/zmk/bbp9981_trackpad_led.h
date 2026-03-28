/*
 * Copyright (c) 2026 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#pragma once

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

uint8_t indicator_tp_get_last_valid_brightness(void);
bool zmk_trackpad_led_get_enabled(void);
void zmk_trackpad_led_set_enabled(bool enabled);
void zmk_trackpad_led_set_idle_timeout_ms(uint32_t timeout_ms);

#ifdef __cplusplus
}
#endif
