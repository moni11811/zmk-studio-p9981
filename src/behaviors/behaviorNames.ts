import type {
  BehaviorBindingParametersSet,
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";

type BehaviorLike = Pick<GetBehaviorDetailsResponse, "id" | "displayName" | "metadata">;

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
  if (trimmed) {
    return trimmed;
  }

  const inferred = inferBehaviorName(behavior.metadata ?? []);
  if (inferred) {
    return inferred;
  }

  return `Behavior ${behavior.id}`;
}
