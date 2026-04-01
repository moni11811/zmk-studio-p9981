import { useEffect, useRef, useState } from "react";
import { useBluetoothConfig } from "../rpc/useBB9981";

/**
 * BB9981 Bluetooth & Connectivity Configuration
 *
 * Hardware: Nordic nRF52840 (BLE 5.0 + USB)
 * - 4 BT profiles (selectable via Layer 2 + top row keys)
 * - USB/BLE output toggle (Layer 2 + double-tap $)
 * - TX power boost: +8dBm
 * - BT_CLR: Layer 2 + double-tap trackpad
 *
 * Connection priority:
 * - Default output: BLE
 * - USB connection: Auto-detected, manual toggle required
 */

export const BluetoothSettings = () => {
  const {
    config,
    loading,
    error,
    refresh,
    updateConfig,
    selectProfile,
    clearProfile,
    renameProfile,
  } = useBluetoothConfig();
  const [draftNames, setDraftNames] = useState<Record<number, string>>({});
  const renameTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!config) {
      setDraftNames({});
      return;
    }

    setDraftNames(
      Object.fromEntries(config.profiles.map((profile) => [profile.index, profile.name]))
    );
  }, [config]);

  useEffect(
    () => () => {
      Object.values(renameTimers.current).forEach((timer) => clearTimeout(timer));
      renameTimers.current = {};
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading Bluetooth settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-bold text-amber-900">Bluetooth Settings Unavailable</h2>
          <p className="mt-2 text-sm text-amber-800">
            The app could not load Bluetooth settings from the keyboard.
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
          <h2 className="text-lg font-bold text-gray-900">Bluetooth Settings Unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            The keyboard did not return Bluetooth settings for this session.
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
      <h2 className="text-lg font-bold">Bluetooth & Connectivity</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">Preferred Output</div>
          <div className="text-lg font-semibold">
            {config.outputMode === "usb" ? "USB (Wired)" : "Bluetooth"}
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-gray-500">Active Output</div>
          <div className="text-lg font-semibold">
            {config.activeOutputMode === "usb"
              ? "USB (Wired)"
              : config.activeOutputMode === "ble"
                ? "Bluetooth"
                : "None"}
          </div>
        </div>
      </div>

      {/* Output Mode */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Output Behavior</label>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium text-gray-900">
                Prefer USB when available
              </div>
              <p className="text-xs text-gray-500">
                Off keeps Bluetooth as the default behavior. On makes wired USB
                the preferred output whenever a cable is connected.
              </p>
            </div>
            <button
              onClick={() =>
                updateConfig((current) => ({
                  ...current,
                  outputMode: current.outputMode === "usb" ? "ble" : "usb",
                }))
              }
              className={`inline-flex min-w-28 justify-center rounded border px-3 py-2 text-sm font-medium ${
                config.outputMode === "usb"
                  ? "border-blue-400 bg-blue-100 text-blue-800"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {config.outputMode === "usb" ? "USB Preferred" : "Bluetooth Default"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          This sets the preferred output behavior, not just the currently active
          link. Toggle on device: Layer 2 + double-tap $. USB / charging
          trackpad LED behavior is configured in the Power tab.
        </p>
        {config.outputMode !== config.activeOutputMode &&
          config.activeOutputMode !== "none" && (
            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              Preferred output and active output are different right now. The
              keyboard is using the currently available link, but it will return
              to your preferred output when that transport is ready.
            </div>
          )}
      </div>

      {/* BT Profiles */}
      <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
        <label className="text-sm font-medium">
          Bluetooth Profiles (4 slots)
        </label>
        <div className="space-y-2">
          {config.profiles.map((profile) => (
            <div
              key={profile.index}
              className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                config.activeProfile === profile.index
                  ? "bg-blue-50 border-blue-300"
                  : "bg-gray-50 border-gray-200"
              }`}
              onClick={() => selectProfile(profile.index)}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  profile.connected
                    ? "bg-green-500"
                    : profile.paired
                      ? "bg-yellow-500"
                      : "bg-gray-300"
                }`}
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={draftNames[profile.index] ?? profile.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraftNames((current) => ({
                      ...current,
                      [profile.index]: value,
                    }));

                    if (renameTimers.current[profile.index]) {
                      clearTimeout(renameTimers.current[profile.index]);
                    }

                    renameTimers.current[profile.index] = setTimeout(() => {
                      delete renameTimers.current[profile.index];
                      void renameProfile(profile.index, value);
                    }, 300);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none font-medium text-sm w-full focus:outline-none focus:border-b focus:border-blue-400"
                />
                <p className="text-xs text-gray-400">
                  {profile.connected
                    ? "Connected"
                    : profile.paired
                      ? "Paired (not connected)"
                      : "Empty slot"}
                </p>
              </div>
              <div className="flex gap-1">
                {config.activeProfile === profile.index && (
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs">
                    Active
                  </span>
                )}
                {profile.paired && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProfile(profile.index);
                    }}
                    className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Switch profiles on device: Layer 2 + top row keys (1-4).
          Clear pairing: Layer 2 + double-tap trackpad.
        </p>
      </div>

      {/* Connection Info */}
      <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
        <p className="font-medium mb-1">Pairing Instructions:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enable Bluetooth on your device</li>
          <li>
            Search for &quot;bbp9981&quot; and pair
          </li>
          <li>If pairing fails: Layer 2 + double-tap trackpad to clear</li>
          <li>Refresh Bluetooth settings on your device and try again</li>
        </ol>
        <p className="mt-2 font-medium">Requires BLE 4.2 or higher.</p>
      </div>
    </div>
  );
};
