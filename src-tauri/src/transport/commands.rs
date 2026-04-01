use bluest::{Adapter, DeviceId};
use futures::lock::Mutex;
use futures::Sink;
use futures::SinkExt;

use futures::channel::mpsc::SendError;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::async_runtime::JoinHandle;

use serde::{Deserialize, Serialize};

use tauri::ipc::InvokeBody;
use tauri::{command, ipc::Request, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct AvailableDevice {
    pub label: String,
    pub id: String,
}

#[derive(Debug, Default)]
pub struct ActiveConnection<'a> {
    pub conn: Mutex<Option<Box<dyn Sink<Vec<u8>, Error = SendError> + Unpin + Send + 'a>>>,
    pub ble_device_id: Mutex<Option<String>>,
    pub active_session_id: Mutex<Option<u64>>,
    pub tasks: Mutex<Option<ConnectionTasks>>,
    pub lifecycle: Mutex<()>,
    pub next_session_id: AtomicU64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionDataPayload {
    pub session_id: u64,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionDisconnectedPayload {
    pub session_id: u64,
}

#[derive(Debug)]
pub enum ConnectionTasks {
    Ble {
        notify_handle: JoinHandle<()>,
        disconnect_handle: JoinHandle<()>,
        writer_handle: JoinHandle<()>,
    },
    Serial {
        read_handle: JoinHandle<()>,
        write_handle: JoinHandle<()>,
    },
}

impl ConnectionTasks {
    pub fn abort(self) {
        match self {
            Self::Ble {
                notify_handle,
                disconnect_handle,
                writer_handle,
            } => {
                notify_handle.abort();
                disconnect_handle.abort();
                writer_handle.abort();
            }
            Self::Serial {
                read_handle,
                write_handle,
            } => {
                read_handle.abort();
                write_handle.abort();
            }
        }
    }
}

async fn close_active_connection_inner(state: &ActiveConnection<'_>) {
    *state.conn.lock().await = None;
    *state.active_session_id.lock().await = None;

    if let Some(tasks) = state.tasks.lock().await.take() {
        tasks.abort();
    }

    let ble_device_id = state.ble_device_id.lock().await.take();

    if let Some(id) = ble_device_id {
        let disconnect_result = async {
            let adapter = Adapter::default().await.ok_or("no adapter")?;
            adapter
                .wait_available()
                .await
                .map_err(|_| "adapter unavailable")?;
            let device_id: DeviceId = serde_json::from_str(&id).map_err(|_| "invalid device id")?;
            let device = adapter
                .open_device(&device_id)
                .await
                .map_err(|_| "open device failed")?;

            if device.is_connected().await {
                adapter
                    .disconnect_device(&device)
                    .await
                    .map_err(|_| "disconnect failed")?;
            }

            Ok::<(), &str>(())
        }
        .await;

        if let Err(err) = disconnect_result {
            println!("BLE transport close cleanup skipped: {}", err);
        }
    }
}

pub async fn close_active_connection(state: &ActiveConnection<'_>) {
    let _lifecycle = state.lifecycle.lock().await;
    close_active_connection_inner(state).await;
}

pub async fn close_connection_if_session_active(
    state: &ActiveConnection<'_>,
    session_id: u64,
) -> bool {
    let _lifecycle = state.lifecycle.lock().await;
    if *state.active_session_id.lock().await != Some(session_id) {
        return false;
    }

    close_active_connection_inner(state).await;
    true
}

pub async fn begin_connection_session(state: &ActiveConnection<'_>) -> u64 {
    let session_id = state.next_session_id.fetch_add(1, Ordering::Relaxed) + 1;
    *state.active_session_id.lock().await = Some(session_id);
    session_id
}

pub async fn clear_session_if_active(state: &ActiveConnection<'_>, session_id: u64) -> bool {
    let mut active = state.active_session_id.lock().await;
    if *active != Some(session_id) {
        return false;
    }

    *active = None;
    *state.conn.lock().await = None;
    *state.ble_device_id.lock().await = None;
    true
}

#[command]
pub async fn transport_send_data(
    req: Request<'_>,
    state: State<'_, ActiveConnection<'_>>,
) -> Result<(), ()> {
    if let InvokeBody::Raw(data) = req.body() {
        let mut lock = state.conn.lock().await;
        let sink = lock.as_mut().ok_or(())?;
        sink.send(data.clone()).await.map_err(|_| ())?;
    }

    Ok(())
}

#[command]
pub async fn transport_close(
    _req: Request<'_>,
    state: State<'_, ActiveConnection<'_>>,
) -> Result<(), ()> {
    close_active_connection(&state).await;
    Ok(())
}

#[command]
pub async fn transport_close_session(
    session_id: u64,
    state: State<'_, ActiveConnection<'_>>,
) -> Result<bool, ()> {
    Ok(close_connection_if_session_active(&state, session_id).await)
}
