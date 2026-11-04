'use strict';
const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');
const { DATA_DIR, getSettings, db, nowIso } = require('./db');
const { escapeHtml: e, formatMoney, formatDateTime, formatRut, padNumber, paymentLabel } = require('./util');

let transport = null;
const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

function getTransport() {
  if (transport) return transport;
  if (smtpConfigured()) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      disableFileAccess: true, disableUrlAccess: true
    });
  } else {
    // Sin SMTP: los correos se guardan en data/outbox para revisarlos.
    transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  }
  return transport;
}

async function send({ to, subject, html, text, replyTo }) {
  const settings = getSettings();
  const from = process.env.MAIL_FROM || `"${settings.business_name}" <${process.env.SMTP_USER || 'no-reply@localhost'}>`;
  const info = await getTransport().sendMail({ from, to, subject, html, text, replyTo: replyTo || settings.contact_email || undefined });
  if (!smtpConfigured()) {
    const dir = path.join(DATA_DIR, 'outbox');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${String(to).replace(/[^a-z0-9@._-]/gi, '_')}.html`);
    fs.writeFileSync(file, html);
    console.log(`[correo] SMTP no configurado. Guardado en ${file}`);
  }
  return info;
}

function shell(inner, settings) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#efe9df;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17140f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9df;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:0 8px 18px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8a7a5c;font-weight:600;">${e(settings.business_name)}</td></tr>
${inner}
<tr><td style="padding:22px 8px 0;font-size:12px;line-height:1.6;color:#8a7f70;">${e(settings.footer_note || '')}${settings.contact_email ? `<br>Consultas: <a href="mailto:${e(settings.contact_email)}" style="color:#8a6a2c;">${e(settings.contact_email)}</a>` : ''}${settings.contact_whatsapp ? ` · WhatsApp ${e(settings.contact_whatsapp)}` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

function numberChips(order, raffle) {
  return JSON.parse(order.numbers).map((n) =>
    `<span style="display:inline-block;margin:0 6px 8px 0;padding:10px 14px;border-radius:12px;background:#17140f;color:#f3d892;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:.06em;">${padNumber(n, raffle.total_numbers, raffle.start_number)}</span>`
  ).join('');
}

function receiptHtml(order, raffle, prizes, baseUrl) {
  const settings = getSettings();
  const tz = settings.timezone;
  const row = (k, v) => `<tr><td style="padding:9px 0;color:#7d7262;font-size:13px;border-bottom:1px solid #eee6d8;">${k}</td><td align="right" style="padding:9px 0;font-size:13px;font-weight:600;border-bottom:1px solid #eee6d8;">${v}</td></tr>`;
  const prizeList = prizes.map((p, i) => `<tr><td style="padding:6px 0;font-size:13px;color:#4c4436;"><span style="color:#b08a3e;font-weight:700;">${i + 1}°</span>&nbsp; ${e(p.title)}</td></tr>`).join('');
  const inner = `
<tr><td style="background:#17140f;border-radius:24px 24px 0 0;padding:34px 32px 28px;">
  <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#c9a95f;font-weight:600;">Comprobante de compra</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:#fbf6ea;margin-top:10px;">¡Tus números están confirmados!</div>
  <div style="font-size:14px;color:#b9ae99;margin-top:10px;line-height:1.55;">Hola ${e(order.first_name)}, recibimos tu pago. Estos números ya son tuyos para <strong style="color:#fbf6ea;">${e(raffle.title)}</strong>.</div>
</td></tr>
<tr><td style="background:#fffdf8;padding:28px 32px 8px;border-left:1px solid #e8dfcf;border-right:1px solid #e8dfcf;">
  <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9a8b6e;font-weight:600;margin-bottom:12px;">Tus números</div>
  ${numberChips(order, raffle)}
</td></tr>
<tr><td style="background:#fffdf8;padding:0 32px;border-left:1px solid #e8dfcf;border-right:1px solid #e8dfcf;"><div style="border-top:2px dashed #e3d7c0;height:1px;"></div></td></tr>
<tr><td style="background:#fffdf8;padding:18px 32px 26px;border-left:1px solid #e8dfcf;border-right:1px solid #e8dfcf;border-bottom:1px solid #e8dfcf;border-radius:0 0 24px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row('N° de comprobante', e(order.code))}
    ${row('Nombre', `${e(order.first_name)} ${e(order.last_name)}`)}
    ${row('RUT', e(formatRut(order.rut)))}
    ${row('Correo', e(order.email))}
    ${row('Cantidad', `${order.quantity} número${order.quantity > 1 ? 's' : ''}`)}
    ${row('Monto pagado', e(formatMoney(order.amount_paid ?? order.total, order.currency)))}
    ${row('Medio de pago', e(paymentLabel(order)) + (order.card_last_four ? ` •••• ${e(order.card_last_four)}` : ''))}
    ${order.mp_payment_id ? row('ID de transacción', e(order.mp_payment_id)) : ''}
    ${row('Fecha y hora', e(formatDateTime(order.paid_at, tz)))}
    ${raffle.draw_date ? row('Fecha del sorteo', e(formatDateTime(raffle.draw_date, tz).slice(0, 17))) : ''}
  </table>
  ${prizeList ? `<div style="margin-top:22px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9a8b6e;font-weight:600;">Premios</div><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;">${prizeList}</table>` : ''}
  <div style="margin-top:26px;"><a href="${e(baseUrl)}/comprobante/${e(order.token)}" style="display:inline-block;background:#c9a95f;color:#17140f;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:12px;">Ver comprobante en línea</a></div>
</td></tr>`;
  return shell(inner, settings);
}

function adminHtml(order, raffle, baseUrl) {
  const settings = getSettings();
  const r = (k, v) => `<tr><td style="padding:8px 12px;color:#7d7262;font-size:13px;border-bottom:1px solid #eee6d8;width:42%;">${k}</td><td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #eee6d8;">${v}</td></tr>`;
  const nums = JSON.parse(order.numbers).map((n) => padNumber(n, raffle.total_numbers, raffle.start_number)).join(', ');
  const inner = `<tr><td style="background:#fffdf8;border:1px solid #e8dfcf;border-radius:24px;padding:28px;">
  <div style="font-family:Georgia,serif;font-size:24px;">Nueva venta · ${e(formatMoney(order.amount_paid ?? order.total, order.currency))}</div>
  <div style="font-size:13px;color:#7d7262;margin:6px 0 18px;">${e(raffle.title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee6d8;">
  ${r('Comprobante', e(order.code))}${r('Nombre', e(order.first_name))}${r('Apellido', e(order.last_name))}${r('RUT', e(formatRut(order.rut)))}
  ${r('Correo', e(order.email))}${r('Teléfono', e(order.phone || '—'))}${r('Números', e(nums))}${r('Cantidad', order.quantity)}
  ${r('Monto', e(formatMoney(order.amount_paid ?? order.total, order.currency)))}${r('Medio de pago', e(paymentLabel(order)))}
  ${r('Cuotas', order.installments || '—')}${r('ID transacción', e(order.mp_payment_id || '—'))}${r('Fecha y hora', e(formatDateTime(order.paid_at, settings.timezone)))}
  </table>
  <div style="margin-top:20px;"><a href="${e(baseUrl)}/admin/#orders" style="color:#8a6a2c;font-weight:600;">Abrir panel</a></div>
  </td></tr>`;
  return shell(inner, settings);
}

async function sendReceipt(order, raffle, prizes, baseUrl) {
  const settings = getSettings();
  const nums = JSON.parse(order.numbers).map((n) => padNumber(n, raffle.total_numbers, raffle.start_number)).join(', ');
  await send({
    to: order.email,
    subject: `Comprobante ${order.code} · Tus números ${nums} · ${raffle.title}`,
    html: receiptHtml(order, raffle, prizes, baseUrl),
    text: `Hola ${order.first_name}, tu compra para ${raffle.title} está confirmada.\nNúmeros: ${nums}\nComprobante: ${order.code}\nMonto: ${formatMoney(order.amount_paid ?? order.total, order.currency)}\nVer en línea: ${baseUrl}/comprobante/${order.token}`
  });
  db.prepare('UPDATE orders SET receipt_sent_at = ? WHERE id = ?').run(nowIso(), order.id);
  const adminTo = settings.admin_notify_email || process.env.ADMIN_EMAIL;
  if (adminTo) {
    await send({ to: adminTo, subject: `Nueva venta ${order.code} · ${order.first_name} ${order.last_name} · N° ${nums}`, html: adminHtml(order, raffle, baseUrl), text: `Nueva venta ${order.code}: ${order.first_name} ${order.last_name} (${order.email}) N° ${nums}` });
  }
}

module.exports = { sendReceipt, smtpConfigured, receiptHtml };
