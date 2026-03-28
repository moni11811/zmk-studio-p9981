use blocking::unblock;
use futures::channel::mpsc::channel;
use futures::StreamExt;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio_serial::{available_ports, SerialPortBuilderExt, SerialPortType};

use tauri::{command, AppHandle, State};
use tauri_plugin_cli::CliExt;

const READ_BUF_SIZE: usize = 1024;

#[command]
pub async fn serial_connect(
    id: String,
    app_handle: AppHandle,
    state: State<'_, super::commands::ActiveConnection<'_>>,
) -> Result<bool, String> {
    match tokio_serial::new(id, 9600).open_native_async() {
        Ok(mut port) => {
            #[cfg(unix)]
            if let Err(err) = port.set_exclusive(false) {
                println!("Failed to disable serial exclusive mode: {}", err);
            }

            let (mut reader, mut writer) = tokio::io::split(port);

            let ahc = app_handle.clone();
            let (send, mut recv) = channel(5);
            *state.conn.lock().await = Some(Box::new(send));

            let read_process = tauri::async_runtime::spawn(async move {
                use tauri::Emitter;
                use tauri::Manager;

                let mut buffer = vec![0; READ_BUF_SIZE];
                loop {
                    match reader.read(&mut buffer).await {
                        Ok(size) if size > 0 => {
                            let _ = app_handle.emit("connection_data", &buffer[..size]);
                        }
                        Ok(_) => break,
                        Err(err) => {
                            println!("Serial read failed: {}", err);
                            break;
                        }
                    }
                }

                let state = app_handle.state::<super::commands::ActiveConnection>();
                *state.conn.lock().await = None;

                let _ = app_handle.emit("connection_disconnected", ());
            });

            tauri::async_runtime::spawn(async move {
                use tauri::Emitter;
                use tauri::Manager;

                while let Some(data) = recv.next().await {
                    if let Err(err) = writer.write_all(&data).await {
                        println!("Serial write failed: {}", err);
                        let state = ahc.state::<super::commands::ActiveConnection>();
                        *state.conn.lock().await = None;
                        let _ = ahc.emit("connection_disconnected", ());
                        break;
                    }
                }

                let state = ahc.state::<super::commands::ActiveConnection>();
                read_process.abort();
                *state.conn.lock().await = None;
            });

            Ok(true)
        }
        Err(e) => Err(format!("Failed to open the serial port: {}", e.description)),
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

    let mut candidates = ports
        .into_iter()
        .filter_map(|pi| {
            if let SerialPortType::UsbPort(u) = pi.port_type {
                Some(super::commands::AvailableDevice {
                    id: pi.port_name,
                    label: u.product.unwrap_or("Unnamed device".to_string()),
                })
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

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
