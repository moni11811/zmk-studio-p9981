import { useCallback } from "react";
import { useSleepConfig } from "../rpc/useBB9981";
import type { SleepConfig } from "../rpc/bb9981Types";

export const SleepSettings = () => {
  const { config, loading, error, refresh, updateConfig } = useSleepConfig();
  const sleepSupported =
    !!config && (config.sleepEnabled || config.sleepTimeoutMs > 0);

  const updateField = useCallback(
    <K extends keyof SleepConfig>(field: K, value: SleepConfig[K]) => {
      void updateConfig((current) => ({ ...current, [field]: value })).catch(
        (error) => {
          console.error("Failed to update sleep config", error);
        }
      );
    },
    [updateConfig]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading sleep settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-bold text-amber-900">Sleep Settings Unavailable</h2>
          <p className="mt-2 text-sm text-amber-800">
            The app could not load sleep settings from the keyboard.
          </p>
          <p className="mt-1 text-xs text-amber-700">{error}</p>
          <button
            onClick={() => {
              void refresh();
            }}
            className="mt-3 rounded border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-bold text-gray-900">Sleep Settings Unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            The keyboard did not return sleep settings for this session.
          </p>
          <button
            onClick={() => {
              void refresh();
            }}
            className="mt-3 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Sleep & Idle</h2>
      <p className="text-sm text-gray-500">
        These controls now talk directly to the keyboard runtime. Idle is a
        lighter inactivity state; sleep is a deeper power-saving state.
      </p>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.idleEnabled}
            onChange={(e) => updateField("idleEnabled", e.target.checked)}
          />
          <span className="font-medium">Enable Idle State</span>
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Idle Timeout ({Math.round(config.idleTimeoutMs / 1000)}s)
          </label>
          <input
            type="range"
            min={5000}
            max={600000}
            step={5000}
            value={config.idleTimeoutMs}
            onChange={(e) =>
              updateField("idleTimeoutMs", Number.parseInt(e.target.value, 10))
            }
            className="w-full"
            disabled={!config.idleEnabled}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>5s</span>
            <span>10min</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        {!sleepSupported && (
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Deep sleep is disabled in this firmware stability build to protect
            boot reliability. Idle controls still work live.
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.sleepEnabled}
            onChange={(e) => updateField("sleepEnabled", e.target.checked)}
            disabled={!sleepSupported}
          />
          <span className="font-medium">Enable Sleep</span>
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Sleep Timeout ({Math.round(config.sleepTimeoutMs / 60000)} min)
          </label>
          <input
            type="range"
            min={30000}
            max={14400000}
            step={30000}
            value={sleepSupported ? config.sleepTimeoutMs : 1800000}
            onChange={(e) =>
              updateField("sleepTimeoutMs", Number.parseInt(e.target.value, 10))
            }
            className="w-full"
            disabled={!sleepSupported || !config.sleepEnabled}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>30s</span>
            <span>4h</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.sleepWhileUsbPowered}
            onChange={(e) =>
              updateField("sleepWhileUsbPowered", e.target.checked)
            }
            disabled={!sleepSupported || !config.sleepEnabled}
          />
          <span>Allow sleep even while USB power is present</span>
        </label>

        <p className="rounded bg-gray-50 p-2 text-xs text-gray-500">
          Sleep timeout should stay above idle timeout. The firmware validates
          that relationship before applying changes.
        </p>
      </div>
    </div>
  );
};
