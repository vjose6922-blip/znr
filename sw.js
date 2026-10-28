// Sin número de versión: el HTML/JS del shell ahora se sirve NETWORK_FIRST
// (ver getCacheStrategy), así que ya no depende de bumpear este nombre en
// cada deploy para que los usuarios vean el contenido fresco. Solo
// cambiarías este nombre si algún día necesitas forzar un borrado total
// de la caché (p.ej. cambiaste la lógica de cacheo en sí).
const CACHE_NAME    = 'zr-cache';
const DYNAMIC_CACHE = 'zr-dynamic';
const OFFLINE_URL   = '/offline.html';

// Solo lo esencial para abrir la app y el modo offline. Las demás páginas se
// guardan en caché la primera vez que el usuario las visita (antes se bajaban
// TODAS al instalar, ~1.6 MB aunque nunca se abrieran).
const STATIC_ASSETS = [
  '/', '/index.html', '/offline.html', '/styles.css',
  '/api-config.js', '/common.js', '/home.js', '/icons.js',
  '/cache-manager.js', '/manifest.json', '/placeholder.svg',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const API_DOMAINS      = [
  'wttr.in',
  'openweathermap.org',
  'registrar-token-fcm-1038143238323.us-central1.run.app',
  'eliminar-token-fcm-1038143238323.us-central1.run.app',
  'vendedores-api-1038143238323.us-central1.run.app',
  'catalogo-api-1038143238323.us-central1.run.app',
  'auth-api-1038143238323.us-central1.run.app',
  'ventas-api-1038143238323.us-central1.run.app',
  'pedidos-api-1038143238323.us-central1.run.app',
  'live-api-1038143238323.us-central1.run.app',
  'historias-api-1038143238323.us-central1.run.app',
  'admin-api-1038143238323.us-central1.run.app',
  'beneficiarios-api-1038143238323.us-central1.run.app',
  'tienda-znr-api-1038143238323.us-central1.run.app',
];
const IMAGE_CDN_HOSTS  = ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com']; // lh3: fondos del clima (looks.js)

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        STATIC_ASSETS.map(async asset => {
          try {
            const response = await fetch(asset);
            if (response.ok) await cache.put(asset, response);
          } catch {}
        })
      );
      const offlineRes = await fetch(OFFLINE_URL).catch(() => null);
      if (offlineRes?.ok) await cache.put(OFFLINE_URL, offlineRes);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== DYNAMIC_CACHE)
          .map(n => caches.delete(n))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
    })()
  );
});

