// ai-busqueda-visual.js
// Buscador de productos por foto en Comunidad (similitud visual).
// Se carga como <script type="module"> en comunidad.html.
//
// Flujo:
//   1. El vendedor/comprador toca el botón 📷 junto al buscador de texto y
//      elige/toma una foto.
//   2. Se calcula la "huella visual" (embedding) de esa foto en el navegador,
//      reutilizando el MISMO modelo y módulo del auto-tag de categoría
//      (ai-clasificador.js) — nada se carga ni se entrena de más.
//   3. Se descarga /embeddings.json de Firebase RTDB (público, sin login)
//      con la huella visual de cada producto del catálogo.
//   4. Se comparan por similitud de coseno, en el navegador, y se piden al
//      backend los datos completos SOLO de los mejores resultados.
//   5. Se reemplaza la grilla de Comunidad con esos resultados, ordenados
//      por similitud (más parecido primero).
//
// Si algo falla en cualquier paso (sin modelo, sin internet, sin
// embeddings todavía, etc.), simplemente no pasa nada — el buscador de
// texto normal sigue funcionando exactamente igual.

import { clasificarImagen } from './ai-clasificador.js';

const FIREBASE_EMBEDDINGS_URL = 'https://znr-live-default-rtdb.firebaseio.com/embeddings.json';
const MAX_RESULTADOS = 30;
const SIMILITUD_MINIMA = 0.35; // similitud de coseno mínima para considerar un producto "parecido"

let _embeddingsCache = null;
let _embeddingsCacheTs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos — evita re-descargar en cada búsqueda seguida

/**
 * Descarga la tabla de embeddings de Firebase (pública, solo lectura).
 * Se cachea un rato en memoria para no gastar bandwidth en búsquedas
 * repetidas seguidas.
 */
