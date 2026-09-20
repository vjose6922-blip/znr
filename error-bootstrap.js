
(function () {
  'use strict';

  window.__zrEarlyErrors = window.__zrEarlyErrors || [];

  window.__zrEarlyHandler = window.__zrEarlyHandler || function (type, payload) {
    window.__zrEarlyErrors.push({ type, payload, ts: Date.now() });
  };

  // ═══════════════════════════════════════════════════════════════════
  //  GUARDIA DE IMÁGENES
  //  Un <img> que falla NO se reporta al instante: se le da su ciclo de
  //  reintentos y solo si al final sigue rota se reporta UNA sola vez
  //  (por URL, por visita). Si se recupera, no queda ni rastro.
  //
  //  · <img> con onerror="znrLoadImgWithRetry(this)": ese reintento ya
  //    existe en common.js; la guardia solo vigila el resultado.
  //  · <img> con otro onerror (ocultar, reemplazar, placeholder...): la
  //    guardia lo suspende, reintenta con espera creciente y solo si
  //    agota los intentos ejecuta el onerror original de la página.
  //  · <img> sin onerror: la guardia reintenta y, si agota, muestra
  //    placeholder.svg.
  //  · Sin conexión (navigator.onLine === false) no se reporta nada.
  //  · Máximo 10 imágenes reportadas por visita + un resumen; así una
  //    caída de Storage no ahoga los demás errores del monitor.
  // ═══════════════════════════════════════════════════════════════════
  const IMG_PLACEHOLDER  = 'placeholder.svg';
  const IMG_RETRY_DELAYS = [800, 1600, 3000, 5000]; // solo <img> sin znrLoadImgWithRetry
  const IMG_SETTLE_MS    = 9000;  // silencio tras el último error = veredicto
  const IMG_MAX_REARMS   = 6;     // veredicto aplazado si aún hay carga en curso
  const IMG_MAX_FINAL    = 10;    // reportes de imagen por visita

  const imgPending   = new Map(); // urlBase -> { base, url, attempts, els, timer, rearms, exhausted }
  const imgFinalSeen = new Set(); // urlBase ya dadas por perdidas en esta visita
  const imgSubs      = [];        // suscriptores (znr-devconsole.js)
  const imgStats     = { recovered: 0, failed: 0, retries: 0, suppressed: 0 };
  let imgFinalCount  = 0;
  let imgSummaryTimer = null;

  // URL sin el parámetro _r (cachebust de los reintentos) para poder
  // reconocer que original y reintentos son la misma imagen.
  function imgNorm(u) {
    try {
      const x = new URL(u, location.href);
      x.searchParams.delete('_r');
      return x.href;
    } catch (_) { return String(u || ''); }
  }

  function imgUrlOf(el) {
    return el.currentSrc || el.src || el.getAttribute('src') || '';
  }

  function imgIsPlaceholder(u) {
    return String(u).indexOf(IMG_PLACEHOLDER) !== -1;
  }

  function imgIsManaged(el) {
    if (el.dataset && el.dataset.znrOrigSrc) return true;
    return (el.getAttribute('onerror') || '').indexOf('znrLoadImgWithRetry') !== -1;
  }

  function imgArm(entry, ms) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(function () { imgVerdict(entry); }, ms);
  }

  function imgResolveOk(entry) {
    clearTimeout(entry.timer);
    imgPending.delete(entry.base);
    imgStats.recovered++;
  }

  function imgDispatchFinal(payload) {
    window.__zrEarlyHandler('resource', payload);
    imgSubs.forEach(function (fn) { try { fn(payload); } catch (_) {} });
  }

  function imgEmitFinal(entry) {
    if (imgFinalSeen.has(entry.base)) return;
    imgFinalSeen.add(entry.base);
    imgStats.failed++;
    if (imgFinalCount >= IMG_MAX_FINAL) {
      imgStats.suppressed++;
      if (!imgSummaryTimer) {
        imgSummaryTimer = setTimeout(function () {
          imgDispatchFinal({
            tag: 'img', url: '', attempts: 0, final: true,
            message: 'Además, ' + imgStats.suppressed + ' imágenes más no cargaron en esta visita (detalle omitido)'
          });
        }, 10000);
      }
      return;
    }
    imgFinalCount++;
    imgDispatchFinal({
      tag: 'img',
      url: entry.url,
      attempts: entry.attempts,
      final: true,
      message: 'No se pudo cargar <img>: ' + entry.url
    });
  }

  function imgVerdict(entry) {
    const els = Array.from(entry.els);

    // ¿Alguna de las copias de esta imagen ya se ve bien?
    const ok = els.some(function (el) {
      return el.isConnected && el.complete && el.naturalWidth > 0 &&
             imgNorm(imgUrlOf(el)) === entry.base;
    });
    if (ok) { imgResolveOk(entry); return; }

    // ¿Todavía hay un reintento o una carga en curso? Aplazar el veredicto.
    const busy = els.some(function (el) {
      return el.__zrTimer || (el.isConnected && !el.complete);
    });
    if (busy && entry.rearms < IMG_MAX_REARMS) {
      entry.rearms++;
      imgArm(entry, IMG_SETTLE_MS);
      return;
    }

    imgPending.delete(entry.base);
    const broken = entry.exhausted || els.some(function (el) {
      if (!el.isConnected) return false;
      return imgIsPlaceholder(imgUrlOf(el)) || (el.complete && el.naturalWidth === 0);
    });
    if (broken) imgEmitFinal(entry);
  }

  function imgGiveUp(el, entry) {
    entry.exhausted = true;
    el.__zrDone = true;
    const saved = el.__zrSaved;
    el.__zrSaved = null;
    if (typeof saved === 'function') {
      // Ahora sí: que corra el onerror que la página tenía puesto.
      el.onerror = saved;
      try { saved.call(el, new Event('error')); } catch (_) {}
    } else if (el.isConnected) {
      el.src = IMG_PLACEHOLDER;
    }
    imgArm(entry, 400);
  }

  function imgScheduleRetry(el, entry) {
    const i = el.__zrTries;
    if (i >= IMG_RETRY_DELAYS.length) { imgGiveUp(el, entry); return; }
    el.__zrTries = i + 1;
    imgStats.retries++;
    el.__zrTimer = setTimeout(function () {
      el.__zrTimer = null;
      if (!el.isConnected) { entry.els.delete(el); return; }
      // Si la página ya cambió el src a otra imagen, soltar este elemento.
      if (imgNorm(el.getAttribute('src') || '') !== entry.base) { entry.els.delete(el); return; }
      const u = el.__zrUrl;
      el.src = u + (u.indexOf('?') === -1 ? '?' : '&') + '_r=' + Date.now();
    }, IMG_RETRY_DELAYS[i]);
  }

  // Devuelve siempre true para <img>: la guardia se hace cargo del evento.
  function imgOnError(el) {
    const url = imgUrlOf(el);

    // src vacío, data: o blob: → no es un problema de red; reporte único.
    if (!/^https?:/i.test(url)) {
      imgEmitFinal({ base: 'raw:' + url.slice(0, 200), url: url ? url.slice(0, 200) : '(sin url)', attempts: 1 });
      return;
    }

    const base = imgNorm(url);
    if (imgIsPlaceholder(base)) return;              // el placeholder mismo: nada que reintentar
    if (navigator.onLine === false) return;          // sin red no es culpa de la imagen
    if (imgFinalSeen.has(base)) {                    // ya dada por perdida en esta visita
      if (el.__zrDone) el.onerror = null;            // fallback de la página que vuelve a fallar: cortar el ciclo
      return;
    }

    // Elemento que ya entregamos al fallback de la página: si vuelve a
    // fallar (p. ej. el placeholder externo), reporte único y nada más.
    if (el.__zrDone) {
      imgEmitFinal({ base: base, url: url, attempts: 1 });
      return;
    }

    let entry = imgPending.get(base);
    if (!entry) {
      entry = { base: base, url: url, attempts: 0, els: new Set(), timer: null, rearms: 0, exhausted: false };
      imgPending.set(base, entry);
    }
    // "Intentos" = cuántas veces falló UN mismo elemento (no la suma de copias).
    if (el.__zrErrBase !== base) { el.__zrErrBase = base; el.__zrErrs = 0; }
    el.__zrErrs++;
    if (el.__zrErrs > entry.attempts) entry.attempts = el.__zrErrs;
    entry.els.add(el);
    imgArm(entry, IMG_SETTLE_MS);

    if (imgIsManaged(el)) return; // su propio reintento se encarga; solo vigilamos

    if (el.__zrBase !== base) {   // primera falla de esta imagen en este elemento
      el.__zrBase  = base;
      el.__zrUrl   = url;
      el.__zrTries = 0;
    }
    // Suspender el onerror de la página mientras reintentamos.
    const cur = el.onerror;
    if (typeof cur === 'function') {
      if (!el.__zrSaved) el.__zrSaved = cur;
      el.onerror = null;
    }
    imgScheduleRetry(el, entry);
  }

  // Cuando una imagen carga bien: cierra su expediente y devuelve el
  // onerror original de la página (si lo teníamos suspendido).
  // (Los eventos 'load' no llegan a window; se capturan en document.)
  document.addEventListener('load', function (e) {
    const el = e.target;
    if (!el || el.tagName !== 'IMG') return;
    if (el.__zrSaved) { el.onerror = el.__zrSaved; el.__zrSaved = null; }
    if (el.__zrTries) el.__zrTries = 0;
    if (!imgPending.size) return;
    const entry = imgPending.get(imgNorm(imgUrlOf(el)));
    if (entry) imgResolveOk(entry);
  }, true);

  window.__zrImgGuard = {
    // Recibe SOLO los fallos definitivos de imagen (después de reintentar).
    onFail: function (fn) { if (typeof fn === 'function') imgSubs.push(fn); },
    stats: function () {
      return {
        recuperadas: imgStats.recovered,
        definitivas: imgStats.failed,
        reintentos: imgStats.retries,
        omitidas: imgStats.suppressed,
        en_curso: imgPending.size
      };
    }
  };

  window.addEventListener('error', function (e) {
    const isResourceError = !e.message && e.target && e.target !== window;

    if (isResourceError) {
      const el = e.target;

      // Imágenes: la guardia decide si algún día se reporta.
      if (el.tagName === 'IMG') {
        e.__zrGuarded = true; // znr-devconsole.js lo usa para no loguear el intento
        imgOnError(el);
        return;
      }

      const url = el.src || el.href || '';
      window.__zrEarlyHandler('resource', {
        tag: (el.tagName || 'UNKNOWN').toLowerCase(),
        url: url,
        message: `No se pudo cargar <${(el.tagName || '?').toLowerCase()}>: ${url || '(sin url)'}`
      });
    } else {
      window.__zrEarlyHandler('script', {
        message: e.message || '',
        filename: e.filename || '',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: (e.error && e.error.stack) || ''
      });
    }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    const reason = e.reason;
    window.__zrEarlyHandler('rejection', {
      message: (reason && reason.message) || String(reason).slice(0, 200),
      stack: (reason && reason.stack) || ''
    });
  });

  document.addEventListener('securitypolicyviolation', function (e) {
    window.__zrEarlyHandler('csp', {
      message: `CSP bloqueó "${e.violatedDirective}": ${e.blockedURI}`,
      directive: e.violatedDirective || '',
      blockedURI: e.blockedURI || '',
      sourceFile: e.sourceFile || '',
      lineNumber: e.lineNumber || 0
    });
  });
  const _origConsoleError = console.error.bind(console);
  const _origConsoleWarn  = console.warn.bind(console);

  function _stringifyArgs(args) {
    return Array.prototype.map.call(args, function (a) {
      if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack : '');
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  console.error = function () {
    window.__zrEarlyHandler('console', {
      level: 'ERROR',
      message: _stringifyArgs(arguments)
    });
    return _origConsoleError.apply(console, arguments);
  };

  console.warn = function () {
    window.__zrEarlyHandler('console', {
      level: 'WARN',
      message: _stringifyArgs(arguments)
    });
    return _origConsoleWarn.apply(console, arguments);
  };

  window.__zrBootstrapLoaded = true;
})();
