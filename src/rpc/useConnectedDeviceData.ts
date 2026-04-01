import React, { SetStateAction, useContext, useEffect, useState } from "react";
import { ConnectionContext } from "./ConnectionContext";

import { call_rpc } from "./logging";

import { Request, RequestResponse } from "@zmkfirmware/zmk-studio-ts-client";
import { LockStateContext } from "./LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";

export function useConnectedDeviceData<T>(
  req: Omit<Request, "requestId">,
  response_mapper: (resp: RequestResponse) => T | undefined,
  requireUnlock?: boolean
): [T | undefined, React.Dispatch<SetStateAction<T | undefined>>] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(
    () => {
      if (
        !connection.conn ||
        (requireUnlock &&
          lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED)
      ) {
        setData(undefined);
        return;
      }

      let ignore = false;

      async function startRequest() {
        if (!connection.conn) {
          return;
        }

        try {
          let response = response_mapper(await call_rpc(connection.conn, req));

          if (!ignore) {
            setData(response);
          }
        } catch (error) {
          console.error("Failed to fetch connected device data", error);
          if (!ignore) {
            setData(undefined);
          }
        }
      }

      startRequest();

      return () => {
        ignore = true;
      };
    },
    requireUnlock
      ? [connection.conn, connection.generation, requireUnlock, lockState]
      : [connection.conn, connection.generation, requireUnlock]
  );

  return [data, setData];
}
