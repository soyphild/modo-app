# BEAT OR SHOT · Fase 1 — Diseño del producto

> Juego de mesa musical físico-digital. Cartas con QR + web app multijugador en tiempo real.
> Estado: **prototipo funcional jugable** (ver `README.md`). Este documento es la referencia de reglas.

## 1. Concepto definitivo

Cada jugador usa su celular. En su turno saca una carta física, escanea el QR y la app decide qué pasa:
suena un fragmento, se abre un duelo, aparece un beneficio o una penalización. Se gana identificando
canciones, ganando votaciones y usando bien los comodines. El momento estrella es la **revelación
simultánea**: todas las pantallas cuentan 3‑2‑1 a la vez y voltean tarjetas verdes, rojas o amarillas.

| Emoción | Dónde se produce |
|---|---|
| Curiosidad | Volteo 3D de la carta y "silencio en la sala… suena en 3, 2, 1" |
| Tensión | Temporizador circular que cambia de color, tic-tac y vibración en los últimos 5 s |
| Competencia | Respuestas rápidas puntúan más, duelos 1 contra 1, ranking en vivo |
| Sorpresa | 50 cartas especiales de 4 tipos; WILD legendarias que afectan a todos |
| Celebración | Confeti, fanfarria, tarjetas que se voltean juntas, podio animado con títulos |

**Público**: grupos de 2–12 personas, 10+ años en Modo Familiar, adultos en Clásico/Fiesta.
**Duración objetivo**: 30–60 min (3 vueltas, 60 s por carta, 6 jugadores ≈ 40 min).

## 2. Contenido de la caja (Edición General · GEN1)

| Tipo | Cantidad | Función |
|---|---|---|
| TRACK | 70 | Ronda musical individual. La canción la elige el servidor según dificultad y expansiones activas. |
| POWER UP | 20 | Beneficio inmediato o guardado para tu próxima canción. |
| CHALLENGE | 15 | Retos: duelos votados, preguntas rápidas, tarareo, mímica. |
| PENALTY | 10 | Solo adultos. Restan puntos o ponen obstáculos, nunca obligan a beber. |
| WILD | 5 | Legendarias: alteran la partida para todos. |
| **Total** | **120** | La proporción vive en `shared/cards.ts` (`DISTRIBUTION`) y se ajusta tras playtests. |

Una carta TRACK **no contiene una canción**: el QR apunta a un identificador opaco (`/c/XXXX-XXXX`)
y el servidor elige la canción. Así la misma caja sirve para todas las dificultades y expansiones, y
nadie puede saber la respuesta mirando el código.

## 3. Flujo de una partida

1. **Crear sala** → el anfitrión recibe código de 6 caracteres, QR y enlace. Se puede entrar desde
   cualquier red (no hace falta compartir Wi‑Fi).
2. **Pregunta obligatoria**: ¿participan menores de 18? (sin respuesta no se puede abrir la sala).
3. Modalidad → dificultad → tiempo y vueltas → expansiones → dónde suena el audio.
4. **Sala de espera**: los jugadores entran con alias y avatar; cada uno indica si es menor.
5. **Elegir DJ**: cada jugador elige compañero de apoyo (si no elige, se asigna uno al azar).
6. **Turnos**: orden aleatorio. Cada jugador juega `vueltas` turnos.
7. **Último Drop**: los 3 mejores juegan 2 canciones simultáneas con puntos ×2 y la tabla oculta.
8. **Podio** con títulos y estadísticas. El anfitrión puede lanzar "Jugar otra vez".

## 4. Reglas de seguridad para menores (aplicadas en el servidor)

- Si el anfitrión responde "hay menores" **o** cualquier jugador que entra declara ser menor, la sala
  pasa a **Modo Familiar** de forma irreversible para esa sala.
- Modo Familiar: las 10 PENALTY nunca salen del mazo virtual; si se escanea una física, el servidor la
  rechaza ("apártala y saca otra"). No existe ninguna mecánica de bebida. La Modalidad Fiesta queda
  bloqueada. Las canciones marcadas `explicit` se excluyen. Comodines, votos, retos y tarjetas verdes/
  rojas/amarillas siguen activos; la roja nunca castiga.
- Si un menor entra a mitad de configuración y había una penalización en curso, se cancela.
- Todo esto está cubierto por tests (`server/game/engine.test.ts`).

