/**
 * Modo DEMO: el motor del juego corre dentro del navegador y 3 bots juegan contigo.
 * Imita la interfaz del socket real para que el resto de la app no cambie.
 * El juego real multijugador usa el servidor Node (server/), no este archivo.
 */
import { buildEditionCards, type CardInstance } from '../../../shared/cards';
import type { AudioPayload, ClientAction } from '../../../shared/types';
import { GameError, Room, type AudioTokenRef } from '../../../server/game/engine';
import { roomCode } from '../../../server/game/helpers';
import { MemoryCatalog } from '../../../server/store/catalogCore';

type Cb = (...args: unknown[]) => void;

const catalog = new MemoryCatalog();
const editionCards = buildEditionCards('GEN1');
const codeIndex = new Map<string, CardInstance>();
for (const c of editionCards) codeIndex.set(`DEMO-${String(c.serial).padStart(4, '0')}`, c);
const audioTokens = new Map<string, AudioTokenRef>();

const BOTS = [
  { name: 'Luna', avatar: '🌙' },
  { name: 'Rocco', avatar: '🎸' },
  { name: 'Mara', avatar: '🎤' }
];

export function localAudio(token: string): (AudioPayload & { clipSec: number }) | null {
  const ref = audioTokens.get(token);
  if (!ref || ref.track.audio?.kind !== 'synth') return null;
  return { kind: 'synth', variant: ref.variant, bpm: ref.track.audio.bpm, notes: ref.track.audio.notes, clipSec: ref.clipSec };
}
export const localExpansions = () => catalog.expansionViews();

export class LocalSocket {
  connected = true;
  io = { on: () => {} };
  private handlers = new Map<string, Cb[]>();
  private room: Room | null = null;
  private humanId = '';
  private bots = new Set<string>();
  private scheduled = new Set<string>();

  on(ev: string, fn: Cb) {
    const list = this.handlers.get(ev) ?? [];
    list.push(fn);
    this.handlers.set(ev, list);
    if (ev === 'connect') setTimeout(() => fn(), 0);
    return this;
  }
  private fire(ev: string, data?: unknown) {
    for (const fn of this.handlers.get(ev) ?? []) fn(data);
  }
  timeout() {
    return { emit: (ev: string, p: unknown, cb?: Cb) => this.handle(ev, p, (r) => cb?.(null, r)) };
  }
  emit(ev: string, p?: unknown, cb?: Cb) {
    this.handle(ev, p, (r) => cb?.(r));
  }

  private handle(ev: string, p: unknown, reply: (r: unknown) => void) {
    switch (ev) {
      case 'time:sync':
        return reply({ serverNow: Date.now() });
      case 'room:create': {
        const { name, avatar, isMinor } = p as { name: string; avatar: string; isMinor: boolean };
        this.room?.dispose();
        const room = new Room(roomCode(), { catalog, editionCards, codeIndex, audioTokens, joinUrl: (c) => `${location.origin}/?sala=${c}` });
        this.room = room;
        this.scheduled.clear();
        this.bots.clear();
        this.humanId = room.addPlayer(name, avatar, isMinor).id;
        for (const b of BOTS) this.bots.add(room.addPlayer(b.name, b.avatar, false).id);
        room.onChange = () => this.push();
        this.push();
        return reply({ ok: true, code: room.code, token: 'demo', playerId: this.humanId });
      }
      case 'room:join':
        return reply({ ok: false, error: 'En la demo juegas contra 3 bots: toca «Crear partida».' });
      case 'room:resume':
        return reply({ ok: false });
      case 'room:leave':
        this.room?.dispose();
        this.room = null;
        return reply({ ok: true });
      case 'action': {
        if (!this.room) return reply({ ok: false, error: 'No estás en una sala' });
        try {
          this.room.act(this.humanId, p as ClientAction);
          reply({ ok: true });
        } catch (err) {
          if (!(err instanceof GameError)) console.error(err);
          reply({ ok: false, error: err instanceof GameError ? err.message : 'Error inesperado' });
        }
        return;
      }
      default:
        return reply({ ok: false });
    }
  }

  private push() {
    if (!this.room) return;
    this.fire('room:state', this.room.viewFor(this.humanId));
    this.driveBots();
  }

