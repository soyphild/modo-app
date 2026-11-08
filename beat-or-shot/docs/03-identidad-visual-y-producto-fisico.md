# BEAT OR SHOT · Fase 2 — Identidad visual y producto físico

## 1. Dirección de arte

"Cabina de DJ en un festival nocturno": fondo casi negro con haces de luz violeta y cian, retícula
sutil tipo escenario, superficies de vidrio translúcido y acentos neón. Juvenil sin ser infantil.

### Paleta

| Token | Hex | Uso |
|---|---|---|
| Negro profundo `ink` | `#0B0B14` | Fondo |
| Violeta eléctrico `violet` | `#8B5CF6` | Marca, POWER UP, acciones primarias |
| Azul cian `cyan` | `#00D9FF` | TRACK, audio, información |
| Verde victoria `win` | `#19C86A` | Tarjeta verde, aciertos |
| Rojo derrota `lose` | `#FF4057` | Tarjeta roja, PENALTY, errores, tensión |
| Amarillo empate `tie` | `#FFC247` | Tarjeta amarilla, CHALLENGE, pistas |
| Rosa fiesta | `#F472B6` | WILD, Modo Fiesta |
| Blanco | `#FFFFFF` | Texto |

### Tipografía (libres, autoalojadas)

- **Unbounded** 700/900 — titulares, números, logotipo. Geométrica y ancha, con carácter de cartel de festival.
- **Inter** 400/600/800 — texto e interfaz. Máxima legibilidad en pantallas pequeñas.

### Logotipo

`BEAT` en degradado violeta→cian · `OR` pequeño y espaciado · `SHOT` en blanco. Icono: disco con
retícula de mira (favicon `client/public/favicon.svg`), que une "beat" (vinilo) y "shot" (diana).

## 2. Sistema de cartas (63 × 88 mm, esquinas de 3 mm)

Cada tipo tiene color, glifo y marco propio; todas comparten la misma retícula:

```
┌──────────────────────────────┐  marco degradado del color del tipo (WILD: arcoíris cónico)
│ [TIPO]              ★ rareza │  etiqueta del tipo · rareza o +18
│                              │
│         ◎  glifo  ◎          │  anillos concéntricos (firma visual compartida con el reverso)
│                              │
│        NOMBRE DE CARTA       │  Unbounded 900, color del tipo
│        frase corta           │  Inter 600
│   descripción de la regla    │  Inter 400, 2–3 líneas
│ ┌──────┐          XXXX-XXXX  │  QR (17 mm, contraste negro/blanco, nivel M)
│ │  QR  │       GEN1 · 042/120│  código legible a mano + edición + serie
│ └──────┘                     │
└──────────────────────────────┘
```

| Tipo | Color | Glifo |
|---|---|---|
| TRACK | Cian | Disco |
| POWER UP | Violeta | Rayo |
| CHALLENGE | Amarillo | Espadas cruzadas |
| PENALTY | Rojo | Sirena (+18) |
| WILD | Arcoíris | Destellos (legendaria) |

**Reverso** común a toda la edición: logotipo apilado sobre anillos cian y trama diagonal violeta,
con código de edición abajo. Es reconocible al instante y no revela el tipo de carta.

**Archivos para imprenta**: `/print` genera las 120 cartas a tamaño real (A4, 9 por hoja, reversos
en espejo para doble cara) y permite guardar PDF. Para imprenta profesional:

- Añadir 3 mm de sangrado (exportar 69 × 94 mm por carta) y marcas de corte.
- Cartulina *blue core* o *black core* de 300–330 g/m², laminado mate o *linen*.
- QR en negro 100 % K sobre blanco, zona de silencio ≥ 1 módulo; probar escaneo con 3 móviles y luz tenue.
- Fijar `CARD_SECRET` y `PUBLIC_URL` definitivos **antes** de exportar (los QR los incorporan).

## 3. Caja

**Formato**: caja rígida de tapa y fondo, 160 × 110 × 50 mm, cartón gris 2 mm forrado, acabado mate
*soft-touch* con barniz UV selectivo en el logotipo y los anillos.

- **Tapa**: fondo negro profundo, abanico de 4 cartas (TRACK, POWER UP, CHALLENGE, reverso) como en
  la pantalla de bienvenida, logotipo grande, lema "Saca una carta. Escucha el drop. Adivina antes que nadie."
- **Laterales**: logotipo + "2–12 jugadores · 10+ · 30–60 min" + franja del color de la edición
  (violeta para General, color propio por expansión).
- **Fondo**: cómo se juega en 4 pasos, QR grande "Escanéame para empezar" (abre la app), código de
  edición y aviso de que se requiere un celular por jugador y conexión a internet.
- **Interior**: inserto de cartón con 2 pozos: mazo principal (120 cartas) y hueco para hasta 2
  expansiones de 40 cartas. Separadores con pestaña por tipo de carta. Folleto de reglas A6.
- **Expansiones**: cajas tuck de 40 cartas con la franja de color de su edición, compatibles con el inserto.

## 4. Interfaz móvil

- Diseño de una columna para 360–430 px, botones de 56 px de alto, zonas táctiles ≥ 44 px.
- Barra inferior fija (HUD) con puntos, racha, efectos activos y los 3 comodines.
- Cabecera con código de sala, vuelta/turno, estado de conexión, clasificación, historial y menú.
- Hojas inferiores para clasificación, historial, configuración y escáner.

## 5. Animación

| Momento | Animación | Sonido / háptica |
|---|---|---|
| Sacar carta | Mazo apilado + volteo 3D con muelle | Barrido + chasquido, vibración corta |
| Canción | Ecualizador de barras + anillo de tiempo | Fragmento musical |
| Últimos 5 s | Anillo rojo pulsante | Tic (agudo en 3‑2‑1) + vibración |
| Comodín | Destello cian | Arpegio |
| Votación | Candado oscilante | — |
| Revelación | Cartas que tiemblan, 3‑2‑1 gigante, volteo simultáneo, brillo | Cuenta, volteo, fanfarria / descenso |
| Acierto / verde | Confeti | Arpegio ascendente |
| Último Drop | Titular con muelle, finalistas que suben | Fanfarria |
| Podio | Columnas que crecen en orden 3‑2‑1 | Fanfarria larga |

Todos los sonidos son sintetizados en el navegador (sin archivos de terceros).

## 6. Accesibilidad

- "Reducir movimiento" en ajustes y respeto de `prefers-reduced-motion` (sin giros 3D ni confeti).
- Sonido y vibración desactivables; volumen ajustable.
- Contraste alto en texto principal; el color nunca es el único indicador (VERDE/ROJA/AMARILLA en texto).
- Botones con `aria-label`, interruptores con `role="switch"`, temporizador con `role="timer"`.
- Entrada manual de códigos como alternativa a la cámara.
- Pendiente: lector de pantalla en la revelación (anuncio en región `aria-live`) y modo daltónico con
  patrones en las tarjetas.
