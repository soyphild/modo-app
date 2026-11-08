import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock3, Eye, Headphones, Lightbulb, Lock, Repeat, Send, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIFFICULTY, SCORING } from '../../../shared/config';
import type { RoomView, TrackRoundView } from '../../../shared/types';
import { Avatar, Btn, Pill, TimerRing, Waveform, cx, useServerNow } from '../components/ui';
import { audioReady, playRoundAudio, sfx, stopMusic, unlockAudio } from '../lib/audio';
import { act, getGame, me, player } from '../lib/game';
import { vibrate } from '../lib/settings';
import type { StageOf } from './TurnStage';

function useRoundAudio(r: TrackRoundView) {
  const [needsTap, setNeedsTap] = useState(false);
  const play = () => {
    if (!r.playsAudio || !r.audioToken) return;
    const localStart = r.startAt - getGame().offset;
    void playRoundAudio(r.audioToken, localStart).then((ok) => setNeedsTap(!ok || !audioReady()));
  };
  useEffect(() => {
    play();
    return () => stopMusic();
  }, [r.audioToken, r.audioPlayId, r.playsAudio]);
  return {
    needsTap,
    tapToPlay: () => {
      unlockAudio();
      setTimeout(play, 60);
    }
  };
}

function AnswerForm({ r, onSent }: { r: TrackRoundView; onSent?: () => void }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = (r.fields.title && title.trim()) || (r.fields.artist && artist.trim());
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        const ok = await act({ type: 'answer', title: title.trim() || undefined, artist: artist.trim() || undefined, year: year ? Number(year) : null });
        setBusy(false);
        if (ok) {
          sfx('whoosh');
          vibrate(20);
          setTitle('');
          setArtist('');
          onSent?.();
        }
      }}
    >
      {r.fields.title && <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la canción" className="w-full" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-label="Título" />}
      {r.fields.artist && <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={r.kind === 'hum' || r.kind === 'mime' ? 'Artista (opcional)' : 'Artista o compositor'} className="w-full" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Artista" />}
      {r.fields.year && <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Año aproximado (±10)" inputMode="numeric" className="w-full" aria-label="Año" />}
      <Btn type="submit" disabled={!ready || busy}>
        <Send size={18} /> Enviar respuesta
      </Btn>
    </form>
  );
}

export function TrackStage({ room, st }: { room: RoomView; st: StageOf<'track'> }) {
  const r = st.round;
  const now = useServerNow(150);
  const self = me(room);
  const owner = player(room, r.participants[0]);
  const performer = player(room, r.performerId);
  const host = player(room, room.hostId);
  const { needsTap, tapToPlay } = useRoundAudio(r);
  const isPerformer = r.performerId === room.you;
  const isParticipant = r.participants.includes(room.you) && !isPerformer;
  const isOwner = r.kind === 'solo' && r.participants[0] === room.you;
  const djPartner = player(room, r.dj?.partnerId);
  const answering = (isParticipant || r.iAmDj) && !r.myAnswerLocked && !(isOwner && r.dj);
  const fragSec = r.variant === 'short' ? 5 : DIFFICULTY[room.config.difficulty].fragmentSec;
  const playing = !!(r.audioToken || r.kind !== 'hum') && r.kind !== 'mime' && r.kind !== 'hum' && now >= r.startAt && now < r.startAt + fragSec * 1000;
  const [justDj, setJustDj] = useState(false);
  useEffect(() => {
    if (r.iAmDj && !justDj) {
      setJustDj(true);
      sfx('wildcard');
      vibrate([60, 60, 60]);
    }
  }, [r.iAmDj]);

  const who =
    r.kind === 'solo' ? (isOwner ? 'Responde tú' : `Responde ${owner?.name}`) : r.kind === 'duel' ? 'Duelo: responden ambos' : r.kind === 'hum' ? `${performer?.name} tararea` : r.kind === 'mime' ? `${performer?.name} actúa` : r.kind === 'quiz' ? `Responde ${owner?.name}` : 'Todos responden';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Pill color="#00D9FF">{r.label}</Pill>
        {r.sequence && <Pill color="#F472B6">{r.sequence.index}/{r.sequence.total}</Pill>}
        {r.multiplier !== 1 && <Pill color="#FFC247">x{r.multiplier}</Pill>}
        {r.variant === 'remix' && <Pill color="#8B5CF6">REMIX</Pill>}
        {r.variant === 'short' && <Pill color="#FF4057">FRAGMENTO CORTO</Pill>}
      </div>
      <p className="mt-2 text-center text-sm text-white/60">{who}</p>

      <div className="relative mt-3 flex flex-col items-center">
        <TimerRing startAt={r.startAt} endsAt={r.endsAt} frozenUntil={r.frozenUntil} size={120} tension={room.config.tensionSounds && (isParticipant || r.iAmDj || r.playsAudio)} />
        {r.kind !== 'hum' && r.kind !== 'mime' && (
          <div className="mt-2 w-full">
            <Waveform active={playing} />
            <div className="mt-1 flex items-center justify-center gap-3 text-xs text-white/50">
              {r.playsAudio ? (
                <span className="flex items-center gap-1 text-cyan">
                  <Volume2 size={13} /> Suena en este celular
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <VolumeX size={13} /> El sonido sale del celular de {room.config.audioMode === 'host' ? host?.name : owner?.name}
                </span>
              )}
              {(isOwner || room.hostId === room.you) && r.replaysLeft > 0 && (
                <button className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white" onClick={() => act({ type: 'replay' })}>
                  <Repeat size={12} /> Repetir ({r.replaysLeft})
                </button>
              )}
            </div>
            {r.playsAudio && needsTap && (
              <Btn size="md" variant="outline" className="mx-auto mt-2 flex" onClick={tapToPlay}>
                <Volume2 size={16} /> Toca para activar el sonido
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* Secreto para quien tararea / actúa */}
      {isPerformer && r.secret && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass mt-4 p-5 text-center" style={{ boxShadow: 'inset 0 0 0 2px #FFC247' }}>
          <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-widest text-tie">
            <Eye size={14} /> Solo tú ves esto
          </div>
          <div className="mt-2 font-display text-2xl font-black">{r.secret.title}</div>
          <div className="text-white/70">{r.secret.artist}</div>
          <p className="mt-3 text-sm text-white/60">{r.kind === 'hum' ? `Tararea la melodía (sin letra) para que ${player(room, r.participants[0])?.name} la adivine.` : 'Represéntala sin hablar, cantar ni tararear. ¡Todos adivinan!'}</p>
        </motion.div>
      )}

      {/* Pistas */}
      {r.hints.length > 0 && (
        <div className="mt-4 space-y-2">
          {r.hints.map((h) => (
            <motion.div key={h.kind} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-2xl bg-tie/10 px-4 py-2.5 text-sm">
              <Lightbulb size={16} className="text-tie" />
              <span className="text-white/60">{h.label}:</span>
              <b>{h.value}</b>
            </motion.div>
          ))}
        </div>
      )}

      {/* Llamada al DJ */}
      {r.dj && isOwner && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cyan/10 p-4 text-sm">
          <Headphones className="text-cyan" />
          <span>
            Llamaste a <b>{djPartner?.name}</b>. {r.dj.status === 'pending' ? 'Está respondiendo por ti…' : 'Ya respondió.'}
          </span>
        </div>
      )}
      {r.iAmDj && !r.myAnswerLocked && (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-cyan/15 p-4 text-center text-sm" style={{ boxShadow: 'inset 0 0 0 2px #00D9FF' }}>
          🎧 <b>{owner?.name}</b> te {r.dj ? 'llamó como DJ' : 'tiene en BACK TO BACK'}. ¡Responde por tu compañero!
        </motion.div>
      )}

      <div className="mt-auto space-y-3 pt-4">
        <AnimatePresence mode="wait">
          {r.quiz && isParticipant && !r.myAnswerLocked ? (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="mb-3 text-center font-display font-bold">{r.quiz.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {r.quiz.options.map((o, i) => (
                  <button key={o} onClick={() => act({ type: 'answer', choice: i })} className="glass min-h-[64px] p-3 text-sm font-semibold active:scale-95">
                    {o}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : answering ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {r.canRetry && <p className="mb-2 text-center text-sm font-bold text-tie">🔁 ¡Segunda oportunidad! Inténtalo otra vez.</p>}
              <AnswerForm r={r} />
            </motion.div>
          ) : (isParticipant || r.iAmDj) && r.myAnswerLocked ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass flex items-center justify-center gap-2 p-4 text-sm">
              <Lock size={16} className="text-cyan" /> Respuesta enviada. Esperando al resto…
            </motion.div>
          ) : !isPerformer ? (
            <motion.div key="watch" className="glass p-4 text-center text-sm text-white/60">
              {r.quiz ? `Pregunta: ${r.quiz.question}` : r.kind === 'solo' ? `${owner?.name} está pensando…` : 'Mira cómo responden…'}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Comodines */}
        {r.canUseWildcards && self && (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['dj', Headphones, 'Llama a tu DJ', !player(room, self.partnerId)?.connected],
                ['time', Clock3, `+${SCORING.extraTimeSec} s`, false],
                ['hint', Lightbulb, 'Pista', r.hints.length >= 4]
              ] as const
            ).map(([k, Icon, label, blocked]) => (
              <button
                key={k}
                disabled={!self.wildcards[k] || blocked}
                onClick={async () => {
                  if (await act({ type: 'useWildcard', wildcard: k })) {
                    sfx('wildcard');
                    vibrate(30);
                  }
                }}
                className={cx('flex flex-col items-center gap-1 rounded-2xl border border-cyan/30 bg-cyan/10 py-2.5 text-[11px] font-semibold text-cyan transition active:scale-95 disabled:border-white/5 disabled:bg-white/[0.03] disabled:text-white/25')}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        )}
        {r.canSkipTrack && (
          <Btn variant="outline" size="md" className="w-full" onClick={() => act({ type: 'skipTrack' })}>
            <Shuffle size={16} /> CAMBIO DE TRACK
          </Btn>
        )}

        {/* Quién ya respondió */}
        {r.participants.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {r.participants
              .filter((id) => id !== r.performerId)
              .map((id) => {
                const p = player(room, id);
                const done = r.answered.includes(id);
                return (
                  <span key={id} className={cx('flex items-center gap-1 rounded-full py-1 pl-1 pr-2.5 text-xs', done ? 'bg-win/15 text-win' : 'bg-white/5 text-white/50')}>
                    <Avatar p={p} size={20} /> {p?.name} {done && <Check size={12} />}
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
