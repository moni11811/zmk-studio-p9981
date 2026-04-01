/**
 * BB9981 Extended RPC Types
 *
 * Defines TypeScript types for the custom RPC subsystems added for the BB9981:
 * - Macros: Runtime macro creation and editing
 * - Combos: Runtime combo creation and editing
 * - Settings: Trackpad, backlight, and Bluetooth configuration
 *
 * These types mirror the protobuf definitions in:
 * - zmk-main/app/proto/zmk/macros.proto
 * - zmk-main/app/proto/zmk/combos.proto
 * - zmk-main/app/proto/zmk/settings.proto
 *
 * NOTE: Until the upstream zmk-studio-ts-client package includes these
 * subsystems, we use a local mock layer (bb9981Rpc.ts) that simulates
 * the RPC calls using local state. When firmware support is available,
 * the mock layer can be replaced with actual call_rpc calls.
 */

// ============= Macro Types =============

export enum MacroStepType {
  TAP = 0,
  PRESS = 1,
  RELEASE = 2,
  WAIT = 3,
  PAUSE_FOR_RELEASE = 4,
}

export interface MacroStep {
  type: MacroStepType;
  behaviorId: number;
  param1: number;
  param2: number;
  durationMs: number;
}

export interface MacroSummary {
  id: number;
  name: string;
  stepCount: number;
}

export interface MacroDetails {
  id: number;
  name: string;
  steps: MacroStep[];
  defaultWaitMs: number;
  defaultTapMs: number;
}

export interface MacrosRequest {
  listAllMacros?: boolean;
  getMacroDetails?: { macroId: number };
  setMacroSteps?: {
    macroId: number;
    name: string;
    steps: MacroStep[];
    defaultWaitMs: number;
    defaultTapMs: number;
  };
  createMacro?: boolean;
  deleteMacro?: { macroId: number };
  saveChanges?: boolean;
  discardChanges?: boolean;
  checkUnsavedChanges?: boolean;
}

export enum SetMacroStepsResponseCode {
  OK = 0,
  ERR_INVALID_ID = 1,
  ERR_TOO_MANY_STEPS = 2,
}

export interface MacrosResponse {
  listAllMacros?: { macros: MacroSummary[] };
  getMacroDetails?: MacroDetails;
  setMacroSteps?: SetMacroStepsResponseCode;
  createMacro?: { ok?: number; err?: boolean };
  deleteMacro?: boolean;
  saveChanges?: number;
  discardChanges?: boolean;
  checkUnsavedChanges?: boolean;
}

// ============= Combo Types =============

export interface BehaviorBinding {
  behaviorId: number;
  param1: number;
  param2: number;
}

export interface ComboSummary {
  id: number;
  name: string;
  keyCount: number;
}

export interface ComboDetails {
  id: number;
  name: string;
  keyPositions: number[];
  binding: BehaviorBinding;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowRelease: boolean;
  layerMask: number;
}

export interface CombosRequest {
  listAllCombos?: boolean;
  getComboDetails?: { comboId: number };
  setCombo?: {
    comboId: number;
    name: string;
    keyPositions: number[];
    binding: BehaviorBinding;
    timeoutMs: number;
    requirePriorIdleMs: number;
    slowRelease: boolean;
    layerMask: number;
  };
  createCombo?: boolean;
  deleteCombo?: { comboId: number };
  saveChanges?: boolean;
  discardChanges?: boolean;
  checkUnsavedChanges?: boolean;
}

export enum SetComboResponseCode {
  OK = 0,
  ERR_INVALID_ID = 1,
  ERR_TOO_MANY_KEYS = 2,
  ERR_INVALID_BINDING = 3,
}

export interface CombosResponse {
  listAllCombos?: { combos: ComboSummary[] };
  getComboDetails?: ComboDetails;
  setCombo?: SetComboResponseCode;
  createCombo?: { ok?: number; err?: boolean };
  deleteCombo?: boolean;
  saveChanges?: number;
  discardChanges?: boolean;
  checkUnsavedChanges?: boolean;
}

// ============= Behavior Runtime Types =============

export type HoldTapFlavor =
  | "hold-preferred"
  | "balanced"
  | "tap-preferred"
  | "tap-unless-interrupted";

export interface HoldTapBehaviorConfig {
  type: "holdTap";
  behaviorId: number;
  tappingTermMs: number;
  quickTapMs: number;
  requirePriorIdleMs: number;
  flavor: HoldTapFlavor;
  holdBehaviorId: number;
  tapBehaviorId: number;
}

export interface TapDanceBehaviorConfig {
  type: "tapDance";
  behaviorId: number;
  tappingTermMs: number;
  bindings: BehaviorBinding[];
}

export interface StickyKeyBehaviorConfig {
  type: "stickyKey";
  behaviorId: number;
  releaseAfterMs: number;
  quickRelease: boolean;
  lazy: boolean;
  ignoreModifiers: boolean;
  bindingBehaviorId: number;
}

export type BehaviorRuntimeConfig =
  | HoldTapBehaviorConfig
  | TapDanceBehaviorConfig
  | StickyKeyBehaviorConfig;

export enum SetBehaviorRuntimeConfigResponseCode {
  OK = 0,
  ERR_INVALID_ID = 1,
  ERR_INVALID_CONFIG = 2,
  ERR_INVALID_BINDING = 3,
  ERR_OUT_OF_RANGE = 4,
  ERR_NOT_SUPPORTED = 5,
  ERR_PERSIST = 6,
}

