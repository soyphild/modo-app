import fs from 'node:fs';
import path from 'node:path';
import { SEED_TRACKS, type TrackDef } from '../../shared/catalog';
import { MemoryCatalog } from './catalogCore';

export { isPlayable, SPOTIFY_TRACK_RE, MemoryCatalog, type CatalogRepository } from './catalogCore';

/** Catálogo con persistencia en data/catalog.json (cambios del panel admin). */
export class JsonCatalogStore extends MemoryCatalog {
  constructor(private file: string | null) {
    super();
    if (file && fs.existsSync(file)) {
      try {
        const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as TrackDef[];
        for (const t of saved) this.tracks.set(t.id, t);
      } catch (err) {
        console.error('[catalog] no se pudo leer', file, err);
      }
    }
  }
  upsert(track: TrackDef) {
    super.upsert(track);
    this.persist();
    return track;
  }
  private persist() {
    if (!this.file) return;
    const seeds = new Map(SEED_TRACKS.map((t) => [t.id, JSON.stringify(t)]));
    const changed = this.all().filter((t) => seeds.get(t.id) !== JSON.stringify(t));
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(changed, null, 2));
  }
}
