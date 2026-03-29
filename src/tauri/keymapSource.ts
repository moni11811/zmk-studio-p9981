import { invoke } from "@tauri-apps/api/core";

export async function detectKeymapSource(): Promise<string | null> {
  return await invoke<string | null>("detect_keymap_source");
}

export async function readKeymapSource(path: string): Promise<string> {
  return await invoke<string>("read_keymap_source", { path });
}

export async function writeKeymapSource(
  path: string,
  content: string
): Promise<void> {
  await invoke("write_keymap_source", { path, content });
}
