'use strict';
const { EventEmitter } = require('node:events');
const { db, nowIso } = require('./db');
const { randomCode, randomToken } = require('./util');

const bus = new EventEmitter();
bus.setMaxListeners(0);

const q = {
  raffleBySlug: db.prepare('SELECT * FROM raffles WHERE slug = ?'),
  raffleById: db.prepare('SELECT * FROM raffles WHERE id = ?'),
  prizes: db.prepare('SELECT * FROM prizes WHERE raffle_id = ? ORDER BY position, id'),
  tickets: db.prepare('SELECT number, status FROM tickets WHERE raffle_id = ?'),
  ticketsForUpdate: db.prepare('SELECT number FROM tickets WHERE raffle_id = ? AND number = ?'),
  insertTicket: db.prepare('INSERT INTO tickets(raffle_id, number, status, order_id) VALUES (?, ?, ?, ?)'),
  orderByToken: db.prepare('SELECT * FROM orders WHERE token = ?'),
  orderByCode: db.prepare('SELECT * FROM orders WHERE code = ?'),
  orderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
  expiredOrders: db.prepare("SELECT id, raffle_id FROM orders WHERE status = 'pending' AND expires_at < ?"),
  releaseOrderTickets: db.prepare("DELETE FROM tickets WHERE order_id = ? AND status = 'reserved'"),
  setOrderStatus: db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
  pendingByEmail: db.prepare("SELECT COUNT(*) c FROM orders WHERE raffle_id = ? AND status = 'pending' AND (lower(email) = lower(?) OR ip = ?)")
};

function getRaffle(slug) { return q.raffleBySlug.get(slug); }
function getRaffleById(id) { return q.raffleById.get(id); }
function getPrizes(raffleId) { return q.prizes.all(raffleId); }
function getOrderByToken(t) { return q.orderByToken.get(t); }
function getOrderByCode(c) { return q.orderByCode.get(c); }
function getOrderById(id) { return q.orderById.get(id); }

function ticketState(raffleId) {
  const sold = [], reserved = [];
  for (const t of q.tickets.all(raffleId)) (t.status === 'sold' ? sold : reserved).push(t.number);
  return { sold, reserved };
}

// Agrupa avisos de cambios para no saturar a los clientes conectados.
const pendingEmits = new Map();
function notifyChange(raffleId) {
  if (pendingEmits.has(raffleId)) return;
  pendingEmits.set(raffleId, setTimeout(() => {
    pendingEmits.delete(raffleId);
    bus.emit('tickets', raffleId);
  }, 150));
}

function stats(raffle) {
  const s = db.prepare(`SELECT
      SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) sold,
      SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) reserved
    FROM tickets WHERE raffle_id = ?`).get(raffle.id);
  const sold = s.sold || 0, reserved = s.reserved || 0;
  return { sold, reserved, available: raffle.total_numbers - sold - reserved, total: raffle.total_numbers, percent: raffle.total_numbers ? Math.round((sold / raffle.total_numbers) * 1000) / 10 : 0 };
}

class ReservationError extends Error {
  constructor(message, extra = {}) { super(message); Object.assign(this, extra); this.status = 409; }
}

/**
 * Reserva números de forma atómica. Si cualquiera ya está tomado, no se reserva ninguno.
 */
