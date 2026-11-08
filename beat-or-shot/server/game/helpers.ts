import type { TrackDef } from '../../shared/catalog';
import type { Hint } from '../../shared/types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/** Identificador aleatorio criptográficamente seguro (funciona en Node y en el navegador). */
export function randomId(bytes = 8): string {
  let out = '';
  for (const b of randomBytes(Math.ceil((bytes * 4) / 3))) out += B64[b & 63];
  return out;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(): string {
  let out = '';
  const buf = randomBytes(6);
  for (let i = 0; i < 6; i++) out += ROOM_ALPHABET[buf[i] % ROOM_ALPHABET.length];
  return out;
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], rand: () => number = Math.random): T {
  return arr[Math.floor(rand() * arr.length)];
}

function roman(n: number): string {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

export function eraLabel(year: number): string {
  if (year >= 1900) return `Década de ${Math.floor(year / 10) * 10}`;
  return `Siglo ${roman(Math.floor((year - 1) / 100) + 1)}`;
}

export const HINT_ORDER: Hint['kind'][] = ['era', 'genre', 'country', 'letter'];

export function makeHint(track: TrackDef, kind: Hint['kind']): Hint {
  switch (kind) {
    case 'era':
      return { kind, label: 'Época', value: eraLabel(track.year) };
    case 'genre':
      return { kind, label: 'Género', value: track.subgenre ? `${track.genre} · ${track.subgenre}` : track.genre };
    case 'country':
      return { kind, label: 'País del artista', value: track.country };
    case 'letter': {
      const words = track.title.split(/\s+/).length;
      return { kind, label: 'Título', value: `Empieza por «${track.title[0].toUpperCase()}» · ${words} palabra${words > 1 ? 's' : ''}` };
    }
  }
}
