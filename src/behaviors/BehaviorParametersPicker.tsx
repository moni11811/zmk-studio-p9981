import { BehaviorBindingParametersSet } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { ParameterValuePicker } from "./ParameterValuePicker";
import { validateValue } from "./parameters";

export interface BehaviorParametersPickerProps {
  param1?: number;
  param2?: number;
  metadata: BehaviorBindingParametersSet[];
  layers: { id: number; name: string }[];
  onParam1Changed: (value?: number) => void;
  onParam2Changed: (value?: number) => void;
  /**
   * Optional title for the parameters section
   */
  title?: string;
}

export const BehaviorParametersPicker = ({
  param1,
  param2,
  metadata,
  layers,
  onParam1Changed,
  onParam2Changed,
  title = "Parameters",
}: BehaviorParametersPickerProps) => {
  // Get all unique param1 options
  const allParam1Values = metadata.flatMap((m) => m.param1);

  // Find the matching parameter set for the current param1 value
  const matchingSet =
    param1 !== undefined
      ? metadata.find((s) =>
          validateValue(
            layers.map((l) => l.id),
            param1,
            s.param1
          )
        )
      : undefined;

  // Get param2 options if a param1 is selected
  const param2Values = matchingSet?.param2 || [];
  const hasParam2 = param2Values.length > 0;

  // If param1 is not set, show only param1 picker
  if (param1 === undefined) {
    return (
      <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
        {title && <h4 className="font-semibold text-sm">{title}</h4>}
        <ParameterValuePicker
          values={allParam1Values}
          onValueChanged={onParam1Changed}
          layers={layers}
          label="Parameter 1"
        />
      </div>
    );
  }

  // Show both param1 and param2 (if applicable)
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      {title && <h4 className="font-semibold text-sm">{title}</h4>}

      {/* Parameter 1 Picker */}
      <div className="border-b border-gray-200 pb-3">
        <ParameterValuePicker
          values={allParam1Values}
          value={param1}
          layers={layers}
          onValueChanged={onParam1Changed}
          label="Parameter 1"
        />
      </div>

      {/* Parameter 2 Picker (if applicable) */}
      {hasParam2 && (
        <div>
          <ParameterValuePicker
            values={param2Values}
            value={param2}
            layers={layers}
            onValueChanged={onParam2Changed}
            label="Parameter 2"
          />
        </div>
      )}

      {/* Info message if no param2 needed */}
      {!hasParam2 && param1 !== undefined && (
        <p className="text-xs text-gray-500 italic">
          This parameter has no additional options
        </p>
      )}
    </div>
  );
};
