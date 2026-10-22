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
