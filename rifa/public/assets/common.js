'use strict';
/* Utilidades compartidas del sitio público */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const ICONS = {
  ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M17 7 7 17M7 7l10 10"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function money(v, currency = 'CLP') {
  const d = ['CLP', 'COP', 'PYG'].includes(currency) ? 0 : 2;
  try { return new Intl.NumberFormat('es-CL', { style: 'currency', currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
  catch { return `${currency} ${v}`; }
}
const pad = (n, total, start) => String(n).padStart(String(start + total - 1).length, '0');

function fmtDate(iso, opts = {}) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', ...opts }).format(new Date(iso));
}
function fmtDateTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

/* RUT chileno */
function rutClean(v) { return String(v || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
function rutFormat(v) {
  const c = rutClean(v);
  if (c.length < 2) return c;
  const body = c.slice(0, -1), dv = c.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
function rutValid(v) {
  const c = rutClean(v);
  if (c.length < 2) return false;
  const body = c.slice(0, -1), dv = c.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0, m = 2;
  for (let i = body.length - 1; i >= 0; i--) { sum += +body[i] * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (sum % 11);
  return (r === 11 ? '0' : r === 10 ? 'K' : String(r)) === dv;
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) { const e = new Error(data.error || 'Error de conexión'); Object.assign(e, data, { status: res.status }); throw e; }
  return data;
}

function toast(msg, type = 'info', ms = 4200) {
  let wrap = $('.toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.append(wrap); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i></i><div>${esc(msg)}</div>`;
  wrap.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}

function initChrome() {
  const nav = $('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  observeReveal();
}

function observeReveal(root = document) {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  $$('.reveal:not(.in)', root).forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
}

function setBrand(name) {
  $$('[data-brand]').forEach((el) => { el.textContent = name; });
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento no disponible */ } }
};

/* Confeti dorado ligero */
function confetti(duration = 3200) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'confetti'; document.body.append(c);
  const ctx = c.getContext('2d'); const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const colors = ['#F6E4AE', '#D8B46A', '#A9823C', '#FFF6DC', '#E8C988'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height * 0.6, w: (6 + Math.random() * 8) * dpr, h: (3 + Math.random() * 5) * dpr,
    vx: (Math.random() - 0.5) * 2.2 * dpr, vy: (2 + Math.random() * 3.5) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25, col: colors[(Math.random() * colors.length) | 0]
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    const fade = Math.max(0, 1 - Math.max(0, t - t0 - duration + 900) / 900);
    for (const p of parts) {
      p.x += p.vx + Math.sin((t + p.y) / 400) * 0.6 * dpr; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (t - t0 < duration) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

function navHtml(extra = '') {
  return `<nav class="nav"><div class="container">
    <a class="brand" href="/"><span class="brand-mark">${ICONS.ticket}</span><span class="brand-name" data-brand>&nbsp;</span></a>
    <div class="nav-links">${extra}</div></div></nav>`;
}
