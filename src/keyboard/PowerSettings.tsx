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
  const { config, loading, updateConfig, powerOff } = usePowerConfig();

  const updateField = useCallback(
    <K extends keyof PowerConfig>(field: K, value: PowerConfig[K]) => {
      if (!config) return;
      void updateConfig({ ...config, [field]: value }).catch((error) => {
        console.error("Failed to update power config", error);
      });
    },
    [config, updateConfig]
  );

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading power settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Power & Battery</h2>
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
                e.target.value as "off" | "solid" | "blink"
              )
            }
            className="h-8 rounded border border-gray-300"
          >
            <option value="off">Off</option>
            <option value="solid">Solid while USB powered</option>
            <option value="blink">Blink while USB powered</option>
          </select>
          <p className="text-xs text-gray-500">
            This uses USB power presence as the practical charging indicator.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.extPowerEnabled}
            onChange={(e) => updateField("extPowerEnabled", e.target.checked)}
            disabled={config.extPowerEnabled && !config.usbPowered}
          />
          <span className="font-medium">External Power Rail Enabled</span>
        </label>
        <p className="text-xs text-gray-500">
          For safety, Studio only lets you turn the rail off while USB power is
          present. On battery alone, use the soft-off action below instead.
        </p>

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
