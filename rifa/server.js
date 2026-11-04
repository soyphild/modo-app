'use strict';
try { process.loadEnvFile?.(require('node:path').join(__dirname, '.env')); } catch { /* sin .env */ }

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const { db, DATA_DIR, getSettings, saveSettings, nowIso } = require('./src/db');
const R = require('./src/raffles');
const mp = require('./src/mercadopago');
const mailer = require('./src/mailer');
const auth = require('./src/auth');
const U = require('./src/util');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.disable('x-powered-by');

const baseUrl = (req) => (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

let lastBaseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
app.use((req, res, next) => { if (!process.env.BASE_URL && req.get('host')) lastBaseUrl = baseUrl(req); next(); });

// ---------- Seguridad básica ----------
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.mercadopago.com https://*.mercadopago.cl"
  });
  next();
});

function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const k = req.ip;
    const n = (hits.get(k) || 0) + 1;
    hits.set(k, n);
    if (n > max) return res.status(429).json({ error: 'Demasiados intentos. Espera un momento y vuelve a intentar.' });
    next();
  };
}

app.use('/api/webhooks', express.json({ limit: '200kb' }));
app.use('/api/admin', express.json({ limit: '8mb' }));
app.use('/api', express.json({ limit: '50kb' }));

// ---------- Serialización pública ----------
function publicRaffle(raffle) {
  const prizes = R.getPrizes(raffle.id).map((p) => ({ id: p.id, position: p.position, title: p.title, description: p.description, image: p.image, winner_number: p.winner_number }));
  return {
    slug: raffle.slug, title: raffle.title, subtitle: raffle.subtitle, description: raffle.description, cover_image: raffle.cover_image,
    total_numbers: raffle.total_numbers, start_number: raffle.start_number, ticket_price: raffle.ticket_price, currency: raffle.currency,
    max_per_order: raffle.max_per_order, reservation_minutes: raffle.reservation_minutes, draw_date: raffle.draw_date, status: raffle.status,
    terms: raffle.terms, prizes, stats: R.stats(raffle)
  };
}

function publicOrder(order, raffle) {
  return {
    code: order.code, status: order.status, mp_status: order.mp_status, mp_status_detail: order.mp_status_detail,
    first_name: order.first_name, last_name: order.last_name, email: maskEmail(order.email), rut: U.formatRut(order.rut),
    numbers: JSON.parse(order.numbers), quantity: order.quantity, total: order.total, amount_paid: order.amount_paid, currency: order.currency,
    payment_label: U.paymentLabel(order), card_last_four: order.card_last_four, installments: order.installments,
    mp_payment_id: order.mp_payment_id, paid_at: order.paid_at, created_at: order.created_at, expires_at: order.expires_at,
    checkout_url: order.status === 'pending' ? order.checkout_url : null,
    raffle: { slug: raffle.slug, title: raffle.title, total_numbers: raffle.total_numbers, start_number: raffle.start_number, draw_date: raffle.draw_date, cover_image: raffle.cover_image }
  };
}
function maskEmail(email) {
  const [u, d] = email.split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
}

// ---------- API pública ----------
app.get('/api/site', (req, res) => {
  const s = getSettings();
  const raffles = db.prepare("SELECT * FROM raffles WHERE status IN ('active','closed','drawn') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC").all();
  res.json({
    business_name: s.business_name, contact_email: s.contact_email, contact_whatsapp: s.contact_whatsapp, footer_note: s.footer_note, timezone: s.timezone,
    demo_payments: !mp.isEnabled(),
    raffles: raffles.map((r) => ({ slug: r.slug, title: r.title, subtitle: r.subtitle, cover_image: r.cover_image, ticket_price: r.ticket_price, currency: r.currency, draw_date: r.draw_date, status: r.status, stats: R.stats(r) }))
  });
});

