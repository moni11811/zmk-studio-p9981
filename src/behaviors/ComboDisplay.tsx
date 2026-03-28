/**
 * ComboDisplay Component
 *
 * Displays a visual representation of key combo triggers and resulting behavior.
 * This is a placeholder component that will be fully functional
 * after firmware RPC support for combo management is implemented.
 */

export interface ComboDisplayProps {
  comboId?: number;
  name?: string;
  triggerKeys?: number[];
  resultingBehavior?: string;
  timeout?: number;
  onEdit?: (comboId: number) => void;
  onDelete?: (comboId: number) => void;
  isEditable?: boolean;
}

export const ComboDisplay = ({
  comboId,
  name,
  triggerKeys = [],
  resultingBehavior,
  timeout = 50,
  onEdit,
  onDelete,
  isEditable = false,
}: ComboDisplayProps) => {
  if (!comboId) {
    return (
      <div className="p-4 border border-gray-300 rounded bg-gray-50">
        <p className="text-gray-500">No combo selected</p>
      </div>
    );
  }

  const getKeyLabel = (keyCode: number): string => {
    // Simple hex representation for now
    // Will be enhanced with actual key mappings from HID tables
    return `0x${keyCode.toString(16).toUpperCase().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 border border-gray-300 rounded">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{name || `Combo ${comboId}`}</h3>
        {isEditable && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(comboId)}
                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(comboId)}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Trigger Keys */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Trigger Keys:
          </label>
          {triggerKeys.length === 0 ? (
            <p className="text-gray-500 text-sm mt-1">No trigger keys defined</p>
          ) : (
            <div className="flex gap-2 mt-1 flex-wrap">
              {triggerKeys.map((keyCode, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono"
                >
                  {getKeyLabel(keyCode)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Resulting Behavior */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Resulting Behavior:
          </label>
          {resultingBehavior ? (
            <p className="text-sm mt-1 p-2 bg-green-50 border border-green-200 rounded">
              {resultingBehavior}
            </p>
          ) : (
            <p className="text-gray-500 text-sm mt-1">No behavior assigned</p>
          )}
        </div>

        {/* Timeout */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Timeout:
          </label>
          <p className="text-sm mt-1">{timeout}ms</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Combo ID: {comboId} • Triggers: {triggerKeys.length}
      </p>
    </div>
  );
};
