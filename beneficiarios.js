/* Refugios y fundaciones (beneficiarios): modales de registro/edición, detalle, reporte y donar.
   Los usan refugios.html y comunidad.html (botón "Ver beneficiario" de los artículos donados). */
(function () {
const run = (n) => `https://${n}-api-1038143238323.us-central1.run.app`;
const CATALOGO_API_URL_INSPECTOR = run('catalogo');
const VENTAS_API_URL_INSPECTOR = run('ventas');
const _resolverApiUrlInspector = (action) => action === 'misProductosComunidad' ? CATALOGO_API_URL_INSPECTOR : run('beneficiarios');

// ── Modal: Registro de beneficiario (y también edición, ver 2do/3er parámetro) ─
// modoEdicion: true => es una solicitud de edición sobre un beneficiario ya aprobado
// idBeneficiario: id del beneficiario existente (requerido si modoEdicion=true)
// datosActuales: objeto con los valores actuales para prellenar el formulario
window.openBeneficiarioRegister = function(modoEdicion, idBeneficiario, datosActuales) {

  // Restaurar sesión desde localStorage si no existe
  if (!window.vendorSession) {
    try {
      const stored = localStorage.getItem('vendor_session');
      if (stored) {
        window.vendorSession = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('No se pudo restaurar sesión:', e);
    }
  }

  const old = document.getElementById('modal-beneficiario-register');
  if (old) old.remove();

  const d = datosActuales || {};
  const escv = s => String(s || '').replace(/"/g, '&quot;');

  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-register';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%; height:90%;overflow-y:auto;padding:24px 20px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${modoEdicion ? 'Editar tu fundación' : 'Registra tu Fundacion'}</h2>
        <button id="btn-close-ben-reg" style="background:none;border:none;font-size:22px;cursor:pointer;line-height:1;">×</button>
      </div>
      <p style="font-size:.8rem;color:#888;margin:0 0 14px;">${modoEdicion ? 'Estos cambios se enviarán como solicitud. El administrador comparará tu información actual con la nueva antes de aplicarla.' : 'Completa tu información. El administrador revisará tu solicitud y te contactará por WhatsApp.'}</p>
      <div id="ben-reg-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:12px;font-size:.82rem;"></div>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Nombre completo *</label>
      <input id="ben-nombre" type="text" value="${escv(d.nombre)}" placeholder="Tu nombre completo" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Organización (opcional)</label>
      <input id="ben-org" type="text" value="${escv(d.organizacion)}" placeholder="Nombre de la organización si aplica" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">País *</label>
<select id="ben-pais" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;background:#fff;"></select>

<label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Ciudad *</label>
<select id="ben-ciudad" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;background:#fff;"></select>

<label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Dirección / referencia *<span style="font-weight:400;color:#c2410c;"> · se muestra públicamente, no pongas un domicilio particular</span></label>
<input id="ben-ubicacion" type="text" value="${escv(d.ubicacion)}" placeholder="Ej. Calle X #123, Col. Centro" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Facebook (URL o usuario)</label>
      <input id="ben-facebook" type="text" value="${escv(d.facebook)}" placeholder="https://facebook.com/tu-pagina" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">¿Para qué necesitas las donaciones? *</label>
      <textarea id="ben-historia" rows="3" placeholder="Cuéntanos tu historia o propósito..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;resize:vertical;">${escv(d.historia)}</textarea>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">CLABE / Número de cuenta *</label>
      <input id="ben-cuenta" type="text" value="${escv(d.cuenta_bancaria)}" placeholder="18 dígitos CLABE o número de cuenta" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">WhatsApp (10 dígitos) *</label>
      <input id="ben-telefono" type="tel" value="${escv(d.telefono)}" placeholder="8671234567" maxlength="10" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:16px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Fotos (opcional, máx. 3 — puedes elegir varias a la vez)</label>
      <div style="display:flex;gap:8px;margin-bottom:16px;" id="ben-img-previews">
       
        
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-1">
          <span id="ben-img-placeholder-1" style="font-size:1.4rem;display:${d.imagen1 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-1"
     ${d.imagen1 ? `src="${escv(d.imagen1)}"` : ""}
     style="display:${d.imagen1 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-1" accept="image/*" multiple style="display:none;">
        </label>
       
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-2">
          <span id="ben-img-placeholder-2" style="font-size:1.4rem;display:${d.imagen2 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-2"
     ${d.imagen2 ? `src="${escv(d.imagen2)}"` : ""}
     style="display:${d.imagen2 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-2" accept="image/*" multiple style="display:none;">
        </label>
        
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-3">
          <span id="ben-img-placeholder-3" style="font-size:1.4rem;display:${d.imagen3 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-3"
     ${d.imagen3 ? `src="${escv(d.imagen3)}"` : ""}
     style="display:${d.imagen3 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-3" accept="image/*" multiple style="display:none;">
       
        
        
        </label>
      </div>
      <button id="btn-submit-ben" data-modo="${modoEdicion ? 'editar' : 'nuevo'}" data-id="${escv(idBeneficiario||'')}" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:800;font-size:.92rem;cursor:pointer;">${modoEdicion ? 'Enviar cambios' : 'Enviar solicitud'}</button>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-reg').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  if (typeof enlazarPaisCiudad === 'function') {
  const paisSel = document.getElementById('ben-pais');
  const ciudadSel = document.getElementById('ben-ciudad');
  if (paisSel && ciudadSel) {
    enlazarPaisCiudad(paisSel, ciudadSel);
    // Pre-llenar: primero con la sesión del vendedor (si ya trae pais/ciudad),
    // luego con los datos existentes del beneficiario (modo edición).
    const paisInicial = (window.vendorSession && window.vendorSession.pais) || d.pais || '';
    const ciudadInicial = (window.vendorSession && window.vendorSession.ciudad) || d.ciudad || '';
    if (paisInicial) fijarUbicacion(paisSel, ciudadSel, paisInicial, ciudadInicial);
  }
}
  // Preview de imágenes
  function benUpdatePreview(n, file) {
    const preview = document.getElementById('ben-img-preview-' + n);
    const placeholder = document.getElementById('ben-img-placeholder-' + n);
    if (!preview || !placeholder) return;
    if (!file) {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = '';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  }
  function benSetSlotFile(n, file) {
    const input = document.getElementById('ben-img-' + n);
    if (!input) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) { /* ignore */ }
    benUpdatePreview(n, file);
  }
  [1,2,3].forEach(n => {
    document.getElementById('ben-img-' + n)?.addEventListener('change', function() {
      const files = Array.from(this.files || []);
      if (!files.length) return;
      let slot = n;
      for (const file of files) {
        if (slot > 3) break;
        benSetSlotFile(slot, file);
        slot++;
      }
    });
  });

  // Evento de envío
  document.getElementById('btn-submit-ben')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const modo = this.dataset.modo === 'editar' ? 'editar' : 'nuevo';
    const idBen = this.dataset.id || '';
    const showMsg = (txt, ok) => {
      const el = document.getElementById('ben-reg-msg');
      el.innerHTML = (ok ? Icon('check') : Icon('error')) + ' <span></span>';
      el.querySelector('span').textContent = txt;
      el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };

    // Validar campos
    const nombre     = document.getElementById('ben-nombre').value.trim();
const tel        = document.getElementById('ben-telefono').value.replace(/\D/g, '');
const pais       = document.getElementById('ben-pais').value;
const ciudad     = document.getElementById('ben-ciudad').value;
const ubicacion  = document.getElementById('ben-ubicacion').value.trim();
const historia   = document.getElementById('ben-historia').value.trim();
const cuenta     = document.getElementById('ben-cuenta').value.trim();

if (!nombre)           return showMsg('El nombre es requerido.', false);
if (!pais)             return showMsg('El país es requerido.', false);
if (!ciudad)           return showMsg('La ciudad es requerida.', false);
if (!ubicacion)        return showMsg('La dirección es requerida.', false);
if (!historia)         return showMsg('Cuéntanos tu propósito.', false);
if (!cuenta)           return showMsg('La cuenta bancaria es requerida.', false);
if (tel.length !== 10) return showMsg('El WhatsApp debe tener 10 dígitos.', false);

    // Restaurar sesión por si no se hizo antes
    if (!window.vendorSession) {
      try {
        const stored = localStorage.getItem('vendor_session');
        if (stored) window.vendorSession = JSON.parse(stored);
      } catch (e) {}
    }

    const vendor = window.vendorSession;
    if (!vendor || !vendor.token) {
      showMsg('Debes iniciar sesión como vendedor para registrarte como beneficiario. Ve a "Mi cuenta de vendedor".', false);
      // Opcional: agregar un enlace para ir a vendedor.html
            const link = document.createElement('a');
      link.href = 'vendedor.html';
      link.innerHTML = 'Ir a mi cuenta de vendedor <span style="font-size:1em;">→</span>';
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.gap = '6px';
      link.style.marginTop = '10px';
      link.style.padding = '8px 16px';
      link.style.borderRadius = '999px';
      link.style.background = '#ffffff';
      link.style.color = 'var(--color-accent-solid)';
      link.style.fontWeight = '700';
      link.style.fontSize = '.82rem';
      link.style.textDecoration = 'none';
      link.style.boxShadow = '0 1px 3px rgba(0,0,0,.12)';
      link.style.transition = 'background .15s, color .15s';
      link.addEventListener('mouseenter', () => { link.style.background = 'var(--color-accent-solid)'; link.style.color = '#ffffff'; });
      link.addEventListener('mouseleave', () => { link.style.background = '#ffffff'; link.style.color = 'var(--color-accent-solid)'; });
      document.getElementById('ben-reg-msg').appendChild(link);
      return;
    }

    // Validar que el teléfono coincida con el de la sesión (opcional)
    if (vendor.telefono && String(vendor.telefono).replace(/\D/g, '') !== tel) {
      showMsg('El teléfono no coincide con tu cuenta de vendedor. Usa el número registrado: ' + vendor.telefono, false);
      return;
    }

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      async function uploadBenImg(file) {
        const reader = new FileReader();
        const base64 = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const params = new URLSearchParams({
          action: 'uploadImageVendedor',
          data: base64,
          mimeType: file.type,
          fileName: file.name,
          vendorToken: vendor.token
        });
        const r = await fetch(CATALOGO_API_URL_INSPECTOR, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Error al subir imagen');
        return j.url || '';
      }

      const imgUrls = ['', '', ''];
      for (let n = 1; n <= 3; n++) {
        const fileInput = document.getElementById('ben-img-' + n);
        if (fileInput && fileInput.files[0]) {
          btn.textContent = `Subiendo foto ${n}…`;
          try {
            imgUrls[n - 1] = await uploadBenImg(fileInput.files[0]);
          } catch (e) {
            showMsg('Error al subir la imagen ' + n + ': ' + e.message, false);
            btn.disabled = false;
            btn.textContent = 'Enviar solicitud';
            return;
          }
        }
      }

      btn.textContent = modo === 'editar' ? 'Enviando cambios…' : 'Enviando solicitud…';
      const payload = {
  action: modo === 'editar' ? 'solicitarEdicionBeneficiario' : 'registrarBeneficiario',
  nombre,
  organizacion: document.getElementById('ben-org').value.trim(),
  pais,
  ciudad,
  ubicacion,
  facebook: document.getElementById('ben-facebook').value.trim(),
  historia,
  cuenta_bancaria: cuenta,
  telefono: tel,
  imagen1: imgUrls[0],
  imagen2: imgUrls[1],
  imagen3: imgUrls[2],
  vendorToken: vendor.token
};
      if (modo === 'editar') payload.id_beneficiario = idBen;
      const res = await fetch(_resolverApiUrlInspector(payload.action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });

      const data = await res.json();
      if (data.ok) {
        showMsg(modo === 'editar' ? '¡Cambios enviados! El administrador los revisará antes de aplicarlos.' : '¡Solicitud enviada! El administrador te contactará pronto por WhatsApp.', true);
        btn.textContent = 'Enviado';
        setTimeout(() => {
          const modal = document.getElementById('modal-beneficiario-register');
          if (modal) modal.remove();
        }, 3000);
      } else {
        showMsg((data.error || 'Error al enviar'), false);
        btn.disabled = false;
        btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
      }
    } catch (err) {
      console.error('Error en registro beneficiario:', err);
      showMsg('Error de conexión: ' + err.message, false);
      btn.disabled = false;
      btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
    }
  });
};

// ── Modal: Ver detalle de beneficiario ──────────────────────
window.openBeneficiarioModal = async function(beneficiarioId) {
  if (!beneficiarioId) return;
  const old = document.getElementById('modal-beneficiario-detalle');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-detalle';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%;max-height:96vh;overflow-y:auto;padding:24px 20px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('heart-fill')} Beneficiario</h2>
        <div style="display:flex;align-items:center;gap:12px;">
          <button id="btn-report-ben" title="Reportar" style="background:none;border:none;cursor:pointer;color:var(--color-text-soft);">${Icon('flag',{size:16})}</button>
          <button id="btn-close-ben-det" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button>
        </div>
      </div>
      <div id="ben-det-body"><p style="color:#aaa;text-align:center;padding:24px 0;">Cargando…</p></div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-det').onclick = () => modal.remove();
  document.getElementById('btn-report-ben').onclick = () => showReportBeneficiarioDialog(beneficiarioId);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  try {
    const res  = await fetch(_resolverApiUrlInspector('obtenerBeneficiario') + '?' + new URLSearchParams({ action:'obtenerBeneficiario', id: beneficiarioId }));
    const data = await res.json();
    const body = document.getElementById('ben-det-body');
    if (!data.ok || !data.beneficiario) { body.innerHTML = '<p style="color:#ef4444;text-align:center;">No se pudo cargar.</p>'; return; }
    const b = data.beneficiario;
    const esc2 = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const imgs = [b.imagen1, b.imagen2, b.imagen3].filter(Boolean);
    const inicial = esc2(b.nombre).charAt(0).toUpperCase() || '?';
    body.innerHTML = `
      ${imgs.length ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;">${imgs.map(u=>`<img src="${esc2(u)}" style="height:140px;border-radius:14px;object-fit:cover;flex-shrink:0;border:1px solid var(--color-border-subtle);">`).join('')}</div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--color-accent-soft);color:var(--color-accent-solid);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;flex-shrink:0;">${inicial}</div>
        <div style="min-width:0;">
          <h3 style="margin:0;font-size:1.05rem;color:var(--color-text-primary);">${esc2(b.nombre)}</h3>
          ${b.organizacion ? `<p style="margin:2px 0 0;font-size:.8rem;color:var(--color-text-soft);">${esc2(b.organizacion)}</p>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-surface-2);color:var(--color-text-muted);border-radius:20px;padding:5px 12px;font-size:.78rem;">${Icon('map-pin',{size:13})} ${esc2(b.ubicacion)}</span>
        ${b.facebook ? `<a href="${esc2(b.facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:var(--color-info-bg);color:var(--color-info);border-radius:20px;padding:5px 12px;font-size:.78rem;text-decoration:none;font-weight:600;">Facebook ${Icon('arrow-right',{size:12})}</a>` : ''}
      </div>
      <div style="background:var(--color-warning-bg);border-radius:12px;padding:14px;margin-bottom:14px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:.75rem;color:var(--color-warning);text-transform:uppercase;letter-spacing:.03em;">Sobre este refugio</p>
        <p style="margin:0;font-size:.85rem;line-height:1.6;color:var(--color-text-primary);">${esc2(b.historia)}</p>
      </div>
      <p style="margin:0 0 6px;font-weight:700;font-size:.75rem;color:var(--color-text-soft);text-transform:uppercase;letter-spacing:.03em;">Datos de pago directo</p>
      <div style="position:relative;border-radius:16px;padding:18px;background:linear-gradient(135deg,var(--color-primary),var(--color-accent-solid));box-shadow:0 6px 16px rgba(0,0,0,.18);color:#fff;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.12);"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;">
          <span style="font-size:.7rem;opacity:.8;letter-spacing:.05em;">CUENTA / CLABE</span>
          <button id="btn-copy-cuenta" style="border:none;background:rgba(255,255,255,.22);color:#fff;border-radius:8px;padding:5px 10px;font-size:.7rem;font-weight:700;cursor:pointer;backdrop-filter:blur(2px);">Copiar</button>
        </div>
        <p style="margin:22px 0 18px;font-size:1.05rem;font-family:monospace;letter-spacing:.12em;word-break:break-all;position:relative;">${esc2(b.cuenta_bancaria).replace(/(.{4})/g,'$1 ').trim()}</p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;">
          <div>
            <span style="display:block;font-size:.6rem;opacity:.75;">TITULAR</span>
            <span style="font-size:.82rem;font-weight:700;">${esc2(b.nombre)}</span>
          </div>
          ${Icon('heart-fill',{size:20})}
        </div>
      </div>`;

    mostrarDonarEnLinea(beneficiarioId, body);
    const copyBtn = document.getElementById('btn-copy-cuenta');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(b.cuenta_bancaria || '');
          copyBtn.textContent = '¡Copiado!';
          setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        } catch (e) {
          copyBtn.textContent = 'Error';
          setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        }
      });
    }
  } catch(err) {
    const body = document.getElementById('ben-det-body');
    if (body) body.innerHTML = '<p style="color:#ef4444;text-align:center;">Error de conexión.</p>';
  }
};

// Donar en línea al beneficiario: monto + las pasarelas que tenga conectadas (Stripe y/o Mercado Pago). El dinero
// le cae directo en su cuenta; Z&R no cobra comisión. Si no tiene ninguna, solo queda la CLABE de arriba.
async function mostrarDonarEnLinea(beneficiarioId, body) {
  const prov = await fetch(VENTAS_API_URL_INSPECTOR + '?' + new URLSearchParams({ action: 'proveedoresDonacion', beneficiario_id: beneficiarioId }))
    .then(r => r.json()).catch(() => null);
  if (!prov || !prov.ok || !prov.proveedores.length || typeof botonesPago !== 'function') return;
  const sec = document.createElement('div');
  sec.style.cssText = 'margin-top:18px;';
  const chip = 'flex:1;padding:9px 0;border-radius:10px;border:1.5px solid var(--color-border-subtle,#e5e5e5);background:var(--color-surface-2,#f7f7f7);color:var(--color-text-primary,#2a1a16);font-weight:700;cursor:pointer;';
  sec.innerHTML = `<style>.don-btn{display:block;width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;background:var(--color-accent-solid,#ff3d7f);color:#fff;font-weight:700;font-size:.9rem;cursor:pointer}.don-btn.sec{background:#00b1ea}</style>
    <p style="margin:0 0 8px;font-weight:700;font-size:.75rem;color:var(--color-text-soft);text-transform:uppercase;letter-spacing:.03em;">Donar en línea</p>
    <div style="display:flex;gap:8px;">${[50, 100, 200].map(m => `<button type="button" data-monto="${m}" style="${chip}">$${m}</button>`).join('')}
      <input id="don-monto" type="number" inputmode="numeric" min="${prov.min}" max="${prov.max}" placeholder="Otro" style="flex:1.3;min-width:0;padding:9px;border-radius:10px;border:1.5px solid var(--color-border-subtle);font-size:.9rem;"></div>
    <div id="don-pago">${botonesPago(prov.proveedores, 'don-btn', 'don-btn sec')}</div>
    <p style="margin:6px 0 0;font-size:.72rem;color:var(--color-text-soft);">Tu donación llega completa y directo a su cuenta.</p>`;
  body.appendChild(sec);
  const input = sec.querySelector('#don-monto');
  sec.querySelectorAll('[data-monto]').forEach(c => c.addEventListener('click', () => {
    input.value = c.dataset.monto;
    sec.querySelectorAll('[data-monto]').forEach(o => { o.style.borderColor = o === c ? 'var(--color-accent-solid,#ff3d7f)' : ''; });
  }));
  sec.querySelectorAll('[data-proveedor]').forEach(btn => btn.addEventListener('click', () => {
    const monto = Number(input.value);
    if (!(monto >= prov.min && monto <= prov.max)) { input.focus(); input.style.borderColor = '#dc2626'; input.placeholder = `$${prov.min}–$${prov.max}`; return; }
    irAPagar(btn, proveedor => fetch(VENTAS_API_URL_INSPECTOR, { method: 'POST',
      body: new URLSearchParams({ action: 'crearPreferenciaDonacion', beneficiario_id: beneficiarioId, monto, proveedor }) }).then(r => r.json()));
  }));
}

// ── Modal: Reportar beneficiario (info falsa, estafa, robo de identidad, etc.) ──
function showReportBeneficiarioDialog(benId) {
  const motivos = ['Información falsa', 'Posible estafa', 'Robo de identidad', 'Otro'];
  const modal = document.createElement('div');
  modal.className = 'custom-alert-modal';
  modal.style.zIndex = '100001';
  modal.innerHTML = `<div class="custom-alert-content" style="max-width:380px;width:90%;">
    <div class="custom-alert-header"><h3>Reportar beneficiario</h3></div>
    <div class="custom-alert-body">
      <p style="margin-bottom:12px;font-size:13px;color:var(--color-text-muted,#666);">¿Por qué estás reportando este beneficiario?</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${motivos.map(m => `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border-radius:10px;border:1.5px solid #e0e0e0;">
          <input type="radio" name="ben-report-reason" value="${m}"><span style="font-size:13px;">${m}</span></label>`).join('')}
        <div id="ben-report-otro-field" style="display:none;"><input type="text" id="ben-report-otro-text" placeholder="Describe el problema…" maxlength="200" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #e0e0e0;font-size:13px;box-sizing:border-box;"></div>
      </div>
    </div>
    <div class="custom-alert-footer">
      <button class="custom-alert-btn cancel" id="ben-report-cancel">Cancelar</button>
      <button class="custom-alert-btn confirm" id="ben-report-confirm" style="background:var(--gradient-accent);">${Icon('flag')} Enviar reporte</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('input[name="ben-report-reason"]').forEach(r => r.addEventListener('change', () => {
    modal.querySelector('#ben-report-otro-field').style.display = r.value === 'Otro' ? 'block' : 'none';
  }));
  const close = () => modal.remove();
  modal.querySelector('#ben-report-cancel').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('#ben-report-confirm').onclick = async () => {
    const sel = modal.querySelector('input[name="ben-report-reason"]:checked');
    if (!sel) return window.showTemporaryMessage?.('Selecciona un motivo', 'error');
    let motivo = sel.value;
    if (motivo === 'Otro') {
      const t = modal.querySelector('#ben-report-otro-text').value.trim();
      if (!t) return window.showTemporaryMessage?.('Describe el motivo', 'error');
      motivo = 'Otro: ' + t;
    }
    try {
      const res = await fetch(_resolverApiUrlInspector('reportarBeneficiario'), {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'reportarBeneficiario', beneficiario_id: benId, motivo, telefonoUsuario: localStorage.getItem('client_phone') || '' })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al enviar reporte');
      window.showTemporaryMessage?.('Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura. 🙏', 'success');
      close();
    } catch (err) {
      window.showTemporaryMessage?.('No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
    }
  };
}

// Modal para donar un producto propio a un refugio/beneficiario específico,
// abierto desde su card en la sección "Ver Refugios". Reutiliza las mismas
// acciones del backend (asignarDonacion/desasignarDonacion) que usa
// vendedor.html, pero aquí el punto de partida es el beneficiario: primero
// se elige a quién donar (la card en la que se dio clic) y luego cuál de
// los productos propios donarle.
window.openDonarARefugioModal = async function(beneficiario) {
  if (!window.vendorSession || !window.vendorSession.token) {
    window.showTemporaryMessage && window.showTemporaryMessage('Inicia sesión como vendedor para donar un producto', 'error');
    return;
  }
  const esc = window.escapeHtml || (s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const optUrl = urlImagen;

  const old = document.getElementById('modal-donar-refugio');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-donar-refugio';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:0 0 36px;">
      <div style="position:sticky;top:0;background:#fff;z-index:1;padding:16px 20px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;color:#111;">${Icon('heart-fill')} Donar a ${esc(beneficiario.nombre || 'refugio')}</h2>
        <button id="btn-close-donar-refugio" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1;">×</button>
      </div>
      <div id="donar-refugio-body" style="padding:16px 20px 0;text-align:center;color:#aaa;">Cargando tus productos…</div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-donar-refugio').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const body = document.getElementById('donar-refugio-body');

  const cargarProductos = async () => {
    body.style.textAlign = 'center';
    body.style.color = '#aaa';
    body.innerHTML = 'Cargando tus productos…';
    try {
      const url = _resolverApiUrlInspector('misProductosComunidad') + '?' + new URLSearchParams({
        action: 'misProductosComunidad', vendorToken: window.vendorSession.token, limit: '200', page: '1'
      });
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al cargar tus productos');
      renderListaProductos(data.products || []);
    } catch (e) {
      body.innerHTML = `<p style="color:#ef4444;">Error al cargar: ${esc(e.message || e)}</p>`;
    }
  };

  const renderListaProductos = (productos) => {
    body.style.textAlign = '';
    body.style.color = '';
    const esDeEsteRefugio = p => (p.donado === true || p.donado === 'TRUE' || p.donado === 'true') && String(p.beneficiario_id || '') === String(beneficiario.id);
    const estaDonado = p => p.donado === true || p.donado === 'TRUE' || p.donado === 'true';
    const yaDonados = productos.filter(esDeEsteRefugio);
    const disponibles = productos.filter(p => !estaDonado(p));

    const filaProducto = (p, esQuitar) => {
      const imgUrl = p.imagen1 ? optUrl(p.imagen1, 48) : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f5f5f5;">
        ${imgUrl ? `<img src="${esc(imgUrl)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:44px;height:44px;background:#f5f5f8;border-radius:8px;flex-shrink:0;"></div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:.83rem;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nombre || '')}</div>
          <div style="font-size:.72rem;color:#888;">$${Number(p.precio || 0).toLocaleString()} · Stock: ${p.stock || 0}</div>
        </div>
        ${esQuitar
          ? `<button class="btn-quitar-donacion-refugio" data-pid="${esc(p.id)}" style="flex-shrink:0;padding:7px 12px;border:none;border-radius:20px;background:#fee2e2;color:#b91c1c;font-weight:700;font-size:.75rem;cursor:pointer;">Quitar</button>`
          : `<button class="btn-asignar-donacion-refugio" data-pid="${esc(p.id)}" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:none;background:#f5f5f8;color:#f97316;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${Icon('heart-fill')}</button>`}
      </div>`;
    };

    body.innerHTML = `
      ${yaDonados.length ? `
      <p style="font-size:.78rem;font-weight:700;color:#166534;margin:0 0 6px;">Ya donados a este refugio</p>
      <div style="margin-bottom:16px;">${yaDonados.map(p => filaProducto(p, true)).join('')}</div>` : ''}
      <p style="font-size:.78rem;font-weight:700;color:#555;margin:0 0 6px;">Elige un producto para donar</p>
      <div id="donar-refugio-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:10px;font-size:.82rem;"></div>
      ${disponibles.length === 0
        ? '<p style="color:#aaa;text-align:center;padding:16px 0;">No tienes productos disponibles para donar.<br><small>Un producto ya donado a otro refugio no puede reasignarse sin quitarlo primero.</small></p>'
        : `<div>${disponibles.map(p => filaProducto(p, false)).join('')}</div>`}
    `;

    const showMsg = (txt, ok) => {
      const el = document.getElementById('donar-refugio-msg');
      if (!el) return;
      el.textContent = txt;
      el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };

    body.querySelectorAll('.btn-asignar-donacion-refugio').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const params = new URLSearchParams({ action: 'asignarDonacion', producto_id: btn.dataset.pid, beneficiario_id: beneficiario.id, vendor_token: window.vendorSession.token });
          const res = await fetch(_resolverApiUrlInspector('asignarDonacion'), {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
          });
          const data = await res.json();
          if (data.ok) { showMsg('Donación asignada correctamente', true); cargarProductos(); }
          else { showMsg(data.error || 'Error', false); btn.disabled = false; }
        } catch (e) { showMsg('Error de conexión', false); btn.disabled = false; }
      });
    });

    body.querySelectorAll('.btn-quitar-donacion-refugio').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Quitando…';
        try {
          const params = new URLSearchParams({ action: 'desasignarDonacion', producto_id: btn.dataset.pid, vendor_token: window.vendorSession.token });
          const res = await fetch(_resolverApiUrlInspector('desasignarDonacion'), {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
          });
          const data = await res.json();
          if (data.ok) { showMsg('Donación removida', true); cargarProductos(); }
          else { showMsg(data.error || 'Error', false); btn.disabled = false; btn.textContent = 'Quitar'; }
        } catch (e) { showMsg('Error de conexión', false); btn.disabled = false; btn.textContent = 'Quitar'; }
      });
    });
  };

  cargarProductos();
};
})();
