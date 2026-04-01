import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { AvailableDevice } from ".";

const CONNECT_TIMEOUT_MS = 15000;
const LIST_RETRY_DELAY_MS = 1200;

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export async function list_devices(): Promise<Array<AvailableDevice>> {
  let devices = await invoke<Array<AvailableDevice>>("gatt_list_devices");
  if (devices.length > 0) {
    return devices;
  }

  await new Promise((resolve) => setTimeout(resolve, LIST_RETRY_DELAY_MS));
  devices = await invoke<Array<AvailableDevice>>("gatt_list_devices");
  return devices;
}

export async function connect(dev: AvailableDevice): Promise<RpcTransport> {
  let sessionId = 0;

  try {
    sessionId = await withTimeout(
      invoke<number>("gatt_connect", dev),
      CONNECT_TIMEOUT_MS,
      "BLE connection timed out. Please try again."
    );
  } catch (error) {
    await invoke("transport_close");
    throw error;
  }

  if (!sessionId) {
    await invoke("transport_close");
    throw new Error("Failed to connect");
  }

  let abortController = new AbortController();

  let writable = new WritableStream({
    async write(chunk, _controller) {
      await invoke("transport_send_data", new Uint8Array(chunk));
    },
  });

  let { writable: response_writable, readable } = new TransformStream();

  const unlisten_data = await listen(
    "connection_data",
    async (event: { payload: { session_id: number; data: Array<number> } }) => {
      if (event.payload.session_id !== sessionId) {
        return;
      }
      let writer = response_writable.getWriter();
      await writer.write(new Uint8Array(event.payload.data));
      writer.releaseLock();
    }
  );

  const unlisten_disconnected = await listen(
    "connection_disconnected",
    async (event: { payload?: { session_id: number } }) => {
      if (event.payload?.session_id !== sessionId) {
        return;
      }
      unlisten_data();
      unlisten_disconnected();
      response_writable.close();
    }
  );

  let signal = abortController.signal;

  let abort_cb = async (_reason: any) => {
    unlisten_data();
    unlisten_disconnected();
    await invoke("transport_close_session", { sessionId });
    signal.removeEventListener("abort", abort_cb);
  };

  signal.addEventListener("abort", abort_cb);

  return { label: dev.label, abortController, readable, writable };
}
