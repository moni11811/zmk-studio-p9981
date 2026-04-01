import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const productName = "ZMK Studio";
const bundleId = "dev.zmk.studio";
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8")
);
const appVersion = packageJson.version ?? "0.0.0";
const bluetoothPrompt =
  "Request bluetooth access for wireless access for config";
const candidateApps = [
  path.join(
    root,
    "src-tauri/target/release/bundle/macos",
    `${productName}.app`
  ),
  path.join(
    root,
    "src-tauri/target/universal-apple-darwin/release/bundle/macos",
    `${productName}.app`
  ),
];

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

function plistSet(plistPath, key, value) {
  const buddy = "/usr/libexec/PlistBuddy";
  try {
    run(buddy, ["-c", `Set :${key} ${value}`, plistPath]);
  } catch (_error) {
    run(buddy, ["-c", `Add :${key} string ${value}`, plistPath]);
  }
}

function signApp(appPath) {
  if (!existsSync(appPath)) {
    return false;
  }

  const plistPath = path.join(appPath, "Contents", "Info.plist");
  plistSet(plistPath, "CFBundleIdentifier", bundleId);
  plistSet(plistPath, "CFBundleShortVersionString", appVersion);
  plistSet(plistPath, "CFBundleVersion", appVersion);
  plistSet(plistPath, "NSBluetoothAlwaysUsageDescription", bluetoothPrompt);
  plistSet(plistPath, "NSBluetoothPeripheralUsageDescription", bluetoothPrompt);

  run("codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    "--identifier",
    bundleId,
    appPath,
  ]);

  run("codesign", ["--verify", "--deep", "--strict", appPath]);
  return true;
}

const signedAny = candidateApps.map(signApp).some(Boolean);

if (!signedAny) {
  console.error("No macOS app bundle found to sign.");
  process.exit(1);
}

console.log(`Signed macOS app bundle(s) with stable identifier ${bundleId}.`);
