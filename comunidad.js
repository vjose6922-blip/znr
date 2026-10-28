(function() {
const COMUNIDAD_CACHE_KEY = 'zr_comunidad_data';
const COMUNIDAD_CACHE_TTL_SESSION = 5 * 60 * 1000;
const COMUNIDAD_CACHE_TTL_LOCAL   = 30 * 60 * 1000;

// ── Servicios de Cloud Run que usa este archivo (modo inspector y acciones de comunidad) ──
const CATALOGO_API_URL_INSPECTOR =
  "https://catalogo-api-1038143238323.us-central1.run.app";
const AUTH_API_URL_INSPECTOR =
  "https://auth-api-1038143238323.us-central1.run.app"; // TODO: pegar la URL real tras el deploy
const VENTAS_API_URL_INSPECTOR =
  "https://ventas-api-1038143238323.us-central1.run.app"; // TODO: pegar la URL real tras el deploy
const BENEFICIARIOS_API_URL_INSPECTOR =
  "https://beneficiarios-api-1038143238323.us-central1.run.app"; // TODO: pegar la URL real tras el deploy
function _resolverApiUrlInspector(action) {
  if (['deleteComunidad', 'reportarProducto', 'calificarProducto', 'misProductosComunidad'].includes(action)) {
    return CATALOGO_API_URL_INSPECTOR;
  }
  if (action === 'verificarAdmin') return AUTH_API_URL_INSPECTOR;
  if (action === 'obtenerCalificacionesPendientes') return VENTAS_API_URL_INSPECTOR;
  if (['registrarBeneficiario', 'reportarBeneficiario', 'solicitarEdicionBeneficiario', 'obtenerBeneficiario', 'asignarDonacion', 'desasignarDonacion'].includes(action)) {
    return BENEFICIARIOS_API_URL_INSPECTOR;
  }
  throw new Error('Acción sin servicio asignado: ' + action);
}

function setComunidadCache(products) {
  const payload = JSON.stringify({ data: products, timestamp: Date.now(), version: '1.1' });
  try { sessionStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
  try { localStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
}

const CATEGORIAS_VISTAS_KEY = 'zr_categorias_vistas';
const MAX_CATEGORIAS_VISTAS = 10;
function registrarCategoriaVista(categoria) {
  if (!categoria) return;
  try {
    let hist = JSON.parse(localStorage.getItem(CATEGORIAS_VISTAS_KEY) || '[]');
    if (!Array.isArray(hist)) hist = []; // formato viejo (contador) — se descarta
    hist.push(categoria);
    if (hist.length > MAX_CATEGORIAS_VISTAS) hist = hist.slice(-MAX_CATEGORIAS_VISTAS);
    localStorage.setItem(CATEGORIAS_VISTAS_KEY, JSON.stringify(hist));
  } catch (e) {}
}
function obtenerCategoriasPreferidas() {
  try {
    const hist = JSON.parse(localStorage.getItem(CATEGORIAS_VISTAS_KEY) || '[]');
    if (!Array.isArray(hist) || !hist.length) return [];
    const conteo = {};
    hist.forEach(c => { conteo[c] = (conteo[c] || 0) + 1; });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  } catch (e) { return []; }
}
function abrirDetalleComunidad(img, id, images, productData) {
  registrarCategoriaVista(productData && productData.Categoria);
  window.openImageModal(img, id, images, productData);
}

function getComunidadCache() {
  try {

    let raw = sessionStorage.getItem(COMUNIDAD_CACHE_KEY);
    let ttl = COMUNIDAD_CACHE_TTL_SESSION;
    let store = 'session';

    if (!raw) {
      raw = localStorage.getItem(COMUNIDAD_CACHE_KEY);
      ttl = COMUNIDAD_CACHE_TTL_LOCAL;
      store = 'local';
    }
    if (!raw) return null;
    const { data, timestamp, version } = JSON.parse(raw);
    if (version !== '1.1') { localStorage.removeItem(COMUNIDAD_CACHE_KEY); return null; }
    if (Date.now() - timestamp > ttl) {
      if (store === 'session') sessionStorage.removeItem(COMUNIDAD_CACHE_KEY);
      else localStorage.removeItem(COMUNIDAD_CACHE_KEY);
      return null;
    }
    return data;
  } catch(e) { return null; }
}

function invalidateComunidadCache() {
  currentPage = 1;
  totalPagesGlobal = 1;
  allCommunityProducts = [];
  filteredProducts = [];
  communityRandomOrder = null;
  sessionStorage.removeItem(COMUNIDAD_CACHE_KEY);
  localStorage.removeItem(COMUNIDAD_CACHE_KEY);
}
'use strict';
if (typeof window.optimizeDriveUrl !== 'function') {
window.optimizeDriveUrl = function(url, size) { return url; };
console.warn(' optimizeDriveUrl no definida, usando identidad');
}
if (typeof window.formatCurrency !== 'function') {
window.formatCurrency = function(value) { return '$' + Number(value).toLocaleString(); };
console.warn(' formatCurrency no definida, usando función simple');
}
if (typeof window.escapeHtml !== 'function') {
window.escapeHtml = function(str) {
if (!str) return '';
return String(str).replace(/[&<>]/g, function(m) {
if (m === '&') return '&amp;';
if (m === '<') return '&lt;';
if (m === '>') return '&gt;';
return m;
});
};
console.warn(' escapeHtml no definida, usando función simple');
}
if (typeof window.addToCart !== 'function') {
window.addToCart = function(product) { console.warn('addToCart no definida', product); };
console.warn(' addToCart no definida');
}
if (typeof window.openImageModal !== 'function') {
window.openImageModal = function(url, id, images, productData) { console.warn('openImageModal no definida', url); };
console.warn(' openImageModal no definida');
}
if (typeof window.showTemporaryMessage !== 'function') {
window.showTemporaryMessage = function() {};
console.warn(' showTemporaryMessage no definida');
}
const PAGE_SIZE = 30;             // productos por página (con 3 carruseles intercalados en la 1ª)
let allCommunityProducts = [];    // productos de
let filteredProducts = [];        // alias de allComm000
let currentPage = 1;              // página actual
let totalPagesGlobal = 1;         // total de páginas devuelto por el backend
// "Ver más" de un carrusel: funciona como un filtro más (reemplaza el listado por todo ese grupo)
let vistaActiva = '';             // '' | 'ofertas' | 'recomendado' | 'temporada'
let vistaCache = null;            // { vista, lista } para que la paginación no cambie al reordenar
let carruselesPintados = false;   // true cuando los carruseles ya se dibujaron (vista por defecto o entrada directa a un "Ver más")
const VISTA_LABELS = { ofertas: 'Ofertas destacadas', recomendado: 'Recomendado para ti', temporada: 'Podría interesarte' };
let currentFilters = {};          // filtros activos (para mantenerlos al cambia00000
let isLoading = false;
let gridContainer, catSelect, vendorSelect, temporadaSelect, paginationDiv;
let hasLoadedOnce = false; 
let debounceTimer = null;
let inspectorMode = false;
let initialHashHandledComunidad = false;
let comunidadFilterOptionsLoaded = false; 
let communityRandomOrder = null; 
async function initInspectorMode() {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('inspector') !== '1') return;

// El token viaja en el fragmento (#token=...), que el navegador no envía al servidor ni en el Referer.
// Se acepta también ?token= por compatibilidad con enlaces viejos.
const tokenFromUrl = new URLSearchParams(location.hash.slice(1)).get('token') || urlParams.get('token') || '';
const token = tokenFromUrl || sessionStorage.getItem('admin_token') || '';
if (!token) {
return;
}
if (tokenFromUrl) {
sessionStorage.setItem('admin_token', tokenFromUrl);

const cleanUrl = new URL(window.location.href);
cleanUrl.searchParams.delete('token');
cleanUrl.hash = '';
history.replaceState(null, '', cleanUrl.toString());
}
try {
const api = _resolverApiUrlInspector('verificarAdmin');
// POST: el token va en el body y no en la URL (auth-api acepta verificarAdmin por POST).
const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "verificarAdmin", token }).toString() });
const data = await res.json();
if (data.ok === true) {
inspectorMode = true;
const banner = document.createElement('div');
banner.id = 'inspector-banner';
banner.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
background: linear-gradient(90deg, #3b1f5f, #7c3aed);
color: white; text-align: center; padding: 8px 16px;
font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
box-shadow: 0 2px 10px rgba(0,0,0,0.3);
`;
banner.innerHTML = ' MODO ADMIN';
document.body.prepend(banner);
const header = document.querySelector('.app-header');
if (header) header.style.marginTop = '38px';
} else {
console.warn(' Token de admin inválido, modo inspector desactivado');
}
} catch (err) {
console.error('Error verificando admin:', err);
}
}
function getFiltersFromURL() {
const urlParams = new URLSearchParams(window.location.search);
return {
busqueda: urlParams.get('busqueda') || '',
categoria: urlParams.get('categoria') || '',
vendedor: urlParams.get('vendedor') || '',
temporada: urlParams.get('temporada') || '',
vista: VISTA_LABELS[urlParams.get('vista')] ? urlParams.get('vista') : '',
orden: urlParams.get('orden') || ''
};
}
function updateURLWithFilters() {
const searchTerm = getSearchValue();
const category = catSelect ? catSelect.value : '';
const vendor = vendorSelect ? vendorSelect.value : '';
const temporada = temporadaSelect ? temporadaSelect.value : '';
const ordenEl = document.getElementById('comunidad-orden');
const orden = ordenEl ? ordenEl.value : '';
const params = new URLSearchParams();
if (new URLSearchParams(window.location.search).get('inspector') === '1') {
params.set('inspector', '1');
}
if (searchTerm) params.set('busqueda', searchTerm);
if (category) params.set('categoria', category);
if (vendor) params.set('vendedor', vendor);
if (temporada) params.set('temporada', temporada);
if (vistaActiva) params.set('vista', vistaActiva);
if (orden) params.set('orden', orden);
const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
window.history.replaceState({}, '', newURL);
}
function getSearchValue() {
const input = document.getElementById('comunidad-search');
return input ? input.value.trim().toLowerCase() : '';
}
function safeString(value) {
return (value != null) ? String(value) : '';
}

function showSkeletonComunidad(container, count = 6) {
const cards = Array.from({length: count}, () => `
<div class="skeleton-product-card">
<div class="sk-img shimmer"></div>
<div class="sk-body">
<div class="sk-line sk-title shimmer"></div>
<div class="sk-line sk-price shimmer"></div>
<div class="sk-line sk-badge shimmer"></div>
</div>
</div>`).join('');
container.innerHTML = cards;
}

// ── URL del listado del modo inspector (admin) ──────────────────────────────
// catalogo-api: lista completa hasta 200, sin filtros de servidor (se pagina/ordena localmente).
function buildComunidadUrl() {
  const token = sessionStorage.getItem('admin_token') || '';
  return CATALOGO_API_URL_INSPECTOR + '?' + new URLSearchParams({ action: 'listarTodoComunidad', token }).toString();
}

// ── Si la carga falla: usa la caché si existe; si no, muestra el error con botón de reintentar ──
function mostrarErrorCargaComunidad(err) {
  // Si falla y hay caché, la usamos como respaldo
  const cached = getComunidadCache();
  if (cached && cached.length > 0 && allCommunityProducts.length === 0) {
    allCommunityProducts = cached;
    filteredProducts     = [...cached];
    renderProducts();
    if (typeof window.showTemporaryMessage === 'function') {
      window.showTemporaryMessage('Mostrando datos guardados — sin conexión', 'info');
    }
  } else if (allCommunityProducts.length === 0 && gridContainer) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">
      Error al cargar productos de la comunidad.<br>
      <small style="color:var(--color-text-muted,#888);font-size:11px;">${err.message || ''}</small><br>
      <button onclick="loadComunidadPage(1,{})" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:var(--color-accent-solid); color:white; cursor:pointer; font-weight:600;"  >${Icon('refresh')} Reintentar</button>
    </div>`;
  }
}

// ── Carga y renderiza una página de productos en modo inspector (admin, vía catalogo-api) ──
async function loadComunidadPageInspector(page, filters, opts = {}) {
  if (isLoading && !opts.force) return;
  isLoading = true;

  // isFirstLoad: solo true la primera vez que se carga la página (no en cada cambio de filtro,
  // que también llega con isPageChange:false). Antes esto hacía que CUALQUIER cambio de filtro
  // pintara primero el catálogo completo en caché antes de la respuesta real filtrada.
  const isFirstLoad = !hasLoadedOnce;

  // En la primera carga mostramos caché mientras llega la red
  if (isFirstLoad && !opts.force) {
    const cached = getComunidadCache();
    if (cached && cached.length > 0) {
      allCommunityProducts = cached;
      filteredProducts     = [...cached];
      totalPagesGlobal     = 1; // caché no tiene meta, asumimos 1 página
      currentPage          = 1;
      renderProducts();
      if (typeof window.hideLoader === 'function') window.hideLoader();
    } else {
      if (gridContainer) showSkeletonComunidad(gridContainer, 6);
      if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
    }
  } else if (opts.isPageChange) {
    if (gridContainer) showSkeletonComunidad(gridContainer, PAGE_SIZE);
  }

  try {
    // Si ya tenemos el orden aleatorio armado en esta sesión (por Algolia o
    // por una carga previa), solo paginamos en memoria, sin red.
    if (esVistaComunidadPorDefecto(filters) && communityRandomOrder && !opts.force) {
      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
      filteredProducts     = [...allCommunityProducts];
      window.allCommunityProductsIndexed = allCommunityProducts;
      renderProducts();
      handleInitialHashComunidad();
      isLoading = false;
      hasLoadedOnce = true;
      if (typeof window.hideLoader === 'function') window.hideLoader();
      return;
    }

    const url = buildComunidadUrl();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    if (inspectorMode) data.fullSet = true; // listarTodoComunidad no pagina en servidor

    if (data.fullSet) {
      communityRandomOrder = data.products || [];
      window.communityRandomOrder = communityRandomOrder;
      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
    } else {
      currentPage      = data.page      || page;
      totalPagesGlobal = data.totalPages || 1;
      allCommunityProducts = data.products || [];
    }
    filteredProducts     = [...allCommunityProducts];
    window.allCommunityProductsIndexed = allCommunityProducts;

    // Poblar dropdowns de filtros solo en la primera carga (el backend los manda en page=1)
    if (data.filterOptions) {
      populateFiltersFromOptions(data.filterOptions);
    }

    // Cachear solo la primera página sin filtros (igual que en script.js)
    if (page === 1 && !filters.categoria && !filters.busqueda && !filters.vendedor && !filters.temporada && !filters.orden) {
      setComunidadCache(allCommunityProducts);
    }

    // En modo inspector el servidor no ordena (calificación/precio): reordenamos
    // localmente lo que llegó (no es un orden global, pero evita que el select
    // quede sin efecto).
    aplicarOrdenLocal(filters.orden);

    renderProducts();
    handleInitialHashComunidad();

  } catch (err) {
    console.error('Error loadComunidadPageInspector:', err);
    if (window.ZRMonitor) ZRMonitor.report('CRÍTICO','comunidad.js','loadComunidadPageInspector', err.message || String(err));
    mostrarErrorCargaComunidad(err);
  } finally {
    isLoading = false;
    hasLoadedOnce = true;
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}

// ── Carga las opciones de los selects UNA sola vez, sin filtros aplicados ──
// (si se piden junto con un filtro activo, Algolia solo devuelve el valor ya seleccionado)
async function loadComunidadFilterOptionsAlgolia() {
  if (comunidadFilterOptionsLoaded || !window.algoliaIndex) return;
  try {
    // Traemos hits (no solo facets) para poder mapear vendedor_uid -> vendedor_nombre.
    // Antes se armaba el <select> de vendedores con el facet "vendedor_nombre" como value,
    // pero el filtro de búsqueda filtra por "vendedor_uid" (ver loadComunidadPageAlgolia).
    // Ese desajuste hacía que Algolia no encontrara resultados al elegir un vendedor.
    const r = await window.algoliaIndex.search('', {
      hitsPerPage: 1000,
      attributesToRetrieve: ['vendedor_uid', 'vendedor_nombre'],
      facets: ['categoria']
    });

    const categories = Object.keys((r.facets && r.facets.categoria) || {}).sort();

    const vendorMap = new Map();
    (r.hits || []).forEach(hit => {
      if (hit.vendedor_uid && !vendorMap.has(hit.vendedor_uid)) {
        vendorMap.set(hit.vendedor_uid, hit.vendedor_nombre || hit.vendedor_uid);
      }
    });
    const vendors = Array.from(vendorMap, ([uid, nombre]) => ({ uid, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    populateFiltersFromOptions({ categories, vendors });
    comunidadFilterOptionsLoaded = true;
  } catch (err) {
    console.error('Error cargando opciones de filtro (Algolia):', err);
  }
}

// ── Réplicas de Algolia para el select "Ordenar por" ──────────────────────
// IMPORTANTE: estas réplicas deben existir en el dashboard de Algolia
// (índice znr_comunidad → pestaña Replicas). Mientras no existan, el catch
// de abajo hace que se use el índice normal sin romper nada.
const ALGOLIA_INDEX_BASE = 'znr_comunidad';
const ALGOLIA_REPLICAS = {
  calificacion: 'znr_comunidad_calificacion_desc',
  precio_asc:   'znr_comunidad_precio_asc'
};
let algoliaClientRef = null; // se detecta la primera vez que se usa
const algoliaReplicaCache = {};
function getAlgoliaIndexForOrden(orden) {
  const replicaName = ALGOLIA_REPLICAS[orden];
  if (!replicaName) return window.algoliaIndex; // 'verificados' o sin orden: índice normal + filtro
  if (algoliaReplicaCache[replicaName]) return algoliaReplicaCache[replicaName];
  try {
    if (!algoliaClientRef) {
      // window.algoliaIndex.client existe en algoliasearch-lite v4
      algoliaClientRef = window.algoliaIndex && window.algoliaIndex.client;
    }
    if (!algoliaClientRef) return window.algoliaIndex;
    const idx = algoliaClientRef.initIndex(replicaName);
    algoliaReplicaCache[replicaName] = idx;
    return idx;
  } catch (e) {
    console.warn('Réplica de Algolia no disponible (' + replicaName + '), usando índice normal:', e);
    return window.algoliaIndex;
  }
}

// ── Orden local de respaldo (modo inspector / sin réplicas de Algolia) ────
// Solo reordena lo que ya está cargado en memoria, NO es un orden global
// del catálogo completo. Se usa como respaldo cuando el orden real (Algolia
// replica o backend) no está disponible.
function aplicarOrdenLocal(orden) {
  if (!orden || orden === 'verificados' || !Array.isArray(filteredProducts)) return;
  if (orden === 'precio_asc') {
    filteredProducts.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  } else if (orden === 'calificacion') {
    filteredProducts.sort((a, b) => (Number(b.vendedor_calificacion) || 0) - (Number(a.vendedor_calificacion) || 0));
  }
  allCommunityProducts = filteredProducts;
}

// ── Vista por defecto = sin ningún filtro activo (ahí aplica el orden
// aleatorio con la página 1 reservada a verificados + ZNR) ────────────────
// Carga (una sola vez) el catálogo de la ciudad del comprador que usan la vista por defecto,
// los carruseles y las vistas "Ver más".
async function asegurarCatalogoBase() {
  if (communityRandomOrder) return communityRandomOrder;
        const miCiudad = await obtenerCiudadComprador();
        const snapshot = await intentarCatalogoDesdeSnapshot(miCiudad);
        if (snapshot) {
          communityRandomOrder = window.ordenarCatalogoComunidad ? window.ordenarCatalogoComunidad(snapshot.products) : snapshot.products;
          if (snapshot.filterOptions) {
            populateFiltersFromOptions(snapshot.filterOptions);
            comunidadFilterOptionsLoaded = true;
          }
        } else {
          // Sin snapshot fresco: camino original, vía Algolia.
          loadComunidadFilterOptionsAlgolia();
          const searchResult = await window.algoliaIndex.search('', {
            hitsPerPage: 300,
            facets: ['categoria', 'vendedor_nombre']
          });
          communityRandomOrder = construirOrdenAleatorioComunidad(searchResult.hits || []);
        }
        // Filtra al catálogo de la ciudad del comprador (el feed de ciudad ya viene filtrado).
        communityRandomOrder = communityRandomOrder.filter((p) => p.ciudad === miCiudad);
        window.communityRandomOrder = communityRandomOrder;
  return communityRandomOrder;
}

function esVistaComunidadPorDefecto(filters) {
  return !filters.vista && !filters.categoria && !filters.busqueda && !filters.vendedor && !filters.temporada && !filters.orden;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Arma el orden completo de la vista por defecto: página 1 = solo verificados
// (plan 'plus') + productos ZNR, mezclados al azar; el resto se mezcla después
// sin repetir nada de la página 1. Se calcula UNA sola vez por sesión.
function construirOrdenAleatorioComunidad(hits) {
  const esVerificadoOZNR = p => p.es_znr === true || p.vendedor_plan === 'plus';
  const verificados = shuffleArray(hits.filter(esVerificadoOZNR));
  const pagina1 = verificados.slice(0, PAGE_SIZE);
  const pagina1Ids = new Set(pagina1.map(p => String(p.id)));
  const resto = shuffleArray(hits.filter(p => !pagina1Ids.has(String(p.id))));
  return pagina1.concat(resto);
}

// ── Snapshot estático del catálogo (RTDB) ──────────────────────────────────
// Se refresca periódicamente desde el backend (catalogo-api). Es un GET REST corto a
// Firebase, no una conexión persistente — no compite con el límite de 100
// conexiones simultáneas de los lives. El objetivo es que la vista por
// defecto de Comunidad (la de MÁS tráfico: cualquier visitante que entra
// sin buscar ni filtrar) no gaste una búsqueda de Algolia por sesión.


const CATALOGO_SNAPSHOT_URL = 'https://znr-live-default-rtdb.firebaseio.com/catalogo/snapshot.json';
const CATALOGO_SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000; // 2x el refresh (5 min); más viejo = el trigger probablemente murió

async function intentarCatalogoDesdeSnapshot(ciudad) {
  // Primero el feed de la ciudad del comprador; si no existe, el global (se filtra por ciudad después).
  for (const url of [window.urlSnapshotCatalogo ? window.urlSnapshotCatalogo(ciudad) : CATALOGO_SNAPSHOT_URL, CATALOGO_SNAPSHOT_URL]) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.products) || !data.products.length) continue;
      if (!data.generadoEn || (Date.now() - data.generadoEn) > CATALOGO_SNAPSHOT_MAX_AGE_MS) {
        console.warn('Snapshot de catálogo desactualizado o sin generadoEn, usando Algolia');
        return null;
      }
      return data;
    } catch (err) {
      // Silencioso a propósito: cualquier falla (CSP, red, RTDB caído) sigue con el siguiente
      // origen y, al final, cae al camino de Algolia sin romper la carga.
    }
  }
  return null;
}

// ── Carga y renderiza una página de productos vía Algolia (público, rápido) ──
async function loadComunidadPageAlgolia(page, filters, opts = {}) {
  if (isLoading && !opts.force) return;
  isLoading = true;

  // isFirstLoad: solo true la primera vez que se carga la página (no en cada cambio de filtro).
  const isFirstLoad = !hasLoadedOnce;
  // Stock en vivo antes de pintar (también la caché): lo agotado se oculta al instante.
  if (isFirstLoad && window.cargarStockVivo) await window.cargarStockVivo(await obtenerCiudadComprador());

  if (isFirstLoad && !opts.force) {
    const cached = getComunidadCache();
    if (cached && cached.length > 0) {
      allCommunityProducts = cached;
      filteredProducts     = [...cached];
      totalPagesGlobal     = 1;
      currentPage          = 1;
      renderProducts();
      if (typeof window.hideLoader === 'function') window.hideLoader();
    } else {
      if (gridContainer) showSkeletonComunidad(gridContainer, 6);
      if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
    }
  } else if (opts.isPageChange) {
    if (gridContainer) showSkeletonComunidad(gridContainer, PAGE_SIZE);
  }

  try {
    if (!window.algoliaIndex) throw new Error('Algolia no está configurado');

    if (esVistaComunidadPorDefecto(filters)) {
      // ── Vista por defecto: se trae un lote grande UNA sola vez y se pagina
      // en memoria (así la página 1 queda reservada a verificados+ZNR y el
      // resto se mantiene fijo mientras el usuario navega de página) ──────
      await asegurarCatalogoBase();

      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
      filteredProducts     = [...allCommunityProducts];
      window.allCommunityProductsIndexed = allCommunityProducts;

      if (page === 1) { setComunidadCache(allCommunityProducts); renderCarruseles(communityRandomOrder); }

    } else {
      // ── Con filtros/búsqueda/orden activos: paginado normal vía Algolia ──
      // Las opciones del select se cargan aparte y solo una vez, así siempre
      // muestran TODAS las categorías/vendedores, no solo las del filtro activo.
      loadComunidadFilterOptionsAlgolia();

      // La vista por defecto SÍ filtraba por ciudad (línea ~566), pero este
      // camino (con categoría/búsqueda/orden activos) armaba el filtro de
      // Algolia sin incluir ciudad — por eso se colaban productos de otras
      // ciudades en cuanto se usaba cualquier filtro.
      const miCiudad = await obtenerCiudadComprador();
      const filterParts = [];
      if (miCiudad) filterParts.push('ciudad:"' + String(miCiudad).replace(/"/g, '') + '"');
      if (filters.categoria) filterParts.push('categoria:"' + String(filters.categoria).replace(/"/g, '') + '"');
      if (filters.vendedor)  filterParts.push('vendedor_uid:"' + String(filters.vendedor).replace(/"/g, '') + '"');
      if (filters.temporada) filterParts.push('temporada:"' + String(filters.temporada).replace(/"/g, '') + '"');
      if (filters.orden === 'verificados') filterParts.push('vendedor_plan:"plus"');
      const filterString = filterParts.join(' AND ');

      const targetIndex = getAlgoliaIndexForOrden(filters.orden);
      let searchResult;
      try {
        searchResult = await targetIndex.search(filters.busqueda || '', {
          filters: filterString,
          hitsPerPage: PAGE_SIZE,
          page: Math.max(0, page - 1),
          facets: ['categoria', 'vendedor_nombre']
        });
      } catch (replicaErr) {
        if (targetIndex !== window.algoliaIndex) {
          console.warn('Réplica de Algolia no encontrada, usando índice base + orden local:', replicaErr);
          searchResult = await window.algoliaIndex.search(filters.busqueda || '', {
            filters: filterString,
            hitsPerPage: PAGE_SIZE,
            page: Math.max(0, page - 1),
            facets: ['categoria', 'vendedor_nombre']
          });
        } else {
          throw replicaErr;
        }
      }

      currentPage      = page;
      totalPagesGlobal = searchResult.nbPages || 1;
      allCommunityProducts = searchResult.hits || [];
      filteredProducts     = [...allCommunityProducts];
      aplicarOrdenLocal(filters.orden);
      window.allCommunityProductsIndexed = allCommunityProducts;
    }

    renderProducts();
    handleInitialHashComunidad();

  } catch (err) {
    console.error('Error loadComunidadPageAlgolia:', err);
    if (window.ZRMonitor) ZRMonitor.report('ERROR','comunidad.js','loadComunidadPageAlgolia', err.message || String(err));
    // Si Algolia falla: caché local si hay, o mensaje de error con botón de reintentar.
    mostrarErrorCargaComunidad(err);
  } finally {
    isLoading = false;
    hasLoadedOnce = true;
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}

// ── Punto de entrada: decide si usar Algolia (público) o catalogo-api (modo inspector/admin) ──
async function loadComunidadPage(page, filters, opts = {}) {
  if (filters && filters.vista) return cargarVistaComunidad(page, filters);
  // El modo inspector necesita ver productos pendientes también, que no viven en Algolia
  if (inspectorMode) {
    return loadComunidadPageInspector(page, filters, opts);
  }
  return loadComunidadPageAlgolia(page, filters, opts);
}

// Alias para compatibilidad con llamadas existentes (ej: botón reintentar)
function loadCommunityProducts() {
  const urlFilters = getFiltersFromURL();
  // Aplicar filtros URL a los inputs si existen
  if (urlFilters.busqueda) {
    const el = document.getElementById('comunidad-search');
    if (el) el.value = urlFilters.busqueda;
  }
  if (urlFilters.orden) {
    const el = document.getElementById('comunidad-orden');
    if (el) el.value = urlFilters.orden;
  }
  vistaActiva = urlFilters.vista || '';
  currentFilters = urlFilters;
  updateComunidadChips(urlFilters);
  return loadComunidadPage(1, urlFilters);
}

// Pobla los dropdowns con las opciones que devuelve el backend en page=1
function populateFiltersFromOptions(filterOptions) {
  if (catSelect && filterOptions.categories) {
    const currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="">Todas las categorías</option>';
    filterOptions.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    if (currentVal) catSelect.value = currentVal;
  }
  if (vendorSelect && filterOptions.vendors) {
    const currentVal = vendorSelect.value;
    vendorSelect.innerHTML = '<option value="">Todos los vendedores</option>';
    filterOptions.vendors.forEach(v => {
      const opt = document.createElement('option');
      // Soporta objetos {uid, nombre} (Algolia) y strings sueltos
      if (v && typeof v === 'object') { opt.value = v.uid; opt.textContent = v.nombre; }
      else { opt.value = v; opt.textContent = v; }
      vendorSelect.appendChild(opt);
    });
    if (currentVal) vendorSelect.value = currentVal;
  }
}


// Recolecta los filtros de los inputs y dispara una nueva petición al backend (página 1)
function applyFilters() {
  try {
    const busqueda  = getSearchValue();
    const categoria = catSelect    ? catSelect.value    : '';
    const vendedor  = vendorSelect ? vendorSelect.value : '';
    const temporada = temporadaSelect ? temporadaSelect.value : '';
    const ordenEl   = document.getElementById('comunidad-orden');
    const orden     = ordenEl ? ordenEl.value : '';
    const filters = { busqueda, categoria, vendedor, temporada, vista: vistaActiva, orden };
    // Eliminar vacíos
    Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });
    currentFilters = filters;
    updateComunidadChips(filters);
    loadComunidadPage(1, filters, { isPageChange: false });
    updateURLWithFilters();
  } catch (err) {
    console.error('Error en applyFilters:', err);
  }
}

// ── Chips de filtros activos (mismo patrón visual que catálogo) ──────────
// Panel de filtros (bottom sheet en móvil): los selects viven dentro del panel, así que
// el resto de la lógica (ids, eventos, URL) no cambia.
function initFiltrosSheet() {
  const sheet = document.getElementById('comunidad-filtros-sheet');
  const btn = document.getElementById('btn-abrir-filtros');
  if (!sheet || !btn) return;
  document.body.appendChild(sheet); // fuera de contenedores con transform, para que position:fixed funcione
  const abrir = () => {
    sheet.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => sheet.querySelector('.znr-sel-btn')?.focus(), 60);
  };
  const cerrar = () => {
    sheet.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    btn.focus();
  };
  btn.addEventListener('click', abrir);
  sheet.querySelectorAll('[data-cerrar-filtros]').forEach(el => el.addEventListener('click', cerrar));
  document.getElementById('filtros-aplicar')?.addEventListener('click', cerrar);
  document.getElementById('filtros-limpiar')?.addEventListener('click', () => {
    ['comunidad-cat', 'comunidad-vendor', 'comunidad-temporada', 'comunidad-orden'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    applyFilters();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('open')) cerrar(); });
}


function actualizarBadgeFiltros(filters) {
  const badge = document.getElementById('filtros-badge');
  if (!badge) return;
  const n = ['categoria', 'vendedor', 'temporada', 'orden'].filter(k => filters && filters[k]).length;
  badge.textContent = String(n);
  badge.style.display = n ? 'inline-flex' : 'none';
}

function updateComunidadChips(filters) {
  actualizarBadgeFiltros(filters);
  const bar = document.getElementById('comunidad-filter-chips');
  if (!bar) return;
  const ordenLabels = {
    verificados:  `${Icon('check')} Verificados`,
    calificacion: `${Icon('star')} Mejor calificado`,
    precio_asc:   `${Icon('dollar')} Menor a mayor precio`
  };
  const chips = [];
  if (filters.vista)     chips.push({ label: `${VISTA_LABELS[filters.vista] || filters.vista}`, clear: () => { vistaActiva = ''; vistaCache = null; applyFilters(); } });
  if (filters.busqueda)  chips.push({ label: `${Icon('search')} "${filters.busqueda}"`, clear: () => { const el = document.getElementById('comunidad-search'); if (el) el.value = ''; applyFilters(); } });
  if (filters.categoria) chips.push({ label: `${filters.categoria}`, clear: () => { if (catSelect) catSelect.value = ''; applyFilters(); } });
  if (filters.vendedor)  chips.push({ label: `${vendorSelect && vendorSelect.selectedOptions[0] ? vendorSelect.selectedOptions[0].textContent : 'Vendedor'}`, clear: () => { if (vendorSelect) vendorSelect.value = ''; applyFilters(); } });
  if (filters.temporada) chips.push({ label: `${filters.temporada}`, clear: () => { if (temporadaSelect) temporadaSelect.value = ''; applyFilters(); } });
  if (filters.orden)     chips.push({ label: ordenLabels[filters.orden] || filters.orden, clear: () => { const el = document.getElementById('comunidad-orden'); if (el) el.value = ''; applyFilters(); } });

  if (!chips.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = 'flex';
  bar.innerHTML = chips.map((c, i) =>
    `<button class="filter-chip" data-chip="${i}">${c.label} <span class="chip-x"></span></button>`
  ).join('') + (chips.length > 1
    ? `<button class="filter-chip filter-chip-clear" data-chip="all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Limpiar todo</button>`
    : '');
  bar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.chip;
      if (idx === 'all') {
        ['comunidad-cat','comunidad-vendor','comunidad-temporada','comunidad-orden'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        const si = document.getElementById('comunidad-search'); if (si) si.value = '';
        vistaActiva = ''; vistaCache = null;
        applyFilters();
      } else {
        chips[Number(idx)].clear();
      }
    });
  });
}
// ── Carrusel de ofertas: productos con precio_original > precio, top 10 por % de descuento ──
function crearMiniCardComunidad(p, badgeHtml) {
  const esc = window.escapeHtml || (s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const fmtCurr = window.formatCurrency || (v => '$' + Number(v).toLocaleString('es-MX'));
  const original = Number(p.precio_original) || 0;
  const tieneDescuento = original > (Number(p.precio) || 0);
  const img = (p.imagen1 && p.imagen1.trim()) ? p.imagen1 : 'placeholder.svg';
  const mini = document.createElement('div');
  mini.className = 'product-card';
  mini.style.cssText = 'min-width:130px;max-width:130px;cursor:pointer;';
  mini.innerHTML = `
    <div style="width:100%;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--color-surface-2,#f5f5f8);position:relative;">
      <img src="${esc(img)}" alt="${esc(safeString(p.nombre))}" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;background:var(--color-surface-2,#f5f5f8);" onerror="window.znrLoadImgWithRetry(this)">
      ${badgeHtml || ''}
    </div>
    <div style="padding:6px 2px 0;">
      <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(safeString(p.nombre))}</div>
      ${tieneDescuento ? `<div style="font-size:11px;color:var(--color-text-muted,#888);text-decoration:line-through;">${fmtCurr(original)}</div>` : ''}
      <div style="font-size:15px;font-weight:800;">${p.tipoVenta === 'personalizado' ? '<span style="font-size:10px;font-weight:600;opacity:.7;">Desde </span>' : ''}${fmtCurr(p.precio)}</div>
    </div>`;
  mini.onclick = () => {
    if (!window.openImageModal) return;
    const allImages = [p.imagen1, p.imagen2, p.imagen3].filter(Boolean);
    abrirDetalleComunidad(img, p.id, allImages, {
      ID: p.id, Nombre: p.nombre || '', Precio: p.precio || 0, Categoria: p.categoria || '',
      Talla: p.talla || '', Descripcion: p.descripcion || '',
      Stock: p.tipoVenta === 'personalizado' ? -1 : (stockVivo(p) !== undefined ? Number(stockVivo(p)) : -1),
      TipoVenta: p.tipoVenta || 'stock', TiempoElaboracionDias: Number(p.tiempoElaboracionDias) || 0,
      OpcionesPersonalizacion: p.opcionesPersonalizacion || '',
      temporada: p.temporada || '', multicolor: p.multicolor === true || p.multicolor === 'true',
      Badge: p.badge || '', Imagen1: p.imagen1 || '', Imagen2: p.imagen2 || '', Imagen3: p.imagen3 || '',
      _comunidad: true, _vendedorNombre: p.vendedor_nombre || '', _vendedorUid: p.vendedor_uid || '',
      _vendedorLogo: p.vendedor_logo || '', _vendedorPlan: p.vendedor_plan || '',
      _donado: !!p.donado, _beneficiarioId: p.beneficiario_id || '',
      precio_original: p.precio_original || 0, _montoMinimoEnvio: p.vendedor_monto_minimo_envio || 0,
    });
  };
  return mini;
}

// ── Carruseles en bucle ──────────────────────────────────────────────────
// En vez de regresar al inicio al llegar al final, el contenido se repite (3 copias) y cuando el scroll
// sale de la copia central se reacomoda exactamente un "ancho de copia": da la ilusión de que nunca termina.
// `factory` crea copias nuevas de las tarjetas (con sus eventos); sin factory se clonan los nodos.
function quitarClonesCarrusel(track) {
  track.querySelectorAll('[data-clone="1"]').forEach(n => n.remove());
  track.dataset.loopW = '';
}

function prepararLoopCarrusel(track) {
  if (!track) return false;
  quitarClonesCarrusel(track);
  const orig = [...track.children].filter(n => getComputedStyle(n).display !== 'none');
  if (orig.length < 2 || !track.clientWidth) return false;
  if (track.scrollWidth <= track.clientWidth + 4) return false; // cabe completo: no hace falta bucle
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  const r0 = orig[0].getBoundingClientRect();
  const r1 = orig[orig.length - 1].getBoundingClientRect();
  const setW = r1.right - r0.left + gap;
  for (let k = 0; k < 2; k++) {
    const copias = track._factory ? track._factory() : orig.map(n => n.cloneNode(true));
    copias.forEach(c => { c.dataset.clone = '1'; c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
  }
  track.dataset.loopW = String(setW);
  track.scrollLeft = setW; // empieza en la copia central
  return true;
}

function ajustarLoopCarrusel(track) {
  const w = parseFloat(track.dataset.loopW);
  if (!w) return;
  if (track.scrollLeft >= 2 * w) track.scrollLeft -= w;
  else if (track.scrollLeft < w) track.scrollLeft += w;
}

function activarLoopCarrusel(track, factory) {
  if (!track) return;
  track._factory = factory || null;
  track._lastCW = 0;
  prepararLoopCarrusel(track);
  if (track._loopListo) return;
  track._loopListo = true;
  track.addEventListener('scroll', () => ajustarLoopCarrusel(track), { passive: true });
  // Si el carrusel estaba oculto o cambia de ancho (fila compartida, rotar el teléfono), se prepara de nuevo.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      const cw = track.clientWidth;
      if (!cw || track._lastCW === cw) return;
      track._lastCW = cw;
      prepararLoopCarrusel(track);
    }).observe(track);
  }
}

// ── Auto-scroll suave para carruseles horizontales; se pausa unos segundos si el usuario interactúa ──
function iniciarAutoScrollCarrusel(track) {
  if (!track || track.dataset.autoScroll === '1') return;
  track.dataset.autoScroll = '1';
  let pausadoHasta = 0;
  const pausar = () => { pausadoHasta = Date.now() + 3000; track.style.scrollSnapType = ''; };
  track.addEventListener('pointerdown', pausar, { passive: true });
  track.addEventListener('touchstart', pausar, { passive: true });
  track.addEventListener('wheel', pausar, { passive: true });
  setInterval(() => {
    if (Date.now() < pausadoHasta) return;
    if (track.style.scrollSnapType !== 'none') track.style.scrollSnapType = 'none';
    if (parseFloat(track.dataset.loopW)) {       // bucle: avanza y se reacomoda sin saltos visibles
      track.scrollLeft += 0.6;
      ajustarLoopCarrusel(track);
      return;
    }
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 1) return;
    track.scrollLeft += 0.6;
    if (track.scrollLeft >= maxScroll) track.scrollLeft = 0;
  }, 30);
}

// Banner (como el hero de index): una tarjeta a la vez, swipe nativo y avance cada 6 s. Se recalcula cuando cambia qué tiles se ven.
function actualizarLoopBanner() {
  const t = document.querySelector('.com-tiles');
  if (!t) return;
  clearTimeout(t._loopTimer);
  t._loopTimer = setTimeout(() => {
    const dots = document.getElementById('com-dots');
    const visibles = () => [...t.children].filter(n => getComputedStyle(n).display !== 'none');
    const indice = () => Math.round(t.scrollLeft / (t.clientWidth || 1)) || 0;
    const marcar = () => {
      if (!dots) return;
      const i = indice();
      dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
    };
    const n = visibles().length;
    if (dots) dots.innerHTML = n > 1 ? '<i></i>'.repeat(n) : '';
    marcar();
    if (t._bannerListo) return; // listeners y temporizador solo una vez
    t._bannerListo = true;
    let raf, quieto = 0, enPantalla = true;
    t.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(marcar); }, { passive: true });
    ['pointerdown', 'wheel'].forEach(ev => t.addEventListener(ev, () => { quieto = Date.now() + 8000; }, { passive: true }));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(e => { enPantalla = e[0].isIntersecting; }).observe(t);
    setInterval(() => {
      if (!enPantalla || document.hidden || Date.now() < quieto) return;
      const total = visibles().length;
      if (total < 2) return;
      t.scrollTo({ left: ((indice() + 1) % total) * t.clientWidth, behavior: 'smooth' });
    }, 6000);
  }, 0);
}

// ── Banners de temporada: los sube el Master en CONTROL (imagen sin texto + texto encima + fechas) ──
let bannerTemporadas = [], bannersVigentes = [];
async function cargarBannersTemporada() {
  const todos = await fetch('https://znr-live-default-rtdb.firebaseio.com/banners_temporada.json').then(r => r.json()).catch(() => null);
  const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  bannersVigentes = Object.values(todos || {}).filter(b => b.inicio <= hoy && hoy <= b.fin).sort((a, b) => a.fin.localeCompare(b.fin));
  bannerTemporadas = [...new Set(bannersVigentes.map(b => b.temporada).filter(Boolean))];
  if (carruselesPintados && bannerTemporadas.length) { vistaCache = null; renderCarrusel('temporada', calcularTemporadaActual(communityRandomOrder)); }
  pintarBanners();
}
// Vista de refugios: banners con fotos de las fundaciones y de artículos donados (se arman en loadBeneficiariosGrid).
let modoRefugios = false, bannersRefugio = [];
const bannerRefugio = (accion, b, fotos) => window.znrBanner.html({ ...b, tema: 'claro', degradado: 'no', fotos: fotos.filter(Boolean).slice(0, 3) }, `role="listitem" data-ben-accion="${accion}"`);

// Banners automáticos: uno por carrusel (con fotos de sus artículos), así arriba nunca queda vacío.
const BANNERS_AUTO = {
  ofertas: (l) => ({ titulo: 'Ofertas', subtitulo: 'destacadas', descripcion: `Hasta -${Math.max(...l.map(pctDescuento))}% en artículos de tu ciudad.`, boton: 'Ver ofertas', fondo: 'linear-gradient(135deg,#ff5f6d,#ffc371)' }),
  temporada: (l) => ({ titulo: 'Podría', subtitulo: 'interesarte', descripcion: `${[...new Set(l.map(p => p.temporada))].slice(0, 2).join(' y ')}: artículos para esta fecha.`, boton: 'Ver más', fondo: 'linear-gradient(135deg,#6a3093,#e0457b)' }),
  recomendado: () => ({ titulo: 'Recomendado', subtitulo: 'para ti', descripcion: 'Artículos según lo que más has visto.', boton: 'Ver más', fondo: 'linear-gradient(135deg,#f0566f,#f7a072)' })
};
// Orden: banners de temporada y después los automáticos. Si alguno está marcado "solo este" (campañas fuertes), solo esos.
function pintarBanners() {
  const exclusivos = bannersVigentes.filter(b => b.exclusivo === 'si');
  const html = modoRefugios ? bannersRefugio : (exclusivos.length ? exclusivos : bannersVigentes).map(b => window.znrBanner.html(b, 'role="listitem" data-vista="temporada"'))
    .concat(exclusivos.length ? [] : Object.keys(BANNERS_AUTO).filter(v => listasCarrusel[v]?.length).map(v => window.znrBanner.html(
      { ...BANNERS_AUTO[v](listasCarrusel[v]), tema: 'claro', degradado: 'no', fotos: listasCarrusel[v].slice(0, 3).map(p => p.imagen1).filter(Boolean) },
      `role="listitem" data-vista="${v}"`)));
  const cont = document.getElementById('com-banners');
  cont.innerHTML = html.join('');
  cont.scrollLeft = 0;
  document.getElementById('com-hero-wrap').hidden = !html.length;
  actualizarLoopBanner();
}

// ── Listas completas de cada grupo (los carruseles toman solo los primeros 10; "Ver más" muestra todos) ──
function calcularOfertas(products) {
  return (products || [])
    .filter(p => Number(stockVivo(p) || 0) > 0 && (Number(p.precio_original) || 0) > (Number(p.precio) || 0))
    .sort((a, b) => (1 - a.precio / a.precio_original) < (1 - b.precio / b.precio_original) ? 1 : -1);
}

// Según las categorías más vistas por este dispositivo; sin historial, cae a vendedores Plus.
function calcularRecomendados(products, limite = Infinity) {
  const categorias = obtenerCategoriasPreferidas();
  const conStock = (products || []).filter(p => Number(stockVivo(p) || 0) > 0);
  if (!categorias.length) return conStock.filter(p => p.vendedor_plan === 'plus').slice(0, limite);
  // Un balde por categoría preferida (más vista primero), barajado internamente
  const baldes = categorias.map(cat => shuffleArray(conStock.filter(p => p.categoria === cat)));
  const out = [];
  let i = 0;
  while (out.length < limite && baldes.some(b => b.length)) {
    const balde = baldes[i % baldes.length];
    if (balde.length) out.push(balde.shift());
    i++;
  }
  return out;
}

// Artículos de la festividad/temporada que está ocurriendo hoy (calendario en temporadas.js);
// primero los de la que termina antes.
function calcularTemporadaActual(products) {
  const nombres = bannerTemporadas.length ? bannerTemporadas : (window.ZNR_TEMPORADAS?.activas?.() || []).map(a => a.nombre);
  const orden = new Map(nombres.map((n, i) => [n, i]));
  if (!orden.size) return [];
  return (products || [])
    .filter(p => p.temporada && orden.has(p.temporada) && Number(stockVivo(p) || 0) > 0)
    .sort((a, b) => orden.get(a.temporada) - orden.get(b.temporada));
}

// ── Carruseles (10 artículos c/u). Viven en #comunidad-carruseles y renderProducts los intercala en la cuadrícula ──
const listasCarrusel = {}; // vista -> lista completa (también la usan los banners automáticos)
// Referencia fija: cuando el carrusel está dentro de la cuadrícula, el esqueleto de carga (innerHTML) lo saca del documento.
const wrapsCarrusel = {};
const wrapCarrusel = v => (wrapsCarrusel[v] ||= document.getElementById(`comunidad-${v}-wrap`));
function renderCarrusel(vista, lista) {
  const wrap = wrapCarrusel(vista);
  const track = wrap?.querySelector('.carr-track');
  if (!wrap || !track) return;
  listasCarrusel[vista] = lista;
  const top = lista.slice(0, 10);
  wrap.style.display = top.length ? '' : 'none';
  if (!top.length) return;
  track.innerHTML = '';
  const badge = p => vista === 'ofertas' ? `<span style="position:absolute;top:6px;left:6px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:10px;">-${pctDescuento(p)}%</span>` : '';
  const construir = () => top.map(p => crearMiniCardComunidad(p, badge(p)));
  construir().forEach(c => track.appendChild(c));
  initLazyImages();
  activarLoopCarrusel(track, construir);
  iniciarAutoScrollCarrusel(track);
}
const pctDescuento = p => p.precio_original > 0 ? Math.round((1 - p.precio / p.precio_original) * 100) : 0;
function renderCarruseles(products) {
  renderCarrusel('ofertas', calcularOfertas(products));
  renderCarrusel('temporada', calcularTemporadaActual(products));
  renderCarrusel('recomendado', calcularRecomendados(products, 10));
  carruselesPintados = true;
  pintarBanners();
}

// ── "Ver más": reemplaza el listado por todo el grupo, como un filtro más (se combina con búsqueda/categoría/etc.) ──
function calcularVista(vista, base) {
  if (vista === 'ofertas') return calcularOfertas(base);
  if (vista === 'recomendado') return calcularRecomendados(base);
  if (vista === 'temporada') return calcularTemporadaActual(base);
  return base || [];
}

function filtrarLocal(lista, f) {
  const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let out = lista.slice();
  if (f.busqueda) {
    const q = norm(f.busqueda);
    out = out.filter(p => norm([p.nombre, p.descripcion, p.talla, p.categoria, p.vendedor_nombre].join(' ')).includes(q));
  }
  if (f.categoria) out = out.filter(p => p.categoria === f.categoria);
  if (f.vendedor) out = out.filter(p => p.vendedor_uid === f.vendedor);
  if (f.temporada) out = out.filter(p => p.temporada === f.temporada);
  if (f.orden === 'precio_asc') out.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  return out;
}

async function cargarVistaComunidad(page, filters) {
  try {
    if (gridContainer && !communityRandomOrder) showSkeletonComunidad(gridContainer, 6);
    const base = await asegurarCatalogoBase();
    // Entrada directa por enlace (?vista=...): se dibujan también los carruseles/tiles del banner.
    if (!carruselesPintados) {
      renderCarruseles(base);
    }
    if (!vistaCache || vistaCache.vista !== filters.vista) {
      vistaCache = { vista: filters.vista, lista: calcularVista(filters.vista, base) };
    }
    const lista = filtrarLocal(vistaCache.lista, filters);
    totalPagesGlobal = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page || 1), totalPagesGlobal);
    const start = (currentPage - 1) * PAGE_SIZE;
    allCommunityProducts = lista.slice(start, start + PAGE_SIZE);
    filteredProducts = [...allCommunityProducts];
    window.allCommunityProductsIndexed = allCommunityProducts;
    renderProducts();
  } catch (err) {
    console.error('Error en cargarVistaComunidad:', err);
    if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;">No se pudo cargar esta sección. Intenta de nuevo.</div>';
  } finally {
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}

function abrirVistaComunidad(vista) {
  if (!VISTA_LABELS[vista]) return;
  // Si está abierta la vista de refugios, se regresa primero a productos.
  const ben = document.getElementById('comunidad-beneficiarios-wrap');
  if (ben && ben.style.display === 'block') document.getElementById('btn-ver-fundaciones')?.click();
  vistaActiva = vista;
  vistaCache = null; // recalcula (y re-baraja "Recomendado") al entrar
  applyFilters();
  setTimeout(() => (document.querySelector('.comunidad-toolbar') || gridContainer)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function initVistasComunidad() {
  document.addEventListener('click', (e) => {
    const acc = e.target.closest('[data-ben-accion]')?.dataset.benAccion;
    if (acc === 'registrar') return window.openBeneficiarioRegister?.();
    if (acc === 'donar') return document.getElementById('comunidad-beneficiarios-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const b = e.target.closest('[data-vista]');
    if (!b) return;
    e.preventDefault();
    abrirVistaComunidad(b.dataset.vista);
  });
}

function renderProducts() {
if (!gridContainer) return;
try {
  // Los productos ya vienen paginados desde el backend — renderizamos todo el array,
  // ocultando los que ya no tienen stock disponible.
  const visibles = filteredProducts.filter(p => Number(stockVivo(p) || 0) > 0);
  if (visibles.length === 0) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">No hay productos que coincidan con los filtros.</div>`;
    renderPagination();
    return;
  }
  const espera = document.getElementById('comunidad-carruseles');
  ['ofertas', 'temporada', 'recomendado'].forEach(v => wrapCarrusel(v) && espera.appendChild(wrapCarrusel(v)));
  gridContainer.innerHTML = '';
  visibles.forEach(product => {
    const card = createCommunityCard(product);
    if (card) gridContainer.appendChild(card);
  });
  const savedLayout = localStorage.getItem('products_layout') || 'grid';
  if (savedLayout === 'grid') gridContainer.classList.add('layout-grid');
  else gridContainer.classList.remove('layout-grid');
  // Vista normal, página 1: Ofertas tras 6 artículos, Podría interesarte tras 12 y Recomendado tras 18; si hay menos, al final
  // (redondeado a filas completas si la cuadrícula tiene más columnas, ej. 4 en escritorio).
  if (currentPage === 1 && esVistaComunidadPorDefecto(currentFilters || {})) {
    const cols = getComputedStyle(gridContainer).gridTemplateColumns.split(' ').length || 1;
    [['ofertas', 6], ['temporada', 12], ['recomendado', 18]].forEach(([v, n], k) => { // k: carruseles ya insertados antes
      if (wrapCarrusel(v)) gridContainer.insertBefore(wrapCarrusel(v), gridContainer.children[Math.ceil(n / cols) * cols + k] || null);
    });
  }
  renderPagination();
  initLazyImages();
} catch (err) {
  console.error('Error en renderProducts:', err);
  gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:red;">Error al mostrar productos. Revisa la consola.</div>';
}
}

// ── Buscador por foto (ai-busqueda-visual.js) ────────────────────────────
// Reemplaza temporalmente la grilla con productos ordenados por similitud
// visual. El módulo de búsqueda visual ya trae los datos completos de cada
// producto (mismo formato que usa createCommunityCard), así que solo hay
// que sustituir el array y volver a renderizar.
window.aplicarResultadosBusquedaVisual = function (productosOrdenados) {
  filteredProducts = productosOrdenados;
  allCommunityProducts = productosOrdenados;
  totalPagesGlobal = 1;
  currentPage = 1;
  renderProducts();
};

// Vuelve al estado normal de búsqueda/filtros (usado por el botón "quitar
// búsqueda por foto" del módulo de búsqueda visual).
window.restaurarBusquedaNormalComunidad = function () {
  if (typeof applyFilters === 'function') applyFilters();
};

// Busca el producto compartido en cualquiera de los arreglos que ya
// tengamos en memoria (no depende del grid ni de en qué página quedó).
function buscarProductoComunidadPorId(id) {
  const fuentes = [communityRandomOrder, allCommunityProducts, filteredProducts];
  for (const arr of fuentes) {
    if (!Array.isArray(arr)) continue;
    const p = arr.find(x => String(x.id) === String(id));
    if (p) return p;
  }
  return null;
}

// Abre directo el modal de detalle del producto compartido, en vez de
// buscar/iluminar su tarjeta en el grid: así no importa si aún no
// renderizó, en qué página está, o si el grid se reconstruye después.
function handleInitialHashComunidad(intentos = 0) {
  if (initialHashHandledComunidad) return;
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#producto-')) return;
  const id = hash.replace('#producto-', '');
  const product = buscarProductoComunidadPorId(id);
  if (!product) {
    if (intentos < 20) setTimeout(() => handleInitialHashComunidad(intentos + 1), 300);
    return;
  }
  initialHashHandledComunidad = true;
  const driveThumb = (url, size) => {
    if (!url) return '';
    const m = String(url).match(/[-\w]{25,}/);
    return m ? `https://drive.google.com/thumbnail?id=${m[0]}&sz=w${size || 400}` : url;
  };
  const imgUrl = product.imagen1 ? driveThumb(product.imagen1, 400) : 'https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen';
  const allImages = [product.imagen1, product.imagen2, product.imagen3].filter(Boolean).map(u => driveThumb(u, 800));
  const productData = {
    ID: product.id,
    Nombre: product.nombre || '',
    Precio: product.precio || 0,
    Categoria: product.categoria || '',
    Talla: product.talla || '',
    Descripcion: product.descripcion || '',
    Stock: product.tipoVenta === 'personalizado' ? -1 : (stockVivo(product) !== undefined ? Number(stockVivo(product)) : -1),
    TipoVenta: product.tipoVenta || 'stock',
    TiempoElaboracionDias: Number(product.tiempoElaboracionDias) || 0,
    OpcionesPersonalizacion: product.opcionesPersonalizacion || '',
    temporada: product.temporada || '',
    multicolor: product.multicolor === true || product.multicolor === 'true',
    Badge: product.badge || '',
    Imagen1: product.imagen1 || '',
    Imagen2: product.imagen2 || '',
    Imagen3: product.imagen3 || '',
    _comunidad: true,
    _vendedorNombre: product.vendedor_nombre || '',
    _vendedorUid: product.vendedor_uid || '',
    _vendedorLogo: product.vendedor_logo || '',
    _vendedorPlan: product.vendedor_plan || '',
    _donado: product.donado === true || product.donado === 'TRUE' || product.donado === 'true',
    _beneficiarioId: product.beneficiario_id || '',
    precio_original: product.precio_original || 0,
    _montoMinimoEnvio: product.vendedor_monto_minimo_envio || 0,
  };
  abrirDetalleComunidad(imgUrl, product.id, allImages, productData);
}
async function deleteProductInspector(productId, productName, cardElement) {
const token = sessionStorage.getItem('admin_token') || '';
if (!token) {
window.showTemporaryMessage(' Sin sesión de admin', 'error');
return;
}
showCustomConfirm({
title: ' Eliminar producto',
message: `¿Eliminar "${productName}" de la comunidad? Esta acción no se puede deshacer.`,
icon: '',
confirmText: 'Eliminar',
cancelText: 'Cancelar',
onConfirm: async () => {
try {
if (typeof window.showLoader === 'function') window.showLoader('Eliminando...');
const params = new URLSearchParams({
action: 'deleteComunidad',
id: String(productId),
token: token
});
const res = await fetch(_resolverApiUrlInspector('deleteComunidad'), {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
const data = await res.json();
if (!data.ok) throw new Error(data.error || 'Error al eliminar');
cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
cardElement.style.opacity = '0';
cardElement.style.transform = 'scale(0.9)';
setTimeout(() => cardElement.remove(), 320);
invalidateComunidadCache();
// Recargar la página actual para reflejar el cambio
loadComunidadPage(currentPage, currentFilters, { force: true });
window.showTemporaryMessage('Producto eliminado de la comunidad', 'success');
} catch (err) {
console.error('Error eliminando producto:', err);
window.showTemporaryMessage(' Error al eliminar: ' + err.message, 'error');
} finally {
if (typeof window.hideLoader === 'function') window.hideLoader();
}
}
});
}
function showReportDialog(product) {
const modal = document.createElement('div');
modal.className = 'custom-alert-modal';
modal.style.zIndex = '100000';
modal.innerHTML = `
<div class="custom-alert-content" style="max-width:380px; width:90%;">
<div class="custom-alert-header">
<span class="custom-alert-icon"></span>
<h3>Reportar producto</h3>
</div>
<div class="custom-alert-body">
<p style="font-weight:600; margin-bottom:12px; color:var(--color-text-primary,#1a1a2e);">
"${window.escapeHtml(safeString(product.nombre))}"
</p>
<p style="margin-bottom:12px; font-size:13px; color:var(--color-text-muted,#666);">Selecciona el motivo del reporte:</p>
<div style="display:flex; flex-direction:column; gap:8px;">
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
<input type="radio" name="report-reason" value="Producto inapropiado" style="accent-color:var(--color-accent-solid);">
<span style="font-size:13px;">Producto inapropiado</span>
</label>
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
<input type="radio" name="report-reason" value="Información falsa o engañosa" style="accent-color:var(--color-accent-solid);">
<span style="font-size:13px;">Información falsa / engañosa</span>
</label>
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;" id="report-otro-label">
<input type="radio" name="report-reason" value="Otro" style="accent-color:var(--color-accent-solid);" id="report-radio-otro">
<span style="font-size:13px;">Otro (especificar)</span>
</label>
<div id="report-otro-field" style="display:none; margin-top:4px;">
<input type="text" id="report-otro-text" placeholder="Describe el problema..." maxlength="200"
style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; font-size:13px; box-sizing:border-box; background:var(--color-input-bg,#f9f9ff);">
</div>
</div>
</div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel" id="report-cancel-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Cancelar</button>
<button class="custom-alert-btn confirm" id="report-confirm-btn" style="background:var(--gradient-accent);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-flag"/></svg> Enviar reporte</button>
</div>
</div>
`;
document.body.appendChild(modal);
const radioOtro = modal.querySelector('#report-radio-otro');
const otroField = modal.querySelector('#report-otro-field');
modal.querySelectorAll('input[name="report-reason"]').forEach(radio => {
radio.addEventListener('change', () => {
otroField.style.display = radioOtro.checked ? 'block' : 'none';
});
});
const close = () => {
modal.classList.add('closing');
setTimeout(() => { if (modal.parentNode) modal.remove(); }, 150);
};
modal.querySelector('#report-cancel-btn')?.addEventListener('click', close);
modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
modal.querySelector('#report-confirm-btn')?.addEventListener('click', async () => {
const selected = modal.querySelector('input[name="report-reason"]:checked');
if (!selected) {
window.showTemporaryMessage(' Selecciona un motivo', 'error');
return;
}
let motivo = selected.value;
if (motivo === 'Otro') {
const otroText = (modal.querySelector('#report-otro-text').value || '').trim();
if (!otroText) {
window.showTemporaryMessage(' Describe el motivo', 'error');
return;
}
motivo = 'Otro: ' + otroText;
}
const confirmBtn = modal.querySelector('#report-confirm-btn');
const ok = await window.withButtonLoading(confirmBtn, () => sendReport(product, motivo), 'Enviando…');
if (ok) close();
});
}
async function sendReport(product, motivo) {
try {
const telefonoUsuario = localStorage.getItem('client_phone') || '';
const params = new URLSearchParams({
action: 'reportarProducto',
productId: String(product.id),
nombreProducto: safeString(product.nombre),
motivo: motivo,
telefonoUsuario: telefonoUsuario,
fecha: new Date().toISOString()
});
const res = await fetch(_resolverApiUrlInspector('reportarProducto'), {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
const data = await res.json();
if (!data.ok) throw new Error(data.error || 'Error al enviar reporte');
window.showTemporaryMessage(' Reporte enviado. ¡Gracias por ayudarnos a mejorar la comunidad!', 'success');
return true;
} catch (err) {
console.error('Error enviando reporte:', err);
window.showTemporaryMessage(' No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
return false;
}
}
function createCommunityCard(product) {
try {
const esc  = window.escapeHtml || (s =>String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const optUrl  = window.optimizeDriveUrl || (u => u);
const fmtCurr = window.formatCurrency  || (v => '$' + Number(v).toLocaleString('es-MX'));
const card = document.createElement('div');
card.className = 'product-card';
card.id = `producto-${product.id}`;
card.setAttribute('data-id', product.id);
const driveThumb = (url, size) => {
  if (!url) return '';
  const m = String(url).match(/[-\w]{25,}/);
  if (!m) return url;
  return `https://drive.google.com/thumbnail?id=${m[0]}&sz=w${size || 400}`;
};
const imgUrl  = product.imagen1 ? driveThumb(product.imagen1, 400) : 'https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen';
const allImages = [product.imagen1, product.imagen2, product.imagen3].filter(Boolean).map(u => driveThumb(u, 800));
const esPersonal = product.tipoVenta === 'personalizado';
const diasElab = Number(product.tiempoElaboracionDias) || 0;
const stockNum  = Number(stockVivo(product)) || 0;
const hasStock  = esPersonal ? true : stockNum > 0;
const esDonativo = product.donado === true || product.donado === 'TRUE' || product.donado === 'true';
const vendorName = safeString(product.vendedor_nombre);
const vendorLogo = safeString(product.vendedor_logo || '');
const esVendorPlus = product.vendedor_plan === 'plus';
const precioOriginal = Number(product.precio_original) || 0;
const tieneDescuento = precioOriginal > Number(product.precio || 0);
const pctDescuento = tieneDescuento ? Math.round((1 - (product.precio / precioOriginal)) * 100) : 0;
const montoMinEnvio = Number(product.vendedor_monto_minimo_envio) || 0;
const califica_entrega = montoMinEnvio > 0 && Number(product.precio || 0) >= montoMinEnvio;
const vendorInitials = vendorName ? vendorName.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() : '?';
const vendorAvatarHtml = (esVendorPlus && vendorLogo)
  ? `<img src="${esc(vendorLogo)}" alt="${esc(vendorName)}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid #a855f744;" onerror="this.style.display='none'">`
  : `<span style="width:18px;height:18px;border-radius:50%;background:#f3e8ff;color:#7c3aed;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e9d5ff;">${esc(vendorInitials)}</span>`;
card.innerHTML = `
<div class="product-slider" style="position:relative;cursor:pointer;aspect-ratio:1/1;overflow:hidden;background:var(--color-surface-2,#f5f5f8);">
${product.vendedor_plan === 'plus' ? `<span style="position:absolute;top:8px;right:8px;font-size:9px;padding:2px 8px; background: linear-gradient(135deg, #f7c948, #f0962f);color:#fff;border-radius:20px;font-weight:800;z-index:1;">${Icon('check')}</span>` : ''}
${esDonativo ? '<span style="position:absolute;top:' + (product.vendedor_plan === 'plus' ? '8px' : '8px') + ';left:8px;font-size:11px;padding:2px 8px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;border-radius:20px;font-weight:800;z-index:1;">Donativo</span>' : ''}
${(inspectorMode && !product.es_znr) ? `<span style="position:absolute;top:8px;right:8px;z-index:2;"><button class="btn-inspector-delete" title="Eliminar (Admin)" aria-label="Eliminar producto" style="background:var(--color-error,#ef4444);color:#fff;border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-trash"/></svg></button></span>` : ''}
${(window.crearSliderImagenesHTML ? window.crearSliderImagenesHTML(allImages.length ? allImages : [imgUrl], safeString(product.nombre)) : `<img class="product-img-main" src="${esc(imgUrl)}" alt="${esc(safeString(product.nombre))}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;background:var(--color-surface-2,#f5f5f8);" onerror="window.znrLoadImgWithRetry(this)">`)}
</div>
<div class="product-info" style="padding:12px;">
${tieneDescuento ? `<div style="text-align:right;font-size:11px;color:var(--color-text-muted,#888);text-decoration:line-through;">${fmtCurr(precioOriginal)}</div>` : ''}
<div class="product-title-row">
<h3 class="product-name" style="font-size:14px;" title="${esc(safeString(product.nombre))}">${esc(safeString(product.nombre))}</h3>
<div class="product-price" style="font-size:16px;">${esPersonal ? '<span style="font-size:10px;font-weight:600;opacity:.7;">Desde </span>' : ''}${fmtCurr(product.precio)}${tieneDescuento ? ` <span style="font-size:10px;font-weight:800;color:#22c55e;">-${pctDescuento}%</span>` : ''}</div>
</div>
${califica_entrega ? `<div style="display:flex;align-items:center;gap:4px;font-size:10.5px;color:#16a34a;font-weight:600;margin-top:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Entrega a domicilio disponible</div>` : ''}
${vendorName ? `<div style="font-size:11px;color:var(--color-text-muted,#888);margin-top:2px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;">
<span style="display:flex;align-items:center;gap:5px;">
  ${vendorAvatarHtml}
  <a href="${(product.es_znr || product.vendedor_uid === 'znr_oficial') ? 'catalogo.html' : ('perfil-vendedor.html?vendedor=' + esc(product.vendedor_uid))}" style="color:var(--color-text-main);font-weight:600;text-decoration:none;cursor:pointer;hover:underline;">${esc(vendorName)}</a>
</span>
${esDonativo && product.beneficiario_id ? `<button class="btn-ver-beneficiario" data-ben-id="${esc(safeString(product.beneficiario_id))}" style="background:none;border:none;padding:0;color:#f97316;font-weight:600;font-size:11px;cursor:pointer;text-decoration:underline;">Ver beneficiario</button>` : ''}
</div>` : ''}
${product.talla ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">Info: ${esc(safeString(product.talla))}</div>` : ''}
${window.ZNR_TEMPORADAS ? window.ZNR_TEMPORADAS.chipsHTML(product) : ''}
<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">
${esPersonal
? `<span style="color:#a855f7;font-size:11px;font-weight:600;">Bajo pedido${diasElab ? ' · ' + diasElab + (diasElab === 1 ? ' día' : ' días') : ''}</span>`
: !hasStock
? '<span style="color:var(--color-error,#ef4444);font-size:11px;font-weight:600;">Sin stock</span>'
: `<span style="color:var(--color-success,#22c55e);font-size:11px;">Stock: ${stockNum}</span>`}
${product.categoria ? `<span style="font-size:10px;color:var(--color-text-muted,#aaa);">· ${esc(safeString(product.categoria))}</span>` : ''}
</div>
<div class="product-actions" style="margin-top:8px;display:flex;gap:6px;">
<button class="primary-button comunidad-add-btn"
style="flex:1;padding:8px 10px;font-size:12px;${!hasStock ? 'opacity:.5;cursor:not-allowed;' : ''}"
${!hasStock ? 'disabled' : ''}
data-id="${product.id}"
data-nombre="${esc(safeString(product.nombre))}"
data-precio="${product.precio || 0}"
data-img="${esc(safeString(product.imagen1 || ''))}"
data-talla="${esc(safeString(product.talla || ''))}"
data-vendedor="${esc(vendorName)}"
data-vendorlogo="${esc(vendorLogo)}"
data-vendorplan="${esc(safeString(product.vendedor_plan || ''))}"
data-vendoruid="${esc(safeString(product.vendedor_uid || ''))}"
data-donacion="${esDonativo}"
data-benid="${esDonativo && product.beneficiario_id ? esc(safeString(product.beneficiario_id)) : ''}"
data-personalizado="${esPersonal}">
${!hasStock ? '-' : (esPersonal ? 'Personalizar' : 'Añadir')}
</button>
${!product.es_znr ? `<button class="btn-report" title="Reportar" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 8px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-flag"/></svg></button>` : ''}
<button class="btn-share-comunidad" title="Compartir" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 8px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-share"/></svg></button>
</div>
</div>
`;
window.activarMiniSlider?.(card.querySelector('.product-slider'));
card.querySelector('.product-slider')?.addEventListener('click', (e) => {
if (!e.target.closest('button') && e.currentTarget.dataset.dragged !== '1') {
if (window.openImageModal) {
const productData = {
ID:  product.id,
Nombre:  product.nombre  || '',
Precio:  product.precio  || 0,
Categoria:  product.categoria  || '',
Talla:  product.talla  || '',
Descripcion: product.descripcion || '',
Stock:  esPersonal ? -1 : (stockVivo(product) !== undefined ? Number(stockVivo(product)) : -1),
TipoVenta: product.tipoVenta || 'stock',
TiempoElaboracionDias: diasElab,
OpcionesPersonalizacion: product.opcionesPersonalizacion || '',
temporada: product.temporada || '',
multicolor: product.multicolor === true || product.multicolor === 'true',
Badge:  product.badge  || '',
Imagen1:  product.imagen1  || '',
Imagen2:  product.imagen2  || '',
Imagen3:  product.imagen3  || '',
_comunidad:  true,
_vendedorNombre: vendorName || '',
_vendedorUid: product.vendedor_uid || '',
_vendedorLogo: vendorLogo || '',
_vendedorPlan: product.vendedor_plan || '',
_donado: esDonativo,
_beneficiarioId: product.beneficiario_id || '',
precio_original: product.precio_original || 0,
_montoMinimoEnvio: product.vendedor_monto_minimo_envio || 0,
};
abrirDetalleComunidad(imgUrl, product.id, allImages, productData);
}
}
});
const addBtn = card.querySelector('.comunidad-add-btn');
if (addBtn && hasStock && window.addToCart) {
addBtn.addEventListener('click', async (e) => {
e.stopPropagation();
if (addBtn.dataset.personalizado === 'true') {
if (window.znrPersonalizar) window.znrPersonalizar({
ID: addBtn.dataset.id, Nombre: addBtn.dataset.nombre, Precio: Number(addBtn.dataset.precio),
Imagen1: addBtn.dataset.img, TiempoElaboracionDias: diasElab,
OpcionesPersonalizacion: product.opcionesPersonalizacion || ''
});
return;
}
const esDon = addBtn.dataset.donacion === 'true';
const beneficiario = esDon && typeof window.resolveBeneficiario === 'function'
? await window.resolveBeneficiario(addBtn.dataset.benid || '')
: (esDon ? { id: addBtn.dataset.benid || '', nombre: '', cuenta_bancaria: '' } : null);
window.addToCart({
ID: addBtn.dataset.id, Nombre: addBtn.dataset.nombre,
Precio: Number(addBtn.dataset.precio), Imagen1: addBtn.dataset.img,
Talla: addBtn.dataset.talla, _comunidad: true,
_vendedor: addBtn.dataset.vendedor,
_vendorLogo: addBtn.dataset.vendorlogo, _vendorPlan: addBtn.dataset.vendorplan,
_vendorUid: addBtn.dataset.vendoruid,
_donacion: esDon,
_beneficiario: beneficiario
});
if (window.showTemporaryMessage) window.showTemporaryMessage(` ${addBtn.dataset.nombre} agregado`, 'success');
});
}
const reportBtn = card.querySelector('.btn-report');
if (reportBtn) reportBtn.addEventListener('click', (e) => { e.stopPropagation(); showReportDialog(product); });
if (inspectorMode) {
const deleteBtn = card.querySelector('.btn-inspector-delete');
if (deleteBtn) deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteProductInspector(product.id, safeString(product.nombre), card); });
}

const shareBtn = card.querySelector('.btn-share-comunidad');
if (shareBtn) shareBtn.addEventListener('click', (e) => {
e.stopPropagation();
shareProduct(product.id, product.nombre, product.precio);
});

const benBtn = card.querySelector('.btn-ver-beneficiario');
if (benBtn) {
benBtn.addEventListener('click', (e) => {
e.stopPropagation();
if (window.openBeneficiarioModal) window.openBeneficiarioModal(benBtn.dataset.benId);
});
}

return card;
} catch (err) {
console.error('Error creando tarjeta para producto', product.id, err);
return null;
}
}
function renderPagination() {
  if (!paginationDiv) return;
  const totalPages = totalPagesGlobal || 1;
  paginationDiv.innerHTML = '';
  if (totalPages <= 1) { paginationDiv.style.display = 'none'; return; }
  paginationDiv.style.display = 'flex';

  // Botón Anterior
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = Icon('arrow-left') + '';
    prevBtn.onclick = () => {
      loadComunidadPage(currentPage - 1, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationDiv.appendChild(prevBtn);
  }

  // Números de página (máximo 5 visibles)
  let startPage = Math.max(1, currentPage - 2);
  let endPage   = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active-page');
    btn.onclick = (function(p) { return function() {
      loadComunidadPage(p, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }; })(i);
    paginationDiv.appendChild(btn);
  }

  // Botón Siguiente
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '' + Icon('arrow-right');
    nextBtn.onclick = () => {
      loadComunidadPage(currentPage + 1, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationDiv.appendChild(nextBtn);
  }
}
function initLazyImages() {
if (!('IntersectionObserver' in window)) return;
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const img = entry.target;
const dataSrc = img.getAttribute('data-src');
if (dataSrc) {
img.src = dataSrc;
img.removeAttribute('data-src');
}
observer.unobserve(img);
}
});
}, { rootMargin: '100px' });
document.querySelectorAll('.comunidad-card-img[data-src]').forEach(img => observer.observe(img));
}
function bindFilterChangeEvents() {
const searchInput = document.getElementById('comunidad-search');
const catSelectEl = document.getElementById('comunidad-cat');
const vendorSelectEl = document.getElementById('comunidad-vendor');
const ordenEl = document.getElementById('comunidad-orden');
const updateHandler = () => {
applyFilters();
updateURLWithFilters();
};
if (searchInput) {
searchInput.addEventListener('input', () => {
if (debounceTimer) clearTimeout(debounceTimer);
debounceTimer = setTimeout(updateHandler, 400);
});
}
if (catSelectEl) catSelectEl.addEventListener('change', updateHandler);
if (vendorSelectEl) vendorSelectEl.addEventListener('change', updateHandler);
const temporadaSelectEl = document.getElementById('comunidad-temporada');
if (temporadaSelectEl) temporadaSelectEl.addEventListener('change', updateHandler);
if (ordenEl) ordenEl.addEventListener('change', updateHandler);
}
function initCartAndUI() {
if (typeof window.loadCartFromStorage === 'function') window.loadCartFromStorage();
if (typeof window.renderCart === 'function') window.renderCart();
if (typeof window.updateSavedPhoneDisplay === 'function') window.updateSavedPhoneDisplay();
const cartIcon = document.getElementById('cart-icon-home');
if (cartIcon && window.openCartDrawer) cartIcon.addEventListener('click', () => window.openCartDrawer());
const wishlistIcon = document.getElementById('wishlist-icon-home');
if (wishlistIcon && window.openWishlistDrawer) wishlistIcon.addEventListener('click', () => window.openWishlistDrawer());
const closeWishBtn = document.getElementById('close-wishlist-btn');
if (closeWishBtn) closeWishBtn.addEventListener('click', () => {
const d = document.getElementById('wishlist-drawer');
const o = document.getElementById('overlay');
if (d) d.classList.remove('open');
if (o) o.classList.remove('visible');
});
const closeCartBtn = document.getElementById('close-cart-btn');
if (closeCartBtn) closeCartBtn.addEventListener('click', () => {
if (typeof window.closeCartDrawer === 'function') window.closeCartDrawer();
});
const layoutBtn = document.getElementById('layout-toggle-comunidad');
const grid = document.getElementById('comunidad-grid');
function applyComLayout(isGrid) {
if (!grid) return;
if (isGrid) { grid.classList.add('layout-grid'); if (layoutBtn) layoutBtn.textContent = ''; }
else  { grid.classList.remove('layout-grid'); if (layoutBtn) layoutBtn.textContent = ''; }
localStorage.setItem('products_layout', isGrid ? 'grid' : 'list');
}
const savedLayout = localStorage.getItem('products_layout') || 'grid';
applyComLayout(savedLayout === 'grid');
if (layoutBtn) layoutBtn.addEventListener('click', () => {
const isGrid = !grid.classList.contains('layout-grid');
applyComLayout(isGrid);
window.dispatchEvent(new CustomEvent('layoutChanged', { detail: { layout: isGrid ? 'grid' : 'list' } }));
});
window.addEventListener('layoutChanged', (e) => applyComLayout(e.detail.layout === 'grid'));
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
themeBtn.addEventListener('click', () => {
const html = document.documentElement;
const current = html.getAttribute('data-theme');
const newTheme = current === 'dark' ? 'light' : 'dark';
html.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
themeBtn.textContent = newTheme === 'dark' ? '' : '';
});
const savedTheme = localStorage.getItem('theme') || 'dark';
themeBtn.textContent = savedTheme === 'dark' ? '' : '';
}
const overlay = document.getElementById('overlay');
if (overlay) {
overlay.addEventListener('click', () => {
if (typeof window.closeCartDrawer === 'function') window.closeCartDrawer();
if (typeof window.closeWishlistDrawer === 'function') window.closeWishlistDrawer();
if (typeof window.closeImageModal === 'function') window.closeImageModal();
overlay.classList.remove('visible');
});
}
}
function injectStyles() {
if (document.getElementById('comunidad-extra-styles')) return;
const style = document.createElement('style');
style.id = 'comunidad-extra-styles';
style.textContent = `
.comunidad-card-actions {
display: flex;
flex-direction: column;
gap: 8px;
margin-top: 8px;
}
.comunidad-extra-btns {
display: flex;
gap: 8px;
}
.product-slider { position: relative !important; }
.product-slider > .mini-slider {
  position: absolute !important;
  top: 0 !important; left: 0 !important;
  width: 100% !important; height: 100% !important;
}
.product-slider .mini-slider-track {
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
}
.product-slider .mini-slider-slide {
  flex: 0 0 100% !important;
  min-width: 100% !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.product-slider .mini-slider-slide img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
  display: block !important;
}
.product-slider > img.product-img-main {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important; height: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
  display: block !important;
}
.btn-report {
flex: 1;
padding: 8px 12px;
border: 1.5px solid #f97316;
border-radius: 30px;
background: transparent;
color:var(--color-warning,#f97316);
font-size: 12px;
font-weight: 600;
cursor: pointer;
transition: all 0.2s;
white-space: nowrap;
}
.btn-report:hover {
background: #f97316;
color: white;
transform: translateY(-1px);
}
.btn-inspector-delete {
flex: 1;
padding: 8px 12px;
border: 1.5px solid #ef4444;
border-radius: 30px;
background: transparent;
color:var(--color-error,#ef4444);
font-size: 12px;
font-weight: 600;
cursor: pointer;
transition: all 0.2s;
white-space: nowrap;
}
.btn-inspector-delete:hover {
background: #ef4444;
color: white;
transform: translateY(-1px);
}
@media (max-width: 640px) {
.comunidad-extra-btns { flex-direction: column; }
.btn-report, .btn-inspector-delete { font-size: 11px; padding: 7px 10px; }
}
`;
document.head.appendChild(style);
}
async function initComunidad() {
injectStyles();
// Restaurar sesión de vendedor ANTES de pintar productos: createCommunityCard
// usa window.vendorSession para decidir si mostrar "Donar artículo" en vez
// de "Añadir", y loadCommunityProducts corre pocas líneas más abajo.
if (!window.vendorSession) {
  try {
    const stored = localStorage.getItem('vendor_session');
    if (stored) window.vendorSession = JSON.parse(stored);
  } catch (e) {}
}
gridContainer = document.getElementById('comunidad-grid');
catSelect = document.getElementById('comunidad-cat');
vendorSelect = document.getElementById('comunidad-vendor');
temporadaSelect = document.getElementById('comunidad-temporada');
if (temporadaSelect && window.ZNR_TEMPORADAS) {
  // Lista fija (temporadas.js); si la URL trae ?temporada=..., se deja seleccionada.
  const valorURL = new URLSearchParams(window.location.search).get('temporada') || '';
  temporadaSelect.innerHTML = '<option value="">Todas</option>' + window.ZNR_TEMPORADAS.opcionesFiltroHTML();
  if (valorURL) temporadaSelect.value = valorURL;
}
paginationDiv = document.getElementById('comunidad-pagination');
if (!gridContainer) {
console.warn('No se encontró #comunidad-grid');
return;
}
await initInspectorMode();
bindFilterChangeEvents();
initFiltrosSheet();
initVistasComunidad();
cargarBannersTemporada();
initCartAndUI();
loadCommunityProducts();
checkLiveBanner();
checkPendingRatings();
initBeneficiariosToggle();
}

// ── Grid de fundaciones/beneficiarios ──────────────────────────────────
let beneficiariosCargados = false;
function initBeneficiariosToggle() {
  const btn = document.getElementById('btn-ver-fundaciones');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const wrap = document.getElementById('comunidad-beneficiarios-wrap');
    const toolbarArea = document.querySelector('.comunidad-toolbar');
    const arriba = [document.querySelector('.com-top-search')];
    const navIcono = (ic, t) => { btn.querySelector('use').setAttribute('href', '#ic-' + ic); btn.querySelector('.nav-donar-t').textContent = t; };
    const chipsBar = document.getElementById('comunidad-filter-chips');
    const grid = document.getElementById('comunidad-grid');
    const pagination = document.getElementById('comunidad-pagination');
    if (!wrap) return;
    const showing = wrap.style.display !== 'none';
    if (showing) {
      // Volver a productos
      wrap.style.display = 'none';
      if (grid) grid.style.display = '';
      if (pagination) pagination.style.display = '';
      if (toolbarArea) toolbarArea.style.display = '';
      arriba.forEach(el => el && (el.style.display = ''));
      navIcono('hand-heart', 'Donar'); btn.classList.remove('active');
      modoRefugios = false; pintarBanners();
      updateComunidadChips(currentFilters || {});
    } else {
      // Mostrar fundaciones
      wrap.style.display = 'block';
      if (grid) grid.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
      if (chipsBar) chipsBar.style.display = 'none';
      if (toolbarArea) toolbarArea.style.display = 'none';
      arriba.forEach(el => el && (el.style.display = 'none'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navIcono('community', 'Comunidad'); btn.classList.add('active');
      modoRefugios = true; pintarBanners();
      if (!beneficiariosCargados) loadBeneficiariosGrid();
    }
  });
  // Enlace desde el home ("Dona con propósito"): entra directo a ver los refugios.
  if (new URLSearchParams(window.location.search).get('ver') === 'refugios') {
    let intentos = 0;
    const abrir = () => {
      if ((window.znrFirestore && window.znrFirestore.getBeneficiariosAprobados) || ++intentos > 20) btn.click();
      else setTimeout(abrir, 250);
    };
    abrir();
  }
}

async function loadBeneficiariosGrid() {
  const grid = document.getElementById('comunidad-beneficiarios-grid');
  if (!grid) return;
  try {
let data = null;
if (window.znrFirestore && window.znrFirestore.getBeneficiariosAprobados) {
  data = await window.znrFirestore.getBeneficiariosAprobados();
}

    if (!data || !data.ok) throw new Error((data && data.error) || 'Firestore no disponible');
    // Fundaciones con la cuenta suspendida no se muestran (el backend tampoco deja asignarles donaciones).
    const beneficiarios = (data.beneficiarios || []).filter(b => !b.suspendido);
    beneficiariosCargados = true;
    if (beneficiarios.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Aún no hay fundaciones aprobadas.</div>';
      return;
    }
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const miCiudad = await obtenerCiudadComprador();
    const deMiCiudad = beneficiarios.filter(b => !b.ciudad || !miCiudad || b.ciudad === miCiudad);
    const n = deMiCiudad.length;
    bannersRefugio = [
      bannerRefugio('donar', { titulo: 'Dona con', subtitulo: 'propósito', boton: 'Donar artículo', fondo: 'linear-gradient(135deg,#f97316,#ef4444)',
        descripcion: n ? `${n} ${n === 1 ? 'refugio o fundación de tu ciudad recibe' : 'refugios y fundaciones de tu ciudad reciben'} lo que dones.` : 'Lo que dones llega directo al beneficiario.' },
        [...deMiCiudad, ...beneficiarios].map(b => b.imagen1 && optimizeDriveUrl(b.imagen1, 300))),
      bannerRefugio('registrar', { titulo: '¿Tienes un', subtitulo: 'refugio?', boton: 'Regístralo', fondo: 'linear-gradient(135deg,#6a3093,#e0457b)',
        descripcion: 'Regístralo y recibe donaciones de tu comunidad.' },
        (communityRandomOrder || []).filter(p => p.donado === true || p.donado === 'true' || p.donado === 'TRUE').map(p => p.imagen1))
    ];
    if (modoRefugios) pintarBanners();
    grid.innerHTML = beneficiarios.map(b => {
      const img = b.imagen1 ? optimizeDriveUrl(b.imagen1, 300) : '';
      const fueraDeCiudad = !!(b.ciudad && miCiudad && b.ciudad !== miCiudad);
      const btnLabel = fueraDeCiudad
        ? `${Icon('map-pin',{size:12})} Fuera de tu ciudad`
        : `${Icon('heart-fill',{size:12})} Donar artículo`;
      const btnStyle = fueraDeCiudad
        ? 'background:#f0f0f0;color:#888;'
        : 'background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;';
      return `
        <div class="comunidad-beneficiario-card" data-ben-id="${esc(b.id)}" data-fuera="${fueraDeCiudad ? '1' : ''}"
          style="background:var(--color-surface,#181820);border-radius:14px;overflow:hidden;cursor:pointer;
          border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;">
          <div style="width:100%;aspect-ratio:1;background:#26262f;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${img ? `<img src="${esc(img)}" alt="${esc(b.nombre)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
                  : `<span style="font-size:2rem;">${Icon('heart-fill',{size:32})}</span>`}
          </div>
          <div style="padding:10px;">
            <div style="font-size:.85rem;font-weight:700;color:var(--color-text-primary,#fff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.nombre)}</div>
            ${b.organizacion ? `<div style="font-size:.72rem;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.organizacion)}</div>` : ''}
            ${b.ubicacion ? `<div style="font-size:.7rem;color:#666;margin-top:2px;">${Icon('map-pin',{size:12})} ${esc(b.ubicacion)}</div>` : ''}
            <button class="btn-donar-refugio" data-ben-id="${esc(b.id)}" data-ben-nombre="${esc(b.nombre)}" style="width:100%;margin-top:8px;padding:7px 8px;border:none;border-radius:20px;font-weight:700;font-size:.72rem;cursor:pointer;${btnStyle}">${btnLabel}</button>
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.comunidad-beneficiario-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.benId;
        if (id && window.openBeneficiarioModal) window.openBeneficiarioModal(id);
      });
    });
    grid.querySelectorAll('.btn-donar-refugio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.closest('.comunidad-beneficiario-card')?.dataset.fuera === '1') {
          if (window.openBeneficiarioModal) window.openBeneficiarioModal(btn.dataset.benId);
          return;
        }
        if (window.openDonarARefugioModal) window.openDonarARefugioModal({ id: btn.dataset.benId, nombre: btn.dataset.benNombre });
      });
    });
  } catch (err) {
    console.error('Error cargando fundaciones:', err);
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">
      Error al cargar fundaciones.<br>
      <button onclick="window.__reloadBeneficiariosGrid && window.__reloadBeneficiariosGrid()" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:var(--color-accent-solid); color:white; cursor:pointer; font-weight:600;"  >${Icon('refresh')} Reintentar</button>
    </div>`;
    window.__reloadBeneficiariosGrid = () => { beneficiariosCargados = false; loadBeneficiariosGrid(); };
  }
}


  async function checkLiveBanner() {
  const slot = document.getElementById('live-banner-slot');
  if (!slot) return;

  // Función que espera a que getLivesActivos esté disponible (hasta 5 intentos)
  async function fetchLives() {
    if (typeof window.znrFirestore?.getLivesActivos !== 'function') {
      throw new Error('getLivesActivos no disponible aún');
    }
    const result = await window.znrFirestore.getLivesActivos();
    if (!result.ok) throw new Error(result.error || 'Error al obtener lives');
    return result.lives;
  }

  let lives = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      lives = await fetchLives();
      break;
    } catch (err) {
      if (attempt === 4) {
        console.error('Error en checkLiveBanner (Firestore):', err);
        slot.innerHTML = '';
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const miCiudad = await obtenerCiudadComprador();
  lives = lives.filter((l) => l.ciudad === miCiudad);
  if (lives.length === 0) {
    slot.innerHTML = '';
    return;
  }

  const n = lives.length;
  const nombres = lives.slice(0, 2).map(l => l.vendedor_nombre || 'Vendedor').join(', ');
  slot.innerHTML = `
    <a href="lives.html" style="text-decoration:none; display:block; margin:0 0 4px;
      background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(244,114,182,.10));
      border:1px solid rgba(239,68,68,.35); border-radius:14px; padding:12px 16px;
      display:flex; align-items:center; gap:10px;">
      <span style="width:9px; height:9px; border-radius:50%; background:#ef4444; flex-shrink:0;
        animation: znr-live-pulse 1.4s infinite;"></span>
      <span style="flex:1; color:var(--color-text-primary,#dde1e8); font-size:13px; font-weight:600;">
        ${Icon('signal')} En vivo ahora: ${nombres}${n > 2 ? ` y ${n - 2} más` : ''}
      </span>
      <span style="color:var(--color-accent,#f472b6); font-size:12px; font-weight:700;">Ver ${Icon('arrow-right',{size:12})}</span>
    </a>
    <style>@keyframes znr-live-pulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }</style>
  `;
  }

    

// ── Sistema de calificaciones: revisa si el comprador tiene compras
// confirmadas (stock ya descontado por el vendedor) que aún no calificó,
// y le muestra un modal para calificar el producto.
async function checkPendingRatings() {
  const phone = (localStorage.getItem('client_phone') || '').replace(/\D/g, '');
  if (!phone) return;
  try {
    // 🆕 Respaldo local: productos que este teléfono ya calificó en este navegador,
    // por si el backend tarda en reflejarlo o el fetch falla por alguna razón.
    let yaCalificadosLocal = [];
    try { yaCalificadosLocal = JSON.parse(localStorage.getItem('rated_products_' + phone) || '[]'); } catch (e) {}

    // 🆕 cache:'no-store' + timestamp para evitar que quede una respuesta vieja cacheada
    const res = await fetch(
      _resolverApiUrlInspector('obtenerCalificacionesPendientes') + '?' + new URLSearchParams({ action: 'obtenerCalificacionesPendientes', clientPhone: phone, _t: Date.now() }),
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (data.ok && data.pendientes && data.pendientes.length > 0) {
      const siguiente = data.pendientes.find(p => !yaCalificadosLocal.includes(String(p.productId)));
      if (siguiente) mostrarModalCalificar(siguiente, phone);
    }
  } catch (err) {
    console.warn('Error revisando calificaciones pendientes:', err);
  }
}

function mostrarModalCalificar(item, phone) {
  const old = document.getElementById('modal-calificar');
  if (old) old.remove();

  // Inyectar estilos una sola vez
  if (!document.getElementById('modal-calificar-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-calificar-styles';
    style.textContent = `
      #modal-calificar {
        position: fixed; inset: 0;
        background: rgba(15, 12, 20, 0.65);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: mcFadeIn .22s ease-out;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      @keyframes mcFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes mcPop {
        from { opacity: 0; transform: translateY(12px) scale(.96) }
        to   { opacity: 1; transform: translateY(0)    scale(1) }
      }
      #modal-calificar .mc-panel {
        background: var(--color-surface, #fff);
        border-radius: 24px;
        padding: 26px 22px 20px;
        max-width: 400px; width: 100%;
        text-align: center;
        box-shadow: 0 24px 60px -12px rgba(0,0,0,.35),
                    0 8px 24px -8px rgba(0,0,0,.2);
        animation: mcPop .28s cubic-bezier(.2,.9,.3,1.2);
        position: relative;
      }
      #modal-calificar .mc-close {
        position: absolute; top: 12px; right: 12px;
        width: 32px; height: 32px; border-radius: 50%;
        border: none; background: rgba(0,0,0,.05);
        color: #888; font-size: 18px; line-height: 1;
        cursor: pointer; transition: background .15s, transform .15s;
      }
      #modal-calificar .mc-close:hover { background: rgba(0,0,0,.1); transform: rotate(90deg); }
      #modal-calificar .mc-img {
        width: 88px; height: 88px; object-fit: contain;
        border-radius: 16px; background: #f5f5f8;
        padding: 8px; box-sizing: border-box;
        margin: 0 auto 14px; display: block;
      }
       #modal-calificar .mc-sub {
        margin: 0 0 18px; font-size: 13px; color: #8a8a92;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      #modal-calificar .mc-stars {
        display: flex; justify-content: center; gap: 6px;
        margin-bottom: 6px; user-select: none;
      }
      #modal-calificar .mc-star {
        cursor: pointer; padding: 4px;
        transition: transform .15s ease, color .15s ease;
        color: #ddd; line-height: 0;
      }
      #modal-calificar .mc-star:hover { transform: scale(1.15); }
      #modal-calificar .mc-star.active { color: #f59e0b; }
      #modal-calificar .mc-label {
        font-size: 12.5px; font-weight: 600;
        color: #f59e0b; min-height: 18px;
        margin-bottom: 16px; letter-spacing: .3px;
      }
      #modal-calificar textarea {
        width: 100%; box-sizing: border-box;
        border: 1.5px solid #e6e6ec; border-radius: 12px;
        padding: 11px 12px; font-size: 13px;
        margin-bottom: 16px; resize: none; min-height: 68px;
        font-family: inherit; color: inherit;
        background: var(--color-bg, #fafafc);
        transition: border-color .15s, box-shadow .15s;
        outline: none;
      }
      #modal-calificar textarea:focus {
        border-color: #c85c78;
        box-shadow: 0 0 0 3px rgba(200,92,120,.15);
      }
      #modal-calificar .mc-actions { display: flex; gap: 10px; }
      #modal-calificar button.mc-btn {
        flex: 1; padding: 12px; border-radius: 12px;
        font-weight: 700; font-size: 13.5px;
        cursor: pointer; transition: transform .12s, opacity .15s, box-shadow .15s;
        font-family: inherit;
      }
      #modal-calificar button.mc-btn:active { transform: scale(.97); }
      #modal-calificar .mc-skip {
        border: 1.5px solid #e6e6ec; background: transparent; color: #888;
      }
      #modal-calificar .mc-skip:hover { background: #f5f5f8; color: #555; }
      #modal-calificar .mc-send {
        border: none; color: #fff;
        background: linear-gradient(135deg, #c85c78, #d68a5f);
        box-shadow: 0 6px 16px -6px rgba(200,92,120,.6);
      }
      #modal-calificar .mc-send:hover:not(:disabled) {
        box-shadow: 0 10px 22px -8px rgba(200,92,120,.75);
        transform: translateY(-1px);
      }
      #modal-calificar .mc-send:disabled { opacity: .7; cursor: wait; }
    `;
    document.head.appendChild(style);
  }

  const STAR_SVG = `<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.56 6.1 20.67l1.13-6.57L2.45 9.44l6.6-.96L12 2.5z"/>
  </svg>`;

  const LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'];

  const modal = document.createElement('div');
  modal.id = 'modal-calificar';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="mc-panel">
      <button class="mc-close" aria-label="Cerrar">×</button>
      <img class="mc-img" src="${escapeHtml(item.imagen || '')}" alt=""
           onerror="this.style.display='none'">
      <h2>¿Cómo estuvo tu compra?</h2>
      <p class="mc-sub">${escapeHtml(item.nombre || 'tu producto')}</p>

      <div class="mc-stars" id="calif-stars" role="radiogroup" aria-label="Calificación"></div>
      <div class="mc-label" id="calif-label"></div>

      <textarea id="calif-comentario" placeholder="Cuéntanos algo (opcional)"
        maxlength="300" aria-label="Comentario"></textarea>

      <div class="mc-actions">
        <button class="mc-btn mc-skip" id="calif-omitir">Ahora no</button>
        <button class="mc-btn mc-send" id="calif-enviar">Enviar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // -------- Estrellas --------
  let calificacionSeleccionada = 5;
  const starsEl = modal.querySelector('#calif-stars');
  const labelEl = modal.querySelector('#calif-label');
  const spans = [];
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.className = 'mc-star';
    span.innerHTML = STAR_SVG;
    span.dataset.value = String(i + 1);
    span.setAttribute('role', 'radio');
    span.setAttribute('aria-label', `${i + 1} estrellas`);
    spans.push(span);
    starsEl.appendChild(span);
  }

  const pintarEstrellas = (n) => {
    spans.forEach((s, i) => s.classList.toggle('active', i < n));
    labelEl.textContent = LABELS[n] || '';
    spans.forEach((s, i) => s.setAttribute('aria-checked', String(i + 1 === n)));
  };

  const setHover = (n) => {
    spans.forEach((s, i) => s.classList.toggle('active', i < n));
  };

  pintarEstrellas(calificacionSeleccionada);

  starsEl.addEventListener('mouseover', (e) => {
    const span = e.target.closest('span[data-value]');
    if (span) setHover(Number(span.dataset.value));
  });
  starsEl.addEventListener('mouseleave', () => pintarEstrellas(calificacionSeleccionada));
  starsEl.addEventListener('click', (e) => {
    const span = e.target.closest('span[data-value]');
    if (!span) return;
    calificacionSeleccionada = Number(span.dataset.value);
    pintarEstrellas(calificacionSeleccionada);
  });

  // -------- Cierre --------
  const close = () => {
    if (!modal.parentNode) return;
    modal.style.animation = 'mcFadeIn .18s ease-in reverse';
    setTimeout(() => modal.remove(), 160);
    document.removeEventListener('keydown', onEsc);
  };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);
  modal.querySelector('.mc-close').addEventListener('click', close);
  modal.querySelector('#calif-omitir').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // -------- Enviar --------
  modal.querySelector('#calif-enviar').addEventListener('click', async (e) => {
    const comentario = modal.querySelector('#calif-comentario').value.trim();
    const btn = e.currentTarget;

    const ejecutar = async () => {
      try {
        const params = new URLSearchParams({
          action: 'calificarProducto',
          productId: String(item.productId),
          clientPhone: phone,
          compradorToken: localStorage.getItem('comprador_token') || '',
          calificacion: String(calificacionSeleccionada),
          comentario: comentario,
          requestId: item.requestId || ''
        });
        const res = await fetch(_resolverApiUrlInspector('calificarProducto'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'No se pudo enviar la calificación');

        try {
          const ya = JSON.parse(localStorage.getItem('rated_products_' + phone) || '[]');
          if (!ya.includes(String(item.productId))) {
            ya.push(String(item.productId));
            localStorage.setItem('rated_products_' + phone, JSON.stringify(ya));
          }
        } catch (_) {}

        if (typeof window.showTemporaryMessage === 'function')
          window.showTemporaryMessage('¡Gracias por tu calificación!', 'success');
        close();
      } catch (err) {
        if (typeof window.showTemporaryMessage === 'function')
          window.showTemporaryMessage(err.message, 'error');
      }
    };

    if (typeof window.withButtonLoading === 'function') {
      await window.withButtonLoading(btn, ejecutar, 'Enviando…');
    } else {
      btn.disabled = true;
      const txt = btn.textContent;
      btn.textContent = 'Enviando…';
      try { await ejecutar(); } finally { btn.disabled = false; btn.textContent = txt; }
    }
  });
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initComunidad);
} else {
initComunidad();
}

// ── Modal: Registro de beneficiario (y también edición, ver 2do/3er parámetro) ─
// modoEdicion: true => es una solicitud de edición sobre un beneficiario ya aprobado
// idBeneficiario: id del beneficiario existente (requerido si modoEdicion=true)
// datosActuales: objeto con los valores actuales para prellenar el formulario
window.openBeneficiarioRegister = function(modoEdicion, idBeneficiario, datosActuales) {

  // Restaurar sesión desde localStorage si no existe
  if (!window.vendorSession) {
    try {
      const stored = localStorage.getItem('vendor_session');
      if (stored) {
        window.vendorSession = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('No se pudo restaurar sesión:', e);
    }
  }

  const old = document.getElementById('modal-beneficiario-register');
  if (old) old.remove();

  const d = datosActuales || {};
  const escv = s => String(s || '').replace(/"/g, '&quot;');

  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-register';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%; height:90%;overflow-y:auto;padding:24px 20px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${modoEdicion ? 'Editar tu fundación' : 'Registra tu Fundacion'}</h2>
        <button id="btn-close-ben-reg" style="background:none;border:none;font-size:22px;cursor:pointer;line-height:1;">×</button>
      </div>
      <p style="font-size:.8rem;color:#888;margin:0 0 14px;">${modoEdicion ? 'Estos cambios se enviarán como solicitud. El administrador comparará tu información actual con la nueva antes de aplicarla.' : 'Completa tu información. El administrador revisará tu solicitud y te contactará por WhatsApp.'}</p>
      <div id="ben-reg-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:12px;font-size:.82rem;"></div>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Nombre completo *</label>
      <input id="ben-nombre" type="text" value="${escv(d.nombre)}" placeholder="Tu nombre completo" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Organización (opcional)</label>
      <input id="ben-org" type="text" value="${escv(d.organizacion)}" placeholder="Nombre de la organización si aplica" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">País *</label>
<select id="ben-pais" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;background:#fff;"></select>

<label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Ciudad *</label>
<select id="ben-ciudad" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;background:#fff;"></select>

<label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Dirección / referencia *<span style="font-weight:400;color:#c2410c;"> · se muestra públicamente, no pongas un domicilio particular</span></label>
<input id="ben-ubicacion" type="text" value="${escv(d.ubicacion)}" placeholder="Ej. Calle X #123, Col. Centro" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Facebook (URL o usuario)</label>
      <input id="ben-facebook" type="text" value="${escv(d.facebook)}" placeholder="https://facebook.com/tu-pagina" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">¿Para qué necesitas las donaciones? *</label>
      <textarea id="ben-historia" rows="3" placeholder="Cuéntanos tu historia o propósito..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;resize:vertical;">${escv(d.historia)}</textarea>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">CLABE / Número de cuenta *</label>
      <input id="ben-cuenta" type="text" value="${escv(d.cuenta_bancaria)}" placeholder="18 dígitos CLABE o número de cuenta" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">WhatsApp (10 dígitos) *</label>
      <input id="ben-telefono" type="tel" value="${escv(d.telefono)}" placeholder="8671234567" maxlength="10" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:16px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Fotos (opcional, máx. 3 — puedes elegir varias a la vez)</label>
      <div style="display:flex;gap:8px;margin-bottom:16px;" id="ben-img-previews">
       
        
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-1">
          <span id="ben-img-placeholder-1" style="font-size:1.4rem;display:${d.imagen1 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-1"
     ${d.imagen1 ? `src="${escv(d.imagen1)}"` : ""}
     style="display:${d.imagen1 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-1" accept="image/*" multiple style="display:none;">
        </label>
       
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-2">
          <span id="ben-img-placeholder-2" style="font-size:1.4rem;display:${d.imagen2 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-2"
     ${d.imagen2 ? `src="${escv(d.imagen2)}"` : ""}
     style="display:${d.imagen2 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-2" accept="image/*" multiple style="display:none;">
        </label>
        
        
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-3">
          <span id="ben-img-placeholder-3" style="font-size:1.4rem;display:${d.imagen3 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-3"
     ${d.imagen3 ? `src="${escv(d.imagen3)}"` : ""}
     style="display:${d.imagen3 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-3" accept="image/*" multiple style="display:none;">
       
        
        
        </label>
      </div>
      <button id="btn-submit-ben" data-modo="${modoEdicion ? 'editar' : 'nuevo'}" data-id="${escv(idBeneficiario||'')}" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:800;font-size:.92rem;cursor:pointer;">${modoEdicion ? 'Enviar cambios' : 'Enviar solicitud'}</button>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-reg').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  if (typeof enlazarPaisCiudad === 'function') {
  const paisSel = document.getElementById('ben-pais');
  const ciudadSel = document.getElementById('ben-ciudad');
  if (paisSel && ciudadSel) {
    enlazarPaisCiudad(paisSel, ciudadSel);
    // Pre-llenar: primero con la sesión del vendedor (si ya trae pais/ciudad),
    // luego con los datos existentes del beneficiario (modo edición).
    const paisInicial = (window.vendorSession && window.vendorSession.pais) || d.pais || '';
    const ciudadInicial = (window.vendorSession && window.vendorSession.ciudad) || d.ciudad || '';
    if (paisInicial) fijarUbicacion(paisSel, ciudadSel, paisInicial, ciudadInicial);
  }
}
  // Preview de imágenes
  function benUpdatePreview(n, file) {
    const preview = document.getElementById('ben-img-preview-' + n);
    const placeholder = document.getElementById('ben-img-placeholder-' + n);
    if (!preview || !placeholder) return;
    if (!file) {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = '';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  }
  function benSetSlotFile(n, file) {
    const input = document.getElementById('ben-img-' + n);
    if (!input) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) { /* ignore */ }
    benUpdatePreview(n, file);
  }
  [1,2,3].forEach(n => {
    document.getElementById('ben-img-' + n)?.addEventListener('change', function() {
      const files = Array.from(this.files || []);
      if (!files.length) return;
      let slot = n;
      for (const file of files) {
        if (slot > 3) break;
        benSetSlotFile(slot, file);
        slot++;
      }
    });
  });

  // Evento de envío
  document.getElementById('btn-submit-ben')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const modo = this.dataset.modo === 'editar' ? 'editar' : 'nuevo';
    const idBen = this.dataset.id || '';
    const showMsg = (txt, ok) => {
      const el = document.getElementById('ben-reg-msg');
      el.innerHTML = (ok ? Icon('check') : Icon('error')) + ' <span></span>';
      el.querySelector('span').textContent = txt;
      el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };

    // Validar campos
    const nombre     = document.getElementById('ben-nombre').value.trim();
const tel        = document.getElementById('ben-telefono').value.replace(/\D/g, '');
const pais       = document.getElementById('ben-pais').value;
const ciudad     = document.getElementById('ben-ciudad').value;
const ubicacion  = document.getElementById('ben-ubicacion').value.trim();
const historia   = document.getElementById('ben-historia').value.trim();
const cuenta     = document.getElementById('ben-cuenta').value.trim();

if (!nombre)           return showMsg('El nombre es requerido.', false);
if (!pais)             return showMsg('El país es requerido.', false);
if (!ciudad)           return showMsg('La ciudad es requerida.', false);
if (!ubicacion)        return showMsg('La dirección es requerida.', false);
if (!historia)         return showMsg('Cuéntanos tu propósito.', false);
if (!cuenta)           return showMsg('La cuenta bancaria es requerida.', false);
if (tel.length !== 10) return showMsg('El WhatsApp debe tener 10 dígitos.', false);

    // Restaurar sesión por si no se hizo antes
    if (!window.vendorSession) {
      try {
        const stored = localStorage.getItem('vendor_session');
        if (stored) window.vendorSession = JSON.parse(stored);
      } catch (e) {}
    }

    const vendor = window.vendorSession;
    if (!vendor || !vendor.token) {
      showMsg('Debes iniciar sesión como vendedor para registrarte como beneficiario. Ve a "Mi cuenta de vendedor".', false);
      // Opcional: agregar un enlace para ir a vendedor.html
            const link = document.createElement('a');
      link.href = 'vendedor.html';
      link.innerHTML = 'Ir a mi cuenta de vendedor <span style="font-size:1em;">→</span>';
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.gap = '6px';
      link.style.marginTop = '10px';
      link.style.padding = '8px 16px';
      link.style.borderRadius = '999px';
      link.style.background = '#ffffff';
      link.style.color = 'var(--color-accent-solid)';
      link.style.fontWeight = '700';
      link.style.fontSize = '.82rem';
      link.style.textDecoration = 'none';
      link.style.boxShadow = '0 1px 3px rgba(0,0,0,.12)';
      link.style.transition = 'background .15s, color .15s';
      link.addEventListener('mouseenter', () => { link.style.background = 'var(--color-accent-solid)'; link.style.color = '#ffffff'; });
      link.addEventListener('mouseleave', () => { link.style.background = '#ffffff'; link.style.color = 'var(--color-accent-solid)'; });
      document.getElementById('ben-reg-msg').appendChild(link);
      return;
    }

    // Validar que el teléfono coincida con el de la sesión (opcional)
    if (vendor.telefono && String(vendor.telefono).replace(/\D/g, '') !== tel) {
      showMsg('El teléfono no coincide con tu cuenta de vendedor. Usa el número registrado: ' + vendor.telefono, false);
      return;
    }

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      async function uploadBenImg(file) {
        const reader = new FileReader();
        const base64 = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const params = new URLSearchParams({
          action: 'uploadImageVendedor',
          data: base64,
          mimeType: file.type,
          fileName: file.name,
          vendorToken: vendor.token
        });
        const r = await fetch(CATALOGO_API_URL_INSPECTOR, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Error al subir imagen');
        return j.url || '';
      }

      const imgUrls = ['', '', ''];
      for (let n = 1; n <= 3; n++) {
        const fileInput = document.getElementById('ben-img-' + n);
        if (fileInput && fileInput.files[0]) {
          btn.textContent = `Subiendo foto ${n}…`;
          try {
            imgUrls[n - 1] = await uploadBenImg(fileInput.files[0]);
          } catch (e) {
            showMsg('Error al subir la imagen ' + n + ': ' + e.message, false);
            btn.disabled = false;
            btn.textContent = 'Enviar solicitud';
            return;
          }
        }
      }

      btn.textContent = modo === 'editar' ? 'Enviando cambios…' : 'Enviando solicitud…';
      const payload = {
  action: modo === 'editar' ? 'solicitarEdicionBeneficiario' : 'registrarBeneficiario',
  nombre,
  organizacion: document.getElementById('ben-org').value.trim(),
  pais,
  ciudad,
  ubicacion,
  facebook: document.getElementById('ben-facebook').value.trim(),
  historia,
  cuenta_bancaria: cuenta,
  telefono: tel,
  imagen1: imgUrls[0],
  imagen2: imgUrls[1],
  imagen3: imgUrls[2],
  vendorToken: vendor.token
};
      if (modo === 'editar') payload.id_beneficiario = idBen;
      const res = await fetch(_resolverApiUrlInspector(payload.action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });

      const data = await res.json();
      if (data.ok) {
        showMsg(modo === 'editar' ? '¡Cambios enviados! El administrador los revisará antes de aplicarlos.' : '¡Solicitud enviada! El administrador te contactará pronto por WhatsApp.', true);
        btn.textContent = 'Enviado';
        setTimeout(() => {
          const modal = document.getElementById('modal-beneficiario-register');
          if (modal) modal.remove();
        }, 3000);
      } else {
        showMsg((data.error || 'Error al enviar'), false);
        btn.disabled = false;
        btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
      }
    } catch (err) {
      console.error('Error en registro beneficiario:', err);
      showMsg('Error de conexión: ' + err.message, false);
      btn.disabled = false;
      btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
    }
  });
};

// ── Modal: Ver detalle de beneficiario ──────────────────────
window.openBeneficiarioModal = async function(beneficiarioId) {
  if (!beneficiarioId) return;
  const old = document.getElementById('modal-beneficiario-detalle');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-detalle';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%;max-height:96vh;overflow-y:auto;padding:24px 20px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('heart-fill')} Beneficiario</h2>
        <div style="display:flex;align-items:center;gap:12px;">
          <button id="btn-report-ben" title="Reportar" style="background:none;border:none;cursor:pointer;color:var(--color-text-soft);">${Icon('flag',{size:16})}</button>
          <button id="btn-close-ben-det" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button>
        </div>
      </div>
      <div id="ben-det-body"><p style="color:#aaa;text-align:center;padding:24px 0;">Cargando…</p></div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-det').onclick = () => modal.remove();
  document.getElementById('btn-report-ben').onclick = () => showReportBeneficiarioDialog(beneficiarioId);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  try {
    const res  = await fetch(_resolverApiUrlInspector('obtenerBeneficiario') + '?' + new URLSearchParams({ action:'obtenerBeneficiario', id: beneficiarioId }));
    const data = await res.json();
    const body = document.getElementById('ben-det-body');
    if (!data.ok || !data.beneficiario) { body.innerHTML = '<p style="color:#ef4444;text-align:center;">No se pudo cargar.</p>'; return; }
    const b = data.beneficiario;
    const esc2 = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const imgs = [b.imagen1, b.imagen2, b.imagen3].filter(Boolean);
    const inicial = esc2(b.nombre).charAt(0).toUpperCase() || '?';
    body.innerHTML = `
      ${imgs.length ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;">${imgs.map(u=>`<img src="${esc2(u)}" style="height:140px;border-radius:14px;object-fit:cover;flex-shrink:0;border:1px solid var(--color-border-subtle);">`).join('')}</div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--color-accent-soft);color:var(--color-accent-solid);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;flex-shrink:0;">${inicial}</div>
        <div style="min-width:0;">
          <h3 style="margin:0;font-size:1.05rem;color:var(--color-text-primary);">${esc2(b.nombre)}</h3>
          ${b.organizacion ? `<p style="margin:2px 0 0;font-size:.8rem;color:var(--color-text-soft);">${esc2(b.organizacion)}</p>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-surface-2);color:var(--color-text-muted);border-radius:20px;padding:5px 12px;font-size:.78rem;">${Icon('map-pin',{size:13})} ${esc2(b.ubicacion)}</span>
        ${b.facebook ? `<a href="${esc2(b.facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:var(--color-info-bg);color:var(--color-info);border-radius:20px;padding:5px 12px;font-size:.78rem;text-decoration:none;font-weight:600;">Facebook ${Icon('arrow-right',{size:12})}</a>` : ''}
      </div>
      <div style="background:var(--color-warning-bg);border-radius:12px;padding:14px;margin-bottom:14px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:.75rem;color:var(--color-warning);text-transform:uppercase;letter-spacing:.03em;">Sobre este refugio</p>
        <p style="margin:0;font-size:.85rem;line-height:1.6;color:var(--color-text-primary);">${esc2(b.historia)}</p>
      </div>
      <p style="margin:0 0 6px;font-weight:700;font-size:.75rem;color:var(--color-text-soft);text-transform:uppercase;letter-spacing:.03em;">Datos de pago directo</p>
      <div style="position:relative;border-radius:16px;padding:18px;background:linear-gradient(135deg,var(--color-primary),var(--color-accent-solid));box-shadow:0 6px 16px rgba(0,0,0,.18);color:#fff;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.12);"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;">
          <span style="font-size:.7rem;opacity:.8;letter-spacing:.05em;">CUENTA / CLABE</span>
          <button id="btn-copy-cuenta" style="border:none;background:rgba(255,255,255,.22);color:#fff;border-radius:8px;padding:5px 10px;font-size:.7rem;font-weight:700;cursor:pointer;backdrop-filter:blur(2px);">Copiar</button>
        </div>
        <p style="margin:22px 0 18px;font-size:1.05rem;font-family:monospace;letter-spacing:.12em;word-break:break-all;position:relative;">${esc2(b.cuenta_bancaria).replace(/(.{4})/g,'$1 ').trim()}</p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;">
          <div>
            <span style="display:block;font-size:.6rem;opacity:.75;">TITULAR</span>
            <span style="font-size:.82rem;font-weight:700;">${esc2(b.nombre)}</span>
          </div>
          ${Icon('heart-fill',{size:20})}
        </div>
      </div>`;

    mostrarDonarEnLinea(beneficiarioId, body);
    const copyBtn = document.getElementById('btn-copy-cuenta');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(b.cuenta_bancaria || '');
          copyBtn.textContent = '¡Copiado!';
          setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        } catch (e) {
          copyBtn.textContent = 'Error';
          setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        }
      });
    }
  } catch(err) {
    const body = document.getElementById('ben-det-body');
    if (body) body.innerHTML = '<p style="color:#ef4444;text-align:center;">Error de conexión.</p>';
  }
};

