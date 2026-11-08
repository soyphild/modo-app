import type { CardDef, CardType } from './types';

/**
 * Definiciones de cartas de la Edición General (120 cartas).
 * La lógica de cada carta vive en server/game/effects.ts y se identifica por `id`.
 */

export const TRACK_CARD: CardDef = {
  id: 'track',
  type: 'TRACK',
  name: 'TRACK',
  short: 'Adivina la canción',
  description: 'Suena un fragmento. Identifica la canción y el artista antes de que se acabe el tiempo.'
};

export const POWER_UPS: CardDef[] = [
  { id: 'vida_extra', type: 'POWER_UP', name: 'VIDA EXTRA', short: 'Recupera un comodín', description: 'Recuperas el primer comodín que hayas gastado. Si los tienes todos, ganas 100 puntos.' },
  { id: 'doble_drop', type: 'POWER_UP', name: 'DOBLE DROP', short: 'x2 en tu próxima canción', description: 'Los puntos de tu próxima canción se duplican.' },
  { id: 'dj_protegido', type: 'POWER_UP', name: 'DJ PROTEGIDO', short: 'Escudo antipenalización', description: 'Bloquea automáticamente la próxima penalización que te toque.' },
  { id: 'cambio_track', type: 'POWER_UP', name: 'CAMBIO DE TRACK', short: 'Cambia una canción', description: 'En tu próxima canción podrás cambiarla por otra una vez. El reloj se reinicia.' },
  { id: 'tiempo_congelado', type: 'POWER_UP', name: 'TIEMPO CONGELADO', short: 'Reloj congelado 15 s', description: 'En tu próxima canción el reloj no corre durante los primeros 15 segundos.' },
  { id: 'segunda_oportunidad', type: 'POWER_UP', name: 'SEGUNDA OPORTUNIDAD', short: 'Responde otra vez', description: 'Si fallas tu próxima respuesta, puedes intentarlo de nuevo dentro del tiempo.' },
  { id: 'back_to_back', type: 'POWER_UP', name: 'BACK TO BACK', short: 'Responde con tu DJ', description: 'En tu próxima canción tu compañero responde a la vez. Vale la mejor respuesta y ambos suman.' },
  { id: 'jackpot', type: 'POWER_UP', name: 'JACKPOT', short: '+150 si aciertas sin pistas', description: 'Si aciertas tu próxima canción sin usar comodines, ganas 150 puntos extra.' },
  { id: 'pista_gratis', type: 'POWER_UP', name: 'PISTA GRATIS', short: 'Una pista sin gastar comodín', description: 'Tu próxima canción empieza con una pista revelada, sin gastar comodín ni perder el bonus.' },
  { id: 'racha_blindada', type: 'POWER_UP', name: 'RACHA BLINDADA', short: 'Tu racha no se rompe', description: 'Tu racha de aciertos sobrevive al próximo fallo.' },
  { id: 'turno_extra', type: 'POWER_UP', name: 'TURNO EXTRA', short: 'Saca otra carta', description: 'Al terminar, vuelves a sacar carta inmediatamente.' },
  { id: 'roba_comodin', type: 'POWER_UP', name: 'ROBA COMODÍN', short: 'Quítale uno al líder', description: 'Tomas un comodín del jugador que va primero. Si el líder eres tú, ganas 100 puntos.' },
  { id: 'bonus_pista', type: 'POWER_UP', name: 'BONUS DE CABINA', short: '+100 puntos', description: 'Ganas 100 puntos inmediatamente.' },
  { id: 'impulso_remontada', type: 'POWER_UP', name: 'IMPULSO DE REMONTADA', short: '+200 si vas atrás', description: 'Si estás en la mitad inferior de la tabla ganas 200 puntos; si no, 75.' },
  { id: 'espejo', type: 'POWER_UP', name: 'ESPEJO', short: 'Tu próxima roja será amarilla', description: 'Si pierdes tu próximo duelo o votación, recibes tarjeta amarilla en lugar de roja.' },
  { id: 'eco', type: 'POWER_UP', name: 'ECO', short: '+2 repeticiones', description: 'En tu próxima canción puedes repetir el fragmento dos veces más.' },
  { id: 'recarga_total', type: 'POWER_UP', name: 'RECARGA TOTAL', short: 'Todos tus comodines', description: 'Recuperas un comodín de cada tipo que tengas agotado.', rarity: 'rare' },
  { id: 'primera_fila', type: 'POWER_UP', name: 'PRIMERA FILA', short: 'Ventana rápida doble', description: 'En tu próxima canción la ventana del bonus por respuesta rápida se duplica.' },
  { id: 'voto_oro', type: 'POWER_UP', name: 'VOTO DE ORO', short: 'Tu voto vale doble', description: 'En la próxima votación en que participes, tu voto cuenta doble.' },
  { id: 'invitado_vip', type: 'POWER_UP', name: 'INVITADO VIP', short: 'Tú y un invitado +75', description: 'Elige a otro jugador: ambos ganan 75 puntos.', needsTarget: true }
];

