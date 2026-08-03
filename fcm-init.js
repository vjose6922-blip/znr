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


async function solicitarPermisoNotificacionesSiFalta(ownerType, ownerId) {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

    // Ya se decidió "denied" antes → JS no puede volver a preguntar, respetamos eso
    if (Notification.permission === "denied") return null;

    // Nunca se ha preguntado → aquí sale el diálogo nativo del navegador
    if (Notification.permission === "default") {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return null;
    }

    // permission === "granted" (recién otorgado o ya lo tenía de antes)
    const registration = await navigator.serviceWorker.register("/znr/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return null;

    if (ownerType && ownerId) {
      await registrarTokenFCM(ownerType, ownerId, token);
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
    new Notification(title, { body, icon: "/znr/logo.svg" });
  }
  window.dispatchEvent(new CustomEvent('znr:nueva-notificacion'));
});

// Se exponen para usarlas desde common.js / comunidad.js (scripts normales, no módulo)
window.solicitarPermisoNotificacionesSiFalta = solicitarPermisoNotificacionesSiFalta;
window.registrarTokenFCM = registrarTokenFCM;
