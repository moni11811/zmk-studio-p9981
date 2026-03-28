/**
 * ParameterModel.ts
 *
 * Defines a recursive parameter schema for handling nested and complex behaviors.
 * This extends beyond the current 2-parameter limit to support arbitrarily complex
 * parameter trees, similar to keymap-editor's approach.
 *
 * This is a foundation for future enhancement - currently zmk-studio-ts-client
 * only supports 2-level parameters, but this model prepares for expansion.
 */

/**
 * Represents a single parameter value option
 */
export interface ParameterValueOption {
  constant?: number;
  range?: {
    min: number;
    max: number;
  };
  hidUsage?: {
    keyboardMax: number;
    consumerMax: number;
  };
  layerId?: boolean;
  nil?: boolean;
  name: string;
}

/**
 * Represents conditional parameter constraints
 * (e.g., "param2 only shows when param1 is X")
 */
export interface ParameterCondition {
  parentIndex: number;
  parentValue?: number;
  parentValues?: number[];
}

/**
 * Recursive parameter definition
 */
export interface ParameterDefinition {
  index: number;
  name: string;
  values: ParameterValueOption[];
  condition?: ParameterCondition;
  children?: ParameterDefinition[];
}

/**
 * Complete behavior parameter schema
 */
export interface BehaviorParameterSchema {
  behaviorId: string;
  name: string;
  parameters: ParameterDefinition[];
}

/**
 * Runtime parameter value tree
 */
export interface ParameterValueTree {
  [index: number]: number | undefined;
}

/**
 * Validates a parameter value against its definition
 */
export function validateParameterValue(
  value: number | undefined,
  paramDef: ParameterDefinition,
  layerIds?: number[]
): boolean {
  if (value === undefined) {
    return paramDef.values.some((v) => v.nil);
  }

  return paramDef.values.some((v) => {
    if (v.constant !== undefined) {
      return v.constant === value;
    } else if (v.range) {
      return value >= v.range.min && value <= v.range.max;
    } else if (v.hidUsage) {
      // Simplified HID validation - in practice should check usage tables
      return value > 0;
    } else if (v.layerId && layerIds) {
      return layerIds.includes(value);
    } else if (v.nil) {
      return value === 0;
    }
    return false;
  });
}

/**
 * Gets applicable parameters at a given level based on current values
 */
export function getApplicableParameters(
  schema: ParameterSchema,
  currentValues: ParameterValueTree,
  levelIndex: number
): ParameterDefinition[] {
  if (levelIndex >= schema.parameters.length) {
    return [];
  }

  const levelParams = schema.parameters[levelIndex];
  if (!Array.isArray(levelParams)) {
    return [levelParams];
  }

  return levelParams.filter((param) => {
    if (!param.condition) {
      return true;
    }

    const parentValue = currentValues[param.condition.parentIndex];
    if (parentValue === undefined) {
      return false;
    }

    if (param.condition.parentValue !== undefined) {
      return parentValue === param.condition.parentValue;
    }

    if (param.condition.parentValues) {
      return param.condition.parentValues.includes(parentValue);
    }

    return true;
  });
}

/**
 * Alias for backward compatibility
 */
export type ParameterSchema = BehaviorParameterSchema;

/**
 * Converts between the TypeScript client's 2-level format and the recursive model
 */
export function convertFrom2LevelFormat(
  param1Values: ParameterValueOption[],
  param2Map: Map<number, ParameterValueOption[]>
): BehaviorParameterSchema {
  const parameters: ParameterDefinition[] = [
    {
      index: 0,
      name: "Parameter 1",
      values: param1Values,
    },
  ];

  // If we have param2 options, add them as conditional children
  if (param2Map.size > 0) {
    const param2Conditions: ParameterDefinition[] = [];

    param2Map.forEach((values, param1Value) => {
      param2Conditions.push({
        index: 1,
        name: "Parameter 2",
        values,
        condition: {
          parentIndex: 0,
          parentValue: param1Value,
        },
      });
    });

    parameters.push(...param2Conditions);
  }

  return {
    behaviorId: "unknown",
    name: "Behavior",
    parameters,
  };
}

/**
 * Flattens a recursive parameter tree to linear indices
 * Useful for serialization or legacy API compatibility
 */
export function flattenParameterTree(
  tree: ParameterValueTree
): [number | undefined, number | undefined] {
  return [tree[0], tree[1]];
}

/**
 * Rebuilds a parameter tree from flat indices
 */
export function unflattenParameterTree(
  param1: number | undefined,
  param2: number | undefined
): ParameterValueTree {
  return {
    0: param1,
    1: param2,
  };
}

/**
 * Finds the next undefined parameter in the tree (for guided editing)
 */
export function getNextUndefinedParameter(
  schema: BehaviorParameterSchema,
  currentValues: ParameterValueTree
): ParameterDefinition | undefined {
  for (let i = 0; i < schema.parameters.length; i++) {
    if (currentValues[i] === undefined) {
      const applicableParams = getApplicableParameters(
        schema,
        currentValues,
        i
      );
      if (applicableParams.length > 0) {
        return applicableParams[0];
      }
    }
  }
  return undefined;
}
