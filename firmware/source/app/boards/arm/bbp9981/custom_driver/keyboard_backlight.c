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

#include <zmk/rgb_underglow.h>
#include <zmk/event_manager.h>
#include <zmk/activity.h>
#include <zmk/keymap.h>
#include <zmk/events/activity_state_changed.h>
#include <zmk/events/position_state_changed.h>

LOG_MODULE_DECLARE(zmk, CONFIG_ZMK_LOG_LEVEL);

BUILD_ASSERT(DT_HAS_CHOSEN(zmk_keyboard_backlight),
             "keyboard_backlight: No zmk_keyboard_backlight chosen node found");

static const struct device *const indiled_dev = DEVICE_DT_GET(DT_CHOSEN(zmk_keyboard_backlight));

#define CHILD_COUNT(...) +1
#define DT_NUM_CHILD(node_id) (DT_FOREACH_CHILD(node_id, CHILD_COUNT))
#define INDICATOR_LED_NUM_LEDS (DT_NUM_CHILD(DT_CHOSEN(zmk_keyboard_backlight)))

#define BRT_MAX 90
#define BRT_BLINK_HIGH 100
#define BRT_BLINK_LOW 10
#define BLINK_INTERVAL_MS 500

#define CYCLE_BRT_MIN 10
#define CYCLE_BRT_MAX 100
#define CYCLE_BRT_STEP 5
#define CYCLE_INTERVAL_MS 20

static bool prev_active = false;
static int prev_layer = -1;
static bool blink_on = false;
static bool blink_start_high = true;
static uint8_t cycle_brightness = CYCLE_BRT_MIN;
static bool cycle_direction_up = true;

static struct k_work_delayable polling_work;
static struct k_work_delayable blink_work;
static struct k_work_delayable cycle_work;

static void set_led_brightness(uint8_t level) {
    if (!device_is_ready(indiled_dev)) {
        LOG_ERR("Indicator LED device not ready");
        return;
    }
    for (int i = 0; i < INDICATOR_LED_NUM_LEDS; i++) {
        int err = led_set_brightness(indiled_dev, i, level);
        if (err < 0) {
            LOG_ERR("Failed to set LED[%d] brightness: %d", i, err);
        }
    }
}

/* 层1/层3闪烁 */
static void blink_work_handler(struct k_work *work) {
    if (prev_layer != 1 && prev_layer != 3) {
        set_led_brightness(0);
        return;
    }

    blink_on = !blink_on;
    set_led_brightness(blink_on ? BRT_BLINK_HIGH : BRT_BLINK_LOW);

    uint32_t interval = (prev_layer == 3) ? (BLINK_INTERVAL_MS / 2) : BLINK_INTERVAL_MS;
    k_work_reschedule(&blink_work, K_MSEC(interval));
}

static void cycle_work_handler(struct k_work *work) {
    if (prev_layer != 2) {
        set_led_brightness(0);
        return;
    }

    set_led_brightness(cycle_brightness);

    if (cycle_direction_up) {
        cycle_brightness += CYCLE_BRT_STEP;
        if (cycle_brightness >= CYCLE_BRT_MAX) {
            cycle_brightness = CYCLE_BRT_MAX;
            cycle_direction_up = false;
        }
    } else {
        if (cycle_brightness < CYCLE_BRT_STEP) {
            cycle_brightness = CYCLE_BRT_MIN;
            cycle_direction_up = true;
        } else {
            cycle_brightness -= CYCLE_BRT_STEP;
        }
    }
    k_work_reschedule(&cycle_work, K_MSEC(CYCLE_INTERVAL_MS));
}

static bool backlight_allowed = false;

static int key_listener_cb(const zmk_event_t *eh) {
    const struct zmk_position_state_changed *ev = as_zmk_position_state_changed(eh);
    if (ev && ev->state) {
        backlight_allowed = true;
    }
    return ZMK_EV_EVENT_BUBBLE;
}
ZMK_LISTENER(kb_backlight_key_listener, key_listener_cb);
ZMK_SUBSCRIPTION(kb_backlight_key_listener, zmk_position_state_changed);

