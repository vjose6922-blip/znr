/**
 * historias-editor.js — Editor de historias (vendedores Plus/Pro).
 *
 *   const r = await znrEditorHistoria.abrir(file, { buscarVendedores: async (q) => [...], productos: async () => [...] });
 *   // r = { blob, esVideo, etiquetas } o null si cancela
 *
 * - Recorte de video (hasta 10 s), filtros, texto, emojis, @menciones, sticker de producto y música de la biblioteca de ZNR.
 * - Todo se "quema" en el archivo final con un canvas 9:16: foto → JPEG; video → se graba en tiempo real con MediaRecorder
 *   (canvas + audio mezclado con WebAudio), así el video final ya trae recorte, filtro, textos y música, y pesa poco.
 * - Menciones y producto también se devuelven como etiquetas (zona x/y/w/h del cuadro) para que el visor las haga tocables.
 */
(function () {
  'use strict';
  if (window.znrEditorHistoria) return;
  const W = 720, H = 1280, MAX_SEG = 10;
  const FILTROS = [['Normal', 'none'], ['Cálido', 'sepia(.25) saturate(1.35) hue-rotate(-10deg)'], ['Frío', 'saturate(1.1) hue-rotate(15deg) brightness(1.04)'],
    ['B/N', 'grayscale(1) contrast(1.1)'], ['Vintage', 'sepia(.55) contrast(.9) brightness(1.06)'], ['Brillo', 'brightness(1.2)'],
    ['Contraste', 'contrast(1.35) saturate(1.15)'], ['Vivo', 'saturate(1.7)']];
  const EMOJIS = ['😍', '🔥', '✨', '🎉', '💖', '👗', '👠', '👜', '🛍️', '💸', '🤑', '⭐', '🌸', '🌈', '😎', '🥳', '👏', '💯', '🆕', '⚡', '🎁', '❤️', '😂', '🙌', '👀', '📦', '🚚', '🏷️', '💐', '☀️', '🌙', '🎂', '🪑', '🎈', '🍰', '💍'];
  const COLORES = ['#ffffff', '#111111', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  const BASE = { texto: 56, emoji: 110, mencion: 40, producto: 38 }; // px de letra en un cuadro de 720 de ancho
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let musicaLista = null; // biblioteca de ZNR (musica/lista.json); [] = sin canciones → no se muestra el botón

  function css() {
    if (document.getElementById('zhe-css')) return;
    const st = document.createElement('style');
    st.id = 'zhe-css';
    st.textContent = `
      .zhe{position:fixed;inset:0;z-index:10004;background:#000;color:#fff;display:flex;flex-direction:column;font-family:inherit;touch-action:none}
      .zhe-top{display:flex;gap:6px;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px}
      .zhe-top .sp{flex:1}
      .zhe-b{min-width:42px;height:42px;border-radius:21px;border:none;background:rgba(255,255,255,.14);color:#fff;font:700 15px inherit;font-family:inherit;cursor:pointer;padding:0 10px}
      .zhe-b.ok{background:linear-gradient(135deg,#e11d48,#f97316)}
      .zhe-stage-wrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 8px}
      .zhe-stage{position:relative;height:100%;max-height:100%;aspect-ratio:9/16;max-width:100%;border-radius:14px;overflow:hidden;background:#111}
      .zhe-stage canvas{width:100%;height:100%;display:block}
      .zhe-capa{position:absolute;inset:0}
      .zhe-it{position:absolute;transform:translate(-50%,-50%);white-space:pre;cursor:grab;line-height:1.15;font-weight:800;text-align:center;user-select:none;-webkit-user-select:none}
      .zhe-it.texto{text-shadow:0 2px 6px rgba(0,0,0,.6)}
      .zhe-it.mencion,.zhe-it.producto{background:#fff;color:#111;border-radius:999px;padding:.3em .7em}
      .zhe-it.producto{border-radius:.6em}
      .zhe-it.sel{outline:2px dashed #fff;outline-offset:6px}
      .zhe-bot{padding:8px 10px calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;flex-direction:column;gap:8px}
      .zhe-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
      .zhe-chip{flex-shrink:0;padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;font:600 13px inherit;font-family:inherit;cursor:pointer}
      .zhe-chip.on{background:#fff;color:#111}
      .zhe-rec label{display:flex;align-items:center;gap:8px;font-size:12px}
      .zhe-rec input{flex:1}
      .zhe-hint{font-size:12px;opacity:.75;text-align:center;margin:0}
      .zhe-sheet{position:fixed;left:0;right:0;bottom:0;z-index:10005;background:#1c1c22;color:#fff;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 14px);max-height:70vh;overflow-y:auto}
      .zhe-sheet h4{margin:0 0 10px;font-size:15px}
      .zhe-sheet input[type=text],.zhe-sheet textarea{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;font:15px inherit;font-family:inherit}
      .zhe-emojis{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;font-size:28px}
      .zhe-emojis button,.zhe-op{background:none;border:none;color:inherit;cursor:pointer;padding:6px;border-radius:10px}
      .zhe-op{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:600 14px inherit;font-family:inherit;border-bottom:1px solid #2c2c34}
      .zhe-op img{width:38px;height:38px;border-radius:8px;object-fit:cover;background:#333}
      .zhe-colores{display:flex;gap:8px;margin:10px 0}
      .zhe-colores button{width:30px;height:30px;border-radius:50%;border:2px solid #555;cursor:pointer}
      .zhe-colores button.on{border-color:#fff;transform:scale(1.15)}
      .zhe-prog{position:fixed;inset:0;z-index:10006;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-weight:700}
    `;
    document.head.appendChild(st);
  }

  // Dibuja la imagen o el cuadro del video cubriendo todo el 9:16 (como "object-fit: cover").
  function cubrir(ctx, src, w, h) {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return;
    const k = Math.max(w / sw, h / sh);
    ctx.drawImage(src, (w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k);
  }

  // Dibuja un elemento (texto, emoji, mención o producto) en el canvas final y devuelve su caja en proporciones.
  function dibujarItem(ctx, it, w) {
    const k = w / W, fs = BASE[it.tipo] * it.s * k, cx = it.x * w, cy = it.y * (w * 16 / 9);
    ctx.font = `800 ${fs}px system-ui,-apple-system,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lineas = String(it.texto).split('\n'), lh = fs * 1.15;
    const ancho = Math.max(...lineas.map(l => ctx.measureText(l).width)), alto = lh * lineas.length;
    let bw = ancho, bh = alto;
    if (it.tipo === 'mencion' || it.tipo === 'producto') {
      const px = fs * 0.7, py = fs * 0.3; bw = ancho + px * 2; bh = alto + py * 2;
      const r = it.tipo === 'mencion' ? bh / 2 : fs * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, r) : ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh); ctx.fill();
      ctx.fillStyle = '#111';
    } else {
      ctx.fillStyle = it.tipo === 'texto' ? it.color : '#000';
      if (it.tipo === 'texto') { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.12; ctx.shadowOffsetY = fs * 0.04; }
    }
    lineas.forEach((l, i) => ctx.fillText(l, cx, cy - alto / 2 + lh * (i + 0.5)));
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const h = w * 16 / 9;
    return { x: Math.max(0, (cx - bw / 2) / w), y: Math.max(0, (cy - bh / 2) / h), w: Math.min(1, bw / w), h: Math.min(1, bh / h) };
  }

  function abrir(file, opciones) {
    opciones = opciones || {};
    css();
    return new Promise((resolver) => {
      const esVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const st = { filtro: 'none', items: [], sel: null, ini: 0, dur: 0, total: 0, musica: null, musOffset: 0, quitarOriginal: false };
      const ov = document.createElement('div');
      ov.className = 'zhe';
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Editar historia');
      ov.innerHTML = `
        <div class="zhe-top">
          <button type="button" class="zhe-b" data-a="cancelar" aria-label="Cancelar">✕</button><span class="sp"></span>
          <button type="button" class="zhe-b" data-a="texto" aria-label="Agregar texto">Aa</button>
          <button type="button" class="zhe-b" data-a="emoji" aria-label="Agregar emoji">😊</button>
          <button type="button" class="zhe-b" data-a="mencion" aria-label="Etiquetar a un vendedor">@</button>
          <button type="button" class="zhe-b" data-a="producto" aria-label="Agregar un producto">🏷️</button>
          <button type="button" class="zhe-b" data-a="musica" aria-label="Agregar música" hidden>🎵</button>
        </div>
        <div class="zhe-stage-wrap"><div class="zhe-stage"><canvas width="${W}" height="${H}"></canvas><div class="zhe-capa"></div></div></div>
        <div class="zhe-bot">
          <div class="zhe-sel zhe-row" hidden></div>
          <div class="zhe-row zhe-filtros">${FILTROS.map(([n, f], i) => `<button type="button" class="zhe-chip${i ? '' : ' on'}" data-f="${esc(f)}">${n}</button>`).join('')}</div>
          ${esVideo ? `<div class="zhe-rec"><label>Inicio <input type="range" data-r="ini" min="0" step="0.1" value="0"></label>
            <label>Dura <input type="range" data-r="dur" min="1" step="0.1"></label><p class="zhe-hint" data-r="txt"></p></div>` : ''}
          <p class="zhe-hint zhe-mus" hidden></p>
          <button type="button" class="zhe-b ok" data-a="listo" style="width:100%">Siguiente</button>
        </div>`;
      document.body.appendChild(ov);
      const $ = (s) => ov.querySelector(s);
      const canvas = $('canvas'), ctx = canvas.getContext('2d'), capa = $('.zhe-capa'), stage = $('.zhe-stage');
      let media, raf = 0, audio = null, cerrado = false;

      const cerrar = (r) => {
        if (cerrado) return; cerrado = true;
        cancelAnimationFrame(raf);
        if (media && media.pause) media.pause();
        if (audio) audio.pause();
        URL.revokeObjectURL(url);
        ov.remove(); document.querySelectorAll('.zhe-sheet,.zhe-prog').forEach(e => e.remove());
        resolver(r);
      };

      // ── Vista previa ──
      const pintar = () => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        cubrir(ctx, media, W, H);
        if (esVideo) {
          if (media.currentTime >= st.ini + st.dur || media.currentTime < st.ini - 0.3) { media.currentTime = st.ini; if (audio) audio.currentTime = st.musOffset; }
          raf = requestAnimationFrame(pintar);
        }
      };
      canvas.style.filter = 'none';
      if (esVideo) {
        media = document.createElement('video');
        media.playsInline = true; media.muted = true; media.preload = 'auto'; media.src = url;
        media.onloadedmetadata = () => {
          st.total = media.duration; st.dur = Math.min(MAX_SEG, st.total);
          const ri = $('[data-r=ini]'), rd = $('[data-r=dur]');
          ri.max = Math.max(0, st.total - 1).toFixed(1); rd.max = Math.min(MAX_SEG, st.total).toFixed(1); rd.value = st.dur;
          const txt = () => { $('[data-r=txt]').textContent = `Del ${st.ini.toFixed(1)} s al ${(st.ini + st.dur).toFixed(1)} s · ${st.dur.toFixed(1)} s de ${MAX_SEG} máx.`; };
          ri.oninput = () => { st.ini = Math.min(+ri.value, st.total - 1); st.dur = Math.min(st.dur, st.total - st.ini, MAX_SEG); rd.value = st.dur; media.currentTime = st.ini; txt(); };
          rd.oninput = () => { st.dur = Math.min(+rd.value, st.total - st.ini); txt(); };
          txt();
          media.play().catch(() => {}); pintar();
        };
        media.onerror = () => { alert('No se pudo leer el video.'); cerrar(null); };
      } else {
        media = new Image();
        media.onload = pintar; media.onerror = () => { alert('No se pudo leer la imagen.'); cerrar(null); };
        media.src = url;
      }

      // ── Elementos encima (texto, emoji, mención, producto) ──
      const pintarItems = () => {
        const k = stage.clientWidth / W;
        capa.innerHTML = '';
        st.items.forEach((it, i) => {
          const d = document.createElement('div');
          d.className = 'zhe-it ' + it.tipo + (st.sel === it ? ' sel' : '');
          d.textContent = it.texto;
          d.style.cssText = `left:${it.x * 100}%;top:${it.y * 100}%;font-size:${BASE[it.tipo] * it.s * k}px;${it.tipo === 'texto' ? 'color:' + it.color : ''}`;
          d.dataset.i = i;
          capa.appendChild(d);
        });
        const barra = $('.zhe-sel');
        barra.hidden = !st.sel;
        if (st.sel) {
          barra.innerHTML = `<button type="button" class="zhe-chip" data-s="-">A−</button><button type="button" class="zhe-chip" data-s="+">A+</button>
            ${st.sel.tipo === 'texto' ? '<button type="button" class="zhe-chip" data-s="editar">Editar</button>' : ''}
            <button type="button" class="zhe-chip" data-s="borrar">🗑 Quitar</button><button type="button" class="zhe-chip" data-s="ok">Listo</button>`;
        }
      };
      // Cada elemento nuevo aparece un poco más abajo que el anterior (no encimados); luego se arrastra con el dedo.
      const agregar = (it) => { it.x = it.x ?? 0.5; it.y = it.y ?? 0.3 + (st.items.length % 5) * 0.1; it.s = it.s ?? 1; st.items.push(it); st.sel = it; pintarItems(); };
      $('.zhe-sel').addEventListener('click', (e) => {
        const a = e.target.closest('[data-s]'); if (!a || !st.sel) return;
        const s = a.dataset.s;
        if (s === '+') st.sel.s = Math.min(4, st.sel.s * 1.15);
        else if (s === '-') st.sel.s = Math.max(0.4, st.sel.s / 1.15);
        else if (s === 'borrar') { st.items.splice(st.items.indexOf(st.sel), 1); st.sel = null; }
        else if (s === 'editar') return hojaTexto(st.sel);
        else st.sel = null;
        pintarItems();
      });
      // Arrastrar con el dedo
      let arr = null;
      capa.addEventListener('pointerdown', (e) => {
        const d = e.target.closest('.zhe-it'); if (!d) { st.sel = null; pintarItems(); return; }
        const it = st.items[+d.dataset.i]; st.sel = it; pintarItems();
        const r = stage.getBoundingClientRect();
        arr = { it, r, dx: e.clientX - it.x * r.width, dy: e.clientY - it.y * r.height };
        capa.setPointerCapture(e.pointerId);
      });
      capa.addEventListener('pointermove', (e) => {
        if (!arr) return;
        arr.it.x = Math.min(0.97, Math.max(0.03, (e.clientX - arr.dx) / arr.r.width));
        arr.it.y = Math.min(0.97, Math.max(0.03, (e.clientY - arr.dy) / arr.r.height));
        const d = capa.querySelector(`[data-i="${st.items.indexOf(arr.it)}"]`);
        if (d) { d.style.left = arr.it.x * 100 + '%'; d.style.top = arr.it.y * 100 + '%'; }
      });
      ['pointerup', 'pointercancel'].forEach(t => capa.addEventListener(t, () => { arr = null; }));
      window.addEventListener('resize', pintarItems);

      // ── Hojas (texto, emoji, mención, producto, música) ──
      const hoja = (titulo, html) => {
        document.querySelectorAll('.zhe-sheet').forEach(x => x.remove());
        const sh = document.createElement('div');
        sh.className = 'zhe-sheet'; sh.innerHTML = `<h4>${titulo}</h4>${html}<button type="button" class="zhe-b" data-x style="width:100%;margin-top:10px">Cerrar</button>`;
        sh.querySelector('[data-x]').onclick = () => sh.remove();
        document.body.appendChild(sh);
        return sh;
      };
      function hojaTexto(it) {
        let color = it ? it.color : '#ffffff';
        const sh = hoja(it ? 'Editar texto' : 'Agregar texto', `<textarea rows="3" maxlength="120" placeholder="Escribe aquí"></textarea>
          <div class="zhe-colores">${COLORES.map(c => `<button type="button" style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div>
          <button type="button" class="zhe-b ok" data-ok style="width:100%">Listo</button>`);
        const ta = sh.querySelector('textarea'); ta.value = it ? it.texto : ''; setTimeout(() => ta.focus(), 50);
        const marcar = () => sh.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === color));
        sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; marcar(); }); marcar();
        sh.querySelector('[data-ok]').onclick = () => {
          const t = ta.value.trim(); sh.remove(); if (!t) return;
          if (it) { it.texto = t; it.color = color; pintarItems(); } else agregar({ tipo: 'texto', texto: t, color });
        };
      }
      const acciones = {
        cancelar: () => cerrar(null),
        texto: () => hojaTexto(null),
        emoji: () => {
          const sh = hoja('Emojis', `<div class="zhe-emojis">${EMOJIS.map(e => `<button type="button">${e}</button>`).join('')}</div>`);
          sh.querySelectorAll('.zhe-emojis button').forEach(b => b.onclick = () => { sh.remove(); agregar({ tipo: 'emoji', texto: b.textContent }); });
        },
        mencion: () => {
          const sh = hoja('Etiquetar a un vendedor', '<input type="text" placeholder="@ nombre de la tienda" autocomplete="off"><div data-l style="margin-top:8px"></div>');
          const inp = sh.querySelector('input'), lista = sh.querySelector('[data-l]'); let t = 0;
          setTimeout(() => inp.focus(), 50);
          inp.oninput = () => {
            clearTimeout(t);
            t = setTimeout(async () => {
              const q = inp.value.replace(/^@/, '').trim();
              if (!q) { lista.innerHTML = ''; return; }
              lista.innerHTML = '<p class="zhe-hint">Buscando…</p>';
              const vs = await Promise.resolve(opciones.buscarVendedores ? opciones.buscarVendedores(q) : []).catch(() => []);
              lista.innerHTML = vs.length ? vs.map((v, i) => `<button type="button" class="zhe-op" data-i="${i}">${v.logo ? `<img src="${esc(v.logo)}" alt="">` : ''}<span>@${esc(v.nombre)}${window.znrInsignia ? window.znrInsignia(v.nivel) : ''}</span></button>`).join('')
                : '<p class="zhe-hint">No encontramos vendedores con ese nombre en tu ciudad.</p>';
              lista.querySelectorAll('.zhe-op').forEach(b => b.onclick = () => { const v = vs[+b.dataset.i]; sh.remove(); agregar({ tipo: 'mencion', texto: '@' + v.nombre, uid: v.uid }); });
            }, 250);
          };
        },
        producto: async () => {
          const sh = hoja('Agregar un producto', '<p class="zhe-hint">Cargando tus productos…</p>');
          const ps = await Promise.resolve(opciones.productos ? opciones.productos() : []).catch(() => []);
          sh.querySelector('.zhe-hint').outerHTML = ps.length ? ps.map((p, i) => `<button type="button" class="zhe-op" data-i="${i}"><img src="${esc(p.imagen1 || '')}" alt=""><span>${esc(p.nombre)} · $${Number(p.precio || 0).toLocaleString('es-MX')}</span></button>`).join('')
            : '<p class="zhe-hint">No tienes productos aprobados.</p>';
          sh.querySelectorAll('.zhe-op').forEach(b => b.onclick = () => {
            const p = ps[+b.dataset.i]; sh.remove();
            st.items = st.items.filter(x => x.tipo !== 'producto'); // un solo producto por historia
            agregar({ tipo: 'producto', texto: `🛍️ ${String(p.nombre).slice(0, 28)} · $${Number(p.precio || 0).toLocaleString('es-MX')}`, productoId: p.id, y: 0.8 });
          });
        },
        musica: () => {
          const sh = hoja('Música de ZNR (libre de derechos)', `${musicaLista.map((m, i) => `<button type="button" class="zhe-op" data-i="${i}">🎵 <span>${esc(m.titulo)}<br><small style="opacity:.6">${esc(m.artista || '')}</small></span></button>`).join('')}
            <label class="zhe-hint" style="display:flex;gap:8px;align-items:center;justify-content:flex-start;margin-top:10px"><input type="checkbox" data-q ${st.quitarOriginal ? 'checked' : ''}> Quitar sonido original del video</label>
            ${st.musica ? '<button type="button" class="zhe-b" data-sin style="width:100%;margin-top:8px">Quitar música</button>' : ''}`);
          sh.querySelector('[data-q]').onchange = (e) => { st.quitarOriginal = e.target.checked; media.muted = true; };
          sh.querySelectorAll('.zhe-op').forEach(b => b.onclick = () => {
            const m = musicaLista[+b.dataset.i]; sh.remove();
            if (audio) audio.pause();
            st.musica = m; st.quitarOriginal = true;
            audio = new Audio('musica/' + encodeURIComponent(m.archivo)); audio.loop = true;
            audio.currentTime = st.musOffset = Number(m.inicio) || 0;
            audio.play().catch(() => {});
            const p = $('.zhe-mus'); p.hidden = false; p.textContent = `🎵 ${m.titulo}${m.artista ? ' · ' + m.artista : ''} (sin sonido original)`;
          });
          const sin = sh.querySelector('[data-sin]');
          if (sin) sin.onclick = () => { sh.remove(); if (audio) audio.pause(); audio = null; st.musica = null; st.quitarOriginal = false; $('.zhe-mus').hidden = true; };
        },
        listo: () => exportar().then((r) => r && cerrar(r)).catch((e) => { document.querySelectorAll('.zhe-prog').forEach(x => x.remove()); alert(e.message || 'No se pudo preparar la historia.'); }),
      };
      ov.querySelector('.zhe-top').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) acciones[b.dataset.a](); });
      $('[data-a=listo]').addEventListener('click', acciones.listo);
      $('.zhe-filtros').addEventListener('click', (e) => {
        const b = e.target.closest('[data-f]'); if (!b) return;
        st.filtro = b.dataset.f; canvas.style.filter = st.filtro;
        ov.querySelectorAll('.zhe-filtros .zhe-chip').forEach(x => x.classList.toggle('on', x === b));
      });
      // Música: solo en videos (una foto no tiene sonido) y solo si ya hay canciones en la biblioteca.
      if (esVideo) cargarMusica().then((l) => { if (l.length && !cerrado) $('[data-a=musica]').hidden = false; });

      // ── Archivo final ──
      function componer(c, w, h) { // dibuja cuadro + filtro + elementos; devuelve las etiquetas tocables
        const cx = c.getContext('2d');
        cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h);
        if ('filter' in cx) cx.filter = st.filtro;
        cubrir(cx, media, w, h);
        if ('filter' in cx) cx.filter = 'none';
        return st.items.map(it => {
          const caja = dibujarItem(cx, it, w);
          return it.tipo === 'mencion' ? { tipo: 'mencion', uid: it.uid, ...caja } : it.tipo === 'producto' ? { tipo: 'producto', productoId: it.productoId, ...caja } : null;
        }).filter(Boolean);
      }
      async function exportar() {
        cancelAnimationFrame(raf);
        const c = document.createElement('canvas');
        if (!esVideo) {
          c.width = 1080; c.height = 1920;
          const etiquetas = componer(c, 1080, 1920);
          const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.88));
          return { blob, esVideo: false, etiquetas };
        }
        const editado = st.items.length || st.filtro !== 'none' || st.musica || st.quitarOriginal || st.ini > 0.05 || st.dur < st.total - 0.05;
        // H.264 primero: es lo que reproducen todos los celulares (incluidos iPhone viejos); luego WebM.
        const tipos = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,opus', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/mp4', 'video/webm'];
        const mime = window.MediaRecorder && tipos.find(t => MediaRecorder.isTypeSupported(t));
        if (!c.captureStream || !mime) {
          if (!editado && st.total <= MAX_SEG + 0.5) return { blob: file, esVideo: true, etiquetas: [] }; // sin cambios: el original tal cual
          throw new Error('Tu navegador no permite editar videos. Actualízalo, o sube un video de máximo 10 s sin editar.');
        }
        c.width = W; c.height = H;
        // Audio: sonido original (si no se quitó) + canción, mezclados en WebAudio y grabados junto al canvas.
        const AC = window.AudioContext || window.webkitAudioContext, ac = AC ? new AC() : null;
        const destino = ac && ac.createMediaStreamDestination();
        if (ac && !st.quitarOriginal) { media.muted = false; media._fuente = media._fuente || ac.createMediaElementSource(media); media._fuente.connect(destino); }
        let musica = null;
        if (ac && st.musica) {
          musica = new Audio('musica/' + encodeURIComponent(st.musica.archivo)); musica.currentTime = st.musOffset;
          ac.createMediaElementSource(musica).connect(destino);
        }
        if (audio) audio.pause();
        const pistas = [...c.captureStream(30).getVideoTracks(), ...(destino ? destino.stream.getAudioTracks() : [])];
        const rec = new MediaRecorder(new MediaStream(pistas), { mimeType: mime, videoBitsPerSecond: 2500000 });
        const partes = []; rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
        const prog = document.createElement('div'); prog.className = 'zhe-prog';
        prog.innerHTML = '<div>Preparando tu video…</div><div data-p></div>'; document.body.appendChild(prog);
        let etiquetas = [];
        await new Promise((listo, fallo) => {
          media.currentTime = st.ini; media.loop = false;
          media.onseeked = async () => {
            media.onseeked = null;
            try { await ac?.resume(); await media.play(); if (musica) await musica.play(); } catch (e) { return fallo(new Error('No se pudo reproducir el video para prepararlo.')); }
            rec.onstop = listo; rec.start(250);
            const fin = st.ini + st.dur;
            const cuadro = () => {
              etiquetas = componer(c, W, H);
              prog.querySelector('[data-p]').textContent = `${Math.min(st.dur, media.currentTime - st.ini).toFixed(1)} / ${st.dur.toFixed(1)} s`;
              if (media.currentTime >= fin || media.ended) { media.pause(); if (musica) musica.pause(); rec.stop(); return; }
              requestAnimationFrame(cuadro);
            };
            cuadro();
          };
        });
        prog.remove();
        const blob = new Blob(partes, { type: mime.split(';')[0] });
        if (ac) ac.close().catch(() => {});
        return { blob, esVideo: true, etiquetas };
      }
    });
  }

  async function cargarMusica() {
    if (musicaLista) return musicaLista;
    try { const l = await (await fetch('musica/lista.json', { cache: 'no-cache' })).json(); musicaLista = Array.isArray(l) ? l.filter(m => m && m.archivo && m.titulo) : []; }
    catch (_) { musicaLista = []; }
    return musicaLista;
  }

  window.znrEditorHistoria = { abrir };
})();
