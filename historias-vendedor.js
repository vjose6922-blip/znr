/**
 * historias-vendedor.js — Sección "Actividad" (historias de 24 h) en
 * Ajustes de cuenta del panel de vendedor.
 *
 * Reglas (las valida historias-api; aquí solo se avisa antes de subir):
 *   - máx. 3 historias activas a la vez, y solo 1 puede ser video (~4 s)
 *   - duran 24 h y luego se borran para siempre
 */
(function () {
  'use strict';

  const API = 'https://historias-api-1038143238323.us-central1.run.app';
  const MAX_HISTORIAS = 3;
  const MAX_VIDEO_SEG = 5;                  // "~4 segundos" + un poco de margen
  const MAX_VIDEO_BYTES = 6 * 1024 * 1024;  // mismo tope que el servidor
  const IMG_LADO_MAX = 1080;

  let cupo = { usadas: 0, max: MAX_HISTORIAS, videoUsado: false };
  let ocupado = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function msg(texto, tipo) {
    const el = $('historias-msg');
    if (!el) return;
    el.textContent = texto || '';
    el.style.color = tipo === 'error' ? '#dc2626' : tipo === 'ok' ? '#16a34a' : '#888';
  }

  async function idToken() {
    const s = window.vendorSession;
    if (!s || !s.uid || !s.token || !window.znrFirestore || !window.znrFirestore.getIdToken) return null;
    return window.znrFirestore.getIdToken('vendedor', s.uid, s.token);
  }

  async function llamar(body) {
    const token = await idToken();
    if (!token) throw new Error('Sesión no disponible. Cierra e inicia sesión de nuevo.');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ idToken: token }, body))
    });
    return res.json();
  }

  function restante(expiraEn) {
    const min = Math.max(0, Math.round((new Date(expiraEn) - Date.now()) / 60000));
    return min >= 60 ? 'expira en ' + Math.floor(min / 60) + ' h' : 'expira en ' + min + ' min';
  }

  function pintar(historias) {
    const lista = $('historias-lista');
    const cupoEl = $('historias-cupo');
    const badge = $('historias-count-badge');
    const btn = $('historias-btn-subir');
    if (!lista) return;

    cupoEl.textContent = `Hoy: ${cupo.usadas}/${cupo.max} historias · Video: ${cupo.videoUsado ? 1 : 0}/1`;
    if (badge) badge.textContent = cupo.usadas ? `(${cupo.usadas}/${cupo.max})` : '';
    if (btn) {
      const lleno = cupo.usadas >= cupo.max;
      btn.disabled = lleno || ocupado;
      btn.style.opacity = lleno ? '.5' : '1';
    }

    lista.innerHTML = historias.map(h => `
      <div style="position:relative;border-radius:10px;overflow:hidden;background:#111;aspect-ratio:9/16;">
        ${h.tipo === 'video'
          ? `<video src="${esc(h.url)}#t=0.1" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>
             <span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:999px;">VIDEO</span>`
          : `<img src="${esc(h.url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`}
        ${h.oculta ? `<span style="position:absolute;top:6px;right:6px;background:#dc2626;color:#fff;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:999px;">Oculta</span>` : ''}
        <div style="position:absolute;left:0;right:0;bottom:0;padding:16px 6px 5px;background:linear-gradient(transparent,rgba(0,0,0,.75));display:flex;align-items:center;justify-content:space-between;gap:4px;">
          <span style="color:#fff;font-size:.62rem;">${esc(restante(h.expiraEn))}</span>
          <button type="button" data-historia-del="${esc(h.id)}" aria-label="Eliminar" style="background:rgba(255,255,255,.9);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <svg width="13" height="13" aria-hidden="true" style="color:#dc2626;"><use href="#ic-trash"/></svg>
          </button>
        </div>
      </div>`).join('');
  }

  async function cargar() {
    try {
      const r = await llamar({ action: 'misHistorias' });
      if (!r.ok) throw new Error(r.error || 'Error');
      cupo = r.cupo;
      pintar(r.historias);
    } catch (e) {
      msg(e.message || 'No se pudieron cargar tus historias.', 'error');
    }
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

  async function onArchivo(file) {
    if (!file || ocupado) return;
    const esVideo = file.type.startsWith('video/');
    const esImagen = file.type.startsWith('image/');
    if (!esVideo && !esImagen) { msg('Elige una foto o un video corto.', 'error'); return; }
    if (cupo.usadas >= cupo.max) { msg(`Ya tienes ${cupo.max} historias activas.`, 'error'); return; }
    if (esVideo && cupo.videoUsado) { msg('Solo puedes tener un video activo. Sube una foto o elimina tu video.', 'error'); return; }

    ocupado = true;
    const btn = $('historias-btn-subir');
    if (btn) btn.disabled = true;
    try {
      let blob = file;
      if (esVideo) {
        const seg = await duracionVideo(file);
        if (!isFinite(seg) || seg > MAX_VIDEO_SEG) throw new Error(`El video debe durar unos 4 segundos (máx. ${MAX_VIDEO_SEG} s).`);
        if (file.size > MAX_VIDEO_BYTES) throw new Error('El video pesa más de 6 MB. Graba uno de ~4 segundos en calidad 720p.');
      } else {
        msg('Procesando imagen…');
        blob = await comprimirImagen(file);
      }
      msg('Subiendo…');
      const r = await llamar({ action: 'subirHistoria', data: await aBase64(blob) });
      if (!r.ok) throw new Error(r.error || 'No se pudo publicar la historia.');
      msg('Historia publicada. Se verá 24 horas en Actividad reciente.', 'ok');
    } catch (e) {
      msg(e.message || 'No se pudo publicar la historia.', 'error');
    } finally {
      ocupado = false;
      const inp = $('historias-file');
      if (inp) inp.value = '';
      await cargar();
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta historia? Se borra para siempre.')) return;
    try {
      const r = await llamar({ action: 'eliminarHistoria', historiaId: id });
      if (!r.ok) throw new Error(r.error || 'No se pudo eliminar.');
      msg('Historia eliminada.', 'ok');
    } catch (e) {
      msg(e.message, 'error');
    }
    await cargar();
  }

  function init() {
    const btn = $('historias-btn-subir');
    const inp = $('historias-file');
    const toggle = $('settings-historias-toggle');
    if (!btn || !inp || !toggle) return;

    btn.addEventListener('click', () => inp.click());
    inp.addEventListener('change', () => onArchivo(inp.files && inp.files[0]));
    $('historias-lista').addEventListener('click', (e) => {
      const b = e.target.closest('[data-historia-del]');
      if (b) eliminar(b.dataset.historiaDel);
    });
    // Se carga al abrir la sección (el acordeón ya lo abre toggleSettingsSection).
    toggle.addEventListener('click', () => {
      if (toggle.classList.contains('open')) { msg(''); cargar(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
