# Building ZMK Studio for macOS (Production Distribution)

This guide provides instructions for building and distributing ZMK Studio as a production-ready macOS application with code signing and notarization.

## Prerequisites

In addition to the development prerequisites from [BUILD_MACOS.md](BUILD_MACOS.md), you'll need:

### Apple Developer Account
- An active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- Your Apple ID with administrative access to your development team
- Two-factor authentication enabled on your Apple ID

### Certificate and Provisioning
- Developer ID Application certificate (for signing)
- Developer ID Installer certificate (for notarization)
- Both certificates should be in your Keychain

### Environment Secrets (for CI/CD)
You'll need to set up the following GitHub Secrets for automated builds:

| Secret Name | Description |
|------------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded Developer ID Application certificate (`.p12` or `.pfx`) |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the certificate file |
| `APPLE_SIGNING_IDENTITY` | Name of the signing identity (e.g., "Developer ID Application (Your Name (TEAMID))") |
| `APPLE_ID` | Your Apple ID email address |
| `APPLE_PASSWORD` | App-specific password (not your Apple ID password) |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID (10-character identifier) |

## Creating Apple Certificates

### Step 1: Generate a Certificate Signing Request (CSR)
1. Open Keychain Access on your Mac
2. Go to Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
3. Enter your email and common name
4. Save the CSR to disk

### Step 2: Create Developer ID Certificate
1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Navigate to Certificates, Identifiers & Profiles
4. Click "Certificates"
5. Click "+" to create a new certificate
6. Select "Developer ID Application"
7. Upload your CSR from Step 1
8. Download the certificate and double-click to install in Keychain

### Step 3: Export Certificate for CI/CD
1. Open Keychain Access
2. Find the "Developer ID Application" certificate
3. Right-click and select "Export..."
4. Choose PKCS #12 format (.p12)
5. Set a strong password
6. Save the file

### Step 4: Encode for GitHub Secrets
```bash
base64 -i ~/Developer\ ID\ Application.p12 | pbcopy
```
Paste the output into the `APPLE_CERTIFICATE` GitHub Secret.

## Creating App-Specific Password for Notarization

1. Go to [appleid.apple.com/account/manage](https://appleid.apple.com/account/manage)
2. Sign in with your Apple ID
3. Go to Security → App-specific Passwords
4. Click "Generate"
5. Choose "macOS" as the app
6. Copy the generated 16-character password
7. Use this as the `APPLE_PASSWORD` GitHub Secret (not your actual Apple ID password)

## Finding Your Team ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Go to Membership
4. Your Team ID is shown as a 10-character code next to your team name

## Local Production Build (Manual)

If you want to build and sign locally before CI/CD setup:

### 1. Build the Application
```bash
npm run tauri build -- --target universal-apple-darwin
```

### 2. Code Sign the Bundle
```bash
# Find your signing identity
security find-identity -v -p codesigning

# Replace with your actual signing identity
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application (Your Name (TEAMID))" \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/ZMK\ Studio.app
```

### 3. Create a Notarization ZIP
```bash
cd src-tauri/target/universal-apple-darwin/release/bundle/macos/
ditto -c -k --sequesterRsrc ZMK\ Studio.app ZMK\ Studio.zip
```

### 4. Submit for Notarization
```bash
xcrun notarytool submit ZMK\ Studio.zip \
  --apple-id "your-apple-id@example.com" \
  --password "@keychain:notarization-password" \
  --team-id TEAMIDHERE \
  --wait
```

### 5. Staple the Ticket
```bash
xcrun stapler staple ZMK\ Studio.app
```

## GitHub Actions Workflow

The repository includes a GitHub Actions workflow (`.github/workflows/tauri-build.yml`) that automatically builds and signs releases.

### Setting Up CI/CD

1. **Add GitHub Secrets:**
   - Go to your repository's Settings → Secrets and variables → Actions
   - Add all the secrets listed in the Prerequisites section

2. **Trigger a Release:**
   - Create a new GitHub Release in your repository
   - The workflow will automatically:
     - Build the universal binary
     - Sign it with your Developer ID certificate
     - Submit for notarization
     - Staple the notarization ticket
     - Upload the signed DMG to the release

3. **Monitor the Build:**
   - Go to Actions tab to see build progress
   - Notarization typically takes 5-15 minutes

## Distribution Options

### Option 1: GitHub Releases (Recommended)
1. Create a release in your repository
2. The CI/CD workflow automatically uploads the signed DMG
3. Users can download directly from GitHub

### Option 2: Direct Download
Distribute the signed DMG file via your website or hosting service.

### Option 3: Mac App Store
For App Store distribution, additional requirements apply:
- Sandboxing entitlements
- App Store specific configuration
- In-app purchase integration (if applicable)

See [Tauri App Store Guide](https://tauri.app/v1/guides/publishing/publish-app-store/) for details.

## Troubleshooting

### Notarization Fails
- Verify your Developer ID certificate is installed locally
- Check that the app was signed before submission
- Review the notarization log: `xcrun notarytool log UUID --apple-id ... --password ... --team-id ...`
- Common issues:
  - Missing code signatures
  - Embedded frameworks not signed
  - Hardened runtime not enabled

### Code Signing Fails
```bash
# Verify the certificate exists
security find-identity -v -p codesigning

# Check signing validity
codesign -v src-tauri/target/*/release/bundle/macos/ZMK\ Studio.app
```

### App Won't Open After Notarization
- The app may not be quarantined properly
- Try removing the quarantine attribute:
```bash
xattr -d com.apple.quarantine /Applications/ZMK\ Studio.app
```

### GitHub Actions Secrets Not Working
- Verify secrets are set correctly (case-sensitive)
- Check that certificate file is valid PKCS #12
- Ensure password for certificate is correct
- Verify Apple ID and team ID are accurate

## Testing Notarized Build

Before distributing to users:

1. Download the signed DMG from GitHub Release
2. Mount the DMG: `open ZMK\ Studio.dmg`
3. Copy ZMK Studio.app to Applications
4. Launch and verify it works:
   - Connecting to keyboards works
   - All features function properly
   - No security warnings appear

## Security Best Practices

1. **Store certificates securely:**
   - Never commit certificates to git
   - Use GitHub Secrets for sensitive data
   - Rotate certificates regularly

2. **Monitor build logs:**
   - Review GitHub Actions logs for issues
   - Verify each signed build

3. **Test before release:**
   - Test on clean macOS installations
   - Verify Gatekeeper allows launch

4. **Keep tools updated:**
   - Update Xcode Command Line Tools regularly
   - Keep Rust and dependencies current

## Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution/)
- [Tauri Signing Guide](https://tauri.app/v1/guides/publishing/sign-macos/)
- [App-Specific Passwords Help](https://support.apple.com/en-us/HT204915)
