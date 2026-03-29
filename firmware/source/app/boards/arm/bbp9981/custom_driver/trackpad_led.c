/*
 * Copyright (c) 2023 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/led.h>
#include <zephyr/logging/log.h>

#include <zmk/endpoints.h>
#include <zmk/hid_indicators.h>
#include <zmk/backlight.h>
#include <zmk/activity.h>
#include <zmk/bbp9981_trackpad.h>
#include <zmk/usb.h>
#include "trackpad_led.h"
#include "a320_0x57.h"

#define HID_INDICATORS_CAPS_LOCK (1 << 1)

LOG_MODULE_DECLARE(zmk, CONFIG_ZMK_LOG_LEVEL);

BUILD_ASSERT(DT_HAS_CHOSEN(zmk_trackpad_led),
             "CONFIG_ZMK_TRACKPAD_LED enabled but no zmk,trackpad_led chosen node found");

static const struct device *const led_dev = DEVICE_DT_GET(DT_CHOSEN(zmk_trackpad_led));

#define CHILD_COUNT(...) +1
#define DT_NUM_CHILD(node_id) (DT_FOREACH_CHILD(node_id, CHILD_COUNT))
#define INDICATOR_LED_NUM_LEDS (DT_NUM_CHILD(DT_CHOSEN(zmk_trackpad_led)))

#define BRT_MIN 10
#define BRT_MAX 100
#define BRT_LOW 20
#define BRT_STEP 5

#define ANIMATION_INTERVAL_MS 20
#define POLLING_INTERVAL_MS 5
#define AUTO_OFF_DELAY_MS 5000

#define FLASH_ON_MS 100
#define FLASH_PERIOD 1000

static struct k_work_delayable polling_work;
static struct k_work_delayable animation_work;
static struct k_work_delayable auto_off_work;
static struct k_work_delayable usb_flash_work;

static bool capslock_on = false;
static bool touch_active = false;
static bool animation_increasing = true;
static uint8_t brightness = BRT_MIN;

static uint8_t last_valid_brt = BRT_MAX;
static uint8_t last_backlight_brt = 0;
static bool manual_override = false;
static bool keyboard_active = false;

static bool usb_flash_state = false;
static bool usb_mode = false;
static bool led_globally_enabled = true;
static uint32_t led_auto_off_delay_ms = AUTO_OFF_DELAY_MS;
static uint8_t usb_power_mode = ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF;

static void set_led_brightness(uint8_t level) {
    if (!device_is_ready(led_dev)) {
        LOG_ERR("LED device not ready");
        return;
    }
    for (int i = 0; i < INDICATOR_LED_NUM_LEDS; i++) {
        int err = led_set_brightness(led_dev, i, level);
        if (err < 0) {
            LOG_ERR("Failed to set LED[%d] brightness: %d", i, err);
        }
    }
}

static void usb_flash_work_handler(struct k_work *work) {
    if (!usb_mode || usb_power_mode != ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK) {
        set_led_brightness(0);
        return;
    }

    usb_flash_state = !usb_flash_state;
    set_led_brightness(usb_flash_state ? BRT_MAX : 0);
    k_work_reschedule(&usb_flash_work,
                      K_MSEC(usb_flash_state ? FLASH_ON_MS : (FLASH_PERIOD - FLASH_ON_MS)));
}

static void auto_off_work_handler(struct k_work *work) {
    if (!capslock_on && !touch_active) {
        manual_override = false;
        set_led_brightness(0);
        LOG_DBG("Auto-off triggered after inactivity");
    }
}

static void animation_work_handler(struct k_work *work) {
    if (!capslock_on)
        return;

    if (animation_increasing) {
        brightness += BRT_STEP;
        if (brightness >= BRT_MAX) {
            brightness = BRT_MAX;
            animation_increasing = false;
        }
    } else {
        brightness -= BRT_STEP;
        if (brightness <= BRT_LOW) {
            brightness = BRT_LOW;
            animation_increasing = true;
        }
    }

    set_led_brightness(brightness);
    k_work_reschedule(&animation_work, K_MSEC(ANIMATION_INTERVAL_MS));
}

static void polling_work_handler(struct k_work *work) {
    bool usb_power_active =
        zmk_usb_is_powered() && usb_power_mode != ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF;
    bool current_capslock = zmk_bbp9981_trackpad_get_scroll_mode_switch_enabled() &&
                            (zmk_hid_indicators_get_current_profile() & HID_INDICATORS_CAPS_LOCK);
    bool current_touch = tp_is_touched();
    bool current_active = (zmk_activity_get_state() == ZMK_ACTIVITY_ACTIVE);
    uint8_t current_brt = zmk_backlight_get_brt();
    bool current_backlight_on = zmk_backlight_is_on();

    if (!led_globally_enabled) {
        touch_active = false;
        manual_override = false;
        set_led_brightness(0);
        k_work_reschedule(&polling_work, K_MSEC(POLLING_INTERVAL_MS));
        return;
    }

    /* ---------------- USB Mode ---------------- */
    if (usb_power_active) {
        if (!usb_mode) {
            usb_mode = true;
            usb_flash_state = false;
            LOG_INF("Entered USB power LED mode");
        }

        if (usb_power_mode == ZMK_TRACKPAD_LED_USB_POWER_MODE_SOLID) {
            k_work_cancel_delayable(&usb_flash_work);
            set_led_brightness(BRT_MAX);
        } else {
            k_work_reschedule(&usb_flash_work, K_NO_WAIT);
        }
        k_work_reschedule(&polling_work, K_MSEC(POLLING_INTERVAL_MS));
        return;
    }

    /* ---------------- BLE Output Mode ---------------- */
    if (usb_mode) {
        usb_mode = false;
        k_work_cancel_delayable(&usb_flash_work);
        set_led_brightness(0);
        LOG_INF("Exited USB power LED mode");
    }

    if (current_active != keyboard_active) {
        keyboard_active = current_active;
        if (keyboard_active) {
            last_backlight_brt = current_brt;
        }
    }

    /* CapsLock */
    if (current_capslock != capslock_on) {
        capslock_on = current_capslock;
        if (capslock_on) {
            brightness = BRT_MIN;
            animation_increasing = true;
            k_work_reschedule(&animation_work, K_NO_WAIT);
        } else {
            k_work_cancel_delayable(&animation_work);
            manual_override = false;

            if (current_touch) {
                touch_active = true;
                manual_override = true;
                if (keyboard_active) {
                    last_valid_brt = MAX(BRT_MIN, current_brt);
                }
                set_led_brightness(last_valid_brt);
                k_work_cancel_delayable(&auto_off_work);
            } else {
                set_led_brightness(0);
            }
        }
    }

    /* touched */
    if (!capslock_on && current_touch != touch_active) {
        touch_active = current_touch;
        if (touch_active) {
            manual_override = true;
            if (keyboard_active && current_backlight_on) {
                last_valid_brt = MAX(BRT_MIN, current_brt);
                set_led_brightness(last_valid_brt);
            } else {
                set_led_brightness(0);
            }
            k_work_cancel_delayable(&auto_off_work);
        } else {
            if (led_auto_off_delay_ms > 0) {
                k_work_reschedule(&auto_off_work, K_MSEC(led_auto_off_delay_ms));
            } else if (current_backlight_on) {
                last_valid_brt = MAX(BRT_MIN, current_brt);
                set_led_brightness(last_valid_brt);
            } else if (!capslock_on) {
                set_led_brightness(0);
            }
        }
    }

    if (!capslock_on && !touch_active && current_backlight_on && led_auto_off_delay_ms == 0) {
        last_backlight_brt = current_brt;
        last_valid_brt = MAX(BRT_MIN, current_brt);
        manual_override = true;
        k_work_cancel_delayable(&auto_off_work);
        set_led_brightness(last_valid_brt);
    } else if (!capslock_on && !touch_active && !current_backlight_on) {
        last_backlight_brt = 0;
        manual_override = false;
        k_work_cancel_delayable(&auto_off_work);
        set_led_brightness(0);
    } else if (!capslock_on && !touch_active && current_brt != last_backlight_brt &&
               keyboard_active && current_backlight_on) {
        last_backlight_brt = current_brt;
        if (current_brt > 0) {
            manual_override = true;
            last_valid_brt = MAX(BRT_MIN, current_brt);
            set_led_brightness(last_valid_brt);
            if (led_auto_off_delay_ms > 0) {
                k_work_reschedule(&auto_off_work, K_MSEC(led_auto_off_delay_ms));
            }
        } else {
            set_led_brightness(0);
        }
    }

    k_work_reschedule(&polling_work, K_MSEC(POLLING_INTERVAL_MS));
}

