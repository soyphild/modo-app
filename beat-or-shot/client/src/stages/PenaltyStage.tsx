import type { RoomView } from '../../../shared/types';
import { CardFace } from '../components/cards';
import { Avatar } from '../components/ui';
import { act, player } from '../lib/game';
import type { StageOf } from './TurnStage';

export function PenaltyStage({ room, st }: { room: RoomView; st: StageOf<'penalty'> }) {
  const chooser = player(room, st.chooserId);
  const target = player(room, st.targetId);
  const mine = st.chooserId === room.you || room.hostId === room.you;
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="w-[48%] max-w-[180px]">
        <CardFace card={st.card} />
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
        <Avatar p={target} size={28} /> Penalización para <b>{target?.name}</b>
      </div>
      <p className="mt-1 text-center text-sm text-white/50">{st.chooserId === st.targetId ? 'Elige cómo cumplirla:' : `${chooser?.name} elige el obstáculo:`}</p>
      <div className="mt-4 w-full space-y-2">
        {st.options.map((o) => (
          <button key={o.id} disabled={!mine} onClick={() => act({ type: 'penaltyChoice', optionId: o.id })} className="glass w-full p-4 text-left transition active:scale-[0.98] disabled:opacity-60">
            <div className="font-display text-sm font-bold">{o.label}</div>
            <div className="mt-1 text-xs text-white/55">{o.detail}</div>
          </button>
        ))}
      </div>
      {!mine && <p className="mt-4 text-sm text-white/50">Esperando a {chooser?.name}…</p>}
      <p className="mt-auto pt-6 text-center text-[11px] text-white/35">Las penalizaciones nunca obligan a beber ni a hacer nada peligroso. Siempre hay alternativa.</p>
    </div>
  );
}
