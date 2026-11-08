import { AVATARS, DEFAULT_CONFIG, DIFFICULTY, MAX_PLAYERS, PLAYER_COLORS, ROUND_OPTIONS, SCORING, TIME_OPTIONS } from '../../shared/config';
import { CARD_BY_ID, type CardInstance } from '../../shared/cards';
import type { TrackDef } from '../../shared/catalog';
import type {
  AnswerFeedback,
  BuffPublic,
  CardDef,
  ClientAction,
  FinalTitle,
  GameEventView,
  Hint,
  PlayerPublic,
  ResultColor,
  RoomConfig,
  RoomView,
  StageView,
  TrackReveal,
  TrackRoundView,
  WildcardType
} from '../../shared/types';
import type { CatalogRepository } from '../store/catalogStore';
import { matches, yearMatches } from './answers';
import { HINT_ORDER, eraLabel, makeHint, pick, randomId, shuffle } from './helpers';

export class GameError extends Error {}

// ───────────────────────── Tipos internos (nunca se envían tal cual) ─────────────────────────

type BuffId =
  | 'doble_drop' | 'dj_protegido' | 'cambio_track' | 'tiempo_congelado' | 'segunda_oportunidad'
  | 'back_to_back' | 'jackpot' | 'pista_gratis' | 'racha_blindada' | 'espejo' | 'eco'
  | 'primera_fila' | 'voto_oro' | 'sin_red' | 'reloj_apurado' | 'dj_reves'
  | 'handicap_short' | 'handicap_remix';

const BUFF_LABEL: Record<BuffId, [string, 'buff' | 'debuff']> = {
  doble_drop: ['x2 próxima canción', 'buff'],
  dj_protegido: ['Escudo', 'buff'],
  cambio_track: ['Cambio de track', 'buff'],
  tiempo_congelado: ['Reloj congelado', 'buff'],
  segunda_oportunidad: ['2ª oportunidad', 'buff'],
  back_to_back: ['Back to back', 'buff'],
  jackpot: ['Jackpot', 'buff'],
  pista_gratis: ['Pista gratis', 'buff'],
  racha_blindada: ['Racha blindada', 'buff'],
  espejo: ['Espejo', 'buff'],
  eco: ['+2 repeticiones', 'buff'],
  primera_fila: ['Primera fila', 'buff'],
  voto_oro: ['Voto de oro', 'buff'],
  sin_red: ['Sin comodines', 'debuff'],
  reloj_apurado: ['Mitad de tiempo', 'debuff'],
  dj_reves: ['Título y artista', 'debuff'],
  handicap_short: ['Fragmento corto', 'debuff'],
  handicap_remix: ['Versión remix', 'debuff']
};

/** Buffs que se consumen al empezar tu próxima canción individual. */
const NEXT_SOLO_BUFFS: BuffId[] = [
  'doble_drop', 'cambio_track', 'tiempo_congelado', 'segunda_oportunidad', 'back_to_back', 'jackpot',
  'pista_gratis', 'eco', 'primera_fila', 'sin_red', 'reloj_apurado', 'dj_reves', 'handicap_short', 'handicap_remix'
];

interface Player {
  id: string;
  token: string;
  name: string;
  avatar: string;
  color: string;
  isMinor: boolean;
  connected: boolean;
  partnerId: string | null;
  score: number;
  correct: number;
  attempted: number;
  streak: number;
  greens: number;
  reds: number;
  yellows: number;
  fastCorrect: number;
  wildcards: Record<WildcardType, number>;
  spent: WildcardType[];
  buffs: BuffId[];
  worstRank: number;
  removed: boolean;
}

type RoundContext = 'solo' | 'remix' | 'fragment' | 'assign' | 'extra' | 'duel' | 'tiebreak' | 'group' | 'king' | 'rave' | 'final' | 'hum' | 'mime' | 'quiz' | 'sync';

interface AnswerRec {
  title?: string;
  artist?: string;
  year?: number | null;
  choice?: number;
  at: number;
  attempts: number;
  locked: boolean;
}

interface Round {
  id: string;
  context: RoundContext;
  kind: TrackRoundView['kind'];
  label: string;
  participants: string[];
  performerId: string | null;
  ownerId: string; // jugador "dueño" de la canción (para comodines)
  track: TrackDef;
  audioToken: string | null;
  audioStartAt: number;
  firstStartAt: number;
  endsAt: number;
  frozenUntil: number | null;
  multiplier: number;
  variant: 'normal' | 'remix' | 'short';
  clipSec: number;
  fields: { title: boolean; artist: boolean; year: boolean };
  replaysLeft: number;
  audioPlayId: number;
  sequence: { index: number; total: number } | null;
  hints: Hint[];
  answers: Map<string, AnswerRec>;
  wildcardUsed: boolean;
  dj: { partnerId: string; status: 'pending' | 'answered'; rec?: AnswerRec } | null;
  coAnswerer: string | null; // BACK TO BACK / SINCRONÍA
  quiz: { question: string; options: string[]; correct: number } | null;
  mods: {
    noWildcards: boolean;
    secondChance: boolean;
    jackpot: boolean;
    canSkip: boolean;
    fastMult: number;
    strictBoth: boolean;
    failPenalty: number;
    freeHint: boolean;
  };
  assignFrom: string | null;
  card: CardDef | null;
  finished: boolean;
}

type Stage =
  | { type: 'turn'; activeId: string; extraTurn: boolean }
  | { type: 'card'; card: CardDef; drawnBy: string; via: 'virtual' | 'qr'; autoAt: number | null; awaiting: 'continue' | 'target' | null; targetOptions: string[] | null; effectText: string | null; next: 'track' | 'end' | 'challenge' | 'penalty' | 'wild' }
  | { type: 'track'; round: Round }
  | { type: 'trackResult'; round: Round; results: AnswerFeedback[]; nextAt: number; then: () => void }
  | { type: 'perform'; card: CardDef; competitors: string[]; prompt: string; endsAt: number; voteKind: 'duel' | 'approval'; failPenalty: number }
  | { type: 'vote'; card: CardDef; competitors: string[]; voteKind: 'duel' | 'approval'; endsAt: number; votes: Map<string, { forId: string | null; approve?: boolean; weight: number }>; eligible: string[]; failPenalty: number }
  | { type: 'reveal'; title: string; competitors: string[]; revealAt: number; outcome: Record<string, ResultColor>; summary: string; points: Record<string, number>; released: boolean; track: TrackDef | null; nextAt: number; after: (() => void) | null }
  | { type: 'penalty'; card: CardDef; targetId: string; chooserId: string; options: { id: string; label: string; detail: string }[] }
  | { type: 'finalIntro'; finalists: string[]; startAt: number }
  | { type: 'podium' };

export interface AudioTokenRef {
  roomCode: string;
  track: TrackDef;
  variant: Round['variant'];
  clipSec: number;
}

export interface RoomDeps {
  catalog: CatalogRepository;
  editionCards: CardInstance[];
  codeIndex: Map<string, CardInstance>;
  audioTokens: Map<string, AudioTokenRef>;
  joinUrl: (code: string) => string;
  rand?: () => number;
}

const GENRE_BATTLE = ['Pop', 'Rock', 'Salsa', 'Reguetón', 'Bachata', 'Merengue', 'Electrónica', 'Baladas', 'Bandas sonoras de películas', 'Canciones infantiles', 'Villancicos', 'Cumbia', 'Hip-hop', 'Música clásica', 'Canciones de los 80', 'Canciones de los 2000'];

// ───────────────────────── Sala ─────────────────────────

export class Room {
  readonly code: string;
  hostId = '';
  phase: RoomView['phase'] = 'setup';
  config: RoomConfig = structuredClone(DEFAULT_CONFIG);
  players = new Map<string, Player>();
  order: string[] = [];
  turnNumber = 0;
  totalTurns = 0;
  activeIdx = 0;
  stage: Stage | null = null;
  events: GameEventView[] = [];
  titles: FinalTitle[] = [];
  lastActivity = Date.now();
  onChange: () => void = () => {};

  private eventSeq = 0;
  private deck: CardInstance[] = [];
  private usedSerials = new Set<number>();
  private usedTracks = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private extraTurnPending = false;
  private chaos: { untilTurn: number; saved: Record<string, string | null> } | null = null;
  private hiddenScores: Record<string, number> | null = null;
  private hideUntilTurn = -1;
  private rand: () => number;

  constructor(code: string, private deps: RoomDeps) {
    this.code = code;
    this.rand = deps.rand ?? Math.random;
  }