function getCacheStrategy(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') return 'NETWORK_ONLY';
  // Imágenes de productos en Google CDN → CACHE_FIRST
  if (IMAGE_CDN_HOSTS.some(h => url.hostname.includes(h))) return 'CACHE_FIRST';
  if (IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext))) return 'CACHE_FIRST';
  if (url.hostname.includes('wttr.in') || url.hostname.includes('openweathermap.org')) return 'NETWORK_ONLY';
  // RTDB (snapshot de Comunidad, se regenera cada 5 min) — siempre red
  // primero, nunca servir cacheado indefinidamente como haría CACHE_FIRST.
  if (url.hostname.includes('firebaseio.com')) return 'NETWORK_FIRST';
  if (API_DOMAINS.some(d => url.hostname.includes(d))) return 'NETWORK_FIRST';
  // El HTML y el JS del shell van siempre por red primero, y además
  // sin pasar por el caché del CDN de GitHub Pages (Fastly): NETWORK_FIRST
  // solo evita la caché local del navegador, no la del CDN, que puede
  // seguir sirviendo la copia vieja varios minutos incluso con
  // {cache:'reload'}. NETWORK_FIRST_FRESH agrega un parámetro que cambia
  // en cada intento para forzar que Fastly vaya siempre a origen.
  // El manifest SIEMPRE por red: Chrome lo relee para actualizar la app instalada (WebAPK:
  // theme_color/background_color → colores de la barra de estado y de la barra de botones
  // de Android). Con CACHE_FIRST se quedaba para siempre la primera copia y la app instalada
  // nunca recibía los colores nuevos.
  if (request.destination === 'manifest' || url.pathname.endsWith('/manifest.json')) return 'NETWORK_FIRST_FRESH';
  // La lista de ciudades pesa bastante y casi nunca cambia: se baja una vez y se actualiza en segundo plano
  // (al cambiarla, la versión nueva se ve en la siguiente visita). Sin esto se descargaría completa en cada página.
  if (/\/ciudades(-extra)?\.js$/.test(url.pathname)) return 'STALE_WHILE_REVALIDATE';
  if (['document','script'].includes(request.destination) && url.origin === self.location.origin) return 'NETWORK_FIRST_FRESH';
  if (request.destination === 'style') return 'STALE_WHILE_REVALIDATE';
  return 'CACHE_FIRST';
}

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension://')) return;
  // Transmisión en vivo dentro de ZNR: estas peticiones NO deben pasar por
  // el service worker ni por ningún caché.
  //  - *.cloudflarestream.com: WHIP (vendedor) y WHEP (comprador).
  //  - URLs firmadas de Cloud Storage (X-Goog-Signature): subida de segmentos
  //    de respaldo (PUT) y video de los clips de reportes (GET). Un PUT por
  //    la rama CACHE_FIRST fallaba al intentar cachearlo, y los clips son
  //    evidencia privada que no debe quedar guardada en el dispositivo.
  // Las imágenes normales de storage.googleapis.com siguen cacheándose igual.
  const reqUrl = new URL(event.request.url);
  if (reqUrl.hostname.endsWith('cloudflarestream.com')) return;
  if (reqUrl.hostname.endsWith('googleapis.com') && reqUrl.searchParams.has('X-Goog-Signature')) return;
  const strategy = getCacheStrategy(event.request);
  const handlers = {
    CACHE_FIRST:            cacheFirst,
    NETWORK_ONLY:           networkOnly,
    NETWORK_FIRST:          networkFirst,
    NETWORK_FIRST_FRESH:    networkFirstFresh,
    STALE_WHILE_REVALIDATE: staleWhileRevalidate,
  };
  event.respondWith((handlers[strategy] || networkFirst)(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    .some(ext => new URL(request.url).pathname.toLowerCase().endsWith(ext))
    || request.destination === 'image';

  // Recargar la página varias veces seguidas cancela (AbortError) las
  // peticiones en curso de la página anterior — no es una falla real del
  // recurso. Un solo reintento absorbe eso y cualquier hipo de red breve.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const net = await fetch(request);
      if (net?.status === 200) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, net.clone());
      }
      return net;
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 400));
    }
  }

  if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
  // Para imágenes: servir el placeholder en vez de un 404, así el <img>
  // no queda roto ni dispara un error visible por una falla pasajera.
  if (isImage) {
    const placeholder = await caches.match('/placeholder.svg');
    if (placeholder) return placeholder;
  }
  return new Response('Offline', { status: 404 });
}

