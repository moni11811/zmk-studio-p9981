# ZMK Studio P9981

Public, sanitized fork of ZMK Studio for the BBP9981 / P9981 keyboard family.

This repository is intentionally trimmed down for sharing:

- the ZMK Studio app source is at the repository root
- the BBP9981 firmware source slice is under `firmware/source/`
- a prebuilt firmware image is included at `firmware/releases/bbp9981-zmk.uf2`

## What Was Removed

This public repo does not include:

- local build output such as `node_modules`, `dist`, or `src-tauri/target`
- machine-specific keymap search logic tied to one filesystem layout
- prebuilt app binaries

The prebuilt macOS app bundle was intentionally omitted because a release build still embedded local Rust crate paths from the build machine. The firmware UF2 was checked and does not contain those personal path strings, so it is included here.

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
764b8a3f4a3eea44110bdd66fee4ddfa607c974a844624ec91b145f2bd2baded
```

## Sanitization Notes

Before publishing, this repo was checked for:

- local absolute paths
- usernames from the original workspace
- editor-specific planning files
- build artifacts

If you are packaging a fresh app binary from this source and want to publish that binary, do a final strings/path check on the produced executable before distributing it.

## Upstream

This repo builds on:

- [zmkfirmware/zmk-studio](https://github.com/zmkfirmware/zmk-studio)
- [zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)

Licensing:

- app source remains under the repository `LICENSE`
- included firmware source slice is derived from ZMK and includes `firmware/LICENSE.zmk`
