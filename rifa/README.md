# Rifa Premium

Aplicación web para vender números de rifa con pago por **Mercado Pago**, bloqueo automático de números, comprobante por correo y panel de administración con el registro completo de compradores.

## Qué hace

**Para los participantes**
- Página de la rifa con portada, premios, valor del número, cuenta regresiva al sorteo y barra de avance.
- Tablero de números en vivo: los números vendidos o en proceso de pago se bloquean al instante para todos (sin recargar la página).
- Búsqueda de números, filtro "solo disponibles" y botón "Al azar".
- Formulario con nombre, apellido, RUT (validado con dígito verificador), correo (con confirmación) y teléfono.
- Pago con el link de Mercado Pago (Checkout Pro). Al aprobarse el pago, los números quedan vendidos y llega el **comprobante por correo**.
- Página de comprobante imprimible / guardable en PDF.

**Para ti (panel `/admin`)**
- Crear y editar rifas: cantidad de números, numeración desde 0 o 1, valor del número, moneda, máximo por compra, minutos de reserva, fecha del sorteo, portada, premios con foto, bases y condiciones.
- Resumen: recaudado, números vendidos, compradores, disponibles, ventas por día y estado de la configuración.
- **Registro de compradores** con todos los datos: fecha y hora, nombre, apellido, RUT, correo, teléfono, números, cantidad, monto pagado, neto recibido, medio de pago (tipo, marca, cuotas, últimos 4 dígitos), ID de transacción de Mercado Pago, código de autorización y número de comprobante.
- Búsqueda por nombre, RUT, correo, número o ID de transacción. Exportación a Excel (CSV) e impresión.
- Aviso por correo con los datos del comprador en cada venta.
- Tablero de todos los números con el nombre del comprador.
- Venta manual (efectivo o transferencia) y confirmación manual de pagos.
- Reenvío de comprobantes, anulación de compras y consulta del estado en Mercado Pago.
- Sorteo de ganadores al azar entre los números pagados, con animación.

## Cómo funciona el bloqueo de números

1. Cuando la persona presiona "Ir a pagar", sus números se **reservan** (15 minutos por defecto) y se crea el link de pago de Mercado Pago.
2. Nadie más puede tomar esos números mientras están reservados. La base de datos impide que un número se venda dos veces.
3. Mercado Pago avisa a la app (webhook) cuando el pago se aprueba. La app vuelve a consultar el pago a Mercado Pago, verifica el monto y marca los números como **vendidos**.
4. Si el pago no se completa a tiempo, la reserva vence y los números vuelven a estar disponibles.
5. Los medios de pago en efectivo (que se acreditan días después) están desactivados para evitar pagos sobre reservas vencidas.

## Probar en tu computador

Requiere Node.js 20.12 o superior.

```bash
cd rifa
npm install
cp .env.example .env      # edita ADMIN_PASSWORD como mínimo
npm start
```

- Sitio: http://localhost:3000
- Panel: http://localhost:3000/admin

Sin `MP_ACCESS_TOKEN`, la app funciona en **modo simulación**: en vez de Mercado Pago aparece una pantalla para aprobar o rechazar el pago, así puedes probar todo el flujo. Sin SMTP, los correos se guardan como archivos en `data/outbox/`.

## Publicar en internet

La app necesita un servidor Node.js con **disco persistente** (ahí queda la base de datos). No funciona en GitHub Pages porque necesita backend. Opciones simples: Railway, Render o Fly.io.

Ejemplo con Railway:
1. Crea un proyecto nuevo desde este repositorio y define **Root Directory** = `rifa`.
2. Agrega un **Volume** montado en `/data` y la variable `DATA_DIR=/data`.
3. Agrega las variables de `.env.example` (`ADMIN_PASSWORD`, `SESSION_SECRET`, `BASE_URL`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, SMTP...).
4. Publica y abre `https://tu-dominio/admin`.

También incluye un `Dockerfile` para cualquier servicio compatible con Docker.

## Conectar Mercado Pago

1. Entra a [Mercado Pago Developers](https://www.mercadopago.cl/developers/panel/app) y crea una aplicación (producto: **Checkout Pro**).
2. Copia el **Access Token de producción** en `MP_ACCESS_TOKEN`.
3. En la aplicación → **Webhooks**, configura la URL `https://tu-dominio/api/webhooks/mercadopago`, marca el evento **Pagos** y guarda.
4. Copia la **clave secreta** del webhook en `MP_WEBHOOK_SECRET`.
5. Para pruebas usa las credenciales de prueba y `MP_USE_SANDBOX=true`.

`BASE_URL` debe ser tu dirección pública con `https://`; Mercado Pago la usa para avisar los pagos y para devolver al comprador a la página de confirmación.

## Conectar el correo

Cualquier proveedor SMTP sirve (Gmail con contraseña de aplicación, Brevo, Resend, Zoho, el correo de tu dominio...). Completa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM`. En el panel → Ajustes indica el correo donde quieres recibir el aviso de cada venta.

## Estructura

```
rifa/
├── server.js            Servidor y rutas (API pública, webhook, panel)
├── src/
│   ├── db.js            Base de datos SQLite y ajustes
│   ├── raffles.js       Reservas, ventas, vencimientos y avisos en vivo
│   ├── mercadopago.js   Link de pago, consulta de pagos y firma del webhook
│   ├── mailer.js        Comprobante y aviso de venta por correo
│   ├── auth.js          Sesión del panel
│   └── util.js          RUT, formatos y exportación
└── public/              Páginas públicas y panel (/admin)
```

## Respaldo

Toda la información queda en `DATA_DIR` (`rifa.db` y la carpeta `uploads/`). Para respaldar, copia esa carpeta. Además puedes exportar el registro de compradores a Excel desde el panel en cualquier momento.
