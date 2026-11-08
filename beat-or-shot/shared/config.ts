import type { Difficulty, RoomConfig } from './types';

/** Opciones de tiempo máximo de respuesta por carta (segundos). */
export const TIME_OPTIONS = [30, 60, 120, 180, 300, 600] as const;
export const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export const MAX_PLAYERS = 12;

/**
 * Puntuación configurable. Todos los valores son ajustables tras las pruebas de balance.
 * Se mantiene en un solo objeto para poder cargarlo desde el panel admin más adelante.
 */
export const SCORING = {
  both: 200,
  titleOnly: 100,
  artistOnly: 75,
  fastBonus: 100,
  fastWindowSec: 15,
  fastWindowRatio: 0.25,
  noWildcardBonus: 50,
  partnerRatio: 0.5,
  partnerHelperBonus: 50,
  yearBonus: 50,
  yearTolerance: 10,
  greenPoints: 150,
  yellowPoints: 50,
  approvalGreenPoints: 120,
  jackpotBonus: 150,
  kingBonus: 300,
  quizCorrect: 150,
  humBoth: 150,
  mimeGuesser: 150,
  mimePerformer: 100,
  syncBonus: 100,
  cambioDjSteal: 100,
  comebackBonus: 50,
  comebackGap: 300,
  streakEvery: 3,
  streakRewardPoints: 100,
  greensEvery: 3,
  greensRewardPoints: 100,
  maxWildcardPerType: 2,
  penaltyLoss: 75,
  extraTimeSec: 20,
  freezeSec: 15,
  revealCountdownMs: 3600,
  outcomeLeadMs: 1200,
  voteSec: 30,
  performSec: 25,
  resultPauseSec: 9,
  hostGraceSec: 15,
  replays: 2
} as const;

export interface DifficultyRule {
  label: string;
  tagline: string;
  /** Rango de dificultad de canciones (1-5) preferido */
  trackRange: [number, number];
  /** Holgura ortográfica: +1 más permisivo, -1 más estricto */
  fuzz: number;
  /** En Novato, acertar uno de los dos datos vale casi lo mismo */
  partialBoost: boolean;
  /** Parciales valen la mitad */
  partialHalf: boolean;
  requireYear: boolean;
  fragmentSec: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyRule> = {
  novato: {
    label: 'Novato',
    tagline: 'Temas archiconocidos. Basta con el título o el artista.',
    trackRange: [1, 2],
    fuzz: 1,
    partialBoost: true,
    partialHalf: false,
    requireYear: false,
    fragmentSec: 16
  },
  facil: {
    label: 'Fácil',
    tagline: 'Éxitos conocidos con un poco más de reto.',
    trackRange: [1, 3],
    fuzz: 1,
    partialBoost: false,
    partialHalf: false,
    requireYear: false,
    fragmentSec: 14
  },
  normal: {
    label: 'Normal',
    tagline: 'Distintos géneros y épocas. Artistas menos evidentes.',
    trackRange: [2, 4],
    fuzz: 0,
    partialBoost: false,
    partialHalf: false,
    requireYear: false,
    fragmentSec: 12
  },
  dificil: {
    label: 'Difícil',
    tagline: 'Temas menos comerciales y versiones alternativas.',
    trackRange: [3, 5],
    fuzz: 0,
    partialBoost: false,
    partialHalf: false,
    requireYear: false,
    fragmentSec: 10
  },
  melomano: {
    label: 'Melómano',
    tagline: 'Título exacto, artista y año aproximado. Sin piedad.',
    trackRange: [3, 5],
    fuzz: -1,
    partialBoost: false,
    partialHalf: true,
    requireYear: true,
    fragmentSec: 8
  }
};

export const DEFAULT_CONFIG: RoomConfig = {
  minorsAsked: false,
  hasMinors: false,
  familyMode: true,
  modality: 'clasico',
  difficulty: 'normal',
  timeLimitSec: 60,
  rounds: 3,
  expansions: ['demo-clasicos'],
  audioMode: 'host',
  tieMode: 'reduced',
  tensionSounds: true
};

export const AVATARS = ['🎧', '🎤', '🎸', '🥁', '🎹', '🎷', '🎺', '🪩', '🦊', '🐯', '🐙', '🦄', '👽', '🔥', '⚡', '🌙'];
export const PLAYER_COLORS = ['#8B5CF6', '#00D9FF', '#19C86A', '#FFC247', '#FF4057', '#F472B6', '#38BDF8', '#A3E635', '#FB923C', '#E879F9', '#2DD4BF', '#FACC15'];
