/* Banner de temporada: mismo archivo en znr (comunidad.html) y CONTROL (vista previa). Si cambias uno, copia el otro.
   b = { imagen, titulo, subtitulo, descripcion, boton, tema: 'oscuro'|'claro', pos, botonPos, escala, degradado }
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
.com-banner-d { margin: 0; font-size: max(11px, calc(2.7cqw * var(--k))); line-height: 1.3; }
.com-banner-go { padding: 1.4cqw 3.4cqw; border-radius: 999px; background: var(--gradient-accent, #f0566f); color: #fff; font-size: max(11px, calc(2.8cqw * var(--k))); font-weight: 700; white-space: nowrap; }
.com-banner-txt .com-banner-go { margin-top: 1.4cqw; }
.com-banner > .com-banner-go { position: absolute; z-index: 2; }`;
  const V = { t: 'flex-start', m: 'center', b: 'flex-end' }, H = { l: 'flex-start', c: 'center', r: 'flex-end' }, A = { l: 'left', c: 'center', r: 'right' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const okPos = (p) => /^[tmb][lcr]$/.test(p || '');
  // Botón suelto: esquina/borde del banner que indique botonPos.
  const posBoton = (p) => ({ t: 'top:4cqw;', m: 'top:50%;', b: 'bottom:4cqw;' }[p[0]] + { l: 'left:5cqw;', c: 'left:50%;', r: 'right:5cqw;' }[p[1]]
    + `transform:translate(${p[1] === 'c' ? '-50%' : '0'},${p[0] === 'm' ? '-50%' : '0'})`);

  function html(b, extra = '') {
    const pos = okPos(b.pos) ? b.pos : 'ml', bp = okPos(b.botonPos) ? b.botonPos : 'txt';
    const boton = b.boton ? `<span class="com-banner-go"${bp === 'txt' ? '' : ` style="${posBoton(bp)}"`}>${esc(b.boton)}</span>` : '';
    const dir = { l: '90deg', c: '0deg', r: '270deg' }[pos[1]];
    return `<div class="com-banner ${b.tema === 'claro' ? 'claro' : ''}" style="--k:${Number(b.escala) || 1}" ${extra}>
      ${b.imagen ? `<img src="${esc(b.imagen)}" alt="" loading="lazy">` : ''}
      <div class="com-banner-capa${b.degradado === 'no' ? '' : ' deg'}" style="--dir:${dir};justify-content:${V[pos[0]]};align-items:${H[pos[1]]};text-align:${A[pos[1]]}">
        <div class="com-banner-txt"><span class="com-banner-t">${esc(b.titulo)}</span>
        ${b.subtitulo ? `<span class="com-banner-s">${esc(b.subtitulo)}</span>` : ''}${b.descripcion ? `<p class="com-banner-d">${esc(b.descripcion)}</p>` : ''}
        ${bp === 'txt' ? boton : ''}</div></div>${bp === 'txt' ? '' : boton}</div>`;
  }
  // ¿El texto se sale del banner? (para avisar en la vista previa)
  const desborda = (el) => { const c = el.querySelector('.com-banner-capa'); return !!c && c.scrollHeight > c.clientHeight + 1; };

  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  window.znrBanner = { html, desborda };
})();