app.get('/api/raffles/:slug', (req, res) => {
  const raffle = R.getRaffle(req.params.slug);
  if (!raffle || raffle.status === 'draft') return res.status(404).json({ error: 'Rifa no encontrada.' });
  R.releaseExpired();
  res.json({ raffle: publicRaffle(raffle), tickets: R.ticketState(raffle.id), demo_payments: !mp.isEnabled() });
});

app.get('/api/raffles/:slug/tickets', (req, res) => {
  const raffle = R.getRaffle(req.params.slug);
  if (!raffle) return res.status(404).json({ error: 'Rifa no encontrada.' });
  R.releaseExpired();
  res.json({ tickets: R.ticketState(raffle.id), stats: R.stats(raffle) });
});

// Actualización en vivo (Server-Sent Events)
app.get('/api/raffles/:slug/stream', (req, res) => {
  const raffle = R.getRaffle(req.params.slug);
  if (!raffle) return res.status(404).end();
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const push = () => {
    const fresh = R.getRaffleById(raffle.id);
    if (!fresh) return;
    res.write(`event: tickets\ndata: ${JSON.stringify({ tickets: R.ticketState(raffle.id), stats: R.stats(fresh) })}\n\n`);
  };
  const onChange = (id) => { if (id === raffle.id) push(); };
  R.bus.on('tickets', onChange);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); R.bus.off('tickets', onChange); });
});

app.post('/api/raffles/:slug/orders', rateLimit({ windowMs: 60000, max: 12 }), async (req, res) => {
  const raffle = R.getRaffle(req.params.slug);
  if (!raffle || raffle.status !== 'active') return res.status(400).json({ error: 'Esta rifa no está recibiendo compras.' });
  if (raffle.draw_date && new Date(raffle.draw_date) < new Date()) return res.status(400).json({ error: 'La venta de esta rifa ya cerró.' });

  const b = req.body || {};
  const buyer = {
    first_name: U.cleanText(b.first_name, 60), last_name: U.cleanText(b.last_name, 60),
    rut: U.normalizeRut(b.rut), email: U.cleanText(b.email, 160).toLowerCase(), phone: U.cleanText(b.phone, 30), city: U.cleanText(b.city, 60)
  };
  const errors = {};
  if (buyer.first_name.length < 2) errors.first_name = 'Ingresa tu nombre.';
  if (buyer.last_name.length < 2) errors.last_name = 'Ingresa tu apellido.';
  if (!buyer.rut) errors.rut = 'RUT inválido.';
  if (!U.isEmail(buyer.email)) errors.email = 'Correo inválido.';
  if (buyer.phone && !/^[+\d][\d\s()-]{6,}$/.test(buyer.phone)) errors.phone = 'Teléfono inválido.';
  if (!b.accept_terms) errors.accept_terms = 'Debes aceptar las bases.';
  if (!Array.isArray(b.numbers)) errors.numbers = 'Selecciona tus números.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Revisa los datos marcados.', fields: errors });

  if (R.pendingCount(raffle.id, buyer.email, req.ip) >= 3) {
    return res.status(429).json({ error: 'Tienes reservas pendientes de pago. Complétalas o espera a que venzan.' });
  }

  let order;
  try {
    order = R.createOrder(raffle, buyer, b.numbers, { ip: req.ip, userAgent: U.cleanText(req.get('user-agent'), 250) });
  } catch (err) {
    if (err instanceof R.ReservationError) return res.status(err.status).json({ error: err.message, taken: err.taken || [] });
    throw err;
  }

  const base = baseUrl(req);
  try {
    let checkoutUrl, prefId = null;
    if (mp.isEnabled()) {
      const label = JSON.parse(order.numbers).map((n) => U.padNumber(n, raffle.total_numbers, raffle.start_number)).join(', ');
      const pref = await mp.createPreference({ order, raffle, baseUrl: base, numbersLabel: label, businessName: getSettings().business_name });
      checkoutUrl = pref.url; prefId = pref.id;
    } else {
      checkoutUrl = `${base}/demo-pago/${order.token}`;
    }
    db.prepare('UPDATE orders SET checkout_url = ?, mp_preference_id = ? WHERE id = ?').run(checkoutUrl, prefId, order.id);
    res.status(201).json({ code: order.code, token: order.token, checkout_url: checkoutUrl, expires_at: order.expires_at, total: order.total });
  } catch (err) {
    console.error('[mercadopago] error creando link de pago', err.mp || err);
    R.cancelOrder(order.id);
    res.status(502).json({ error: 'No pudimos generar el link de pago. Intenta nuevamente en unos segundos.' });
  }
});

