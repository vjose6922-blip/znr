/**
 * historias-visor.js — Visor de historias (modal tipo Facebook) para UN vendedor.
 * Lo usan perfil-vendedor.html, vendedor.html (vista propia) y feed-actividad.html
 * (un grupo por vendedor: `alTerminar(dir)` abre el grupo siguiente/anterior; `pie` = HTML abajo).
 * Tocar a la derecha/izquierda: siguiente/anterior · mantener presionado: pausa.
 *
 *   znrHistoriasVisor.abrir(historias, {
 *     indice: 0,            // con cuál empezar
 *     nombre, logo,         // cabecera
 *     perfilUrl,            // si viene, el nombre es un enlace al perfil del vendedor
 *     reportar: true        // botón de reportar (false en la vista propia)
 *   })
 *
 * historias = [{ id, tipo: 'imagen'|'video', url, fecha }, ...] (la más vieja primero)
 */
(function () {
  'use strict';
  if (window.znrHistoriasVisor) return;

  const API = 'https://historias-api-1038143238323.us-central1.run.app';
  const SEG_IMAGEN = 5000;
  const PEDIDOS_API = 'https://pedidos-api-1038143238323.us-central1.run.app';
  const REPORTADAS_KEY = 'znr_historias_reportadas';
  const MOTIVOS = ['Contenido inapropiado', 'Violencia o desnudez', 'Spam o publicidad engañosa', 'Posible estafa', 'Usa música o contenido con derechos de autor', 'Otro motivo'];

  let el = null, cfg = {}, lista = [], idx = 0;
  let raf = 0, last = 0, elapsed = 0, video = null, musica = null, pausado = false, abierto = false;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n, size) => (typeof window.Icon === 'function' ? window.Icon(n, { size }) : '');
  // Vistas (una por dispositivo, sin contar las del propio vendedor) y toques de etiquetas, para las estadísticas del vendedor.
  const sesion = () => { try { return JSON.parse(localStorage.getItem('vendor_session') || '{}') || {}; } catch (_) { return {}; } };
  function contar(h, toque) {
    const yo = sesion().uid || '';
    const vistas = leerSet('znr_historias_vistas');
    if (!h.id || yo === h.vendedorUid || (!toque && vistas.has(h.id))) return;
    if (!toque) { vistas.add(h.id); guardarSet('znr_historias_vistas', vistas); }
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'registrarVista', historiaId: h.id, toque: toque ? 1 : 0 }) }).catch(() => {});
  }
  function leerSet(k) { try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch (_) { return new Set(); } }
  function guardarSet(k, s) { try { localStorage.setItem(k, JSON.stringify([...s].slice(-300))); } catch (_) {} }

  function hace(iso) {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    if (min < 1) return 'ahora';
    if (min < 60) return 'hace ' + min + ' min';
    return 'hace ' + Math.floor(min / 60) + ' h';
  }

  function inyectarCss() {
    if (document.getElementById('zhv-css')) return;
    const st = document.createElement('style');
    st.id = 'zhv-css';
    st.textContent = `
      .zhv{position:fixed;inset:0;z-index:10003;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}
      .zhv[hidden]{display:none}
      .zhv-box{container-type:size;position:relative;width:100%;max-width:460px;height:100%;max-height:880px;background:#000;overflow:hidden}
      .zhv-bars{position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);left:10px;right:10px;z-index:4;display:flex;gap:4px}
      .zhv-bar{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}
      .zhv-bar>i{display:block;height:100%;width:0;background:#fff}
      .zhv-head{position:absolute;top:calc(env(safe-area-inset-top,0px) + 18px);left:0;right:0;z-index:5;display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(rgba(0,0,0,.6),transparent)}
      .zhv-user{flex:1;min-width:0;display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}
      .zhv-av{position:relative;flex-shrink:0;width:38px;height:38px;border-radius:50%;overflow:hidden;background:#333;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff}
      .zhv-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
      .zhv-user b{display:block;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .zhv-user a b,a.zhv-user b{text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(255,255,255,.5)}
      .zhv-user small{display:block;font-size:.7rem;opacity:.75}
      .zhv-btn{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem}
      .zhv-media{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
      .zhv-media img,.zhv-media video{width:100%;height:100%;object-fit:contain;background:#000}
      .zhv-nav{position:absolute;top:90px;bottom:30px;z-index:3;background:none;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .zhv-nav.prev{left:0;width:35%}
      .zhv-nav.next{right:0;width:65%}
      .zhv-sheet{position:absolute;left:0;right:0;bottom:0;z-index:6;background:var(--color-surface,#fff);color:var(--color-text-primary,#111);border-radius:18px 18px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);box-shadow:0 -8px 30px rgba(0,0,0,.4)}
      .zhv-sheet[hidden]{display:none}
      .zhv-sheet h3{margin:0 0 4px;font-size:1rem}
      .zhv-sheet p{margin:0 0 12px;font-size:.78rem;opacity:.7}
      .zhv-sheet button.m{display:block;width:100%;text-align:left;margin-bottom:8px;padding:11px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.3);background:rgba(128,128,128,.08);color:inherit;font:600 .88rem inherit;font-family:inherit;cursor:pointer}
      .zhv-sheet button.c{display:block;width:100%;padding:10px;border:none;background:none;color:inherit;opacity:.7;font:700 .85rem inherit;font-family:inherit;cursor:pointer}
      .zhv-aviso{margin:0;padding:18px 0 6px;text-align:center;font-weight:700;font-size:.9rem}
      .zhv-tags{position:absolute;z-index:4;pointer-events:none;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100cqw,56.25cqh);height:min(100cqh,177.78cqw)}
      .zhv-tag::before{content:'';position:absolute;inset:-12px -6px}
      .zhv-box{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      .zhv-pie{position:absolute;z-index:5;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 14px calc(env(safe-area-inset-bottom,0px) + 16px);pointer-events:none}
      .zhv-pie>*{pointer-events:auto}.zhv-pie .bell-live{margin:0}
      .zhv-resp{display:flex;align-items:flex-end;gap:8px;width:100%;max-width:440px}
      .zhv-resp textarea{flex:1;min-width:0;resize:none;max-height:6.5em;line-height:1.3;padding:10px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.6);background:rgba(0,0,0,.35);color:#fff;font:15px system-ui,sans-serif}
      .zhv-resp textarea::placeholder{color:rgba(255,255,255,.85)}
      .zhv-resp button{flex-shrink:0;height:42px;border:none;border-radius:999px;padding:0 16px;background:#fff;color:#111;font:700 .85rem system-ui,sans-serif;cursor:pointer}
      .zhv-nota{margin:0;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff;font-size:.8rem}.zhv-nota a{color:#fff;font-weight:700}
      .zhv-enc{position:absolute;pointer-events:auto;display:flex;gap:4%;padding:0 4.6% 4.6%;box-sizing:border-box}
      .zhv-enc button{flex:1;min-width:0;border:none;border-radius:1.2em;white-space:normal;line-height:1.1;padding:0 .4em;overflow-wrap:anywhere;background:transparent;cursor:pointer;position:relative;overflow:hidden;color:#fff;font:800 clamp(.7rem,3.4vw,1rem) system-ui,sans-serif}
      .zhv-enc.res button{background:rgba(255,255,255,.88);color:#111}
      .zhv-enc.res button i{position:absolute;inset:0 auto 0 0;background:rgba(124,58,237,.35)}.zhv-enc.res button+button i{background:rgba(236,72,153,.35)}
      .zhv-enc.res button span{position:relative}.zhv-enc.res button.mio{box-shadow:inset 0 0 0 3px #111}
      .zhv-quitar{padding:8px 14px;border:none;border-radius:999px;background:rgba(0,0,0,.6);color:#fff;font:600 .78rem inherit;font-family:inherit;white-space:nowrap;cursor:pointer}
      .zhv-tag{position:absolute;pointer-events:auto;background:none;border:none;cursor:pointer;border-radius:999px;-webkit-tap-highlight-color:rgba(255,255,255,.25);animation:zhv-tag 1.6s ease 2}
      @keyframes zhv-tag{50%{box-shadow:0 0 0 3px rgba(255,255,255,.85),0 0 18px rgba(255,255,255,.6)}}
    `;
    document.head.appendChild(st);
  }

  function crear() {
    if (el) return;
    inyectarCss();
    el = document.createElement('div');
    el.className = 'zhv'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Historias');
    el.innerHTML = `
      <div class="zhv-box">
        <div class="zhv-bars" id="zhv-bars"></div>
        <div class="zhv-media" id="zhv-media"></div>
        <div class="zhv-tags" id="zhv-tags"></div>
        <button type="button" class="zhv-nav prev" id="zhv-prev" aria-label="Anterior"></button>
        <button type="button" class="zhv-nav next" id="zhv-next" aria-label="Siguiente"></button>
        <div class="zhv-head">
          <span class="zhv-user" id="zhv-user"></span>
          <button type="button" class="zhv-btn" id="zhv-report" aria-label="Reportar historia">${ico('flag', 18) || '⚑'}</button>
          <button type="button" class="zhv-btn" id="zhv-close" aria-label="Cerrar">${ico('x', 18) || '✕'}</button>
        </div>
        <div class="zhv-pie"><button type="button" class="zhv-quitar" id="zhv-quitar" hidden>Te etiquetaron · Quitar mi mención</button><p class="zhv-nota" id="zhv-nota" hidden></p><form class="zhv-resp" id="zhv-resp"><textarea rows="1" maxlength="500" placeholder="Enviar mensaje…" enterkeyhint="send" aria-label="Responder a la historia"></textarea><button type="submit">Enviar</button></form><div id="zhv-extra"></div></div>
        <div class="zhv-sheet" id="zhv-sheet" hidden></div>
      </div>`;
    document.body.appendChild(el);
    // Tocar: siguiente/anterior. Mantener presionado: pausa hasta soltar.
    let presion = 0, sostenido = false;
    [['#zhv-next', siguiente], ['#zhv-prev', anterior]].forEach(([sel, fn]) => {
      const b = el.querySelector(sel);
      b.addEventListener('pointerdown', () => { sostenido = false; clearTimeout(presion); presion = setTimeout(() => { sostenido = true; pausar(); }, 220); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, () => { clearTimeout(presion); if (sostenido) reanudar(); }));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', () => { if (sostenido) sostenido = false; else fn(); });
    });
    el.querySelector('#zhv-close').addEventListener('click', cerrar);
    el.querySelector('#zhv-report').addEventListener('click', abrirReporte);
    el.querySelector('#zhv-quitar').addEventListener('click', quitarMencion);
    const resp = el.querySelector('#zhv-resp'), inp = resp.querySelector('textarea');
    resp.addEventListener('submit', responder);
    // El mensaje largo crece hasta 5 renglones (luego se desplaza); Enter envía, Shift+Enter hace un salto de línea.
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = inp.scrollHeight + 'px'; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); resp.requestSubmit(); } });
    inp.addEventListener('focus', pausar);
    inp.addEventListener('blur', () => { if (!inp.value.trim()) reanudar(); });
    el.addEventListener('click', (e) => { if (e.target === el) cerrar(); });
    document.addEventListener('keydown', (e) => {
      if (!abierto) return;
      if (e.key !== 'Escape' && e.target.closest && e.target.closest('input,textarea')) return; // escribiendo una respuesta
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight') siguiente();
      else if (e.key === 'ArrowLeft') anterior();
    });
    document.addEventListener('visibilitychange', () => { document.hidden ? pausar() : reanudar(); });
  }

  function cabecera() {
    const inicial = esc((cfg.nombre || '?').trim().charAt(0).toUpperCase());
    const av = `<span class="zhv-av">${inicial}${cfg.logo ? `<img src="${esc(cfg.logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
    const nivel = cfg.nivel || (lista[0] && lista[0].nivel) || '';
    const txt = `<span style="min-width:0"><b>${esc(cfg.nombre || 'Vendedor')}${window.znrInsignia ? window.znrInsignia(nivel) : ''}</b><small id="zhv-time"></small></span>`;
    const cont = el.querySelector('#zhv-user');
    const nuevo = document.createElement(cfg.perfilUrl ? 'a' : 'span');
    nuevo.className = 'zhv-user'; nuevo.id = 'zhv-user';
    if (cfg.perfilUrl) nuevo.href = cfg.perfilUrl;
    nuevo.innerHTML = av + txt;
    cont.replaceWith(nuevo);
    el.querySelector('#zhv-report').style.display = cfg.reportar === false ? 'none' : '';
    el.querySelector('#zhv-extra').innerHTML = cfg.pie || '';
  }

  function abrir(historias, opciones) {
    if (!historias || !historias.length) return;
    crear();
    cfg = opciones || {};
    lista = historias;
    window.znrAvisoDatosMoviles?.();
    idx = Math.min(Math.max(cfg.indice | 0, 0), lista.length - 1);
    abierto = true;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    cabecera();
    mostrar();
  }

  function detener() {
    cancelAnimationFrame(raf);
    if (video) { video.pause(); video = null; }
    if (musica) { musica.pause(); musica = null; }
  }

  function cerrar() {
    detener();
    abierto = false;
    if (el) { el.hidden = true; el.querySelector('#zhv-media').innerHTML = ''; el.querySelector('#zhv-tags').innerHTML = ''; el.querySelector('#zhv-sheet').hidden = true; }
    document.body.style.overflow = '';
    if (typeof cfg.onCerrar === 'function') cfg.onCerrar();
  }

  function mostrar() {
    detener();
    const h = lista[idx];
    el.querySelector('#zhv-sheet').hidden = true;
    el.querySelector('#zhv-bars').innerHTML = lista.map((_, n) => `<span class="zhv-bar"><i style="width:${n < idx ? 100 : 0}%"></i></span>`).join('');
    const t = el.querySelector('#zhv-time'); if (t) t.textContent = hace(h.fecha);
    const media = el.querySelector('#zhv-media');
    elapsed = 0; last = 0; pausado = false;
    if (h.tipo === 'video') {
      const ahorro = window.znrAhorroDatos?.();
      media.innerHTML = ahorro ? '<video playsinline preload="none"></video>' : '<video playsinline autoplay preload="auto"></video>';
      video = media.firstChild;
      video.src = h.url;
      video.addEventListener('ended', siguiente);
      if (ahorro) window.znrBotonPlayAhorro(media, video);
      const pr = ahorro ? null : video.play();
      if (pr && pr.catch) pr.catch(() => { video.muted = true; const p2 = video.play(); if (p2 && p2.catch) p2.catch(() => {}); });
    } else {
      media.innerHTML = `<img src="${esc(h.url)}" alt="">`;
      // Foto con canción de la biblioteca de ZNR: suena la parte elegida mientras se ve.
      if (h.musica && h.musica.archivo && !window.znrAhorroDatos?.()) {
        musica = new Audio('musica/' + encodeURIComponent(h.musica.archivo));
        musica.currentTime = Number(h.musica.inicio) || 0;
        musica.play().catch(() => {});
      }
    }
    etiquetas(h);
    contar(h);
    raf = requestAnimationFrame(tick);
  }

  // Las etiquetas vienen en proporciones del cuadro 9:16 de la historia; el cuadro se ve centrado ("contain") en la caja.
  function etiquetas(h) {
    const capa = el.querySelector('#zhv-tags'), lista_ = h.etiquetas || [];
    capa.innerHTML = '';
    el.querySelector('#zhv-quitar').hidden = !lista_.some((e) => e.tipo === 'mencion' && e.uid === sesion().uid);
    // Responder: no en la vista propia (Mis historias) ni a tus propias historias.
    el.querySelector('#zhv-resp').style.display = cfg.reportar === false || sesion().uid === h.vendedorUid ? 'none' : '';
    if (h.encuesta) capa.appendChild(encuesta(h));
    lista_.forEach((e) => {
      const b = document.createElement('a');
      b.className = 'zhv-tag';
      b.href = e.tipo === 'mencion' ? 'perfil-vendedor.html?vendedor=' + encodeURIComponent(e.uid)
        : 'perfil-vendedor.html?vendedor=' + encodeURIComponent(h.vendedorUid || '') + '#producto-' + encodeURIComponent(e.productoId);
      b.setAttribute('aria-label', e.tipo === 'mencion' ? 'Ver el perfil de ' + (e.nombre || 'este vendedor') : 'Ver este producto');
      b.addEventListener('click', () => contar(h, true));
      Object.assign(b.style, { left: e.x * 100 + '%', top: e.y * 100 + '%', width: e.w * 100 + '%', height: e.h * 100 + '%' });
      capa.appendChild(b);
    });
  }

  function tick(ts) {
    if (!abierto) return;
    if (!last) last = ts;
    let p;
    if (video) p = video.duration ? video.currentTime / video.duration : 0;
    else { if (!pausado) elapsed += ts - last; p = Math.min(1, elapsed / SEG_IMAGEN); }
    last = ts;
    const bar = el.querySelectorAll('#zhv-bars .zhv-bar > i')[idx];
    if (bar) bar.style.width = (p * 100) + '%';
    if (!video && p >= 1) return siguiente();
    raf = requestAnimationFrame(tick);
  }

  function pausar() { pausado = true; if (video) video.pause(); if (musica) musica.pause(); }
  function reanudar() {
    if (!abierto || !el.querySelector('#zhv-sheet').hidden) return;
    pausado = false;
    if (video) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
    if (musica) musica.play().catch(() => {});
  }

  // cfg.alTerminar(1 | -1): pasar al siguiente/anterior grupo (feed de actividad); si devuelve false, se cierra.
  function siguiente() { if (idx < lista.length - 1) { idx++; mostrar(); } else if (!cfg.alTerminar?.(1)) cerrar(); }
  function anterior() { if (idx > 0) idx--; else if (cfg.alTerminar?.(-1)) return; mostrar(); }

  // ── Reportar ──
  // Encuesta: dos botones sobre las opciones dibujadas. Al votar (o si ya votaste en este dispositivo) se ven los porcentajes.
  const VOTOS_KEY = 'znr_historias_votos';
  function encuesta(h) {
    const e = h.encuesta, box = document.createElement('div');
    box.className = 'zhv-enc';
    Object.assign(box.style, { left: e.x * 100 + '%', top: (e.y + e.h * e.oy) * 100 + '%', width: e.w * 100 + '%', height: e.h * (1 - e.oy) * 100 + '%' });
    const pintar = (votos, mio) => {
      const t = (votos[0] || 0) + (votos[1] || 0);
      box.classList.toggle('res', mio !== undefined);
      box.innerHTML = e.opciones.map((o, i) => {
        if (mio === undefined) return `<button type="button" data-o="${i}" aria-label="Votar por ${esc(o)}"></button>`;
        const p = t ? Math.round((votos[i] || 0) * 100 / t) : 0;
        return `<button type="button" class="${mio === i ? 'mio' : ''}" disabled><i style="width:${p}%"></i><span>${esc(o)} · ${p}%</span></button>`;
      }).join('');
    };
    let guardados = {}; try { guardados = JSON.parse(localStorage.getItem(VOTOS_KEY) || '{}'); } catch (_) {}
    pintar(h.votos || [0, 0], guardados[h.id]);
    box.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-o]');
      if (!b) return;
      pausar();
      const s = sesion(), tel = (localStorage.getItem('client_phone') || '').replace(/\D/g, ''), tok = localStorage.getItem('comprador_token');
      let idToken = null;
      if (s.uid && s.token && window.znrFirestore?.getIdToken) idToken = await window.znrFirestore.getIdToken('vendedor', s.uid, s.token).catch(() => null);
      if (!idToken && (tel.length !== 10 || !tok)) { nota('Inicia sesión para votar.'); return reanudar(); }
      const r = await (await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'votarEncuesta', historiaId: h.id, opcion: +b.dataset.o, ...(idToken ? { idToken } : { telefono: tel, compradorToken: tok }) }) })).json().catch(() => ({ ok: false }));
      if (r.ok) {
        h.votos = r.votos; guardados[h.id] = r.mio;
        try { localStorage.setItem(VOTOS_KEY, JSON.stringify(Object.fromEntries(Object.entries(guardados).slice(-300)))); } catch (_) {}
        pintar(r.votos, r.mio);
      } else nota(esc(r.error || 'No se pudo votar.'));
      setTimeout(reanudar, 1200);
    });
    return box;
  }

  function nota(html) {
    const n = el.querySelector('#zhv-nota');
    n.innerHTML = html; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 6000);
  }

  // Responder a la historia: abre (o sigue) un chat de consulta con el vendedor (pedido-chat.html). Pide sesión de comprador.
  async function responder(ev) {
    ev.preventDefault();
    const inp = el.querySelector('#zhv-resp textarea'), btn = el.querySelector('#zhv-resp button'), txt = inp.value.trim(), h = lista[idx];
    if (!txt) return;
    let tel = (localStorage.getItem('client_phone') || '').replace(/\D/g, ''), tok = localStorage.getItem('comprador_token');
    if (tel.length !== 10 || !tok) {
      // Sin el inicio de sesión de comprador en esta página (feed de actividad): se abre la historia en el perfil del vendedor.
      if (!window.asegurarComprador) { location.href = 'perfil-vendedor.html?vendedor=' + encodeURIComponent(h.vendedorUid) + '&historia=' + encodeURIComponent(h.id); return; }
      el.style.zIndex = 9000; // el aviso de inicio de sesión va encima del visor
      tel = await window.asegurarComprador('Para escribirle al vendedor');
      el.style.zIndex = ''; tok = localStorage.getItem('comprador_token');
      if (!tel) return;
    }
    btn.disabled = true;
    try {
      const r = await (await fetch(PEDIDOS_API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'responderHistoria', telefono: tel, compradorToken: tok, nombre: localStorage.getItem('client_name') || '', historiaId: h.id, contenido: txt }) })).json();
      if (!r.ok) throw new Error(r.error || 'No se pudo enviar.');
      inp.value = ''; inp.style.height = ''; inp.blur();
      nota(`Mensaje enviado · <a href="pedido-chat.html?pedido=${encodeURIComponent(r.pedidoId)}&rol=comprador">Ver chat</a>`);
    } catch (e) { nota(esc(e.message || 'No se pudo enviar.')); }
    btn.disabled = false;
  }

  // El vendedor etiquetado puede quitar su @mención: el texto sigue en la imagen, pero ya no lleva a su perfil.
  async function quitarMencion() {
    const h = lista[idx], s = sesion();
    pausar();
    const si = await new Promise((ok) => {
      if (!window.showCustomConfirm) return ok(confirm('¿Quitar tu mención de esta historia?'));
      window.showCustomConfirm({ title: 'Quitar mi mención', message: 'Tu nombre seguirá en la imagen, pero ya no llevará a tu perfil. ¿Continuar?', confirmText: 'Quitar', onConfirm: () => ok(true), onCancel: () => ok(false) });
      document.querySelectorAll('.custom-alert-modal').forEach((m) => { m.style.zIndex = 10010; }); // encima del visor
    });
    if (si) {
      try {
        const idToken = await window.znrFirestore?.getIdToken?.('vendedor', s.uid, s.token);
        const r = await (await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quitarMencion', historiaId: h.id, idToken }) })).json();
        if (!r.ok) throw new Error(r.error);
        h.etiquetas = (h.etiquetas || []).filter((e) => !(e.tipo === 'mencion' && e.uid === s.uid));
        etiquetas(h);
      } catch (e) { alert(e.message || 'No se pudo quitar la mención.'); }
    }
    reanudar();
  }

  function abrirReporte() {
    const h = lista[idx];
    const sheet = el.querySelector('#zhv-sheet');
    pausar();
    sheet.hidden = false;
    if (leerSet(REPORTADAS_KEY).has(h.id)) {
      sheet.innerHTML = '<p class="zhv-aviso">Ya reportaste esta historia. Gracias.</p><button type="button" class="c" id="zhv-cancel">Cerrar</button>';
    } else {
      sheet.innerHTML = `<h3>Reportar historia</h3><p>¿Qué pasa con esta historia? Revisamos cada reporte.</p>
        ${MOTIVOS.map(m => `<button type="button" class="m" data-m="${esc(m)}">${esc(m)}</button>`).join('')}
        <button type="button" class="c" id="zhv-cancel">Cancelar</button>`;
    }
    sheet.querySelector('#zhv-cancel').addEventListener('click', () => { sheet.hidden = true; reanudar(); });
    sheet.querySelectorAll('.m').forEach(b => b.addEventListener('click', () => enviarReporte(h, b.dataset.m)));
  }

  async function enviarReporte(h, motivo) {
    const sheet = el.querySelector('#zhv-sheet');
    sheet.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const r = await (await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reportarHistoria', historiaId: h.id, motivo })
      })).json();
      if (!r.ok) throw new Error(r.error || 'No se pudo enviar el reporte.');
      const s = leerSet(REPORTADAS_KEY); s.add(h.id); guardarSet(REPORTADAS_KEY, s);
      sheet.innerHTML = '<p class="zhv-aviso">Gracias, revisaremos esta historia.</p>';
      setTimeout(() => { sheet.hidden = true; reanudar(); }, 1400);
    } catch (e) {
      sheet.innerHTML = `<p class="zhv-aviso" style="color:#dc2626">${esc(e.message)}</p><button type="button" class="c" id="zhv-cancel">Cerrar</button>`;
      sheet.querySelector('#zhv-cancel').addEventListener('click', () => { sheet.hidden = true; reanudar(); });
    }
  }

  window.znrHistoriasVisor = { abrir, cerrar, estaAbierto: () => abierto };
})();
