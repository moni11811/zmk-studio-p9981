/*
 * Copyright (c) 2025 ZitaoTech
 *
 * SPDX-License-Identifier: MIT
 */

#include <stdio.h>
#include <string.h>

#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/init.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/settings/settings.h>
#include <zephyr/sys/util.h>

LOG_MODULE_DECLARE(zmk_studio, CONFIG_ZMK_STUDIO_LOG_LEVEL);

#include <drivers/ext_power.h>
#include <zmk/activity.h>
#include <zmk/backlight.h>
#include <zmk/battery.h>
#include <zmk/bbp9981_trackpad.h>
#include <zmk/bbp9981_trackpad_led.h>
#include <zmk/ble.h>
#include <zmk/endpoints.h>
#include <zmk/events/activity_state_changed.h>
#include <zmk/events/battery_state_changed.h>
#include <zmk/events/ble_active_profile_changed.h>
#include <zmk/events/endpoint_changed.h>
#include <zmk/events/usb_conn_state_changed.h>
#include <zmk/pm.h>
#include <zmk/rgb_underglow.h>
#include <zmk/studio/rpc.h>
#include <zmk/usb.h>

#define MAX_BT_PROFILES 4
#define BT_PROFILE_NAME_LEN 32

#define SETTINGS_SUBTREE "bb9981/studio"
#define TRACKPAD_SETTINGS_PATH SETTINGS_SUBTREE "/trackpad"
#define BACKLIGHT_SETTINGS_PATH SETTINGS_SUBTREE "/backlight"
#define BLUETOOTH_SETTINGS_PATH SETTINGS_SUBTREE "/bluetooth"
#define POWER_SETTINGS_PATH SETTINGS_SUBTREE "/power"
#define SLEEP_SETTINGS_PATH SETTINGS_SUBTREE "/sleep"
#define TRACKPAD_SETTINGS_SAVE_DELAY_MS 500

#if defined(CONFIG_BT_CTLR_TX_PWR_DBM)
#define TX_POWER_BOOST_ENABLED (CONFIG_BT_CTLR_TX_PWR_DBM >= 8)
#else
#define TX_POWER_BOOST_ENABLED IS_ENABLED(CONFIG_BT_CTLR_TX_PWR_PLUS_8)
#endif

struct trackpad_config {
    bool enabled;
    uint32_t sensitivity;
    bool scroll_inverted;
    uint32_t scroll_speed;
    uint32_t polling_interval_ms;
    bool precision_mode_enabled;
    bool scroll_mode_switch_enabled;
    uint8_t scroll_profile;
};

struct backlight_prefs {
    bool backlight_auto_off;
    uint32_t idle_timeout_ms;
};

struct bluetooth_prefs {
    char profile_names[MAX_BT_PROFILES][BT_PROFILE_NAME_LEN];
};

struct power_prefs {
    uint32_t battery_report_interval_s;
    uint8_t charging_led_mode;
};

struct sleep_prefs {
    bool idle_enabled;
    uint32_t idle_timeout_ms;
    bool sleep_enabled;
    uint32_t sleep_timeout_ms;
    bool sleep_while_usb_powered;
};

static const struct trackpad_config default_trackpad_cfg = {
    .enabled = true,
    .sensitivity = 5,
    .scroll_inverted = false,
    .scroll_speed = 5,
    .polling_interval_ms = 10,
    .precision_mode_enabled = true,
    .scroll_mode_switch_enabled = true,
    .scroll_profile = ZMK_BBP9981_SCROLL_PROFILE_CLASSIC_2D,
};

static const struct backlight_prefs default_backlight_prefs = {
    .backlight_auto_off = true,
    .idle_timeout_ms = 30000,
};

static const struct bluetooth_prefs default_bluetooth_prefs = {
    .profile_names = {
        "Profile 1",
        "Profile 2",
        "Profile 3",
        "Profile 4",
    },
};

static const struct power_prefs default_power_prefs = {
    .battery_report_interval_s = 60,
    .charging_led_mode = ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF,
};

static const struct sleep_prefs default_sleep_prefs = {
    .idle_enabled = true,
    .idle_timeout_ms = 30000,
    .sleep_enabled = false,
    .sleep_timeout_ms = 1800000,
    .sleep_while_usb_powered = false,
};

static struct trackpad_config trackpad_cfg = {
    .enabled = true,
    .sensitivity = 5,
    .scroll_inverted = false,
    .scroll_speed = 5,
    .polling_interval_ms = 10,
    .precision_mode_enabled = true,
    .scroll_mode_switch_enabled = true,
    .scroll_profile = ZMK_BBP9981_SCROLL_PROFILE_CLASSIC_2D,
};

static struct backlight_prefs backlight_cfg = {
    .backlight_auto_off = true,
    .idle_timeout_ms = 30000,
};

static struct bluetooth_prefs bluetooth_cfg = {
    .profile_names = {
        "Profile 1",
        "Profile 2",
        "Profile 3",
        "Profile 4",
    },
};

static struct power_prefs power_cfg = {
    .battery_report_interval_s = 60,
    .charging_led_mode = ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF,
};

