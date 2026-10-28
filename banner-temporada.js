/* Banner de temporada: mismo archivo en znr (comunidad.html) y CONTROL (vista previa). Si cambias uno, copia el otro.
   b = { imagen | fondo (CSS) + fotos (hasta 3 URLs, collage a la derecha), titulo, subtitulo, descripcion, boton, tema: 'oscuro'|'claro', pos, botonPos, escala, degradado }
   pos / botonPos: vertical (t|m|b) + horizontal (l|c|r), ej. 'ml' = centro-izquierda. botonPos 'txt' = debajo del texto.
   Los tamaños van en cqw (% del ancho del banner), así se ve igual en el celular y en la vista previa. */
(function () {
  const css = `
.com-banner { position: relative; flex: 0 0 100%; aspect-ratio: 12 / 5; container-type: inline-size; scroll-snap-align: center; scroll-snap-stop: always; border-radius: 20px; overflow: hidden; cursor: pointer; color: #2a1520; text-align: left; }
.com-banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.com-banner.claro { color: #fff; }
.com-banner-capa { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 4cqw 5cqw; box-sizing: border-box; }
.com-banner-capa.deg { background: linear-gradient(var(--dir, 90deg), rgba(255,255,255,.75), rgba(255,255,255,0) 70%); }
.com-banner.claro .com-banner-capa.deg { background: linear-gradient(var(--dir, 90deg), rgba(0,0,0,.6), rgba(0,0,0,0) 70%); }
.com-banner-txt { display: flex; flex-direction: column; align-items: inherit; max-width: 62%; gap: .6cqw; }
.com-banner-t { font-family: 'ZNR Serif', Georgia, serif; font-weight: 700; font-size: calc(7cqw * var(--k)); line-height: 1; }
.com-banner-s { font-family: 'ZNR Serif', Georgia, serif; font-style: italic; font-size: calc(4.6cqw * var(--k)); line-height: 1.05; color: var(--color-accent-solid, #f0566f); }
.com-banner-amp { font-family: Georgia, 'Times New Roman', serif; font-style: normal; }
.com-banner-d { margin: 0; font-size: max(11px, calc(2.7cqw * var(--k))); line-height: 1.3; }
.com-banner-go { padding: 1.4cqw 3.4cqw; border-radius: 999px; background: var(--gradient-accent, #f0566f); color: #fff; font-size: max(11px, calc(2.8cqw * var(--k))); font-weight: 700; white-space: nowrap; }
.com-banner-txt .com-banner-go { margin-top: 1.4cqw; }
.com-banner > .com-banner-go { position: absolute; z-index: 2; }
.com-banner.auto .com-banner-s { color: #ffe9a8; }
.com-banner.auto .com-banner-go { background: #fff; color: #2a1520; }
.com-banner-fotos { position: absolute; right: 7cqw; top: 0; bottom: 0; display: flex; align-items: center; }
.com-banner .com-banner-fotos img { position: static; width: 16cqw; height: 22cqw; margin-left: -4cqw; object-fit: cover; border-radius: 3cqw; border: .6cqw solid #fff; background: #fff; box-shadow: 0 2cqw 4cqw rgba(0,0,0,.25); transform: rotate(-7deg); }
.com-banner .com-banner-fotos img:nth-child(2) { width: 19cqw; height: 27cqw; z-index: 1; transform: none; }
.com-banner .com-banner-fotos img:nth-child(3) { transform: rotate(7deg); }`;
  const V = { t: 'flex-start', m: 'center', b: 'flex-end' }, H = { l: 'flex-start', c: 'center', r: 'flex-end' }, A = { l: 'left', c: 'center', r: 'right' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // La "&" de Playfair es muy ornamental: en títulos va en Georgia (como .znr-amp en el resto del sitio).
  const escT = (s) => esc(s).replace(/&amp;/g, '<span class="com-banner-amp">&amp;</span>');
  const okPos = (p) => /^[tmb][lcr]$/.test(p || '');
  // Botón suelto: esquina/borde del banner que indique botonPos.
  const posBoton = (p) => ({ t: 'top:4cqw;', m: 'top:50%;', b: 'bottom:4cqw;' }[p[0]] + { l: 'left:5cqw;', c: 'left:50%;', r: 'right:5cqw;' }[p[1]]
    + `transform:translate(${p[1] === 'c' ? '-50%' : '0'},${p[0] === 'm' ? '-50%' : '0'})`);

  function html(b, extra = '') {
    const pos = okPos(b.pos) ? b.pos : 'ml', bp = okPos(b.botonPos) ? b.botonPos : 'txt';
    const boton = b.boton ? `<span class="com-banner-go"${bp === 'txt' ? '' : ` style="${posBoton(bp)}"`}>${esc(b.boton)}</span>` : '';
    const dir = { l: '90deg', c: '0deg', r: '270deg' }[pos[1]];
    const fotos = (b.fotos || []).slice(0, 3);
    return `<div class="com-banner ${b.tema === 'claro' ? 'claro' : ''} ${b.fondo ? 'auto' : ''}" style="--k:${Number(b.escala) || 1};${b.fondo ? `background:${esc(b.fondo)}` : ''}" ${extra}>
      ${b.imagen ? `<img src="${esc(b.imagen)}" alt="" loading="lazy">` : ''}
      ${fotos.length ? `<div class="com-banner-fotos">${fotos.map((f) => `<img src="${esc(f)}" alt="" loading="lazy">`).join('')}</div>` : ''}
      <div class="com-banner-capa${b.degradado === 'no' ? '' : ' deg'}" style="--dir:${dir};justify-content:${V[pos[0]]};align-items:${H[pos[1]]};text-align:${A[pos[1]]}">
        <div class="com-banner-txt"${fotos.length ? ' style="max-width:50%"' : ''}><span class="com-banner-t">${escT(b.titulo)}</span>
        ${b.subtitulo ? `<span class="com-banner-s">${escT(b.subtitulo)}</span>` : ''}${b.descripcion ? `<p class="com-banner-d">${esc(b.descripcion)}</p>` : ''}
        ${bp === 'txt' ? boton : ''}</div></div>${bp === 'txt' ? '' : boton}</div>`;
  }
  // ¿El texto se sale del banner? (para avisar en la vista previa)
  const desborda = (el) => { const c = el.querySelector('.com-banner-capa'); return !!c && c.scrollHeight > c.clientHeight + 1; };

  // Carrusel de banners: una tarjeta a la vez, swipe nativo, puntos y avance cada 6 s (se pausa al tocar o fuera de pantalla).
  // Llamarlo de nuevo cada vez que cambian las tarjetas: recalcula los puntos; listeners y temporizador solo una vez.
  function rotar(t, dots) {
    if (!t) return;
    const n = t.children.length, indice = () => Math.round(t.scrollLeft / (t.clientWidth || 1)) || 0;
    const marcar = () => dots && dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === indice()));
    if (dots) dots.innerHTML = n > 1 ? '<i></i>'.repeat(n) : '';
    marcar();
    if (t._rotando) return;
    t._rotando = true;
    let raf, quieto = 0, enPantalla = true;
    t.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(marcar); }, { passive: true });
    ['pointerdown', 'wheel'].forEach((ev) => t.addEventListener(ev, () => { quieto = Date.now() + 8000; }, { passive: true }));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { enPantalla = e[0].isIntersecting; }).observe(t);
    setInterval(() => {
      if (enPantalla && !document.hidden && Date.now() >= quieto && t.children.length > 1) t.scrollTo({ left: ((indice() + 1) % t.children.length) * t.clientWidth, behavior: 'smooth' });
    }, 6000);
  }

  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  window.znrBanner = { html, desborda, rotar };
})();
