import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./logging";
import { getBehaviorDisplayNameOverride } from "../behaviors/behaviorDisplayNameOverrides";
import {
  CreateBehaviorResponseCode,
  DeleteBehaviorResponseCode,
  RenameBehaviorResponseCode,
} from "./bb9981Types";
import type {
  MacroDetails,
  MacroStep,
  MacroSummary,
  ComboDetails,
  ComboSummary,
  BehaviorRuntimeConfig,
  HoldTapFlavor,
  TrackpadConfig,
  BacklightConfig,
  BluetoothConfig,
  PowerConfig,
  SleepConfig,
  SubProfileState,
  SetBehaviorRuntimeConfigResponseCode,
  SetMacroStepsResponseCode,
  SetComboResponseCode,
  SetConfigResponseCode,
  SwitchSubProfileResponseCode,
} from "./bb9981Types";

export type {
  MacroDetails,
  MacroStep,
  MacroSummary,
  ComboDetails,
  ComboSummary,
  BehaviorRuntimeConfig,
  TrackpadConfig,
  BacklightConfig,
  BluetoothConfig,
  PowerConfig,
  SleepConfig,
  SubProfileState,
};

export {
  SetBehaviorRuntimeConfigResponseCode,
  CreateBehaviorResponseCode,
  DeleteBehaviorResponseCode,
  RenameBehaviorResponseCode,
  SetMacroStepsResponseCode,
  SetComboResponseCode,
  SetConfigResponseCode,
  SwitchSubProfileResponseCode,
} from "./bb9981Types";

type ChangeListener<T> = (data: T) => void;

let activeConnection: RpcConnection | null = null;

const listeners: {
  trackpad: ChangeListener<TrackpadConfig>[];
  backlight: ChangeListener<BacklightConfig>[];
  bluetooth: ChangeListener<BluetoothConfig>[];
  power: ChangeListener<PowerConfig>[];
  sleep: ChangeListener<SleepConfig>[];
  subprofiles: ChangeListener<SubProfileState>[];
  macros: ChangeListener<MacroDetails[]>[];
  combos: ChangeListener<ComboDetails[]>[];
  behaviors: (() => void)[];
} = {
  trackpad: [],
  backlight: [],
  bluetooth: [],
  power: [],
  sleep: [],
  subprofiles: [],
  macros: [],
  combos: [],
  behaviors: [],
};

export function setBb9981RpcConnection(conn: RpcConnection | null) {
  activeConnection = conn;
}

function getConnection(): RpcConnection {
  if (!activeConnection) {
    throw new Error("BB9981 RPC unavailable without an active connection");
  }
  return activeConnection;
}

function mapMacroStep(step: any): MacroStep {
  return {
    type: step.type ?? 0,
    behaviorId: step.behaviorId ?? 0,
    param1: step.param1 ?? 0,
    param2: step.param2 ?? 0,
    durationMs: step.durationMs ?? 0,
  };
}

function mapMacroDetails(details: any): MacroDetails {
  return {
    id: details.id ?? 0,
    name: details.name ?? "",
    steps: (details.steps ?? []).map(mapMacroStep),
    defaultWaitMs: details.defaultWaitMs ?? 0,
    defaultTapMs: details.defaultTapMs ?? 0,
  };
}

function mapComboDetails(details: any): ComboDetails {
  return {
    id: details.id ?? 0,
    name: details.name ?? "",
    keyPositions: details.keyPositions ?? [],
    binding: {
      behaviorId: details.binding?.behaviorId ?? 0,
      param1: details.binding?.param1 ?? 0,
      param2: details.binding?.param2 ?? 0,
    },
    timeoutMs: details.timeoutMs ?? 0,
    requirePriorIdleMs: details.requirePriorIdleMs ?? -1,
    slowRelease: details.slowRelease ?? false,
    layerMask: details.layerMask ?? 0,
  };
}

