'use strict';

const STORAGE_KEY = 'modo_v1_1_state';
const LEGACY_KEY = 'modo_v1_state';
const APP_VERSION = '1.1.0';
const DAY = 86400000;

const GOALS = {
  time: {
    label: 'Organizar mejor mi tiempo',
    short: 'Tiempo',
    description: 'Recuperar dirección sin llenar tu día de tareas.',
    target: { energy: 4, focus: 4, control: 76 },
    weeks: [
      {
        title: 'Haz visible lo importante',
        objective: 'Reducir la sensación de caos definiendo qué merece atención antes de comenzar.',
        method: 'Claridad → selección → cierre',
        actions: [
          { id:'time-w1-a1', title:'Elige tus 3 resultados del día', detail:'Selecciona tres resultados concretos; no una lista interminable.', frequency:'5 días', target:5 },
          { id:'time-w1-a2', title:'Agrupa lo pequeño', detail:'Reserva un único bloque para correos, mensajes y tareas menores.', frequency:'3 veces', target:3 },
          { id:'time-w1-a3', title:'Cierra con una decisión', detail:'Deja definido el primer paso de mañana antes de terminar.', frequency:'5 días', target:5 }
        ],
        metric:'Porcentaje de prioridades completadas y sensación de control al cerrar el día.'
      },
      {
        title: 'Diseña un día que sí cabe',
        objective: 'Ajustar expectativas para evitar planes imposibles y jornadas reactivas.',
        method: 'Capacidad real → bloques → margen',
        actions: [
          { id:'time-w2-a1', title:'Planifica solo el 70 %', detail:'Deja espacio para imprevistos, pausas y transiciones.', frequency:'5 días', target:5 },
          { id:'time-w2-a2', title:'Reserva un bloque esencial', detail:'Protege una ventana para la tarea que más mueve tu objetivo.', frequency:'4 veces', target:4 },
          { id:'time-w2-a3', title:'Reubica, no acumules', detail:'Cuando algo no cabe, decide fecha o elimínalo; no lo mantengas flotando.', frequency:'4 veces', target:4 }
        ],
        metric:'Cantidad de días realistas y reducción de pendientes trasladados sin decisión.'
      },
      {
        title: 'Reduce las fugas de atención',
        objective: 'Recuperar tiempo perdido en cambios constantes y tareas reactivas.',
        method: 'Agrupar → proteger → recuperar',
        actions: [
          { id:'time-w3-a1', title:'Agrupa comunicaciones', detail:'Revisa mensajes en ventanas definidas, no de forma continua.', frequency:'4 días', target:4 },
          { id:'time-w3-a2', title:'Completa antes de cambiar', detail:'Termina un bloque o deja un punto de retorno visible.', frequency:'5 días', target:5 },
          { id:'time-w3-a3', title:'Haz una pausa de transición', detail:'Tómate dos minutos para decidir el siguiente bloque.', frequency:'5 días', target:5 }
        ],
        metric:'Número de cambios de contexto y minutos recuperados por semana.'
      },
      {
        title: 'Consolida tu sistema',
        objective: 'Convertir lo que funcionó en una estructura flexible y sostenible.',
        method: 'Conservar → simplificar → adaptar',
        actions: [
          { id:'time-w4-a1', title:'Conserva tus dos mejores prácticas', detail:'Elige las acciones que tuvieron mayor impacto real.', frequency:'1 vez', target:1 },
          { id:'time-w4-a2', title:'Elimina una regla innecesaria', detail:'Simplifica el sistema para que siga siendo fácil de usar.', frequency:'1 vez', target:1 },
          { id:'time-w4-a3', title:'Diseña tu semana siguiente', detail:'Distribuye prioridades y márgenes antes de que empiece.', frequency:'1 vez', target:1 }
        ],
        metric:'Consistencia de las prácticas elegidas y percepción de control semanal.'
      }
    ]
  },
  procrastination: {
    label: 'Reducir mi procrastinación',
    short: 'Procrastinación',
    description: 'Empezar con menos fricción y sin depender de sentir motivación perfecta.',
    target: { energy: 3.8, focus: 4, control: 74 },
    weeks: [
      {
        title: 'Haz que empezar sea fácil',
        objective: 'Romper la inmovilidad convirtiendo tareas vagas en acciones visibles y pequeñas.',
        method: 'Nombrar → reducir → comenzar',
        actions: [
          { id:'pro-w1-a1', title:'Define el siguiente movimiento', detail:'Escribe o selecciona una acción física concreta, no “avanzar proyecto”.', frequency:'5 días', target:5 },
          { id:'pro-w1-a2', title:'Empieza solo cinco minutos', detail:'Tu compromiso es comenzar; continuar es opcional.', frequency:'5 días', target:5 },
          { id:'pro-w1-a3', title:'Registra qué te frenó', detail:'Elige el obstáculo real: cansancio, miedo, confusión, distracción o saturación.', frequency:'3 veces', target:3 }
        ],
        metric:'Tiempo entre decidir y comenzar, y número de tareas iniciadas.'
      },
      {
        title: 'Reduce el tamaño de la tarea',
        objective: 'Evitar que la dificultad percibida bloquee el inicio.',
        method: 'Dividir → ordenar → completar',
        actions: [
          { id:'pro-w2-a1', title:'Crea una versión mínima', detail:'Define qué resultado sería suficiente para hoy.', frequency:'5 días', target:5 },
          { id:'pro-w2-a2', title:'Trabaja por una entrega', detail:'Cierra una pieza visible antes de abrir otra.', frequency:'4 veces', target:4 },
          { id:'pro-w2-a3', title:'Celebra el inicio, no la perfección', detail:'Marca el avance cuando comenzaste y completaste la versión mínima.', frequency:'5 días', target:5 }
        ],
        metric:'Versiones mínimas completadas y tareas que dejaron de acumularse.'
      },
      {
        title: 'Diseña un entorno que ayude',
        objective: 'Disminuir decisiones y distractores antes de depender de la voluntad.',
        method: 'Preparar → bloquear → facilitar',
        actions: [
          { id:'pro-w3-a1', title:'Deja listo el primer recurso', detail:'Abre el archivo, prepara el espacio o reúne lo necesario la noche anterior.', frequency:'4 días', target:4 },
          { id:'pro-w3-a2', title:'Retira un distractor', detail:'Elige solo uno: teléfono, pestañas, notificaciones o ruido.', frequency:'5 días', target:5 },
          { id:'pro-w3-a3', title:'Usa una señal de inicio', detail:'Repite una señal breve que indique “ahora comienzo”.', frequency:'5 días', target:5 }
        ],
        metric:'Inicios sin demora y frecuencia de distractores evitables.'
      },
      {
        title: 'Aprende a retomar',
        objective: 'Evitar que un día difícil se convierta en abandono.',
        method: 'Aceptar → recuperar → continuar',
        actions: [
          { id:'pro-w4-a1', title:'Define tu versión de recuperación', detail:'Elige la acción mínima que mantiene el vínculo con tu objetivo.', frequency:'1 vez', target:1 },
          { id:'pro-w4-a2', title:'Retoma en menos de 24 horas', detail:'Después de una interrupción, vuelve con una acción pequeña.', frequency:'3 veces', target:3 },
          { id:'pro-w4-a3', title:'Conserva el método que más ayudó', detail:'Selecciona la estrategia con mejor resultado de las últimas semanas.', frequency:'1 vez', target:1 }
        ],
        metric:'Tiempo promedio de recuperación y continuidad después de interrupciones.'
      }
    ]
  },
  energy: {
    label: 'Recuperar energía',
    short: 'Energía',
    description: 'Reconocer qué te recarga y organizar el esfuerzo alrededor de tu energía real.',
    target: { energy: 4, focus: 3.8, control: 72 },
    weeks: [
      {
        title: 'Descubre tu curva de energía',
        objective: 'Identificar horarios, contextos y actividades que elevan o reducen tu energía.',
        method: 'Observar → comparar → proteger',
        actions: [
          { id:'ene-w1-a1', title:'Haz tres check-ins rápidos', detail:'Mañana, mitad del día y tarde; solo un toque por registro.', frequency:'5 días', target:5 },
          { id:'ene-w1-a2', title:'Nombra qué te drenó', detail:'Selecciona la actividad o contexto que más consumió energía.', frequency:'3 veces', target:3 },
          { id:'ene-w1-a3', title:'Protege tu mejor hora', detail:'Usa tu ventana más alta para algo importante, no para tareas reactivas.', frequency:'4 veces', target:4 }
        ],
        metric:'Energía promedio por horario y coincidencia entre energía alta y prioridades.'
      },
      {
        title: 'Reduce el desgaste invisible',
        objective: 'Detectar pequeñas fuentes de agotamiento acumulado durante el día.',
        method: 'Pausar → agrupar → descargar',
        actions: [
          { id:'ene-w2-a1', title:'Haz una pausa breve de movimiento', detail:'Dos a cinco minutos entre bloques prolongados.', frequency:'5 días', target:5 },
          { id:'ene-w2-a2', title:'Agrupa decisiones pequeñas', detail:'Evita resolver mensajes y pendientes de forma continua.', frequency:'4 días', target:4 },
          { id:'ene-w2-a3', title:'Cierra un pendiente mental', detail:'Anótalo, prográmalo o elimínalo para dejar de sostenerlo.', frequency:'4 veces', target:4 }
        ],
        metric:'Caídas de energía durante la tarde y cantidad de pendientes sin decisión.'
      },
      {
        title: 'Alterna esfuerzo y recuperación',
        objective: 'Evitar jornadas intensas sin espacios reales de recuperación.',
        method: 'Esfuerzo → pausa → retorno',
        actions: [
          { id:'ene-w3-a1', title:'Trabaja en ciclos realistas', detail:'Define una duración de esfuerzo que puedas sostener sin agotarte.', frequency:'5 días', target:5 },
          { id:'ene-w3-a2', title:'Elige una pausa que sí recargue', detail:'Evita usar cada pausa para consumir más estímulos.', frequency:'5 días', target:5 },
          { id:'ene-w3-a3', title:'Reserva una tarea ligera', detail:'Ubícala en tu horario de energía más baja.', frequency:'4 veces', target:4 }
        ],
        metric:'Estabilidad de energía y recuperación después de bloques exigentes.'
      },
      {
        title: 'Construye tu manual de energía',
        objective: 'Conservar patrones útiles y reconocer señales tempranas de agotamiento.',
        method: 'Reconocer → elegir → sostener',
        actions: [
          { id:'ene-w4-a1', title:'Elige tus tres recargas efectivas', detail:'Qué actividades realmente mejoraron tu energía en los datos.', frequency:'1 vez', target:1 },
          { id:'ene-w4-a2', title:'Define tu señal de límite', detail:'Identifica cuándo necesitas reducir exigencia o cambiar de tarea.', frequency:'1 vez', target:1 },
          { id:'ene-w4-a3', title:'Programa recuperación', detail:'Incluye pausas y tiempo de recuperación antes de llenar la agenda.', frequency:'1 vez', target:1 }
        ],
        metric:'Capacidad para anticipar caídas y mantener una energía más estable.'
      }
    ]
  },
  focus: {
    label: 'Mejorar mi concentración',
    short: 'Enfoque',
    description: 'Proteger la atención con un sistema, no con fuerza de voluntad permanente.',
    target: { energy: 3.8, focus: 4.2, control: 76 },
    weeks: [
      {
        title: 'Crea una ventana protegida',
        objective: 'Construir un bloque de concentración posible y repetible.',
        method: 'Elegir → preparar → proteger',
        actions: [
          { id:'foc-w1-a1', title:'Elige una tarea esencial', detail:'Un solo resultado para tu bloque de enfoque.', frequency:'5 días', target:5 },
          { id:'foc-w1-a2', title:'Prepara el entorno', detail:'Retira el distractor principal y deja visibles los recursos.', frequency:'5 días', target:5 },
          { id:'foc-w1-a3', title:'Define un punto de retorno', detail:'Al terminar, anota exactamente dónde continuarás.', frequency:'4 días', target:4 }
        ],
        metric:'Minutos de enfoque antes de la primera interrupción y bloques completados.'
      },
      {
        title: 'Agrupa las interrupciones',
        objective: 'Evitar que cada mensaje o pendiente capture tu atención de inmediato.',
        method: 'Capturar → agrupar → responder',
        actions: [
          { id:'foc-w2-a1', title:'Crea ventanas de respuesta', detail:'Define horarios para mensajes y correos.', frequency:'4 días', target:4 },
          { id:'foc-w2-a2', title:'Captura sin cambiar de tarea', detail:'Anota el pendiente y continúa el bloque actual.', frequency:'5 días', target:5 },
          { id:'foc-w2-a3', title:'Registra la interrupción dominante', detail:'Identifica la fuente más frecuente para ajustar el sistema.', frequency:'3 veces', target:3 }
        ],
        metric:'Interrupciones por bloque y tiempo necesario para recuperar la atención.'
      },
      {
        title: 'Fortalece la monotarea',
        objective: 'Disminuir el costo de saltar constantemente entre actividades.',
        method: 'Una cosa → un cierre → una transición',
        actions: [
          { id:'foc-w3-a1', title:'Mantén una sola ventana activa', detail:'Reduce archivos, pestañas y aplicaciones visibles.', frequency:'5 días', target:5 },
          { id:'foc-w3-a2', title:'Cierra antes de abrir', detail:'Completa, delega o deja un punto de retorno antes de cambiar.', frequency:'5 días', target:5 },
          { id:'foc-w3-a3', title:'Usa una transición de dos minutos', detail:'Respira, revisa el objetivo y decide el siguiente bloque.', frequency:'4 días', target:4 }
        ],
        metric:'Cambios de contexto y duración promedio de los bloques de atención.'
      },
      {
        title: 'Diseña tu sistema de enfoque',
        objective: 'Consolidar un método adaptado a tus horarios y límites.',
        method: 'Seleccionar → ajustar → mantener',
        actions: [
          { id:'foc-w4-a1', title:'Conserva tu mejor ventana', detail:'Elige el horario con mejor combinación de energía y enfoque.', frequency:'1 vez', target:1 },
          { id:'foc-w4-a2', title:'Define tu protocolo de interrupción', detail:'Qué harás cuando aparezca una llamada, mensaje o urgencia.', frequency:'1 vez', target:1 },
          { id:'foc-w4-a3', title:'Ajusta la duración del bloque', detail:'Usa la duración que realmente funcionó, no una regla externa.', frequency:'1 vez', target:1 }
        ],
        metric:'Consistencia de los bloques y recuperación después de interrupciones.'
      }
    ]
  },
  balance: {
    label: 'Equilibrar trabajo y vida personal',
    short: 'Equilibrio',
    description: 'Alinear tiempo y energía con las áreas que realmente importan.',
    target: { energy: 4, focus: 3.8, control: 74 },
    weeks: [
      {
        title: 'Haz visible la brecha',
        objective: 'Comparar lo que consideras importante con lo que recibe tiempo real.',
        method: 'Observar → contrastar → elegir',
        actions: [
          { id:'bal-w1-a1', title:'Elige un área descuidada', detail:'Selecciona una sola área para recuperar esta semana.', frequency:'1 vez', target:1 },
          { id:'bal-w1-a2', title:'Reserva un bloque protegido', detail:'Agenda tiempo concreto para esa área antes de llenar el resto.', frequency:'3 veces', target:3 },
          { id:'bal-w1-a3', title:'Marca el final del trabajo', detail:'Usa una acción breve que indique que la jornada terminó.', frequency:'5 días', target:5 }
        ],
        metric:'Tiempo real en el área elegida y capacidad para cerrar la jornada.'
      },
      {
        title: 'Crea límites visibles',
        objective: 'Reducir la expansión del trabajo hacia todo el día.',
        method: 'Delimitar → comunicar → cerrar',
        actions: [
          { id:'bal-w2-a1', title:'Define tu hora de cierre', detail:'Elige una hora realista y una excepción válida.', frequency:'5 días', target:5 },
          { id:'bal-w2-a2', title:'Comunica un límite', detail:'Haz visible cuándo estás disponible y cuándo no.', frequency:'2 veces', target:2 },
          { id:'bal-w2-a3', title:'Deja un punto de retorno', detail:'Evita continuar por miedo a olvidar dónde quedaste.', frequency:'5 días', target:5 }
        ],
        metric:'Hora real de cierre y número de extensiones no planificadas.'
      },
      {
        title: 'Recupera presencia',
        objective: 'Estar realmente en la actividad elegida, no solo cambiar de lugar.',
        method: 'Cerrar → transicionar → conectar',
        actions: [
          { id:'bal-w3-a1', title:'Haz una transición consciente', detail:'Dos minutos para cerrar mentalmente el trabajo.', frequency:'5 días', target:5 },
          { id:'bal-w3-a2', title:'Elige una actividad sin multitarea', detail:'Pareja, familia, descanso o tiempo personal sin revisar trabajo.', frequency:'4 veces', target:4 },
          { id:'bal-w3-a3', title:'Registra satisfacción, no solo tiempo', detail:'Valora si la actividad realmente te aportó.', frequency:'4 veces', target:4 }
        ],
        metric:'Calidad percibida del tiempo personal y revisiones laborales fuera de horario.'
      },
      {
        title: 'Diseña tu equilibrio sostenible',
        objective: 'Construir acuerdos personales que puedan mantenerse incluso en semanas exigentes.',
        method: 'Priorizar → negociar → recuperar',
        actions: [
          { id:'bal-w4-a1', title:'Define tu mínimo no negociable', detail:'Una práctica pequeña para cada área prioritaria.', frequency:'1 vez', target:1 },
          { id:'bal-w4-a2', title:'Crea una regla de semana intensa', detail:'Decide qué reducirás y qué protegerás cuando haya sobrecarga.', frequency:'1 vez', target:1 },
          { id:'bal-w4-a3', title:'Programa recuperación', detail:'Después de una semana exigente, incluye un bloque real de recuperación.', frequency:'1 vez', target:1 }
        ],
        metric:'Cumplimiento de mínimos personales y recuperación después de sobrecarga.'
      }
    ]
  }
};

