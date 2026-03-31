# BB9981 ZMK Studio

Cross-platform BB9981 desktop and web configuration app, based on ZMK Studio and extended for BB9981-specific firmware, settings, profiles, and flashing workflows.

## Current Release Line

- Current release tag: `beta-v2.0.1`
- GitHub releases: [moni11811/zmk-studio-p9981 releases](https://github.com/moni11811/zmk-studio-p9981/releases)
- Live web app: [moni11811.github.io/zmk-studio-p9981](https://moni11811.github.io/zmk-studio-p9981/)

This repo now serves as the unified public release home for:

- macOS app builds
- Windows app builds
- Linux app builds
- matching BB9981 firmware UF2

## Platforms

Release assets are intended to include:

- macOS `.dmg`
- Windows `.msi`
- Windows setup `.exe`
- Linux `.deb`
- Linux `.AppImage`
- matching `zmk.uf2`

## Web Version

A browser build can also be served from GitHub Pages.

The public web deployment is:

- [moni11811.github.io/zmk-studio-p9981](https://moni11811.github.io/zmk-studio-p9981/)
- automatically deployed from `main`

What the web version is good for:

- viewing and editing supported app data in the browser
- using browser-supported transport paths such as Web Serial where available
- lightweight access without installing the desktop shell

Important limitations of the web build:

- it does not include Tauri-native transport features
- it does not include native flashing
- transport support depends on browser and platform support
- browser BLE support is more limited than the packaged desktop app

## What This Fork Adds

Compared with upstream ZMK Studio, this BB9981 fork adds:

- BB9981-specific settings panels for Trackpad, Backlight, Power, Sleep, and Bluetooth
- extended runtime RPC support for BB9981 device settings
- live profile management with SubProfiles
- profile templates stored in Studio, not on the keyboard
- keymap copy and paste flows in the editor
- built-in firmware flashing from the app in wired USB mode
- unified public release packaging for app and firmware

## Firmware Compatibility

Most of the BB9981-specific settings and management features require the matching BB9981 firmware release, not the older `v0` firmware baseline.

Features that require newer BB9981 firmware include:

- Trackpad settings
- Backlight settings
- Bluetooth settings
- Power settings
- Sleep settings
- SubProfiles
- profile switching and naming
- profile import and export
- profile templates applied into live device slots
- built-in firmware flashing workflow support

If the keyboard is still on firmware `v0`, Studio can still be useful for the base ZMK Studio feature set:

- keymap editing
- macros
- combos
- supported behavior editing that comes from the base Studio/firmware path

In short:

- most BB9981 settings require newer firmware
- firmware `v0` is mainly for the baseline editing flows, not the full BB9981 settings stack

## SubProfiles

The keyboard supports up to 3 live on-device SubProfiles.

Each live SubProfile can carry:

- its own keymap layers
- its own profile-scoped BB9981 settings

Studio also supports Profile Templates:

- templates are stored in Studio on the computer
- templates are not stored on the keyboard
- templates can be applied into one of the 3 live SubProfile slots

This gives the keyboard:

- 3 active, switchable on-device profiles
- unlimited offline template storage in Studio

## Flashing

The app bundles a matching BB9981 firmware image and can flash it in wired USB mode.

Current intended behavior:

- flashing is available only in wired USB mode
- the latest bundled firmware is shipped inside the app
- the app attempts to automate bootloader entry before copying the UF2

## Installation

### macOS

Download the `.dmg` from the releases page and install `ZMK Studio.app`.

### Windows

Download either:

- the `.msi`
- or the setup `.exe`

### Linux

Download either:

- the `.deb`
- or the `.AppImage`

### Firmware

Download `zmk.uf2` from the same release page and flash it to the keyboard if needed.

## Connection Modes

The packaged desktop app is designed around:

- `USB Wired`
- `Bluetooth`

Wired USB is preferred for:

- recovery
- firmware flashing
- deterministic debugging

Bluetooth is preferred for:

- day-to-day live use
- profile switching
- runtime adjustment without cable dependency

## Release Automation

GitHub Actions now aims to provide a resilient source-release pipeline:

- when a source-code release is published, the workflow builds macOS, Windows, and Linux artifacts
- those artifacts are uploaded to the GitHub release automatically
- a GitHub Pages workflow publishes the web build from the same repo

## Version History

### v0 -> v1

This was the largest architectural jump in the project.

- upstream ZMK Studio became a BB9981-focused fork
- BB9981 board and firmware integration were added
- custom BB9981 hardware logic and drivers were added
- firmware-side Studio subsystems were added for settings, behaviors, macros, combos, and keymap runtime editing
- BB9981-specific protobuf and RPC extensions were added
- Studio gained BB9981-specific settings and runtime control flows
- sanitized public release packaging was established

### v1 -> v1.0.1

- refined the first public fork release
- tightened sanitized release packaging
- improved public presentation and docs

### v1.0.1 -> v1.7

- focused on stabilization
- improved board configuration and runtime reliability
- improved trackpad LED startup behavior
- refined settings, transport, and RPC behavior

### v1.7 -> Beta Version 2

- established the current BB9981 release line
- moved toward a profile-centric workflow with SubProfiles and templates
- unified public downloads around the app repo release page

### Beta Version 2 -> Beta Version 2.0.1

- added resilient macOS and Windows release automation
- added Linux release automation
- added automatic GitHub Pages web deployment support
- aligned documentation with the new cross-platform distribution model

## Upstream

This fork builds on:

- [zmkfirmware/zmk-studio](https://github.com/zmkfirmware/zmk-studio)
- [zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)
- [ZitaoTech/9981_BLE_USB_Keyboard_Pro](https://github.com/ZitaoTech/9981_BLE_USB_Keyboard_Pro)
- [ZitaoTech/zmk-config-9981-pro](https://github.com/ZitaoTech/zmk-config-9981-pro)
