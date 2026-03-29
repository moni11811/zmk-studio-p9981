import type {
  BehaviorBindingParametersSet,
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";

type BehaviorLike = Pick<GetBehaviorDetailsResponse, "id" | "displayName" | "metadata">;

function normalizeBehaviorToken(name?: string): string {
  return name?.trim().replace(/^&+/, "").toLowerCase() ?? "";
}

function getKnownBehaviorLabel(token: string): string | undefined {
  switch (token) {
    case "kp":
      return "Key Press";
    case "bt":
      return "Bluetooth";
    case "out":
      return "Output Selection";
    case "rgb_ug":
      return "RGB Underglow";
    case "bl":
      return "Keyboard Backlight";
    case "trans":
      return "Transparent";
    case "none":
      return "No Action";
    case "mo":
      return "Momentary Layer";
    case "to":
      return "To Layer";
    case "tog":
      return "Toggle Layer";
    case "lt":
      return "Layer-Tap";
    case "mt":
      return "Mod-Tap";
    case "sk":
      return "Sticky Key";
    case "sl":
      return "Sticky Layer";
    case "td":
      return "Tap-Dance";
    case "bootloader":
      return "Bootloader";
    case "sys_reset":
      return "System Reset";
    case "reset":
      return "Reset";
    default:
      return undefined;
  }
}

function hasHidUsage(metadata: BehaviorBindingParametersSet[]): boolean {
  return metadata.some((set) => set.param1.some((value) => value.hidUsage));
}

function hasOnlyLayerParam(metadata: BehaviorBindingParametersSet[]): boolean {
  return (
    metadata.length > 0 &&
    metadata.every(
      (set) =>
        set.param2.length === 0 &&
        set.param1.length > 0 &&
        set.param1.every((value) => value.layerId)
    )
  );
}

function collectValueNames(metadata: BehaviorBindingParametersSet[]): string[] {
  return metadata.flatMap((set) =>
    [...set.param1, ...set.param2]
      .map((value) => value.name?.trim().toLowerCase())
      .filter((value): value is string => !!value)
  );
}

function inferBehaviorName(metadata: BehaviorBindingParametersSet[]): string | undefined {
  if (hasHidUsage(metadata)) {
    return "Key Press";
  }

  if (hasOnlyLayerParam(metadata)) {
    return "Layer";
  }

  const valueNames = collectValueNames(metadata);
  if (valueNames.length === 0) {
    return undefined;
  }

  const hasAny = (...needles: string[]) => needles.some((needle) => valueNames.includes(needle));

  if (
    hasAny(
      "next profile",
      "previous profile",
      "clear all profiles",
      "clear selected profile",
      "select profile",
      "disconnect profile",
      "profile"
    )
  ) {
    return "Bluetooth";
  }

  if (hasAny("toggle outputs", "usb output", "ble output")) {
    return "Output Selection";
  }

  if (
    hasAny(
      "toggle on/off",
      "turn on",
      "turn off",
      "hue up",
      "hue down",
      "saturation up",
      "saturation down",
      "brightness up",
      "brightness down",
      "speed up",
      "speed down",
      "next effect",
      "previous effect",
      "set color",
      "color"
    )
  ) {
    return "RGB Underglow";
  }

  return undefined;
}

export function getBehaviorLabel(behavior: BehaviorLike): string {
  const trimmed = behavior.displayName?.trim();
  const knownLabel = getKnownBehaviorLabel(normalizeBehaviorToken(trimmed));
  if (knownLabel) {
    return knownLabel;
  }

  if (trimmed) {
    return trimmed;
  }

  const inferred = inferBehaviorName(behavior.metadata ?? []);
  if (inferred) {
    return inferred;
  }

  return `Behavior ${behavior.id}`;
}
