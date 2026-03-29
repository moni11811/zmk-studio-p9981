import { useCallback, useEffect, useState } from "react";
import { useTrackpadConfig } from "../rpc/useBB9981";
import type { TrackpadConfig } from "../rpc/bb9981Types";
import { bb9981Rpc } from "../rpc/bb9981Rpc";

/**
 * BB9981 Trackpad Configuration
 *
 * Based on the Avago A320 optical sensor (I2C @ 0x57):
 * - Sensitivity controlled via DPI levels (mapped to trackpad LED brightness)
 * - Scroll mode activated when CapsLock is ON
 * - Scroll direction can be inverted
 * - Precision mode when Ctrl is held (halves sensitivity)
 * - Polling interval configurable (default 10ms)
 *
 * Hardware controls (Layer 2):
 * - V = Decrease DPI
 * - N = Increase DPI
 * - T = Toggle trackpad on/off
 */

export const TrackpadSettings = () => {
  const { config, loading, updateConfig } = useTrackpadConfig();
  const [draftScrollSpeed, setDraftScrollSpeed] = useState(5);
  const [draftPollingIntervalMs, setDraftPollingIntervalMs] = useState("10");

  const updateField = useCallback(
    async <K extends keyof TrackpadConfig>(
      field: K,
      value: TrackpadConfig[K]
    ) => {
      const latest =
        (await bb9981Rpc.settings.getTrackpadConfig().catch(() => config)) ??
        config;
      if (!latest) return;
      await updateConfig({ ...latest, [field]: value }).catch((error) => {
        console.error("Failed to update trackpad config", error);
      });
    },
    [config, updateConfig]
  );

  useEffect(() => {
    if (!config) return;
    setDraftScrollSpeed(config.scrollSpeed);
    setDraftPollingIntervalMs(String(config.pollingIntervalMs));
  }, [config]);

  const commitScrollSpeed = useCallback(() => {
    if (!config || draftScrollSpeed === config.scrollSpeed) {
      return;
    }

    updateField("scrollSpeed", draftScrollSpeed);
  }, [config, draftScrollSpeed, updateField]);

  const commitPollingInterval = useCallback(() => {
    if (!config) {
      return;
    }

    const parsed = Number.parseInt(draftPollingIntervalMs, 10);
    const nextValue = Number.isFinite(parsed)
      ? Math.min(100, Math.max(1, parsed))
      : config.pollingIntervalMs;

    setDraftPollingIntervalMs(String(nextValue));

    if (nextValue === config.pollingIntervalMs) {
      return;
    }

    updateField("pollingIntervalMs", nextValue);
  }, [config, draftPollingIntervalMs, updateField]);

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading trackpad settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Trackpad Settings</h2>
      <p className="text-sm text-gray-500">
        Configure the Avago A320 optical trackpad behavior.
      </p>

      {/* Enable/Disable */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => updateField("enabled", e.target.checked)}
        />
        <span className="font-medium">Trackpad Enabled</span>
        <span className="text-gray-400">(Layer 2 + T to toggle on device)</span>
      </label>

      {/* Sensitivity / DPI */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Sensitivity / DPI ({config.sensitivity})
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={config.sensitivity}
          onChange={(e) => updateField("sensitivity", parseInt(e.target.value))}
          className="w-full"
          disabled={!config.enabled}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Low (precise)</span>
          <span>High (fast)</span>
        </div>
        <p className="text-xs text-gray-500">
          Trackpad LED brightness indicates DPI level. Layer 2 + V/N to
          adjust on device.
        </p>
      </div>

      {/* Scroll Settings */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-sm mb-3">
          Scroll Mode
        </h3>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Scroll Mode Switch</label>
            <select
              value={config.scrollModeSwitch}
              onChange={(e) =>
                updateField(
                  "scrollModeSwitch",
                  e.target.value as "capslock" | "disabled"
                )
              }
              className="h-8 rounded border border-gray-300"
              disabled={!config.enabled}
            >
              <option value="capslock">Caps Lock toggles scroll mode</option>
              <option value="disabled">Disabled (always pointer mode)</option>
            </select>
            <p className="text-xs text-gray-500">
              Disable the switch here to keep the trackpad in pointer mode.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Scroll Direction</label>
            <select
              value={config.scrollDirection}
              onChange={(e) =>
                updateField(
                  "scrollDirection",
                  e.target.value as "normal" | "inverted"
                )
              }
              className="h-8 rounded border border-gray-300"
              disabled={!config.enabled}
            >
              <option value="normal">Natural (swipe up = scroll up)</option>
              <option value="inverted">
                Inverted (swipe up = scroll down)
              </option>
            </select>
            <p className="text-xs text-gray-500">
              Applies when scroll mode is active.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Scroll Speed ({draftScrollSpeed})
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={draftScrollSpeed}
              onChange={(e) => setDraftScrollSpeed(parseInt(e.target.value))}
              onMouseUp={commitScrollSpeed}
              onTouchEnd={commitScrollSpeed}
              onKeyUp={commitScrollSpeed}
              onBlur={commitScrollSpeed}
              className="w-full"
              disabled={!config.enabled}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Slow</span>
              <span>Fast</span>
            </div>
            <p className="text-xs text-gray-500">
              Applied when you release the slider. Levels 1-5 keep the stable
              baseline; 6-10 increase vertical scroll output.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-sm mb-3">Advanced</h3>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Polling Interval ({draftPollingIntervalMs || config.pollingIntervalMs}ms)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={draftPollingIntervalMs}
              onChange={(e) => setDraftPollingIntervalMs(e.target.value)}
              onBlur={commitPollingInterval}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="h-8 rounded border border-gray-300 px-2 w-24"
              disabled={!config.enabled}
            />
            <p className="text-xs text-gray-500">
              Lower = more responsive, higher = less CPU usage. Applied when
              you leave the field. Scroll mode keeps its stable internal
              cadence.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.precisionModeEnabled}
              onChange={(e) =>
                updateField("precisionModeEnabled", e.target.checked)
              }
              disabled={!config.enabled}
            />
            <span>Precision Mode (hold Ctrl to halve sensitivity)</span>
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-400 border-t border-gray-200 pt-3">
        Trackpad LED indicates status: solid = active, pulsing = scroll mode,
        blinking = USB mode or pairing.
      </p>
    </div>
  );
};
