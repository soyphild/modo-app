# BEAT OR SHOT · Arquitectura funcional y mapa de pantallas

## 1. Vista general

```
 Celulares (navegador, sin instalar)                    Servidor Node.js (un solo proceso)
┌───────────────────────────────┐   WebSocket    ┌──────────────────────────────────────────┐
│ React + Tailwind + Motion     │◄──────────────►│ Socket.IO  ── valida (zod) ──► Room      │
│  · vista = RoomView personal  │  room:state    │                               (motor     │
│  · acciones → 'action'        │  action/ack    │                                autoritativo)
│  · reloj sincronizado         │                │ Express API                              │
│  · audio WebAudio / <audio>   │◄── HTTP ──────►│  /api/audio/:token   (fragmento opaco)   │
│  · escáner QR (cámara)        │                │  /api/cards          (códigos impresión) │
└───────────────────────────────┘                │  /api/admin/*        (catálogo, licencias)│
                                                 │ CatalogRepository ── JSON (prototipo)     │
                                                 │                    └─ PostgreSQL (prod)   │
                                                 └──────────────────────────────────────────┘
```

### Por qué no Next.js (desviación justificada del brief)

El brief propone Next.js. Para este producto se eligió **Vite + React (SPA) servida por el mismo
proceso Node que mantiene los WebSockets**:

- El juego es 100 % tiempo real y estado efímero en memoria; no hay páginas que se beneficien de SSR/SEO.
- Next.js necesita igualmente un servidor aparte (o un servidor personalizado) para conexiones
  Socket.IO persistentes; en plataformas serverless no se mantienen sockets.
- Un solo proceso = un solo despliegue, un solo dominio HTTPS, sin CORS y sin coordinar dos servicios.
- Se mantienen React, TypeScript, Tailwind y Framer Motion tal como pide el brief. Si más adelante se
  quiere una web de marketing con SEO, puede hacerse en Next.js como sitio independiente.

## 2. Estructura del código

```
beat-or-shot/
├── shared/              Tipos y datos comunes cliente/servidor
│   ├── types.ts         RoomView, StageView, ClientAction… (contrato de red)
│   ├── config.ts        SCORING, DIFFICULTY, opciones de tiempo/vueltas
│   ├── cards.ts         120 cartas, distribución, metadatos visuales por tipo
│   └── catalog.ts       Canciones (demo dominio público + Edición General sin audio), expansiones
├── server/
│   ├── index.ts         Arranque HTTP + Socket.IO + estáticos
│   ├── app.ts           Salas, sockets, validación, API audio/cartas/admin
│   ├── game/engine.ts   Motor de juego (máquina de estados por sala) — fuente de verdad
│   ├── game/answers.ts  Normalización y comparación de respuestas
│   ├── game/helpers.ts  Códigos de sala/carta (HMAC), pistas, utilidades
│   ├── store/catalogStore.ts  Repositorio del catálogo + regla "¿es jugable?"
│   ├── db/schema.sql    Modelo PostgreSQL de producción
│   └── *.test.ts        Tests de motor, red y anti-trampas
└── client/src/
    ├── lib/             game.ts (socket, sesión, reloj), audio.ts (sinte + SFX), settings.ts
    ├── components/      UI base, cartas 3D, escáner QR, confeti
    ├── screens/         Bienvenida, unión, setup, lobby, juego, reglas, expansiones, ajustes
    ├── stages/          Una vista por etapa del turno
    └── pages/           Admin y hojas de impresión
```

## 3. Motor de juego

Cada sala es un objeto `Room` con estado centralizado. El cliente **nunca** cambia estado: envía
acciones (`ClientAction`) que el servidor valida (esquema zod + reglas de fase + permisos del actor).

Fases: `setup → lobby → partners → playing → final → ended`.
Etapas del turno (`Stage`): `turn → card → (track | perform → vote → reveal | penalty) → trackResult → turn…`,
y en la final `finalIntro → track ×2 → podium`.

Temporizadores del servidor: arranque automático de la canción, fin del tiempo, cierre de votación,
publicación del resultado, aplicación de puntos, avance automático. Los clientes solo dibujan.

### Vistas personalizadas (`viewFor(playerId)`)

