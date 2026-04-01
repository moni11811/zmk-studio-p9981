import { useEffect, useState } from "react";

function basicSerialize<T>(value: T): string {
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  },
) {
  const reactState = useState<T>(() => {
    try {
      const savedValue = localStorage.getItem(key);
      if (savedValue !== null) {
        if (options?.deserialize) {
          return options.deserialize(savedValue);
        }

        if (typeof defaultValue === "object" && defaultValue !== null) {
          return JSON.parse(savedValue) as T;
        }

        return savedValue as T; // Assuming T is a string
      }
    } catch (_error) {
      return defaultValue;
    }

    return defaultValue;
  });

  const [state] = reactState;

  useEffect(() => {
    try {
      const serializedState =
        options?.serialize?.(state) || basicSerialize(state);
      localStorage.setItem(key, serializedState);
    } catch (_error) {
      // Ignore storage failures so persisted UI state can't crash the app.
    }
  }, [state, key, options]);

  return reactState;
}