function mapHoldTapFlavor(flavor: number | string | undefined): HoldTapFlavor {
  switch (flavor) {
    case 1:
    case "HOLD_TAP_FLAVOR_BALANCED":
    case "balanced":
      return "balanced";
    case 2:
    case "HOLD_TAP_FLAVOR_TAP_PREFERRED":
    case "tap-preferred":
      return "tap-preferred";
    case 3:
    case "HOLD_TAP_FLAVOR_TAP_UNLESS_INTERRUPTED":
    case "tap-unless-interrupted":
      return "tap-unless-interrupted";
    default:
      return "hold-preferred";
  }
}

function encodeHoldTapFlavor(flavor: HoldTapFlavor): number {
  switch (flavor) {
    case "balanced":
      return 1;
    case "tap-preferred":
      return 2;
    case "tap-unless-interrupted":
      return 3;
    default:
      return 0;
  }
}

function toNumber(value: any, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value && typeof value === "object") {
    if (typeof value.toNumber === "function") {
      try {
        const parsed = value.toNumber();
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }

    if (typeof value.low === "number") {
      return value.low;
    }
  }

  return fallback;
}

function mapBehaviorRuntimeConfig(config: any): BehaviorRuntimeConfig | undefined {
  if (!config) {
    return undefined;
  }

  if (config.holdTap) {
    return {
      type: "holdTap",
      behaviorId: toNumber(config.behaviorId),
      tappingTermMs: toNumber(config.holdTap.tappingTermMs),
      quickTapMs: toNumber(config.holdTap.quickTapMs, -1),
      requirePriorIdleMs: toNumber(config.holdTap.requirePriorIdleMs, -1),
      flavor: mapHoldTapFlavor(config.holdTap.flavor),
      holdBehaviorId: toNumber(config.holdTap.holdBehaviorId),
      tapBehaviorId: toNumber(config.holdTap.tapBehaviorId),
    };
  }

  if (config.tapDance) {
    return {
      type: "tapDance",
      behaviorId: toNumber(config.behaviorId),
      tappingTermMs: toNumber(config.tapDance.tappingTermMs),
      bindings: (config.tapDance.bindings ?? []).map((binding: any) => ({
        behaviorId: toNumber(binding.behaviorId),
        param1: toNumber(binding.param1),
        param2: toNumber(binding.param2),
      })),
    };
  }

  if (config.stickyKey) {
    return {
      type: "stickyKey",
      behaviorId: toNumber(config.behaviorId),
      releaseAfterMs: toNumber(config.stickyKey.releaseAfterMs),
      quickRelease: config.stickyKey.quickRelease ?? false,
      lazy: config.stickyKey.lazy ?? false,
      ignoreModifiers: config.stickyKey.ignoreModifiers ?? false,
      bindingBehaviorId: toNumber(config.stickyKey.behaviorId),
    };
  }

  return undefined;
}

function mapBehaviorDetails(details: any): any {
  if (!details) {
    return undefined;
  }

  const id = toNumber(details.id);
  const displayNameOverride = getBehaviorDisplayNameOverride(id);

  return {
    ...details,
    id,
    rawDisplayName: details.displayName ?? "",
    displayName: displayNameOverride ?? details.displayName ?? "",
  };
}

function mapTrackpadConfig(config: any): TrackpadConfig {
  return {
    enabled: config.enabled ?? true,
    sensitivity: config.sensitivity ?? 5,
    scrollDirection:
      config.scrollDirection === "inverted" ? "inverted" : "normal",
    scrollSpeed: config.scrollSpeed ?? 5,
    pollingIntervalMs: config.pollingIntervalMs ?? 10,
    precisionModeEnabled: config.precisionModeEnabled ?? true,
    scrollModeSwitch:
      config.scrollModeSwitch === "disabled" ? "disabled" : "capslock",
    scrollProfile:
      Number(config.scrollProfile ?? 0) === 1 ? "analog3d" : "classic2d",
  };
}

