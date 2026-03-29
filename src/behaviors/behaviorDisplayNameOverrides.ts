const STORAGE_KEY = "bb9981BehaviorDisplayNameOverrides";

type BehaviorDisplayNameOverrides = Record<number, string>;

const DEFAULT_BEHAVIOR_DISPLAY_NAME_OVERRIDES: BehaviorDisplayNameOverrides = {
  1: "Mouse",
  3: "Scroll Function (legacy leftover keymapping)",
  15: "On/Off TrackPad",
  17: "Empty (Null) - No Action",
  19: "Soft Restart",
};

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch (_error) {
    return null;
  }
}

function parseOverrides(raw: string | null): BehaviorDisplayNameOverrides {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [
          Number(key),
          typeof value === "string" ? value : "",
        ] as const)
        .filter(([key, value]) => Number.isFinite(key) && value.trim() !== "")
    );
  } catch (_error) {
    return {};
  }
}

export function readBehaviorDisplayNameOverrides(): BehaviorDisplayNameOverrides {
  const storage = getStorage();
  return {
    ...DEFAULT_BEHAVIOR_DISPLAY_NAME_OVERRIDES,
    ...(storage ? parseOverrides(storage.getItem(STORAGE_KEY)) : {}),
  };
}

function writeOverrides(overrides: BehaviorDisplayNameOverrides) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getBehaviorDisplayNameOverride(
  behaviorId: number
): string | undefined {
  return readBehaviorDisplayNameOverrides()[behaviorId];
}

export function setBehaviorDisplayNameOverride(
  behaviorId: number,
  displayName: string
) {
  const trimmed = displayName.trim();
  const current = readBehaviorDisplayNameOverrides();

  if (!trimmed) {
    delete current[behaviorId];
  } else {
    current[behaviorId] = trimmed;
  }

  writeOverrides(current);
}

export function deleteBehaviorDisplayNameOverride(behaviorId: number) {
  const current = readBehaviorDisplayNameOverrides();
  if (!(behaviorId in current)) {
    return;
  }

  delete current[behaviorId];
  writeOverrides(current);
}
