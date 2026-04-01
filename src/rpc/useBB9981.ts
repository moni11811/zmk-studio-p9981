/**
 * BB9981 React Hooks
 *
 * Provides React hooks for accessing BB9981 custom subsystems.
 * Uses the BB9981 RPC layer to talk to the connected firmware instance.
 */

import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { bb9981Rpc } from "./bb9981Rpc";
import type {
  MacroDetails,
  MacroStep,
  MacroSummary,
  ComboDetails,
  ComboSummary,
  TrackpadConfig,
  BacklightConfig,
  BluetoothConfig,
  PowerConfig,
  SleepConfig,
  SubProfileState,
} from "./bb9981Types";
import { ConnectionContext } from "./ConnectionContext";
import { useSub } from "../usePubSub";
import { LockStateContext } from "./LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";

function isFinishedSubprofileNotification(data: any): boolean {
  return !data || data.switching !== true;
}

// ============= Macro Hooks =============

export function useMacroList() {
  const connection = useContext(ConnectionContext);
  const [macros, setMacros] = useState<MacroSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setMacros([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await bb9981Rpc.macros.listAllMacros();
      setMacros(list);
    } catch (error) {
      console.error("Failed to refresh macros", error);
      setMacros([]);
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation]);

  useEffect(() => {
    if (!connection.conn) {
      setMacros([]);
      setLoading(false);
      return;
    }
    refresh();
    const unsub = bb9981Rpc.macros.onChange(() => refresh());
    return unsub;
  }, [connection.conn, connection.generation, refresh]);

  const createMacro = useCallback(async () => {
    const result = await bb9981Rpc.macros.createMacro();
    if (result.ok !== undefined) {
      await refresh();
      return result.ok;
    }
    return undefined;
  }, [refresh]);

  const deleteMacro = useCallback(
    async (macroId: number) => {
      await bb9981Rpc.macros.deleteMacro(macroId);
      await refresh();
    },
    [refresh]
  );

  return { macros, loading, refresh, createMacro, deleteMacro };
}

export function useMacroDetails(macroId: number | null) {
  const connection = useContext(ConnectionContext);
  const [macro, setMacro] = useState<MacroDetails | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (macroId === null || !connection.conn) {
      setMacro(undefined);
      setLoading(false);
      return;
    }

    let ignore = false;
    const activeMacroId = macroId;

    async function loadMacro() {
      setLoading(true);
      try {
        const details = await bb9981Rpc.macros.getMacroDetails(activeMacroId);
        if (!ignore) {
          setMacro(details);
        }
      } catch (error) {
        console.error("Failed to load macro details", error);
        if (!ignore) {
          setMacro(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadMacro();

    return () => {
      ignore = true;
    };
  }, [connection.conn, connection.generation, macroId]);

  const saveMacro = useCallback(
    async (
      name: string,
      steps: MacroStep[],
      defaultWaitMs: number,
      defaultTapMs: number
    ) => {
      if (macroId === null) return;
      await bb9981Rpc.macros.setMacroSteps(
        macroId,
        name,
        steps,
        defaultWaitMs,
        defaultTapMs
      );
    },
    [macroId]
  );

  return { macro, loading, saveMacro };
}

// ============= Combo Hooks =============

export function useComboList() {
  const connection = useContext(ConnectionContext);
  const [combos, setCombos] = useState<ComboSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setCombos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await bb9981Rpc.combos.listAllCombos();
      setCombos(list);
    } catch (error) {
      console.error("Failed to refresh combos", error);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation]);

  useEffect(() => {
    if (!connection.conn) {
      setCombos([]);
      setLoading(false);
      return;
    }
    refresh();
    const unsub = bb9981Rpc.combos.onChange(() => refresh());
    return unsub;
  }, [connection.conn, connection.generation, refresh]);

  const createCombo = useCallback(async () => {
    const result = await bb9981Rpc.combos.createCombo();
    if (result.ok !== undefined) {
      await refresh();
      return result.ok;
    }
    return undefined;
  }, [refresh]);

  const deleteCombo = useCallback(
    async (comboId: number) => {
      await bb9981Rpc.combos.deleteCombo(comboId);
      await refresh();
    },
    [refresh]
  );

  return { combos, loading, refresh, createCombo, deleteCombo };
}