  // ───────── Bots ─────────
  private later(key: string, ms: number, fn: () => void) {
    if (this.scheduled.has(key)) return;
    this.scheduled.add(key);
    const room = this.room;
    setTimeout(() => {
      if (this.room !== room || !room) return;
      try {
        fn();
      } catch (err) {
        if (!(err instanceof GameError)) console.error(err);
      }
    }, ms);
  }
  private botAct(id: string, a: ClientAction) {
    this.room?.act(id, a);
  }
  private rnd(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private driveBots() {
    const room = this.room;
    if (!room) return;
    const ids = [...room.players.keys()];
    if (room.phase === 'partners' || room.phase === 'lobby') {
      for (const b of this.bots) {
        const pl = room.players.get(b);
        if (pl && !pl.partnerId) {
          const others = ids.filter((x) => x !== b);
          this.later(`partner-${b}`, this.rnd(500, 1500), () => this.botAct(b, { type: 'choosePartner', partnerId: others[Math.floor(Math.random() * others.length)] }));
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = room.stage as any;
    if (!st) return;
    const isBot = (id: string | null | undefined) => !!id && this.bots.has(id);
    switch (st.type) {
      case 'turn':
        if (isBot(st.activeId)) this.later(`draw-${room.turnNumber}-${st.extraTurn}`, this.rnd(1800, 2800), () => this.botAct(st.activeId, { type: 'draw' }));
        break;
      case 'card':
        if (st.awaiting === 'target' && isBot(st.drawnBy)) {
          const opts: string[] = st.targetOptions ?? [];
          // Los bots prefieren retarte a ti para que veas los duelos.
          const target = opts.includes(this.humanId) && Math.random() < 0.6 ? this.humanId : opts[Math.floor(Math.random() * opts.length)];
          this.later(`target-${st.card.id}-${room.turnNumber}`, this.rnd(1500, 2500), () => this.botAct(st.drawnBy, { type: 'chooseTarget', targetId: target }));
        }
        break;
      case 'track': {
        const r = st.round;
        const answerers: string[] = [...r.participants];
        if (r.dj?.status === 'pending') answerers.push(r.dj.partnerId);
        if (r.coAnswerer) answerers.push(r.coAnswerer);
        for (const id of answerers) {
          if (!isBot(id) || id === r.performerId || r.answers.get(id)?.locked) continue;
          if (r.dj && id === r.ownerId) continue;
          const isDj = r.dj?.partnerId === id;
          const delay = r.quiz ? this.rnd(2500, 7000) : this.rnd(5000, 14000);
          this.later(`ans-${r.id}-${r.audioPlayId}-${id}-${isDj}-${r.answers.get(id)?.attempts ?? 0}`, delay, () => {
            const good = Math.random() < (r.kind === 'mime' || r.kind === 'hum' ? 0.65 : 0.5);
            if (r.quiz) return this.botAct(id, { type: 'answer', choice: good ? r.quiz.correct : (r.quiz.correct + 1 + Math.floor(Math.random() * 3)) % r.quiz.options.length });
            const t = r.track;
            const partial = Math.random() < 0.35;
            const wrong = catalog.all()[Math.floor(Math.random() * catalog.all().length)];
            this.botAct(id, {
              type: 'answer',
              title: good ? t.title : wrong.title,
              artist: good && !partial ? t.artist : wrong.artist,
              year: r.fields.year ? t.year + Math.round(this.rnd(-8, 8)) : null
            });
          });
        }
        if (r.kind === 'solo' && isBot(r.ownerId) && !r.dj && Math.random() < 0.3) {
          this.later(`wild-${r.id}`, this.rnd(2500, 4000), () => this.botAct(r.ownerId, { type: 'useWildcard', wildcard: Math.random() < 0.5 ? 'hint' : 'dj' }));
        }
        break;
      }
      case 'perform':
        if (st.competitors.every((id: string) => isBot(id))) this.later(`perf-${room.turnNumber}`, 8000, () => this.botAct(st.competitors[0], { type: 'endPerformance' }));
        break;
      case 'vote':
        for (const id of st.eligible as string[]) {
          if (!isBot(id) || st.votes.has(id)) continue;
          this.later(`vote-${room.turnNumber}-${st.card.id}-${id}`, this.rnd(2000, 6000), () =>
            st.voteKind === 'duel'
              ? this.botAct(id, { type: 'vote', forId: st.competitors[Math.floor(Math.random() * 2)] })
              : this.botAct(id, { type: 'vote', forId: null, approve: Math.random() < 0.65 })
          );
        }
        break;
      case 'penalty':
        if (isBot(st.chooserId)) this.later(`pen-${room.turnNumber}`, 2500, () => this.botAct(st.chooserId, { type: 'penaltyChoice', optionId: st.options[Math.floor(Math.random() * st.options.length)].id }));
        break;
    }
  }
}
