/*
 * A320 optical sensor driver (polling via motion GPIO, Zephyr input subsystem)
 *
 * SPDX-License-Identifier: Apache-2.0
 */

#define DT_DRV_COMPAT avago_a320

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/input/input.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/byteorder.h>

#include <stdlib.h>
#include <zmk/event_manager.h>
#include <zmk/events/position_state_changed.h>
#include <zmk/events/hid_indicators_changed.h>
#include <zmk/bbp9981_trackpad.h>
#include <zephyr/dt-bindings/input/input-event-codes.h>
#include "a320_0x57.h"
#include "trackpad_led.h"

LOG_MODULE_REGISTER(a320, CONFIG_A320_LOG_LEVEL);

#ifndef CONFIG_A320_POLL_INTERVAL_MS
#define CONFIG_A320_POLL_INTERVAL_MS 10
#endif

/* ==== Detect HID indicators ==== */
static zmk_hid_indicators_t current_indicators;
#define HID_INDICATORS_CAPS_LOCK (1 << 1)

/* === Configure Motion GPIO === */
#define MOTION_GPIO_NODE DT_NODELABEL(gpio0)
#define MOTION_GPIO_PIN 2
static const struct device *motion_gpio_dev;

/* ==== Touch status flag ==== */
static bool touched = false;

static int16_t sum_dx = 0, sum_dy = 0;
static uint8_t sample_cnt = 0;
static bool last_capslock = false;
static uint32_t last_read_time = 0;

/* Runtime-tunable parameters exposed through ZMK Studio. */
static bool runtime_enabled = true;
static uint8_t runtime_sensitivity = 5;
static bool runtime_scroll_inverted = false;
static uint8_t runtime_scroll_speed = 5;
static uint16_t runtime_poll_interval_ms = CONFIG_A320_POLL_INTERVAL_MS;
static bool runtime_precision_mode_enabled = true;
static bool runtime_scroll_mode_switch_enabled = true;

static void reset_scroll_state(void) {
    sum_dx = 0;
    sum_dy = 0;
    sample_cnt = 0;
    last_read_time = 0;
}

/*
 * Keep the vendor scroll gesture detection untouched and only allow faster
 * vertical output above the known-good default range. Values 1-5 all map to
 * baseline behavior so changing the setting cannot make scrolling slower or
 * "disappear" again.
 */
static int16_t boost_vertical_scroll_step(int16_t value, uint8_t speed) {
    static const uint16_t multiplier_q8[] = {256, 256, 256, 256, 256,
                                             320, 384, 448, 512, 640};

    if (value == 0 || speed <= 5) {
        return value;
    }

    speed = CLAMP(speed, 1, 10);

    int32_t magnitude = value < 0 ? -value : value;
    int32_t scaled = magnitude * multiplier_q8[speed - 1];
    scaled = (scaled + 128) / 256;
    scaled = MAX(1, scaled);

    return value < 0 ? -scaled : scaled;
}

/*
 * The board's scroll gesture detection is stable at the vendor's default
 * 10 ms cadence. Let Studio tune pointer polling, but keep scroll mode on the
 * known-good internal cadence so changing polling interval does not distort
 * scroll behavior.
 */
static uint16_t get_effective_poll_interval_ms(bool scroll_mode_active) {
    return scroll_mode_active ? CONFIG_A320_POLL_INTERVAL_MS : runtime_poll_interval_ms;
}

/* =========================
 *   Data & Config structs
 * ========================= */
struct a320_dev_config {
    struct i2c_dt_spec i2c;
    struct gpio_dt_spec motion_gpio; /* Motion pin: active-low */
    uint16_t x_input_code;
    uint16_t y_input_code;
};

struct a320_data {
    const struct device *dev;
    struct k_work_delayable poll_work;
};

static void a320_poll_work_handler(struct k_work *work);
static int a320_read_motion(const struct device *dev, int16_t *dx, int16_t *dy);

static bool ctrl_pressed = false;

/* ==== position_state_changed event listener ==== */
static int ctrl_listener_cb(const zmk_event_t *eh) {
    const struct zmk_position_state_changed *ev = as_zmk_position_state_changed(eh);
    if (!ev) {
        return 0;
    }

    if (ev->position == 37) {
        ctrl_pressed = ev->state;
        LOG_INF("Ctrl position=37 %s", ctrl_pressed ? "PRESSED" : "RELEASED");
    }
    return 0;
}
ZMK_LISTENER(a320_ctrl_listener, ctrl_listener_cb);
ZMK_SUBSCRIPTION(a320_ctrl_listener, zmk_position_state_changed);

static int hid_indicators_listener(const zmk_event_t *eh) {
    if (as_zmk_hid_indicators_changed(eh)) {
        const struct zmk_hid_indicators_changed *ev = as_zmk_hid_indicators_changed(eh);
        current_indicators = ev->indicators; // Cache the latest HID indicator state
    }
    return ZMK_EV_EVENT_BUBBLE;
}

/* =========================
 *   Work handler (polling)
 * ========================= */

