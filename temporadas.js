/* Listas de festividades y temporadas de ZNR (un solo lugar para editarlas).
   Lo usan: vendedor.html (formulario), comunidad.html (filtro), index.html (sección Comunidad)
   y las tarjetas de producto (chips). */
(function () {
  const LISTAS = {
    festividad: [
      'Año Nuevo', 'Día de Reyes', 'Día de la Candelaria', 'San Valentín (Amor y Amistad)',
      'Día Internacional de la Mujer', 'Semana Santa', 'Día del Niño', 'Día de las Madres',
      'Día del Padre', 'Día del Maestro', 'Fiestas Patrias (Septiembre)', 'Halloween',
      'Día de Muertos', 'Acción de Gracias', 'Posadas', 'Navidad', 'Fin de Año'
    ],
    temporada: [
      'Regreso a clases', 'Vacaciones de verano', 'Vacaciones de invierno', 'Graduaciones',
      'Temporada de bodas', 'Hot Sale', 'Buen Fin', 'Black Friday', 'Rebajas de fin de temporada'
    ]
  };
  const ETIQUETAS = { festividad: 'Festividades', temporada: 'Temporadas' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esMulticolor = (p) => !!p && (p.multicolor === true || p.multicolor === 'true' || p.multicolor === 'TRUE');

  // Chips para la tarjeta: temporada/festividad y "Multicolor".
  function chipsHTML(p) {
    if (!p) return '';
    const chips = [];
    if (p.temporada) {
      chips.push('<span class="znr-chip znr-chip-temporada" style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(168,85,247,.14);color:#a855f7;">' + esc(p.temporada) + '</span>');
    }
    if (esMulticolor(p)) {
      chips.push('<span class="znr-chip znr-chip-multicolor" style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:var(--color-surface-2,#f3f4f6);color:var(--color-text-main,#374151);border:1px solid var(--color-border-subtle,#e5e7eb);">'
        + '<span style="width:9px;height:9px;border-radius:50%;background:conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444);flex:none;"></span>Multicolor</span>');
    }
    return chips.length ? '<div class="znr-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">' + chips.join('') + '</div>' : '';
  }

  // <optgroup> para selects de filtro (el valor de cada opción es el nombre).
  function opcionesFiltroHTML() {
    return Object.keys(LISTAS).map((tipo) =>
      '<optgroup label="' + esc(ETIQUETAS[tipo]) + '">' + LISTAS[tipo].map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('') + '</optgroup>'
    ).join('');
  }

  window.ZNR_TEMPORADAS = { listas: LISTAS, etiquetas: ETIQUETAS, chipsHTML, opcionesFiltroHTML, esMulticolor };
})();
