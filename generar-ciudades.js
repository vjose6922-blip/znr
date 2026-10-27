// Genera los datos de ciudades y los reparte en dos archivos:
//   ciudades.js       → ciudades de 50 mil habitantes o más (POB_MIN) de cada país: las que usa casi todo el mundo.
//   ciudades-extra.js → todas las demás; la página lo carga solo cuando hace falta (selector de ciudad,
//                       "Usar mi ubicación" o una ciudad guardada que no está en ciudades.js).
// Uso:   npm i country-state-city all-the-cities
//        node generar-ciudades.js            (desde la carpeta del repo; reescribe los dos archivos)
//
// PARA AGREGAR UN PAÍS: añádelo a PAISES (nombre en español → código ISO) y vuelve a correr este script.
// El reparto grandes/chicas por población se hace solo, igual que con los demás países. No edites a mano
// los datos de ciudades.js / ciudades-extra.js: se pierden al volver a generar.
//
// México se conserva tal como está en los archivos (lista propia). Los demás llevan todos sus municipios
// (country-state-city), salvo Estados Unidos, que lleva los lugares de POB_MIN_US+ habitantes (all-the-cities / GeoNames).
// La población para el reparto sale de GeoNames (all-the-cities); una ciudad que no aparece ahí va a ciudades-extra.js.
const fs = require('fs');
const { State, City } = require('country-state-city');
const todas = require('all-the-cities');

const POB_MIN = 50000, POB_MIN_US = 5000;
const PAISES = { 'Colombia': 'CO', 'Costa Rica': 'CR', 'El Salvador': 'SV', 'Estados Unidos': 'US', 'Guatemala': 'GT', 'Honduras': 'HN' };
const r4 = n => Math.round(Number(n) * 1e4) / 1e4;
const es = (a, b) => a[0].localeCompare(b[0], 'es');
const llano = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── México: lo que ya tienen los archivos (las dos mitades) ──
const leer = (f, v) => fs.existsSync(f) ? new Function(fs.readFileSync(f, 'utf8').match(new RegExp(`(const|window\\.)\\s*${v} = (\\{[\\s\\S]*?\\n\\});`))[2].replace(/^/, 'return ').replace(/;$/, ''))() : {};
const actual = [leer('ciudades.js', '_ZNR_DATOS'), leer('ciudades-extra.js', '_ZNR_DATOS_EXTRA')];
const mx = {};
for (const d of actual) for (const [e, cs] of Object.entries(d['México'] || {})) (mx[e] ||= []).push(...cs);

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
  return out;
}

// ── Estados Unidos: 50 estados + DC, nombres en español ──
const US = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'Distrito de Columbia', FL:'Florida', GA:'Georgia', HI:'Hawái', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Luisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Míchigan', MN:'Minnesota', MS:'Misisipi', MO:'Misuri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'Nuevo Hampshire', NJ:'Nueva Jersey', NM:'Nuevo México', NY:'Nueva York', NC:'Carolina del Norte', ND:'Dakota del Norte', OH:'Ohio', OK:'Oklahoma', OR:'Oregón', PA:'Pensilvania', RI:'Rhode Island', SC:'Carolina del Sur', SD:'Dakota del Sur', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'Virginia Occidental', WI:'Wisconsin', WY:'Wyoming' };
function eeuu() {
  const us = {}, vistos = {};
  for (const c of todas.filter(x => x.country === 'US' && x.population >= POB_MIN_US && US[x.adminCode]).sort((a, b) => b.population - a.population)) {
    const est = US[c.adminCode], k = est + '|' + c.name.toLowerCase();
    if (vistos[k]) continue; vistos[k] = 1; // mismo nombre en el mismo estado: se queda el más poblado
    (us[est] ||= []).push([c.name, r4(c.loc.coordinates[1]), r4(c.loc.coordinates[0])]);
  }
  return us;
}

const datos = { 'México': mx };
for (const [p, iso] of Object.entries(PAISES)) datos[p] = iso === 'US' ? eeuu() : latino(iso);

