'use strict';
const crypto = require('node:crypto');

/** Limpia un RUT chileno y devuelve "12345678-K" o null si es inválido. */
function normalizeRut(input) {
  if (!input) return null;
  const clean = String(input).replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2 || clean.length > 9) return null;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return null;
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return expected === dv ? `${body}-${dv}` : null;
}

function formatRut(rut) {
  if (!rut) return '';
  const [body, dv] = rut.split('-');
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (v) => typeof v === 'string' && v.length <= 160 && EMAIL_RE.test(v);

function cleanText(v, max = 120) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(v, max = 4000) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
}

function slugify(v) {
  return String(v || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'rifa';
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len = 8) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

function formatMoney(amount, currency = 'CLP') {
  const decimals = ['CLP', 'COP', 'PYG'].includes(currency) ? 0 : 2;
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(decimals)}`;
  }
}

function formatDateTime(iso, tz = 'America/Santiago') {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('es-CL', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso));
  } catch { return iso; }
}

function padNumber(n, total, start) {
  const max = start + total - 1;
  return String(n).padStart(String(max).length, '0');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toCsv(rows, sep = ';') {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(sep)).join('\r\n');
}

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Tarjeta de crédito', debit_card: 'Tarjeta de débito', prepaid_card: 'Tarjeta prepago',
  account_money: 'Dinero en cuenta Mercado Pago', bank_transfer: 'Transferencia bancaria', ticket: 'Pago en efectivo',
  atm: 'Cajero', digital_currency: 'Moneda digital', digital_wallet: 'Billetera digital',
  manual_transfer: 'Transferencia (manual)', manual_cash: 'Efectivo (manual)', manual_other: 'Otro (manual)', demo: 'Simulación'
};
const BRAND_LABELS = { visa: 'Visa', master: 'Mastercard', amex: 'American Express', diners: 'Diners', magna: 'Magna', debvisa: 'Visa Débito', debmaster: 'Mastercard Débito', redcompra: 'Redcompra', account_money: 'Mercado Pago', webpay: 'Webpay', khipu: 'Khipu', servipag: 'Servipag' };

function paymentLabel(order) {
  const type = PAYMENT_METHOD_LABELS[order.payment_type] || order.payment_type || '';
  const brand = BRAND_LABELS[order.payment_method] || order.payment_method || '';
  if (type && brand && brand.toLowerCase() !== type.toLowerCase() && !order.payment_type?.startsWith('manual')) return `${type} · ${brand}`;
  return type || brand || '—';
}

module.exports = { normalizeRut, formatRut, isEmail, cleanText, cleanMultiline, slugify, randomCode, randomToken, formatMoney, formatDateTime, padNumber, escapeHtml, toCsv, paymentLabel };
