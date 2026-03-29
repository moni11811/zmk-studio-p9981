import { useCallback, useState } from "react";
import {
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { getBehaviorLabel } from "./behaviorNames";

export enum MacroStepType {
  TAP = "tap",
  PRESS = "press",
  RELEASE = "release",
  WAIT = "wait",
  PAUSE_FOR_RELEASE = "pause_for_release",
}

export interface MacroStep {
  type: MacroStepType;
  behaviorId?: number;
  param1?: number;
  param2?: number;
  durationMs?: number;
}

export interface MacroConfig {
  id: number;
  name: string;
  steps: MacroStep[];
  defaultWaitMs: number;
  defaultTapMs: number;
}

export interface MacroEditorProps {
  macro: MacroConfig;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onSave: (macro: MacroConfig) => void;
  onCancel: () => void;
}

const STEP_TYPE_LABELS: Record<MacroStepType, string> = {
  [MacroStepType.TAP]: "Tap",
  [MacroStepType.PRESS]: "Press",
  [MacroStepType.RELEASE]: "Release",
  [MacroStepType.WAIT]: "Wait",
  [MacroStepType.PAUSE_FOR_RELEASE]: "Pause for Release",
};

export const MacroEditor = ({
  macro: initialMacro,
  behaviors,
  layers,
  onSave,
  onCancel,
}: MacroEditorProps) => {
  const [macro, setMacro] = useState<MacroConfig>({ ...initialMacro });
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const sortedBehaviors = behaviors
    .filter((b) => getBehaviorLabel(b))
    .sort((a, b) => getBehaviorLabel(a).localeCompare(getBehaviorLabel(b)));

  const updateName = useCallback(
    (name: string) => setMacro((m) => ({ ...m, name })),
    []
  );

  const updateDefaultWaitMs = useCallback(
    (ms: number) => setMacro((m) => ({ ...m, defaultWaitMs: ms })),
    []
  );

  const updateDefaultTapMs = useCallback(
    (ms: number) => setMacro((m) => ({ ...m, defaultTapMs: ms })),
    []
  );

  const addStep = useCallback(
    (type: MacroStepType) => {
      const newStep: MacroStep = { type };
      if (type === MacroStepType.WAIT) {
        newStep.durationMs = macro.defaultWaitMs;
      }
      setMacro((m) => ({ ...m, steps: [...m.steps, newStep] }));
    },
    [macro.defaultWaitMs]
  );

  const removeStep = useCallback((index: number) => {
    setMacro((m) => ({
      ...m,
      steps: m.steps.filter((_, i) => i !== index),
    }));
    setSelectedStep(null);
  }, []);

  const moveStep = useCallback((index: number, direction: -1 | 1) => {
    setMacro((m) => {
      const newSteps = [...m.steps];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newSteps.length) return m;
      [newSteps[index], newSteps[targetIndex]] = [
        newSteps[targetIndex],
        newSteps[index],
      ];
      return { ...m, steps: newSteps };
    });
    setSelectedStep((s) => (s !== null ? s + direction : null));
  }, []);

  const updateStep = useCallback(
    (index: number, updates: Partial<MacroStep>) => {
      setMacro((m) => ({
        ...m,
        steps: m.steps.map((s, i) => (i === index ? { ...s, ...updates } : s)),
      }));
    },
    []
  );

  const getBehaviorName = (id?: number) =>
    id !== undefined
      ? behaviors.find((b) => b.id === id)
        ? getBehaviorLabel(behaviors.find((b) => b.id === id)!)
        : `Behavior ${id}`
      : "None";

  const getStepSummary = (step: MacroStep): string => {
    switch (step.type) {
      case MacroStepType.TAP:
        return `Tap ${getBehaviorName(step.behaviorId)}`;
      case MacroStepType.PRESS:
        return `Press ${getBehaviorName(step.behaviorId)}`;
      case MacroStepType.RELEASE:
        return `Release ${getBehaviorName(step.behaviorId)}`;
      case MacroStepType.WAIT:
        return `Wait ${step.durationMs || 0}ms`;
      case MacroStepType.PAUSE_FOR_RELEASE:
        return "Pause for Release";
    }
  };

  const selectedBehavior =
    selectedStep !== null &&
    [
      MacroStepType.TAP,
      MacroStepType.PRESS,
      MacroStepType.RELEASE,
    ].includes(macro.steps[selectedStep]?.type)
      ? behaviors.find((b) => b.id === macro.steps[selectedStep]?.behaviorId)
      : undefined;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl">
      <h2 className="text-lg font-bold">
        {macro.id >= 0 ? "Edit Macro" : "New Macro"}
      </h2>

      {/* Macro Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Macro Name</label>
        <input
          type="text"
          value={macro.name}
          onChange={(e) => updateName(e.target.value)}
          className="h-8 rounded border border-gray-300 px-2"
          placeholder="Enter macro name"
        />
      </div>

      {/* Timing Defaults */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Default Wait (ms)</label>
          <input
            type="number"
            min={0}
            max={10000}
            value={macro.defaultWaitMs}
            onChange={(e) => updateDefaultWaitMs(parseInt(e.target.value) || 0)}
            className="h-8 rounded border border-gray-300 px-2"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Default Tap (ms)</label>
          <input
            type="number"
            min={0}
            max={10000}
            value={macro.defaultTapMs}
            onChange={(e) => updateDefaultTapMs(parseInt(e.target.value) || 0)}
            className="h-8 rounded border border-gray-300 px-2"
          />
        </div>
      </div>

      {/* Step List */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Steps ({macro.steps.length})
        </label>
        <div className="border border-gray-300 rounded max-h-64 overflow-y-auto">
          {macro.steps.length === 0 ? (
            <p className="p-3 text-gray-500 text-sm text-center">
              No steps defined. Add steps using the buttons below.
            </p>
          ) : (
            macro.steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${
                  selectedStep === index ? "bg-blue-100" : ""
                }`}
                onClick={() =>
                  setSelectedStep(selectedStep === index ? null : index)
                }
              >
                <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded w-6 text-center">
                  {index + 1}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    step.type === MacroStepType.TAP
                      ? "bg-green-100 text-green-800"
                      : step.type === MacroStepType.PRESS
                        ? "bg-blue-100 text-blue-800"
                        : step.type === MacroStepType.RELEASE
                          ? "bg-orange-100 text-orange-800"
                          : step.type === MacroStepType.WAIT
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {STEP_TYPE_LABELS[step.type]}
                </span>
                <span className="text-sm flex-1">{getStepSummary(step)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, -1);
                    }}
                    disabled={index === 0}
                    className="px-1 text-xs disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, 1);
                    }}
                    disabled={index === macro.steps.length - 1}
                    className="px-1 text-xs disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(index);
                    }}
                    className="px-1 text-xs text-red-600 hover:text-red-800"
                    title="Remove step"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Step Editor */}
      {selectedStep !== null && macro.steps[selectedStep] && (
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <h4 className="font-semibold text-sm mb-2">
            Edit Step {selectedStep + 1}
          </h4>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Type</label>
              <select
                value={macro.steps[selectedStep].type}
                onChange={(e) =>
                  updateStep(selectedStep, {
                    type: e.target.value as MacroStepType,
                  })
                }
                className="h-8 rounded border border-gray-300 text-sm"
              >
                {Object.entries(STEP_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Behavior selector for tap/press/release */}
            {[
              MacroStepType.TAP,
              MacroStepType.PRESS,
              MacroStepType.RELEASE,
            ].includes(macro.steps[selectedStep].type) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Behavior</label>
                <select
                  value={macro.steps[selectedStep].behaviorId ?? ""}
                  onChange={(e) =>
                    updateStep(selectedStep, {
                      behaviorId: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                      param1: undefined,
                      param2: undefined,
                    })
                  }
                  className="h-8 rounded border border-gray-300 text-sm"
                >
                  <option value="">Select a behavior</option>
                  {sortedBehaviors.map((b) => (
                    <option key={b.id} value={b.id}>
                      {getBehaviorLabel(b)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBehavior && selectedBehavior.metadata.length > 0 && (
              <BehaviorParametersPicker
                metadata={selectedBehavior.metadata}
                param1={macro.steps[selectedStep].param1}
                param2={macro.steps[selectedStep].param2}
                layers={layers}
                title="Behavior Parameters"
                onParam1Changed={(param1) =>
                  updateStep(selectedStep, {
                    param1,
                    param2: undefined,
                  })
                }
                onParam2Changed={(param2) =>
                  updateStep(selectedStep, { param2 })
                }
              />
            )}

            {/* Duration for wait steps */}
            {macro.steps[selectedStep].type === MacroStepType.WAIT && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Duration (ms)</label>
                <input
                  type="number"
                  min={0}
                  max={60000}
                  value={macro.steps[selectedStep].durationMs ?? 0}
                  onChange={(e) =>
                    updateStep(selectedStep, {
                      durationMs: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-8 rounded border border-gray-300 px-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Step Buttons */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Add Step</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addStep(MacroStepType.TAP)}
            className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            + Tap
          </button>
          <button
            onClick={() => addStep(MacroStepType.PRESS)}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            + Press
          </button>
          <button
            onClick={() => addStep(MacroStepType.RELEASE)}
            className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
          >
            + Release
          </button>
          <button
            onClick={() => addStep(MacroStepType.WAIT)}
            className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            + Wait
          </button>
          <button
            onClick={() => addStep(MacroStepType.PAUSE_FOR_RELEASE)}
            className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            + Pause
          </button>
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => onSave(macro)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          Save Macro
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
