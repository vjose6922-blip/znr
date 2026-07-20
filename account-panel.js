function _upEsc(str) {
const fn = window.escapeHtml;
if (typeof fn === 'function') return fn(str);
return String(str)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
async function refreshOrderStatuses() {
try {
const orders = loadOrders();
if (!orders.length) return;
const toCheck = orders.filter(o => o.status === 'pendiente' || o.status === 'pending');
if (!toCheck.length) return;
const ids = toCheck.map(o => o.requestId);
const res  = await fetch(`${API_URL}?action=checkRequestStatusBatch&requestIds=${encodeURIComponent(JSON.stringify(ids))}`);
const data = await res.json();
if (!data.ok || !data.statuses) return;
const map = { pending:'pendiente', approved:'confirmado', cancelled:'cancelled', rejected:'rejected' };
const all = loadOrders();
let changed = false;
toCheck.forEach(o => {
const entry = data.statuses[o.requestId];
if (!entry) return;
const newStatus = map[entry.status] || entry.status;
if (newStatus !== o.status) {
  const idx = all.findIndex(x => x.requestId === o.requestId);
  if (idx !== -1) { all[idx].status = newStatus; changed = true; }
}
});
if (changed) saveOrders(all);
} catch {}
}
function currentTheme() {
return localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'dark';
}
function applyTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
document.body.classList.add('theme-aeromexico');
localStorage.setItem('theme', theme);
updateThemeIcon(theme);
window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}
function renderOrders() {
const orders = loadOrders();
if (!orders.length) return `
<div class="up-empty-state">
<div class="up-empty-icon"></div>
<p>Aún no tienes pedidos registrados.<br>
<small>Tus compras aparecerán aquí una vez que las solicites.</small>
</p>
</div>`;
return orders.map(o=>{
const date = new Date(o.timestamp||Date.now()).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
const items = (o.items||[]).map(i=>`
<div class="up-order-item">
<span>${_upEsc(i.name||'Producto')}</span>
<span class="up-order-qty">x${i.quantity||1} · $${(i.price||0).toLocaleString()}</span>
</div>`).join('');

const statusMap = {
  pendiente:  { color:'#f59e0b', icon: Icon('clock'), label:'pendiente'       },
  confirmado: { color:'#22c55e', icon: Icon('check'), label:'confirmado'       },
  cancelled:  { color:'#ef4444', icon: Icon('x'), label:'Cancelación'      },
  rejected:   { color:'#9ca3af', icon: Icon('ban'), label:'Cancelado'        },
  cancelado:  { color:'#9ca3af', icon: Icon('ban'), label:'Cancelado'        }
};
const st = statusMap[o.status] || { color:'#f59e0b', icon: Icon('clock'), label: o.status||'pendiente' };

let actionBtn = '';
if (o.status === 'pendiente') {
  actionBtn = `<button class="up-order-cancel-btn" data-request-id="${_upEsc(o.requestId)}" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:10px;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:600;cursor:pointer;">${Icon('x')} Cancelar pedido</button>`;
} else if (o.status === 'confirmado') {
  const adminPhone = (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '');
  const itemsList  = (o.items||[]).map(i=>`• ${i.name} x${i.quantity}`).join('\n');
  const msg = encodeURIComponent(`Hola, quisiera solicitar la *cancelación* de mi pedido:\n\n*ID:* ${o.requestId||''}\n*Productos:*\n${itemsList}\n*Total:* $${(o.total||0).toLocaleString()}\n\nEste pedido ya fue confirmado. ¿Es posible cancelarlo?`);
  actionBtn = `<a href="https://wa.me/${adminPhone}?text=${msg}" target="_blank" style="display:block;margin-top:10px;padding:8px;border-radius:10px;background:#fff3cd;color:#92400e;font-size:13px;font-weight:600;text-align:center;text-decoration:none;">${Icon('mail')} Solicitar cancelación al admin</a>`;
}
return `
<div class="up-order-card" data-order-id="${_upEsc(o.requestId||'')}">
<div class="up-order-header">
<div>
<span class="up-order-id">${_upEsc(o.requestId||'—')}</span>
<span class="up-order-date">${date}</span>
</div>
<span class="up-order-status" style="color:${st.color};font-weight:600;">
${st.icon} ${st.label}
</span>
</div>
<div class="up-order-items">${items}</div>
<div class="up-order-total">Total: <strong>$${(o.total||0).toLocaleString()}</strong></div>
${actionBtn}
</div>`;
}).join('');
}
async function clientCancelOrder(requestId) {
  const phone = localStorage.getItem('client_phone') || '';
  if (!phone) {
    showTemporaryMessage('No se encontró tu número de teléfono. Intenta de nuevo desde el carrito.', 'error');
    return;
  }

  showCustomConfirm({
    title: '¿Cancelar pedido?',
    message: '¿Estás seguro de que deseas cancelar el pedido ' + requestId + '? Esta acción no se puede deshacer.',
    icon: 'trash',
    confirmText: 'Sí, cancelar',
    cancelText: 'No',
    onConfirm: async () => {
      try {
        showLoader('Cancelando pedido...');

        const orders = loadOrders();
        const idx = orders.findIndex(o => o.requestId === requestId);
        const prevStatus = idx !== -1 ? orders[idx].status : null;
        if (idx !== -1) { orders[idx].status = 'cancelled'; saveOrders(orders); }
        const list = document.getElementById('up-orders-list');
        if (list) list.innerHTML = renderOrders();
        attachOrderCancelListeners();

        let gasOk = false;
        try {
          const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({ action: 'clientCancelRequest', requestId, phone })
});

          const responseText = await res.text();

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ No se pudo parsear JSON:', responseText);
            throw new Error('El servidor devolvió: ' + responseText.substring(0, 200));
          }
          if (!data) {
            throw new Error('Sin conexión con el servidor. Intenta de nuevo.');
          }
          
          if (data && data.ok && data.cancelled) {
            gasOk = true;
          } else if (data && data.ok && data.alreadyConfirmed) {

            if (idx !== -1 && prevStatus) {
              const all = loadOrders();
              const i2 = all.findIndex(o => o.requestId === requestId);
              if (i2 !== -1) { all[i2].status = 'confirmado'; saveOrders(all); }
              if (list) list.innerHTML = renderOrders();
              attachOrderCancelListeners();
            }
            hideLoader();
            showTemporaryMessage('Tu pedido ya fue confirmado. Usa el botón de WhatsApp para solicitar la cancelación al admin.', 'warning', 6000);
            return;
          } else {

            throw new Error(data?.error || ('Respuesta inesperada: ' + JSON.stringify(data)));
          }

        } catch (fetchErr) {

          if (idx !== -1 && prevStatus) {
            const all = loadOrders();
            const i2 = all.findIndex(o => o.requestId === requestId);
            if (i2 !== -1) { all[i2].status = prevStatus; saveOrders(all); }
            if (list) list.innerHTML = renderOrders();
            attachOrderCancelListeners();
          }
          hideLoader();
          showTemporaryMessage('Error al cancelar: ' + fetchErr.message, 'error');
          return;
        }

        hideLoader();
        if (gasOk) showTemporaryMessage('Pedido cancelado correctamente.', 'success');

      } catch (err) {
        hideLoader();
        showTemporaryMessage('Error inesperado: ' + err.message, 'error');
      }
    }
  });
}
function attachOrderCancelListeners() {
  document.querySelectorAll('.up-order-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const requestId = btn.getAttribute('data-request-id');
      if (requestId) clientCancelOrder(requestId);
    });
  });
}
function buildPanel() {
if (document.getElementById('up-panel')) return;
const prefs = loadPrefs();
const theme = currentTheme();
const savedPhone = localStorage.getItem('client_phone')||'';
const savedAddress = localStorage.getItem('client_address')||'';
const layout = localStorage.getItem('products_layout')||'list';
const overlay = document.createElement('div');
overlay.id = 'up-overlay';
overlay.addEventListener('click', closePanel);
const panel = document.createElement('div');
panel.id = 'up-panel';
panel.setAttribute('role','dialog');
panel.setAttribute('aria-modal','true');
panel.innerHTML = `
<div class="up-header">
<div class="up-title-row">
<span class="up-logo">Z&R</span>
<h2 class="up-title">Preferencias</h2>
</div>
<button class="up-close" id="up-close-btn" aria-label="Cerrar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-x"/></svg></button>
</div>
<div class="up-tabs" role="tablist">
<button class="up-tab active" data-tab="apariencia" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Apariencia</button>
<button class="up-tab" data-tab="tallas" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.595.33a18.095 18.095 0 005.223-5.223c.542-.815.369-1.896-.33-2.595L9.568 3z"/></svg> Tallas</button>
<button class="up-tab" data-tab="pedidos" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg> Pedidos</button>
<button class="up-tab" data-tab="privacidad" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg> Privacidad</button>
</div>
<div class="up-body">
<section class="up-tab-content active" data-content="apariencia">
<h3 class="up-section-title">Tema visual</h3>
<div class="up-theme-row">
<button class="up-theme-btn ${theme==='dark'?'active':''}" data-theme="dark"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-moon"/></svg> Oscuro</button>
<button class="up-theme-btn ${theme==='light'?'active':''}" data-theme="light"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-sun"/></svg> Claro</button>
</div>
<h3 class="up-section-title" style="margin-top:24px">Vista del catálogo</h3>
<div class="up-theme-row">
<button class="up-layout-btn ${layout==='list'?'active':''}" data-layout="list"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-list"/></svg> Lista</button>
<button class="up-layout-btn ${layout==='grid'?'active':''}" data-layout="grid"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-grid"/></svg> Cuadrícula</button>
</div>
</section>
<section class="up-tab-content" data-content="tallas">
<p class="up-section-hint">Selecciona tu talla en cada sección para ver primero los productos que te quedan.</p>
${Object.entries(SIZE_SECTIONS).map(([key,cfg])=>`
<div class="up-size-block">
<div class="up-size-label">
<span class="up-size-icon">${cfg.icon}</span>
<div>
<strong>${cfg.label}</strong>
<span class="up-size-hint">${cfg.hint}</span>
</div>
${prefs[key]?`<span class="up-size-badge" data-badge="${key}">${_upEsc(prefs[key])}</span>`:`<span class="up-size-badge" data-badge="${key}" style="display:none"></span>`}
</div>
<div class="up-size-grid">
${cfg.sizes.map(sz=>`
<button class="up-size-btn${prefs[key]===sz?' selected':''}"
data-section="${key}" data-size="${sz}">${sz}</button>
`).join('')}
<button class="up-size-btn up-size-clear${!prefs[key]?' hidden':''}"
data-section="${key}" data-size=""><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Quitar</button>
</div>
</div>
`).join('')}
<button class="up-save-btn" id="up-save-sizes-btn"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Guardar tallas</button>
</section>
<section class="up-tab-content" data-content="pedidos">
<h3 class="up-section-title">Mis pedidos</h3>
<div id="up-orders-list">${renderOrders()}</div>
</section>
<section class="up-tab-content" data-content="privacidad">
<h3 class="up-section-title">Mis datos guardados</h3>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Número de teléfono</strong>
<span class="up-privacy-value">${savedPhone ? '+52 '+_upEsc(savedPhone) : 'No guardado'}</span>
</div>
</div>
${savedPhone?`<button class="up-danger-btn" id="up-delete-phone-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Dirección de envío</strong>
<span class="up-privacy-value">${savedAddress ? _upEsc(savedAddress) : 'No guardada'}</span>
</div>
</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button class="up-secondary-btn" id="up-edit-address-btn">${savedAddress ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg> Editar' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-plus"/></svg> Añadir'}</button>
${savedAddress?`<button class="up-danger-btn" id="up-delete-address-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
</div>
</div>
<div class="up-divider"></div>
<p class="up-privacy-note">Tus datos se guardan únicamente en este dispositivo y se usan solo para agilizar
el proceso de compra. Puedes eliminarlos en cualquier momento.
Para solicitar eliminación de datos en nuestros registros escríbenos a
<strong>znrcomunity@gmail.com</strong>
</p>
</section>
</div>
`;
document.body.appendChild(overlay);
document.body.appendChild(panel);
attachPanelEvents(panel);
requestAnimationFrame(()=>{
overlay.classList.add('visible');
panel.classList.add('visible');
});
}
function attachPanelEvents(panel) {
panel.querySelector('#up-close-btn').addEventListener('click', closePanel);
panel.querySelectorAll('.up-tab').forEach(tab=>{
tab.addEventListener('click',()=>{
panel.querySelectorAll('.up-tab').forEach(t=>t.classList.remove('active'));
panel.querySelectorAll('.up-tab-content').forEach(c=>c.classList.remove('active'));
tab.classList.add('active');
panel.querySelector(`[data-content="${tab.dataset.tab}"]`).classList.add('active');
if (tab.dataset.tab === 'pedidos') {
  const list = document.getElementById('up-orders-list');
  if (list) {
    list.innerHTML = `<p style="text-align:center;color:var(--color-text-muted);padding:20px;font-size:13px;">${Icon('clock')} Actualizando pedidos...</p>`;
    refreshOrderStatuses()
      .catch(() => {})
      .finally(() => {
        list.innerHTML = renderOrders();
        attachOrderCancelListeners();
      });
  }
}
});
});

attachOrderCancelListeners();
panel.querySelectorAll('.up-theme-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
panel.querySelectorAll('.up-theme-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
applyTheme(btn.dataset.theme);
});
});
panel.querySelectorAll('.up-layout-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const layout = btn.dataset.layout;
localStorage.setItem('products_layout', layout);
localStorage.setItem('comunidad_layout', layout);
localStorage.setItem('home_layout', layout);
applyLayoutGlobal(layout);
});
});
panel.querySelectorAll('.up-size-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const sec  = btn.dataset.section;
const size = btn.dataset.size;
panel.querySelectorAll(`.up-size-btn[data-section="${sec}"]`).forEach(b=>{
b.classList.remove('selected');
});
if (size) btn.classList.add('selected');
const clear = panel.querySelector(`.up-size-clear[data-section="${sec}"]`);
if (clear) clear.classList.toggle('hidden', !size);
const badge = panel.querySelector(`[data-badge="${sec}"]`);
if (badge) { badge.textContent=size; badge.style.display=size?'':'none'; }
});
});
const saveBtn = panel.querySelector('#up-save-sizes-btn');
if (saveBtn) {
saveBtn.addEventListener('click',()=>{
const prefs = {torso:'',piernas:'',pies:''};
panel.querySelectorAll('.up-size-btn.selected').forEach(b=>{
if (b.dataset.size) prefs[b.dataset.section]=b.dataset.size;
});
savePrefs(prefs);
if (typeof applyFilters==='function') applyFilters();
const orig = saveBtn.textContent;
saveBtn.textContent=' ¡Guardado!';
saveBtn.classList.add('saved');
setTimeout(()=>{ saveBtn.textContent=orig; saveBtn.classList.remove('saved'); }, 1400);
});
}
const delPhone = panel.querySelector('#up-delete-phone-btn');
if (delPhone) {
delPhone.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar teléfono',
message:'¿Eliminar el número guardado? Tendrás que ingresarlo de nuevo al comprar.',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_phone'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_phone');
closePanel(); buildPanel();
}
});
}
const delAddr = panel.querySelector('#up-delete-address-btn');
const editAddr = panel.querySelector('#up-edit-address-btn');
if (editAddr) {
editAddr.addEventListener('click', async () => {
const data = await _collectAddressAndSchedule();
if (data) {
localStorage.setItem('client_address',  data.address);
localStorage.setItem('client_schedule', data.schedule);
if (data.note !== undefined) localStorage.setItem('client_note', data.note);
updateSavedPhoneDisplay();
closePanel(); buildPanel();
}
});
}
if (delAddr) {
delAddr.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar dirección',
message:'¿Eliminar la dirección guardada?',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_address'); localStorage.removeItem('client_schedule'); localStorage.removeItem('client_note'); localStorage.removeItem('client_days'); localStorage.removeItem('client_hour_from'); localStorage.removeItem('client_hour_to'); localStorage.removeItem('client_gps_lat'); localStorage.removeItem('client_gps_lng'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_address');
localStorage.removeItem('client_schedule');
localStorage.removeItem('client_note');
localStorage.removeItem('client_days');
localStorage.removeItem('client_hour_from');
localStorage.removeItem('client_hour_to');
closePanel(); buildPanel();
}
});
}
}
function closePanel() {
const panel = document.getElementById('up-panel');
const ov  = document.getElementById('up-overlay');
if (!panel) return;
panel.classList.remove('visible');
ov.classList.remove('visible');
setTimeout(()=>{ panel.remove(); ov.remove(); }, 280);
}

