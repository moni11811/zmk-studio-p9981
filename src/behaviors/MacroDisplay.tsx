/**
 * MacroDisplay Component
 *
 * Displays a visual representation of macro sequences.
 * This is a placeholder component that will be fully functional
 * after firmware RPC support for macro management is implemented.
 */

export interface MacroStep {
  type: "press" | "release" | "tap" | "delay";
  keyCode?: number;
  duration?: number;
}

export interface MacroDisplayProps {
  macroId?: number;
  name?: string;
  steps?: MacroStep[];
  onEdit?: (macroId: number) => void;
  onDelete?: (macroId: number) => void;
  isEditable?: boolean;
}

export const MacroDisplay = ({
  macroId,
  name,
  steps = [],
  onEdit,
  onDelete,
  isEditable = false,
}: MacroDisplayProps) => {
  if (!macroId) {
    return (
      <div className="p-4 border border-gray-300 rounded bg-gray-50">
        <p className="text-gray-500">No macro selected</p>
      </div>
    );
  }

  const getStepLabel = (step: MacroStep): string => {
    switch (step.type) {
      case "press":
        return `Press (0x${step.keyCode?.toString(16).toUpperCase().padStart(2, "0")})`;
      case "release":
        return `Release (0x${step.keyCode?.toString(16).toUpperCase().padStart(2, "0")})`;
      case "tap":
        return `Tap (0x${step.keyCode?.toString(16).toUpperCase().padStart(2, "0")})`;
      case "delay":
        return `Delay ${step.duration}ms`;
      default:
        return "Unknown";
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{name || `Macro ${macroId}`}</h3>
        {isEditable && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(macroId)}
                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(macroId)}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {steps.length === 0 ? (
        <p className="text-gray-500 text-sm">No steps defined</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
            >
              <span className="font-mono bg-gray-200 px-2 py-1 rounded min-w-fit">
                {index + 1}
              </span>
              <span>{getStepLabel(step)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Total steps: {steps.length}
      </p>
    </div>
  );
};
