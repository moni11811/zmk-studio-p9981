import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { HidUsagePicker } from "./HidUsagePicker";

export interface ParameterValuePickerProps {
  value?: number;
  values: BehaviorParameterValueDescription[];
  layers: { id: number; name: string }[];
  onValueChanged: (value?: number) => void;
  label?: string;
}

export const ParameterValuePicker = ({
  value,
  values,
  layers,
  onValueChanged,
  label,
}: ParameterValuePickerProps) => {
  if (values.length === 0) {
    return <></>;
  }

  // Handle constant/enum values
  if (values.every((v) => v.constant !== undefined)) {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium">{label}</label>}
        <select
          value={value ?? ""}
          className="h-8 rounded border border-gray-300"
          onChange={(e) =>
            onValueChanged(e.target.value ? parseInt(e.target.value) : undefined)
          }
        >
          <option value="">Select an option</option>
          {values.map((v) => (
            <option key={v.constant} value={v.constant}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Handle single-value parameters
  if (values.length === 1) {
    const param = values[0];

    if (param.range) {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {label || param.name}
          </label>
          <input
            type="number"
            min={param.range.min}
            max={param.range.max}
            value={value ?? ""}
            className="h-8 rounded border border-gray-300 px-2"
            onChange={(e) =>
              onValueChanged(e.target.value ? parseInt(e.target.value) : undefined)
            }
            placeholder={`${param.range.min} - ${param.range.max}`}
          />
          <p className="text-xs text-gray-500">
            Range: {param.range.min} to {param.range.max}
          </p>
        </div>
      );
    }

    if (param.hidUsage) {
      return (
        <HidUsagePicker
          onValueChanged={onValueChanged}
          label={label || param.name}
          value={value}
          usagePages={[
            { id: 7, min: 4, max: param.hidUsage.keyboardMax },
            { id: 12, max: param.hidUsage.consumerMax },
          ]}
        />
      );
    }

    if (param.layerId) {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {label || param.name}
          </label>
          <select
            value={value ?? ""}
            className="h-8 rounded border border-gray-300"
            onChange={(e) =>
              onValueChanged(e.target.value ? parseInt(e.target.value) : undefined)
            }
          >
            <option value="">Select a layer</option>
            {layers.map(({ name, id }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (param.nil) {
      return <></>;
    }
  }

  // Handle composite/unknown types
  console.warn("Complex parameter type not fully supported:", values);
  return (
    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800">
        Complex parameter type. Manual configuration may be needed.
      </p>
      <details className="text-xs mt-2">
        <summary className="cursor-pointer">Details</summary>
        <pre className="mt-1 overflow-auto text-xs">
          {JSON.stringify(values, null, 2)}
        </pre>
      </details>
    </div>
  );
};