const OBSTACLES = {
  phone: { label:'El teléfono y las redes', note:'Como tu principal fricción es la distracción digital, el plan reducirá accesos automáticos sin obligarte a desconectarte todo el día.' },
  overload: { label:'Tengo demasiadas cosas', note:'Como estás sosteniendo demasiados frentes, el plan priorizará reducción, selección y límites antes de agregar hábitos.' },
  unclear: { label:'No sé por dónde empezar', note:'Como la falta de claridad te frena, cada semana convertirá objetivos vagos en acciones pequeñas y visibles.' },
  lowenergy: { label:'Me falta energía', note:'Como la energía disponible es limitada, el plan usará acciones breves y ubicará el esfuerzo en tus mejores momentos.' },
  interruptions: { label:'Me interrumpen constantemente', note:'Como tu entorno rompe la continuidad, el plan incluirá captura, agrupación y protocolos de retorno.' },
  consistency: { label:'Empiezo y luego abandono', note:'Como la continuidad es la dificultad principal, el plan medirá recuperación y consistencia flexible, no perfección.' }
};

const ACTIVITY_PRESETS = [
  { key:'focused-work', title:'Trabajo enfocado', category:'Trabajo', subtitle:'Tarea importante' },
  { key:'reactive-work', title:'Mensajes y pendientes', category:'Trabajo', subtitle:'Trabajo reactivo' },
  { key:'meeting', title:'Reunión', category:'Trabajo', subtitle:'Conversación o coordinación' },
  { key:'home', title:'Hogar', category:'Hogar', subtitle:'Orden, limpieza o gestión' },
  { key:'health', title:'Movimiento o salud', category:'Salud', subtitle:'Cuidado físico' },
  { key:'rest', title:'Descanso', category:'Descanso', subtitle:'Pausa o recuperación' },
  { key:'personal', title:'Proyecto personal', category:'Proyecto personal', subtitle:'Algo importante para ti' },
  { key:'social', title:'Redes o entretenimiento', category:'Tiempo digital', subtitle:'Uso digital' }
];

