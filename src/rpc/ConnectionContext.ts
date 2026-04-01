import { createContext } from "react";

import { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client/index";

export interface ConnectionState {
  conn: RpcConnection | null;
  generation: number;
  transportLabel?: string;
  isWireless?: boolean;
  deviceId?: string;
}

export const ConnectionContext = createContext<ConnectionState>({
  conn: null,
  generation: 0,
});
