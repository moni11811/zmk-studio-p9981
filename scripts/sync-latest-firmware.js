import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceFirmwarePath = path.resolve(
  projectRoot,
  "../zmk-main/app/build-subprofiles-real/zephyr/zmk.uf2"
);
const bundledFirmwarePath = path.resolve(
  projectRoot,
  "src-tauri/resources/firmware/latest/zmk.uf2"
);

fs.mkdirSync(path.dirname(bundledFirmwarePath), { recursive: true });

if (!fs.existsSync(sourceFirmwarePath)) {
  console.warn(
    `Latest firmware not found at ${sourceFirmwarePath}. Keeping any existing bundled firmware.`
  );
  process.exit(0);
}

fs.copyFileSync(sourceFirmwarePath, bundledFirmwarePath);
console.log(`Bundled latest firmware: ${bundledFirmwarePath}`);
