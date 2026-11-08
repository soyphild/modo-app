import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Crown, EyeOff, Headphones, History, Lightbulb, LogOut, Menu, RefreshCw, SkipForward, Trophy, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { PlayerPublic, RoomView } from '../../../shared/types';
import { Avatar, Btn, Pill, Screen, Sheet, cx } from '../components/ui';
import { act, leaveRoom, me, player, useGame } from '../lib/game';
import { CardStage } from '../stages/CardStage';
import { FinalIntro, Podium } from '../stages/Final';
import { PenaltyStage } from '../stages/PenaltyStage';
import { RevealStage } from '../stages/RevealStage';
import { ResultStage } from '../stages/ResultStage';
import { TrackStage } from '../stages/TrackStage';
import { TurnStage } from '../stages/TurnStage';
import { PerformStage, VoteStage } from '../stages/VoteStages';
import { SettingsPanel } from './Settings';

export function Leaderboard({ room }: { room: RoomView }) {
  const ranked = room.players.slice().sort((a, b) => b.score - a.score);
  return (
    <div>
      {room.leaderboardHidden && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-violet/15 px-4 py-3 text-sm text-violet-soft">
          <EyeOff size={16} /> Clasificación congelada: se revelará al terminar la ronda especial.
        </div>
      )}
      <ol className="space-y-2">
        {ranked.map((p, i) => (
          <motion.li layout key={p.id} className={cx('flex items-center gap-3 rounded-2xl px-3 py-2.5', p.id === room.you ? 'bg-violet/15' : 'bg-white/[0.04]')}>
            <span className={cx('w-6 text-center font-display text-lg font-black', i === 0 ? 'text-tie' : i === 1 ? 'text-white/80' : i === 2 ? 'text-orange-400' : 'text-white/40')}>{i + 1}</span>
            <Avatar p={p} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.name}</div>
              <div className="flex flex-wrap gap-x-2 text-[11px] text-white/50">
                <span>🎵 {p.correct}</span>
                <span>🔥 {p.streak}</span>
                <span className="text-win">■ {p.greens}</span>
                <span className="text-lose">■ {p.reds}</span>
                <span>🃏 {p.wildcards.dj + p.wildcards.time + p.wildcards.hint}</span>
              </div>
            </div>
            <span className="font-display text-lg font-black tabular-nums">{p.score}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function HistoryList({ room }: { room: RoomView }) {
  const tone = { info: 'text-white/70', good: 'text-win', bad: 'text-lose', special: 'text-cyan' };
  return (
    <ol className="space-y-2">
      {room.events
        .slice()
        .reverse()
        .map((e) => (
          <li key={e.id} className="flex gap-3 text-sm">
            <span className="w-11 shrink-0 text-xs tabular-nums text-white/30">{new Date(e.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className={tone[e.tone]}>{e.text}</span>
          </li>
        ))}
    </ol>
  );
}

function Hud({ room, self }: { room: RoomView; self: PlayerPublic }) {
  const partner = player(room, self.partnerId);
  const w = self.wildcards;
  return (
    <div className="glass-strong sticky bottom-0 z-20 -mx-1 mt-4 flex items-center gap-3 px-3 py-2.5">
      <Avatar p={self} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-black tabular-nums">{self.score}</span>
          <span className="text-xs text-white/45">pts</span>
          {self.streak >= 2 && <span className="text-xs font-bold text-tie">🔥{self.streak}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {self.buffs.map((b) => (
            <span key={b.id} className={cx('rounded-full px-1.5 py-0.5 text-[10px] font-bold', b.kind === 'buff' ? 'bg-violet/25 text-violet-soft' : 'bg-lose/20 text-lose')}>
              {b.label}
            </span>
          ))}
          {!self.buffs.length && partner && <span className="truncate text-[11px] text-white/40">DJ: {partner.avatar} {partner.name}</span>}
        </div>
      </div>
      <div className="flex gap-1.5" aria-label="Tus comodines">
        {(
          [
            ['dj', Headphones, w.dj],
            ['time', Clock3, w.time],
            ['hint', Lightbulb, w.hint]
          ] as const
        ).map(([k, Icon, n]) => (
          <span key={k} className={cx('relative grid h-9 w-9 place-items-center rounded-xl', n ? 'bg-cyan/15 text-cyan' : 'bg-white/5 text-white/20')} title={k}>
            <Icon size={17} />
            {n > 1 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-cyan text-[10px] font-bold text-ink">{n}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GameScreen({ room }: { room: RoomView }) {
  const [sheet, setSheet] = useState<null | 'board' | 'history' | 'menu'>(null);
  const { conn } = useGame();
  const self = me(room);
  const isHost = room.hostId === room.you;
  const st = room.stage;

  const content = (() => {
    if (!st) return null;
    switch (st.type) {
      case 'turn': return <TurnStage room={room} st={st} />;
      case 'card': return <CardStage room={room} st={st} />;
      case 'track': return <TrackStage room={room} st={st} />;
      case 'trackResult': return <ResultStage room={room} st={st} />;
      case 'perform': return <PerformStage room={room} st={st} />;
      case 'vote': return <VoteStage room={room} st={st} />;
      case 'reveal': return <RevealStage room={room} st={st} />;
      case 'penalty': return <PenaltyStage room={room} st={st} />;
      case 'finalIntro': return <FinalIntro room={room} st={st} />;
      case 'podium': return <Podium room={room} onHistory={() => setSheet('history')} />;
    }
  })();
  const stageKey = st ? `${st.type}-${st.type === 'track' ? st.round.id : st.type === 'turn' ? `${room.turnNumber}-${st.activeId}` : ''}` : 'none';

  return (
    <Screen className="pb-2">
      <header className="sticky top-0 z-20 -mx-4 mb-2 flex items-center gap-2 bg-ink/70 px-4 pb-2 pt-1 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', conn === 'online' ? 'bg-win' : 'bg-lose')} title={conn} />
          <span className="font-display text-sm font-black tracking-widest">{room.code}</span>
          {room.phase === 'playing' && (
            <span className="truncate text-xs text-white/50">
              Vuelta {room.currentRound}/{room.config.rounds} · Turno {Math.min(room.turnNumber + 1, room.totalTurns)}/{room.totalTurns}
            </span>
          )}
          {room.phase === 'final' && <Pill color="#FF4057">ÚLTIMO DROP</Pill>}
          {room.config.familyMode && <span title="Modo Familiar">🛡️</span>}
          {isHost && room.config.audioMode === 'host' && <Volume2 size={14} className="shrink-0 text-cyan" aria-label="Este celular es el altavoz" />}
        </div>
        <button onClick={() => setSheet('board')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Clasificación">
          <Trophy size={17} />
        </button>
        <button onClick={() => setSheet('history')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Historial">
          <History size={17} />
        </button>
        <button onClick={() => setSheet('menu')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Menú">
          <Menu size={17} />
        </button>
      </header>

      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div key={stageKey} className="flex flex-1 flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}>
            {content}
          </motion.div>
        </AnimatePresence>
      </main>

      {self && st?.type !== 'podium' && <Hud room={room} self={self} />}

      <Sheet open={sheet === 'board'} onClose={() => setSheet(null)} title="Clasificación">
        <Leaderboard room={room} />
      </Sheet>
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="Historial de partida">
        <HistoryList room={room} />
      </Sheet>
      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Menú">
        <div className="space-y-4">
          {isHost && room.phase !== 'ended' && (
            <div className="glass space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-tie">
                <Crown size={16} /> Herramientas de anfitrión
              </div>
              <Btn size="md" variant="ghost" className="w-full" onClick={() => act({ type: 'hostSkip' }).then((ok) => ok && setSheet(null))}>
                <SkipForward size={16} /> Desbloquear / saltar paso actual
              </Btn>
              <Btn size="md" variant="ghost" className="w-full" onClick={() => act({ type: 'resetDeck' })}>
                <RefreshCw size={16} /> Reiniciar mazo ({room.deckLeft} cartas)
              </Btn>
              <div className="pt-2 text-xs text-white/50">Ceder el control a:</div>
              <div className="flex flex-wrap gap-2">
                {room.players
                  .filter((p) => p.id !== room.you && p.connected)
                  .map((p) => (
                    <button key={p.id} onClick={() => act({ type: 'transferHost', playerId: p.id })} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm">
                      {p.avatar} {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
          <SettingsPanel />
          <Btn variant="danger" size="md" className="w-full" onClick={leaveRoom}>
            <LogOut size={16} /> Salir de la partida
          </Btn>
        </div>
      </Sheet>
    </Screen>
  );
}
