import fs from 'node:fs';
import path from 'node:path';
import { EXPANSIONS, SEED_TRACKS, type TrackDef } from '../../shared/catalog';
import type { ExpansionView } from '../../shared/types';

/**
 * Repositorio del catálogo musical.
 * Prototipo: semillas en código + cambios del panel admin persistidos en data/catalog.json.
 * Producción: misma interfaz sobre PostgreSQL (ver server/db/schema.sql).
 */
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
  if (t.rights.status === 'licensed') {
    if (!t.rights.holder || !t.rights.licenseId) return false;
    if (t.rights.expiresAt && Date.parse(t.rights.expiresAt) < now) return false;
    return true;
  }
  return false;
}

export class JsonCatalogStore implements CatalogRepository {
  private tracks = new Map<string, TrackDef>();
  constructor(private file: string | null) {
    for (const t of SEED_TRACKS) this.tracks.set(t.id, structuredClone(t));
    if (file && fs.existsSync(file)) {
      try {
        const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as TrackDef[];
        for (const t of saved) this.tracks.set(t.id, t);
      } catch (err) {
        console.error('[catalog] no se pudo leer', file, err);
      }
    }
  }

  all() {
    return [...this.tracks.values()];
  }
  get(id: string) {
    return this.tracks.get(id);
  }
  upsert(track: TrackDef) {
    this.tracks.set(track.id, track);
    this.persist();
    return track;
  }
  playable(expansions: string[], { family }: { family: boolean }) {
    return this.all().filter((t) => expansions.includes(t.expansion) && isPlayable(t) && !(family && t.explicit));
  }
  expansionViews(): ExpansionView[] {
    return EXPANSIONS.map((e) => {
      const list = this.all().filter((t) => t.expansion === e.id);
      return {
        id: e.id,
        name: e.name,
        tagline: e.tagline,
        color: e.color,
        status: e.status,
        totalTracks: list.length,
        playableTracks: list.filter((t) => isPlayable(t)).length
      };
    });
  }
  private persist() {
    if (!this.file) return;
    // Solo se guardan las canciones que difieren de la semilla o que son nuevas.
    const seeds = new Map(SEED_TRACKS.map((t) => [t.id, JSON.stringify(t)]));
    const changed = this.all().filter((t) => seeds.get(t.id) !== JSON.stringify(t));
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(changed, null, 2));
  }
}
