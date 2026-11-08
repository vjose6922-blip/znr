/**
 * historias-perfil.js — Historias del vendedor dentro de perfil-vendedor.html.
 * Las historias vigentes se muestran como tarjetas, PRIMERAS en la cuadrícula
 * de productos (antes que los artículos). Al tocar una se abre el visor.
 *
 *   znrHistoriasPerfil.cargar(uid)            -> baja las historias (una vez)
 *   znrHistoriasPerfil.inyectar(gridEl, ok)   -> las antepone a la cuadrícula
 *                                                (ok=false las oculta, ej. con filtros activos)
 */
(function () {
  'use strict';
  if (window.znrHistoriasPerfil) return;

  const API = 'https://historias-api-1038143238323.us-central1.run.app';
  let historias = [];   // la más vieja primero, para verlas en orden cronológico
  let cargado = false;
  let grupos = [];      // destacadas (vendedor Pro): [{ id, nombre, items }]

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function css() {
    if (document.getElementById('zhp-css')) return;
    const st = document.createElement('style');
    st.id = 'zhp-css';
    st.textContent = `
      .profile-historia-card{cursor:pointer;-webkit-tap-highlight-color:transparent}
      .zhp-media{position:relative;aspect-ratio:1/1;overflow:hidden;background:var(--gradient-accent,#7c3aed)}
      .zhp-media img,.zhp-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
      .zhp-badge{position:absolute;top:8px;left:8px;z-index:2;padding:3px 9px;border-radius:30px;background:var(--gradient-accent,linear-gradient(135deg,#e11d48,#f97316));color:#fff;font-size:10px;font-weight:800;letter-spacing:.3px;box-shadow:0 2px 6px rgba(0,0,0,.25)}
      .zhp-play{position:absolute;right:8px;bottom:8px;z-index:2;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:none}
      .zhp-dest{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 14px;scrollbar-width:none}
      .zhp-dest button{flex-shrink:0;width:68px;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;padding:0;color:inherit;cursor:pointer;font-family:inherit}
      .zhp-dest .c{width:62px;height:62px;border-radius:50%;padding:2.5px;box-sizing:border-box;background:linear-gradient(135deg,#d97706,#fbbf24)}
      .zhp-dest .c img,.zhp-dest .c video{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #fff;box-sizing:border-box;display:block;pointer-events:none}
      .zhp-dest small{max-width:68px;font-size:.72rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .zhp-ver{display:block;width:100%;margin-top:8px;padding:9px 10px;border:none;border-radius:10px;background:var(--gradient-accent,linear-gradient(135deg,#e11d48,#f97316));color:#fff;font:700 .8rem inherit;font-family:inherit;cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  function restante(iso) {
    const min = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000));
    return min >= 60 ? 'Expira en ' + Math.floor(min / 60) + ' h' : 'Expira en ' + min + ' min';
  }

  async function cargar(uid) {
    if (!uid) return;
    try {
      const pedir = (action) => fetch(`${API}?${new URLSearchParams({ action, vendedorUid: uid })}`).then((x) => x.json());
      const [r, d] = await Promise.all([pedir('obtenerHistorias'), pedir('obtenerDestacadas').catch(() => ({}))]);
      grupos = ((d && d.grupos) || []).filter((g) => g.items && g.items.length).map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, vendedorUid: uid })) }));
      historias = r.ok ? (r.historias || []).slice().reverse() : [];
      // Enlace de la notificación de mención (?historia=ID): abre esa historia directo.
      const i = historias.findIndex(h => h.id === new URLSearchParams(location.search).get('historia'));
      if (i >= 0) setTimeout(() => abrirVisor(i), 300);
    } catch (_) {
      historias = [];
    }
    cargado = true;
  }

  function tarjeta(h, i) {
    const media = h.tipo === 'video'
      ? `<video src="${esc(h.url)}#t=0.1" muted playsinline preload="metadata" tabindex="-1" onerror="this.remove()"></video><span class="zhp-play">${typeof window.Icon === 'function' ? window.Icon('play', { size: 12 }) : '▶'}</span>`
      : `<img src="${esc(h.url)}" alt="Historia" loading="lazy" onerror="this.remove()">`;
    return `
      <div class="profile-product-card profile-historia-card" data-historia-idx="${i}" role="button" tabindex="0" aria-label="Ver historia" style="animation-delay:${Math.min(i, 8) * 0.04}s">
        <div class="zhp-media"><span class="zhp-badge">HISTORIA</span>${media}</div>
        <div class="profile-product-info">
          <div class="profile-product-name">${h.tipo === 'video' ? 'Historia en video' : 'Historia en foto'}</div>
          <div class="profile-product-stockline"><span class="profile-stock-ok" style="color:#a855f7;">${esc(restante(h.expiraEn))}</span></div>
          <button type="button" class="zhp-ver">Ver historia</button>
        </div>
      </div>`;
  }

  function abrirVisor(i) {
    if (!window.znrHistoriasVisor || !historias.length) return;
    window.znrHistoriasVisor.abrir(historias, {
      indice: i,
      nombre: historias[0].vendedor,
      logo: historias[0].logo,
      reportar: true
    });
  }

  // Destacadas: círculos con nombre arriba de los productos; cada uno abre su grupo en el visor.
  function pintarDestacadas(gridEl) {
    if (!grupos.length || document.getElementById('zhp-dest')) return;
    const cont = gridEl.closest('.profile-products') || gridEl.parentNode;
    const row = document.createElement('div');
    row.id = 'zhp-dest'; row.className = 'zhp-dest';
    row.innerHTML = grupos.map((g, i) => {
      const p = g.items[0];
      return `<button type="button" data-g="${i}" aria-label="Destacadas: ${esc(g.nombre)}"><span class="c">${p.tipo === 'video'
        ? `<video src="${esc(p.url)}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${esc(p.url)}" alt="" loading="lazy">`}</span><small>${esc(g.nombre)}</small></button>`;
    }).join('');
    row.addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (!b || !window.znrHistoriasVisor) return;
      const nombre = (document.querySelector('.profile-name') || {}).firstChild;
      window.znrHistoriasVisor.abrir(grupos[+b.dataset.g].items, { nombre: nombre ? nombre.textContent : 'Vendedor', nivel: 'pro', reportar: true });
    });
    cont.insertBefore(row, cont.firstChild);
  }

  function inyectar(gridEl, mostrar) {
    if (!gridEl) return;
    css();
    pintarDestacadas(gridEl);
    gridEl.querySelectorAll('.profile-historia-card').forEach(n => n.remove());
    if (mostrar === false || !cargado || !historias.length) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = historias.map(tarjeta).join('');
    const nodos = [...wrap.children];
    nodos.reverse().forEach(n => gridEl.insertBefore(n, gridEl.firstChild));
    // Se quita el mensaje "sin productos" si solo había historias
    const vacio = gridEl.querySelector('.empty-products');
    if (vacio) vacio.style.gridColumn = '1 / -1';
    gridEl.querySelectorAll('.profile-historia-card').forEach(card => {
      const abrir = () => abrirVisor(Number(card.dataset.historiaIdx));
      card.addEventListener('click', abrir);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    });
  }

  window.znrHistoriasPerfil = { cargar, inyectar };
})();
