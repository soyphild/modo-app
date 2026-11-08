import { EXPANSIONS, SEED_TRACKS, type TrackDef } from '../../shared/catalog';
import type { ExpansionView } from '../../shared/types';

export interface CatalogRepository {
  all(): TrackDef[];
  get(id: string): TrackDef | undefined;
  upsert(track: TrackDef): TrackDef;
  playable(expansions: string[], opts: { family: boolean }): TrackDef[];
  expansionViews(): ExpansionView[];
}

export const SPOTIFY_TRACK_RE = /^https:\/\/open\.spotify\.com\/(intl-[a-z]{2}\/)?track\/[A-Za-z0-9]{22}(\?.*)?$/;

/** Una canción solo es jugable si tiene audio y derechos válidos para reproducirlo. */
export function isPlayable(t: TrackDef, now = Date.now()): boolean {
  if (!t.active || !t.audio) return false;
  if (t.rights.status === 'public_domain_composition') return t.audio.kind === 'synth' || t.audio.kind === 'file';
  if (t.rights.status === 'private_use') return t.audio.kind === 'file';
  if (t.rights.status === 'licensed') {
    if (!t.rights.holder || !t.rights.licenseId) return false;
    if (t.rights.expiresAt && Date.parse(t.rights.expiresAt) < now) return false;
    return true;
  }
  return false;
}

/**
 * Elige el segundo de inicio del fragmento de un archivo de audio.
 * random: evita los primeros 8 s (intros) y el final; hook/fixed: usa el segundo marcado.
 */
export function pickClipStart(audio: TrackDef['audio'], clipSec: number, rand: () => number = Math.random): number {
  if (!audio || audio.kind !== 'file') return 0;
  if (audio.clipMode !== 'random' || !audio.durationSec) return audio.clipStart;
  const min = Math.min(8, Math.max(0, audio.durationSec - clipSec - 1));
  const max = Math.max(min, audio.durationSec - clipSec - 5);
  return Math.round((min + rand() * (max - min)) * 10) / 10;
}

/** Catálogo en memoria (sin dependencias de Node): base del servidor y de la demo en navegador. */
export class MemoryCatalog implements CatalogRepository {
  protected tracks = new Map<string, TrackDef>();
  constructor() {
    for (const t of SEED_TRACKS) this.tracks.set(t.id, structuredClone(t));
  }
  all() {
    return [...this.tracks.values()];
  }
  get(id: string) {
    return this.tracks.get(id);
  }
  upsert(track: TrackDef) {
    this.tracks.set(track.id, track);
    return track;
  }
  playable(expansions: string[], { family }: { family: boolean }) {
    return this.all().filter((t) => expansions.includes(t.expansion) && isPlayable(t) && !(family && t.explicit));
  }
  expansionViews(): ExpansionView[] {
    return EXPANSIONS.map((e) => {
      const list = this.all().filter((t) => t.expansion === e.id);
      return { id: e.id, name: e.name, tagline: e.tagline, color: e.color, status: e.status, totalTracks: list.length, playableTracks: list.filter((t) => isPlayable(t)).length };
    });
  }
}