static struct sleep_prefs sleep_cfg = {
    .idle_enabled = true,
    .idle_timeout_ms = 30000,
    .sleep_enabled = false,
    .sleep_timeout_ms = 1800000,
    .sleep_while_usb_powered = false,
};

static struct k_work_delayable trackpad_settings_save_work;

#if DT_HAS_COMPAT_STATUS_OKAY(zmk_ext_power_generic)
static const struct device *const ext_power_dev = DEVICE_DT_GET(DT_INST(0, zmk_ext_power_generic));
#else
static const struct device *const ext_power_dev = NULL;
#endif

ZMK_RPC_SUBSYSTEM(settings)

#define SETTINGS_RESPONSE(type, ...) ZMK_RPC_RESPONSE(settings, type, __VA_ARGS__)
#define SETTINGS_NOTIFICATION(type, ...) ZMK_RPC_NOTIFICATION(settings, type, __VA_ARGS__)

static void sanitize_trackpad_config(struct trackpad_config *config) {
    config->sensitivity = CLAMP(config->sensitivity, 1U, 10U);
    config->scroll_speed = CLAMP(config->scroll_speed, 1U, 10U);
    config->polling_interval_ms = CLAMP(config->polling_interval_ms, 1U, 100U);
    config->scroll_mode_switch_enabled = !!config->scroll_mode_switch_enabled;
    config->scroll_profile =
        config->scroll_profile == ZMK_BBP9981_SCROLL_PROFILE_ANALOG_3D
            ? ZMK_BBP9981_SCROLL_PROFILE_ANALOG_3D
            : ZMK_BBP9981_SCROLL_PROFILE_CLASSIC_2D;
}

static void sanitize_backlight_config(struct backlight_prefs *config) {
    config->idle_timeout_ms = CLAMP(config->idle_timeout_ms, 1000U, 600000U);
}

static void sanitize_bluetooth_config(struct bluetooth_prefs *config) {
    for (int i = 0; i < MAX_BT_PROFILES; i++) {
        config->profile_names[i][BT_PROFILE_NAME_LEN - 1] = '\0';
        if (config->profile_names[i][0] == '\0') {
            snprintf(config->profile_names[i], BT_PROFILE_NAME_LEN, "Profile %d", i + 1);
        }
    }
}

static void sanitize_power_config(struct power_prefs *config) {
    config->battery_report_interval_s = CLAMP(config->battery_report_interval_s, 10U, 3600U);

    switch (config->charging_led_mode) {
    case ZMK_TRACKPAD_LED_USB_POWER_MODE_SOLID:
    case ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK:
        break;
    default:
        config->charging_led_mode = ZMK_TRACKPAD_LED_USB_POWER_MODE_OFF;
        break;
    }
}

static void sanitize_sleep_config(struct sleep_prefs *config) {
    config->idle_timeout_ms = CLAMP(config->idle_timeout_ms, 1000U, 3600000U);
    config->sleep_timeout_ms = CLAMP(config->sleep_timeout_ms, 5000U, 14400000U);
    config->idle_enabled = !!config->idle_enabled;
    config->sleep_enabled = !!config->sleep_enabled;
    config->sleep_while_usb_powered = !!config->sleep_while_usb_powered;

    if (config->sleep_enabled && config->idle_enabled &&
        config->sleep_timeout_ms <= config->idle_timeout_ms) {
        config->sleep_timeout_ms = config->idle_timeout_ms + 1000U;
    }
}

static int read_settings_blob_with_defaults(settings_read_cb read_cb, void *cb_arg, size_t len,
                                            void *dest, size_t dest_size,
                                            const void *defaults) {
    memcpy(dest, defaults, dest_size);

    size_t read_len = MIN(len, dest_size);
    int rc = read_cb(cb_arg, dest, read_len);
    if (rc < 0) {
        return rc;
    }

    return 0;
}

static int save_trackpad_settings(void) {
#if IS_ENABLED(CONFIG_SETTINGS)
    return settings_save_one(TRACKPAD_SETTINGS_PATH, &trackpad_cfg, sizeof(trackpad_cfg));
#else
    return 0;
#endif
}

static void trackpad_settings_save_work_handler(struct k_work *work) {
    ARG_UNUSED(work);

    if (save_trackpad_settings() < 0) {
        LOG_WRN("Failed to persist trackpad settings");
    }
}

static void schedule_trackpad_settings_save(void) {
    k_work_reschedule(&trackpad_settings_save_work, K_MSEC(TRACKPAD_SETTINGS_SAVE_DELAY_MS));
}

static int save_backlight_settings(void) {
#if IS_ENABLED(CONFIG_SETTINGS)
    return settings_save_one(BACKLIGHT_SETTINGS_PATH, &backlight_cfg, sizeof(backlight_cfg));
#else
    return 0;
#endif
}

static int save_bluetooth_settings(void) {
#if IS_ENABLED(CONFIG_SETTINGS)
    return settings_save_one(BLUETOOTH_SETTINGS_PATH, &bluetooth_cfg, sizeof(bluetooth_cfg));
#else
    return 0;
#endif
}

static int save_power_settings(void) {
#if IS_ENABLED(CONFIG_SETTINGS)
    return settings_save_one(POWER_SETTINGS_PATH, &power_cfg, sizeof(power_cfg));
#else
    return 0;
#endif
}

