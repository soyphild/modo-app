import { motion } from 'framer-motion';
import { Check, Disc3, X } from 'lucide-react';
import { useEffect } from 'react';
import type { RoomView } from '../../../shared/types';
import { Confetti } from '../components/Confetti';
import { Avatar, Btn, useServerNow } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, player } from '../lib/game';
import { vibrate } from '../lib/settings';
import type { StageOf } from './TurnStage';

export function TrackRevealCard({ t }: { t: NonNullable<StageOf<'trackResult'>['track']> }) {
  return (
    <motion.div initial={{ rotateX: -80, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }} className="glass relative overflow-hidden p-5 text-center" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,217,255,.35), 0 20px 50px -20px rgba(0,217,255,.5)' }}>
      <Disc3 className="spin-slow absolute -right-6 -top-6 h-28 w-28 text-cyan/10" />
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-cyan">Era…</div>
      <div className="mt-2 font-display text-2xl font-black leading-tight">{t.title}</div>
      <div className="mt-1 text-lg text-white/80">{t.artist}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 text-xs text-white/50">
        <span>{t.year}</span>
        <span>{t.genre}</span>
        <span>{t.country}</span>
      </div>
    </motion.div>
  );
}

export function ResultStage({ room, st }: { room: RoomView; st: StageOf<'trackResult'> }) {
  const now = useServerNow(250);
  const mine = st.results.find((r) => r.playerId === room.you);
  const won = !!mine && mine.points > 0;
  const isHost = room.hostId === room.you;
  const canNext = isHost || room.activeId === room.you;
  useEffect(() => {
    if (!mine) return;
    sfx(won ? 'win' : 'lose');
    vibrate(won ? [20, 40, 60] : 80);
  }, [st.roundId]);
  const left = Math.max(0, Math.ceil((st.nextAt - now) / 1000));

  return (
    <div className="flex flex-1 flex-col">
      {won && <Confetti />}
      {st.track && <TrackRevealCard t={st.track} />}
      <div className="mt-4 space-y-2">
        {st.results.map((res, i) => {
          const p = player(room, res.playerId);
          return (
            <motion.div key={res.playerId + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="glass p-3">
              <div className="flex items-center gap-3">
                <Avatar p={p} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {p?.name} {res.viaPartner && <span className="text-xs text-cyan">· vía DJ</span>}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className={res.title ? 'text-win' : 'text-white/35'}>{res.title ? <Check size={11} className="inline" /> : <X size={11} className="inline" />} título</span>
                    <span className={res.artist ? 'text-win' : 'text-white/35'}>{res.artist ? <Check size={11} className="inline" /> : <X size={11} className="inline" />} artista</span>
                    {res.year !== null && <span className={res.year ? 'text-win' : 'text-white/35'}>{res.year ? '✓' : '✗'} año</span>}
                    {res.answeredMs !== null && <span className="text-white/35">{(res.answeredMs / 1000).toFixed(1)} s</span>}
                  </div>
                </div>
                <span className={`font-display text-xl font-black tabular-nums ${res.points > 0 ? 'text-win' : res.points < 0 ? 'text-lose' : 'text-white/40'}`}>
                  {res.points > 0 ? '+' : ''}
                  {res.points}
                </span>
              </div>
              {(res.givenTitle || res.givenArtist) && (
                <div className="mt-1.5 truncate pl-[50px] text-xs italic text-white/40">
                  “{[res.givenTitle, res.givenArtist].filter(Boolean).join(' — ')}”
                </div>
              )}
              {res.breakdown.length > 0 && <div className="mt-1 pl-[50px] text-[11px] text-white/45">{res.breakdown.join(' · ')}</div>}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-auto space-y-2 pt-6">
        <p className="text-center text-xs text-white/40">{st.moreInSequence ? 'Siguiente canción' : 'Siguiente turno'} en {left} s</p>
        {canNext && (
          <Btn variant="ghost" onClick={() => act({ type: 'continue' })}>
            {st.moreInSequence ? 'Siguiente canción' : 'Siguiente turno'}
          </Btn>
        )}
      </div>
    </div>
  );
}
