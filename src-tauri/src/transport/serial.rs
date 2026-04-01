use blocking::unblock;
use futures::channel::mpsc::channel;
use futures::StreamExt;
use std::collections::{HashMap, HashSet};
use std::time::Duration;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio_serial::{available_ports, SerialPortBuilderExt, SerialPortType};

use tauri::{command, AppHandle, State};
use tauri_plugin_cli::CliExt;

const READ_BUF_SIZE: usize = 1024;
const SERIAL_CONNECT_RETRY_ATTEMPTS: usize = 8;
const SERIAL_CONNECT_RETRY_DELAY_MS: u64 = 150;

#[command]
pub async fn serial_connect(
    id: String,
    app_handle: AppHandle,
    state: State<'_, super::commands::ActiveConnection<'_>>,
) -> Result<u64, String> {
    super::commands::close_active_connection(&state).await;
    let session_id = super::commands::begin_connection_session(&state).await;

    let mut last_error = None;

    for attempt in 0..SERIAL_CONNECT_RETRY_ATTEMPTS {
        let builder = tokio_serial::new(&id, 9600);
        match builder.open_native_async() {
            Ok(mut port) => {
                #[cfg(unix)]
                {
                    if let Err(err) = port.set_exclusive(false) {
                        return Err(format!(
                            "Failed to configure the serial port for shared access: {}",
                            err
                        ));
                    }
                }

                *state.ble_device_id.lock().await = None;

                let (mut reader, mut writer) = tokio::io::split(port);

                let (send, mut recv) = channel(5);
                *state.conn.lock().await = Some(Box::new(send));

                let read_app_handle = app_handle.clone();
                let read_process = tauri::async_runtime::spawn(async move {
                    use tauri::Emitter;
                    use tauri::Manager;

                    let mut buffer = vec![0; READ_BUF_SIZE];
                    loop {
                        match reader.read(&mut buffer).await {
                            Ok(size) if size > 0 => {
                                let _ = read_app_handle.emit(
                                    "connection_data",
                                    super::commands::ConnectionDataPayload {
                                        session_id,
                                        data: buffer[..size].to_vec(),
                                    },
                                );
                            }
                            Ok(_) => break,
                            Err(err) => {
                                println!("Serial read failed: {}", err);
                                break;
                            }
                        }
                    }

                    let state = read_app_handle.state::<super::commands::ActiveConnection>();
                    if super::commands::clear_session_if_active(&state, session_id).await {
                        let _ = read_app_handle.emit(
                            "connection_disconnected",
                            super::commands::ConnectionDisconnectedPayload { session_id },
                        );
                    }
                });

                let ahc = app_handle.clone();
                let write_process = tauri::async_runtime::spawn(async move {
                    use tauri::Emitter;
                    use tauri::Manager;

                    while let Some(data) = recv.next().await {
                        if let Err(err) = writer.write_all(&data).await {
                            println!("Serial write failed: {}", err);
                            let state = ahc.state::<super::commands::ActiveConnection>();
                            if super::commands::clear_session_if_active(&state, session_id).await {
                                let _ = ahc.emit(
                                    "connection_disconnected",
                                    super::commands::ConnectionDisconnectedPayload { session_id },
                                );
                            }
                            break;
                        }
                    }
                });

                *state.tasks.lock().await = Some(super::commands::ConnectionTasks::Serial {
                    read_handle: read_process,
                    write_handle: write_process,
                });

                return Ok(session_id);
            }
            Err(e) => {
                last_error = Some(e.description);
                if attempt + 1 < SERIAL_CONNECT_RETRY_ATTEMPTS {
                    async_std::task::sleep(Duration::from_millis(SERIAL_CONNECT_RETRY_DELAY_MS))
                        .await;
                    continue;
                }
            }
        }
    }

    let _ = super::commands::close_connection_if_session_active(&state, session_id).await;

    match last_error {
        Some(description) => Err(format!("Failed to open the serial port: {}", description)),
        None => Err("Failed to open the serial port.".to_string()),
    }
}

#[command]
pub async fn serial_list_devices(
    app_handle: AppHandle,
) -> Result<Vec<super::commands::AvailableDevice>, ()> {
    let ports = match unblock(|| available_ports()).await {
        Ok(ports) => ports,
        Err(err) => {
            println!("Failed to enumerate serial ports: {}", err);
            vec![]
        }
    };

    let usb_ports = ports
        .into_iter()
        .filter_map(|pi| {
            if let SerialPortType::UsbPort(u) = pi.port_type {
                let product = u.product.unwrap_or_else(|| "USB Device".to_string());
                let manufacturer = u.manufacturer.unwrap_or_default();
                let lower_port_name = pi.port_name.to_ascii_lowercase();
                let lower_product = product.to_ascii_lowercase();
                let lower_manufacturer = manufacturer.to_ascii_lowercase();

                if lower_port_name.contains("debug")
                    || lower_product.contains("debug")
                    || lower_product.contains("console")
                    || lower_manufacturer.contains("debug")
                {
                    return None;
                }

                let transport_hint = if lower_port_name.contains("usbmodem")
                    || lower_port_name.contains("usbserial")
                {
                    "USB Wired"
                } else {
                    "USB Device"
                };

                Some((
                    pi.port_name.clone(),
                    format!("{} ({})", transport_hint, pi.port_name),
                ))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    let mut by_suffix: HashMap<String, Vec<(String, String)>> = HashMap::new();
    for (id, label) in usb_ports {
        let suffix = id
            .strip_prefix("/dev/cu.")
            .or_else(|| id.strip_prefix("/dev/tty."))
            .unwrap_or(&id)
            .to_string();
        by_suffix.entry(suffix).or_default().push((id, label));
    }

    let mut candidates = by_suffix
        .into_values()
        .filter_map(|mut entries| {
            entries.sort_by(|a, b| a.0.cmp(&b.0));
            entries
                .iter()
                .find(|(id, _)| id.starts_with("/dev/cu."))
                .cloned()
                .or_else(|| entries.into_iter().next())
        })
        .map(|(id, label)| super::commands::AvailableDevice { id, label })
        .collect::<Vec<_>>();

    candidates.sort_by(|a, b| a.id.cmp(&b.id));
    let mut seen_ids = HashSet::new();
    candidates.retain(|device| seen_ids.insert(device.id.clone()));

    match app_handle.cli().matches() {
        Ok(m) => {
            if let Some(p) = m.args.get("serial-port") {
                if let serde_json::Value::String(path) = &p.value {
                    candidates.push(super::commands::AvailableDevice {
                        id: path.to_string(),
                        label: format!("CLI Port: {path}").to_string(),
                    })
                }
            }
        }
        Err(_) => {}
    }

    Ok(candidates)
}
