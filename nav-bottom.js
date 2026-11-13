// Barra de abajo (6 botones por página) y carrito flotante: una sola tabla para todas las páginas.
// Para cambiar un botón, cambia la tabla PAGINAS. La página en la que estás no aparece en su propia barra.
(function () {
  'use strict';
  const BOTONES = {
    inicio:    ['Inicio', 'home', 'index.html'],
    catalogo:  ['Catálogo', 'catalog', 'catalogo.html'],
    outfit:    ['Outfit', 'outfit', 'outfit.html'],
    comunidad: ['Comunidad', 'community', 'comunidad.html'],
    vendedor:  ['Vendedor', 'vendor', 'vendedor.html'],
    actividad: ['Actividad', 'fire', 'feed-actividad.html'],
    envivo:    ['En vivo', 'signal', 'lives.html'],
    donar:     ['Donar', 'gift', 'refugios.html'],
    favoritos: ['Favoritos', 'heart', () => window.openWishlistDrawer?.()],
    vermas:    ['Ver más', 'more', () => window.openSettingsModal?.()],
  };
  const PAGINAS = {
    'index':           ['catalogo', 'outfit', 'comunidad', 'vendedor', 'actividad', 'envivo'],
    'catalogo':        ['inicio', 'outfit', 'comunidad', 'vendedor', 'actividad', 'favoritos'],
    'outfit':          ['inicio', 'catalogo', 'comunidad', 'vendedor', 'actividad', 'favoritos'],
    'armar-outfit':    ['inicio', 'catalogo', 'outfit', 'vendedor', 'comunidad', 'actividad'],
    'comunidad':       ['inicio', 'catalogo', 'outfit', 'donar', 'vendedor', 'actividad'],
    'refugios':        ['inicio', 'catalogo', 'outfit', 'comunidad', 'vendedor', 'actividad'],
    'vendedor':        ['inicio', 'catalogo', 'outfit', 'comunidad', 'actividad', 'vermas'], // sin sesión, sin "Ver más"
    'perfil-vendedor': ['inicio', 'catalogo', 'outfit', 'comunidad', 'vendedor', 'actividad'],
    'feed-actividad':  ['inicio', 'catalogo', 'outfit', 'comunidad', 'envivo', 'vendedor'],
    'lives':           ['inicio', 'catalogo', 'outfit', 'comunidad', 'vendedor', 'actividad'],
  };
  const SIN_CARRITO = ['lives'];
  const pagina = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  if (!PAGINAS[pagina]) return;

  const ico = (n) => `<svg width="22" height="22" aria-hidden="true"><use href="#ic-${n}"/></svg>`;
  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || def); } catch (_) { return JSON.parse(def); } };
  const enCarrito = () => Object.values(leer('cart', '{}')).reduce((s, i) => s + (i.quantity || 0), 0);
  const badge = (id, n) => `<span class="bottom-nav-badge" id="${id}" style="${n ? '' : 'display:none'}">${n}</span>`;

  const css = document.createElement('style');
  css.textContent = `
    .bottom-nav{padding-left:4px;padding-right:4px}
    .bottom-nav-item{flex:1 1 0;min-width:0;padding:8px 0}
    .bottom-nav-item span:not(.nav-icon){max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.2px}
    #znr-carrito{position:fixed;right:14px;bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:950;width:46px;height:46px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;border:1px solid rgba(255,255,255,.35);
      background:rgba(236,72,153,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 6px 18px rgba(0,0,0,.18);
      transition:transform .35s ease,opacity .35s ease}
    #znr-carrito.vacio{opacity:.6}
    #znr-carrito.aparte{transform:translateX(32px);opacity:.35}
    #znr-carrito .bottom-nav-badge{position:absolute;top:-3px;right:-3px}
    body:has(#floating-asistente-btn) #znr-carrito{bottom:calc(160px + env(safe-area-inset-bottom,0px))} /* encima del asistente del inicio */`;
  document.head.appendChild(css);

  function pintarBarra() {
    const conSesion = document.documentElement.hasAttribute('data-vsess');
    const claves = PAGINAS[pagina].filter((k) => k !== 'vermas' || conSesion);
    document.querySelectorAll('nav.bottom-nav').forEach((n) => n.remove());
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Navegación');
    nav.innerHTML = claves.map((k) => `<button type="button" class="bottom-nav-item" data-ir="${k}"><span class="nav-icon">${ico(BOTONES[k][1])}</span><span>${BOTONES[k][0]}</span>${
      k === 'favoritos' ? badge('bottom-wishlist-count', leer('zr_wishlist', '[]').length) : ''}</button>`).join('');
    nav.onclick = (e) => { const b = BOTONES[e.target.closest('[data-ir]')?.dataset.ir]; if (b) typeof b[2] === 'function' ? b[2]() : (location.href = b[2]); };
    document.body.appendChild(nav);
  }

  // Carrito flotante: discreto (translúcido) y se hace a un lado mientras se desplaza la página.
  function pintarCarrito() {
    const n = enCarrito();
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'znr-carrito'; b.className = n ? '' : 'vacio';
    b.setAttribute('aria-label', 'Carrito');
    b.innerHTML = ico('cart') + badge('bottom-cart-count', n);
    // Sin common.js (p. ej. Actividad) no hay carrito en la página: se abre en el inicio.
    b.onclick = () => (window.openCartDrawer ? window.openCartDrawer() : (location.href = 'index.html#carrito'));
    document.body.appendChild(b);
    const contar = () => { const c = enCarrito(); b.classList.toggle('vacio', !c); const e = document.getElementById('bottom-cart-count'); e.textContent = c; e.style.display = c ? '' : 'none'; };
    ['cartUpdated', 'storage'].forEach((ev) => window.addEventListener(ev, contar));
    let t = null;
    window.addEventListener('scroll', () => { b.classList.add('aparte'); clearTimeout(t); t = setTimeout(() => b.classList.remove('aparte'), 700); }, { passive: true });
    if (location.hash === '#carrito') setTimeout(() => window.openCartDrawer?.(), 400);
  }

  function iniciar() {
    pintarBarra();
    if (!SIN_CARRITO.includes(pagina)) pintarCarrito();
    // En el panel del vendedor la barra cambia al iniciar o cerrar sesión ("Ver más" solo con sesión).
    if (pagina === 'vendedor') new MutationObserver(pintarBarra).observe(document.documentElement, { attributes: true, attributeFilter: ['data-vsess'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
