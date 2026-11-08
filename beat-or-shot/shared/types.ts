// Tipos compartidos entre servidor y cliente.
// El cliente SOLO recibe `RoomView`: una vista personalizada y filtrada por el servidor.

export type Difficulty = 'novato' | 'facil' | 'normal' | 'dificil' | 'melomano';
export type Modality = 'clasico' | 'fiesta';
export type AudioMode = 'host' | 'all' | 'active';
export type TieMode = 'reduced' | 'tiebreak';
export type CardType = 'TRACK' | 'POWER_UP' | 'CHALLENGE' | 'PENALTY' | 'WILD';
export type WildcardType = 'dj' | 'time' | 'hint';
export type ResultColor = 'green' | 'red' | 'yellow';

export interface RoomConfig {
  minorsAsked: boolean;
  hasMinors: boolean;
  familyMode: boolean;
  modality: Modality;
  difficulty: Difficulty;
  timeLimitSec: number;
  rounds: number;
  expansions: string[];
  audioMode: AudioMode;
  tieMode: TieMode;
  tensionSounds: boolean;
}

export interface CardDef {
  id: string;
  type: CardType;
  name: string;
  short: string;
  description: string;
  /** Solo para retos/penalizaciones: requiere al menos N jugadores */
  minPlayers?: number;
  /** Requiere elegir un rival/objetivo */
  needsTarget?: boolean;
  adultsOnly?: boolean;
  rarity?: 'common' | 'rare' | 'legendary';
}

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
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
  buffs: BuffPublic[];
  isMinor: boolean;
}

export interface BuffPublic {
  id: string;
  label: string;
  kind: 'buff' | 'debuff';
}

export interface Hint {
  kind: 'era' | 'genre' | 'country' | 'letter';
  label: string;
  value: string;
}

export interface AnswerFeedback {
  playerId: string;
  title: boolean;
  artist: boolean;
  year: boolean | null;
  points: number;
  breakdown: string[];
  viaPartner: boolean;
  answeredMs: number | null;
  givenTitle?: string;
  givenArtist?: string;
}

export interface TrackReveal {
  title: string;
  artist: string;
  year: number;
  genre: string;
  country: string;
  edition: string;
  rightsNote: string;
}

export interface TrackRoundView {
  id: string;
  kind: 'solo' | 'duel' | 'group' | 'hum' | 'mime' | 'quiz';
  label: string;
  participants: string[];
  performerId: string | null;
  startAt: number;
  endsAt: number;
  frozenUntil: number | null;
  multiplier: number;
  variant: 'normal' | 'remix' | 'short';
  fields: { title: boolean; artist: boolean; year: boolean };
  audioToken: string | null;
  playsAudio: boolean;
  audioPlayId: number;
  replaysLeft: number;
  sequence: { index: number; total: number } | null;
  hints: Hint[];
  answered: string[];
  myAnswerLocked: boolean;
  canRetry: boolean;
  dj: { partnerId: string; status: 'pending' | 'answered' } | null;
  /** Para el compañero DJ: se le pide responder */
  iAmDj: boolean;
  /** Para retos de tarareo/mímica: el intérprete conoce la canción */
  secret: { title: string; artist: string } | null;
  quiz: { question: string; options: string[] } | null;
  canUseWildcards: boolean;
  canSkipTrack: boolean;
}

export type StageView =
  | { type: 'turn'; activeId: string; extraTurn: boolean }
  | {
      type: 'card';
      card: CardDef;
      drawnBy: string;
      via: 'virtual' | 'qr';
      autoAt: number | null;
      targetOptions: string[] | null;
      awaiting: 'continue' | 'target' | null;
      effectText: string | null;
    }
  | { type: 'track'; round: TrackRoundView }
  | {
      type: 'trackResult';
      roundId: string;
      label: string;
      track: TrackReveal | null;
      results: AnswerFeedback[];
      nextAt: number;
      moreInSequence: boolean;
    }
  | { type: 'perform'; card: CardDef; competitors: string[]; prompt: string; endsAt: number; voteKind: 'duel' | 'approval' }
  | {
      type: 'vote';
      card: CardDef;
      competitors: string[];
      voteKind: 'duel' | 'approval';
      endsAt: number;
      eligible: boolean;
      hasVoted: boolean;
      votedCount: number;
      eligibleCount: number;
    }
  | {
      type: 'reveal';
      title: string;
      competitors: string[];
      revealAt: number;
      outcome: Record<string, ResultColor> | null;
      summary: string | null;
      pointsAwarded: Record<string, number> | null;
      track: TrackReveal | null;
      nextAt: number;
    }
  | {
      type: 'penalty';
      card: CardDef;
      targetId: string;
      chooserId: string;
      options: { id: string; label: string; detail: string }[];
    }
  | { type: 'finalIntro'; finalists: string[]; startAt: number }
  | { type: 'podium' };

export interface GameEventView {
  id: number;
  at: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'special';
}

export interface FinalTitle {
  key: string;
  name: string;
  playerId: string;
  detail: string;
}

export interface RoomView {
  code: string;
  you: string;
  hostId: string;
  phase: 'setup' | 'lobby' | 'partners' | 'playing' | 'final' | 'ended';
  config: RoomConfig;
  players: PlayerPublic[];
  turnNumber: number;
  totalTurns: number;
  currentRound: number;
  activeId: string | null;
  stage: StageView | null;
  leaderboardHidden: boolean;
  events: GameEventView[];
  titles: FinalTitle[];
  serverNow: number;
  deckLeft: number;
  joinUrl: string;
  availableExpansions: ExpansionView[];
}

export interface ExpansionView {
  id: string;
  name: string;
  tagline: string;
  status: 'owned' | 'available' | 'soon';
  playableTracks: number;
  totalTracks: number;
  color: string;
}

// ===== Acciones cliente → servidor =====
export type ClientAction =
  | { type: 'configure'; patch: Partial<RoomConfig> }
  | { type: 'answerMinors'; hasMinors: boolean }
  | { type: 'finishSetup' }
  | { type: 'startPartners' }
  | { type: 'choosePartner'; partnerId: string }
  | { type: 'startGame' }
  | { type: 'draw' }
  | { type: 'scan'; code: string }
  | { type: 'continue' }
  | { type: 'chooseTarget'; targetId: string }
  | { type: 'answer'; title?: string; artist?: string; year?: number | null; choice?: number }
  | { type: 'useWildcard'; wildcard: WildcardType }
  | { type: 'skipTrack' }
  | { type: 'replay' }
  | { type: 'endPerformance' }
  | { type: 'vote'; forId: string | null; approve?: boolean }
  | { type: 'penaltyChoice'; optionId: string }
  | { type: 'hostSkip' }
  | { type: 'transferHost'; playerId: string }
  | { type: 'kick'; playerId: string }
  | { type: 'resetDeck' }
  | { type: 'playAgain' };

export interface AudioPayload {
  kind: 'synth' | 'file';
  variant: 'normal' | 'remix' | 'short';
  /** synth */
  bpm?: number;
  notes?: [string, number][];
  /** file */
  url?: string;
  clipStart?: number;
  clipDuration?: number;
}
