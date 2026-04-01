import React, { Suspense, lazy, useEffect, useState } from "react";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

/**
 * BB9981 Device Settings Panel
 *
 * Runtime-backed settings live alongside source-backed behavior editing and the
 * existing macro/combo editors so the desktop app stays feature-complete.
 */

type SettingsTab =
  | "subprofiles"
  | "trackpad"
  | "backlight"
  | "sleep"
  | "power"
  | "bluetooth"
  | "behaviors"
  | "macros"
  | "combos";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "subprofiles", label: "Sub-Profiles" },
  { id: "trackpad", label: "Trackpad" },
  { id: "backlight", label: "Backlight" },
  { id: "sleep", label: "Sleep" },
  { id: "bluetooth", label: "Bluetooth" },
  { id: "power", label: "Power" },
  { id: "behaviors", label: "Behaviors" },
  { id: "macros", label: "Macros" },
  { id: "combos", label: "Combos" },
];

const PROFILE_SCOPED_TABS: SettingsTab[] = [
  "subprofiles",
  "trackpad",
  "backlight",
  "sleep",
];

const GLOBAL_TABS: SettingsTab[] = ["power", "bluetooth", "behaviors", "macros", "combos"];

const TrackpadSettings = lazy(() =>
  import("./TrackpadSettings").then((module) => ({
    default: module.TrackpadSettings,
  }))
);
const SubprofileSettings = lazy(() =>
  import("./SubprofileSettings").then((module) => ({
    default: module.SubprofileSettings,
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
          <div className="rounded border border-error/30 bg-base-200 p-4">
            <h2 className="text-lg font-bold text-base-content">
              {this.props.tabLabel} Tab Failed to Load
            </h2>
            <p className="mt-2 text-sm text-base-content/70">
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
  <div className="flex items-center justify-center p-8 text-base-content/60">
    Loading {label.toLowerCase()}...
  </div>
);

interface DeviceSettingsProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  totalKeys: number;
  scope?: "subprofiles" | "global";
}

const SettingsStripButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-primary/40 bg-primary/20 text-base-content"
        : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content"
    }`}
  >
    {label}
  </button>
);

export const DeviceSettings = ({
  behaviors,
  layers,
  totalKeys,
  scope = "subprofiles",
}: DeviceSettingsProps) => {
  const defaultTab = scope === "global" ? "power" : "subprofiles";
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [profileGroupCollapsed, setProfileGroupCollapsed] = useState(false);
  const activeTabLabel =
    TABS.find((tab) => tab.id === activeTab)?.label ?? "Settings";
  const profileTabs = TABS.filter((tab) => PROFILE_SCOPED_TABS.includes(tab.id));
  const globalTabs = TABS.filter((tab) => GLOBAL_TABS.includes(tab.id));

  useEffect(() => {
    if (scope === "global" && !GLOBAL_TABS.includes(activeTab)) {
      setActiveTab("power");
    }

    if (scope === "subprofiles" && !PROFILE_SCOPED_TABS.includes(activeTab)) {
      setActiveTab("subprofiles");
    }
  }, [activeTab, scope]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "subprofiles":
        return <SubprofileSettings />;
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
      <div className="shrink-0 border-b border-base-300 bg-base-300/60 px-3 py-3">
        <div className="flex flex-col gap-3">
          {scope === "subprofiles" && (
            <div className="rounded-xl border border-base-300 bg-base-300/70 p-2">
              <button
                onClick={() => setProfileGroupCollapsed((current) => !current)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-base-content/80 transition-colors hover:bg-base-200/70"
              >
                <span>SubProfile Scope</span>
                <span className="text-base-content/60">
                  {profileGroupCollapsed ? "+" : "-"}
                </span>
              </button>
              {!profileGroupCollapsed && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileTabs.map((tab) => (
                    <SettingsStripButton
                      key={tab.id}
                      active={activeTab === tab.id}
                      label={tab.label}
                      onClick={() => setActiveTab(tab.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {scope === "global" && (
            <div className="flex flex-wrap gap-2">
              {globalTabs.map((tab) => (
                <SettingsStripButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  label={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>
          )}
        </div>
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