static int save_sleep_settings(void) {
#if IS_ENABLED(CONFIG_SETTINGS)
    return settings_save_one(SLEEP_SETTINGS_PATH, &sleep_cfg, sizeof(sleep_cfg));
#else
    return 0;
#endif
}

static void apply_trackpad_runtime(void) {
    sanitize_trackpad_config(&trackpad_cfg);
    zmk_bbp9981_trackpad_set_enabled(trackpad_cfg.enabled);
    zmk_bbp9981_trackpad_set_sensitivity(trackpad_cfg.sensitivity);
    zmk_bbp9981_trackpad_set_scroll_inverted(trackpad_cfg.scroll_inverted);
    zmk_bbp9981_trackpad_set_scroll_speed(trackpad_cfg.scroll_speed);
    zmk_bbp9981_trackpad_set_poll_interval_ms(trackpad_cfg.polling_interval_ms);
    zmk_bbp9981_trackpad_set_precision_mode_enabled(trackpad_cfg.precision_mode_enabled);
    zmk_bbp9981_trackpad_set_scroll_mode_switch_enabled(trackpad_cfg.scroll_mode_switch_enabled);
    zmk_bbp9981_trackpad_set_scroll_profile(trackpad_cfg.scroll_profile);
}

static void apply_backlight_runtime(void) {
    sanitize_backlight_config(&backlight_cfg);
    zmk_trackpad_led_set_enabled(zmk_backlight_get_preferred_on());
    zmk_trackpad_led_set_idle_timeout_ms(backlight_cfg.backlight_auto_off
                                             ? backlight_cfg.idle_timeout_ms
                                             : 0);
    zmk_rgb_underglow_set_idle_timeout_ms(backlight_cfg.backlight_auto_off
                                              ? backlight_cfg.idle_timeout_ms
                                              : 0);
}

static void apply_power_runtime(void) {
    sanitize_power_config(&power_cfg);
    zmk_battery_set_report_interval_seconds(power_cfg.battery_report_interval_s);
    zmk_trackpad_led_set_usb_power_mode(power_cfg.charging_led_mode);
}

static void apply_sleep_runtime(void) {
    sanitize_sleep_config(&sleep_cfg);
    zmk_activity_set_idle_enabled(sleep_cfg.idle_enabled);
    zmk_activity_set_idle_timeout_ms(sleep_cfg.idle_timeout_ms);
    zmk_activity_set_sleep_enabled(sleep_cfg.sleep_enabled);
    zmk_activity_set_sleep_timeout_ms(sleep_cfg.sleep_timeout_ms);
    zmk_activity_set_sleep_while_usb_powered(sleep_cfg.sleep_while_usb_powered);
}

static bool ext_power_is_enabled(void) {
    if (!ext_power_dev || !device_is_ready(ext_power_dev)) {
        return true;
    }

    return ext_power_get(ext_power_dev) > 0;
}

static bool parse_rgb_color(const char *value, uint8_t *r, uint8_t *g, uint8_t *b) {
    unsigned int red = 0;
    unsigned int green = 0;
    unsigned int blue = 0;

    if (sscanf(value, "#%02x%02x%02x", &red, &green, &blue) != 3) {
        return false;
    }

    *r = red;
    *g = green;
    *b = blue;
    return true;
}

static struct zmk_led_hsb rgb_to_hsb(uint8_t red, uint8_t green, uint8_t blue,
                                     uint8_t brightness) {
    float r = red / 255.0f;
    float g = green / 255.0f;
    float b = blue / 255.0f;

    float max = MAX(r, MAX(g, b));
    float min = MIN(r, MIN(g, b));
    float delta = max - min;

    float hue = 0.0f;
    if (delta > 0.0f) {
        if (max == r) {
            hue = 60.0f * ((g - b) / delta);
        } else if (max == g) {
            hue = 60.0f * (((b - r) / delta) + 2.0f);
        } else {
            hue = 60.0f * (((r - g) / delta) + 4.0f);
        }

        if (hue < 0.0f) {
            hue += 360.0f;
        }
    }

    uint8_t sat = max > 0.0f ? (uint8_t)((delta / max) * 100.0f) : 0;

    return (struct zmk_led_hsb){
        .h = (uint16_t)CLAMP((int)hue, 0, 359),
        .s = sat,
        .b = CLAMP(brightness, 0, 100),
    };
}

