/**
 * cover-portada.js
 * Módulo compartido para la "portada" personalizable del vendedor
 * (vendedor.html panel de ajustes + perfil-vendedor.html público).
 *
 * Se usa en ambas páginas, así que se carga como <script> normal
 * (sin módulos) antes de vendedor-unificado.js / la lógica de perfil.
 *
 * -----------------------------------------------------------------
 * CÓMO AGREGAR ICONOS (Tabler Icons - https://tabler.io/icons):
 * 1. Abre el icono en tabler.io/icons, copia solo el contenido interno
 *    del <svg> (los <path>/<circle>/etc, viewBox 0 0 24 24).
 * 2. Agrega una entrada nueva en COVER_ICON_LIBRARY, ej:
 *
 *    shirt: {
 *      label: 'Playera',
 *      svg: '<path d="M8 3h8l4 4-3 3-1-1v9a2 2 0 01-2 2h-4..."/>'
 *    },
 *
 * 3. Listo — aparece automáticamente en el picker de íconos y se puede
 *    seleccionar para la portada.
 * -----------------------------------------------------------------
 */

const COVER_ICON_LIBRARY = {
  // ── Reemplaza/añade con los paths reales de Tabler Icons ──
  shirt: {
    label: 'Playera',
    svg: '<path d="M8 3h8l4 4-3 3-1-1v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9l-1 1-4-3z"/>'
  },
  hanger: {
    label: 'Gancho',
    svg: '<path d="M12 3a2 2 0 1 1 2 2c0 1-1 1.5-2 2.2M12 7.2c-4 2.6-8 4.6-8 7.3 0 1.4 1.6 2.5 8 2.5s8-1.1 8-2.5c0-2.7-4-4.7-8-7.3z"/>'
  },
  bag: {
    label: 'Bolsa',
    svg: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
  },
  heart: {
    label: 'Corazón',
    svg: '<path d="M12 20s-7-4.35-9.5-8.5C.7 8 2.3 4.5 6 4.5c2 0 3.5 1.2 4 2.3.5-1.1 2-2.3 4-2.3 3.7 0 5.3 3.5 3.5 7-2.5 4.15-9.5 8.5-9.5 8.5z"/>'
  },
  star: {
    label: 'Estrella',
    svg: '<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/>'
  },
  sparkle: {
    label: 'Destello',
    svg: '<path d="M12 3v4M12 17v4M4 12h4M16 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>'
  }
};

/** Aclara/oscurece un color hex un % dado (negativo = oscurecer). */
function hexShade(hex, percent) {
  hex = (hex || '#7c3aed').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16) || 0;
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const amt = Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/**
 * Construye un tile SVG (mosaico) con los iconos elegidos, en un patrón
 * tipo "wallpaper" con filas alternadas (mismo estilo que hero-patterns).
 * Devuelve { svg, tileW, tileH } o null si no hay iconos válidos.
 */
