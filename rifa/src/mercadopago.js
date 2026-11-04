'use strict';
const crypto = require('node:crypto');

const API = process.env.MP_API_BASE || 'https://api.mercadopago.com';
const token = () => process.env.MP_ACCESS_TOKEN || '';
const isEnabled = () => Boolean(token());

async function mpFetch(path, { method = 'GET', body, idempotencyKey } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Mercado Pago ${res.status}: ${data.message || text.slice(0, 200)}`);
    err.mp = data; err.status = 502;
    throw err;
  }
  return data;
}

/** Crea el link de pago (Checkout Pro) para una orden. */
async function createPreference({ order, raffle, baseUrl, numbersLabel, businessName }) {
  const https = baseUrl.startsWith('https://');
  const returnUrl = `${baseUrl}/pago/${order.token}`;
  const body = {
    items: [{
      id: `${raffle.slug}`,
      title: `${raffle.title} · N° ${numbersLabel}`.slice(0, 250),
      description: `${order.quantity} número(s) de rifa`,
      category_id: 'tickets',
      quantity: 1,
      unit_price: Number(order.total),
      currency_id: order.currency
    }],
    payer: {
      name: order.first_name,
      surname: order.last_name,
      email: order.email,
      identification: { type: 'RUT', number: order.rut.replace('-', '') }
    },
    external_reference: order.code,
    metadata: { order_code: order.code, raffle: raffle.slug },
    back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
    ...(https ? { auto_return: 'approved', notification_url: `${baseUrl}/api/webhooks/mercadopago?source_news=webhooks` } : {}),
    expires: true,
    expiration_date_from: new Date(Date.now() - 60000).toISOString(),
    expiration_date_to: order.expires_at,
    // Excluimos medios de pago diferidos (efectivo) porque la reserva del número es temporal.
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }], installments: 12 },
    statement_descriptor: (businessName || 'RIFA').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 13) || 'RIFA'
  };
  const pref = await mpFetch('/checkout/preferences', { method: 'POST', body, idempotencyKey: `pref-${order.code}` });
  const sandbox = process.env.MP_USE_SANDBOX === 'true';
  return { id: pref.id, url: sandbox ? pref.sandbox_init_point : pref.init_point };
}

const getPayment = (id) => mpFetch(`/v1/payments/${encodeURIComponent(id)}`);

async function searchPaymentsByReference(ref) {
  const data = await mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`);
  return data.results || [];
}

/**
 * Verifica la firma x-signature del webhook (si MP_WEBHOOK_SECRET está configurado).
 * https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
 */
function verifySignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const header = req.get('x-signature') || '';
  const requestId = req.get('x-request-id') || '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=').map((s) => s.trim())));
  if (!parts.ts || !parts.v1) return false;
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { isEnabled, createPreference, getPayment, searchPaymentsByReference, verifySignature };
