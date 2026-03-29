import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import type {
  BehaviorBindingParametersSet,
  BehaviorParameterValueDescription,
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import {
  bb9981Rpc,
  CreateBehaviorResponseCode,
  DeleteBehaviorResponseCode,
  RenameBehaviorResponseCode,
  SetBehaviorRuntimeConfigResponseCode,
} from "../rpc/bb9981Rpc";
import type {
  BehaviorRuntimeConfig,
  CreateBehaviorResponseCode as CreateBehaviorResponseCodeType,
  DeleteBehaviorResponseCode as DeleteBehaviorResponseCodeType,
  HoldTapBehaviorConfig,
  HoldTapFlavor,
  RenameBehaviorResponseCode as RenameBehaviorResponseCodeType,
  StickyKeyBehaviorConfig,
  TapDanceBehaviorConfig,
} from "../rpc/bb9981Types";
import { ConnectionContext } from "../rpc/ConnectionContext";

type StudioBehaviorDetails = GetBehaviorDetailsResponse & {
  isUserDefined?: boolean;
};

interface BehaviorControlProps {
  behaviors: StudioBehaviorDetails[];
  layers: { id: number; name: string }[];
}

const MAX_TAP_DANCE_BINDINGS = 8;

type BehaviorTemplateKey =
  | "holdTap"
  | "modTap"
  | "layerTap"
  | "tapDance"
  | "stickyKey"
  | "stickyLayer";

interface BehaviorTemplateDefinition {
  key: BehaviorTemplateKey;
  label: string;
  defaultName: string;
  description: string;
  createConfig: (behaviors: StudioBehaviorDetails[]) => BehaviorRuntimeConfig;
}

function countConfiguredParams(values?: BehaviorParameterValueDescription[]): number {
  return values?.filter((value) => !value.nil).length ?? 0;
}

function behaviorFamilyLabel(type: BehaviorRuntimeConfig["type"]): string {
  switch (type) {
    case "holdTap":
      return "Hold-Tap";
    case "tapDance":
      return "Tap-Dance";
    case "stickyKey":
      return "Sticky Key";
  }
}

function behaviorCompatibleLabel(type: BehaviorRuntimeConfig["type"]): string {
  switch (type) {
    case "holdTap":
      return '"zmk,behavior-hold-tap"';
    case "tapDance":
      return '"zmk,behavior-tap-dance"';
    case "stickyKey":
      return '"zmk,behavior-sticky-key"';
  }
}

function behaviorUsesCount(config: BehaviorRuntimeConfig): number {
  switch (config.type) {
    case "holdTap":
      return 2;
    case "tapDance":
      return config.bindings.length;
    case "stickyKey":
      return 1;
  }
}

function parameterValuesLabel(values?: BehaviorParameterValueDescription[]): string {
  if (!values || values.length === 0) {
    return "No parameters";
  }

  const labels = new Set<string>();

  values.forEach((value) => {
    if (value.layerId) {
      labels.add("Layer");
      return;
    }

    if (value.hidUsage) {
      labels.add("Key / HID Usage");
      return;
    }

    if (value.range) {
      labels.add(`Range ${value.range.min}-${value.range.max}`);
      return;
    }

    if (value.constant !== undefined) {
      labels.add(value.name?.trim() ? value.name : `Value ${value.constant}`);
      return;
    }

    if (value.nil) {
      labels.add("No value");
    }
  });

  return labels.size > 0 ? [...labels].join(", ") : "Parameter";
}

function describeBehaviorParameterFlow(
  metadata?: BehaviorBindingParametersSet[]
): string {
  if (!metadata || metadata.length === 0) {
    return "No parameters";
  }

  const unarySets = metadata.filter(
    (set) => countConfiguredParams(set.param2) === 0
  );

  if (unarySets.length === 0) {
    return "Requires two parameters";
  }

  const labels = new Set(
    unarySets.map((set) => parameterValuesLabel(set.param1)).filter(Boolean)
  );

  return labels.size > 0 ? [...labels].join(" | ") : "Single parameter";
}

function isUnaryCompatibleBehavior(
  behavior: GetBehaviorDetailsResponse,
  currentBehaviorId: number
): boolean {
  if (behavior.id === currentBehaviorId) {
    return false;
  }

  if (!behavior.metadata || behavior.metadata.length === 0) {
    return true;
  }

  return behavior.metadata.some((set) => countConfiguredParams(set.param2) === 0);
}

function cloneBinding(binding: BehaviorBinding): BehaviorBinding {
  return {
    behaviorId: binding.behaviorId,
    param1: binding.param1,
    param2: binding.param2,
  };
}

function cloneConfig(config: BehaviorRuntimeConfig): BehaviorRuntimeConfig {
  switch (config.type) {
    case "holdTap":
      return { ...config };
    case "tapDance":
      return {
        ...config,
        bindings: config.bindings.map(cloneBinding),
      };
    case "stickyKey":
      return { ...config };
  }
}

function createDefaultBinding(
  behaviors: StudioBehaviorDetails[],
  currentBehaviorId: number
): BehaviorBinding {
  const fallbackBehavior =
    behaviors.find((behavior) => behavior.id !== currentBehaviorId) ?? behaviors[0];

  return {
    behaviorId: fallbackBehavior?.id ?? currentBehaviorId,
    param1: 0,
    param2: 0,
  };
}

function findBehaviorByDisplayName(
  behaviors: StudioBehaviorDetails[],
  displayName: string
): StudioBehaviorDetails | undefined {
  return behaviors.find(
    (behavior) =>
      normalizeBehaviorName(behavior.displayName) === normalizeBehaviorName(displayName)
  );
}

function findBehaviorByDisplayNames(
  behaviors: StudioBehaviorDetails[],
  displayNames: string[]
): StudioBehaviorDetails | undefined {
  for (const displayName of displayNames) {
    const match = findBehaviorByDisplayName(behaviors, displayName);
    if (match) {
      return match;
    }
  }

  return undefined;
}

function createDefaultHoldTapConfig(
  behaviors: StudioBehaviorDetails[]
): HoldTapBehaviorConfig {
  const keyPress = findBehaviorByDisplayName(behaviors, "Key Press") ?? behaviors[0];

  return {
    type: "holdTap",
    behaviorId: 0,
    tappingTermMs: 200,
    quickTapMs: -1,
    requirePriorIdleMs: -1,
    flavor: "balanced",
    holdBehaviorId: keyPress?.id ?? 0,
    tapBehaviorId: keyPress?.id ?? 0,
  };
}

function createDefaultModTapConfig(
  behaviors: StudioBehaviorDetails[]
): HoldTapBehaviorConfig {
  const keyPress = findBehaviorByDisplayName(behaviors, "Key Press") ?? behaviors[0];

  return {
    type: "holdTap",
    behaviorId: 0,
    tappingTermMs: 200,
    quickTapMs: -1,
    requirePriorIdleMs: -1,
    flavor: "hold-preferred",
    holdBehaviorId: keyPress?.id ?? 0,
    tapBehaviorId: keyPress?.id ?? 0,
  };
}

function createDefaultLayerTapConfig(
  behaviors: StudioBehaviorDetails[]
): HoldTapBehaviorConfig {
  const momentaryLayer =
    findBehaviorByDisplayNames(behaviors, ["Momentary Layer", "Momentary layer"]) ??
    behaviors[0];
  const keyPress = findBehaviorByDisplayName(behaviors, "Key Press") ?? behaviors[0];

  return {
    type: "holdTap",
    behaviorId: 0,
    tappingTermMs: 200,
    quickTapMs: -1,
    requirePriorIdleMs: -1,
    flavor: "tap-preferred",
    holdBehaviorId: momentaryLayer?.id ?? 0,
    tapBehaviorId: keyPress?.id ?? 0,
  };
}

function createDefaultTapDanceConfig(
  behaviors: StudioBehaviorDetails[]
): TapDanceBehaviorConfig {
  const noneBehavior =
    findBehaviorByDisplayName(behaviors, "None") ??
    behaviors.find((behavior) => behavior.displayName !== "Transparent") ??
    behaviors[0];

  return {
    type: "tapDance",
    behaviorId: 0,
    tappingTermMs: 200,
    bindings: [
      {
        behaviorId: noneBehavior?.id ?? 0,
        param1: 0,
        param2: 0,
      },
    ],
  };
}

function createDefaultStickyKeyConfig(
  behaviors: StudioBehaviorDetails[]
): StickyKeyBehaviorConfig {
  const keyPress = findBehaviorByDisplayName(behaviors, "Key Press") ?? behaviors[0];

  return {
    type: "stickyKey",
    behaviorId: 0,
    releaseAfterMs: 1000,
    quickRelease: false,
    lazy: false,
    ignoreModifiers: true,
    bindingBehaviorId: keyPress?.id ?? 0,
  };
}

function createDefaultStickyLayerConfig(
  behaviors: StudioBehaviorDetails[]
): StickyKeyBehaviorConfig {
  const momentaryLayer =
    findBehaviorByDisplayNames(behaviors, ["Momentary Layer", "Momentary layer"]) ??
    behaviors[0];

  return {
    type: "stickyKey",
    behaviorId: 0,
    releaseAfterMs: 1000,
    quickRelease: true,
    lazy: false,
    ignoreModifiers: false,
    bindingBehaviorId: momentaryLayer?.id ?? 0,
  };
}

const BEHAVIOR_TEMPLATES: BehaviorTemplateDefinition[] = [
  {
    key: "modTap",
    label: "New Mod-Tap",
    defaultName: "Custom Mod-Tap",
    description: "Key press on hold, key press on tap, using the standard mod-tap defaults.",
    createConfig: createDefaultModTapConfig,
  },
  {
    key: "layerTap",
    label: "New Layer-Tap",
    defaultName: "Custom Layer-Tap",
    description: "Momentary layer on hold, key press on tap.",
    createConfig: createDefaultLayerTapConfig,
  },
  {
    key: "holdTap",
    label: "New Hold-Tap",
    defaultName: "Custom Hold-Tap",
    description: "Generic hold-tap base for custom timing and child behavior combinations.",
    createConfig: createDefaultHoldTapConfig,
  },
  {
    key: "tapDance",
    label: "New Tap-Dance",
    defaultName: "Custom Tap-Dance",
    description: "Multiple tap slots that trigger different bindings by tap count.",
    createConfig: createDefaultTapDanceConfig,
  },
  {
    key: "stickyKey",
    label: "New Sticky Key",
    defaultName: "Custom Sticky Key",
    description: "Latch a key press until the next key action.",
    createConfig: createDefaultStickyKeyConfig,
  },
  {
    key: "stickyLayer",
    label: "New Sticky Layer",
    defaultName: "Custom Sticky Layer",
    description: "Latch a momentary layer until the next key action.",
    createConfig: createDefaultStickyLayerConfig,
  },
];

function holdTapFlavorLabel(flavor: HoldTapFlavor): string {
  switch (flavor) {
    case "balanced":
      return "Balanced";
    case "tap-preferred":
      return "Tap Preferred";
    case "tap-unless-interrupted":
      return "Tap Unless Interrupted";
    default:
      return "Hold Preferred";
  }
}

function normalizeBehaviorName(value?: string): string | undefined {
  return value?.trim()?.toLowerCase();
}

function behaviorTemplateLabel(
  config: BehaviorRuntimeConfig,
  behavior: StudioBehaviorDetails | undefined,
  behaviorMap: Map<number, StudioBehaviorDetails>
): string {
  const displayName = normalizeBehaviorName(behavior?.displayName);

  if (config.type === "holdTap") {
    const holdDisplayName = normalizeBehaviorName(
      behaviorMap.get(config.holdBehaviorId)?.displayName
    );
    const tapDisplayName = normalizeBehaviorName(
      behaviorMap.get(config.tapBehaviorId)?.displayName
    );

    if (
      displayName === "layer-tap" ||
      (holdDisplayName === "momentary layer" &&
        tapDisplayName === "key press" &&
        config.flavor === "tap-preferred")
    ) {
      return "Layer-Tap";
    }

    if (
      displayName === "mod-tap" ||
      (holdDisplayName === "key press" &&
        tapDisplayName === "key press" &&
        config.flavor === "hold-preferred")
    ) {
      return "Mod-Tap";
    }

    return "Hold-Tap";
  }

  if (config.type === "stickyKey") {
    const wrappedDisplayName = normalizeBehaviorName(
      behaviorMap.get(config.bindingBehaviorId)?.displayName
    );

    if (
      displayName === "sticky layer" ||
      (wrappedDisplayName === "momentary layer" && config.quickRelease)
    ) {
      return "Sticky Layer";
    }

    return "Sticky Key";
  }

  return "Tap-Dance";
}

function setBehaviorErrorMessage(code: SetBehaviorRuntimeConfigResponseCode): string {
  switch (code) {
    case SetBehaviorRuntimeConfigResponseCode.ERR_INVALID_ID:
      return "Studio could not find that behavior on the connected keyboard.";
    case SetBehaviorRuntimeConfigResponseCode.ERR_INVALID_BINDING:
      return "One of the selected child behaviors is invalid for this behavior.";
    case SetBehaviorRuntimeConfigResponseCode.ERR_OUT_OF_RANGE:
      return "One of the values is outside the supported range.";
    case SetBehaviorRuntimeConfigResponseCode.ERR_NOT_SUPPORTED:
      return "That behavior does not support live runtime editing.";
    case SetBehaviorRuntimeConfigResponseCode.ERR_PERSIST:
      return "The behavior changed live, but the keyboard could not persist it to settings.";
    case SetBehaviorRuntimeConfigResponseCode.ERR_INVALID_CONFIG:
    default:
      return "The keyboard rejected that behavior configuration.";
  }
}

function createBehaviorErrorMessage(code: CreateBehaviorResponseCodeType): string {
  switch (code) {
    case CreateBehaviorResponseCode.ERR_INVALID_NAME:
      return "The new behavior needs a valid name.";
    case CreateBehaviorResponseCode.ERR_INVALID_BINDING:
      return "One of the selected child behaviors is invalid.";
    case CreateBehaviorResponseCode.ERR_NO_SLOT:
      return "The keyboard has no free runtime behavior slots left for that behavior type.";
    case CreateBehaviorResponseCode.ERR_PERSIST:
      return "The keyboard created the behavior live, but could not persist it.";
    case CreateBehaviorResponseCode.ERR_INVALID_CONFIG:
    default:
      return "The keyboard rejected that new behavior configuration.";
  }
}

function deleteBehaviorErrorMessage(code: DeleteBehaviorResponseCodeType): string {
  switch (code) {
    case DeleteBehaviorResponseCode.ERR_NOT_USER_DEFINED:
      return "That behavior type cannot be deleted live from Studio.";
    case DeleteBehaviorResponseCode.ERR_IN_USE:
      return "That behavior is still referenced by the keymap, macros, combos, or another behavior.";
    case DeleteBehaviorResponseCode.ERR_PERSIST:
      return "The keyboard removed the behavior live, but could not persist that delete.";
    case DeleteBehaviorResponseCode.ERR_INVALID_ID:
    default:
      return "Studio could not find that behavior on the connected keyboard.";
  }
}

function renameBehaviorErrorMessage(code: RenameBehaviorResponseCodeType): string {
  switch (code) {
    case RenameBehaviorResponseCode.ERR_NOT_USER_DEFINED:
      return "That behavior type does not support live renaming.";
    case RenameBehaviorResponseCode.ERR_INVALID_NAME:
      return "The behavior name cannot be blank.";
    case RenameBehaviorResponseCode.ERR_PERSIST:
      return "The keyboard renamed the behavior live, but could not persist it.";
    case RenameBehaviorResponseCode.ERR_INVALID_ID:
    default:
      return "Studio could not find that behavior on the connected keyboard.";
  }
}

function UnaryBehaviorSelect({
  label,
  value,
  currentBehaviorId,
  options,
  inheritedParamLabel,
  onChange,
}: {
  label: string;
  value: number;
  currentBehaviorId: number;
  options: GetBehaviorDetailsResponse[];
  inheritedParamLabel: string;
  onChange: (value: number) => void;
}) {
  const filteredOptions = useMemo(() => {
    const baseOptions = options.filter(
      (behavior) => behavior.id !== currentBehaviorId
    );
    const compatibleOptions = baseOptions.filter((behavior) =>
      isUnaryCompatibleBehavior(behavior, currentBehaviorId)
    );
    const selectedBehavior = options.find((behavior) => behavior.id === value);
    const nextOptions =
      compatibleOptions.length > 0 ? compatibleOptions : baseOptions;

    if (
      selectedBehavior &&
      selectedBehavior.id !== currentBehaviorId &&
      !nextOptions.some((behavior) => behavior.id === selectedBehavior.id)
    ) {
      return [selectedBehavior, ...nextOptions];
    }

    return nextOptions;
  }, [currentBehaviorId, options, value]);

  const selectedBehavior = useMemo(
    () => options.find((behavior) => behavior.id === value),
    [options, value]
  );

  const selectedBehaviorIsFiltered = useMemo(
    () =>
      !!selectedBehavior &&
      selectedBehavior.id !== currentBehaviorId &&
      !isUnaryCompatibleBehavior(selectedBehavior, currentBehaviorId),
    [currentBehaviorId, selectedBehavior]
  );

  return (
    <div className="flex flex-col gap-1 rounded border border-gray-200 bg-gray-50 p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{label}</span>
        <select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="border rounded px-2 py-1.5 bg-white"
        >
          {filteredOptions.map((behavior) => (
            <option key={behavior.id} value={behavior.id}>
              {behavior.displayName}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-gray-500">{inheritedParamLabel}</p>
      {selectedBehavior && (
        <div className="flex flex-col gap-1 text-xs text-gray-600">
          <span>
            Parameter Flow: {describeBehaviorParameterFlow(selectedBehavior.metadata)}
          </span>
          {selectedBehaviorIsFiltered && (
            <span>
              This current selection is being preserved, but it is not a clean
              single-parameter match for this editor.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HoldTapEditor({
  behavior,
  draft,
  options,
  onChange,
}: {
  behavior: GetBehaviorDetailsResponse | undefined;
  draft: HoldTapBehaviorConfig;
  options: GetBehaviorDetailsResponse[];
  onChange: (draft: HoldTapBehaviorConfig) => void;
}) {
  const currentBehaviorId = behavior?.id ?? draft.behaviorId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Flavor</span>
        <select
          value={draft.flavor}
          onChange={(event) =>
            onChange({
              ...draft,
              flavor: event.target.value as HoldTapFlavor,
            })
          }
          className="border rounded px-2 py-1.5 bg-white"
        >
          {(
            [
              "hold-preferred",
              "balanced",
              "tap-preferred",
              "tap-unless-interrupted",
            ] as HoldTapFlavor[]
          ).map((flavor) => (
            <option key={flavor} value={flavor}>
              {holdTapFlavorLabel(flavor)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Tapping Term (ms)</span>
        <input
          type="number"
          min={1}
          value={draft.tappingTermMs}
          onChange={(event) =>
            onChange({
              ...draft,
              tappingTermMs: Number(event.target.value),
            })
          }
          className="border rounded px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Quick Tap (ms)</span>
        <input
          type="number"
          min={-1}
          value={draft.quickTapMs}
          onChange={(event) =>
            onChange({
              ...draft,
              quickTapMs: Number(event.target.value),
            })
          }
          className="border rounded px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Require Prior Idle (ms)</span>
        <input
          type="number"
          min={-1}
          value={draft.requirePriorIdleMs}
          onChange={(event) =>
            onChange({
              ...draft,
              requirePriorIdleMs: Number(event.target.value),
            })
          }
          className="border rounded px-2 py-1.5"
        />
      </label>

      <UnaryBehaviorSelect
        label="Hold Behavior"
        value={draft.holdBehaviorId}
        currentBehaviorId={currentBehaviorId}
        options={options}
        inheritedParamLabel="Uses parameter 1 from bindings when this behavior is invoked."
        onChange={(holdBehaviorId) => onChange({ ...draft, holdBehaviorId })}
      />

      <UnaryBehaviorSelect
        label="Tap Behavior"
        value={draft.tapBehaviorId}
        currentBehaviorId={currentBehaviorId}
        options={options}
        inheritedParamLabel="Uses parameter 2 from bindings when this behavior is invoked."
        onChange={(tapBehaviorId) => onChange({ ...draft, tapBehaviorId })}
      />
    </div>
  );
}

function TapDanceEditor({
  draft,
  behaviors,
  layers,
  onChange,
}: {
  draft: TapDanceBehaviorConfig;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onChange: (draft: TapDanceBehaviorConfig) => void;
}) {
  const canAddBinding = draft.bindings.length < MAX_TAP_DANCE_BINDINGS;
  const canRemoveBinding = draft.bindings.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm max-w-xs">
        <span className="font-medium">Tapping Term (ms)</span>
        <input
          type="number"
          min={1}
          value={draft.tappingTermMs}
          onChange={(event) =>
            onChange({
              ...draft,
              tappingTermMs: Number(event.target.value),
            })
          }
          className="border rounded px-2 py-1.5"
        />
      </label>

      <div className="flex flex-col gap-3">
        {draft.bindings.map((binding, index) => (
          <div
            key={`${draft.behaviorId}-${index}`}
            className="rounded border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Tap Slot {index + 1}</p>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    bindings: draft.bindings.filter((_, bindingIndex) => bindingIndex !== index),
                  })
                }
                disabled={!canRemoveBinding}
                className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove Slot
              </button>
            </div>
            <BehaviorBindingPicker
              binding={binding}
              behaviors={behaviors}
              layers={layers}
              onBindingChanged={(nextBinding) =>
                onChange({
                  ...draft,
                  bindings: draft.bindings.map((existingBinding, bindingIndex) =>
                    bindingIndex === index ? nextBinding : existingBinding
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Tap-dance behaviors support up to {MAX_TAP_DANCE_BINDINGS} slots.
        </p>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...draft,
              bindings: [
                ...draft.bindings,
                createDefaultBinding(behaviors, draft.behaviorId),
              ],
            })
          }
          disabled={!canAddBinding}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Slot
        </button>
      </div>
    </div>
  );
}

function StickyKeyEditor({
  behavior,
  draft,
  options,
  onChange,
}: {
  behavior: GetBehaviorDetailsResponse | undefined;
  draft: StickyKeyBehaviorConfig;
  options: GetBehaviorDetailsResponse[];
  onChange: (draft: StickyKeyBehaviorConfig) => void;
}) {
  const currentBehaviorId = behavior?.id ?? draft.behaviorId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Release After (ms)</span>
        <input
          type="number"
          min={1}
          value={draft.releaseAfterMs}
          onChange={(event) =>
            onChange({
              ...draft,
              releaseAfterMs: Number(event.target.value),
            })
          }
          className="border rounded px-2 py-1.5"
        />
      </label>

      <UnaryBehaviorSelect
        label="Wrapped Behavior"
        value={draft.bindingBehaviorId}
        currentBehaviorId={currentBehaviorId}
        options={options}
        inheritedParamLabel="Uses parameter 1 from bindings when this behavior is invoked."
        onChange={(bindingBehaviorId) =>
          onChange({ ...draft, bindingBehaviorId })
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.quickRelease}
          onChange={(event) =>
            onChange({
              ...draft,
              quickRelease: event.target.checked,
            })
          }
        />
        <span>Quick Release</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.lazy}
          onChange={(event) =>
            onChange({
              ...draft,
              lazy: event.target.checked,
            })
          }
        />
        <span>Lazy</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.ignoreModifiers}
          onChange={(event) =>
            onChange({
              ...draft,
              ignoreModifiers: event.target.checked,
            })
          }
        />
        <span>Ignore Modifiers</span>
      </label>
    </div>
  );
}

export function BehaviorControl({ behaviors, layers }: BehaviorControlProps) {
  const connection = useContext(ConnectionContext);
  const [runtimeBehaviorDetails, setRuntimeBehaviorDetails] = useState<
    Record<number, StudioBehaviorDetails>
  >({});
  const [configs, setConfigs] = useState<BehaviorRuntimeConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BehaviorRuntimeConfig>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<BehaviorTemplateKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const behaviorMap = useMemo(
    () =>
      new Map(
        [...behaviors, ...Object.values(runtimeBehaviorDetails)].map((behavior) => [
          behavior.id,
          behavior,
        ])
      ),
    [behaviors, runtimeBehaviorDetails]
  );

  const sortedBehaviors = useMemo(
    () => [...behaviors].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [behaviors]
  );

  const customConfigs = useMemo(
    () =>
      configs.filter((config) => behaviorMap.get(config.behaviorId)?.isUserDefined),
    [behaviorMap, configs]
  );

  const reconfigurationConfigs = useMemo(
    () =>
      configs.filter((config) => !behaviorMap.get(config.behaviorId)?.isUserDefined),
    [behaviorMap, configs]
  );

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setRuntimeBehaviorDetails({});
      setConfigs([]);
      setDrafts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        sortedBehaviors.map(async (behavior) => ({
          behaviorId: behavior.id,
          runtime: await bb9981Rpc.behaviors.getBehaviorRuntimeConfig(behavior.id),
        }))
      );

      const nextConfigs = results
        .map((result) => result.runtime)
        .filter((runtime): runtime is BehaviorRuntimeConfig => !!runtime);

      const referencedBehaviorIds = new Set<number>();
      nextConfigs.forEach((config) => {
        if (config.type === "holdTap") {
          referencedBehaviorIds.add(config.holdBehaviorId);
          referencedBehaviorIds.add(config.tapBehaviorId);
          return;
        }

        if (config.type === "tapDance") {
          config.bindings.forEach((binding) =>
            referencedBehaviorIds.add(binding.behaviorId)
          );
          return;
        }

        referencedBehaviorIds.add(config.bindingBehaviorId);
      });

      const missingBehaviorIds = [...referencedBehaviorIds].filter(
        (behaviorId) => behaviorId > 0 && !behaviorMap.has(behaviorId)
      );

      if (missingBehaviorIds.length > 0) {
        const fetchedBehaviorDetails = await Promise.all(
          missingBehaviorIds.map((behaviorId) =>
            bb9981Rpc.behaviors.getBehaviorDetails(behaviorId)
          )
        );

        const fetchedBehaviorMap = Object.fromEntries(
          fetchedBehaviorDetails
            .filter((detail): detail is StudioBehaviorDetails => !!detail)
            .map((detail) => [detail.id, detail])
        );

        if (Object.keys(fetchedBehaviorMap).length > 0) {
          setRuntimeBehaviorDetails((current) => ({
            ...current,
            ...fetchedBehaviorMap,
          }));
        }
      }

      setConfigs(nextConfigs);
      setDrafts(
        Object.fromEntries(
          nextConfigs.map((config) => [config.behaviorId, cloneConfig(config)])
        )
      );
      setNameDrafts(
        Object.fromEntries(
          nextConfigs.map((config) => [
            config.behaviorId,
            behaviorMap.get(config.behaviorId)?.displayName ?? `Behavior ${config.behaviorId}`,
          ])
        )
      );
    } catch (runtimeError) {
      console.error("Failed to load live behavior configs", runtimeError);
      setConfigs([]);
      setDrafts({});
      setError("Failed to load live behavior configuration from the keyboard.");
    } finally {
      setLoading(false);
    }
  }, [behaviorMap, connection.conn, sortedBehaviors]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateDraft = useCallback(
    (behaviorId: number, nextDraft: BehaviorRuntimeConfig) => {
      setDrafts((current) => ({
        ...current,
        [behaviorId]: nextDraft,
      }));
    },
    []
  );

  const resetDraft = useCallback((behaviorId: number) => {
    const original = configs.find((config) => config.behaviorId === behaviorId);
    if (!original) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [behaviorId]: cloneConfig(original),
    }));
    setNameDrafts((current) => ({
      ...current,
      [behaviorId]:
        behaviorMap.get(behaviorId)?.displayName ?? current[behaviorId] ?? "",
    }));
  }, [behaviorMap, configs]);

  const saveDraft = useCallback(
    async (behaviorId: number) => {
      const draft = drafts[behaviorId];
      if (!draft) {
        return;
      }

      setSavingId(behaviorId);
      setError(null);
      setMessage(null);

      try {
        const code = await bb9981Rpc.behaviors.setBehaviorRuntimeConfig(draft);
        if (code !== SetBehaviorRuntimeConfigResponseCode.OK) {
          setError(setBehaviorErrorMessage(code));
          return;
        }

        await refresh();
        setMessage("Behavior changes applied live and saved to the keyboard.");
      } catch (saveError) {
        console.error("Failed to save live behavior config", saveError);
        setError("Studio could not write that behavior to the keyboard.");
      } finally {
        setSavingId(null);
      }
    },
    [drafts, refresh]
  );

  const createBehavior = useCallback(
    async (templateKey: BehaviorTemplateKey) => {
      const template = BEHAVIOR_TEMPLATES.find(
        (candidate) => candidate.key === templateKey
      );
      if (!template) {
        return;
      }

      setCreatingTemplate(templateKey);
      setError(null);
      setMessage(null);

      const config = template.createConfig(sortedBehaviors);
      const displayName = template.defaultName;

      try {
        const result = await bb9981Rpc.behaviors.createBehavior(displayName, config);
        if (result.ok === undefined) {
          setError(
            createBehaviorErrorMessage(
              result.err ?? CreateBehaviorResponseCode.ERR_PERSIST
            )
          );
          return;
        }

        await refresh();
        setMessage("New behavior created live and saved to the keyboard.");
      } catch (createError) {
        console.error("Failed to create behavior", createError);
        setError("Studio could not create that behavior on the keyboard.");
      } finally {
        setCreatingTemplate(null);
      }
    },
    [refresh, sortedBehaviors]
  );

  const saveName = useCallback(
    async (behaviorId: number) => {
      const displayName = nameDrafts[behaviorId]?.trim();
      if (!displayName) {
        setError("The behavior name cannot be blank.");
        return;
      }

      setRenamingId(behaviorId);
      setError(null);
      setMessage(null);

      try {
        const code = await bb9981Rpc.behaviors.renameBehavior(behaviorId, displayName);
        if (code !== RenameBehaviorResponseCode.OK) {
          setError(renameBehaviorErrorMessage(code));
          return;
        }

        await refresh();
        setMessage("Behavior name updated on the keyboard.");
      } catch (renameError) {
        console.error("Failed to rename behavior", renameError);
        setError("Studio could not rename that behavior on the keyboard.");
      } finally {
        setRenamingId(null);
      }
    },
    [nameDrafts, refresh]
  );

  const deleteBehavior = useCallback(
    async (behaviorId: number) => {
      setDeletingId(behaviorId);
      setError(null);
      setMessage(null);

      try {
        const code = await bb9981Rpc.behaviors.deleteBehavior(behaviorId);
        if (code !== DeleteBehaviorResponseCode.OK) {
          setError(deleteBehaviorErrorMessage(code));
          return;
        }

        await refresh();
        setMessage("Behavior deleted from the keyboard.");
      } catch (deleteError) {
        console.error("Failed to delete behavior", deleteError);
        setError("Studio could not delete that behavior from the keyboard.");
      } finally {
        setDeletingId(null);
      }
    },
    [refresh]
  );

  const duplicateBehavior = useCallback(
    async (behaviorId: number) => {
      const draft = drafts[behaviorId];
      if (!draft) {
        return;
      }

      const sourceName =
        nameDrafts[behaviorId]?.trim() ||
        behaviorMap.get(behaviorId)?.displayName ||
        `Behavior ${behaviorId}`;
      const duplicateName = `${sourceName} Copy`;
      const createConfig =
        draft.type === "holdTap"
          ? { ...draft, behaviorId: 0 }
          : draft.type === "tapDance"
            ? {
                ...draft,
                behaviorId: 0,
                bindings: draft.bindings.map(cloneBinding),
              }
            : { ...draft, behaviorId: 0 };

      setDuplicatingId(behaviorId);
      setError(null);
      setMessage(null);

      try {
        const result = await bb9981Rpc.behaviors.createBehavior(
          duplicateName,
          createConfig
        );
        if (result.ok === undefined) {
          setError(
            createBehaviorErrorMessage(
              result.err ?? CreateBehaviorResponseCode.ERR_PERSIST
            )
          );
          return;
        }

        await refresh();
        setMessage("Behavior duplicated live and saved to the keyboard.");
      } catch (duplicateError) {
        console.error("Failed to duplicate behavior", duplicateError);
        setError("Studio could not duplicate that behavior on the keyboard.");
      } finally {
        setDuplicatingId(null);
      }
    },
    [behaviorMap, drafts, nameDrafts, refresh]
  );

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
          <h2 className="text-lg font-semibold">Behavior Control</h2>
          <p className="text-sm text-gray-600 mt-1">
            These controls edit the connected keyboard live. Supported behavior
            changes apply immediately and are stored on-device without a rebuild
            or reflash.
          </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {BEHAVIOR_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => void createBehavior(template.key)}
              disabled={creatingTemplate !== null}
              className="rounded border border-gray-300 px-3 py-3 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="font-medium text-sm">{template.label}</div>
              <div className="mt-1 text-xs text-gray-500">
                {template.description}
              </div>
            </button>
          ))}
        </div>

        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">
          Loading live behavior configuration from the keyboard...
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">
          No live-editable hold-tap, tap-dance, or sticky behaviors were exposed
          by the connected firmware.
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white p-4 flex flex-col gap-2">
            <h3 className="text-base font-semibold">Custom Behaviors</h3>
            <p className="text-sm text-gray-600">
              User-defined live behaviors created in Studio. These are closest to
              keymap-editor&apos;s custom behavior list, but they are applied directly
              to the connected keyboard.
            </p>
            <p className="text-xs text-gray-500">
              {customConfigs.length === 0
                ? "No user-defined live behaviors are currently stored on the keyboard."
                : `${customConfigs.length} custom behavior${customConfigs.length === 1 ? "" : "s"} available.`}
            </p>
          </div>

          {customConfigs.map((config) => {
            const draft = drafts[config.behaviorId];
            const behavior = behaviorMap.get(config.behaviorId);

            if (!draft) {
              return null;
            }

            return (
              <div
                key={config.behaviorId}
                className="rounded-lg border bg-white p-4 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameDrafts[config.behaviorId] ?? ""}
                        onChange={(event) =>
                          setNameDrafts((current) => ({
                            ...current,
                            [config.behaviorId]: event.target.value,
                          }))
                        }
                        className="border rounded px-2 py-1.5 text-base font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => void saveName(config.behaviorId)}
                        disabled={renamingId === config.behaviorId}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save Name
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {behaviorFamilyLabel(draft.type)}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        Base: {behaviorTemplateLabel(draft, behavior, behaviorMap)}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        Compatible: {behaviorCompatibleLabel(draft.type)}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        Uses: {behaviorUsesCount(draft)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-400">
                      ID {config.behaviorId}
                    </span>
                    <button
                      type="button"
                      onClick={() => void duplicateBehavior(config.behaviorId)}
                      disabled={duplicatingId === config.behaviorId}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteBehavior(config.behaviorId)}
                      disabled={deletingId === config.behaviorId}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {draft.type === "holdTap" && (
                  <HoldTapEditor
                    behavior={behavior}
                    draft={draft}
                    options={sortedBehaviors}
                    onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                  />
                )}

                {draft.type === "tapDance" && (
                  <TapDanceEditor
                    draft={draft}
                    behaviors={sortedBehaviors}
                    layers={layers}
                    onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                  />
                )}

                {draft.type === "stickyKey" && (
                  <StickyKeyEditor
                    behavior={behavior}
                    draft={draft}
                    options={sortedBehaviors}
                    onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                  />
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void saveDraft(config.behaviorId)}
                    disabled={
                      savingId === config.behaviorId ||
                      renamingId === config.behaviorId ||
                      deletingId === config.behaviorId ||
                      duplicatingId === config.behaviorId
                    }
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Apply Live
                  </button>
                  <button
                    onClick={() => resetDraft(config.behaviorId)}
                    disabled={
                      savingId === config.behaviorId ||
                      renamingId === config.behaviorId ||
                      deletingId === config.behaviorId ||
                      duplicatingId === config.behaviorId
                    }
                    className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border bg-white p-4 flex flex-col gap-2">
            <h3 className="text-base font-semibold">Reconfigurations</h3>
            <p className="text-sm text-gray-600">
              Built-in behavior bases exposed by firmware for live tuning. This is
              the runtime counterpart to keymap-editor&apos;s reconfiguration surface.
            </p>
            <p className="text-xs text-gray-500">
              {reconfigurationConfigs.length === 0
                ? "No built-in runtime behavior reconfigurations are currently exposed."
                : `${reconfigurationConfigs.length} runtime reconfiguration${reconfigurationConfigs.length === 1 ? "" : "s"} available.`}
            </p>
          </div>

          {reconfigurationConfigs.map((config) => {
          const draft = drafts[config.behaviorId];
          const behavior = behaviorMap.get(config.behaviorId);

          if (!draft) {
            return null;
          }

          return (
            <div
              key={config.behaviorId}
              className="rounded-lg border bg-white p-4 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameDrafts[config.behaviorId] ?? ""}
                      onChange={(event) =>
                        setNameDrafts((current) => ({
                          ...current,
                          [config.behaviorId]: event.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1.5 text-base font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => void saveName(config.behaviorId)}
                      disabled={renamingId === config.behaviorId}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save Name
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {behaviorFamilyLabel(draft.type)}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      Base: {behaviorTemplateLabel(draft, behavior, behaviorMap)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      Compatible: {behaviorCompatibleLabel(draft.type)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      Uses: {behaviorUsesCount(draft)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-400">
                    ID {config.behaviorId}
                  </span>
                  <button
                    type="button"
                    onClick={() => void duplicateBehavior(config.behaviorId)}
                    disabled={duplicatingId === config.behaviorId}
                    className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteBehavior(config.behaviorId)}
                    disabled={deletingId === config.behaviorId}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {draft.type === "holdTap" && (
                <HoldTapEditor
                  behavior={behavior}
                  draft={draft}
                  options={sortedBehaviors}
                  onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                />
              )}

              {draft.type === "tapDance" && (
                <TapDanceEditor
                  draft={draft}
                  behaviors={sortedBehaviors}
                  layers={layers}
                  onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                />
              )}

              {draft.type === "stickyKey" && (
                <StickyKeyEditor
                  behavior={behavior}
                  draft={draft}
                  options={sortedBehaviors}
                  onChange={(nextDraft) => updateDraft(config.behaviorId, nextDraft)}
                />
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void saveDraft(config.behaviorId)}
                  disabled={
                    savingId === config.behaviorId ||
                    renamingId === config.behaviorId ||
                    deletingId === config.behaviorId ||
                    duplicatingId === config.behaviorId
                  }
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Apply Live
                </button>
                <button
                  onClick={() => resetDraft(config.behaviorId)}
                  disabled={
                    savingId === config.behaviorId ||
                    renamingId === config.behaviorId ||
                    deletingId === config.behaviorId ||
                    duplicatingId === config.behaviorId
                  }
                  className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>
          );
        })}
        </>
      )}
    </div>
  );
}
