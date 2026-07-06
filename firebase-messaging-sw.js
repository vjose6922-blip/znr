/**
 * ============================================================
 * FCM (Firebase Cloud Messaging) — Service Worker para Z&R
 * Guarda este archivo TAL CUAL como: /ZNR/firebase-messaging-sw.js
 * (debe vivir en la raíz de /ZNR/, junto a tu sw.js normal)
 * ============================================================
 *
 * Este archivo es DISTINTO a tu sw.js de la PWA. Firebase necesita
 * su propio service worker para poder mostrar notificaciones
 * cuando la pestaña está cerrada o en segundo plano.
 */

importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes",
  authDomain: "znr-live.firebaseapp.com",
  databaseURL: "https://znr-live-default-rtdb.firebaseio.com",
  projectId: "znr-live",
  storageBucket: "znr-live.firebasestorage.app",
  messagingSenderId: "1038143238323",
  appId: "1:1038143238323:web:5171b9dd8823628086c0c6"
});

const messaging = firebase.messaging();

// Notificaciones que llegan cuando la app está en SEGUNDO PLANO
// (pestaña cerrada, minimizada, o el navegador en otra pestaña)
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 Push recibido en segundo plano:", payload);

  const title = (payload.notification && payload.notification.title) || "Z&R";
  const body  = (payload.notification && payload.notification.body)  || "¡Novedades en Z&R!";
  const url   = (payload.data && payload.data.url) || payload.fcmOptions?.link || "/ZNR/";

  self.registration.showNotification(title, {
    body: body,
    icon: "/ZNR/logo.svg",
    vibrate: [200, 100, 200],
    data: { url: url },
    actions: [
      { action: "open", title: "Ver ahora" },
      { action: "close", title: "Cerrar" }
    ]
  });
});

// Click en la notificación → abre o enfoca la pestaña correspondiente
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const url = (event.notification.data && event.notification.data.url) || "/ZNR/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
