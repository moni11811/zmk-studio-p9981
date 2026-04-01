import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { call_rpc } from "../rpc/logging";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { bb9981Rpc } from "../rpc/bb9981Rpc";
import { useSubprofiles } from "../rpc/useBB9981";
import { useLocalStorageState } from "../misc/useLocalStorageState";
import type {
  BacklightConfig,
  BluetoothConfig,
  PowerConfig,
  SleepConfig,
  TrackpadConfig,
} from "../rpc/bb9981Types";

type SnapshotSource = "device-profile" | "studio-template" | "import";

type SnapshotBinding = {
  behaviorId: number;
  param1: number;
  param2: number;
  behaviorName?: string;
};

type SnapshotLayer = {
  id: number;
  name: string;
  bindings: SnapshotBinding[];
};

type ProfileSnapshot = {
  version: 1;
  source: SnapshotSource;
  profile: {
    index?: number;
    name: string;
    active?: boolean;
    initialized?: boolean;
    integrityIssueCount?: number;
    integrityRepairCount?: number;
  };
  keymap: {
    layers: SnapshotLayer[];
  };
  settings: {
    trackpad: TrackpadConfig;
    backlight: BacklightConfig;
    bluetooth: BluetoothConfig;
    power: PowerConfig;
    sleep: SleepConfig;
  };
  metadata: {
    exportedAt?: string;
    importedAt?: string;
    lastAppliedAt?: string;
    deviceName?: string;
  };
};

type ProfileTemplate = {
  id: string;
  name: string;
  snapshot: ProfileSnapshot;
};

const panelClass =
  "rounded-2xl border border-base-300 bg-base-200/80 p-4 shadow-sm";
const innerPanelClass = "rounded-xl border border-base-300 bg-base-100 p-4";
const secondaryButtonClass =
  "rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm font-medium text-base-content/80 transition-colors hover:bg-base-300 hover:text-base-content";
const primaryButtonClass =
  "rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-medium text-base-content transition-colors hover:bg-primary/25";
const dangerButtonClass =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100";

function SectionCard({
  title,
  description,
  children,
  accent = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`${panelClass} ${accent ? "border-primary/25 bg-base-300/90" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-base-content">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-base-content/70">
              {description}
            </p>
          )}
        </div>
        {accent && (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-semibold text-base-content">
            Live
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success-content"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning-content"
        : "border-base-300 bg-base-100 text-base-content";

  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
    >
      <span className="text-base-content/60">{label}:</span> {value}
    </div>
  );
}

function ProfileNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm text-base-content outline-none transition-colors focus:border-primary/50 focus:bg-base-100"
    />
  );
}

function InfoRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success/10 text-success-content"
      : tone === "warning"
        ? "border-warning/20 bg-warning/10 text-warning-content"
        : "border-base-300 bg-base-100 text-base-content";

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-3 py-2 text-sm ${toneClass}`}
    >
      <span className="text-base-content/60">{label}</span>
      <span className="font-medium text-base-content">{value}</span>
    </div>
  );
}

