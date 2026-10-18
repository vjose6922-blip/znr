// Genera el bloque de datos de ciudades.js (formato compacto) y lo inserta en tu ciudades.js actual.
// Uso:   npm i country-state-city all-the-cities
//        node generar-ciudades.js ruta/a/ciudades.js [poblacionMinimaEEUU=5000] > ciudades.nuevo.js
// México se conserva tal cual está en el archivo; Guatemala, Colombia, Costa Rica, El Salvador y Honduras llevan TODOS sus
// municipios (country-state-city); Estados Unidos lleva los lugares con población >= el mínimo (all-the-cities / GeoNames).
const fs = require('fs');
const { State, City } = require('country-state-city');
const todas = require('all-the-cities');

const ruta = process.argv[2] || 'ciudades.js';
const POP_US = Number(process.argv[3] || 5000);
const src = fs.readFileSync(ruta, 'utf8');
const r4 = n => Math.round(Number(n) * 1e4) / 1e4;
const es = (a, b) => a[0].localeCompare(b[0], 'es');

// ── México: lo que ya tienes ──
const mx = {};
for (const m of src.matchAll(/\{ pais: 'México', estado: '([^']+)', ciudad: '([^']+)', lat: ([-\d.]+), lng: ([-\d.]+) \}/g))
  (mx[m[1]] ||= []).push([m[2], r4(m[3]), r4(m[4])]);
// (si el archivo ya está en formato compacto, vuelve a generar desde una copia con el formato original)

// ── Países latinos: todos los municipios ──
const limpiaEstado = (n) => ({
  'Bay Islands Department': 'Islas de la Bahía',
  'Archipiélago de San Andrés, Providencia y Santa Catalina': 'San Andrés y Providencia',
}[n] || n.replace(/ Department$| Province$/, '').replace(/^Provincia de /, ''));
function latino(iso) {
  const out = {};
  const estados = Object.fromEntries(State.getStatesOfCountry(iso).map(s => [s.isoCode, limpiaEstado(s.name)]));
  for (const c of City.getCitiesOfCountry(iso)) {
    const est = estados[c.stateCode]; if (!est) continue;
    const lista = (out[est] ||= []);
    if (lista.some(x => x[0].toLowerCase() === c.name.toLowerCase())) continue; // el valor "Ciudad, Estado" debe ser único
    lista.push([c.name, r4(c.latitude), r4(c.longitude)]);
  }
  for (const k in out) out[k].sort(es);
  return out;
}

// ── Estados Unidos: 50 estados + DC, nombres en español ──
const US = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'Distrito de Columbia', FL:'Florida', GA:'Georgia', HI:'Hawái', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Luisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Míchigan', MN:'Minnesota', MS:'Misisipi', MO:'Misuri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'Nuevo Hampshire', NJ:'Nueva Jersey', NM:'Nuevo México', NY:'Nueva York', NC:'Carolina del Norte', ND:'Dakota del Norte', OH:'Ohio', OK:'Oklahoma', OR:'Oregón', PA:'Pensilvania', RI:'Rhode Island', SC:'Carolina del Sur', SD:'Dakota del Sur', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'Virginia Occidental', WI:'Wisconsin', WY:'Wyoming' };
const us = {}, vistos = {};
for (const c of todas.filter(x => x.country === 'US' && x.population >= POP_US && US[x.adminCode]).sort((a, b) => b.population - a.population)) {
  const est = US[c.adminCode], k = est + '|' + c.name.toLowerCase();
  if (vistos[k]) continue; vistos[k] = 1; // mismo nombre en el mismo estado: se queda el más poblado
  (us[est] ||= []).push([c.name, r4(c.loc.coordinates[1]), r4(c.loc.coordinates[0])]);
}
for (const k in us) us[k].sort(es);

const datos = { 'México': mx, 'Colombia': latino('CO'), 'Costa Rica': latino('CR'), 'El Salvador': latino('SV'), 'Estados Unidos': us, 'Guatemala': latino('GT'), 'Honduras': latino('HN') };

// Valor único "Ciudad, Estado" también entre países
const usados = new Map(); const choques = [];
for (const [p, es_] of Object.entries(datos)) for (const [e, cs] of Object.entries(es_)) for (const [n] of cs) {
  const v = n + ', ' + e; if (usados.has(v) && usados.get(v) !== p) choques.push(v + ' (' + usados.get(v) + ' / ' + p + ')'); else usados.set(v, p);
}
if (choques.length) console.error('AVISO valores repetidos entre países:', choques.length, choques.slice(0, 10));

const cuerpo = Object.entries(datos).map(([p, estados]) => {
  const filas = Object.entries(estados).sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([e, cs]) =>
    `    ${JSON.stringify(e)}: [${cs.map(c => JSON.stringify(c)).join(',')}]`).join(',\n');
  return `  ${JSON.stringify(p)}: {\n${filas}\n  }`;
}).join(',\n');

const bloque = `// Fuente única de países/ciudades donde opera ZNR.
// Cobertura: México; Guatemala, Colombia, Costa Rica, El Salvador y Honduras (todos sus municipios); Estados Unidos (lugares de ${POP_US}+ habitantes).
// Formato compacto: { País: { Estado: [[ciudad, lat, lng], ...] } } (se expande abajo al formato de siempre).
// Datos: GeoNames (CC BY 4.0, vía all-the-cities) y country-state-city (MIT). Generado con generar-ciudades.js.
const _ZNR_DATOS = {
${cuerpo}
};
window.ZNR_CIUDADES = [];
for (const [pais, estados] of Object.entries(_ZNR_DATOS))
  for (const [estado, cs] of Object.entries(estados))
    for (const [ciudad, lat, lng] of cs) window.ZNR_CIUDADES.push({ pais, estado, ciudad, lat, lng });
`;
const fin = src.indexOf('\n];\n') + 4;
const resto = src.slice(fin);
process.stdout.write(bloque + resto);
const n = Object.values(datos).reduce((a, e) => a + Object.values(e).reduce((b, c) => b + c.length, 0), 0);
console.error('Total:', n, '|', Object.entries(datos).map(([p, e]) => p + ' ' + Object.values(e).reduce((b, c) => b + c.length, 0)).join(' | '));
