import { ArrowLeft } from 'lucide-react';
import { AVATARS } from '../../../shared/config';
import { Screen, SectionTitle, cx } from '../components/ui';
import { setVolume, sfx, unlockAudio } from '../lib/audio';
import { updateSettings, useSettings } from '../lib/settings';

function Toggle({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left">
      <span>
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-xs text-white/50">{sub}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', on ? 'bg-violet' : 'bg-white/15')}>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  return (
    <div className="glass divide-y divide-white/5">
      <Toggle label="Reducir movimiento" sub="Desactiva giros 3D y animaciones intensas" on={s.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
      <Toggle
        label="Efectos de sonido"
        on={s.sfx}
        onChange={(v) => {
          updateSettings({ sfx: v });
          unlockAudio();
          if (v) setTimeout(() => sfx('win'), 50);
        }}
      />
      <Toggle label="Vibración" sub="En el temporizador y las revelaciones" on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} />
      <label className="block px-4 py-4">
        <span className="mb-2 block font-semibold">Volumen</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            updateSettings({ volume: v });
            setVolume(v);
          }}
          className="w-full accent-violet p-0"
          aria-label="Volumen"
        />
      </label>
    </div>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const s = useSettings();
  return (
    <Screen>
      <button onClick={onBack} className="mb-4 mt-2 flex items-center gap-1 text-sm text-white/60">
        <ArrowLeft size={16} /> Volver
      </button>
      <SectionTitle kicker="Perfil y ajustes" title="Tu cabina" />
      <div className="glass mb-6 space-y-4 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-white/70">Alias</span>
          <input value={s.name} onChange={(e) => updateSettings({ name: e.target.value.slice(0, 18) })} className="w-full" placeholder="DJ Nombre" />
        </label>
        <div className="grid grid-cols-8 gap-2">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => updateSettings({ avatar: a })} aria-pressed={a === s.avatar} className={cx('grid aspect-square place-items-center rounded-xl text-xl', a === s.avatar ? 'bg-violet/40 ring-2 ring-violet' : 'bg-white/5')}>
              {a}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/45">Acceso como invitado: tu alias se guarda solo en este dispositivo.</p>
      </div>
      <SettingsPanel />
    </Screen>
  );
}
