import { motion } from 'framer-motion';
import { QrCode, Shuffle, SkipForward } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { RoomView, StageView } from '../../../shared/types';
import { CardBack } from '../components/cards';
import { Scanner } from '../components/Scanner';
import { Avatar, Btn, Pill, Sheet } from '../components/ui';
import { sfx } from '../lib/audio';
import { act, player } from '../lib/game';

export type StageOf<T extends StageView['type']> = Extract<StageView, { type: T }>;

export function TurnStage({ room, st }: { room: RoomView; st: StageOf<'turn'> }) {
  const active = player(room, st.activeId);
  const mine = st.activeId === room.you;
  const isHost = room.hostId === room.you;
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);

  const onCode = useCallback(async (code: string) => {
    setScan(false);
    setBusy(true);
    sfx('draw');
    await act({ type: 'scan', code });
    setBusy(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      {st.extraTurn && <Pill color="#8B5CF6" className="mt-2">⚡ TURNO EXTRA</Pill>}
      <div className="mt-4">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
          <Avatar p={active} size={84} ring />
        </motion.div>
        <div className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-cyan">{mine ? 'Es tu turno' : 'Turno de'}</div>
        <h1 className="font-display text-3xl font-black">{mine ? '¡Saca una carta!' : active?.name}</h1>
      </div>

      {/* Mazo */}
      <div className="relative my-6 h-[230px] w-[160px]">
        {[3, 2, 1, 0].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.55))' }}
            initial={false}
            animate={{ y: -i * 5, x: i * 3, rotate: i % 2 ? 2 : -2 }}
            whileTap={mine && i === 0 ? { scale: 0.96 } : undefined}
          >
            <CardBack />
          </motion.div>
        ))}
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/40">{room.deckLeft} cartas en el mazo virtual</span>
      </div>

      <div className="mt-auto w-full space-y-3 pt-6">
        {mine || isHost ? (
          <>
            <Btn onClick={() => setScan(true)} disabled={busy}>
              <QrCode size={20} /> Escanear carta física
            </Btn>
            <Btn
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                sfx('draw');
                await act({ type: 'draw' });
                setBusy(false);
              }}
            >
              <Shuffle size={20} /> Sacar carta (modo prueba)
            </Btn>
            {!mine && (
              <p className="text-xs text-white/45">
                Como anfitrión puedes escanear por {active?.name}.{' '}
                {!active?.connected && (
                  <button className="inline-flex items-center gap-1 text-violet-soft underline" onClick={() => act({ type: 'hostSkip' })}>
                    <SkipForward size={12} /> Saltar turno
                  </button>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-white/55">{active?.connected ? `${active?.name} está sacando una carta…` : `${active?.name} se desconectó. Si no vuelve, se saltará su turno.`}</p>
        )}
      </div>

      <Sheet open={scan} onClose={() => setScan(false)} title="Escanear carta">
        {scan && <Scanner onCode={onCode} />}
      </Sheet>
    </div>
  );
}
