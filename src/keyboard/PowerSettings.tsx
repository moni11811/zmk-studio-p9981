import { useCallback } from "react";
import { usePowerConfig } from "../rpc/useBB9981";
import type { PowerConfig } from "../rpc/bb9981Types";

const formatActivityState = (state: PowerConfig["activityState"]) => {
  switch (state) {
    case "idle":
      return "Idle";
    case "sleep":
      return "Sleep";
    default:
      return "Active";
  }
};

export const PowerSettings = () => {
  const { config, loading, error, refresh, updateConfig, powerOff } = usePowerConfig();

  const updateField = useCallback(
    <K extends keyof PowerConfig>(field: K, value: PowerConfig[K]) => {
      void updateConfig((current) => ({ ...current, [field]: value })).catch(
        (error) => {
          console.error("Failed to update power config", error);
        }
      );
    },
    [updateConfig]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading power settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-bold text-amber-900">Power Settings Unavailable</h2>
          <p className="mt-2 text-sm text-amber-800">
            The app could not load power settings from the keyboard.
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
          <h2 className="text-lg font-bold text-gray-900">Power Settings Unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            The keyboard did not return power settings for this session.
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
      <h2 className="text-lg font-bold">Power & Battery (Global)</h2>
      <p className="text-sm text-gray-500">
        Live battery status, report timing, external power control, and USB /
        charging trackpad LED behavior.
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">Battery</div>
          <div className="text-lg font-semibold">{config.batteryPercent}%</div>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">Activity</div>
          <div className="text-lg font-semibold">
            {formatActivityState(config.activityState)}
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">USB Power</div>
          <div className="text-lg font-semibold">
            {config.usbPowered ? "Present" : "Battery"}
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">External Power Rail</div>
          <div className="text-lg font-semibold">
            {config.extPowerEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Battery Report Interval ({config.batteryReportIntervalS}s)
          </label>
          <input
            type="range"
            min={10}
            max={600}
            step={10}
            value={config.batteryReportIntervalS}
            onChange={(e) =>
              updateField(
                "batteryReportIntervalS",
                Number.parseInt(e.target.value, 10)
              )
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>10s</span>
            <span>10min</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">USB / Charging LED</label>
          <select
            value={config.chargingLedMode}
            onChange={(e) =>
              updateField(
                "chargingLedMode",
                e.target.value as "off" | "solid" | "blink" | "pulse"
              )
            }
            className="h-8 rounded border border-gray-300"
          >
            <option value="off">Off</option>
            <option value="solid">Solid while USB powered</option>
            <option value="blink">Blink while USB powered</option>
            <option value="pulse">Pulse while USB powered</option>
          </select>
          <p className="text-xs text-gray-500">
            This uses USB power presence as the practical charging indicator.
          </p>
        </div>

        {(config.chargingLedMode === "blink" || config.chargingLedMode === "pulse") && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              USB / Charging LED Speed ({config.chargingLedSpeedMs}ms cycle)
            </label>
            <input
              type="range"
              min={200}
              max={3000}
              step={100}
              value={config.chargingLedSpeedMs}
              onChange={(e) =>
                updateField(
                  "chargingLedSpeedMs",
                  Number.parseInt(e.target.value, 10)
                )
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Faster</span>
              <span>Slower</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900">External Power Rail</div>
          <p className="mt-1 text-amber-800">
            This rail is kept on for reliable battery boot on BB9981. Studio
            now shows its status but does not let you disable it live.
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Current status: {config.extPowerEnabled ? "Enabled" : "Off unexpectedly"}
          </p>
        </div>

        <button
          onClick={() => {
            void powerOff().catch((error) => {
              console.error("Failed to request soft-off", error);
            });
          }}
          className="h-10 rounded border border-red-300 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Power Off Now
        </button>
      </div>
    </div>
  );
};
