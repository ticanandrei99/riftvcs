import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  channel_ready?: boolean;
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url: string | null;
  notes: string | null;
}

const STORAGE_KEY = 'riftvoice.updateNotifications';
let inFlight: Promise<UpdateInfo> | null = null;

export function isAutoUpdateEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== '0'; }
  catch { return true; }
}

export function setAutoUpdateEnabled(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); }
  catch { /* A storage failure must not prevent the app from starting. */ }
}

export function checkForUpdate(): Promise<UpdateInfo> {
  if (!inFlight) {
    inFlight = invoke<UpdateInfo>('check_for_update').finally(() => { inFlight = null; });
  }
  return inFlight;
}

/** Notification only: never download or execute an installer on application startup. */
export function startStartupUpdateCheck(
  onResult: (info: UpdateInfo) => void,
  onError: () => void = () => {},
  delayMs = 1500,
): () => void {
  let stopped = false;
  const timer = setTimeout(() => {
    if (!isAutoUpdateEnabled()) return;
    void checkForUpdate().then(info => {
      if (!stopped) onResult(info);
    }).catch(() => { if (!stopped) onError(); });
  }, delayMs);
  return () => { stopped = true; clearTimeout(timer); };
}

export function openUpdateDownloads(): Promise<void> {
  // The native command chooses a fixed official URL for this app variant.
  return invoke('open_release_page');
}
