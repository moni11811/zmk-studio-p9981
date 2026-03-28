import {
  call_rpc as inner_call_rpc,
  Request,
  RequestResponse,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";

export async function call_rpc(
  conn: RpcConnection,
  req: Omit<Request, "requestId">
): Promise<RequestResponse> {
  console.log("RPC Request", req);

  try {
    const response = await inner_call_rpc(conn, req);
    console.log("RPC Response", response);
    return response;
  } catch (error) {
    console.error("RPC Error", error);
    throw error;
  }
}
