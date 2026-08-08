(function () {
  'use strict';
  
  // URLs de tus APIs
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec';
  const CATALOGO_API_URL = 'https://catalogo-api-1038143238323.us-central1.run.app';
  const VENDEDORES_API_URL = 'https://vendedores-api-1038143238323.us-central1.run.app';
  
  // Para WhatsApp
  const _w = ['52', '867', '178', '1272'];
  
  function _buildWaNumber(){ return _w.join(''); }
  
  Object.defineProperties(window, {
    API_URL: {
      get: () => GAS_API_URL,
      configurable: false,
      enumerable: false
    },
    CATALOGO_API_URL: {
      get: () => CATALOGO_API_URL,
      configurable: false,
      enumerable: false
    },
    VENDEDORES_API_URL: {
      get: () => VENDEDORES_API_URL,
      configurable: false,
      enumerable: false
    },
    WHATSAPP_NUMBER: {
      get: _buildWaNumber,
      configurable: false,
      enumerable: false
    }
  });
})();