function createOrder(raffle, buyer, numbers, meta = {}) {
  const unique = [...new Set(numbers.map(Number))].sort((a, b) => a - b);
  const min = raffle.start_number, max = raffle.start_number + raffle.total_numbers - 1;
  if (!unique.length) throw new ReservationError('Selecciona al menos un número.', { status: 400 });
  if (unique.some((n) => !Number.isInteger(n) || n < min || n > max)) throw new ReservationError('Hay números fuera de rango.', { status: 400 });
  if (meta.source !== 'manual' && unique.length > raffle.max_per_order) throw new ReservationError(`Puedes elegir hasta ${raffle.max_per_order} números por compra.`, { status: 400 });

  const status = meta.source === 'manual' ? 'paid' : 'pending';
  const ticketStatus = status === 'paid' ? 'sold' : 'reserved';
  const now = new Date();
  const expires = new Date(now.getTime() + raffle.reservation_minutes * 60000).toISOString();

  const tx = db.transaction(() => {
    releaseExpired();
    const taken = unique.filter((n) => q.ticketsForUpdate.get(raffle.id, n));
    if (taken.length) throw new ReservationError('Algunos números acaban de ser tomados por otra persona.', { taken });

    let code;
    do { code = `R-${randomCode(7)}`; } while (q.orderByCode.get(code));
    const info = db.prepare(`INSERT INTO orders
      (code, token, raffle_id, status, first_name, last_name, rut, email, phone, city, numbers, quantity, unit_price, total, currency,
       expires_at, source, ip, user_agent, notes, payment_type, payment_method, paid_at, amount_paid, created_at, updated_at)
      VALUES (@code, @token, @raffle_id, @status, @first_name, @last_name, @rut, @email, @phone, @city, @numbers, @quantity, @unit_price, @total, @currency,
       @expires_at, @source, @ip, @user_agent, @notes, @payment_type, @payment_method, @paid_at, @amount_paid, @now, @now)`).run({
      code, token: randomToken(), raffle_id: raffle.id, status,
      first_name: buyer.first_name, last_name: buyer.last_name, rut: buyer.rut, email: buyer.email, phone: buyer.phone || '', city: buyer.city || '',
      numbers: JSON.stringify(unique), quantity: unique.length, unit_price: raffle.ticket_price,
      total: meta.total ?? unique.length * raffle.ticket_price, currency: raffle.currency,
      expires_at: status === 'pending' ? expires : null, source: meta.source || 'web', ip: meta.ip || null, user_agent: meta.userAgent || null,
      notes: meta.notes || '', payment_type: meta.payment_type || null, payment_method: meta.payment_method || null,
      paid_at: status === 'paid' ? now.toISOString() : null, amount_paid: status === 'paid' ? (meta.total ?? unique.length * raffle.ticket_price) : null,
      now: now.toISOString()
    });
    for (const n of unique) q.insertTicket.run(raffle.id, n, ticketStatus, info.lastInsertRowid);
    return q.orderById.get(info.lastInsertRowid);
  });

  const order = tx();
  notifyChange(raffle.id);
  return order;
}

function pendingCount(raffleId, email, ip) { return q.pendingByEmail.get(raffleId, email, ip).c; }

/** Libera reservas vencidas. Devuelve la cantidad de órdenes liberadas. */
function releaseExpired() {
  const now = nowIso();
  const rows = q.expiredOrders.all(now);
  if (!rows.length) return 0;
  db.transaction(() => {
    for (const r of rows) { q.releaseOrderTickets.run(r.id); q.setOrderStatus.run('expired', now, r.id); }
  })();
  for (const id of new Set(rows.map((r) => r.raffle_id))) notifyChange(id);
  return rows.length;
}

/**
 * Marca una orden como pagada (idempotente). Si la reserva había vencido y algún número
 * fue tomado por otra persona, la orden queda en "conflict" para que el organizador la revise.
 * Devuelve { order, justPaid }.
 */
