import { ArrowLeft } from 'lucide-react';
import { CHALLENGES, PENALTIES, POWER_UPS, TRACK_CARD, TYPE_META, WILDS } from '../../../shared/cards';
import { SCORING } from '../../../shared/config';
import { CardFace } from '../components/cards';
import { Screen, SectionTitle } from '../components/ui';

const steps = [
  ['1', 'Crea la sala', 'El anfitrión responde si hay menores, elige dificultad, tiempo y expansiones. Los demás entran con el código o el QR desde su celular, en cualquier red.'],
  ['2', 'Elige tu DJ', 'Cada jugador elige un compañero de apoyo. Podrás llamarlo una vez con el comodín LLAMA A TU DJ.'],
  ['3', 'Saca una carta', 'En tu turno, saca una carta física y escanea su QR (o pulsa SACAR CARTA en modo prueba).'],
  ['4', 'Escucha y responde', 'Suena un fragmento. Escribe título y artista antes de que acabe el tiempo. En Melómano también el año.'],
  ['5', 'Retos y votos', 'Los retos se votan en secreto. Las tarjetas se revelan a la vez: verde gana, roja pierde, amarilla empata.'],
  ['6', 'Último Drop', 'Tras las vueltas configuradas, los tres mejores juegan la ronda final con puntos dobles. Luego, el podio.']
];

export function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <button onClick={onBack} className="mb-4 mt-2 flex items-center gap-1 text-sm text-white/60">
        <ArrowLeft size={16} /> Volver
      </button>
      <SectionTitle kicker="Reglas" title="Cómo jugar" sub="Partidas de 30–60 minutos · 2 a 12 jugadores · un celular por persona" />

      <ol className="space-y-3">
        {steps.map(([n, t, d]) => (
          <li key={n} className="glass flex gap-3 p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet font-display text-sm font-black">{n}</span>
            <div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-white/60">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Puntuación</h2>
      <div className="glass divide-y divide-white/5 text-sm">
        {[
          ['Título y artista', SCORING.both],
          ['Solo título', SCORING.titleOnly],
          ['Solo artista', SCORING.artistOnly],
          [`Respuesta rápida (primeros ${SCORING.fastWindowSec} s)`, `+${SCORING.fastBonus}`],
          ['Acierto sin comodines', `+${SCORING.noWildcardBonus}`],
          ['Acierto con tu DJ', '50 % de la base'],
          ['Tarjeta verde en duelo', `+${SCORING.greenPoints}`],
          ['Cada 3 aciertos seguidos', 'Recuperas un comodín']
        ].map(([l, v]) => (
          <div key={String(l)} className="flex justify-between px-4 py-3">
            <span className="text-white/70">{l}</span>
            <span className="font-display font-bold text-cyan">{v}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Comodines (uno de cada)</h2>
      <div className="grid gap-2 text-sm">
        <div className="glass p-4"><b>🎧 Llama a tu DJ</b><p className="text-white/60">Tu compañero recibe la pregunta en su celular. Si acierta, ganas la mitad y él +50.</p></div>
        <div className="glass p-4"><b>⏱️ Tiempo extra</b><p className="text-white/60">+{SCORING.extraTimeSec} segundos al reloj.</p></div>
        <div className="glass p-4"><b>🔍 Pista secreta</b><p className="text-white/60">Época, género, país o primera letra del título.</p></div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Las 120 cartas</h2>
      <div className="grid grid-cols-2 gap-3">
        {[TRACK_CARD, POWER_UPS[0], CHALLENGES[0], PENALTIES[0], WILDS[1]].map((c) => (
          <div key={c.id}>
            <CardFace card={c} />
            <p className="mt-1 text-center text-xs text-white/50">{TYPE_META[c.type].label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-white/45">70 TRACK · 20 POWER UP · 15 CHALLENGE · 10 PENALTY (solo adultos) · 5 WILD. En Modo Familiar las penalizaciones no existen y ningún reto implica alcohol.</p>
      <div className="h-8" />
    </Screen>
  );
}
