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

enum zmk_trackpad_led_usb_power_mode {
    ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF = 0,
    ZMK_TRACKPAD_LED_USB_POWER_MODE_SOLID = 1,
    ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK = 2,
};

uint8_t indicator_tp_get_last_valid_brightness(void);
bool zmk_trackpad_led_get_enabled(void);
void zmk_trackpad_led_set_enabled(bool enabled);
void zmk_trackpad_led_set_idle_timeout_ms(uint32_t timeout_ms);
void zmk_trackpad_led_set_usb_power_mode(uint8_t mode);
uint8_t zmk_trackpad_led_get_usb_power_mode(void);

#ifdef __cplusplus
}
#endif