function mapBacklightConfig(config: any): BacklightConfig {
  return {
    backlightEnabled: config.backlightEnabled ?? true,
    backlightBrightness: config.backlightBrightness ?? 40,
    backlightAutoOff: config.backlightAutoOff ?? true,
    backlightIdleTimeoutMs:
      config.backlightIdleTimeoutMs ?? config.idleTimeoutMs ?? 30000,
    rgbEnabled: config.rgbEnabled ?? false,
    rgbBrightness: config.rgbBrightness ?? 50,
    rgbColor: config.rgbColor ?? "#ffffff",
    trackpadLedEnabled: config.trackpadLedEnabled ?? true,
    trackpadLedBrightness: config.trackpadLedBrightness ?? 50,
    rgbAutoOff: config.rgbAutoOff ?? config.backlightAutoOff ?? true,
    rgbIdleTimeoutMs: config.rgbIdleTimeoutMs ?? config.idleTimeoutMs ?? 30000,
  };
}

function mapBluetoothConfig(config: any): BluetoothConfig {
  return {
    outputMode: config.outputMode === "usb" ? "usb" : "ble",
    activeOutputMode:
      Number(config.activeOutputMode ?? 0) === 1
        ? "usb"
        : Number(config.activeOutputMode ?? 0) === 2
          ? "ble"
          : "none",
    activeProfile: config.activeProfile ?? 0,
    profiles: (config.profiles ?? []).map((profile: any) => ({
      index: profile.index ?? 0,
      name: profile.name ?? "",
      connected: profile.connected ?? false,
      paired: profile.paired ?? false,
    })),
    txPowerBoost: config.txPowerBoost ?? true,
  };
}

function mapActivityState(value: any): PowerConfig["activityState"] {
  switch (Number(value ?? 0)) {
    case 1:
      return "idle";
    case 2:
      return "sleep";
    default:
      return "active";
  }
}

function mapChargingLedMode(value: any): PowerConfig["chargingLedMode"] {
  switch (Number(value ?? 0)) {
    case 1:
      return "solid";
    case 2:
      return "blink";
    case 3:
      return "pulse";
    default:
      return "off";
  }
}

function encodeChargingLedMode(mode: PowerConfig["chargingLedMode"]): number {
  switch (mode) {
    case "solid":
      return 1;
    case "blink":
      return 2;
    case "pulse":
      return 3;
    default:
      return 0;
  }
}

function encodeScrollProfile(profile: TrackpadConfig["scrollProfile"]): number {
  return profile === "analog3d" ? 1 : 0;
}

function mapPowerConfig(config: any): PowerConfig {
  return {
    batteryPercent: toNumber(config.batteryPercent),
    usbPowered: config.usbPowered ?? false,
    extPowerEnabled: config.extPowerEnabled ?? true,
    batteryReportIntervalS: toNumber(config.batteryReportIntervalS, 60),
    activityState: mapActivityState(config.activityState),
    chargingLedMode: mapChargingLedMode(config.chargingLedMode),
    chargingLedSpeedMs: toNumber(config.chargingLedSpeedMs, 1000),
  };
}

function mapSleepConfig(config: any): SleepConfig {
  return {
    idleEnabled: config.idleEnabled ?? true,
    idleTimeoutMs: toNumber(config.idleTimeoutMs, 30000),
    sleepEnabled: config.sleepEnabled ?? false,
    sleepTimeoutMs: toNumber(config.sleepTimeoutMs, 1800000),
    sleepWhileUsbPowered: config.sleepWhileUsbPowered ?? false,
  };
}

