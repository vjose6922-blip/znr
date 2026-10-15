/* ============================================================
   burbuja-mensajes.js — burbujas flotantes tipo Messenger
   para mensajes de pedidos personalizados (pedido_personalizado_mensaje).

   - Lee el feed que ya carga notification-center.js (no hace consultas
     nuevas a Firestore). Debe cargarse DESPUÉS de notification-center.js.
   - 1 burbuja principal (la conversación más reciente) + hasta 3 extra
     + 1 burbuja para abrir mis-pedidos.html (solo si hay varias).
   - Al tocar una burbuja se abre una tarjeta con el mensaje y el botón
     "Abrir chat". Se puede arrastrar verticalmente.
   ============================================================ */
(function () {
  'use strict';
  if (window.__znrBurbujasMsg) return;
  window.__znrBurbujasMsg = true;

  var TIPO = 'pedido_personalizado_mensaje';
  var MAX_EXTRAS = 3;
  var API_URL = 'https://vendedores-api-1038143238323.us-central1.run.app';
  var POS_KEY = 'znr_burbuja_top';

  var stack = null;
  var card = null;
  var convs = [];
  var abierta = '';
  var vistos = {};
  var dragging = false;

  // ---------- Datos ----------
  function feed() {
    return (window.znrNotifCentro && window.znrNotifCentro.items && window.znrNotifCentro.items()) || [];
  }

  function getIdentity() {
    try {
      var stored = localStorage.getItem('vendor_session');
      if (stored) {
        var p = JSON.parse(stored);
        if (p && p.token && p.uid) return { type: 'vendedor', id: p.uid, vendorToken: p.token, telefono: p.telefono || '' };
      }
    } catch (_) {}
    var phone = localStorage.getItem('client_phone');
    if (phone) return { type: 'cliente', id: phone };
    return null;
  }

  function metaDe(n) {
    if (!n || !n.meta) return {};
    if (typeof n.meta === 'object') return n.meta;
    try { return JSON.parse(n.meta) || {}; } catch (_) { return {}; }
  }

  function pedidoIdDe(n) {
    var m = metaDe(n);
    if (m.pedidoId) return String(m.pedidoId);
    try { return new URL(n.url, location.href).searchParams.get('pedido') || ''; } catch (_) { return ''; }
  }

  function ts(n) {
    var t = new Date(n && n.fecha).getTime();
    return isNaN(t) ? 0 : t;
  }

  function agrupar(items) {
    var map = {};
    var orden = [];
    items.forEach(function (n) {
      if (!n || n.tipo !== TIPO || n.leida) return;
      var id = pedidoIdDe(n);
      if (!id) return;
      var c = map[id];
      if (!c) {
        c = map[id] = { id: id, notifs: [], ownerType: n.ownerType };
        orden.push(c);
      }
      c.notifs.push(n);
    });
    orden.forEach(function (c) {
      c.notifs.sort(function (a, b) { return ts(b) - ts(a); });
    });
    orden.sort(function (a, b) { return ts(b.notifs[0]) - ts(a.notifs[0]); });
    return orden;
  }

  function nombreDe(c) {
    var partes = String(c.notifs[0].titulo || '').split(' · ');
    return { nombre: partes[0] || 'Mensaje', producto: partes.slice(1).join(' · ') };
  }

  function colorDe(texto) {
    var h = 0;
    for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 360;
    return 'linear-gradient(135deg,hsl(' + h + ',70%,55%),hsl(' + ((h + 40) % 360) + ',70%,42%))';
  }

  function rolDe(c) { return c.ownerType === 'vendedor' ? 'vendedor' : 'comprador'; }

  function urlChat(c) {
    return 'pedido-chat.html?pedido=' + encodeURIComponent(c.id) + '&rol=' + rolDe(c);
  }

  function urlPedidos(c) {
    return 'mis-pedidos.html' + (c && rolDe(c) === 'vendedor' ? '?rol=vendedor' : '');
  }

  function fechaCorta(fecha) {
    var d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    var hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  // ---------- Marcar como leído (misma acción que notification-center.js) ----------
  function marcarLeida(n, identity) {
    n.leida = true;
    if (!identity) return Promise.resolve();
    var body = { action: 'marcarNotificacionLeida', id: n.id, ownerType: n.ownerType };
    if (n.ownerType === 'vendedor') {
      body.vendorToken = identity.vendorToken;
    } else {
      body.phone = identity.type === 'vendedor' ? identity.telefono : identity.id;
      body.compradorToken = localStorage.getItem('comprador_token') || '';
    }
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).catch(function () {});
  }

  function marcarConversacion(c) {
    var identity = getIdentity();
    var pend = c.notifs.map(function (n) { return marcarLeida(n, identity); });
    refrescarTodo();
    return Promise.all(pend);
  }

  function refrescarTodo() {
    // Actualiza badge de la campana y vuelve a pintar la burbuja.
    if (window.znrNotifCentro && window.znrNotifCentro.actualizar) window.znrNotifCentro.actualizar();
    else render();
  }

  // ---------- Estilos ----------
  function injectStyles() {
    if (document.getElementById('znb-css')) return;
    var s = document.createElement('style');
    s.id = 'znb-css';
    s.textContent = [
      '#znb-stack{position:fixed;right:10px;z-index:9000;width:58px;display:flex;flex-direction:column;align-items:center;gap:10px;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}',
      '.znb-b{position:relative;width:44px;height:44px;border-radius:50%;border:2px solid var(--color-surface,#252831);padding:0;color:#fff;font-weight:800;font-size:17px;line-height:1;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.4);transition:transform .15s ease}',
      '.znb-b.znb-main{width:58px;height:58px;font-size:23px}',
      '.znb-b:active{transform:scale(.92)}',
      '.znb-b.znb-activa{box-shadow:0 0 0 3px var(--color-accent-solid,#8b5cf6),0 4px 14px rgba(0,0,0,.4)}',
      '.znb-b.znb-nueva{animation:znb-pop .38s cubic-bezier(.2,1.4,.4,1)}',
      '.znb-b svg{width:22px;height:22px}',
      '.znb-pedidos{background:var(--color-surface-2,#3a3e4b)}',
      '.znb-count{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center;box-shadow:0 0 0 2px var(--color-surface,#252831)}',
      '#znb-card{position:fixed;z-index:9001;right:78px;width:min(310px,calc(100vw - 92px));box-sizing:border-box;background:var(--color-surface,#252831);color:var(--color-text,#f1f1f1);border:1px solid var(--color-border-subtle,rgba(255,255,255,.1));border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,.5);padding:12px;animation:znb-in .18s ease-out}',
      '.znb-head{display:flex;align-items:center;gap:10px}',
      '.znb-av{flex:0 0 auto;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:15px}',
      '.znb-who{min-width:0;flex:1}',
      '.znb-name{margin:0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.znb-prod{margin:0;font-size:12px;color:var(--color-text-muted,#9aa0ad);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.znb-x{flex:0 0 auto;border:none;background:transparent;color:var(--color-text-muted,#9aa0ad);font-size:20px;line-height:1;cursor:pointer;padding:4px 6px}',
      '.znb-msgs{margin-top:8px;max-height:200px;overflow-y:auto}',
      '.znb-msg{margin-top:6px;padding:8px 10px;border-radius:14px 14px 14px 4px;background:rgba(var(--color-accent-rgb,139,92,246),.14);font-size:13.5px;line-height:1.35;word-break:break-word}',
      '.znb-time{display:block;margin-top:3px;font-size:10.5px;color:var(--color-text-muted,#9aa0ad)}',
      '.znb-acts{display:flex;gap:8px;margin-top:10px}',
      '.znb-open{flex:1;text-align:center;text-decoration:none;padding:9px 10px;border-radius:10px;background:var(--color-accent-solid,#8b5cf6);color:#fff;font-size:13px;font-weight:700}',
      '.znb-dismiss{flex:0 0 auto;padding:9px 10px;border-radius:10px;border:1px solid var(--color-border-subtle,rgba(255,255,255,.14));background:transparent;color:var(--color-text-muted,#9aa0ad);font-size:12px;font-weight:600;cursor:pointer}',
      '@keyframes znb-pop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}',
      '@keyframes znb-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.znb-b.znb-nueva,#znb-card{animation:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- DOM ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function avatarTexto(c) {
    var n = nombreDe(c).nombre.trim();
    return (n.charAt(0) || '?').toUpperCase();
  }

  function crearBurbuja(c, principal) {
    var b = el('button', 'znb-b' + (principal ? ' znb-main' : ''), avatarTexto(c));
    b.type = 'button';
    b.dataset.id = c.id;
    b.style.background = colorDe(c.id);
    b.setAttribute('aria-label', 'Mensaje de ' + nombreDe(c).nombre);
    if (abierta === c.id) b.classList.add('znb-activa');
    if (!vistos[c.id]) {
      b.classList.add('znb-nueva');
      vistos[c.id] = true;
    }
    b.appendChild(el('span', 'znb-count', c.notifs.length > 9 ? '9+' : String(c.notifs.length)));
    b.addEventListener('click', function () { alternarCard(c.id); });
    return b;
  }

  function crearBurbujaPedidos(restantes) {
    var a = el('button', 'znb-b znb-pedidos');
    a.type = 'button';
    a.setAttribute('aria-label', 'Abrir mis pedidos');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>';
    if (restantes > 0) a.appendChild(el('span', 'znb-count', '+' + (restantes > 99 ? '99' : restantes)));
    a.addEventListener('click', function () { location.href = urlPedidos(convs[0]); });
    return a;
  }

  function quitar() {
    if (stack) { stack.remove(); stack = null; }
    cerrarCard();
  }

  function render() {
    convs = agrupar(feed());
    if (!convs.length) { quitar(); vistos = {}; return; }
    injectStyles();

    var recien = false;
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'znb-stack';
      document.body.appendChild(stack);
      conectarArrastre();
      recien = true;
    }
    stack.textContent = '';

    var visibles = convs.slice(0, 1 + MAX_EXTRAS);
    visibles.forEach(function (c, i) { stack.appendChild(crearBurbuja(c, i === 0)); });
    if (convs.length > 1) stack.appendChild(crearBurbujaPedidos(convs.length - visibles.length));

    if (abierta && !convs.some(function (c) { return c.id === abierta; })) cerrarCard();
    else if (abierta) pintarCard();

    posicionar(recien);
  }

  // ---------- Tarjeta con el mensaje ----------
  function burbujaDe(id) {
    if (!stack) return null;
    var lista = stack.querySelectorAll('.znb-b[data-id]');
    for (var i = 0; i < lista.length; i++) if (lista[i].dataset.id === id) return lista[i];
    return null;
  }

  function alternarCard(id) {
    if (dragging) return;
    if (abierta === id) { cerrarCard(); return; }
    abierta = id;
    // Sin volver a armar las burbujas: el click del documento revisa que el
    // objetivo siga dentro de la pila y, si se reconstruye, lo tomaría como "afuera".
    var lista = stack.querySelectorAll('.znb-b[data-id]');
    for (var i = 0; i < lista.length; i++) lista[i].classList.toggle('znb-activa', lista[i].dataset.id === id);
    pintarCard();
  }

  function cerrarCard() {
    abierta = '';
    if (card) { card.remove(); card = null; }
    if (stack) {
      var act = stack.querySelector('.znb-activa');
      if (act) act.classList.remove('znb-activa');
    }
  }

  function pintarCard() {
    var c = convs.filter(function (x) { return x.id === abierta; })[0];
    var btn = burbujaDe(abierta);
    if (!c || !btn) { cerrarCard(); return; }
    if (!card) {
      card = document.createElement('div');
      card.id = 'znb-card';
      document.body.appendChild(card);
    }
    card.textContent = '';
    var who = nombreDe(c);

    var head = el('div', 'znb-head');
    var av = el('div', 'znb-av', avatarTexto(c));
    av.style.background = colorDe(c.id);
    var info = el('div', 'znb-who');
    info.appendChild(el('p', 'znb-name', who.nombre));
    if (who.producto) info.appendChild(el('p', 'znb-prod', who.producto));
    var x = el('button', 'znb-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', cerrarCard);
    head.appendChild(av); head.appendChild(info); head.appendChild(x);
    card.appendChild(head);

    var msgs = el('div', 'znb-msgs');
    c.notifs.slice(0, 3).reverse().forEach(function (n) {
      var m = el('div', 'znb-msg', n.mensaje || '');
      m.appendChild(el('span', 'znb-time', fechaCorta(n.fecha)));
      msgs.appendChild(m);
    });
    card.appendChild(msgs);

    var acts = el('div', 'znb-acts');
    var abrir = el('a', 'znb-open', 'Abrir chat');
    abrir.href = urlChat(c);
    abrir.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      var destino = abrir.href;
      // Se espera (máx. 1.2 s) a que se registre como leído antes de salir de la página.
      Promise.race([
        marcarConversacion(c),
        new Promise(function (ok) { setTimeout(ok, 1200); })
      ]).then(function () { location.href = destino; });
    });
    var visto = el('button', 'znb-dismiss', 'Marcar leído');
    visto.type = 'button';
    visto.addEventListener('click', function () { cerrarCard(); marcarConversacion(c); });
    acts.appendChild(abrir); acts.appendChild(visto);
    card.appendChild(acts);

    var r = btn.getBoundingClientRect();
    var alto = card.offsetHeight;
    var top = Math.min(Math.max(8, r.top + r.height / 2 - 30), window.innerHeight - alto - 8);
    card.style.top = Math.max(8, top) + 'px';
  }

  // ---------- Posición y arrastre vertical ----------
  function limitesTop() {
    var alto = stack ? stack.offsetHeight : 60;
    return { min: 70, max: Math.max(70, window.innerHeight - alto - 90) };
  }

  function guardadoTop() {
    try {
      var v = parseFloat(localStorage.getItem(POS_KEY));
      return isNaN(v) ? null : v;
    } catch (_) { return null; }
  }

  function posicionar(recien) {
    if (!stack) return;
    var lim = limitesTop();
    var actual = recien ? guardadoTop() : parseFloat(stack.style.top);
    if (actual == null || isNaN(actual)) actual = window.innerHeight * 0.45;
    stack.style.top = Math.min(Math.max(lim.min, actual), lim.max) + 'px';
    if (card) pintarCard();
  }

  function conectarArrastre() {
    var inicio = null;

    stack.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      inicio = { y: e.clientY, top: stack.getBoundingClientRect().top, movio: false };
    });

    window.addEventListener('pointermove', function (e) {
      if (!inicio || !stack) return;
      var dy = e.clientY - inicio.y;
      if (!inicio.movio && Math.abs(dy) < 6) return;
      inicio.movio = true;
      dragging = true;
      var lim = limitesTop();
      stack.style.top = Math.min(Math.max(lim.min, inicio.top + dy), lim.max) + 'px';
      if (card) pintarCard();
    });

    function soltar() {
      if (!inicio) return;
      if (inicio.movio && stack) {
        try { localStorage.setItem(POS_KEY, String(parseFloat(stack.style.top))); } catch (_) {}
      }
      inicio = null;
      setTimeout(function () { dragging = false; }, 60);
    }
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  // ---------- Eventos globales ----------
  document.addEventListener('click', function (e) {
    if (!card) return;
    if (card.contains(e.target) || (stack && stack.contains(e.target))) return;
    cerrarCard();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && card) cerrarCard();
  });
  var _posRaf = 0; // un solo reposicionamiento por frame durante el resize
  window.addEventListener('resize', function () {
    if (_posRaf) return;
    _posRaf = requestAnimationFrame(function () { _posRaf = 0; posicionar(false); });
  });
  var _renderTimer = null; // fusiona rafagas del evento en un solo render
  window.addEventListener('znr:notificaciones-cargadas', function () {
    clearTimeout(_renderTimer);
    _renderTimer = setTimeout(render, 120);
  });

  function init() {
    if (window.znrNotifCentro) render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
