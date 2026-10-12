const ADMIN_ACTIONS = {
CREATE: 'admin_create',
UPDATE: 'admin_update',
DELETE: 'admin_delete'
};
function buildParams(obj) {
const p = new URLSearchParams();
Object.entries(obj).forEach(([k, v]) => { if (v !== undefined) p.append(k, v); });
return p.toString();
}
let pendingActions = [];
function loadPendingActions() {
try {
const saved = localStorage.getItem('zr_admin_pending');
if (saved) {
pendingActions = JSON.parse(saved);
console.log(`📦 Cargadas ${pendingActions.length} acciones pendientes`);
}
} catch(e) { pendingActions = []; }
updatePendingBadge();
}
function savePendingActions() {
try {
localStorage.setItem('zr_admin_pending', JSON.stringify(pendingActions));
updatePendingBadge();
} catch(e) {}
}
function addPendingAction(type, data, productId = null) {
pendingActions.push({
id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
type: type,
data: data,
productId: productId,
timestamp: Date.now(),
retries: 0
});
savePendingActions();
showMessage(`Producto guardado localmente. Se sincronizará cuando haya internet.`, 'info');
console.log(`📝 Acción "${type}" guardada. Total pendientes: ${pendingActions.length}`);
}
const ADMIN_API = "https://catalogo-api-1038143238323.us-central1.run.app";
let syncing = false;
async function syncPendingActions(manual = false) {
if (syncing || !navigator.onLine || pendingActions.length === 0) return;
const token = sessionStorage.getItem("admin_token");
if (!token) {
if (manual) showMessage("Inicia sesión como admin para sincronizar los productos pendientes", 'warning');
return;
}
syncing = true;
try {
if (manual) pendingActions.forEach(a => a.retries = 0);
const todo = pendingActions.filter(a => a.retries < 3);
const bodies = {
[ADMIN_ACTIONS.CREATE]: a => ({ action: "create", ...a.data }),
[ADMIN_ACTIONS.UPDATE]: a => ({ action: "update", id: a.productId, ...a.data }),
[ADMIN_ACTIONS.DELETE]: a => ({ action: "delete", id: a.productId })
};
if (todo.length) showMessage(`Sincronizando ${todo.length} producto(s)...`, 'info');
for (const action of todo) {
try {
const response = await fetch(ADMIN_API, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: buildParams({ token, ...bodies[action.type](action) })
});
if ((await response.json()).ok === true) pendingActions = pendingActions.filter(a => a !== action);
else action.retries++;
} catch (err) {
console.error(`Error sincronizando:`, err);
action.retries++;
}
savePendingActions();
}
if (pendingActions.length === 0) {
showMessage(`Todos los productos sincronizados`, 'success');
if (typeof loadAdminProducts === 'function') loadAdminProducts();
} else if (todo.length) {
showMessage(`${pendingActions.length} producto(s) siguen pendientes. Toca el aviso naranja para reintentar`, 'warning');
}
} finally {
syncing = false;
}
}
let pendingBadge = null;
function updatePendingBadge() {
const count = pendingActions.length;
if (!pendingBadge && count > 0) {
pendingBadge = document.createElement('div');
pendingBadge.id = 'pending-badge';
pendingBadge.style.cssText = `
position: fixed;
bottom: 20px;
left: 20px;
background: #f97316;
color: white;
padding: 8px 16px;
border-radius: 40px;
font-size: 12px;
font-weight: 600;
z-index: 10000;
display: flex;
align-items: center;
gap: 8px;
cursor: pointer;
box-shadow: 0 2px 10px rgba(0,0,0,0.2);
font-family: monospace;
`;
pendingBadge.onclick = () => {
showCustomConfirm({
title: "Sincronizar pendientes",
message: `¿Sincronizar ${count} producto(s) pendiente(s) ahora?`,
icon: 'signal',
confirmText: "Sincronizar",
cancelText: "Cancelar",
onConfirm: () => syncPendingActions(true)
});
};
document.body.appendChild(pendingBadge);
}
if (pendingBadge) {
if (count > 0) {
pendingBadge.style.display = 'flex';
pendingBadge.innerHTML = `${Icon('signal')} ${count} pendiente${count !== 1 ? 's' : ''} · Click para sincronizar`;
} else {
pendingBadge.style.display = 'none';
}
}
}
function showMessage(msg, type = 'info') {
if (typeof showTemporaryMessage === 'function') {
showTemporaryMessage(msg, type);
} else {
console.log(`[Offline] ${msg}`);
}
}
function setupInterception() {
window.addEventListener('adminReady', () => {
console.log("✅ adminReady recibido, aplicando interceptación offline");
window._originalSubmit = window.handleProductFormSubmit;
window._originalDelete = window.deleteProduct;
window.handleProductFormSubmit = async function(e) {
e.preventDefault();
e.stopPropagation();
if (!navigator.onLine) {
const id = document.getElementById("product-id")?.value || "";
const productData = {
Nombre: document.getElementById("product-name")?.value.trim() || "",
Precio: Number(document.getElementById("product-price")?.value || 0),
Stock: Number(document.getElementById("product-stock")?.value || 0),
Descripcion: document.getElementById("product-description")?.value.trim() || "",
Talla: document.getElementById("product-sizes")?.value.trim() || "",
Categoria: document.getElementById("product-category")?.value.trim() || "",
Badge: document.getElementById("product-badge")?.value || "",
Imagen1: document.getElementById("product-image1")?.value.trim() || "",
Imagen2: document.getElementById("product-image2")?.value.trim() || "",
Imagen3: document.getElementById("product-image3")?.value.trim() || "",
};
if (!productData.Nombre) {
if (typeof showCustomAlert === 'function') {
await showCustomAlert({ title: "Campo requerido", message: "El nombre del producto es obligatorio.", icon: 'document-text', confirmText: "Aceptar" });
}
return;
}
addPendingAction(id ? ADMIN_ACTIONS.UPDATE : ADMIN_ACTIONS.CREATE, productData, id || null);
if (typeof resetProductForm === 'function') resetProductForm();
if (typeof clearImageUploads === 'function') clearImageUploads();
if (typeof showCustomAlert === 'function') {
await showCustomAlert({ title: "Guardado localmente", message: "Se sincronizará cuando haya internet.", icon: 'signal', confirmText: "Aceptar" });
}
return;
}
await window._originalSubmit(e);
};
const productForm = document.getElementById("product-form");
if (productForm) {
const newForm = productForm.cloneNode(true);
productForm.parentNode.replaceChild(newForm, productForm);
newForm.addEventListener("submit", window.handleProductFormSubmit);
// cloneNode no copia los onchange que setupImageUpload asignó a los
// inputs de imagen antes de este reemplazo — hay que reengancharlos.
// force=true porque _imageUploadsInitialized ya quedó en true desde
// el init original y si no, initImageUploads no haría nada.
if (typeof window.initImageUploads === 'function') window.initImageUploads(true);
}
window.deleteProduct = async function(id) {
if (!navigator.onLine) {
addPendingAction(ADMIN_ACTIONS.DELETE, null, id);
const row = document.querySelector(`.admin-product-row button[data-id="${id}"]`)?.closest('.admin-product-row');
if (row) row.remove();
if (typeof showCustomAlert === 'function') {
await showCustomAlert({ title: "Producto marcado", message: "Se eliminará cuando haya internet.", icon: 'signal', confirmText: "Aceptar" });
}
return;
}
await window._originalDelete(id);
};
}, { once: true });
}
window.addEventListener('online', () => {
console.log("🟢 Conexión recuperada - Sincronizando...");
if (pendingActions.length === 0) return;
showMessage("Conexión recuperada. Sincronizando cambios...", 'success');
setTimeout(() => syncPendingActions(), 1000);
});
window.addEventListener('offline', () => {
console.log("🔴 Conexión perdida");
if (sessionStorage.getItem("admin_token")) showMessage("Sin conexión - Los cambios se guardarán localmente", 'warning');
});
loadPendingActions();
setupInterception();
if (navigator.onLine && pendingActions.length > 0) {
setTimeout(() => syncPendingActions(), 3000);
}
