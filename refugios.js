/* refugios.html: refugios y fundaciones (beneficiarios aprobados) con banners, filtros y ruleta "¿A quién dono?".
   Los modales (detalle, donar, registro, reporte) viven en beneficiarios.js. */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const foto = (b, size = 300) => (b.imagen1 ? (window.optimizeDriveUrl || ((u) => u))(b.imagen1, size) : '');
  let todos = [], miCiudad = '';
  const fuera = (b) => !!(b.ciudad && miCiudad && b.ciudad !== miCiudad); // solo se dona a refugios de tu ciudad

  // ── Filtros: país → ciudad (opciones según los refugios que existen) + texto (nombre o propietario) ──
  const opciones = (sel, valores, todasTxt, elegido) => {
    sel.innerHTML = `<option value="">${todasTxt}</option>` + valores.map((v) => `<option${v === elegido ? ' selected' : ''}>${esc(v)}</option>`).join('');
  };
  const unicos = (lista, k) => [...new Set(lista.map((b) => b[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const pintarCiudades = (elegida) => opciones($('f-ciudad'), unicos(todos.filter((b) => !$('f-pais').value || b.pais === $('f-pais').value), 'ciudad'), 'Todas las ciudades', elegida);
  function filtrados() {
    const pais = $('f-pais').value, ciudad = $('f-ciudad').value, q = norm($('f-texto').value);
    return todos.filter((b) => (!pais || b.pais === pais) && (!ciudad || b.ciudad === ciudad) && (!q || norm(`${b.nombre} ${b.organizacion}`).includes(q)));
  }

  function tarjeta(b) {
    const f = foto(b), out = fuera(b);
    return `<div class="ref-card" data-ben-id="${esc(b.id)}">
      <div class="ref-foto">${f ? `<img src="${esc(f)}" alt="${esc(b.nombre)}" loading="lazy">` : Icon('heart-fill', { size: 32 })}</div>
      <div class="ref-info"><b>${esc(b.nombre)}</b>${b.organizacion ? `<span>${esc(b.organizacion)}</span>` : ''}
        ${b.ciudad || b.ubicacion ? `<small>${Icon('map-pin', { size: 12 })} ${esc(b.ciudad || b.ubicacion)}</small>` : ''}
        <button type="button" class="ref-btn${out ? ' fuera' : ''}" data-donar="${esc(b.id)}">${out ? `${Icon('map-pin', { size: 12 })} Fuera de tu ciudad` : `${Icon('heart-fill', { size: 12 })} Donar artículo`}</button></div></div>`;
  }
  function pintar() {
    const lista = filtrados().sort((a, b) => fuera(a) - fuera(b)); // primero los de tu ciudad
    $('ref-total').textContent = `${lista.length} ${lista.length === 1 ? 'refugio' : 'refugios'}`;
    $('ref-grid').innerHTML = lista.length ? lista.map(tarjeta).join('') : '<p class="ref-vacio">No hay refugios con estos filtros.</p>';
  }
  const donar = (b) => (fuera(b) ? window.openBeneficiarioModal?.(b.id) : window.openDonarARefugioModal?.({ id: b.id, nombre: b.nombre }));

  // ── Banners (mismo estilo que los automáticos de Comunidad) ──
  function pintarBanners(conDonados) {
    const deMiCiudad = todos.filter((b) => !fuera(b)), n = deMiCiudad.length;
    const banner = (accion, b, fotos) => window.znrBanner.html({ ...b, tema: 'claro', degradado: 'no', fotos: fotos.filter(Boolean).slice(0, 3) }, `role="listitem" data-accion="${accion}"`);
    const cont = $('com-banners');
    cont.innerHTML = [
      banner('donar', { titulo: 'Dona con', subtitulo: 'propósito', boton: 'Ver refugios', fondo: 'linear-gradient(135deg,#f97316,#ef4444)',
        descripcion: n ? `${n} ${n === 1 ? 'refugio o fundación de tu ciudad recibe' : 'refugios y fundaciones de tu ciudad reciben'} lo que dones.` : 'Lo que dones llega directo al beneficiario.' },
      [...deMiCiudad, ...todos].map((b) => foto(b))),
      banner('ruleta', { titulo: '¿A quién', subtitulo: 'dono?', boton: 'Girar la ruleta', fondo: 'linear-gradient(135deg,#0f9b8e,#3ab0e2)',
        descripcion: 'Si no sabes a quién ayudar, deja que la suerte elija por ti.' }, [...deMiCiudad].sort(() => Math.random() - 0.5).map((b) => foto(b))),
      banner('registrar', { titulo: '¿Tienes un', subtitulo: 'refugio?', boton: 'Regístralo', fondo: 'linear-gradient(135deg,#6a3093,#e0457b)',
        descripcion: 'Regístralo y recibe donaciones de tu comunidad.' }, conDonados || [])
    ].join('');
    cont.scrollLeft = 0;
    $('com-hero-wrap').hidden = false;
    window.znrBanner.rotar(cont, $('com-dots'));
  }
  // Fotos de artículos donados para el banner de registro (del snapshot del catálogo de tu ciudad; si falla, sin collage).
  const fotosDonados = () => fetch(window.urlSnapshotCatalogo ? window.urlSnapshotCatalogo(miCiudad) : 'https://znr-live-default-rtdb.firebaseio.com/catalogo/snapshot.json')
    .then((r) => r.json()).then((d) => (d?.products || []).filter((p) => p.donado === true || p.donado === 'true' || p.donado === 'TRUE').map((p) => p.imagen1)).catch(() => []);

  // ── Ruleta: recorre fotos/nombres cada vez más lento y se detiene en un refugio al azar ──
  function ruleta() {
    const base = filtrados(), pool = base.filter((b) => !fuera(b)).length ? base.filter((b) => !fuera(b)) : base;
    if (!pool.length) return window.showTemporaryMessage?.('No hay refugios con estos filtros', 'error');
    const m = Object.assign(document.createElement('div'), { className: 'ruleta-modal' });
    m.innerHTML = `<div class="ruleta-caja" role="dialog" aria-label="Ruleta de refugios"><button type="button" class="ruleta-x" aria-label="Cerrar">×</button>
      <h3>¿A quién dono?</h3><div class="ruleta-ventana"><div class="ruleta-item"></div></div><div class="ruleta-acciones"></div></div>`;
    document.body.appendChild(m);
    const item = m.querySelector('.ruleta-item'), acciones = m.querySelector('.ruleta-acciones');
    const mostrar = (b) => { const f = foto(b, 200); item.innerHTML = `<div class="ruleta-foto">${f ? `<img src="${esc(f)}" alt="">` : Icon('heart-fill', { size: 40 })}</div><b>${esc(b.nombre)}</b><span>${esc(b.organizacion || b.ciudad || '')}</span>`; };
    const cerrar = () => m.remove();
    m.onclick = (e) => { if (e.target === m || e.target.closest('.ruleta-x')) cerrar(); };
    const girar = () => {
      const ganador = pool[Math.floor(Math.random() * pool.length)];
      acciones.innerHTML = '';
      item.classList.remove('gano');
      const pasos = matchMedia('(prefers-reduced-motion: reduce)').matches || pool.length < 2 ? 0 : 22;
      let k = 0;
      const tic = () => {
        if (k >= pasos) {
          mostrar(ganador); item.classList.add('gano');
          acciones.innerHTML = `<button type="button" class="ref-btn${fuera(ganador) ? ' fuera' : ''}" data-r="donar">${fuera(ganador) ? 'Ver refugio' : `${Icon('heart-fill', { size: 12 })} Donar a este refugio`}</button>
            ${fuera(ganador) ? '' : '<button type="button" class="ruleta-sec" data-r="ver">Ver refugio</button>'}<button type="button" class="ruleta-sec" data-r="otra">Girar otra vez</button>`;
          acciones.onclick = (e) => { const r = e.target.closest('[data-r]')?.dataset.r; if (r === 'otra') girar(); else if (r) { cerrar(); r === 'ver' ? window.openBeneficiarioModal?.(ganador.id) : donar(ganador); } };
          return;
        }
        mostrar(pool[(Math.floor(Math.random() * pool.length))]);
        k++;
        setTimeout(tic, 50 + k * k * 0.9); // se va frenando (~3 s en total)
      };
      tic();
    };
    girar();
  }

  // ── Eventos ──
  document.addEventListener('click', (e) => {
    const acc = e.target.closest('[data-accion]')?.dataset.accion;
    if (acc === 'donar') return $('ref-filtros').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (acc === 'ruleta') return ruleta();
    if (acc === 'registrar') return window.openBeneficiarioRegister?.();
    const b = todos.find((x) => x.id === (e.target.closest('[data-donar]')?.dataset.donar));
    if (b) return donar(b);
    const card = e.target.closest('.ref-card');
    if (card) window.openBeneficiarioModal?.(card.dataset.benId);
  });
  $('f-pais').onchange = () => { pintarCiudades(''); pintar(); };
  $('f-ciudad').onchange = pintar;
  $('f-texto').oninput = pintar;
  $('btn-ruleta').onclick = ruleta;
  $('btn-registrar').onclick = () => window.openBeneficiarioRegister?.();

  async function iniciar() {
    window.loadCartFromStorage?.(); window.renderCart?.();
    $('close-cart-btn')?.addEventListener('click', () => { $('cart-drawer')?.classList.remove('open'); $('overlay')?.classList.remove('visible'); });
    for (let i = 0; i < 40 && !window.znrFirestore?.getBeneficiariosAprobados; i++) await new Promise((r) => setTimeout(r, 150)); // firestore-init es módulo
    try {
      const [data, ciudad] = await Promise.all([window.znrFirestore.getBeneficiariosAprobados(), obtenerCiudadComprador()]);
      if (!data?.ok) throw new Error(data?.error || 'Firestore no disponible');
      todos = data.beneficiarios || [];
      miCiudad = ciudad || '';
      // Por defecto: tu país y tu ciudad (si hay refugios ahí); si no, todos.
      const paisMio = todos.find((b) => b.ciudad === miCiudad)?.pais || '';
      opciones($('f-pais'), unicos(todos, 'pais'), 'Todos los países', paisMio);
      pintarCiudades(todos.some((b) => b.ciudad === miCiudad) ? miCiudad : '');
      pintar();
      pintarBanners();
      fotosDonados().then((f) => f.length && pintarBanners(f));
    } catch (err) {
      console.error('Error cargando refugios:', err);
      $('ref-grid').innerHTML = `<p class="ref-vacio">Error al cargar los refugios.<br><button type="button" class="ref-btn" onclick="location.reload()">${Icon('refresh')} Reintentar</button></p>`;
    }
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
})();
