import { AppHeader } from "./AppHeader";

import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";
import { MetaError } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./rpc/logging";
import { invoke } from "@tauri-apps/api/core";

import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConnectModal, TransportFactory } from "./ConnectModal";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { connect as gatt_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { connect as serial_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import {
  connect as tauri_ble_connect,
  list_devices as ble_list_devices,
} from "./tauri/ble";
import {
  connect as tauri_serial_connect,
  list_devices as serial_list_devices,
} from "./tauri/serial";
import Keyboard from "./keyboard/Keyboard";
import { UndoRedoContext, useUndoRedo } from "./undoRedo";
import { usePub, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { UnlockModal } from "./UnlockModal";
import { valueAfter } from "./misc/async";
import { AppFooter } from "./AppFooter";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { bb9981Rpc, setBb9981RpcConnection } from "./rpc/bb9981Rpc";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: object;
  }
}

const IS_TAURI_APP = !!window.__TAURI_INTERNALS__;

const TRANSPORTS: TransportFactory[] = IS_TAURI_APP
  ? [
      {
        label: "BLE",
        isWireless: true,
        pick_and_connect: {
          connect: tauri_ble_connect,
          list: ble_list_devices,
        },
      },
      {
        label: "USB",
        pick_and_connect: {
          connect: tauri_serial_connect,
          list: serial_list_devices,
        },
      },
    ]
  : [
      navigator.serial && { label: "USB", connect: serial_connect },
      ...(navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0
        ? [{ label: "BLE", connect: gatt_connect }]
        : []),
    ].filter((t) => t !== undefined);

async function listen_for_notifications(
  notification_stream: ReadableStream<Notification>,
  signal: AbortSignal,
): Promise<void> {
  let reader = notification_stream.getReader();
  const onAbort = () => {
    reader.cancel();
    reader.releaseLock();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  do {
    let pub = usePub();

    try {
      let { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      console.log("Notification", value);
      pub("rpc_notification", value);

      const subsystem = Object.entries(value).find(
        ([_k, v]) => v !== undefined,
      );
      if (!subsystem) {
        continue;
      }

      const [subId, subData] = subsystem;
      const event = Object.entries(subData).find(([_k, v]) => v !== undefined);

      if (!event) {
        continue;
      }

      const [eventName, eventData] = event;
      const topic = ["rpc_notification", subId, eventName].join(".");

      pub(topic, eventData);
    } catch (e) {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
      throw e;
    }
  } while (true);

  signal.removeEventListener("abort", onAbort);
  reader.releaseLock();
  notification_stream.cancel();
}

async function connect(
  transport: RpcTransport,
  transportFactory: TransportFactory,
  deviceId: string | undefined,
  generation: number,
  setConn: Dispatch<SetStateAction<ConnectionState>>,
  setConnectedDeviceName: Dispatch<string | undefined>,
  signal: AbortSignal,
  onTransportClosed?: () => void,
  isCurrentGeneration?: () => boolean,
) {
  let conn = await create_rpc_connection(transport, { signal });
  const MAX_DEVICE_INFO_ATTEMPTS = 8;
  const DEVICE_INFO_RETRY_DELAY_MS = 400;

  let details = undefined;

  for (let attempt = 0; attempt < MAX_DEVICE_INFO_ATTEMPTS; attempt++) {
    if (signal.aborted || (isCurrentGeneration && !isCurrentGeneration())) {
      transport.abortController.abort("Superseded connection attempt");
      return;
    }

    details = await Promise.race([
      call_rpc(conn, { core: { getDeviceInfo: true } })
        .then((r) => r?.core?.getDeviceInfo)
        .catch((e) => {
          console.error(`Failed device info RPC attempt ${attempt + 1}`, e);
          return undefined;
        }),
      valueAfter(undefined, 1200),
    ]);

    if (details) {
      break;
    }

    if (attempt + 1 < MAX_DEVICE_INFO_ATTEMPTS) {
      await valueAfter(undefined, DEVICE_INFO_RETRY_DELAY_MS);
    }
  }

  if (!details) {
    transport.abortController.abort("Initial device info RPC failed");
    // TODO: Show a proper toast/alert not using `window.alert`
    window.alert("Failed to connect to the chosen device");
    return;
  }

  if (signal.aborted || (isCurrentGeneration && !isCurrentGeneration())) {
    transport.abortController.abort("Superseded connection attempt");
    return;
  }

  let transportClosed = false;
  const closeTransport = (reason: string) => {
    if (transportClosed) {
      return;
    }

    transportClosed = true;
    try {
      transport.abortController.abort(reason);
    } catch (error) {
      console.error("Failed to abort transport", error);
    }
  };

  listen_for_notifications(conn.notification_readable, signal)
    .then(() => {
      closeTransport("Notification stream ended");
      onTransportClosed?.();
      setConnectedDeviceName(undefined);
      setConn((current) => ({ ...current, conn: null, generation }));
    })
    .catch((error) => {
      console.error("Notification stream failed", error);
      closeTransport("Notification stream failed");
      onTransportClosed?.();
      setConnectedDeviceName(undefined);
      setConn((current) => ({ ...current, conn: null, generation }));
    });

  setConnectedDeviceName(details.name);
  setConn({
    conn,
    generation,
    transportLabel: transportFactory.label,
    isWireless: transportFactory.isWireless,
    deviceId,
  });
}

function App() {
  const [mainView, setMainView] = useState<"keymap" | "subprofiles" | "global">(
    "keymap",
  );
  const [conn, setConn] = useState<ConnectionState>({
    conn: null,
    generation: 0,
  });
  const [connectedDeviceName, setConnectedDeviceName] = useState<
    string | undefined
  >(undefined);
  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [connectionAbort, setConnectionAbort] = useState(new AbortController());
  const activeTransportAbort = useRef<AbortController | null>(null);
  const [sessionResetKey, setSessionResetKey] = useState(0);
  const connectionGeneration = useRef(0);

  const [lockState, setLockState] = useState<LockState>(
    LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED,
  );
  const usbConnected =
    !!conn.conn && conn.transportLabel === "USB" && conn.isWireless !== true;

  useSub("rpc_notification.core.lockStateChanged", (ls) => {
    setLockState(ls);
  });

  useEffect(() => {
    setBb9981RpcConnection(conn.conn);
  }, [conn]);

  const resetDisconnectedSession = useCallback(() => {
    connectionGeneration.current += 1;
    const generation = connectionGeneration.current;
    activeTransportAbort.current = null;
    setConnectedDeviceName(undefined);
    setConn({ conn: null, generation });
    setConnectionAbort(new AbortController());
    setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    reset();
    setSessionResetKey((value) => value + 1);
  }, [reset]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        activeTransportAbort.current?.abort("Window unloading");
      } catch (error) {
        console.error("Failed to abort active transport on unload", error);
      }

      void invoke("transport_close").catch(() => undefined);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!conn) {
      reset();
      setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    }

    async function updateLockState() {
      if (!conn.conn) {
        return;
      }

      try {
        let locked_resp = await call_rpc(conn.conn, {
          core: { getLockState: true },
        });

        setLockState(
          locked_resp.core?.getLockState ||
            LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED,
        );
      } catch (error) {
        console.error("Failed to update lock state", error);
        setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
      }
    }

    void updateLockState();
  }, [conn, setLockState]);

  const save = useCallback(() => {
    async function doSave() {
      try {
        if (!conn.conn) {
          return;
        }

        let resp = await call_rpc(conn.conn, { keymap: { saveChanges: true } });
        if (!resp.keymap?.saveChanges || resp.keymap?.saveChanges.err) {
          console.error("Failed to save changes", resp.keymap?.saveChanges);
        }

        await bb9981Rpc.macros.saveChanges();
        await bb9981Rpc.combos.saveChanges();
        await bb9981Rpc.settings.saveChanges();
      } catch (error) {
        console.error("Failed to save pending changes", error);
      }
    }

    void doSave();
  }, [conn]);

  const discard = useCallback(() => {
    async function doDiscard() {
      try {
        if (!conn.conn) {
          return;
        }

        let resp = await call_rpc(conn.conn, {
          keymap: { discardChanges: true },
        });
        if (!resp.keymap?.discardChanges) {
          console.error("Failed to discard changes", resp);
        }

        await bb9981Rpc.macros.discardChanges();
        await bb9981Rpc.combos.discardChanges();
        await bb9981Rpc.settings.discardChanges();

        reset();
        setConn((current) => ({ ...current, conn: current.conn }));
      } catch (error) {
        console.error("Failed to discard pending changes", error);
      }
    }

    void doDiscard();
  }, [conn]);

  const resetSettings = useCallback(() => {
    async function doReset() {
      try {
        if (!conn.conn) {
          return;
        }

        let resp = await call_rpc(conn.conn, {
          core: { resetSettings: true },
        });
        if (!resp.core?.resetSettings) {
          console.error("Failed to settings reset", resp);
        }

        reset();
        setConn((current) => ({ ...current, conn: current.conn }));
      } catch (error) {
        console.error("Failed to reset settings", error);
      }
    }

    void doReset();
  }, [conn]);

  const disconnect = useCallback(() => {
    async function doDisconnect() {
      const disconnectGeneration = connectionGeneration.current;
      try {
        if (conn.conn) {
          await conn.conn.request_writable.close();
        }
      } catch (error) {
        console.error("Failed to disconnect cleanly", error);
      } finally {
        activeTransportAbort.current?.abort("User disconnected");
        connectionAbort.abort("User disconnected");
        await invoke("transport_close").catch(() => undefined);
        if (connectionGeneration.current === disconnectGeneration) {
          resetDisconnectedSession();
        }
      }
    }

    void doDisconnect();
  }, [conn, connectionAbort, resetDisconnectedSession]);

  const onConnect = useCallback(
    (
      t: RpcTransport,
      transportFactory: TransportFactory,
      device?: { id: string },
    ) => {
      const generation = connectionGeneration.current + 1;
      connectionGeneration.current = generation;
      connectionAbort.abort("Replacing a pending connection attempt");
      activeTransportAbort.current?.abort("Replacing an active connection");
      const ac = new AbortController();
      setConnectionAbort(ac);
      activeTransportAbort.current = t.abortController;
      void connect(
        t,
        transportFactory,
        device?.id,
        generation,
        setConn,
        setConnectedDeviceName,
        ac.signal,
        () => {
          if (connectionGeneration.current === generation) {
            resetDisconnectedSession();
          }
        },
        () => connectionGeneration.current === generation,
      ).catch((error) => {
        console.error("Failed to establish Studio connection", error);
        if (connectionGeneration.current === generation) {
          resetDisconnectedSession();
        }
      });
    },
    [
      resetDisconnectedSession,
      setConn,
      setConnectedDeviceName,
      setConnectedDeviceName,
    ],
  );

  const flashLatestFirmware = useCallback(async () => {
    if (!window.__TAURI_INTERNALS__) {
      window.alert("Firmware flashing is available in the macOS app only.");
      return;
    }

    if (!usbConnected) {
      window.alert(
        "Firmware flashing is only available while connected over wired USB.",
      );
      return;
    }

    const activeConn = conn.conn;
    if (!activeConn) {
      window.alert("No wired USB keyboard connection is active.");
      return;
    }

    try {
      let shouldRequestBootloaderReboot = true;

      try {
        const rebootAccepted = await bb9981Rpc.settings.rebootToBootloader();
        shouldRequestBootloaderReboot = rebootAccepted;
      } catch (error) {
        if (!(error instanceof MetaError) || error.condition !== 2) {
          throw error;
        }
        shouldRequestBootloaderReboot = false;
      }

      if (shouldRequestBootloaderReboot) {
        await valueAfter(undefined, 350);
      }

      if (!shouldRequestBootloaderReboot && !conn.deviceId) {
        throw new Error(
          "This firmware does not support automatic bootloader entry, and the USB port path is unavailable.",
        );
      }

      try {
        await activeConn.request_writable.close();
      } catch (_error) {}

      activeTransportAbort.current?.abort(
        "Entering bootloader to flash firmware",
      );
      activeTransportAbort.current = null;
      connectionAbort.abort("Entering bootloader to flash firmware");
      await invoke("transport_close").catch(() => undefined);
      resetDisconnectedSession();
      await valueAfter(undefined, shouldRequestBootloaderReboot ? 1400 : 500);

      const flashedPath = await invoke<string>("flash_latest_firmware_guided", {
        serialPortPath: conn.deviceId ?? null,
        bootloaderRequested: shouldRequestBootloaderReboot,
      });

      window.alert(`Flashed latest firmware to ${flashedPath}`);
    } catch (error) {
      console.error("Failed to flash latest firmware", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to flash the latest firmware.",
      );
    }
  }, [conn, connectionAbort, resetDisconnectedSession, usbConnected]);

  return (
    <ConnectionContext.Provider value={conn}>
      <LockStateContext.Provider value={lockState}>
        <UndoRedoContext.Provider value={doIt}>
          <div key={sessionResetKey} className="contents">
            <UnlockModal />
            <ConnectModal
              open={!conn.conn}
              transports={TRANSPORTS}
              onTransportCreated={onConnect}
            />
            <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
            <LicenseNoticeModal
              open={showLicenseNotice}
              onClose={() => setShowLicenseNotice(false)}
            />
            <div className="bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] grid-rows-[auto_1fr_auto] overflow-hidden">
              <AppHeader
                connectedDeviceLabel={connectedDeviceName}
                showEditorActions={mainView === "keymap"}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onSave={save}
                onDiscard={discard}
                onDisconnect={disconnect}
                onFlashLatestFirmware={flashLatestFirmware}
                canFlashLatestFirmware={usbConnected}
                onResetSettings={resetSettings}
              />
              <Keyboard onMainViewChanged={setMainView} />
              <AppFooter
                onShowAbout={() => setShowAbout(true)}
                onShowLicenseNotice={() => setShowLicenseNotice(true)}
              />
            </div>
          </div>
        </UndoRedoContext.Provider>
      </LockStateContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default App;