static void fill_trackpad_config(zmk_settings_TrackpadConfig *resp) {
    trackpad_cfg.enabled = zmk_bbp9981_trackpad_get_enabled();
    trackpad_cfg.sensitivity = zmk_bbp9981_trackpad_get_sensitivity();
    trackpad_cfg.scroll_inverted = zmk_bbp9981_trackpad_get_scroll_inverted();
    trackpad_cfg.scroll_speed = zmk_bbp9981_trackpad_get_scroll_speed();
    trackpad_cfg.polling_interval_ms = zmk_bbp9981_trackpad_get_poll_interval_ms();
    trackpad_cfg.precision_mode_enabled = zmk_bbp9981_trackpad_get_precision_mode_enabled();
    trackpad_cfg.scroll_mode_switch_enabled =
        zmk_bbp9981_trackpad_get_scroll_mode_switch_enabled();

    *resp = (zmk_settings_TrackpadConfig)zmk_settings_TrackpadConfig_init_zero;
    resp->enabled = trackpad_cfg.enabled;
    resp->sensitivity = trackpad_cfg.sensitivity;
    strncpy(resp->scroll_direction,
            trackpad_cfg.scroll_inverted ? "inverted" : "normal",
            sizeof(resp->scroll_direction) - 1);
    resp->polling_interval_ms = trackpad_cfg.polling_interval_ms;
    resp->scroll_speed = trackpad_cfg.scroll_speed;
    resp->precision_mode_enabled = trackpad_cfg.precision_mode_enabled;
    strncpy(resp->scroll_mode_switch,
            trackpad_cfg.scroll_mode_switch_enabled ? "capslock" : "disabled",
            sizeof(resp->scroll_mode_switch) - 1);
    resp->scroll_profile = trackpad_cfg.scroll_profile;
}

static void fill_backlight_config(zmk_settings_BacklightConfig *resp) {
    bool rgb_enabled = false;
    bool trackpad_led_enabled = zmk_trackpad_led_get_enabled();
    struct zmk_led_hsb color = zmk_rgb_underglow_get_hsb();

    (void)zmk_rgb_underglow_get_state(&rgb_enabled);

    *resp = (zmk_settings_BacklightConfig)zmk_settings_BacklightConfig_init_zero;
    resp->backlight_enabled = trackpad_led_enabled;
    resp->backlight_brightness = zmk_backlight_get_preferred_brt();
    resp->backlight_auto_off = backlight_cfg.backlight_auto_off;
    resp->idle_timeout_ms = backlight_cfg.idle_timeout_ms;
    resp->rgb_enabled = rgb_enabled;
    resp->rgb_brightness = color.b;
    strncpy(resp->rgb_color, "#ffffff", sizeof(resp->rgb_color) - 1);
    resp->trackpad_led_enabled = trackpad_led_enabled;
    resp->trackpad_led_brightness = zmk_backlight_get_preferred_brt();
}

static void fill_bluetooth_config(zmk_settings_BluetoothConfig *resp) {
    *resp = (zmk_settings_BluetoothConfig)zmk_settings_BluetoothConfig_init_zero;
    strncpy(resp->output_mode,
            zmk_endpoint_get_preferred_transport() == ZMK_TRANSPORT_USB ? "usb" : "ble",
            sizeof(resp->output_mode) - 1);
    resp->active_profile = MAX(zmk_ble_active_profile_index(), 0);
    resp->profiles_count = MAX_BT_PROFILES;
    resp->tx_power_boost = TX_POWER_BOOST_ENABLED;

    for (int i = 0; i < MAX_BT_PROFILES; i++) {
        resp->profiles[i].index = i;
        strncpy(resp->profiles[i].name, bluetooth_cfg.profile_names[i],
                sizeof(resp->profiles[i].name) - 1);
        resp->profiles[i].connected = zmk_ble_profile_is_connected(i);
        resp->profiles[i].paired = !zmk_ble_profile_is_open(i);
    }
}

static void fill_power_config(zmk_settings_PowerConfig *resp) {
    *resp = (zmk_settings_PowerConfig)zmk_settings_PowerConfig_init_zero;
    resp->battery_percent = zmk_battery_state_of_charge();
    resp->usb_powered = zmk_usb_is_powered();
    resp->ext_power_enabled = ext_power_is_enabled();
    resp->battery_report_interval_s = zmk_battery_get_report_interval_seconds();
    resp->activity_state = zmk_activity_get_state();
    resp->charging_led_mode = zmk_trackpad_led_get_usb_power_mode();
}

static void fill_sleep_config(zmk_settings_SleepConfig *resp) {
    *resp = (zmk_settings_SleepConfig)zmk_settings_SleepConfig_init_zero;
    resp->idle_enabled = zmk_activity_get_idle_enabled();
    resp->idle_timeout_ms = zmk_activity_get_idle_timeout_ms();
    resp->sleep_enabled = zmk_activity_get_sleep_enabled();
    resp->sleep_timeout_ms = zmk_activity_get_sleep_timeout_ms();
    resp->sleep_while_usb_powered = zmk_activity_get_sleep_while_usb_powered();
}

static void emit_trackpad_config_changed(void) {
    zmk_settings_TrackpadConfig cfg = zmk_settings_TrackpadConfig_init_zero;
    fill_trackpad_config(&cfg);
    raise_zmk_studio_rpc_notification((struct zmk_studio_rpc_notification){
        .notification = SETTINGS_NOTIFICATION(trackpad_config_changed, cfg),
    });
}

static void emit_backlight_config_changed(void) {
    zmk_settings_BacklightConfig cfg = zmk_settings_BacklightConfig_init_zero;
    fill_backlight_config(&cfg);
    raise_zmk_studio_rpc_notification((struct zmk_studio_rpc_notification){
        .notification = SETTINGS_NOTIFICATION(backlight_config_changed, cfg),
    });
}

