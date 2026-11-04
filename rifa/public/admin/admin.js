'use strict';
(() => {
  const root = $('#root');
  const sheet = $('#sheet');
  const sheetCard = $('#sheetCard');
  const A = { overview: null, raffleId: store.get('rifa:admin:raffle', null), view: 'dashboard', orders: [], daily: [], filter: { status: 'all', q: '' } };

  const NAV = [
    ['dashboard', 'Resumen', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>'],
    ['orders', 'Compradores', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/></svg>'],
    ['board', 'Tablero', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>'],
    ['raffle', 'Rifa', ICONS.ticket],
    ['draw', 'Sorteo', ICONS.gift],
    ['settings', 'Ajustes', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>']
  ];
  const STATUS = { paid: 'Pagado', pending: 'Pendiente', expired: 'Vencido', cancelled: 'Cancelado', refunded: 'Reembolsado', conflict: 'Revisar' };
  const RSTATUS = { draft: 'Borrador', active: 'En venta', closed: 'Cerrada', drawn: 'Sorteada' };
  const raffle = () => A.overview?.raffles.find((r) => r.id === A.raffleId);
  const fmtN = (n, r = raffle()) => pad(n, r.total_numbers, r.start_number);
  const initials = (o) => `${(o.first_name || '?')[0]}${(o.last_name || '')[0] || ''}`.toUpperCase();
  const badge = (s) => `<span class="badge-s s-${s}">${STATUS[s] || s}</span>`;

  /* ---------- Sesión ---------- */
  async function boot() {
    const s = await api('/api/admin/session');
    if (!s.authenticated) return renderLogin(s.configured);
    await loadOverview();
    renderShell();
    route();
  }

  function renderLogin(configured) {
    root.innerHTML = `<div class="login"><div class="card">
      <span class="brand-mark">${ICONS.ticket}</span>
      <h1 class="display h-md">Panel del organizador</h1>
      <p class="muted" style="margin:0">Ingresa para administrar tus rifas, ventas y compradores.</p>
      ${configured ? '' : '<div class="notice" style="margin:18px 0 0"><span>Define la variable <b>ADMIN_PASSWORD</b> en el servidor para poder ingresar.</span></div>'}
      <form id="loginForm"><div class="field"><label for="pw">Contraseña</label><input id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-gold btn-lg btn-block" type="submit">Ingresar</button></form></div></div>`;
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = e.target.querySelector('button'); b.classList.add('loading');
      try { await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } }); boot(); }
      catch (err) { b.classList.remove('loading'); toast(err.message, 'error'); }
    });
    $('#pw').focus();
  }

  async function loadOverview() {
    A.overview = await api('/api/admin/overview');
    const ids = A.overview.raffles.map((r) => r.id);
    if (!ids.includes(A.raffleId)) A.raffleId = ids[0] ?? null;
    store.set('rifa:admin:raffle', A.raffleId);
  }

  async function call(url, opts) {
    try { return await api(url, opts); }
    catch (e) { if (e.status === 401) { renderLogin(true); } throw e; }
  }

  /* ---------- Estructura ---------- */
  function raffleOptions() {
    const list = A.overview.raffles;
    return list.map((r) => `<option value="${r.id}" ${r.id === A.raffleId ? 'selected' : ''}>${esc(r.title)}${r.status !== 'active' ? ` (${RSTATUS[r.status]})` : ''}</option>`).join('') + '<option value="new">＋ Nueva rifa</option>';
  }

  function renderShell() {
    const brand = esc(A.overview.settings.business_name);
    root.innerHTML = `
      <div class="mobile-top"><a class="brand" href="#dashboard"><span class="brand-mark">${ICONS.ticket}</span></a><select id="rsM" aria-label="Rifa">${raffleOptions()}</select></div>
      <div class="shell">
        <aside class="side">
          <a class="brand" href="#dashboard"><span class="brand-mark">${ICONS.ticket}</span><span class="brand-name">${brand}</span></a>
          <div class="raffle-switch"><label for="rs">Rifa</label><select id="rs">${raffleOptions()}</select></div>
          <nav>${NAV.map(([id, label, icon]) => `<button data-nav="${id}">${icon}${label}</button>`).join('')}</nav>
          <div class="bottom"><a class="btn btn-sm" id="publicLink" target="_blank" rel="noopener">Ver página pública</a><button class="btn btn-ghost btn-sm" id="logout">Cerrar sesión</button></div>
        </aside>
        <main class="content" id="view"></main>
      </div>
      <nav class="tabbar">${NAV.map(([id, label, icon]) => `<button data-nav="${id}">${icon}${label}</button>`).join('')}</nav>`;
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.nav; }));
    const onSwitch = (e) => {
      if (e.target.value === 'new') { location.hash = 'new'; return; }
      A.raffleId = Number(e.target.value); store.set('rifa:admin:raffle', A.raffleId);
      renderShell(); route();
    };
    $('#rs').addEventListener('change', onSwitch); $('#rsM').addEventListener('change', onSwitch);
    $('#logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); location.hash = ''; boot(); });
    updatePublicLink();
  }
  function updatePublicLink() { const r = raffle(); const l = $('#publicLink'); if (l) { l.href = r ? `/r/${r.slug}` : '/'; } }

  function route() {
    let v = location.hash.slice(1) || 'dashboard';
    if (!A.overview.raffles.length && !['settings', 'new'].includes(v)) v = 'new';
    A.view = v;
    $$('[data-nav]').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === v || (v === 'new' && b.dataset.nav === 'raffle') ? 'page' : 'false'));
    const view = $('#view');
    view.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:16px"></div><div class="skeleton" style="height:320px"></div>';
    scrollTo(0, 0);
    ({ dashboard: viewDashboard, orders: viewOrders, board: viewBoard, raffle: () => viewEditor(raffle()), new: () => viewEditor(null), draw: viewDraw, settings: viewSettings }[v] || viewDashboard)(view);
  }
  addEventListener('hashchange', () => { if (A.overview) route(); });

  function head(eyebrow, title, actions = '') {
    return `<div class="page-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1></div><div class="actions">${actions}</div></div>`;
  }

  /* ---------- Resumen ---------- */
  async function viewDashboard(view) {
    await loadOverview();
    const r = raffle();
    if (!r) return viewEditor(null);
    const { orders, daily } = await call(`/api/admin/raffles/${r.id}/orders?status=paid`);
    const st = r.stats;
    const integ = A.overview.integrations;
    const avgTicket = r.buyers ? r.revenue / r.buyers : 0;
    const potential = r.total_numbers * r.ticket_price;
    view.innerHTML = `${head(RSTATUS[r.status], esc(r.title), `<a class="btn btn-sm" href="#orders">Ver compradores</a><a class="btn btn-gold btn-sm" href="/r/${esc(r.slug)}" target="_blank" rel="noopener">Abrir rifa</a>`)}
      ${!integ.mercadopago ? '<div class="notice"><span><b>Pagos en modo simulación.</b> Configura <code>MP_ACCESS_TOKEN</code> para cobrar con Mercado Pago. Revisa la guía en Ajustes.</span></div>' : ''}
      <div class="kpis">
        <div class="kpi hl"><small>Recaudado</small><b>${money(r.revenue, r.currency)}</b><span>de ${money(potential, r.currency)} posibles</span></div>
        <div class="kpi"><small>Números vendidos</small><b>${st.sold.toLocaleString('es-CL')}</b><span>${st.percent}% de ${st.total.toLocaleString('es-CL')}</span></div>
        <div class="kpi"><small>Compradores</small><b>${r.buyers.toLocaleString('es-CL')}</b><span>Ticket promedio ${money(avgTicket, r.currency)}</span></div>
        <div class="kpi"><small>Disponibles</small><b>${st.available.toLocaleString('es-CL')}</b><span>${st.reserved} en proceso de pago</span></div>
      </div>
      <div class="panels">
        <div class="panel"><h3>Ventas por día <small>${daily.length ? `${daily.length} día${daily.length > 1 ? 's' : ''} con ventas` : ''}</small></h3>${chartSvg(daily, r)}</div>
        <div class="panel"><h3>Avance</h3><div class="ring">${ringSvg(st.percent)}<div><div style="font-family:var(--font-display);font-size:34px;line-height:1">${st.percent}%</div><div class="muted" style="font-size:14px;margin-top:6px">${st.sold} vendidos · ${st.reserved} reservados · ${st.available} libres</div>${r.draw_date ? `<div class="muted" style="font-size:13px;margin-top:10px">Sorteo: ${esc(fmtDate(r.draw_date, { hour: '2-digit', minute: '2-digit' }))}</div>` : ''}</div></div></div>
        <div class="panel"><h3>Últimas ventas <a class="btn btn-ghost btn-sm" href="#orders">Ver todas</a></h3>
          <div class="list">${orders.slice(0, 7).map((o) => `<div class="list-item" data-order="${o.id}"><span class="avatar">${esc(initials(o))}</span><div class="grow"><b>${esc(o.first_name)} ${esc(o.last_name)}</b><span>N° ${esc(o.numbers_label)}</span></div><div class="amt">${money(o.amount_paid ?? o.total, o.currency)}<small>${esc(o.paid_local.replace(/:\d{2}$/, ''))}</small></div></div>`).join('') || '<div class="empty">Aún no hay ventas. Comparte el link de tu rifa.</div>'}</div></div>
        <div class="panel"><h3>Estado de la configuración</h3><div class="checklist">
          ${check(integ.mercadopago, 'Mercado Pago conectado', integ.mercadopago ? (integ.mp_sandbox ? 'Usando modo de prueba (sandbox).' : 'Cobros reales activos.') : 'Agrega MP_ACCESS_TOKEN.')}
          ${check(integ.base_url.startsWith('https://'), 'Dirección pública HTTPS', `Webhook: <code>${esc(integ.base_url)}/api/webhooks/mercadopago</code>`)}
          ${check(integ.webhook_secret, 'Firma del webhook', integ.webhook_secret ? 'Las notificaciones se verifican.' : 'Recomendado: define MP_WEBHOOK_SECRET.')}
          ${check(integ.smtp, 'Envío de correos', integ.smtp ? 'Los comprobantes se envían automáticamente.' : 'Configura SMTP_HOST, SMTP_USER y SMTP_PASS.')}
          ${check(Boolean(A.overview.settings.admin_notify_email), 'Aviso de nuevas ventas', A.overview.settings.admin_notify_email ? esc(A.overview.settings.admin_notify_email) : 'Indica tu correo en Ajustes.')}
        </div></div>
      </div>`;
    $$('[data-order]', view).forEach((el) => el.addEventListener('click', () => openOrder(orders.find((o) => o.id === Number(el.dataset.order)))));
  }
  const check = (ok, t, d) => `<div class="${ok ? 'ok' : 'no'}"><i>${ok ? ICONS.check : '!'}</i><div><b>${t}</b><small>${d}</small></div></div>`;

  function ringSvg(p) {
    const c = 2 * Math.PI * 52;
    return `<svg viewBox="0 0 128 128"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E4AE"/><stop offset="1" stop-color="#A9823C"/></linearGradient></defs><circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12"/><circle cx="64" cy="64" r="52" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" transform="rotate(-90 64 64)"/></svg>`;
  }

  function chartSvg(daily, r) {
    if (!daily.length) return '<div class="empty" style="padding:70px 0">Las ventas aparecerán aquí.</div>';
    const data = daily.slice(-21);
    const W = 640, H = 220, P = 28, bw = (W - P * 2) / data.length;
    const max = Math.max(...data.map((d) => d.revenue), 1);
    const bars = data.map((d, i) => {
      const h = Math.max(3, (d.revenue / max) * (H - 60));
      const w = Math.min(bw * 0.64, 46), x = P + i * bw + (bw - w) / 2;
      const label = d.day.slice(8, 10) + '/' + d.day.slice(5, 7);
      return `<g><title>${label}: ${money(d.revenue, r.currency)} · ${d.numbers} números</title><rect class="b" x="${x}" y="${H - 28 - h}" width="${w}" height="${h}" rx="${Math.min(8, w / 2)}"/>${data.length <= 12 || i % 2 === 0 ? `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${label}</text>` : ''}</g>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2DDA4"/><stop offset="1" stop-color="#A9823C" stop-opacity=".55"/></linearGradient></defs><line x1="${P}" x2="${W - P}" y1="${H - 28}" y2="${H - 28}" stroke="rgba(255,255,255,.08)"/>${bars}</svg>`;
  }

  /* ---------- Compradores ---------- */
  async function viewOrders(view) {
    const r = raffle();
    view.innerHTML = `${head('Registro de compradores', 'Compradores', `<button class="btn btn-sm" id="printBtn">${ICONS.print}Imprimir</button><a class="btn btn-sm" id="csvBtn">Exportar Excel (CSV)</a><button class="btn btn-gold btn-sm" id="manualBtn">${ICONS.plus}Venta manual</button>`)}
      <div class="filters">
        <label class="search"><span class="sr-only">Buscar</span>${ICONS.search}<input id="q" placeholder="Buscar por nombre, RUT, correo, número o ID de transacción" value="${esc(A.filter.q)}"></label>
        <select id="st" aria-label="Estado">${['all', 'paid', 'pending', 'expired', 'cancelled', 'refunded', 'conflict'].map((s) => `<option value="${s}" ${A.filter.status === s ? 'selected' : ''}>${s === 'all' ? 'Todos los estados' : STATUS[s]}</option>`).join('')}</select>
      </div>
      <div id="ordersOut"></div>`;
    let t;
    $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { A.filter.q = e.target.value.trim(); loadOrders(); }, 220); });
    $('#st').addEventListener('change', (e) => { A.filter.status = e.target.value; loadOrders(); });
    $('#printBtn').addEventListener('click', () => print());
    $('#manualBtn').addEventListener('click', () => manualSale([]));
    await loadOrders();
    function updateCsv() {
      const p = new URLSearchParams({ status: A.filter.status === 'all' ? 'all' : A.filter.status, q: A.filter.q });
      $('#csvBtn').href = `/api/admin/raffles/${r.id}/export.csv?${p}`;
    }
    async function loadOrders() {
      updateCsv();
      const p = new URLSearchParams({ status: A.filter.status, q: A.filter.q });
      const { orders } = await call(`/api/admin/raffles/${r.id}/orders?${p}`);
      A.orders = orders;
      const out = $('#ordersOut');
      if (!out) return;
      if (!orders.length) { out.innerHTML = '<div class="empty card">No hay registros con estos filtros.</div>'; return; }
      const paid = orders.filter((o) => o.status === 'paid');
      out.innerHTML = `<p class="muted" style="font-size:13px;margin:0 0 12px">${orders.length} registro${orders.length > 1 ? 's' : ''} · ${paid.reduce((a, o) => a + o.quantity, 0)} números pagados · ${money(paid.reduce((a, o) => a + (o.amount_paid || 0), 0), r.currency)}</p>
        <div class="table-wrap"><table class="data"><thead><tr>
          <th>Fecha y hora</th><th>Estado</th><th>Nombre</th><th>Apellido</th><th>RUT</th><th>Correo</th><th>Teléfono</th><th>Números</th><th class="right">Cant.</th><th class="right">Monto</th><th>Medio de pago</th><th>ID transacción</th><th>Comprobante</th>
        </tr></thead><tbody>${orders.map((o) => `<tr data-id="${o.id}">
          <td class="mono">${esc((o.paid_local || o.created_local).replace(/:\d{2}$/, ''))}</td><td>${badge(o.status)}</td><td>${esc(o.first_name)}</td><td>${esc(o.last_name)}</td>
          <td class="mono">${esc(o.rut_formatted)}</td><td>${esc(o.email)}</td><td class="mono">${esc(o.phone || '—')}</td><td class="num-list">${esc(o.numbers_label)}</td>
          <td class="right">${o.quantity}</td><td class="right">${money(o.amount_paid ?? o.total, o.currency)}</td><td>${esc(o.payment_label)}${o.installments > 1 ? ` · ${o.installments}c` : ''}</td>
          <td class="mono">${esc(o.mp_payment_id || '—')}</td><td class="mono">${esc(o.code)}</td></tr>`).join('')}</tbody></table></div>
        <div class="cards-mobile">${orders.map((o) => `<div class="ocard" data-id="${o.id}"><div class="top"><div><b>${esc(o.first_name)} ${esc(o.last_name)}</b><div class="muted" style="font-size:12.5px">${esc(o.rut_formatted)} · ${esc(o.email)}</div></div>${badge(o.status)}</div><div class="nums">N° ${esc(o.numbers_label)}</div><div class="meta"><span>${esc((o.paid_local || o.created_local).replace(/:\d{2}$/, ''))}</span><span>${esc(o.payment_label)}</span><b style="color:var(--ink)">${money(o.amount_paid ?? o.total, o.currency)}</b></div></div>`).join('')}</div>`;
      $$('[data-id]', out).forEach((el) => el.addEventListener('click', () => openOrder(orders.find((o) => o.id === Number(el.dataset.id)))));
    }
    A.reloadOrders = loadOrders;
  }

  /* ---------- Detalle de orden ---------- */
  function openSheet(html, wide) {
    sheetCard.className = `sheet-card${wide ? ' wide' : ''}`;
    sheetCard.innerHTML = html;
    if (!sheet.open) sheet.showModal();
    $$('[data-close]', sheetCard).forEach((b) => b.addEventListener('click', () => sheet.close()));
  }
  sheet.addEventListener('click', (e) => { if (e.target.classList.contains('sheet-wrap')) sheet.close(); });

  function openOrder(o) {
    if (!o) return;
    const r = raffle();
    const row = (k, v) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`;
    openSheet(`
      <div class="sheet-head"><div><span class="eyebrow">Orden ${esc(o.code)}</span><h2>${esc(o.first_name)} ${esc(o.last_name)}</h2></div><button class="icon-btn" data-close aria-label="Cerrar">${ICONS.close}</button></div>
      <div class="sheet-body">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${badge(o.status)}${o.source === 'manual' ? '<span class="badge-s s-expired">Venta manual</span>' : ''}</div>
        <div class="summary"><div class="muted" style="font-size:13px;font-weight:700">Números</div><div class="chips-wrap">${o.numbers.map((n) => `<span class="chip">${fmtN(n, r)}</span>`).join('')}</div></div>
        <div class="detail-grid">
          <dl>${row('Nombre', esc(o.first_name))}${row('Apellido', esc(o.last_name))}${row('RUT', esc(o.rut_formatted))}${row('Correo', `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`)}${row('Teléfono', o.phone ? `<a href="https://wa.me/${esc(o.phone.replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(o.phone)}</a>` : '—')}${row('Reservado', esc(o.created_local))}${row('Pagado', esc(o.paid_local || '—'))}</dl>
          <dl>${row('Cantidad', o.quantity)}${row('Total', money(o.total, o.currency))}${row('Monto pagado', o.amount_paid != null ? money(o.amount_paid, o.currency) : '—')}${row('Neto recibido', o.net_received != null ? money(o.net_received, o.currency) : '—')}${row('Medio de pago', esc(o.payment_label))}${row('Cuotas', o.installments || '—')}${row('Tarjeta', o.card_last_four ? `•••• ${esc(o.card_last_four)}` : '—')}${row('ID transacción', esc(o.mp_payment_id || '—'))}${row('Estado MP', esc([o.mp_status, o.mp_status_detail].filter(Boolean).join(' · ') || '—'))}${row('Comprobante enviado', o.receipt_sent_at ? esc(fmtDateTime(o.receipt_sent_at)) : '—')}</dl>
        </div>
        ${o.notes ? `<p class="muted" style="font-size:14px">Notas: ${esc(o.notes)}</p>` : ''}
      </div>
      <div class="sheet-foot wrap">
        ${o.status === 'paid' ? `<button class="btn btn-sm" data-act="resend">Reenviar comprobante</button><a class="btn btn-sm" href="/comprobante/${esc(o.token)}" target="_blank" rel="noopener">Ver comprobante</a><a class="btn btn-sm" href="/api/admin/email-preview/${o.id}" target="_blank" rel="noopener">Ver correo</a>` : ''}
        ${['pending', 'expired', 'cancelled', 'conflict'].includes(o.status) ? `<select id="confirmMethod" class="input" style="width:auto;min-height:40px;height:40px;padding:0 14px;border-radius:999px;font-size:14px" aria-label="Medio de pago"><option value="manual_transfer">Transferencia</option><option value="manual_cash">Efectivo</option><option value="manual_other">Otro</option></select><button class="btn btn-gold btn-sm" data-act="confirm">Confirmar pago manual</button>` : ''}
        ${A.overview.integrations.mercadopago && o.source === 'web' ? '<button class="btn btn-sm" data-act="sync">Consultar Mercado Pago</button>' : ''}
        ${['pending', 'paid', 'conflict'].includes(o.status) ? `<button class="btn btn-ghost btn-sm" data-act="cancel" style="color:var(--danger)">${o.status === 'paid' ? 'Anular y liberar números' : 'Cancelar reserva'}</button>` : ''}
      </div>`, true);
    $$('[data-act]', sheetCard).forEach((b) => b.addEventListener('click', async () => {
      const act = b.dataset.act;
      if (act === 'cancel' && !confirm(o.status === 'paid' ? '¿Anular esta compra pagada? Los números quedarán disponibles nuevamente. Recuerda gestionar la devolución en Mercado Pago.' : '¿Cancelar esta reserva y liberar los números?')) return;
      let body;
      if (act === 'confirm') {
        if (!confirm('¿Confirmar que recibiste este pago? Los números quedarán vendidos y se enviará el comprobante.')) return;
        body = { payment_type: $('#confirmMethod').value };
      }
      b.classList.add('loading');
      try {
        const res = await call(`/api/admin/orders/${o.id}/${act}`, { method: 'POST', body });
        toast({ resend: 'Comprobante reenviado.', confirm: 'Pago confirmado. Se envió el comprobante.', cancel: 'Orden anulada.', sync: `Estado actualizado: ${STATUS[res.status] || res.status}.` }[act], 'ok');
        sheet.close();
        refreshView();
      } catch (e) { b.classList.remove('loading'); toast(e.message, 'error'); }
    }));
  }

  function refreshView() { if (A.view === 'orders' && A.reloadOrders) A.reloadOrders(); else route(); }

  /* ---------- Venta manual ---------- */
  function manualSale(numbers) {
    const r = raffle();
    openSheet(`
      <form id="manualForm" novalidate>
      <div class="sheet-head"><div><span class="eyebrow">Venta manual</span><h2>Registrar venta</h2></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ICONS.close}</button></div>
      <div class="sheet-body"><p class="muted" style="margin-top:0;font-size:14px">Para ventas en efectivo o transferencia. Los números quedan vendidos al instante y se envía el comprobante.</p>
        <div class="form-grid">
          <div class="field full"><label>Números (separados por coma)</label><input name="numbers" value="${numbers.map((n) => fmtN(n, r)).join(', ')}" placeholder="Ej: 7, 21, 105" required><span class="err"></span></div>
          <div class="field"><label>Nombre</label><input name="first_name" required><span class="err"></span></div>
          <div class="field"><label>Apellido</label><input name="last_name" required><span class="err"></span></div>
          <div class="field"><label>RUT</label><input name="rut" placeholder="12.345.678-9" required><span class="err"></span></div>
          <div class="field"><label>Teléfono</label><input name="phone" type="tel"><span class="err"></span></div>
          <div class="field full"><label>Correo</label><input name="email" type="email" required><span class="err"></span></div>
          <div class="field"><label>Medio de pago</label><select name="payment_type"><option value="manual_transfer">Transferencia</option><option value="manual_cash">Efectivo</option><option value="manual_other">Otro</option></select></div>
          <div class="field"><label>Notas <span class="opt">(opcional)</span></label><input name="notes"></div>
          <label class="check full"><input type="checkbox" name="send_receipt" checked><span>Enviar comprobante por correo</span></label>
        </div></div>
      <div class="sheet-foot"><button class="btn btn-gold btn-block" type="submit">Registrar venta</button></div></form>`);
    const f = $('#manualForm');
    f.elements.rut.addEventListener('input', (e) => { e.target.value = rutFormat(e.target.value); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const nums = String(v.numbers).split(/[^0-9]+/).filter(Boolean).map(Number);
      const btn = f.querySelector('[type=submit]'); btn.classList.add('loading');
      $$('.field', f).forEach((x) => { x.classList.remove('invalid'); $('.err', x) && ($('.err', x).textContent = ''); });
      try {
        await call(`/api/admin/raffles/${r.id}/manual-sale`, { method: 'POST', body: { ...v, numbers: nums, send_receipt: f.elements.send_receipt.checked } });
        toast('Venta registrada.', 'ok'); sheet.close(); refreshView();
      } catch (err) {
        btn.classList.remove('loading');
        if (err.fields) for (const [k, m] of Object.entries(err.fields)) { const i = f.elements[k]; if (i) { i.closest('.field').classList.add('invalid'); $('.err', i.closest('.field')).textContent = m; } }
        toast(err.taken?.length ? `Ya están ocupados: ${err.taken.map((n) => fmtN(n, r)).join(', ')}` : err.message, 'error');
      }
    });
  }

  /* ---------- Tablero ---------- */
  async function viewBoard(view) {
    const r = raffle();
    const { tickets } = await call(`/api/admin/raffles/${r.id}/tickets`);
    const map = new Map(tickets.map((t) => [t.number, t]));
    const sel = new Set();
    view.innerHTML = `${head('Tablero', 'Todos los números', `<button class="btn btn-gold btn-sm" id="sellSel" disabled>${ICONS.plus}Vender seleccionados</button>`)}
      <div class="board-toolbar"><div class="legend" style="margin:0"><span><i class="l-free"></i>Libre</span><span><i style="background:rgba(127,214,164,.25);border:1px solid rgba(127,214,164,.4)"></i>Vendido</span><span><i class="l-res"></i>Reservado</span></div><span class="muted" style="font-size:13px;margin-left:auto">Toca un número libre para seleccionarlo, o uno vendido para ver al comprador.</span></div>
      <div class="board" id="board"></div>`;
    const board = $('#board');
    const frag = document.createDocumentFragment();
    for (let n = r.start_number; n < r.start_number + r.total_numbers; n++) {
      const t = map.get(n);
      const b = document.createElement('button');
      b.type = 'button'; b.className = `num${t ? ` ${t.status}` : ''}`; b.dataset.n = n;
      b.innerHTML = `<span>${fmtN(n, r)}</span>`;
      if (t) b.title = `${t.first_name} ${t.last_name} · ${t.code}`;
      frag.append(b);
    }
    board.append(frag);
    board.addEventListener('click', async (e) => {
      const b = e.target.closest('.num'); if (!b) return;
      const n = Number(b.dataset.n), t = map.get(n);
      if (t) {
        const { orders } = await call(`/api/admin/raffles/${r.id}/orders?q=${encodeURIComponent(t.code)}`);
        openOrder(orders[0]);
        return;
      }
      sel.has(n) ? sel.delete(n) : sel.add(n);
      b.setAttribute('aria-pressed', String(sel.has(n)));
      $('#sellSel').disabled = !sel.size;
      $('#sellSel').innerHTML = `${ICONS.plus}Vender seleccionados${sel.size ? ` (${sel.size})` : ''}`;
    });
    $('#sellSel').addEventListener('click', () => manualSale([...sel].sort((a, b) => a - b)));
  }

  /* ---------- Editor de rifa ---------- */
  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso); const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  function viewEditor(view, r) {
    if (!(view instanceof HTMLElement)) { r = view; view = $('#view'); }
    const isNew = !r;
    const d = r || { title: '', subtitle: '', description: '', terms: '', cover_image: '', total_numbers: 100, start_number: 1, ticket_price: 5000, currency: 'CLP', max_per_order: 20, reservation_minutes: 15, draw_date: '', status: 'draft', slug: '', prizes: [] };
    const prizes = (d.prizes || []).map((p) => ({ ...p }));
    if (isNew && !prizes.length) prizes.push({ title: '', description: '', image: '' });
    const locked = r && r.stats.sold + r.stats.reserved > 0;
    view.innerHTML = `${head(isNew ? 'Nueva rifa' : 'Configuración', isNew ? 'Crea tu rifa' : esc(d.title), !isNew ? `<button class="btn btn-ghost btn-sm" id="delRaffle" style="color:var(--danger)">Eliminar</button>` : '')}
      <form id="editor" novalidate><div class="editor">
        <div style="display:grid;gap:18px">
          <div class="panel"><h4>Información</h4>
            <div class="field"><label>Título de la rifa</label><input name="title" value="${esc(d.title)}" placeholder="Ej: Gran Rifa de Navidad" required><span class="err"></span></div>
            <div class="field"><label>Frase destacada <span class="opt">(opcional)</span></label><input name="subtitle" value="${esc(d.subtitle)}" placeholder="Ej: Participa por un iPhone 17 Pro y más premios"><span class="err"></span></div>
            <div class="field"><label>Descripción <span class="opt">(opcional)</span></label><textarea name="description" placeholder="Cuéntales a los participantes de qué se trata.">${esc(d.description)}</textarea></div>
          </div>
          <div class="panel"><h4>Números y precio</h4>
            ${locked ? '<div class="notice" style="margin:0"><span>Ya hay números vendidos o reservados: puedes ampliar la cantidad, pero no reducirla por debajo de los ya tomados.</span></div>' : ''}
            <div class="form-grid">
              <div class="field"><label>Cantidad de números</label><input name="total_numbers" type="number" min="2" max="100000" value="${d.total_numbers}" required><span class="hint" id="rangeHint"></span><span class="err"></span></div>
              <div class="field"><label>Numeración parte en</label><select name="start_number"><option value="1" ${d.start_number === 1 ? 'selected' : ''}>1</option><option value="0" ${d.start_number === 0 ? 'selected' : ''}>0 (ej: 00 al 99)</option></select><span class="err"></span></div>
              <div class="field"><label>Valor por número</label><input name="ticket_price" type="number" min="1" step="1" value="${d.ticket_price}" required><span class="hint" id="priceHint"></span><span class="err"></span></div>
              <div class="field"><label>Moneda</label><select name="currency">${['CLP', 'ARS', 'MXN', 'COP', 'PEN', 'UYU', 'BRL'].map((c) => `<option ${d.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              <div class="field"><label>Máximo de números por compra</label><input name="max_per_order" type="number" min="1" max="500" value="${d.max_per_order}"></div>
              <div class="field"><label>Minutos de reserva para pagar</label><input name="reservation_minutes" type="number" min="5" max="120" value="${d.reservation_minutes}"><span class="hint">Si no paga a tiempo, los números se liberan.</span></div>
            </div>
          </div>
          <div class="panel"><h4>Premios</h4><div id="prizeList" style="display:grid;gap:12px"></div><button type="button" class="btn btn-sm" id="addPrize" style="justify-self:start">${ICONS.plus}Agregar premio</button></div>
          <div class="panel"><h4>Bases y condiciones</h4><div class="field"><textarea name="terms" style="min-height:180px" placeholder="Ej: El sorteo se realizará el ... en vivo por Instagram. El ganador será contactado por correo y teléfono...">${esc(d.terms)}</textarea></div></div>
        </div>
        <div style="display:grid;gap:18px">
          <div class="panel"><h4>Estado</h4>
            <div class="status-pick">${Object.entries({ draft: 'No visible al público', active: 'Recibe compras', closed: 'Visible, sin ventas', drawn: 'Muestra ganadores' }).map(([k, h]) => `<label><input type="radio" name="status" value="${k}" ${d.status === k ? 'checked' : ''}>${RSTATUS[k]}<small>${h}</small></label>`).join('')}</div>
          </div>
          <div class="panel"><h4>Portada</h4><div class="cover-drop" id="coverDrop" style="${d.cover_image ? `background-image:url('${esc(d.cover_image)}');color:transparent` : ''}">Subir imagen de portada<br>(recomendado 1200×1500)</div><input type="hidden" name="cover_image" value="${esc(d.cover_image)}">${d.cover_image ? '<button type="button" class="btn btn-ghost btn-sm" id="rmCover">Quitar portada</button>' : ''}</div>
          <div class="panel"><h4>Sorteo y enlace</h4>
            <div class="field"><label>Fecha y hora del sorteo</label><input name="draw_date" type="datetime-local" value="${toLocalInput(d.draw_date)}"><span class="hint">La venta se cierra automáticamente a esta hora.</span></div>
            <div class="field"><label>Dirección de la rifa</label><input name="slug" value="${esc(d.slug)}" placeholder="se-genera-del-titulo"><span class="hint">${esc(location.origin)}/r/<b id="slugPrev">${esc(d.slug || '…')}</b></span><span class="err"></span></div>
          </div>
        </div>
      </div>
      <div class="sticky-save glass">${!isNew ? `<button type="button" class="btn btn-sm" id="copyLink">Copiar enlace</button>` : ''}<button type="submit" class="btn btn-gold">${isNew ? 'Crear rifa' : 'Guardar cambios'}</button></div>
      </form>`;

    const f = $('#editor');
    const hints = () => {
      const t = +f.elements.total_numbers.value || 0, s = +f.elements.start_number.value, p = +f.elements.ticket_price.value || 0;
      const L = String(s + t - 1).length;
      $('#rangeHint').textContent = t > 1 ? `Del ${String(s).padStart(L, '0')} al ${String(s + t - 1).padStart(L, '0')}` : '';
      $('#priceHint').textContent = t && p ? `Recaudación máxima: ${money(t * p, f.elements.currency.value)}` : '';
    };
    f.addEventListener('input', hints); hints();
    f.elements.slug.addEventListener('input', (e) => { $('#slugPrev').textContent = e.target.value || '…'; });

    const renderPrizes = () => {
      $('#prizeList').innerHTML = prizes.map((p, i) => `<div class="prize-row" data-i="${i}">
        <div class="thumb" data-img="${i}" style="${p.image ? `background-image:url('${esc(p.image)}');color:transparent` : ''}">${i + 1}° premio<br>+ foto</div>
        <div class="fields"><input class="input" data-k="title" value="${esc(p.title)}" placeholder="${i === 0 ? 'Ej: iPhone 17 Pro 256 GB' : 'Nombre del premio'}"><input class="input" data-k="description" value="${esc(p.description || '')}" placeholder="Detalle (opcional)"></div>
        <div class="row-actions"><button type="button" class="icon-btn" data-up="${i}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-btn" data-rm="${i}" aria-label="Eliminar">${ICONS.close}</button></div></div>`).join('') || '<p class="muted" style="margin:0">Aún no hay premios.</p>';
    };
    renderPrizes();
    $('#prizeList').addEventListener('input', (e) => { const k = e.target.dataset.k; if (k) prizes[+e.target.closest('[data-i]').dataset.i][k] = e.target.value; });
    $('#prizeList').addEventListener('click', async (e) => {
      const up = e.target.closest('[data-up]'), rm = e.target.closest('[data-rm]'), img = e.target.closest('[data-img]');
      if (up) { const i = +up.dataset.up; [prizes[i - 1], prizes[i]] = [prizes[i], prizes[i - 1]]; renderPrizes(); }
      if (rm) { prizes.splice(+rm.dataset.rm, 1); renderPrizes(); }
      if (img) { const url = await pickImage(); if (url) { prizes[+img.dataset.img].image = url; renderPrizes(); } }
    });
    $('#addPrize').addEventListener('click', () => { prizes.push({ title: '', description: '', image: '' }); renderPrizes(); $('#prizeList .prize-row:last-child input').focus(); });
    $('#coverDrop').addEventListener('click', async () => { const url = await pickImage(); if (url) { f.elements.cover_image.value = url; const c = $('#coverDrop'); c.style.backgroundImage = `url('${url}')`; c.style.color = 'transparent'; } });
    $('#rmCover')?.addEventListener('click', () => { f.elements.cover_image.value = ''; const c = $('#coverDrop'); c.style.backgroundImage = ''; c.style.color = ''; });
    $('#copyLink')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(`${location.origin}/r/${r.slug}`); toast('Enlace copiado.', 'ok'); } catch { prompt('Copia el enlace:', `${location.origin}/r/${r.slug}`); } });
    $('#delRaffle')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${r.title}"? Esta acción no se puede deshacer.`)) return;
      try { await call(`/api/admin/raffles/${r.id}`, { method: 'DELETE' }); toast('Rifa eliminada.', 'ok'); await loadOverview(); renderShell(); location.hash = 'dashboard'; route(); }
      catch (e) { toast(e.message, 'error'); }
    });

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      v.draw_date = v.draw_date ? new Date(v.draw_date).toISOString() : '';
      v.prizes = prizes.filter((p) => p.title.trim());
      const btn = f.querySelector('[type=submit]'); btn.classList.add('loading');
      $$('.field.invalid', f).forEach((x) => { x.classList.remove('invalid'); $('.err', x).textContent = ''; });
      try {
        const res = await call(isNew ? '/api/admin/raffles' : `/api/admin/raffles/${r.id}`, { method: isNew ? 'POST' : 'PUT', body: v });
        A.raffleId = res.raffle.id; store.set('rifa:admin:raffle', A.raffleId);
        await loadOverview(); renderShell();
        toast(isNew ? 'Rifa creada. Actívala cuando esté lista.' : 'Cambios guardados.', 'ok');
        location.hash = 'raffle'; route();
      } catch (err) {
        btn.classList.remove('loading');
        if (err.fields) for (const [k, m] of Object.entries(err.fields)) { const i = f.elements[k]; const fld = i?.closest?.('.field'); if (fld) { fld.classList.add('invalid'); $('.err', fld).textContent = m; } }
        toast(err.message, 'error');
      }
    });
  }

  function pickImage() {
    return new Promise((resolve) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
      inp.onchange = async () => {
        const file = inp.files[0]; if (!file) return resolve(null);
        try {
          const data = await downscale(file);
          const { url } = await call('/api/admin/upload', { method: 'POST', body: { data } });
          resolve(url);
        } catch (e) { toast(e.message, 'error'); resolve(null); }
      };
      inp.click();
    });
  }

  // Reduce la imagen en el navegador para que cargue rápido en la página pública.
  function downscale(file, max = 1800) {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/gif') { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); return; }
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- Sorteo ---------- */
  async function viewDraw(view) {
    await loadOverview();
    const r = raffle();
    view.innerHTML = `${head('Sorteo', 'Elegir ganadores')}
      <p class="muted" style="margin:-8px 0 22px;max-width:62ch">Se elige al azar entre los números <b style="color:var(--ink)">vendidos y pagados</b> (${r.stats.sold}), usando un generador criptográficamente seguro. Un mismo número no puede ganar dos premios. Cuando termines, cambia el estado de la rifa a "Sorteada" para mostrar los ganadores en la página pública.</p>
      <div class="draw-list">${r.prizes.map((p, i) => `<div class="draw-item" data-p="${p.id}">
        <div><span class="eyebrow">${i + 1}° premio</span><h3>${esc(p.title)}</h3><div class="winner-info" id="w${p.id}">${p.winner_number !== null ? 'Cargando ganador…' : '<span class="muted">Sin sortear</span>'}</div></div>
        <div style="display:grid;gap:10px;justify-items:center"><div class="slot ${p.winner_number !== null ? 'win' : ''}" id="s${p.id}">${p.winner_number !== null ? fmtN(p.winner_number, r) : '—'}</div>
        <div style="display:flex;gap:8px">${p.winner_number !== null ? `<button class="btn btn-ghost btn-sm" data-clear="${p.id}">Rehacer</button>` : `<button class="btn btn-gold btn-sm" data-draw="${p.id}">Sortear</button>`}</div></div></div>`).join('') || '<div class="empty card">Agrega premios en la pestaña Rifa.</div>'}</div>`;
    for (const p of r.prizes) if (p.winner_number !== null) showWinner(p.id, p.winner_number);
    $$('[data-draw]', view).forEach((b) => b.addEventListener('click', () => draw(+b.dataset.draw, b)));
    $$('[data-clear]', view).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('¿Borrar este resultado para sortear nuevamente?')) return;
      await call(`/api/admin/prizes/${b.dataset.clear}/clear`, { method: 'POST' }); route();
    }));
  }

  async function showWinner(prizeId, number) {
    const r = raffle();
    const { orders } = await call(`/api/admin/raffles/${r.id}/orders?status=paid&q=${encodeURIComponent(fmtN(number, r))}`);
    const o = orders.find((x) => x.numbers.includes(number));
    const el = $(`#w${prizeId}`);
    if (el && o) el.innerHTML = `Ganador: <b>${esc(o.first_name)} ${esc(o.last_name)}</b> · RUT ${esc(o.rut_formatted)}<br>${esc(o.email)}${o.phone ? ` · ${esc(o.phone)}` : ''} · Comprobante ${esc(o.code)}`;
  }

  async function draw(prizeId, btn) {
    const r = raffle();
    btn.classList.add('loading');
    const slot = $(`#s${prizeId}`);
    slot.classList.add('spin');
    let res;
    try { res = await call(`/api/admin/prizes/${prizeId}/draw`, { method: 'POST', body: {} }); }
    catch (e) { btn.classList.remove('loading'); slot.classList.remove('spin'); return toast(e.message, 'error'); }
    const end = performance.now() + 3200;
    (function spin() {
      const left = end - performance.now();
      if (left > 0) {
        slot.textContent = fmtN(r.start_number + Math.floor(Math.random() * r.total_numbers), r);
        setTimeout(spin, 40 + (3200 - left) / 22);
      } else {
        slot.textContent = fmtN(res.number, r);
        slot.classList.remove('spin'); slot.classList.add('win');
        $(`#w${prizeId}`).innerHTML = `Ganador: <b>${esc(res.winner.name)}</b> · RUT ${esc(res.winner.rut)}<br>${esc(res.winner.email)}${res.winner.phone ? ` · ${esc(res.winner.phone)}` : ''} · Comprobante ${esc(res.winner.code)}`;
        btn.outerHTML = `<button class="btn btn-ghost btn-sm" data-clear="${prizeId}">Rehacer</button>`;
        $(`[data-clear="${prizeId}"]`).addEventListener('click', async () => { if (!confirm('¿Borrar este resultado para sortear nuevamente?')) return; await call(`/api/admin/prizes/${prizeId}/clear`, { method: 'POST' }); route(); });
        confetti(2600);
      }
    })();
  }

  /* ---------- Ajustes ---------- */
  function viewSettings(view) {
    const s = A.overview.settings, integ = A.overview.integrations;
    view.innerHTML = `${head('Ajustes', 'Tu negocio')}
      <div class="editor"><form id="settingsForm" class="panel" novalidate><h4>Datos visibles</h4>
        <div class="field"><label>Nombre de la marca</label><input name="business_name" value="${esc(s.business_name)}"></div>
        <div class="form-grid"><div class="field"><label>Correo de contacto</label><input name="contact_email" type="email" value="${esc(s.contact_email)}"></div>
        <div class="field"><label>WhatsApp</label><input name="contact_whatsapp" value="${esc(s.contact_whatsapp)}" placeholder="+56 9 ..."></div></div>
        <div class="field"><label>Correo donde recibir aviso de cada venta</label><input name="admin_notify_email" type="email" value="${esc(s.admin_notify_email)}"><span class="hint">Recibirás un correo con todos los datos del comprador en cada pago confirmado.</span></div>
        <div class="field"><label>Zona horaria</label><input name="timezone" value="${esc(s.timezone)}"><span class="hint">Usada en correos y en la exportación. Ej: America/Santiago</span></div>
        <div class="field"><label>Nota al pie</label><textarea name="footer_note">${esc(s.footer_note)}</textarea></div>
        <button class="btn btn-gold" type="submit" style="justify-self:start">Guardar</button>
      </form>
      <div class="panel"><h4>Conexiones del servidor</h4><div class="checklist">
        ${check(integ.mercadopago, 'Mercado Pago', integ.mercadopago ? 'Conectado.' : 'Variable <code>MP_ACCESS_TOKEN</code> (Access Token de producción de tu cuenta Mercado Pago).')}
        ${check(integ.base_url.startsWith('https://'), 'URL pública', `<code>BASE_URL</code> = ${esc(integ.base_url)}`)}
        ${check(integ.webhook_secret, 'Webhook', `En Mercado Pago → Tus integraciones → Webhooks, usa:<br><code>${esc(integ.base_url)}/api/webhooks/mercadopago</code><br>evento "Pagos" y copia la clave secreta en <code>MP_WEBHOOK_SECRET</code>.`)}
        ${check(integ.smtp, 'Correo saliente', 'Variables <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>MAIL_FROM</code>.')}
      </div></div></div>`;
    $('#settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = e.target.querySelector('[type=submit]'); b.classList.add('loading');
      try { await call('/api/admin/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); await loadOverview(); renderShell(); route(); toast('Ajustes guardados.', 'ok'); }
      catch (err) { b.classList.remove('loading'); toast(err.message, 'error'); }
    });
  }

  boot().catch((e) => { root.innerHTML = `<div class="login"><p class="muted">${esc(e.message)}</p></div>`; });
})();