**Modo Fiesta (solo adultos)**: algunas penalizaciones ofrecen como *alternativa voluntaria* un
"brindis de cabina" con **la bebida que cada uno tenga** (agua, refresco, jugo…). Nunca se exige
alcohol, nunca hay cantidades crecientes y siempre existe la opción equivalente sin beber.

## 5. Dificultad

| Nivel | Canciones | Holgura ortográfica | Exigencia | Fragmento |
|---|---|---|---|---|
| Novato | dificultad 1–2 | +1 errata | Título **o** artista ya vale 150 | 16 s |
| Fácil | 1–3 | +1 | Normal | 14 s |
| Normal | 2–4 | estándar | Normal | 12 s |
| Difícil | 3–5 | estándar | Normal | 10 s |
| Melómano | 3–5 | −1 (estricto) | Parciales valen la mitad; se pide **año** (±10) | 8 s |

La dificultad cambia **qué suena** y **qué se acepta**. Remixes y fragmentos cortos aparecen por cartas.

## 6. Tiempo

Opciones: 30 s · 60 s · 2 · 3 · 5 · 10 min. Es el límite para responder, no la duración del audio.
El fragmento se puede repetir 2 veces (más con ECO). En rondas grupales el tiempo se limita a 60 s y en
la final a 45 s para mantener el ritmo.

## 7. Puntuación (configurable en `shared/config.ts → SCORING`)

| Concepto | Puntos |
|---|---|
| Título + artista | 200 |
| Solo título | 100 |
| Solo artista | 75 |
| Respuesta rápida (primeros 15 s o 25 % del tiempo, lo que sea menor) | +100 |
| Acierto sin comodines | +50 |
| Año correcto ±10 (Melómano) | +50 |
| Acierto vía DJ | 50 % de la base (sin bonus); el DJ gana +50 |
| Error | 0 |
| Tarjeta verde (duelo votado o musical) | +150 |
| Tarjeta amarilla (empate, modo "puntos reducidos") | +50 |
| Aprobado por el público | +120 |

**Remontada**: quien va último y a ≥300 puntos del líder recibe +50 en cada acierto. Además ROBA COMODÍN,
IMPULSO DE REMONTADA y DONACIÓN favorecen a quien va atrás. Los puntos nunca bajan de 0.

**Rachas**: cada 3 aciertos seguidos recuperas un comodín gastado (o +100 si los tienes todos).
**Verdes**: cada 3 tarjetas verdes, igual. Máximo 2 comodines de cada tipo: no se acumulan sin límite.

## 8. Comodines (uno de cada al empezar)

| Comodín | Efecto |
|---|---|
| 🎧 LLAMA A TU DJ | El compañero recibe la pregunta en su celular y responde por ti. Puntos al 50 %; el DJ +50. Requiere que esté conectado. |
| ⏱️ TIEMPO EXTRA | +20 s al reloj. |
| 🔍 PISTA SECRETA | Revela en orden: época, género, país del artista, primera letra + nº de palabras del título. |

Los comodines solo se usan en tu propia canción individual. Usarlos elimina el bonus "sin comodines".

## 9. Catálogo de cartas especiales

### POWER UP (20)
| Carta | Efecto |
|---|---|
| VIDA EXTRA | Recupera tu primer comodín gastado (o +100). |
| DOBLE DROP | ×2 en tu próxima canción. |
| DJ PROTEGIDO | Bloquea la próxima penalización. |
| CAMBIO DE TRACK | En tu próxima canción puedes cambiarla una vez; el reloj se reinicia. |
| TIEMPO CONGELADO | El reloj no corre los primeros 15 s de tu próxima canción. |
| SEGUNDA OPORTUNIDAD | Si fallas tu próxima respuesta, puedes repetirla. |
| BACK TO BACK | Tu DJ responde a la vez que tú; cuenta la mejor respuesta; él suma la mitad. |
| JACKPOT | +150 si aciertas tu próxima canción sin comodines. |
| PISTA GRATIS | Tu próxima canción empieza con una pista, sin perder el bonus. |
| RACHA BLINDADA | Tu racha sobrevive a un fallo. |
| TURNO EXTRA | Vuelves a sacar carta. |
| ROBA COMODÍN | Le quitas un comodín al líder (si eres tú, +100). |
| BONUS DE CABINA | +100. |
| IMPULSO DE REMONTADA | +200 si estás en la mitad inferior; si no, +75. |
| ESPEJO | Tu próxima roja será amarilla. |
| ECO | +2 repeticiones del fragmento. |
| RECARGA TOTAL (rara) | Recuperas un comodín de cada tipo agotado. |
| PRIMERA FILA | Ventana de respuesta rápida doble. |
| VOTO DE ORO | Tu próximo voto cuenta doble (visible como efecto, nunca quién lo emitió). |
| INVITADO VIP | Eliges a otro jugador: ambos +75. |

