import { useState } from "react";
import { TrackpadSettings } from "./TrackpadSettings";
import { BacklightSettings } from "./BacklightSettings";
import { BluetoothSettings } from "./BluetoothSettings";
import { BehaviorControl } from "./BehaviorControl";
import { MacroList } from "./MacroList";
import { ComboList } from "./ComboList";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

/**
 * BB9981 Device Settings Panel
 *
 * Runtime-backed settings live alongside source-backed behavior editing and the
 * existing macro/combo editors so the desktop app stays feature-complete.
 */

type SettingsTab =
  | "trackpad"
  | "backlight"
  | "bluetooth"
  | "behaviors"
  | "macros"
  | "combos";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "trackpad", label: "Trackpad" },
  { id: "backlight", label: "Backlight" },
  { id: "bluetooth", label: "Bluetooth" },
  { id: "behaviors", label: "Behaviors" },
  { id: "macros", label: "Macros" },
  { id: "combos", label: "Combos" },
];

interface DeviceSettingsProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  totalKeys: number;
}

export const DeviceSettings = ({
  behaviors,
  layers,
  totalKeys,
}: DeviceSettingsProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("trackpad");

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "trackpad" && <TrackpadSettings />}
        {activeTab === "backlight" && <BacklightSettings />}
        {activeTab === "bluetooth" && <BluetoothSettings />}
        {activeTab === "behaviors" && (
          <BehaviorControl behaviors={behaviors} layers={layers} />
        )}
        {activeTab === "macros" && (
          <MacroList behaviors={behaviors} layers={layers} />
        )}
        {activeTab === "combos" && (
          <ComboList behaviors={behaviors} layers={layers} totalKeys={totalKeys} />
        )}
      </div>
    </div>
  );
};
