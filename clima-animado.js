// Animación de fondo según el clima (outfit.html). Un canvas fijo DETRÁS del contenido: lluvia, tormenta con rayo,
// nieve, estrellas de noche y destellos de sol. Lo activa el evento 'znr:clima' que manda looks.js (aplicarClima).
// Se apaga con "Reducir movimiento" del sistema o "Ahorro de datos", y se pausa con la pestaña oculta.
// Para quitarlo: borrar este archivo y su <script> en outfit.html (el evento de looks.js no hace nada sin él).
(function () {
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  let W = 0, H = 0, modo = null, parts = [], chispas = [], rayo = null, sigRayo = 0, cards = [], raf = 0, ultimo = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const oscuro = () => document.documentElement.dataset.theme === 'dark';
  const apagado = () => matchMedia('(prefers-reduced-motion: reduce)').matches || (window.znrAhorroDatos && window.znrAhorroDatos());

  // Clima de looks.js → tipo de animación y cantidad de partículas
  function elegir({ timeOfDay: t, condition: c = '' }) {
    if (/tormenta/.test(c)) return { tipo: 'lluvia', n: 140, viento: /viento/.test(c) ? 4 : 1.5, rayo: true };
    if (/aguanieve/.test(c)) return { tipo: 'mixto', n: 90, viento: 1 };
    if (/nieve/.test(c)) return { tipo: 'nieve', n: 70 };
    if (/lluvia|llovizna/.test(c)) return { tipo: 'lluvia', n: /fuerte/.test(c) ? 130 : /ligera/.test(c) ? 45 : 85, viento: 1 };
    if (/nublad|nubes/.test(c)) return t === 'noche' ? { tipo: 'estrellas', n: 25 } : { tipo: 'bruma', n: 6 };
    if (t === 'noche') return { tipo: 'estrellas', n: 70 };
    return { tipo: 'sol', n: c === 'calor' ? 26 : 16, calido: c !== 'frio' };
  }

  function nueva(arriba) {
    const t = modo.tipo === 'mixto' ? (Math.random() < 0.5 ? 'lluvia' : 'nieve') : modo.tipo;
    const p = { t, x: rnd(-20, W + 20), y: arriba ? rnd(-H * 0.3, -5) : rnd(0, H), choca: Math.random() < 1 / 30 }; // 1 de cada 30 choca con una tarjeta
    if (t === 'lluvia') Object.assign(p, { v: rnd(9, 15), l: rnd(10, 20) });
    else if (t === 'nieve') Object.assign(p, { v: rnd(0.6, 1.6), r: rnd(1.2, 3), f: rnd(0, 6.3) });
    else if (t === 'estrellas') Object.assign(p, { y: rnd(0, H * 0.6), r: rnd(0.6, 1.6), f: rnd(0, 6.3), vf: rnd(0.01, 0.04) });
    else if (t === 'sol') Object.assign(p, { y: arriba ? H + 10 : rnd(0, H), r: rnd(2, 6), v: rnd(0.15, 0.45), f: rnd(0, 6.3) });
    else Object.assign(p, { y: rnd(0, H), r: rnd(120, 220), v: rnd(0.08, 0.2) }); // bruma
    return p;
  }

  // Gota con brillo: trazo que se desvanece hacia arriba + cabeza redonda con un punto de luz.
  // Se dibuja una sola vez por tema y luego se copia en cada gota (más ligero que dibujarla cada cuadro).
  const gotas = {};
  function gota(osc) {
    if (gotas[osc]) return gotas[osc];
    const c = document.createElement('canvas'), x = c.getContext('2d'), col = osc ? '190,210,255' : '70,90,140';
    c.width = 16; c.height = 48; x.scale(2, 2); // 8×24 a doble resolución
    const gr = x.createLinearGradient(0, 0, 0, 22);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},.65)`);
    x.strokeStyle = gr; x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(4, 1); x.lineTo(4, 21); x.stroke();
    x.fillStyle = `rgba(${col},.8)`; x.beginPath(); x.arc(4, 21.2, 1.9, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(255,255,255,.65)'; x.beginPath(); x.arc(3.4, 20.6, 0.65, 0, 6.3); x.fill();
    return (gotas[osc] = c);
  }

  let dpr = 1;
  function medir() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Tarjetas visibles con las que pueden chocar gotas y copos (se miden cada 0.5 s, no en cada cuadro)
  const medirCards = () => { cards = [...document.querySelectorAll('.look-card, a[href="armar-outfit.html"]')].map((e) => e.getBoundingClientRect()).filter((r) => r.bottom > 0 && r.top < H && r.width > 40); };

  function lanzarRayo() { // trazo quebrado que baja desde arriba, con destello
    const pts = [[rnd(W * 0.15, W * 0.85), 0]];
    while (pts.at(-1)[1] < H * rnd(0.45, 0.75)) { const [x, y] = pts.at(-1); pts.push([x + rnd(-28, 28), y + rnd(18, 42)]); }
    rayo = { pts, t: 0 };
    sigRayo = performance.now() + rnd(10000, 20000);
  }

  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min((ahora - (ultimo || ahora)) / 16.7, 3); ultimo = ahora;
    g.clearRect(0, 0, W, H);
    const osc = oscuro();
    if (rayo) { // destello del cielo + rayo que se dibuja hacia abajo y se desvanece
      rayo.t += dt;
      const vida = rayo.t / 40, alfa = Math.max(0, 1 - vida);
      g.fillStyle = osc ? `rgba(255,255,255,${0.22 * alfa * alfa})` : `rgba(90,80,160,${0.12 * alfa * alfa})`; g.fillRect(0, 0, W, H);
      const hasta = Math.min(rayo.pts.length, Math.ceil(rayo.t * 1.5));
      g.strokeStyle = osc ? `rgba(255,255,240,${alfa})` : `rgba(110,90,230,${alfa})`; g.lineWidth = 2.2; g.shadowColor = osc ? 'rgba(200,210,255,.9)' : 'rgba(140,120,255,.9)'; g.shadowBlur = 14;
      g.beginPath(); rayo.pts.slice(0, hasta).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.shadowBlur = 0;
      if (vida >= 1) rayo = null;
    } else if (modo.rayo && ahora > sigRayo) lanzarRayo();

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.t === 'lluvia') {
        p.y += p.v * dt; p.x += (modo.viento || 1) * dt;
        const c = p.choca && cards.find((r) => p.x > r.left && p.x < r.right && p.y >= r.top && p.y - p.v * dt < r.top);
        if (c) { // salpica en el borde de la tarjeta
          for (let k = 0; k < 4; k++) chispas.push({ x: p.x, y: c.top, vx: rnd(-1.6, 1.6), vy: rnd(-2.6, -1), vida: 1 });
          parts[i] = nueva(true); continue;
        }
        const s = p.l / 20; // largo de la estela; inclinada según el viento
        g.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr); g.rotate(-Math.atan2(modo.viento || 1, p.v));
        g.drawImage(gota(osc), -4, -22 * s, 8, 24 * s);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (p.y > H + 20) parts[i] = nueva(true);
      } else if (p.t === 'nieve') {
        p.f += 0.02 * dt; p.y += p.v * dt; p.x += Math.sin(p.f) * 0.5 * dt + (modo.viento || 0) * 0.3;
        const c = p.choca && !p.quieto && cards.find((r) => p.x > r.left && p.x < r.right && p.y >= r.top - p.r && p.y < r.top + 4);
        if (c) { p.quieto = 90; p.y = c.top - p.r; } // el copo se posa un momento en la tarjeta
        if (p.quieto && (p.quieto -= dt) <= 0) { parts[i] = nueva(true); continue; }
        if (p.quieto) p.y -= p.v * dt;
        g.fillStyle = osc ? 'rgba(255,255,255,.85)' : 'rgba(110,130,175,.6)';
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill();
        if (p.y > H + 10) parts[i] = nueva(true);
      } else if (p.t === 'estrellas') {
        p.f += p.vf * dt;
        g.fillStyle = osc ? `rgba(255,255,230,${0.6 * (0.5 + 0.5 * Math.sin(p.f))})` : `rgba(120,100,190,${0.5 * (0.5 + 0.5 * Math.sin(p.f))})`;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill();
      } else if (p.t === 'sol') {
        p.f += 0.01 * dt; p.y -= p.v * dt; p.x += Math.sin(p.f) * 0.3 * dt;
        const a = (osc ? 0.18 : 0.32) + 0.12 * Math.sin(p.f * 3), col = modo.calido ? (osc ? '255,200,120' : '255,150,40') : (osc ? '200,225,255' : '120,170,240');
        const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * 3, 0, 6.3); g.fill();
        if (p.y < -20) parts[i] = nueva(true);
      } else { // bruma: manchas muy tenues que se desplazan
        p.x += p.v * dt; if (p.x - p.r > W) p.x = -p.r;
        const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gr.addColorStop(0, osc ? 'rgba(200,210,230,.07)' : 'rgba(110,115,140,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    }
    chispas = chispas.filter((s) => (s.vida -= 0.04 * dt) > 0);
    chispas.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.25 * dt;
      g.fillStyle = osc ? `rgba(190,210,255,${s.vida * 0.7})` : `rgba(80,100,140,${s.vida * 0.6})`; g.fillRect(s.x, s.y, 1.6, 1.6); });
  }

  const detener = () => { cancelAnimationFrame(raf); raf = 0; ultimo = 0; };
  const correr = () => { if (!raf && modo && !document.hidden) raf = requestAnimationFrame(cuadro); };
  function aplicar(clima) {
    detener(); rayo = null; chispas = [];
    if (!clima || apagado()) { modo = null; cv.remove(); document.body.style.background = ''; return; }
    modo = elegir(clima);
    if (!cv.isConnected) { document.body.prepend(cv); document.body.style.background = 'transparent'; } // el fondo de <html> es el mismo degradado
    medir(); medirCards();
    parts = Array.from({ length: modo.n }, () => nueva(false));
    sigRayo = performance.now() + rnd(3000, 6000); // el primer rayo llega pronto
    correr();
  }

  window.addEventListener('znr:clima', (e) => aplicar(e.detail));
  addEventListener('resize', () => { if (modo) { medir(); medirCards(); } });
  addEventListener('scroll', () => { if (modo) medirCards(); }, { passive: true });
  setInterval(() => { if (raf) medirCards(); }, 500);
  document.addEventListener('visibilitychange', () => (document.hidden ? detener() : correr()));
  if (window.znrClimaActual) aplicar(window.znrClimaActual); // looks.js pudo haber calculado el clima antes de cargar este archivo
})();