### CHALLENGE (15)
| Carta | Mecánica |
|---|---|
| DANCE BATTLE · CANTA EL DROP · AIR GUITAR HERO · BEATBOX FACE-OFF | Duelo elegido por quien saca la carta. Actuación con temporizador → votación secreta → revelación simultánea. Requieren 3+ jugadores. |
| DJ A CIEGAS | 5 s de audio y 4 opciones de artista. +150. |
| ¿QUÉ ÉPOCA? | 8 s de audio y 4 opciones de época. +150. |
| TARAREA Y GANA | Solo el que saca la carta ve la canción, la tararea; su DJ la escribe. Si acierta, +150 para ambos. |
| DUELO RELÁMPAGO | Ambos responden la misma canción en su celular. Gana más puntos (o el más rápido) → verde/roja. |
| RECONOCE EL REMIX | Versión alterada (tono, tempo, timbre y batería). ×1.5. |
| CAMBIO DE DJ | Le pasas la canción a otro jugador; si falla, ganas +100. |
| BATALLA DE GÉNEROS | Nombra 4 canciones del género que salga en 30 s; el público aprueba. |
| MÍMICA MUSICAL | Representas la canción sin sonido; todos escriben. Primero en acertar +150, resto +75, intérprete +100. |
| FRAGMENTO RELÁMPAGO | 3 segundos, sin repeticiones, ×2. |
| SINCRONÍA | Tú y tu DJ responden por separado; si ambos aciertan, +100 extra cada uno. |
| EL PÚBLICO DECIDE | Haz cantar a toda la sala; el público aprueba. |

### PENALTY (10 · solo adultos)
| Carta | Efecto |
|---|---|
| BAJA EL VOLUMEN | −75 (en Fiesta: o brindis voluntario). |
| SIN RED | Sin comodines en tu próxima canción. |
| RELOJ APURADO | Mitad de tiempo (mín. 20 s). |
| IMITACIÓN | Imita a un cantante 15 s; si el público no lo aprueba, −50. |
| EL RIVAL ELIGE | El líder elige tu obstáculo: fragmento corto, remix o sin comodines. |
| RONDA EXTRA | Canción inmediata sin comodines; si fallas, −50. |
| DONACIÓN | Das 50 puntos al último (ayuda a la remontada). |
| DJ AL REVÉS | Solo puntúas con título **y** artista. |
| MICRÓFONO ABIERTO | Canta 10 s el coro que elija el grupo; si no lo aprueban, −50. |
| BRINDIS DE CABINA | −50 o brindis con la bebida que tengas a mano. |

### WILD (5 · legendarias)
| Carta | Efecto |
|---|---|
| CAOS EN LA CABINA | Los compañeros se reasignan al azar durante una vuelta completa y luego se restauran. |
| RAVE RELÁMPAGO | 3 canciones seguidas; todos responden en su celular. |
| EL REY DE LA PISTA | Todos responden; el acierto más rápido gana +300. |
| EL GRAN REMIX | Remix para todos, ×1.5. |
| DROP SECRETO | Todos responden con ×2 y la tabla se congela hasta el siguiente turno. |

## 10. Votaciones y revelación simultánea

1. Quien saca un duelo elige rival. Actúan con un temporizador visible (el botón "¡Terminamos!" lo corta).
2. Votan todos los conectados **excepto los competidores**. Un voto por persona, sin cambiarlo.
3. El servidor no envía a nadie quién votó a quién; solo "votos recibidos X/Y".
4. Se cierra cuando votan todos o se acaba el tiempo (30 s).
5. El servidor fija `revealAt` (≈4,4 s en el futuro). Los celulares, con su reloj sincronizado al
   servidor, muestran "EL RESULTADO ESTÁ LISTO" → 3 → 2 → 1 → volteo a la vez.
