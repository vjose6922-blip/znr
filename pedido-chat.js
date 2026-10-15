/**
 * pedido-chat.js — chat de un pedido personalizado (comprador y vendedor). Fases 1, 2 (pagos) y 3 (calificar, reportar, bloquear).
 * Interfaz compacta: encabezado de una línea, resumen colapsable ("Detalles"), mensajes en formato compacto y UNA barra
 * de acción con lo único que importa ahora (lo secundario —cancelar, rechazar, reportar, bloquear— vive en el menú ⋯).
 *
 * - Lectura en tiempo real con el SDK COMPLETO de Firestore (onSnapshot). El resto del
 *   sitio usa la versión "lite" (sin listeners); aquí se carga el completo solo para esta
 *   página. Comparten la misma app y la misma sesión de Firebase Auth (firestore-init.js).
 * - Toda ESCRITURA va por pedidos-api (las reglas de Firestore no dejan escribir al cliente).
 * - Todo texto de usuario se pinta con textContent (nunca innerHTML).
 * - Los listeners se cierran cuando la pestaña queda oculta, para no gastar lecturas.
 */
import { getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, collection, query, orderBy, limit, startAfter,
  onSnapshot, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const PEDIDO_ID = new URLSearchParams(location.search).get("pedido") || "";
const ROL_HINT = new URLSearchParams(location.search).get("rol") || "";
const PAGINA = 40;

// Respuestas rápidas del vendedor (edítalas aquí).
const RESPUESTAS_RAPIDAS = [
  "¡Hola! Con gusto. ¿Me das más detalles de lo que buscas?",
  "¿Para qué fecha lo necesitas?",
  "¿Me mandas una foto de referencia?",
  "Ya te envío la cotización.",
  "Tu pedido va avanzando, te aviso cuando esté listo."
];

const ETAPAS = [
  ["solicitado", "Solicitud"], ["cotizado", "Cotización"], ["aceptado", "Aceptado"],
  ["en_elaboracion", "Elaboración"], ["listo", "Listo"], ["entregado", "Entregado"]
];
const TEXTO_ESTADO = {
  solicitado: "Esperando cotización", cotizado: "Cotización enviada", aceptado: "Aceptado",
  en_elaboracion: "En elaboración", listo: "Listo para entregar", entregado: "Entregado",
  rechazado: "Rechazada", cancelado: "Cancelado", expirado: "Expirada"
};
const CERRADOS = ["entregado", "rechazado", "cancelado", "expirado"];

const db = getFirestore(getApp());
const app = document.getElementById("app");

let identidad = null; // { rol: 'comprador'|'vendedor', authUid, tel?, token? }
let pedido = null;
let vivos = [];        // mensajes de la ventana en vivo (más nuevos)
let anteriores = [];   // mensajes más viejos cargados con "ver anteriores"
let cursor = null;     // último doc de la página más vieja cargada
let hayMas = false;
let unsubPedido = null, unsubMsgs = null;
let primeraVez = true;

// ---------------------------------------------------------------- utilidades

function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of hijos.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

// Sin centavos cuando el importe es entero ($400), con dos decimales si no ($99.50): menos ancho en pantalla.
const dinero = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const ms = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0);
const hora = (t) => new Date(t).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const diaLargo = (t) => new Date(t).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

function fechaEntregaTxt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "long" });
}

function toast(texto) {
  const t = h("div", { text: texto, style: "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;z-index:2000;max-width:88vw;text-align:center;" });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function leerSesionVendedor() {
  try {
    const raw = localStorage.getItem("vendor_session") || sessionStorage.getItem("vendor_session");
    const s = raw ? JSON.parse(raw) : null;
    return s && s.token && s.uid ? s : null;
  } catch (_) { return null; }
}

function estadoEfectivo() {
  if (!pedido) return "";
  const venc = ms(pedido.expiraEn);
  const anticipoPendiente = pedido.estado === "aceptado" && pedido.pagoAnticipo && pedido.pagoAnticipo.estado === "pendiente";
  if ((pedido.estado === "solicitado" || pedido.estado === "cotizado" || anticipoPendiente) && venc && venc < Date.now()) return "expirado";
  return pedido.estado;
}

const PAGANDO = ["pendiente", "por_confirmar"];
const PAGADO = ["confirmado", "pagado_efectivo", "pagado_transferencia"];

// Pago que está en juego ahora mismo (anticipo al aceptar, restante cuando está listo).
function pagoActivo() {
  const e = estadoEfectivo();
  if (e === "aceptado" && pedido.pagoAnticipo && PAGANDO.includes(pedido.pagoAnticipo.estado)) return { tipo: "anticipo", pago: pedido.pagoAnticipo };
  if (e === "listo" && pedido.pagoRestante && PAGANDO.includes(pedido.pagoRestante.estado)) return { tipo: "restante", pago: pedido.pagoRestante };
  return null;
}

// ---------------------------------------------------------------- identidad + API

async function identificar() {
  const cand = [];
  const tel = (localStorage.getItem("client_phone") || "").replace(/\D/g, "");
  if (tel.length === 10 && localStorage.getItem("comprador_token")) cand.push({ rol: "comprador", tel, authUid: "cliente_" + tel });
  const vs = leerSesionVendedor();
  if (vs) cand.push({ rol: "vendedor", token: vs.token, authUid: "vendedor_" + vs.uid });
  if (ROL_HINT === "vendedor") cand.reverse();

  for (const c of cand) {
    const uid = await window.znrFirestore.signIn(c.rol === "vendedor" ? "vendedor" : "cliente", c.rol === "vendedor" ? c.token : c.tel);
    if (!uid) continue;
    try {
      const snap = await getDoc(doc(db, "pedidos_personalizados", PEDIDO_ID));
      if (snap.exists()) return c; // las reglas solo dejan leer a una de las dos partes
    } catch (_) { /* permission-denied: probar la otra identidad */ }
  }
  return null;
}

async function api(action, extra) {
  const p = new URLSearchParams({ action, pedidoId: PEDIDO_ID });
  for (const [k, v] of Object.entries(extra || {})) if (v !== undefined && v !== null) p.set(k, String(v));
  if (identidad.rol === "vendedor") p.set("vendorToken", identidad.token);
  else { p.set("telefono", identidad.tel); p.set("compradorToken", localStorage.getItem("comprador_token") || ""); }
  const res = await fetch(window.PEDIDOS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString()
  });
  return res.json();
}

