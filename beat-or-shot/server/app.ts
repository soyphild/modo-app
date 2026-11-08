import express, { type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { ALL_SPECIAL_CARDS, CARD_BY_ID, TRACK_CARD, buildEditionCards, type CardInstance } from '../shared/cards';
import type { TrackDef } from '../shared/catalog';
import { AVATARS } from '../shared/config';
import type { AudioPayload, ClientAction } from '../shared/types';
import { GameError, Room, type AudioTokenRef } from './game/engine';
import { cardCode } from './game/cardCode';
import { roomCode } from './game/helpers';
import { JsonCatalogStore, SPOTIFY_TRACK_RE, isPlayable } from './store/catalogStore';

export interface AppOptions {
  io: Server;
  dataDir: string;
  cardSecret: string;
  adminKey: string;
  publicUrl: string | null;
  persist?: boolean;
}

// ───────── Validación de acciones (el cliente nunca es de fiar) ─────────
const str = (max: number) => z.string().max(max);
const configPatch = z
  .object({
    difficulty: z.enum(['novato', 'facil', 'normal', 'dificil', 'melomano']),
    timeLimitSec: z.number().int(),
    rounds: z.number().int(),
    expansions: z.array(str(40)).max(20),
    audioMode: z.enum(['host', 'all', 'active']),
    tieMode: z.enum(['reduced', 'tiebreak']),
    tensionSounds: z.boolean(),
    familyMode: z.boolean(),
    modality: z.enum(['clasico', 'fiesta'])
  })
  .partial()
  .strict();

const actionSchema: z.ZodType<ClientAction> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('configure'), patch: configPatch }),
  z.object({ type: z.literal('answerMinors'), hasMinors: z.boolean() }),
  z.object({ type: z.literal('finishSetup') }),
  z.object({ type: z.literal('startPartners') }),
  z.object({ type: z.literal('choosePartner'), partnerId: str(20) }),
  z.object({ type: z.literal('startGame') }),
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('scan'), code: str(80) }),
  z.object({ type: z.literal('continue') }),
  z.object({ type: z.literal('chooseTarget'), targetId: str(20) }),
  z.object({
    type: z.literal('answer'),
    title: str(80).optional(),
    artist: str(80).optional(),
    year: z.number().int().min(0).max(3000).nullable().optional(),
    choice: z.number().int().min(0).max(10).optional()
  }),
  z.object({ type: z.literal('useWildcard'), wildcard: z.enum(['dj', 'time', 'hint']) }),
  z.object({ type: z.literal('skipTrack') }),
  z.object({ type: z.literal('replay') }),
  z.object({ type: z.literal('endPerformance') }),
  z.object({ type: z.literal('vote'), forId: str(20).nullable(), approve: z.boolean().optional() }),
  z.object({ type: z.literal('penaltyChoice'), optionId: str(20) }),
  z.object({ type: z.literal('hostSkip') }),
  z.object({ type: z.literal('transferHost'), playerId: str(20) }),
  z.object({ type: z.literal('kick'), playerId: str(20) }),
  z.object({ type: z.literal('resetDeck') }),
  z.object({ type: z.literal('playAgain') })
]) as never;

const joinSchema = z.object({
  name: z.string().trim().min(1).max(18),
  avatar: z.string().max(8),
  isMinor: z.boolean()
});

/** Extrae el código de una carta desde el contenido del QR (URL o código directo). */
export function parseCardCode(raw: string): string {
  const s = raw.trim();
  const m = s.match(/\/c\/([0-9A-Za-z]{4}-?[0-9A-Za-z]{4})/);
  const code = (m ? m[1] : s).toUpperCase().replace(/[^0-9A-Z]/g, '');
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : s.toUpperCase();
}