6. El resultado se publica 1,2 s antes de `revealAt` para absorber la latencia; los puntos se aplican
   exactamente al voltear. Quien se reconecte ve el resultado guardado.
7. Empate → amarillas. Según configuración: +50 a ambos **o** duelo musical de desempate.
8. Con menos de 3 jugadores, los duelos votados no salen (no habría votantes).

## 11. Clasificación y títulos finales

Ranking en vivo (posición, avatar, nombre, puntos, aciertos, racha, verdes, rojas, comodines). Se oculta
durante DROP SECRETO y el Último Drop. Títulos al final:

- **MASTER OF THE DECK**: más puntos.
- **OÍDO DE ORO**: mayor precisión (mín. 2 intentos).
- **REY DEL DROP**: más respuestas rápidas.
- **COMEBACK LEGEND**: mayor subida desde su peor puesto.
- **DUEL MASTER**: más tarjetas verdes.

## 12. Ajustes de diseño respecto al brief (y por qué)

| Brief | Decisión | Motivo |
|---|---|---|
| "CANTA EL DROP: imitar vocalmente una canción" | Se convirtió en duelo votado de coros, y se añadió **TARAREA Y GANA** con información privada | Imitar solo era poco interactivo; el tarareo usa el celular (solo el intérprete ve la canción) y da protagonismo al DJ. |
| "DJ A CIEGAS: identificar el género en 5 s" | 4 opciones de **artista** en 5 s | Con mezclas de expansiones el género suele ser obvio por el sonido; el artista es más justo y emocionante. |
| "Dejar que un rival seleccione el género" | **EL RIVAL ELIGE**: el líder elige un obstáculo | Funciona con cualquier catálogo y castiga sin sacar a nadie de la partida. |
| Penalizaciones con alcohol | Solo como alternativa voluntaria en Modo Fiesta, con cualquier bebida | Cumple el brief sin incentivar el consumo. |
| Comodines recuperables | Máximo 2 por tipo y efectos que no se acumulan | Evita combos que decidan la partida. |
| Votos 2 jugadores | Duelos votados excluidos con <3 conectados | Sin votantes la mecánica no tiene sentido. |
| Penalizaciones que "excluyen" | Ninguna carta salta turnos | Nadie debe quedar fuera largos periodos. |
| Final con top 3 | Además se oculta la tabla y son 2 canciones ×2 | Mantiene el suspenso y permite remontar en la última ronda. |

## 13. Expansiones

Cada expansión es un conjunto de canciones con identidad visual propia (`shared/catalog.ts → EXPANSIONS`).
Las cartas son **las mismas** para todas las ediciones (el QR no codifica la canción), por lo que una
expansión física puede ser solo "música + 20 cartas temáticas". El anfitrión activa/desactiva expansiones
y el servidor solo usa canciones jugables (con audio autorizado) de las activas.

Planificadas: Electronic, Salsa, Rock Legends, Reggaeton, Latin Party, 80s & 90s, 2000s, Afro & Tribal
House, Pop Divas, Romantic Hits, Venezuelan Classics, Chilean Hits.

## 14. Flujos de usuario (resumen)

```
Bienvenida ─┬─ Crear partida → Alias/avatar/edad → [Setup: Menores → Modalidad → Dificultad → Tiempo → Expansiones → Audio] → Sala de espera
            ├─ Unirse → Código o QR → Alias/avatar/edad → Sala de espera
            ├─ Cómo jugar · Mis expansiones · Perfil · Configuración
Sala de espera → Elegir DJ → Turno ─┬─ TRACK → Canción → Resultado ─────────────┐
                                    ├─ POWER UP → Efecto ────────────────────────┤
                                    ├─ CHALLENGE → (Rival) → Actuación → Voto → Revelación
                                    │              └─ Quiz / Tarareo / Mímica / Duelo musical → Resultado
                                    ├─ PENALTY → Escudo | Efecto | Elección ─────┤
                                    └─ WILD → Ronda grupal (1–3 canciones) ──────┘→ Siguiente turno
Tras N vueltas → ÚLTIMO DROP → Podio → Jugar otra vez | Historial | Salir
```