  // ───────── Utilidades ─────────
  private now() {
    return Date.now();
  }
  private log(text: string, tone: GameEventView['tone'] = 'info') {
    this.events.push({ id: ++this.eventSeq, at: this.now(), text, tone });
    if (this.events.length > 120) this.events.shift();
  }
  private changed() {
    this.lastActivity = this.now();
    this.onChange();
  }
  private schedule(key: string, at: number, fn: () => void) {
    this.clear(key);
    const t = setTimeout(() => {
      this.timers.delete(key);
      try {
        fn();
        this.changed();
      } catch (err) {
        console.error(`[room ${this.code}] timer ${key}`, err);
      }
    }, Math.max(0, at - this.now()));
    this.timers.set(key, t);
  }
  private clear(key: string) {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }
  private clearStageTimers() {
    for (const key of [...this.timers.keys()]) if (key.startsWith('stage')) this.clear(key);
  }
  dispose() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.revokeTokens();
  }
  private setStage(stage: Stage | null) {
    this.clearStageTimers();
    // Los tokens de audio solo viven mientras dura su ronda. Se conserva el de la ronda entrante.
    const keep = stage?.type === 'track' ? stage.round.audioToken : null;
    if (stage?.type !== 'trackResult') this.revokeTokens(keep);
    this.stage = stage;
  }
  private revokeTokens(keep: string | null = null) {
    for (const [tok, ref] of this.deps.audioTokens) if (ref.roomCode === this.code && tok !== keep) this.deps.audioTokens.delete(tok);
  }
  p(id: string): Player {
    const pl = this.players.get(id);
    if (!pl || pl.removed) throw new GameError('Jugador no encontrado');
    return pl;
  }
  private active(): Player | null {
    const id = this.order[this.activeIdx];
    return id ? this.players.get(id) ?? null : null;
  }
  private connectedIds(): string[] {
    return this.order.filter((id) => this.players.get(id)?.connected);
  }
  private livePlayers(): Player[] {
    return this.order.map((id) => this.players.get(id)!).filter((p) => p && !p.removed);
  }
  private name(id: string | null | undefined) {
    return (id && this.players.get(id)?.name) || '—';
  }
  private ranking(): Player[] {
    return this.livePlayers().slice().sort((a, b) => b.score - a.score || b.correct - a.correct);
  }
  private addPoints(id: string, pts: number) {
    const pl = this.players.get(id);
    if (!pl) return;
    pl.score = Math.max(0, pl.score + Math.round(pts));
  }
  private hasBuff(pl: Player, b: BuffId) {
    return pl.buffs.includes(b);
  }
  private consumeBuff(pl: Player, b: BuffId) {
    const i = pl.buffs.indexOf(b);
    if (i >= 0) {
      pl.buffs.splice(i, 1);
      return true;
    }
    return false;
  }
  private addBuff(pl: Player, b: BuffId) {
    // Un mismo efecto no se acumula: evita combos que decidan la partida.
    if (!pl.buffs.includes(b)) pl.buffs.push(b);
  }
  private restoreWildcard(pl: Player): WildcardType | null {
    const t = pl.spent.shift();
    if (t && pl.wildcards[t] < SCORING.maxWildcardPerType) {
      pl.wildcards[t]++;
      return t;
    }
    for (const k of ['hint', 'time', 'dj'] as WildcardType[]) {
      if (pl.wildcards[k] === 0) {
        pl.wildcards[k] = 1;
        return k;
      }
    }
    return null;
  }

  // ───────── Jugadores ─────────
  addPlayer(name: string, avatar: string, isMinor: boolean): Player {
    if (this.phase !== 'setup' && this.phase !== 'lobby' && this.phase !== 'partners') {
      throw new GameError('La partida ya comenzó. Pide al anfitrión que abra una nueva sala.');
    }
    if (this.livePlayers().length >= MAX_PLAYERS) throw new GameError(`La sala está llena (máximo ${MAX_PLAYERS}).`);
    const clean = name.trim().slice(0, 18) || 'Jugador';
    const taken = new Set(this.livePlayers().map((p) => p.name.toLowerCase()));
    let finalName = clean;
    for (let i = 2; taken.has(finalName.toLowerCase()); i++) finalName = `${clean} ${i}`;
    const used = new Set(this.livePlayers().map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? pick(PLAYER_COLORS, this.rand);
    const pl: Player = {
      id: randomId(6),
      token: randomId(18),
      name: finalName,
      avatar: AVATARS.includes(avatar) ? avatar : pick(AVATARS, this.rand),
      color,
      isMinor,
      connected: true,
      partnerId: null,
      score: 0,
      correct: 0,
      attempted: 0,
      streak: 0,
      greens: 0,
      reds: 0,
      yellows: 0,
      fastCorrect: 0,
      wildcards: { dj: 1, time: 1, hint: 1 },
      spent: [],
      buffs: [],
      worstRank: 1,
      removed: false
    };
    this.players.set(pl.id, pl);
    this.order.push(pl.id);
    if (!this.hostId) this.hostId = pl.id;
    this.log(`${pl.avatar} ${pl.name} se unió a la sala`);
    if (isMinor) this.enforceFamily(`${pl.name} es menor de edad`);
    return pl;
  }

  findByToken(token: string): Player | undefined {
    return [...this.players.values()].find((p) => p.token === token && !p.removed);
  }

  setConnected(id: string, connected: boolean) {
    const pl = this.players.get(id);
    if (!pl || pl.connected === connected) return;
    pl.connected = connected;
    this.log(connected ? `${pl.name} volvió a conectarse` : `${pl.name} se desconectó`, connected ? 'good' : 'bad');
    if (!connected && id === this.hostId) {
      this.schedule(`host-${id}`, this.now() + SCORING.hostGraceSec * 1000, () => this.autoTransferHost());
    }
    if (connected) this.clear(`host-${id}`);
    if (!connected) this.onPlayerGone(id);
    else this.clear(`stage-skip-${id}`);
  }

  private autoTransferHost() {
    const host = this.players.get(this.hostId);
    if (host?.connected) return;
    const next = this.connectedIds()[0];
    if (next) {
      this.hostId = next;
      this.log(`👑 ${this.name(next)} ahora es anfitrión`, 'special');
    }
  }

  /** Evita bloqueos cuando alguien se desconecta en mitad de una acción. */
  private onPlayerGone(id: string) {
    const st = this.stage;
    if (!st) return;
    if (st.type === 'turn' && st.activeId === id) {
      this.schedule(`stage-skip-${id}`, this.now() + 30_000, () => {
        if (this.stage?.type === 'turn' && !this.players.get(id)?.connected) {
          this.log(`Se salta el turno de ${this.name(id)} por desconexión`);
          this.endTurn();
        }
      });
    }
    if (st.type === 'track') this.maybeFinishRound(st.round);
    if (st.type === 'vote') this.maybeCloseVote();
  }

  private enforceFamily(reason: string) {
    const was = this.config.familyMode;
    this.config.hasMinors = true;
    this.config.familyMode = true;
    this.config.modality = 'clasico';
    if (!was) this.log(`🛡️ Modo Familiar activado: ${reason}. Penalizaciones desactivadas.`, 'special');
    if (this.stage?.type === 'penalty' || (this.stage?.type === 'card' && this.stage.card.type === 'PENALTY')) {
      this.log('La penalización en curso se cancela.');
      this.endTurn();
    }
  }

  // ───────── Acciones ─────────
  act(actorId: string, a: ClientAction) {
    const actor = this.p(actorId);
    const isHost = actorId === this.hostId;
    const hostOnly = () => {
      if (!isHost) throw new GameError('Solo el anfitrión puede hacer esto');
    };
    switch (a.type) {
      case 'answerMinors':
        hostOnly();
        this.config.minorsAsked = true;
        if (a.hasMinors) this.enforceFamily('el anfitrión indicó que hay menores');
        else if (!this.livePlayers().some((p) => p.isMinor)) {
          this.config.hasMinors = false;
          this.config.familyMode = false;
        } else throw new GameError('Hay un jugador menor de edad en la sala: el Modo Familiar es obligatorio.');
        break;
      case 'configure':
        hostOnly();
        this.configure(a.patch);
        break;
      case 'finishSetup':
        hostOnly();
        if (!this.config.minorsAsked) throw new GameError('Primero responde si participan menores de 18 años.');
        this.ensurePlayablePool();
        this.phase = 'lobby';
        break;
      case 'startPartners':
        hostOnly();
        if (this.phase !== 'lobby') throw new GameError('No disponible ahora');
        this.ensurePlayablePool();
        this.phase = 'partners';
        this.log('Elegid a vuestro DJ de apoyo 🎧');
        break;
      case 'choosePartner':
        if (this.phase !== 'partners' && this.phase !== 'lobby') throw new GameError('Ya no se puede cambiar de compañero');
        if (a.partnerId === actorId) throw new GameError('No puedes ser tu propio DJ');
        this.p(a.partnerId);
        actor.partnerId = a.partnerId;
        break;
      case 'startGame':
        hostOnly();
        this.startGame();
        break;
      case 'kick':
        hostOnly();
        if (this.phase !== 'setup' && this.phase !== 'lobby' && this.phase !== 'partners') throw new GameError('Solo en la sala de espera');
        if (a.playerId === actorId) throw new GameError('No puedes expulsarte');
        this.removePlayer(a.playerId);
        break;
      case 'transferHost':
        hostOnly();
        this.p(a.playerId);
        this.hostId = a.playerId;
        this.log(`👑 ${this.name(a.playerId)} ahora es anfitrión`, 'special');
        break;
      case 'draw':
        this.draw(actorId, null);
        break;
      case 'scan':
        this.draw(actorId, a.code);
        break;
      case 'continue':
        this.continueStage(actorId, isHost);
        break;
      case 'chooseTarget':
        this.chooseTarget(actorId, a.targetId);
        break;
      case 'answer':
        this.answer(actorId, a);
        break;
      case 'useWildcard':
        this.useWildcard(actorId, a.wildcard);
        break;
      case 'skipTrack':
        this.skipTrack(actorId);
        break;
      case 'replay':
        this.replay(actorId, isHost);
        break;
      case 'endPerformance': {
        const st = this.stage;
        if (st?.type !== 'perform') throw new GameError('No hay actuación en curso');
        if (!isHost && !st.competitors.includes(actorId)) throw new GameError('Solo los participantes o el anfitrión');
        this.startVote();
        break;
      }
      case 'vote':
        this.castVote(actorId, a.forId, a.approve);
        break;
      case 'penaltyChoice':
        this.penaltyChoice(actorId, a.optionId, isHost);
        break;
      case 'hostSkip':
        hostOnly();
        this.hostSkip();
        break;
      case 'resetDeck':
        hostOnly();
        this.usedSerials.clear();
        this.deck = shuffle(this.deps.editionCards, this.rand);
        this.log('🔄 Mazo reiniciado');
        break;
      case 'playAgain':
        hostOnly();
        this.resetForNewGame();
        break;
      default:
        throw new GameError('Acción desconocida');
    }
    this.changed();
  }

  private removePlayer(id: string) {
    const pl = this.p(id);
    pl.removed = true;
    pl.connected = false;
    this.order = this.order.filter((x) => x !== id);
    for (const other of this.players.values()) if (other.partnerId === id) other.partnerId = null;
    this.log(`${pl.name} salió de la sala`);
  }

  private configure(patch: Partial<RoomConfig>) {
    if (this.phase !== 'setup' && this.phase !== 'lobby') throw new GameError('La configuración se cierra al empezar');
    const c = this.config;
    if (patch.difficulty) {
      if (!DIFFICULTY[patch.difficulty]) throw new GameError('Dificultad no válida');
      c.difficulty = patch.difficulty;
    }
    if (patch.timeLimitSec !== undefined) {
      if (!(TIME_OPTIONS as readonly number[]).includes(patch.timeLimitSec)) throw new GameError('Tiempo no válido');
      c.timeLimitSec = patch.timeLimitSec;
    }
    if (patch.rounds !== undefined) {
      if (!(ROUND_OPTIONS as readonly number[]).includes(patch.rounds)) throw new GameError('Número de rondas no válido');
      c.rounds = patch.rounds;
    }
    if (patch.audioMode) c.audioMode = patch.audioMode;
    if (patch.tieMode) c.tieMode = patch.tieMode;
    if (patch.tensionSounds !== undefined) c.tensionSounds = !!patch.tensionSounds;
    if (patch.familyMode !== undefined) {
      if (!patch.familyMode && (c.hasMinors || this.livePlayers().some((p) => p.isMinor))) {
        throw new GameError('Hay menores en la sala: el Modo Familiar no se puede desactivar.');
      }
      c.familyMode = !!patch.familyMode;
      if (c.familyMode) c.modality = 'clasico';
    }
    if (patch.modality) {
      if (patch.modality === 'fiesta' && c.familyMode) throw new GameError('El Modo Fiesta solo está disponible para grupos de adultos.');
      c.modality = patch.modality;
    }
    if (patch.expansions) {
      const valid = new Set(this.deps.catalog.expansionViews().filter((e) => e.status !== 'soon').map((e) => e.id));
      const list = [...new Set(patch.expansions)].filter((e) => valid.has(e));
      if (!list.length) throw new GameError('Activa al menos una expansión');
      c.expansions = list;
    }
  }

  private pool(): TrackDef[] {
    return this.deps.catalog.playable(this.config.expansions, { family: this.config.familyMode });
  }

  private ensurePlayablePool() {
    if (this.pool().length < 4) {
      throw new GameError('Las expansiones activas no tienen suficientes canciones con audio autorizado. Activa «Clásicos Universales» o carga fragmentos con licencia desde el panel admin.');
    }
  }

  private startGame() {
    if (this.phase !== 'partners' && this.phase !== 'lobby') throw new GameError('No disponible ahora');
    if (!this.config.minorsAsked) throw new GameError('Falta responder la pregunta de menores');
    this.ensurePlayablePool();
    const live = this.livePlayers();
    if (!live.length) throw new GameError('No hay jugadores');
    // Asigna compañero a quien no eligió.
    for (const pl of live) {
      if (live.length < 2) break;
      if (!pl.partnerId || !this.players.get(pl.partnerId) || this.players.get(pl.partnerId)!.removed) {
        pl.partnerId = pick(live.filter((o) => o.id !== pl.id), this.rand).id;
      }
    }
    this.order = shuffle(live.map((p) => p.id), this.rand);
    this.totalTurns = this.order.length * this.config.rounds;
    this.turnNumber = 0;
    this.activeIdx = 0;
    this.deck = shuffle(this.deps.editionCards, this.rand);
    this.usedSerials.clear();
    this.usedTracks.clear();
    this.phase = 'playing';
    this.log(`🎛️ ¡Comienza BEAT OR SHOT! ${this.config.rounds} vuelta(s), dificultad ${DIFFICULTY[this.config.difficulty].label}`, 'special');
    this.beginTurn(false);
  }

  private resetForNewGame() {
    this.setStage(null);
    for (const pl of this.players.values()) {
      Object.assign(pl, {
        score: 0, correct: 0, attempted: 0, streak: 0, greens: 0, reds: 0, yellows: 0, fastCorrect: 0,
        wildcards: { dj: 1, time: 1, hint: 1 }, spent: [], buffs: [], worstRank: 1
      });
    }
    this.titles = [];
    this.chaos = null;
    this.hiddenScores = null;
    this.extraTurnPending = false;
    this.phase = 'lobby';
    this.log('Nueva partida: volvemos a la sala de espera');
  }

  // ───────── Turnos y cartas ─────────
  private beginTurn(extraTurn: boolean) {
    let guard = 0;
    while (!this.active()?.connected && guard++ < this.order.length) {
      this.activeIdx = (this.activeIdx + 1) % this.order.length;
    }
    const act = this.active()!;
    this.setStage({ type: 'turn', activeId: act.id, extraTurn });
    if (!act.connected) this.onPlayerGone(act.id);
  }

  private endTurn() {
    this.revokeTokens();
    if (this.phase !== 'playing') return;
    if (this.extraTurnPending) {
      this.extraTurnPending = false;
      this.beginTurn(true);
      return;
    }
    this.turnNumber++;
    this.trackRanks();
    if (this.hiddenScores && this.turnNumber > this.hideUntilTurn) this.hiddenScores = null;
    if (this.chaos && this.turnNumber >= this.chaos.untilTurn) {
      for (const [id, partner] of Object.entries(this.chaos.saved)) {
        const pl = this.players.get(id);
        if (pl) pl.partnerId = partner;
      }
      this.chaos = null;
      this.log('🎧 Termina el caos: cada quien recupera a su DJ', 'special');
    }
    if (this.turnNumber >= this.totalTurns) {
      this.startFinal();
      return;
    }
    this.activeIdx = (this.activeIdx + 1) % this.order.length;
    this.beginTurn(false);
  }

  private trackRanks() {
    this.ranking().forEach((pl, i) => {
      pl.worstRank = Math.max(pl.worstRank, i + 1);
    });
  }

  private cardAllowed(def: CardDef): boolean {
    const n = this.connectedIds().length;
    if (def.type === 'PENALTY' && this.config.familyMode) return false;
    if (def.minPlayers && n < def.minPlayers) return false;
    if (def.needsTarget && n < 2) return false;
    if ((def.id === 'tararea' || def.id === 'sincronia') && n < 2) return false;
    return true;
  }

  private draw(actorId: string, code: string | null) {
    const st = this.stage;
    if (this.phase !== 'playing' || st?.type !== 'turn') throw new GameError('Ahora no toca sacar carta');
    if (actorId !== st.activeId && actorId !== this.hostId) throw new GameError(`Es el turno de ${this.name(st.activeId)}`);
    let inst: CardInstance | undefined;
    if (code) {
      inst = this.deps.codeIndex.get(code.trim().toUpperCase());
      if (!inst) throw new GameError('Código no reconocido. ¿Es una carta de BEAT OR SHOT?');
      if (this.usedSerials.has(inst.serial)) throw new GameError('Esta carta ya se jugó en esta partida. Devuélvela al fondo del mazo y saca otra.');
      const def = CARD_BY_ID[inst.defId];
      if (!this.cardAllowed(def)) {
        this.usedSerials.add(inst.serial);
        throw new GameError(def.type === 'PENALTY' && this.config.familyMode ? 'Carta de penalización: no se usa en Modo Familiar. Apártala y saca otra.' : 'Esta carta no se puede jugar con los jugadores conectados. Apártala y saca otra.');
      }
    } else {
      for (let attempts = 0; attempts < 2 && !inst; attempts++) {
        while (this.deck.length) {
          const c = this.deck.pop()!;
          if (this.usedSerials.has(c.serial)) continue;
          if (!this.cardAllowed(CARD_BY_ID[c.defId])) continue;
          inst = c;
          break;
        }
        if (!inst) {
          this.usedSerials.clear();
          this.deck = shuffle(this.deps.editionCards, this.rand);
          this.log('🔄 Se acabó el mazo: se baraja de nuevo');
        }
      }
      if (!inst) throw new GameError('No quedan cartas jugables');
    }
    this.usedSerials.add(inst.serial);
    const card = CARD_BY_ID[inst.defId];
    const activeId = st.activeId;
    this.log(`${this.name(activeId)} saca ${card.type === 'TRACK' ? 'una carta TRACK' : `«${card.name}»`}`, card.type === 'TRACK' ? 'info' : 'special');
    this.revealCard(card, activeId, code ? 'qr' : 'virtual');
  }

  private others(id: string) {
    return this.connectedIds().filter((x) => x !== id);
  }

  private revealCard(card: CardDef, activeId: string, via: 'virtual' | 'qr') {
    const now = this.now();
    const base = { type: 'card' as const, card, drawnBy: activeId, via, effectText: null as string | null, targetOptions: null as string[] | null };
    switch (card.type) {
      case 'TRACK':
        this.setStage({ ...base, autoAt: now + 2600, awaiting: null, next: 'track' });
        this.schedule('stage-auto', now + 2600, () => this.startSoloRound(activeId, 'solo', null));
        return;
      case 'POWER_UP': {
        if (card.needsTarget) {
          this.setStage({ ...base, autoAt: null, awaiting: 'target', targetOptions: this.others(activeId), next: 'end' });
          return;
        }
        const text = this.applyPowerUp(card, activeId, null);
        this.setStage({ ...base, effectText: text, autoAt: now + 7000, awaiting: 'continue', next: 'end' });
        this.schedule('stage-auto', now + 7000, () => this.endTurn());
        return;
      }
      case 'CHALLENGE': {
        if (card.needsTarget) {
          this.setStage({ ...base, autoAt: null, awaiting: 'target', targetOptions: this.others(activeId), next: 'challenge' });
          return;
        }
        this.setStage({ ...base, autoAt: now + 6000, awaiting: 'continue', next: 'challenge' });
        this.schedule('stage-auto', now + 6000, () => this.startChallenge(card, activeId, null));
        return;
      }
      case 'PENALTY': {
        const pl = this.p(activeId);
        if (this.config.familyMode) {
          this.setStage({ ...base, effectText: 'Modo Familiar: esta carta no aplica.', autoAt: now + 3000, awaiting: 'continue', next: 'end' });
          this.schedule('stage-auto', now + 3000, () => this.endTurn());
          return;
        }
        if (this.consumeBuff(pl, 'dj_protegido')) {
          this.log(`🛡️ ${pl.name} bloquea la penalización con DJ PROTEGIDO`, 'good');
          this.setStage({ ...base, effectText: '🛡️ ¡DJ PROTEGIDO! La penalización queda bloqueada.', autoAt: now + 5000, awaiting: 'continue', next: 'end' });
          this.schedule('stage-auto', now + 5000, () => this.endTurn());
          return;
        }
        this.setStage({ ...base, autoAt: now + 6000, awaiting: 'continue', next: 'penalty' });
        this.schedule('stage-auto', now + 6000, () => this.startPenalty(card, activeId));
        return;
      }
      case 'WILD': {
        this.setStage({ ...base, autoAt: now + 6000, awaiting: 'continue', next: 'wild' });
        this.schedule('stage-auto', now + 6000, () => this.startWild(card, activeId));
        return;
      }
    }
  }

  private continueStage(actorId: string, isHost: boolean) {
    const st = this.stage;
    if (st?.type === 'card') {
      if (actorId !== st.drawnBy && !isHost) throw new GameError('Solo quien sacó la carta puede continuar');
      if (st.awaiting !== 'continue') throw new GameError('Primero elige un jugador');
      if (st.next === 'end') this.endTurn();
      else if (st.next === 'challenge') this.startChallenge(st.card, st.drawnBy, null);
      else if (st.next === 'penalty') this.startPenalty(st.card, st.drawnBy);
      else if (st.next === 'wild') this.startWild(st.card, st.drawnBy);
      return;
    }
    if (st?.type === 'trackResult') {
      if (!isHost && actorId !== this.active()?.id) throw new GameError('Avanza el jugador en turno o el anfitrión');
      st.then();
      return;
    }
    if (st?.type === 'reveal') {
      if (!isHost && !st.competitors.includes(actorId)) throw new GameError('Avanzan los participantes o el anfitrión');
      if (this.now() < st.revealAt) throw new GameError('Espera la revelación');
      this.afterReveal(st);
      return;
    }
    throw new GameError('Nada que continuar');
  }

  private chooseTarget(actorId: string, targetId: string) {
    const st = this.stage;
    if (st?.type !== 'card' || st.awaiting !== 'target') throw new GameError('No hay que elegir jugador ahora');
    if (actorId !== st.drawnBy && actorId !== this.hostId) throw new GameError('Elige quien sacó la carta');
    if (!st.targetOptions?.includes(targetId)) throw new GameError('Jugador no válido');
    if (st.card.type === 'POWER_UP') {
      const text = this.applyPowerUp(st.card, st.drawnBy, targetId);
      const now = this.now();
      this.setStage({ ...st, effectText: text, awaiting: 'continue', targetOptions: null, autoAt: now + 6000 });
      this.schedule('stage-auto', now + 6000, () => this.endTurn());
      return;
    }
    this.startChallenge(st.card, st.drawnBy, targetId);
  }

  // ───────── Power ups ─────────
  private applyPowerUp(card: CardDef, id: string, targetId: string | null): string {
    const pl = this.p(id);
    const buff = (b: BuffId, text: string) => {
      this.addBuff(pl, b);
      return text;
    };
    let text: string;
    switch (card.id) {
      case 'vida_extra': {
        const t = this.restoreWildcard(pl);
        if (t) text = `Recuperas el comodín ${WILDCARD_NAME[t]}.`;
        else {
          this.addPoints(id, 100);
          text = 'Ya tenías todos tus comodines: +100 puntos.';
        }
        break;
      }
      case 'recarga_total': {
        const got: string[] = [];
        for (const k of ['dj', 'time', 'hint'] as WildcardType[]) {
          if (pl.wildcards[k] === 0) {
            pl.wildcards[k] = 1;
            got.push(WILDCARD_NAME[k]);
          }
        }
        pl.spent = [];
        if (got.length) text = `Recuperas: ${got.join(', ')}.`;
        else {
          this.addPoints(id, 100);
          text = 'Comodines completos: +100 puntos.';
        }
        break;
      }
      case 'doble_drop': text = buff('doble_drop', 'Tu próxima canción vale el doble.'); break;
      case 'dj_protegido': text = buff('dj_protegido', 'Escudo activo contra la próxima penalización.'); break;
      case 'cambio_track': text = buff('cambio_track', 'En tu próxima canción podrás cambiarla una vez.'); break;
      case 'tiempo_congelado': text = buff('tiempo_congelado', 'Tu próximo reloj arranca congelado 15 segundos.'); break;
      case 'segunda_oportunidad': text = buff('segunda_oportunidad', 'Si fallas tu próxima respuesta, podrás repetirla.'); break;
      case 'back_to_back': text = buff('back_to_back', 'En tu próxima canción tu DJ responde contigo.'); break;
      case 'jackpot': text = buff('jackpot', '+150 si aciertas tu próxima canción sin comodines.'); break;
      case 'pista_gratis': text = buff('pista_gratis', 'Tu próxima canción trae una pista de regalo.'); break;
      case 'racha_blindada': text = buff('racha_blindada', 'Tu racha sobrevivirá a un fallo.'); break;
      case 'espejo': text = buff('espejo', 'Tu próxima tarjeta roja se convertirá en amarilla.'); break;
      case 'eco': text = buff('eco', 'Dos repeticiones extra en tu próxima canción.'); break;
      case 'primera_fila': text = buff('primera_fila', 'Ventana de respuesta rápida doble en tu próxima canción.'); break;
      case 'voto_oro': text = buff('voto_oro', 'Tu próximo voto cuenta doble.'); break;
      case 'turno_extra':
        this.extraTurnPending = true;
        text = 'Al terminar, vuelves a sacar carta.';
        break;
      case 'roba_comodin': {
        const leader = this.ranking()[0];
        if (!leader || leader.id === id) {
          this.addPoints(id, 100);
          text = 'El líder eres tú: +100 puntos.';
          break;
        }
        const types = (['dj', 'time', 'hint'] as WildcardType[]).filter((k) => leader.wildcards[k] > 0 && pl.wildcards[k] < SCORING.maxWildcardPerType);
        if (!types.length) {
          this.addPoints(id, 100);
          text = `${leader.name} no tiene comodines que robar: +100 puntos.`;
          break;
        }
        const k = pick(types, this.rand);
        leader.wildcards[k]--;
        leader.spent.push(k);
        pl.wildcards[k]++;
        text = `Le robas ${WILDCARD_NAME[k]} a ${leader.name}.`;
        break;
      }
      case 'bonus_pista':
        this.addPoints(id, 100);
        text = '+100 puntos.';
        break;
      case 'impulso_remontada': {
        const rank = this.ranking().findIndex((x) => x.id === id);
        const bottom = rank >= Math.floor(this.livePlayers().length / 2) && this.livePlayers().length > 1;
        this.addPoints(id, bottom ? 200 : 75);
        text = bottom ? '¡Vas atrás! +200 puntos de remontada.' : 'Vas bien arriba: +75 puntos.';
        break;
      }
      case 'invitado_vip': {
        const t = targetId ? this.p(targetId) : null;
        this.addPoints(id, 75);
        if (t) this.addPoints(t.id, 75);
        text = `${pl.name} y ${t?.name ?? 'su invitado'} ganan 75 puntos.`;
        break;
      }
      default:
        text = 'Sin efecto.';
    }
    this.log(`⚡ ${pl.name}: ${card.name} — ${text}`, 'good');
    return text;
  }

  // ───────── Rondas musicales ─────────
  private pickTrack(): TrackDef {
    const pool = this.pool();
    if (!pool.length) throw new GameError('No hay canciones disponibles');
    const [lo, hi] = DIFFICULTY[this.config.difficulty].trackRange;
    const fresh = pool.filter((t) => !this.usedTracks.has(t.id));
    const inRange = fresh.filter((t) => t.difficulty >= lo && t.difficulty <= hi);
    let candidates = inRange.length ? inRange : fresh;
    if (!candidates.length) {
      this.usedTracks.clear();
      candidates = pool.filter((t) => t.difficulty >= lo && t.difficulty <= hi);
      if (!candidates.length) candidates = pool;
    }
    const t = pick(candidates, this.rand);
    this.usedTracks.add(t.id);
    return t;
  }

  private newRound(opts: {
    context: RoundContext;
    kind: TrackRoundView['kind'];
    label: string;
    participants: string[];
    ownerId: string;
    performerId?: string | null;
    timeSec?: number;
    multiplier?: number;
    variant?: Round['variant'];
    clipSec?: number;
    fields?: Round['fields'];
    sequence?: Round['sequence'];
    card?: CardDef | null;
    noAudio?: boolean;
  }): Round {
    const now = this.now();
    const diff = DIFFICULTY[this.config.difficulty];
    const track = this.pickTrack();
    const startAt = now + 1200;
    const timeSec = opts.timeSec ?? this.config.timeLimitSec;
    const round: Round = {
      id: randomId(6),
      context: opts.context,
      kind: opts.kind,
      label: opts.label,
      participants: opts.participants,
      performerId: opts.performerId ?? null,
      ownerId: opts.ownerId,
      track,
      audioToken: null,
      audioStartAt: startAt,
      firstStartAt: startAt,
      endsAt: startAt + timeSec * 1000,
      frozenUntil: null,
      multiplier: opts.multiplier ?? 1,
      variant: opts.variant ?? 'normal',
      clipSec: opts.clipSec ?? diff.fragmentSec,
      fields: opts.fields ?? { title: true, artist: true, year: diff.requireYear },
      replaysLeft: SCORING.replays,
      audioPlayId: 1,
      sequence: opts.sequence ?? null,
      hints: [],
      answers: new Map(),
      wildcardUsed: false,
      dj: null,
      coAnswerer: null,
      quiz: null,
      mods: { noWildcards: false, secondChance: false, jackpot: false, canSkip: false, fastMult: 1, strictBoth: false, failPenalty: 0, freeHint: false },
      assignFrom: null,
      card: opts.card ?? null,
      finished: false
    };
    if (!opts.noAudio) this.issueAudioToken(round);
    return round;
  }

  private issueAudioToken(round: Round) {
    if (round.audioToken) this.deps.audioTokens.delete(round.audioToken);
    round.audioToken = randomId(16);
    this.deps.audioTokens.set(round.audioToken, { roomCode: this.code, track: round.track, variant: round.variant, clipSec: round.clipSec });
  }

  /** Aplica los buffs/debuffs que el jugador tenía guardados para su próxima canción. */
  private applySoloMods(round: Round, pl: Player) {
    const take = (b: BuffId) => this.consumeBuff(pl, b);
    const timeSec = (round.endsAt - round.audioStartAt) / 1000;
    if (take('doble_drop')) round.multiplier *= 2;
    if (take('cambio_track')) round.mods.canSkip = true;
    if (take('tiempo_congelado')) {
      round.frozenUntil = round.audioStartAt + SCORING.freezeSec * 1000;
      round.endsAt += SCORING.freezeSec * 1000;
    }
    if (take('segunda_oportunidad')) round.mods.secondChance = true;
    if (take('back_to_back') && pl.partnerId && this.players.get(pl.partnerId)?.connected) round.coAnswerer = pl.partnerId;
    if (take('jackpot')) round.mods.jackpot = true;
    if (take('pista_gratis')) round.mods.freeHint = true;
    if (take('eco')) round.replaysLeft += 2;
    if (take('primera_fila')) round.mods.fastMult = 2;
    if (take('sin_red')) round.mods.noWildcards = true;
    if (take('reloj_apurado')) round.endsAt = round.audioStartAt + Math.max(20, Math.round(timeSec / 2)) * 1000;
    if (take('dj_reves')) round.mods.strictBoth = true;
    if (take('handicap_short')) {
      round.variant = 'short';
      round.clipSec = 4;
    }
    if (take('handicap_remix')) round.variant = 'remix';
    if (round.mods.freeHint) round.hints.push(makeHint(round.track, HINT_ORDER[0]));
    if (round.audioToken) this.issueAudioToken(round);
  }

  private startSoloRound(playerId: string, context: RoundContext, card: CardDef | null, extra?: Partial<Pick<Round, 'assignFrom'>>) {
    const pl = this.p(playerId);
    const labels: Partial<Record<RoundContext, string>> = {
      solo: 'TRACK',
      remix: 'RECONOCE EL REMIX',
      fragment: 'FRAGMENTO RELÁMPAGO',
      assign: 'CAMBIO DE DJ',
      extra: 'RONDA EXTRA'
    };
    const round = this.newRound({
      context,
      kind: 'solo',
      label: labels[context] ?? 'TRACK',
      participants: [playerId],
      ownerId: playerId,
      multiplier: context === 'remix' ? 1.5 : context === 'fragment' ? 2 : 1,
      variant: context === 'remix' ? 'remix' : context === 'fragment' ? 'short' : 'normal',
      clipSec: context === 'fragment' ? 3 : undefined,
      card
    });
    if (context === 'fragment') round.replaysLeft = 0;
    if (context === 'extra') {
      round.mods.noWildcards = true;
      round.mods.failPenalty = 50;
    }
    round.assignFrom = extra?.assignFrom ?? null;
    this.applySoloMods(round, pl);
    this.launchRound(round);
  }

  private launchRound(round: Round) {
    this.setStage({ type: 'track', round });
    this.schedule('stage-end', round.endsAt, () => this.finishRound(round));
  }

  private groupParticipants(): string[] {
    return this.connectedIds();
  }

  private startGroupRound(context: RoundContext, label: string, opts: { multiplier?: number; variant?: Round['variant']; sequence?: Round['sequence']; participants?: string[]; card?: CardDef | null }) {
    const act = this.active();
    const round = this.newRound({
      context,
      kind: 'group',
      label,
      participants: opts.participants ?? this.groupParticipants(),
      ownerId: act?.id ?? this.hostId,
      timeSec: Math.min(this.config.timeLimitSec, context === 'final' ? 45 : 60),
      multiplier: opts.multiplier,
      variant: opts.variant,
      sequence: opts.sequence,
      card: opts.card
    });
    this.launchRound(round);
  }

  private answer(actorId: string, a: Extract<ClientAction, { type: 'answer' }>) {
    const st = this.stage;
    if (st?.type !== 'track') throw new GameError('No hay una canción en juego');
    const r = st.round;
    if (r.finished) throw new GameError('La ronda ya terminó');
    const now = this.now();
    if (now > r.endsAt + 1500) throw new GameError('Se acabó el tiempo');
    const rec: AnswerRec = {
      title: a.title?.slice(0, 80),
      artist: a.artist?.slice(0, 80),
      year: a.year ?? null,
      choice: a.choice,
      at: now,
      attempts: 1,
      locked: true
    };
    // Compañero DJ respondiendo por el jugador principal.
    if (r.dj && r.dj.partnerId === actorId && r.dj.status === 'pending') {
      r.dj.status = 'answered';
      r.dj.rec = rec;
      this.log(`🎧 ${this.name(actorId)} respondió como DJ de ${this.name(r.ownerId)}`);
      this.finishRound(r);
      return;
    }
    const isParticipant = r.participants.includes(actorId) || r.coAnswerer === actorId;
    if (!isParticipant) throw new GameError('No participas en esta canción');
    if (r.dj && r.ownerId === actorId) throw new GameError('Tu DJ está respondiendo por ti');
    if (r.performerId === actorId) throw new GameError('Tú eres quien interpreta');
    const prev = r.answers.get(actorId);
    if (prev?.locked) throw new GameError('Ya respondiste');
    if (prev) rec.attempts = prev.attempts + 1;
    r.answers.set(actorId, rec);
    // SEGUNDA OPORTUNIDAD: si falla, puede reintentar.
    if (r.mods.secondChance && actorId === r.ownerId && rec.attempts === 1) {
      const ev = this.evaluate(r, rec);
      if (ev.base === 0 && now < r.endsAt) {
        rec.locked = false;
        r.mods.secondChance = false;
        this.log(`🔁 ${this.name(actorId)} usa SEGUNDA OPORTUNIDAD`);
        return;
      }
    }
    if (r.kind === 'mime' && this.evaluate(r, rec).base > 0 && !r.answers.has('__firstCorrect')) {
      r.answers.set('__firstCorrect', { at: now, attempts: 0, locked: true, title: actorId });
    }
    this.maybeFinishRound(r);
  }

  private maybeFinishRound(r: Round) {
    if (r.finished || this.stage?.type !== 'track' || this.stage.round !== r) return;
    const need = [...r.participants, ...(r.coAnswerer ? [r.coAnswerer] : [])].filter(
      (id) => id !== r.performerId && this.players.get(id)?.connected
    );
    if (r.dj?.status === 'pending') return;
    const done = need.every((id) => r.answers.get(id)?.locked);
    if (done) this.finishRound(r);
  }

  private useWildcard(actorId: string, w: WildcardType) {
    const st = this.stage;
    if (st?.type !== 'track') throw new GameError('Los comodines se usan durante una canción');
    const r = st.round;
    if (r.kind !== 'solo' || r.ownerId !== actorId) throw new GameError('Solo puedes usar comodines en tu propia canción');
    if (r.mods.noWildcards) throw new GameError('No puedes usar comodines en esta canción');
    if (r.answers.get(actorId)?.locked) throw new GameError('Ya respondiste');
    const pl = this.p(actorId);
    if (pl.wildcards[w] <= 0) throw new GameError('No te quedan comodines de ese tipo');
    const now = this.now();
    if (w === 'time') {
      r.endsAt += SCORING.extraTimeSec * 1000;
      this.schedule('stage-end', r.endsAt, () => this.finishRound(r));
    } else if (w === 'hint') {
      const kind = HINT_ORDER.find((k) => !r.hints.some((h) => h.kind === k));
      if (!kind) throw new GameError('Ya se revelaron todas las pistas');
      r.hints.push(makeHint(r.track, kind));
    } else if (w === 'dj') {
      if (r.dj) throw new GameError('Ya llamaste a tu DJ');
      const partner = pl.partnerId ? this.players.get(pl.partnerId) : null;
      if (!partner || !partner.connected || partner.removed) throw new GameError('Tu DJ no está conectado');
      if (r.coAnswerer === partner.id) throw new GameError('Tu DJ ya está respondiendo contigo');
      r.dj = { partnerId: partner.id, status: 'pending' };
    }
    pl.wildcards[w]--;
    pl.spent.push(w);
    r.wildcardUsed = true;
    this.log(`🃏 ${pl.name} usa ${WILDCARD_NAME[w]}`, 'special');
    void now;
  }

  private skipTrack(actorId: string) {
    const st = this.stage;
    if (st?.type !== 'track') throw new GameError('No hay canción');
    const r = st.round;
    if (r.ownerId !== actorId || !r.mods.canSkip) throw new GameError('No tienes CAMBIO DE TRACK');
    if (r.answers.get(actorId)?.locked) throw new GameError('Ya respondiste');
    r.mods.canSkip = false;
    const dur = r.endsAt - r.audioStartAt;
    r.track = this.pickTrack();
    r.hints = r.mods.freeHint ? [makeHint(r.track, HINT_ORDER[0])] : [];
    const now = this.now();
    r.audioStartAt = now + 900;
    r.firstStartAt = r.audioStartAt;
    r.endsAt = r.audioStartAt + dur;
    r.audioPlayId++;
    this.issueAudioToken(r);
    this.schedule('stage-end', r.endsAt, () => this.finishRound(r));
    this.log(`🔀 ${this.name(actorId)} cambia de track`);
  }

  private replay(actorId: string, isHost: boolean) {
    const st = this.stage;
    if (st?.type !== 'track') throw new GameError('No hay canción');
    const r = st.round;
    if (!r.audioToken) throw new GameError('Esta ronda no tiene audio');
    if (!isHost && actorId !== r.ownerId) throw new GameError('Solo el jugador en turno o el anfitrión');
    if (r.replaysLeft <= 0) throw new GameError('No quedan repeticiones');
    r.replaysLeft--;
    r.audioStartAt = this.now() + 700;
    r.audioPlayId++;
  }

  private evaluate(r: Round, rec: AnswerRec): { title: boolean; artist: boolean; year: boolean | null; base: number; breakdown: string[] } {
    const t = r.track;
    if (r.quiz) {
      const ok = rec.choice === r.quiz.correct;
      return { title: ok, artist: ok, year: null, base: ok ? SCORING.quizCorrect : 0, breakdown: ok ? [`Respuesta correcta +${SCORING.quizCorrect}`] : ['Respuesta incorrecta'] };
    }
    const diff = DIFFICULTY[this.config.difficulty];
    const title = r.fields.title && matches(rec.title, [t.title, ...t.titleAliases], diff.fuzz);
    const artist = r.fields.artist && matches(rec.artist, [t.artist, ...t.artistAliases], diff.fuzz);
    const year = r.fields.year ? yearMatches(rec.year, t.year, SCORING.yearTolerance) : null;
    const breakdown: string[] = [];
    let base = 0;
    if (title && artist) {
      base = SCORING.both;
      breakdown.push(`Título y artista +${SCORING.both}`);
    } else if (title || artist) {
      if (r.mods.strictBoth) breakdown.push('DJ AL REVÉS: se exigían ambos datos');
      else {
        base = title ? SCORING.titleOnly : SCORING.artistOnly;
        if (diff.partialBoost) base = Math.max(base, 150);
        if (diff.partialHalf) base = Math.round(base / 2);
        breakdown.push(`${title ? 'Título' : 'Artista'} +${base}`);
      }
    } else breakdown.push('Sin acierto');
    if (base > 0 && year) {
      base += SCORING.yearBonus;
      breakdown.push(`Año aproximado +${SCORING.yearBonus}`);
    }
    return { title, artist, year, base, breakdown };
  }

  private fastWindowMs(r: Round): number {
    const total = r.endsAt - r.firstStartAt - (r.frozenUntil ? SCORING.freezeSec * 1000 : 0);
    return Math.min(SCORING.fastWindowSec * 1000, total * SCORING.fastWindowRatio) * r.mods.fastMult + (r.frozenUntil ? SCORING.freezeSec * 1000 : 0);
  }

  private registerResult(pl: Player, correct: boolean) {
    pl.attempted++;
    if (correct) {
      pl.correct++;
      pl.streak++;
      if (pl.streak > 0 && pl.streak % SCORING.streakEvery === 0) {
        const w = this.restoreWildcard(pl);
        if (w) this.log(`🔥 Racha de ${pl.streak}: ${pl.name} recupera ${WILDCARD_NAME[w]}`, 'good');
        else {
          this.addPoints(pl.id, SCORING.streakRewardPoints);
          this.log(`🔥 Racha de ${pl.streak}: ${pl.name} gana +${SCORING.streakRewardPoints}`, 'good');
        }
      }
    } else if (this.consumeBuff(pl, 'racha_blindada')) {
      this.log(`🧱 La racha de ${pl.name} sobrevive`, 'good');
    } else pl.streak = 0;
  }

  private comebackBonus(pl: Player): number {
    const rank = this.ranking();
    if (rank.length < 3) return 0;
    const last = rank[rank.length - 1];
    if (last.id !== pl.id) return 0;
    return rank[0].score - pl.score >= SCORING.comebackGap ? SCORING.comebackBonus : 0;
  }

  private finishRound(r: Round) {
    if (r.finished) return;
    if (this.stage?.type !== 'track' || this.stage.round !== r) return;
    r.finished = true;
    const results: AnswerFeedback[] = [];
    const answeredMs = (rec?: AnswerRec) => (rec ? Math.max(0, rec.at - r.firstStartAt) : null);

    const scoreOne = (pid: string, rec: AnswerRec | undefined, opts: { allowBonuses: boolean }): AnswerFeedback => {
      const ev = rec ? this.evaluate(r, rec) : { title: false, artist: false, year: null, base: 0, breakdown: ['Sin respuesta'] };
      let pts = ev.base;
      const bd = [...ev.breakdown];
      const ms = answeredMs(rec);
      const fast = ev.base > 0 && ms !== null && ms <= this.fastWindowMs(r) && (rec?.attempts ?? 1) === 1;
      if (opts.allowBonuses && ev.base > 0) {
        if (fast) {
          pts += SCORING.fastBonus;
          bd.push(`Respuesta rápida +${SCORING.fastBonus}`);
        }
        if (!r.wildcardUsed && r.kind === 'solo' && !r.quiz) {
          pts += SCORING.noWildcardBonus;
          bd.push(`Sin comodines +${SCORING.noWildcardBonus}`);
          if (r.mods.jackpot) {
            pts += SCORING.jackpotBonus;
            bd.push(`JACKPOT +${SCORING.jackpotBonus}`);
          }
        }
        const pl = this.players.get(pid);
        const cb = pl ? this.comebackBonus(pl) : 0;
        if (cb) {
          pts += cb;
          bd.push(`Impulso de remontada +${cb}`);
        }
      }
      if (r.multiplier !== 1 && pts > 0) {
        pts = Math.round(pts * r.multiplier);
        bd.push(`Multiplicador x${r.multiplier}`);
      }
      if (fast) {
        const pl = this.players.get(pid);
        if (pl) pl.fastCorrect++;
      }
      return { playerId: pid, title: ev.title, artist: ev.artist, year: ev.year, points: pts, breakdown: bd, viaPartner: false, answeredMs: ms, givenTitle: rec?.title, givenArtist: rec?.artist };
    };

    if (r.kind === 'solo') {
      const owner = this.p(r.ownerId);
      if (r.dj) {
        // Llamada al DJ: puntos reducidos para el jugador y bonificación para el compañero.
        const djRec = r.dj.rec;
        const ev = djRec ? this.evaluate(r, djRec) : { title: false, artist: false, year: null, base: 0, breakdown: ['El DJ no respondió'] };
        let pts = Math.round(ev.base * SCORING.partnerRatio * r.multiplier);
        const bd = [...ev.breakdown, ev.base ? `Vía DJ: ${Math.round(SCORING.partnerRatio * 100)}% de la base` : ''].filter(Boolean);
        this.addPoints(owner.id, pts);
        this.registerResult(owner, ev.base > 0);
        results.push({ playerId: owner.id, title: ev.title, artist: ev.artist, year: ev.year, points: pts, breakdown: bd, viaPartner: true, answeredMs: answeredMs(djRec), givenTitle: djRec?.title, givenArtist: djRec?.artist });
        if (ev.base > 0) {
          this.addPoints(r.dj.partnerId, SCORING.partnerHelperBonus);
          results.push({ playerId: r.dj.partnerId, title: ev.title, artist: ev.artist, year: ev.year, points: SCORING.partnerHelperBonus, breakdown: [`Bonificación de DJ +${SCORING.partnerHelperBonus}`], viaPartner: true, answeredMs: null });
        }
        pts = 0;
      } else {
        let main = scoreOne(owner.id, r.answers.get(owner.id), { allowBonuses: true });
        if (r.coAnswerer) {
          const co = scoreOne(r.coAnswerer, r.answers.get(r.coAnswerer), { allowBonuses: true });
          if (co.points > main.points) main = { ...co, playerId: owner.id, viaPartner: true, breakdown: [...co.breakdown, 'BACK TO BACK: cuenta la respuesta de tu DJ'] };
          const coPts = Math.round(main.points / 2);
          this.addPoints(r.coAnswerer, coPts);
          results.push({ ...main, playerId: r.coAnswerer, points: coPts, breakdown: [`BACK TO BACK: mitad de los puntos +${coPts}`] });
        }
        const failed = main.points === 0;
        if (failed && r.mods.failPenalty) {
          this.addPoints(owner.id, -r.mods.failPenalty);
          main.points = -r.mods.failPenalty;
          main.breakdown.push(`Penalización −${r.mods.failPenalty}`);
        } else this.addPoints(owner.id, main.points);
        this.registerResult(owner, !failed);
        results.unshift(main);
        if (r.context === 'assign' && r.assignFrom && failed) {
          this.addPoints(r.assignFrom, SCORING.cambioDjSteal);
          results.push({ playerId: r.assignFrom, title: false, artist: false, year: null, points: SCORING.cambioDjSteal, breakdown: [`CAMBIO DE DJ: tu víctima falló +${SCORING.cambioDjSteal}`], viaPartner: false, answeredMs: null });
        }
      }
    } else if (r.kind === 'hum') {
      const partnerId = r.participants[0];
      const fb = scoreOne(partnerId, r.answers.get(partnerId), { allowBonuses: false });
      const ok = fb.points > 0;
      fb.points = ok ? SCORING.humBoth : 0;
      fb.breakdown = ok ? [`¡Te entendió! +${SCORING.humBoth} para los dos`] : ['No hubo suerte'];
      if (ok) {
        this.addPoints(partnerId, SCORING.humBoth);
        this.addPoints(r.performerId!, SCORING.humBoth);
      }
      results.push(fb, { playerId: r.performerId!, title: ok, artist: ok, year: null, points: ok ? SCORING.humBoth : 0, breakdown: [ok ? `Tarareo descifrado +${SCORING.humBoth}` : 'Nadie lo descifró'], viaPartner: false, answeredMs: null });
    } else if (r.kind === 'mime') {
      const first = r.answers.get('__firstCorrect')?.title;
      let anyone = false;
      for (const pid of r.participants) {
        if (pid === r.performerId) continue;
        const fb = scoreOne(pid, r.answers.get(pid), { allowBonuses: false });
        const ok = fb.points > 0;
        anyone ||= ok;
        fb.points = ok ? (pid === first ? SCORING.mimeGuesser : Math.round(SCORING.mimeGuesser / 2)) : 0;
        fb.breakdown = ok ? [pid === first ? `¡Primero en adivinar! +${fb.points}` : `Adivinaste +${fb.points}`] : ['Sin acierto'];
        this.addPoints(pid, fb.points);
        results.push(fb);
      }
      if (r.performerId) {
        const pts = anyone ? SCORING.mimePerformer : 0;
        this.addPoints(r.performerId, pts);
        results.unshift({ playerId: r.performerId, title: anyone, artist: anyone, year: null, points: pts, breakdown: [anyone ? `Gran actuación +${pts}` : 'Nadie lo adivinó'], viaPartner: false, answeredMs: null });
      }
    } else if (r.kind === 'quiz') {
      const pid = r.participants[0];
      const fb = scoreOne(pid, r.answers.get(pid), { allowBonuses: false });
      this.addPoints(pid, fb.points);
      this.registerResult(this.p(pid), fb.points > 0);
      results.push(fb);
    } else {
      // duel / group / sync
      for (const pid of r.participants) {
        const fb = scoreOne(pid, r.answers.get(pid), { allowBonuses: true });
        results.push(fb);
      }
      if (r.context === 'king') {
        const winners = results.filter((x) => x.points > 0 && x.answeredMs !== null).sort((a, b) => a.answeredMs! - b.answeredMs!);
        if (winners[0]) {
          winners[0].points += SCORING.kingBonus;
          winners[0].breakdown.push(`👑 REY DE LA PISTA +${SCORING.kingBonus}`);
        }
      }
      if (r.context === 'sync' && results.length === 2 && results.every((x) => x.points > 0)) {
        for (const x of results) {
          x.points += SCORING.syncBonus;
          x.breakdown.push(`SINCRONÍA perfecta +${SCORING.syncBonus}`);
        }
      }
      if (r.kind !== 'duel') {
        for (const x of results) {
          this.addPoints(x.playerId, x.points);
          const pl = this.players.get(x.playerId);
          if (pl) this.registerResult(pl, x.points > 0);
        }
      }
    }

    this.log(`🎵 Era «${r.track.title}» — ${r.track.artist}`);

    if (r.kind === 'duel') {
      this.resolveDuelRound(r, results);
      return;
    }

    const now = this.now();
    const moreInSequence = !!r.sequence && r.sequence.index < r.sequence.total;
    const then = () => {
      if (moreInSequence) {
        const seq = { index: r.sequence!.index + 1, total: r.sequence!.total };
        this.startGroupRound(r.context, r.label, { multiplier: r.multiplier, variant: r.variant, sequence: seq, participants: r.context === 'final' ? r.participants : undefined, card: r.card });
      } else if (r.context === 'final') this.finishGame();
      else this.endTurn();
    };
    const nextAt = now + SCORING.resultPauseSec * 1000;
    this.setStage({ type: 'trackResult', round: r, results, nextAt, then });
    this.schedule('stage-next', nextAt, then);
  }

  private resolveDuelRound(r: Round, results: AnswerFeedback[]) {
    const [a, b] = results;
    let outcome: Record<string, ResultColor>;
    let summary: string;
    const pts: Record<string, number> = { [a.playerId]: a.points, [b.playerId]: b.points };
    const winnerFirst = (x: AnswerFeedback, y: AnswerFeedback) => {
      if (x.points !== y.points) return x.points > y.points;
      if (x.points === 0) return null;
      if (x.answeredMs !== null && y.answeredMs !== null && x.answeredMs !== y.answeredMs) return x.answeredMs < y.answeredMs;
      return null;
    };
    const res = winnerFirst(a, b);
    if (res === null) {
      outcome = { [a.playerId]: 'yellow', [b.playerId]: 'yellow' };
      summary = a.points === 0 ? 'Nadie acertó: empate' : 'Empate técnico';
    } else {
      const win = res ? a : b;
      const lose = res ? b : a;
      outcome = { [win.playerId]: 'green', [lose.playerId]: 'red' };
      pts[win.playerId] += SCORING.greenPoints;
      summary = `${this.name(win.playerId)} gana el duelo`;
    }
    this.startReveal({ title: r.label, competitors: [a.playerId, b.playerId], outcome, points: pts, summary, track: r.track, countRegisters: results });
  }

  // ───────── Retos ─────────
  private startChallenge(card: CardDef, activeId: string, targetId: string | null) {
    const pl = this.p(activeId);
    const voteDuel = (prompt: string) => {
      if (!targetId) throw new GameError('Falta elegir rival');
      this.startPerform(card, [activeId, targetId], prompt, 'duel', 0);
    };
    switch (card.id) {
      case 'dance_battle': return voteDuel('20 segundos de baile cada uno. ¡Que suene algo en la sala!');
      case 'canta_drop': return voteDuel('Cada uno canta el coro más épico que recuerde.');
      case 'air_guitar': return voteDuel('Solo de guitarra invisible: 20 segundos cada uno.');
      case 'beatbox': return voteDuel('15 segundos de beatbox cada uno.');
      case 'batalla_generos': {
        const genre = pick(GENRE_BATTLE, this.rand);
        return this.startPerform(card, [activeId], `Nombra en voz alta 4 canciones de: ${genre.toUpperCase()}`, 'approval', 0, 30);
      }
      case 'publico_decide':
        return this.startPerform(card, [activeId], 'Consigue que toda la sala cante contigo un coro.', 'approval', 0, 25);
      case 'duelo_relampago': {
        if (!targetId) throw new GameError('Falta elegir rival');
        const round = this.newRound({ context: 'duel', kind: 'duel', label: 'DUELO RELÁMPAGO', participants: [activeId, targetId], ownerId: activeId, timeSec: Math.min(this.config.timeLimitSec, 60), card });
        return this.launchRound(round);
      }
      case 'cambio_dj':
        if (!targetId) throw new GameError('Falta elegir jugador');
        return this.startSoloRound(targetId, 'assign', card, { assignFrom: activeId });
      case 'reconoce_remix':
        return this.startSoloRound(activeId, 'remix', card);
      case 'fragmento_relampago':
        return this.startSoloRound(activeId, 'fragment', card);
      case 'dj_ciegas':
      case 'que_epoca': {
        const round = this.newRound({ context: 'quiz', kind: 'quiz', label: card.name, participants: [activeId], ownerId: activeId, timeSec: 20, variant: 'short', clipSec: card.id === 'dj_ciegas' ? 5 : 8, card });
        round.replaysLeft = card.id === 'dj_ciegas' ? 0 : 1;
        round.quiz = card.id === 'dj_ciegas' ? this.artistQuiz(round.track) : this.eraQuiz(round.track);
        round.fields = { title: false, artist: false, year: false };
        return this.launchRound(round);
      }
      case 'tararea': {
        const partner = pl.partnerId && this.players.get(pl.partnerId)?.connected ? pl.partnerId : this.others(activeId)[0];
        if (!partner) throw new GameError('Necesitas a alguien que adivine');
        const round = this.newRound({ context: 'hum', kind: 'hum', label: 'TARAREA Y GANA', participants: [partner], performerId: activeId, ownerId: activeId, timeSec: 45, noAudio: true, card, fields: { title: true, artist: true, year: false } });
        return this.launchRound(round);
      }
      case 'mimica': {
        const round = this.newRound({ context: 'mime', kind: 'mime', label: 'MÍMICA MUSICAL', participants: this.others(activeId), performerId: activeId, ownerId: activeId, timeSec: 60, noAudio: true, card, fields: { title: true, artist: false, year: false } });
        return this.launchRound(round);
      }
      case 'sincronia': {
        const partner = pl.partnerId && this.players.get(pl.partnerId)?.connected ? pl.partnerId : this.others(activeId)[0];
        if (!partner) throw new GameError('Necesitas a tu DJ');
        const round = this.newRound({ context: 'sync', kind: 'group', label: 'SINCRONÍA', participants: [activeId, partner], ownerId: activeId, timeSec: Math.min(this.config.timeLimitSec, 60), card });
        return this.launchRound(round);
      }
      default:
        this.endTurn();
    }
  }

  private artistQuiz(t: TrackDef) {
    const artists = [...new Set(this.deps.catalog.all().map((x) => x.artist))].filter((a) => a !== t.artist && a !== 'Tradicional');
    const options = shuffle([t.artist, ...shuffle(artists, this.rand).slice(0, 3)], this.rand);
    return { question: '¿Quién es el artista o compositor?', options, correct: options.indexOf(t.artist) };
  }

  private eraQuiz(t: TrackDef) {
    const right = eraLabel(t.year);
    const all = [...new Set(this.deps.catalog.all().map((x) => eraLabel(x.year)))].filter((x) => x !== right);
    const options = shuffle([right, ...shuffle(all, this.rand).slice(0, 3)], this.rand);
    return { question: '¿De qué época es esta canción?', options, correct: options.indexOf(right) };
  }

  private startPerform(card: CardDef, competitors: string[], prompt: string, voteKind: 'duel' | 'approval', failPenalty: number, seconds: number = SCORING.performSec) {
    const now = this.now();
    const endsAt = now + (voteKind === 'duel' ? seconds * 2 : seconds) * 1000;
    this.setStage({ type: 'perform', card, competitors, prompt, endsAt, voteKind, failPenalty });
    this.schedule('stage-perform', endsAt, () => this.startVote());
  }

  private startVote() {
    const st = this.stage;
    if (st?.type !== 'perform') return;
    const eligible = this.connectedIds().filter((id) => !st.competitors.includes(id));
    const now = this.now();
    const endsAt = now + SCORING.voteSec * 1000;
    this.setStage({ type: 'vote', card: st.card, competitors: st.competitors, voteKind: st.voteKind, endsAt, votes: new Map(), eligible, failPenalty: st.failPenalty });
    this.log(`🗳️ Votación abierta: ${st.card.name}`, 'special');
    if (!eligible.length) {
      this.closeVote();
      return;
    }
    this.schedule('stage-vote', endsAt, () => this.closeVote());
  }

  private castVote(voterId: string, forId: string | null, approve?: boolean) {
    const st = this.stage;
    if (st?.type !== 'vote') throw new GameError('No hay votación abierta');
    if (st.competitors.includes(voterId)) throw new GameError('Los participantes no votan');
    if (!st.eligible.includes(voterId)) throw new GameError('No puedes votar en esta ronda');
    if (st.votes.has(voterId)) throw new GameError('Ya votaste');
    if (st.voteKind === 'duel') {
      if (!forId || !st.competitors.includes(forId)) throw new GameError('Voto no válido');
    } else if (typeof approve !== 'boolean') throw new GameError('Voto no válido');
    const voter = this.p(voterId);
    const weight = this.consumeBuff(voter, 'voto_oro') ? 2 : 1;
    st.votes.set(voterId, { forId: st.voteKind === 'duel' ? forId : null, approve, weight });
    this.maybeCloseVote();
  }

  private maybeCloseVote() {
    const st = this.stage;
    if (st?.type !== 'vote') return;
    const pending = st.eligible.filter((id) => this.players.get(id)?.connected && !st.votes.has(id));
    if (!pending.length) this.closeVote();
  }

  private closeVote() {
    const st = this.stage;
    if (st?.type !== 'vote') return;
    const outcome: Record<string, ResultColor> = {};
    const points: Record<string, number> = {};
    let summary: string;
    if (st.voteKind === 'duel') {
      const [a, b] = st.competitors;
      const count = (id: string) => [...st.votes.values()].filter((v) => v.forId === id).reduce((s, v) => s + v.weight, 0);
      const ca = count(a);
      const cb = count(b);
      if (ca === cb) {
        outcome[a] = outcome[b] = 'yellow';
        points[a] = points[b] = this.config.tieMode === 'reduced' ? SCORING.yellowPoints : 0;
        summary = st.votes.size ? `Empate ${ca} a ${cb}` : 'Nadie votó: empate';
      } else {
        const [w, l] = ca > cb ? [a, b] : [b, a];
        outcome[w] = 'green';
        outcome[l] = 'red';
        points[w] = SCORING.greenPoints;
        points[l] = 0;
        summary = `${this.name(w)} gana ${Math.max(ca, cb)} a ${Math.min(ca, cb)}`;
      }
    } else {
      const [p] = st.competitors;
      const yes = [...st.votes.values()].filter((v) => v.approve).reduce((s, v) => s + v.weight, 0);
      const no = [...st.votes.values()].filter((v) => v.approve === false).reduce((s, v) => s + v.weight, 0);
      if (yes > no) {
        outcome[p] = 'green';
        points[p] = st.failPenalty ? 0 : SCORING.approvalGreenPoints;
        summary = `Aprobado ${yes} a ${no}`;
      } else if (yes === no) {
        outcome[p] = 'yellow';
        points[p] = st.failPenalty ? 0 : SCORING.yellowPoints;
        summary = st.votes.size ? `Empate ${yes} a ${no}` : 'Nadie votó: empate';
      } else {
        outcome[p] = 'red';
        points[p] = -st.failPenalty;
        summary = `No aprobado ${yes} a ${no}`;
      }
    }
    const tiebreak = st.voteKind === 'duel' && this.config.tieMode === 'tiebreak' && Object.values(outcome).every((c) => c === 'yellow');
    this.startReveal({ title: st.card.name, competitors: st.competitors, outcome, points, summary, track: null, tiebreak });
  }

  private startReveal(o: { title: string; competitors: string[]; outcome: Record<string, ResultColor>; points: Record<string, number>; summary: string; track: TrackDef | null; tiebreak?: boolean; countRegisters?: AnswerFeedback[] }) {
    // ESPEJO: una roja se convierte en amarilla.
    for (const [pid, color] of Object.entries(o.outcome)) {
      const pl = this.players.get(pid);
      if (color === 'red' && pl && this.consumeBuff(pl, 'espejo')) {
        o.outcome[pid] = 'yellow';
        if ((o.points[pid] ?? 0) < 0) o.points[pid] = 0;
        o.summary += ` · ESPEJO salva a ${pl.name}`;
      }
    }
    const now = this.now();
    const revealAt = now + 800 + SCORING.revealCountdownMs;
    const nextAt = revealAt + 7000;
    const tiebreak = o.tiebreak;
    const after = tiebreak
      ? () => {
          const [a, b] = o.competitors;
          this.log('⚔️ ¡Desempate! Duelo relámpago', 'special');
          const round = this.newRound({ context: 'tiebreak', kind: 'duel', label: 'DESEMPATE', participants: [a, b], ownerId: a, timeSec: Math.min(this.config.timeLimitSec, 45) });
          this.launchRound(round);
        }
      : null;
    this.setStage({ type: 'reveal', title: o.title, competitors: o.competitors, revealAt, outcome: o.outcome, summary: o.summary, points: o.points, released: false, track: o.track, nextAt, after });
    // El resultado se publica poco antes de la revelación para absorber la latencia;
    // los puntos se aplican exactamente al voltear las tarjetas.
    this.schedule('stage-release', revealAt - SCORING.outcomeLeadMs, () => {
      if (this.stage?.type === 'reveal') this.stage.released = true;
    });
    this.schedule('stage-apply', revealAt, () => {
      for (const [pid, color] of Object.entries(o.outcome)) {
        const pl = this.players.get(pid);
        if (!pl) continue;
        this.addPoints(pid, o.points[pid] ?? 0);
        if (color === 'green') {
          pl.greens++;
          if (pl.greens % SCORING.greensEvery === 0) {
            const w = this.restoreWildcard(pl);
            if (w) this.log(`🟩 ${pl.greens} verdes: ${pl.name} recupera ${WILDCARD_NAME[w]}`, 'good');
            else {
              this.addPoints(pid, SCORING.greensRewardPoints);
              this.log(`🟩 ${pl.greens} verdes: ${pl.name} +${SCORING.greensRewardPoints}`, 'good');
            }
          }
        } else if (color === 'red') pl.reds++;
        else pl.yellows++;
      }
      for (const fb of o.countRegisters ?? []) {
        const pl = this.players.get(fb.playerId);
        if (pl) this.registerResult(pl, fb.points > 0);
      }
      this.log(`🃏 ${o.title}: ${o.summary}`, 'special');
    });
    this.schedule('stage-next', nextAt, () => {
      if (this.stage?.type === 'reveal') this.afterReveal(this.stage);
    });
  }

  private afterReveal(st: Extract<Stage, { type: 'reveal' }>) {
    if (st.after) st.after();
    else this.endTurn();
  }

  // ───────── Penalizaciones (solo adultos) ─────────
  private startPenalty(card: CardDef, targetId: string) {
    if (this.config.familyMode) {
      this.endTurn();
      return;
    }
    const pl = this.p(targetId);
    const toast = { id: 'toast', label: 'Brindis 🥂', detail: 'Un sorbo de la bebida que tengas a mano: agua, refresco, jugo o la que prefieras. Siempre voluntario.' };
    const fiesta = this.config.modality === 'fiesta';
    switch (card.id) {
      case 'baja_volumen':
        if (fiesta) return this.setStage({ type: 'penalty', card, targetId, chooserId: targetId, options: [{ id: 'points', label: `Perder ${SCORING.penaltyLoss} puntos`, detail: 'Nunca bajas de cero.' }, toast] });
        this.addPoints(targetId, -SCORING.penaltyLoss);
        this.log(`🔻 ${pl.name} pierde ${SCORING.penaltyLoss} puntos`, 'bad');
        return this.endTurn();
      case 'donacion': {
        const last = this.ranking().filter((x) => x.id !== targetId).pop();
        if (fiesta) return this.setStage({ type: 'penalty', card, targetId, chooserId: targetId, options: [{ id: 'points', label: `Donar 50 puntos a ${last?.name ?? 'el último'}`, detail: 'Ayudas a la remontada.' }, toast] });
        this.applyDonation(targetId);
        return this.endTurn();
      }
      case 'sin_red':
        this.addBuff(pl, 'sin_red');
        this.log(`🚫 ${pl.name} jugará su próxima canción sin comodines`, 'bad');
        return this.endTurn();
      case 'reloj_apurado':
        this.addBuff(pl, 'reloj_apurado');
        this.log(`⏱️ ${pl.name} tendrá la mitad del tiempo`, 'bad');
        return this.endTurn();
      case 'dj_reves':
        this.addBuff(pl, 'dj_reves');
        this.log(`🙃 ${pl.name} deberá acertar título y artista`, 'bad');
        return this.endTurn();
      case 'rival_elige': {
        const chooser = this.ranking().find((x) => x.id !== targetId && x.connected) ?? pl;
        return this.setStage({
          type: 'penalty', card, targetId, chooserId: chooser.id,
          options: [
            { id: 'short', label: 'Fragmento corto', detail: 'Su próxima canción sonará solo 4 segundos.' },
            { id: 'remix', label: 'Versión remix', detail: 'Escuchará una versión alterada.' },
            { id: 'nohints', label: 'Sin comodines', detail: 'No podrá usar comodines.' }
          ]
        });
      }
      case 'ronda_extra':
        return this.startSoloRound(targetId, 'extra', card);
      case 'imitacion':
        return this.startPerform(card, [targetId], 'Imita a un cantante famoso durante 15 segundos.', 'approval', 50, 15);
      case 'microfono_abierto':
        return this.startPerform(card, [targetId], 'El grupo elige un coro. Cántalo 10 segundos.', 'approval', 50, 15);
      case 'brindis_cabina':
        return this.setStage({ type: 'penalty', card, targetId, chooserId: targetId, options: [{ id: 'points', label: 'Perder 50 puntos', detail: 'Nunca bajas de cero.' }, toast] });
      default:
        return this.endTurn();
    }
  }

  private applyDonation(fromId: string) {
    const from = this.p(fromId);
    const last = this.ranking().filter((x) => x.id !== fromId).pop();
    const amount = Math.min(50, from.score);
    this.addPoints(fromId, -amount);
    if (last) this.addPoints(last.id, amount);
    this.log(`🎁 ${from.name} dona ${amount} puntos a ${last?.name ?? 'nadie'}`, 'bad');
  }

  private penaltyChoice(actorId: string, optionId: string, isHost: boolean) {
    const st = this.stage;
    if (st?.type !== 'penalty') throw new GameError('No hay penalización pendiente');
    if (this.config.familyMode) {
      this.endTurn();
      return;
    }
    if (actorId !== st.chooserId && !isHost) throw new GameError(`Decide ${this.name(st.chooserId)}`);
    if (!st.options.some((o) => o.id === optionId)) throw new GameError('Opción no válida');
    const target = this.p(st.targetId);
    if (optionId === 'toast') this.log(`🥂 ${target.name} hace un brindis de cabina`, 'special');
    else if (optionId === 'points') {
      if (st.card.id === 'donacion') this.applyDonation(target.id);
      else {
        const loss = st.card.id === 'baja_volumen' ? SCORING.penaltyLoss : 50;
        this.addPoints(target.id, -loss);
        this.log(`🔻 ${target.name} pierde ${loss} puntos`, 'bad');
      }
    } else if (optionId === 'short') this.addBuff(target, 'handicap_short');
    else if (optionId === 'remix') this.addBuff(target, 'handicap_remix');
    else if (optionId === 'nohints') this.addBuff(target, 'sin_red');
    if (['short', 'remix', 'nohints'].includes(optionId)) this.log(`😈 ${this.name(st.chooserId)} le pone un obstáculo a ${target.name}`, 'bad');
    this.endTurn();
  }

  // ───────── Comodines salvajes ─────────
  private startWild(card: CardDef, activeId: string) {
    switch (card.id) {
      case 'caos_cabina': {
        const ids = this.livePlayers().map((p) => p.id);
        if (ids.length >= 2) {
          const saved: Record<string, string | null> = {};
          for (const id of ids) saved[id] = this.p(id).partnerId;
          let perm = shuffle(ids, this.rand);
          for (let i = 0; i < 20 && perm.some((x, j) => x === ids[j]); i++) perm = shuffle(ids, this.rand);
          if (perm.some((x, j) => x === ids[j])) perm = [...ids.slice(1), ids[0]];
          ids.forEach((id, j) => (this.p(id).partnerId = perm[j]));
          this.chaos = { untilTurn: this.turnNumber + 1 + ids.length, saved: this.chaos?.saved ?? saved };
        }
        this.log('🌀 CAOS EN LA CABINA: todos cambian de DJ durante una vuelta', 'special');
        return this.endTurn();
      }
      case 'rave_relampago':
        return this.startGroupRound('rave', 'RAVE RELÁMPAGO', { sequence: { index: 1, total: 3 }, card });
      case 'rey_pista':
        return this.startGroupRound('king', 'EL REY DE LA PISTA', { card });
      case 'gran_remix':
        return this.startGroupRound('group', 'EL GRAN REMIX', { variant: 'remix', multiplier: 1.5, card });
      case 'ultimo_drop_wild':
        this.hideScores(this.turnNumber);
        return this.startGroupRound('group', 'DROP SECRETO', { multiplier: 2, card });
      default:
        void activeId;
        return this.endTurn();
    }
  }

  private hideScores(untilTurn: number) {
    if (!this.hiddenScores) this.hiddenScores = Object.fromEntries(this.livePlayers().map((p) => [p.id, p.score]));
    this.hideUntilTurn = untilTurn;
  }

  // ───────── Final ─────────
  private startFinal() {
    this.phase = 'final';
    const rank = this.ranking().filter((p) => p.connected);
    const finalists = rank.slice(0, Math.min(3, rank.length)).map((p) => p.id);
    this.hideScores(Number.MAX_SAFE_INTEGER);
    const startAt = this.now() + 6000;
    this.setStage({ type: 'finalIntro', finalists, startAt });
    this.log('🏁 LLEGÓ EL ÚLTIMO DROP', 'special');
    this.schedule('stage-final', startAt, () => this.startGroupRound('final', 'ÚLTIMO DROP', { multiplier: 2, sequence: { index: 1, total: 2 }, participants: finalists }));
  }

  private finishGame() {
    this.hiddenScores = null;
    this.phase = 'ended';
    this.trackRanks();
    this.titles = this.computeTitles();
    this.setStage({ type: 'podium' });
    const w = this.ranking()[0];
    this.log(`🏆 ${w?.name ?? '—'} es MASTER OF THE DECK`, 'special');
  }

  computeTitles(): FinalTitle[] {
    const rank = this.ranking();
    const out: FinalTitle[] = [];
    if (rank[0]) out.push({ key: 'master', name: 'MASTER OF THE DECK', playerId: rank[0].id, detail: `${rank[0].score} puntos` });
    const acc = rank.filter((p) => p.attempted >= 2).sort((a, b) => b.correct / b.attempted - a.correct / a.attempted || b.correct - a.correct)[0];
    if (acc) out.push({ key: 'oido', name: 'OÍDO DE ORO', playerId: acc.id, detail: `${Math.round((acc.correct / acc.attempted) * 100)}% de precisión` });
    const fast = rank.slice().sort((a, b) => b.fastCorrect - a.fastCorrect)[0];
    if (fast && fast.fastCorrect > 0) out.push({ key: 'drop', name: 'REY DEL DROP', playerId: fast.id, detail: `${fast.fastCorrect} respuestas rápidas` });
    const comeback = rank.map((p, i) => ({ p, gain: p.worstRank - (i + 1) })).sort((a, b) => b.gain - a.gain)[0];
    if (comeback && comeback.gain > 0) out.push({ key: 'comeback', name: 'COMEBACK LEGEND', playerId: comeback.p.id, detail: `Remontó ${comeback.gain} puesto${comeback.gain > 1 ? 's' : ''}` });
    const duel = rank.slice().sort((a, b) => b.greens - a.greens)[0];
    if (duel && duel.greens > 0) out.push({ key: 'duel', name: 'DUEL MASTER', playerId: duel.id, detail: `${duel.greens} tarjeta${duel.greens > 1 ? 's' : ''} verde${duel.greens > 1 ? 's' : ''}` });
    return out;
  }

  // ───────── Saltos del anfitrión (desbloqueo) ─────────
  private hostSkip() {
    const st = this.stage;
    if (!st) throw new GameError('Nada que saltar');
    switch (st.type) {
      case 'turn':
        this.log(`⏭️ El anfitrión salta el turno de ${this.name(st.activeId)}`);
        return this.endTurn();
      case 'card':
        if (st.awaiting === 'target') {
          const t = st.targetOptions?.[0];
          if (!t) return this.endTurn();
          return this.chooseTarget(st.drawnBy, t);
        }
        if (st.next === 'track') return this.startSoloRound(st.drawnBy, 'solo', null);
        return this.continueStage(st.drawnBy, true);
      case 'track':
        return this.finishRound(st.round);
      case 'trackResult':
        return st.then();
      case 'perform':
        return this.startVote();
      case 'vote':
        return this.closeVote();
      case 'reveal':
        if (this.now() < st.revealAt) throw new GameError('Espera la revelación');
        return this.afterReveal(st);
      case 'penalty':
        return this.penaltyChoice(st.chooserId, st.options[0].id, true);
      case 'finalIntro':
        return this.startGroupRound('final', 'ÚLTIMO DROP', { multiplier: 2, sequence: { index: 1, total: 2 }, participants: st.finalists });
      case 'podium':
        throw new GameError('La partida terminó');
    }
  }

  // ───────── Vistas personalizadas ─────────
  viewFor(viewerId: string): RoomView {
    const now = this.now();
    const hidden = this.hiddenScores;
    const players: PlayerPublic[] = this.livePlayers().map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      isHost: p.id === this.hostId,
      connected: p.connected,
      partnerId: p.partnerId,
      score: hidden ? hidden[p.id] ?? 0 : p.score,
      correct: p.correct,
      attempted: p.attempted,
      streak: p.streak,
      greens: p.greens,
      reds: p.reds,
      yellows: p.yellows,
      fastCorrect: p.fastCorrect,
      wildcards: { ...p.wildcards },
      buffs: p.buffs.map((b): BuffPublic => ({ id: b, label: BUFF_LABEL[b][0], kind: BUFF_LABEL[b][1] })),
      isMinor: p.isMinor
    }));
    return {
      code: this.code,
      you: viewerId,
      hostId: this.hostId,
      phase: this.phase,
      config: this.config,
      players,
      turnNumber: this.turnNumber,
      totalTurns: this.totalTurns,
      currentRound: this.order.length ? Math.min(this.config.rounds, Math.floor(this.turnNumber / this.order.length) + 1) : 1,
      activeId: this.phase === 'playing' ? this.active()?.id ?? null : null,
      stage: this.stageView(viewerId, now),
      leaderboardHidden: !!hidden,
      events: this.events.slice(-60),
      titles: this.titles,
      serverNow: now,
      deckLeft: this.deck.filter((c) => !this.usedSerials.has(c.serial)).length,
      joinUrl: this.deps.joinUrl(this.code),
      availableExpansions: this.deps.catalog.expansionViews()
    };
  }

  private reveal(t: TrackDef): TrackReveal {
    return { title: t.title, artist: t.artist, year: t.year, genre: t.genre, country: t.country, edition: t.expansion, rightsNote: t.rights.note };
  }

  private playsAudio(viewerId: string, r: Round): boolean {
    if (!r.audioToken) return false;
    if (this.config.audioMode === 'all') return true;
    if (this.config.audioMode === 'active') return viewerId === r.ownerId || (r.kind !== 'solo' && viewerId === this.hostId && !this.players.get(r.ownerId)?.connected);
    return viewerId === this.hostId;
  }

  private stageView(viewerId: string, now: number): StageView | null {
    const st = this.stage;
    if (!st) return null;
    switch (st.type) {
      case 'turn':
        return st;
      case 'card':
        return { type: 'card', card: st.card, drawnBy: st.drawnBy, via: st.via, autoAt: st.autoAt, awaiting: st.awaiting, targetOptions: st.targetOptions, effectText: st.effectText };
      case 'track': {
        const r = st.round;
        const isPerformer = r.performerId === viewerId;
        const myRec = r.answers.get(viewerId);
        const round: TrackRoundView = {
          id: r.id,
          kind: r.kind,
          label: r.label,
          participants: r.participants,
          performerId: r.performerId,
          startAt: r.audioStartAt,
          endsAt: r.endsAt,
          frozenUntil: r.frozenUntil,
          multiplier: r.multiplier,
          variant: r.variant,
          fields: r.fields,
          audioToken: this.playsAudio(viewerId, r) ? r.audioToken : null,
          playsAudio: this.playsAudio(viewerId, r),
          audioPlayId: r.audioPlayId,
          replaysLeft: r.replaysLeft,
          sequence: r.sequence,
          hints: r.kind === 'solo' ? r.hints : [],
          answered: [...r.answers.entries()].filter(([k, v]) => !k.startsWith('__') && v.locked).map(([k]) => k),
          myAnswerLocked: !!myRec?.locked,
          canRetry: !!myRec && !myRec.locked,
          dj: r.dj ? { partnerId: r.dj.partnerId, status: r.dj.status } : null,
          iAmDj: (r.dj?.partnerId === viewerId && r.dj.status === 'pending') || r.coAnswerer === viewerId,
          secret: isPerformer ? { title: r.track.title, artist: r.track.artist } : null,
          quiz: r.quiz ? { question: r.quiz.question, options: r.quiz.options } : null,
          canUseWildcards: r.kind === 'solo' && r.ownerId === viewerId && !r.mods.noWildcards && !myRec?.locked && !r.dj,
          canSkipTrack: r.kind === 'solo' && r.ownerId === viewerId && r.mods.canSkip && !myRec?.locked
        };
        return { type: 'track', round };
      }
      case 'trackResult':
        return {
          type: 'trackResult',
          roundId: st.round.id,
          label: st.round.label,
          track: this.reveal(st.round.track),
          results: st.results,
          nextAt: st.nextAt,
          moreInSequence: !!st.round.sequence && st.round.sequence.index < st.round.sequence.total
        };
      case 'perform':
        return { type: 'perform', card: st.card, competitors: st.competitors, prompt: st.prompt, endsAt: st.endsAt, voteKind: st.voteKind };
      case 'vote':
        return {
          type: 'vote',
          card: st.card,
          competitors: st.competitors,
          voteKind: st.voteKind,
          endsAt: st.endsAt,
          eligible: st.eligible.includes(viewerId),
          hasVoted: st.votes.has(viewerId),
          votedCount: st.votes.size,
          eligibleCount: st.eligible.length
        };
      case 'reveal': {
        const show = st.released || now >= st.revealAt - SCORING.outcomeLeadMs;
        return {
          type: 'reveal',
          title: st.title,
          competitors: st.competitors,
          revealAt: st.revealAt,
          outcome: show ? st.outcome : null,
          summary: show ? st.summary : null,
          pointsAwarded: show ? st.points : null,
          track: show && st.track ? this.reveal(st.track) : null,
          nextAt: st.nextAt
        };
      }
      case 'penalty':
        return st;
      case 'finalIntro':
        return st;
      case 'podium':
        return st;
    }
  }
}

export const WILDCARD_NAME: Record<WildcardType, string> = {
  dj: 'LLAMA A TU DJ',
  time: 'TIEMPO EXTRA',
  hint: 'PISTA SECRETA'
};
