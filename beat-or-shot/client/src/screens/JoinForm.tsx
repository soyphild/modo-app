import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { AVATARS } from '../../../shared/config';
import { Btn, Screen, SectionTitle, cx } from '../components/ui';
import { unlockAudio } from '../lib/audio';
import { createRoom, joinRoom } from '../lib/game';
import { updateSettings, useSettings } from '../lib/settings';

export function JoinForm({ mode, initialCode, onBack }: { mode: 'create' | 'join'; initialCode?: string; onBack: () => void }) {
  const s = useSettings();
  const [name, setName] = useState(s.name);
  const [avatar, setAvatar] = useState(s.avatar);
  const [code, setCode] = useState(initialCode ?? '');
  const [minor, setMinor] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = name.trim().length > 0 && minor !== null && (mode === 'create' || code.trim().length === 6);

  async function submit() {
    if (!ready) return;
    unlockAudio();
    setBusy(true);
    setError('');
    updateSettings({ name: name.trim(), avatar });
    const payload = { name: name.trim(), avatar, isMinor: !!minor };
    const res = mode === 'create' ? await createRoom(payload) : await joinRoom({ ...payload, code: code.trim().toUpperCase() });
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'No se pudo conectar');
  }

  return (
    <Screen>
      <button onClick={onBack} className="mb-4 mt-2 flex items-center gap-1 text-sm text-white/60">
        <ArrowLeft size={16} /> Volver
      </button>
      <SectionTitle kicker={mode === 'create' ? 'Nueva sala' : 'Unirse'} title={mode === 'create' ? 'Crea tu cabina' : 'Entra a la fiesta'} sub={mode === 'create' ? 'Serás el anfitrión: configuras la partida y tu celular hace de altavoz.' : 'Pide el código de 6 caracteres o escanea el QR del anfitrión.'} />

      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === 'join' && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/70">Código de sala</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              className="w-full text-center font-display text-3xl tracking-[0.4em]"
              aria-label="Código de sala"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-white/70">Tu alias</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} placeholder="DJ Nombre" className="w-full" autoComplete="nickname" maxLength={18} />
        </label>

        <div>
          <span className="mb-2 block text-sm font-semibold text-white/70">Avatar</span>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAvatar(a)}
                aria-pressed={a === avatar}
                className={cx('grid aspect-square place-items-center rounded-xl text-xl transition', a === avatar ? 'bg-violet/40 ring-2 ring-violet' : 'bg-white/5')}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-semibold text-white/70">¿Tienes menos de 18 años?</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, l: 'Sí, soy menor' },
              { v: false, l: 'No, soy adulto' }
            ].map((o) => (
              <button type="button" key={o.l} onClick={() => setMinor(o.v)} aria-pressed={minor === o.v} className={cx('rounded-2xl px-3 py-3 text-sm font-semibold transition', minor === o.v ? 'bg-cyan/20 text-cyan ring-2 ring-cyan' : 'bg-white/5 text-white/80')}>
                {o.l}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/45">Si hay algún menor, la sala pasa automáticamente a Modo Familiar.</p>
        </div>

        {error && <div className="rounded-2xl bg-lose/15 px-4 py-3 text-sm text-lose">{error}</div>}

        <div className="mt-auto pt-4">
          <Btn type="submit" disabled={!ready || busy}>
            {busy ? <Loader2 className="animate-spin" /> : mode === 'create' ? 'Crear sala' : 'Entrar'}
          </Btn>
        </div>
      </form>
    </Screen>
  );
}