/** Consulta a Mercado Pago el estado más reciente de una orden y lo aplica. */
async function syncOrderWithMp(order, paymentId) {
  if (!mp.isEnabled()) return order;
  let payments = [];
  if (paymentId) payments = [await mp.getPayment(paymentId)];
  else payments = await mp.searchPaymentsByReference(order.code);
  for (const p of payments) await applyPayment(p);
  return R.getOrderById(order.id);
}

async function applyPayment(payment, req) {
  const order = payment.external_reference ? R.getOrderByCode(payment.external_reference) : null;
  R.logPaymentEvent(order?.id, 'mercadopago', payment.id, payment.status, payment);
  if (!order) return null;
  if (payment.status === 'approved') {
    // Verificamos monto y moneda antes de confirmar los números.
    if (Number(payment.transaction_amount) + 0.001 < Number(order.total) || (payment.currency_id && payment.currency_id !== order.currency)) {
      console.error(`[pago] monto o moneda no coinciden para ${order.code}`);
      db.prepare("UPDATE orders SET mp_payment_id = ?, mp_status = 'amount_mismatch', notes = trim(notes || ' Pago con monto inválido.'), updated_at = ? WHERE id = ?").run(String(payment.id), nowIso(), order.id);
      return order;
    }
    const { order: updated, justPaid } = R.markPaid(order.id, payment);
    if (justPaid) deliverReceipt(updated);
    return updated;
  }
  R.updatePaymentStatus(order, payment);
  return R.getOrderById(order.id);
}


function deliverReceipt(order) {
  const raffle = R.getRaffleById(order.raffle_id);
  mailer.sendReceipt(order, raffle, R.getPrizes(raffle.id), (process.env.BASE_URL || lastBaseUrl).replace(/\/$/, ''))
    .catch((err) => console.error(`[correo] no se pudo enviar el comprobante ${order.code}:`, err.message));
}

app.get('/api/orders/:token', async (req, res) => {
  let order = R.getOrderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });
  if (order.status === 'pending' && mp.isEnabled()) {
    try { order = await syncOrderWithMp(order, req.query.payment_id ? String(req.query.payment_id).replace(/\D/g, '') : null); }
    catch (err) { console.error('[mercadopago] sync', err.message); }
  }
  if (order.status === 'pending') R.releaseExpired();
  order = R.getOrderById(order.id);
  res.json({ order: publicOrder(order, R.getRaffleById(order.raffle_id)) });
});

// Webhook de Mercado Pago
app.post('/api/webhooks/mercadopago', async (req, res) => {
  const type = req.body?.type || req.body?.topic || req.query.type || req.query.topic;
  const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;
  if (!mp.verifySignature(req, dataId)) return res.status(401).send('firma inválida');
  res.sendStatus(200); // respondemos rápido; el procesamiento sigue en segundo plano
  if (!mp.isEnabled() || !dataId) return;
  try {
    if (type === 'payment') await applyPayment(await mp.getPayment(dataId));
  } catch (err) { console.error('[webhook]', err.message); }
});

