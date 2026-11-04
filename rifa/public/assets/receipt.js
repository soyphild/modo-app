'use strict';
(async () => {
  document.getElementById('navSlot').outerHTML = navHtml();
  initChrome();
  const token = location.pathname.split('/').filter(Boolean)[1];
  const el = $('#receipt');
  try {
    const [{ order: o }, site] = await Promise.all([api(`/api/orders/${encodeURIComponent(token)}`), api('/api/site')]);
    setBrand(site.business_name);
    if (o.status !== 'paid') { location.replace(`/pago/${encodeURIComponent(token)}`); return; }
    document.title = `Comprobante ${o.code}`;
    const nums = o.numbers.map((n) => pad(n, o.raffle.total_numbers, o.raffle.start_number));
    el.innerHTML = `
      <article class="rc">
        <div class="rc-top"><span class="rc-status">${ICONS.check}Pagado</span>
          <span class="eyebrow">Comprobante de participación</span>
          <h1>${esc(o.raffle.title)}</h1>
          <p>${o.raffle.draw_date ? `Sorteo: ${esc(fmtDate(o.raffle.draw_date, { hour: '2-digit', minute: '2-digit' }))}` : esc(site.business_name)}</p>
        </div>
        <div class="rc-cut"><i></i></div>
        <div class="rc-body">
          <p class="rc-label">${nums.length === 1 ? 'Tu número' : `Tus ${nums.length} números`}</p>
          <div class="rc-nums">${nums.map((n) => `<span>${n}</span>`).join('')}</div>
          <table class="rc-table">
            <tr><td>Participante</td><td>${esc(o.first_name)} ${esc(o.last_name)}</td></tr>
            <tr><td>RUT</td><td>${esc(o.rut)}</td></tr>
            <tr><td>Correo</td><td>${esc(o.email)}</td></tr>
            <tr><td>Monto pagado</td><td>${money(o.amount_paid ?? o.total, o.currency)}</td></tr>
            <tr><td>Medio de pago</td><td>${esc(o.payment_label)}${o.card_last_four ? ` •••• ${esc(o.card_last_four)}` : ''}${o.installments > 1 ? ` · ${o.installments} cuotas` : ''}</td></tr>
            ${o.mp_payment_id ? `<tr><td>ID de transacción</td><td>${esc(o.mp_payment_id)}</td></tr>` : ''}
            <tr><td>Fecha y hora</td><td>${fmtDateTime(o.paid_at)}</td></tr>
          </table>
          <div class="rc-foot"><span>N° de comprobante</span><span class="rc-code">${esc(o.code)}</span></div>
        </div>
      </article>
      <div class="rc-actions"><button class="btn btn-gold" id="printBtn">${ICONS.print}Imprimir o guardar PDF</button><a class="btn" href="/r/${encodeURIComponent(o.raffle.slug)}">Volver a la rifa</a></div>`;
    $('#printBtn').addEventListener('click', () => print());
  } catch (e) {
    el.innerHTML = `<div class="status-card card"><div class="status-icon bad">${ICONS.x}</div><h1 class="display h-md">Comprobante no encontrado</h1><p class="muted">${esc(e.message)}</p></div>`;
  }
})();
