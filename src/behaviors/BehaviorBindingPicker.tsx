import { useEffect, useMemo, useRef, useState } from "react";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { getBehaviorLabel } from "./behaviorNames";
import { validateValue } from "./parameters";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

function normalizeNumericValue(value: any, fallback = 0): number {
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
    if (typeof value.toNumber === "function") {
      try {
        const parsed = value.toNumber();
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }

    if (typeof value.low === "number") {
      return value.low;
    }
  }

  return fallback;
}

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  let matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const [behaviorId, setBehaviorId] = useState(
    normalizeNumericValue(binding.behaviorId)
  );
  const [param1, setParam1] = useState<number | undefined>(
    normalizeNumericValue(binding.param1)
  );
  const [param2, setParam2] = useState<number | undefined>(
    normalizeNumericValue(binding.param2)
  );

  const metadata = useMemo(
    () =>
      behaviors.find((b) => normalizeNumericValue(b.id) === behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const sortedBehaviors = useMemo(
    () =>
      [...behaviors].sort((a, b) => getBehaviorLabel(a).localeCompare(getBehaviorLabel(b))),
    [behaviors]
  );

  const selectableBehaviors = useMemo(() => {
    if (sortedBehaviors.some((behavior) => normalizeNumericValue(behavior.id) === behaviorId)) {
      return sortedBehaviors;
    }

    return [
      {
        id: behaviorId,
        displayName: `Behavior ${behaviorId}`,
        metadata: [],
      } as GetBehaviorDetailsResponse,
      ...sortedBehaviors,
    ];
  }, [behaviorId, sortedBehaviors]);

  const normalizedBinding = useMemo(
    () => ({
      behaviorId: normalizeNumericValue(binding.behaviorId),
      param1: normalizeNumericValue(binding.param1),
      param2: normalizeNumericValue(binding.param2),
    }),
    [binding]
  );
  const previousBindingRef = useRef(normalizedBinding);
  const isExternalBindingChange =
    previousBindingRef.current.behaviorId !== normalizedBinding.behaviorId ||
    previousBindingRef.current.param1 !== normalizedBinding.param1 ||
    previousBindingRef.current.param2 !== normalizedBinding.param2;

  useEffect(() => {
    if (isExternalBindingChange) {
      return;
    }

    if (
      normalizedBinding.behaviorId === behaviorId &&
      normalizedBinding.param1 === param1 &&
      normalizedBinding.param2 === param2
    ) {
      return;
    }

    if (!metadata) {
      console.error(
        "Can't find metadata for the selected behaviorId",
        behaviorId
      );
      return;
    }

    if (
      validateBinding(
        metadata,
        layers.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChanged({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [
    behaviorId,
    isExternalBindingChange,
    metadata,
    normalizedBinding,
    onBindingChanged,
    layers,
    param1,
    param2,
  ]);

  useEffect(() => {
    previousBindingRef.current = normalizedBinding;
    setBehaviorId(normalizedBinding.behaviorId);
    setParam1(normalizedBinding.param1);
    setParam2(normalizedBinding.param2);
  }, [normalizedBinding]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label>Behavior: </label>
        <select
          value={behaviorId}
          className="h-8 rounded"
          onChange={(e) => {
            setBehaviorId(normalizeNumericValue(e.target.value));
            setParam1(0);
            setParam2(0);
          }}
        >
          {selectableBehaviors.map((b) => (
            <option key={normalizeNumericValue(b.id)} value={normalizeNumericValue(b.id)}>
              {getBehaviorLabel(b)}
            </option>
          ))}
        </select>
      </div>
      {metadata && (
        <BehaviorParametersPicker
          metadata={metadata}
          param1={param1}
          param2={param2}
          layers={layers}
          onParam1Changed={setParam1}
          onParam2Changed={setParam2}
        />
      )}
    </div>
  );
};
