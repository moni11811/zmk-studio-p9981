import { UserCancelledError } from './errors';
const SERVICE_UUID = '00000000-0196-6107-c967-c5cfb1c2482a';
const RPC_CHRC_UUID = '00000001-0196-6107-c967-c5cfb1c2482a';
export async function connect() {
    let dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
    }).catch((e) => {
        if (e instanceof DOMException && e.name == "NotFoundError") {
            throw new UserCancelledError("User cancelled the connection attempt", { cause: e });
        }
        else {
            throw e;
        }
    });
    if (!dev.gatt) {
        filters: {
            throw 'No GATT service!';
        }
    }
    let abortController = new AbortController();
    let label = dev.name || 'Unknown';
    if (!dev.gatt.connected) {
        await dev.gatt.connect();
    }
    let svc = await dev.gatt.getPrimaryService(SERVICE_UUID);
    let char = await svc.getCharacteristic(RPC_CHRC_UUID);
    let readable = new ReadableStream({
        async start(controller) {
            // Reconnect to the same device will lose notifications if we don't first force a stop before starting again.
            await char.stopNotifications();
            await char.startNotifications();
            let vc = (ev) => {
                let buf = ev.target?.value
                    ?.buffer;
                if (!buf) {
                    return;
                }
                controller.enqueue(new Uint8Array(buf));
            };
            char.addEventListener('characteristicvaluechanged', vc);
            let cb = async () => {
                char.removeEventListener('characteristicvaluechanged', vc);
                dev.removeEventListener('gattserverdisconnected', cb);
                controller.close();
            };
            dev.addEventListener('gattserverdisconnected', cb);
        },
    });
    let writable = new WritableStream({
        write(chunk) {
            return char.writeValueWithoutResponse(chunk);
        },
    });
    let sig = abortController.signal;
    let abort_cb;
    abort_cb = async (ev) => {
        sig.removeEventListener("abort", abort_cb);
        dev.gatt?.disconnect();
    };
    sig.addEventListener("abort", abort_cb);
    return { label, abortController, readable, writable };
}
