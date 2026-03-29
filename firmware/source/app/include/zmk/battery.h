/*
 * Copyright (c) 2021 The ZMK Contributors
 *
 * SPDX-License-Identifier: MIT
 */

#pragma once

#include <stdint.h>

uint8_t zmk_battery_state_of_charge(void);
uint32_t zmk_battery_get_report_interval_seconds(void);
void zmk_battery_set_report_interval_seconds(uint32_t interval_seconds);