// Donar en línea al beneficiario: monto + las pasarelas que tenga conectadas (Stripe y/o Mercado Pago). El dinero
// le cae directo en su cuenta; Z&R no cobra comisión. Si no tiene ninguna, solo queda la CLABE de arriba.
async function mostrarDonarEnLinea(beneficiarioId, body) {
  const prov = await fetch(VENTAS_API_URL_INSPECTOR + '?' + new URLSearchParams({ action: 'proveedoresDonacion', beneficiario_id: beneficiarioId }))
    .then(r => r.json()).catch(() => null);
  if (!prov || !prov.ok || !prov.proveedores.length || typeof botonesPago !== 'function') return;
  const sec = document.createElement('div');
  sec.style.cssText = 'margin-top:18px;';
  const chip = 'flex:1;padding:9px 0;border-radius:10px;border:1.5px solid var(--color-border-subtle,#e5e5e5);background:var(--color-surface-2,#f7f7f7);color:var(--color-text-primary,#2a1a16);font-weight:700;cursor:pointer;';
  sec.innerHTML = `<style>.don-btn{display:block;width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;background:var(--color-accent-solid,#ff3d7f);color:#fff;font-weight:700;font-size:.9rem;cursor:pointer}.don-btn.sec{background:#00b1ea}</style>
    <p style="margin:0 0 8px;font-weight:700;font-size:.75rem;color:var(--color-text-soft);text-transform:uppercase;letter-spacing:.03em;">Donar en línea</p>
    <div style="display:flex;gap:8px;">${[50, 100, 200].map(m => `<button type="button" data-monto="${m}" style="${chip}">$${m}</button>`).join('')}
      <input id="don-monto" type="number" inputmode="numeric" min="${prov.min}" max="${prov.max}" placeholder="Otro" style="flex:1.3;min-width:0;padding:9px;border-radius:10px;border:1.5px solid var(--color-border-subtle);font-size:.9rem;"></div>
    <div id="don-pago">${botonesPago(prov.proveedores, 'don-btn', 'don-btn sec')}</div>
    <p style="margin:6px 0 0;font-size:.72rem;color:var(--color-text-soft);">Tu donación llega completa y directo a su cuenta.</p>`;
  body.appendChild(sec);
  const input = sec.querySelector('#don-monto');
  sec.querySelectorAll('[data-monto]').forEach(c => c.addEventListener('click', () => {
    input.value = c.dataset.monto;
    sec.querySelectorAll('[data-monto]').forEach(o => { o.style.borderColor = o === c ? 'var(--color-accent-solid,#ff3d7f)' : ''; });
  }));
  sec.querySelectorAll('[data-proveedor]').forEach(btn => btn.addEventListener('click', () => {
    const monto = Number(input.value);
    if (!(monto >= prov.min && monto <= prov.max)) { input.focus(); input.style.borderColor = '#dc2626'; input.placeholder = `$${prov.min}–$${prov.max}`; return; }
    irAPagar(btn, proveedor => fetch(VENTAS_API_URL_INSPECTOR, { method: 'POST',
      body: new URLSearchParams({ action: 'crearPreferenciaDonacion', beneficiario_id: beneficiarioId, monto, proveedor }) }).then(r => r.json()));
  }));
}

