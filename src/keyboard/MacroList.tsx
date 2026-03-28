import { useState, useCallback } from "react";
import {
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import {
  MacroEditor,
  MacroConfig,
  MacroStepType,
} from "../behaviors/MacroEditor";
import { useMacroList } from "../rpc/useBB9981";
import { bb9981Rpc } from "../rpc/bb9981Rpc";
import type { MacroStep as RpcMacroStep } from "../rpc/bb9981Types";

export interface MacroListProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
}

function detailsToConfig(details: {
  id: number;
  name: string;
  steps: RpcMacroStep[];
  defaultWaitMs: number;
  defaultTapMs: number;
}): MacroConfig {
  return {
    id: details.id,
    name: details.name,
    steps: details.steps.map((s) => ({
      type: s.type as unknown as MacroStepType,
      behaviorId: s.behaviorId,
      param1: s.param1,
      param2: s.param2,
      durationMs: s.durationMs,
    })),
    defaultWaitMs: details.defaultWaitMs,
    defaultTapMs: details.defaultTapMs,
  };
}

export const MacroList = ({ behaviors, layers }: MacroListProps) => {
  const { macros, createMacro, deleteMacro } = useMacroList();
  const [editingMacro, setEditingMacro] = useState<MacroConfig | null>(null);

  const addMacro = useCallback(async () => {
    const newId = await createMacro();
    if (newId !== undefined) {
      const details = await bb9981Rpc.macros.getMacroDetails(newId);
      if (details) {
        setEditingMacro(detailsToConfig(details));
      }
    }
  }, [createMacro]);

  const handleEdit = useCallback(async (macroId: number) => {
    const details = await bb9981Rpc.macros.getMacroDetails(macroId);
    if (details) {
      setEditingMacro(detailsToConfig(details));
    }
  }, []);

  const saveMacro = useCallback(async (macro: MacroConfig) => {
    await bb9981Rpc.macros.setMacroSteps(
      macro.id,
      macro.name,
      macro.steps.map((s) => ({
        type: s.type as unknown as number,
        behaviorId: s.behaviorId ?? 0,
        param1: s.param1 ?? 0,
        param2: s.param2 ?? 0,
        durationMs: s.durationMs ?? 0,
      })),
      macro.defaultWaitMs,
      macro.defaultTapMs
    );
    setEditingMacro(null);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteMacro(id);
    },
    [deleteMacro]
  );

  const getStepSummary = (stepCount: number): string =>
    `${stepCount} step${stepCount !== 1 ? "s" : ""}`;

  if (editingMacro) {
    return (
      <MacroEditor
        macro={editingMacro}
        behaviors={behaviors}
        layers={layers}
        onSave={saveMacro}
        onCancel={() => setEditingMacro(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Macros</h2>
        <button
          onClick={addMacro}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          + New Macro
        </button>
      </div>

      {macros.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-300 rounded">
          <p className="text-gray-500 mb-2">No macros defined yet</p>
          <p className="text-gray-400 text-sm">
            Macros let you play back a sequence of key presses with a single key.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {macros.map((macro) => (
            <div
              key={macro.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
            >
              <div className="flex-1">
                <p className="font-medium">{macro.name}</p>
                <p className="text-sm text-gray-500">
                  {getStepSummary(macro.stepCount)}
                </p>
              </div>
              <button
                onClick={() => handleEdit(macro.id)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(macro.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Note: Macro changes require firmware support for runtime macro editing.
        Changes are stored on the device when saved.
      </p>
    </div>
  );
};
