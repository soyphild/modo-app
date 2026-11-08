import { useSyncExternalStore } from 'react';

export interface Settings {
  name: string;
  avatar: string;
  reducedMotion: boolean;
  sfx: boolean;
  volume: number;
  haptics: boolean;
  ownedExpansions: string[];
}

const KEY = 'bos.settings';
const defaults: Settings = {
  name: '',
  avatar: '🎧',
  reducedMotion: false,
  sfx: true,
  volume: 0.8,
  haptics: true,
  ownedExpansions: ['demo-clasicos', 'general']
};

function load(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

let current = load();
const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* sin almacenamiento: los ajustes duran la sesión */
  }
  listeners.forEach((l) => l());
}

export const getSettings = () => current;
export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
}

export function vibrate(pattern: number | number[]) {
  if (current.haptics && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no soportado */
    }
  }
}
