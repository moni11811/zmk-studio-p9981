# BB9981 ZMK Studio

Desktop configuration app for the BB9981 keyboard family, based on ZMK Studio and extended for BB9981-specific firmware, settings, profiles, and flashing workflows.

## Current Release

- App release: [Version 2.1](https://github.com/moni11811/zmk-studio-p9981/releases/tag/v2.1)
- Firmware releases: [moni11811/BB9981-KEYMAP releases](https://github.com/moni11811/BB9981-KEYMAP/releases)

Primary assets:

- Download the packaged app and bundled assets from the [Version 2.1 release](https://github.com/moni11811/zmk-studio-p9981/releases/tag/v2.1).
- Version 2.1 is the last public release of this fork.

## What Makes This Fork Different

Compared with upstream ZMK Studio, this BB9981 fork adds:

- BB9981-specific settings panels for Trackpad, Backlight, Power, Sleep, and Bluetooth
- Extended runtime RPC support for BB9981 device settings
- Live profile management with SubProfiles
- Profile templates stored in Studio, not on the keyboard
- Keymap copy and paste flows in the editor
- Built-in firmware flashing from the app in wired USB mode
- BB9981-oriented UX and release packaging

## SubProfiles

The keyboard supports up to 3 live on-device SubProfiles.

Each live SubProfile can carry:

- its own keymap layers
- its own BB9981 profile-scoped settings

Studio also supports Profile Templates:

- templates are stored in Studio on the computer
- templates are not stored on the keyboard
- templates can be applied into one of the 3 live SubProfile slots

This gives the keyboard:

- 3 active, switchable on-device profiles
- unlimited offline template storage in Studio

## Supported Workflows

### Keymap Editing

- edit key bindings live in Studio
- copy and paste bindings in the keymap editor
- switch between live SubProfiles
- save template snapshots from the current active profile
- apply templates into a live slot

### Device Settings

Profile-scoped settings live with the active SubProfile where supported.

Global settings remain outside the SubProfile wrapper where appropriate.

### Import and Export

Studio supports:

- SubProfile export
- SubProfile import
- Profile Template save and reuse

On macOS, export and import use native file dialogs in the packaged app.

### Firmware Flashing

The app bundles the latest synced BB9981 firmware and can flash it in wired USB mode.

Current flashing behavior:

- available only when connected over wired USB
- bundled firmware is shipped inside the app
- flashing attempts bootloader mode automatically before copying the UF2

## Installation

### macOS

1. Download the latest DMG from the app release page.
2. Install `ZMK Studio.app`.
3. Move the app to `/Applications` if you want macOS permissions to behave more consistently.
4. Open the app and grant Bluetooth access when prompted.

### Firmware

1. Download the latest `zmk.uf2` from the firmware release page.
2. Put the keyboard into bootloader mode.
3. Copy the UF2 onto the bootloader drive.

If you are already connected over wired USB in the app, use the built-in flash flow.

## Connection Modes

The app is designed around two primary connection paths:

- `USB Wired`
- `Bluetooth`

Wired USB is preferred for:

- firmware flashing
- recovery
- more deterministic transport behavior during debugging

Bluetooth is preferred for:

- normal day-to-day profile switching and live adjustments

## Release Model

This project currently ships app and firmware separately.

That means:

- the desktop app has its own GitHub release
- the firmware has its own GitHub release
- the app bundles a matching firmware UF2 for convenience

## Version History

### v0 -> v1

This was the biggest architectural jump in the project.

- Upstream ZMK Studio became a BB9981-focused fork.
- BB9981 board and firmware integration were added.
- Custom BB9981 drivers and hardware logic were added.
- Firmware-side Studio subsystems were added for settings, behaviors, macros, combos, and keymap runtime editing.
- BB9981-specific protobuf and RPC extensions were added.
- Studio gained BB9981 settings panels and control flows.
- Sanitized public packaging and release assets were established.

### v1 -> v1.0.1

- tightened release packaging
- cleaned up public presentation
- improved docs and screenshots

### v1.0.1 -> v1.7

- stabilization-focused release
- improved board and runtime reliability
- improved trackpad LED startup path
- refined settings and RPC behavior

### v1.7 -> Beta Version 2

- split app and firmware releases
- established the profile-centric release direction
- expanded the Studio workflow around SubProfiles and templates

## Development Notes

This repo is the app side of the BB9981 stack. The paired keyboard firmware is released separately.

The packaged app release also triggers cross-platform GitHub Actions builds, including Windows.

## Status

Beta Version 2 is a beta release. The direction is:

- reliability closer to mainstream commercial keyboards
- customization depth closer to enthusiast keyboard tooling
- a more polished desktop UX for day-to-day use

If you are testing actively, wired USB remains the safest recovery path.
