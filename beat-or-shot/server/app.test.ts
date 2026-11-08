import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RoomView } from '../shared/types';
import { createApp, parseCardCode } from './app';

let url = '';
let server: http.Server;
let game: ReturnType<typeof createApp>;
const sockets: Socket[] = [];

beforeAll(async () => {
  const app = express();
  server = http.createServer(app);
  const io = new Server(server);
  game = createApp({ io, dataDir: '/tmp', cardSecret: 's', adminKey: 'k', publicUrl: 'https://beat.test', persist: false });
  app.use(express.json());
  app.use('/api', game.router);
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  sockets.forEach((s) => s.close());
  game.close();
  server.close();
});

function client() {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  const state: { view: RoomView | null } = { view: null };
  s.on('room:state', (v: RoomView) => (state.view = v));
  const emit = <T = Record<string, unknown>>(ev: string, payload: unknown) => new Promise<T>((res) => s.emit(ev, payload, res));
  return { s, state, emit, act: (a: unknown) => emit<{ ok: boolean; error?: string }>('action', a) };
}
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe('servidor en tiempo real', () => {
  it('crea sala, une jugadores, reconecta por token y rechaza acciones no autorizadas', async () => {
    const host = client();
    const created = await host.emit<{ ok: boolean; code: string; token: string }>('room:create', { name: 'Host', avatar: '🎧', isMinor: false });
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^[A-Z0-9]{6}$/);

    const guest = client();
    const joined = await guest.emit<{ ok: boolean; token: string }>('room:join', { code: created.code, name: 'Guest', avatar: '🦊', isMinor: false });
    expect(joined.ok).toBe(true);
    expect((await guest.emit<{ ok: boolean }>('room:join', { code: 'NOPE00', name: 'X', avatar: '🎧', isMinor: false })).ok).toBe(false);

    // Un invitado no puede configurar la sala ni saltar pasos.
    expect((await guest.act({ type: 'answerMinors', hasMinors: false })).ok).toBe(false);
    expect((await guest.act({ type: 'hostSkip' })).ok).toBe(false);
    // Payloads malformados se rechazan.
    expect((await host.act({ type: 'configure', patch: { score: 9999 } })).ok).toBe(false);
    expect((await host.act({ type: 'giveMePoints' })).ok).toBe(false);

    await host.act({ type: 'answerMinors', hasMinors: false });
    await host.act({ type: 'finishSetup' });
    await host.act({ type: 'startGame' });
    await tick();
    expect(host.state.view?.phase).toBe('playing');
    expect(host.state.view?.joinUrl).toBe(`https://beat.test/?sala=${created.code}`);

    // Reconexión con token desde otro socket: recupera la identidad.
    guest.s.close();
    await tick(100);
    expect(host.state.view?.players.find((p) => p.name === 'Guest')?.connected).toBe(false);
    const again = client();
    const resumed = await again.emit<{ ok: boolean; playerId: string }>('room:resume', { code: created.code, token: joined.token });
    expect(resumed.ok).toBe(true);
    await tick();
    expect(again.state.view?.players.find((p) => p.id === resumed.playerId)?.name).toBe('Guest');
    expect((await again.emit<{ ok: boolean }>('room:resume', { code: created.code, token: 'falso' })).ok).toBe(false);
  });

  it('el audio se sirve por token opaco y sin metadatos', async () => {
    const host = client();
    const created = await host.emit<{ code: string }>('room:create', { name: 'H', avatar: '🎧', isMinor: false });
    await host.act({ type: 'answerMinors', hasMinors: false });
    await host.act({ type: 'finishSetup' });
    await host.act({ type: 'startGame' });
    const room = game.rooms.get(created.code)!;
    const trackCode = [...game.codeIndex.entries()].find(([, c]) => c.defId === 'track')![0];
    expect((await host.act({ type: 'scan', code: `https://beat.test/c/${trackCode}` })).ok).toBe(true);
    await tick(2800);
    const view = host.state.view!;
    expect(view.stage?.type).toBe('track');
    const token = view.stage?.type === 'track' ? view.stage.round.audioToken : null;
    expect(token).toBeTruthy();
    const res = await fetch(`${url}/api/audio/${token}`);
    const body = await res.text();
    const track = (room.stage as { round: { track: { title: string; artist: string } } }).round.track;
    expect(res.status).toBe(200);
    expect(body).not.toContain(track.title);
    expect(body).not.toContain(track.artist);
    expect((await fetch(`${url}/api/audio/inventado`)).status).toBe(404);
  });

  it('panel admin protegido y validación de enlaces de Spotify', async () => {
    expect((await fetch(`${url}/api/admin/tracks`)).status).toBe(401);
    const list = await (await fetch(`${url}/api/admin/tracks`, { headers: { 'x-admin-key': 'k' } })).json();
    const t = list.find((x: { id: string }) => x.id === 'gen-despacito');
    const bad = await fetch(`${url}/api/admin/tracks/${t.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-key': 'k' }, body: JSON.stringify({ ...t, playable: undefined, spotifyUrl: 'https://evil.example/track/1' }) });
    expect(bad.status).toBe(400);
    const lic = await fetch(`${url}/api/admin/tracks/${t.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-key': 'k' }, body: JSON.stringify({ ...t, playable: undefined, rights: { status: 'licensed', note: '' } }) });
    expect(lic.status).toBe(400);
  });

  it('interpreta el contenido del QR', () => {
    expect(parseCardCode('https://beatorshot.app/c/ab12-cd34')).toBe('AB12-CD34');
    expect(parseCardCode('AB12CD34')).toBe('AB12-CD34');
  });
});
