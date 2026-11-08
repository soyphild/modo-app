import { motion } from 'framer-motion';
import { ArrowLeft, Baby, PartyPopper, ShieldCheck, Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { DIFFICULTY, ROUND_OPTIONS, TIME_OPTIONS } from '../../../shared/config';
import type { Difficulty, RoomConfig, RoomView } from '../../../shared/types';
import { Btn, Logo, Pill, Screen, SectionTitle, cx } from '../components/ui';
import { act, leaveRoom, player } from '../lib/game';
import { ExpansionList } from './Expansions';

const fmtTime = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);

function Option({ on, onClick, title, sub, icon, color = '#8B5CF6' }: { on: boolean; onClick: () => void; title: string; sub?: string; icon?: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx('glass flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.98]', on && 'bg-white/10')}
      style={on ? { boxShadow: `inset 0 0 0 2px ${color}, 0 0 30px -10px ${color}` } : undefined}
    >
      {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}22`, color }}>{icon}</span>}
      <span className="min-w-0">
        <span className="block font-display text-sm font-bold">{title}</span>
        {sub && <span className="mt-0.5 block text-xs text-white/55">{sub}</span>}
      </span>
    </button>
  );
}

const set = (patch: Partial<RoomConfig>) => act({ type: 'configure', patch });

export function SetupSteps({ room, onDone, editing }: { room: RoomView; onDone: () => void; editing?: boolean }) {
  const c = room.config;
  const [step, setStep] = useState(editing ? 1 : c.minorsAsked ? 1 : 0);
  const steps = ['Menores', 'Modalidad', 'Dificultad', 'Tiempo', 'Expansiones', 'Sonido'];
  const next = () => setStep((s) => s + 1);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex items-center gap-1.5" aria-label={`Paso ${step + 1} de ${steps.length}`}>
        {steps.map((s, i) => (
          <div key={s} className={cx('h-1.5 flex-1 rounded-full transition', i <= step ? 'bg-gradient-to-r from-violet to-cyan' : 'bg-white/10')} />
        ))}
      </div>
      <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col">
        {step === 0 && (
          <>
            <SectionTitle kicker="Primero, lo importante" title="¿Participarán menores de 18 años?" sub="Esta respuesta define qué cartas existen en la partida. Se aplica en el servidor, no solo en pantalla." />
            <div className="space-y-3">
              <Option
                on={c.minorsAsked && c.hasMinors}
                color="#00D9FF"
                icon={<Baby />}
                title="Sí, hay menores"
                sub="Modo Familiar: sin penalizaciones ni mecánicas de bebida. Se mantienen comodines, retos, votos y tarjetas."
                onClick={async () => (await act({ type: 'answerMinors', hasMinors: true })) && next()}
              />
              <Option
                on={c.minorsAsked && !c.hasMinors}
                color="#8B5CF6"
                icon={<Users />}
                title="No, todos somos adultos"
                sub="Modo competitivo completo con penalizaciones recreativas."
                onClick={async () => (await act({ type: 'answerMinors', hasMinors: false })) && next()}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <SectionTitle kicker="Modalidad" title={c.familyMode ? 'Modo Familiar activo' : '¿Qué tipo de noche es?'} />
            {c.familyMode ? (
              <div className="glass space-y-2 p-5 text-sm text-white/70">
                <ShieldCheck className="text-cyan" />
                <p>Hay menores en la sala, así que:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Las 10 cartas PENALTY quedan fuera del mazo.</li>
                  <li>No hay ninguna mecánica relacionada con alcohol.</li>
                  <li>Las tarjetas rojas no implican castigos.</li>
                  <li>Las canciones marcadas como explícitas se excluyen.</li>
                </ul>
                {!c.hasMinors && (
                  <button className="pt-2 text-xs text-violet-soft underline" onClick={() => set({ familyMode: false })}>
                    Desactivar Modo Familiar (todos adultos)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Option on={c.modality === 'clasico'} icon={<Swords />} title="Clásico competitivo" sub="Todas las cartas. Las penalizaciones restan puntos o ponen obstáculos." onClick={() => set({ modality: 'clasico' })} />
                <Option on={c.modality === 'fiesta'} color="#F472B6" icon={<PartyPopper />} title="Modo Fiesta" sub="Algunas penalizaciones ofrecen un brindis voluntario como alternativa. Vale cualquier bebida: agua, refresco o la que elijas." onClick={() => set({ modality: 'fiesta' })} />
                <Option on={false} color="#00D9FF" icon={<ShieldCheck />} title="Usar Modo Familiar igualmente" sub="Sin penalizaciones aunque todos sean adultos." onClick={() => set({ familyMode: true })} />
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <SectionTitle kicker="Dificultad" title="¿Qué tan finos son esos oídos?" />
            <div className="space-y-2">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d, i) => (
                <Option key={d} on={c.difficulty === d} color={['#19C86A', '#00D9FF', '#8B5CF6', '#FFC247', '#FF4057'][i]} title={DIFFICULTY[d].label} sub={DIFFICULTY[d].tagline} icon={<span className="font-display font-black">{i + 1}</span>} onClick={() => set({ difficulty: d })} />
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <SectionTitle kicker="Ritmo" title="Tiempo máximo por carta" sub="Es el límite para responder; el fragmento suena unos segundos y puede repetirse." />
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button key={t} onClick={() => set({ timeLimitSec: t })} aria-pressed={c.timeLimitSec === t} className={cx('glass py-4 font-display text-lg font-bold', c.timeLimitSec === t && 'bg-violet/25 ring-2 ring-violet')}>
                  {fmtTime(t)}
                </button>
              ))}
            </div>
            <h3 className="mb-3 mt-8 font-display text-sm font-bold text-white/80">Vueltas completas</h3>
            <div className="grid grid-cols-6 gap-2">
              {ROUND_OPTIONS.map((r) => (
                <button key={r} onClick={() => set({ rounds: r })} aria-pressed={c.rounds === r} className={cx('glass py-3 font-display font-bold', c.rounds === r && 'bg-cyan/20 ring-2 ring-cyan')}>
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/45">Cada jugador tendrá {c.rounds} turno(s). Después llega el ÚLTIMO DROP.</p>
          </>
        )}
        {step === 4 && (
          <>
            <SectionTitle kicker="Mazo" title="Expansiones activas" sub="Combina las ediciones que tengas. Solo suenan canciones con audio autorizado." />
            <ExpansionList
              list={room.availableExpansions}
              selected={c.expansions}
              onToggle={(id) => {
                const list = c.expansions.includes(id) ? c.expansions.filter((x) => x !== id) : [...c.expansions, id];
                void set({ expansions: list });
              }}
            />
          </>
        )}
        {step === 5 && (
          <>
            <SectionTitle kicker="Audio" title="¿Desde dónde suena la música?" />
            <div className="space-y-2">
              <Option on={c.audioMode === 'host'} title="Celular del anfitrión" sub="Ideal en la misma mesa: conéctalo a un parlante." onClick={() => set({ audioMode: 'host' })} />
              <Option on={c.audioMode === 'all'} title="Todos los celulares" sub="Para jugar a distancia. Cada uno escucha en su teléfono, sincronizado." onClick={() => set({ audioMode: 'all' })} />
              <Option on={c.audioMode === 'active'} title="Celular del jugador en turno" sub="El que saca la carta tiene el sonido." onClick={() => set({ audioMode: 'active' })} />
            </div>
            <h3 className="mb-3 mt-6 font-display text-sm font-bold text-white/80">Empates en votaciones</h3>
            <div className="grid grid-cols-2 gap-2">
              <Option on={c.tieMode === 'reduced'} title="Puntos reducidos" sub="+50 para ambos" onClick={() => set({ tieMode: 'reduced' })} />
              <Option on={c.tieMode === 'tiebreak'} title="Desempate" sub="Duelo musical" onClick={() => set({ tieMode: 'tiebreak' })} />
            </div>
            <button className="mt-4 flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm" onClick={() => set({ tensionSounds: !c.tensionSounds })} role="switch" aria-checked={c.tensionSounds}>
              Sonidos de tensión en los últimos 5 s <Pill color={c.tensionSounds ? '#19C86A' : '#888'}>{c.tensionSounds ? 'Sí' : 'No'}</Pill>
            </button>
          </>
        )}
      </motion.div>

      <div className="mt-6 flex gap-2 pt-2">
        {step > (editing ? 1 : 0) && (
          <Btn variant="ghost" size="md" onClick={() => setStep((s) => s - 1)} aria-label="Atrás">
            <ArrowLeft size={18} />
          </Btn>
        )}
        {step > 0 && step < steps.length - 1 && <Btn onClick={next}>Siguiente</Btn>}
        {step === steps.length - 1 && (
          <Btn
            onClick={async () => {
              if (await act({ type: 'finishSetup' })) onDone();
            }}
          >
            {editing ? 'Guardar' : 'Abrir sala'}
          </Btn>
        )}
      </div>
    </div>
  );
}

export function Setup({ room }: { room: RoomView }) {
  const isHost = room.hostId === room.you;
  const host = player(room, room.hostId);
  if (!isHost) {
    return (
      <Screen className="items-center justify-center text-center">
        <Logo />
        <div className="glass mt-8 w-full p-6">
          <div className="text-4xl">{host?.avatar}</div>
          <p className="mt-3 font-semibold">{host?.name} está configurando la partida…</p>
          <p className="mt-2 text-sm text-white/55">Sala {room.code} · {room.players.length} jugador(es)</p>
        </div>
        <button onClick={leaveRoom} className="mt-6 text-sm text-white/50 underline">Salir de la sala</button>
      </Screen>
    );
  }
  return (
    <Screen>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <Logo size="sm" />
        <Pill color="#00D9FF">Sala {room.code}</Pill>
      </div>
      <SetupSteps room={room} onDone={() => {}} />
    </Screen>
  );
}
