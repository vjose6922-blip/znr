// Animación de fondo según el clima (outfit.html). Un canvas fijo DETRÁS del contenido: lluvia, tormenta con rayo,
// nieve, estrellas de noche y destellos de sol. Lo activa el evento 'znr:clima' que manda looks.js (aplicarClima).
// Se apaga con "Reducir movimiento" del sistema o "Ahorro de datos", y se pausa con la pestaña oculta.
// Sorpresa: tras 6 s sin scroll ni toques aparecen extras sobre las tarjetas visibles (ver "Sorpresa" abajo).
// Para quitarlo: borrar este archivo y su <script> en outfit.html (el evento de looks.js no hace nada sin él).
(function () {
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  let W = 0, H = 0, modo = null, parts = [], chispas = [], fugaces = [], rayo = null, sigRayo = 0, cards = [], raf = 0, ultimo = 0;
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
    rayo = { pts, t: 0, fuerte: !!sorpresa };
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
      const k = rayo.fuerte ? 1.8 : 1;
      g.fillStyle = osc ? `rgba(255,255,255,${0.22 * k * alfa * alfa})` : `rgba(90,80,160,${0.12 * k * alfa * alfa})`; g.fillRect(0, 0, W, H);
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
    fugaces = fugaces.filter((f) => (f.vida -= 0.012 * dt) > 0);
    fugaces.forEach((f) => { // estrella fugaz: punto brillante con cola
      f.x += f.vx * dt; f.y += f.vy * dt;
      const gr = g.createLinearGradient(f.x, f.y, f.x - f.vx * 14, f.y - f.vy * 14), col = osc ? '255,255,235' : '120,100,200';
      gr.addColorStop(0, `rgba(${col},${f.vida})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.strokeStyle = gr; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - f.vx * 14, f.y - f.vy * 14); g.stroke();
    });
    chispas = chispas.filter((s) => (s.vida -= 0.04 * dt) > 0);
    chispas.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.25 * dt;
      g.fillStyle = osc ? `rgba(190,210,255,${s.vida * 0.7})` : `rgba(80,100,140,${s.vida * 0.6})`; g.fillRect(s.x, s.y, 1.6, 1.6); });
  }

  const detener = () => { cancelAnimationFrame(raf); raf = 0; ultimo = 0; };
  const correr = () => { if (!raf && modo && !document.hidden) raf = requestAnimationFrame(cuadro); };
  function aplicar(clima) {
    detener(); terminarSorpresa(); quieto = performance.now(); rayo = null; chispas = [];
    if (!clima || apagado()) { modo = null; cv.remove(); document.body.style.background = ''; return; }
    modo = { ...elegir(clima), cond: clima.condition || '' };
    if (!cv.isConnected) { document.body.prepend(cv); document.body.style.background = 'transparent'; } // el fondo de <html> es el mismo degradado
    medir(); medirCards();
    parts = Array.from({ length: modo.n }, () => nueva(false));
    sigRayo = performance.now() + rnd(3000, 6000); // el primer rayo llega pronto
    correr();
  }

  // ── Sorpresa: tras 6 s sin scroll ni toques, extras sobre las tarjetas visibles; al moverse se desvanecen ──
  const estilo = document.createElement('style');
  estilo.textContent = `
.znr-x-on{position:relative}
.znr-x{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:5;transition:opacity .5s}
.znr-x.fuera{opacity:0}
.znr-brillo{position:absolute;top:-20%;bottom:-20%;width:35%;left:-60%;transform:skewX(-18deg);background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);animation:znrBrillo 1.6s ease-in-out forwards}
@keyframes znrBrillo{to{left:130%}}
.znr-nieve{position:absolute;left:0;right:0;top:0;height:13px;transform-origin:top;animation:znrNieve 5s ease-out forwards;filter:drop-shadow(0 1px 1.5px rgba(80,100,140,.4));
 background:linear-gradient(#fff,#fff) 0 0/100% 6px no-repeat,radial-gradient(circle at 50% 5px,#fff 7px,transparent 7.5px) 0 0/24px 13px repeat-x}
@keyframes znrNieve{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.znr-gotita{position:absolute;top:-10px;width:5px;height:7px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:rgba(70,90,140,.6);box-shadow:inset -1px -1px 0 rgba(255,255,255,.55);animation:znrGotita 2.6s ease-in forwards}
.znr-gotita::before{content:'';position:absolute;left:1.5px;bottom:6px;width:2px;height:18px;background:linear-gradient(transparent,rgba(70,90,140,.3))}
[data-theme=dark] .znr-gotita{background:rgba(190,210,255,.65)}
@keyframes znrGotita{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(110px);opacity:0}}
.znr-sombra{position:absolute;top:-40%;bottom:-40%;width:110%;left:-110%;background:radial-gradient(ellipse at center,rgba(30,35,60,.2),transparent 65%);animation:znrSombra 8s linear infinite}
@keyframes znrSombra{to{left:100%}}
.znr-rayo-borde{animation:znrRayoBorde .8s ease-out}
@keyframes znrRayoBorde{15%{box-shadow:0 0 0 1.5px rgba(170,150,255,.95),0 0 26px rgba(160,140,255,.75)}}`;
  document.head.appendChild(estilo);
  let quieto = performance.now(), sorpresa = 0;
  const azar = (a) => a[Math.floor(Math.random() * a.length)];
  const visibles = () => [...document.querySelectorAll('.look-card, a[href="armar-outfit.html"]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 80 && r.top < H - 80 && r.width > 40; });
  function capa(card) { // capa transparente encima de la tarjeta (no recibe toques)
    let d = card.querySelector(':scope > .znr-x');
    if (!d) { card.classList.add('znr-x-on'); d = document.createElement('div'); d.className = 'znr-x'; card.appendChild(d); }
    return d;
  }
  const poner = (card, clase, css = '') => { const e = document.createElement('div'); e.className = clase; e.style.cssText = css; capa(card).appendChild(e); return e; };
  function extra() {
    const cs = visibles(), c = modo && modo.cond;
    if (!cs.length || !modo) return;
    if (modo.rayo) { // rayo fuerte que ilumina los bordes de las tarjetas
      lanzarRayo();
      cs.forEach((e) => { e.classList.remove('znr-rayo-borde'); void e.offsetWidth; e.classList.add('znr-rayo-borde'); });
    }
    if (/nieve/.test(c)) azar([cs.slice(0, 2), cs.slice(-2)]).forEach((e) => e.querySelector('.znr-nieve') || poner(e, 'znr-nieve'));
    if (modo.tipo === 'lluvia' || modo.tipo === 'mixto') {
      const e = azar(cs);
      for (let i = 0; i < 3; i++) setTimeout(() => sorpresa && poner(e, 'znr-gotita', `left:${rnd(8, 92)}%`).addEventListener('animationend', (ev) => ev.target.remove()), i * rnd(300, 900));
    }
    if (modo.tipo === 'sol') poner(azar(cs), 'znr-brillo').addEventListener('animationend', (ev) => ev.target.remove());
    if (modo.tipo === 'bruma') cs.forEach((e) => e.querySelector('.znr-sombra') || poner(e, 'znr-sombra', `animation-delay:${(-e.getBoundingClientRect().left / W) * 3}s`));
    if (modo.tipo === 'estrellas') fugaces.push({ x: rnd(W * 0.2, W), y: rnd(10, H * 0.3), vx: -rnd(5, 8), vy: rnd(2, 3.5), vida: 1 });
  }
  function iniciarSorpresa() {
    extra();
    sorpresa = setInterval(extra, modo.rayo ? 5000 : modo.tipo === 'sol' ? 3500 : modo.tipo === 'estrellas' ? 4500 : 2600);
  }
  function terminarSorpresa() {
    if (!sorpresa) return;
    clearInterval(sorpresa); sorpresa = 0; fugaces = [];
    document.querySelectorAll('.znr-rayo-borde').forEach((e) => e.classList.remove('znr-rayo-borde'));
    document.querySelectorAll('.znr-x').forEach((d) => {
      d.classList.add('fuera');
      setTimeout(() => { d.parentNode && d.parentNode.classList.remove('znr-x-on'); d.remove(); }, 500);
    });
  }
  ['scroll', 'touchstart', 'pointerdown', 'wheel', 'keydown'].forEach((ev) => addEventListener(ev, () => { quieto = performance.now(); terminarSorpresa(); }, { passive: true }));
  setInterval(() => { if (modo && raf && !sorpresa && performance.now() - quieto > 6000) iniciarSorpresa(); }, 500);

  window.addEventListener('znr:clima', (e) => aplicar(e.detail));
  addEventListener('resize', () => { if (modo) { medir(); medirCards(); } });
  addEventListener('scroll', () => { if (modo) medirCards(); }, { passive: true });
  setInterval(() => { if (raf) medirCards(); }, 500);
  document.addEventListener('visibilitychange', () => (document.hidden ? detener() : correr()));
  if (window.znrClimaActual) aplicar(window.znrClimaActual); // looks.js pudo haber calculado el clima antes de cargar este archivo
})();