static void emit_bluetooth_config_changed(void) {
    zmk_settings_BluetoothConfig cfg = zmk_settings_BluetoothConfig_init_zero;
    fill_bluetooth_config(&cfg);
    raise_zmk_studio_rpc_notification((struct zmk_studio_rpc_notification){
        .notification = SETTINGS_NOTIFICATION(bluetooth_config_changed, cfg),
    });
}

static void emit_power_config_changed(void) {
    zmk_settings_PowerConfig cfg = zmk_settings_PowerConfig_init_zero;
    fill_power_config(&cfg);
    raise_zmk_studio_rpc_notification((struct zmk_studio_rpc_notification){
        .notification = SETTINGS_NOTIFICATION(power_config_changed, cfg),
    });
}

static void emit_sleep_config_changed(void) {
    zmk_settings_SleepConfig cfg = zmk_settings_SleepConfig_init_zero;
    fill_sleep_config(&cfg);
    raise_zmk_studio_rpc_notification((struct zmk_studio_rpc_notification){
        .notification = SETTINGS_NOTIFICATION(sleep_config_changed, cfg),
    });
}

static int settings_load_cb(const char *name, size_t len, settings_read_cb read_cb, void *cb_arg) {
    const char *next;

    if (settings_name_steq(name, "trackpad", &next) && !next) {
        int rc = read_settings_blob_with_defaults(read_cb, cb_arg, len, &trackpad_cfg,
                                                  sizeof(trackpad_cfg), &default_trackpad_cfg);
        if (rc >= 0) {
            sanitize_trackpad_config(&trackpad_cfg);
        }
        return MIN(rc, 0);
    }

    if (settings_name_steq(name, "backlight", &next) && !next) {
        int rc = read_settings_blob_with_defaults(read_cb, cb_arg, len, &backlight_cfg,
                                                  sizeof(backlight_cfg),
                                                  &default_backlight_prefs);
        if (rc >= 0) {
            sanitize_backlight_config(&backlight_cfg);
        }
        return MIN(rc, 0);
    }

    if (settings_name_steq(name, "bluetooth", &next) && !next) {
        int rc = read_settings_blob_with_defaults(read_cb, cb_arg, len, &bluetooth_cfg,
                                                  sizeof(bluetooth_cfg),
                                                  &default_bluetooth_prefs);
        if (rc >= 0) {
            sanitize_bluetooth_config(&bluetooth_cfg);
        }
        return MIN(rc, 0);
    }

    if (settings_name_steq(name, "power", &next) && !next) {
        int rc = read_settings_blob_with_defaults(read_cb, cb_arg, len, &power_cfg,
                                                  sizeof(power_cfg), &default_power_prefs);
        if (rc >= 0) {
            sanitize_power_config(&power_cfg);
        }
        return MIN(rc, 0);
    }

    if (settings_name_steq(name, "sleep", &next) && !next) {
        int rc = read_settings_blob_with_defaults(read_cb, cb_arg, len, &sleep_cfg,
                                                  sizeof(sleep_cfg), &default_sleep_prefs);
        if (rc >= 0) {
            sanitize_sleep_config(&sleep_cfg);
        }
        return MIN(rc, 0);
    }

    return -ENOENT;
}

SETTINGS_STATIC_HANDLER_DEFINE(bbp9981_studio, SETTINGS_SUBTREE, NULL, settings_load_cb, NULL,
                               NULL);

static zmk_studio_Response get_trackpad_config(const zmk_studio_Request *req) {
    (void)req;
    zmk_settings_TrackpadConfig resp = zmk_settings_TrackpadConfig_init_zero;
    fill_trackpad_config(&resp);
    return SETTINGS_RESPONSE(get_trackpad_config, resp);
}

