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
      const r = await (await fetch(`${API}?${new URLSearchParams({ action: 'obtenerHistorias', vendedorUid: uid })}`)).json();
      historias = r.ok ? (r.historias || []).slice().reverse() : [];
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

  function inyectar(gridEl, mostrar) {
    if (!gridEl) return;
    gridEl.querySelectorAll('.profile-historia-card').forEach(n => n.remove());
    if (mostrar === false || !cargado || !historias.length) return;
    css();
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
