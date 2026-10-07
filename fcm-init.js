import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes",
  authDomain: "znr-live.firebaseapp.com",
  databaseURL: "https://znr-live-default-rtdb.firebaseio.com",
  projectId: "znr-live",
  storageBucket: "znr-live.firebasestorage.app",
  messagingSenderId: "1038143238323",
  appId: "1:1038143238323:web:5171b9dd8823628086c0c6"
};

const VAPID_KEY = "BBnC4VSj0bWV72W9zZeXQUvDSybe8ccZTMhSjtu13gABzbzE1WqwVQ8kCxkcrFk3pTSzrasf978ZqWdsaUgly9o";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// URL real de la Cloud Function (Cloud Run), desplegada 2026-08.
const CLOUD_FN_REGISTRAR_TOKEN_URL =
  "https://registrar-token-fcm-1038143238323.us-central1.run.app";
const CLOUD_FN_ELIMINAR_TOKEN_URL =
  "https://eliminar-token-fcm-1038143238323.us-central1.run.app"; // TODO: pegar la URL real tras el deploy

/**
 * Manda el token a la Cloud Function que lo guarda en Firestore
 * (fcm_tokens/{ownerType_ownerId}/tokens/{tokenHash}), de forma
 * idempotente. Antes iba a Apps Script (acción "guardarTokenFCM");
 * eso queda retirado como fuente de escritura para este dato.
 */
async function registrarTokenFCM(ownerType, ownerId, token) {
  if (!ownerType || !ownerId || !token) return false;
  try {
    const res = await fetch(CLOUD_FN_REGISTRAR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerType,
        ownerId,
        token,
        compradorToken: ownerType === "cliente" ? localStorage.getItem("comprador_token") || "" : undefined,
        userAgent: navigator.userAgent
      })
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error("No se pudo guardar el token FCM:", err);
    return false;
  }
}

/**
 * Se llama al cerrar sesión. Recupera el token FCM actual de este
 * dispositivo (Firebase lo tiene cacheado localmente, no vuelve a
 * pedir permiso) y le dice a la Cloud Function que borre ESE
 * documento nada más — así no se desconecta el push de otros
 * dispositivos donde la sesión siga abierta.
 */
async function eliminarTokenFCM(ownerType, ownerId) {
  if (!ownerType || !ownerId) return false;
  try {
    if (Notification.permission !== "granted") return false;
    const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return false;

    const res = await fetch(CLOUD_FN_ELIMINAR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerType, ownerId, token })
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error("No se pudo eliminar el token FCM:", err);
    return false;
  }
}


async function solicitarPermisoNotificacionesSiFalta(ownerType, ownerId) {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

    if (Notification.permission === "denied") return null;

    // 1. Si es "default", pedimos permiso (esto muestra el diálogo nativo)
    if (Notification.permission === "default") {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return null;
    }

    // 2. ✅ Ahora sí, permiso es "granted" (recién otorgado o YA LO TENÍA)
    //    Obtenemos el token y REGISTRAMOS al dueño actual SIEMPRE.
    // Antes registraba firebase-messaging-sw.js aparte, peleando por el
    // mismo scope / que sw.js (que ya trae su propio handler de push,
    // ver comentario en sw.js). Ahora reutiliza ese único registro.
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return null;

    if (ownerType && ownerId) {
      await registrarTokenFCM(ownerType, ownerId, token); // 🔥 Esto ahora se ejecuta siempre
    }

    return token;

  } catch (err) {
    console.error("Error solicitando permiso de notificaciones:", err);
    return null;
  }
}
// Notificaciones recibidas MIENTRAS la app está abierta en primer plano
onMessage(messaging, (payload) => {
  console.log("🔔 Push recibido en primer plano:", payload);
  const { title, body } = payload.notification || {};
  if (title && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/logo.svg" });
  }
  window.dispatchEvent(new CustomEvent('znr:nueva-notificacion'));
});

// Se exponen para usarlas desde common.js / comunidad.js (scripts normales, no módulo)
window.solicitarPermisoNotificacionesSiFalta = solicitarPermisoNotificacionesSiFalta;
window.registrarTokenFCM = registrarTokenFCM;
window.eliminarTokenFCM = eliminarTokenFCM;

// ── Avisos de lives (campanita por vendedor / por live programado) ──
(function () {
  const API = 'https://live-api-1038143238323.us-central1.run.app', KEY = 'znr_live_subs';
  const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const activo = (tipo, id) => (leer()[tipo] || []).includes(id);

  async function alternar(tipo, id) {
    const accion = activo(tipo, id) ? 'desuscribirLive' : 'suscribirLive';
    const token = await solicitarPermisoNotificacionesSiFalta();
    if (!token) { alert('Activa las notificaciones de tu navegador para recibir el aviso.'); return null; }
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: accion, token, tipo, id }) })
      .then(x => x.json()).catch(() => null);
    if (!r?.ok) { alert(r?.error || 'No se pudo guardar. Intenta de nuevo.'); return null; }
    const s = leer(), lista = new Set(s[tipo] || []);
    accion === 'suscribirLive' ? lista.add(id) : lista.delete(id);
    s[tipo] = [...lista];
    localStorage.setItem(KEY, JSON.stringify(s));
    return accion === 'suscribirLive';
  }

  const boton = (tipo, id, texto) => `<button type="button" class="bell-live${activo(tipo, id) ? ' on' : ''}" data-bell="${tipo}:${id}" data-texto="${texto}">${Icon('bell', { size: 14 })}<span>${activo(tipo, id) ? 'Te avisaremos' : texto}</span></button>`;

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-bell]');
    if (!b) return;
    e.preventDefault();
    const [tipo, ...id] = b.dataset.bell.split(':');
    b.disabled = true;
    const on = await alternar(tipo, id.join(':'));
    b.disabled = false;
    if (on === null) return;
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'Te avisaremos' : b.dataset.texto;
  });

  const st = document.createElement('style');
  st.textContent = '.bell-live{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:7px 12px;border-radius:999px;border:1px solid var(--color-border-subtle);background:var(--color-surface);color:var(--color-text-primary);font-size:12px;font-weight:700;cursor:pointer}.bell-live.on{background:var(--color-accent-solid);color:#fff;border-color:transparent}.bell-live:disabled{opacity:.6}';
  document.head.appendChild(st);

  window.znrLiveNotif = { activo, boton };
})();
