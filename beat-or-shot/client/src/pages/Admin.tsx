import { AlertTriangle, CheckCircle2, Play, Plus, Printer, Search, Square, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrackDef } from '../../../shared/catalog';
import { Btn, Logo, Pill, Sheet, cx } from '../components/ui';
import { DEMO, apiFetch } from '../lib/game';

type Row = TrackDef & { playable: boolean };
const KEY = 'bos.adminKey';

function blank(): TrackDef {
  return {
    id: '',
    title: '',
    artist: '',
    titleAliases: [],
    artistAliases: [],
    year: 2000,
    genre: '',
    country: '',
    difficulty: 2,
    expansion: 'general',
    explicit: false,
    spotifyUrl: null,
    audio: null,
    rights: { status: 'pending_license', note: '' },
    active: true
  };
}

export default function AdminPage() {
  const [key, setKey] = useState(() => (DEMO ? 'demo' : sessionStorage.getItem(KEY) ?? ''));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'playable' | 'pending'>('all');
  const [edit, setEdit] = useState<{ t: TrackDef; isNew: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load(k = key) {
    setErr('');
    const res = await apiFetch('/api/admin/tracks', { headers: { 'x-admin-key': k } });
    if (!res.ok) {
      setRows(null);
      return setErr(res.status === 401 ? 'Clave incorrecta' : 'Error al cargar');
    }
    sessionStorage.setItem(KEY, k);
    setRows(await res.json());
  }
  useEffect(() => {
    if (key) void load();
  }, []);

  const list = useMemo(() => {
    const n = q.toLowerCase();
    const mine = (r: Row) => (r.expansion === 'mis-canciones' ? 0 : 1);
    return (rows ?? []).slice().sort((a, b) => mine(a) - mine(b)).filter((r) => (filter === 'all' || (filter === 'playable' ? r.playable : !r.playable)) && (!n || `${r.title} ${r.artist} ${r.genre} ${r.expansion}`.toLowerCase().includes(n)));
  }, [rows, q, filter]);

  if (!rows)
    return (
      <div className="stage-bg grid min-h-[100dvh] place-items-center p-6">
        <form
          className="glass w-full max-w-sm space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <Logo size="sm" />
          <h1 className="font-display text-xl font-bold">Panel administrativo</h1>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Clave ADMIN_KEY" className="w-full" />
          {err && <p className="text-sm text-lose">{err}</p>}
          <Btn type="submit">Entrar</Btn>
        </form>
      </div>
    );

  const playable = rows.filter((r) => r.playable).length;
  return (
    <div className="stage-bg min-h-[100dvh] text-white">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <header className="flex flex-wrap items-center gap-3">
          <Logo size="sm" />
          <span className="text-white/40">/ admin</span>
          <div className="ml-auto flex gap-2">
            <a href={DEMO ? '#' : '/'} className="inline-flex h-9 items-center gap-1 rounded-xl bg-white/10 px-3 text-sm">
              ← Volver al juego
            </a>
            {!DEMO && <a href="/print" target="_blank" className="inline-flex h-9 items-center gap-1 rounded-xl bg-white/10 px-3 text-sm">
              <Printer size={14} /> Hojas de impresión
            </a>}
            <Btn size="sm" onClick={() => setUploading(true)}>
              <Upload size={14} /> Subir canción
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setEdit({ t: blank(), isNew: true })}>
              <Plus size={14} /> Canción
            </Btn>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="glass p-3"><div className="text-[11px] text-white/50">Canciones</div><div className="font-display text-xl font-black">{rows.length}</div></div>
          <div className="glass p-3"><div className="text-[11px] text-white/50">Jugables</div><div className="font-display text-xl font-black text-win">{playable}</div></div>
          <div className="glass p-3"><div className="text-[11px] text-white/50">Sin audio</div><div className="font-display text-xl font-black text-tie">{rows.length - playable}</div></div>
        </div>

        <div className="mt-4 rounded-2xl border border-tie/30 bg-tie/10 p-4 text-sm text-tie">
          <AlertTriangle size={16} className="mb-1 inline" /> Los enlaces de Spotify son <b>solo referencias editoriales</b>. Una canción solo suena en el juego si tiene un fragmento con licencia de grabación y de composición registrado aquí (o es una obra de dominio público interpretada por nosotros).
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título, artista, género…" className="w-full pl-9" />
          </div>
          {(['all', 'playable', 'pending'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cx('rounded-xl px-3 text-sm', filter === f ? 'bg-violet' : 'bg-white/10')}>
              {f === 'all' ? 'Todas' : f === 'playable' ? 'Jugables' : 'Pendientes'}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-white/50">
              <tr>
                <th className="p-3">Canción</th>
                <th className="p-3">Expansión</th>
                <th className="p-3">Género / año</th>
                <th className="p-3">Dif.</th>
                <th className="p-3">Derechos</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} onClick={() => setEdit({ t: r, isNew: false })} className="cursor-pointer border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-xs text-white/50">{r.artist}</div>
                  </td>
                  <td className="p-3 text-xs">{r.expansion}</td>
                  <td className="p-3 text-xs">{r.genre} · {r.year}</td>
                  <td className="p-3">{r.difficulty}</td>
                  <td className="p-3 text-xs">{r.rights.status.replace(/_/g, ' ')}</td>
                  <td className="p-3">{r.playable ? <Pill color="#19C86A"><CheckCircle2 size={11} /> Jugable</Pill> : <Pill color="#FFC247">Sin audio</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={uploading} onClose={() => setUploading(false)} title="Subir canción">
        {uploading && (
          <UploadForm
            adminKey={key}
            onDone={async () => {
              setUploading(false);
              await load();
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'Nueva canción' : 'Editar canción'}>
        {edit && (
          <TrackForm
            initial={edit.t}
            isNew={edit.isNew}
            onSave={async (t) => {
              const res = await apiFetch(edit.isNew ? '/api/admin/tracks' : `/api/admin/tracks/${t.id}`, {
                method: edit.isNew ? 'POST' : 'PUT',
                headers: { 'content-type': 'application/json', 'x-admin-key': key },
                body: JSON.stringify(t)
              });
              const body = await res.json();
              if (!res.ok) return body.error ?? 'Error';
              setEdit(null);
              await load();
              return null;
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-white/60">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}

function TrackForm({ initial, isNew, onSave }: { initial: TrackDef; isNew: boolean; onSave: (t: TrackDef) => Promise<string | null> }) {
  const [t, setT] = useState<TrackDef>(structuredClone(initial));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (patch: Partial<TrackDef>) => setT((x) => ({ ...x, ...patch }));
  const rights = (patch: Partial<TrackDef['rights']>) => setT((x) => ({ ...x, rights: { ...x.rights, ...patch } }));
  const fileAudio = t.audio?.kind === 'file' ? t.audio : null;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await onSave(t);
        setBusy(false);
        if (res) setErr(res);
      }}
    >
      {isNew && (
        <Field label="ID interno" hint="minúsculas, números y guiones">
          <input className="w-full" value={t.id} onChange={(e) => up({ id: e.target.value })} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Título"><input className="w-full" value={t.title} onChange={(e) => up({ title: e.target.value })} /></Field>
        <Field label="Artista"><input className="w-full" value={t.artist} onChange={(e) => up({ artist: e.target.value })} /></Field>
      </div>
      <Field label="Títulos alternativos aceptados" hint="separados por coma">
        <input className="w-full" value={t.titleAliases.join(', ')} onChange={(e) => up({ titleAliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
      </Field>
      <Field label="Nombres artísticos equivalentes" hint="separados por coma">
        <input className="w-full" value={t.artistAliases.join(', ')} onChange={(e) => up({ artistAliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Año"><input className="w-full" type="number" value={t.year} onChange={(e) => up({ year: Number(e.target.value) })} /></Field>
        <Field label="Género"><input className="w-full" value={t.genre} onChange={(e) => up({ genre: e.target.value })} /></Field>
        <Field label="País"><input className="w-full" value={t.country} onChange={(e) => up({ country: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Dificultad">
          <select className="w-full" value={t.difficulty} onChange={(e) => up({ difficulty: Number(e.target.value) as TrackDef['difficulty'] })}>
            {[1, 2, 3, 4, 5].map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Expansión"><input className="w-full" value={t.expansion} onChange={(e) => up({ expansion: e.target.value })} /></Field>
        <Field label="Explícita">
          <select className="w-full" value={t.explicit ? '1' : '0'} onChange={(e) => up({ explicit: e.target.value === '1' })}>
            <option value="0">No</option>
            <option value="1">Sí (excluida en Familiar)</option>
          </select>
        </Field>
      </div>
      <Field label="Enlace de Spotify (referencia)" hint="https://open.spotify.com/track/… — no se usa para reproducir">
        <input className="w-full" value={t.spotifyUrl ?? ''} onChange={(e) => up({ spotifyUrl: e.target.value.trim() || null })} />
      </Field>

      <div className="rounded-2xl bg-white/5 p-3">
        <div className="mb-2 text-sm font-bold">Fragmento de audio autorizado</div>
        {t.audio?.kind === 'synth' ? (
          <p className="text-xs text-white/55">Interpretación sintetizada de una obra de dominio público ({t.audio.notes.length} notas).</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Field label="URL https o local:archivo.mp3">
              <input className="w-full" value={fileAudio?.url ?? ''} onChange={(e) => up({ audio: e.target.value ? { kind: 'file', url: e.target.value, clipStart: fileAudio?.clipStart ?? 0, clipDuration: fileAudio?.clipDuration ?? 15 } : null })} />
            </Field></div>
            <Field label="Inicio (s)"><input className="w-full" type="number" value={fileAudio?.clipStart ?? 0} onChange={(e) => fileAudio && up({ audio: { ...fileAudio, clipStart: Number(e.target.value) } })} /></Field>
            <Field label="Duración (s)"><input className="w-full" type="number" value={fileAudio?.clipDuration ?? 15} onChange={(e) => fileAudio && up({ audio: { ...fileAudio, clipDuration: Number(e.target.value) } })} /></Field>
            <div className="col-span-2">
              <Field label="Cómo se elige el fragmento">
                <select className="w-full" value={fileAudio?.clipMode ?? 'fixed'} onChange={(e) => fileAudio && up({ audio: { ...fileAudio, clipMode: e.target.value as 'fixed' } })}>
                  <option value="random">Al azar en cada partida</option>
                  <option value="hook">Desde el estribillo (segundo de inicio)</option>
                  <option value="fixed">Siempre desde el segundo de inicio</option>
                </select>
              </Field>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 p-3">
        <div className="mb-2 text-sm font-bold">Derechos</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Estado">
            <select className="w-full" value={t.rights.status} onChange={(e) => rights({ status: e.target.value as TrackDef['rights']['status'] })}>
              <option value="pending_license">Pendiente de licencia</option>
              <option value="licensed">Con licencia</option>
              <option value="private_use">Subida por mí</option>
              <option value="public_domain_composition">Dominio público</option>
            </select>
          </Field>
          <Field label="Titular / sello"><input className="w-full" value={t.rights.holder ?? ''} onChange={(e) => rights({ holder: e.target.value || undefined })} /></Field>
          <Field label="Nº de licencia"><input className="w-full" value={t.rights.licenseId ?? ''} onChange={(e) => rights({ licenseId: e.target.value || undefined })} /></Field>
          <Field label="Territorio"><input className="w-full" value={t.rights.territory ?? ''} onChange={(e) => rights({ territory: e.target.value || undefined })} /></Field>
          <Field label="Vence (AAAA-MM-DD)"><input className="w-full" value={t.rights.expiresAt ?? ''} onChange={(e) => rights({ expiresAt: e.target.value || undefined })} /></Field>
          <Field label="Activa">
            <select className="w-full" value={t.active ? '1' : '0'} onChange={(e) => up({ active: e.target.value === '1' })}>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </Field>
        </div>
        <Field label="Notas"><textarea className="mt-2 w-full" rows={2} value={t.rights.note} onChange={(e) => rights({ note: e.target.value })} /></Field>
      </div>
      {err && <p className="rounded-xl bg-lose/15 p-3 text-sm text-lose">{err}</p>}
      <Btn type="submit" disabled={busy}>Guardar</Btn>
    </form>
  );
}

const slug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

/** Sube un archivo propio, detecta su duración y crea la canción en "Mis canciones". */
function UploadForm({ adminKey, onDone }: { adminKey: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState('');
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [country, setCountry] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [mode, setMode] = useState<'random' | 'hook'>('random');
  const [hook, setHook] = useState(45);
  const [clipLen, setClipLen] = useState(15);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(f));
    // "Artista - Título.mp3" rellena los campos automáticamente.
    const base = f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
    const parts = base.split(/\s+-\s+/);
    if (parts.length >= 2) {
      setArtist(parts[0].trim());
      setTitle(parts.slice(1).join(' - ').trim());
    } else setTitle(base.trim());
  }

  function preview() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    a.currentTime = mode === 'hook' ? hook : Math.min(8, duration / 3);
    void a.play();
    setPlaying(true);
    setTimeout(() => {
      a.pause();
      setPlaying(false);
    }, clipLen * 1000);
  }

  const ready = file && title.trim() && artist.trim() && Number(year) > 1000 && genre.trim() && country.trim() && duration > 0;

  async function save() {
    if (!ready || !file) return;
    setErr('');
    setBusy('Subiendo archivo…');
    const up = await apiFetch('/api/admin/upload', { method: 'POST', headers: { 'content-type': file.type || 'audio/mpeg', 'x-admin-key': adminKey }, body: file });
    const upBody = await up.json().catch(() => ({}));
    if (!up.ok) {
      setBusy('');
      return setErr(upBody.error ?? 'No se pudo subir el archivo');
    }
    setBusy('Guardando canción…');
    const track: TrackDef = {
      id: `mis-${slug(`${artist}-${title}`)}-${Date.now().toString(36).slice(-4)}`,
      title: title.trim(),
      artist: artist.trim(),
      titleAliases: [],
      artistAliases: [],
      year: Number(year),
      genre: genre.trim(),
      country: country.trim(),
      difficulty: difficulty as TrackDef['difficulty'],
      expansion: 'mis-canciones',
      explicit: false,
      spotifyUrl: null,
      audio: { kind: 'file', url: upBody.url, clipStart: mode === 'hook' ? hook : 0, clipDuration: clipLen, durationSec: Math.round(duration), clipMode: mode },
      rights: { status: 'private_use', note: 'Subida desde el panel.' },
      active: true
    };
    const res = await apiFetch('/api/admin/tracks', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify(track) });
    const body = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return setErr(body.error ?? 'No se pudo guardar');
    onDone();
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-cyan/10 p-3 text-xs text-cyan">
        Las canciones que subes quedan en <b>Mis canciones</b>. Actívala al crear la partida.
      </p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/15 p-5 text-center text-sm text-white/70">
        <Upload />
        {file ? <span><b>{file.name}</b>{duration > 0 && ` · ${fmt(duration)}`}</span> : 'Toca para elegir un archivo de audio (MP3, M4A, WAV…)'}
        <input type="file" accept="audio/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {src && <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onError={() => setErr('El navegador no puede leer este archivo')} />}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Título"><input className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Artista"><input className="w-full" value={artist} onChange={(e) => setArtist(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Año"><input className="w-full" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1998" /></Field>
        <Field label="Género"><input className="w-full" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Salsa" /></Field>
        <Field label="País"><input className="w-full" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Cuba" /></Field>
      </div>
      <Field label="Dificultad (1 muy conocida · 5 solo expertos)">
        <select className="w-full" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <div className="space-y-2 rounded-2xl bg-white/5 p-3">
        <div className="text-sm font-bold">Fragmento que suena</div>
        <div className="grid grid-cols-2 gap-2">
          {(['random', 'hook'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx('rounded-xl p-2 text-xs font-semibold', mode === m ? 'bg-violet' : 'bg-white/10')}>
              {m === 'random' ? '🎲 Al azar cada partida' : '🎯 Desde el estribillo'}
            </button>
          ))}
        </div>
        {mode === 'hook' && duration > 0 && (
          <Field label={`Empieza en ${fmt(hook)}`}>
            <input type="range" min={0} max={Math.max(0, Math.floor(duration - clipLen))} value={hook} onChange={(e) => setHook(Number(e.target.value))} className="w-full p-0 accent-violet" />
          </Field>
        )}
        <Field label={`Duración del fragmento: ${clipLen} s`}>
          <input type="range" min={5} max={30} value={clipLen} onChange={(e) => setClipLen(Number(e.target.value))} className="w-full p-0 accent-violet" />
        </Field>
        <Btn size="sm" variant="ghost" type="button" disabled={!src} onClick={preview}>
          {playing ? <Square size={14} /> : <Play size={14} />} {playing ? 'Parar' : 'Escuchar el fragmento'}
        </Btn>
        <p className="text-[11px] text-white/45">El fragmento de cada partida dura según la dificultad (8–16 s), como máximo lo que marques aquí.</p>
      </div>
      {err && <p className="rounded-xl bg-lose/15 p-3 text-sm text-lose">{err}</p>}
      <Btn onClick={save} disabled={!ready || !!busy}>{busy || 'Guardar en Mis canciones'}</Btn>
    </div>
  );
}
