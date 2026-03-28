import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { bb9981Rpc, SetBehaviorRuntimeConfigResponseCode } from "../rpc/bb9981Rpc";
import type {
  BehaviorRuntimeConfig,
  HoldTapBehaviorConfig,
  HoldTapFlavor,
  StickyKeyBehaviorConfig,
  TapDanceBehaviorConfig,
} from "../rpc/bb9981Types";
import { ConnectionContext } from "../rpc/ConnectionContext";

interface BehaviorControlProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
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

function BehaviorTypeSelect({
  label,
  value,
  currentBehaviorId,
  options,
  onChange,
}: {
  label: string;
  value: number;
  currentBehaviorId: number;
  options: GetBehaviorDetailsResponse[];
  onChange: (value: number) => void;
}) {
  const filteredOptions = useMemo(
    () => options.filter((behavior) => behavior.id !== currentBehaviorId),
    [currentBehaviorId, options]
  );

  return (
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

      <BehaviorTypeSelect
        label="Hold Behavior"
        value={draft.holdBehaviorId}
        currentBehaviorId={behavior?.id ?? draft.behaviorId}
        options={options}
        onChange={(holdBehaviorId) => onChange({ ...draft, holdBehaviorId })}
      />

      <BehaviorTypeSelect
        label="Tap Behavior"
        value={draft.tapBehaviorId}
        currentBehaviorId={behavior?.id ?? draft.behaviorId}
        options={options}
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
            <p className="text-sm font-medium mb-2">Tap Slot {index + 1}</p>
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

      <BehaviorTypeSelect
        label="Wrapped Behavior"
        value={draft.bindingBehaviorId}
        currentBehaviorId={behavior?.id ?? draft.behaviorId}
        options={options}
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
  const [configs, setConfigs] = useState<BehaviorRuntimeConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BehaviorRuntimeConfig>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const behaviorMap = useMemo(
    () => new Map(behaviors.map((behavior) => [behavior.id, behavior])),
    [behaviors]
  );

  const sortedBehaviors = useMemo(
    () => [...behaviors].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [behaviors]
  );

  const refresh = useCallback(async () => {
    if (!connection.conn) {
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

      setConfigs(nextConfigs);
      setDrafts(
        Object.fromEntries(
          nextConfigs.map((config) => [config.behaviorId, cloneConfig(config)])
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
  }, [connection.conn, sortedBehaviors]);

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
  }, [configs]);

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

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Behavior Control</h2>
          <p className="text-sm text-gray-600 mt-1">
            These controls edit the connected keyboard live. Supported behavior
            changes apply immediately and are stored on-device without a rebuild
            or reflash.
          </p>
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
        configs.map((config) => {
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
                <div>
                  <h3 className="text-base font-semibold">
                    {behavior?.displayName ?? `Behavior ${config.behaviorId}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {draft.type === "holdTap"
                      ? "Hold-Tap"
                      : draft.type === "tapDance"
                        ? "Tap-Dance"
                        : "Sticky Key"}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  ID {config.behaviorId}
                </span>
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
                  disabled={savingId === config.behaviorId}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Apply Live
                </button>
                <button
                  onClick={() => resetDraft(config.behaviorId)}
                  disabled={savingId === config.behaviorId}
                  className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
