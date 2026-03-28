import { useState, useCallback } from "react";
import {
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { ComboEditor, ComboConfig } from "../behaviors/ComboEditor";
import { useComboList } from "../rpc/useBB9981";
import { bb9981Rpc } from "../rpc/bb9981Rpc";

export interface ComboListProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  totalKeys: number;
}

export const ComboList = ({
  behaviors,
  layers,
  totalKeys,
}: ComboListProps) => {
  const { combos, createCombo, deleteCombo } = useComboList();
  const [editingCombo, setEditingCombo] = useState<ComboConfig | null>(null);

  const addCombo = useCallback(async () => {
    const newId = await createCombo();
    if (newId !== undefined) {
      const details = await bb9981Rpc.combos.getComboDetails(newId);
      if (details) {
        setEditingCombo({
          id: details.id,
          name: details.name,
          keyPositions: [...details.keyPositions],
          behaviorId: details.binding.behaviorId,
          behaviorParam1: details.binding.param1,
          behaviorParam2: details.binding.param2,
          timeoutMs: details.timeoutMs,
          requirePriorIdleMs: details.requirePriorIdleMs,
          slowRelease: details.slowRelease,
          layers: layerMaskToIds(details.layerMask, layers),
        });
      }
    }
  }, [createCombo, layers]);

  const handleEdit = useCallback(
    async (comboId: number) => {
      const details = await bb9981Rpc.combos.getComboDetails(comboId);
      if (details) {
        setEditingCombo({
          id: details.id,
          name: details.name,
          keyPositions: [...details.keyPositions],
          behaviorId: details.binding.behaviorId,
          behaviorParam1: details.binding.param1,
          behaviorParam2: details.binding.param2,
          timeoutMs: details.timeoutMs,
          requirePriorIdleMs: details.requirePriorIdleMs,
          slowRelease: details.slowRelease,
          layers: layerMaskToIds(details.layerMask, layers),
        });
      }
    },
    [layers]
  );

  const saveCombo = useCallback(
    async (combo: ComboConfig) => {
      await bb9981Rpc.combos.setCombo({
        id: combo.id,
        name: combo.name,
        keyPositions: combo.keyPositions,
        binding: {
          behaviorId: combo.behaviorId,
          param1: combo.behaviorParam1,
          param2: combo.behaviorParam2,
        },
        timeoutMs: combo.timeoutMs,
        requirePriorIdleMs: combo.requirePriorIdleMs,
        slowRelease: combo.slowRelease,
        layerMask: layerIdsToMask(combo.layers),
      });
      setEditingCombo(null);
    },
    []
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteCombo(id);
    },
    [deleteCombo]
  );

  if (editingCombo) {
    return (
      <ComboEditor
        combo={editingCombo}
        behaviors={behaviors}
        layers={layers}
        totalKeys={totalKeys}
        onSave={saveCombo}
        onCancel={() => setEditingCombo(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Combos</h2>
        <button
          onClick={addCombo}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          + New Combo
        </button>
      </div>

      {combos.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-300 rounded">
          <p className="text-gray-500 mb-2">No combos defined yet</p>
          <p className="text-gray-400 text-sm">
            Combos trigger a behavior when multiple keys are pressed
            simultaneously.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
            >
              <div className="flex-1">
                <p className="font-medium">{combo.name}</p>
                <p className="text-sm text-gray-500">
                  {combo.keyCount} key{combo.keyCount !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => handleEdit(combo.id)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(combo.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Note: Combo changes require firmware support for runtime combo editing.
        Changes are stored on the device when saved.
      </p>
    </div>
  );
};

// Utility functions for layer mask <-> layer ID array conversion
function layerMaskToIds(
  mask: number,
  layers: { id: number; name: string }[]
): number[] {
  return layers.filter((_, i) => mask & (1 << i)).map((l) => l.id);
}

function layerIdsToMask(layerIds: number[]): number {
  return layerIds.reduce((mask, id) => mask | (1 << id), 0);
}
