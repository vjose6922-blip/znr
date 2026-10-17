/* =========================================================================
   znr-select.js — Selectores propios para TODOS los <select> de ZNR.

   Reemplaza la lista nativa del navegador/Android/iOS (que en móviles se ve
   mal) por una hoja inferior propia (en escritorio, un cuadro centrado).

   Cómo funciona:
   - Es automático: no hay que cambiar los HTML. Al cargar, y cada vez que
     aparece un <select> nuevo (modales creados por JS, innerHTML, etc.), se
     le pone un botón al lado y el <select> real se oculta (sigue en el DOM).
   - El <select> real sigue siendo la fuente de verdad: ids, .value,
     .options, eventos "input"/"change" y atributos onchange="..." funcionan
     igual que antes. Si el código cambia .value / .selectedIndex / las
     opciones / display / disabled, el botón se actualiza solo.
   - El botón copia el aspecto del <select> original (padding, borde, fondo,
     fuente, ancho...), así cada pantalla conserva su diseño.

   Atributos opcionales en el <select>:
     data-native        -> no personalizar este select (se queda nativo).
     data-znr-titulo    -> título de la hoja (si no, se toma de aria-label o
                           de la <label> asociada).
     data-znr-resaltar  -> el botón se marca con el color primario cuando
                           el select tiene un valor distinto de "".

   API: window.ZnrSelect = { mejorar(sel), refrescar(sel), refrescarTodo(),
                             abrir(sel) }
   ========================================================================= */