// ---------- Simulador de pago (solo si no hay credenciales de Mercado Pago) ----------
app.get('/api/demo/orders/:token', (req, res) => {
  if (mp.isEnabled()) return res.status(404).end();
  const order = R.getOrderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });
  res.json({ order: publicOrder(order, R.getRaffleById(order.raffle_id)) });
});
app.post('/api/demo/pay/:token', (req, res) => {
  if (mp.isEnabled()) return res.status(404).end();
  const order = R.getOrderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });
  const approve = req.body?.result !== 'rejected';
  const payment = {
    id: `DEMO${Date.now()}`, status: approve ? 'approved' : 'rejected', status_detail: approve ? 'accredited' : 'cc_rejected_insufficient_amount',
    payment_method_id: 'visa', payment_type_id: 'credit_card', installments: 1, card: { last_four_digits: '4242' }, authorization_code: '000000',
    transaction_amount: order.total, currency_id: order.currency, date_approved: new Date().toISOString(), external_reference: order.code, payer: { email: order.email }
  };
  R.logPaymentEvent(order.id, 'demo', payment.id, payment.status, payment);
  if (approve) { const { order: o, justPaid } = R.markPaid(order.id, payment); if (justPaid) deliverReceipt(o); }
  else R.updatePaymentStatus(order, payment);
  res.json({ redirect: `/pago/${order.token}?status=${payment.status}` });
});

// ---------- Panel de administración ----------
app.get('/api/admin/session', (req, res) => res.json({ authenticated: auth.isValid(req), configured: Boolean(process.env.ADMIN_PASSWORD) }));
app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60000, max: 10 }), (req, res) => {
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'Define la variable ADMIN_PASSWORD en el servidor.' });
  if (!auth.checkPassword(req.body?.password)) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  auth.issue(res, req.secure);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { auth.clear(res); res.json({ ok: true }); });

const admin = express.Router();
admin.use(auth.requireAdmin);

admin.get('/overview', (req, res) => {
  R.releaseExpired();
  const s = getSettings();
  const raffles = db.prepare('SELECT * FROM raffles ORDER BY created_at DESC').all().map((r) => {
    const agg = db.prepare("SELECT COUNT(*) buyers, COALESCE(SUM(amount_paid),0) revenue FROM orders WHERE raffle_id = ? AND status = 'paid'").get(r.id);
    return { ...r, prizes: R.getPrizes(r.id), stats: R.stats(r), buyers: agg.buyers, revenue: agg.revenue };
  });
  res.json({
    settings: s, raffles,
    integrations: { mercadopago: mp.isEnabled(), mp_sandbox: process.env.MP_USE_SANDBOX === 'true', webhook_secret: Boolean(process.env.MP_WEBHOOK_SECRET), smtp: mailer.smtpConfigured(), base_url: process.env.BASE_URL || baseUrl(req) }
  });
});

admin.put('/settings', (req, res) => {
  const b = req.body || {};
  saveSettings({
    business_name: U.cleanText(b.business_name, 80) || 'Gran Rifa', contact_email: U.cleanText(b.contact_email, 160), contact_whatsapp: U.cleanText(b.contact_whatsapp, 30),
    admin_notify_email: U.cleanText(b.admin_notify_email, 160), timezone: U.cleanText(b.timezone, 60) || 'America/Santiago', footer_note: U.cleanText(b.footer_note, 300)
  });
  res.json({ settings: getSettings() });
});

function readRaffleInput(b, existing) {
  const total = parseInt(b.total_numbers, 10);
  const price = Math.round(Number(b.ticket_price));
  const start = parseInt(b.start_number, 10);
  const errors = {};
  const title = U.cleanText(b.title, 120);
  if (title.length < 3) errors.title = 'Escribe un título.';
  if (!Number.isInteger(total) || total < 2 || total > 100000) errors.total_numbers = 'Entre 2 y 100.000 números.';
  if (!Number.isFinite(price) || price < 1) errors.ticket_price = 'Indica el valor del número.';
  if (![0, 1].includes(start)) errors.start_number = 'Debe partir en 0 o 1.';
  const statuses = ['draft', 'active', 'closed', 'drawn'];
  if (existing) {
    const sold = db.prepare('SELECT MIN(number) mn, MAX(number) mx FROM tickets WHERE raffle_id = ?').get(existing.id);
    if (sold.mx !== null && (start > sold.mn || start + total - 1 < sold.mx)) errors.total_numbers = 'Ya hay números vendidos o reservados fuera de ese rango.';
  }
  return {
    errors,
    data: {
      title, subtitle: U.cleanText(b.subtitle, 160), description: U.cleanMultiline(b.description, 4000), terms: U.cleanMultiline(b.terms, 8000),
      cover_image: U.cleanText(b.cover_image, 500), total_numbers: total, start_number: start, ticket_price: price,
      currency: /^[A-Z]{3}$/.test(b.currency) ? b.currency : 'CLP',
      max_per_order: Math.min(Math.max(parseInt(b.max_per_order, 10) || 20, 1), 500),
      reservation_minutes: Math.min(Math.max(parseInt(b.reservation_minutes, 10) || 15, 5), 120),
      draw_date: b.draw_date ? new Date(b.draw_date).toISOString() : null,
      status: statuses.includes(b.status) ? b.status : 'draft'
    }
  };
}

