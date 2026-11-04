'use strict';
(() => {
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
  const BLOCK = 100;
  const S = {
    raffle: null, sold: new Set(), reserved: new Set(), selected: new Set(),
    filter: 'all', query: '', block: 0, buttons: new Map(), lucky: 1, timer: null
  };
  const selKey = `rifa:sel:${slug}`;

  document.getElementById('navSlot').outerHTML = navHtml('<a href="#premios">Premios</a><a href="#numeros">Números</a><a href="#bases" data-bases-link hidden>Bases</a><a href="#numeros" class="btn btn-gold btn-sm">Participar</a>');
  $$('[data-icon]').forEach((el) => { el.outerHTML = ICONS[el.dataset.icon] || ''; });
  initChrome();

  const fmt = (n) => pad(n, S.raffle.total_numbers, S.raffle.start_number);
  const isTaken = (n) => S.sold.has(n) || S.reserved.has(n);

  async function load() {
    try {
      const [{ raffle, tickets }, site] = await Promise.all([api(`/api/raffles/${encodeURIComponent(slug)}`), api('/api/site')]);
      S.raffle = raffle;
      applyTickets(tickets, raffle.stats, false);
      setBrand(site.business_name);
      renderSite(site);
      renderHero();
      renderPrizes();
      restoreSelection();
      renderRanges();
      renderGrid();
      connectLive();
    } catch (e) {
      $('#main').innerHTML = `<div class="center-page"><div class="status-card card"><div class="status-icon bad">${ICONS.x}</div><h1 class="display h-md">Rifa no disponible</h1><p class="muted">${esc(e.message)}</p><a class="btn" href="/">Volver al inicio</a></div></div>`;
    }
  }

  function renderSite(site) {
    $('#footerNote').textContent = site.footer_note || '';
    const c = [];
    if (site.contact_email) c.push(`<a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a>`);
    if (site.contact_whatsapp) c.push(`<a href="https://wa.me/${esc(site.contact_whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp ${esc(site.contact_whatsapp)}</a>`);
    $('#footerContact').innerHTML = c.join('<br>');
    if (site.demo_payments && !(() => { try { return sessionStorage.getItem('rifa:demo'); } catch { return null; } })()) { try { sessionStorage.setItem('rifa:demo', '1'); } catch { /* ignorar */ } toast('Modo demostración: los pagos son simulados hasta configurar Mercado Pago.', 'info', 6000); }
  }

  function renderHero() {
    const r = S.raffle;
    document.title = `${r.title} · Rifa`;
    $('#heroTitle').innerHTML = titleHtml(r.title);
    $('#heroSubtitle').textContent = r.subtitle || r.description.split('\n')[0] || '';
    $('#heroPrice').textContent = money(r.ticket_price, r.currency);
    $('#resMinutes').textContent = r.reservation_minutes;
    if (r.draw_date) {
      $('#heroEyebrow').textContent = `Sorteo · ${fmtDate(r.draw_date)}`;
      $('#drawInfo').innerHTML = `${ICONS.calendar.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px;color:var(--gold)"')}Sorteo el ${esc(fmtDate(r.draw_date, { weekday: 'long', hour: '2-digit', minute: '2-digit' }))}`;
      startCountdown(new Date(r.draw_date));
    }
    if (r.status !== 'active') {
      $('#heroEyebrow').textContent = r.status === 'drawn' ? 'Sorteo realizado' : 'Venta cerrada';
    }
    const frame = $('#heroFrame');
    const first = r.prizes[0];
    if (r.cover_image) {
      frame.innerHTML = `<img src="${esc(r.cover_image)}" alt="${esc(r.title)}"><div class="caption"><div>${first ? `<small>Primer premio</small><strong>${esc(first.title)}</strong>` : ''}</div></div>`;
    } else {
      frame.innerHTML = `<div class="ticket-art"><div class="stub"><small>${esc(r.title).slice(0, 40)}</small><b>${money(r.ticket_price, r.currency)}</b><span class="n">N° ${fmt(r.start_number + Math.floor(r.total_numbers / 3))}</span></div></div>${first ? `<div class="caption"><div><small>Primer premio</small><strong>${esc(first.title)}</strong></div></div>` : ''}`;
    }
    if (r.terms) { $('#bases').hidden = false; $('#termsContent').textContent = r.terms; const l = $('[data-bases-link]'); if (l) l.hidden = false; }
    updateStats(r.stats);
  }

  function titleHtml(t) {
    // Destaca en dorado la última palabra del título
    const words = esc(t).split(' ');
    if (words.length < 2) return `<span class="gold-text">${words[0]}</span>`;
    const last = words.pop();
    return `${words.join(' ')} <span class="gold-text">${last}</span>`;
  }

  function updateStats(st) {
    $('#soldCount').textContent = st.sold.toLocaleString('es-CL');
    $('#totalCount').textContent = st.total.toLocaleString('es-CL');
    $('#percent').textContent = `${st.percent.toLocaleString('es-CL')}%`;
    requestAnimationFrame(() => { $('#progressBar').style.width = `${Math.max(st.percent, st.sold ? 1.5 : 0)}%`; });
    $('#availableLabel').textContent = `${st.available.toLocaleString('es-CL')} disponibles`;
  }

  function startCountdown(target) {
    const el = $('#countdown');
    const tick = () => {
      const ms = target - Date.now();
      if (ms <= 0) { el.hidden = true; clearInterval(S.timer); return; }
      el.hidden = false;
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      for (const [k, v] of Object.entries({ d, h, m, s })) $(`[data-cd="${k}"]`, el).textContent = String(v).padStart(2, '0');
    };
    tick(); S.timer = setInterval(tick, 1000);
  }

  function renderPrizes() {
    const wrap = $('#prizes');
    const list = S.raffle.prizes;
    if (!list.length) { $('#premios').hidden = true; return; }
    wrap.innerHTML = list.map((p, i) => `
      <article class="prize reveal" style="transition-delay:${i * 80}ms">
        <div class="prize-media">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="placeholder">${ICONS.gift}</div>`}<span class="prize-rank">${i + 1}° premio</span></div>
        <div class="prize-body"><h3>${esc(p.title)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}
          ${p.winner_number !== null && p.winner_number !== undefined ? `<div class="winner">${ICONS.ticket.replace('<svg', '<svg style="width:18px;height:18px;color:var(--gold)"')}Número ganador <b>${fmt(p.winner_number)}</b></div>` : ''}
        </div>
      </article>`).join('');
    observeReveal(wrap);
  }

  /* ---------- Tablero ---------- */
  function blocksCount() { return S.raffle.total_numbers > 300 ? Math.ceil(S.raffle.total_numbers / BLOCK) : 1; }

  function renderRanges() {
    const n = blocksCount();
    const el = $('#ranges');
    if (n <= 1) { el.hidden = true; return; }
    el.hidden = false;
    const r = S.raffle;
    el.innerHTML = Array.from({ length: n }, (_, i) => {
      const a = r.start_number + i * BLOCK, b = Math.min(a + BLOCK - 1, r.start_number + r.total_numbers - 1);
      return `<button type="button" data-block="${i}" aria-pressed="${i === S.block}">${fmt(a)}–${fmt(b)}</button>`;
    }).join('');
    updateRangeBadges();
  }

  function updateRangeBadges() {
    if (blocksCount() <= 1) return;
    const counts = {};
    for (const n of S.selected) { const b = Math.floor((n - S.raffle.start_number) / BLOCK); counts[b] = (counts[b] || 0) + 1; }
    $$('#ranges button').forEach((btn) => {
      const c = counts[btn.dataset.block];
      btn.querySelector('.badge')?.remove();
      if (c) btn.insertAdjacentHTML('beforeend', `<span class="badge">${c}</span>`);
    });
  }

  function visibleNumbers() {
    const r = S.raffle;
    const end = r.start_number + r.total_numbers - 1;
    let list = [];
    if (S.query) {
      const q = S.query;
      for (let n = r.start_number; n <= end && list.length < 300; n++) if (fmt(n).includes(q) || String(n) === q) list.push(n);
    } else {
      const a = blocksCount() > 1 ? r.start_number + S.block * BLOCK : r.start_number;
      const b = blocksCount() > 1 ? Math.min(a + BLOCK - 1, end) : end;
      for (let n = a; n <= b; n++) list.push(n);
    }
    if (S.filter === 'free') list = list.filter((n) => !isTaken(n) || S.selected.has(n));
    return list;
  }

  function renderGrid() {
    const grid = $('#grid');
    const nums = visibleNumbers();
    S.buttons.clear();
    if (!nums.length) { grid.innerHTML = `<div class="grid-empty">${S.query ? 'No encontramos ese número.' : 'No quedan números disponibles en este rango.'}</div>`; return; }
    const frag = document.createDocumentFragment();
    for (const n of nums) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'num'; b.dataset.n = n;
      b.innerHTML = `<span>${fmt(n)}</span>`;
      paint(b, n);
      S.buttons.set(n, b);
      frag.append(b);
    }
    grid.replaceChildren(frag);
  }

  function paint(b, n) {
    const sold = S.sold.has(n), res = S.reserved.has(n) && !S.selected.has(n), sel = S.selected.has(n);
    b.classList.toggle('sold', sold);
    b.classList.toggle('reserved', res && !sold);
    b.setAttribute('aria-pressed', String(sel));
    b.disabled = (sold || res) && !sel;
    b.setAttribute('aria-label', `Número ${fmt(n)}${sold ? ', vendido' : res ? ', en proceso de pago' : sel ? ', seleccionado' : ', disponible'}`);
    b.title = sold ? 'Vendido' : res ? 'Reservado por otra persona' : '';
  }

  function toggle(n) {
    if (S.selected.has(n)) S.selected.delete(n);
    else {
      if (isTaken(n)) return;
      if (S.raffle.status !== 'active') { toast('Esta rifa no está recibiendo compras.', 'error'); return; }
      if (S.selected.size >= S.raffle.max_per_order) { toast(`Puedes elegir hasta ${S.raffle.max_per_order} números por compra.`, 'error'); return; }
      S.selected.add(n);
      const b = S.buttons.get(n); if (b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    }
    const b = S.buttons.get(n); if (b) paint(b, n);
    onSelectionChange();
  }

  function onSelectionChange() {
    const r = S.raffle;
    const list = [...S.selected].sort((a, b) => a - b);
    $('#cartbar').classList.toggle('show', list.length > 0);
    $('#cartCount').textContent = `${list.length} número${list.length === 1 ? '' : 's'}`;
    $('#cartTotal').textContent = money(list.length * r.ticket_price, r.currency);
    $('#cartChips').innerHTML = list.slice(0, 14).map((n) => `<span class="chip">${fmt(n)}<button type="button" data-unsel="${n}" aria-label="Quitar ${fmt(n)}">×</button></span>`).join('') + (list.length > 14 ? `<span class="chip">+${list.length - 14}</span>` : '');
    updateRangeBadges();
    store.set(selKey, list);
  }

  function restoreSelection() {
    for (const n of store.get(selKey, [])) if (!isTaken(n) && n >= S.raffle.start_number && n < S.raffle.start_number + S.raffle.total_numbers) S.selected.add(n);
    if (S.selected.size) onSelectionChange();
  }

  function applyTickets(t, stats, animate = true) {
    const prevSold = S.sold, prevRes = S.reserved;
    S.sold = new Set(t.sold); S.reserved = new Set(t.reserved);
    const lost = [];
    for (const n of S.selected) if (S.sold.has(n) || (S.reserved.has(n) && !prevRes.has(n) && !prevSold.has(n) && !S.pendingMine?.has(n))) lost.push(n);
    if (S.raffle) {
      for (const n of lost) S.selected.delete(n);
      for (const [n, b] of S.buttons) {
        const was = prevSold.has(n) || prevRes.has(n), now = isTaken(n);
        paint(b, n);
        if (animate && now && !was) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
      }
      if (lost.length) { toast(`El número ${lost.map(fmt).join(', ')} acaba de ser tomado por otra persona.`, 'error'); onSelectionChange(); }
      if (stats) updateStats(stats);
    }
  }

  function connectLive() {
    let es, retry = 1000, poll;
    const open = () => {
      if (!('EventSource' in window)) return startPoll();
      es = new EventSource(`/api/raffles/${encodeURIComponent(slug)}/stream`);
      es.addEventListener('tickets', (e) => { retry = 1000; const d = JSON.parse(e.data); applyTickets(d.tickets, d.stats); });
      es.onerror = () => { es.close(); setTimeout(open, retry = Math.min(retry * 2, 20000)); };
    };
    const startPoll = () => { poll = setInterval(refresh, 8000); };
    open();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    return () => { es?.close(); clearInterval(poll); };
  }

  async function refresh() {
    try { const d = await api(`/api/raffles/${encodeURIComponent(slug)}/tickets`); applyTickets(d.tickets, d.stats); } catch { /* reintento en el próximo ciclo */ }
  }

  function lucky() {
    const r = S.raffle;
    if (r.status !== 'active') return toast('Esta rifa no está recibiendo compras.', 'error');
    const room = r.max_per_order - S.selected.size;
    if (room <= 0) return toast(`Ya tienes el máximo de ${r.max_per_order} números.`, 'error');
    const want = Math.min(S.lucky, room);
    const end = r.start_number + r.total_numbers;
    const free = [];
    if (r.total_numbers <= 20000) { for (let n = r.start_number; n < end; n++) if (!isTaken(n) && !S.selected.has(n)) free.push(n); }
    const picks = [];
    if (free.length) {
      for (let i = 0; i < want && free.length; i++) picks.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
    } else {
      for (let tries = 0; picks.length < want && tries < 5000; tries++) {
        const n = r.start_number + Math.floor(Math.random() * r.total_numbers);
        if (!isTaken(n) && !S.selected.has(n) && !picks.includes(n)) picks.push(n);
      }
    }
    if (!picks.length) return toast('No quedan números disponibles.', 'error');
    picks.forEach((n) => S.selected.add(n));
    if (blocksCount() > 1 && !S.query) {
      S.block = Math.floor((picks[0] - r.start_number) / BLOCK);
      $$('#ranges button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.block === S.block)));
    }
    renderGrid();
    picks.forEach((n, i) => { const b = S.buttons.get(n); if (b) setTimeout(() => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }, i * 90); });
    onSelectionChange();
    toast(`¡La suerte eligió ${picks.map(fmt).join(', ')}!`, 'ok');
  }

  /* ---------- Checkout ---------- */
  const dlg = $('#checkout');
  const form = $('#checkoutForm');

  function openCheckout() {
    const r = S.raffle;
    const list = [...S.selected].sort((a, b) => a - b);
    if (!list.length) return;
    $('#sumChips').innerHTML = list.map((n) => `<span class="chip">${fmt(n)}</span>`).join('');
    $('#sumQty').textContent = `${list.length} × ${money(r.ticket_price, r.currency)}`;
    $('#sumUnit').textContent = '';
    $('#sumTotal').textContent = money(list.length * r.ticket_price, r.currency);
    $('#payTotal').textContent = `· ${money(list.length * r.ticket_price, r.currency)}`;
    const saved = store.get('rifa:buyer', null);
    if (saved) for (const [k, v] of Object.entries(saved)) { const i = form.elements[k]; if (i && !i.value) i.value = v; }
    if (saved?.email && !form.elements.email2.value) form.elements.email2.value = saved.email;
    dlg.showModal();
    document.body.style.overflow = 'hidden';
  }
  function closeCheckout() { dlg.close(); }
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { closeCheckout(); } else if (e.target.classList.contains('sheet-wrap')) closeCheckout(); });

  form.elements.rut.addEventListener('input', (e) => { e.target.value = rutFormat(e.target.value); });
  form.elements.rut.addEventListener('blur', (e) => { if (e.target.value) setErr('rut', rutValid(e.target.value) ? '' : 'Revisa el RUT y su dígito verificador.', true); });
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f?.classList.contains('invalid')) setErr(e.target.name, ''); });

  function setErr(name, msg, markValid) {
    const input = form.elements[name]; if (!input) return;
    const f = input.closest('.field');
    f.classList.toggle('invalid', Boolean(msg));
    f.classList.toggle('valid', Boolean(markValid && !msg));
    $('.err', f).textContent = msg || '';
  }

  function validate() {
    const v = Object.fromEntries(new FormData(form));
    const errs = {};
    if ((v.first_name || '').trim().length < 2) errs.first_name = 'Ingresa tu nombre.';
    if ((v.last_name || '').trim().length < 2) errs.last_name = 'Ingresa tu apellido.';
    if (!rutValid(v.rut)) errs.rut = 'Revisa el RUT y su dígito verificador.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.email || '').trim())) errs.email = 'Ingresa un correo válido.';
    else if ((v.email || '').trim().toLowerCase() !== (v.email2 || '').trim().toLowerCase()) errs.email2 = 'Los correos no coinciden.';
    if (v.phone && !/^[+\d][\d\s()-]{6,}$/.test(v.phone)) errs.phone = 'Revisa el teléfono.';
    if (!form.elements.accept_terms.checked) errs.accept_terms = 'Debes aceptar las bases para continuar.';
    ['first_name', 'last_name', 'rut', 'email', 'email2', 'phone', 'accept_terms'].forEach((k) => setErr(k, errs[k] || ''));
    const first = Object.keys(errs)[0];
    if (first) form.elements[first].focus();
    return first ? null : v;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    const btn = $('#payBtn');
    btn.classList.add('loading');
    const numbers = [...S.selected];
    try {
      const buyer = { first_name: v.first_name.trim(), last_name: v.last_name.trim(), rut: v.rut, email: v.email.trim(), phone: v.phone.trim() };
      store.set('rifa:buyer', buyer);
      S.pendingMine = new Set(numbers);
      const res = await api(`/api/raffles/${encodeURIComponent(slug)}/orders`, { method: 'POST', body: { ...buyer, numbers, accept_terms: true } });
      const mine = store.get('rifa:orders', []);
      mine.unshift({ token: res.token, code: res.code, slug, at: Date.now() });
      store.set('rifa:orders', mine.slice(0, 20));
      store.set(selKey, []);
      btn.innerHTML = 'Redirigiendo a Mercado Pago…';
      location.href = res.checkout_url;
    } catch (err) {
      btn.classList.remove('loading');
      S.pendingMine = null;
      if (err.taken?.length) {
        err.taken.forEach((n) => S.selected.delete(n));
        await refresh();
        renderGrid(); onSelectionChange();
        toast(`Los números ${err.taken.map(fmt).join(', ')} ya no están disponibles. Los quitamos de tu selección.`, 'error', 6500);
        if (!S.selected.size) closeCheckout(); else openCheckout();
      } else if (err.fields) {
        Object.entries(err.fields).forEach(([k, m]) => setErr(k, m));
        toast(err.message, 'error');
      } else toast(err.message, 'error');
    }
  });

  /* ---------- Eventos ---------- */
  $('#grid').addEventListener('click', (e) => { const b = e.target.closest('.num'); if (b) toggle(Number(b.dataset.n)); });
  $('#ranges').addEventListener('click', (e) => {
    const b = e.target.closest('[data-block]'); if (!b) return;
    S.block = Number(b.dataset.block);
    $$('#ranges button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderGrid();
  });
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    S.filter = b.dataset.filter;
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderGrid();
  }));
  let searchT;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { S.query = e.target.value.replace(/\D/g, ''); $('#ranges').style.opacity = S.query ? '.35' : ''; renderGrid(); }, 120);
  });
  $('#luckyMinus').addEventListener('click', () => { S.lucky = Math.max(1, S.lucky - 1); $('#luckyQty').textContent = S.lucky; });
  $('#luckyPlus').addEventListener('click', () => { S.lucky = Math.min(S.raffle?.max_per_order || 10, S.lucky + 1); $('#luckyQty').textContent = S.lucky; });
  $('#luckyBtn').addEventListener('click', lucky);
  $('#cartChips').addEventListener('click', (e) => { const b = e.target.closest('[data-unsel]'); if (b) toggle(Number(b.dataset.unsel)); });
  $('#clearSel').addEventListener('click', () => { const was = [...S.selected]; S.selected.clear(); was.forEach((n) => { const b = S.buttons.get(n); if (b) paint(b, n); }); onSelectionChange(); });
  $('#continueBtn').addEventListener('click', openCheckout);

  load();
})();
