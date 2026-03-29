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

enum zmk_bbp9981_scroll_profile {
    ZMK_BBP9981_SCROLL_PROFILE_CLASSIC_2D = 0,
    ZMK_BBP9981_SCROLL_PROFILE_ANALOG_3D = 1,
};

bool zmk_bbp9981_trackpad_is_touched(void);
void zmk_bbp9981_trackpad_set_enabled(bool enabled);
bool zmk_bbp9981_trackpad_get_enabled(void);
void zmk_bbp9981_trackpad_set_sensitivity(uint8_t sensitivity);
uint8_t zmk_bbp9981_trackpad_get_sensitivity(void);
void zmk_bbp9981_trackpad_set_scroll_inverted(bool inverted);
bool zmk_bbp9981_trackpad_get_scroll_inverted(void);
void zmk_bbp9981_trackpad_set_scroll_speed(uint8_t speed);
uint8_t zmk_bbp9981_trackpad_get_scroll_speed(void);
void zmk_bbp9981_trackpad_set_poll_interval_ms(uint16_t interval_ms);
uint16_t zmk_bbp9981_trackpad_get_poll_interval_ms(void);
void zmk_bbp9981_trackpad_set_precision_mode_enabled(bool enabled);
bool zmk_bbp9981_trackpad_get_precision_mode_enabled(void);
void zmk_bbp9981_trackpad_set_scroll_mode_switch_enabled(bool enabled);
bool zmk_bbp9981_trackpad_get_scroll_mode_switch_enabled(void);
void zmk_bbp9981_trackpad_set_scroll_profile(uint8_t profile);
uint8_t zmk_bbp9981_trackpad_get_scroll_profile(void);

#ifdef __cplusplus
}
#endif