export const CHALLENGES: CardDef[] = [
  { id: 'dance_battle', type: 'CHALLENGE', name: 'DANCE BATTLE', short: 'Duelo de baile', description: 'Elige rival. Ambos bailan 20 segundos. Los demás votan en secreto.', needsTarget: true, minPlayers: 3 },
  { id: 'canta_drop', type: 'CHALLENGE', name: 'CANTA EL DROP', short: 'Duelo de coros', description: 'Elige rival. Cada uno canta el coro más épico que recuerde. Los demás votan.', needsTarget: true, minPlayers: 3 },
  { id: 'air_guitar', type: 'CHALLENGE', name: 'AIR GUITAR HERO', short: 'Solo de guitarra imaginaria', description: 'Elige rival. Solo de guitarra invisible de 20 segundos cada uno. Los demás votan.', needsTarget: true, minPlayers: 3 },
  { id: 'beatbox', type: 'CHALLENGE', name: 'BEATBOX FACE-OFF', short: 'Duelo de beatbox', description: 'Elige rival. Ronda de beatbox de 15 segundos cada uno. Los demás votan.', needsTarget: true, minPlayers: 3 },
  { id: 'dj_ciegas', type: 'CHALLENGE', name: 'DJ A CIEGAS', short: '5 segundos, 4 opciones', description: 'Solo suenan 5 segundos. Elige al artista correcto entre cuatro opciones.' },
  { id: 'que_epoca', type: 'CHALLENGE', name: '¿QUÉ ÉPOCA?', short: 'Adivina la época', description: 'Escucha el fragmento y elige la época correcta entre cuatro opciones.' },
  { id: 'tararea', type: 'CHALLENGE', name: 'TARAREA Y GANA', short: 'Tu DJ adivina', description: 'Solo tú ves la canción. Tarárea la melodía (sin letra) y tu compañero debe escribirla.' },
  { id: 'duelo_relampago', type: 'CHALLENGE', name: 'DUELO RELÁMPAGO', short: 'Misma canción, dos jugadores', description: 'Elige rival. Ambos responden la misma canción en su celular. Gana la mejor respuesta.', needsTarget: true },
  { id: 'reconoce_remix', type: 'CHALLENGE', name: 'RECONOCE EL REMIX', short: 'Versión alterada x1.5', description: 'Suena una versión remezclada. Identifica la canción original. Puntos x1.5.' },
  { id: 'cambio_dj', type: 'CHALLENGE', name: 'CAMBIO DE DJ', short: 'Pásale la canción a otro', description: 'Elige a quién le toca esta canción. Si falla, tú ganas 100 puntos.', needsTarget: true },
  { id: 'batalla_generos', type: 'CHALLENGE', name: 'BATALLA DE GÉNEROS', short: 'Nombra 4 canciones', description: 'Tienes 30 segundos para nombrar en voz alta 4 canciones del género que salga. El grupo aprueba o no.', minPlayers: 2 },
  { id: 'mimica', type: 'CHALLENGE', name: 'MÍMICA MUSICAL', short: 'Actúa la canción', description: 'Solo tú ves la canción. Represéntala sin hablar ni tararear. Los demás escriben la respuesta.', minPlayers: 2 },
  { id: 'fragmento_relampago', type: 'CHALLENGE', name: 'FRAGMENTO RELÁMPAGO', short: '3 segundos, puntos x2', description: 'El fragmento dura solo 3 segundos. Si aciertas, puntos dobles.' },
  { id: 'sincronia', type: 'CHALLENGE', name: 'SINCRONÍA', short: 'Tú y tu DJ', description: 'Tú y tu compañero responden por separado. Si ambos aciertan, +100 extra para cada uno.' },
  { id: 'publico_decide', type: 'CHALLENGE', name: 'EL PÚBLICO DECIDE', short: 'Haz cantar a la sala', description: 'Tienes 25 segundos para que toda la sala cante contigo un coro. El público aprueba o no.', minPlayers: 3 }
];