export function createApp(opts: AppOptions) {
  const { io } = opts;
  const catalog = new JsonCatalogStore(opts.persist === false ? null : path.join(opts.dataDir, 'catalog.json'));
  const editionCards = buildEditionCards('GEN1');
  const codeIndex = new Map<string, CardInstance>();
  const codeBySerial = new Map<number, string>();
  for (const c of editionCards) {
    const code = cardCode(opts.cardSecret, c.edition, c.serial);
    codeIndex.set(code, c);
    codeBySerial.set(c.serial, code);
  }
  const audioTokens = new Map<string, AudioTokenRef>();
  const rooms = new Map<string, Room>();
  const origins = new Map<string, string>();
  let fileStreamer: (url: string, res: Response) => unknown = (_u, res) => res.status(404).end();

  const baseUrl = (origin?: string) => opts.publicUrl ?? origin ?? 'http://localhost:5173';

  function broadcast(room: Room) {
    const sockets = io.sockets.adapter.rooms.get(`room:${room.code}`);
    if (!sockets) return;
    for (const sid of sockets) {
      const s = io.sockets.sockets.get(sid);
      const pid = s?.data.playerId as string | undefined;
      if (s && pid && room.players.has(pid)) s.emit('room:state', room.viewFor(pid));
    }
  }

  function makeRoom(origin?: string): Room {
    let code = roomCode();
    while (rooms.has(code)) code = roomCode();
    if (origin) origins.set(code, origin);
    const room = new Room(code, {
      catalog,
      editionCards,
      codeIndex,
      audioTokens,
      joinUrl: (c) => `${baseUrl(origins.get(c))}/?sala=${c}`
    });
    room.onChange = () => broadcast(room);
    rooms.set(code, room);
    return room;
  }

  function playerSocketsConnected(room: Room, pid: string, exclude?: string) {
    const sockets = io.sockets.adapter.rooms.get(`room:${room.code}`);
    if (!sockets) return false;
    for (const sid of sockets) {
      if (sid === exclude) continue;
      if (io.sockets.sockets.get(sid)?.data.playerId === pid) return true;
    }
    return false;
  }

  function attach(socket: Socket, room: Room, playerId: string) {
    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(`room:${room.code}`);
    room.setConnected(playerId, true);
    broadcast(room);
  }

  type Ack = (res: Record<string, unknown>) => void;
  const safeAck = (ack: unknown): Ack => (typeof ack === 'function' ? (ack as Ack) : () => {});

  io.on('connection', (socket) => {
    const origin = (socket.handshake.headers.origin as string | undefined) ?? undefined;
    let bucket = { t: Date.now(), n: 0 };
    const limited = () => {
      const now = Date.now();
      if (now - bucket.t > 1000) bucket = { t: now, n: 0 };
      return ++bucket.n > 25;
    };

    socket.on('time:sync', (_t: unknown, ack: unknown) => safeAck(ack)({ serverNow: Date.now() }));

    socket.on('room:create', (payload: unknown, ack: unknown) => {
      const reply = safeAck(ack);
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) return reply({ ok: false, error: 'Datos no válidos' });
      const room = makeRoom(origin);
      const pl = room.addPlayer(parsed.data.name, parsed.data.avatar, parsed.data.isMinor);
      attach(socket, room, pl.id);
      reply({ ok: true, code: room.code, token: pl.token, playerId: pl.id });
    });

    socket.on('room:join', (payload: unknown, ack: unknown) => {
      const reply = safeAck(ack);
      const parsed = joinSchema.extend({ code: z.string().trim().min(4).max(8) }).safeParse(payload);
      if (!parsed.success) return reply({ ok: false, error: 'Revisa el código y tu nombre' });
      const room = rooms.get(parsed.data.code.toUpperCase());
      if (!room) return reply({ ok: false, error: 'No existe una sala con ese código' });
      try {
        const pl = room.addPlayer(parsed.data.name, parsed.data.avatar, parsed.data.isMinor);
        attach(socket, room, pl.id);
        reply({ ok: true, code: room.code, token: pl.token, playerId: pl.id });
      } catch (err) {
        reply({ ok: false, error: err instanceof GameError ? err.message : 'No se pudo entrar' });
      }
    });

    socket.on('room:resume', (payload: unknown, ack: unknown) => {
      const reply = safeAck(ack);
      const parsed = z.object({ code: z.string().max(8), token: z.string().max(64) }).safeParse(payload);
      if (!parsed.success) return reply({ ok: false });
      const room = rooms.get(parsed.data.code.toUpperCase());
      const pl = room?.findByToken(parsed.data.token);
      if (!room || !pl) return reply({ ok: false, error: 'La sesión expiró' });
      attach(socket, room, pl.id);
      reply({ ok: true, code: room.code, playerId: pl.id });
    });

    socket.on('room:leave', () => {
      const room = rooms.get(socket.data.roomCode);
      if (room && socket.data.playerId) {
        socket.leave(`room:${room.code}`);
        if (!playerSocketsConnected(room, socket.data.playerId)) room.setConnected(socket.data.playerId, false);
        broadcast(room);
      }
      socket.data.roomCode = undefined;
      socket.data.playerId = undefined;
    });

    socket.on('action', (payload: unknown, ack: unknown) => {
      const reply = safeAck(ack);
      if (limited()) return reply({ ok: false, error: 'Demasiado rápido' });
      const room = rooms.get(socket.data.roomCode);
      const pid = socket.data.playerId as string | undefined;
      if (!room || !pid) return reply({ ok: false, error: 'No estás en una sala' });
      const parsed = actionSchema.safeParse(payload);
      if (!parsed.success) return reply({ ok: false, error: 'Acción no válida' });
      let action = parsed.data;
      if (action.type === 'scan') action = { type: 'scan', code: parseCardCode(action.code) };
      try {
        room.act(pid, action);
        reply({ ok: true });
      } catch (err) {
        if (!(err instanceof GameError)) console.error('[action]', err);
        reply({ ok: false, error: err instanceof GameError ? err.message : 'Error inesperado' });
      }
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.roomCode);
      const pid = socket.data.playerId as string | undefined;
      if (room && pid && !playerSocketsConnected(room, pid, socket.id)) {
        room.setConnected(pid, false);
        broadcast(room);
      }
    });
  });

  // Limpieza de salas abandonadas.
  const gc = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const anyone = [...room.players.values()].some((p) => p.connected);
      if ((!anyone && now - room.lastActivity > 30 * 60_000) || now - room.lastActivity > 6 * 3600_000) {
        room.dispose();
        rooms.delete(code);
        origins.delete(code);
      }
    }
  }, 60_000);
  gc.unref();

  // ───────── API HTTP ─────────
  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
  router.get('/expansions', (_req, res) => res.json(catalog.expansionViews()));
  router.get('/avatars', (_req, res) => res.json(AVATARS));

  router.get('/cards', (req, res) => {
    const origin = opts.publicUrl ?? `${req.protocol}://${req.get('host')}`;
    res.json(
      editionCards.map((c) => {
        const code = codeBySerial.get(c.serial)!;
        return { serial: c.serial, edition: c.edition, code, url: `${origin}/c/${code}`, card: CARD_BY_ID[c.defId] };
      })
    );
  });
  router.get('/card-defs', (_req, res) => res.json([TRACK_CARD, ...ALL_SPECIAL_CARDS]));

  // Audio opaco por ronda: el token no revela la canción y caduca al terminar la ronda.
  router.get('/audio/:token', (req, res) => {
    const ref = audioTokens.get(req.params.token);
    if (!ref || !ref.track.audio) return res.status(404).json({ error: 'Audio no disponible' });
    res.setHeader('Cache-Control', 'no-store');
    const a = ref.track.audio;
    const payload: AudioPayload & { clipSec: number } =
      a.kind === 'synth'
        ? { kind: 'synth', variant: ref.variant, bpm: a.bpm, notes: a.notes, clipSec: ref.clipSec }
        : { kind: 'file', variant: ref.variant, url: `/api/audio/${req.params.token}/file`, clipStart: ref.clipStart, clipDuration: Math.min(a.clipDuration, ref.clipSec), clipSec: ref.clipSec };
    res.json(payload);
  });
  router.get('/audio/:token/file', async (req, res) => {
    const ref = audioTokens.get(req.params.token);
    if (!ref || ref.track.audio?.kind !== 'file') return res.status(404).end();
    try {
      await fileStreamer(ref.track.audio.url, res);
    } catch {
      if (!res.headersSent) res.status(502).end();
    }
  });

  // ───────── Panel administrativo ─────────
  const admin = express.Router();
  admin.use((req, res, next) => {
    if (req.get('x-admin-key') !== opts.adminKey) return res.status(401).json({ error: 'Clave de administración incorrecta' });
    next();
  });
  admin.get('/tracks', (_req, res) => res.json(catalog.all().map((t) => ({ ...t, playable: isPlayable(t) }))));
  admin.get('/stats', (_req, res) =>
    res.json({
      rooms: [...rooms.values()].map((r) => ({ code: r.code, phase: r.phase, players: r.players.size, family: r.config.familyMode })),
      tracks: catalog.all().length,
      playable: catalog.all().filter((t) => isPlayable(t)).length
    })
  );

  const trackSchema = z.object({
    id: z.string().regex(/^[a-z0-9-]{3,60}$/),
    title: z.string().min(1).max(120),
    artist: z.string().min(1).max(120),
    titleAliases: z.array(z.string().max(120)).max(20),
    artistAliases: z.array(z.string().max(120)).max(20),
    year: z.number().int().min(1000).max(2100),
    genre: z.string().min(1).max(60),
    subgenre: z.string().max(60).optional(),
    country: z.string().min(1).max(60),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    expansion: z.string().min(1).max(40),
    explicit: z.boolean(),
    spotifyUrl: z.string().regex(SPOTIFY_TRACK_RE, 'Enlace de Spotify no válido (open.spotify.com/track/…)').nullable(),
    audio: z
      .union([
        z.object({ kind: z.literal('synth'), bpm: z.number().min(30).max(300), notes: z.array(z.tuple([z.string().max(4), z.number().min(0.05).max(16)])).max(400) }),
        z.object({ kind: z.literal('file'), url: z.string().max(500).regex(/^(https:\/\/|local:)/, 'URL https o local:archivo'), clipStart: z.number().min(0).max(3600), clipDuration: z.number().min(1).max(60), durationSec: z.number().min(1).max(7200).optional(), clipMode: z.enum(['fixed', 'hook', 'random']).optional() })
      ])
      .nullable(),
    rights: z.object({
      status: z.enum(['public_domain_composition', 'licensed', 'private_use', 'pending_license']),
      holder: z.string().max(200).optional(),
      licenseId: z.string().max(120).optional(),
      territory: z.string().max(120).optional(),
      expiresAt: z.string().max(40).optional(),
      note: z.string().max(500)
    }),
    active: z.boolean()
  });

  const saveTrack = (body: unknown, res: Response, mustExist: boolean) => {
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ') });
    const t = parsed.data as TrackDef;
    if (mustExist && !catalog.get(t.id)) return res.status(404).json({ error: 'No existe' });
    if (!mustExist && catalog.get(t.id)) return res.status(409).json({ error: 'Ya existe una canción con ese id' });
    if (t.rights.status === 'licensed' && (!t.rights.holder || !t.rights.licenseId)) {
      return res.status(400).json({ error: 'Una canción con licencia necesita titular y número de licencia' });
    }
    if (t.rights.status === 'public_domain_composition' && t.audio?.kind === 'file') {
      // Una grabación concreta puede tener derechos aunque la obra sea de dominio público.
      t.rights.note = t.rights.note || 'Verificar derechos de la grabación.';
    }
    catalog.upsert(t);
    res.json({ ...t, playable: isPlayable(t) });
  };
  // Subida de archivos de audio del propio dueño (uso privado o con licencia).
  const AUDIO_TYPES: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm' };
  admin.post('/upload', express.raw({ type: Object.keys(AUDIO_TYPES), limit: '40mb' }), async (req, res) => {
    const ext = AUDIO_TYPES[(req.get('content-type') ?? '').split(';')[0].trim()];
    if (!ext) return res.status(415).json({ error: 'Formato no admitido. Usa MP3, M4A, AAC, OGG, WAV o WEBM.' });
    if (!Buffer.isBuffer(req.body) || req.body.length < 1000) return res.status(400).json({ error: 'Archivo vacío o dañado' });
    const name = `${Date.now().toString(36)}-${roomCode().toLowerCase()}.${ext}`;
    const dir = path.join(opts.dataDir, 'audio');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), req.body);
    res.json({ url: `local:${name}`, bytes: req.body.length });
  });
  admin.put('/tracks/:id', (req, res) => saveTrack({ ...req.body, id: req.params.id }, res, true));
  admin.post('/tracks', (req, res) => saveTrack(req.body, res, false));
  router.use('/admin', admin);

  return {
    router,
    rooms,
    catalog,
    codeIndex,
    codeBySerial,
    dataDir: opts.dataDir,
    setFileStreamer(fn: typeof fileStreamer) {
      fileStreamer = fn;
    },
    close() {
      clearInterval(gc);
      for (const r of rooms.values()) r.dispose();
    }
  };
}
