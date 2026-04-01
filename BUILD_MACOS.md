# Building ZMK Studio for macOS (Local Development)

This guide provides instructions for building ZMK Studio locally on macOS for development and testing.

## Prerequisites

### System Requirements
- macOS 10.15 (Catalina) or later
- Apple Silicon (M1/M2/M3) or Intel processor

### Required Tools

1. **Xcode Command Line Tools** (includes clang, make, etc.)
   ```bash
   xcode-select --install
   ```

2. **Node.js 18 or later**
   - Download from [nodejs.org](https://nodejs.org/) or install via Homebrew:
   ```bash
   brew install node
   ```

3. **Rust 1.60 or later**
   - Install from [rustup.rs](https://rustup.rs/):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

4. **Rust macOS Targets**
   - Add support for both Apple Silicon and Intel architectures:
   ```bash
   rustup target add aarch64-apple-darwin x86_64-apple-darwin
   ```

## Build Steps

### 1. Clone/Navigate to Repository
```bash
cd /path/to/zmk-studio-main
```

### 2. Install Dependencies
```bash
npm install
```

This installs Node.js dependencies including Tauri CLI.

### 3. Build the Application

#### Option A: Build for your current architecture (faster)
```bash
npm run tauri build
```

This will build for your Mac's native architecture (arm64 for Apple Silicon, x86_64 for Intel).

Output location: `src-tauri/target/release/bundle/macos/ZMK Studio.app`

#### Option B: Build Universal Binary (both architectures)
```bash
npm run tauri build -- --target universal-apple-darwin
```

This creates a universal binary that runs natively on both Apple Silicon and Intel Macs.

Output location: `src-tauri/target/universal-apple-darwin/release/bundle/macos/ZMK Studio.app`

### 4. Verify Build Success
```bash
ls -la src-tauri/target/*/release/bundle/macos/
```

You should see:
- `ZMK Studio.app` (application bundle)
- `ZMK Studio.dmg` (disk image for distribution)

## Running the Application

### From Terminal
```bash
open src-tauri/target/release/bundle/macos/ZMK\ Studio.app
```

### From Finder
1. Navigate to `src-tauri/target/release/bundle/macos/`
2. Double-click `ZMK Studio.app`

## Connecting to Your BB9981 Keyboard

### USB Connection
1. Connect the BB9981 to your Mac via USB-C
2. Launch ZMK Studio
3. Click "Connect" and select the USB device

### Bluetooth Connection
1. First, pair the BB9981 with your Mac:
   - Go to System Settings → Bluetooth
   - Search for "bbp9981" device
   - Click "Connect"
2. Launch ZMK Studio
3. Click "Connect" and select the wireless device from the list

## Troubleshooting

### Build Fails with "libudev not found"
This has been fixed in the latest version. If you encounter this:
- Make sure you have the latest `Cargo.toml` from the repository
- Run `cargo clean` and try building again

### Command Not Found: `npm` or `rustc`
- For Node.js: Run `node --version` to verify installation. If not found, reinstall Node.js
- For Rust: Run `rustup --version`. If not found, reinstall from [rustup.rs](https://rustup.rs/)
- Make sure to source your shell's configuration after installation

### "Code signature invalid" on run
- This is normal for development builds
- Grant permission when macOS asks about running unverified software
- For production distribution, see [BUILD_MACOS_PRODUCTION.md](BUILD_MACOS_PRODUCTION.md)

### BLE Connection Issues
- Make sure the BB9981 is properly paired in System Settings
- Try disconnecting and reconnecting in Settings → Bluetooth
- Ensure no other BLE applications are using the keyboard
- Restart the keyboard (disconnect power for 10 seconds)

### Serial/USB Connection Not Appearing
- Verify the keyboard is in bootloader mode if expecting USB serial
- Try a different USB port
- Check that the keyboard's USB drivers are installed (usually automatic)

## Development Workflow

### Run in Development Mode
For faster iteration during development:
```bash
npm run dev
```

This starts a development server with hot-reload. The app will:
- Show console output in your terminal
- Reload automatically when you edit TypeScript/React code
- Allow debugging via your browser's developer tools

### Lint Code
```bash
npm run lint
```

### View Component Stories (Storybook)
```bash
npm run storybook
```

Opens a browser window showing isolated component previews.

## Additional Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [ZMK Documentation](https://zmk.dev/)
- [BB9981 GitHub Repository](https://github.com/ZitaoTech/9981_BLE_PRO_SOURCE-main)