// Ejecuta una acción de la API mostrando el error si falla.
async function hacer(btn, action, extra) {
  if (btn) btn.disabled = true;
  try {
    const r = await api(action, extra);
    if (!r.ok) { toast(r.error || "No se pudo completar la acción"); return null; }
    return r;
  } catch (_) {
    toast("Sin conexión. Intenta de nuevo.");
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---------------------------------------------------------------- esqueleto

const ui = {};
let detalleAbierto = false;
let rapidasAbiertas = false;
let comentarioCalificar = "";

function construir() {
  ui.titulo = h("h1", { class: "app-title" });
  ui.sub = h("p", { class: "app-subtitle" });
  ui.badge = h("span", { class: "pp-badge" });
  ui.prog = h("div", { class: "pp-prog", role: "progressbar", "aria-label": "Avance del pedido" });
  ui.strip = h("button", { class: "pp-strip", type: "button", "aria-expanded": "false" });
  ui.detalle = h("div", { class: "pp-detail", style: "display:none" });
  ui.msgs = h("div", { class: "pp-msgs" });
  ui.barra = h("div", { class: "pp-bar", style: "display:none" });
  ui.rapidas = h("div", { class: "pp-quick", style: "display:none" });
  ui.ta = h("textarea", { rows: "1", maxlength: "1000", placeholder: "Escribe un mensaje…", "aria-label": "Mensaje" });
  ui.btnRapidas = h("button", { class: "pp-ico", type: "button", title: "Respuestas rápidas", "aria-label": "Respuestas rápidas", text: "⚡", style: "display:none" });
  ui.btnFoto = h("button", { class: "pp-ico", type: "button", title: "Enviar foto", "aria-label": "Enviar foto", text: "📷" });
  ui.btnEnviar = h("button", { class: "pp-ico pp-send", type: "button", title: "Enviar", "aria-label": "Enviar", text: "➤" });
  ui.comp = h("div", { class: "pp-comp" }, ui.btnRapidas, ui.btnFoto, ui.ta, ui.btnEnviar);

  // Mismo encabezado que el resto del sitio (como "Actividad reciente"): botón volver + título + subtítulo.
  const volver = h("a", { class: "icon-button", href: "mis-pedidos.html" + (ROL_HINT ? "?rol=" + encodeURIComponent(ROL_HINT) : ""), "aria-label": "Volver", title: "Volver" });
  volver.innerHTML = typeof Icon === "function" ? Icon("arrow-left") : "‹";
  ui.btnMenu = h("button", { class: "icon-button", type: "button", title: "Más opciones", "aria-label": "Más opciones" });
  ui.btnMenu.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  ui.btnMenu.addEventListener("click", abrirMenu);
  const cab = h("header", { class: "app-header" },
    h("div", { class: "header-left" }, volver, h("div", { class: "header-text" }, ui.titulo, ui.sub)),
    h("div", { class: "header-right" }, ui.badge, ui.btnMenu));
  app.replaceChildren(cab, ui.prog, ui.strip, ui.detalle, ui.msgs, ui.barra, ui.rapidas, ui.comp);

  ui.strip.addEventListener("click", () => { detalleAbierto = !detalleAbierto; renderResumen(); });
  ui.btnRapidas.addEventListener("click", () => { rapidasAbiertas = !rapidasAbiertas; ui.rapidas.style.display = rapidasAbiertas ? "" : "none"; });
  ui.ta.addEventListener("input", () => { ui.ta.style.height = "auto"; ui.ta.style.height = Math.min(ui.ta.scrollHeight, 100) + "px"; });
  ui.ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); enviarTexto(); }
  });
  ui.btnEnviar.addEventListener("click", enviarTexto);
  ui.ta.addEventListener("focus", () => setTimeout(() => { ui.msgs.scrollTop = ui.msgs.scrollHeight; }, 250));
  ui.btnFoto.addEventListener("click", () => document.getElementById("file-foto").click());
  document.getElementById("file-foto").addEventListener("change", enviarFoto);
}

// ---------------------------------------------------------------- render

const fechaCorta = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const parte = (o) => d.toLocaleDateString("es-MX", o).replace(".", "");
  return parte({ weekday: "short" }) + " " + d.getDate() + " " + parte({ month: "short" });
};

// Lo acordado (si ya aceptaron) o la cotización vigente.
const acordado = () => (pedido.cotizacionAceptada && pedido.cotizacionAceptada.precio ? pedido.cotizacionAceptada : pedido.cotizacion) || null;

function contraparte() {
  return identidad.rol === "vendedor" ? (pedido.compradorNombre || "Cliente") : (pedido.vendedorNombre || "Vendedor");
}

function renderEncabezado() {
  const e = estadoEfectivo();
  const soyVendedor = identidad.rol === "vendedor";
  ui.titulo.textContent = pedido.productoNombre || "Pedido personalizado";
  ui.sub.textContent = contraparte();

  const act = pagoActivo();
  const porCalificar = !soyVendedor && e === "entregado" && !pedido.calificacion;
  const miTurno = soyVendedor
    ? e === "solicitado" || (act && act.pago.estado === "por_confirmar")
    : e === "cotizado" || (act && act.pago.estado === "pendiente") || porCalificar;
  ui.badge.textContent = porCalificar ? "Califica" : miTurno ? "Tu turno" : (TEXTO_ESTADO[e] || e);
  ui.badge.className = "pp-badge" + (miTurno ? " warn" : e === "entregado" ? " ok" : ["rechazado", "cancelado", "expirado"].includes(e) ? " bad" : "");

  // Progreso: una barra delgada de 6 tramos (el estado en palabras ya está en la etiqueta de arriba).
  const idx = ETAPAS.findIndex(([k]) => k === e);
  ui.prog.replaceChildren();
  if (idx >= 0) {
    ui.prog.style.display = "";
    ui.prog.setAttribute("aria-valuenow", String(idx + 1)); ui.prog.setAttribute("aria-valuemax", String(ETAPAS.length));
    ETAPAS.forEach(([k, txt], i) => ui.prog.appendChild(h("i", { class: i <= idx ? "on" : "", title: txt })));
  } else ui.prog.style.display = "none";
}

function textoPagosCorto() {
  const a = pedido.pagoAnticipo, r = pedido.pagoRestante, partes = [];
  if (a) partes.push("Anticipo " + (PAGADO.includes(a.estado) ? "✔" : a.estado === "por_confirmar" ? "por confirmar" : "pendiente"));
  if (r) partes.push(PAGADO.includes(r.estado) ? "Restante ✔" : (a ? "Resta " : "Total ") + dinero(r.monto));
  return partes.join(" · ");
}

