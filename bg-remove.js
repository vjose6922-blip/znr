/* bg-remove.js — Quitar fondo y poner blanco (panel de vendedor)
 * Modelo: U²-Net pequeño (u2netp, Apache-2.0), corre en el navegador con onnxruntime-web.
 * Requiere u2netp.onnx en la raíz del sitio, junto a vendedor.html.
 * Expone window.znrProcesarFotos(files) -> Promise<(File|null)[]>:
 *   con la casilla #chk-quitar-fondo marcada quita el fondo, muestra un modal de revisión
 *   y devuelve cada foto aceptada (null = descartada). Sin marcar, devuelve las fotos tal cual.
 * Si algo falla en una foto, se usa la original (nunca bloquea la publicación).
 */
(function () {
  'use strict';

  var MODEL_URL = 'u2netp.onnx';   // en la raíz del repo, junto a index.html
  var ORT_JS = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';
  var ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  var MAX_LADO = 800;            // igual que compressImage de vendedor-unificado.js
  var SIZE = 320;                // entrada fija del modelo
  var MEAN = [0.485, 0.456, 0.406];
  var STD = [0.229, 0.224, 0.225];
  var LS_KEY = 'znr_quitar_fondo';

  var sesion = null;
  var $ = function (id) { return document.getElementById(id); };
  var chkOn = function () { var c = $('chk-quitar-fondo'); return !!(c && c.checked); };
  var idx = 0, tot = 1, lbl = '';

  // Barra flotante de actividad (f = 0..1; f = null la quita)
  function avance(f, t) {
    var b = $('bg-flota');
    if (f == null) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'bg-flota';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(86vw,320px);box-sizing:border-box;padding:10px 14px;border-radius:14px;background:#2b2b2b;color:#fff;font-size:.85rem;z-index:10001;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      b.innerHTML = '<div></div><div style="height:6px;margin-top:6px;background:#555;border-radius:3px;overflow:hidden"><div style="height:100%;width:0;background:#4caf50;transition:width .3s"></div></div>';
      document.body.appendChild(b);
    }
    b.firstChild.textContent = t || lbl;
    b.lastChild.firstChild.style.width = Math.max(4, f * 100) + '%';
  }
  var paso = function (p) { avance((idx + p) / tot); };

  function cargarOrt() {
    if (window.ort) return Promise.resolve();
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = ORT_JS;
      s.onload = ok;
      s.onerror = function () { fail(new Error('No cargó onnxruntime (revisa la CSP y la conexión).')); };
      document.head.appendChild(s);
    });
  }

  async function cargarModelo() {
    if (sesion) return sesion;
    await cargarOrt();
    ort.env.wasm.wasmPaths = ORT_WASM_PATH;
    ort.env.wasm.numThreads = 1;
    avance(0, 'Cargando modelo (la 1.ª vez tarda más)…');
    var r = await fetch(MODEL_URL);
    if (!r.ok) throw new Error('No se encontró ' + MODEL_URL + ' (HTTP ' + r.status + ').');
    var buf = await r.arrayBuffer();
    if (buf.byteLength < 1000000) throw new Error('El archivo del modelo es inválido.');
    sesion = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    return sesion;
  }

  // Caja del producto en el recorte (alpha > 128); ignora motas de pocos píxeles. null si no hay producto.
  function cajaProducto(a, w, h) {
    var cols = new Uint32Array(w), rows = new Uint32Array(h), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 128) { cols[x]++; rows[y]++; }
    var mc = Math.max(2, h * 0.005), mr = Math.max(2, w * 0.005), x0 = -1, x1 = -1, y0 = -1, y1 = -1;
    for (x = 0; x < w; x++) if (cols[x] >= mc) { if (x0 < 0) x0 = x; x1 = x; }
    for (y = 0; y < h; y++) if (rows[y] >= mr) { if (y0 < 0) y0 = y; y1 = y; }
    return (x0 < 0 || y0 < 0 || (x1 - x0 + 1) * (y1 - y0 + 1) < 0.02 * w * h) ? null : [x0, y0, x1 + 1, y1 + 1];
  }

  async function procesar(file) {
    var s = await cargarModelo();
    paso(0.15);
    await new Promise(function (r) { setTimeout(r, 30); });

    var bmp = await createImageBitmap(file);
    var k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    var w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    var fuente = document.createElement('canvas');
    fuente.width = w; fuente.height = h;
    var fctx = fuente.getContext('2d', { willReadFrequently: true });
    fctx.drawImage(bmp, 0, 0, w, h);

    // Entrada 320x320 normalizada
    var pq = document.createElement('canvas');
    pq.width = pq.height = SIZE;
    var pctx = pq.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(fuente, 0, 0, SIZE, SIZE);
    var px = pctx.getImageData(0, 0, SIZE, SIZE).data;
    var n = SIZE * SIZE, maxP = 1, i, c;
    for (i = 0; i < n; i++) {
      var o = i * 4;
      if (px[o] > maxP) maxP = px[o];
      if (px[o + 1] > maxP) maxP = px[o + 1];
      if (px[o + 2] > maxP) maxP = px[o + 2];
    }
    var t = new Float32Array(3 * n);
    for (i = 0; i < n; i++) {
      for (c = 0; c < 3; c++) t[c * n + i] = (px[i * 4 + c] / maxP - MEAN[c]) / STD[c];
    }

    paso(0.35);
    var feeds = {};
    feeds[s.inputNames[0]] = new ort.Tensor('float32', t, [1, 3, SIZE, SIZE]);
    var salida = await s.run(feeds);
    var m = salida[s.outputNames[0]].data;
    paso(0.8);
    var mn = Infinity, mx = -Infinity;
    for (i = 0; i < n; i++) { if (m[i] < mn) mn = m[i]; if (m[i] > mx) mx = m[i]; }
    var rango = (mx - mn) || 1;

    // Máscara 320 -> tamaño de la foto
    var mq = document.createElement('canvas');
    mq.width = mq.height = SIZE;
    var mctx = mq.getContext('2d');
    var mi = mctx.createImageData(SIZE, SIZE);
    for (i = 0; i < n; i++) {
      var v = Math.round(((m[i] - mn) / rango) * 255);
      mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = v;
      mi.data[i * 4 + 3] = 255;
    }
    mctx.putImageData(mi, 0, 0);
    var mg = document.createElement('canvas');
    mg.width = w; mg.height = h;
    var mgctx = mg.getContext('2d', { willReadFrequently: true });
    mgctx.imageSmoothingEnabled = true;
    mgctx.imageSmoothingQuality = 'high';
    mgctx.drawImage(mq, 0, 0, w, h);
    var md = mgctx.getImageData(0, 0, w, h).data;

    // Recorte con transparencia (0.15 y 0.7 ajustan la dureza del borde)
    var im = fctx.getImageData(0, 0, w, h);
    for (i = 0; i < w * h; i++) {
      var a = (md[i * 4] / 255 - 0.15) / 0.7;
      im.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
    var recorte = document.createElement('canvas');
    recorte.width = w; recorte.height = h;
    recorte.getContext('2d').putImageData(im, 0, 0);

    // Fondo blanco, producto centrado y acercado en cuadrado 1:1 (margen 8 %, sin ampliar más de 2x)
    var cj = cajaProducto(im.data, w, h);
    var lado = cj ? Math.round(Math.max(cj[2] - cj[0], cj[3] - cj[1]) * 1.16) : 0;
    var S = cj ? Math.min(MAX_LADO, lado * 2) : 0;
    var fin = document.createElement('canvas');
    fin.width = cj ? S : w; fin.height = cj ? S : h;
    var ctx = fin.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, fin.width, fin.height);
    if (cj) ctx.drawImage(recorte, (cj[0] + cj[2]) / 2 - lado / 2, (cj[1] + cj[3]) / 2 - lado / 2, lado, lado, 0, 0, S, S);
    else ctx.drawImage(recorte, 0, 0);

    var blob = await new Promise(function (res) { fin.toBlob(res, 'image/jpeg', 0.92); });
    if (!blob) throw new Error('No se pudo generar la imagen final.');
    paso(1);
    var base = (file.name || 'imagen').replace(/\.[^.]+$/, '');
    return new File([blob], base + '.jpg', { type: 'image/jpeg' });
  }

  async function procesarLista(archivos) {
    var salida = [];
    tot = archivos.length;
    for (idx = 0; idx < tot; idx++) {
      lbl = 'Quitando fondo ' + (idx + 1) + ' de ' + tot;
      avance(idx / tot);
      try {
        salida.push(await procesar(archivos[idx]));
      } catch (e) {
        console.error('[bg-remove]', e);
        showTemporaryMessage('No se pudo quitar el fondo; se usa la foto original. (' + (e && e.message) + ')', 'error');
        salida.push(archivos[idx]);
      }
    }
    return salida;
  }

  // El contenido va en un wrapper con margin:auto: centrado si cabe y con scroll desde arriba si no
  function overlay(html) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);overflow-y:auto;display:flex;padding:12px;box-sizing:border-box;color:#fff;text-align:center;';
    ov.innerHTML = '<div style="margin:auto;width:100%;max-width:1000px;display:flex;flex-direction:column;align-items:center;gap:12px">' + html + '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  // Modal para ver el resultado ampliado y decidir si se usa cada foto
  function revisar(files) {
    return new Promise(function (res) {
      var out = files.slice();
      var ov = overlay('<b>Revisa las fotos sin fondo</b><small>Toca una foto para ampliarla</small>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px;width:100%"></div>' +
        '<div style="position:sticky;bottom:0;width:100%;padding:10px 0 calc(10px + env(safe-area-inset-bottom,0px));background:rgba(0,0,0,.85);display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button type="button" class="btn" data-ok>Usar estas fotos</button><button type="button" class="btn" data-no>Descartar todas</button></div>');
      var g = ov.firstChild.children[2];
      function fin() { ov.remove(); res(out); }
      files.forEach(function (file, i) {
        var f = document.createElement('div'), url = URL.createObjectURL(file);
        f.innerHTML = '<img style="display:block;width:100%;max-height:42vh;object-fit:contain;background:#fff;border-radius:8px" onclick="this.style.maxHeight=this.style.maxHeight==\'none\'?\'42vh\':\'none\'"><button type="button" class="btn" style="margin-top:6px">Descartar</button>';
        f.firstChild.src = url;
        f.lastChild.onclick = function () { out[i] = null; f.remove(); URL.revokeObjectURL(url); if (!g.children.length) fin(); };
        g.appendChild(f);
      });
      ov.querySelector('[data-ok]').onclick = fin;
      ov.querySelector('[data-no]').onclick = function () { out = out.map(function () { return null; }); fin(); };
    });
  }

  window.znrProcesarFotos = async function (files) {
    if (!chkOn()) return files;
    try {
      var lista = await procesarLista(files);
      avance(null);
      return await revisar(lista);
    } catch (e) {
      avance(null);
      console.error('[bg-remove]', e);
      showTemporaryMessage('Error: ' + (e && e.message), 'error');
      return files;
    }
  };

  // Recuerda la preferencia de la casilla
  var chk = $('chk-quitar-fondo');
  if (chk) {
    try { chk.checked = localStorage.getItem(LS_KEY) === '1'; } catch (e) {}
    chk.addEventListener('change', function () { try { localStorage.setItem(LS_KEY, chk.checked ? '1' : '0'); } catch (e) {} });
  }
})();