(function () {
  'use strict';
  if (window.ZnrSelect) return;

  var REAL = 'znr-sel-real';      // clase que oculta el <select> real (visualmente)
  var UMBRAL_BUSQUEDA = 8;        // con más opciones que esto aparece el buscador
  var MAX_RENDER = 400;           // máximo de opciones pintadas a la vez (listas enormes)
  var enhanced = new Set();

  var CHEVRON = '<svg class="znr-sel-chev" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  var CHECK = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function cssEsc(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  /* ---- Cuando el código cambia value / selectedIndex sin disparar "change" ---- */
  function parchear(proto, prop) {
    var d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.get || !d.set) return;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: d.enumerable,
      get: d.get,
      set: function (v) {
        d.set.call(this, v);
        if (this.__znr) { try { refrescar(this); } catch (e) { /* nunca romper el set */ } }
      }
    });
  }
  parchear(HTMLSelectElement.prototype, 'value');
  parchear(HTMLSelectElement.prototype, 'selectedIndex');

  /* ---- Título de la hoja ---- */
  function textoLimpio(label) {
    var c = label.cloneNode(true);
    var basura = c.querySelectorAll('select, button, .znr-sel-btn');
    for (var i = 0; i < basura.length; i++) basura[i].remove();
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function titulo(sel) {
    var t = sel.getAttribute('data-znr-titulo') || sel.getAttribute('aria-label');
    if (t && t.trim()) return t.trim();
    if (sel.id) {
      var l = document.querySelector('label[for="' + cssEsc(sel.id) + '"]');
      if (l) { t = textoLimpio(l); if (t) return t; }
    }
    var lab = sel.closest('label');
    if (lab) { t = textoLimpio(lab); if (t) return t; }
    var ff = sel.closest('.filtros-field');
    if (ff) { var sp = ff.querySelector(':scope > span'); if (sp && sp.textContent.trim()) return sp.textContent.trim(); }
    return '';
  }

  /* ---- Copiar el aspecto del <select> al botón ---- */
  var COPIA = [
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'background-color', 'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-transform', 'box-shadow', 'opacity', 'box-sizing',
    'min-width', 'max-width', 'min-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'justify-self', 'vertical-align',
    'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end'
  ];

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var sel = en.target.__znrSel;
      io.unobserve(en.target);
      if (sel && sel.__znr) sincronizar(sel);
    });
  }) : null;

  // Lee el aspecto del <select> tal como lo dejan los estilos de la página (con el select
  // "natural" y el botón oculto, para que el layout sea idéntico al original) y se lo pasa al botón.
  function sincronizar(sel) {
    var st = sel.__znr;
    if (!st) return;
    var btn = st.btn;
    sel.classList.remove(REAL);
    btn.style.display = 'none';

    var cs = getComputedStyle(sel);
    var oculto = cs.display === 'none' || sel.hidden;

    if (!oculto) {
      var r = sel.getBoundingClientRect();
      var medible = r.width > 0 && r.height > 0;
      var css = '';
      for (var i = 0; i < COPIA.length; i++) css += COPIA[i] + ':' + cs.getPropertyValue(COPIA[i]) + ';';

      var disp, ancho;
      if (!medible) {
        // Está dentro de algo oculto (modal cerrado): valores por defecto y se mide al hacerse visible.
        disp = 'flex'; ancho = 'width:100%;';
      } else {
        var mL = parseFloat(cs.marginLeft) || 0, mR = parseFloat(cs.marginRight) || 0;
        var p = sel.parentElement, pw = 0, pFlex = false;
        if (p) {
          var pcs = getComputedStyle(p);
          pw = p.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0);
          pFlex = /flex/.test(pcs.display);
        }
        if (pFlex && parseFloat(cs.flexGrow) > 0) {
          disp = 'flex'; ancho = 'width:auto;';
        } else if (pw && Math.abs(r.width + mL + mR - pw) <= 2) {
          disp = 'flex'; ancho = 'width:' + ((mL + mR) ? 'calc(100% - ' + (mL + mR) + 'px)' : '100%') + ';';
        } else {
          disp = 'inline-flex'; ancho = 'width:' + r.width + 'px;';
        }
        ancho += 'height:' + r.height + 'px;';
      }
      btn.style.cssText = css + ancho + 'display:' + disp + ';';
      st.disp = disp;
      st.oculto = false;
      if (!medible && io && st.reintentos < 3) { st.reintentos++; io.observe(btn); }
    } else {
      st.oculto = true;
    }

    sel.classList.add(REAL);
    refrescar(sel);
    if (st.obs) st.obs.takeRecords(); // descartar los cambios de clase que acabamos de hacer nosotros
  }

  // Actualiza solo lo que cambia con la selección: texto, estado vacío/resaltado, disabled, aria-label.
  function refrescar(sel) {
    var st = sel && sel.__znr;
    if (!st) return;
    var btn = st.btn;
    var o = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    var txt = o ? (o.label || o.textContent || '') : '';
    var span = btn.firstChild;
    if (span.textContent !== txt) span.textContent = txt;
    btn.classList.toggle('znr-sel-vacio', !!(o && o.disabled));
    if (sel.hasAttribute('data-znr-resaltar')) btn.classList.toggle('znr-sel-activo', !!sel.value);
    btn.disabled = !!sel.disabled;
    if (sel.disabled) btn.style.opacity = '.55';
    var t = titulo(sel);
    btn.setAttribute('aria-label', (t ? t + ': ' : '') + txt);
  }

  function elegible(sel) {
    return sel && sel.tagName === 'SELECT' && !sel.__znr && !sel.multiple && !(sel.size > 1) &&
      !sel.hasAttribute('data-native') && !sel.closest('.znr-sel-sheet');
  }

  function mejorar(sel) {
    if (!elegible(sel) || !sel.parentNode) return;

    // Si el select llegó clonado junto con un botón nuestro, quitar el botón viejo.
    var prev = sel.previousElementSibling;
    if (prev && prev.classList.contains('znr-sel-btn')) prev.remove();
    sel.classList.remove(REAL);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'znr-sel-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.innerHTML = '<span class="znr-sel-txt"></span>' + CHEVRON;
    btn.style.display = 'none';
    btn.__znrSel = sel;

    var st = { sel: sel, btn: btn, disp: 'flex', oculto: false, reintentos: 0, obs: null };
    sel.__znr = st;
    sel.parentNode.insertBefore(btn, sel);
    sel.setAttribute('tabindex', '-1');
    sel.setAttribute('aria-hidden', 'true');

    btn.addEventListener('click', function (e) { e.preventDefault(); abrir(sel); });
    sel.addEventListener('change', function () { refrescar(sel); });

    st.obs = new MutationObserver(function (muts) {
      var estilo = false;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].type === 'attributes' && muts[i].target === sel) { estilo = true; break; }
      }
      if (estilo) sincronizar(sel); else refrescar(sel);
    });
    st.obs.observe(sel, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'style', 'disabled', 'hidden', 'selected', 'label', 'value']
    });

    enhanced.add(sel);
    sincronizar(sel);
  }

  /* =======================  Hoja de selección (una sola)  ======================= */
  var P = null;

  function crearHoja() {
    var root = document.createElement('div');
    root.className = 'znr-sel-sheet';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'znr-sel-titulo');
    root.innerHTML =
      '<div class="znr-sel-backdrop" data-znr-cerrar></div>' +
      '<div class="znr-sel-panel" tabindex="-1">' +
        '<div class="znr-sel-handle" aria-hidden="true"></div>' +
        '<div class="znr-sel-head"><h3 id="znr-sel-titulo"></h3>' +
          '<button type="button" class="znr-sel-x" data-znr-cerrar aria-label="Cerrar">&times;</button></div>' +
        '<input type="search" class="znr-sel-search" placeholder="Buscar..." autocomplete="off" style="display:none">' +
        '<div class="znr-sel-list" role="listbox"></div>' +
      '</div>';
    document.body.appendChild(root);

    P = {
      root: root,
      panel: root.querySelector('.znr-sel-panel'),
      titulo: root.querySelector('#znr-sel-titulo'),
      buscar: root.querySelector('.znr-sel-search'),
      lista: root.querySelector('.znr-sel-list'),
      sel: null, btn: null, items: []
    };

    // La hoja vive en <body>, fuera de los paneles/modales de cada pantalla. Sin esto, tocar una opción
    // contaría como "clic afuera" para los listeners de document que cierran paneles (notificaciones, modales...).
    ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.stopPropagation(); });
    });

    var cerrars = root.querySelectorAll('[data-znr-cerrar]');
    for (var i = 0; i < cerrars.length; i++) cerrars[i].addEventListener('click', cerrar);
    P.buscar.addEventListener('input', function () { pintar(P.buscar.value); });
    P.lista.addEventListener('click', function (e) {
      var b = e.target.closest('.znr-sel-opt');
      if (!b || b.disabled || !P.sel) return;
      var sel = P.sel, idx = parseInt(b.getAttribute('data-i'), 10);
      var cambio = sel.selectedIndex !== idx;
      cerrar();
      if (cambio) {
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      refrescar(sel);
    });
  }

  function leerItems(sel) {
    var items = [];
    for (var i = 0; i < sel.children.length; i++) {
      var n = sel.children[i];
      if (n.tagName === 'OPTGROUP') {
        for (var j = 0; j < n.children.length; j++) {
          var o = n.children[j];
          if (o.tagName === 'OPTION' && !o.hidden) items.push({ i: o.index, label: o.label || o.textContent, dis: o.disabled || n.disabled, grupo: n.label });
        }
      } else if (n.tagName === 'OPTION' && !n.hidden) {
        items.push({ i: n.index, label: n.label || n.textContent, dis: n.disabled, grupo: null });
      }
    }
    return items;
  }

  function pintar(q) {
    var nq = norm((q || '').trim());
    var sIdx = P.sel.selectedIndex;
    var html = '', mostrados = 0, total = 0, grupoAct = null;
    P.items.forEach(function (it) {
      if (nq && norm(it.label).indexOf(nq) === -1) return;
      total++;
      if (mostrados >= MAX_RENDER && it.i !== sIdx) return;
      if (it.grupo && it.grupo !== grupoAct) { html += '<div class="znr-sel-group">' + esc(it.grupo) + '</div>'; grupoAct = it.grupo; }
      if (!it.grupo) grupoAct = null;
      var sel = it.i === sIdx;
      mostrados++;
      html += '<button type="button" class="znr-sel-opt' + (sel ? ' sel' : '') + '" role="option" aria-selected="' + sel + '"' +
        (it.dis ? ' disabled' : '') + ' data-i="' + it.i + '"><span>' + esc(it.label) + '</span>' + (sel ? CHECK : '') + '</button>';
    });
    if (!total) html = '<div class="znr-sel-empty">Sin resultados</div>';
    else if (total > mostrados) html += '<div class="znr-sel-mas">Hay ' + (total - mostrados) + ' opciones más. Escribe para buscar.</div>';
    P.lista.innerHTML = html;
  }

  function onKey(e) {
    if (!P || !P.root.classList.contains('open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cerrar(); return; }
    if (e.key === 'Enter' && e.target === P.buscar) {
      var f = P.lista.querySelector('.znr-sel-opt:not(:disabled)');
      if (f) f.click();
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var ops = [].slice.call(P.lista.querySelectorAll('.znr-sel-opt:not(:disabled)'));
      if (!ops.length) return;
      var k = ops.indexOf(document.activeElement);
      k = e.key === 'ArrowDown' ? Math.min(ops.length - 1, k + 1) : (k <= 0 ? 0 : k - 1);
      ops[k].focus();
      e.preventDefault();
      return;
    }
    if (e.key === 'Tab') {
      var foc = [].slice.call(P.root.querySelectorAll('button:not(:disabled), input'))
        .filter(function (x) { return x.offsetParent !== null; });
      if (!foc.length) return;
      var first = foc[0], last = foc[foc.length - 1];
      if (e.shiftKey && (document.activeElement === first || !P.root.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function abrir(sel) {
    var st = sel && sel.__znr;
    if (!st || sel.disabled) return;
    if (!P) crearHoja();
    P.sel = sel;
    P.btn = st.btn;
    P.items = leerItems(sel);
    P.titulo.textContent = titulo(sel) || 'Elegir';
    P.buscar.value = '';
    P.buscar.style.display = P.items.length > UMBRAL_BUSQUEDA ? '' : 'none';
    pintar('');
    P.root.classList.add('open');
    document.addEventListener('keydown', onKey, true);
    var s0 = P.lista.querySelector('.znr-sel-opt.sel');
    if (s0) s0.scrollIntoView({ block: 'center' });
    P.panel.focus({ preventScroll: true });
  }

  function cerrar() {
    if (!P) return;
    P.root.classList.remove('open');
    document.removeEventListener('keydown', onKey, true);
    var btn = P.btn;
    P.sel = null; P.btn = null; P.items = [];
    if (btn && btn.isConnected) { try { btn.focus({ preventScroll: true }); } catch (e) { /* nada */ } }
  }

  /* =======================  Arranque y vigilancia  ======================= */
  function escanear(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (raiz.tagName === 'SELECT') { mejorar(raiz); return; }
    if (!raiz.firstElementChild) return;
    var lista = raiz.querySelectorAll('select');
    for (var i = 0; i < lista.length; i++) mejorar(lista[i]);
  }

  var tResync = null, ultimoAncho = window.innerWidth;
  function resincronizar(forzar) {
    clearTimeout(tResync);
    tResync = setTimeout(function () {
      if (!forzar && window.innerWidth === ultimoAncho) return; // la barra de URL del móvil también dispara "resize"
      ultimoAncho = window.innerWidth;
      enhanced.forEach(function (s) {
        if (!s.isConnected) {
          enhanced.delete(s);
          if (s.__znr && s.__znr.obs) s.__znr.obs.disconnect();
          return;
        }
        sincronizar(s);
      });
    }, 150);
  }

  function iniciar() {
    escanear(document.body);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) escanear(add[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('resize', function () { resincronizar(false); });
    window.addEventListener('orientationchange', function () { resincronizar(true); });
    // Cambio de tema claro/oscuro: los colores copiados hay que leerlos de nuevo.
    var mo = new MutationObserver(function () { resincronizar(true); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    // form.reset() cambia valores sin avisar.
    document.addEventListener('reset', function () { setTimeout(function () { enhanced.forEach(refrescar); }, 0); }, true);
  }

  window.ZnrSelect = {
    mejorar: mejorar,
    refrescar: refrescar,
    refrescarTodo: function () { enhanced.forEach(refrescar); },
    abrir: abrir
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