// ── Modal: Reportar beneficiario (info falsa, estafa, robo de identidad, etc.) ──
function showReportBeneficiarioDialog(benId) {
  const motivos = ['Información falsa', 'Posible estafa', 'Robo de identidad', 'Otro'];
  const modal = document.createElement('div');
  modal.className = 'custom-alert-modal';
  modal.style.zIndex = '100001';
  modal.innerHTML = `<div class="custom-alert-content" style="max-width:380px;width:90%;">
    <div class="custom-alert-header"><h3>Reportar beneficiario</h3></div>
    <div class="custom-alert-body">
      <p style="margin-bottom:12px;font-size:13px;color:var(--color-text-muted,#666);">¿Por qué estás reportando este beneficiario?</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${motivos.map(m => `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border-radius:10px;border:1.5px solid #e0e0e0;">
          <input type="radio" name="ben-report-reason" value="${m}"><span style="font-size:13px;">${m}</span></label>`).join('')}
        <div id="ben-report-otro-field" style="display:none;"><input type="text" id="ben-report-otro-text" placeholder="Describe el problema…" maxlength="200" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #e0e0e0;font-size:13px;box-sizing:border-box;"></div>
      </div>
    </div>
    <div class="custom-alert-footer">
      <button class="custom-alert-btn cancel" id="ben-report-cancel">Cancelar</button>
      <button class="custom-alert-btn confirm" id="ben-report-confirm" style="background:var(--gradient-accent);">${Icon('flag')} Enviar reporte</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('input[name="ben-report-reason"]').forEach(r => r.addEventListener('change', () => {
    modal.querySelector('#ben-report-otro-field').style.display = r.value === 'Otro' ? 'block' : 'none';
  }));
  const close = () => modal.remove();
  modal.querySelector('#ben-report-cancel').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('#ben-report-confirm').onclick = async () => {
    const sel = modal.querySelector('input[name="ben-report-reason"]:checked');
    if (!sel) return window.showTemporaryMessage?.('Selecciona un motivo', 'error');
    let motivo = sel.value;
    if (motivo === 'Otro') {
      const t = modal.querySelector('#ben-report-otro-text').value.trim();
      if (!t) return window.showTemporaryMessage?.('Describe el motivo', 'error');
      motivo = 'Otro: ' + t;
    }
    try {
      const res = await fetch(_resolverApiUrlInspector('reportarBeneficiario'), {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'reportarBeneficiario', beneficiario_id: benId, motivo, telefonoUsuario: localStorage.getItem('client_phone') || '' })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al enviar reporte');
      window.showTemporaryMessage?.('Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura. 🙏', 'success');
      close();
    } catch (err) {
      window.showTemporaryMessage?.('No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
    }
  };
}

// Modal para donar un producto propio a un refugio/beneficiario específico,
// abierto desde su card en la sección "Ver Refugios". Reutiliza las mismas
// acciones del backend (asignarDonacion/desasignarDonacion) que usa
// vendedor.html, pero aquí el punto de partida es el beneficiario: primero
// se elige a quién donar (la card en la que se dio clic) y luego cuál de
// los productos propios donarle.
window.openDonarARefugioModal = async function(beneficiario) {
  if (!window.vendorSession || !window.vendorSession.token) {
    window.showTemporaryMessage && window.showTemporaryMessage('Inicia sesión como vendedor para donar un producto', 'error');
    return;
  }
  const esc = window.escapeHtml || (s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const optUrl = window.optimizeDriveUrl || (u => u);

  const old = document.getElementById('modal-donar-refugio');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-donar-refugio';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:0 0 36px;">
      <div style="position:sticky;top:0;background:#fff;z-index:1;padding:16px 20px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;color:#111;">${Icon('heart-fill')} Donar a ${esc(beneficiario.nombre || 'refugio')}</h2>
        <button id="btn-close-donar-refugio" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1;">×</button>
      </div>
      <div id="donar-refugio-body" style="padding:16px 20px 0;text-align:center;color:#aaa;">Cargando tus productos…</div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-donar-refugio').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const body = document.getElementById('donar-refugio-body');

  const cargarProductos = async () => {
    body.style.textAlign = 'center';
    body.style.color = '#aaa';
    body.innerHTML = 'Cargando tus productos…';
    try {
      const url = _resolverApiUrlInspector('misProductosComunidad') + '?' + new URLSearchParams({
        action: 'misProductosComunidad', vendorToken: window.vendorSession.token, limit: '200', page: '1'
      });
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al cargar tus productos');
      renderListaProductos(data.products || []);
    } catch (e) {
      body.innerHTML = `<p style="color:#ef4444;">Error al cargar: ${esc(e.message || e)}</p>`;
    }
  };

  const renderListaProductos = (productos) => {
    body.style.textAlign = '';
    body.style.color = '';
    const esDeEsteRefugio = p => (p.donado === true || p.donado === 'TRUE' || p.donado === 'true') && String(p.beneficiario_id || '') === String(beneficiario.id);
    const estaDonado = p => p.donado === true || p.donado === 'TRUE' || p.donado === 'true';
    const yaDonados = productos.filter(esDeEsteRefugio);
    const disponibles = productos.filter(p => !estaDonado(p));

    const filaProducto = (p, esQuitar) => {
      const imgUrl = p.imagen1 ? optUrl(p.imagen1, 48) : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f5f5f5;">
        ${imgUrl ? `<img src="${esc(imgUrl)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:44px;height:44px;background:#f5f5f8;border-radius:8px;flex-shrink:0;"></div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:.83rem;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nombre || '')}</div>
          <div style="font-size:.72rem;color:#888;">$${Number(p.precio || 0).toLocaleString()} · Stock: ${p.stock || 0}</div>
        </div>
        ${esQuitar
          ? `<button class="btn-quitar-donacion-refugio" data-pid="${esc(p.id)}" style="flex-shrink:0;padding:7px 12px;border:none;border-radius:20px;background:#fee2e2;color:#b91c1c;font-weight:700;font-size:.75rem;cursor:pointer;">Quitar</button>`
          : `<button class="btn-asignar-donacion-refugio" data-pid="${esc(p.id)}" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:none;background:#f5f5f8;color:#f97316;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${Icon('heart-fill')}</button>`}
      </div>`;
    };

    body.innerHTML = `
      ${yaDonados.length ? `
      <p style="font-size:.78rem;font-weight:700;color:#166534;margin:0 0 6px;">Ya donados a este refugio</p>
      <div style="margin-bottom:16px;">${yaDonados.map(p => filaProducto(p, true)).join('')}</div>` : ''}
      <p style="font-size:.78rem;font-weight:700;color:#555;margin:0 0 6px;">Elige un producto para donar</p>
      <div id="donar-refugio-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:10px;font-size:.82rem;"></div>
      ${disponibles.length === 0
        ? '<p style="color:#aaa;text-align:center;padding:16px 0;">No tienes productos disponibles para donar.<br><small>Un producto ya donado a otro refugio no puede reasignarse sin quitarlo primero.</small></p>'
        : `<div>${disponibles.map(p => filaProducto(p, false)).join('')}</div>`}
    `;

    const showMsg = (txt, ok) => {
      const el = document.getElementById('donar-refugio-msg');
      if (!el) return;
      el.textContent = txt;
      el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };

    body.querySelectorAll('.btn-asignar-donacion-refugio').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const params = new URLSearchParams({ action: 'asignarDonacion', producto_id: btn.dataset.pid, beneficiario_id: beneficiario.id, vendor_token: window.vendorSession.token });
          const res = await fetch(_resolverApiUrlInspector('asignarDonacion'), {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
          });
          const data = await res.json();
          if (data.ok) { showMsg('Donación asignada correctamente', true); cargarProductos(); }
          else { showMsg(data.error || 'Error', false); btn.disabled = false; }
        } catch (e) { showMsg('Error de conexión', false); btn.disabled = false; }
      });
    });

    body.querySelectorAll('.btn-quitar-donacion-refugio').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Quitando…';
        try {
          const params = new URLSearchParams({ action: 'desasignarDonacion', producto_id: btn.dataset.pid, vendor_token: window.vendorSession.token });
          const res = await fetch(_resolverApiUrlInspector('desasignarDonacion'), {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
          });
          const data = await res.json();
          if (data.ok) { showMsg('Donación removida', true); cargarProductos(); }
          else { showMsg(data.error || 'Error', false); btn.disabled = false; btn.textContent = 'Quitar'; }
        } catch (e) { showMsg('Error de conexión', false); btn.disabled = false; btn.textContent = 'Quitar'; }
      });
    });
  };

  cargarProductos();
};

// Fin del IIFE
})();
