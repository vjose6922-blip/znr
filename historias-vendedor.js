/**
 * historias-vendedor.js — Botón "Crear historia" del panel de vendedor.
 *
 * Abre un modal con: cómo funcionan las historias, tu cupo, el botón de
 * subir y tus historias activas (tocarlas las abre en el visor; se pueden
 * eliminar). Antes de publicar SIEMPRE se muestra un modal de confirmación
 * con la vista previa, para no subir la imagen equivocada.
 *
 * Reglas (las valida historias-api): solo vendedores Plus y Pro. Plus: 3 activas (1 video); Pro: 6 (3 videos).
 * Videos de hasta 10 s (se recortan en el editor, historias-editor.js). Duran 24 h y luego se borran para siempre.
 */
(function () {
  'use strict';

  const API = 'https://historias-api-1038143238323.us-central1.run.app';
  const MAX_VIDEO_BYTES = 6 * 1024 * 1024;  // mismo tope que el servidor

  let cupo = { usadas: 0, max: 0, videos: 0, maxVideos: 0, nivel: null }; // nivel null = aún no se sabe
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
      .zhm-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);transform:translateX(-50%);z-index:10002;display:flex;align-items:center;gap:10px;max-width:92vw;padding:10px 16px;border-radius:999px;background:#1f2937;color:#fff;font:600 .84rem/1.3 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)}
      .zhm-toast[hidden]{display:none}.zhm-toast.ok{background:#15803d}.zhm-toast.error{background:#b91c1c}
      .zhm-toast button{flex-shrink:0;border:none;border-radius:999px;padding:5px 12px;background:#fff;color:#b91c1c;font:700 .8rem inherit;cursor:pointer}
      .zhm-spin{flex-shrink:0;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:zhm-spin .8s linear infinite}
      @keyframes zhm-spin{to{transform:rotate(360deg)}}
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
      .zhm-star{position:absolute;top:6px;right:6px;border:none;border-radius:999px;padding:3px 8px;background:rgba(255,255,255,.92);color:#b45309;font-size:.7rem;font-weight:800;cursor:pointer}
      .zhm-dest{margin-top:16px}.zhm-dest h4{margin:0 0 4px;font-size:.92rem}.zhm-dest p{margin:0 0 8px;font-size:.75rem;opacity:.7}
      .zhm-dg{margin-bottom:10px}.zhm-dg b{font-size:.82rem}
      .zhm-dr{display:flex;gap:6px;overflow-x:auto;padding:4px 0}
      .zhm-di{position:relative;flex-shrink:0;width:60px;aspect-ratio:9/16;border-radius:8px;overflow:hidden;background:#222}
      .zhm-di img,.zhm-di video{width:100%;height:100%;object-fit:cover}
      .zhm-di button{position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:.7rem;cursor:pointer}
      .zhm-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0}
      .zhm-chips button{border:1px solid #d97706;background:none;color:#b45309;border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer}
      .zhm-chips button.on{background:#d97706;color:#fff}
      .zhm-c-text input{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid #ccc;font:inherit}
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
            <li><b>Plus:</b> 3 a la vez (1 video). <b>Pro:</b> 6 a la vez (3 videos). Videos de hasta <b>10 segundos</b>: si el tuyo es más largo, eliges qué parte usar.</li>
            <li>Antes de publicar puedes agregar texto, emojis, filtros, música, etiquetar a otros vendedores (@) y uno de tus productos.</li>
            <li>Ya publicada no se puede cambiar: si te equivocas, elimínala y sube otra.</li>
          </ul>
        </div>
        <p class="zhm-cupo" id="zhm-cupo"></p>
        <div class="zhm-info" id="zhm-plus" hidden style="margin-top:10px;background:rgba(217,119,6,.08);border-color:rgba(217,119,6,.35)">
          <strong>Las historias son para vendedores Plus y Pro</strong>
          Activa tu plan para publicar historias y aparecer en Actividad reciente. <a href="plan-plus.html" style="font-weight:700">Ver planes</a>
        </div>
        <input type="file" id="zhm-file" accept="image/*,video/mp4,video/quicktime,video/webm" hidden>
        <button type="button" class="zhm-main" id="zhm-subir">${ico('camera', 18)} Subir foto o video</button>
        <p class="zhm-msg" id="zhm-msg" role="status"></p>
        <div class="zhm-grid" id="zhm-grid"></div>
        <div class="zhm-dest" id="zhm-dest" hidden></div>
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
    $('zhm-dest').addEventListener('click', (e) => { const b = e.target.closest('[data-qd]'); if (b) quitarDestacada(...b.dataset.qd.split('|')); });
    $('zhm-grid').addEventListener('click', (e) => {
      const st = e.target.closest('[data-dest]');
      if (st) { e.stopPropagation(); pedirDestacar(st.dataset.dest); return; }
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
      cupo = r.cupo || cupo; historias = r.historias || []; destacadas = r.destacadas || destacadas;
      pintar();
      window.dispatchEvent(new Event('znr-historias-cambio')); // el feed de actividad se refresca
    } catch (e) {
      msg(e.message || 'No se pudieron cargar tus historias.', 'error');
    }
  }

  function restante(iso) {
    const min = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000));
    return min >= 60 ? 'expira en ' + Math.floor(min / 60) + ' h' : 'expira en ' + min + ' min';
  }

  function pintar() {
    const sinPlan = cupo.nivel === '';
    $('zhm-plus').hidden = !sinPlan;
    $('zhm-subir').style.display = sinPlan ? 'none' : ''; // .zhm-main es display:flex: el atributo hidden no lo oculta
    $('zhm-cupo').textContent = cupo.nivel ? `Plan ${cupo.nivel === 'pro' ? 'Pro' : 'Plus'} · Activas: ${cupo.usadas}/${cupo.max} · Videos: ${cupo.videos || 0}/${cupo.maxVideos}` : '';
    const lleno = !!cupo.nivel && cupo.usadas >= cupo.max;
    $('zhm-subir').disabled = lleno || ocupado || cupo.nivel === null;
    if (lleno && !$('zhm-msg').textContent) msg(`Ya tienes ${cupo.max} historias activas. Se libera un espacio al cumplir 24 horas o si eliminas una.`);
    $('zhm-grid').innerHTML = historias.length ? historias.map((h, i) => `
      <div class="zhm-item" data-ver="${i}" role="button" tabindex="0" aria-label="Ver historia">
        ${h.tipo === 'video'
          ? `<video src="${esc(h.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="zhm-tag">VIDEO</span>`
          : `<img src="${esc(h.url)}" alt="" loading="lazy">`}
        ${h.oculta ? '<span class="zhm-tag red">Oculta</span>' : ''}
        ${cupo.nivel === 'pro' ? `<button type="button" class="zhm-star" data-dest="${esc(h.id)}" aria-label="Destacar en tu perfil">⭐ Destacar</button>` : ''}
        <div class="zhm-foot"><span>${esc(restante(h.expiraEn))}<br>${ico('eye', 12)} ${h.vistas || 0}${h.etiquetas && h.etiquetas.length ? ' · Toques: ' + (h.toques || 0) : ''}${h.encuesta ? `<br>📊 ${esc(h.encuesta.opciones[0])} ${pct(h.votos, 0)} · ${esc(h.encuesta.opciones[1])} ${pct(h.votos, 1)}` : ''}</span>
          <button type="button" class="zhm-del" data-del="${esc(h.id)}" aria-label="Eliminar historia">${ico('trash', 14)}</button>
        </div>
      </div>`).join('') : '<p class="zhm-empty">Todavía no tienes historias activas.</p>';
    pintarDestacadas();
  }

  // ── Destacadas (Pro): se quedan en tu perfil después de las 24 h. 3 grupos de hasta 10. ──
  let destacadas = [];
  function pintarDestacadas() {
    const box = $('zhm-dest');
    box.hidden = cupo.nivel !== 'pro';
    if (box.hidden) return;
    const mini = (it) => it.tipo === 'video' ? `<video src="${esc(it.url)}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${esc(it.url)}" alt="" loading="lazy">`;
    box.innerHTML = `<h4>⭐ Destacadas en tu perfil</h4><p>Toca «Destacar» en una historia para que se quede en tu perfil. Hasta 3 grupos de 10.</p>` +
      (destacadas.length ? destacadas.map((g) => `<div class="zhm-dg"><b>${esc(g.nombre)}</b> · ${g.items.length}/10<div class="zhm-dr">${g.items.map((it) =>
        `<div class="zhm-di">${mini(it)}<button type="button" data-qd="${esc(g.id)}|${esc(it.id)}" aria-label="Quitar de destacadas">✕</button></div>`).join('')}</div></div>`).join('')
        : '<p class="zhm-empty" style="padding:4px 0">Aún no tienes destacadas.</p>');
  }

  function pedirDestacar(historiaId) {
    const h = historias.find((x) => x.id === historiaId);
    if (!h) return;
    const media = document.createElement(h.tipo === 'video' ? 'video' : 'img');
    media.src = h.url + (h.tipo === 'video' ? '#t=0.1' : '');
    let elegido = destacadas[0] ? destacadas[0].nombre : '';
    confirmar({
      titulo: 'Destacar en tu perfil', media,
      texto: `${!destacadas.length ? 'Ponle nombre a tu primer grupo:' : 'Elige el grupo' + (destacadas.length < 3 ? ' o crea uno nuevo' : '') + ':'}
        <span class="zhm-chips">${destacadas.map((g, i) => `<button type="button" class="${i ? '' : 'on'}" data-g="${esc(g.nombre)}">${esc(g.nombre)}</button>`).join('')}</span>
        ${destacadas.length < 3 ? '<input type="text" id="zhm-g-nuevo" maxlength="20" placeholder="Nuevo grupo (ej. Novedades)">' : ''}`,
      ok: 'Destacar',
      onOk: async () => {
        const nuevo = ($('zhm-g-nuevo') || {}).value?.trim();
        const grupo = nuevo || elegido;
        if (!grupo) { $('zhm-g-nuevo')?.focus(); return; }
        $('zhm-c-ok').disabled = true;
        const r = await llamar({ action: 'destacarHistoria', historiaId, grupo }).catch((e) => ({ ok: false, error: e.message }));
        cerrarConfirm();
        if (!r.ok) return msg(r.error || 'No se pudo destacar.', 'error');
        destacadas = r.grupos; pintarDestacadas(); msg(`Destacada en «${grupo}». Ya se ve en tu perfil.`, 'ok');
      }
    });
    $('zhm-c-text').querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
      elegido = b.dataset.g; if ($('zhm-g-nuevo')) $('zhm-g-nuevo').value = '';
      $('zhm-c-text').querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b));
    });
  }

  async function quitarDestacada(grupoId, itemId) {
    if (!confirm('¿Quitar esta historia de tus destacadas? Se borra de tu perfil.')) return;
    const r = await llamar({ action: 'quitarDestacada', grupoId, itemId }).catch((e) => ({ ok: false, error: e.message }));
    if (!r.ok) return msg(r.error || 'No se pudo quitar.', 'error');
    destacadas = r.grupos; pintarDestacadas();
  }

  const pct = (v, i) => { const t = (v[0] || 0) + (v[1] || 0); return t ? Math.round((v[i] || 0) * 100 / t) + '%' : '0'; };

  function verHistoria(i) {
    if (!window.znrHistoriasVisor) return;
    const s = window.vendorSession || {};
    // el visor las muestra de la más vieja a la más nueva
    const orden = historias.slice().reverse();
    window.znrHistoriasVisor.abrir(orden, {
      indice: orden.findIndex(h => h.id === historias[i].id),
      nombre: s.nombre, logo: s.logo, nivel: cupo.nivel, reportar: false
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
    $('zhm-main').hidden = true;
    document.body.style.overflow = '';
  }

  let prevAudio = null;        // canción de una foto, sonando en la vista previa
  function liberarPrev() {
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    if (prevAudio) { prevAudio.pause(); prevAudio = null; }
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

  /** Abre el editor con el archivo elegido y, al terminar, la confirmación con la vista previa del resultado. */
  async function onArchivo(file) {
    if (ocupado) { msg('Espera a que termine de publicarse tu historia.', 'error'); return; }
    msg('');
    const esVideo = file.type.startsWith('video/');
    if (!esVideo && !file.type.startsWith('image/')) { msg('Elige una foto o un video.', 'error'); return; }
    if (cupo.usadas >= cupo.max) { msg(`Ya tienes ${cupo.max} historias activas.`, 'error'); return; }
    if (esVideo && (cupo.videos || 0) >= cupo.maxVideos) { msg(cupo.maxVideos === 1 ? 'Solo puedes tener un video activo. Sube una foto o elimina tu video.' : `Ya tienes ${cupo.maxVideos} videos activos. Sube una foto o elimina un video.`, 'error'); return; }
    if (!window.znrEditorHistoria) { msg('No se pudo abrir el editor. Recarga la página.', 'error'); return; }

    const r = await window.znrEditorHistoria.abrir(file, {
      buscarVendedores: (q) => llamar({ action: 'buscarVendedores', q }).then((x) => (x.ok ? x.vendedores : [])),
      // Fuera del panel (feed de actividad) no están cargados sus productos: se piden al catálogo.
      productos: async () => (window._vendorProducts || await fetch('https://catalogo-api-1038143238323.us-central1.run.app?' + new URLSearchParams({ action: 'productosPorVendedor', vendedor_uid: window.vendorSession.uid, limit: '200' }))
        .then((x) => x.json()).then((d) => d.products || []).catch(() => [])).filter((p) => p.estado === 'aprobado'),
      maxBytes: MAX_VIDEO_BYTES // el editor no deja continuar si el video pesa más (así no se pierde lo editado)
    });
    if (!r) return;

    liberarPrev();
    prevUrl = URL.createObjectURL(r.blob);
    const media = document.createElement(r.esVideo ? 'video' : 'img');
    media.src = prevUrl;
    if (r.esVideo) { media.controls = true; media.loop = true; media.autoplay = true; media.playsInline = true; }
    else media.alt = 'Vista previa de tu historia';
    if (r.musica && !r.esVideo) {
      prevAudio = new Audio('musica/' + encodeURIComponent(r.musica.archivo)); prevAudio.currentTime = r.musica.inicio;
      prevAudio.ontimeupdate = () => { if (prevAudio && prevAudio.currentTime >= r.musica.inicio + 5) prevAudio.currentTime = r.musica.inicio; };
      prevAudio.play().catch(() => {});
    }

    const quedan = cupo.max - cupo.usadas - 1;
    confirmar({
      titulo: '¿Publicar esta historia?',
      media,
      texto: `Revisa que se vea como quieres.<br>
        Se verá <b>24 horas</b> en Actividad reciente y en tu perfil.<br>
        ${r.etiquetas.some((e) => e.tipo === 'mencion') ? 'Les avisaremos a los vendedores que etiquetaste.<br>' : ''}
        ${r.musica ? `🎵 Con música: ${esc(r.musica.titulo)}<br>` : ''}
        <span style="opacity:.7">${quedan <= 0 ? `Con esta completas tus ${cupo.max} historias.` : (quedan === 1 ? 'Te quedará 1 espacio' : 'Te quedarán ' + quedan + ' espacios') + ` de ${cupo.max}.`}</span>`,
      ok: 'Sí, publicar',
      alt: 'Editar otra vez',
      onOk: () => publicar(r),
      onAlt: () => { cerrarConfirm(); onArchivo(file); }
    });
  }

  // Aviso pequeño abajo (la publicación sigue en segundo plano y se puede usar el resto de la página).
  function aviso(html, tipo, ms) {
    let t = $('zhm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'zhm-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.className = 'zhm-toast ' + (tipo || ''); t.innerHTML = html; t.hidden = false;
    clearTimeout(t._t); if (ms) t._t = setTimeout(() => { t.hidden = true; }, ms);
    return t;
  }

  async function publicar(r) {
    if (ocupado) return;
    ocupado = true;
    cerrarConfirm(); $('zhm-main').hidden = true; document.body.style.overflow = '';
    aviso('<span class="zhm-spin"></span>Publicando tu historia…');
    try {
      const res = await llamar({ action: 'subirHistoria', data: await aBase64(r.blob), etiquetas: JSON.stringify(r.etiquetas), musica: r.musica ? JSON.stringify(r.musica) : '', encuesta: r.encuesta ? JSON.stringify(r.encuesta) : '' });
      if (!res.ok) throw new Error(res.error || 'No se pudo publicar la historia.');
      ocupado = false;
      aviso('✓ Historia publicada', 'ok', 3500);
      cargar();
    } catch (e) {
      // Lo editado se conserva: "Reintentar" vuelve a subir lo mismo.
      ocupado = false;
      aviso(`<span>${esc(e.message || 'No se pudo publicar la historia.')}</span><button type="button">Reintentar</button>`, 'error')
        .querySelector('button').onclick = () => publicar(r);
    }
  }
  window.addEventListener('beforeunload', (e) => { if (ocupado) { e.preventDefault(); e.returnValue = ''; } }); // no salir a media subida

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