static void a320_poll_work_handler(struct k_work *work) {
    struct k_work_delayable *dwork = CONTAINER_OF(work, struct k_work_delayable, work);
    struct a320_data *data = CONTAINER_OF(dwork, struct a320_data, poll_work);
    const struct device *dev = data->dev;

    int pin_state = gpio_pin_get(motion_gpio_dev, MOTION_GPIO_PIN);

    bool capslock = current_indicators & HID_INDICATORS_CAPS_LOCK;
    bool scroll_mode_active = runtime_scroll_mode_switch_enabled && capslock;

    uint16_t effective_poll_interval_ms = get_effective_poll_interval_ms(scroll_mode_active);

    if (!runtime_enabled) {
        touched = false;
        k_work_reschedule(&data->poll_work, K_MSEC(runtime_poll_interval_ms));
        return;
    }

    /* ======== Clear CapsLock residual scroll data ======== */
    if (last_capslock && !scroll_mode_active) {
        reset_scroll_state();
    }
    last_capslock = scroll_mode_active;
    /* ====================================================== */

    if (pin_state == 0) {
        int16_t dx = 0, dy = 0;

        if (a320_read_motion(dev, &dx, &dy) == 0) {

            if (runtime_precision_mode_enabled && ctrl_pressed) {
                dx /= 2;
                dy /= 2;
            }

            /* === Normal cursor movement when CapsLock is off === */
            if (!scroll_mode_active) {
                uint8_t tp_led_brt = indicator_tp_get_last_valid_brightness();
                float tp_factor = 0.4f + 0.01f * tp_led_brt;
                float sensitivity_factor = 0.5f + 0.1f * runtime_sensitivity;

                dx = dx * 3 / 2 * tp_factor * sensitivity_factor;
                dy = dy * 3 / 2 * tp_factor * sensitivity_factor;

                input_report_rel(dev, INPUT_REL_X, dx, false, K_FOREVER);
                input_report_rel(dev, INPUT_REL_Y, dy, true, K_FOREVER);

                touched = true;
            }

            /* === Scroll mode when CapsLock is on === */
            else {

                uint32_t now = k_uptime_get_32();

                /* --- Condition 1: dx=0 && dy=0 → clear accumulated scroll, avoid direction residue
                 * --- */
                if (dx == 0 && dy == 0) {
                    sum_dx = 0;
                    sum_dy = 0;
                    sample_cnt = 0;
                }

                /* --- Condition 2: time since last read > 50ms → treat as new swipe, clear
                   accumulation --- */
                else if (now - last_read_time > 50) {
                    sum_dx = 0;
                    sum_dy = 0;
                    sample_cnt = 0;
                }

                /* Update timestamp (must be after successful data read) */
                last_read_time = now;

                /* Normal accumulation logic */
                sum_dx += dx;
                sum_dy += dy;
                sample_cnt++;

                uint16_t poll_interval = MAX(effective_poll_interval_ms, 1);
                uint8_t threshold = MAX(1, (40 + poll_interval - 1) / poll_interval);

                if (sample_cnt >= threshold) {
                    int16_t sx = sum_dx;
                    int16_t sy = sum_dy;

                    sum_dx = 0;
                    sum_dy = 0;
                    sample_cnt = 0;

                    int16_t scroll_x = 0, scroll_y = 0;

                    if (abs(sy) >= 128) {
                        scroll_x = -sx / 24;
                        scroll_y = -sy / 24;
                    } else if (abs(sy) >= 64) {
                        scroll_x = -sx / 16;
                        scroll_y = -sy / 16;
                    } else if (abs(sy) >= 32) {
                        scroll_x = -sx / 12;
                        scroll_y = -sy / 12;
                    } else if (abs(sy) >= 21) {
                        scroll_x = -sx / 8;
                        scroll_y = -sy / 8;
                    } else if (abs(sy) >= 3) {
                        scroll_x = (sx > 0) ? -1 : (sx < 0) ? 1 : 0;
                        scroll_y = (sy > 0) ? -1 : (sy < 0) ? 1 : 0;
                    } else {
                        scroll_x = (sx > 0) ? -1 : (sx < 0) ? 1 : 0;
                        scroll_y = 0;
                    }

                    scroll_y = boost_vertical_scroll_step(scroll_y, runtime_scroll_speed);

                    if (runtime_scroll_inverted) {
                        scroll_y = -scroll_y;
                    }

                    input_report_rel(dev, INPUT_REL_HWHEEL, -scroll_x, false, K_FOREVER);
                    input_report_rel(dev, INPUT_REL_WHEEL, scroll_y, true, K_FOREVER);
                }
            }
        }
    } else {
        touched = false;
    }

    k_work_reschedule(&data->poll_work, K_MSEC(effective_poll_interval_ms));
}

/* =========================
 *   I2C read sequence
 * ========================= */
