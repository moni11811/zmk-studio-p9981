use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::command;

fn ancestors_for(path: &Path) -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if path.is_dir() {
        dirs.push(path.to_path_buf());
    }

    let mut current = path.parent();
    while let Some(dir) = current {
        dirs.push(dir.to_path_buf());
        current = dir.parent();
    }

    dirs
}

fn collect_keymap_matches(root: &Path, depth: usize, results: &mut BTreeSet<PathBuf>) {
    if depth == 0 || !root.exists() || !root.is_dir() {
        return;
    }

    let Ok(entries) = fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            collect_keymap_matches(&path, depth - 1, results);
            continue;
        }

        if path.file_name().and_then(|name| name.to_str()) == Some("bbp9981.keymap") {
            results.insert(path);
        }
    }
}

fn candidate_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let mut recursive_matches = BTreeSet::new();

    if let Ok(current_dir) = env::current_dir() {
        for dir in ancestors_for(&current_dir) {
            candidates.push(dir.join("BB9981-KEYMAP-main/config/bbp9981.keymap"));
            candidates.push(dir.join("config/bbp9981.keymap"));
            collect_keymap_matches(&dir, 3, &mut recursive_matches);
        }
    }

    if let Ok(home) = env::var("HOME") {
        let home = PathBuf::from(home);
        let search_roots = [
            home.join("Downloads"),
            home.join("Documents"),
            home.join("Desktop"),
            home.clone(),
        ];

        for root in search_roots {
            candidates.push(root.join("BB9981/BB9981-KEYMAP-main/config/bbp9981.keymap"));
            candidates.push(root.join("BB9981-KEYMAP-main/config/bbp9981.keymap"));
            candidates.push(root.join("config/bbp9981.keymap"));
            collect_keymap_matches(&root, 4, &mut recursive_matches);
        }
    }

    candidates.extend(recursive_matches);
    candidates
}

#[command]
pub fn detect_keymap_source() -> Option<String> {
    candidate_paths()
        .into_iter()
        .find(|path| path.exists())
        .map(|path| path.to_string_lossy().into_owned())
}

#[command]
pub fn read_keymap_source(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|err| format!("Failed to read {path}: {err}"))
}

#[command]
pub fn write_keymap_source(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|err| format!("Failed to write {path}: {err}"))
}
