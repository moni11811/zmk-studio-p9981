use async_std::future::timeout;
use async_std::task::sleep;
use futures::channel::oneshot;
use futures::future::ready;
use futures::{channel::mpsc::channel, FutureExt};
use futures::{StreamExt, TryFutureExt};

use std::time::Duration;
use uuid::Uuid;

use bluest::{Adapter, ConnectionEvent, DeviceId};

use tauri::{command, AppHandle, State};

const SVC_UUID: Uuid = Uuid::from_u128(0x00000000_0196_6107_c967_c5cfb1c2482a);
const RPC_CHRC_UUID: Uuid = Uuid::from_u128(0x00000001_0196_6107_c967_c5cfb1c2482a);
const POST_CONNECT_DISCOVERY_DELAY: Duration = Duration::from_millis(250);
const ADAPTER_TIMEOUT: Duration = Duration::from_secs(8);
const DISCOVERY_WINDOW: Duration = Duration::from_secs(4);
const LIST_RETRY_DELAY: Duration = Duration::from_millis(1200);
const LIST_ATTEMPTS: usize = 3;

#[command]
pub async fn gatt_connect(
    id: String,
    app_handle: AppHandle,
    state: State<'_, super::commands::ActiveConnection<'_>>,
) -> Result<u64, String> {
    super::commands::close_active_connection(&state).await;
    let session_id = super::commands::begin_connection_session(&state).await;

    let connect_result: Result<u64, String> = async {
        let adapter = Adapter::default()
            .await
            .ok_or("Failed to access the BT adapter".to_string())?;

        adapter
            .wait_available()
            .await
            .map_err(|e| format!("Failed to wait for the BT adapter access: {}", e.message()))?;

        let device_id: DeviceId = serde_json::from_str(&id)
            .map_err(|e| format!("Failed to parse BLE device id: {}", e))?;
        let d = adapter
            .open_device(&device_id)
            .await
            .map_err(|e| format!("Failed to open the device: {}", e.message()))?;

        *state.ble_device_id.lock().await = Some(id.clone());

        if !d.is_connected().await {
            adapter
                .connect_device(&d)
                .await
                .map_err(|e| format!("Failed to connect to the device: {}", e.message()))?;
            sleep(POST_CONNECT_DISCOVERY_DELAY).await;
        }

        let service = d
            .discover_services_with_uuid(SVC_UUID)
            .await
            .map_err(|e| format!("Failed to find the device services: {}", e.message()))?
            .into_iter()
            .next()
            .ok_or(
                "Failed to connect: Unable to locate the required studio GATT service".to_string(),
            )?;

        {
            let s = service;
            let char = s
                .discover_characteristics_with_uuid(RPC_CHRC_UUID)
                .await
                .map_err(|e| {
                    format!(
                        "Failed to find the studio service characteristics: {}",
                        e.message()
                    )
                })?
                .get(0)
                .cloned();

            if let Some(c) = char {
                let c2 = c.clone();
                let (notify_ready_tx, notify_ready_rx) = oneshot::channel();
                let ah1 = app_handle.clone();
                let notify_handle = tauri::async_runtime::spawn(async move {
                    use tauri::Emitter;

                    match c2.notify().await {
                        Ok(mut notifications) => {
                            let _ = notify_ready_tx.send(Ok::<(), String>(()));
                            while let Some(Ok(vn)) = notifications.next().await {
                                let _ = ah1.emit(
                                    "connection_data",
                                    super::commands::ConnectionDataPayload {
                                        session_id,
                                        data: vn.clone(),
                                    },
                                );
                            }
                        }
                        Err(err) => {
                            let _ = notify_ready_tx.send(Err(format!(
                                "Failed to enable studio notifications: {}",
                                err.message()
                            )));
                        }
                    }
                });

                notify_ready_rx.await.map_err(|_| {
                    "Studio notifications task ended before initialization".to_string()
                })??;

                let ah2 = app_handle.clone();
                let disconnect_handle = tauri::async_runtime::spawn(async move {
                    // Need to keep adapter from being dropped while active/connected
                    let a = adapter;

                    use tauri::Emitter;
                    use tauri::Manager;

                    if let Ok(mut events) = a.device_connection_events(&d).await {
                        while let Some(ev) = events.next().await {
                            if ev == ConnectionEvent::Disconnected {
                                let state = ah2.state::<super::commands::ActiveConnection>();
                                if super::commands::clear_session_if_active(&state, session_id)
                                    .await
                                {
                                    if let Err(e) = ah2.emit(
                                        "connection_disconnected",
                                        super::commands::ConnectionDisconnectedPayload {
                                            session_id,
                                        },
                                    ) {
                                        println!("ERROR RAISING! {:?}", e);
                                    }
                                }
                            }
                        }
                    };
                });

                let (send, mut recv) = channel(5);
                *state.conn.lock().await = Some(Box::new(send));
                let writer_handle = tauri::async_runtime::spawn(async move {
                    while let Some(data) = recv.next().await {
                        if let Err(err) = c.write(&data).await {
                            // Transient ATT write failures can happen under bursty traffic.
                            // Don't force disconnect here; let connection events drive state.
                            println!("BLE write failed, dropping packet: {}", err.message());
                            continue;
                        }
                    }
                });

                *state.tasks.lock().await = Some(super::commands::ConnectionTasks::Ble {
                    notify_handle,
                    disconnect_handle,
                    writer_handle,
                });

                Ok(session_id)
            } else {
                Err(
                    "Failed to connect: Unable to locate the required studio GATT characteristic"
                        .to_string(),
                )
            }
        }
    }
    .await;

    if connect_result.is_err() {
        let _ = super::commands::close_connection_if_session_active(&state, session_id).await;
    }

    connect_result
}

#[command]
pub async fn gatt_list_devices() -> Result<Vec<super::commands::AvailableDevice>, ()> {
    for attempt in 0..LIST_ATTEMPTS {
        let adapter = Adapter::default()
            .map(|a| a.ok_or(()))
            .and_then(|a| async {
                timeout(ADAPTER_TIMEOUT, a.wait_available())
                    .await
                    .map_err(|_| ())
                    .map(|_| a)
            })
            .await;

        let mut ret = vec![];

        if let Ok(a) = adapter {
            let devices = match a.discover_devices(&[SVC_UUID]).await {
                Ok(devices) => devices,
                Err(err) => {
                    println!("Failed to enumerate BLE devices: {}", err.message());
                    if attempt + 1 < LIST_ATTEMPTS {
                        sleep(LIST_RETRY_DELAY).await;
                        continue;
                    }
                    return Ok(ret);
                }
            }
            .take_until(async_std::task::sleep(DISCOVERY_WINDOW))
            .filter_map(|d| ready(d.ok()));

            futures::pin_mut!(devices);

            while let Some(device) = devices.next().await {
                let label = device.name_async().await.unwrap_or("Unknown".to_string());
                let id = match serde_json::to_string(&device.id()) {
                    Ok(id) => id,
                    Err(err) => {
                        println!("Failed to serialize BLE device id: {}", err);
                        continue;
                    }
                };

                ret.push(super::commands::AvailableDevice { label, id });
            }
        }

        if !ret.is_empty() || attempt + 1 >= LIST_ATTEMPTS {
            return Ok(ret);
        }

        sleep(LIST_RETRY_DELAY).await;
    }

    Ok(vec![])
}
