import { motion } from 'framer-motion';
import { Lock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Avatar, Btn, Pill, TimerRing, useServerNow } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, player } from '../lib/game';
import { vibrate } from '../lib/settings';
import type { StageOf } from './TurnStage';

function Versus({ room, ids }: { room: RoomView; ids: string[] }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {ids.map((id, i) => {
        const p = player(room, id);
        return (
          <div key={id} className="contents">
            {i === 1 && <span className="font-display text-2xl font-black text-tie">VS</span>}
            <motion.div initial={{ x: i ? 60 : -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 100 }} className="flex flex-col items-center gap-2">
              <Avatar p={p} size={76} ring />
              <span className="font-semibold">{p?.name}</span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export function PerformStage({ room, st }: { room: RoomView; st: StageOf<'perform'> }) {
  const [startAt] = useState(() => room.serverNow);
  const competing = st.competitors.includes(room.you);
  const isHost = room.hostId === room.you;
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <Pill color="#FFC247">{st.card.name}</Pill>
      <h1 className="mt-4 font-display text-2xl font-black leading-tight">{st.prompt}</h1>
      <div className="my-6">
        <Versus room={room} ids={st.competitors} />
      </div>
      <TimerRing startAt={startAt} endsAt={st.endsAt} size={110} tension={false} />
      <p className="mt-4 text-sm text-white/60">
        {competing ? '¡Es tu momento! Al terminar, pulsa el botón para abrir la votación.' : st.voteKind === 'duel' ? 'Mira con atención: vas a votar en secreto.' : 'Al terminar, decidirás si lo aprueba el público.'}
      </p>
      {(competing || isHost) && (
        <div className="mt-auto w-full pt-6">
          <Btn onClick={() => act({ type: 'endPerformance' })}>¡Terminamos! A votar 🗳️</Btn>
        </div>
      )}
    </div>
  );
}

export function VoteStage({ room, st }: { room: RoomView; st: StageOf<'vote'> }) {
  const [startAt] = useState(() => room.serverNow);
  const now = useServerNow(500);
  const competing = st.competitors.includes(room.you);
  const canVote = st.eligible && !st.hasVoted;
  useEffect(() => {
    if (canVote) {
      sfx('wildcard');
      vibrate([40, 40, 40]);
    }
  }, []);
  const send = async (payload: { forId: string | null; approve?: boolean }) => {
    if (await act({ type: 'vote', ...payload })) {
      sfx('whoosh');
      vibrate(25);
    }
  };
  const single = player(room, st.competitors[0]);
  void now;

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <Pill color="#8B5CF6">🗳️ VOTACIÓN SECRETA · {st.card.name}</Pill>
      <div className="mt-4">
        <TimerRing startAt={startAt} endsAt={st.endsAt} size={96} tension={canVote} />
      </div>

      {canVote ? (
        st.voteKind === 'duel' ? (
          <>
            <h1 className="mt-4 font-display text-xl font-black">¿Quién lo hizo mejor?</h1>
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              {st.competitors.map((id) => {
                const p = player(room, id);
                return (
                  <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => send({ forId: id })} className="glass flex flex-col items-center gap-3 p-5" style={{ boxShadow: `inset 0 0 0 2px ${p?.color}66` }}>
                    <Avatar p={p} size={72} />
                    <span className="font-display font-bold">{p?.name}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Votar</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-col items-center gap-2">
              <Avatar p={single} size={72} ring />
              <h1 className="font-display text-xl font-black">¿Lo aprueba el público?</h1>
            </div>
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              <Btn variant="win" onClick={() => send({ forId: null, approve: true })}>
                <ThumbsUp /> Sí
              </Btn>
              <Btn variant="danger" onClick={() => send({ forId: null, approve: false })}>
                <ThumbsDown /> No
              </Btn>
            </div>
          </>
        )
      ) : (
        <div className="mt-8 flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="grid h-20 w-20 place-items-center rounded-3xl bg-violet/20">
            <Lock size={36} className="text-violet-soft" />
          </motion.div>
          <h1 className="font-display text-xl font-black">{competing ? 'El público está votando…' : st.hasVoted ? 'Voto enviado en secreto' : 'No votas en esta ronda'}</h1>
          <p className="text-sm text-white/55">Nadie verá a quién votaste.</p>
        </div>
      )}

      <div className="mt-auto w-full pt-6">
        <div className="mb-1 flex justify-between text-xs text-white/50">
          <span>Votos recibidos</span>
          <span>
            {st.votedCount}/{st.eligibleCount}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-violet to-cyan" animate={{ width: `${st.eligibleCount ? (st.votedCount / st.eligibleCount) * 100 : 100}%` }} />
        </div>
      </div>
    </div>
  );
}
