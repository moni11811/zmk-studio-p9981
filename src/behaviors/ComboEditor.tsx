import { useCallback, useState } from "react";
import {
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";

export interface ComboConfig {
  id: number;
  name: string;
  keyPositions: number[];
  behaviorId: number;
  behaviorParam1: number;
  behaviorParam2: number;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowRelease: boolean;
  layers: number[];
}

export interface ComboEditorProps {
  combo: ComboConfig;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  totalKeys: number;
  onSave: (combo: ComboConfig) => void;
  onCancel: () => void;
}

export const ComboEditor = ({
  combo: initialCombo,
  behaviors,
  layers,
  totalKeys,
  onSave,
  onCancel,
}: ComboEditorProps) => {
  const [combo, setCombo] = useState<ComboConfig>({ ...initialCombo });
  const [isPickingKey, setIsPickingKey] = useState(false);

  const sortedBehaviors = behaviors
    .filter((b) => b.displayName)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const updateField = useCallback(
    <K extends keyof ComboConfig>(field: K, value: ComboConfig[K]) => {
      setCombo((c) => ({ ...c, [field]: value }));
    },
    []
  );

  const addKeyPosition = useCallback(
    (position: number) => {
      if (!combo.keyPositions.includes(position)) {
        setCombo((c) => ({
          ...c,
          keyPositions: [...c.keyPositions, position].sort((a, b) => a - b),
        }));
      }
    },
    [combo.keyPositions]
  );

  const removeKeyPosition = useCallback((position: number) => {
    setCombo((c) => ({
      ...c,
      keyPositions: c.keyPositions.filter((p) => p !== position),
    }));
  }, []);

  const toggleLayer = useCallback(
    (layerId: number) => {
      setCombo((c) => ({
        ...c,
        layers: c.layers.includes(layerId)
          ? c.layers.filter((l) => l !== layerId)
          : [...c.layers, layerId],
      }));
    },
    []
  );

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl">
      <h2 className="text-lg font-bold">
        {combo.id >= 0 ? "Edit Combo" : "New Combo"}
      </h2>

      {/* Combo Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Combo Name</label>
        <input
          type="text"
          value={combo.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="h-8 rounded border border-gray-300 px-2"
          placeholder="Enter combo name"
        />
      </div>

      {/* Trigger Key Positions */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Trigger Keys ({combo.keyPositions.length})
        </label>
        <div className="flex gap-2 flex-wrap">
          {combo.keyPositions.map((pos) => (
            <span
              key={pos}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              Key {pos}
              <button
                onClick={() => removeKeyPosition(pos)}
                className="text-blue-600 hover:text-red-600 ml-1"
              >
                ✕
              </button>
            </span>
          ))}
          {combo.keyPositions.length === 0 && (
            <span className="text-gray-500 text-sm">No trigger keys set</span>
          )}
        </div>

        {/* Key Position Picker */}
        <div className="flex items-center gap-2">
          {isPickingKey ? (
            <div className="flex items-center gap-2">
              <label className="text-xs">Position:</label>
              <input
                type="number"
                min={0}
                max={totalKeys - 1}
                className="h-7 w-20 rounded border border-gray-300 px-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val) && val >= 0 && val < totalKeys) {
                      addKeyPosition(val);
                    }
                    setIsPickingKey(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => setIsPickingKey(false)}
                className="text-xs text-gray-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsPickingKey(true)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              + Add Key
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Enter key position numbers (0-{totalKeys - 1}). Press multiple keys
          simultaneously to trigger the combo.
        </p>
      </div>

      {/* Resulting Behavior */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Resulting Behavior</label>
        <select
          value={combo.behaviorId}
          onChange={(e) => updateField("behaviorId", parseInt(e.target.value))}
          className="h-8 rounded border border-gray-300"
        >
          <option value={0}>Select a behavior</option>
          {sortedBehaviors.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Timing Configuration */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Timeout (ms)</label>
          <input
            type="number"
            min={0}
            max={10000}
            value={combo.timeoutMs}
            onChange={(e) =>
              updateField("timeoutMs", parseInt(e.target.value) || 50)
            }
            className="h-8 rounded border border-gray-300 px-2"
          />
          <p className="text-xs text-gray-500">
            Time window to press all trigger keys
          </p>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Require Prior Idle (ms)</label>
          <input
            type="number"
            min={-1}
            max={10000}
            value={combo.requirePriorIdleMs}
            onChange={(e) =>
              updateField("requirePriorIdleMs", parseInt(e.target.value))
            }
            className="h-8 rounded border border-gray-300 px-2"
          />
          <p className="text-xs text-gray-500">
            -1 = disabled. Minimum idle time before combo activates.
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Options</label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={combo.slowRelease}
            onChange={(e) => updateField("slowRelease", e.target.checked)}
          />
          Slow Release (release only when all trigger keys are released)
        </label>
      </div>

      {/* Active Layers */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Active on Layers</label>
        <div className="flex gap-2 flex-wrap">
          {layers.map((layer) => (
            <label
              key={layer.id}
              className={`flex items-center gap-1.5 px-3 py-1 rounded border text-sm cursor-pointer ${
                combo.layers.includes(layer.id)
                  ? "bg-blue-100 border-blue-300 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <input
                type="checkbox"
                checked={combo.layers.includes(layer.id)}
                onChange={() => toggleLayer(layer.id)}
                className="sr-only"
              />
              {layer.name}
            </label>
          ))}
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => onSave(combo)}
          disabled={combo.keyPositions.length < 2}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Combo
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        {combo.keyPositions.length < 2 && (
          <p className="text-xs text-red-500 self-center">
            At least 2 trigger keys required
          </p>
        )}
      </div>
    </div>
  );
};
