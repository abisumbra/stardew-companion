import { useSyncExternalStore } from 'react';
const sizes = [1, 1.15, 1.3] as const;
let scale = 1;
try {
  const saved = Number(localStorage.getItem('companion:text-scale'));
  if (sizes.includes(saved as 1)) scale = saved;
} catch {
  /* Session preference remains available. */
}
const listeners = new Set<() => void>();
const apply = () => {
  if (typeof document !== 'undefined')
    document.documentElement.style.setProperty('--text-scale', String(scale));
};
apply();
export function setTextScale(value: number) {
  if (!sizes.includes(value as 1)) return;
  scale = value;
  try {
    localStorage.setItem('companion:text-scale', String(value));
  } catch {
    /* Session only. */
  }
  apply();
  listeners.forEach((fn) => fn());
}
export const useTextScale = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => scale,
  );
