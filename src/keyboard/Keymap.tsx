import {
  PhysicalLayout,
  Keymap as KeymapMsg,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { getBehaviorLabel } from "../behaviors/behaviorNames";

import {
  LayoutZoom,
  PhysicalLayout as PhysicalLayoutComp,
} from "./PhysicalLayout";
import { HidUsageLabel } from "./HidUsageLabel";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

function normalizeBehaviorId(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value && typeof value === "object") {
    const candidate = value as { toNumber?: () => number; low?: number };

    if (typeof candidate.toNumber === "function") {
      try {
        const parsed = candidate.toNumber();
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }

    if (typeof candidate.low === "number") {
      return candidate.low;
    }
  }

  return fallback;
}

export interface KeymapProps {
  layout: PhysicalLayout;
  keymap: KeymapMsg;
  behaviors: BehaviorMap;
  scale: LayoutZoom;
  selectedLayerIndex: number;
  selectedKeyPosition: number | undefined;
  onKeyPositionClicked: (keyPosition: number) => void;
}

export const Keymap = ({
  layout,
  keymap,
  behaviors,
  scale,
  selectedLayerIndex,
  selectedKeyPosition,
  onKeyPositionClicked,
}: KeymapProps) => {
  if (!keymap.layers[selectedLayerIndex]) {
    return <></>;
  }

  const positions = layout.keys.map((k, i) => {
    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        header: "Unknown",
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
      };
    }

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      header:
        (
          behaviors[
            normalizeBehaviorId(keymap.layers[selectedLayerIndex].bindings[i].behaviorId)
          ] &&
          getBehaviorLabel(
            behaviors[
              normalizeBehaviorId(keymap.layers[selectedLayerIndex].bindings[i].behaviorId)
            ]
          )
        ) ||
        `Behavior ${normalizeBehaviorId(
          keymap.layers[selectedLayerIndex].bindings[i].behaviorId
        )}`,
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: (
        <HidUsageLabel
          hid_usage={keymap.layers[selectedLayerIndex].bindings[i].param1}
        />
      ),
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={48}
      hoverZoom={true}
      zoom={scale}
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
    />
  );
};