static int a320_read_motion(const struct device *dev, int16_t *dx, int16_t *dy) {
    const struct a320_dev_config *cfg = dev->config;
    uint8_t buf[7] = {0};
    uint8_t reg = 0x0A;
    int ret;

    ret = i2c_write_dt(&cfg->i2c, &reg, 1);
    if (ret < 0) {
        LOG_ERR("i2c write 0x0A failed: %d", ret);
        return ret;
    }

    ret = i2c_burst_read_dt(&cfg->i2c, 0x0A, buf, sizeof(buf));
    if (ret < 0) {
        LOG_ERR("i2c burst read from 0x0A failed: %d", ret);
        return ret;
    }

    *dy = (int8_t)buf[1];
    *dx = (int8_t)buf[3];
    return 0;
}

/* =========================
 *   Device init
 * ========================= */
static int a320_init(const struct device *dev) {
    const struct a320_dev_config *cfg = dev->config;
    struct a320_data *data = dev->data;

    LOG_INF("A320 init: %s", dev->name);

    if (!device_is_ready(cfg->i2c.bus)) {
        LOG_ERR("I2C bus not ready");
        return -ENODEV;
    }

    motion_gpio_dev = DEVICE_DT_GET(MOTION_GPIO_NODE);
    if (!device_is_ready(motion_gpio_dev)) {
        LOG_ERR("Motion GPIO device not ready");
        return -ENODEV;
    }
    gpio_pin_configure(motion_gpio_dev, MOTION_GPIO_PIN, GPIO_INPUT | GPIO_PULL_UP);

    data->dev = dev;

    k_work_init_delayable(&data->poll_work, a320_poll_work_handler);
    k_work_schedule(&data->poll_work, K_MSEC(runtime_poll_interval_ms));

    return 0;
}

#define A320_INIT_PRIORITY CONFIG_INPUT_A320_INIT_PRIORITY

#define A320_DEFINE(inst)                                                                          \
    static struct a320_data a320_data_##inst;                                                      \
    static const struct a320_dev_config a320_config_##inst = {                                     \
        .i2c = I2C_DT_SPEC_INST_GET(inst),                                                         \
        .motion_gpio = GPIO_DT_SPEC_INST_GET_OR(inst, motion_gpios, {0}),                          \
        .x_input_code = DT_PROP_OR(DT_DRV_INST(inst), x_input_code, INPUT_REL_X),                  \
        .y_input_code = DT_PROP_OR(DT_DRV_INST(inst), y_input_code, INPUT_REL_Y),                  \
    };                                                                                             \
    DEVICE_DT_INST_DEFINE(inst, a320_init, NULL, &a320_data_##inst, &a320_config_##inst,           \
                          POST_KERNEL, A320_INIT_PRIORITY, NULL);

DT_INST_FOREACH_STATUS_OKAY(A320_DEFINE)
ZMK_LISTENER(a320_hid_listener, hid_indicators_listener);
ZMK_SUBSCRIPTION(a320_hid_listener, zmk_hid_indicators_changed);

bool zmk_bbp9981_trackpad_is_touched(void) { return touched; }

void zmk_bbp9981_trackpad_set_enabled(bool enabled) { runtime_enabled = enabled; }
bool zmk_bbp9981_trackpad_get_enabled(void) { return runtime_enabled; }

void zmk_bbp9981_trackpad_set_sensitivity(uint8_t sensitivity) {
    runtime_sensitivity = CLAMP(sensitivity, 1, 10);
}
uint8_t zmk_bbp9981_trackpad_get_sensitivity(void) { return runtime_sensitivity; }

void zmk_bbp9981_trackpad_set_scroll_inverted(bool inverted) {
    runtime_scroll_inverted = inverted;
}
bool zmk_bbp9981_trackpad_get_scroll_inverted(void) { return runtime_scroll_inverted; }

void zmk_bbp9981_trackpad_set_scroll_speed(uint8_t speed) {
    runtime_scroll_speed = CLAMP(speed, 1, 10);
    reset_scroll_state();
}
uint8_t zmk_bbp9981_trackpad_get_scroll_speed(void) { return runtime_scroll_speed; }

void zmk_bbp9981_trackpad_set_poll_interval_ms(uint16_t interval_ms) {
    runtime_poll_interval_ms = CLAMP(interval_ms, 1, 100);
    reset_scroll_state();
}
uint16_t zmk_bbp9981_trackpad_get_poll_interval_ms(void) { return runtime_poll_interval_ms; }

void zmk_bbp9981_trackpad_set_precision_mode_enabled(bool enabled) {
    runtime_precision_mode_enabled = enabled;
}
bool zmk_bbp9981_trackpad_get_precision_mode_enabled(void) {
    return runtime_precision_mode_enabled;
}

void zmk_bbp9981_trackpad_set_scroll_mode_switch_enabled(bool enabled) {
    runtime_scroll_mode_switch_enabled = enabled;
    if (!enabled) {
        last_capslock = false;
    }
    reset_scroll_state();
}
bool zmk_bbp9981_trackpad_get_scroll_mode_switch_enabled(void) {
    return runtime_scroll_mode_switch_enabled;
}

bool tp_is_touched(void) { return zmk_bbp9981_trackpad_is_touched(); }
