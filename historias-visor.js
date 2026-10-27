/**
 * historias-visor.js — Visor de historias (modal tipo Facebook) para UN vendedor.
 * Lo usan perfil-vendedor.html (comprador) y vendedor.html (vista previa propia).
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
  const REPORTADAS_KEY = 'znr_historias_reportadas';
  const MOTIVOS = ['Contenido inapropiado', 'Violencia o desnudez', 'Spam o publicidad engañosa', 'Posible estafa', 'Otro motivo'];

  let el = null, cfg = {}, lista = [], idx = 0;
  let raf = 0, last = 0, elapsed = 0, video = null, pausado = false, abierto = false;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n, size) => (typeof window.Icon === 'function' ? window.Icon(n, { size }) : '');
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
      .zhv-box{position:relative;width:100%;max-width:460px;height:100%;max-height:880px;background:#000;overflow:hidden}
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
        <button type="button" class="zhv-nav prev" id="zhv-prev" aria-label="Anterior"></button>
        <button type="button" class="zhv-nav next" id="zhv-next" aria-label="Siguiente"></button>
        <div class="zhv-head">
          <span class="zhv-user" id="zhv-user"></span>
          <button type="button" class="zhv-btn" id="zhv-report" aria-label="Reportar historia">${ico('flag', 18) || '⚑'}</button>
          <button type="button" class="zhv-btn" id="zhv-close" aria-label="Cerrar">${ico('x', 18) || '✕'}</button>
        </div>
        <div class="zhv-sheet" id="zhv-sheet" hidden></div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#zhv-next').addEventListener('click', siguiente);
    el.querySelector('#zhv-prev').addEventListener('click', anterior);
    el.querySelector('#zhv-close').addEventListener('click', cerrar);
    el.querySelector('#zhv-report').addEventListener('click', abrirReporte);
    el.addEventListener('click', (e) => { if (e.target === el) cerrar(); });
    document.addEventListener('keydown', (e) => {
      if (!abierto) return;
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight') siguiente();
      else if (e.key === 'ArrowLeft') anterior();
    });
    document.addEventListener('visibilitychange', () => { document.hidden ? pausar() : reanudar(); });
  }

  function cabecera() {
    const inicial = esc((cfg.nombre || '?').trim().charAt(0).toUpperCase());
    const av = `<span class="zhv-av">${inicial}${cfg.logo ? `<img src="${esc(cfg.logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
    const txt = `<span style="min-width:0"><b>${esc(cfg.nombre || 'Vendedor')}</b><small id="zhv-time"></small></span>`;
    const cont = el.querySelector('#zhv-user');
    const nuevo = document.createElement(cfg.perfilUrl ? 'a' : 'span');
    nuevo.className = 'zhv-user'; nuevo.id = 'zhv-user';
    if (cfg.perfilUrl) nuevo.href = cfg.perfilUrl;
    nuevo.innerHTML = av + txt;
    cont.replaceWith(nuevo);
    el.querySelector('#zhv-report').style.display = cfg.reportar === false ? 'none' : '';
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
  }

  function cerrar() {
    detener();
    abierto = false;
    if (el) { el.hidden = true; el.querySelector('#zhv-media').innerHTML = ''; el.querySelector('#zhv-sheet').hidden = true; }
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
    }
    raf = requestAnimationFrame(tick);
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

  function pausar() { pausado = true; if (video) video.pause(); }
  function reanudar() {
    if (!abierto || !el.querySelector('#zhv-sheet').hidden) return;
    pausado = false;
    if (video) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }

  function siguiente() { if (idx < lista.length - 1) { idx++; mostrar(); } else cerrar(); }
  function anterior() { if (idx > 0) idx--; mostrar(); }

  // ── Reportar ──
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
