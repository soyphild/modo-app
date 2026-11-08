# BEAT OR SHOT · Licencias musicales y riesgos

> Este documento no es asesoría legal. Antes de vender el producto hay que validarlo con un abogado
> de propiedad intelectual en cada país de venta.

## 1. Spotify: por qué solo se usa como referencia

El propio brief advierte que las políticas de Spotify restringen los juegos de adivinanzas musicales y
otros usos de su contenido. Además, un enlace de Spotify no concede derechos para reproducir, recortar,
ocultar metadatos ni usar una canción dentro de un producto comercial. Por eso:

- El campo `spotifyUrl` existe en cada canción **solo como referencia editorial** (para que el equipo
  identifique la versión exacta al negociar licencias). Se valida que sea un enlace `open.spotify.com/track/…`.
- **No hay ninguna integración** con la API ni el reproductor de Spotify, ni mecanismos para extraer audio.
- Antes de cualquier integración futura con Spotify (por ejemplo, un botón "Escúchala completa en
  Spotify" en la pantalla de resultado, que no oculta metadatos ni es parte de la adivinanza), revisar
  las condiciones vigentes del programa de desarrolladores y pedir autorización si corresponde.

## 2. Qué derechos necesita cada fragmento

Para usar un fragmento de una grabación comercial en un juego hacen falta, normalmente:

1. **Derechos de la grabación** (máster/fonograma) — sello discográfico o distribuidor.
2. **Derechos de la composición** (obra) — editorial(es) musical(es); a veces varias por canción.
3. Según el país y el modelo, **comunicación pública** (sociedades de gestión) si el audio se emite a un grupo.

El modelo de datos lo refleja: `rights.status` (`licensed` / `public_domain_composition` /
`pending_license`), titular, nº de licencia, territorio y vencimiento. Una canción con licencia
vencida deja de sonar automáticamente.

## 3. Estrategia recomendada

| Fase | Fuente de audio | Riesgo |
|---|---|---|
| Prototipo y playtests (actual) | Obras de dominio público interpretadas por nuestro sintetizador | Muy bajo |
| Lanzamiento | Catálogos de *production music* / música libre de regalías con licencia para juegos, o grabaciones encargadas ("sound-alike" **no**: imitar una grabación sigue requiriendo licencia de la composición) | Bajo |
| Edición General con éxitos | Acuerdos directos con sellos/editoriales o agregadores de licencias para fragmentos cortos (10–15 s) | Medio — coste por canción y territorio |
| Expansiones temáticas | Acuerdos por expansión con un sello o editorial (p. ej. una edición de salsa con un catálogo concreto) | Medio-bajo, negociación más sencilla |

Notas del catálogo demo:
- "Cumpleaños feliz": la melodía procede de "Good Morning to All" (1893). Se considera de dominio público
  tras litigios en EE. UU.; verificar en cada territorio.
- "Bella ciao": melodía tradicional; se evita cualquier arreglo moderno. Verificar por territorio.
- Nuestras interpretaciones sintetizadas son grabaciones nuevas propias, no copias de grabaciones existentes.

## 4. Registro de riesgos

| Riesgo | Tipo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| Usar canciones comerciales sin licencia | Legal | Alta si se omite | Crítico | Regla `isPlayable()` en servidor; Edición General sin audio hasta tener licencias |
| Políticas de Spotify | Legal | Alta | Alto | Solo enlaces de referencia; sin API ni reproducción |
| Nombre "BEAT OR SHOT" ya registrado | Legal | Media | Alto | Búsqueda de marcas (OEPM/EUIPO/USPTO/INAPI/SAPI) antes de imprimir |
| Asociación con alcohol en un juego que pueden usar menores | Legal/marca | Media | Alto | Modo Familiar forzado por servidor; brindis solo voluntario, con cualquier bebida y solo adultos; nunca en material de marketing dirigido a menores |
| Autodeclaración de edad no verificable | Seguridad | Media | Medio | Preguntar en la sala y a cada jugador; ante la duda, Modo Familiar; no recoger datos personales |
| Copiar mecánicas/marca de otros juegos | Legal | Baja | Medio | Diseño, nombres y arte propios; no usar marcas de terceros |
| Datos personales de menores | Legal (GDPR/COPPA y equivalentes) | Media | Alto | Acceso como invitado sin cuenta; solo alias en memoria; sin analítica personal; política de privacidad |
| Secreto de cartas filtrado | Seguridad | Baja | Medio | El QR no contiene respuestas; un código filtrado solo permite "jugar" esa carta; rotación por edición |
| Trampas desde el navegador | Seguridad | Media | Medio | Servidor autoritativo, vistas filtradas, tokens de audio opacos, tests |
| Alguien escucha el fragmento con Shazam | Juego | Alta | Bajo | Norma de mesa; fragmentos cortos; en la mesa el audio sale de un solo altavoz y todos lo ven |
| iOS bloquea el audio | Técnico | Alta | Medio | Desbloqueo con el primer toque + botón "Toca para activar el sonido" |
| Cámara sin HTTPS o sin permiso | Técnico | Media | Bajo | Despliegue HTTPS; escaneo con la cámara del sistema (URL); código manual |
| Latencia / desconexiones | Técnico | Media | Medio | Reloj sincronizado, resultados persistentes, reconexión por token, saltos automáticos |
| Caída del servidor durante la partida | Técnico | Baja | Alto | Producción: persistir estado por turno (Redis/PostgreSQL) y reanudar |
| Ruido en fiestas impide oír | UX | Alta | Medio | Modo "todos los celulares", repeticiones, volumen, altavoz Bluetooth recomendado |

## 5. Pendientes legales antes de vender

- [ ] Búsqueda y registro de marca y dominio.
- [ ] Licencias de audio para la Edición General (o redefinirla con catálogo licenciable).
- [ ] Términos de uso y política de privacidad (incluido el tratamiento de menores).
- [ ] Revisión del texto del Modo Fiesta y del etiquetado de edad de la caja por país.
- [ ] Revisión de la normativa de juguetes/juegos (marcado CE u homólogos) para la caja física.