function _openPanelOnTabReal(tabName) {

  const existing = document.getElementById('up-panel');
  if (existing) {
    closePanel();
    setTimeout(() => _buildAndActivateTab(tabName), 320);
  } else {
    _buildAndActivateTab(tabName);
  }
}
function _buildAndActivateTab(tabName) {
  buildPanel();

  requestAnimationFrame(() => {
    const panel = document.getElementById('up-panel');
    if (!panel) return;
    const targetTab = panel.querySelector(`.up-tab[data-tab="${tabName}"]`);
    if (!targetTab) return;
    panel.querySelectorAll('.up-tab').forEach(t => t.classList.remove('active'));
    panel.querySelectorAll('.up-tab-content').forEach(c => c.classList.remove('active'));
    targetTab.classList.add('active');
    const content = panel.querySelector(`[data-content="${tabName}"]`);
    if (content) content.classList.add('active');
    if (tabName === 'pedidos') {
      const list = document.getElementById('up-orders-list');
      if (!list) return;
      list.innerHTML = `<p style="text-align:center;color:var(--color-text-muted);padding:20px;font-size:13px;">${Icon('clock')} Actualizando pedidos...</p>`;

      refreshOrderStatuses()
        .catch(() => {})
        .finally(() => {
          list.innerHTML = renderOrders();
          attachOrderCancelListeners();
        });
    }
  });
}
function injectStyles() {
if (document.getElementById('up-styles')) return;
const s = document.createElement('style');
s.id = 'up-styles';
s.textContent = `
#up-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9000;opacity:0;transition:opacity .28s ease}
#up-overlay.visible{opacity:1}
#up-panel{position:fixed;top:0;right:0;height:100dvh;width:min(390px,100vw);background:var(--color-surface,#252831);border-left:1px solid var(--color-border-subtle,rgba(255,255,255,.07));z-index:9001;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);overflow:hidden;box-shadow:-8px 0 40px rgba(0,0,0,.4)}
#up-panel.visible{transform:translateX(0)}
.up-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.up-title-row{display:flex;align-items:center;gap:10px}
.up-logo{font-size:12px;font-weight:800;letter-spacing:.05em;color:#ff4f81;background:rgba(255,79,129,.12);padding:3px 8px;border-radius:6px}
.up-title{font-size:16px;font-weight:700;margin:0;color:var(--color-text-primary,#fff)}
.up-close{background:rgba(255,255,255,.07);border:none;color:var(--color-text-secondary,#aaa);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
.up-close:hover{background:rgba(255,79,129,.15);color:#ff4f81}
.up-tabs{display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.up-tabs::-webkit-scrollbar{display:none}
.up-tab{flex-shrink:0;background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary,#888);font-size:12px;font-weight:600;padding:8px 12px;cursor:pointer;transition:color .2s,border-color .2s;white-space:nowrap}
.up-tab.active{color:#ff4f81;border-bottom-color:#ff4f81}
.up-body{flex:1;overflow-y:auto;padding:20px;scrollbar-width:thin;scrollbar-color:rgba(255,79,129,.3) transparent}
.up-tab-content{display:none}
.up-tab-content.active{display:block}
.up-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-secondary,#888);margin:0 0 12px}
.up-theme-row{display:flex;gap:8px;margin-bottom:8px}
.up-theme-btn,.up-layout-btn{flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--color-text-secondary,#aaa);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.up-theme-btn.active,.up-layout-btn.active{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81}
.up-section-hint{font-size:12px;color:var(--color-text-secondary,#888);line-height:1.5;margin:0 0 18px}
.up-size-block{margin-bottom:22px}
.up-size-label{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.up-size-icon{font-size:20px;flex-shrink:0}
.up-size-label strong{display:block;font-size:14px;font-weight:600;color:var(--color-text-primary,#fff);line-height:1.2}
.up-size-hint{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px}
.up-size-badge{margin-left:auto;background:rgba(255,79,129,.15);color:#ff4f81;border:1px solid rgba(255,79,129,.3);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;flex-shrink:0}
.up-size-grid{display:flex;flex-wrap:wrap;gap:7px}
.up-size-btn{border:1px solid var(--color-border-subtle,rgba(255,255,255,.1));background:var(--color-surface-2,rgba(255,255,255,.04));color:var(--color-text-muted,#aaa);padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.up-size-btn:hover{border-color:rgba(255,79,129,.5);color:#ff4f81}
.up-size-btn.selected{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81;font-weight:700}
.up-size-clear{font-size:11px;color:var(--color-text-secondary,#777)}
.up-size-btn.hidden{display:none}
.up-save-btn{width:100%;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:opacity .2s}
.up-save-btn:hover{opacity:.9}
.up-save-btn.saved{background:linear-gradient(135deg,#22c55e,#16a34a)}
.up-divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0}
.up-empty-state{text-align:center;padding:40px 20px;color:var(--color-text-secondary,#888)}
.up-empty-icon{font-size:48px;margin-bottom:12px}
.up-empty-state small{font-size:12px;opacity:.7}
.up-order-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;margin-bottom:12px}
.up-order-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px}
.up-order-id{display:block;font-size:10px;font-family:monospace;color:var(--color-text-secondary,#888)}
.up-order-date{display:block;font-size:12px;font-weight:600;color:var(--color-text-primary,#fff);margin-top:2px}
.up-order-status{font-size:12px;font-weight:700;flex-shrink:0}
.up-order-items{border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:4px}
.up-order-item{display:flex;justify-content:space-between;font-size:12px;color:var(--color-text-secondary,#aaa);padding:3px 0}
.up-order-qty{color:#ff4f81;font-weight:600;white-space:nowrap}
.up-order-total{text-align:right;font-size:13px;color:var(--color-text-primary,#fff);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.up-privacy-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;margin-bottom:10px}
.up-privacy-info{display:flex;align-items:center;gap:12px;min-width:0}
.up-privacy-icon{font-size:22px;flex-shrink:0}
.up-privacy-info strong{display:block;font-size:13px;color:var(--color-text-primary,#fff)}
.up-privacy-value{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px;word-break:break-all}
.up-danger-btn{flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.up-danger-btn:hover{background:rgba(239,68,68,.2)}
.up-privacy-note{font-size:11px;color:var(--color-text-secondary,#888);line-height:1.6}
[data-theme="light"] #up-panel{background:#fff;border-left-color:rgba(0,0,0,.08)}
[data-theme="light"] .up-theme-btn,[data-theme="light"] .up-layout-btn,[data-theme="light"] .up-size-btn{border-color:#c5c8d0;background:#f4f5f8;color:#333;font-weight:500}
[data-theme="light"] .up-theme-btn.active,[data-theme="light"] .up-layout-btn.active{background:rgba(255,79,129,.12);border-color:#ff4f81;color:#ff4f81}
[data-theme="light"] .up-size-btn:hover{border-color:#ff4f81;color:#ff4f81;background:#fff0f5}
[data-theme="light"] .up-size-btn.selected{background:#fff0f5;border-color:#ff4f81;color:#e11d6a;font-weight:700}
[data-theme="light"] .up-order-card,[data-theme="light"] .up-privacy-item{background:#f4f5f8;border-color:#dde0e8}
[data-theme="light"] .up-header,[data-theme="light"] .up-tabs{border-color:#e2e4ea}
[data-theme="light"] .up-divider{background:#e2e4ea}
[data-theme="light"] .up-close{background:#f0f1f5;color:#555}
[data-theme="light"] .up-close:hover{background:#fff0f5;color:#ff4f81}
[data-theme="light"] .up-section-title,[data-theme="light"] .up-size-hint,[data-theme="light"] .up-privacy-note,[data-theme="light"] .up-section-hint{color:#6b7280}
[data-theme="light"] .up-title,[data-theme="light"] .up-size-label strong,[data-theme="light"] .up-order-date,[data-theme="light"] .up-privacy-info strong{color:#111318}
@media(max-width:400px){#up-panel{width:100vw;border-left:none}}
`;
document.head.appendChild(s);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
window._openPanelOnTabReal = _openPanelOnTabReal;
injectStyles();
