import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientAction, RoomView } from '../../../shared/types';

/**
 * Conexión en tiempo real + sesión del jugador.
 * El servidor es la fuente de verdad: aquí solo se guarda la última vista recibida.
 */

type ConnState = 'connecting' | 'online' | 'offline';
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'good';
}

interface Snapshot {
  conn: ConnState;
  room: RoomView | null;
  toasts: Toast[];
  offset: number;
  resuming: boolean;
}

const SESSION_KEY = 'bos.session';
let snapshot: Snapshot = { conn: 'connecting', room: null, toasts: [], offset: 0, resuming: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
};

export function useGame(): Snapshot {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot
  );
}
export const getGame = () => snapshot;

let toastSeq = 0;
export function toast(text: string, tone: Toast['tone'] = 'info') {
  const t = { id: ++toastSeq, text, tone };
  set({ toasts: [...snapshot.toasts, t].slice(-3) });
  setTimeout(() => set({ toasts: snapshot.toasts.filter((x) => x.id !== t.id) }), tone === 'error' ? 4200 : 3000);
}

function readSession(): { code: string; token: string } | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}
function writeSession(s: { code: string; token: string } | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}
export const hasSession = () => !!readSession();

const socket: Socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });

/** Sincroniza el reloj con el servidor (mínimo RTT de varias muestras). */
async function syncClock() {
  const samples: { rtt: number; offset: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    const res = await new Promise<{ serverNow: number } | null>((resolve) => {
      socket.timeout(3000).emit('time:sync', t0, (err: unknown, r: { serverNow: number }) => resolve(err ? null : r));
    });
    const t1 = Date.now();
    if (res) samples.push({ rtt: t1 - t0, offset: res.serverNow - (t0 + t1) / 2 });
  }
  if (samples.length) {
    samples.sort((a, b) => a.rtt - b.rtt);
    set({ offset: samples[0].offset });
  }
}

export const serverNow = () => Date.now() + snapshot.offset;

socket.on('connect', () => {
  set({ conn: 'online' });
  void syncClock();
  const s = readSession();
  if (s) {
    set({ resuming: true });
    socket.emit('room:resume', s, (res: { ok: boolean; error?: string }) => {
      set({ resuming: false });
      if (!res?.ok) {
        writeSession(null);
        set({ room: null });
        if (res?.error) toast(res.error, 'error');
      }
    });
  }
});
socket.on('disconnect', () => set({ conn: 'offline' }));
socket.io.on('reconnect_attempt', () => set({ conn: 'connecting' }));
socket.on('room:state', (room: RoomView) => set({ room }));

type JoinPayload = { name: string; avatar: string; isMinor: boolean; code?: string };
type JoinResult = { ok: boolean; error?: string; code?: string; token?: string };

function joinLike(event: 'room:create' | 'room:join', payload: JoinPayload): Promise<JoinResult> {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err: unknown, res: JoinResult) => {
      if (err) return resolve({ ok: false, error: 'Sin conexión con el servidor' });
      if (res.ok && res.code && res.token) writeSession({ code: res.code, token: res.token });
      resolve(res);
    });
  });
}

export const createRoom = (p: JoinPayload) => joinLike('room:create', p);
export const joinRoom = (p: JoinPayload) => joinLike('room:join', p);

export function leaveRoom() {
  socket.emit('room:leave');
  writeSession(null);
  set({ room: null });
}

export function act(action: ClientAction, opts: { silent?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      toast('Sin conexión. Reintentando…', 'error');
      return resolve(false);
    }
    socket.timeout(6000).emit('action', action, (err: unknown, res: { ok: boolean; error?: string }) => {
      if (err) {
        toast('El servidor no respondió', 'error');
        return resolve(false);
      }
      if (!res.ok && res.error && !opts.silent) toast(res.error, 'error');
      resolve(res.ok);
    });
  });
}

export function me(room: RoomView | null) {
  return room?.players.find((p) => p.id === room.you) ?? null;
}
export function player(room: RoomView | null, id: string | null | undefined) {
  return room?.players.find((p) => p.id === id) ?? null;
}