function renderResumen() {
  const c = acordado();
  let txt;
  if (c && c.precio) {
    txt = [dinero(c.precio) + " · " + fechaCorta(c.fechaEntrega), pedido.cotizacionAceptada ? textoPagosCorto() : "", pedido.calificacion ? "★" + pedido.calificacion.estrellas : ""].filter(Boolean).join(" · ");
  } else {
    txt = "Desde " + dinero(pedido.precioDesde) + (pedido.tiempoElaboracionDias ? " · " + pedido.tiempoElaboracionDias + " días" : "");
  }
  ui.strip.replaceChildren(h("span", { class: "t", text: txt }), h("span", { class: "chev", text: detalleAbierto ? "▴" : "▾" }));
  ui.strip.setAttribute("aria-expanded", String(detalleAbierto));
  ui.strip.setAttribute("aria-label", detalleAbierto ? "Ocultar detalles del pedido" : "Ver detalles del pedido");
  ui.detalle.style.display = detalleAbierto ? "" : "none";
}

const ESTADO_PAGO_FILA = {
  pendiente: "pendiente", por_confirmar: "por confirmar", confirmado: "✔ pagado", pagado_efectivo: "✔ pagado en efectivo", pagado_transferencia: "✔ pagado por transferencia"
};

function renderDetalle() {
  ui.detalle.replaceChildren();
  const e = estadoEfectivo();
  const c = acordado();
  ui.detalle.appendChild(h("div", { class: "pp-d-ref" },
    pedido.productoImagen ? h("img", { src: pedido.productoImagen, alt: "", loading: "lazy" }) : null,
    h("div", {}, h("b", { text: pedido.productoNombre || "" }),
      h("span", { text: "Artículo de referencia · desde " + dinero(pedido.precioDesde) + (pedido.tiempoElaboracionDias ? " · " + pedido.tiempoElaboracionDias + " días" : "") }))));

  const filas = [];
  if (c && c.precio) {
    filas.push([pedido.cotizacionAceptada ? "Acordado" : "Cotización", dinero(c.precio)]);
    filas.push(["Entrega", fechaCorta(c.fechaEntrega)]);
    if (c.anticipo > 0) filas.push(["Anticipo", dinero(c.anticipo)]);
    if (c.anticipo > 0 && c.precio > c.anticipo) filas.push(["Al entregar", dinero(c.precio - c.anticipo)]);
    if (c.detalles) filas.push(["Incluye", c.detalles]);
    const vig = e === "cotizado" && pedido.cotizacion ? ms(pedido.cotizacion.vigenciaHasta) : 0;
    if (vig) filas.push(["Vigente hasta", diaLargo(vig)]);
  }
  [["Anticipo", pedido.pagoAnticipo], ["Restante", pedido.pagoRestante]].forEach(([nom, pg]) => {
    if (!pg) return;
    filas.push(["Pago " + nom.toLowerCase(), dinero(pg.monto) + " · " + (ESTADO_PAGO_FILA[pg.estado] || pg.estado), pg.comprobante]);
  });
  if (pedido.calificacion) filas.push([identidad.rol === "comprador" ? "Tu calificación" : "Calificación del cliente", estrellasTxt(pedido.calificacion.estrellas) + (pedido.calificacion.comentario ? " · " + pedido.calificacion.comentario : "")]);
  else if (e === "entregado" && identidad.rol === "vendedor") filas.push(["Calificación", "Aún no hay calificación del cliente"]);

  const dl = h("dl", { class: "pp-d-dl" });
  filas.forEach(([k, v, thumb]) => {
    dl.appendChild(h("dt", { text: k }));
    dl.appendChild(h("dd", {}, v, thumb ? miniaturaComprobante(thumb) : null));
  });
  ui.detalle.appendChild(dl);
  if (pedido.bloqueadoPor === identidad.rol) {
    ui.detalle.appendChild(h("p", { class: "pp-hint", text: "Bloqueaste a esta persona: no podrá abrir pedidos nuevos contigo. Puedes quitarlo desde ⋯." }));
  }
}

function miniaturaComprobante(url) {
  if (!url) return null;
  const img = h("img", { class: "pp-comprobante", src: url, alt: "Comprobante de pago", loading: "lazy" });
  img.addEventListener("click", () => verFoto(url));
  return img;
}

// Cada hecho importante (aceptar, pagar, empezar, entregar…) se muestra como un mensaje de quien lo hizo, alineado a su lado.
const ICONO_EVENTO = {
  cotizacion_aceptada: "✅", cotizacion_rechazada: "↩️", solicitud_cancelada: "🚫", pedido_rechazado: "🚫", pedido_cancelado: "🚫",
  elaboracion: "🔨", listo: "📦", entregado: "🎉", calificacion: "⭐", pago_confirmado: "✅", pago_no_recibido: "⚠️"
};

function burbujaEvento(m) {
  const mio = m.autorUid === identidad.authUid;
  const b = h("div", { class: "pp-b ev" + (mio ? " me" : "") }, h("span", { class: "ico", text: ICONO_EVENTO[m.evento] || "•" }), h("span", { class: "tx", text: m.contenido || "" }));
  const t = ms(m.creadoEn);
  if (t) b.appendChild(h("time", { text: hora(t) }));
  return b;
}

function chipCotizacion(m, e) {
  const c = m.cotizacion || {};
  const vigente = e === "cotizado" && pedido.cotizacionVersion === c.version;
  const aceptada = pedido.cotizacionAceptada && pedido.cotizacionAceptada.version === c.version;
  const etiqueta = vigente ? "Vigente" : aceptada ? "✔ Aceptada" : c.version < pedido.cotizacionVersion ? "Reemplazada" : e === "solicitado" ? "Rechazada" : "No vigente";
  return h("div", { class: "pp-chip cot" + (vigente ? " vivo" : "") + (m.autorUid === identidad.authUid ? " me" : "") },
    h("div", { class: "l1" },
      h("b", { text: "💲 " + dinero(c.precio) + (c.version > 1 ? " (#" + c.version + ")" : "") }),
      h("span", { text: " · entrega " + fechaCorta(c.fechaEntrega) + (c.anticipo > 0 ? " · anticipo " + dinero(c.anticipo) : "") }),
      h("em", { text: etiqueta })),
    m.contenido ? h("div", { class: "l2", text: m.contenido }) : null);
}