uint8_t indicator_tp_get_last_valid_brightness(void) { return last_valid_brt; }
bool zmk_trackpad_led_get_enabled(void) { return led_globally_enabled; }

void zmk_trackpad_led_set_enabled(bool enabled) {
    led_globally_enabled = enabled;

    if (!enabled) {
        k_work_cancel_delayable(&animation_work);
        k_work_cancel_delayable(&auto_off_work);
        set_led_brightness(0);
        return;
    }

    k_work_reschedule(&polling_work, K_NO_WAIT);
}

void zmk_trackpad_led_set_idle_timeout_ms(uint32_t timeout_ms) {
    if (timeout_ms == 0) {
        led_auto_off_delay_ms = 0;
        k_work_cancel_delayable(&auto_off_work);
        return;
    }

    led_auto_off_delay_ms = MAX(timeout_ms, 1000U);
}

void zmk_trackpad_led_set_usb_power_mode(uint8_t mode) {
    switch (mode) {
    case ZMK_TRACKPAD_LED_USB_POWER_MODE_SOLID:
    case ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK:
        usb_power_mode = mode;
        break;
    default:
        usb_power_mode = ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF;
        break;
    }

    if (!usb_mode) {
        k_work_reschedule(&polling_work, K_NO_WAIT);
        return;
    }

    if (usb_power_mode == ZMK_TRACKPAD_LED_USB_POWER_MODE_SOLID) {
        k_work_cancel_delayable(&usb_flash_work);
        set_led_brightness(BRT_MAX);
    } else if (usb_power_mode == ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK) {
        usb_flash_state = false;
        k_work_reschedule(&usb_flash_work, K_NO_WAIT);
    } else {
        usb_mode = false;
        k_work_cancel_delayable(&usb_flash_work);
        set_led_brightness(0);
    }
}

uint8_t zmk_trackpad_led_get_usb_power_mode(void) { return usb_power_mode; }

static int indicator_tp_init(void) {
    if (!device_is_ready(led_dev)) {
        LOG_ERR("LED indicator_tp device not ready");
        return -ENODEV;
    }

    set_led_brightness(0);
    usb_mode = false;
    usb_flash_state = false;
    last_backlight_brt = zmk_backlight_get_brt();
    capslock_on = touch_active = manual_override = keyboard_active = false;

    k_work_init_delayable(&polling_work, polling_work_handler);
    k_work_init_delayable(&animation_work, animation_work_handler);
    k_work_init_delayable(&auto_off_work, auto_off_work_handler);
    k_work_init_delayable(&usb_flash_work, usb_flash_work_handler);

    k_work_reschedule(&polling_work, K_NO_WAIT);
    return 0;
}

SYS_INIT(indicator_tp_init, APPLICATION, CONFIG_APPLICATION_INIT_PRIORITY);