export function useComboDetails(comboId: number | null) {
  const connection = useContext(ConnectionContext);
  const [combo, setCombo] = useState<ComboDetails | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (comboId === null || !connection.conn) {
      setCombo(undefined);
      setLoading(false);
      return;
    }

    let ignore = false;
    const activeComboId = comboId;

    async function loadCombo() {
      setLoading(true);
      try {
        const details = await bb9981Rpc.combos.getComboDetails(activeComboId);
        if (!ignore) {
          setCombo(details);
        }
      } catch (error) {
        console.error("Failed to load combo details", error);
        if (!ignore) {
          setCombo(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadCombo();

    return () => {
      ignore = true;
    };
  }, [connection.conn, connection.generation, comboId]);

  const saveCombo = useCallback(
    async (details: ComboDetails) => {
      if (comboId === null) return;
      await bb9981Rpc.combos.setCombo(details);
    },
    [comboId]
  );

  return { combo, loading, saveCombo };
}

// ============= Settings Hooks =============

export function useTrackpadConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<TrackpadConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const configRef = useRef<TrackpadConfig | undefined>(undefined);

  const setTrackedConfig = useCallback((next: TrackpadConfig | undefined) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const cfg = await bb9981Rpc.settings.getTrackpadConfig();
      setTrackedConfig(cfg);
    } catch (error) {
      console.error("Failed to load trackpad config", error);
      setTrackedConfig(undefined);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load trackpad settings from the keyboard."
      );
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, setTrackedConfig]);

  useSub("rpc_notification.settings.trackpadConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getTrackpadConfig()
      .then((cfg) => {
        setTrackedConfig(cfg);
        setError(undefined);
      })
      .catch((error) => {
        console.error("Failed to refresh trackpad config from notification", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to refresh trackpad settings from the keyboard."
        );
      });
  });

  useEffect(() => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setLoading(false);
      return;
    }
    refresh();

    const unsub = bb9981Rpc.settings.onTrackpadChange((cfg) => {
      setTrackedConfig(cfg);
      setError(undefined);
    });

    return () => {
      unsub();
    };
  }, [connection.conn, connection.generation, refresh, setTrackedConfig]);

  const updateConfig = useCallback(
    async (
      nextConfig:
        | TrackpadConfig
        | ((current: TrackpadConfig) => TrackpadConfig)
    ) => {
      const previous = configRef.current;
      if (!previous) {
        throw new Error("Trackpad config is not loaded yet");
      }

      const resolvedConfig =
        typeof nextConfig === "function" ? nextConfig(previous) : nextConfig;

      setTrackedConfig(resolvedConfig);

      const result = await bb9981Rpc.settings.setTrackpadConfig(resolvedConfig);
      if (result !== 0) {
        setTrackedConfig(previous);
      }
      return result;
    },
    [setTrackedConfig]
  );

  return { config, loading, error, refresh, updateConfig };
}

