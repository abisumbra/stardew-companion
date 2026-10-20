import { useEffect, useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { desktop } from './backend';

export type ConnectionStatus = {
  state: string;
  saveId?: string;
  farmerId?: string;
  completed?: string[];
  error?: string;
  receivedAt?: number;
};
let status: ConnectionStatus = { state: 'disconnected' };
let timer: ReturnType<typeof setInterval> | undefined;
let generation = 0;
let inFlight = false;
const listeners = new Set<() => void>();
function publish(next: ConnectionStatus) {
  status = next;
  listeners.forEach((fn) => fn());
}
export async function refreshConnection() {
  if (!desktop || inFlight) return;
  inFlight = true;
  const request = ++generation;
  const timeout = setTimeout(() => {
    if (request === generation) {
      generation++;
      inFlight = false;
      publish({ state: 'disconnected', error: 'Connection status is unavailable. Retry.' });
    }
  }, 5000);
  try {
    const next = await invoke<ConnectionStatus>('connection_status');
    if (request === generation) publish({ ...next, receivedAt: Date.now() });
  } catch {
    if (request === generation)
      publish({ state: 'disconnected', error: 'Connection status is unavailable. Retry.' });
  } finally {
    clearTimeout(timeout);
    if (request === generation) inFlight = false;
  }
}
let users = 0;
export function useConnectionStatus() {
  useEffect(() => {
    if (++users === 1) {
      void refreshConnection();
      // Expire stale evidence even if an IPC promise never settles.
      timer = setInterval(() => {
        if (status.receivedAt && Date.now() - status.receivedAt > 5000)
          publish({ state: 'disconnected', error: 'Connection status is unavailable. Retry.' });
        void refreshConnection();
      }, 1000);
    }
    return () => {
      if (--users === 0) {
        clearInterval(timer);
        generation++;
        inFlight = false;
      }
    };
  }, []);
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => status,
  );
}