const ESTADO_PAGO_MSG = {
  por_confirmar: "por confirmar", confirmado: "confirmado", pagado_efectivo: "recibido en efectivo",
  pagado_transferencia: "recibido por transferencia", no_recibido: "no recibido"
};

function chipPago(m) {
  const pg = m.pago || {};
  const malo = pg.estado === "no_recibido", bien = PAGADO.includes(pg.estado);
  const nombre = pg.tipo === "restante" ? "Restante" : "Anticipo";
  const mio = m.autorUid === identidad.authUid;
  const b = h("div", { class: "pp-b pago" + (mio ? " me" : "") + (malo ? " bad" : bien ? " ok" : "") },
    h("div", { class: "l1" }, h("b", { text: (malo ? "⚠️ " : bien ? "✔ " : "💵 ") + nombre + " " + dinero(pg.monto) + " · " + (ESTADO_PAGO_MSG[pg.estado] || pg.estado) })));
  // El texto del mensaje solo se muestra cuando aporta algo (el motivo de "no recibido"); en los demás casos repetiría el título.
  if (malo && m.contenido) b.appendChild(h("div", { class: "l2", text: m.contenido }));
  const thumb = miniaturaComprobante(pg.comprobante);
  if (thumb) b.appendChild(thumb);
  const t = ms(m.creadoEn);
  if (t) b.appendChild(h("time", { text: hora(t) }));
  return b;
}

function renderMensajes() {
  const e = estadoEfectivo();
  const mapa = new Map();
  [...anteriores, ...vivos].forEach((m) => mapa.set(m.id, m));
  const lista = [...mapa.values()].sort((a, b) => ms(a.creadoEn) - ms(b.creadoEn) || (a.id < b.id ? -1 : 1));

  const cerca = ui.msgs.scrollHeight - ui.msgs.scrollTop - ui.msgs.clientHeight < 120;
  ui.msgs.replaceChildren();
  if (hayMas) {
    const b = h("button", { class: "pp-more", type: "button", text: "Ver mensajes anteriores" });
    b.addEventListener("click", () => cargarAnteriores(b));
    ui.msgs.appendChild(b);
  }
  let diaPrev = "";
  for (const m of lista) {
    const t = ms(m.creadoEn);
    const dia = t ? new Date(t).toDateString() : "";
    if (dia && dia !== diaPrev) { ui.msgs.appendChild(h("div", { class: "pp-day", text: diaLargo(t) })); diaPrev = dia; }
    if (m.tipo === "sistema") { ui.msgs.appendChild(h("div", { class: "pp-sys", text: m.contenido })); continue; }
    if (m.tipo === "cotizacion") { ui.msgs.appendChild(chipCotizacion(m, e)); continue; }
    if (m.tipo === "pago") { ui.msgs.appendChild(chipPago(m)); continue; }
    if (m.tipo === "evento") { ui.msgs.appendChild(burbujaEvento(m)); continue; }
    const mio = m.autorUid === identidad.authUid;
    const burbuja = h("div", { class: "pp-b" + (mio ? " me" : "") });
    if (m.tipo === "foto" && m.foto) {
      const img = h("img", { class: "pp-foto", src: m.foto, alt: "Foto del chat", loading: "lazy" });
      img.addEventListener("click", () => verFoto(m.foto));
      burbuja.appendChild(img);
    }
    if (m.contenido) burbuja.appendChild(document.createTextNode(m.contenido));
    if (t) burbuja.appendChild(h("time", { text: hora(t) }));
    ui.msgs.appendChild(burbuja);
  }
  if (primeraVez || cerca) { ui.msgs.scrollTop = ui.msgs.scrollHeight; }
  primeraVez = false;
}

// ---- Barra de acción: lo único que importa AHORA, en una sola fila ----
// Devuelve { info, tono, thumb, botones:[[texto, clase, fn, deshabilitado?]], nodo } o null si no hay nada que mostrar.
function configBarra(e, vend) {
  const a = pedido.pagoAnticipo, r = pedido.pagoRestante;
  const cot = pedido.cotizacion;
  const btnPago = (tipo) => [["Datos de pago", "", () => abrirDatosPago(tipo)], ["Ya pagué", "primary", (b) => subirComprobante(tipo, b)]];

  if (e === "expirado") return { info: "Esta solicitud expiró sin respuesta." + (vend ? "" : " Puedes hacer un pedido nuevo desde el artículo."), tono: "bad", botones: [] };
  if (e === "rechazado") return { info: "El vendedor no pudo tomar este pedido.", tono: "bad", botones: [] };
  if (e === "cancelado") return { info: "Este pedido fue cancelado.", tono: "bad", botones: [] };

  if (e === "entregado") {
    if (pedido.calificacion) return null;
    return vend ? null : { nodo: nodoCalificar() };
  }

  if (vend) {
    if (e === "solicitado") return { info: "Esperando tu cotización", botones: [["Enviar cotización", "primary", abrirCotizar]] };
    if (e === "cotizado") return { info: "Cotización de " + dinero(cot && cot.precio) + " enviada · esperando al cliente", botones: [["Nueva cotización", "", abrirCotizar]] };
    if (e === "aceptado") {
      if (a && a.estado === "pendiente") return { info: "Esperando el anticipo de " + dinero(a.monto), botones: [["Recibí en efectivo", "", (b) => confirmarRecibido("anticipo", "efectivo", b)]] };
      if (a && a.estado === "por_confirmar") return { info: "Comprobante del anticipo (" + dinero(a.monto) + ")", thumb: a.comprobante, botones: [["Confirmar pago", "primary", (b) => confirmarRecibido("anticipo", "transferencia", b)], ["No lo recibí", "danger", () => noRecibido("anticipo")]] };
      return { info: a ? "Anticipo confirmado" : "Pedido aceptado", botones: [["Empezar elaboración", "primary", (b) => cambiarEstado("en_elaboracion", b)]] };
    }
    if (e === "en_elaboracion") return { info: "En elaboración", botones: [["Marcar listo", "primary", (b) => cambiarEstado("listo", b)]] };
    if (e === "listo") {
      if (r && r.estado === "pendiente") return { info: "Cobra el restante: " + dinero(r.monto), botones: [["Recibí el restante (efectivo)", "primary", (b) => confirmarRecibido("restante", "efectivo", b)]] };
      if (r && r.estado === "por_confirmar") return { info: "Comprobante del restante (" + dinero(r.monto) + ")", thumb: r.comprobante, botones: [["Confirmar y entregar", "primary", (b) => confirmarRecibido("restante", "transferencia", b)], ["No lo recibí", "danger", () => noRecibido("restante")]] };
      return { info: "Listo para entregar", botones: [["Marcar entregado", "primary", (b) => cambiarEstado("entregado", b)]] };
    }
    return null;
  }

  // comprador
  if (e === "solicitado") return { info: "Esperando la cotización del vendedor", botones: [] };
  if (e === "cotizado" && cot) return { info: "Cotización: " + dinero(cot.precio) + " · entrega " + fechaCorta(cot.fechaEntrega) + (cot.anticipo > 0 ? " · anticipo " + dinero(cot.anticipo) : ""), botones: [["Aceptar", "primary", (b) => responderCotizacion("aceptar", cot, b)], ["Rechazar", "", (b) => responderCotizacion("rechazar", cot, b)]] };
  if (e === "aceptado") {
    if (a && a.estado === "pendiente") return a.ultimoRechazo
      ? { info: "El vendedor no encontró tu pago: " + a.ultimoRechazo.motivo, tono: "bad", botones: btnPago("anticipo") }
      : { info: "Anticipo pendiente: " + dinero(a.monto), botones: btnPago("anticipo") };
    if (a && a.estado === "por_confirmar") return { info: "Comprobante enviado · esperando confirmación", thumb: a.comprobante, botones: [] };
    return { info: a ? "Anticipo confirmado · el vendedor empezará pronto" : "Aceptado · el vendedor empezará pronto", botones: [] };
  }
  if (e === "en_elaboracion") return { info: "En elaboración" + (r && r.estado === "pendiente" ? " · el restante se paga al recibir" : ""), botones: [] };
  if (e === "listo") {
    if (r && r.estado === "pendiente") return r.ultimoRechazo
      ? { info: "El vendedor no encontró tu pago: " + r.ultimoRechazo.motivo, tono: "bad", botones: btnPago("restante") }
      : { info: "Listo · paga " + dinero(r.monto) + " al recibir (efectivo) o por transferencia", botones: btnPago("restante") };
    if (r && r.estado === "por_confirmar") return { info: "Comprobante enviado · esperando confirmación", thumb: r.comprobante, botones: [] };
    return { info: "Listo para entregar", botones: [] };
  }
  return null;
}

