// Scroll infinito compartido (Catálogo, Comunidad y Perfil de vendedor): carga la siguiente tanda al acercarse al final.
// Cada `tope` tarjetas pide "Ver más" (así se alcanza el pie de página) y al volver atrás restaura las tandas y la posición.
// Uso: const si = znrScrollInfinito({ lista, tarjetas, hayMas, cargarMas }); tras pintar desde cero, si.reiniciar().
// cargarMas puede devolver true/false (avanzó o no): con true sigue aunque la tanda no agregue tarjetas (p. ej. todo agotado).
window.znrScrollInfinito = function ({ lista, tarjetas, hayMas, cargarMas, tope = 150 }) {
  const clave = 'znr_si_' + location.pathname + location.search, contar = () => lista.querySelectorAll(tarjetas).length;
  const st = document.createElement('style');
  st.textContent = `${tarjetas}{content-visibility:auto;contain-intrinsic-block-size:auto 320px}.znr-si-fin{text-align:center;padding:16px 0 28px;color:var(--color-text-soft,#888);font-size:.85rem}`;
  document.head.appendChild(st);
  const fin = document.createElement('div');
  fin.className = 'znr-si-fin';
  fin.innerHTML = '<span hidden>Cargando…</span><button type="button" class="primary-button" hidden>Ver más</button>';
  lista.after(fin);
  const [msg, btn] = fin.children;
  let limite = tope, ocupado = false, atascado = false, tandas = 0, restaurar = null;
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'back_forward') restaurar = JSON.parse(sessionStorage.getItem(clave) || 'null');
  } catch (_) {}
  const pintar = () => {
    msg.hidden = !ocupado;
    btn.hidden = ocupado || !hayMas() || (!atascado && contar() < limite);
    btn.textContent = atascado ? 'Reintentar' : 'Ver más';
  };
  async function siguiente() {
    if (ocupado || !hayMas() || atascado || contar() >= limite) return pintar();
    const antes = contar();
    ocupado = true; pintar();
    let avanzo = false;
    try { avanzo = await cargarMas(); tandas++; } catch (e) { console.warn('scroll infinito:', e); }
    ocupado = false;
    atascado = avanzo !== true && contar() === antes && hayMas(); // no avanzó: se deja el botón para no reintentar en bucle
    pintar();
    if (cerca() && !atascado) siguiente();
  }
  btn.onclick = () => { atascado = false; limite = contar() + tope; siguiente(); };
  const cerca = () => fin.getBoundingClientRect().top < innerHeight + 900; // se mide al momento (no un valor de cuando la lista estaba vacía)
  let cuadro = false; // se revisa al hacer scroll, una vez por cuadro
  addEventListener('scroll', () => { if (!cuadro) { cuadro = true; requestAnimationFrame(() => { cuadro = false; if (cerca()) siguiente(); }); } }, { passive: true });
  addEventListener('pagehide', () => { try { sessionStorage.setItem(clave, JSON.stringify({ tandas, y: scrollY })); } catch (_) {} });
  return {
    async reiniciar() { // la lista se volvió a pintar desde la primera tanda (carga inicial, filtro o búsqueda)
      limite = tope; tandas = 0; atascado = false;
      const r = restaurar && (hayMas() || !restaurar.tandas) ? restaurar : null; // con 1 sola página (p. ej. la copia guardada) espera a la carga real
      if (r) restaurar = null;
      if (r && r.tandas) {
        limite = Infinity;
        while (tandas < r.tandas && hayMas()) { const n = contar(); const ok = await cargarMas(); tandas++; if (ok !== true && contar() === n) break; }
        limite = Math.max(tope, contar());
        requestAnimationFrame(() => scrollTo(0, r.y));
      } else if (r) requestAnimationFrame(() => scrollTo(0, r.y));
      pintar();
      if (cerca()) siguiente();
    },
  };
};
