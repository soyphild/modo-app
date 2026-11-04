'use strict';
(() => {
  document.getElementById('navSlot').outerHTML = navHtml();
  initChrome();
  api('/api/site').then((s) => setBrand(s.business_name)).catch(() => {});

  const token = location.pathname.split('/').filter(Boolean)[1];
  const params = new URLSearchParams(location.search);
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';
  const card = $('#card');
  let tries = 0, celebrated = false, timer;

  const fmtN = (o) => o.numbers.map((n) => pad(n, o.raffle.total_numbers, o.raffle.start_number));

  async function check() {
    tries++;
    try {
      const { order } = await api(`/api/orders/${encodeURIComponent(token)}${paymentId && tries < 3 ? `?payment_id=${encodeURIComponent(paymentId)}` : ''}`);
      render(order);
      if (order.status === 'pending' && tries < 120) timer = setTimeout(check, tries < 10 ? 2500 : 6000);
    } catch (e) {
      card.innerHTML = `<div class="status-icon bad">${ICONS.x}</div><h1 class="display h-md">No encontramos tu orden</h1><p class="muted">${esc(e.message)}</p><a class="btn" href="/">Volver al inicio</a>`;
    }
  }

  function render(o) {
    const nums = fmtN(o);
    const stubs = `<div class="ticket-stubs">${nums.map((n, i) => `<span class="stub-mini" style="animation-delay:${i * 90}ms">${n}</span>`).join('')}</div>`;
    const back = `/r/${encodeURIComponent(o.raffle.slug)}`;

    if (o.status === 'paid') {
      card.innerHTML = `<div class="status-icon ok">${ICONS.check}</div>
        <span class="eyebrow" style="justify-content:center">Pago confirmado</span>
        <h1 class="display h-lg" style="margin:14px 0 6px">¡Ya estás <span class="gold-text">participando!</span></h1>
        <p class="muted" style="margin:0">Enviamos tu comprobante a <b style="color:var(--ink)">${esc(o.email)}</b></p>
        ${stubs}
        <dl class="kv card" style="padding:20px;margin:0 0 24px;box-shadow:none">
          <dt>Comprobante</dt><dd>${esc(o.code)}</dd>
          <dt>Participante</dt><dd>${esc(o.first_name)} ${esc(o.last_name)}</dd>
          <dt>Monto</dt><dd>${money(o.amount_paid ?? o.total, o.currency)}</dd>
          <dt>Medio de pago</dt><dd>${esc(o.payment_label)}${o.card_last_four ? ` •••• ${esc(o.card_last_four)}` : ''}</dd>
          ${o.mp_payment_id ? `<dt>ID transacción</dt><dd>${esc(o.mp_payment_id)}</dd>` : ''}
          <dt>Fecha</dt><dd>${fmtDateTime(o.paid_at)}</dd>
        </dl>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-gold" href="/comprobante/${encodeURIComponent(token)}">Ver comprobante</a><a class="btn" href="${back}">Volver a la rifa</a></div>`;
      if (!celebrated) { celebrated = true; confetti(); }
      return;
    }
    if (o.status === 'pending') {
      const rejected = ['rejected', 'cancelled'].includes(o.mp_status);
      const mins = o.expires_at ? Math.max(0, Math.round((new Date(o.expires_at) - Date.now()) / 60000)) : null;
      card.innerHTML = `<div class="status-icon ${rejected ? 'bad' : 'wait'}">${rejected ? ICONS.x : ''}</div>
        <span class="eyebrow" style="justify-content:center">${rejected ? 'Pago rechazado' : 'Esperando confirmación'}</span>
        <h1 class="display h-md" style="margin:14px 0 8px">${rejected ? 'Tu pago no se pudo completar' : o.mp_status ? 'Tu pago se está procesando' : 'Aún no recibimos tu pago'}</h1>
        <p class="muted" style="margin:0 auto;max-width:44ch">${rejected ? 'Puedes intentar nuevamente con otro medio de pago. Tus números siguen reservados.' : 'Esta página se actualizará sola en cuanto Mercado Pago confirme la transacción.'}${mins !== null ? ` Reserva válida por <b style="color:var(--ink)">${mins} min</b>.` : ''}</p>
        ${stubs}
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${o.checkout_url ? `<a class="btn btn-gold" href="${esc(o.checkout_url)}">${rejected ? 'Reintentar pago' : 'Completar pago'}</a>` : ''}<a class="btn" href="${back}">Volver a la rifa</a></div>`;
      return;
    }
    const map = {
      expired: ['Reserva vencida', 'El tiempo para pagar terminó y los números se liberaron. Si alcanzaste a pagar, se confirmarán automáticamente apenas llegue la notificación.'],
      cancelled: ['Orden cancelada', 'Esta orden fue anulada. Puedes elegir números nuevamente.'],
      refunded: ['Pago reembolsado', 'Este pago fue devuelto y los números quedaron liberados.'],
      conflict: ['Necesitamos revisar tu compra', 'Recibimos tu pago, pero tus números fueron tomados mientras la reserva estaba vencida. El organizador te contactará para asignarte otros números o devolver tu dinero.']
    };
    const [t, d] = map[o.status] || ['Estado desconocido', ''];
    card.innerHTML = `<div class="status-icon bad">${o.status === 'expired' ? ICONS.clock : ICONS.x}</div><h1 class="display h-md" style="margin:0 0 10px">${t}</h1><p class="muted" style="max-width:46ch;margin:0 auto 24px">${d}</p><a class="btn btn-gold" href="${back}">Volver a la rifa</a>`;
  }

  check();
  addEventListener('beforeunload', () => clearTimeout(timer));
})();
