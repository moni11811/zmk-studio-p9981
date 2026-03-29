import React, { Suspense, lazy, useState } from "react";
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
  | "sleep"
  | "power"
  | "bluetooth"
  | "behaviors"
  | "macros"
  | "combos";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "trackpad", label: "Trackpad" },
  { id: "backlight", label: "Backlight" },
  { id: "sleep", label: "Sleep" },
  { id: "power", label: "Power" },
  { id: "bluetooth", label: "Bluetooth" },
  { id: "behaviors", label: "Behaviors" },
  { id: "macros", label: "Macros" },
  { id: "combos", label: "Combos" },
];

const TrackpadSettings = lazy(() =>
  import("./TrackpadSettings").then((module) => ({
    default: module.TrackpadSettings,
  }))
);
const BacklightSettings = lazy(() =>
  import("./BacklightSettings").then((module) => ({
    default: module.BacklightSettings,
  }))
);
const BluetoothSettings = lazy(() =>
  import("./BluetoothSettings").then((module) => ({
    default: module.BluetoothSettings,
  }))
);
const SleepSettings = lazy(() =>
  import("./SleepSettings").then((module) => ({
    default: module.SleepSettings,
  }))
);
const PowerSettings = lazy(() =>
  import("./PowerSettings").then((module) => ({
    default: module.PowerSettings,
  }))
);
const BehaviorControl = lazy(() =>
  import("./BehaviorControl").then((module) => ({
    default: module.BehaviorControl,
  }))
);
const MacroList = lazy(() =>
  import("./MacroList").then((module) => ({
    default: module.MacroList,
  }))
);
const ComboList = lazy(() =>
  import("./ComboList").then((module) => ({
    default: module.ComboList,
  }))
);

class SettingsTabErrorBoundary extends React.Component<
  { children: React.ReactNode; tabLabel: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; tabLabel: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Failed to render ${this.props.tabLabel} tab`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <div className="rounded border border-red-200 bg-red-50 p-4">
            <h2 className="text-lg font-bold text-red-900">
              {this.props.tabLabel} Tab Failed to Load
            </h2>
            <p className="mt-2 text-sm text-red-800">
              This tab hit a render error. Switch tabs and come back, or reopen
              the app after reconnecting the keyboard.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SettingsTabLoading = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center p-8 text-gray-500">
    Loading {label.toLowerCase()}...
  </div>
);

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
  const activeTabLabel =
    TABS.find((tab) => tab.id === activeTab)?.label ?? "Settings";

  const renderActiveTab = () => {
    switch (activeTab) {
      case "trackpad":
        return <TrackpadSettings />;
      case "backlight":
        return <BacklightSettings />;
      case "sleep":
        return <SleepSettings />;
      case "power":
        return <PowerSettings />;
      case "bluetooth":
        return <BluetoothSettings />;
      case "behaviors":
        return <BehaviorControl behaviors={behaviors} layers={layers} />;
      case "macros":
        return <MacroList behaviors={behaviors} layers={layers} />;
      case "combos":
        return (
          <ComboList
            behaviors={behaviors}
            layers={layers}
            totalKeys={totalKeys}
          />
        );
    }
  };

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
        <SettingsTabErrorBoundary key={activeTab} tabLabel={activeTabLabel}>
          <Suspense fallback={<SettingsTabLoading label={activeTabLabel} />}>
            {renderActiveTab()}
          </Suspense>
        </SettingsTabErrorBoundary>
      </div>
    </div>
  );
};
