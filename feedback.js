/**
 * feedback.js — Reportar un problema / enviar feedback al administrador.
 * Uso: ZNRFeedback.open('comprador') o ZNRFeedback.open('vendedor').
 * Se autocontiene (inyecta su propio modal y estilos).
 */
(function () {
  'use strict';
  if (window.ZNRFeedback) return;

  const COOLDOWN_KEY = 'znr_feedback_last';
  const COOLDOWN_MS = 30000;
  const MAX_IMG_SIDE = 1280;
  const MAX_IMG_CHARS = 450000; // data URL final (el servidor acepta hasta 600k)

  const AREAS = [
    ['', 'Selecciona dónde ocurrió…'],
    ['catalogo', 'Catálogo / búsqueda'],
    ['comunidad', 'Comunidad (productos de vendedores)'],
    ['pedidos', 'Pedidos y seguimiento'],
    ['live', 'Live shopping'],
    ['pagos', 'Pagos'],
    ['notificaciones', 'Notificaciones'],
    ['panel-vendedor', 'Panel del vendedor'],
    ['cuenta', 'Mi cuenta / inicio de sesión'],
    ['otro', 'Otro']
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function apiUrl() {
    return window.VENTAS_API_URL || 'https://ventas-api-1038143238323.us-central1.run.app';
  }

  function injectStyles() {
    if (document.getElementById('zfb-styles')) return;
    const st = document.createElement('style');
    st.id = 'zfb-styles';
    st.textContent = `
#zfb-overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
#zfb-box{background:#fff;color:#1f2330;width:100%;max-width:520px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;border-radius:18px;padding:18px;box-sizing:border-box;font-family:inherit}
[data-theme="dark"] #zfb-box{background:#1a1d27;color:#e8eaf0}
#zfb-box h2{margin:0 0 6px;font-size:1.15rem}
#zfb-box .zfb-info{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:10px 12px;font-size:.8rem;line-height:1.5;margin:8px 0 14px}
#zfb-box label{display:block;font-size:.8rem;font-weight:600;margin:12px 0 4px}
#zfb-box label small{font-weight:400;opacity:.65}
#zfb-box select,#zfb-box textarea,#zfb-box input[type=file]{width:100%;box-sizing:border-box;border:1px solid #ccd0da;border-radius:10px;padding:9px 11px;font-size:.9rem;background:transparent;color:inherit;font-family:inherit}
[data-theme="dark"] #zfb-box select option{background:#1a1d27}
#zfb-box textarea{resize:vertical;min-height:70px}
#zfb-box .zfb-check{display:flex;gap:8px;align-items:flex-start;font-size:.78rem;font-weight:400;margin-top:14px}
#zfb-box .zfb-check input{margin-top:2px}
#zfb-preview{margin-top:8px;display:none;position:relative}
#zfb-preview img{max-width:100%;max-height:160px;border-radius:10px;border:1px solid #ccd0da}
#zfb-preview button{position:absolute;top:4px;left:4px;border:none;border-radius:50%;width:24px;height:24px;background:rgba(0,0,0,.65);color:#fff;cursor:pointer}
#zfb-msg{min-height:18px;font-size:.82rem;margin:10px 0 0;text-align:center}
.zfb-actions{display:flex;gap:10px;margin-top:14px}
.zfb-actions button{flex:1;padding:12px;border-radius:12px;font-size:.92rem;font-weight:700;cursor:pointer;border:1.5px solid #7c3aed}
#zfb-send{background:#7c3aed;color:#fff}
#zfb-cancel{background:transparent;color:#7c3aed}
.zfb-actions button:disabled{opacity:.55;cursor:default}`;
    document.head.appendChild(st);
  }

  function pageName() {
    return (location.pathname.split('/').pop() || 'index.html').slice(0, 120);
  }

  function guessArea(rol) {
    const p = pageName();
    if (/vendedor/.test(p) || rol === 'vendedor') return 'panel-vendedor';
    if (/live|entregas|seguimiento/.test(p)) return 'live';
    if (/pedido/.test(p)) return 'pedidos';
    if (/comunidad/.test(p)) return 'comunidad';
    if (/catalogo|index/.test(p)) return 'catalogo';
    return '';
  }

  function technicalInfo() {
    let errores = [];
    try {
      if (window.ZRMonitor && ZRMonitor.getErrors) {
        errores = ZRMonitor.getErrors().slice(-5).map(e => ({
          ts: e.ts, fuente: e.source, mensaje: String(e.message || '').slice(0, 200), pagina: e.url
        }));
      }
    } catch (_) {}
    let pwa = false;
    try { pwa = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (_) {}
    return {
      ua: navigator.userAgent.slice(0, 220),
      pantalla: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`,
      idioma: navigator.language || '',
      enLinea: navigator.onLine,
      pwaInstalada: pwa,
      tema: document.documentElement.dataset.theme || '',
      hora: new Date().toISOString(),
      ultimosErrores: errores
    };
  }

  // Reduce la captura a JPEG ≤ ~450 KB para no cargar el servidor.
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        const k = Math.min(1, MAX_IMG_SIDE / Math.max(w, h));
        w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let q = 0.8, out = c.toDataURL('image/jpeg', q);
        while (out.length > MAX_IMG_CHARS && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        if (out.length > MAX_IMG_CHARS) return reject(new Error('La imagen es demasiado pesada'));
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  function close() {
    const o = document.getElementById('zfb-overlay');
    if (o) o.remove();
  }

  function open(rolArg) {
    const rol = rolArg === 'vendedor' ? 'vendedor' : 'comprador';
    injectStyles();
    close();

    const overlay = document.createElement('div');
    overlay.id = 'zfb-overlay';
    overlay.innerHTML = `
<div id="zfb-box" role="dialog" aria-modal="true" aria-labelledby="zfb-title">
  <h2 id="zfb-title">Reportar un problema</h2>
  <div class="zfb-info">
    <strong>¿Para qué sirve esto?</strong><br>
    Si algo no funciona bien en la app (un error, un botón que no responde, algo que se ve mal) o tienes una idea para mejorarla, cuéntanoslo aquí.
    Tu reporte le llega directamente al administrador, que lo revisa para encontrar y corregir la falla. Entre más detalle des, más rápido podremos resolverlo.
  </div>

  <label for="zfb-tipo">Tipo de reporte</label>
  <select id="zfb-tipo">
    <option value="error">Error (algo falla o se rompe)</option>
    <option value="inesperado">Algo no funciona como esperaba</option>
    <option value="sugerencia">Sugerencia / idea</option>
    <option value="otro">Otro</option>
  </select>

  <label for="zfb-area">¿Dónde ocurrió?</label>
  <select id="zfb-area">${AREAS.map(a => `<option value="${a[0]}">${esc(a[1])}</option>`).join('')}</select>

  <label for="zfb-mensaje">¿Qué pasó? *</label>
  <textarea id="zfb-mensaje" maxlength="2000" placeholder="Describe el problema con tus palabras. Ej: Al tocar “Pagar” se queda cargando y no pasa nada."></textarea>

  <label for="zfb-pasos">Pasos para repetirlo <small>(opcional)</small></label>
  <textarea id="zfb-pasos" maxlength="1500" placeholder="1. Abrí un pedido…&#10;2. Toqué…&#10;3. Entonces…"></textarea>

  <label for="zfb-esperado">¿Qué esperabas que pasara? <small>(opcional)</small></label>
  <textarea id="zfb-esperado" maxlength="1000" style="min-height:50px"></textarea>

  <label for="zfb-file">Captura de pantalla <small>(opcional)</small></label>
  <input type="file" id="zfb-file" accept="image/*">
  <div id="zfb-preview"><img alt="Vista previa de la captura"><button type="button" id="zfb-quitar" aria-label="Quitar captura">×</button></div>

  <label class="zfb-check">
    <input type="checkbox" id="zfb-tec" checked>
    <span>Incluir información técnica (página, tipo de dispositivo y últimos errores de la app). Ayuda al administrador a encontrar la falla; no incluye contraseñas ni datos de pago.</span>
  </label>

  <p id="zfb-msg" role="status"></p>
  <div class="zfb-actions">
    <button type="button" id="zfb-cancel">Cancelar</button>
    <button type="button" id="zfb-send">Enviar reporte</button>
  </div>
</div>`;
    document.body.appendChild(overlay);

    const $ = id => overlay.querySelector('#' + id);
    $('zfb-area').value = guessArea(rol);
    let captura = '';

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    $('zfb-cancel').addEventListener('click', close);

    $('zfb-file').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      captura = '';
      $('zfb-preview').style.display = 'none';
      if (!f) return;
      $('zfb-msg').textContent = 'Procesando imagen…';
      try {
        captura = await compressImage(f);
        $('zfb-preview').querySelector('img').src = captura;
        $('zfb-preview').style.display = 'block';
        $('zfb-msg').textContent = '';
      } catch (err) {
        e.target.value = '';
        $('zfb-msg').style.color = '#dc2626';
        $('zfb-msg').textContent = err.message || 'No se pudo procesar la imagen';
      }
    });
    $('zfb-quitar').addEventListener('click', () => {
      captura = ''; $('zfb-file').value = ''; $('zfb-preview').style.display = 'none';
    });

    $('zfb-send').addEventListener('click', async () => {
      const msg = $('zfb-msg');
      msg.style.color = '#dc2626';
      const mensaje = $('zfb-mensaje').value.trim();
      if (mensaje.length < 10) { msg.textContent = 'Cuéntanos con un poco más de detalle qué pasó.'; return; }
      const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      if (Date.now() - last < COOLDOWN_MS) { msg.textContent = 'Espera unos segundos antes de enviar otro reporte.'; return; }

      const params = {
        action: 'enviarFeedback', rol,
        tipo: $('zfb-tipo').value, area: $('zfb-area').value,
        mensaje, pasos: $('zfb-pasos').value.trim(), esperado: $('zfb-esperado').value.trim(),
        pagina: pageName()
      };
      if ($('zfb-tec').checked) params.tecnico = JSON.stringify(technicalInfo());
      if (captura) params.captura = captura;
      if (rol === 'vendedor') {
        try {
          const s = JSON.parse(localStorage.getItem('vendor_session') || sessionStorage.getItem('vendor_session') || 'null');
          params.vendorToken = (s && s.token) || '';
        } catch (_) { params.vendorToken = ''; }
      } else {
        params.clientPhone = localStorage.getItem('client_phone') || '';
      }

      const btn = $('zfb-send');
      btn.disabled = true; btn.textContent = 'Enviando…'; msg.textContent = '';
      try {
        const r = await fetch(apiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params).toString()
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'No se pudo enviar el reporte');
        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        overlay.querySelector('#zfb-box').innerHTML = `
          <h2>¡Gracias por avisarnos!</h2>
          <p style="font-size:.9rem;line-height:1.5">Tu reporte llegó al administrador. Lo revisaremos para corregirlo lo antes posible.</p>
          <div class="zfb-actions"><button type="button" id="zfb-send" style="background:#7c3aed;color:#fff">Cerrar</button></div>`;
        overlay.querySelector('#zfb-send').addEventListener('click', close);
      } catch (err) {
        msg.textContent = (err && err.message) || 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.';
        btn.disabled = false; btn.textContent = 'Enviar reporte';
      }
    });

    setTimeout(() => { const t = $('zfb-mensaje'); if (t) t.focus(); }, 50);
  }

  window.ZNRFeedback = { open, close };
})();
