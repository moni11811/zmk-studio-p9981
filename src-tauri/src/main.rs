// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::thread;
use std::time::{Duration, Instant};

use futures::lock::Mutex;
use tauri::command;
use tauri::{AppHandle, Manager};

mod keymap_source;
mod transport;
use keymap_source::{detect_keymap_source, read_keymap_source, write_keymap_source};
use transport::commands::{
    transport_close, transport_close_session, transport_send_data, ActiveConnection,
};

use transport::gatt::{gatt_connect, gatt_list_devices};
use transport::serial::{serial_connect, serial_list_devices};

const LATEST_FIRMWARE_PATH: &str =
    "/Users/Moni11811/Downloads/BB9981/zmk-main/app/build-subprofiles-real/zephyr/zmk.uf2";

fn resolve_latest_firmware_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|err| format!("Failed to resolve app resource directory: {}", err))?;

    for bundled in [
        resource_dir.join("firmware/latest/zmk.uf2"),
        resource_dir.join("resources/firmware/latest/zmk.uf2"),
    ] {
        if bundled.exists() {
            return Ok(bundled);
        }
    }

    let fallback = PathBuf::from(LATEST_FIRMWARE_PATH);
    if fallback.exists() {
        return Ok(fallback);
    }

    Err(format!(
        "Latest firmware is not available in the app bundle or at {}",
        fallback.display()
    ))
}

fn list_uf2_volumes() -> Result<Vec<PathBuf>, String> {
    let volumes_root = PathBuf::from("/Volumes");
    let entries = fs::read_dir(&volumes_root)
        .map_err(|err| format!("Failed to enumerate mounted volumes: {}", err))?;

    let mut volumes = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|err| format!("Failed to read mounted volume entry: {}", err))?;
        let path = entry.path();
        if path.join("INFO_UF2.TXT").exists() {
            volumes.push(path);
        }
    }

    Ok(volumes)
}

fn detect_new_uf2_volume(existing: &[PathBuf]) -> Result<Option<PathBuf>, String> {
    let current = list_uf2_volumes()?;
    Ok(current
        .iter()
        .find(|path| !existing.contains(path))
        .cloned()
        .or_else(|| {
            if current.len() == 1 {
                current.first().cloned()
            } else {
                None
            }
        }))
}

fn copy_latest_firmware_to_volume(
    source: &PathBuf,
    target_root: &PathBuf,
) -> Result<String, String> {
    let file_name = source
        .file_name()
        .ok_or_else(|| "Latest firmware file name is invalid".to_string())?;
    let target_path = target_root.join(file_name);

    fs::copy(source, &target_path).map_err(|err| {
        format!(
            "Failed to copy firmware to {}: {}",
            target_path.display(),
            err
        )
    })?;

    Ok(target_path.display().to_string())
}

#[command]
fn flash_latest_firmware(app_handle: AppHandle, target_dir: String) -> Result<String, String> {
    let source = resolve_latest_firmware_path(&app_handle)?;
    let target_root = PathBuf::from(target_dir);
    if !target_root.is_dir() {
        return Err(format!(
            "Selected flash target is not a directory: {}",
            target_root.display()
        ));
    }

    copy_latest_firmware_to_volume(&source, &target_root)
}

#[command]
fn flash_latest_firmware_auto(app_handle: AppHandle) -> Result<String, String> {
    let source = resolve_latest_firmware_path(&app_handle)?;
    let existing = list_uf2_volumes()?;
    let start = Instant::now();
    let timeout = Duration::from_secs(20);
    let poll_interval = Duration::from_millis(250);

    loop {
        let current = list_uf2_volumes()?;
        let target = current
            .iter()
            .find(|path| !existing.contains(path))
            .cloned()
            .or_else(|| {
                if current.len() == 1 {
                    current.first().cloned()
                } else {
                    None
                }
            });

        if let Some(target_root) = target {
            return copy_latest_firmware_to_volume(&source, &target_root);
        }

        if start.elapsed() >= timeout {
            return Err(
                "Timed out waiting for the keyboard bootloader volume to appear.".to_string(),
            );
        }

        thread::sleep(poll_interval);
    }
}

#[command]
fn flash_latest_firmware_guided(
    app_handle: AppHandle,
    serial_port_path: Option<String>,
    bootloader_requested: bool,
) -> Result<String, String> {
    let source = resolve_latest_firmware_path(&app_handle)?;
    let existing = list_uf2_volumes()?;
    let start = Instant::now();
    let timeout = Duration::from_secs(28);
    let poll_interval = Duration::from_millis(250);
    let repeat_touch_interval = Duration::from_millis(1500);
    let mut next_touch_at = serial_port_path
        .as_ref()
        .map(|_| start + repeat_touch_interval);
    let mut fallback_error = None;

    if let Some(port_path) = serial_port_path.clone() {
        if let Err(err) = touch_serial_bootloader(port_path) {
            fallback_error = Some(err);
        }
    }

    loop {
        if let Some(next_attempt_at) = next_touch_at {
            if Instant::now() >= next_attempt_at {
                if let Some(port_path) = serial_port_path.clone() {
                    if let Err(err) = touch_serial_bootloader(port_path) {
                        fallback_error = Some(err);
                    }
                }

                next_touch_at = Some(Instant::now() + repeat_touch_interval);
            }
        }

        if let Some(target_root) = detect_new_uf2_volume(&existing)? {
            return copy_latest_firmware_to_volume(&source, &target_root);
        }

        if start.elapsed() >= timeout {
            return Err(match fallback_error {
                Some(err) => format!(
                    "Timed out waiting for the keyboard bootloader volume to appear after automatic bootloader touch{} {}",
                    if bootloader_requested {
                        " following the firmware reboot request."
                    } else {
                        "."
                    },
                    err
                ),
                None => {
                    "Timed out waiting for the keyboard bootloader volume to appear.".to_string()
                }
            });
        }

        thread::sleep(poll_interval);
    }
}

#[command]
fn touch_serial_bootloader(port_path: String) -> Result<(), String> {
    let start = Instant::now();
    let timeout = Duration::from_secs(4);
    let retry_delay = Duration::from_millis(200);
    let mut last_error = None;

    while start.elapsed() < timeout {
        match serialport::new(&port_path, 1200)
            .timeout(Duration::from_millis(250))
            .open()
        {
            Ok(mut port) => {
                let _ = port.write_data_terminal_ready(false);
                drop(port);
                thread::sleep(Duration::from_millis(500));
                return Ok(());
            }
            Err(err) => {
                last_error = Some(err.to_string());
                thread::sleep(retry_delay);
            }
        }
    }

    Err(format!(
        "Failed to open {} for bootloader entry: {}",
        port_path,
        last_error.unwrap_or_else(|| "unknown error".to_string())
    ))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ActiveConnection {
            conn: Mutex::new(None),
            ble_device_id: Mutex::new(None),
            active_session_id: Mutex::new(None),
            tasks: Mutex::new(None),
            lifecycle: Mutex::new(()),
            next_session_id: Default::default(),
        })
        .invoke_handler(tauri::generate_handler![
            transport_send_data,
            transport_close,
            transport_close_session,
            gatt_list_devices,
            gatt_connect,
            serial_list_devices,
            serial_connect,
            detect_keymap_source,
            read_keymap_source,
            write_keymap_source,
            flash_latest_firmware,
            flash_latest_firmware_auto,
            flash_latest_firmware_guided,
            touch_serial_bootloader,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