function mapSubProfileState(state: any): SubProfileState {
  const rawProfiles = Array.isArray(state?.profiles)
    ? state.profiles
    : Array.isArray(state?.profiles?.items)
      ? state.profiles.items
      : [];
  const activeProfile = toNumber(state?.activeProfile);
  const profiles: SubProfileState["profiles"] = rawProfiles.map((profile: any) => ({
    index: toNumber(profile?.index),
    name:
      typeof profile?.name === "string"
        ? profile.name
        : String(profile?.name ?? ""),
    active: profile?.active ?? false,
    initialized: profile?.initialized ?? false,
    integrityIssueCount: toNumber(profile?.integrityIssueCount),
    integrityRepairCount: toNumber(profile?.integrityRepairCount),
  }));

  for (let index = 0; index < 3; index++) {
    if (!profiles.some((profile: SubProfileState["profiles"][number]) => profile.index === index)) {
      profiles.push({
        index,
        name: `Profile ${index + 1}`,
        active: index === activeProfile,
        initialized: false,
        integrityIssueCount: 0,
        integrityRepairCount: 0,
      });
    }
  }

  profiles.sort(
    (a: SubProfileState["profiles"][number], b: SubProfileState["profiles"][number]) =>
      a.index - b.index
  );

  const hasExplicitActive = profiles.some(
    (profile: SubProfileState["profiles"][number]) => profile.active
  );
  if (!hasExplicitActive && activeProfile >= 0 && activeProfile < profiles.length) {
    const target = profiles.find(
      (profile: SubProfileState["profiles"][number]) => profile.index === activeProfile
    );
    if (target) {
      target.active = true;
    }
  }

  return {
    activeProfile,
    switching: state?.switching ?? false,
    profiles,
  };
}

async function fetchAllMacroDetails(): Promise<MacroDetails[]> {
  const summaries = await macrosRpc.listAllMacros();
  const details = await Promise.all(
    summaries.map((macro) => macrosRpc.getMacroDetails(macro.id))
  );
  return details.filter((detail): detail is MacroDetails => !!detail);
}

async function fetchAllComboDetails(): Promise<ComboDetails[]> {
  const summaries = await combosRpc.listAllCombos();
  const details = await Promise.all(
    summaries.map((combo) => combosRpc.getComboDetails(combo.id))
  );
  return details.filter((detail): detail is ComboDetails => !!detail);
}

async function notifyMacrosChanged() {
  const details = await fetchAllMacroDetails();
  listeners.macros.forEach((cb) => cb(details));
}

async function notifyCombosChanged() {
  const details = await fetchAllComboDetails();
  listeners.combos.forEach((cb) => cb(details));
}

async function notifyTrackpadChanged() {
  const config = await settingsRpc.getTrackpadConfig();
  listeners.trackpad.forEach((cb) => cb(config));
}

function notifyBehaviorsChanged() {
  listeners.behaviors.forEach((cb) => cb());
}

async function notifyBacklightChanged() {
  const config = await settingsRpc.getBacklightConfig();
  listeners.backlight.forEach((cb) => cb(config));
}

async function notifyBluetoothChanged() {
  const config = await settingsRpc.getBluetoothConfig();
  listeners.bluetooth.forEach((cb) => cb(config));
}

async function notifyPowerChanged() {
  const config = await settingsRpc.getPowerConfig();
  listeners.power.forEach((cb) => cb(config));
}

async function notifySleepChanged() {
  const config = await settingsRpc.getSleepConfig();
  listeners.sleep.forEach((cb) => cb(config));
}

async function notifySubprofilesChanged() {
  const state = await settingsRpc.getSubprofileState();
  listeners.subprofiles.forEach((cb) => cb(state));
}

