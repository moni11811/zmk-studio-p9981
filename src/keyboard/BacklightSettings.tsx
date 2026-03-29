import { useCallback, useEffect, useRef } from "react";
import { useBacklightConfig } from "../rpc/useBB9981";
import type { BacklightConfig } from "../rpc/bb9981Types";

/**
 * BB9981 Backlight & LED Configuration
 *
 * Actual BB9981 mapping:
 * - ZMK Backlight channel (backlight*) -> Trackpad backlight path
 * - ZMK RGB channel (rgb*) -> Keyboard backlight effects path
 * - Trackpad LED fields exist separately from the trackpad backlight path
 *
 * Layer-dependent behavior:
 * - Layer 0: Solid brightness, auto-off on idle
 * - Layer 1 (SYM): 500ms blink cycle
 * - Layer 2 (UPPER): Smooth fade cycle
 * - Layer 3 (MEDIA): Fast 250ms blink
 *
 * Layer 2 controls:
 * - B = Toggle backlight
 * - BL_INC / BL_DEC = Adjust brightness
 * - RGB_TOG / RGB_BRI / RGB_BRD = RGB underglow controls
 */

export const BacklightSettings = () => {
  const { config, loading, updateConfig } = useBacklightConfig();
  const deferredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deferredTimerRef.current) {
        clearTimeout(deferredTimerRef.current);
      }
    },
    []
  );

  const pushConfig = useCallback(
    (next: BacklightConfig, deferred?: boolean) => {
      if (deferred) {
        if (deferredTimerRef.current) {
          clearTimeout(deferredTimerRef.current);
        }
        deferredTimerRef.current = setTimeout(() => {
          deferredTimerRef.current = null;
          void updateConfig(next).catch((error) => {
            console.error("Failed to update backlight config", error);
          });
        }, 250);
        return;
      }

      void updateConfig(next).catch((error) => {
        console.error("Failed to update backlight config", error);
      });
    },
    [updateConfig]
  );

  const updateField = useCallback(
    <K extends keyof BacklightConfig>(
      field: K,
      value: BacklightConfig[K],
      deferred?: boolean
    ) => {
      if (!config) return;
      pushConfig({ ...config, [field]: value }, deferred);
    },
    [config, pushConfig]
  );

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading backlight settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Lighting Settings (BB9981)</h2>
      <p className="text-sm text-gray-500">
        Live-sync note: every control here maps to active firmware behavior.
        Trackpad lighting uses the ZMK backlight path; keyboard lighting uses
        the RGB path. Idle auto-off and timeout now apply to both lighting
        paths together.
      </p>

      {/* Trackpad Backlight */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Trackpad Backlight</h3>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.backlightEnabled}
            onChange={(e) =>
              updateField("backlightEnabled", e.target.checked)
            }
          />
          <span className="font-medium">Trackpad Backlight Enabled</span>
          <span className="text-gray-400">(Layer 2 + B to toggle)</span>
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Trackpad Brightness ({config.backlightBrightness}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={config.backlightBrightness}
            onChange={(e) =>
              updateField(
                "backlightBrightness",
                parseInt(e.target.value),
                true
              )
            }
            className="w-full"
            disabled={!config.backlightEnabled}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Off</span>
            <span>Max</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.backlightAutoOff}
            onChange={(e) =>
              updateField("backlightAutoOff", e.target.checked)
            }
            disabled={!config.backlightEnabled}
          />
          Auto-off lighting on idle
        </label>

        {config.backlightAutoOff && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Lighting Idle Timeout ({config.idleTimeoutMs / 1000}s)
            </label>
            <input
              type="range"
              min={5000}
              max={300000}
              step={5000}
              value={config.idleTimeoutMs}
              onChange={(e) =>
                updateField("idleTimeoutMs", parseInt(e.target.value), true)
              }
              className="w-full"
              disabled={!config.backlightEnabled}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5s</span>
              <span>5min</span>
            </div>
            <p className="text-xs text-gray-500">
              Shared timeout for the trackpad backlight and keyboard lighting.
            </p>
          </div>
        )}

      </div>

      {/* Keyboard Backlight (implemented through RGB channel) */}
      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-sm">Keyboard Backlight</h3>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rgbEnabled}
            onChange={(e) => updateField("rgbEnabled", e.target.checked)}
          />
          <span className="font-medium">Keyboard Backlight Enabled</span>
          <span className="text-gray-400">(Layer 2 + RGB_TOG)</span>
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Keyboard Brightness ({config.rgbBrightness}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.rgbBrightness}
            onChange={(e) =>
              updateField("rgbBrightness", parseInt(e.target.value), true)
            }
            className="w-full"
            disabled={!config.rgbEnabled}
          />
        </div>

        <div className="rounded bg-gray-50 p-2 text-xs text-gray-500">
          Keyboard backlight color is fixed by BB9981 hardware. Only brightness
          can be adjusted here.
        </div>

        <div className="rounded bg-gray-50 p-2 text-xs text-gray-500">
          Keyboard lighting idle timeout uses the shared lighting idle controls
          above.
        </div>

        <div className="p-2 bg-gray-50 rounded text-xs text-gray-500">
          <p className="font-medium mb-1">Layer-specific keyboard behavior:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Layer 0 (QWERTY): Solid brightness</li>
            <li>Layer 1 (SYM): Blinking (500ms cycle)</li>
            <li>Layer 2 (UPPER): Smooth fade cycle</li>
            <li>Layer 3 (MEDIA): Fast blink (250ms cycle)</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