async function _obtenerEmbeddingsCatalogo() {
  const ahora = Date.now();
  if (_embeddingsCache && (ahora - _embeddingsCacheTs) < CACHE_TTL_MS) {
    return _embeddingsCache;
  }
  try {
    const res = await fetch(FIREBASE_EMBEDDINGS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Firebase respondió ${res.status}`);
    const datos = await res.json();
    _embeddingsCache = datos && typeof datos === 'object' ? datos : {};
    _embeddingsCacheTs = ahora;
    return _embeddingsCache;
  } catch (err) {
    console.error('[ai-busqueda-visual] No se pudo descargar la tabla de embeddings:', err);
    return null;
  }
}

function _similitudCoseno(a, b) {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Pide al backend los datos completos (nombre, precio, imagen, etc.) de los
 * IDs indicados. Devuelve solo los aprobados que encuentre.
 */
async function _obtenerProductosPorIds(ids) {
  if (!window.API_URL) return [];
  const url = window.API_URL + '?' + new URLSearchParams({
    action: 'obtenerProductosPorIds',
    ids: JSON.stringify(ids),
  });
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) return [];
  return data.productos || [];
}

function _mostrarEstadoBoton(boton, estado) {
  if (!boton) return;
  if (estado === 'buscando') {
    boton.classList.add('buscando');
    boton.innerHTML = Icon('clock');
  } else {
    boton.classList.remove('buscando');
    boton.innerHTML = Icon('camera');
  }
}

function _mostrarChipBusquedaVisual() {
  const bar = document.getElementById('comunidad-filter-chips');
  if (!bar) return;
  bar.style.display = 'flex';
  const chip = document.createElement('button');
  chip.className = 'filter-chip';
  chip.id = 'chip-busqueda-visual';
  chip.innerHTML = Icon('camera') + ' Búsqueda por foto <span class="chip-x">' + Icon('x') + '</span>';
  chip.addEventListener('click', () => {
    chip.remove();
    if (typeof window.restaurarBusquedaNormalComunidad === 'function') {
      window.restaurarBusquedaNormalComunidad();
    }
  });
  bar.prepend(chip);
}

async function _buscarPorFoto(file) {
  const boton = document.getElementById('busqueda-visual-btn');
  _mostrarEstadoBoton(boton, 'buscando');

  try {
    const resultado = await clasificarImagen(file);
    if (!resultado || !resultado.embedding) {
      console.error('[ai-busqueda-visual] clasificarImagen no devolvió embedding:', resultado);
      if (typeof window.showTemporaryMessage === 'function') {
        window.showTemporaryMessage('No se pudo analizar la foto, intenta con otra.', 'error');
      }
      return;
    }
    console.error(`[ai-busqueda-visual] Embedding de la foto de búsqueda: ${resultado.embedding.length} valores.`);

    const tabla = await _obtenerEmbeddingsCatalogo();
    if (!tabla) {
      if (typeof window.showTemporaryMessage === 'function') {
        window.showTemporaryMessage('El buscador por foto no está disponible ahora mismo.', 'error');
      }
      return;
    }
    console.error(`[ai-busqueda-visual] Tabla de embeddings descargada: ${Object.keys(tabla).length} productos.`);

    const todasLasSimilitudes = Object.entries(tabla)
      .map(([id, vector]) => ({ id, similitud: _similitudCoseno(resultado.embedding, vector) }))
      .sort((a, b) => b.similitud - a.similitud);
    console.error('[ai-busqueda-visual] Top 5 similitudes (antes del umbral):',
      todasLasSimilitudes.slice(0, 5).map(s => `${s.id}: ${s.similitud.toFixed(3)}`));

    const similitudes = todasLasSimilitudes
      .filter(r => r.similitud >= SIMILITUD_MINIMA)
      .slice(0, MAX_RESULTADOS);

    if (!similitudes.length) {
      console.error(`[ai-busqueda-visual] Ningún producto pasó el umbral de similitud (${SIMILITUD_MINIMA}). La similitud más alta encontrada fue ${todasLasSimilitudes[0]?.similitud.toFixed(3) ?? 'N/A'}.`);
      if (typeof window.showTemporaryMessage === 'function') {
        window.showTemporaryMessage('No encontramos productos parecidos a esa foto todavía.', 'info');
      }
      return;
    }

    const productos = await _obtenerProductosPorIds(similitudes.map(s => s.id));
    console.error(`[ai-busqueda-visual] IDs pedidos al backend: ${similitudes.length}, productos recibidos: ${productos.length}.`);

    const mapaSimilitud = new Map(similitudes.map(s => [String(s.id), s.similitud]));
    const productosOrdenados = productos
      .filter(p => mapaSimilitud.has(String(p.id)))
      .sort((a, b) => mapaSimilitud.get(String(b.id)) - mapaSimilitud.get(String(a.id)));

    if (!productosOrdenados.length) {
      console.error('[ai-busqueda-visual] El backend no devolvió productos que coincidan con los IDs pedidos (revisar obtenerProductosPorIds / estado=aprobado / tipo de id).');
      if (typeof window.showTemporaryMessage === 'function') {
        window.showTemporaryMessage('No encontramos productos parecidos a esa foto todavía.', 'info');
      }
      return;
    }

    if (typeof window.aplicarResultadosBusquedaVisual === 'function') {
      window.aplicarResultadosBusquedaVisual(productosOrdenados);
      _mostrarChipBusquedaVisual();
    }
  } catch (err) {
    console.error('[ai-busqueda-visual] Error en la búsqueda por foto:', err);
    if (typeof window.showTemporaryMessage === 'function') {
      window.showTemporaryMessage('Ocurrió un error buscando por foto.', 'error');
    }
  } finally {
    _mostrarEstadoBoton(boton, 'normal');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.getElementById('busqueda-visual-btn');
  const input = document.getElementById('busqueda-visual-input');
  if (!boton || !input) return;

  boton.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = ''; // permite volver a elegir la misma foto después
    if (file) _buscarPorFoto(file);
  });
});