function savePrizes(raffleId, prizes) {
  if (!Array.isArray(prizes)) return;
  const keep = [];
  prizes.slice(0, 30).forEach((p, i) => {
    const title = U.cleanText(p.title, 160);
    if (!title) return;
    const data = { title, description: U.cleanMultiline(p.description, 600), image: U.cleanText(p.image, 500), position: i + 1 };
    if (p.id && db.prepare('SELECT id FROM prizes WHERE id = ? AND raffle_id = ?').get(p.id, raffleId)) {
      db.prepare('UPDATE prizes SET title=@title, description=@description, image=@image, position=@position WHERE id=@id').run({ ...data, id: p.id });
      keep.push(Number(p.id));
    } else {
      keep.push(Number(db.prepare('INSERT INTO prizes(raffle_id, title, description, image, position) VALUES (?, ?, ?, ?, ?)').run(raffleId, data.title, data.description, data.image, data.position).lastInsertRowid));
    }
  });
  const all = db.prepare('SELECT id FROM prizes WHERE raffle_id = ?').all(raffleId).map((r) => r.id);
  for (const id of all) if (!keep.includes(id)) db.prepare('DELETE FROM prizes WHERE id = ?').run(id);
}

admin.post('/raffles', (req, res) => {
  const { errors, data } = readRaffleInput(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Revisa los campos marcados.', fields: errors });
  let slug = U.slugify(req.body.slug || data.title), n = 2;
  const base = slug;
  while (R.getRaffle(slug)) slug = `${base}-${n++}`;
  const id = db.transaction(() => {
    const rid = db.prepare(`INSERT INTO raffles (slug, title, subtitle, description, terms, cover_image, total_numbers, start_number, ticket_price, currency, max_per_order, reservation_minutes, draw_date, status)
      VALUES (@slug, @title, @subtitle, @description, @terms, @cover_image, @total_numbers, @start_number, @ticket_price, @currency, @max_per_order, @reservation_minutes, @draw_date, @status)`).run({ ...data, slug }).lastInsertRowid;
    savePrizes(rid, req.body.prizes);
    return rid;
  })();
  res.status(201).json({ raffle: R.getRaffleById(id) });
});

admin.put('/raffles/:id', (req, res) => {
  const existing = R.getRaffleById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rifa no encontrada.' });
  const { errors, data } = readRaffleInput(req.body || {}, existing);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Revisa los campos marcados.', fields: errors });
  let slug = U.slugify(req.body.slug || existing.slug);
  if (slug !== existing.slug && R.getRaffle(slug)) return res.status(400).json({ error: 'Esa dirección ya está en uso.', fields: { slug: 'Ya existe.' } });
  db.transaction(() => {
    db.prepare(`UPDATE raffles SET slug=@slug, title=@title, subtitle=@subtitle, description=@description, terms=@terms, cover_image=@cover_image, total_numbers=@total_numbers,
      start_number=@start_number, ticket_price=@ticket_price, currency=@currency, max_per_order=@max_per_order, reservation_minutes=@reservation_minutes, draw_date=@draw_date,
      status=@status, updated_at=@now WHERE id=@id`).run({ ...data, slug, id: existing.id, now: nowIso() });
    savePrizes(existing.id, req.body.prizes);
  })();
  R.notifyChange(existing.id);
  res.json({ raffle: R.getRaffleById(existing.id) });
});

admin.delete('/raffles/:id', (req, res) => {
  const r = R.getRaffleById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rifa no encontrada.' });
  const paid = db.prepare("SELECT COUNT(*) c FROM orders WHERE raffle_id = ? AND status = 'paid'").get(r.id).c;
  if (paid && req.query.force !== 'true') return res.status(400).json({ error: `Esta rifa tiene ${paid} compras pagadas. Ciérrala en vez de eliminarla.` });
  db.prepare('DELETE FROM raffles WHERE id = ?').run(r.id);
  res.json({ ok: true });
});

admin.get('/raffles/:id/tickets', (req, res) => {
  const r = R.getRaffleById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rifa no encontrada.' });
  const rows = db.prepare(`SELECT t.number, t.status, o.code, o.first_name, o.last_name FROM tickets t JOIN orders o ON o.id = t.order_id WHERE t.raffle_id = ?`).all(r.id);
  res.json({ tickets: rows });
});

function adminOrder(o, raffle, tz) {
  return {
    ...o, numbers: JSON.parse(o.numbers), rut_formatted: U.formatRut(o.rut), payment_label: U.paymentLabel(o),
    created_local: U.formatDateTime(o.created_at, tz), paid_local: U.formatDateTime(o.paid_at, tz),
    numbers_label: JSON.parse(o.numbers).map((n) => U.padNumber(n, raffle.total_numbers, raffle.start_number)).join(', ')
  };
}

function queryOrders(raffleId, { status, q }) {
  let sql = 'SELECT * FROM orders WHERE raffle_id = ?';
  const args = [raffleId];
  if (status && status !== 'all') { sql += ' AND status = ?'; args.push(status); }
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    sql += " AND (lower(first_name || ' ' || last_name) LIKE ? OR lower(email) LIKE ? OR replace(rut,'-','') LIKE ? OR code LIKE ? OR mp_payment_id LIKE ? OR numbers LIKE ?)";
    const num = q.replace(/\D/g, '');
    args.push(like, like, `%${q.replace(/[^0-9kK]/g, '').toUpperCase()}%`, `%${q.toUpperCase()}%`, `%${q}%`, num ? `%${Number(num)}%` : '%__none__%');
  }
  return db.prepare(sql + ' ORDER BY COALESCE(paid_at, created_at) DESC').all(...args);
}