function nodoCalificar() {
  const fila = h("div", { class: "pp-estrellas" });
  const coment = h("input", { type: "text", maxlength: "300", placeholder: "Comentario (opcional)", "aria-label": "Comentario" });
  coment.value = comentarioCalificar;
  coment.addEventListener("input", () => { comentarioCalificar = coment.value; });
  const enviar = h("button", { class: "pp-btn sm primary", type: "button", text: "Enviar" });
  const extra = h("div", { class: "pp-rate-extra" }, coment, enviar);
  const pintar = () => {
    [...fila.children].forEach((b, i) => { b.textContent = i < estrellasElegidas ? "★" : "☆"; b.classList.toggle("on", i < estrellasElegidas); });
    extra.style.display = estrellasElegidas ? "" : "none";
  };
  for (let i = 1; i <= 5; i++) {
    const b = h("button", { type: "button", "aria-label": i + (i === 1 ? " estrella" : " estrellas"), text: "☆" });
    b.addEventListener("click", () => { estrellasElegidas = i; pintar(); });
    fila.appendChild(b);
  }
  enviar.addEventListener("click", async () => {
    if (!estrellasElegidas) { toast("Elige de 1 a 5 estrellas"); return; }
    const r = await hacer(enviar, "calificarPedido", { estrellas: estrellasElegidas, comentario: comentarioCalificar.trim() });
    if (r) { estrellasElegidas = 0; comentarioCalificar = ""; toast("¡Gracias por calificar!"); }
  });
  pintar();
  return h("div", { class: "pp-rate" }, h("div", { class: "pp-rate-fila" }, h("span", { text: "¿Cómo te fue con tu pedido?" }), fila), extra);
}

function renderBarra() {
  const e = estadoEfectivo();
  const vend = identidad.rol === "vendedor";
  const cerrado = CERRADOS.includes(e);
  ui.comp.style.display = cerrado ? "none" : "";

  // Respuestas rápidas: ocultas hasta tocar ⚡ (ahorran una fila fija de pantalla).
  ui.rapidas.replaceChildren();
  const hayRapidas = vend && !cerrado;
  ui.btnRapidas.style.display = hayRapidas ? "" : "none";
  if (hayRapidas) {
    RESPUESTAS_RAPIDAS.forEach((txt) => {
      const b = h("button", { type: "button", text: txt.length > 34 ? txt.slice(0, 32) + "…" : txt, title: txt });
      b.addEventListener("click", () => { ui.ta.value = txt; ui.ta.dispatchEvent(new Event("input")); rapidasAbiertas = false; ui.rapidas.style.display = "none"; ui.ta.focus(); });
      ui.rapidas.appendChild(b);
    });
  }
  ui.rapidas.style.display = hayRapidas && rapidasAbiertas ? "" : "none";

  const cfg = configBarra(e, vend);
  ui.barra.replaceChildren();
  if (!cfg) { ui.barra.style.display = "none"; return; }
  ui.barra.style.display = "";
  ui.barra.className = "pp-bar" + (cfg.tono === "bad" ? " bad" : "") + ((cfg.botones || []).length >= 2 ? " dos" : "") + (cfg.thumb ? " conthumb" : "");
  if (cfg.nodo) { ui.barra.appendChild(cfg.nodo); return; }
  if (cfg.thumb) ui.barra.appendChild(miniaturaComprobante(cfg.thumb));
  ui.barra.appendChild(h("div", { class: "info", text: cfg.info }));
  cfg.botones.forEach(([txt, clase, fn, off]) => {
    const b = h("button", { class: "pp-btn sm " + clase, type: "button", text: txt });
    if (off) b.disabled = true;
    b.addEventListener("click", () => fn(b));
    ui.barra.appendChild(b);
  });
}

function renderTodo() {
  if (!pedido) return;
  renderEncabezado();
  renderResumen();
  renderDetalle();
  renderBarra();
  renderMensajes();
}


