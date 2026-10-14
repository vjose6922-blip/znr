/**
 * historias-vendedor.js — Botón "Crear historia" del panel de vendedor.
 *
 * Abre un modal con: cómo funcionan las historias, tu cupo, el botón de
 * subir y tus historias activas (tocarlas las abre en el visor; se pueden
 * eliminar). Antes de publicar SIEMPRE se muestra un modal de confirmación
 * con la vista previa, para no subir la imagen equivocada.
 *
 * Reglas (las valida historias-api): máx. 3 activas a la vez, solo 1 video
 * (~4 s), duran 24 h y luego se borran para siempre.
 */
(function () {
  'use strict';

  const API = 'https://historias-api-1038143238323.us-central1.run.app';
  const MAX_HISTORIAS = 3;
  const MAX_VIDEO_SEG = 5;                  // "~4 segundos" + margen
  const MAX_VIDEO_BYTES = 6 * 1024 * 1024;  // mismo tope que el servidor
  const IMG_LADO_MAX = 1080;

  let cupo = { usadas: 0, max: MAX_HISTORIAS, videoUsado: false };
  let historias = [];          // activas, de la más nueva a la más vieja
  let ocupado = false;
  let prevUrl = null;          // URL temporal de la vista previa (se libera al cerrar)
  let construido = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n, size) => (typeof window.Icon === 'function' ? window.Icon(n, { size }) : '');

  // ── Estilos ──────────────────────────────────────────────────────────
  function css() {
    if ($('zhm-css')) return;
    const st = document.createElement('style');
    st.id = 'zhm-css';
    st.textContent = `
      .zhm-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}
      .zhm-overlay[hidden]{display:none}
      .zhm-overlay.top{z-index:10002;align-items:center;padding:16px}
      .zhm-sheet{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;background:var(--color-surface,#fff);color:var(--color-text-primary,#1a1a2e);border-radius:20px 20px 0 0;padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 18px);box-shadow:0 -10px 40px rgba(0,0,0,.35)}
      .zhm-overlay.top .zhm-sheet{border-radius:20px;max-width:380px;max-height:90vh}
      .zhm-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .zhm-head h3{margin:0;font-size:1.1rem}
      .zhm-x{width:34px;height:34px;border-radius:50%;border:none;background:rgba(128,128,128,.15);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem}
      .zhm-info{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:12px 14px;font-size:.8rem;line-height:1.5}
      .zhm-info strong{display:block;margin-bottom:4px;font-size:.84rem}
      .zhm-info ul{margin:0;padding-left:18px}
      .zhm-cupo{margin:12px 0 8px;font-size:.8rem;font-weight:700;opacity:.8}
      .zhm-main{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;border:none;background:var(--gradient-accent,linear-gradient(135deg,#e11d48,#f97316));color:#fff;font:700 .95rem inherit;font-family:inherit;cursor:pointer}
      .zhm-main:disabled{opacity:.45;cursor:default}
      .zhm-msg{text-align:center;font-size:.8rem;margin:8px 0 0;min-height:18px}
      .zhm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
      .zhm-item{position:relative;border-radius:12px;overflow:hidden;background:#111;aspect-ratio:9/16;cursor:pointer}
      .zhm-item img,.zhm-item video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
      .zhm-tag{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:999px}
      .zhm-tag.red{left:auto;right:6px;background:#dc2626}
      .zhm-foot{position:absolute;left:0;right:0;bottom:0;padding:16px 6px 5px;background:linear-gradient(transparent,rgba(0,0,0,.78));display:flex;align-items:center;justify-content:space-between;gap:4px}
      .zhm-foot span{color:#fff;font-size:.62rem}
      .zhm-del{background:rgba(255,255,255,.92);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#dc2626}
      .zhm-empty{grid-column:1/-1;text-align:center;font-size:.82rem;opacity:.6;padding:18px 0}
      .zhm-c-title{margin:0 0 10px;font-size:1.05rem;text-align:center}
      .zhm-c-media{display:flex;justify-content:center;margin-bottom:12px}
      .zhm-c-media img,.zhm-c-media video{max-width:100%;max-height:44vh;border-radius:14px;background:#000;object-fit:contain}
      .zhm-c-text{margin:0 0 14px;font-size:.82rem;line-height:1.5;text-align:center;opacity:.85}
      .zhm-c-btn{display:block;width:100%;padding:12px;border-radius:12px;border:none;font:700 .92rem inherit;font-family:inherit;cursor:pointer;margin-bottom:8px}
      .zhm-c-btn.ok{background:var(--gradient-accent,linear-gradient(135deg,#e11d48,#f97316));color:#fff}
      .zhm-c-btn.danger{background:#dc2626;color:#fff}
      .zhm-c-btn.alt{background:rgba(124,58,237,.12);color:#6d28d9}
      .zhm-c-btn.cancel{background:none;color:inherit;opacity:.7;margin-bottom:0}
      .zhm-c-btn:disabled{opacity:.5;cursor:default}
    `;
    document.head.appendChild(st);
  }

  // ── DOM ──────────────────────────────────────────────────────────────
  function construir() {
    if (construido) return;
    css();
    const main = document.createElement('div');
    main.className = 'zhm-overlay'; main.id = 'zhm-main'; main.hidden = true;
    main.innerHTML = `
      <div class="zhm-sheet" role="dialog" aria-modal="true" aria-labelledby="zhm-title">
        <div class="zhm-head">
          <h3 id="zhm-title">Mis historias</h3>
          <button type="button" class="zhm-x" id="zhm-close" aria-label="Cerrar">${ico('x', 16) || '✕'}</button>
        </div>
        <div class="zhm-info">
          <strong>Cómo funcionan</strong>
          <ul>
            <li>Se ven <b>24 horas</b> en Actividad reciente y en tu perfil. Después se borran para siempre.</li>
            <li>Máximo <b>3 a la vez</b>, y solo una puede ser un <b>video corto</b> (~4 segundos).</li>
            <li>No se pueden editar: si te equivocas, elimínala y sube otra.</li>
          </ul>
        </div>
        <p class="zhm-cupo" id="zhm-cupo"></p>
        <input type="file" id="zhm-file" accept="image/*,video/mp4,video/quicktime,video/webm" hidden>
        <button type="button" class="zhm-main" id="zhm-subir">${ico('camera', 18)} Subir foto o video</button>
        <p class="zhm-msg" id="zhm-msg" role="status"></p>
        <div class="zhm-grid" id="zhm-grid"></div>
      </div>`;
    const conf = document.createElement('div');
    conf.className = 'zhm-overlay top'; conf.id = 'zhm-confirm'; conf.hidden = true;
    conf.innerHTML = `
      <div class="zhm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="zhm-c-title">
        <h3 class="zhm-c-title" id="zhm-c-title"></h3>
        <div class="zhm-c-media" id="zhm-c-media"></div>
        <p class="zhm-c-text" id="zhm-c-text"></p>
        <button type="button" class="zhm-c-btn ok" id="zhm-c-ok"></button>
        <button type="button" class="zhm-c-btn alt" id="zhm-c-alt"></button>
        <button type="button" class="zhm-c-btn cancel" id="zhm-c-cancel">Cancelar</button>
      </div>`;
    document.body.appendChild(main);
    document.body.appendChild(conf);

    $('zhm-close').addEventListener('click', cerrarPrincipal);
    main.addEventListener('click', (e) => { if (e.target === main) cerrarPrincipal(); });
    $('zhm-subir').addEventListener('click', () => $('zhm-file').click());
    $('zhm-file').addEventListener('change', () => { const f = $('zhm-file').files && $('zhm-file').files[0]; $('zhm-file').value = ''; if (f) onArchivo(f); });
    $('zhm-c-cancel').addEventListener('click', cerrarConfirm);
    conf.addEventListener('click', (e) => { if (e.target === conf && !ocupado) cerrarConfirm(); });
    $('zhm-grid').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); pedirEliminar(del.dataset.del); return; }
      const it = e.target.closest('[data-ver]');
      if (it) verHistoria(Number(it.dataset.ver));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (window.znrHistoriasVisor && window.znrHistoriasVisor.estaAbierto()) return;
      if (!$('zhm-confirm').hidden) { if (!ocupado) cerrarConfirm(); }
      else if (!$('zhm-main').hidden) cerrarPrincipal();
    });
    construido = true;
  }

  function msg(texto, tipo) {
    const el = $('zhm-msg');
    if (!el) return;
    el.textContent = texto || '';
    el.style.color = tipo === 'error' ? '#dc2626' : tipo === 'ok' ? '#16a34a' : '';
  }

  // ── Servidor ─────────────────────────────────────────────────────────
  async function llamar(body) {
    const s = window.vendorSession;
    const token = s && s.uid && s.token && window.znrFirestore && window.znrFirestore.getIdToken
      ? await window.znrFirestore.getIdToken('vendedor', s.uid, s.token) : null;
    if (!token) throw new Error('Sesión no disponible. Cierra e inicia sesión de nuevo.');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ idToken: token }, body))
    });
    return res.json();
  }

  async function cargar() {
    try {
      const r = await llamar({ action: 'misHistorias' });
      if (!r.ok) throw new Error(r.error || 'Error');
      cupo = r.cupo; historias = r.historias;
      pintar();
    } catch (e) {
      msg(e.message || 'No se pudieron cargar tus historias.', 'error');
    }
  }

  function restante(iso) {
    const min = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000));
    return min >= 60 ? 'expira en ' + Math.floor(min / 60) + ' h' : 'expira en ' + min + ' min';
  }

  function pintar() {
    $('zhm-cupo').textContent = `Activas: ${cupo.usadas}/${cupo.max} · Video: ${cupo.videoUsado ? 1 : 0}/1`;
    const lleno = cupo.usadas >= cupo.max;
    $('zhm-subir').disabled = lleno || ocupado;
    if (lleno && !$('zhm-msg').textContent) msg(`Ya tienes ${cupo.max} historias activas. Se libera un espacio al cumplir 24 horas o si eliminas una.`);
    $('zhm-grid').innerHTML = historias.length ? historias.map((h, i) => `
      <div class="zhm-item" data-ver="${i}" role="button" tabindex="0" aria-label="Ver historia">
        ${h.tipo === 'video'
          ? `<video src="${esc(h.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="zhm-tag">VIDEO</span>`
          : `<img src="${esc(h.url)}" alt="" loading="lazy">`}
        ${h.oculta ? '<span class="zhm-tag red">Oculta</span>' : ''}
        <div class="zhm-foot"><span>${esc(restante(h.expiraEn))}</span>
          <button type="button" class="zhm-del" data-del="${esc(h.id)}" aria-label="Eliminar historia">${ico('trash', 14)}</button>
        </div>
      </div>`).join('') : '<p class="zhm-empty">Todavía no tienes historias activas.</p>';
  }

  function verHistoria(i) {
    if (!window.znrHistoriasVisor) return;
    const s = window.vendorSession || {};
    // el visor las muestra de la más vieja a la más nueva
    const orden = historias.slice().reverse();
    window.znrHistoriasVisor.abrir(orden, {
      indice: orden.findIndex(h => h.id === historias[i].id),
      nombre: s.nombre, logo: s.logo, reportar: false
    });
  }

  // ── Modales ──────────────────────────────────────────────────────────
  function abrirPrincipal() {
    construir();
    $('zhm-main').hidden = false;
    document.body.style.overflow = 'hidden';
    msg('');
    pintar();
    cargar();
  }

  function cerrarPrincipal() {
    if (ocupado) return;
    $('zhm-main').hidden = true;
    document.body.style.overflow = '';
  }

  function liberarPrev() {
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    $('zhm-c-media').innerHTML = '';
  }

  function cerrarConfirm() {
    $('zhm-confirm').hidden = true;
    liberarPrev();
  }

  /** Modal de confirmación genérico (subir y eliminar). */
  function confirmar(o) {
    $('zhm-c-title').textContent = o.titulo;
    $('zhm-c-media').innerHTML = '';
    if (o.media) $('zhm-c-media').appendChild(o.media);
    $('zhm-c-text').innerHTML = o.texto;
    const ok = $('zhm-c-ok'), alt = $('zhm-c-alt'), cancel = $('zhm-c-cancel');
    ok.textContent = o.ok; ok.className = 'zhm-c-btn ' + (o.peligro ? 'danger' : 'ok'); ok.disabled = false;
    ok.onclick = o.onOk;
    alt.style.display = o.alt ? '' : 'none';
    if (o.alt) { alt.textContent = o.alt; alt.onclick = o.onAlt; }
    cancel.disabled = false;
    $('zhm-confirm').hidden = false;
  }

  // ── Archivos ─────────────────────────────────────────────────────────
  function aBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1]);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        const k = Math.min(1, IMG_LADO_MAX / Math.max(w, h));
        w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const mime = c.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
        c.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.')), mime, 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  function duracionVideo(file) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video');
      const url = URL.createObjectURL(file);
      v.preload = 'metadata';
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
      v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer el video.')); };
      v.src = url;
    });
  }

  /** Valida el archivo elegido y abre la confirmación con vista previa. */
  async function onArchivo(file) {
    if (ocupado) return;
    msg('');
    const esVideo = file.type.startsWith('video/');
    if (!esVideo && !file.type.startsWith('image/')) { msg('Elige una foto o un video corto.', 'error'); return; }
    if (cupo.usadas >= cupo.max) { msg(`Ya tienes ${cupo.max} historias activas.`, 'error'); return; }
    if (esVideo && cupo.videoUsado) { msg('Solo puedes tener un video activo. Sube una foto o elimina tu video.', 'error'); return; }

    let seg = 0;
    try {
      if (esVideo) {
        seg = await duracionVideo(file);
        if (!isFinite(seg) || seg > MAX_VIDEO_SEG) throw new Error(`El video debe durar unos 4 segundos (máx. ${MAX_VIDEO_SEG} s).`);
        if (file.size > MAX_VIDEO_BYTES) throw new Error('El video pesa más de 6 MB. Graba uno de ~4 segundos en calidad 720p.');
      }
    } catch (e) { msg(e.message, 'error'); return; }

    liberarPrev();
    prevUrl = URL.createObjectURL(file);
    const media = document.createElement(esVideo ? 'video' : 'img');
    media.src = prevUrl;
    if (esVideo) { media.controls = true; media.muted = true; media.loop = true; media.autoplay = true; media.playsInline = true; }
    else media.alt = 'Vista previa de tu historia';

    const quedan = cupo.max - cupo.usadas - 1;
    confirmar({
      titulo: '¿Publicar esta historia?',
      media,
      texto: `Revisa que sea la correcta${esVideo ? ` (video de ${seg.toFixed(1)} s)` : ''}.<br>
        Se verá <b>24 horas</b> en Actividad reciente y en tu perfil.<br>
        Después de publicarla no se puede editar, solo eliminar.<br>
        <span style="opacity:.7">${quedan <= 0 ? `Con esta completas tus ${cupo.max} historias.` : (quedan === 1 ? 'Te quedará 1 espacio' : 'Te quedarán ' + quedan + ' espacios') + ` de ${cupo.max}.`}</span>`,
      ok: 'Sí, publicar',
      alt: 'Elegir otra',
      onOk: () => publicar(file, esVideo),
      onAlt: () => { cerrarConfirm(); $('zhm-file').click(); }
    });
  }

  async function publicar(file, esVideo) {
    if (ocupado) return;
    ocupado = true;
    const ok = $('zhm-c-ok');
    ok.disabled = true; $('zhm-c-alt').disabled = true; $('zhm-c-cancel').disabled = true;
    ok.textContent = 'Publicando…';
    let exito = false;
    try {
      const blob = esVideo ? file : await comprimirImagen(file);
      const r = await llamar({ action: 'subirHistoria', data: await aBase64(blob) });
      if (!r.ok) throw new Error(r.error || 'No se pudo publicar la historia.');
      exito = true;
    } catch (e) {
      msg(e.message || 'No se pudo publicar la historia.', 'error');
    } finally {
      ocupado = false;
      $('zhm-c-alt').disabled = false;
      cerrarConfirm();
      await cargar();
      if (exito) msg('Historia publicada. Ya se ve en Actividad reciente y en tu perfil.', 'ok');
    }
  }

  function pedirEliminar(id) {
    const h = historias.find(x => x.id === id);
    if (!h) return;
    const media = document.createElement(h.tipo === 'video' ? 'video' : 'img');
    media.src = h.url + (h.tipo === 'video' ? '#t=0.1' : '');
    if (h.tipo === 'video') { media.muted = true; media.playsInline = true; media.preload = 'metadata'; }
    confirmar({
      titulo: '¿Eliminar esta historia?',
      media,
      texto: 'Se borra para siempre y deja de verse en Actividad reciente y en tu perfil.',
      ok: 'Sí, eliminar',
      peligro: true,
      onOk: () => eliminar(id)
    });
  }

  async function eliminar(id) {
    if (ocupado) return;
    ocupado = true;
    const ok = $('zhm-c-ok');
    ok.disabled = true; $('zhm-c-cancel').disabled = true; ok.textContent = 'Eliminando…';
    let exito = false;
    try {
      const r = await llamar({ action: 'eliminarHistoria', historiaId: id });
      if (!r.ok) throw new Error(r.error || 'No se pudo eliminar.');
      exito = true;
    } catch (e) {
      msg(e.message, 'error');
    } finally {
      ocupado = false;
      cerrarConfirm();
      await cargar();
      if (exito) msg('Historia eliminada.', 'ok');
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-crear-historia')) abrirPrincipal();
  });
})();