const macrosRpc = {
  async listAllMacros(): Promise<MacroSummary[]> {
    const resp = (await call_rpc(getConnection(), {
      macros: { listAllMacros: true },
    } as any)) as any;

    return (resp.macros?.listAllMacros?.macros ?? []).map((macro: any) => ({
      id: macro.id ?? 0,
      name: macro.name ?? "",
      stepCount: macro.stepCount ?? 0,
    }));
  },

  async getMacroDetails(macroId: number): Promise<MacroDetails | undefined> {
    try {
      const resp = (await call_rpc(getConnection(), {
        macros: { getMacroDetails: { macroId } },
      } as any)) as any;

      return resp.macros?.getMacroDetails
        ? mapMacroDetails(resp.macros.getMacroDetails)
        : undefined;
    } catch (_error) {
      return undefined;
    }
  },

  async setMacroSteps(
    macroId: number,
    name: string,
    steps: MacroStep[],
    defaultWaitMs: number,
    defaultTapMs: number
  ): Promise<SetMacroStepsResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      macros: {
        setMacroSteps: { macroId, name, steps, defaultWaitMs, defaultTapMs },
      },
    } as any)) as any;

    await notifyMacrosChanged();
    return resp.macros?.setMacroSteps ?? 0;
  },

  async createMacro(): Promise<{ ok?: number; err?: boolean }> {
    const resp = (await call_rpc(getConnection(), {
      macros: { createMacro: true },
    } as any)) as any;

    await notifyMacrosChanged();
    return resp.macros?.createMacro ?? { err: true };
  },

  async deleteMacro(macroId: number): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      macros: { deleteMacro: { macroId } },
    } as any)) as any;

    await notifyMacrosChanged();
    return !!resp.macros?.deleteMacro;
  },

  async saveChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      macros: { saveChanges: true },
    } as any)) as any;
    return (resp.macros?.saveChanges ?? 1) === 0;
  },

  async discardChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      macros: { discardChanges: true },
    } as any)) as any;
    await notifyMacrosChanged();
    return !!resp.macros?.discardChanges;
  },

  async checkUnsavedChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      macros: { checkUnsavedChanges: true },
    } as any)) as any;
    return !!resp.macros?.checkUnsavedChanges;
  },

  onChange(cb: ChangeListener<MacroDetails[]>): () => void {
    listeners.macros.push(cb);
    return () => {
      const idx = listeners.macros.indexOf(cb);
      if (idx >= 0) listeners.macros.splice(idx, 1);
    };
  },
};

const combosRpc = {
  async listAllCombos(): Promise<ComboSummary[]> {
    const resp = (await call_rpc(getConnection(), {
      combos: { listAllCombos: true },
    } as any)) as any;

    return (resp.combos?.listAllCombos?.combos ?? []).map((combo: any) => ({
      id: combo.id ?? 0,
      name: combo.name ?? "",
      keyCount: combo.keyCount ?? 0,
    }));
  },

  async getComboDetails(comboId: number): Promise<ComboDetails | undefined> {
    try {
      const resp = (await call_rpc(getConnection(), {
        combos: { getComboDetails: { comboId } },
      } as any)) as any;

      return resp.combos?.getComboDetails
        ? mapComboDetails(resp.combos.getComboDetails)
        : undefined;
    } catch (_error) {
      return undefined;
    }
  },

  async setCombo(combo: ComboDetails): Promise<SetComboResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      combos: {
        setCombo: {
          comboId: combo.id,
          name: combo.name,
          keyPositions: combo.keyPositions,
          binding: combo.binding,
          timeoutMs: combo.timeoutMs,
          requirePriorIdleMs: combo.requirePriorIdleMs,
          slowRelease: combo.slowRelease,
          layerMask: combo.layerMask,
        },
      },
    } as any)) as any;

    await notifyCombosChanged();
    return resp.combos?.setCombo ?? 0;
  },

  async createCombo(): Promise<{ ok?: number; err?: boolean }> {
    const resp = (await call_rpc(getConnection(), {
      combos: { createCombo: true },
    } as any)) as any;

    await notifyCombosChanged();
    return resp.combos?.createCombo ?? { err: true };
  },

  async deleteCombo(comboId: number): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      combos: { deleteCombo: { comboId } },
    } as any)) as any;

    await notifyCombosChanged();
    return !!resp.combos?.deleteCombo;
  },

  async saveChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      combos: { saveChanges: true },
    } as any)) as any;
    return (resp.combos?.saveChanges ?? 1) === 0;
  },

  async discardChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      combos: { discardChanges: true },
    } as any)) as any;
    await notifyCombosChanged();
    return !!resp.combos?.discardChanges;
  },

  async checkUnsavedChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      combos: { checkUnsavedChanges: true },
    } as any)) as any;
    return !!resp.combos?.checkUnsavedChanges;
  },

  onChange(cb: ChangeListener<ComboDetails[]>): () => void {
    listeners.combos.push(cb);
    return () => {
      const idx = listeners.combos.indexOf(cb);
      if (idx >= 0) listeners.combos.splice(idx, 1);
    };
  },
};