export const PENALTIES: CardDef[] = [
  { id: 'baja_volumen', type: 'PENALTY', name: 'BAJA EL VOLUMEN', short: '−75 puntos', description: 'Pierdes 75 puntos (nunca bajas de cero).', adultsOnly: true },
  { id: 'sin_red', type: 'PENALTY', name: 'SIN RED', short: 'Sin comodines un turno', description: 'En tu próxima canción no puedes usar comodines.', adultsOnly: true },
  { id: 'reloj_apurado', type: 'PENALTY', name: 'RELOJ APURADO', short: 'Mitad de tiempo', description: 'Tu próxima canción tiene la mitad del tiempo (mínimo 20 s).', adultsOnly: true },
  { id: 'imitacion', type: 'PENALTY', name: 'IMITACIÓN', short: 'Imita a un cantante', description: 'Imita a un cantante famoso durante 15 segundos. Si el grupo no lo aprueba, pierdes 50 puntos.', adultsOnly: true, minPlayers: 3 },
  { id: 'rival_elige', type: 'PENALTY', name: 'EL RIVAL ELIGE', short: 'El líder te pone un obstáculo', description: 'El jugador que va primero elige el obstáculo de tu próxima canción.', adultsOnly: true },
  { id: 'ronda_extra', type: 'PENALTY', name: 'RONDA EXTRA', short: 'Canción sin comodines', description: 'Juegas ahora una canción extra sin comodines. Si fallas, pierdes 50 puntos.', adultsOnly: true },
  { id: 'donacion', type: 'PENALTY', name: 'DONACIÓN', short: '50 puntos al último', description: 'Le regalas 50 de tus puntos al jugador que va último.', adultsOnly: true },
  { id: 'dj_reves', type: 'PENALTY', name: 'DJ AL REVÉS', short: 'Título y artista o nada', description: 'En tu próxima canción solo puntúas si aciertas título y artista.', adultsOnly: true },
  { id: 'microfono_abierto', type: 'PENALTY', name: 'MICRÓFONO ABIERTO', short: 'Canta 10 segundos', description: 'Canta 10 segundos del coro que elija el grupo. Si no lo aprueban, pierdes 50 puntos.', adultsOnly: true, minPlayers: 3 },
  { id: 'brindis_cabina', type: 'PENALTY', name: 'BRINDIS DE CABINA', short: 'Brindis o −50', description: 'Elige: pierdes 50 puntos, o haces un brindis con la bebida que tengas a mano (agua, refresco o la que prefieras).', adultsOnly: true }
];

export const WILDS: CardDef[] = [
  { id: 'caos_cabina', type: 'WILD', name: 'CAOS EN LA CABINA', short: 'Todos cambian de DJ', description: 'Los compañeros se reasignan al azar durante la próxima vuelta completa.', rarity: 'legendary' },
  { id: 'rave_relampago', type: 'WILD', name: 'RAVE RELÁMPAGO', short: '3 canciones para todos', description: 'Tres canciones seguidas. Todos responden en su celular.', rarity: 'legendary' },
  { id: 'rey_pista', type: 'WILD', name: 'EL REY DE LA PISTA', short: 'Todos contra todos', description: 'Todos responden la misma canción. El acierto más rápido gana 300 puntos extra.', rarity: 'legendary' },
  { id: 'gran_remix', type: 'WILD', name: 'EL GRAN REMIX', short: 'Remix para todos x1.5', description: 'Suena una versión alterada. Todos responden. Puntos x1.5.', rarity: 'legendary' },
  { id: 'ultimo_drop_wild', type: 'WILD', name: 'DROP SECRETO', short: 'x2 a ciegas', description: 'Todos responden una canción con puntos dobles. La tabla se oculta hasta el siguiente turno.', rarity: 'legendary' }
];

export const ALL_SPECIAL_CARDS: CardDef[] = [...POWER_UPS, ...CHALLENGES, ...PENALTIES, ...WILDS];
export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(
  [TRACK_CARD, ...ALL_SPECIAL_CARDS].map((c) => [c.id, c])
);

export const DISTRIBUTION: Record<CardType, number> = {
  TRACK: 70,
  POWER_UP: 20,
  CHALLENGE: 15,
  PENALTY: 10,
  WILD: 5
};

export interface CardInstance {
  /** Número físico dentro de la edición: 1..120 */
  serial: number;
  edition: string;
  defId: string;
}

/** Las 120 cartas físicas de la Edición General. */
export function buildEditionCards(edition = 'GEN1'): CardInstance[] {
  const list: CardInstance[] = [];
  let serial = 1;
  for (let i = 0; i < DISTRIBUTION.TRACK; i++) list.push({ serial: serial++, edition, defId: 'track' });
  for (const c of ALL_SPECIAL_CARDS) list.push({ serial: serial++, edition, defId: c.id });
  return list;
}

export const TYPE_META: Record<CardType, { label: string; color: string; accent: string; glyph: string }> = {
  TRACK: { label: 'TRACK', color: '#00D9FF', accent: '#0891B2', glyph: 'disc' },
  POWER_UP: { label: 'POWER UP', color: '#8B5CF6', accent: '#6D28D9', glyph: 'zap' },
  CHALLENGE: { label: 'CHALLENGE', color: '#FFC247', accent: '#F59E0B', glyph: 'swords' },
  PENALTY: { label: 'PENALTY', color: '#FF4057', accent: '#BE123C', glyph: 'siren' },
  WILD: { label: 'WILD', color: '#F472B6', accent: '#DB2777', glyph: 'sparkles' }
};
