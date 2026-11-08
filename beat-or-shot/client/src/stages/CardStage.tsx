import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { CardBack, CardFace, FlipCard } from '../components/cards';
import { Avatar, Btn, cx, useServerNow } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, player } from '../lib/game';
import { useSettings, vibrate } from '../lib/settings';
import type { StageOf } from './TurnStage';

export function AutoBar({ autoAt, from }: { autoAt: number | null; from: number }) {
  const now = useServerNow(100);
  if (!autoAt) return null;
  const pct = Math.min(1, Math.max(0, (now - from) / (autoAt - from)));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function CardStage({ room, st }: { room: RoomView; st: StageOf<'card'> }) {
  const { reducedMotion } = useSettings();
  const [flipped, setFlipped] = useState(false);
  const [from] = useState(() => room.serverNow);
  const drawer = player(room, st.drawnBy);
  const mine = st.drawnBy === room.you;
  const isHost = room.hostId === room.you;
  const canAct = mine || isHost;

  useEffect(() => {
    const t = setTimeout(() => {
      setFlipped(true);
      sfx('flip');
      vibrate([10, 40, 20]);
      if (st.card.type === 'WILD' || st.card.type === 'POWER_UP') setTimeout(() => sfx('wildcard'), 250);
      if (st.card.type === 'PENALTY') setTimeout(() => sfx('lose'), 250);
    }, 450);
    return () => clearTimeout(t);
  }, [st.card.id]);

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
        <Avatar p={drawer} size={26} /> {mine ? 'Has sacado' : `${drawer?.name} sacó`}
        {st.via === 'qr' && (
          <span className="inline-flex items-center gap-1 text-xs text-cyan">
            <QrCode size={12} /> carta física
          </span>
        )}
      </div>
      <motion.div className="mt-4 w-[68%] max-w-[260px]" initial={{ y: 40, scale: 0.9 }} animate={{ y: 0, scale: 1 }} style={{ filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.6))' }}>
        <FlipCard flipped={flipped} back={<CardBack />} front={<CardFace card={st.card} />} reduced={reducedMotion} />
      </motion.div>

      <div className="mt-6 w-full flex-1 space-y-3">
        {st.effectText && flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 text-center font-semibold">
            {st.effectText}
          </motion.div>
        )}
        {st.card.type === 'TRACK' && flipped && <p className="text-center font-display text-lg font-bold text-cyan">🎧 Silencio en la sala… ¡suena en 3, 2, 1!</p>}

        {st.awaiting === 'target' && flipped && (
          <div>
            <p className="mb-3 text-center text-sm font-semibold text-white/70">{canAct ? (st.card.type === 'POWER_UP' ? 'Elige a tu invitado' : 'Elige a tu rival') : `${drawer?.name} está eligiendo…`}</p>
            {canAct && (
              <div className="grid grid-cols-2 gap-2">
                {st.targetOptions?.map((id) => {
                  const p = player(room, id);
                  return (
                    <button key={id} onClick={() => act({ type: 'chooseTarget', targetId: id })} className="glass flex items-center gap-2 p-3 text-left active:scale-95">
                      <Avatar p={p} size={36} />
                      <span className="truncate font-semibold">{p?.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {st.awaiting === 'continue' && flipped && (
        <div className={cx('w-full space-y-2 pt-4')}>
          <AutoBar autoAt={st.autoAt} from={from} />
          {canAct && <Btn onClick={() => act({ type: 'continue' })}>{st.card.type === 'CHALLENGE' || st.card.type === 'WILD' || st.card.type === 'PENALTY' ? '¡Vamos!' : 'Continuar'}</Btn>}
        </div>
      )}
      {st.card.type === 'TRACK' && (
        <div className="w-full pt-4">
          <AutoBar autoAt={st.autoAt} from={from} />
        </div>
      )}
    </div>
  );
}
