/* Listas de festividades, festivales escolares, temporadas y categorías de ZNR (un solo lugar para editarlas).
   Lo usan: vendedor.html (formulario), comunidad.html (filtro), index.html (sección Comunidad)
   y las tarjetas de producto (chips). CONTROL (banners-temporada.js) copia la lista de temporadas: si cambias una, cambia la otra. */
(function () {
  const LISTAS = {
    festividad: [
      'Año Nuevo', 'Día de Reyes', 'Día de la Candelaria', 'San Valentín (Amor y Amistad)',
      'Día Internacional de la Mujer', 'Semana Santa', 'Día del Niño', 'Día de las Madres',
      'Día del Padre', 'Día del Maestro', 'Fiestas Patrias (Septiembre)', 'Halloween',
      'Día de Muertos', 'Acción de Gracias', 'Posadas', 'Navidad', 'Fin de Año'
    ],
    // Fechas en que las escuelas piden disfraz, vestuario o material (los nombres no deben repetir los de festividad).
    escolar: [ // en orden del calendario
      'Día de la Constitución', 'Día de la Bandera', 'Festival del Amor y la Amistad', 'Festival de primavera',
      'Festival del Día del Niño', 'Batalla de Puebla', 'Festival del Día de las Madres', 'Clausura y fin de curso',
      'Desfile y kermés de Fiestas Patrias', 'Día de la Raza', 'Día de las Naciones Unidas',
      'Festival de Halloween y Día de Muertos', 'Desfile de la Revolución', 'Pastorela y posada escolar'
    ],
    temporada: [
      'Regreso a clases', 'Vacaciones de verano', 'Vacaciones de invierno', 'Graduaciones',
      'Temporada de bodas', 'Hot Sale', 'Buen Fin', 'Black Friday', 'Rebajas de fin de temporada'
    ]
  };
  const ETIQUETAS = { festividad: 'Festividades', escolar: 'Festivales escolares', temporada: 'Temporadas' };
  // Para el filtro de Comunidad: { 'Festividades': [...], 'Festivales escolares': [...], 'Temporadas': [...] }.
  const grupos = () => Object.fromEntries(Object.keys(LISTAS).map((t) => [ETIQUETAS[t], LISTAS[t]]));
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
  // ── Calendario: cuándo está "en curso" cada festividad/temporada (para "Podría interesarte") ──
  // Cada entrada devuelve los rangos [inicio, fin] que le corresponden en el año `y`.
  // Edita aquí las fechas si quieres que arranquen antes o terminen después.
  const D = (y, m, d, fin) => (fin ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d));
  // Rango fijo mes/día → mes/día; si cruza de año (ej. 26 dic → 3 ene) cubre ambos años.
  const fija = (m1, d1, m2, d2) => (y) => (m1 * 100 + d1 <= m2 * 100 + d2)
    ? [[D(y, m1, d1), D(y, m2, d2, true)]]
    : [[D(y, m1, d1), D(y + 1, m2, d2, true)], [D(y - 1, m1, d1), D(y, m2, d2, true)]];
  const nesimoDia = (y, mes0, diaSemana, n) => { // n-ésimo domingo(0)/jueves(4)... del mes
    const primero = new Date(y, mes0, 1);
    return new Date(y, mes0, 1 + ((diaSemana - primero.getDay() + 7) % 7) + (n - 1) * 7);
  };
  const pascua = (y) => { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31);
    return new Date(y, mes - 1, ((h + l - 7 * m + 114) % 31) + 1);
  };
  const VENTANAS = {
    'Año Nuevo': fija(12, 26, 1, 3),
    'Día de Reyes': fija(12, 28, 1, 6),
    'Día de la Candelaria': fija(1, 25, 2, 2),
    'San Valentín (Amor y Amistad)': fija(2, 1, 2, 14),
    'Día Internacional de la Mujer': fija(3, 1, 3, 8),
    'Semana Santa': (y) => { const p = pascua(y); return [[new Date(y, p.getMonth(), p.getDate() - 21), new Date(y, p.getMonth(), p.getDate(), 23, 59, 59)]]; },
    'Día del Niño': fija(4, 15, 4, 30),
    'Día del Maestro': fija(5, 8, 5, 15),
    'Día de las Madres': fija(5, 1, 5, 10),
    'Día del Padre': (y) => { const f = nesimoDia(y, 5, 0, 3); return [[D(y, 6, 1), new Date(y, 5, f.getDate(), 23, 59, 59)]]; },
    'Fiestas Patrias (Septiembre)': fija(9, 1, 9, 16),
    'Halloween': fija(10, 15, 10, 31),
    'Día de Muertos': fija(10, 20, 11, 2),
    'Acción de Gracias': (y) => { const f = nesimoDia(y, 10, 4, 4); return [[D(y, 11, 10), new Date(y, 10, f.getDate(), 23, 59, 59)]]; },
    'Posadas': fija(12, 12, 12, 24),
    'Día de la Constitución': fija(1, 25, 2, 5),
    'Día de la Bandera': fija(2, 10, 2, 24),
    'Festival del Amor y la Amistad': fija(2, 1, 2, 14),
    'Festival de primavera': fija(3, 5, 3, 21),
    'Festival del Día del Niño': fija(4, 15, 4, 30),
    'Batalla de Puebla': fija(4, 22, 5, 5),
    'Festival del Día de las Madres': fija(4, 25, 5, 10),
    'Clausura y fin de curso': fija(6, 15, 7, 15),
    'Desfile y kermés de Fiestas Patrias': fija(9, 1, 9, 16),
    'Día de la Raza': fija(10, 1, 10, 12),
    'Día de las Naciones Unidas': fija(10, 10, 10, 24),
    'Festival de Halloween y Día de Muertos': fija(10, 15, 11, 2),
    'Desfile de la Revolución': fija(11, 5, 11, 20),
    'Pastorela y posada escolar': fija(12, 1, 12, 20),
    'Navidad': fija(12, 1, 12, 25),
    'Fin de Año': fija(12, 20, 12, 31),
    'Regreso a clases': fija(7, 25, 9, 10),
    'Vacaciones de verano': fija(6, 15, 8, 15),
    'Vacaciones de invierno': fija(12, 10, 1, 6),
    'Graduaciones': fija(5, 20, 7, 10),
    'Temporada de bodas': (y) => [...fija(3, 1, 6, 30)(y), ...fija(9, 15, 11, 30)(y)],
    'Hot Sale': fija(5, 25, 6, 5),
    'Buen Fin': fija(11, 8, 11, 20),
    'Black Friday': fija(11, 20, 11, 30),
    'Rebajas de fin de temporada': (y) => [...fija(1, 7, 2, 15)(y), ...fija(7, 15, 8, 15)(y)]
  };

  // Festividades/temporadas en curso hoy (la que termina antes va primero).
  function activas(hoy) {
    const ahora = hoy instanceof Date ? hoy : new Date();
    const out = [];
    Object.keys(VENTANAS).forEach((nombre) => {
      const rangos = VENTANAS[nombre](ahora.getFullYear());
      const r = rangos.find(([ini, fin]) => ahora >= ini && ahora <= fin);
      if (r) out.push({ nombre, fin: r[1], dias: Math.ceil((r[1] - ahora) / 86400000) });
    });
    return out.sort((a, b) => a.dias - b.dias);
  }

  window.ZNR_TEMPORADAS = { listas: LISTAS, etiquetas: ETIQUETAS, grupos, chipsHTML, esMulticolor, activas, ventanas: VENTANAS };

  // ── Categorías de producto en grupos: el vendedor elige la exacta; el filtro de Comunidad muestra los grupos ──
  const CATEGORIAS = {
    'Ropa': ['Ropa de mujer', 'Ropa de hombre', 'Ropa infantil', 'Ropa interior y lencería', 'Ropa deportiva'],
    'Calzado y accesorios': ['Calzado', 'Accesorios', 'Joyería y bisutería', 'Relojes', 'Gafas y óptica', 'Bolsas y equipaje'],
    'Belleza y cuidado personal': ['Higiene y cuidado personal', 'Cuidado de la piel', 'Cuidado del cabello', 'Perfumes y fragancias', 'Cosméticos y maquillaje'],
    'Casa y hogar': ['Hogar', 'Decoración del hogar', 'Muebles', 'Textiles del hogar (ropa de cama, toallas)', 'Cocina y utensilios', 'Electrodomésticos', 'Jardín y exteriores', 'Herramientas y bricolaje'],
    'Tecnología': ['Electrónica y tecnología'],
    'Escolar y oficina': ['Papelería y oficina', 'Libros y revistas'],
    'Niños y juguetes': ['Juguetes y juegos'],
    'Otros': ['Mascotas', 'Automotriz', 'Alimentos y bebidas', 'Salud y bienestar']
  };
  // Las del catálogo propio de ZNR (Playeras, Calzado para Dama…) y las viejas se ubican por nombre; lo demás va a "Otros".
  const grupoCategoria = (c) => Object.keys(CATEGORIAS).find((g) => CATEGORIAS[g].includes(c))
    || (/calzado|zapat|tenis|accesorio/i.test(c) ? 'Calzado y accesorios' : /ropa|playera|blusa|pantal|short|su[eé]ter|chamarra|vestido|falda|camisa|sudadera/i.test(c) ? 'Ropa' : 'Otros');
  // Grupos con sus categorías + las que existan en productos (`presentes`) aunque no estén en la lista.
  const gruposCategoria = (presentes) => {
    const g = Object.fromEntries(Object.entries(CATEGORIAS).map(([k, v]) => [k, [...v]]));
    (presentes || []).forEach((c) => { const k = grupoCategoria(c); if (!g[k].includes(c)) g[k].push(c); });
    return g;
  };
  window.ZNR_CATEGORIAS = { grupos: gruposCategoria, grupoDe: grupoCategoria };
  // <select data-znr-categorias> (formulario del vendedor): la lista agrupada.
  const llenar = () => document.querySelectorAll('select[data-znr-categorias]').forEach((s) => s.insertAdjacentHTML('beforeend',
    Object.keys(CATEGORIAS).map((g) => `<optgroup label="${esc(g)}">${CATEGORIAS[g].map((c) => `<option>${esc(c)}</option>`).join('')}</optgroup>`).join('')));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', llenar) : llenar();
})();