const settingsRpc = {
  async getTrackpadConfig(): Promise<TrackpadConfig> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getTrackpadConfig: true },
    } as any)) as any;

    return mapTrackpadConfig(resp.settings?.getTrackpadConfig);
  },

  async setTrackpadConfig(config: TrackpadConfig): Promise<SetConfigResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: {
        setTrackpadConfig: {
          config: {
            ...config,
            scrollProfile: encodeScrollProfile(config.scrollProfile),
          },
        },
      },
    } as any)) as any;

    await notifyTrackpadChanged();
    return resp.settings?.setTrackpadConfig ?? 0;
  },

  onTrackpadChange(cb: ChangeListener<TrackpadConfig>): () => void {
    listeners.trackpad.push(cb);
    return () => {
      const idx = listeners.trackpad.indexOf(cb);
      if (idx >= 0) listeners.trackpad.splice(idx, 1);
    };
  },

  async getBacklightConfig(): Promise<BacklightConfig> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getBacklightConfig: true },
    } as any)) as any;

    return mapBacklightConfig(resp.settings?.getBacklightConfig);
  },

  async setBacklightConfig(
    config: BacklightConfig
  ): Promise<SetConfigResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: { setBacklightConfig: { config } },
    } as any)) as any;

    // The hook already owns the optimistic update plus guarded settle/refetch
    // cycle. Triggering another immediate refetch here can race that flow and
    // make lighting controls appear to snap back.
    return resp.settings?.setBacklightConfig ?? 0;
  },

  onBacklightChange(cb: ChangeListener<BacklightConfig>): () => void {
    listeners.backlight.push(cb);
    return () => {
      const idx = listeners.backlight.indexOf(cb);
      if (idx >= 0) listeners.backlight.splice(idx, 1);
    };
  },

  async getBluetoothConfig(): Promise<BluetoothConfig> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getBluetoothConfig: true },
    } as any)) as any;

    return mapBluetoothConfig(resp.settings?.getBluetoothConfig);
  },

  async setBluetoothConfig(
    config: BluetoothConfig
  ): Promise<SetConfigResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: { setBluetoothConfig: { config } },
    } as any)) as any;

    // Do NOT call notifyBluetoothChanged() here. The caller
    // (useBluetoothConfig updateConfig) owns the post-update refetch
    // lifecycle. Calling it here caused a race where the refetched
    // activeOutputMode (still BLE during USB enumeration) overwrote the
    // optimistic outputMode before the hook could guard it.
    return resp.settings?.setBluetoothConfig ?? 0;
  },

  async getPowerConfig(): Promise<PowerConfig> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getPowerConfig: true },
    } as any)) as any;

    return mapPowerConfig(resp.settings?.getPowerConfig);
  },

  async setPowerConfig(config: PowerConfig): Promise<SetConfigResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: {
        setPowerConfig: {
          config: {
            ...config,
            chargingLedMode: encodeChargingLedMode(config.chargingLedMode),
          },
        },
      },
    } as any)) as any;

    await notifyPowerChanged();
    return resp.settings?.setPowerConfig ?? 0;
  },

  onPowerChange(cb: ChangeListener<PowerConfig>): () => void {
    listeners.power.push(cb);
    return () => {
      const idx = listeners.power.indexOf(cb);
      if (idx >= 0) listeners.power.splice(idx, 1);
    };
  },

  async getSleepConfig(): Promise<SleepConfig> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getSleepConfig: true },
    } as any)) as any;

    return mapSleepConfig(resp.settings?.getSleepConfig);
  },

  async setSleepConfig(config: SleepConfig): Promise<SetConfigResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: { setSleepConfig: { config } },
    } as any)) as any;

    await notifySleepChanged();
    await notifyPowerChanged();
    return resp.settings?.setSleepConfig ?? 0;
  },

  onSleepChange(cb: ChangeListener<SleepConfig>): () => void {
    listeners.sleep.push(cb);
    return () => {
      const idx = listeners.sleep.indexOf(cb);
      if (idx >= 0) listeners.sleep.splice(idx, 1);
    };
  },

  async getSubprofileState(): Promise<SubProfileState> {
    const resp = (await call_rpc(getConnection(), {
      settings: { getSubprofileState: true },
    } as any)) as any;

    return mapSubProfileState(resp.settings?.getSubprofileState);
  },

  async switchSubprofile(
    profileIndex: number
  ): Promise<SwitchSubProfileResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      settings: { switchSubprofile: { profileIndex } },
    } as any)) as any;

    return resp.settings?.switchSubprofile ?? 0;
  },

  async renameSubprofile(profileIndex: number, name: string): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { renameSubprofile: { profileIndex, name } },
    } as any)) as any;

    await notifySubprofilesChanged();
    return !!resp.settings?.renameSubprofile;
  },

  async resetSubprofile(profileIndex: number): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { resetSubprofile: { profileIndex } },
    } as any)) as any;

    await notifySubprofilesChanged();
    await notifyTrackpadChanged();
    await notifyBacklightChanged();
    await notifyBluetoothChanged();
    await notifyPowerChanged();
    await notifySleepChanged();
    return !!resp.settings?.resetSubprofile;
  },

  onSubprofileChange(cb: ChangeListener<SubProfileState>): () => void {
    listeners.subprofiles.push(cb);
    return () => {
      const idx = listeners.subprofiles.indexOf(cb);
      if (idx >= 0) listeners.subprofiles.splice(idx, 1);
    };
  },

  async powerOff(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { powerOff: true },
    } as any)) as any;
    return !!resp.settings?.powerOff;
  },

  async rebootToBootloader(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { rebootToBootloader: true },
    } as any)) as any;
    return !!resp.settings?.rebootToBootloader;
  },

  async selectBtProfile(profileIndex: number): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { selectBtProfile: { profileIndex } },
    } as any)) as any;
    await notifyBluetoothChanged();
    return !!resp.settings?.selectBtProfile;
  },

  async clearBtProfile(profileIndex: number): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { clearBtProfile: { profileIndex } },
    } as any)) as any;
    await notifyBluetoothChanged();
    return !!resp.settings?.clearBtProfile;
  },

  async renameBtProfile(profileIndex: number, name: string): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { renameBtProfile: { profileIndex, name } },
    } as any)) as any;
    await notifyBluetoothChanged();
    return !!resp.settings?.renameBtProfile;
  },

  async checkUnsavedChanges(): Promise<boolean> {
    return false;
  },

  async saveChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { saveChanges: true },
    } as any)) as any;
    return (resp.settings?.saveChanges ?? 1) === 0;
  },

  async discardChanges(): Promise<boolean> {
    const resp = (await call_rpc(getConnection(), {
      settings: { discardChanges: true },
    } as any)) as any;
    await notifySubprofilesChanged();
    await notifyTrackpadChanged();
    await notifyBacklightChanged();
    await notifyBluetoothChanged();
    await notifyPowerChanged();
    await notifySleepChanged();
    return !!resp.settings?.discardChanges;
  },

  onBluetoothChange(cb: ChangeListener<BluetoothConfig>): () => void {
    listeners.bluetooth.push(cb);
    return () => {
      const idx = listeners.bluetooth.indexOf(cb);
      if (idx >= 0) listeners.bluetooth.splice(idx, 1);
    };
  },
};

