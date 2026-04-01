import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import type { AvailableDevice } from "./tauri/index";
import { Bluetooth, RefreshCw } from "lucide-react";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";

export type TransportFactory = {
  label: string;
  isWireless?: boolean;
  connect?: () => Promise<RpcTransport>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};

export interface ConnectModalProps {
  open?: boolean;
  transports: TransportFactory[];
  onTransportCreated: (
    t: RpcTransport,
    transport: TransportFactory,
    device?: AvailableDevice,
  ) => void;
}

function deviceList(
  open: boolean,
  transports: TransportFactory[],
  onTransportCreated: (
    t: RpcTransport,
    transport: TransportFactory,
    device?: AvailableDevice,
  ) => void,
) {
  const [devices, setDevices] = useState<
    Array<[TransportFactory, AvailableDevice]>
  >([]);
  const [selectedDevId, setSelectedDevId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const connectAttemptIdRef = useRef(0);

  const loadDevices = useCallback(async () => {
    if (!open) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    let entries: Array<[TransportFactory, AvailableDevice]> = [];
    for (const t of transports.filter((t) => t.pick_and_connect)) {
      const devices = await t.pick_and_connect?.list();
      if (!devices) {
        continue;
      }

      entries.push(
        ...devices.map<[TransportFactory, AvailableDevice]>((d) => {
          return [t, d];
        }),
      );
    }

    setDevices(entries);
    setRefreshing(false);
  }, [open, transports]);

  useEffect(() => {
    connectAttemptIdRef.current += 1;
    setSelectedDevId(null);
    setDevices([]);

    if (!open) {
      setRefreshing(false);
      setConnectingId(null);
      return;
    }

    void loadDevices();

    const followUpRefresh = window.setTimeout(() => {
      void loadDevices();
    }, 2500);

    return () => {
      window.clearTimeout(followUpRefresh);
    };
  }, [loadDevices, open]);

  const onRefresh = useCallback(() => {
    if (!open) {
      return;
    }

    setSelectedDevId(null);
    setDevices([]);

    void loadDevices();
  }, [loadDevices, open]);

  const onSelect = useCallback(
    async (selectedId: string) => {
      const attemptId = ++connectAttemptIdRef.current;
      setSelectedDevId(selectedId);
      const dev = devices.find(([_t, d]) => d.id === selectedId);
      if (!dev) {
        return;
      }

      setConnectingId(selectedId);
      dev[0]
        .pick_and_connect!.connect(dev[1])
        .then((transport) => {
          if (attemptId !== connectAttemptIdRef.current) {
            transport.abortController.abort(
              "Superseded Bluetooth connection selection",
            );
            return;
          }

          onTransportCreated(transport, dev[0], dev[1]);
        })
        .catch((e) => {
          if (attemptId !== connectAttemptIdRef.current) {
            return;
          }

          console.error(e);
          if (e instanceof Error) {
            alert(e.message);
          } else {
            alert(String(e));
          }
        })
        .finally(() => {
          if (attemptId === connectAttemptIdRef.current) {
            setConnectingId(null);
          }
        });
    },
    [devices, onTransportCreated],
  );

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto]">
        <label>Select A Device:</label>
        <button
          className="p-1 rounded hover:bg-base-300 disabled:bg-base-100 disabled:opacity-75"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            className={`size-5 transition-transform ${
              refreshing ? "animate-spin" : ""
            }`}
          />
        </button>
      </div>
      <div className="flex flex-col gap-1 pt-1">
        {devices.map(([t, d]) => {
          const isSelected = selectedDevId === d.id;
          const isConnecting = connectingId === d.id;

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => void onSelect(d.id)}
              disabled={refreshing || isConnecting}
              className={`grid grid-cols-[1em_1fr_auto] items-center gap-2 rounded px-2 py-2 text-left transition-colors ${
                isSelected
                  ? "bg-blue-50 ring-1 ring-blue-300"
                  : "hover:bg-base-300"
              }`}
            >
              {t.isWireless ? (
                <Bluetooth className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-base-content/40" />
              )}
              <span>
                {t.isWireless ? "Bluetooth" : "USB Wired"}
                <span className="block text-xs opacity-70">{d.label}</span>
              </span>
              {isConnecting && (
                <span className="text-xs text-gray-500">Connecting...</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function simpleDevicePicker(
  transports: TransportFactory[],
  onTransportCreated: (
    t: RpcTransport,
    transport: TransportFactory,
    device?: AvailableDevice,
  ) => void,
) {
  const [availableDevices, setAvailableDevices] = useState<
    AvailableDevice[] | undefined
  >(undefined);
  const [selectedTransport, setSelectedTransport] = useState<
    TransportFactory | undefined
  >(undefined);

  useEffect(() => {
    if (!selectedTransport) {
      setAvailableDevices(undefined);
      return;
    }

    let ignore = false;

    if (selectedTransport.connect) {
      async function connectTransport() {
        try {
          const currentTransport = selectedTransport;
          const transport = await selectedTransport?.connect?.();

          if (!ignore) {
            if (transport) {
              onTransportCreated(transport, currentTransport!);
            }
            setSelectedTransport(undefined);
          }
        } catch (e) {
          if (!ignore) {
            console.error(e);
            if (e instanceof Error && !(e instanceof UserCancelledError)) {
              alert(e.message);
            }
            setSelectedTransport(undefined);
          }
        }
      }

      connectTransport();
    } else {
      async function loadAvailableDevices() {
        const devices = await selectedTransport?.pick_and_connect?.list();

        if (!ignore) {
          setAvailableDevices(devices);
        }
      }

      loadAvailableDevices();
    }

    return () => {
      ignore = true;
    };
  }, [selectedTransport]);

  let connections = transports.map((t) => (
    <li key={t.label} className="list-none">
      <button
        className="bg-base-300 hover:bg-primary hover:text-primary-content rounded px-2 py-1"
        type="button"
        onClick={async () => setSelectedTransport(t)}
      >
        {t.label}
      </button>
    </li>
  ));
  return (
    <div>
      <p className="text-sm">Select a connection type.</p>
      <ul className="flex gap-2 pt-2">{connections}</ul>
      {selectedTransport && availableDevices && (
        <ul>
          {availableDevices.map((d) => (
            <li
              key={d.id}
              className="m-1 p-1"
              onClick={async () => {
                onTransportCreated(
                  await selectedTransport!.pick_and_connect!.connect(d),
                  selectedTransport!,
                );
                setSelectedTransport(undefined);
              }}
            >
              {d.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function noTransportsOptionsPrompt() {
  return (
    <div className="m-4 flex flex-col gap-2">
      <p>
        Your browser is not supported. ZMK Studio uses either{" "}
        <ExternalLink href="https://caniuse.com/web-serial">
          Web Serial
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink href="https://caniuse.com/web-bluetooth">
          Web Bluetooth
        </ExternalLink>{" "}
        (Linux only) to connect to ZMK devices.
      </p>

      <div>
        <p>To use ZMK Studio, either:</p>
        <ul className="list-disc list-inside">
          <li>
            Use a browser that supports the above web technologies, e.g.
            Chrome/Edge, or
          </li>
          <li>
            Download our{" "}
            <ExternalLink href="/download">
              cross platform application
            </ExternalLink>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}

function connectOptions(
  transports: TransportFactory[],
  onTransportCreated: (t: RpcTransport, transport: TransportFactory) => void,
  open?: boolean,
) {
  const useSimplePicker = useMemo(
    () => transports.every((t) => !t.pick_and_connect),
    [transports],
  );

  return useSimplePicker
    ? simpleDevicePicker(transports, onTransportCreated)
    : deviceList(open || false, transports, onTransportCreated);
}

export const ConnectModal = ({
  open,
  transports,
  onTransportCreated,
}: ConnectModalProps) => {
  const dialog = useModalRef(open || false, false, false);

  const haveTransports = useMemo(() => transports.length > 0, [transports]);

  return (
    <GenericModal ref={dialog} className="max-w-xl">
      <h1 className="text-xl">Welcome to ZMK Studio</h1>
      {haveTransports
        ? connectOptions(transports, onTransportCreated, open)
        : noTransportsOptionsPrompt()}
    </GenericModal>
  );
};