export function useBacklightConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<BacklightConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const configRef = useRef<BacklightConfig | undefined>(undefined);
  const updatingRef = useRef(false);

  const setTrackedConfig = useCallback((next: BacklightConfig | undefined) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const cfg = await bb9981Rpc.settings.getBacklightConfig();
      setTrackedConfig(cfg);
    } catch (error) {
      console.error("Failed to load backlight config", error);
      setTrackedConfig(undefined);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load lighting settings from the keyboard."
      );
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, setTrackedConfig]);

  useSub("rpc_notification.settings.backlightConfigChanged", () => {
    if (updatingRef.current || !connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getBacklightConfig()
      .then((cfg) => {
        if (updatingRef.current) {
          return;
        }

        setTrackedConfig(cfg);
        setError(undefined);
      })
      .catch((error) => {
        console.error(
          "Failed to refresh backlight config from notification",
          error
        );
        setError(
          error instanceof Error
            ? error.message
            : "Unable to refresh lighting settings from the keyboard."
        );
      });
  });

  useSub("rpc_notification.settings.subprofileStateChanged", (data) => {
    if (!isFinishedSubprofileNotification(data)) {
      return;
    }
    void refresh();
  });

  useEffect(() => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setLoading(false);
      return;
    }
    refresh();

    const unsub = bb9981Rpc.settings.onBacklightChange((cfg) => {
      if (updatingRef.current) {
        return;
      }

      setTrackedConfig(cfg);
      setError(undefined);
    });

    return () => {
      unsub();
    };
  }, [connection.conn, connection.generation, refresh, setTrackedConfig]);

  const updateConfig = useCallback(
    async (
      nextConfig:
        | BacklightConfig
        | ((current: BacklightConfig) => BacklightConfig)
    ) => {
      const previous = configRef.current;
      if (!previous) {
        throw new Error("Backlight config is not loaded yet");
      }

      const resolvedConfig =
        typeof nextConfig === "function" ? nextConfig(previous) : nextConfig;

      updatingRef.current = true;
      setTrackedConfig(resolvedConfig);

      try {
        const result = await bb9981Rpc.settings.setBacklightConfig(resolvedConfig);
        if (result !== 0) {
          setTrackedConfig(previous);
          return result;
        }

        // Backlight changes travel through multiple firmware layers
        // (settings persistence, RGB/backlight runtime, and notification
        // propagation). Give them a little longer to settle before we
        // snapshot the canonical state back into the hook.
        await new Promise((resolve) => setTimeout(resolve, 500));
        const settled = await bb9981Rpc.settings.getBacklightConfig();
        setTrackedConfig(settled);
        return result;
      } catch (error) {
        setTrackedConfig(previous);
        throw error;
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 50));
        updatingRef.current = false;
      }
    },
    [setTrackedConfig]
  );

  return { config, loading, error, refresh, updateConfig };
}

export function useBluetoothConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<BluetoothConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const configRef = useRef<BluetoothConfig | undefined>(undefined);
  const updatingRef = useRef(false);
  // Tracks the last outputMode explicitly set by the user so that
  // notification-triggered refetches cannot overwrite the preference
  // with a stale firmware response (e.g. during BLE reconnect events).
  const lastSetOutputModeRef = useRef<"ble" | "usb" | undefined>(undefined);

  const setTrackedConfig = useCallback((next: BluetoothConfig | undefined) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const cfg = await bb9981Rpc.settings.getBluetoothConfig();
      setTrackedConfig(cfg);
    } catch (error) {
      console.error("Failed to load Bluetooth config", error);
      setTrackedConfig(undefined);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load Bluetooth settings from the keyboard."
      );
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, setTrackedConfig]);

  useSub("rpc_notification.settings.bluetoothConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    // Skip notification-driven refetch while an update is in flight.
    // The updateConfig callback handles its own post-update refresh.
    if (updatingRef.current) {
      return;
    }

    void bb9981Rpc.settings
      .getBluetoothConfig()
      .then((cfg) => {
        if (!updatingRef.current) {
          // Preserve the user's last explicitly-set outputMode.
          // Firmware can return "ble" during BLE reconnect events even
          // when the user has set USB as preferred, so we never let a
          // notification refetch overwrite a user-set preference.
          const merged = lastSetOutputModeRef.current
            ? { ...cfg, outputMode: lastSetOutputModeRef.current }
            : cfg;
          setTrackedConfig(merged);
          setError(undefined);
        }
      })
      .catch((error) => {
        console.error("Failed to refresh Bluetooth config from notification", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to refresh Bluetooth settings from the keyboard."
        );
      });
  });

  useSub("rpc_notification.settings.subprofileStateChanged", (data) => {
    if (!isFinishedSubprofileNotification(data)) {
      return;
    }
    void refresh();
  });

  useEffect(() => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setLoading(false);
      return;
    }
    refresh();
  }, [connection.conn, connection.generation, refresh, setTrackedConfig]);

  const updateConfig = useCallback(
    async (
      nextConfig:
        | BluetoothConfig
        | ((current: BluetoothConfig) => BluetoothConfig)
    ) => {
      const previous = configRef.current;
      if (!previous) {
        throw new Error("Bluetooth config is not loaded yet");
      }

      const resolvedConfig =
        typeof nextConfig === "function" ? nextConfig(previous) : nextConfig;

      // Guard: prevent notification handlers from overwriting the optimistic
      // state while the RPC round-trip is in progress and during the
      // settling period that follows.
      updatingRef.current = true;
      setTrackedConfig(resolvedConfig);

      try {
        const result = await bb9981Rpc.settings.setBluetoothConfig(resolvedConfig);
        if (result !== 0) {
          setTrackedConfig(previous);
          return result;
        }

        // The RPC succeeded. The firmware has accepted the new preferred
        // transport, but the *active* transport may not have switched yet
        // (USB enumeration takes time). The firmware also fires
        // bluetoothConfigChanged notifications from endpoint_changed and
        // ble_active_profile_changed events during this window. Keep the
        // guard up through the settling period so those notifications
        // don't clobber the optimistic state.
        await new Promise((r) => setTimeout(r, 500));

        // Now refetch the settled state. The guard is still up so any
        // concurrent notification refetches are blocked.
        // Pin the user's preferred outputMode — firmware may still report
        // the old transport during the transition window.
        lastSetOutputModeRef.current = resolvedConfig.outputMode;
        const settled = await bb9981Rpc.settings.getBluetoothConfig();
        setTrackedConfig({ ...settled, outputMode: resolvedConfig.outputMode });
        return result;
      } catch (err) {
        setTrackedConfig(previous);
        throw err;
      } finally {
        // Keep the guard up for one more tick so any notifications
        // that arrived during the settling refetch are also blocked.
        await new Promise((r) => setTimeout(r, 100));
        updatingRef.current = false;
      }
    },
    [setTrackedConfig]
  );

  const selectProfile = useCallback(async (index: number) => {
    return bb9981Rpc.settings.selectBtProfile(index);
  }, []);

  const clearProfile = useCallback(async (index: number) => {
    return bb9981Rpc.settings.clearBtProfile(index);
  }, []);

  const renameProfile = useCallback(async (index: number, name: string) => {
    return bb9981Rpc.settings.renameBtProfile(index, name);
  }, []);

  return {
    config,
    loading,
    error,
    refresh,
    updateConfig,
    selectProfile,
    clearProfile,
    renameProfile,
  };
}

