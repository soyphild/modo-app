import { motion } from 'framer-motion';
import { Check, Copy, Crown, Headphones, LogOut, Settings2, Share2, UserX } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { DIFFICULTY } from '../../../shared/config';
import type { RoomView } from '../../../shared/types';
import { Avatar, Btn, Logo, Pill, Screen, Sheet, cx } from '../components/ui';
import { act, leaveRoom, me, player, toast } from '../lib/game';
import { SetupSteps } from './Setup';

function useQr(text: string) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B0B14', light: '#FFFFFF' } }).then(setSvg).catch(() => setSvg(''));
  }, [text]);
  return svg;
}

export function Lobby({ room }: { room: RoomView }) {
  const isHost = room.hostId === room.you;
  const self = me(room);
  const qr = useQr(room.joinUrl);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const c = room.config;
  const partners = room.phase === 'partners';

  async function share() {
    const data = { title: 'BEAT OR SHOT', text: `¡Únete a mi partida! Código ${room.code}`, url: room.joinUrl };
    try {
      if (typeof navigator.share === "function") await navigator.share(data);
      else {
        await navigator.clipboard.writeText(room.joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* compartir cancelado */
    }
  }

  return (
    <Screen>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <Logo size="sm" />
        <button onClick={leaveRoom} className="flex items-center gap-1 text-xs text-white/50" aria-label="Salir">
          <LogOut size={14} /> Salir
        </button>
      </div>

      {!partners ? (
        <>
          <div className="glass flex items-center gap-4 p-4">
            <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR para unirse" />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">Código de sala</div>
              <div className="font-display text-[2rem] font-black tracking-[0.15em] text-gradient">{room.code}</div>
              <div className="mt-2 flex gap-2">
                <Btn size="sm" variant="ghost" onClick={share}>
                  {copied ? <Check size={14} /> : typeof navigator.share === "function" ? <Share2 size={14} /> : <Copy size={14} />} Invitar
                </Btn>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill color={c.familyMode ? '#00D9FF' : c.modality === 'fiesta' ? '#F472B6' : '#8B5CF6'}>{c.familyMode ? '🛡️ Familiar' : c.modality === 'fiesta' ? '🎉 Fiesta' : '⚔️ Clásico'}</Pill>
            <Pill color="#FFC247">{DIFFICULTY[c.difficulty].label}</Pill>
            <Pill color="#19C86A">{c.timeLimitSec < 60 ? `${c.timeLimitSec}s` : `${c.timeLimitSec / 60} min`} por carta</Pill>
            <Pill color="#00D9FF">{c.rounds} vuelta(s)</Pill>
            {isHost && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                <Settings2 size={12} /> Editar
              </button>
            )}
          </div>

          <h2 className="mb-3 mt-6 flex items-center justify-between font-display text-sm font-bold">
            Jugadores <span className="text-white/50">{room.players.length}/12</span>
          </h2>
          <div className="space-y-2">
            {room.players.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2">
                <Avatar p={p} size={40} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {p.name} {p.isHost && <Crown size={14} className="text-tie" />}
                    {p.id === room.you && <span className="text-xs text-white/40">(tú)</span>}
                  </div>
                  <div className="text-xs text-white/45">{p.connected ? 'Conectado' : 'Desconectado'}{p.isMinor ? ' · menor' : ''}</div>
                </div>
                {isHost && p.id !== room.you && (
                  <button onClick={() => act({ type: 'kick', playerId: p.id })} className="p-2 text-white/30" aria-label={`Expulsar a ${p.name}`}>
                    <UserX size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
          {room.players.length < 2 && <p className="mt-3 text-center text-xs text-white/45">Comparte el código. Puedes probar solo, pero los duelos y votaciones necesitan 2–3 jugadores.</p>}

          <div className="mt-auto pt-6">
            {isHost ? (
              <Btn onClick={() => act({ type: 'startPartners' })}>
                <Headphones size={20} /> Elegir DJs y empezar
              </Btn>
            ) : (
              <p className="text-center text-sm text-white/55">Esperando a que el anfitrión empiece…</p>
            )}
          </div>
        </>
      ) : (
        <PartnerPick room={room} isHost={isHost} selfId={self?.id ?? ''} />
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title="Configuración">
        <SetupSteps room={room} editing onDone={() => setEditing(false)} />
      </Sheet>
    </Screen>
  );
}

function PartnerPick({ room, isHost, selfId }: { room: RoomView; isHost: boolean; selfId: string }) {
  const self = player(room, selfId);
  const others = room.players.filter((p) => p.id !== selfId);
  const chosen = room.players.filter((p) => p.partnerId).length;
  return (
    <>
      <div className="mb-5">
        <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan">Comodín · Llama a tu DJ</div>
        <h1 className="font-display text-2xl font-black">Elige a tu DJ de apoyo</h1>
        <p className="mt-2 text-sm text-white/60">Cuando lo llames, recibirá tu pregunta en su celular. Si acierta, tú ganas la mitad y él un bonus.</p>
      </div>
      {others.length === 0 ? (
        <p className="glass p-4 text-sm text-white/60">Juegas solo: el comodín de DJ no estará disponible.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {others.map((p) => {
            const on = self?.partnerId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => act({ type: 'choosePartner', partnerId: p.id })}
                aria-pressed={on}
                className={cx('glass flex flex-col items-center gap-2 p-4 transition', on && 'bg-violet/20')}
                style={on ? { boxShadow: `inset 0 0 0 2px ${p.color}` } : undefined}
              >
                <Avatar p={p} size={56} ring={on} />
                <span className="font-semibold">{p.name}</span>
                {on && <Pill color="#19C86A">Tu DJ</Pill>}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-white/45">{chosen} de {room.players.length} ya eligieron · quien no elija recibe uno al azar</p>
      <div className="mt-auto pt-6">
        {isHost ? (
          <Btn
            onClick={async () => {
              if (await act({ type: 'startGame' })) toast('¡Que empiece la música! 🎶', 'good');
            }}
          >
            ¡Empezar partida!
          </Btn>
        ) : (
          <p className="text-center text-sm text-white/55">El anfitrión iniciará cuando estéis listos</p>
        )}
      </div>
    </>
  );
}