// Valor único "Ciudad, Estado" también entre países
const usados = new Map(); const choques = [];
for (const [p, es_] of Object.entries(datos)) for (const [e, cs] of Object.entries(es_)) for (const [n] of cs) {
  const v = n + ', ' + e; if (usados.has(v) && usados.get(v) !== p) choques.push(v + ' (' + usados.get(v) + ' / ' + p + ')'); else usados.set(v, p);
}
if (choques.length) console.error('AVISO valores repetidos entre países:', choques.length, choques.slice(0, 10));

// ── Reparto por población: en GeoNames, un lugar a menos de 20 km que comparta una palabra del nombre
// ("Ciudad de México" ↔ "Mexico City", "Tuxtla Gutiérrez" ↔ "Tuxtla"); si hay varios, el más poblado ──
const ISO = { 'México': 'MX', ...PAISES }, porPais = {};
for (const c of todas) if (c.population) (porPais[c.country] ||= []).push(c);
const palabras = n => llano(n).split(/[^a-z]+/).filter(w => w.length >= 3 && !['ciudad', 'city', 'villa', 'municipio', 'san', 'los', 'las', 'del'].includes(w));
const km = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 111 * Math.cos(a * Math.PI / 180));
const poblacion = (p, [n, lat, lng]) => {
  const w = palabras(n);
  return Math.max(0, ...(porPais[ISO[p]] || []).filter(c => km(lat, lng, c.loc.coordinates[1], c.loc.coordinates[0]) < 20
    && palabras(c.name).some(x => w.includes(x))).map(c => c.population));
};
const grandes = {}, chicas = {};
for (const [p, estados] of Object.entries(datos)) for (const [e, cs] of Object.entries(estados)) for (const c of cs)
  (((poblacion(p, c) >= POB_MIN ? grandes : chicas)[p] ||= {})[e] ||= []).push(c);

const cuerpo = d => Object.keys(d).sort((a, b) => a.localeCompare(b, 'es')).map(p => {
  const filas = Object.entries(d[p]).sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([e, cs]) =>
    `    ${JSON.stringify(e)}: [${cs.sort(es).map(c => JSON.stringify(c)).join(',')}]`).join(',\n');
  return `  ${JSON.stringify(p)}: {\n${filas}\n  }`;
}).join(',\n');

const cobertura = `// Cobertura: México; ${Object.keys(PAISES).filter(p => p !== 'Estados Unidos').join(', ')} (todos sus municipios); Estados Unidos (lugares de ${POB_MIN_US}+ habitantes).
// Formato compacto: { País: { Estado: [[ciudad, lat, lng], ...] } }.
// Datos: GeoNames (CC BY 4.0, vía all-the-cities) y country-state-city (MIT). Generado con generar-ciudades.js: no editar a mano.
// Para agregar un país: añádelo a PAISES en generar-ciudades.js y vuelve a correrlo (reparte solo grandes/chicas).`;
const src = fs.readFileSync('ciudades.js', 'utf8');
const resto = src.slice(src.indexOf('\n};\n') + 4);
fs.writeFileSync('ciudades.js', `// Fuente única de países/ciudades donde opera ZNR. Aquí solo van las ciudades de ${POB_MIN / 1000} mil habitantes o más;
// las demás están en ciudades-extra.js y se cargan con cargarCiudadesExtra() cuando hacen falta.
${cobertura}
const _ZNR_DATOS = {
${cuerpo(grandes)}
};
` + resto);
fs.writeFileSync('ciudades-extra.js', `// Ciudades de menos de ${POB_MIN / 1000} mil habitantes (las grandes están en ciudades.js). Lo carga cargarCiudadesExtra() de ciudades.js.
${cobertura}
window._ZNR_DATOS_EXTRA = {
${cuerpo(chicas)}
};
`);
const cuenta = d => Object.values(d).reduce((a, e) => a + Object.values(e).reduce((b, c) => b + c.length, 0), 0);
console.error('ciudades.js:', cuenta(grandes), '| ciudades-extra.js:', cuenta(chicas), '|',
  Object.keys(datos).map(p => `${p} ${cuenta({ p: grandes[p] || {} })}/${cuenta({ p: datos[p] })}`).join(' | '));
