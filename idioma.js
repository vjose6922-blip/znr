// Idioma (Preferencias → Apariencia): en inglés la página se traduce con el traductor de Google; en español no carga nada.
// La cookie googtrans le dice al traductor a qué idioma pasar; la barra de Google se oculta.
(() => {
  const borrarCookie = () => ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')]
    .forEach((d) => { document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT' + d; });
  window.znrCambiarIdioma = (idioma) => {
    try { localStorage.setItem('znr_idioma', idioma); } catch {}
    idioma === 'en' ? (document.cookie = 'googtrans=/es/en; path=/') : borrarCookie();
    location.reload();
  };
  let en = false;
  try { en = localStorage.getItem('znr_idioma') === 'en'; } catch {}
  if (!en) return;
  document.cookie = 'googtrans=/es/en; path=/';
  document.documentElement.lang = 'en';
  document.head.insertAdjacentHTML('beforeend', '<style>.goog-te-banner-frame,iframe.skiptranslate,#goog-gt-tt,.goog-te-balloon-frame,#znr-traductor{display:none!important}body{top:0!important}font{background:none!important;box-shadow:none!important}</style>');
  window.znrTraductor = () => new google.translate.TranslateElement({ pageLanguage: 'es', includedLanguages: 'en', autoDisplay: false }, 'znr-traductor');
  const cargar = () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="znr-traductor"></div>');
    document.head.appendChild(Object.assign(document.createElement('script'), { src: 'https://translate.google.com/translate_a/element.js?cb=znrTraductor', async: true }));
  };
  document.body ? cargar() : document.addEventListener('DOMContentLoaded', cargar);
})();