async function networkOnly(request) {
  try { return await fetch(request); }
  catch {
    return new Response(JSON.stringify({ ok: false, error: "Sin conexión" }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Igual que networkFirst, pero pensada para el HTML/JS del shell servido
// por GitHub Pages: agrega un parámetro que cambia en cada intento para
// que el CDN (Fastly) nunca tenga esa URL exacta cacheada y siempre
// reenvíe la petición a origen. La respuesta se guarda en caché bajo la
// request ORIGINAL (sin el parámetro), así el fallback offline sigue
// funcionando con la URL real que pide el navegador.
async function networkFirstFresh(request) {
  const bustUrl = new URL(request.url);
  bustUrl.searchParams.set('_swfresh', Date.now().toString());
  // Petición condicional: si ya tenemos copia, mandamos su ETag/Last-Modified
  // y el servidor responde 304 (sin cuerpo) cuando no cambió. Así cada visita
  // solo revisa que esté al día en vez de re-descargar todo el JS/HTML.
  const cached = await caches.match(request);
  const headers = {};
  if (cached?.headers.get('ETag')) headers['If-None-Match'] = cached.headers.get('ETag');
  if (cached?.headers.get('Last-Modified')) headers['If-Modified-Since'] = cached.headers.get('Last-Modified');
  try {
    const net = await fetch(bustUrl.toString(), { cache: 'no-store', headers });
    if (net.status === 304 && cached) return cached;
    if (net?.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
    throw new Error('Offline');
  }
}

async function networkFirst(request) {
  try {
    const net = await fetch(request);
    if (net?.status === 200) {
      const url    = new URL(request.url);
      const action = url.searchParams.get('action');
      const sensitive = ['login','loginVendedor','notifications','notificationsBatch',
                         'update','delete','create','uploadImage','createComunidad',
                         'updateComunidad','deleteComunidad','aprobarVendedor',
                         'rechazarVendedor','aprobarProductoComunidad','rechazarProductoComunidad',
                         'verificarAdmin','vendedoresAdmin','productosPendientes',
                         'obtenerReportes','obtenerReportesVendedor','reportarVendedor','marcarReporteVendedorRevisado','confirmGroupPurchase','cancelGroupPurchase',
                         'registrarVendedor','cambiarPasswordVendedor',
                         'solicitarResetPasswordVendedor','resetPasswordVendedor',
                         'avisarAdminSinPregunta','enviarCodigoResetVendedor','resetPasswordConCodigo',
                         'misProductosComunidad','obtenerFirebaseToken',
                         'crearNotificacionVentaComunidad','resolverNotificacionVentaComunidad',
                         'actualizarPerfilVendedor','actualizarPortadaVendedor',
                         'actualizarLogoVendedor','marcarVendedorConfiable',
                         'marcarVendedorPlan','suspenderVendedor','obtenerSugerenciasConfiable',
                         'marcarProductoConfiable','reportarProducto','marcarReporteRevisado',
                         'calificarProducto','marcarNotificacionLeida',
                         'marcarTodasNotificacionesLeidas',
                         'solicitarPlanPlus','responderSolicitudPlus','getPlusSolicitudVendedor',
                         'solicitudesPlus','obtenerResumenPlanPlus',
                         'obtenerMisSesionesLive','obtenerSesionLivePorId','obtenerLivesActivos',
                         'obtenerEntregasLive','obtenerMisEntregasLive','obtenerEntregaPorClave',
                         'obtenerReportesLive','obtenerClipReporteLive'];
      if (!action || !sensitive.includes(action)) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, net.clone());
      }
    }
    return net;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
    throw new Error('Offline');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request, { cache: 'reload' }).then(net => {
    if (net?.status === 200) {
      cache.put(request, net.clone());
    }
    return net;
  }).catch(() => null);
  if (cached) { fetchPromise.catch(() => {}); return cached; }
  const net = await fetchPromise;
  if (net) return net;
  if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
  return new Response('No disponible', { status: 404 });
}

self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  // FCM entrega el título/cuerpo anidados en "notification",
  // no en el nivel superior del payload.
  const notif = payload.notification || {};
  const title = notif.title || 'Z&R';
  const body  = notif.body  || '¡Novedades en Z&R!';
  const url   = (payload.data && payload.data.url) || payload.fcmOptions?.link || '/';

  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body:    body,
      icon:    '/logo.svg',
      vibrate: [200, 100, 200],
      data:    { url: url },
      actions: [{ action: 'open', title: 'Ver ahora' }, { action: 'close', title: 'Cerrar' }]
    });
    // Antes lo hacía firebase-messaging-sw.js (un SW aparte, peleando por
    // el mismo scope que este). Ahora que ese registro se quitó, este es el
    // único push handler, así que avisamos aquí mismo a las pestañas
    // abiertas para que refresquen badges/listas (notification-center.js,
    // vendedor-unificado.js).
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientList.forEach(c => c.postMessage({ type: 'znr-nueva-notificacion' }));
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Antes comparaba event.action === 'open' — en PWAs instaladas en
  // Android a veces ese valor no llega bien desde el botón de acción
  // (aunque el clic en el cuerpo de la notificación sí funcionaba,
  // porque ahí event.action llega vacío). Más robusto: abrir siempre,
  // excepto cuando se toca explícitamente "Cerrar".
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow?.(url);
    })
  );
});

self.addEventListener('sync', event => {
  const TAG_MSG = { 'sync-cart': 'SYNC_CART', 'sync-entregas': 'SYNC_ENTREGAS' };
  if (TAG_MSG[event.tag]) {
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: TAG_MSG[event.tag] }))
      )
    );
  }
});