- Durante una canción **nadie** recibe título, artista, id ni portada. Solo un token de audio opaco.
- El intérprete de TARAREA/MÍMICA es el único que recibe `secret`.
- Las votaciones exponen recuento total, nunca quién votó a quién.
- El resultado de un duelo se publica 1,2 s antes de la revelación; los puntos se aplican al voltear.
- Si la tabla está oculta (DROP SECRETO, final), se envía la puntuación congelada.

### Eventos

| Evento | Dirección | Contenido |
|---|---|---|
| `room:create` / `room:join` | C→S | alias, avatar, ¿menor? → código + token de sesión |
| `room:resume` | C→S | código + token → reconexión con la misma identidad |
| `action` | C→S | `ClientAction` (draw, scan, answer, useWildcard, vote, …) → `{ok, error}` |
| `time:sync` | C→S | devuelve `serverNow` (5 muestras, se usa la de menor RTT) |
| `room:state` | S→C | `RoomView` personalizado tras cada cambio |
| Registro de partida | interno | `events[]` (conectado, carta, comodín, voto abierto, resultado, puntos…) visible en Historial |

### Anti-trampas implementado

- Servidor como fuente de verdad; puntos, respuestas y resultados solo los calcula `Room`.
- Validación estricta de payloads (zod `.strict()`), límite de 25 acciones/s por socket.
- Permisos por acción: solo el anfitrión configura/salta; solo quien está en turno saca carta; solo
  participantes responden; solo votantes elegibles votan una vez; competidores no votan.
- QR: código HMAC opaco por carta; cada número de serie solo se puede jugar una vez por partida.
- Audio: token aleatorio por ronda, revocado al terminarla; respuesta sin metadatos.
- Sesión de invitado por token aleatorio (18 bytes) guardado en el dispositivo; un token falso no entra.
- Tests: `engine.test.ts` (28) + `app.test.ts` (4), incluyendo 6 partidas completas simuladas al azar.

### Reconexión y anfitrión

- El cliente guarda `{code, token}` y se reconecta solo (Socket.IO con reintentos + `room:resume`).
- Si el jugador en turno se desconecta, el turno se salta a los 30 s (o el anfitrión lo salta antes).
- Si el anfitrión se desconecta más de 15 s, el control pasa al siguiente jugador conectado. También
  puede cederse manualmente desde el menú.
- Las rondas y votaciones no esperan a desconectados.

### Sincronización de la revelación

`revealAt` es una marca del reloj del servidor. Cada cliente calcula `offset = serverNow − (t0+t1)/2`
con la muestra de menor RTT y anima con `Date.now() + offset`. Diferencia esperada entre celulares:
< 100 ms en redes normales. El audio de las rondas usa el mismo mecanismo (`startAt`) para que en
modo "todos los celulares" suene sincronizado.

## 4. Audio

`AudioPayload` admite dos fuentes:

1. **`synth`**: notas + tempo de una obra de **dominio público**, interpretada por un sintetizador
   WebAudio propio (sin grabaciones de terceros). Variantes: normal, `remix` (transposición, tempo,
   timbre y batería) y `short` (3–5 s).
2. **`file`**: fragmento con licencia (URL https o archivo local `data/audio`). El servidor lo sirve a
   través de `/api/audio/:token/file` para no exponer la URL real.

Una canción solo es jugable si `isPlayable()`: activa, con audio y con derechos válidos (dominio público
o licencia con titular, nº de licencia y sin vencer). Los enlaces de Spotify se guardan solo como
referencia editorial. Ver `04-licencias-y-riesgos.md`.

Modos de altavoz: celular del anfitrión (por defecto, conectar a un parlante), todos los celulares
(juego a distancia) o celular del jugador en turno. iOS exige un toque para habilitar audio; la app lo
desbloquea al pulsar cualquier botón y ofrece "Toca para activar el sonido" si hace falta.

## 5. QR físicos

- URL impresa: `https://<dominio>/c/XXXX-XXXX` (`XXXX-XXXX` = HMAC-SHA256(secreto, edición:serie)).
- Escaneada con la cámara del sistema → abre la app → si es tu turno, se juega automáticamente.
- Escaneada desde la app → escáner integrado (BarcodeDetector o jsQR) o código escrito a mano.
- El mapa código → carta se regenera con `CARD_SECRET`. **Cambiar el secreto invalida cartas impresas**:
  debe fijarse antes de imprimir y guardarse como secreto de producción.