function abrirDatosPago(tipo) {
  const destino = h("div", { class: "pp-pago-datos" }, h("p", { class: "pp-hint", text: "Cargando datos…" }));
  ventana("Datos para transferir", destino, [
    ["Cerrar", "", (b, cerrar) => cerrar()],
    ["Ya pagué · subir comprobante", "primary", (b, cerrar) => { cerrar(); subirComprobante(tipo, b); }]
  ]);
  verDatosPago(tipo, destino, null);
}

// ---------------------------------------------------------------- pagos (fase 2)


function copiar(texto) {
  const fallback = () => {
    const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = texto; document.body.appendChild(ta);
    ta.select(); try { document.execCommand("copy"); } catch (_) {} ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).catch(fallback);
  else fallback();
  toast("Copiado");
}

function elegirComprobante() {
  return new Promise((resolve) => {
    const inp = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none" });
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return resolve(null);
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Solo fotos JPG, PNG o WebP"); return resolve(null); }
      try { resolve(await comprimirImagen(f)); } catch (e) { toast(e.message || "No se pudo preparar la foto"); resolve(null); }
    });
    document.body.appendChild(inp);
    inp.click();
  });
}

async function subirComprobante(tipo, btn) {
  const data = await elegirComprobante();
  if (!data) return;
  const r = await hacer(btn, "reportarPago", { tipo, data });
  if (r) toast("Comprobante enviado. El vendedor lo confirmará.");
}

async function verDatosPago(tipo, destino, btn) {
  const r = await hacer(btn, "obtenerDatosPagoPedido", { tipo });
  if (!r) return;
  destino.replaceChildren();
  if (!r.clabe) {
    destino.appendChild(h("p", { class: "pp-hint", text: "El vendedor aún no configura su CLABE. Acuerden el pago en efectivo aquí en el chat." }));
    return;
  }
  const grupos = r.clabe.replace(/(\d{4})(?=\d)/g, "$1 ");
  const copiarBtn = h("button", { class: "pp-btn", type: "button", text: "Copiar CLABE" });
  copiarBtn.addEventListener("click", () => copiar(r.clabe));
  destino.append(
    h("dl", { class: "pp-datos" },
      h("dt", { text: "CLABE" }), h("dd", { class: "clabe", text: grupos }),
      h("dt", { text: "A nombre de" }), h("dd", { text: r.beneficiario }),
      h("dt", { text: "Monto" }), h("dd", { text: dinero(r.monto) }),
      h("dt", { text: "Concepto" }), h("dd", { text: r.concepto })),
    copiarBtn);
}

function noRecibido(tipo) {
  const motivo = h("textarea", { maxlength: "300", placeholder: "Ej: no veo la transferencia en mi cuenta todavía" });
  const err = h("div", { class: "err" });
  ventana("No recibí el pago", h("div", {}, h("label", { text: "Cuéntale al cliente qué pasó" }), motivo, err), [
    ["Volver", "", (b, cerrar) => cerrar()],
    ["Avisar al cliente", "danger", async (b, cerrar) => {
      if (motivo.value.trim().length < 3) { err.textContent = "Escribe el motivo."; return; }
      const r = await hacer(b, "confirmarPago", { tipo, accion: "rechazar", motivo: motivo.value.trim() });
      if (r) cerrar();
    }]
  ]);
}

async function confirmarRecibido(tipo, metodo, btn) {
  const nom = tipo === "anticipo" ? "el anticipo" : "el restante (el pedido pasará a entregado)";
  const via = metodo === "efectivo" ? "en efectivo" : "por transferencia";
  if (!(await confirmar("Confirmar pago", "¿Confirmas que recibiste " + nom + " " + via + "?", "Sí, lo recibí", "primary"))) return;
  await hacer(btn, "confirmarPago", { tipo, accion: "confirmar", metodo });
}

// ---------------------------------------------------------------- confianza (fase 3)

const MOTIVOS_REPORTE = [
  ["acoso", "Acoso o insultos"], ["estafa", "Posible estafa o pago irregular"], ["contenido", "Contenido inapropiado"],
  ["incumplimiento", "Incumplimiento del acuerdo"], ["otro", "Otro motivo"]
];

let estrellasElegidas = 0;

