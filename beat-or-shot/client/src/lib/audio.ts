import type { AudioPayload } from '../../../shared/types';
import { getSettings } from './settings';

/**
 * Motor de audio:
 * - Reproduce fragmentos autorizados (sintetizados de obras de dominio público o archivos con licencia).
 * - Efectos de sonido sintetizados (sin archivos externos).
 * Todo el audio musical llega por un token opaco: el cliente nunca conoce el título.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let fileEl: HTMLAudioElement | null = null;
let activeNodes: AudioScheduledSourceNode[] = [];
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = getSettings().volume;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(master);
  }
  return ctx;
}

/** Debe llamarse desde un gesto del usuario (requisito de iOS/Safari). */
export function unlockAudio() {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  // Sonido silencioso para desbloquear en iOS.
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.01);
}

export const audioReady = () => !!ctx && ctx.state === 'running';

export function setVolume(v: number) {
  if (master) master.gain.value = v;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(note: string, transpose = 0): number | null {
  const m = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (Number(m[3]) + 1) * 12 + transpose;
  return 440 * Math.pow(2, (n - 69) / 12);
}

export function stopMusic() {
  for (const n of activeNodes) {
    try {
      n.stop();
    } catch {
      /* ya detenido */
    }
  }
  activeNodes = [];
  if (fileEl) {
    fileEl.pause();
    fileEl.src = '';
    fileEl = null;
  }
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function voice(c: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, type: OscillatorType, gain: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const a = 0.012;
  const rel = Math.min(0.18, dur * 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + a);
  g.gain.setValueAtTime(gain * 0.8, t + Math.max(a, dur - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.08);
  activeNodes.push(o);
}

function drum(c: AudioContext, dest: AudioNode, t: number, kind: 'kick' | 'hat' | 'clap') {
  if (kind === 'kick') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.25);
    activeNodes.push(o);
    return;
  }
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1500;
  const g = c.createGain();
  const len = kind === 'hat' ? 0.05 : 0.12;
  g.gain.setValueAtTime(kind === 'hat' ? 0.25 : 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  s.connect(f).connect(g).connect(dest);
  s.start(t);
  s.stop(t + len + 0.02);
  activeNodes.push(s);
}

type Resolver = (token: string) => Promise<(AudioPayload & { clipSec: number }) | null>;
let resolveAudio: Resolver = async (token) => {
  const res = await fetch(`/api/audio/${token}`, { cache: 'no-store' });
  return res.ok ? res.json() : null;
};
export function setAudioResolver(fn: Resolver) {
  resolveAudio = fn;
}

/** Reproduce el fragmento de la ronda a la hora indicada (reloj local en ms). */
export async function playRoundAudio(token: string, startAtLocalMs: number): Promise<boolean> {
  const c = ensure();
  if (!c) return false;
  stopMusic();
  let payload: AudioPayload & { clipSec: number };
  try {
    const got = await resolveAudio(token);
    if (!got) return false;
    payload = got;
  } catch {
    return false;
  }
  if (c.state === 'suspended') await c.resume().catch(() => {});
  const delaySec = Math.max(0, (startAtLocalMs - Date.now()) / 1000);
  const clip = payload.clipSec;

  if (payload.kind === 'file' && payload.url) {
    // Se decodifica con WebAudio: arranca sincronizado y funciona en iPhone sin otro toque.
    if (!musicBus) return false;
    let buffer: AudioBuffer;
    try {
      const res = await fetch(payload.url, { cache: 'no-store' });
      if (!res.ok) return false;
      buffer = await c.decodeAudioData(await res.arrayBuffer());
    } catch {
      return false;
    }
    const start = Math.min(payload.clipStart ?? 0, Math.max(0, buffer.duration - 1));
    const dur = Math.min(clip, payload.clipDuration ?? clip, buffer.duration - start);
    const late = Math.max(0, (Date.now() - startAtLocalMs) / 1000);
    const t0 = c.currentTime + Math.max(0, (startAtLocalMs - Date.now()) / 1000) + 0.05;
    const src = c.createBufferSource();
    src.buffer = buffer;
    if (payload.variant === 'remix') {
      src.playbackRate.value = 1.18;
      src.detune.value = 300;
    }
    const g = c.createGain();
    const playDur = Math.max(0.5, dur - late);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(1, t0 + 0.25);
    g.gain.setValueAtTime(1, t0 + Math.max(0.3, playDur - 0.6));
    g.gain.linearRampToValueAtTime(0.0001, t0 + playDur);
    src.connect(g).connect(musicBus);
    src.start(t0, start + late, playDur + 0.1);
    activeNodes.push(src);
    return true;
  }

  if (!payload.notes || !payload.bpm || !musicBus) return false;
  const remix = payload.variant === 'remix';
  const bpm = payload.bpm * (remix ? 1.22 : 1);
  const beat = 60 / bpm;
  const transpose = remix ? 3 : 0;
  const t0 = c.currentTime + delaySec + 0.05;
  const end = t0 + clip;
  const bus = c.createGain();
  bus.gain.value = 0.9;
  // Fundido de salida al final del fragmento.
  bus.gain.setValueAtTime(0.9, Math.max(t0, end - 0.4));
  bus.gain.linearRampToValueAtTime(0.0001, end);
  bus.connect(musicBus);

  let t = t0;
  let totalBeats = 0;
  for (const [note, beats] of payload.notes) {
    const dur = beats * beat;
    if (t >= end) break;
    const f = noteFreq(note, transpose);
    if (f) {
      const d = Math.min(dur * 0.92, end - t);
      if (remix) {
        voice(c, bus, f, t, d, 'square', 0.09);
        voice(c, bus, f * 2, t, d * 0.5, 'sawtooth', 0.03);
      } else {
        voice(c, bus, f, t, d, 'triangle', 0.28);
        voice(c, bus, f / 2, t, d, 'sine', 0.1);
        voice(c, bus, f * 2, t, Math.min(d, 0.25), 'sine', 0.03);
      }
    }
    t += dur;
    totalBeats += beats;
  }
  if (remix) {
    // Batería tipo club para EL GRAN REMIX.
    const beatsInClip = Math.min(totalBeats, clip / beat);
    for (let b = 0; b < beatsInClip; b += 0.5) {
      const bt = t0 + b * beat;
      if (bt >= end) break;
      if (b % 1 === 0) drum(c, bus, bt, 'kick');
      else drum(c, bus, bt, 'hat');
      if (b % 2 === 1) drum(c, bus, bt, 'clap');
    }
  }
  return true;
}

// ───────── Efectos ─────────
type Sfx = 'tick' | 'tickHigh' | 'draw' | 'flip' | 'win' | 'lose' | 'tie' | 'tap' | 'whoosh' | 'countdown' | 'go' | 'wildcard' | 'podium';

export function sfx(kind: Sfx) {
  const s = getSettings();
  if (!s.sfx) return;
  const c = ensure();
  if (!c || !master || c.state !== 'running') return;
  const t = c.currentTime + 0.01;
  const tone = (f: number, at: number, d: number, type: OscillatorType = 'sine', g = 0.2) => {
    const o = c.createOscillator();
    const gn = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(g, at + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(gn).connect(master!);
    o.start(at);
    o.stop(at + d + 0.05);
  };
  const sweep = (from: number, to: number, d: number, g = 0.25) => {
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + d);
    const gn = c.createGain();
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.connect(f).connect(gn).connect(master!);
    src.start(t);
    src.stop(t + d);
  };
  switch (kind) {
    case 'tap': return tone(880, t, 0.05, 'sine', 0.08);
    case 'tick': return tone(1000, t, 0.06, 'square', 0.06);
    case 'tickHigh': return tone(1500, t, 0.08, 'square', 0.1);
    case 'countdown': return tone(660, t, 0.18, 'triangle', 0.3);
    case 'go': tone(990, t, 0.3, 'triangle', 0.3); return tone(1320, t + 0.05, 0.35, 'sine', 0.2);
    case 'draw': sweep(400, 3000, 0.35, 0.2); return tone(1200, t + 0.25, 0.2, 'sine', 0.1);
    case 'whoosh': return sweep(3000, 300, 0.4, 0.25);
    case 'flip': sweep(800, 4000, 0.18, 0.3); return tone(220, t, 0.15, 'sine', 0.3);
    case 'wildcard': [660, 880, 1100].forEach((f, i) => tone(f, t + i * 0.06, 0.15, 'triangle', 0.15)); return;
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.35, 'triangle', 0.22)); return;
    case 'podium': [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.12, 0.4, 'triangle', 0.2)); return;
    case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.14, 0.3, 'sawtooth', 0.08)); return;
    case 'tie': [523, 523].forEach((f, i) => tone(f, t + i * 0.18, 0.2, 'triangle', 0.18)); return;
  }
}
