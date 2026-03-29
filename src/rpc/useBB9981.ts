/**
 * BB9981 React Hooks
 *
 * Provides React hooks for accessing BB9981 custom subsystems.
 * Uses the BB9981 RPC layer to talk to the connected firmware instance.
 */

import { useState, useEffect, useCallback, useContext } from "react";
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
} from "./bb9981Types";
import { ConnectionContext } from "./ConnectionContext";
import { useSub } from "../usePubSub";

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
  }, [connection]);

  useEffect(() => {
    if (!connection.conn) {
      setMacros([]);
      setLoading(false);
      return;
    }
    refresh();
    const unsub = bb9981Rpc.macros.onChange(() => refresh());
    return unsub;
  }, [connection, refresh]);

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
  }, [connection, macroId]);

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
  }, [connection]);

  useEffect(() => {
    if (!connection.conn) {
      setCombos([]);
      setLoading(false);
      return;
    }
    refresh();
    const unsub = bb9981Rpc.combos.onChange(() => refresh());
    return unsub;
  }, [connection, refresh]);

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
  }, [connection, comboId]);

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

  useSub("rpc_notification.settings.trackpadConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getTrackpadConfig()
      .then((cfg) => setConfig(cfg))
      .catch((error) => {
        console.error("Failed to refresh trackpad config from notification", error);
      });
  });

  useEffect(() => {
    if (!connection.conn) {
      setConfig(undefined);
      setLoading(false);
      return;
    }
    let ignore = false;

    async function loadTrackpadConfig() {
      setLoading(true);
      try {
        const cfg = await bb9981Rpc.settings.getTrackpadConfig();
        if (!ignore) {
          setConfig(cfg);
        }
      } catch (error) {
        console.error("Failed to load trackpad config", error);
        if (!ignore) {
          setConfig(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTrackpadConfig();

    const unsub = bb9981Rpc.settings.onTrackpadChange((cfg) => {
      setConfig(cfg);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, [connection]);

  const updateConfig = useCallback(async (newConfig: TrackpadConfig) => {
    const result = await bb9981Rpc.settings.setTrackpadConfig(newConfig);
    if (result === 0) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  return { config, loading, updateConfig };
}

export function useBacklightConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<BacklightConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useSub("rpc_notification.settings.backlightConfigChanged", (cfg) => {
    setConfig(cfg as BacklightConfig);
  });

  useEffect(() => {
    if (!connection.conn) {
      setConfig(undefined);
      setLoading(false);
      return;
    }
    let ignore = false;

    async function loadBacklightConfig() {
      setLoading(true);
      try {
        const cfg = await bb9981Rpc.settings.getBacklightConfig();
        if (!ignore) {
          setConfig(cfg);
        }
      } catch (error) {
        console.error("Failed to load backlight config", error);
        if (!ignore) {
          setConfig(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBacklightConfig();

    const unsub = bb9981Rpc.settings.onBacklightChange((cfg) => {
      setConfig(cfg);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, [connection]);

  const updateConfig = useCallback(async (newConfig: BacklightConfig) => {
    const result = await bb9981Rpc.settings.setBacklightConfig(newConfig);
    if (result === 0) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  return { config, loading, updateConfig };
}

export function useBluetoothConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<BluetoothConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useSub("rpc_notification.settings.bluetoothConfigChanged", (cfg) => {
    setConfig(cfg as BluetoothConfig);
  });

  useEffect(() => {
    if (!connection.conn) {
      setConfig(undefined);
      setLoading(false);
      return;
    }
    let ignore = false;

    async function loadBluetoothConfig() {
      setLoading(true);
      try {
        const cfg = await bb9981Rpc.settings.getBluetoothConfig();
        if (!ignore) {
          setConfig(cfg);
        }
      } catch (error) {
        console.error("Failed to load Bluetooth config", error);
        if (!ignore) {
          setConfig(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBluetoothConfig();

    const unsub = bb9981Rpc.settings.onBluetoothChange((cfg) => {
      setConfig(cfg);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, [connection]);

  const updateConfig = useCallback(async (newConfig: BluetoothConfig) => {
    const result = await bb9981Rpc.settings.setBluetoothConfig(newConfig);
    if (result === 0) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  const selectProfile = useCallback(async (index: number) => {
    const ok = await bb9981Rpc.settings.selectBtProfile(index);
    if (ok) {
      setConfig((current) =>
        current ? { ...current, activeProfile: index } : current
      );
    }
    return ok;
  }, []);

  const clearProfile = useCallback(async (index: number) => {
    const ok = await bb9981Rpc.settings.clearBtProfile(index);
    if (ok) {
      setConfig((current) =>
        current
          ? {
              ...current,
              profiles: current.profiles.map((profile) =>
                profile.index === index
                  ? { ...profile, connected: false, paired: false }
                  : profile
              ),
            }
          : current
      );
    }
    return ok;
  }, []);

  const renameProfile = useCallback(async (index: number, name: string) => {
    const ok = await bb9981Rpc.settings.renameBtProfile(index, name);
    if (ok) {
      setConfig((current) =>
        current
          ? {
              ...current,
              profiles: current.profiles.map((profile) =>
                profile.index === index ? { ...profile, name } : profile
              ),
            }
          : current
      );
    }
    return ok;
  }, []);

  return { config, loading, updateConfig, selectProfile, clearProfile, renameProfile };
}

export function usePowerConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<PowerConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useSub("rpc_notification.settings.powerConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getPowerConfig()
      .then((cfg) => setConfig(cfg))
      .catch((error) => {
        console.error("Failed to refresh power config from notification", error);
      });
  });

  useEffect(() => {
    if (!connection.conn) {
      setConfig(undefined);
      setLoading(false);
      return;
    }
    let ignore = false;

    async function loadPowerConfig() {
      setLoading(true);
      try {
        const cfg = await bb9981Rpc.settings.getPowerConfig();
        if (!ignore) {
          setConfig(cfg);
        }
      } catch (error) {
        console.error("Failed to load power config", error);
        if (!ignore) {
          setConfig(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPowerConfig();

    const unsub = bb9981Rpc.settings.onPowerChange((cfg) => {
      setConfig(cfg);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, [connection]);

  const updateConfig = useCallback(async (newConfig: PowerConfig) => {
    const result = await bb9981Rpc.settings.setPowerConfig(newConfig);
    if (result === 0) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  const powerOff = useCallback(async () => {
    return bb9981Rpc.settings.powerOff();
  }, []);

  return { config, loading, updateConfig, powerOff };
}

export function useSleepConfig() {
  const connection = useContext(ConnectionContext);
  const [config, setConfig] = useState<SleepConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useSub("rpc_notification.settings.sleepConfigChanged", () => {
    if (!connection.conn) {
      return;
    }

    void bb9981Rpc.settings
      .getSleepConfig()
      .then((cfg) => setConfig(cfg))
      .catch((error) => {
        console.error("Failed to refresh sleep config from notification", error);
      });
  });

  useEffect(() => {
    if (!connection.conn) {
      setConfig(undefined);
      setLoading(false);
      return;
    }
    let ignore = false;

    async function loadSleepConfig() {
      setLoading(true);
      try {
        const cfg = await bb9981Rpc.settings.getSleepConfig();
        if (!ignore) {
          setConfig(cfg);
        }
      } catch (error) {
        console.error("Failed to load sleep config", error);
        if (!ignore) {
          setConfig(undefined);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSleepConfig();

    const unsub = bb9981Rpc.settings.onSleepChange((cfg) => {
      setConfig(cfg);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, [connection]);

  const updateConfig = useCallback(async (newConfig: SleepConfig) => {
    const result = await bb9981Rpc.settings.setSleepConfig(newConfig);
    if (result === 0) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  return { config, loading, updateConfig };
}