function buildCoverPatternSvg(iconIds, iconColor) {
  const CELL = 68;
  const ids = (iconIds || []).filter(id => COVER_ICON_LIBRARY[id]).slice(0, 6);
  if (!ids.length) return null;

  const tileW = CELL * ids.length;
  const tileH = CELL * 2;

  let defs = '';
  ids.forEach(id => {
    defs += `<symbol id="cov-${id}" viewBox="0 0 24 24">${COVER_ICON_LIBRARY[id].svg}</symbol>`;
  });

  let uses = '';
  ids.forEach((id, i) => {
    // Fila 1
    const x1 = i * CELL + CELL / 2;
    uses += `<use href="#cov-${id}" x="${x1 - 14}" y="${CELL / 2 - 14}" width="28" height="28" transform="rotate(${i % 2 ? -8 : 8} ${x1} ${CELL / 2})"/>`;
    // Fila 2, offset medio-cell para efecto "ladrillo"
    const idB = ids[(i + Math.ceil(ids.length / 2)) % ids.length];
    const x2 = i * CELL + CELL;
    uses += `<use href="#cov-${idB}" x="${x2 - 14}" y="${CELL * 1.5 - 14}" width="28" height="28" transform="rotate(${i % 2 ? 8 : -8} ${x2} ${CELL * 1.5})"/>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}">`
    + `<defs>${defs}</defs>`
    + `<g fill="none" stroke="${iconColor || '#ffffff'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">${uses}</g>`
    + `</svg>`;

  return { svg, tileW, tileH };
}

/** Calcula los estilos CSS (background-image/repeat/size) para la portada. */
function coverBackgroundStyles(bgColor, iconIds, iconColor) {
  const base = bgColor || '#7c3aed';
  const dark = hexShade(base, -14);
  let backgroundImage = `linear-gradient(135deg, ${base}, ${dark})`;
  let backgroundRepeat = 'no-repeat';
  let backgroundSize = 'cover';

  const pattern = buildCoverPatternSvg(iconIds, iconColor);
  if (pattern) {
    const encoded = encodeURIComponent(pattern.svg).replace(/'/g, '%27').replace(/"/g, '%22');
    backgroundImage = `url("data:image/svg+xml,${encoded}"), linear-gradient(135deg, ${base}, ${dark})`;
    backgroundRepeat = 'repeat, no-repeat';
    backgroundSize = `${pattern.tileW}px ${pattern.tileH}px, cover`;
  }
  return { backgroundImage, backgroundRepeat, backgroundSize, backgroundColor: base };
}

/** Aplica la portada a un elemento del DOM. */
function applyCoverBackground(el, bgColor, iconIds, iconColor) {
  if (!el) return;
  const s = coverBackgroundStyles(bgColor, iconIds, iconColor);
  el.style.backgroundImage = s.backgroundImage;
  el.style.backgroundRepeat = s.backgroundRepeat;
  el.style.backgroundSize = s.backgroundSize;
  el.style.backgroundColor = s.backgroundColor;
}

/** Parsea el campo cover_icons guardado en Sheets (JSON string) a array. */
function parseCoverIcons(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/** Dibuja el grid de checkboxes para elegir iconos (usado en vendedor.html). */
function renderCoverIconPicker(containerEl, selectedIds, onChange) {
  if (!containerEl) return;
  const selected = new Set(selectedIds || []);
  containerEl.innerHTML = Object.entries(COVER_ICON_LIBRARY).map(([id, def]) => `
    <label data-icon-id="${id}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:2px solid ${selected.has(id) ? '#7c3aed' : '#e5e7eb'};border-radius:10px;cursor:pointer;background:${selected.has(id) ? '#f5f3ff' : '#fff'};">
      <input type="checkbox" data-cover-icon-checkbox value="${id}" ${selected.has(id) ? 'checked' : ''} style="display:none;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${def.svg}</svg>
      <span style="font-size:.65rem;color:#555;text-align:center;">${def.label}</span>
    </label>
  `).join('');

  containerEl.querySelectorAll('label[data-icon-id]').forEach(label => {
    label.addEventListener('click', (e) => {
      e.preventDefault();
      const id = label.dataset.iconId;
      const checkbox = label.querySelector('input');
      const currentlySelected = containerEl.querySelectorAll('input[data-cover-icon-checkbox]:checked').length;

      if (!checkbox.checked && currentlySelected >= 6) {
        return; // límite de 6 iconos
      }
      checkbox.checked = !checkbox.checked;
      label.style.borderColor = checkbox.checked ? '#7c3aed' : '#e5e7eb';
      label.style.background  = checkbox.checked ? '#f5f3ff' : '#fff';
      if (typeof onChange === 'function') {
        const ids = Array.from(containerEl.querySelectorAll('input[data-cover-icon-checkbox]:checked')).map(cb => cb.value);
        onChange(ids);
      }
    });
  });
}
