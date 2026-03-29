# ZMK Studio P9981

Public, sanitized fork of ZMK Studio for the BBP9981 / P9981 keyboard family.

## Keep My Robots Fed

If this fork saves you time and you want to keep my robots fed:

![Keep my robots fed](.github/assets/keep-my-robots-fed.png)

This repository is intentionally trimmed down for sharing:

- the ZMK Studio app source is at the repository root
- the BBP9981 firmware source slice is under `firmware/source/`
- a prebuilt firmware image is included at `firmware/releases/bbp9981-zmk.uf2`

## What Was Removed

This public repo does not include:

- local build output such as `node_modules`, `dist`, or `src-tauri/target`
- machine-specific keymap search logic tied to one filesystem layout
- prebuilt app binaries committed into the repository tree

The repository tree stays source-only. Public desktop binaries are published as GitHub Release assets built from this sanitized repo on GitHub-hosted runners, so they do not carry local workspace paths from the original development machine. The firmware UF2 is also included in `firmware/releases/` for convenience.

## App

The app source at the repository root contains the BBP9981-focused Studio changes, including:

- live device settings for BBP9981-specific controls
- live behavior editing for supported runtime-configurable behaviors
- a vendored RPC client package under `vendor/zmk-studio-ts-client` so the repo builds without relying on patched `node_modules`

### Build The App

Requirements:

- Node.js 20+
- Rust toolchain
- Tauri 2 build prerequisites for your platform

Build commands:

```bash
npm install
npm run build
```

For a desktop app package:

```bash
npm run tauri build
```

For public binaries, prefer the GitHub Releases page instead of local build output.

## Firmware

`firmware/source/` is a minimal source export of the BBP9981 firmware work. It is not a full ZMK checkout. Instead, it mirrors the relative paths of the files that were changed or added on top of upstream ZMK so they can be overlaid onto a matching ZMK tree.

Included firmware material:

- BBP9981 board files and custom drivers
- Studio transport and subsystem changes
- runtime-editable behavior support
- the updated Studio behavior protobuf files
- a prebuilt UF2 in `firmware/releases/`

### Flash The Included Firmware

Use:

```text
firmware/releases/bbp9981-zmk.uf2
```

SHA-256:

```text
80ea5c45c0403cd0585f91c9bc3fa419113cc77cce10f8c4480ebf6fcf1ad09a
```

If you are packaging a fresh app binary from this source and want to publish that binary, do a final strings/path check on the produced executable before distributing it.

## Releases

The published `v1` release contains:

- a universal macOS DMG
- an aarch64 macOS sanitized DMG
- a Windows setup executable
- a Windows portable executable
- the matching firmware UF2
- `SHA256SUMS.txt` for the release assets

## Upstream

This repo builds on:

- [zmkfirmware/zmk-studio](https://github.com/zmkfirmware/zmk-studio)
- [zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)
- [ZitaoTech/9981_BLE_USB_Keyboard_Pro](https://github.com/ZitaoTech/9981_BLE_USB_Keyboard_Pro)
- [ZitaoTech/zmk-config-9981-pro](https://github.com/ZitaoTech/zmk-config-9981-pro)

Licensing:

- app source remains under the repository `LICENSE`
- included firmware source slice is derived from ZMK and includes `firmware/LICENSE.zmk`