export enum CreateBehaviorResponseCode {
  OK = 0,
  ERR_INVALID_NAME = 1,
  ERR_INVALID_CONFIG = 2,
  ERR_INVALID_BINDING = 3,
  ERR_NO_SLOT = 4,
  ERR_PERSIST = 5,
}

export enum DeleteBehaviorResponseCode {
  OK = 0,
  ERR_INVALID_ID = 1,
  ERR_NOT_USER_DEFINED = 2,
  ERR_IN_USE = 3,
  ERR_PERSIST = 4,
}

export enum RenameBehaviorResponseCode {
  OK = 0,
  ERR_INVALID_ID = 1,
  ERR_NOT_USER_DEFINED = 2,
  ERR_INVALID_NAME = 3,
  ERR_PERSIST = 4,
}

// ============= Settings Types =============

export interface TrackpadConfig {
  enabled: boolean;
  sensitivity: number;
  scrollDirection: "normal" | "inverted";
  scrollSpeed: number;
  pollingIntervalMs: number;
  precisionModeEnabled: boolean;
  scrollModeSwitch: "capslock" | "disabled";
  scrollProfile: "classic2d" | "analog3d";
}

export interface BacklightConfig {
  backlightEnabled: boolean;
  backlightBrightness: number;
  backlightAutoOff: boolean;
  backlightIdleTimeoutMs: number;
  rgbEnabled: boolean;
  rgbBrightness: number;
  rgbColor: string;
  trackpadLedEnabled: boolean;
  trackpadLedBrightness: number;
  rgbAutoOff: boolean;
  rgbIdleTimeoutMs: number;
}

export interface BtProfile {
  index: number;
  name: string;
  connected: boolean;
  paired: boolean;
}

export interface BluetoothConfig {
  outputMode: "ble" | "usb";
  activeOutputMode: "ble" | "usb" | "none";
  activeProfile: number;
  profiles: BtProfile[];
  txPowerBoost: boolean;
}

export interface PowerConfig {
  batteryPercent: number;
  usbPowered: boolean;
  extPowerEnabled: boolean;
  batteryReportIntervalS: number;
  activityState: "active" | "idle" | "sleep";
  chargingLedMode: "off" | "solid" | "blink" | "pulse";
  chargingLedSpeedMs: number;
}

export interface SleepConfig {
  idleEnabled: boolean;
  idleTimeoutMs: number;
  sleepEnabled: boolean;
  sleepTimeoutMs: number;
  sleepWhileUsbPowered: boolean;
}

export interface SubProfileSummary {
  index: number;
  name: string;
  active: boolean;
  initialized: boolean;
  integrityIssueCount: number;
  integrityRepairCount: number;
}

export interface SubProfileState {
  activeProfile: number;
  profiles: SubProfileSummary[];
  switching: boolean;
}

export enum SwitchSubProfileResponseCode {
  OK = 0,
  ERR_INVALID = 1,
  ERR_BUSY = 2,
  ERR_PERSIST = 3,
  ERR_LOAD = 4,
}

export interface SettingsRequest {
  getTrackpadConfig?: boolean;
  setTrackpadConfig?: { config: TrackpadConfig };
  getBacklightConfig?: boolean;
  setBacklightConfig?: { config: BacklightConfig };
  getBluetoothConfig?: boolean;
  setBluetoothConfig?: { config: BluetoothConfig };
  getPowerConfig?: boolean;
  setPowerConfig?: { config: PowerConfig };
  getSleepConfig?: boolean;
  setSleepConfig?: { config: SleepConfig };
  selectBtProfile?: { profileIndex: number };
  clearBtProfile?: { profileIndex: number };
  renameBtProfile?: { profileIndex: number; name: string };
  powerOff?: boolean;
  saveChanges?: boolean;
  discardChanges?: boolean;
  getSubprofileState?: boolean;
  switchSubprofile?: { profileIndex: number };
  renameSubprofile?: { profileIndex: number; name: string };
  resetSubprofile?: { profileIndex: number };
  rebootToBootloader?: boolean;
}

export enum SetConfigResponseCode {
  OK = 0,
  ERR_INVALID = 1,
  ERR_OUT_OF_RANGE = 2,
}

export interface SettingsResponse {
  getTrackpadConfig?: TrackpadConfig;
  setTrackpadConfig?: SetConfigResponseCode;
  getBacklightConfig?: BacklightConfig;
  setBacklightConfig?: SetConfigResponseCode;
  getBluetoothConfig?: BluetoothConfig;
  setBluetoothConfig?: SetConfigResponseCode;
  getPowerConfig?: PowerConfig;
  setPowerConfig?: SetConfigResponseCode;
  getSleepConfig?: SleepConfig;
  setSleepConfig?: SetConfigResponseCode;
  selectBtProfile?: boolean;
  clearBtProfile?: boolean;
  renameBtProfile?: boolean;
  getSubprofileState?: SubProfileState;
  switchSubprofile?: SwitchSubProfileResponseCode;
  renameSubprofile?: boolean;
  resetSubprofile?: boolean;
  rebootToBootloader?: boolean;
  powerOff?: boolean;
  saveChanges?: number;
  discardChanges?: boolean;
}