const behaviorsRpc = {
  async getBehaviorDetails(behaviorId: number): Promise<any | undefined> {
    try {
      const resp = (await call_rpc(getConnection(), {
        behaviors: { getBehaviorDetails: { behaviorId } },
      } as any)) as any;

      return mapBehaviorDetails(resp.behaviors?.getBehaviorDetails);
    } catch (_error) {
      return undefined;
    }
  },

  async getBehaviorRuntimeConfig(
    behaviorId: number
  ): Promise<BehaviorRuntimeConfig | undefined> {
    try {
      const resp = (await call_rpc(getConnection(), {
        behaviors: { getBehaviorRuntimeConfig: { behaviorId } },
      } as any)) as any;

      return mapBehaviorRuntimeConfig(resp.behaviors?.getBehaviorRuntimeConfig);
    } catch (_error) {
      return undefined;
    }
  },

  async setBehaviorRuntimeConfig(
    config: BehaviorRuntimeConfig
  ): Promise<SetBehaviorRuntimeConfigResponseCode> {
    const behaviorConfig =
      config.type === "holdTap"
        ? {
            behaviorId: config.behaviorId,
            holdTap: {
              tappingTermMs: config.tappingTermMs,
              quickTapMs: config.quickTapMs,
              requirePriorIdleMs: config.requirePriorIdleMs,
              flavor: encodeHoldTapFlavor(config.flavor),
              holdBehaviorId: config.holdBehaviorId,
              tapBehaviorId: config.tapBehaviorId,
            },
          }
        : config.type === "tapDance"
          ? {
              behaviorId: config.behaviorId,
              tapDance: {
                tappingTermMs: config.tappingTermMs,
                bindings: config.bindings,
              },
            }
          : {
              behaviorId: config.behaviorId,
              stickyKey: {
                releaseAfterMs: config.releaseAfterMs,
                quickRelease: config.quickRelease,
                lazy: config.lazy,
                ignoreModifiers: config.ignoreModifiers,
                behaviorId: config.bindingBehaviorId,
              },
            };

    const resp = (await call_rpc(getConnection(), {
      behaviors: { setBehaviorRuntimeConfig: { config: behaviorConfig } },
    } as any)) as any;

    notifyBehaviorsChanged();
    return resp.behaviors?.setBehaviorRuntimeConfig ?? 0;
  },

  async createBehavior(
    displayName: string,
    config: BehaviorRuntimeConfig
  ): Promise<{ ok?: number; err?: CreateBehaviorResponseCode }> {
    const behaviorConfig =
      config.type === "holdTap"
        ? {
            behaviorId: 0,
            holdTap: {
              tappingTermMs: config.tappingTermMs,
              quickTapMs: config.quickTapMs,
              requirePriorIdleMs: config.requirePriorIdleMs,
              flavor: encodeHoldTapFlavor(config.flavor),
              holdBehaviorId: config.holdBehaviorId,
              tapBehaviorId: config.tapBehaviorId,
            },
          }
        : config.type === "tapDance"
          ? {
              behaviorId: 0,
              tapDance: {
                tappingTermMs: config.tappingTermMs,
                bindings: config.bindings,
              },
            }
          : {
              behaviorId: 0,
              stickyKey: {
                releaseAfterMs: config.releaseAfterMs,
                quickRelease: config.quickRelease,
                lazy: config.lazy,
                ignoreModifiers: config.ignoreModifiers,
                behaviorId: config.bindingBehaviorId,
              },
            };

    const resp = (await call_rpc(getConnection(), {
      behaviors: { createBehavior: { displayName, config: behaviorConfig } },
    } as any)) as any;

    notifyBehaviorsChanged();
    return resp.behaviors?.createBehavior ?? { err: CreateBehaviorResponseCode.ERR_PERSIST };
  },

  async deleteBehavior(
    behaviorId: number
  ): Promise<DeleteBehaviorResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      behaviors: { deleteBehavior: { behaviorId } },
    } as any)) as any;

    notifyBehaviorsChanged();
    return resp.behaviors?.deleteBehavior ?? DeleteBehaviorResponseCode.ERR_PERSIST;
  },

  async renameBehavior(
    behaviorId: number,
    displayName: string
  ): Promise<RenameBehaviorResponseCode> {
    const resp = (await call_rpc(getConnection(), {
      behaviors: { renameBehavior: { behaviorId, displayName } },
    } as any)) as any;

    notifyBehaviorsChanged();
    return resp.behaviors?.renameBehavior ?? RenameBehaviorResponseCode.ERR_PERSIST;
  },

  onChange(cb: () => void): () => void {
    listeners.behaviors.push(cb);
    return () => {
      const idx = listeners.behaviors.indexOf(cb);
      if (idx >= 0) listeners.behaviors.splice(idx, 1);
    };
  },
};

export const bb9981Rpc = {
  behaviors: behaviorsRpc,
  macros: macrosRpc,
  combos: combosRpc,
  settings: settingsRpc,
};
