/**
 * pedido-chat.js — chat de un pedido personalizado (comprador y vendedor). Fases 1, 2 (pagos) y 3 (calificar, reportar, bloquear).
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

const dinero = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
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

function construir() {
  ui.titulo = h("b");
  ui.sub = h("span");
  ui.badge = h("span", { class: "pp-badge" });
  ui.pasos = h("div", { class: "pp-steps" });
  ui.aviso = h("div");
  ui.ref = h("div");
  ui.msgs = h("div", { class: "pp-msgs" });
  ui.cierre = h("div", { class: "pp-pagos" });
  ui.pagos = h("div", { class: "pp-pagos" });
  ui.entrega = h("div", { class: "pp-pagos" });
  ui.acciones = h("div", { class: "pp-actions" });
  ui.rapidas = h("div", { class: "pp-quick" });
  ui.cerrado = h("div", { class: "pp-closed", style: "display:none", text: "Este pedido ya está cerrado." });
  ui.ta = h("textarea", { rows: "1", maxlength: "1000", placeholder: "Escribe un mensaje…", "aria-label": "Mensaje" });
  ui.btnFoto = h("button", { class: "pp-ico", type: "button", title: "Enviar foto", "aria-label": "Enviar foto", text: "📷" });
  ui.btnEnviar = h("button", { class: "pp-ico pp-send", type: "button", title: "Enviar", "aria-label": "Enviar", text: "➤" });
  ui.comp = h("div", { class: "pp-comp" }, ui.btnFoto, ui.ta, ui.btnEnviar);

  const volver = h("a", { class: "pp-back", href: "mis-pedidos.html" + (ROL_HINT ? "?rol=" + encodeURIComponent(ROL_HINT) : ""), "aria-label": "Volver", text: "‹" });
  ui.btnMenu = h("button", { class: "pp-back", type: "button", title: "Más opciones", "aria-label": "Más opciones", text: "⋯" });
  ui.btnMenu.addEventListener("click", abrirMenu);
  const cab = h("div", { class: "pp-head" }, volver, h("div", { class: "pp-head-info" }, ui.titulo, ui.sub), ui.badge, ui.btnMenu);
  app.replaceChildren(cab, ui.pasos, ui.aviso, ui.ref, ui.msgs, ui.cierre, ui.pagos, ui.entrega, ui.acciones, ui.rapidas, ui.cerrado, ui.comp);

  ui.ta.addEventListener("input", () => { ui.ta.style.height = "auto"; ui.ta.style.height = Math.min(ui.ta.scrollHeight, 120) + "px"; });
  ui.ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); enviarTexto(); }
  });
  ui.btnEnviar.addEventListener("click", enviarTexto);
  ui.btnFoto.addEventListener("click", () => document.getElementById("file-foto").click());
  document.getElementById("file-foto").addEventListener("change", enviarFoto);
}

// ---------------------------------------------------------------- render

function renderEncabezado() {
  const e = estadoEfectivo();
  const soyVendedor = identidad.rol === "vendedor";
  ui.titulo.textContent = pedido.productoNombre || "Pedido personalizado";
  ui.sub.textContent = soyVendedor ? "Cliente: " + (pedido.compradorNombre || "Cliente") : "Vendedor: " + (pedido.vendedorNombre || "");
  const act = pagoActivo();
  const porCalificar = !soyVendedor && e === "entregado" && !pedido.calificacion;
  const miTurno = soyVendedor
    ? e === "solicitado" || (act && act.pago.estado === "por_confirmar")
    : e === "cotizado" || (act && act.pago.estado === "pendiente") || porCalificar;
  ui.badge.textContent = porCalificar ? "Califica" : miTurno ? "Tu turno" : (TEXTO_ESTADO[e] || e);
  ui.badge.className = "pp-badge" + (miTurno ? " warn" : e === "entregado" ? " ok" : ["rechazado", "cancelado", "expirado"].includes(e) ? " bad" : "");

  // Barra de estado
  ui.pasos.replaceChildren();
  const idx = ETAPAS.findIndex(([k]) => k === e);
  if (idx >= 0) {
    ui.pasos.style.display = "";
    ETAPAS.forEach(([k, txt], i) => ui.pasos.appendChild(h("div", { class: "pp-step" + (i < idx ? " done" : i === idx ? " done now" : ""), text: txt })));
  } else {
    ui.pasos.style.display = "none";
  }
  ui.aviso.replaceChildren();
  if (e === "expirado") ui.aviso.appendChild(h("div", { class: "pp-banner bad", text: "Esta solicitud expiró sin respuesta. Puedes hacer un pedido nuevo desde el artículo." }));
  else if (e === "rechazado") ui.aviso.appendChild(h("div", { class: "pp-banner bad", text: "El vendedor no pudo tomar este pedido." }));
  else if (e === "cancelado") ui.aviso.appendChild(h("div", { class: "pp-banner bad", text: "Este pedido fue cancelado." }));
  else if (e === "entregado") ui.aviso.appendChild(h("div", { class: "pp-banner", text: "Pedido entregado. ¡Gracias!" }));
  if (pedido.bloqueadoPor === identidad.rol) {
    ui.aviso.appendChild(h("div", { class: "pp-banner", text: "Bloqueaste a esta persona: no podrá abrir pedidos nuevos contigo. Puedes quitarlo desde ⋯." }));
  }

  // Artículo de referencia
  ui.ref.replaceChildren(
    h("div", { class: "pp-ref" },
      pedido.productoImagen ? h("img", { src: pedido.productoImagen, alt: "", loading: "lazy" }) : null,
      h("div", {}, h("b", { text: pedido.productoNombre || "" }),
        "Artículo de referencia · desde " + dinero(pedido.precioDesde) + (pedido.tiempoElaboracionDias ? " · " + pedido.tiempoElaboracionDias + " días" : "")))
  );
}

function tarjetaCotizacion(m, e) {
  const c = m.cotizacion || {};
  const vigente = e === "cotizado" && pedido.cotizacionVersion === c.version;
  const aceptada = pedido.cotizacionAceptada && pedido.cotizacionAceptada.version === c.version;
  let estadoTxt = "";
  if (aceptada) estadoTxt = "✔ Aceptada";
  else if (c.version < pedido.cotizacionVersion) estadoTxt = "Reemplazada por una cotización nueva";
  else if (!vigente) estadoTxt = e === "solicitado" ? "Rechazada" : "Ya no está vigente";

  const nodo = h("div", { class: "pp-cot" },
    h("h4", { text: "Cotización" + (c.version > 1 ? " #" + c.version : "") }),
    h("div", { class: "precio", text: dinero(c.precio) }),
    h("dl", {},
      h("dt", { text: "Entrega" }), h("dd", { text: fechaEntregaTxt(c.fechaEntrega) }),
      c.anticipo > 0 ? h("dt", { text: "Anticipo" }) : null, c.anticipo > 0 ? h("dd", { text: dinero(c.anticipo) }) : null,
      c.anticipo > 0 && c.precio > c.anticipo ? h("dt", { text: "Al entregar" }) : null, c.anticipo > 0 && c.precio > c.anticipo ? h("dd", { text: dinero(c.precio - c.anticipo) }) : null),
    m.contenido ? h("p", { text: m.contenido }) : null);

  if (vigente && identidad.rol === "comprador") {
    const vig = pedido.cotizacion && ms(pedido.cotizacion.vigenciaHasta);
    if (vig) nodo.appendChild(h("div", { class: "estado", text: "Vigente hasta el " + diaLargo(vig) }));
    const bA = h("button", { class: "pp-btn primary", type: "button", text: "Aceptar" });
    const bR = h("button", { class: "pp-btn danger", type: "button", text: "Rechazar" });
    bA.addEventListener("click", () => responderCotizacion("aceptar", c, bA));
    bR.addEventListener("click", () => responderCotizacion("rechazar", c, bR));
    nodo.appendChild(h("div", { class: "row" }, bA, bR));
  } else if (vigente) {
    nodo.appendChild(h("div", { class: "estado", text: "Esperando respuesta del cliente" }));
  } else if (estadoTxt) {
    nodo.appendChild(h("div", { class: "estado", text: estadoTxt }));
  }
  return nodo;
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
    if (dia && dia !== diaPrev) { ui.msgs.appendChild(h("div", { class: "pp-sys", text: diaLargo(t) })); diaPrev = dia; }
    if (m.tipo === "sistema") { ui.msgs.appendChild(h("div", { class: "pp-sys", text: m.contenido })); continue; }
    if (m.tipo === "cotizacion") { ui.msgs.appendChild(tarjetaCotizacion(m, e)); continue; }
    if (m.tipo === "pago") { ui.msgs.appendChild(tarjetaPagoMensaje(m)); continue; }
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

function renderAcciones() {
  const e = estadoEfectivo();
  const vendedor = identidad.rol === "vendedor";
  const cerrado = CERRADOS.includes(e);
  ui.acciones.replaceChildren();
  ui.rapidas.replaceChildren();
  ui.cerrado.style.display = cerrado ? "" : "none";
  ui.comp.style.display = cerrado ? "none" : "";

  const boton = (txt, clase, fn) => {
    const b = h("button", { class: "pp-btn " + clase, type: "button", text: txt });
    b.addEventListener("click", () => fn(b));
    ui.acciones.appendChild(b);
  };

  if (vendedor) {
    if (e === "solicitado" || e === "cotizado") {
      boton(e === "cotizado" ? "Enviar otra cotización" : "Enviar cotización", "primary", abrirCotizar);
      boton("Rechazar solicitud", "danger", () => pedirMotivo("Rechazar solicitud", "rechazado"));
    } else if (e === "aceptado") {
      const falta = pedido.pagoAnticipo && pedido.pagoAnticipo.estado !== "confirmado";
      boton(falta ? "Empezar (falta el anticipo)" : "Empezar elaboración", "primary", (b) => cambiarEstado("en_elaboracion", b));
      if (falta) ui.acciones.lastChild.disabled = true;
      boton("Cancelar pedido", "danger", () => pedirMotivo("Cancelar pedido", "cancelado"));
    } else if (e === "en_elaboracion") {
      boton("Marcar como listo", "primary", (b) => cambiarEstado("listo", b));
      boton("Cancelar pedido", "danger", () => pedirMotivo("Cancelar pedido", "cancelado"));
    } else if (e === "listo") {
      // Con restante por cobrar, la entrega se registra desde la tarjeta de pago ("Recibí el restante").
      if (!pedido.pagoRestante || PAGADO.includes(pedido.pagoRestante.estado) || pedido.pagoRestante.estado === "no_aplica") {
        boton("Marcar como entregado", "primary", (b) => cambiarEstado("entregado", b));
      }
      boton("Cancelar pedido", "danger", () => pedirMotivo("Cancelar pedido", "cancelado"));
    }
    if (!cerrado) {
      RESPUESTAS_RAPIDAS.forEach((txt) => {
        const b = h("button", { type: "button", text: txt.length > 34 ? txt.slice(0, 32) + "…" : txt, title: txt });
        b.addEventListener("click", () => { ui.ta.value = txt; ui.ta.dispatchEvent(new Event("input")); ui.ta.focus(); });
        ui.rapidas.appendChild(b);
      });
    }
  } else if (e === "solicitado" || e === "cotizado") {
    boton("Cancelar solicitud", "danger", cancelarComprador);
  }
  ui.acciones.style.display = ui.acciones.children.length ? "" : "none";
  ui.rapidas.style.display = ui.rapidas.children.length ? "" : "none";
}

function renderTodo() {
  if (!pedido) return;
  renderEncabezado();
  renderCierre();
  renderPagos();
  renderEntrega();
  renderAcciones();
  renderMensajes();
}

// ---------------------------------------------------------------- pagos (fase 2)

const ESTADO_PAGO_MSG = {
  por_confirmar: "por confirmar", confirmado: "confirmado", pagado_efectivo: "recibido en efectivo",
  pagado_transferencia: "recibido por transferencia", no_recibido: "no recibido"
};

function tarjetaPagoMensaje(m) {
  const pg = m.pago || {};
  const nombre = pg.tipo === "restante" ? "restante" : "anticipo";
  const malo = pg.estado === "no_recibido";
  const caja = h("div", { class: "pp-pagomsg" + (malo ? " bad" : PAGADO.includes(pg.estado) ? " ok" : "") },
    h("b", { text: (malo ? "⚠️ " : PAGADO.includes(pg.estado) ? "✔ " : "💵 ") + "Pago de " + nombre + " · " + dinero(pg.monto) + " · " + (ESTADO_PAGO_MSG[pg.estado] || pg.estado) }),
    m.contenido ? h("span", { text: m.contenido }) : null);
  if (pg.comprobante) {
    const img = h("img", { src: pg.comprobante, alt: "Comprobante de pago", loading: "lazy" });
    img.addEventListener("click", () => verFoto(pg.comprobante));
    caja.appendChild(img);
  }
  return caja;
}

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

function miniaturaComprobante(url) {
  if (!url) return null;
  const img = h("img", { class: "pp-comprobante", src: url, alt: "Comprobante de pago", loading: "lazy" });
  img.addEventListener("click", () => verFoto(url));
  return img;
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

function renderPagos() {
  ui.pagos.replaceChildren();
  const e = estadoEfectivo();
  const a = pedido.pagoAnticipo, r = pedido.pagoRestante;
  // Sin pagos, o pedido cerrado sin entregar (cancelado/expirado/rechazado): no hay nada que cobrar.
  if ((!a && !r) || (CERRADOS.includes(e) && e !== "entregado")) { ui.pagos.style.display = "none"; return; }

  const vendedor = identidad.rol === "vendedor";
  const act = pagoActivo();
  const resumen = [];
  if (a) resumen.push("Anticipo " + dinero(a.monto) + " · " + (PAGADO.includes(a.estado) ? "✔ pagado" : a.estado === "por_confirmar" ? "por confirmar" : "pendiente"));
  if (r) resumen.push((a ? "Restante " : "Total ") + dinero(r.monto) + " · " + (PAGADO.includes(r.estado) ? "✔ pagado" : r.estado === "por_confirmar" ? "por confirmar" : "al entregar"));

  const caja = h("div", { class: "pp-pago" }, h("div", { class: "pp-pago-res", text: resumen.join("  ·  ") }));

  if (act) {
    const { tipo, pago } = act;
    const titulo = tipo === "anticipo" ? "Anticipo" : "Pago restante";
    caja.appendChild(h("h4", { text: titulo + " · " + dinero(pago.monto) }));
    if (!vendedor) {
      if (pago.estado === "pendiente") {
        const venc = tipo === "anticipo" ? ms(pedido.expiraEn) : 0;
        caja.appendChild(h("p", { class: "pp-hint", text: tipo === "anticipo"
          ? "Paga por transferencia y sube tu comprobante." + (venc ? " Tienes hasta el " + diaLargo(venc) + "." : "")
          : "Págalo en efectivo al recibir tu pedido, o por transferencia subiendo tu comprobante." }));
        const datos = h("div", { class: "pp-pago-datos" });
        const bVer = h("button", { class: "pp-btn", type: "button", text: "Ver datos para transferir" });
        bVer.addEventListener("click", () => verDatosPago(tipo, datos, bVer));
        const bYa = h("button", { class: "pp-btn primary", type: "button", text: "Ya pagué · subir comprobante" });
        bYa.addEventListener("click", () => subirComprobante(tipo, bYa));
        caja.append(h("div", { class: "row" }, bVer, bYa), datos);
        if (pago.ultimoRechazo) caja.appendChild(h("p", { class: "pp-hint bad", text: "El vendedor no encontró tu pago anterior: " + pago.ultimoRechazo.motivo }));
      } else {
        caja.appendChild(h("p", { class: "pp-hint", text: "Comprobante enviado. Esperando que el vendedor confirme tu pago." }));
        caja.appendChild(miniaturaComprobante(pago.comprobante));
      }
    } else if (pago.estado === "pendiente") {
      caja.appendChild(h("p", { class: "pp-hint", text: tipo === "anticipo"
        ? "Esperando que el cliente pague el anticipo. Si ya te pagó en efectivo, regístralo."
        : "Cobra el restante al entregar. Al registrarlo el pedido pasa a entregado." }));
      const b = h("button", { class: "pp-btn primary", type: "button", text: tipo === "anticipo" ? "Recibí el anticipo en efectivo" : "Recibí el restante en efectivo" });
      b.addEventListener("click", () => confirmarRecibido(tipo, "efectivo", b));
      caja.appendChild(h("div", { class: "row" }, b));
    } else {
      caja.appendChild(h("p", { class: "pp-hint", text: "El cliente subió su comprobante. Revisa tu cuenta y confirma." }));
      caja.appendChild(miniaturaComprobante(pago.comprobante));
      const bOk = h("button", { class: "pp-btn primary", type: "button", text: tipo === "anticipo" ? "Confirmar pago recibido" : "Confirmar y entregar" });
      bOk.addEventListener("click", () => confirmarRecibido(tipo, "transferencia", bOk));
      const bNo = h("button", { class: "pp-btn danger", type: "button", text: "No lo recibí" });
      bNo.addEventListener("click", () => noRecibido(tipo));
      caja.appendChild(h("div", { class: "row" }, bOk, bNo));
    }
  } else if (e === "en_elaboracion" && r && !vendedor && r.estado === "pendiente") {
    caja.appendChild(h("p", { class: "pp-hint", text: "El restante se paga al recibir tu pedido." }));
  }
  ui.pagos.appendChild(caja);
  ui.pagos.style.display = "";
}

// ---------------------------------------------------------------- entrega (pedido listo)

const HORAS = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"];
let guardados = null; // promesa con los datos de entrega que el comprador ya tiene guardados

const horarioTxt = (d) => [d.dias.join(", "), d.desde && d.hasta ? d.desde + " – " + d.hasta : ""].filter(Boolean).join(" · ");

function leerGuardados() {
  if (guardados) return guardados;
  const L = (k) => localStorage.getItem(k) || "";
  const arma = (dir, dias, desde, hasta, nota) => ({ direccion: dir || "", dias: dias || [], desde: desde || "", hasta: hasta || "", nota: nota || "" });
  return (guardados = (async () => {
    if (L("client_address")) return arma(L("client_address"), L("client_days").split(",").filter(Boolean), L("client_hour_from"), L("client_hour_to"), L("client_note"));
    try {
      const q = new URLSearchParams({ action: "leerPerfilComprador", telefono: identidad.tel, compradorToken: L("comprador_token") });
      const r = await (await fetch(window.AUTH_API_URL + "?" + q)).json();
      const p = r.ok && r.perfil;
      return p ? arma(p.direccion, p.dias, p.horaDesde, p.horaHasta, p.nota) : arma();
    } catch (_) { return arma(); }
  })());
}

// Manda los datos al vendedor (llegan como mensaje del chat) y los deja guardados para la próxima.
async function mandarDatos(d, btn) {
  if (!(await hacer(btn, "guardarEntregaPedido", { direccion: d.direccion, horario: horarioTxt(d), nota: d.nota }))) return false;
  const L = localStorage;
  L.setItem("client_address", d.direccion); L.setItem("client_hour_from", d.desde); L.setItem("client_hour_to", d.hasta); L.setItem("client_note", d.nota);
  guardados = Promise.resolve(d);
  fetch(window.AUTH_API_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({
    action: "guardarPerfilComprador", telefono: identidad.tel, compradorToken: L.getItem("comprador_token") || "",
    direccion: d.direccion, dias: d.dias.join(","), horaDesde: d.desde, horaHasta: d.hasta, nota: d.nota }).toString() }).catch(() => {});
  toast("Datos enviados al vendedor");
  return true;
}

function abrirFormEntrega(d) {
  const sel = (v, ph) => h("select", {}, h("option", { value: "", text: ph }), HORAS.map((x) => h("option", { value: x, text: x, selected: x === v })));
  const dir = h("textarea", { maxlength: "250", placeholder: "Calle, número, colonia, ciudad…" }); dir.value = d.direccion;
  const nota = h("textarea", { maxlength: "300", placeholder: "Ej: tocar el timbre 2 veces" }); nota.value = d.nota;
  const desde = sel(d.desde, "Desde"), hasta = sel(d.hasta, "Hasta"), err = h("div", { class: "err" });
  ventana("Datos de entrega", h("div", {}, h("label", { text: "Dirección" }), dir, h("label", { text: "Horario" }), h("div", { class: "row" }, desde, hasta), h("label", { text: "Comentarios" }), nota, err), [
    ["Cancelar", "", (b, cerrar) => cerrar()],
    ["Guardar y enviar", "primary", async (b, cerrar) => {
      if (dir.value.trim().length < 5) { err.textContent = "Escribe tu dirección."; return; }
      if (await mandarDatos({ ...d, direccion: dir.value.trim(), desde: desde.value, hasta: hasta.value, nota: nota.value.trim() }, b)) cerrar();
    }]
  ]);
}

function renderEntrega() {
  ui.entrega.replaceChildren();
  const info = pedido.entregaInfo, en = pedido.entrega;
  if (estadoEfectivo() !== "listo" || !info) { ui.entrega.style.display = "none"; return; }
  ui.entrega.style.display = "";
  const comprador = identidad.rol === "comprador", dom = info.domicilio;
  const caja = h("div", { class: "pp-pago" }, h("h4", { text: dom ? "Entrega a domicilio" : "Recoger el pedido" }));
  const hint = (t) => caja.appendChild(h("p", { class: "pp-hint", text: t }));
  const btn = (txt, clase, fn) => { const b = h("button", { class: "pp-btn " + clase, type: "button", text: txt }); b.addEventListener("click", () => fn(b)); return b; };
  const fila = (...bs) => caja.appendChild(h("div", { class: "row" }, ...bs));
  ui.entrega.appendChild(caja);
  if (!dom && info.punto) hint("Punto de recolección: " + info.punto);

  if (!comprador) {
    hint(!en ? (dom ? "Esperando que el cliente confirme sus datos de entrega." : "Esperando la hora a la que pasará el cliente.")
      : en.tipo === "recoleccion" ? "El cliente pasa a las " + en.hora : en.direccion + (en.horario ? " · " + en.horario : "") + (en.nota ? " · " + en.nota : ""));
  } else if (!dom) {
    const sel = h("select", {}, HORAS.map((x) => h("option", { value: x, text: x, selected: !!en && en.hora === x })));
    hint(en ? "Pasas por tu pedido a las " + en.hora + "." : "Avisa a qué hora pasas por él.");
    fila(sel, btn(en ? "Cambiar hora" : "Avisar", "primary", async (b) => { if (await hacer(b, "guardarEntregaPedido", { hora: sel.value })) toast("Hora enviada al vendedor"); }));
  } else if (en) {
    hint(en.direccion + (en.horario ? " · " + en.horario : "") + (en.nota ? " · " + en.nota : ""));
    fila(btn("Actualizar datos", "", async () => abrirFormEntrega(await leerGuardados())));
  } else {
    leerGuardados().then((d) => {
      if (!d.direccion) { hint("Dinos dónde entregarte tu pedido."); fila(btn("Agregar datos de entrega", "primary", () => abrirFormEntrega(d))); return; }
      hint("¿Usar estos datos de entrega?");
      caja.appendChild(h("dl", { class: "pp-datos" }, h("dt", { text: "Dirección" }), h("dd", { text: d.direccion }),
        horarioTxt(d) ? [h("dt", { text: "Horario" }), h("dd", { text: horarioTxt(d) })] : null, d.nota ? [h("dt", { text: "Nota" }), h("dd", { text: d.nota })] : null));
      fila(btn("Sí, usar estos datos", "primary", (b) => mandarDatos(d, b)), btn("Cambiar datos", "", () => abrirFormEntrega(d)));
    });
  }
}

// ---------------------------------------------------------------- confianza (fase 3)

const MOTIVOS_REPORTE = [
  ["acoso", "Acoso o insultos"], ["estafa", "Posible estafa o pago irregular"], ["contenido", "Contenido inapropiado"],
  ["incumplimiento", "Incumplimiento del acuerdo"], ["otro", "Otro motivo"]
];

let estrellasElegidas = 0;

function estrellasTxt(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

function renderCierre() {
  ui.cierre.replaceChildren();
  const e = estadoEfectivo();
  if (e !== "entregado") { ui.cierre.style.display = "none"; return; }
  const cal = pedido.calificacion;
  const caja = h("div", { class: "pp-pago" });
  if (cal) {
    caja.append(
      h("h4", { text: identidad.rol === "comprador" ? "Tu calificación" : "Calificación del cliente" }),
      h("div", { class: "pp-estrellas fija", text: estrellasTxt(cal.estrellas), "aria-label": cal.estrellas + " de 5 estrellas" }),
      cal.comentario ? h("p", { class: "pp-hint", text: cal.comentario }) : null);
  } else if (identidad.rol === "comprador") {
    caja.appendChild(h("h4", { text: "¿Cómo te fue con tu pedido?" }));
    const fila = h("div", { class: "pp-estrellas" });
    const pintar = () => [...fila.children].forEach((b, i) => { b.textContent = i < estrellasElegidas ? "★" : "☆"; b.classList.toggle("on", i < estrellasElegidas); });
    for (let i = 1; i <= 5; i++) {
      const b = h("button", { type: "button", "aria-label": i + (i === 1 ? " estrella" : " estrellas"), text: "☆" });
      b.addEventListener("click", () => { estrellasElegidas = i; pintar(); });
      fila.appendChild(b);
    }
    const coment = h("textarea", { maxlength: "300", placeholder: "Cuéntale a otros cómo fue (opcional)", rows: "2", style: "width:100%;box-sizing:border-box;margin-top:8px;padding:8px;border-radius:10px;border:1px solid var(--color-border-subtle,#d1d5db);background:var(--color-surface-1,#fff);color:inherit;font:inherit;font-size:14px" });
    const enviar = h("button", { class: "pp-btn primary", type: "button", text: "Enviar calificación", style: "margin-top:8px;width:100%" });
    enviar.addEventListener("click", async () => {
      if (!estrellasElegidas) { toast("Elige de 1 a 5 estrellas"); return; }
      const r = await hacer(enviar, "calificarPedido", { estrellas: estrellasElegidas, comentario: coment.value.trim() });
      if (r) { estrellasElegidas = 0; toast("¡Gracias por calificar!"); }
    });
    caja.append(fila, coment, enviar);
    pintar();
  } else {
    caja.appendChild(h("p", { class: "pp-hint", text: "Aún no hay calificación del cliente para este pedido." }));
  }
  ui.cierre.appendChild(caja);
  ui.cierre.style.display = "";
}

function abrirMenu() {
  if (!pedido) return;
  const otro = identidad.rol === "vendedor" ? (pedido.compradorNombre || "el cliente") : (pedido.vendedorNombre || "el vendedor");
  const yaBloqueado = pedido.bloqueadoPor === identidad.rol;
  const ov = ventana("Más opciones", h("p", { class: "pp-hint", text: "Conversación con " + otro }), [
    ["Reportar conversación", "", (b, cerrar) => { cerrar(); abrirReporte(); }],
    yaBloqueado
      ? ["Desbloquear a " + otro, "", async (b, cerrar) => { const r = await hacer(b, "desbloquearUsuario"); if (r) { cerrar(); toast("Desbloqueado"); } }]
      : ["Bloquear a " + otro, "danger", (b, cerrar) => { cerrar(); confirmarBloqueo(otro); }],
    ["Cerrar", "", (b, cerrar) => cerrar()]
  ]);
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
