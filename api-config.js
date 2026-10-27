(function () {
  'use strict';

  // URLs de tus APIs
  const CATALOGO_API_URL     = 'https://catalogo-api-1038143238323.us-central1.run.app';
  const VENDEDORES_API_URL   = 'https://vendedores-api-1038143238323.us-central1.run.app';
  const VENTAS_API_URL       = 'https://ventas-api-1038143238323.us-central1.run.app';
  const PEDIDOS_API_URL      = 'https://pedidos-api-1038143238323.us-central1.run.app';
  const BENEFICIARIOS_API_URL= 'https://beneficiarios-api-1038143238323.us-central1.run.app';
  const AUTH_API_URL         = 'https://auth-api-1038143238323.us-central1.run.app';
  const LIVE_API_URL         = 'https://live-api-1038143238323.us-central1.run.app';
  const TIENDA_ZNR_API_URL   = 'https://tienda-znr-api-1038143238323.us-central1.run.app';
  const CATALOGO_SNAPSHOT_URL= 'https://znr-live-default-rtdb.firebaseio.com/catalogo/snapshot.json';

  // WhatsApp de contacto: el número ya no está en el código, se lee de RTDB (nodo público contacto_admin).
  // WHATSAPP_NUMBER = Master (Plan Plus, outfits, legales) · _waAdmin = admin de la ciudad del comprador (si no hay, el Master).
  window.WHATSAPP_NUMBER = window._waAdmin = '';
  window.waActualizar = async () => {
    const leer = k => fetch(`https://znr-live-default-rtdb.firebaseio.com/contacto_admin/${encodeURIComponent(k)}.json`).then(r => r.json()).catch(() => null);
    const c = localStorage.getItem('buyer_ciudad'), num = t => t ? '52' + String(t).slice(-10) : '';
    const [m, a] = await Promise.all([leer('_master'), c ? leer(c) : null]);
    window.WHATSAPP_NUMBER = num(m);
    window._waAdmin = num(a) || num(m);
  };
  window.waListo = window.waActualizar();

  // Ahorro de datos: lo activa el usuario en Preferencias o el "Ahorro de datos" del navegador.
  window.znrAhorroDatos = () => localStorage.getItem('znr_ahorro_datos') === '1' || !!navigator.connection?.saveData;
  // Aviso breve y no bloqueante (lives e historias). Solo se puede detectar en Android/Chrome;
  // Safari no expone el tipo de conexión. Máx. una vez por minuto.
  let ultimoAviso = 0;
  window.znrAvisoDatosMoviles = () => {
    if (navigator.connection?.type !== 'cellular' || Date.now() - ultimoAviso < 60000) return;
    ultimoAviso = Date.now();
    const t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.textContent = window.znrAhorroDatos() ? 'Estás usando datos móviles · Ahorro de datos activo' : 'Estás usando datos móviles';
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.82);color:#fff;padding:10px 16px;border-radius:999px;font:500 14px system-ui,sans-serif;white-space:nowrap;transition:opacity .4s';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 4000);
  };

  // Historias en ahorro: botón propio para reproducir (por encima de las zonas de "siguiente/anterior").
  window.znrBotonPlayAhorro = (media, video) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '▶ Ver video';
    b.style.cssText = 'position:absolute;z-index:4;padding:12px 20px;border:none;border-radius:999px;background:rgba(0,0,0,.7);color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer';
    b.onclick = e => { e.stopPropagation(); b.remove(); video.play().catch(() => { video.muted = true; video.play().catch(() => {}); }); };
    media.appendChild(b);
  };

  Object.defineProperties(window, {
    CATALOGO_API_URL:     { get: () => CATALOGO_API_URL,     configurable: false, enumerable: false },
    VENDEDORES_API_URL:   { get: () => VENDEDORES_API_URL,   configurable: false, enumerable: false },
    VENTAS_API_URL:       { get: () => VENTAS_API_URL,       configurable: false, enumerable: false },
    PEDIDOS_API_URL:      { get: () => PEDIDOS_API_URL,      configurable: false, enumerable: false },
    BENEFICIARIOS_API_URL:{ get: () => BENEFICIARIOS_API_URL,configurable: false, enumerable: false },
    AUTH_API_URL:         { get: () => AUTH_API_URL,         configurable: false, enumerable: false },
    LIVE_API_URL:         { get: () => LIVE_API_URL,         configurable: false, enumerable: false },
    TIENDA_ZNR_API_URL:   { get: () => TIENDA_ZNR_API_URL,   configurable: false, enumerable: false },
    CATALOGO_SNAPSHOT_URL:{ get: () => CATALOGO_SNAPSHOT_URL,configurable: false, enumerable: false }
  });
})();