## 6. Modelo de datos

Prototipo: salas en memoria + catálogo JSON. Producción: `server/db/schema.sql` (PostgreSQL) con
`users, sessions, rooms, players, expansions, decks, cards, card_codes, tracks, track_aliases,
licensed_audio_assets, challenges, turns, answers, votes, power_ups, rewards, scores, game_events`.
El estado en vivo de la sala debería ir a Redis (o mantenerse en memoria con *sticky sessions*) y
escribirse a PostgreSQL al cerrar cada turno para historial y analítica de balance.

## 7. Mapa de pantallas (29 del brief → implementación)

| # | Pantalla | Componente | Estados de carga / error / desconexión |
|---|---|---|---|
| 1 | Bienvenida | `screens/Home` | — |
| 2 | Crear partida | `screens/JoinForm (create)` | Spinner, error de servidor |
| 3 | Unirse | `screens/JoinForm (join)` + `?sala=` | Código inválido, sala llena, partida empezada |
| 4 | Consulta de menores | `Setup` paso 0 | Bloquea el resto hasta responder |
| 5 | Modalidad | `Setup` paso 1 | Fiesta bloqueada si hay menores |
| 6 | Dificultad | `Setup` paso 2 | — |
| 7 | Duración | `Setup` paso 3 (tiempo + vueltas) | — |
| 8 | Expansiones | `Setup` paso 4 / `ExpansionList` | Aviso si no hay audio autorizado |
| 9 | Sala de espera | `screens/Lobby` | Jugadores desconectados, expulsar |
| 10 | Selección de compañero | `Lobby → PartnerPick` | Asignación automática |
| 11 | Turno | `stages/TurnStage` | Jugador ausente → saltar |
| 12 | Escáner QR | `components/Scanner` | Sin permiso de cámara / sin HTTPS → código manual |
| 13 | Reproducción | `stages/TrackStage` (ondas, temporizador) | "Toca para activar el sonido" |
| 14 | Respuesta | `TrackStage → AnswerForm` / quiz | Enviada, segunda oportunidad |
| 15 | Comodines | `TrackStage` + HUD | Agotados, DJ desconectado |
| 16 | Resultado de canción | `stages/ResultStage` | Desglose de puntos |
| 17 | Carta especial | `stages/CardStage` (volteo 3D) | Elegir objetivo |
| 18 | Desafío entre jugadores | `stages/VoteStages → PerformStage` | — |
| 19 | Votación secreta | `VoteStage` | Ya votaste / no votas |
| 20 | Espera de resultados | `VoteStage` (competidores) | Progreso de votos |
| 21 | Cuenta regresiva | `RevealStage` fase `count` | Sincronizada con servidor |
| 22–24 | Verde / Roja / Empate | `RevealStage` + `ResultFace` | Resultado persistente al reconectar |
| 25 | Clasificación | `GameScreen → Leaderboard` (hoja) | Oculta en rondas especiales |
| 26 | Podio final | `stages/Final → Podium` | — |
| 27 | Historial | `GameScreen → HistoryList` | — |
| 28 | Catálogo de expansiones | `screens/Expansions` | Error de red |
| 29 | Panel administrativo | `pages/Admin` (`/admin`) | Clave incorrecta, validación |
| + | Penalización | `stages/PenaltyStage` | Solo adultos |
| + | Último Drop | `stages/Final → FinalIntro` | — |
| + | Hojas de impresión | `pages/Print` (`/print`) | — |
| + | Banner de conexión | `components/Toasts` | Reconectando… |

## 8. Despliegue

- Requisitos: Node 20+, HTTPS (la cámara y el audio en iOS lo exigen).
- `npm ci && npm run build && npm start` (o el `Dockerfile` incluido).
- Variables: `PORT`, `PUBLIC_URL` (dominio para QR e invitaciones), `CARD_SECRET`, `ADMIN_KEY`, `DATA_DIR`.
- Plataformas adecuadas: Fly.io, Render, Railway o cualquier VM con un proceso Node persistente.
  No usar plataformas serverless sin soporte de WebSockets persistentes.
- Escalado: una instancia aguanta cientos de salas. Para varias instancias, usar el adaptador Redis de
  Socket.IO y afinidad de sesión por código de sala.