function estrellasTxt(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

function abrirMenu() {
  if (!pedido) return;
  const e = estadoEfectivo();
  const vend = identidad.rol === "vendedor";
  const otro = contraparte();
  const yaBloqueado = pedido.bloqueadoPor === identidad.rol;
  const botones = [];
  // Lo que antes ocupaba botones fijos en pantalla vive aquí: se usa poco y no debe estorbar.
  if (vend && (e === "solicitado" || e === "cotizado")) botones.push(["Rechazar solicitud", "danger", (b, cerrar) => { cerrar(); pedirMotivo("Rechazar solicitud", "rechazado"); }]);
  if (vend && ["aceptado", "en_elaboracion", "listo"].includes(e)) botones.push(["Cancelar pedido", "danger", (b, cerrar) => { cerrar(); pedirMotivo("Cancelar pedido", "cancelado"); }]);
  if (!vend && (e === "solicitado" || e === "cotizado")) botones.push(["Cancelar solicitud", "danger", (b, cerrar) => { cerrar(); cancelarComprador(b); }]);
  botones.push(["Reportar conversación", "", (b, cerrar) => { cerrar(); abrirReporte(); }]);
  botones.push(yaBloqueado
    ? ["Desbloquear a " + otro, "", async (b, cerrar) => { const r = await hacer(b, "desbloquearUsuario"); if (r) { cerrar(); toast("Desbloqueado"); } }]
    : ["Bloquear a " + otro, "danger", (b, cerrar) => { cerrar(); confirmarBloqueo(otro); }]);
  botones.push(["Cerrar", "", (b, cerrar) => cerrar()]);
  const ov = ventana("Más opciones", h("p", { class: "pp-hint", text: "Pedido con " + otro }), botones);
  ov.querySelector(".row").classList.add("col");
}

function abrirReporte() {
  let motivo = "";
  const opciones = h("div", { class: "pp-motivos" });
  MOTIVOS_REPORTE.forEach(([k, txt]) => {
    const b = h("button", { type: "button", text: txt });
    b.addEventListener("click", () => { motivo = k; [...opciones.children].forEach((x) => x.classList.toggle("on", x === b)); });
    opciones.appendChild(b);
  });
  const detalle = h("textarea", { maxlength: "500", placeholder: "Cuéntanos qué pasó (el equipo de Z&R lo revisará)" });
  const err = h("div", { class: "err" });
  ventana("Reportar conversación", h("div", {}, h("p", { class: "pp-hint", text: "Solo el equipo de Z&R de tu ciudad verá esta conversación, y únicamente por este reporte. La otra persona no sabrá quién reportó." }), opciones, h("label", { text: "Detalles" }), detalle, err), [
    ["Volver", "", (b, cerrar) => cerrar()],
    ["Enviar reporte", "danger", async (b, cerrar) => {
      if (!motivo) { err.textContent = "Elige el motivo."; return; }
      const r = await hacer(b, "reportarPedido", { motivo, detalle: detalle.value.trim() });
      if (r) { cerrar(); toast("Reporte enviado. Gracias por avisarnos."); }
    }]
  ]);
}

async function confirmarBloqueo(otro) {
  const ok = await confirmar("Bloquear a " + otro, "No podrá abrir pedidos nuevos contigo y se cancelarán los pedidos que aún no tengan anticipo ni trabajo en curso. Los pedidos ya en curso siguen abiertos para poder terminarlos.", "Bloquear", "danger");
  if (!ok) return;
  const r = await hacer(null, "bloquearUsuario");
  if (!r) return;
  if (r.yaBloqueado) toast("Esta persona ya estaba bloqueada.");
  else if (r.enCurso) toast("Bloqueado. Los pedidos en curso siguen abiertos; repórtalos si hay un problema.");
  else toast("Bloqueado.");
}

// ---------------------------------------------------------------- ventanas

function ventana(titulo, contenido, botones) {
  const ov = h("div", { class: "pp-ov" });
  const caja = h("div", { class: "pp-box", role: "dialog", "aria-modal": "true" }, h("h3", { text: titulo }), contenido);
  const fila = h("div", { class: "row" });
  botones.forEach(([txt, clase, fn]) => {
    const b = h("button", { class: "pp-btn " + clase, type: "button", text: txt });
    b.addEventListener("click", () => fn(b, () => ov.remove()));
    fila.appendChild(b);
  });
  caja.appendChild(fila);
  ov.appendChild(caja);
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  return ov;
}

function abrirCotizar() {
  const dias = Number(pedido.tiempoElaboracionDias) || 7;
  const sug = new Date(Date.now() + dias * 86400000);
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const previa = pedido.cotizacion || {};
  const precio = h("input", { type: "number", inputmode: "decimal", min: "1", max: "1000000", step: "0.01", value: previa.precio || pedido.precioDesde || "" });
  const anticipo = h("input", { type: "number", inputmode: "decimal", min: "0", step: "0.01", placeholder: "Opcional", value: previa.anticipo || "" });
  const fecha = h("input", { type: "date", min: iso(new Date()), value: previa.fechaEntrega || iso(sug) });
  const detalles = h("textarea", { maxlength: "600", placeholder: "Qué incluye: materiales, medidas, colores, personalización…" });
  detalles.value = previa.detalles || "";
  const err = h("div", { class: "err" });
  const cuerpo = h("div", {},
    h("label", { text: "Precio final (MXN)" }), precio,
    h("label", { text: "Anticipo (MXN)" }), anticipo,
    h("label", { text: "Fecha de entrega" }), fecha,
    h("label", { text: "Detalles" }), detalles, err);
  ventana("Enviar cotización", cuerpo, [
    ["Cancelar", "", (b, cerrar) => cerrar()],
    ["Enviar", "primary", async (b, cerrar) => {
      err.textContent = "";
      const p = Number(precio.value), a = Number(anticipo.value || 0);
      if (!p || p <= 0) { err.textContent = "Escribe el precio final."; return; }
      if (a < 0 || a > p) { err.textContent = "El anticipo no puede ser mayor al precio."; return; }
      if (!fecha.value) { err.textContent = "Elige la fecha de entrega."; return; }
      if (detalles.value.trim().length < 3) { err.textContent = "Describe qué incluye la cotización."; return; }
      const r = await hacer(b, "cotizarPedido", { precio: p, anticipo: a, fechaEntrega: fecha.value, detalles: detalles.value.trim() });
      if (r) { cerrar(); if (r.aviso) setTimeout(() => toast(r.aviso), 300); }
    }]
  ]);
}

function pedirMotivo(titulo, estado) {
  const motivo = h("textarea", { maxlength: "300", placeholder: "Cuéntale al cliente el motivo" });
  const err = h("div", { class: "err" });
  ventana(titulo, h("div", {}, h("label", { text: "Motivo" }), motivo, err), [
    ["Volver", "", (b, cerrar) => cerrar()],
    [titulo, "danger", async (b, cerrar) => {
      if (motivo.value.trim().length < 3) { err.textContent = "Escribe el motivo."; return; }
      const r = await hacer(b, "cambiarEstadoPedido", { estado, motivo: motivo.value.trim() });
      if (r) cerrar();
    }]
  ]);
}

function confirmar(titulo, texto, aceptarTxt, clase) {
  return new Promise((resolve) => {
    ventana(titulo, h("p", { text: texto, style: "font-size:14px;margin:0" }), [
      ["Volver", "", (b, cerrar) => { cerrar(); resolve(false); }],
      [aceptarTxt, clase || "primary", (b, cerrar) => { cerrar(); resolve(true); }]
    ]);
  });
}

function verFoto(url) {
  const ov = h("div", { class: "pp-visor" }, h("img", { src: url, alt: "Foto" }));
  ov.addEventListener("click", () => ov.remove());
  document.body.appendChild(ov);
}

// ---------------------------------------------------------------- acciones

async function enviarTexto() {
  const t = ui.ta.value.trim();
  if (!t) return;
  ui.btnEnviar.disabled = true;
  const r = await hacer(null, "enviarMensajePedido", { contenido: t });
  ui.btnEnviar.disabled = false;
  if (r) { ui.ta.value = ""; ui.ta.style.height = "auto"; primeraVez = true; }
}

async function responderCotizacion(accion, c, btn) {
  if (accion === "aceptar") {
    const ok = await confirmar("Aceptar cotización", "Aceptas el precio de " + dinero(c.precio) + " con entrega el " + fechaEntregaTxt(c.fechaEntrega) + ". El vendedor empezará a elaborar tu pedido.", "Aceptar", "primary");
    if (!ok) return;
  }
  await hacer(btn, "responderCotizacion", { accion, version: c.version });
}

async function cambiarEstado(estado, btn) {
  const txt = { en_elaboracion: "¿Empiezas a elaborar este pedido?", listo: "¿Tu pedido ya está listo para entregar?", entregado: "¿Confirmas que el pedido ya fue entregado?" }[estado];
  if (!(await confirmar("Confirmar", txt, "Sí", "primary"))) return;
  await hacer(btn, "cambiarEstadoPedido", { estado });
}

async function cancelarComprador(btn) {
  if (!(await confirmar("Cancelar solicitud", "Se cancelará esta solicitud y se avisará al vendedor.", "Cancelar solicitud", "danger"))) return;
  await hacer(btn, "cancelarPedido");
}

async function comprimirImagen(file) {
  let origen;
  try { origen = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (_) {
    origen = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  }
  const w0 = origen.width || origen.naturalWidth, h0 = origen.height || origen.naturalHeight;
  const k = Math.min(1, 1280 / Math.max(w0, h0));
  const cv = document.createElement("canvas");
  cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  cv.getContext("2d").drawImage(origen, 0, 0, cv.width, cv.height);
  let calidad = 0.82, blob = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", calidad));
    if (blob && blob.size <= 1.4 * 1024 * 1024) break;
    calidad -= 0.12;
  }
  if (!blob || blob.size > 1.45 * 1024 * 1024) throw new Error("La foto es muy pesada");
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
}

async function enviarFoto(ev) {
  const input = ev.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast("Solo fotos JPG, PNG o WebP"); return; }
  ui.btnFoto.disabled = true;
  ui.btnFoto.textContent = "…";
  try {
    const data = await comprimirImagen(file);
    const r = await hacer(null, "subirFotoPedido", { data });
    if (r) primeraVez = true;
  } catch (e) {
    toast(e.message || "No se pudo preparar la foto");
  } finally {
    ui.btnFoto.disabled = false;
    ui.btnFoto.textContent = "📷";
  }
}