const PHRASE_OPENERS = [
  'No necesitas resolver todo hoy.',
  'Tu progreso no depende de un día perfecto.',
  'La claridad aparece cuando eliges.',
  'Una acción pequeña puede reorganizar el resto del día.',
  'Avanzar también significa reducir.',
  'Tu atención merece una dirección.',
  'Hoy no necesitas demostrar nada.',
  'Un sistema amable puede ser más fuerte que la presión.',
  'La constancia también sabe adaptarse.',
  'Lo importante no siempre es hacer más.',
  'Cada registro es una forma de conocerte mejor.',
  'Tu energía es información, no un defecto.',
  'Retomar cuenta tanto como comenzar.',
  'Una decisión consciente cambia la calidad del día.',
  'Tu plan debe caber en tu vida real.'
];
const PHRASE_MIDDLES = [
  'Protege la acción que cambia el resto.',
  'Elige un siguiente paso que puedas ver y ejecutar.',
  'Haz espacio antes de agregar otra obligación.',
  'Comienza por lo que reduce más fricción.',
  'Usa tu mejor momento para lo que más importa.',
  'Convierte la intención en una acción concreta.',
  'Deja que tus datos orienten la decisión.',
  'Haz una sola cosa con presencia completa.',
  'Diseña el entorno antes de exigir más voluntad.',
  'Decide qué no necesita tu atención ahora.',
  'Cierra un ciclo antes de abrir otro.',
  'Reduce el tamaño, no la importancia.',
  'Mide para aprender, no para juzgarte.',
  'Haz que volver sea más fácil que abandonar.',
  'Elige una mejora que puedas sostener.'
];
const PHRASE_ENDINGS = [
  'Eso también es avanzar.',
  'Lo suficiente, repetido, transforma.',
  'Tu ritmo puede ser estratégico.',
  'La dirección vale más que la velocidad.',
  'Mañana podrás ajustar con más información.',
  'Tu sistema existe para apoyarte.',
  'La perfección no es el objetivo.',
  'La evidencia se construye día a día.',
  'Hazlo posible antes de hacerlo ideal.',
  'La recuperación forma parte del proceso.',
  'Menos fricción, más continuidad.',
  'Lo que funciona para ti es lo que importa.'
];

const GOAL_TEXT_TO_KEY = Object.fromEntries(Object.entries(GOALS).map(([key,val])=>[val.label,key]));

const defaultState = {
  version: APP_VERSION,
  onboarded: false,
  profile: {
    name:'',
    goalKey:'time',
    obstacleKey:'overload',
    dailyMinutes:7,
    mode:'Ligero',
    categories:['Trabajo','Salud','Hogar','Descanso','Proyecto personal','Tiempo digital']
  },
  logs:[],
  checkins:[],
  interruptions:[],
  closes:[],
  plan:{ startedAt:null, weekOffset:0, completions:{} },
  phrases:{ used:[], byDate:{} },
  createdAt:new Date().toISOString()
};

