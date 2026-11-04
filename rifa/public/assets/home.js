'use strict';
(async () => {
  document.getElementById('navSlot').outerHTML = navHtml();
  initChrome();
  const main = $('#main');
  try {
    const site = await api('/api/site');
    setBrand(site.business_name);
    document.title = site.business_name;
    const active = site.raffles.filter((r) => r.status === 'active');
    if (site.raffles.length === 1 || active.length === 1) {
      location.replace(`/r/${encodeURIComponent((active[0] || site.raffles[0]).slug)}`);
      return;
    }
    if (!site.raffles.length) {
      main.innerHTML = `<div class="center-page"><div class="status-card"><span class="eyebrow" style="justify-content:center">Muy pronto</span>
        <h1 class="display h-lg" style="margin:16px 0">Una nueva rifa <span class="gold-text">se acerca</span></h1>
        <p class="muted">Estamos preparando los premios. Vuelve pronto.</p></div></div>`;
      return;
    }
    main.innerHTML = `<section class="hero"><div class="container">
        <span class="eyebrow">${esc(site.business_name)}</span>
        <h1 class="display h-xl" style="margin:20px 0 14px">Elige tu <span class="gold-text">rifa</span></h1>
        <p class="lead">Selecciona una rifa para ver sus premios y elegir tus números.</p>
      </div></section>
      <section class="section" style="padding-top:0"><div class="container"><div class="prizes">
      ${site.raffles.map((r, i) => `
        <a class="prize reveal" href="/r/${encodeURIComponent(r.slug)}" style="text-decoration:none;transition-delay:${i * 70}ms">
          <div class="prize-media">${r.cover_image ? `<img src="${esc(r.cover_image)}" alt="" loading="lazy">` : `<div class="placeholder">${ICONS.ticket}</div>`}
            <span class="prize-rank">${r.status === 'active' ? 'En venta' : r.status === 'drawn' ? 'Sorteada' : 'Cerrada'}</span></div>
          <div class="prize-body"><h3>${esc(r.title)}</h3><p>${esc(r.subtitle || '')}</p>
            <div class="progress" style="margin:18px 0 0"><div class="progress-head"><span><b>${money(r.ticket_price, r.currency)}</b> por número</span><span>${r.stats.percent}% vendido</span></div><div class="bar"><i style="width:${r.stats.percent}%"></i></div></div>
          </div></a>`).join('')}
      </div></div></section>`;
    observeReveal(main);
  } catch (e) {
    main.innerHTML = `<div class="center-page"><p class="muted">No pudimos cargar la información. ${esc(e.message)}</p></div>`;
  }
})();