// ---------------------------------------------------------------- tiempo real

const mapDoc = (d) => ({ id: d.id, ...d.data() });

function suscribir() {
  desuscribir();
  const ref = doc(db, "pedidos_personalizados", PEDIDO_ID);
  unsubPedido = onSnapshot(ref, (snap) => {
    if (!snap.exists()) { app.replaceChildren(h("div", { class: "pp-state", text: "Este pedido ya no existe." })); return; }
    pedido = { id: snap.id, ...snap.data() };
    renderTodo();
  }, () => toast("Se perdió la conexión con el pedido"));

  const q = query(collection(ref, "mensajes"), orderBy("creadoEn", "desc"), limit(PAGINA));
  unsubMsgs = onSnapshot(q, (snap) => {
    vivos = snap.docs.map(mapDoc);
    if (!anteriores.length) { cursor = snap.docs[snap.docs.length - 1] || null; hayMas = snap.docs.length >= PAGINA; }
    renderTodo();
  }, () => toast("Se perdió la conexión con el chat"));
}

function desuscribir() {
  if (unsubPedido) { unsubPedido(); unsubPedido = null; }
  if (unsubMsgs) { unsubMsgs(); unsubMsgs = null; }
}

async function cargarAnteriores(btn) {
  if (!cursor) return;
  btn.disabled = true;
  try {
    const q = query(collection(db, "pedidos_personalizados", PEDIDO_ID, "mensajes"), orderBy("creadoEn", "desc"), startAfter(cursor), limit(PAGINA));
    const snap = await getDocs(q);
    anteriores = [...anteriores, ...snap.docs.map(mapDoc)];
    cursor = snap.docs[snap.docs.length - 1] || cursor;
    hayMas = snap.docs.length >= PAGINA;
    const alto = ui.msgs.scrollHeight;
    renderMensajes();
    ui.msgs.scrollTop = ui.msgs.scrollHeight - alto;
  } catch (_) { toast("No se pudieron cargar los mensajes anteriores"); }
}

// Pestaña oculta → se cierran los listeners (ahorra lecturas); al volver se reabren.
document.addEventListener("visibilitychange", () => {
  if (!identidad) return;
  if (document.hidden) desuscribir();
  else { primeraVez = true; suscribir(); }
});
window.addEventListener("pagehide", desuscribir);

// ---------------------------------------------------------------- área visible

// Ajusta el contenedor al área REALMENTE visible (teclado abierto, barras del navegador que se ocultan o aparecen) para que
// el encabezado y la caja de escritura nunca queden fuera de pantalla. Si el usuario hace zoom con los dedos no se toca nada.
function ajustarAreaVisible() {
  const vv = window.visualViewport;
  if (!vv || Math.abs(vv.scale - 1) > 0.01) { app.removeAttribute("data-vv"); return; }
  app.setAttribute("data-vv", "1");
  app.style.setProperty("--pp-h", Math.round(vv.height) + "px");
  app.style.setProperty("--pp-top", Math.round(vv.offsetTop) + "px");
  if (ui.ta && ui.msgs && document.activeElement === ui.ta) ui.msgs.scrollTop = ui.msgs.scrollHeight;
}
let _vvRaf = 0; // un solo ajuste por frame durante la animacion del teclado
const ajustarAreaVisibleRaf = () => {
  if (_vvRaf) return;
  _vvRaf = requestAnimationFrame(() => { _vvRaf = 0; ajustarAreaVisible(); });
};
if (window.visualViewport) ["resize", "scroll"].forEach((ev) => window.visualViewport.addEventListener(ev, ajustarAreaVisibleRaf));
window.addEventListener("orientationchange", () => setTimeout(ajustarAreaVisible, 200));
ajustarAreaVisible();

// ---------------------------------------------------------------- arranque

(async function iniciar() {
  if (!PEDIDO_ID) { app.replaceChildren(h("div", { class: "pp-state", text: "Falta el pedido." })); return; }
  if (!window.PEDIDOS_API_URL || !window.znrFirestore || !window.znrFirestore.signIn) {
    app.replaceChildren(h("div", { class: "pp-state", text: "No se pudo iniciar. Recarga la página." }));
    return;
  }
  identidad = await identificar();
  if (!identidad) {
    app.replaceChildren(h("div", { class: "pp-state" },
      "No pudimos abrir este pedido con tu sesión actual. Entra como cliente desde ",
      h("a", { href: "comunidad.html", text: "Comunidad" }), " o como vendedor desde ",
      h("a", { href: "vendedor.html", text: "tu panel" }), " y vuelve a abrir el aviso."));
    return;
  }
  construir();
  suscribir();
})();
