'use strict';
(async () => {
  const token = location.pathname.split('/').filter(Boolean)[1];
  try {
    const { order: o } = await api(`/api/demo/orders/${encodeURIComponent(token)}`);
    $('#sum').innerHTML = `<div class="muted" style="font-size:13px;font-weight:700">${esc(o.raffle.title)}</div>
      <div class="chips-wrap">${o.numbers.map((n) => `<span class="chip">${pad(n, o.raffle.total_numbers, o.raffle.start_number)}</span>`).join('')}</div>
      <div class="summary-row"><span>Comprador</span><span>${esc(o.first_name)} ${esc(o.last_name)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${money(o.total, o.currency)}</span></div>`;
    if (o.status !== 'pending') $$('[data-result]').forEach((b) => { b.disabled = true; });
  } catch (e) { $('#sum').textContent = e.message; }
  $$('[data-result]').forEach((b) => b.addEventListener('click', async () => {
    b.classList.add('loading');
    try { const r = await api(`/api/demo/pay/${encodeURIComponent(token)}`, { method: 'POST', body: { result: b.dataset.result } }); location.href = r.redirect; }
    catch (e) { b.classList.remove('loading'); toast(e.message, 'error'); }
  }));
})();