admin.get('/raffles/:id/orders', (req, res) => {
  const r = R.getRaffleById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rifa no encontrada.' });
  R.releaseExpired();
  const tz = getSettings().timezone;
  const orders = queryOrders(r.id, { status: req.query.status, q: U.cleanText(req.query.q, 80) }).map((o) => adminOrder(o, r, tz));
  const daily = db.prepare(`SELECT substr(paid_at,1,10) day, COUNT(*) orders, SUM(quantity) numbers, SUM(amount_paid) revenue FROM orders WHERE raffle_id = ? AND status='paid' GROUP BY day ORDER BY day`).all(r.id);
  res.json({ orders, daily });
});

admin.get('/raffles/:id/export.csv', (req, res) => {
  const r = R.getRaffleById(req.params.id);
  if (!r) return res.status(404).end();
  const tz = getSettings().timezone;
  const orders = queryOrders(r.id, { status: req.query.status || 'paid', q: U.cleanText(req.query.q, 80) }).map((o) => adminOrder(o, r, tz));
  const header = ['Comprobante', 'Estado', 'Fecha pago', 'Fecha reserva', 'Nombre', 'Apellido', 'RUT', 'Correo', 'Teléfono', 'Ciudad', 'Números', 'Cantidad', 'Valor unitario', 'Total', 'Monto pagado', 'Neto recibido', 'Moneda', 'Medio de pago', 'Tipo', 'Marca', 'Cuotas', 'Últimos 4', 'ID transacción', 'Cód. autorización', 'Correo pagador', 'Origen', 'Notas'];
  const ES = { paid: 'Pagado', pending: 'Pendiente', expired: 'Vencido', cancelled: 'Cancelado', refunded: 'Reembolsado', conflict: 'Revisar' };
  const rows = orders.map((o) => [o.code, ES[o.status] || o.status, o.paid_local, o.created_local, o.first_name, o.last_name, o.rut_formatted, o.email, o.phone, o.city, o.numbers_label, o.quantity, o.unit_price, o.total, o.amount_paid ?? '', o.net_received ?? '', o.currency, o.payment_label, o.payment_type || '', o.payment_method || '', o.installments || '', o.card_last_four || '', o.mp_payment_id || '', o.authorization_code || '', o.payer_email || '', o.source === 'manual' ? 'Venta manual' : 'Web', o.notes]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="compradores-${r.slug}-${new Date().toISOString().slice(0, 10)}.csv"` });
  res.send(U.toCsv([header, ...rows]));
});

admin.post('/raffles/:id/manual-sale', (req, res) => {
  const r = R.getRaffleById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rifa no encontrada.' });
  const b = req.body || {};
  const buyer = { first_name: U.cleanText(b.first_name, 60), last_name: U.cleanText(b.last_name, 60), rut: U.normalizeRut(b.rut), email: U.cleanText(b.email, 160).toLowerCase(), phone: U.cleanText(b.phone, 30), city: U.cleanText(b.city, 60) };
  const fields = {};
  if (buyer.first_name.length < 2) fields.first_name = 'Requerido.';
  if (buyer.last_name.length < 2) fields.last_name = 'Requerido.';
  if (!buyer.rut) fields.rut = 'RUT inválido.';
  if (!U.isEmail(buyer.email)) fields.email = 'Correo inválido.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Revisa los datos.', fields });
  const method = ['manual_transfer', 'manual_cash', 'manual_other'].includes(b.payment_type) ? b.payment_type : 'manual_transfer';
  try {
    const order = R.createOrder(r, buyer, b.numbers || [], { source: 'manual', payment_type: method, notes: U.cleanText(b.notes, 300), ip: req.ip });
    if (b.send_receipt !== false) deliverReceipt(order);
    res.status(201).json({ order: adminOrder(order, r, getSettings().timezone) });
  } catch (err) {
    if (err instanceof R.ReservationError) return res.status(err.status).json({ error: err.message, taken: err.taken || [] });
    throw err;
  }
});

admin.post('/orders/:id/confirm', (req, res) => {
  const o = R.getOrderById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Orden no encontrada.' });
  const method = ['manual_transfer', 'manual_cash', 'manual_other'].includes(req.body?.payment_type) ? req.body.payment_type : 'manual_transfer';
  const { order, justPaid } = R.markPaid(o.id, { id: o.mp_payment_id, status: 'approved', status_detail: 'manual', payment_type_id: method, transaction_amount: o.total });
  if (order.status === 'conflict') return res.status(409).json({ error: 'Algunos números ya fueron vendidos a otra persona. Revisa la orden.' });
  if (justPaid) deliverReceipt(order);
  res.json({ ok: true });
});

admin.post('/orders/:id/sync', async (req, res) => {
  const o = R.getOrderById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Orden no encontrada.' });
  if (!mp.isEnabled()) return res.status(400).json({ error: 'Mercado Pago no está configurado.' });
  const updated = await syncOrderWithMp(o, o.mp_payment_id);
  res.json({ status: updated.status });
});

admin.post('/orders/:id/cancel', (req, res) => {
  const o = R.cancelOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'Orden no encontrada.' });
  res.json({ ok: true });
});

admin.post('/orders/:id/resend', async (req, res) => {
  const o = R.getOrderById(req.params.id);
  if (!o || o.status !== 'paid') return res.status(400).json({ error: 'Solo se reenvían comprobantes de órdenes pagadas.' });
  const r = R.getRaffleById(o.raffle_id);
  await mailer.sendReceipt(o, r, R.getPrizes(r.id), baseUrl(req));
  res.json({ ok: true });
});

admin.post('/prizes/:id/draw', (req, res) => {
  const p = db.prepare('SELECT * FROM prizes WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Premio no encontrado.' });
  if (p.winner_number !== null && req.body?.redo !== true) return res.status(400).json({ error: 'Este premio ya tiene ganador.' });
  const excluded = db.prepare('SELECT winner_number FROM prizes WHERE raffle_id = ? AND winner_number IS NOT NULL AND id != ?').all(p.raffle_id, p.id).map((x) => x.winner_number);
  const pool = db.prepare("SELECT number, order_id FROM tickets WHERE raffle_id = ? AND status = 'sold'").all(p.raffle_id).filter((t) => !excluded.includes(t.number));
  if (!pool.length) return res.status(400).json({ error: 'No hay números vendidos disponibles para sortear.' });
  const win = pool[crypto.randomInt(pool.length)];
  db.prepare('UPDATE prizes SET winner_number = ?, winner_order_id = ?, drawn_at = ? WHERE id = ?').run(win.number, win.order_id, nowIso(), p.id);
  const o = R.getOrderById(win.order_id);
  res.json({ number: win.number, winner: { name: `${o.first_name} ${o.last_name}`, rut: U.formatRut(o.rut), email: o.email, phone: o.phone, code: o.code } });
});

admin.post('/prizes/:id/clear', (req, res) => {
  db.prepare('UPDATE prizes SET winner_number = NULL, winner_order_id = NULL, drawn_at = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

admin.post('/upload', (req, res) => {
  const m = /^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/.exec(req.body?.data || '');
  if (!m) return res.status(400).json({ error: 'Formato de imagen no soportado (usa PNG, JPG, WEBP o GIF).' });
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ error: 'La imagen supera 6 MB.' });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`;
  fs.writeFileSync(path.join(DATA_DIR, 'uploads', name), buf);
  res.json({ url: `/uploads/${name}` });
});

admin.get('/email-preview/:id', (req, res) => {
  const o = R.getOrderById(req.params.id);
  if (!o) return res.status(404).end();
  const r = R.getRaffleById(o.raffle_id);
  res.set('Content-Security-Policy', "default-src 'none'; img-src * data:; style-src 'unsafe-inline'").send(mailer.receiptHtml(o, r, R.getPrizes(r.id), baseUrl(req)));
});

app.use('/api/admin', admin);
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

// ---------- Archivos estáticos y páginas ----------
const pub = path.join(__dirname, 'public');
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: '30d', immutable: true }));
app.use(express.static(pub, { extensions: ['html'], maxAge: PROD ? '1h' : 0 }));
const page = (file) => (req, res) => res.sendFile(path.join(pub, file));
app.get('/r/:slug', page('raffle.html'));
app.get('/pago/:token', page('status.html'));
app.get('/comprobante/:token', page('receipt.html'));
app.get('/demo-pago/:token', (req, res, next) => (mp.isEnabled() ? next() : res.sendFile(path.join(pub, 'demo-checkout.html'))));
app.get('/admin', page('admin/index.html'));
app.use((req, res) => res.status(404).sendFile(path.join(pub, '404.html')));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (res.headersSent) return;
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande.' });
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Ocurrió un error inesperado. Intenta nuevamente.' });
});

setInterval(() => { try { R.releaseExpired(); } catch (e) { console.error(e); } }, 20000).unref();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Rifa lista en http://localhost:${PORT}`);
    console.log(`Panel: http://localhost:${PORT}/admin`);
    if (!mp.isEnabled()) console.log('[aviso] MP_ACCESS_TOKEN no definido: pagos en modo SIMULACIÓN.');
    if (!process.env.ADMIN_PASSWORD) console.log('[aviso] ADMIN_PASSWORD no definido: el panel no permitirá ingresar.');
  });
}

module.exports = app;
