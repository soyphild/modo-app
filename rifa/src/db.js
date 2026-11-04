'use strict';
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const db = new Database(path.join(DATA_DIR, 'rifa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS raffles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  total_numbers INTEGER NOT NULL,
  start_number INTEGER NOT NULL DEFAULT 1,
  ticket_price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  max_per_order INTEGER NOT NULL DEFAULT 20,
  reservation_minutes INTEGER NOT NULL DEFAULT 15,
  draw_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | active | closed | drawn
  terms TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  winner_number INTEGER,
  winner_order_id INTEGER,
  drawn_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | expired | cancelled | refunded | conflict
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rut TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  numbers TEXT NOT NULL,          -- JSON array
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  currency TEXT NOT NULL,
  mp_preference_id TEXT,
  checkout_url TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_status_detail TEXT,
  payment_method TEXT,
  payment_type TEXT,
  installments INTEGER,
  card_last_four TEXT,
  authorization_code TEXT,
  payer_email TEXT,
  amount_paid REAL,
  net_received REAL,
  paid_at TEXT,
  expires_at TEXT,
  receipt_sent_at TEXT,
  source TEXT NOT NULL DEFAULT 'web',   -- web | manual
  notes TEXT DEFAULT '',
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_raffle ON orders(raffle_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- Un número solo puede existir una vez por rifa: esto es lo que impide ventas dobles.
CREATE TABLE IF NOT EXISTS tickets (
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  status TEXT NOT NULL,           -- reserved | sold
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (raffle_id, number)
);
CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  provider TEXT NOT NULL,
  payment_id TEXT,
  status TEXT,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`);

const DEFAULT_SETTINGS = {
  business_name: 'Gran Rifa',
  contact_email: '',
  contact_whatsapp: '',
  admin_notify_email: '',
  timezone: 'America/Santiago',
  accent: 'gold',
  footer_note: 'Sorteo transparente. Cada número es único y queda registrado a tu nombre.'
};

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function saveSettings(obj) {
  const stmt = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => { for (const [k, v] of Object.entries(obj)) if (k in DEFAULT_SETTINGS) stmt.run(k, String(v ?? '')); })();
}

const nowIso = () => new Date().toISOString();

module.exports = { db, DATA_DIR, getSettings, saveSettings, nowIso };
