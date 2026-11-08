import { motion } from 'framer-motion';
import { BookOpen, Layers, LogIn, Music, Plus, Settings, User } from 'lucide-react';
import type { View } from '../App';
import { CardBack, CardFace } from '../components/cards';
import { Btn, Logo, Screen } from '../components/ui';
import { CHALLENGES, POWER_UPS, TRACK_CARD } from '../../../shared/cards';
import { useSettings } from '../lib/settings';
import { DEMO } from '../lib/game';

export function Home({ go }: { go: (v: View) => void }) {
  const s = useSettings();
  return (
    <Screen>
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Music party game</span>
        <button onClick={() => go('settings')} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-sm" aria-label="Perfil">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet/30">{s.avatar}</span>
          {s.name || 'Perfil'}
        </button>
      </div>

      {/* Abanico de cartas */}
      <div className="relative mx-auto mt-6 h-[300px] w-full max-w-[320px]">
        {[
          { el: <CardBack />, r: -16, x: -70, y: 22, d: 0.1 },
          { el: <CardFace card={CHALLENGES[0]} />, r: 14, x: 70, y: 22, d: 0.2 },
          { el: <CardFace card={POWER_UPS[1]} />, r: -5, x: -22, y: 6, d: 0.3 },
          { el: <CardFace card={TRACK_CARD} />, r: 5, x: 26, y: 0, d: 0.4 }
        ].map((c, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-0 w-[150px]"
            initial={{ opacity: 0, y: 80, rotate: 0, x: '-50%' }}
            animate={{ opacity: 1, y: c.y, rotate: c.r, x: `calc(-50% + ${c.x}px)` }}
            transition={{ delay: c.d, type: 'spring', stiffness: 80, damping: 12 }}
            style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.6))' }}
          >
            {c.el}
          </motion.div>
        ))}
      </div>

      <motion.div className="mt-4 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Logo size="lg" />
        <p className="mx-auto mt-3 max-w-[18rem] text-sm text-white/60">Saca una carta. Escucha el drop. Adivina antes que nadie.</p>
      </motion.div>

      <div className="mt-auto space-y-3 pt-8">
        <Btn onClick={() => go('create')}>
          <Plus size={20} /> Crear partida
        </Btn>
        {DEMO ? (
          <>
            <a href="#panel" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-cyan/40 bg-cyan/10 text-lg font-semibold text-cyan active:scale-[0.97]">
              <Music size={20} /> Panel de canciones
            </a>
            <p className="text-center text-xs text-white/50">Demo: juegas contra 3 bots (Luna, Rocco y Mara). Sube el volumen 🔊</p>
          </>
        ) : (
          <Btn variant="ghost" onClick={() => go('join')}>
            <LogIn size={20} /> Unirse a partida
          </Btn>
        )}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { v: 'howto' as View, icon: BookOpen, label: 'Cómo jugar' },
            { v: 'expansions' as View, icon: Layers, label: 'Expansiones' },
            { v: 'settings' as View, icon: User, label: 'Perfil' },
            { v: 'settings' as View, icon: Settings, label: 'Ajustes' }
          ].map(({ v, icon: Icon, label }) => (
            <button key={label} onClick={() => go(v)} className="glass flex flex-col items-center gap-1 rounded-2xl py-3 text-[11px] text-white/70 active:scale-95">
              <Icon size={20} className="text-cyan" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}
