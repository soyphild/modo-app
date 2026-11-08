# BEAT OR SHOT · Fase 5 — Pruebas y hoja de ruta

## 1. Estado por fase

| Fase | Entregable | Estado |
|---|---|---|
| 1 · Producto | Concepto, reglas, mecánicas, puntos, cartas, menores, expansiones, flujos | ✅ `01-producto-y-reglas.md` |
| 2 · Visual | Identidad, cartas, caja, interfaz móvil, votación, animaciones | ✅ Implementado en la app + `03-…`. Caja: especificación (falta arte final de imprenta) |
| 3 · MVP | Salas, varios celulares, configuración, cartas simuladas, audio autorizado, respuestas, comodines, votos, revelación sincronizada, puntuación, ganador | ✅ Funcional y probado |
| 4 · Físico | QR, vínculo con cartas, archivos para imprenta, escaneo | ✅ `/print`, escáner, enlaces `/c/…` · ⏳ prueba con cartas impresas reales |
| 5 · Pruebas | Automatizadas | ✅ 32 tests · ⏳ playtests con personas |

## 2. Pruebas automatizadas (`npm test`)

- **Respuestas**: tildes, mayúsculas, artículos, erratas, rechazo de respuestas parecidas pero distintas,
  mayor exigencia en Melómano.
- **Reglas**: pregunta de menores obligatoria; Modo Familiar forzado por servidor y sin penalizaciones en
  200 robos; puntuación de TRACK; QR repetido rechazado; solo el jugador en turno saca carta; DJ (50 % +
  bonus); pista y tiempo extra; vistas sin título/id de la canción; votación (sin autovoto, un voto,
  resultado oculto hasta la cuenta, puntos al voltear); empates; escudo; brindis voluntario; puntos ≥ 0;
  tope de comodines; traspaso de anfitrión; tabla oculta en la final; audio disponible en secuencias.
- **Simulación**: 6 partidas completas aleatorias (2–5 jugadores, Clásico y Fiesta) que deben terminar
  en podio sin bloqueos, con puntos ≥ 0 y comodines dentro del tope.
- **Red**: crear/unirse/reconectar por token, acciones no autorizadas o malformadas rechazadas, audio por
  token opaco sin metadatos, panel admin protegido y validación de licencias/enlaces.
- **E2E manual con Playwright** (3 navegadores móviles): setup completo, unión por enlace, DJs, escaneo
  por código, canción acertada, DANCE BATTLE con votación y revelación, llamada al DJ, final y podio.

## 3. Plan de playtests

**Sesiones**: 5 grupos × 2 partidas (familias con niños, amigos 20–35, grupo latino de fiesta,
melómanos, grupo remoto por videollamada). Observador con hoja de registro; la app ya guarda el
historial de eventos para analizar después.

| Área | Qué medir | Objetivo |
|---|---|---|
| Usabilidad | Tiempo hasta empezar la primera canción desde "Crear partida" | < 3 min |
| Usabilidad | Personas que necesitan ayuda para unirse | < 10 % |
| Ritmo | Duración media de un turno TRACK / reto | 45–75 s / 90–120 s |
| Ritmo | Tiempo máximo que un jugador pasa sin interactuar | < 4 min |
| Balance | % de aciertos por dificultad | Novato 70 %, Normal 45 %, Melómano 25 % |
| Balance | Diferencia final 1.º–último | < 60 % de los puntos del ganador |
| Balance | Ganador ≠ líder a mitad de partida | 30–40 % de las partidas |
| Balance | Uso de cada comodín | Todos > 20 % de los jugadores |
| Diversión | ¿Repetirían? ¿Lo recomendarían? (NPS) | ≥ 80 % / NPS ≥ 40 |
| Momentos | Reacciones audibles en la revelación | En ≥ 80 % de las revelaciones |

## 4. Rendimiento y sincronización

- Carga: simular 200 salas × 8 clientes con `socket.io-client` y medir latencia de `action → room:state` (objetivo p95 < 150 ms).
- Sincronización: grabar en vídeo 4 celulares en distintas redes (Wi‑Fi, 4G, 5G) durante 20 revelaciones; desfase máximo objetivo < 150 ms.
- Audio: probar iPhone (Safari), Android (Chrome), modo bajo consumo y pantalla bloqueada.
- Reconexión: cortar la red 10 s durante una votación y una canción; el jugador debe volver al estado correcto.

## 5. Seguridad

- Revisar que ninguna vista contiene respuestas (ya cubierto por test; repetir con cada etapa nueva).
- Fuzzing de acciones con payloads aleatorios.
- Rotar `CARD_SECRET` por edición y `ADMIN_KEY` fuerte; panel admin detrás de autenticación real en producción.
- Cabeceras de seguridad (CSP, HSTS) en el despliegue.

## 6. Próximos pasos recomendados

1. **Playtests con este prototipo** usando el catálogo de dominio público (no requiere licencias).
2. Ajustar `SCORING`, `DISTRIBUTION` y tiempos según los datos.
3. Definir la estrategia de licencias de la Edición General (ver `04-…`) y cargar los primeros
   fragmentos autorizados desde `/admin`.
4. Persistencia en PostgreSQL (`server/db/schema.sql`) + Redis para salas, y analítica de balance.
5. Imprimir un lote piloto de 3 cajas con `/print`, probar el escaneo y el desgaste.
6. Modo equipos (2v2/3v3) usando la pareja DJ como base de equipo.
7. Arte final de caja y cartas con ilustrador (manteniendo el sistema de color/glifos).
