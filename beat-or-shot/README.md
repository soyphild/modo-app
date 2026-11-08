# 🎛️ BEAT OR SHOT

Juego de mesa musical físico-digital: cartas con QR + web app multijugador en tiempo real.
Saca una carta, escucha el fragmento, adivina antes que nadie, gana duelos votados en secreto y
revela tarjetas verdes, rojas o amarillas a la vez en todos los celulares.

**Estado**: prototipo jugable de extremo a extremo (Fases 1–4) con 32 tests automáticos.

## Jugar en local

```bash
cd beat-or-shot
npm install
npm run dev          # servidor :3000 + cliente :5173
```

Abre `http://localhost:5173` en el navegador (o en tu celular con la IP de tu computador en la misma red).
Crea una sala y únete desde otras pestañas/celulares con el código. Pulsa **"Sacar carta (modo prueba)"**
para jugar sin cartas físicas.

Producción:

```bash
npm run build && PUBLIC_URL=https://tu-dominio CARD_SECRET=… ADMIN_KEY=… npm start
# o: docker build -t beat-or-shot . && docker run -p 3000:3000 -e PUBLIC_URL=… beat-or-shot
```

La cámara (escáner QR) y el audio en iPhone requieren **HTTPS**.

| Ruta | Para qué |
|---|---|
| `/` | El juego |
| `/?sala=CODIGO` | Enlace de invitación |
| `/c/XXXX-XXXX` | URL impresa en el QR de cada carta |
| `/print` | 120 cartas listas para imprimir (A4, 63×88 mm, reversos para doble cara) |
| `/admin` | Catálogo, licencias de audio y enlaces de referencia (clave `ADMIN_KEY`) |

## Qué incluye

- Salas privadas con código, QR y enlace; jugadores desde cualquier red; reconexión automática; traspaso de anfitrión.
- Pregunta obligatoria de menores y **Modo Familiar aplicado en el servidor** (sin penalizaciones ni bebidas).
- 5 dificultades, 6 tiempos, 1–6 vueltas, expansiones combinables, 3 modos de altavoz.
- 120 cartas: 70 TRACK, 20 POWER UP, 15 CHALLENGE, 10 PENALTY (+18), 5 WILD — todas con lógica real.
- Comodines (DJ en el celular del compañero, +20 s, pistas), rachas, remontadas, títulos finales.
- Votación secreta y revelación simultánea sincronizada con el reloj del servidor.
- Último Drop con tabla oculta, podio animado, historial.
- Audio legalmente limpio para pruebas: obras de dominio público interpretadas por un sintetizador propio.
  La Edición General (éxitos comerciales) está cargada como metadatos **sin audio** hasta tener licencias.

## Documentación

1. [Producto y reglas](docs/01-producto-y-reglas.md)
2. [Arquitectura y mapa de pantallas](docs/02-arquitectura-y-pantallas.md)
3. [Identidad visual, cartas y caja](docs/03-identidad-visual-y-producto-fisico.md)
4. [Licencias musicales y riesgos](docs/04-licencias-y-riesgos.md)
5. [Pruebas y hoja de ruta](docs/05-pruebas-y-hoja-de-ruta.md)

Esquema PostgreSQL de producción: [`server/db/schema.sql`](server/db/schema.sql).

## Ajustar el balance

Puntos, tiempos y recompensas: `shared/config.ts` (`SCORING`, `DIFFICULTY`).
Distribución de cartas: `shared/cards.ts` (`DISTRIBUTION`). Canciones: `shared/catalog.ts` o `/admin`.

```bash
npm test          # motor, anti-trampas, red y 6 partidas simuladas
npm run typecheck
```
