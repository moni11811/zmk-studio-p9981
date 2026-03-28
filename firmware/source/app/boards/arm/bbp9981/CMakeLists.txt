# Copyright (c) 2025 ZitaoTech
# SPDX-License-Identifier: MIT

if(CONFIG_BOARD_BBP9981)
    zephyr_library()
    zephyr_library_sources(custom_driver/a320_0x57.c)
    zephyr_library_sources(custom_driver/trackpad_led.c)
    zephyr_library_sources(custom_driver/keyboard_backlight.c)
    zephyr_library_include_directories(${ZEPHYR_BASE}/drivers)
    zephyr_library_include_directories(${CMAKE_CURRENT_SOURCE_DIR}/custom_driver)
    zephyr_library_include_directories(${CMAKE_SOURCE_DIR}/include)
endif()
