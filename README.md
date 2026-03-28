# ZMK Studio P9981

Public, sanitized fork of ZMK Studio for the BBP9981 / P9981 keyboard family.

This repository is intentionally trimmed down for sharing:

- the ZMK Studio app source is at the repository root
- the BBP9981 firmware source slice is under `firmware/source/`
- a prebuilt firmware image is included at `firmware/releases/bbp9981-zmk.uf2`

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

If you are packaging a fresh app binary from this source and want to publish that binary, do a final strings/path check on the produced executable before distributing it.

## Upstream

This repo builds on:

- [zmkfirmware/zmk-studio](https://github.com/zmkfirmware/zmk-studio)
- [zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)

Licensing:

- app source remains under the repository `LICENSE`
- included firmware source slice is derived from ZMK and includes `firmware/LICENSE.zmk`
