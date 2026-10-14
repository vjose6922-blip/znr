/* Z&R motion — JS mínimo y sin dependencias. Cargar SÍNCRONO en <head> (pesa ~3 KB).
   Activa por atributos: data-anim="up|fade" (aparición), "shine", "carousel", "announce". */
(function () {
  'use strict';
  var D = document, R = D.documentElement;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in window;

  // Sin IntersectionObserver o con reduced-motion no se oculta nada: todo se ve normal.
  if (!RM && IO) R.classList.add('m-on');

  /* ── Textos de la barra de anuncios: edítalos aquí ── */
  var ANUNCIOS = [
    'Entregas a domicilio o punto intermedio',
    'Nuevos estilos cada semana',
    'Pago seguro con Mercado Pago'
  ];
  var ROTAR_MS = 0; // 0 = un mensaje distinto por visita (recomendado); 6000 = rota cada 6 s

  /* Elementos que aparecen solos aunque no lleven data-anim (también los creados por JS) */
  var AUTO = '.section-title,.products-container>.product-card,.category-card,.benefit-card,.live-card';

  function play(el, c) { // reinicia una animación de clase
    el.classList.remove(c); void el.offsetWidth; el.classList.add(c);
    setTimeout(function () { el.classList.remove(c); }, 500);
  }

  /* ── 1. Aparición al scroll, escalonada (máx. 6 pasos) ── */
  var seen = new WeakSet();
  var io = (!RM && IO) ? new IntersectionObserver(function (entries) {
    entries.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.target.compareDocumentPosition(b.target) & 4 ? -1 : 1; })
      .forEach(function (e, i) {
        e.target.style.setProperty('--i', Math.min(i, 5));
        e.target.classList.add('m-in');
        io.unobserve(e.target);
      });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;

  function scan(n) {
    if (!io || n.nodeType !== 1) return;
    var sel = AUTO + ',[data-anim="up"],[data-anim="fade"]', list = [];
    if (n.matches(sel)) list.push(n);
    list.push.apply(list, n.querySelectorAll(sel));
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      if (!el.hasAttribute('data-anim')) el.setAttribute('data-anim', 'up');
      io.observe(el);
    });
  }
  if (io) new MutationObserver(function (recs) {
    recs.forEach(function (r) { r.addedNodes.forEach(scan); });
  }).observe(R, { childList: true, subtree: true });

  /* ── 2. Corazón: latido al marcar (captura: corre antes del handler que hace stopPropagation) ── */
  D.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.wishlist-btn,.look-wishlist-btn');
    if (b && !b.classList.contains('active')) play(b, 'm-pop');
  }, true);

  /* ── 3. Carrito: el contador salta y aparece "Agregado" (solo cuando sube) ── */
  function qty(c) { var n = 0; for (var k in c) n += (c[k] && c[k].quantity) || 0; return n; }
  function stored() { try { return JSON.parse(localStorage.getItem('cart') || '{}'); } catch (_) { return {}; } }
  var last = qty(stored()), chip, tChip;
  window.addEventListener('cartUpdated', function (e) {
    var n = qty(e.detail && typeof e.detail === 'object' ? e.detail : stored());
    var up = n > last; last = n;
    if (!up) return;
    ['bottom-cart-count', 'cart-count'].forEach(function (id) { var el = D.getElementById(id); if (el) play(el, 'm-bump'); });
    var dr = D.getElementById('cart-drawer');
    if (dr && dr.classList.contains('open')) return; // dentro del carrito basta con el salto
    if (!chip) {
      chip = D.createElement('div');
      chip.className = 'm-chip'; chip.setAttribute('role', 'status');
      chip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>Agregado al carrito</span>';
      D.body.appendChild(chip);
    }
    chip.classList.remove('m-show'); void chip.offsetWidth; chip.classList.add('m-show');
    clearTimeout(tChip); tChip = setTimeout(function () { chip.classList.remove('m-show'); }, 1600);
  });

  /* ── 4. Segunda foto al pasar el mouse (solo puntero fino; en móvil ya hay swipe) ── */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var cur = null, held = null, prev = '', SHIFT = 'translateX(-100%)';
    var restore = function () {
      if (held && held.style.transform === SHIFT) held.style.transform = prev;
      held = null;
    };
    D.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var s = e.target.closest ? e.target.closest('.product-slider') : null;
      if (s === cur) return;
      restore(); cur = s;
      if (!s) return;
      var t = s.querySelector('.product-slider-track'), d = s.querySelectorAll('.slider-dot');
      if (t && d.length > 1 && d[0].classList.contains('active')) { prev = t.style.transform; t.style.transform = SHIFT; held = t; }
    });
    R.addEventListener('mouseleave', function () { restore(); cur = null; });
  }

  /* ── 5. Carrusel del hero: swipe nativo (scroll-snap) + avance cada 6 s ── */
  function carousel(el) {
    var t = el.querySelector('.m-hero-track');
    if (!t) return;
    var n = t.children.length, dots = el.querySelectorAll('.m-hero-dots i'), i = 0, quiet = 0, vis = true, raf;
    function mark() {
      i = Math.round(t.scrollLeft / t.clientWidth) || 0;
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    t.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
    ['pointerdown', 'wheel'].forEach(function (ev) { // si la persona interactúa, el autoavance espera
      t.addEventListener(ev, function () { quiet = Date.now() + 8000; }, { passive: true });
    });
    mark();
    if (RM || n < 2) return;
    if (IO) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(el);
    clearInterval(el._mt); // el hero puede repintarse: un solo temporizador
    el._mt = setInterval(function () {
      // pausa: fuera de pantalla, pestaña oculta, tocado hace poco o hay un Live activo (ese punto es el único movimiento)
      if (!vis || D.hidden || Date.now() < quiet || D.querySelector('.m-live')) return;
      t.scrollTo({ left: ((i + 1) % n) * t.clientWidth, behavior: 'smooth' });
    }, 6000);
  }
  window.znrMotion = { carousel: carousel };

  /* ── 6. Barra de anuncios y campana ── */
  function announce() {
    var el = D.querySelector('[data-anim="announce"]');
    if (!el) return;
    if (!ANUNCIOS.length) { el.remove(); return; }
    var k = 0;
    try { k = +sessionStorage.getItem('m_ann') || 0; sessionStorage.setItem('m_ann', k + 1); } catch (_) {}
    var s = D.createElement('span'), set = function (j) { s.textContent = ANUNCIOS[j % ANUNCIOS.length]; };
    el.appendChild(s); set(k);
    if (ROTAR_MS > 0 && ANUNCIOS.length > 1 && !RM) setInterval(function () {
      if (D.hidden) return;
      s.classList.add('m-out');
      setTimeout(function () { set(++k); s.classList.remove('m-out'); }, 150);
    }, ROTAR_MS);
  }
  function bell() { // la campana se inclina una vez cuando llega una notificación nueva
    var b = D.getElementById('notif-bell-btn');
    if (!b) return;
    var cnt = function () { var x = b.querySelector('.nc-badge'); return x ? parseInt(x.textContent, 10) || 0 : 0; }, n = cnt();
    new MutationObserver(function () { var m = cnt(); if (m > n) play(b, 'm-ring'); n = m; })
      .observe(b, { childList: true, subtree: true, characterData: true });
  }

  function init() { scan(D.body); announce(); bell(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
