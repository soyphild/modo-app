import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { RoomView } from '../../../shared/types';
import { CardBack, FlipCard, RESULT_STYLE, ResultFace } from '../components/cards';
import { Confetti } from '../components/Confetti';
import { Btn, cx, useServerNow } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, player } from '../lib/game';
import { useSettings, vibrate } from '../lib/settings';
import { TrackRevealCard } from './ResultStage';
import type { StageOf } from './TurnStage';

/**
 * Revelación simultánea: todos los celulares cuentan hacia la misma marca de tiempo del servidor
 * (corregida con el desfase de reloj medido al conectar) y voltean las tarjetas a la vez.
 */
export function RevealStage({ room, st }: { room: RoomView; st: StageOf<'reveal'> }) {
  const now = useServerNow(40);
  const { reducedMotion } = useSettings();
  const toReveal = st.revealAt - now;
  const phase = toReveal > 3000 ? 'ready' : toReveal > 0 ? 'count' : 'flip';
  const count = Math.ceil(toReveal / 1000);
  const flipped = phase === 'flip' && !!st.outcome;
  const myColor = st.outcome?.[room.you];
  const lastCount = useRef(0);
  const played = useRef(false);

  useEffect(() => {
    if (phase === 'count' && count !== lastCount.current && count > 0) {
      lastCount.current = count;
      sfx('countdown');
      vibrate(30);
    }
    if (flipped && !played.current) {
      played.current = true;
      sfx('flip');
      setTimeout(() => sfx(myColor === 'green' ? 'win' : myColor === 'red' ? 'lose' : myColor === 'yellow' ? 'tie' : 'go'), 300);
      vibrate(myColor === 'green' ? [30, 50, 30, 50, 120] : [120]);
    }
  }, [phase, count, flipped, myColor]);

  const big = st.competitors.length === 1;
  const isHost = room.hostId === room.you;

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      {flipped && myColor === 'green' && <Confetti />}
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">{st.title}</div>
      <div className="relative mt-2 h-16">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.h1 key="ready" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="font-display text-2xl font-black text-gradient">
              EL RESULTADO ESTÁ LISTO
            </motion.h1>
          )}
          {phase === 'count' && (
            <motion.div key={count} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.35 }} className="font-display text-6xl font-black">
              {count}
            </motion.div>
          )}
          {phase === 'flip' && st.summary && (
            <motion.h1 key="sum" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-xl font-black">
              {st.summary}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>

      <div className={cx('mt-4 grid w-full gap-4', big ? 'max-w-[240px] grid-cols-1' : 'grid-cols-2')}>
        {st.competitors.map((id, i) => {
          const p = player(room, id);
          const color = st.outcome?.[id] ?? 'yellow';
          const mine = id === room.you;
          return (
            <motion.div
              key={id}
              animate={phase === 'count' && !reducedMotion ? { rotate: [0, -1.5, 1.5, 0] } : { rotate: 0 }}
              transition={{ repeat: phase === 'count' ? Infinity : 0, duration: 0.3, delay: i * 0.05 }}
              className={cx(mine && 'drop-shadow-[0_0_25px_rgba(139,92,246,.6)]')}
            >
              <FlipCard reduced={reducedMotion} flipped={flipped} back={<CardBack label={p?.name.toUpperCase()} />} front={<ResultFace color={color} name={p?.name ?? ''} avatar={p?.avatar ?? ''} points={st.pointsAwarded?.[id]} />} />
              <div className="mt-2 text-sm font-semibold">
                {p?.name} {mine && <span className="text-white/40">(tú)</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {flipped && myColor && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 font-display text-lg font-bold" style={{ color: RESULT_STYLE[myColor].color }}>
          {myColor === 'green' ? '¡Tarjeta verde para ti!' : myColor === 'red' ? 'Tarjeta roja… ¡a remontar!' : 'Tarjeta amarilla'}
        </motion.p>
      )}
      {flipped && st.track && (
        <div className="mt-4 w-full">
          <TrackRevealCard t={st.track} />
        </div>
      )}

      {flipped && (isHost || st.competitors.includes(room.you)) && (
        <div className="mt-auto w-full pt-6">
          <Btn variant="ghost" onClick={() => act({ type: 'continue' })}>
            Continuar
          </Btn>
        </div>
      )}
    </div>
  );
}