function markPaid(orderId, payment) {
  const result = db.transaction(() => {
    const order = q.orderById.get(orderId);
    if (!order) return { order: null, justPaid: false };
    if (order.status === 'paid') {
      return { order, justPaid: false };
    }
    const numbers = JSON.parse(order.numbers);
    const now = nowIso();
    let status = 'paid';

    if (order.status !== 'pending') {
      // La reserva venció o fue cancelada: intentamos recuperar los números.
      const conflict = numbers.some((n) => {
        const t = db.prepare('SELECT order_id FROM tickets WHERE raffle_id = ? AND number = ?').get(order.raffle_id, n);
        return t && t.order_id !== order.id;
      });
      if (conflict) status = 'conflict';
      else for (const n of numbers) db.prepare('INSERT OR IGNORE INTO tickets(raffle_id, number, status, order_id) VALUES (?, ?, ?, ?)').run(order.raffle_id, n, 'sold', order.id);
    }
    if (status === 'paid') db.prepare("UPDATE tickets SET status = 'sold', updated_at = ? WHERE order_id = ?").run(now, order.id);

    db.prepare(`UPDATE orders SET status = @status, mp_payment_id = @mp_payment_id, mp_status = @mp_status, mp_status_detail = @mp_status_detail,
      payment_method = @payment_method, payment_type = @payment_type, installments = @installments, card_last_four = @card_last_four,
      authorization_code = @authorization_code, payer_email = @payer_email, amount_paid = @amount_paid, net_received = @net_received,
      paid_at = @paid_at, expires_at = NULL, updated_at = @now WHERE id = @id`).run({
      id: order.id, status, now,
      mp_payment_id: payment.id ? String(payment.id) : null, mp_status: payment.status || 'approved', mp_status_detail: payment.status_detail || null,
      payment_method: payment.payment_method_id || null, payment_type: payment.payment_type_id || null, installments: payment.installments || null,
      card_last_four: payment.card?.last_four_digits || null, authorization_code: payment.authorization_code || null,
      payer_email: payment.payer?.email || null, amount_paid: payment.transaction_amount ?? order.total,
      net_received: payment.transaction_details?.net_received_amount ?? null, paid_at: payment.date_approved || now
    });
    return { order: q.orderById.get(order.id), justPaid: status === 'paid' };
  })();
  if (result.order) notifyChange(result.order.raffle_id);
  return result;
}

/** Registra el estado de un pago no aprobado (pendiente, rechazado, reembolsado...). */
function updatePaymentStatus(order, payment) {
  const now = nowIso();
  const status = payment.status;
  db.prepare('UPDATE orders SET mp_payment_id = ?, mp_status = ?, mp_status_detail = ?, payment_method = ?, payment_type = ?, updated_at = ? WHERE id = ?')
    .run(String(payment.id), status, payment.status_detail || null, payment.payment_method_id || null, payment.payment_type_id || null, now, order.id);

  if ((status === 'pending' || status === 'in_process' || status === 'authorized') && order.status === 'pending') {
    // Pago en revisión: extendemos la reserva para no perder los números mientras se acredita.
    const ext = new Date(Date.now() + 60 * 60000).toISOString();
    if (!order.expires_at || order.expires_at < ext) db.prepare('UPDATE orders SET expires_at = ? WHERE id = ?').run(ext, order.id);
  }
  if ((status === 'refunded' || status === 'charged_back') && (order.status === 'paid' || order.status === 'conflict')) {
    db.transaction(() => {
      db.prepare('DELETE FROM tickets WHERE order_id = ?').run(order.id);
      q.setOrderStatus.run('refunded', now, order.id);
    })();
    notifyChange(order.raffle_id);
  }
}

function cancelOrder(orderId) {
  const order = q.orderById.get(orderId);
  if (!order) return null;
  db.transaction(() => {
    db.prepare('DELETE FROM tickets WHERE order_id = ?').run(order.id);
    q.setOrderStatus.run('cancelled', nowIso(), order.id);
  })();
  notifyChange(order.raffle_id);
  return q.orderById.get(order.id);
}

function logPaymentEvent(orderId, provider, paymentId, status, payload) {
  db.prepare('INSERT INTO payment_events(order_id, provider, payment_id, status, payload) VALUES (?, ?, ?, ?, ?)')
    .run(orderId || null, provider, paymentId ? String(paymentId) : null, status || null, JSON.stringify(payload ?? null).slice(0, 20000));
}

module.exports = {
  bus, getRaffle, getRaffleById, getPrizes, getOrderByToken, getOrderByCode, getOrderById, ticketState, stats,
  createOrder, pendingCount, releaseExpired, markPaid, updatePaymentStatus, cancelOrder, notifyChange, logPaymentEvent, ReservationError
};
