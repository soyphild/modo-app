'use strict';
const crypto = require('node:crypto');

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('[aviso] SESSION_SECRET no definido: las sesiones se cerrarán al reiniciar el servidor.');
const COOKIE = 'rifa_admin';
const TTL = 12 * 3600 * 1000;

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');

function issue(res, secure) {
  const payload = `${Date.now() + TTL}.${crypto.randomBytes(8).toString('hex')}`;
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: 'strict', secure, maxAge: TTL, path: '/' });
}

function isValid(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return false;
  const i = raw.lastIndexOf('.');
  const payload = raw.slice(0, i), sig = raw.slice(i + 1);
  const exp = sign(payload);
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return false;
  return Number(payload.split('.')[0]) > Date.now();
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (isValid(req)) return next();
  res.status(401).json({ error: 'Sesión expirada. Vuelve a ingresar.' });
}

const clear = (res) => res.clearCookie(COOKIE, { path: '/' });

module.exports = { issue, isValid, checkPassword, requireAdmin, clear };