export function usePowerConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<PowerConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const configRef = useRef<PowerConfig | undefined>(undefined);

  const setTrackedConfig = useCallback((next: PowerConfig | undefined) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const cfg = await bb9981Rpc.settings.getPowerConfig();
      setTrackedConfig(cfg);
    } catch (error) {
      console.error("Failed to load power config", error);
      setTrackedConfig(undefined);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load power settings from the keyboard."
      );
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, setTrackedConfig]);

  useSub("rpc_notification.settings.powerConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getPowerConfig()
      .then((cfg) => {
        setTrackedConfig(cfg);
        setError(undefined);
      })
      .catch((error) => {
        console.error("Failed to refresh power config from notification", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to refresh power settings from the keyboard."
        );
      });
  });

  useSub("rpc_notification.settings.subprofileStateChanged", (data) => {
    if (!isFinishedSubprofileNotification(data)) {
      return;
    }
    void refresh();
  });

  useEffect(() => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setLoading(false);
      return;
    }
    refresh();

    const unsub = bb9981Rpc.settings.onPowerChange((cfg) => {
      setTrackedConfig(cfg);
      setError(undefined);
    });

    return () => {
      unsub();
    };
  }, [connection.conn, connection.generation, refresh, setTrackedConfig]);

  const updateConfig = useCallback(
    async (
      nextConfig: PowerConfig | ((current: PowerConfig) => PowerConfig)
    ) => {
      const previous = configRef.current;
      if (!previous) {
        throw new Error("Power config is not loaded yet");
      }

      const resolvedConfig =
        typeof nextConfig === "function" ? nextConfig(previous) : nextConfig;

      setTrackedConfig(resolvedConfig);

      const result = await bb9981Rpc.settings.setPowerConfig(resolvedConfig);
      if (result !== 0) {
        setTrackedConfig(previous);
      }
      return result;
    },
    [setTrackedConfig]
  );

  const powerOff = useCallback(async () => {
    return bb9981Rpc.settings.powerOff();
  }, []);

  return { config, loading, error, refresh, updateConfig, powerOff };
}

