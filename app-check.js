// app-check.js — App Check: reCAPTCHA Enterprise (Fraud Defense, invisible) prueba que la petición sale de esta página y no de un bot.
// Va antes que cualquier otro script. Los SDK de Firebase mandan el token solos; aquí se agrega a fetch:
// APIs de Cloud Run en ?_ac= (sin cabecera extra, así no hay preflight CORS) y RTDB por REST en X-Firebase-AppCheck.
// Mientras CLAVE sea el marcador no se activa nada.
(function () {
  'use strict';
  const CLAVE = '6Lee1AcuAAAAAH4DUNptOgvBdPq64Lr4pUCH5-SI'; // Firebase Console → App Check → Apps → Fraud Defense (reCAPTCHA Enterprise)
  const sdk = (v) => Promise.all(['app', 'app-check'].map((m) => import(`https://www.gstatic.com/firebasejs/${v}/firebase-${m}.js`)));
  // Una sola instancia habla con reCAPTCHA: la de la app principal (la crea si la página aún no la tiene).
  const base = CLAVE.startsWith('PEGA_') ? null : sdk('10.13.0').then(([a, c]) => ({ c, ac: c.initializeAppCheck(
    a.getApps().find((x) => x.name === '[DEFAULT]') || a.initializeApp({
      apiKey: 'AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes', authDomain: 'znr-live.firebaseapp.com',
      databaseURL: 'https://znr-live-default-rtdb.firebaseio.com', projectId: 'znr-live',
      storageBucket: 'znr-live.firebasestorage.app', messagingSenderId: '1038143238323',
      appId: '1:1038143238323:web:5171b9dd8823628086c0c6'
    }), { provider: new c.ReCaptchaEnterpriseProvider(CLAVE), isTokenAutoRefreshEnabled: true }) })).catch(() => null);
  // Máx. 5 s: si reCAPTCHA no responde, la petición sale sin token en vez de quedarse esperando para siempre.
  // ms: cuánto se espera el token. Si falla, el motivo queda en window.znrAppCheckError (para el panel de errores).
  const token = (ms = 5000) => Promise.race([Promise.resolve(base).then((b) => b ? b.c.getToken(b.ac) : null)
    .then((t) => t?.token || '', (e) => { window.znrAppCheckError = String((e && (e.code || e.message)) || e); return ''; }),
    new Promise((ok) => setTimeout(ok, ms, ''))]);
  // Se cumple cuando ya hay token (o a los 15 s): lo que se pide al abrir la página y no corre prisa (ej. el WhatsApp
  // del admin en api-config.js) lo espera, en vez de salir sin token y recibir 401 "Missing appcheck token".
  window.znrAppCheckListo = Promise.race([Promise.resolve(base).then((b) => b && b.c.getToken(b.ac)).catch(() => null), new Promise((ok) => setTimeout(ok, 15000))]);

  // Cada módulo que crea una app de Firebase hace `await window.znrAppCheck(app, versión)` antes de usarla.
  // Las apps con nombre (lives, chat) reutilizan el token de la principal.
  window.znrAppCheck = async (app, v = '10.13.0') => {
    if (!(await base) || app.name === '[DEFAULT]') return;
    const [, c] = await sdk(v).catch(() => []);
    c?.initializeAppCheck(app, { provider: new c.CustomProvider({ getToken: async () => ({ token: await token(), expireTimeMillis: Date.now() + 300000 }) }) });
  };

  const f = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    const api = url.includes('.run.app'), rtdb = url.includes('.firebaseio.com');
    if (!api && !rtdb) return f(input, init);
    // RTDB rechaza sin token (401 "Missing appcheck token"): al abrir la página reCAPTCHA puede tardar más de 5 s,
    // así que estas lecturas esperan hasta 15 s (como hacen los SDK de Firebase) y, si aun así llega 401, se reintenta una vez.
    const t = await token(rtdb ? 15000 : 5000);
    if (api) return t ? f(url + (url.includes('?') ? '&' : '?') + '_ac=' + encodeURIComponent(t), init) : f(input, init);
    const pedir = (tk) => {
      if (!tk) return f(input, init);
      const headers = new Headers(init && init.headers);
      headers.set('X-Firebase-AppCheck', tk);
      return f(url, { ...init, headers });
    };
    const r = await pedir(t);
    if (r.status !== 401) return r;
    await new Promise((ok) => setTimeout(ok, 1500));
    const t2 = await token(15000);
    return t2 ? pedir(t2) : r;
  };
})();