static zmk_studio_Response set_trackpad_config(const zmk_studio_Request *req) {
    const zmk_settings_TrackpadConfig *config =
        &req->subsystem.settings.request_type.set_trackpad_config.config;

    if (config->sensitivity < 1 || config->sensitivity > 10 || config->scroll_speed < 1 ||
        config->scroll_speed > 10 || config->polling_interval_ms < 1 ||
        config->polling_interval_ms > 100 || config->scroll_profile > 1) {
        return SETTINGS_RESPONSE(set_trackpad_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    if (strcmp(config->scroll_mode_switch, "capslock") != 0 &&
        strcmp(config->scroll_mode_switch, "disabled") != 0) {
        return SETTINGS_RESPONSE(set_trackpad_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
    }

    trackpad_cfg.enabled = config->enabled;
    trackpad_cfg.sensitivity = config->sensitivity;
    trackpad_cfg.scroll_inverted = strcmp(config->scroll_direction, "inverted") == 0;
    trackpad_cfg.scroll_speed = config->scroll_speed;
    trackpad_cfg.polling_interval_ms = config->polling_interval_ms;
    trackpad_cfg.precision_mode_enabled = config->precision_mode_enabled;
    trackpad_cfg.scroll_mode_switch_enabled = strcmp(config->scroll_mode_switch, "disabled") != 0;
    trackpad_cfg.scroll_profile = config->scroll_profile;

    apply_trackpad_runtime();
    schedule_trackpad_settings_save();
    emit_trackpad_config_changed();

    return SETTINGS_RESPONSE(set_trackpad_config,
                             zmk_settings_SetConfigResponseCode_SET_CONFIG_OK);
}

static zmk_studio_Response get_backlight_config(const zmk_studio_Request *req) {
    (void)req;
    zmk_settings_BacklightConfig resp = zmk_settings_BacklightConfig_init_zero;
    fill_backlight_config(&resp);
    return SETTINGS_RESPONSE(get_backlight_config, resp);
}

static zmk_studio_Response set_backlight_config(const zmk_studio_Request *req) {
    const zmk_settings_BacklightConfig *config =
        &req->subsystem.settings.request_type.set_backlight_config.config;
    uint8_t red = 0;
    uint8_t green = 0;
    uint8_t blue = 0;

    if (!parse_rgb_color(config->rgb_color, &red, &green, &blue)) {
        return SETTINGS_RESPONSE(set_backlight_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
    }

    if (config->backlight_brightness > 100 || config->rgb_brightness > 100 ||
        config->idle_timeout_ms < 1000 || config->idle_timeout_ms > 600000) {
        return SETTINGS_RESPONSE(set_backlight_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    int err = config->backlight_enabled ? zmk_backlight_set_brt(config->backlight_brightness)
                                        : zmk_backlight_off();
    if (err < 0) {
        LOG_WRN("Failed to update trackpad backlight: %d", err);
        return SETTINGS_RESPONSE(set_backlight_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
    }

    zmk_trackpad_led_set_enabled(config->backlight_enabled);

    struct zmk_led_hsb rgb_color = rgb_to_hsb(red, green, blue, config->rgb_brightness);
    if (config->rgb_enabled) {
        err = zmk_rgb_underglow_on();
        if (err < 0) {
            LOG_WRN("Failed to enable keyboard backlight: %d", err);
            return SETTINGS_RESPONSE(set_backlight_config,
                                     zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }

        err = zmk_rgb_underglow_set_hsb(rgb_color);
        if (err < 0) {
            LOG_WRN("Failed to update keyboard backlight brightness: %d", err);
            return SETTINGS_RESPONSE(set_backlight_config,
                                     zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }
    } else {
        err = zmk_rgb_underglow_off();
        if (err < 0) {
            LOG_WRN("Failed to disable keyboard backlight: %d", err);
            return SETTINGS_RESPONSE(set_backlight_config,
                                     zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }
    }

    backlight_cfg.backlight_auto_off = config->backlight_auto_off;
    backlight_cfg.idle_timeout_ms = config->idle_timeout_ms;
    apply_backlight_runtime();
    if (save_backlight_settings() < 0) {
        LOG_WRN("Failed to persist backlight settings");
    }
    emit_backlight_config_changed();

    return SETTINGS_RESPONSE(set_backlight_config,
                             zmk_settings_SetConfigResponseCode_SET_CONFIG_OK);
}

static zmk_studio_Response get_bluetooth_config(const zmk_studio_Request *req) {
    (void)req;
    zmk_settings_BluetoothConfig resp = zmk_settings_BluetoothConfig_init_zero;
    fill_bluetooth_config(&resp);
    return SETTINGS_RESPONSE(get_bluetooth_config, resp);
}

static zmk_studio_Response set_bluetooth_config(const zmk_studio_Request *req) {
    const zmk_settings_BluetoothConfig *config =
        &req->subsystem.settings.request_type.set_bluetooth_config.config;

    if (config->profiles_count > MAX_BT_PROFILES || config->active_profile >= MAX_BT_PROFILES) {
        return SETTINGS_RESPONSE(set_bluetooth_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    enum zmk_transport transport = ZMK_TRANSPORT_NONE;
    if (strcmp(config->output_mode, "usb") == 0) {
        transport = ZMK_TRANSPORT_USB;
    } else if (strcmp(config->output_mode, "ble") == 0) {
        transport = ZMK_TRANSPORT_BLE;
    } else {
        return SETTINGS_RESPONSE(set_bluetooth_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
    }

    int err = zmk_endpoint_set_preferred_transport(transport);
    if (err < 0) {
        return SETTINGS_RESPONSE(set_bluetooth_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
    }

    err = zmk_ble_prof_select(config->active_profile);
    if (err < 0) {
        return SETTINGS_RESPONSE(set_bluetooth_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    for (int i = 0; i < config->profiles_count; i++) {
        strncpy(bluetooth_cfg.profile_names[i], config->profiles[i].name,
                sizeof(bluetooth_cfg.profile_names[i]) - 1);
        bluetooth_cfg.profile_names[i][sizeof(bluetooth_cfg.profile_names[i]) - 1] = '\0';
    }
    sanitize_bluetooth_config(&bluetooth_cfg);
    if (save_bluetooth_settings() < 0) {
        LOG_WRN("Failed to persist Bluetooth profile labels");
    }
    emit_bluetooth_config_changed();

    return SETTINGS_RESPONSE(set_bluetooth_config,
                             zmk_settings_SetConfigResponseCode_SET_CONFIG_OK);
}

static zmk_studio_Response get_power_config(const zmk_studio_Request *req) {
    (void)req;
    zmk_settings_PowerConfig resp = zmk_settings_PowerConfig_init_zero;
    fill_power_config(&resp);
    return SETTINGS_RESPONSE(get_power_config, resp);
}

static zmk_studio_Response set_power_config(const zmk_studio_Request *req) {
    const zmk_settings_PowerConfig *config =
        &req->subsystem.settings.request_type.set_power_config.config;

    if (config->battery_report_interval_s < 10 || config->battery_report_interval_s > 3600 ||
        config->charging_led_mode > ZMK_TRACKPAD_LED_USB_POWER_MODE_BLINK) {
        return SETTINGS_RESPONSE(set_power_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    bool current_ext_power_enabled = ext_power_is_enabled();
    if (config->ext_power_enabled != current_ext_power_enabled) {
        if (!ext_power_dev || !device_is_ready(ext_power_dev)) {
            return SETTINGS_RESPONSE(
                set_power_config, zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }

        if (!config->ext_power_enabled && !zmk_usb_is_powered()) {
            return SETTINGS_RESPONSE(
                set_power_config, zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }

        int err = config->ext_power_enabled ? ext_power_enable(ext_power_dev)
                                            : ext_power_disable(ext_power_dev);
        if (err < 0) {
            LOG_WRN("Failed to update ext power state: %d", err);
            return SETTINGS_RESPONSE(
                set_power_config, zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_INVALID);
        }
    }

    power_cfg.battery_report_interval_s = config->battery_report_interval_s;
    power_cfg.charging_led_mode = config->charging_led_mode;
    apply_power_runtime();

    if (save_power_settings() < 0) {
        LOG_WRN("Failed to persist power settings");
    }

    emit_power_config_changed();
    return SETTINGS_RESPONSE(set_power_config,
                             zmk_settings_SetConfigResponseCode_SET_CONFIG_OK);
}

static zmk_studio_Response get_sleep_config(const zmk_studio_Request *req) {
    (void)req;
    zmk_settings_SleepConfig resp = zmk_settings_SleepConfig_init_zero;
    fill_sleep_config(&resp);
    return SETTINGS_RESPONSE(get_sleep_config, resp);
}

static zmk_studio_Response set_sleep_config(const zmk_studio_Request *req) {
    const zmk_settings_SleepConfig *config =
        &req->subsystem.settings.request_type.set_sleep_config.config;

    if (config->idle_timeout_ms < 1000 || config->idle_timeout_ms > 3600000 ||
        config->sleep_timeout_ms < 5000 || config->sleep_timeout_ms > 14400000) {
        return SETTINGS_RESPONSE(set_sleep_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    if (config->sleep_enabled && config->idle_enabled &&
        config->sleep_timeout_ms <= config->idle_timeout_ms) {
        return SETTINGS_RESPONSE(set_sleep_config,
                                 zmk_settings_SetConfigResponseCode_SET_CONFIG_ERR_OUT_OF_RANGE);
    }

    sleep_cfg.idle_enabled = config->idle_enabled;
    sleep_cfg.idle_timeout_ms = config->idle_timeout_ms;
    sleep_cfg.sleep_enabled = config->sleep_enabled;
    sleep_cfg.sleep_timeout_ms = config->sleep_timeout_ms;
    sleep_cfg.sleep_while_usb_powered = config->sleep_while_usb_powered;

    apply_sleep_runtime();

    if (save_sleep_settings() < 0) {
        LOG_WRN("Failed to persist sleep settings");
    }

    emit_sleep_config_changed();
    emit_power_config_changed();
    return SETTINGS_RESPONSE(set_sleep_config,
                             zmk_settings_SetConfigResponseCode_SET_CONFIG_OK);
}

static zmk_studio_Response power_off(const zmk_studio_Request *req) {
    (void)req;
    int err = zmk_pm_soft_off();
    return SETTINGS_RESPONSE(power_off, err == 0);
}

static zmk_studio_Response select_bt_profile(const zmk_studio_Request *req) {
    uint32_t profile_index =
        req->subsystem.settings.request_type.select_bt_profile.profile_index;

    if (profile_index >= MAX_BT_PROFILES) {
        return SETTINGS_RESPONSE(select_bt_profile, false);
    }

    if (zmk_ble_prof_select(profile_index) < 0) {
        return SETTINGS_RESPONSE(select_bt_profile, false);
    }

    emit_bluetooth_config_changed();
    return SETTINGS_RESPONSE(select_bt_profile, true);
}

static zmk_studio_Response clear_bt_profile(const zmk_studio_Request *req) {
    uint32_t profile_index = req->subsystem.settings.request_type.clear_bt_profile.profile_index;
    int previous_profile = zmk_ble_active_profile_index();

    if (profile_index >= MAX_BT_PROFILES || previous_profile < 0) {
        return SETTINGS_RESPONSE(clear_bt_profile, false);
    }

    if (previous_profile != (int)profile_index && zmk_ble_prof_select(profile_index) < 0) {
        return SETTINGS_RESPONSE(clear_bt_profile, false);
    }

    zmk_ble_clear_bonds();

    if (previous_profile != (int)profile_index) {
        (void)zmk_ble_prof_select(previous_profile);
    }

    emit_bluetooth_config_changed();
    return SETTINGS_RESPONSE(clear_bt_profile, true);
}

static zmk_studio_Response rename_bt_profile(const zmk_studio_Request *req) {
    const zmk_settings_RenameBtProfileRequest *rename_req =
        &req->subsystem.settings.request_type.rename_bt_profile;

    if (rename_req->profile_index >= MAX_BT_PROFILES) {
        return SETTINGS_RESPONSE(rename_bt_profile, false);
    }

    strncpy(bluetooth_cfg.profile_names[rename_req->profile_index], rename_req->name,
            sizeof(bluetooth_cfg.profile_names[rename_req->profile_index]) - 1);
    bluetooth_cfg.profile_names[rename_req->profile_index]
        [sizeof(bluetooth_cfg.profile_names[rename_req->profile_index]) - 1] = '\0';
    sanitize_bluetooth_config(&bluetooth_cfg);
    if (save_bluetooth_settings() < 0) {
        LOG_WRN("Failed to persist Bluetooth profile labels");
    }
    emit_bluetooth_config_changed();

    return SETTINGS_RESPONSE(rename_bt_profile, true);
}

static zmk_studio_Response save_changes(const zmk_studio_Request *req) {
    (void)req;
    k_work_cancel_delayable(&trackpad_settings_save_work);
    if (save_trackpad_settings() < 0 || save_power_settings() < 0 || save_sleep_settings() < 0) {
        return SETTINGS_RESPONSE(save_changes,
                                 zmk_settings_SaveChangesErrorCode_SAVE_CHANGES_ERR_GENERIC);
    }
    return SETTINGS_RESPONSE(save_changes, zmk_settings_SaveChangesErrorCode_SAVE_CHANGES_OK);
}

static zmk_studio_Response discard_changes(const zmk_studio_Request *req) {
    (void)req;
    k_work_cancel_delayable(&trackpad_settings_save_work);
    emit_trackpad_config_changed();
    emit_backlight_config_changed();
    emit_bluetooth_config_changed();
    emit_power_config_changed();
    emit_sleep_config_changed();
    return SETTINGS_RESPONSE(discard_changes, true);
}

static int settings_settings_reset(void) {
    k_work_cancel_delayable(&trackpad_settings_save_work);
    trackpad_cfg = default_trackpad_cfg;
    backlight_cfg = default_backlight_prefs;
    bluetooth_cfg = default_bluetooth_prefs;
    power_cfg = default_power_prefs;
    sleep_cfg = default_sleep_prefs;

    apply_trackpad_runtime();
    apply_backlight_runtime();
    apply_power_runtime();
    apply_sleep_runtime();

    (void)save_trackpad_settings();
    (void)save_backlight_settings();
    (void)save_bluetooth_settings();
    (void)save_power_settings();
    (void)save_sleep_settings();

    return 0;
}

static int settings_runtime_init(void) {
    k_work_init_delayable(&trackpad_settings_save_work, trackpad_settings_save_work_handler);
    sanitize_trackpad_config(&trackpad_cfg);
    sanitize_backlight_config(&backlight_cfg);
    sanitize_bluetooth_config(&bluetooth_cfg);
    sanitize_power_config(&power_cfg);
    sanitize_sleep_config(&sleep_cfg);
    apply_trackpad_runtime();
    apply_backlight_runtime();
    apply_power_runtime();
    apply_sleep_runtime();
    return 0;
}

ZMK_RPC_SUBSYSTEM_HANDLER(settings, get_trackpad_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, set_trackpad_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, get_backlight_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, set_backlight_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, get_bluetooth_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, set_bluetooth_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, get_power_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, set_power_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, get_sleep_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, set_sleep_config, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, select_bt_profile, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, clear_bt_profile, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, rename_bt_profile, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, save_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, discard_changes, ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(settings, power_off, ZMK_STUDIO_RPC_HANDLER_SECURED);

static int settings_event_mapper(const zmk_event_t *eh, zmk_studio_Notification *n) {
    if (as_zmk_ble_active_profile_changed(eh) || as_zmk_endpoint_changed(eh)) {
        zmk_settings_BluetoothConfig cfg = zmk_settings_BluetoothConfig_init_zero;
        fill_bluetooth_config(&cfg);
        *n = SETTINGS_NOTIFICATION(bluetooth_config_changed, cfg);
        return 0;
    }

    if (as_zmk_battery_state_changed(eh) || as_zmk_usb_conn_state_changed(eh) ||
        as_zmk_activity_state_changed(eh)) {
        zmk_settings_PowerConfig cfg = zmk_settings_PowerConfig_init_zero;
        fill_power_config(&cfg);
        *n = SETTINGS_NOTIFICATION(power_config_changed, cfg);
        return 0;
    }

    return -ENOTSUP;
}

ZMK_RPC_EVENT_MAPPER(settings, settings_event_mapper, zmk_ble_active_profile_changed,
                     zmk_battery_state_changed, zmk_usb_conn_state_changed,
                     zmk_activity_state_changed);

ZMK_RPC_SUBSYSTEM_SETTINGS_RESET(settings, settings_settings_reset);
SYS_INIT(settings_runtime_init, APPLICATION, CONFIG_APPLICATION_INIT_PRIORITY);