export function useSleepConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<SleepConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const configRef = useRef<SleepConfig | undefined>(undefined);

  const setTrackedConfig = useCallback((next: SleepConfig | undefined) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const cfg = await bb9981Rpc.settings.getSleepConfig();
      setTrackedConfig(cfg);
    } catch (error) {
      console.error("Failed to load sleep config", error);
      setTrackedConfig(undefined);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load sleep settings from the keyboard."
      );
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, setTrackedConfig]);

  useSub("rpc_notification.settings.sleepConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getSleepConfig()
      .then((cfg) => {
        setTrackedConfig(cfg);
        setError(undefined);
      })
      .catch((error) => {
        console.error("Failed to refresh sleep config from notification", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to refresh sleep settings from the keyboard."
        );
      });
  });

  useSub("rpc_notification.settings.subprofileStateChanged", (data) => {
    if (!isFinishedSubprofileNotification(data)) {
      return;
    }
    void refresh();
  });

  useEffect(() => {
    if (!connection.conn) {
      setTrackedConfig(undefined);
      setLoading(false);
      return;
    }
    refresh();

    const unsub = bb9981Rpc.settings.onSleepChange((cfg) => {
      setTrackedConfig(cfg);
      setError(undefined);
    });

    return () => {
      unsub();
    };
  }, [connection.conn, connection.generation, refresh, setTrackedConfig]);

  const updateConfig = useCallback(
    async (
      nextConfig: SleepConfig | ((current: SleepConfig) => SleepConfig)
    ) => {
      const previous = configRef.current;
      if (!previous) {
        throw new Error("Sleep config is not loaded yet");
      }

      const resolvedConfig =
        typeof nextConfig === "function" ? nextConfig(previous) : nextConfig;

      setTrackedConfig(resolvedConfig);

      const result = await bb9981Rpc.settings.setSleepConfig(resolvedConfig);
      if (result !== 0) {
        setTrackedConfig(previous);
      }
      return result;
    },
    [setTrackedConfig]
  );

  return { config, loading, error, refresh, updateConfig };
}

export function useSubprofiles() {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [state, setState] = useState<SubProfileState | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const stateRef = useRef<SubProfileState | undefined>(undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async () => {
    if (
      !connection.conn ||
      lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const next = await bb9981Rpc.settings.getSubprofileState();
      setState(next);
      setError(undefined);
    } catch (error) {
      console.error("Failed to load subprofiles", error);
      if (!stateRef.current) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load subprofile state from the keyboard."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [connection.conn, connection.generation, lockState]);

  useSub("rpc_notification.settings.subprofileStateChanged", (data) => {
    if (!isFinishedSubprofileNotification(data)) {
      return;
    }
    void refresh();
  });

  useEffect(() => {
    if (
      !connection.conn ||
      lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setError(undefined);
      setLoading(false);
      return;
    }

    void refresh();
    const unsub = bb9981Rpc.settings.onSubprofileChange((next) => {
      setState(next);
      setError(undefined);
    });
    return () => {
      unsub();
    };
  }, [connection.conn, connection.generation, lockState, refresh]);

  const switchProfile = useCallback(async (profileIndex: number) => {
    const result = await bb9981Rpc.settings.switchSubprofile(profileIndex);

    if (result === 0) {
      setError(undefined);
      setState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          activeProfile: profileIndex,
          switching: false,
          profiles: current.profiles.map((profile) => ({
            ...profile,
            active: profile.index === profileIndex,
          })),
        };
      });

      if (connection.isWireless) {
        setLoading(false);
      } else {
        void refresh();
      }
    }

    return result;
  }, [connection.isWireless, connection.generation, refresh]);

  const renameProfile = useCallback(async (profileIndex: number, name: string) => {
    return bb9981Rpc.settings.renameSubprofile(profileIndex, name);
  }, []);

  const resetProfile = useCallback(async (profileIndex: number) => {
    return bb9981Rpc.settings.resetSubprofile(profileIndex);
  }, []);

  return { state, loading, error, refresh, switchProfile, renameProfile, resetProfile };
}
