import { motion } from 'framer-motion';
import { History, LogOut, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import type { RoomView } from '../../../shared/types';
import { Confetti } from '../components/Confetti';
import { Avatar, Btn, Logo, useServerNow } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, leaveRoom, player } from '../lib/game';
import { vibrate } from '../lib/settings';
import { Leaderboard } from '../screens/GameScreen';
import type { StageOf } from './TurnStage';

export function FinalIntro({ room, st }: { room: RoomView; st: StageOf<'finalIntro'> }) {
  const now = useServerNow(200);
  const left = Math.max(0, Math.ceil((st.startAt - now) / 1000));
  useEffect(() => {
    sfx('podium');
    vibrate([50, 50, 50, 50, 200]);
  }, []);
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 80, damping: 10 }}>
        <div className="text-xs font-bold uppercase tracking-[0.4em] text-lose">Ronda final</div>
        <h1 className="mt-2 font-display text-[2.6rem] font-black leading-[0.95]">
          LLEGÓ EL
          <br />
          <span className="text-gradient">ÚLTIMO DROP</span>
        </h1>
      </motion.div>
      <p className="mt-4 max-w-xs text-sm text-white/60">Los mejores juegan dos canciones con puntos dobles. La tabla queda oculta hasta el podio.</p>
      <div className="mt-8 flex justify-center gap-4">
        {st.finalists.map((id, i) => {
          const p = player(room, id);
          return (
            <motion.div key={id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.15 }} className="flex flex-col items-center gap-2">
              <Avatar p={p} size={64} ring />
              <span className="text-sm font-semibold">{p?.name}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-10 font-display text-5xl font-black tabular-nums">{left}</div>
    </div>
  );
}

const TITLE_ICON: Record<string, string> = { master: '👑', oido: '👂', drop: '⚡', comeback: '🚀', duel: '🟩' };

export function Podium({ room, onHistory }: { room: RoomView; onHistory: () => void }) {
  const ranked = room.players.slice().sort((a, b) => b.score - a.score);
  const order = [ranked[1], ranked[0], ranked[2]];
  const heights = [120, 168, 92];
  const isHost = room.hostId === room.you;
  useEffect(() => {
    sfx('podium');
    vibrate([40, 40, 40, 40, 160]);
  }, []);
  return (
    <div className="flex flex-1 flex-col">
      <Confetti count={90} />
      <div className="text-center">
        <Logo size="sm" />
        <h1 className="mt-2 font-display text-2xl font-black">¡Tenemos ganador!</h1>
      </div>

      <div className="mt-8 flex items-end justify-center gap-3">
        {order.map((p, i) =>
          p ? (
            <div key={p.id} className="flex w-[30%] flex-col items-center">
              <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 + (2 - i) * 0.25 }} className="mb-2 flex flex-col items-center">
                {i === 1 && <span className="text-2xl">👑</span>}
                <Avatar p={p} size={i === 1 ? 64 : 52} ring={i === 1} />
                <span className="mt-1 max-w-full truncate text-sm font-semibold">{p.name}</span>
                <span className="font-display text-sm font-black text-cyan">{p.score}</span>
              </motion.div>
              <motion.div
                className="w-full rounded-t-2xl"
                style={{ background: i === 1 ? 'linear-gradient(180deg,#FFC247,#b7791f)' : i === 0 ? 'linear-gradient(180deg,#cbd5e1,#64748b)' : 'linear-gradient(180deg,#fb923c,#9a3412)' }}
                initial={{ height: 0 }}
                animate={{ height: heights[i] }}
                transition={{ delay: 0.2 + (2 - i) * 0.25, type: 'spring', stiffness: 70, damping: 14 }}
              >
                <div className="pt-2 text-center font-display text-3xl font-black text-ink/70">{i === 1 ? 1 : i === 0 ? 2 : 3}</div>
              </motion.div>
            </div>
          ) : (
            <div key={i} className="w-[30%]" />
          )
        )}
      </div>

      <h2 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-widest text-white/60">Títulos</h2>
      <div className="grid gap-2">
        {room.titles.map((t, i) => {
          const p = player(room, t.playerId);
          return (
            <motion.div key={t.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 + i * 0.12 }} className="glass flex items-center gap-3 p-3">
              <span className="text-2xl">{TITLE_ICON[t.key]}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xs font-bold tracking-wide text-tie">{t.name}</div>
                <div className="truncate text-sm">
                  {p?.avatar} {p?.name} <span className="text-white/45">· {t.detail}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-widest text-white/60">Estadísticas</h2>
      <Leaderboard room={room} />

      <div className="mt-8 space-y-2 pb-4">
        {isHost && (
          <Btn onClick={() => act({ type: 'playAgain' })}>
            <RotateCcw size={18} /> Jugar otra vez
          </Btn>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="ghost" size="md" onClick={onHistory}>
            <History size={16} /> Historial
          </Btn>
          <Btn variant="ghost" size="md" onClick={leaveRoom}>
            <LogOut size={16} /> Salir
          </Btn>
        </div>
      </div>
    </div>
  );
}