static void polling_work_handler(struct k_work *work) {
    bool active = (zmk_activity_get_state() == ZMK_ACTIVITY_ACTIVE);
    int current_layer = zmk_keymap_highest_layer_active();
    struct zmk_led_hsb ug = zmk_rgb_underglow_calc_brt(0);
    uint8_t ug_brt = ug.b;
    bool rgb_on = true;
#if IS_ENABLED(CONFIG_ZMK_RGB_UNDERGLOW)
    if (zmk_rgb_underglow_get_state(&rgb_on) < 0) {
        rgb_on = true;
    }
#endif

    /* Reset allowed state if we went idle */
    if (!active) {
        backlight_allowed = false;
    }

    /* Force allowed if we detect layer change (e.g. from cache) or if we want to be safe,
       but relies mainly on key listener. */

    if (current_layer != prev_layer || active != prev_active) {
        prev_layer = current_layer;
        prev_active = active;

        k_work_cancel_delayable(&blink_work);
        k_work_cancel_delayable(&cycle_work);
        blink_on = false;
        cycle_brightness = CYCLE_BRT_MIN;
        cycle_direction_up = true;

        switch (current_layer) {
        case 0:
            /* Only turn on if active AND a key was pressed to authorize it */
            uint8_t brt = (rgb_on && active && backlight_allowed) ? ug_brt : 0;
            set_led_brightness(brt);
            break;

        case 1:
            /* Layers 1/2/3 usually imply keys were pressed to get there, so we assume valid */
            /* But if we layer-lock? Then we might want logic.
               However, usually you hold a key to access layers.
               If layer is active, backlight_allowed should essentially be true because you pressed
               a key. */

            blink_start_high = !rgb_on ? true : false;
            blink_on = blink_start_high;
            /* Allow blink if active */
            set_led_brightness((active && blink_on) ? BRT_BLINK_HIGH : BRT_BLINK_LOW);

            k_work_reschedule(&blink_work, K_MSEC(BLINK_INTERVAL_MS / 2));
            break;

        case 2:
            k_work_reschedule(&cycle_work, K_MSEC(100));
            break;

        case 3:
            blink_on = false;
            set_led_brightness(BRT_BLINK_LOW);
            k_work_reschedule(&blink_work, K_MSEC(BLINK_INTERVAL_MS / 2));
            break;

        default:
            set_led_brightness(0);
            break;
        }
    }

    /* Continuous update for Layer 0 if brightness changes or allowed state changes?
       The original code only updated on state change (layer or active).
       We should probably re-evaluate brightness for Layer 0 if backlight_allowed changes.
       But current logic only updates on prev_layer/active diff.

       Let's assume we need to update if backlight_allowed changes?
       Actually, polling runs every 100ms. If we modify 'prev_active' logic to also check allowed?

       Let's stick to the structure but enforce brightness update if we are in Layer 0.
    */
    if (current_layer == 0 && active && backlight_allowed) {
        /* Enforce brightness in case it was 0 before */
        uint8_t brt = rgb_on ? ug_brt : 0;
        set_led_brightness(brt);
    } else if (current_layer == 0 && (!active || !backlight_allowed)) {
        set_led_brightness(0);
    }

    k_work_reschedule(&polling_work, K_MSEC(100));
}

static int keyboardbacklight_init(void) {
    if (!device_is_ready(indiled_dev)) {
        LOG_ERR("LED indicator device not ready");
        return -ENODEV;
    }

    prev_active = (zmk_activity_get_state() == ZMK_ACTIVITY_ACTIVE);
    prev_layer = -1;

    k_work_init_delayable(&polling_work, polling_work_handler);
    k_work_init_delayable(&blink_work, blink_work_handler);
    k_work_init_delayable(&cycle_work, cycle_work_handler);

    k_work_reschedule(&polling_work, K_MSEC(100));
    return 0;
}

SYS_INIT(keyboardbacklight_init, APPLICATION, CONFIG_APPLICATION_INIT_PRIORITY);