function ProfileSlotCard({
  profile,
  activeProfile,
  busy,
  onActivate,
  onRename,
  onDuplicate,
  onReset,
  draftName,
  onDraftNameChange,
  isRenaming = false,
  onEditRename,
  onCancelRename,
}: {
  profile: {
    index: number;
    name: string;
    active: boolean;
    initialized: boolean;
    integrityIssueCount: number;
    integrityRepairCount: number;
  };
  activeProfile: boolean;
  busy: boolean;
  onActivate?: () => void;
  onRename: () => void;
  onDuplicate?: () => void;
  onReset?: () => void;
  draftName: string;
  onDraftNameChange: (next: string) => void;
  isRenaming?: boolean;
  onEditRename?: () => void;
  onCancelRename?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        activeProfile
          ? "border-primary/30 bg-primary/5"
          : "border-base-300 bg-base-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-base-content">
              Profile {profile.index + 1}
            </h3>
            {activeProfile && (
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-base-content">
                Active
              </span>
            )}
            {!activeProfile && (
              <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">
                Other Slot
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-base-content/60">{profile.name}</p>
        </div>
        {onActivate ? (
          <button
            onClick={onActivate}
            className={primaryButtonClass}
            disabled={busy}
          >
            Make Active
          </button>
        ) : (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-base-content">
            Current
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <InfoRow
          label="Initialized"
          value={profile.initialized ? "Yes" : "No"}
          tone={profile.initialized ? "success" : "warning"}
        />
        <InfoRow
          label="Issues"
          value={profile.integrityIssueCount}
          tone={profile.integrityIssueCount > 0 ? "warning" : "neutral"}
        />
        <InfoRow
          label="Repaired"
          value={profile.integrityRepairCount}
          tone={profile.integrityRepairCount > 0 ? "success" : "neutral"}
        />
        <InfoRow label="Slot" value={`#${profile.index + 1}`} />
      </div>

      {activeProfile ? (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-base-content/80">
            Rename profile
          </div>
          <ProfileNameInput value={draftName} onChange={onDraftNameChange} />
        </div>
      ) : isRenaming ? (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-base-content/80">
            Rename profile
          </div>
          <ProfileNameInput value={draftName} onChange={onDraftNameChange} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/65">
          Keep the current name, or open rename when you need it.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {activeProfile ? (
          <button
            onClick={onRename}
            className={secondaryButtonClass}
            disabled={busy}
          >
            Rename
          </button>
        ) : isRenaming ? (
          <button
            onClick={onRename}
            className={secondaryButtonClass}
            disabled={busy}
          >
            Save Name
          </button>
        ) : (
          <button
            onClick={onEditRename}
            className={secondaryButtonClass}
            disabled={busy}
          >
            Edit Name
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className={secondaryButtonClass}
            disabled={busy}
          >
            Replace With Active
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className={dangerButtonClass}
            disabled={busy}
          >
            Reset
          </button>
        )}
        {!activeProfile && isRenaming && (
          <button
            onClick={onCancelRename}
            className={secondaryButtonClass}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function normalizeNumber(value: unknown, fallback = 0): number {
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
    const candidate = value as { toNumber?: () => number; low?: number };

    if (typeof candidate.toNumber === "function") {
      try {
        const parsed = candidate.toNumber();
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }

    if (typeof candidate.low === "number") {
      return candidate.low;
    }
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSnapshotBinding(binding: unknown): SnapshotBinding {
  const candidate = isRecord(binding) ? binding : {};

  return {
    behaviorId: normalizeNumber(candidate.behaviorId),
    param1: normalizeNumber(candidate.param1),
    param2: normalizeNumber(candidate.param2),
    behaviorName:
      typeof candidate.behaviorName === "string" &&
      candidate.behaviorName.trim()
        ? candidate.behaviorName.trim()
        : typeof candidate.behaviorLabel === "string" &&
            candidate.behaviorLabel.trim()
          ? candidate.behaviorLabel.trim()
          : undefined,
  };
}

function normalizeSnapshotLayer(layer: unknown): SnapshotLayer {
  const candidate = isRecord(layer) ? layer : {};

  return {
    id: normalizeNumber(candidate.id),
    name: typeof candidate.name === "string" ? candidate.name : "",
    bindings: Array.isArray(candidate.bindings)
      ? candidate.bindings.map((binding) => normalizeSnapshotBinding(binding))
      : [],
  };
}

function normalizeTrackpadSnapshotConfig(config: unknown): TrackpadConfig {
  const candidate = isRecord(config) ? config : {};

  return {
    enabled: candidate.enabled ?? true,
    sensitivity: normalizeNumber(candidate.sensitivity, 5),
    scrollDirection:
      candidate.scrollDirection === "inverted" ? "inverted" : "normal",
    scrollSpeed: normalizeNumber(candidate.scrollSpeed, 5),
    pollingIntervalMs: normalizeNumber(candidate.pollingIntervalMs, 10),
    precisionModeEnabled: candidate.precisionModeEnabled ?? true,
    scrollModeSwitch:
      candidate.scrollModeSwitch === "disabled" ? "disabled" : "capslock",
    scrollProfile:
      candidate.scrollProfile === "analog3d" ? "analog3d" : "classic2d",
  };
}

function normalizeBacklightSnapshotConfig(config: unknown): BacklightConfig {
  const candidate = isRecord(config) ? config : {};
  const backlightIdleTimeoutMs = normalizeNumber(
    candidate.backlightIdleTimeoutMs ?? candidate.idleTimeoutMs,
    30000,
  );
  const hasExplicitRgbEnabled = typeof candidate.rgbEnabled === "boolean";
  const hasLegacyKeyboardLightingFields =
    candidate.rgbBrightness !== undefined ||
    candidate.rgbColor !== undefined ||
    candidate.rgbAutoOff !== undefined ||
    candidate.rgbIdleTimeoutMs !== undefined;

  return {
    backlightEnabled: candidate.backlightEnabled ?? true,
    backlightBrightness: normalizeNumber(candidate.backlightBrightness, 40),
    backlightAutoOff: candidate.backlightAutoOff ?? true,
    backlightIdleTimeoutMs,
    // Older snapshots can omit rgbEnabled while still carrying keyboard-light
    // settings. Treat those as enabled instead of silently forcing them off.
    rgbEnabled: hasExplicitRgbEnabled
      ? candidate.rgbEnabled
      : hasLegacyKeyboardLightingFields
        ? true
        : candidate.backlightEnabled ?? true,
    rgbBrightness: normalizeNumber(candidate.rgbBrightness, 50),
    rgbColor:
      typeof candidate.rgbColor === "string" && candidate.rgbColor.trim()
        ? candidate.rgbColor.trim()
        : "#ffffff",
    trackpadLedEnabled: candidate.trackpadLedEnabled ?? true,
    trackpadLedBrightness: normalizeNumber(candidate.trackpadLedBrightness, 50),
    rgbAutoOff: candidate.rgbAutoOff ?? candidate.backlightAutoOff ?? true,
    rgbIdleTimeoutMs: normalizeNumber(
      candidate.rgbIdleTimeoutMs ??
        candidate.idleTimeoutMs ??
        backlightIdleTimeoutMs,
      backlightIdleTimeoutMs,
    ),
  };
}

function normalizeBluetoothSnapshotConfig(config: unknown): BluetoothConfig {
  const candidate = isRecord(config) ? config : {};

  return {
    outputMode: candidate.outputMode === "usb" ? "usb" : "ble",
    activeOutputMode:
      candidate.activeOutputMode === "usb" || candidate.activeOutputMode === 1
        ? "usb"
        : candidate.activeOutputMode === "ble" ||
            candidate.activeOutputMode === 2
          ? "ble"
          : "none",
    activeProfile: normalizeNumber(candidate.activeProfile),
    profiles: Array.isArray(candidate.profiles)
      ? candidate.profiles.map((profile: unknown) => ({
          index: normalizeNumber(isRecord(profile) ? profile.index : undefined),
          name:
            isRecord(profile) && typeof profile.name === "string"
              ? profile.name
              : "",
          connected: isRecord(profile) ? profile.connected ?? false : false,
          paired: isRecord(profile) ? profile.paired ?? false : false,
        }))
      : [],
    txPowerBoost: candidate.txPowerBoost ?? true,
  };
}

function normalizePowerSnapshotConfig(config: unknown): PowerConfig {
  const candidate = isRecord(config) ? config : {};

  return {
    batteryPercent: normalizeNumber(candidate.batteryPercent),
    usbPowered: candidate.usbPowered ?? false,
    extPowerEnabled: candidate.extPowerEnabled ?? true,
    batteryReportIntervalS: normalizeNumber(
      candidate.batteryReportIntervalS,
      60,
    ),
    activityState:
      candidate.activityState === "idle"
        ? "idle"
        : candidate.activityState === "sleep"
          ? "sleep"
          : "active",
    chargingLedMode:
      candidate.chargingLedMode === "solid"
        ? "solid"
        : candidate.chargingLedMode === "blink"
          ? "blink"
          : candidate.chargingLedMode === "pulse"
            ? "pulse"
            : "off",
    chargingLedSpeedMs: normalizeNumber(candidate.chargingLedSpeedMs, 1000),
  };
}

function normalizeSleepSnapshotConfig(config: unknown): SleepConfig {
  const candidate = isRecord(config) ? config : {};

  return {
    idleEnabled: candidate.idleEnabled ?? true,
    idleTimeoutMs: normalizeNumber(candidate.idleTimeoutMs, 30000),
    sleepEnabled: candidate.sleepEnabled ?? false,
    sleepTimeoutMs: normalizeNumber(candidate.sleepTimeoutMs, 1800000),
    sleepWhileUsbPowered: candidate.sleepWhileUsbPowered ?? false,
  };
}

function normalizeSnapshot(
  raw: unknown,
  source: SnapshotSource = "import",
): ProfileSnapshot | null {
  if (!isRecord(raw)) {
    return null;
  }

  const profileCandidate = isRecord(raw.profile) ? raw.profile : undefined;
  const legacyProfileName =
    typeof raw.profileName === "string" ? raw.profileName : undefined;
  const profileName =
    (typeof profileCandidate?.name === "string" &&
      profileCandidate.name.trim()) ||
    legacyProfileName?.trim() ||
    "";

  if (!profileName) {
    return null;
  }

  const keymapCandidate = isRecord(raw.keymap) ? raw.keymap : undefined;
  const layers: SnapshotLayer[] = Array.isArray(keymapCandidate?.layers)
    ? keymapCandidate.layers.map((layer) => normalizeSnapshotLayer(layer))
    : [];

  const settingsCandidate = isRecord(raw.settings) ? raw.settings : {};
  const metadataCandidate = isRecord(raw.metadata) ? raw.metadata : {};
  const legacyExportedAt =
    typeof raw.exportedAt === "string" ? raw.exportedAt : undefined;
  const resolvedSource =
    raw.source === "device-profile" ||
    raw.source === "studio-template" ||
    raw.source === "import"
      ? raw.source
      : source;

  if (
    !isRecord(settingsCandidate.trackpad) ||
    !isRecord(settingsCandidate.backlight) ||
    !isRecord(settingsCandidate.bluetooth) ||
    !isRecord(settingsCandidate.power) ||
    !isRecord(settingsCandidate.sleep)
  ) {
    return null;
  }

  return {
    version: 1,
    source: resolvedSource,
    profile: {
      index:
        typeof profileCandidate?.index === "number"
          ? profileCandidate.index
          : typeof raw.activeProfile === "number"
            ? raw.activeProfile
            : undefined,
      name: profileName,
      active:
        typeof profileCandidate?.active === "boolean"
          ? profileCandidate.active
          : typeof raw.activeProfile === "number"
            ? true
            : undefined,
      initialized:
        typeof profileCandidate?.initialized === "boolean"
          ? profileCandidate.initialized
          : undefined,
      integrityIssueCount:
        typeof profileCandidate?.integrityIssueCount === "number"
          ? profileCandidate.integrityIssueCount
          : undefined,
      integrityRepairCount:
        typeof profileCandidate?.integrityRepairCount === "number"
          ? profileCandidate.integrityRepairCount
          : undefined,
    },
    keymap: { layers },
    settings: {
      trackpad: normalizeTrackpadSnapshotConfig(settingsCandidate.trackpad),
      backlight: normalizeBacklightSnapshotConfig(settingsCandidate.backlight),
      bluetooth: normalizeBluetoothSnapshotConfig(settingsCandidate.bluetooth),
      power: normalizePowerSnapshotConfig(settingsCandidate.power),
      sleep: normalizeSleepSnapshotConfig(settingsCandidate.sleep),
    },
    metadata: {
      exportedAt:
        typeof metadataCandidate.exportedAt === "string"
          ? metadataCandidate.exportedAt
          : legacyExportedAt,
      importedAt:
        typeof metadataCandidate.importedAt === "string"
          ? metadataCandidate.importedAt
          : source === "import"
            ? new Date().toISOString()
            : undefined,
      lastAppliedAt:
        typeof metadataCandidate.lastAppliedAt === "string"
          ? metadataCandidate.lastAppliedAt
          : undefined,
      deviceName:
        typeof metadataCandidate.deviceName === "string"
          ? metadataCandidate.deviceName
          : undefined,
    },
  };
}

function sanitizeFileSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile"
  );
}

function buildUniqueTemplateName(
  templates: ProfileTemplate[],
  preferredName: string,
): string {
  const trimmedPreferred = preferredName.trim() || "Template";
  const existingNames = new Set(
    templates.map((template) => template.name.trim().toLowerCase()),
  );

  if (!existingNames.has(trimmedPreferred.toLowerCase())) {
    return trimmedPreferred;
  }

  for (let index = 2; index <= templates.length + 2; index++) {
    const candidate = `${trimmedPreferred} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${trimmedPreferred} ${Date.now()}`;
}

async function loadBehaviorNamesForBindings(
  layers: { bindings: SnapshotBinding[] }[],
): Promise<Map<number, string>> {
  const behaviorIds = [
    ...new Set(
      layers.flatMap((layer) =>
        layer.bindings.map((binding) => binding.behaviorId),
      ),
    ),
  ].filter((behaviorId) => behaviorId > 0);

  const resolved = await Promise.all(
    behaviorIds.map(async (behaviorId) => {
      try {
        const detail = await bb9981Rpc.behaviors.getBehaviorDetails(behaviorId);
        return [
          behaviorId,
          detail?.displayName?.trim() || `Behavior ${behaviorId}`,
        ] as const;
      } catch (_error) {
        return [behaviorId, `Behavior ${behaviorId}`] as const;
      }
    }),
  );

  return new Map(resolved);
}

async function saveTextWithDialog(
  defaultFileName: string,
  contents: string,
): Promise<string | null> {
  try {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);

    const path = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      return null;
    }

    await writeTextFile(path, contents);
    return path;
  } catch (_error) {
    return null;
  }
}

async function openTextWithDialog(): Promise<{
  path: string;
  contents: string;
} | null> {
  try {
    const [{ open }, { readTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);

    const selected = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!selected || Array.isArray(selected)) {
      return null;
    }

    return { path: selected, contents: await readTextFile(selected) };
  } catch (_error) {
    return null;
  }
}

export function SubprofileSettings() {
  const { state, loading, error, switchProfile, renameProfile, resetProfile } =
    useSubprofiles();
  const connection = useContext(ConnectionContext);
  const [busyProfile, setBusyProfile] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [draftNames, setDraftNames] = useState<Record<number, string>>({});
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | null>(
    null,
  );
  const [storedTemplates, setTemplates] = useLocalStorageState<
    ProfileTemplate[]
  >("bb9981ProfileTemplates", []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const templates = Array.isArray(storedTemplates) ? storedTemplates : [];

  const activeProfile = useMemo(
    () => state?.profiles.find((profile) => profile.active),
    [state],
  );
  const inactiveProfiles = useMemo(
    () => (state?.profiles ?? []).filter((profile) => !profile.active),
    [state],
  );
  const flaggedProfiles = useMemo(
    () =>
      (state?.profiles ?? []).filter(
        (profile) =>
          profile.integrityIssueCount > 0 || profile.integrityRepairCount > 0,
      ),
    [state],
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const updateDraftName = useCallback((index: number, name: string) => {
    setDraftNames((current) => ({ ...current, [index]: name }));
  }, []);

  const getDraftName = useCallback(
    (index: number, fallback: string) => draftNames[index] ?? fallback,
    [draftNames],
  );

  const activateProfileWithFeedback = useCallback(
    async (profileIndex: number, failureMessage = "Profile switch failed.") => {
      setBusyProfile(profileIndex);
      setMessage("");
      try {
        const result = await switchProfile(profileIndex);
        if (result !== 0) {
          setMessage(failureMessage);
        }
        return result;
      } finally {
        setBusyProfile(null);
      }
    },
    [switchProfile],
  );

  const handleRename = useCallback(
    async (profileIndex: number, currentName: string) => {
      const nextName = getDraftName(profileIndex, currentName).trim();
      if (!nextName) {
        setMessage("Profile name cannot be empty.");
        return false;
      }

      setBusyProfile(profileIndex);
      setMessage("");
      try {
        const ok = await renameProfile(profileIndex, nextName);
        if (!ok) {
          setMessage("Rename failed.");
          return false;
        }
        return true;
      } finally {
        setBusyProfile(null);
      }
    },
    [getDraftName, renameProfile],
  );

  const handleReset = useCallback(
    async (profileIndex: number) => {
      setBusyProfile(profileIndex);
      setMessage("");
      try {
        const ok = await resetProfile(profileIndex);
        if (!ok) {
          setMessage("Reset failed.");
        }
      } finally {
        setBusyProfile(null);
      }
    },
    [resetProfile],
  );

  const buildActiveProfileSnapshot =
    useCallback(async (): Promise<ProfileSnapshot | null> => {
      if (!connection.conn || !activeProfile) {
        return null;
      }

      const [keymapResp, trackpad, backlight, bluetooth, power, sleep] =
        await Promise.all([
          call_rpc(connection.conn, { keymap: { getKeymap: true } }),
          bb9981Rpc.settings.getTrackpadConfig(),
          bb9981Rpc.settings.getBacklightConfig(),
          bb9981Rpc.settings.getBluetoothConfig(),
          bb9981Rpc.settings.getPowerConfig(),
          bb9981Rpc.settings.getSleepConfig(),
        ]);

      const layers = (keymapResp.keymap?.getKeymap?.layers ?? []).map(
        (layer: any) => ({
          id: Number(layer.id ?? 0),
          name: layer.name ?? "",
          bindings: (layer.bindings ?? []).map((binding: any) => ({
            behaviorId: Number(binding.behaviorId ?? 0),
            param1: Number(binding.param1 ?? 0),
            param2: Number(binding.param2 ?? 0),
          })),
        }),
      );
      const behaviorNames = await loadBehaviorNamesForBindings(layers);

      return {
        version: 1,
        source: "device-profile",
        profile: {
          index: activeProfile.index,
          name: activeProfile.name,
          active: activeProfile.active,
          initialized: activeProfile.initialized,
          integrityIssueCount: activeProfile.integrityIssueCount,
          integrityRepairCount: activeProfile.integrityRepairCount,
        },
        keymap: {
          layers: layers.map((layer) => ({
            ...layer,
            bindings: layer.bindings.map((binding: SnapshotBinding) => ({
              ...binding,
              behaviorName:
                behaviorNames.get(binding.behaviorId) ||
                `Behavior ${binding.behaviorId}`,
            })),
          })),
        },
        settings: { trackpad, backlight, bluetooth, power, sleep },
        metadata: {
          exportedAt: new Date().toISOString(),
        },
      };
    }, [activeProfile, connection.conn]);

  const exportActiveProfile = useCallback(async () => {
    const snapshot = await buildActiveProfileSnapshot();
    if (!snapshot || !activeProfile) {
      return;
    }

    setMessage("");

    const contents = JSON.stringify(snapshot, null, 2);
    const defaultFileName = `bb9981-profile-${activeProfile.index + 1}-${sanitizeFileSegment(
      activeProfile.name,
    )}.json`;
    const savedPath = await saveTextWithDialog(defaultFileName, contents);

    if (savedPath) {
      setMessage(`Exported active profile snapshot to ${savedPath}.`);
      return;
    }

    const blob = new Blob([contents], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = defaultFileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Exported active profile snapshot.");
  }, [activeProfile, buildActiveProfileSnapshot]);

  const saveCurrentAsTemplate = useCallback(async () => {
    if (!connection.conn || !activeProfile) {
      return;
    }

    setMessage("Saving template...");

    try {
      const snapshot = await buildActiveProfileSnapshot();
      if (!snapshot) {
        setMessage("Unable to capture the active profile.");
        return;
      }

      const baseName = activeProfile.name.trim()
        ? `${activeProfile.name.trim()} Template`
        : `Template ${templates.length + 1}`;
      const name = buildUniqueTemplateName(templates, baseName);

      const template: ProfileTemplate = {
        id: `${Date.now()}`,
        name,
        snapshot: {
          ...snapshot,
          source: "studio-template",
        },
      };

      setTemplates((current) => [
        ...(Array.isArray(current) ? current : []),
        template,
      ]);
      setSelectedTemplateId(template.id);
      setMessage(`Saved profile template "${name}".`);
    } catch (error) {
      console.error("Failed to save active profile template", error);
      setMessage("Template save failed.");
    }
  }, [
    activeProfile,
    buildActiveProfileSnapshot,
    connection.conn,
    setTemplates,
    templates,
  ]);

  const waitForProfile = useCallback(async (targetProfile: number) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const next = await bb9981Rpc.settings.getSubprofileState();
      if (next.activeProfile === targetProfile && !next.switching) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return false;
  }, []);

  const applyImportedProfile = useCallback(
    async (snapshotInput: unknown) => {
      if (!connection.conn) {
        return;
      }

      const snapshot = normalizeSnapshot(snapshotInput);
      if (!snapshot) {
        throw new Error(
          "The selected file does not look like a profile snapshot.",
        );
      }

      const keymapResp = await call_rpc(connection.conn, {
        keymap: { getKeymap: true },
      });
      const currentKeymap = keymapResp.keymap?.getKeymap;
      const currentLayers = currentKeymap?.layers ?? [];

      for (
        let layerIndex = 0;
        layerIndex <
        Math.min(snapshot.keymap.layers.length, currentLayers.length);
        layerIndex++
      ) {
        const importedLayer = snapshot.keymap.layers[layerIndex];
        const liveLayer = currentLayers[layerIndex];

        if (importedLayer.name && importedLayer.name !== liveLayer.name) {
          await call_rpc(connection.conn, {
            keymap: {
              setLayerProps: {
                layerId: liveLayer.id,
                name: importedLayer.name,
              },
            },
          });
        }

        for (
          let keyPosition = 0;
          keyPosition <
          Math.min(importedLayer.bindings.length, liveLayer.bindings.length);
          keyPosition++
        ) {
          await call_rpc(connection.conn, {
            keymap: {
              setLayerBinding: {
                layerId: liveLayer.id,
                keyPosition,
                binding: {
                  behaviorId: importedLayer.bindings[keyPosition].behaviorId,
                  param1: importedLayer.bindings[keyPosition].param1,
                  param2: importedLayer.bindings[keyPosition].param2,
                },
              },
            },
          });
        }
      }

      const currentProfileState = await bb9981Rpc.settings.getSubprofileState();
      if (snapshot.profile.name && snapshot.profile.name.trim()) {
        const currentProfileName =
          currentProfileState.profiles.find(
            (profile) => profile.index === currentProfileState.activeProfile,
          )?.name ?? "";

        if (currentProfileName !== snapshot.profile.name.trim()) {
          await renameProfile(
            currentProfileState.activeProfile,
            snapshot.profile.name.trim(),
          );
        }
      }

      await bb9981Rpc.settings.setTrackpadConfig(snapshot.settings.trackpad);
      await bb9981Rpc.settings.setBacklightConfig(snapshot.settings.backlight);
      await bb9981Rpc.settings.setBluetoothConfig(snapshot.settings.bluetooth);
      await bb9981Rpc.settings.setPowerConfig(snapshot.settings.power);
      await bb9981Rpc.settings.setSleepConfig(snapshot.settings.sleep);
      await call_rpc(connection.conn, { keymap: { saveChanges: true } });
      await bb9981Rpc.settings.saveChanges();
    },
    [connection.conn, renameProfile],
  );

  const applyTemplateToActiveProfile = useCallback(async () => {
    if (!connection.conn || !selectedTemplate) {
      return;
    }

    try {
      await applyImportedProfile(selectedTemplate.snapshot);
      setMessage(
        `Applied profile template "${selectedTemplate.name}" to ${activeProfile?.name ?? "the active profile"}.`,
      );
    } catch (error) {
      console.error("Failed to apply profile template", error);
      setMessage("Template apply failed.");
    }
  }, [
    activeProfile?.name,
    applyImportedProfile,
    connection.conn,
    selectedTemplate,
  ]);

  const deleteSelectedTemplate = useCallback(() => {
    if (!selectedTemplateId || !selectedTemplate) {
      return;
    }

    setTemplates((current) =>
      (Array.isArray(current) ? current : []).filter(
        (item) => item.id !== selectedTemplateId,
      ),
    );
    setSelectedTemplateId("");
    setMessage(`Deleted template "${selectedTemplate.name}".`);
  }, [selectedTemplate, selectedTemplateId, setTemplates]);

  const duplicateActiveInto = useCallback(
    async (targetProfileIndex: number) => {
      if (!activeProfile || activeProfile.index === targetProfileIndex) {
        return;
      }

      setBusyProfile(targetProfileIndex);
      setMessage("");

      try {
        const snapshot = await buildActiveProfileSnapshot();
        if (!snapshot) {
          setMessage("Nothing to duplicate.");
          return;
        }

        const switchResult = await activateProfileWithFeedback(
          targetProfileIndex,
          "Could not activate the destination profile.",
        );
        if (switchResult !== 0) {
          return;
        }

        const ready = await waitForProfile(targetProfileIndex);
        if (!ready) {
          setMessage("Destination profile did not finish switching.");
          return;
        }

        await applyImportedProfile(snapshot);
        setMessage(
          `Duplicated ${activeProfile.name} into Profile ${targetProfileIndex + 1}.`,
        );
      } catch (error) {
        console.error("Failed to duplicate active subprofile", error);
        setMessage("Duplicate failed.");
      } finally {
        setBusyProfile(null);
      }
    },
    [
      activeProfile,
      activateProfileWithFeedback,
      applyImportedProfile,
      buildActiveProfileSnapshot,
      waitForProfile,
    ],
  );

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const snapshot = JSON.parse(text) as unknown;
        await applyImportedProfile(snapshot);
        setMessage("Imported profile snapshot into the active subprofile.");
      } catch (error) {
        console.error("Failed to import subprofile snapshot", error);
        setMessage("Import failed.");
      } finally {
        event.target.value = "";
      }
    },
    [applyImportedProfile],
  );

  const importIntoActiveProfile = useCallback(async () => {
    setMessage("");
    const selected = await openTextWithDialog();
    if (!selected) {
      importInputRef.current?.click();
      return;
    }

    try {
      const snapshot = JSON.parse(selected.contents) as unknown;
      await applyImportedProfile(snapshot);
      setMessage(`Imported profile snapshot from ${selected.path}.`);
    } catch (error) {
      console.error("Failed to import subprofile snapshot", error);
      setMessage("Import failed.");
    }
  }, [applyImportedProfile]);

  if (loading && !state) {
    return (
      <div className="p-4 text-sm text-base-content/60">
        Loading subprofiles...
      </div>
    );
  }

  const profileCount = state?.profiles.length ?? 0;
  const templateCountLabel =
    templates.length === 1 ? "1 template" : `${templates.length} templates`;
  const profileCountLabel =
    profileCount === 1 ? "1 live profile" : `${profileCount} live profiles`;
  const flaggedCountLabel =
    flaggedProfiles.length === 1
      ? "1 flagged slot"
      : `${flaggedProfiles.length} flagged slots`;

  return (
    <div className="space-y-5 p-4">
      {error && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            Subprofile state could not be refreshed from the keyboard. The last
            known profile data is still shown.
          </p>
        </div>
      )}
      <section className="overflow-hidden rounded-3xl border border-base-300 bg-gradient-to-br from-base-200 via-base-200 to-base-100 shadow-sm">
        <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-base-content">
              Sub-Profiles
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-base-content">
              Keep the active slot first, manage the others cleanly, and store
              reusable templates separately.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/70">
              Use this page to work with the live keyboard slots first, then use
              local templates and file snapshots only when you need them.
            </p>

            {message && (
              <div className="mt-4 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/75">
                {message}
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[28rem] xl:grid-cols-3">
            <StatPill label="Slots" value={profileCountLabel} />
            <StatPill label="Templates" value={templateCountLabel} />
            <StatPill
              label="Status"
              value={
                flaggedProfiles.length > 0 ? flaggedCountLabel : "All clear"
              }
              tone={flaggedProfiles.length > 0 ? "warning" : "success"}
            />
          </div>
        </div>
      </section>

      <SectionCard
        title="Active Profile"
        description="This is the live slot currently running on the keyboard."
        accent
      >
        {activeProfile ? (
          <ProfileSlotCard
            profile={activeProfile}
            activeProfile
            busy={state?.switching || busyProfile === activeProfile.index}
            onReset={() => void handleReset(activeProfile.index)}
            draftName={getDraftName(activeProfile.index, activeProfile.name)}
            onDraftNameChange={(next) =>
              updateDraftName(activeProfile.index, next)
            }
            onRename={async () => {
              const renamed = await handleRename(
                activeProfile.index,
                activeProfile.name,
              );
              if (renamed) {
                setEditingProfileIndex(null);
              }
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-5 text-sm text-base-content/60">
            No active profile is currently available.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Other Slots"
        description="Switch a different slot into focus, replace it with the active profile, or rename it when you need to."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inactiveProfiles.map((profile) => {
            const busy = state?.switching || busyProfile === profile.index;
            const isRenaming = editingProfileIndex === profile.index;
            return (
              <ProfileSlotCard
                key={profile.index}
                profile={profile}
                activeProfile={false}
                busy={busy}
                onActivate={() =>
                  void activateProfileWithFeedback(profile.index)
                }
                onDuplicate={() => void duplicateActiveInto(profile.index)}
                draftName={getDraftName(profile.index, profile.name)}
                onDraftNameChange={(next) =>
                  updateDraftName(profile.index, next)
                }
                isRenaming={isRenaming}
                onEditRename={() => setEditingProfileIndex(profile.index)}
                onCancelRename={() => setEditingProfileIndex(null)}
                onRename={async () => {
                  const renamed = await handleRename(
                    profile.index,
                    profile.name,
                  );
                  if (renamed) {
                    setEditingProfileIndex(null);
                  }
                }}
              />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Templates"
        description="Save the active profile as a reusable Studio template, then apply that saved snapshot back to the active slot when needed."
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <button
            onClick={() => void saveCurrentAsTemplate()}
            className={secondaryButtonClass}
            disabled={!activeProfile || !connection.conn}
          >
            Save Active as Template
          </button>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-base-content">
                  Selected template
                </div>
                <div className="mt-1 text-sm text-base-content/65">
                  {selectedTemplate
                    ? selectedTemplate.name
                    : "Choose a template from the list below."}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void applyTemplateToActiveProfile()}
                  className={primaryButtonClass}
                  disabled={
                    !selectedTemplateId || !activeProfile || !connection.conn
                  }
                >
                  Apply Template to Active Slot
                </button>
                <button
                  onClick={deleteSelectedTemplate}
                  className={dangerButtonClass}
                  disabled={!selectedTemplateId}
                >
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
            No saved templates yet. Save the active profile once and it will
            appear here.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  selectedTemplateId === template.id
                    ? "border-primary/40 bg-primary/10 text-base-content"
                    : "border-base-300 bg-base-100 text-base-content/75 hover:bg-base-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-base-content">
                      {template.name}
                    </div>
                    <div className="mt-1 text-xs text-base-content/55">
                      {template.snapshot.keymap.layers.length} layers saved in
                      Studio
                    </div>
                  </div>
                  {selectedTemplateId === template.id && (
                    <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-base-content">
                      Selected
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Import / Export"
        description="Export a readable snapshot of the active profile or import a snapshot back into that same active slot."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={innerPanelClass}>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-base-content">
                Export current state
              </h3>
              <p className="text-sm leading-6 text-base-content/70">
                Save the active profile as a JSON snapshot for backup or
                sharing.
              </p>
            </div>
            <button
              onClick={() => void exportActiveProfile()}
              className={`${primaryButtonClass} mt-4 w-full`}
              disabled={!activeProfile || !connection.conn}
            >
              Export Snapshot
            </button>
          </div>

          <div className={innerPanelClass}>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-base-content">
                Import into active slot
              </h3>
              <p className="text-sm leading-6 text-base-content/70">
                Bring a saved snapshot back into the currently active profile.
              </p>
            </div>
            <button
              onClick={() => void importIntoActiveProfile()}
              className={`${secondaryButtonClass} mt-4 w-full`}
              disabled={!activeProfile || !connection.conn}
            >
              Import Snapshot
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => void handleImportFile(event)}
        />
      </SectionCard>
    </div>
  );
}