let state = loadState();
let currentView = state.onboarded ? 'today' : 'onboarding';
let onboardingStep = 0;
let onboardingDraft = {
  goalKey:state.profile.goalKey,
  obstacleKey:state.profile.obstacleKey,
  dailyMinutes:state.profile.dailyMinutes,
  name:state.profile.name
};

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function isoDay(date=new Date()){ return new Date(date).toISOString().slice(0,10); }
function startOfDay(date=new Date()){ const d=new Date(date); d.setHours(0,0,0,0); return d; }
function daysBetween(a,b){ return Math.floor((startOfDay(a)-startOfDay(b))/DAY); }
function fmtDate(date=new Date()){ return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long'}).format(date); }
function fmtTime(value){ return new Date(value).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}); }
function titleCase(text){ return text ? text.charAt(0).toUpperCase()+text.slice(1) : ''; }
function uniqueId(){ return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function loadState(){
  try{
    const modern = localStorage.getItem(STORAGE_KEY);
    if(modern){
      const parsed = JSON.parse(modern);
      return normalizeState(parsed);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if(legacy){
      const old = JSON.parse(legacy);
      const migrated = clone(defaultState);
      migrated.onboarded = Boolean(old.onboarded);
      migrated.profile.name = old.profile?.name || '';
      migrated.profile.goalKey = GOAL_TEXT_TO_KEY[old.profile?.goal] || 'time';
      migrated.profile.categories = Array.isArray(old.profile?.categories) ? [...new Set([...old.profile.categories,'Tiempo digital'])] : migrated.profile.categories;
      migrated.logs = Array.isArray(old.logs) ? old.logs : [];
      migrated.checkins = Array.isArray(old.checkins) ? old.checkins : [];
      migrated.interruptions = Array.isArray(old.interruptions) ? old.interruptions : [];
      migrated.closes = Array.isArray(old.closes) ? old.closes : [];
      migrated.plan.startedAt = old.plan?.startsAt || (old.onboarded ? new Date().toISOString() : null);
      localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    }
  }catch(error){ console.warn('No se pudo cargar MODO',error); }
  return clone(defaultState);
}

function normalizeState(parsed){
  const merged = clone(defaultState);
  Object.assign(merged,parsed);
  merged.profile = {...defaultState.profile,...(parsed.profile||{})};
  merged.plan = {...defaultState.plan,...(parsed.plan||{})};
  merged.plan.completions = parsed.plan?.completions || {};
  merged.phrases = {...defaultState.phrases,...(parsed.phrases||{})};
  merged.phrases.used = Array.isArray(merged.phrases.used) ? merged.phrases.used : [];
  merged.phrases.byDate = merged.phrases.byDate || {};
  merged.logs = Array.isArray(parsed.logs) ? parsed.logs : [];
  merged.checkins = Array.isArray(parsed.checkins) ? parsed.checkins : [];
  merged.interruptions = Array.isArray(parsed.interruptions) ? parsed.interruptions : [];
  merged.closes = Array.isArray(parsed.closes) ? parsed.closes : [];
  return merged;
}
function saveState(){ state.version=APP_VERSION; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }

function goal(){ return GOALS[state.profile.goalKey] || GOALS.time; }
function currentWeekIndex(){
  if(!state.plan.startedAt) return Math.max(0,Math.min(3,state.plan.weekOffset||0));
  const elapsed = Math.max(0,daysBetween(new Date(),new Date(state.plan.startedAt)));
  return Math.max(0,Math.min(3,Math.floor(elapsed/7)+(state.plan.weekOffset||0)));
}
function currentPlan(){ return goal().weeks[currentWeekIndex()]; }
function weekStartDate(){
  const started = state.plan.startedAt ? startOfDay(new Date(state.plan.startedAt)) : startOfDay();
  return new Date(started.getTime()+currentWeekIndex()*7*DAY);
}
function weekCompletionCount(action){
  const dates = state.plan.completions[action.id] || [];
  const start = weekStartDate();
  const end = new Date(start.getTime()+7*DAY);
  return dates.filter(d=>{const dt=new Date(`${d}T12:00:00`);return dt>=start&&dt<end;}).length;
}
function isActionDoneToday(actionId){ return (state.plan.completions[actionId]||[]).includes(isoDay()); }
function planProgress(){
  const actions=currentPlan().actions;
  const achieved=actions.reduce((sum,a)=>sum+Math.min(a.target,weekCompletionCount(a)),0);
  const total=actions.reduce((sum,a)=>sum+a.target,0);
  return {achieved,total,pct:total?Math.round(achieved/total*100):0};
}
function nextPlanAction(){
  const actions=currentPlan().actions;
  return actions.find(a=>weekCompletionCount(a)<a.target && !isActionDoneToday(a.id)) || actions.find(a=>weekCompletionCount(a)<a.target) || actions[0];
}

function recentData(days=7){
  const cutoff=Date.now()-days*DAY;
  return {
    logs:state.logs.filter(x=>new Date(x.createdAt).getTime()>=cutoff),
    checkins:state.checkins.filter(x=>new Date(x.createdAt).getTime()>=cutoff),
    interruptions:state.interruptions.filter(x=>new Date(x.createdAt).getTime()>=cutoff),
    closes:state.closes.filter(x=>new Date(x.createdAt).getTime()>=cutoff)
  };
}
function average(values){ const clean=values.map(Number).filter(Number.isFinite); return clean.length?clean.reduce((a,b)=>a+b,0)/clean.length:0; }
function dataDays(){
  const dates=new Set([
    ...state.logs.map(x=>isoDay(x.createdAt)),
    ...state.checkins.map(x=>isoDay(x.createdAt)),
    ...state.closes.map(x=>isoDay(x.createdAt))
  ]);
  return dates.size;
}
function confidence(){ const d=dataDays(); return d<3?'Inicial':d<7?'En desarrollo':'Sólida'; }
function metrics(){
  const r=recentData(7);
  const energyValues=[...r.logs.map(x=>x.energy),...r.checkins.map(x=>x.energy)];
  const focusValues=r.logs.map(x=>x.focus);
  const energy=average(energyValues);
  const focus=average(focusValues);
  const activeDays=new Set([...r.logs,...r.checkins,...r.closes].map(x=>isoDay(x.createdAt))).size;
  const consistency=Math.min(1,activeDays/5);
  const plan=planProgress();
  const adherence=plan.total?plan.achieved/plan.total:0;
  const energyNorm=energy?energy/5:.55;
  const focusNorm=focus?focus/5:.55;
  const score=Math.round((energyNorm*.24+focusNorm*.3+consistency*.2+Math.min(1,adherence*1.5)*.26)*100);
  return {energy,focus,activeDays,adherence,score:Math.max(18,Math.min(96,score)),interruptions:r.interruptions.length,logs:r.logs.length};
}
function projections(){
  const m=metrics();
  const dataFactor=Math.min(1,dataDays()/10);
  const adherenceFactor=Math.max(.35,m.adherence);
  const gain30=Math.round((6+8*adherenceFactor)*(0.65+0.35*dataFactor));
  const gain90=Math.round((13+12*adherenceFactor)*(0.65+0.35*dataFactor));
  return {d30:Math.min(92,m.score+gain30),d90:Math.min(96,m.score+gain90)};
}

function hash(text){ let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
function phraseForToday(forceNew=false){
  const date=isoDay();
  if(!forceNew && state.phrases.byDate[date]) return state.phrases.byDate[date].text;
  const total=PHRASE_OPENERS.length*PHRASE_MIDDLES.length*PHRASE_ENDINGS.length;
  let cursor=(hash(`${date}-${state.profile.goalKey}-${state.phrases.used.length}`))%total;
  let id=''; let text='';
  for(let attempts=0;attempts<total;attempts++){
    const a=cursor%PHRASE_OPENERS.length;
    const b=Math.floor(cursor/PHRASE_OPENERS.length)%PHRASE_MIDDLES.length;
    const c=Math.floor(cursor/(PHRASE_OPENERS.length*PHRASE_MIDDLES.length))%PHRASE_ENDINGS.length;
    id=`${a}-${b}-${c}`;
    text=`${PHRASE_OPENERS[a]} ${PHRASE_MIDDLES[b]} ${PHRASE_ENDINGS[c]}`;
    if(!state.phrases.used.includes(id)) break;
    cursor=(cursor+1)%total;
  }
  state.phrases.used.push(id);
  state.phrases.byDate[date]={id,text};
  saveState();
  return text;
}

function personalizedRationale(){
  const m=metrics();
  const obstacle=OBSTACLES[state.profile.obstacleKey]||OBSTACLES.overload;
  if(dataDays()<3) return `${obstacle.note} Durante los primeros días MODO ajustará el plan con tus registros de energía, enfoque e interrupciones.`;
  const parts=[];
  if(m.focus && m.focus<3) parts.push(`tu enfoque promedio está en ${m.focus.toFixed(1)}/5`);
  if(m.energy && m.energy<3) parts.push(`tu energía promedio está en ${m.energy.toFixed(1)}/5`);
  if(m.interruptions>=4) parts.push(`registraste ${m.interruptions} interrupciones esta semana`);
  const evidence=parts.length?`En tus datos, ${parts.join(' y ')}.`:`Tus registros muestran una base estable para trabajar el objetivo elegido.`;
  return `${evidence} ${obstacle.note}`;
}
function recommendationCard(){
  const m=metrics();
  const plan=currentPlan();
  if(dataDays()<3){
    return {title:'Primero construiremos una línea base útil',body:'Usa los registros rápidos durante tres días. MODO evitará conclusiones fuertes hasta tener suficiente información.',tag:'Aprendiendo de ti'};
  }
  if(m.energy && m.energy<2.8) return {title:'Reduce exigencia antes de sumar disciplina',body:'Tu energía actual es baja. Mantén acciones pequeñas y usa tu mejor horario para la prioridad semanal.',tag:'Energía primero'};
  if(m.interruptions>=5) return {title:'Tu mayor palanca es la recuperación de atención',body:'No necesitas eliminar cada interrupción. Captura el pendiente y vuelve con un punto de retorno visible.',tag:'Patrón detectado'};
  if(m.focus && m.focus<3.2) return {title:'Haz visible el inicio',body:`La estrategia “${plan.method}” reduce la ambigüedad y te da una secuencia clara para comenzar.`,tag:'Recomendación adaptada'};
  return {title:'Conserva lo que ya está funcionando',body:'Tu mejor oportunidad es repetir las acciones que elevan tu enfoque sin aumentar la carga diaria.',tag:'Consolidación'};
}

function render(){
  const main=document.getElementById('main');
  document.getElementById('topbar').style.display=currentView==='onboarding'?'none':'flex';
  document.getElementById('bottomNav').style.display=currentView==='onboarding'?'none':'grid';
  document.querySelectorAll('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===currentView));
  const views={today:renderToday,log:renderLog,progress:renderProgress,plan:renderPlan,profile:renderProfile,onboarding:renderOnboarding};
  main.innerHTML=(views[currentView]||renderToday)();
  bindView();
}

function renderToday(){
  const name=state.profile.name?`, ${escapeHtml(state.profile.name)}`:'';
  const plan=currentPlan();
  const next=nextPlanAction();
  const progress=planProgress();
  const m=metrics();
  const quote=phraseForToday();
  const recent=state.logs.slice(-3).reverse();
  return `
    <section class="view-title">
      <div class="kicker">${escapeHtml(titleCase(fmtDate()))}</div>
      <h1>Tu MODO de hoy${name}</h1>
      <p>Una dirección clara, pocas acciones y datos que sí sirven.</p>
    </section>

    <section class="card daily-quote">
      <div class="quote-mark">“</div>
      <div><blockquote>${escapeHtml(quote)}</blockquote><footer>Frase diaria de MODO</footer></div>
      <button class="quote-refresh" data-action="refresh-quote" aria-label="Mostrar otra frase">
        <svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>
      </button>
    </section>

    <div class="section-head"><h2>Tu siguiente mejor acción</h2><p>Semana ${currentWeekIndex()+1} de 4</p></div>
    <section class="card card-highlight next-action">
      <div class="action-number">${Math.min(99,weekCompletionCount(next)+1)}</div>
      <div><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.detail)}</p></div>
      <button class="btn btn-accent btn-wide" data-action="complete-action" data-id="${escapeHtml(next.id)}">${isActionDoneToday(next.id)?'Completado hoy':'Marcar como hecho'}</button>
    </section>

    <div class="section-head"><h2>¿Cómo está tu energía?</h2><p>Un toque</p></div>
    <section class="card">
      <div class="checkin-row">
        ${renderEnergyButtons('quick-energy')}
      </div>
    </section>

    <div class="section-head"><h2>Registrar sin escribir</h2><button class="link-button" data-view-go="log">Ver opciones</button></div>
    <div class="quick-strip">
      ${ACTIVITY_PRESETS.slice(0,6).map(a=>`<button class="quick-chip" data-action="preset-activity" data-key="${a.key}"><span class="quick-chip-dot"></span>${escapeHtml(a.title)}</button>`).join('')}
    </div>

    <div class="section-head"><h2>Tu programa estratégico</h2><button class="link-button" data-view-go="plan">Abrir plan</button></div>
    <section class="card plan-preview">
      <div class="plan-meta"><span class="pill pill-mint">${escapeHtml(goal().short)}</span><span class="pill">Semana ${currentWeekIndex()+1}</span><span class="pill pill-gold">${progress.pct}% completado</span></div>
      <div><h3>${escapeHtml(plan.title)}</h3><p>${escapeHtml(plan.objective)}</p></div>
      <div class="progress-line"><span style="width:${progress.pct}%"></span></div>
    </section>

    <div class="section-head"><h2>Tu estado</h2><button class="link-button" data-view-go="progress">Ver análisis</button></div>
    <section class="grid grid-2">
      <div class="card metric-card"><span class="metric-label">Índice MODO</span><strong class="metric-value">${m.score}<small>/100</small></strong><span class="metric-foot">Confianza ${confidence().toLowerCase()}</span></div>
      <div class="card metric-card"><span class="metric-label">Días observados</span><strong class="metric-value">${dataDays()}</strong><span class="metric-delta">La precisión mejora con el uso</span></div>
    </section>

    <div class="section-head"><h2>Actividad reciente</h2><button class="link-button" data-view-go="log">Ver historial</button></div>
    <section class="card list">${recent.length?recent.map(renderLogItem).join(''):'<div class="empty"><strong>Tu primer dato empieza hoy</strong>Elige una actividad frecuente y registra sin escribir.</div>'}</section>
  `;
}

function renderLog(){
  const recent=state.logs.slice(-12).reverse();
  return `
    <section class="view-title"><div class="kicker">Registro simple</div><h1>Dos toques, no un formulario</h1><p>Elige una actividad y marca cómo estabas. El texto siempre es opcional.</p></section>

    <section class="hero">
      <div class="eyebrow">Check-in inmediato</div>
      <h1>¿Cómo te sientes ahora?</h1>
      <p>Este dato ayuda a descubrir tus mejores horarios sin pedirte una explicación.</p>
      <div class="checkin-row" style="margin-top:18px">${renderEnergyButtons('quick-energy')}</div>
    </section>

    <div class="section-head"><h2>¿Qué estás haciendo?</h2><p>Actividades frecuentes</p></div>
    <section class="activity-grid">
      ${ACTIVITY_PRESETS.map(a=>`<button class="activity-button" data-action="preset-activity" data-key="${a.key}"><span>${escapeHtml(a.category)}</span><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.subtitle)}</small></button>`).join('')}
      <button class="activity-button" data-action="custom-activity"><span>Personalizado</span><strong>Otra actividad</strong><small>Escribe o usa dictado por voz</small></button>
    </section>

    <div class="section-head"><h2>¿Qué te interrumpió?</h2><p>Un toque y listo</p></div>
    <div class="quick-strip">
      ${['Teléfono o redes','Mensaje o llamada','Persona','Tarea inesperada','Pensamiento o preocupación'].map(x=>`<button class="quick-chip" data-action="quick-interruption" data-value="${escapeHtml(x)}"><span class="quick-chip-dot"></span>${escapeHtml(x)}</button>`).join('')}
    </div>

    <div class="section-head"><h2>Cierre del día</h2><p>Menos de 30 segundos</p></div>
    <section class="card insight-card">
      <div class="insight-icon">✓</div><div><h3>Cierra sin escribir un diario</h3><p>Valora el día, elige qué predominó y decide una mejora para mañana.</p><button class="btn btn-secondary btn-small" style="margin-top:12px" data-action="daily-close">Cerrar mi día</button></div>
    </section>

    <div class="section-head"><h2>Historial</h2><p>${state.logs.length} actividades</p></div>
    <section class="card list">${recent.length?recent.map(renderLogItem).join(''):'<div class="empty"><strong>Aún no hay actividades</strong>Toca una opción frecuente para crear tu primer registro.</div>'}</section>
  `;
}

function renderProgress(){
  const m=metrics();
  const p=projections();
  const target=goal().target;
  const series=buildDailySeries();
  const rec=recommendationCard();
  return `
    <section class="view-title"><div class="kicker">Lectura personal</div><h1>Tu panorama real</h1><p>Compara tu punto actual, el objetivo elegido y escenarios posibles.</p></section>

    <section class="hero">
      <div class="hero-inline"><div><div class="eyebrow">Índice MODO</div><h1>${m.score}/100</h1><p>${statusText(m.score)}</p></div><div class="hero-stat">${p.d90}<small>/100</small></div></div>
      <div class="program-summary"><span class="pill pill-mint">Actual ${m.score}</span><span class="pill pill-gold">Escenario 90 días ${p.d90}</span><span class="pill">Confianza ${confidence()}</span></div>
    </section>

    <div class="section-head"><h2>Energía y enfoque</h2><p>Últimos 7 días</p></div>
    <section class="card chart-wrap">
      <div class="chart-legend"><span class="legend-item"><i class="legend-dot legend-energy"></i>Energía</span><span class="legend-item"><i class="legend-dot legend-focus"></i>Enfoque</span></div>
      ${renderLineChart(series)}
    </section>

    <div class="section-head"><h2>Real · objetivo · proyección</h2><p>Escenario orientativo</p></div>
    <section class="card compare-list">
      ${renderCompareRow('Energía',m.energy||2.8,target.energy,Math.min(target.energy,(m.energy||2.8)+.55),'Escala 1–5')}
      ${renderCompareRow('Enfoque',m.focus||2.8,target.focus,Math.min(target.focus,(m.focus||2.8)+.65),'Escala 1–5')}
      ${renderCompareRow('Control',m.score,target.control,p.d30,'Índice 0–100')}
    </section>

    <div class="section-head"><h2>Lectura profesional</h2><p>${escapeHtml(rec.tag)}</p></div>
    <section class="card insight-card"><div class="insight-icon">i</div><div><h3>${escapeHtml(rec.title)}</h3><p>${escapeHtml(rec.body)}</p></div></section>

    <div class="section-head"><h2>Cómo interpretar la proyección</h2><p>Transparencia</p></div>
    <section class="card"><p style="margin:0;color:var(--muted);line-height:1.55;font-size:13px">Los escenarios de 30 y 90 días se calculan usando tu línea base, la adherencia al plan y la cantidad de datos disponibles. No son una promesa: muestran hacia dónde podrías avanzar si mantienes una aplicación razonable del programa.</p></section>
  `;
}

function renderPlan(){
  const g=goal();
  const weekIndex=currentWeekIndex();
  const plan=currentPlan();
  const progress=planProgress();
  return `
    <section class="view-title"><div class="kicker">Programa personalizado</div><h1>Tu plan completo</h1><p>No es un consejo suelto: es una secuencia de cuatro semanas adaptada a tu objetivo y fricción principal.</p></section>

    <section class="hero program-hero">
      <div class="program-week">Semana ${weekIndex+1} de 4 · ${escapeHtml(g.short)}</div>
      <h1>${escapeHtml(plan.title)}</h1>
      <p>${escapeHtml(plan.objective)}</p>
      <div class="program-summary"><span class="pill pill-mint">Método: ${escapeHtml(plan.method)}</span><span class="pill">${progress.achieved}/${progress.total} acciones</span><span class="pill pill-gold">${progress.pct}%</span></div>
    </section>

    <div class="section-head"><h2>Tu estrategia de esta semana</h2><p>Toca para completar</p></div>
    <section class="card strategy-list">
      ${plan.actions.map(renderStrategyAction).join('')}
    </section>

    <div class="section-head"><h2>Por qué este plan encaja contigo</h2><p>Personalización</p></div>
    <section class="card card-highlight"><p style="margin:0;color:#C6D0DE;line-height:1.6;font-size:13px">${escapeHtml(personalizedRationale())}</p></section>

    <div class="section-head"><h2>Cómo sabremos si funciona</h2><p>Métrica principal</p></div>
    <section class="card insight-card"><div class="insight-icon">↗</div><div><h3>${escapeHtml(plan.metric)}</h3><p>MODO comparará tu línea base con el resultado de la semana y ajustará el método siguiente.</p></div></section>

    <div class="section-head"><h2>Ruta de 4 semanas</h2><p>Métodos diferentes</p></div>
    <section class="roadmap">
      ${g.weeks.map((w,i)=>`<div class="roadmap-item ${i===weekIndex?'current':''}"><div class="roadmap-number">${i+1}</div><div><h4>${escapeHtml(w.title)}</h4><p>${escapeHtml(w.method)}</p></div><span class="roadmap-status">${i<weekIndex?'Completada':i===weekIndex?'Ahora':'Próxima'}</span></div>`).join('')}
    </section>

    <div class="section-head"><h2>Ajustar el sistema</h2><p>Sin empezar de cero</p></div>
    <section class="grid grid-2">
      <button class="btn btn-secondary" data-action="recalibrate-plan">Recalibrar plan</button>
      <button class="btn btn-secondary" data-action="preview-next-week">Vista previa siguiente</button>
    </section>
  `;
}

function renderProfile(){
  return `
    <section class="view-title"><div class="kicker">Tu sistema</div><h1>Preferencias y datos</h1><p>MODO se adapta a lo que quieres cambiar y al esfuerzo que puedes sostener.</p></section>
    <section class="card">
      <div class="profile-row"><div><h4>Objetivo principal</h4><p>${escapeHtml(goal().label)}</p></div><span>${escapeHtml(goal().short)}</span></div>
      <div class="profile-row"><div><h4>Fricción principal</h4><p>${escapeHtml(OBSTACLES[state.profile.obstacleKey]?.label||'Sin definir')}</p></div><span>Editar</span></div>
      <div class="profile-row"><div><h4>Tiempo disponible</h4><p>Acciones diseñadas para tu capacidad real</p></div><span>${state.profile.dailyMinutes} min/día</span></div>
      <div class="profile-row"><div><h4>Modo de uso</h4><p>Registro breve y recomendaciones priorizadas</p></div><span>${escapeHtml(state.profile.mode)}</span></div>
    </section>

    <div class="section-head"><h2>Personalización</h2><p>Control total</p></div>
    <section class="grid grid-2">
      <button class="btn btn-secondary" data-action="recalibrate-plan">Cambiar objetivo</button>
      <button class="btn btn-secondary" data-action="custom-activity">Nueva actividad</button>
    </section>

    <div class="section-head"><h2>Datos</h2><p>Guardados en este dispositivo</p></div>
    <section class="card list">
      <button class="profile-row" style="width:100%;border-left:0;border-right:0;border-top:0;background:none;color:inherit;text-align:left" data-action="export"><div><h4>Exportar mis datos</h4><p>Descarga una copia en formato JSON.</p></div><span>→</span></button>
      <button class="profile-row" style="width:100%;border-left:0;border-right:0;border-top:0;background:none;color:inherit;text-align:left" data-action="load-demo"><div><h4>Cargar demostración</h4><p>Permite ver gráficos y análisis completos.</p></div><span>→</span></button>
      <button class="profile-row" style="width:100%;border:0;background:none;color:var(--danger);text-align:left" data-action="reset"><div><h4>Reiniciar MODO</h4><p>Elimina los datos locales de esta versión.</p></div><span>→</span></button>
    </section>

    <div class="section-head"><h2>Versión</h2><p>${APP_VERSION}</p></div>
  `;
}

function renderOnboarding(){
  const steps=[renderOnboardingGoal,renderOnboardingObstacle,renderOnboardingCapacity,renderOnboardingFinish];
  return `<section class="onboarding-shell"><div class="onboarding-card">
    <div class="onboarding-progress">${[0,1,2,3].map(i=>`<span class="${i<=onboardingStep?'active':''}"></span>`).join('')}</div>
    ${steps[onboardingStep]()}
  </div></section>`;
}
function renderOnboardingGoal(){
  return `<div class="step-label">Paso 1 de 4</div><h1>¿Qué quieres cambiar primero?</h1><p>Elegiremos un programa inicial. Después podrás modificarlo sin perder tus datos.</p>
    <div class="choice-grid">${Object.entries(GOALS).map(([key,g])=>`<button class="choice-card ${onboardingDraft.goalKey===key?'selected':''}" data-onboard-goal="${key}"><strong>${escapeHtml(g.short)}</strong><small>${escapeHtml(g.description)}</small></button>`).join('')}</div>
    <div class="onboarding-actions"><button class="btn btn-accent" data-onboard-next>Continuar</button></div>`;
}
function renderOnboardingObstacle(){
  return `<div class="step-label">Paso 2 de 4</div><h1>¿Qué te frena con más frecuencia?</h1><p>No necesitas explicarlo. Elige la opción más cercana y MODO ajustará el método.</p>
    <div class="choice-grid">${Object.entries(OBSTACLES).map(([key,o])=>`<button class="choice-card ${onboardingDraft.obstacleKey===key?'selected':''}" data-onboard-obstacle="${key}"><strong>${escapeHtml(o.label)}</strong><small>${escapeHtml(o.note.split('.')[0])}.</small></button>`).join('')}</div>
    <div class="onboarding-actions"><button class="btn btn-secondary" data-onboard-back>Volver</button><button class="btn btn-accent" data-onboard-next>Continuar</button></div>`;
}
function renderOnboardingCapacity(){
  const options=[{v:3,t:'3 minutos',s:'Lo esencial, casi sin registro.'},{v:7,t:'7 minutos',s:'Equilibrio entre facilidad y análisis.'},{v:15,t:'15 minutos',s:'Más detalle y reflexión.'}];
  return `<div class="step-label">Paso 3 de 4</div><h1>¿Cuánto esfuerzo diario es realista?</h1><p>No elegimos el plan ideal. Elegimos el plan que puedes sostener.</p>
    <div class="option-stack">${options.map(o=>`<button class="choice-card ${onboardingDraft.dailyMinutes===o.v?'selected':''}" style="width:100%;min-height:auto;margin-bottom:9px" data-onboard-minutes="${o.v}"><strong>${o.t}</strong><small>${o.s}</small></button>`).join('')}</div>
    <div class="onboarding-actions"><button class="btn btn-secondary" data-onboard-back>Volver</button><button class="btn btn-accent" data-onboard-next>Continuar</button></div>`;
}
function renderOnboardingFinish(){
  return `<div class="step-label">Paso 4 de 4</div><h1>Tu programa está listo</h1><p>Durante los primeros días MODO observará tus patrones y mejorará la personalización. No tendrás que escribir para usarlo.</p>
    <section class="card card-highlight" style="margin:18px 0"><div class="plan-meta"><span class="pill pill-mint">${escapeHtml(GOALS[onboardingDraft.goalKey].short)}</span><span class="pill">${onboardingDraft.dailyMinutes} min/día</span></div><h3 style="margin:14px 0 6px">${escapeHtml(GOALS[onboardingDraft.goalKey].weeks[0].title)}</h3><p style="margin:0;color:var(--muted);font-size:12px;line-height:1.45">${escapeHtml(GOALS[onboardingDraft.goalKey].weeks[0].objective)}</p></section>
    <div class="field"><label>¿Cómo quieres que te llamemos? <small>Opcional</small></label><input id="onboardName" value="${escapeHtml(onboardingDraft.name)}" placeholder="Tu nombre"></div>
    <div class="onboarding-actions"><button class="btn btn-secondary" data-onboard-back>Volver</button><button class="btn btn-accent" data-onboard-finish>Entrar a MODO</button></div>`;
}

function renderEnergyButtons(action){
  const labels=[['1','Muy baja'],['2','Baja'],['3','Estable'],['4','Buena'],['5','Alta']];
  return labels.map(([value,label])=>`<button class="mood-button" data-action="${action}" data-value="${value}"><span>${value}</span><small>${label}</small></button>`).join('');
}
function renderLogItem(item){
  return `<div class="list-item"><div><h4>${escapeHtml(item.activity)}</h4><p>${escapeHtml(item.category)} · Energía ${item.energy||'—'}/5 · Enfoque ${item.focus||'—'}/5</p></div><span class="list-item-time">${fmtTime(item.createdAt)}</span></div>`;
}
function renderStrategyAction(action){
  const count=weekCompletionCount(action);
  const doneToday=isActionDoneToday(action.id);
  const met=count>=action.target;
  return `<div class="strategy-card ${doneToday||met?'done':''}"><button class="strategy-check" data-action="complete-action" data-id="${escapeHtml(action.id)}" aria-label="Marcar acción"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></button><div class="strategy-copy"><h4>${escapeHtml(action.title)}</h4><p>${escapeHtml(action.detail)}</p></div><span class="strategy-frequency">${count}/${action.target} · ${escapeHtml(action.frequency)}</span></div>`;
}
function statusText(score){
  if(dataDays()<3) return 'Estamos construyendo tu línea base. Las recomendaciones aún son iniciales.';
  if(score<45) return 'Hay fricción relevante. El plan prioriza estabilidad antes de exigir más.';
  if(score<65) return 'Estás recuperando control. La siguiente mejora está en la continuidad.';
  if(score<80) return 'Tu sistema muestra progreso. Ahora conviene proteger lo que ya funciona.';
  return 'Tu sistema es consistente. El foco está en mantenerlo flexible y sostenible.';
}
function buildDailySeries(){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(Date.now()-i*DAY); const key=isoDay(d);
    const logs=state.logs.filter(x=>isoDay(x.createdAt)===key);
    const checks=state.checkins.filter(x=>isoDay(x.createdAt)===key);
    const energy=average([...logs.map(x=>x.energy),...checks.map(x=>x.energy)]);
    const focus=average(logs.map(x=>x.focus));
    days.push({key,label:new Intl.DateTimeFormat('es-CL',{weekday:'narrow'}).format(d).toUpperCase(),energy:energy||null,focus:focus||null});
  }
  return days;
}
function renderLineChart(series){
  const width=600,height=220,padX=32,padY=24,plotW=width-padX*2,plotH=height-padY*2;
  const x=i=>padX+i*(plotW/(series.length-1));
  const y=v=>padY+(5-v)*(plotH/4);
  const points=(key)=>series.map((d,i)=>d[key]?`${x(i)},${y(d[key])}`:null).filter(Boolean);
  const energyPts=points('energy'); const focusPts=points('focus');
  const poly=pts=>pts.length>1?pts.join(' '):'';
  const area=pts=>pts.length>1?`${pts[0]} ${pts.join(' ')} ${pts[pts.length-1].split(',')[0]},${height-padY} ${pts[0].split(',')[0]},${height-padY}`:'';
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de energía y enfoque">
    <defs><linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#82E6C4"/><stop offset="1" stop-color="#82E6C4" stop-opacity="0"/></linearGradient><linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86A8FF"/><stop offset="1" stop-color="#86A8FF" stop-opacity="0"/></linearGradient></defs>
    ${[1,2,3,4,5].map(v=>`<line class="gridline" x1="${padX}" y1="${y(v)}" x2="${width-padX}" y2="${y(v)}"/>`).join('')}
    ${energyPts.length>1?`<polygon class="energy-area" points="${area(energyPts)}"/><polyline class="energy-line" points="${poly(energyPts)}"/>`:''}
    ${focusPts.length>1?`<polygon class="focus-area" points="${area(focusPts)}"/><polyline class="focus-line" points="${poly(focusPts)}"/>`:''}
    ${series.map((d,i)=>`<text class="axis-label" x="${x(i)}" y="${height-5}" text-anchor="middle">${d.label}</text>`).join('')}
    ${!energyPts.length&&!focusPts.length?`<text class="axis-label" x="${width/2}" y="${height/2}" text-anchor="middle">Registra durante varios días para ver la curva</text>`:''}
  </svg>`;
}
function renderCompareRow(label,actual,target,projected,unit){
  const max=Math.max(target,actual,projected,1);
  const h=v=>Math.max(8,Math.round(v/max*48));
  const fmt=v=>Number(v).toFixed(v>5?0:1);
  return `<div class="compare-row"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(unit)}</small></div><div class="compare-bars"><div class="compare-bar actual"><span style="height:${h(actual)}px"></span><small>Real ${fmt(actual)}</small></div><div class="compare-bar target"><span style="height:${h(target)}px"></span><small>Meta ${fmt(target)}</small></div><div class="compare-bar projected"><span style="height:${h(projected)}px"></span><small>30d ${fmt(projected)}</small></div></div></div>`;
}

function bindView(){
  document.querySelectorAll('[data-view-go]').forEach(el=>el.addEventListener('click',()=>{currentView=el.dataset.viewGo;render();scrollTo({top:0,behavior:'smooth'});}));
  document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>handleAction(el.dataset.action,el)));
  document.querySelectorAll('[data-onboard-goal]').forEach(el=>el.addEventListener('click',()=>{onboardingDraft.goalKey=el.dataset.onboardGoal;render();}));
  document.querySelectorAll('[data-onboard-obstacle]').forEach(el=>el.addEventListener('click',()=>{onboardingDraft.obstacleKey=el.dataset.onboardObstacle;render();}));
  document.querySelectorAll('[data-onboard-minutes]').forEach(el=>el.addEventListener('click',()=>{onboardingDraft.dailyMinutes=Number(el.dataset.onboardMinutes);render();}));
  document.querySelectorAll('[data-onboard-next]').forEach(el=>el.addEventListener('click',()=>{onboardingStep=Math.min(3,onboardingStep+1);render();}));
  document.querySelectorAll('[data-onboard-back]').forEach(el=>el.addEventListener('click',()=>{onboardingStep=Math.max(0,onboardingStep-1);render();}));
  document.querySelectorAll('[data-onboard-finish]').forEach(el=>el.addEventListener('click',finishOnboarding));
}

function handleAction(action,element){
  if(action==='quick-energy') return saveQuickEnergy(Number(element.dataset.value));
  if(action==='preset-activity') return openPresetActivity(element.dataset.key);
  if(action==='custom-activity') return openCustomActivity();
  if(action==='quick-interruption') return saveQuickInterruption(element.dataset.value);
  if(action==='daily-close') return openDailyClose();
  if(action==='complete-action') return togglePlanAction(element.dataset.id);
  if(action==='refresh-quote') { phraseForToday(true); render(); return toast('Nueva frase para hoy'); }
  if(action==='recalibrate-plan') return openRecalibration();
  if(action==='preview-next-week') return previewNextWeek();
  if(action==='export') return exportData();
  if(action==='load-demo') return loadDemo();
  if(action==='reset') return resetApp();
}

function finishOnboarding(){
  const input=document.getElementById('onboardName');
  onboardingDraft.name=input?.value.trim()||'';
  state.profile.goalKey=onboardingDraft.goalKey;
  state.profile.obstacleKey=onboardingDraft.obstacleKey;
  state.profile.dailyMinutes=onboardingDraft.dailyMinutes;
  state.profile.mode=onboardingDraft.dailyMinutes<=3?'Ligero':onboardingDraft.dailyMinutes<=7?'Equilibrado':'Profundo';
  state.profile.name=onboardingDraft.name;
  state.onboarded=true;
  state.plan.startedAt=new Date().toISOString();
  state.plan.weekOffset=0;
  saveState();
  currentView='today';
  render();
  toast('Tu programa personalizado comenzó');
}

function saveQuickEnergy(value){
  state.checkins.push({id:uniqueId(),energy:value,createdAt:new Date().toISOString(),source:'quick'});
  saveState();
  document.querySelectorAll('[data-action="quick-energy"]').forEach(btn=>btn.classList.toggle('selected',Number(btn.dataset.value)===value));
  toast(`Energía ${value}/5 registrada`);
}
function lastEnergy(){ return state.checkins.length?Number(state.checkins[state.checkins.length-1].energy)||3:3; }
function openPresetActivity(key){
  const item=ACTIVITY_PRESETS.find(x=>x.key===key);
  if(!item) return;
  openModal(`<h2>${escapeHtml(item.title)}</h2><p>Solo marca cómo estabas. No necesitas escribir.</p>
    <div class="field"><label>Energía</label><div class="scale" data-scale="energy">${renderScale(lastEnergy())}</div></div>
    <div class="field"><label>Enfoque</label><div class="scale" data-scale="focus">${renderScale(3)}</div></div>
    <div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancelar</button><button type="button" class="btn btn-accent" id="savePreset">Guardar</button></div>`);
  bindScales();
  document.getElementById('savePreset').onclick=()=>{
    saveActivity({activity:item.title,category:item.category,energy:getScale('energy'),focus:getScale('focus'),presetKey:item.key});
    closeDialog();
  };
}
function openCustomActivity(){
  openModal(`<h2>Otra actividad</h2><p>Puedes escribir una frase breve o usar dictado si tu navegador lo permite.</p>
    <div class="field"><label>Actividad <small>Único campo necesario</small></label><div style="display:flex;gap:8px"><input id="customActivity" placeholder="Ej. preparar propuesta"><button type="button" class="btn btn-secondary btn-small" id="dictateActivity">Hablar</button></div></div>
    <div class="field"><label>Categoría</label><select id="customCategory">${state.profile.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select></div>
    <div class="field"><label>Energía</label><div class="scale" data-scale="energy">${renderScale(lastEnergy())}</div></div>
    <div class="field"><label>Enfoque</label><div class="scale" data-scale="focus">${renderScale(3)}</div></div>
    <div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancelar</button><button type="button" class="btn btn-accent" id="saveCustom">Guardar</button></div>`);
  bindScales();
  document.getElementById('dictateActivity').onclick=startDictation;
  document.getElementById('saveCustom').onclick=()=>{
    const activity=document.getElementById('customActivity').value.trim();
    if(!activity) return toast('Di o escribe una actividad breve');
    saveActivity({activity,category:document.getElementById('customCategory').value,energy:getScale('energy'),focus:getScale('focus')});
    closeDialog();
  };
}
function saveActivity(payload){
  state.logs.push({id:uniqueId(),...payload,createdAt:new Date().toISOString()});
  saveState();
  render();
  toast('Actividad guardada');
}
function saveQuickInterruption(type){
  state.interruptions.push({id:uniqueId(),type,impact:3,createdAt:new Date().toISOString(),source:'quick'});
  saveState();
  toast(`${type} registrado`);
}
function openDailyClose(){
  openModal(`<h2>Cierre rápido</h2><p>Todo se responde tocando. La nota es opcional.</p>
    <div class="field"><label>¿Cómo estuvo tu día?</label><div class="scale" data-scale="day">${renderScale(3)}</div></div>
    <div class="field"><label>¿Qué predominó?</label><div class="tap-options" id="dayTone">${['Avance','Cansancio','Calma','Interrupciones','Aprendizaje','Sobrecarga'].map((x,i)=>`<button type="button" class="tap-option ${i===0?'selected':''}" data-value="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}</div></div>
    <div class="field"><label>Para mañana elijo…</label><div class="tap-options" id="tomorrowChoice">${['Una prioridad','Menos tareas','Más pausas','Proteger mi enfoque','Cerrar a tiempo','Retomar sin culpa'].map((x,i)=>`<button type="button" class="tap-option ${i===0?'selected':''}" data-value="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}</div></div>
    <div class="field"><label>Nota <small>Opcional</small></label><input id="closeNote" placeholder="Solo si quieres recordar algo"></div>
    <div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancelar</button><button type="button" class="btn btn-accent" id="saveClose">Cerrar el día</button></div>`);
  bindScales(); bindTapOptions();
  document.getElementById('saveClose').onclick=()=>{
    state.closes.push({id:uniqueId(),day:getScale('day'),tone:getSelected('dayTone'),tomorrow:getSelected('tomorrowChoice'),note:document.getElementById('closeNote').value.trim(),createdAt:new Date().toISOString()});
    saveState(); closeDialog(); render(); toast('Día cerrado. Mañana puedes ajustar.');
  };
}
function togglePlanAction(id){
  if(!id) return;
  const today=isoDay();
  const dates=state.plan.completions[id]||[];
  const index=dates.indexOf(today);
  if(index>=0) dates.splice(index,1); else dates.push(today);
  state.plan.completions[id]=dates;
  saveState(); render(); toast(index>=0?'Acción desmarcada':'Acción completada');
}

function previewNextWeek(){
  const index=currentWeekIndex();
  const nextIndex=Math.min(3,index+1);
  const next=goal().weeks[nextIndex];
  openModal(`<h2>${index===3?'Etapa de consolidación':'Próximo método'}</h2><p>${index===3?'Ya estás viendo la última etapa del programa.':'Esta vista no modifica tu semana actual.'}</p>
    <section class="card card-highlight"><div class="plan-meta"><span class="pill pill-mint">Semana ${nextIndex+1}</span><span class="pill">${escapeHtml(next.method)}</span></div><h3 style="margin:14px 0 6px">${escapeHtml(next.title)}</h3><p style="margin:0;color:var(--muted);line-height:1.5;font-size:12px">${escapeHtml(next.objective)}</p></section>
    <div class="strategy-list" style="margin-top:14px">${next.actions.map(a=>`<div class="strategy-card"><div class="strategy-check"></div><div class="strategy-copy"><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.detail)}</p></div><span class="strategy-frequency">${escapeHtml(a.frequency)}</span></div>`).join('')}</div>
    <div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cerrar</button></div>`);
}

function openRecalibration(){
  openModal(`<h2>Recalibrar tu plan</h2><p>Cambia el objetivo o la fricción principal. Tus registros no se eliminan.</p>
    <div class="field"><label>Objetivo</label><div class="tap-options" id="reGoal">${Object.entries(GOALS).map(([key,g])=>`<button type="button" class="tap-option ${state.profile.goalKey===key?'selected':''}" data-value="${key}">${escapeHtml(g.short)}</button>`).join('')}</div></div>
    <div class="field"><label>Fricción principal</label><div class="tap-options" id="reObstacle">${Object.entries(OBSTACLES).map(([key,o])=>`<button type="button" class="tap-option ${state.profile.obstacleKey===key?'selected':''}" data-value="${key}">${escapeHtml(o.label)}</button>`).join('')}</div></div>
    <div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancelar</button><button type="button" class="btn btn-accent" id="saveRecalibration">Aplicar</button></div>`);
  bindTapOptions();
  document.getElementById('saveRecalibration').onclick=()=>{
    state.profile.goalKey=getSelected('reGoal');
    state.profile.obstacleKey=getSelected('reObstacle');
    state.plan.startedAt=new Date().toISOString();
    state.plan.weekOffset=0;
    saveState(); closeDialog(); render(); toast('Plan recalibrado');
  };
}

function renderScale(selected=3){ return [1,2,3,4,5].map(n=>`<button type="button" data-value="${n}" class="${n===Number(selected)?'selected':''}">${n}</button>`).join(''); }
function bindScales(){ document.querySelectorAll('.scale button').forEach(btn=>btn.onclick=()=>{btn.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}); }
function getScale(name){ return Number(document.querySelector(`[data-scale="${name}"] .selected`)?.dataset.value||3); }
function bindTapOptions(){ document.querySelectorAll('.tap-options .tap-option').forEach(btn=>btn.onclick=()=>{btn.parentElement.querySelectorAll('.tap-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}); }
function getSelected(id){ return document.querySelector(`#${id} .selected`)?.dataset.value||''; }
function openModal(content){ const dialog=document.getElementById('modal'); document.getElementById('modalCard').innerHTML=content; dialog.showModal(); }
function closeDialog(){ document.getElementById('modal').close(); }
function startDictation(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition) return toast('El dictado no está disponible en este navegador');
  const rec=new Recognition(); rec.lang='es-CL'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onresult=e=>{document.getElementById('customActivity').value=e.results[0][0].transcript;};
  rec.onerror=()=>toast('No pudimos iniciar el dictado');
  rec.start(); toast('Habla ahora');
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`MODO-datos-${isoDay()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function loadDemo(){
  if(!confirm('¿Cargar datos de demostración? Se conservará tu perfil, pero se reemplazarán los registros actuales.')) return;
  const now=Date.now();
  state.logs=[]; state.checkins=[]; state.interruptions=[]; state.closes=[]; state.plan.completions={}; state.plan.startedAt=new Date(now-13*DAY).toISOString(); state.plan.weekOffset=0;
  for(let i=13;i>=0;i--){
    const date=new Date(now-i*DAY); const baseEnergy=2.7+(13-i)*.055; const baseFocus=2.5+(13-i)*.07;
    state.checkins.push({id:uniqueId(),energy:Math.min(5,Math.max(1,Math.round((baseEnergy+(i%3)*.12)*10)/10)),createdAt:new Date(date.setHours(9,10)).toISOString(),source:'demo'});
    const presets=[ACTIVITY_PRESETS[0],ACTIVITY_PRESETS[(i%4)+1]];
    presets.forEach((a,j)=>state.logs.push({id:uniqueId(),activity:a.title,category:a.category,energy:Math.min(5,baseEnergy+j*.15),focus:Math.min(5,baseFocus-j*.1),presetKey:a.key,createdAt:new Date(new Date(now-i*DAY).setHours(10+j*4,15)).toISOString(),source:'demo'}));
    if(i%2===0) state.interruptions.push({id:uniqueId(),type:i%4===0?'Teléfono o redes':'Mensaje o llamada',impact:3,createdAt:new Date(new Date(now-i*DAY).setHours(11,30)).toISOString(),source:'demo'});
    if(i<8) state.closes.push({id:uniqueId(),day:Math.min(5,3+(i%3)*.5),tone:'Avance',tomorrow:'Una prioridad',createdAt:new Date(new Date(now-i*DAY).setHours(20,0)).toISOString(),source:'demo'});
  }
  currentPlan().actions.forEach((a,idx)=>{state.plan.completions[a.id]=Array.from({length:Math.min(a.target,idx+2)},(_,n)=>isoDay(new Date(now-n*DAY)));});
  saveState(); render(); toast('Demostración cargada');
}
function resetApp(){
  if(!confirm('¿Eliminar todos los datos locales de MODO? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); location.reload();
}
function toast(message){
  const region=document.getElementById('toastRegion'); const el=document.createElement('div'); el.className='toast'; el.textContent=message; region.appendChild(el); setTimeout(()=>el.remove(),2600);
}

// Static navigation bindings.
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{currentView=btn.dataset.view;render();scrollTo({top:0,behavior:'smooth'});}));
document.getElementById('quickAddTop').addEventListener('click',()=>currentView==='log'?openCustomActivity():openQuickMenu());
function openQuickMenu(){
  openModal(`<h2>Registro rápido</h2><p>Elige lo que quieres guardar. Ninguna opción exige escribir.</p><div class="choice-grid">
    <button type="button" class="choice-card" id="quickActivity"><strong>Actividad</strong><small>Elige una actividad frecuente.</small></button>
    <button type="button" class="choice-card" id="quickEnergy"><strong>Energía</strong><small>Registra tu nivel con un toque.</small></button>
    <button type="button" class="choice-card" id="quickInterrupt"><strong>Interrupción</strong><small>Detecta qué rompió tu atención.</small></button>
    <button type="button" class="choice-card" id="quickClose"><strong>Cierre</strong><small>Termina el día en 30 segundos.</small></button>
  </div><div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cerrar</button></div>`);
  document.getElementById('quickActivity').onclick=()=>{closeDialog();currentView='log';render();};
  document.getElementById('quickEnergy').onclick=()=>{closeDialog();saveQuickEnergy(3);};
  document.getElementById('quickInterrupt').onclick=()=>{closeDialog();currentView='log';render();};
  document.getElementById('quickClose').onclick=()=>{closeDialog();openDailyClose();};
}

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker no disponible',error)); }
render();
