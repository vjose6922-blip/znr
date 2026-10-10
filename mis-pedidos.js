/**
 * mis-pedidos.js — lista de pedidos personalizados, como cliente y/o como vendedor.
 *
 * Consulta con where('participantes','array-contains', uid) (lo que exigen las reglas) y
 * ordena en el cliente, así no hace falta crear ningún índice compuesto en Firestore.
 * Es lectura única (getDocs), no listener: la lista se recarga al volver a la pestaña.
 */
import { getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = document.getElementById("app");
const db = getFirestore(getApp());
const params = new URLSearchParams(location.search);

const FILTROS = [
  ["todos", "Todos", () => true],
  ["tuturno", "Tu turno", null],
  ["proceso", "En proceso", (e) => ["aceptado", "en_elaboracion", "listo"].includes(e)],
  ["entregados", "Entregados", (e) => e === "entregado"],
  ["cerrados", "Cerrados", (e) => ["rechazado", "cancelado", "expirado"].includes(e)]
];
const TEXTO_ESTADO = {
  solicitado: "Esperando cotización", cotizado: "Cotización enviada", aceptado: "Aceptado",
  en_elaboracion: "En elaboración", listo: "Listo", entregado: "Entregado",
  rechazado: "Rechazada", cancelado: "Cancelado", expirado: "Expirada"
};

let sesiones = {};   // { comprador: {tel}, vendedor: {token, uid} }
let rolActual = "comprador";
let filtro = "todos";
let datos = {};      // rol -> array de pedidos

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

const ms = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0);

function fechaCorta(t) {
  if (!t) return "";
  const d = new Date(t), hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function estadoEfectivo(p) {
  const venc = ms(p.expiraEn);
  const anticipoPendiente = p.estado === "aceptado" && p.pagoAnticipo && p.pagoAnticipo.estado === "pendiente";
  if ((p.estado === "solicitado" || p.estado === "cotizado" || anticipoPendiente) && venc && venc < Date.now()) return "expirado";
  return p.estado;
}

const esMiTurno = (p, rol) => {
  const e = estadoEfectivo(p);
  // Pago en juego: anticipo al aceptar, restante cuando el pedido está listo.
  const pago = e === "aceptado" ? p.pagoAnticipo : e === "listo" ? p.pagoRestante : null;
  const pagoEstado = pago ? pago.estado : "";
  if (rol === "vendedor") return e === "solicitado" || pagoEstado === "por_confirmar";
  return e === "cotizado" || pagoEstado === "pendiente" || (e === "entregado" && !p.calificacion);
};

function leerSesionVendedor() {
  try {
    const raw = localStorage.getItem("vendor_session") || sessionStorage.getItem("vendor_session");
    const s = raw ? JSON.parse(raw) : null;
    return s && s.token && s.uid ? s : null;
  } catch (_) { return null; }
}

async function cargarRol(rol) {
  const s = sesiones[rol];
  const ownerType = rol === "vendedor" ? "vendedor" : "cliente";
  const ref = rol === "vendedor" ? s.token : s.tel;
  const authUid = await window.znrFirestore.signIn(ownerType, ref);
  if (!authUid) throw new Error("No se pudo iniciar sesión");
  const q = query(collection(db, "pedidos_personalizados"), where("participantes", "array-contains", authUid), limit(100));
  const snap = await getDocs(q);
  datos[rol] = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.actualizadoEn) - ms(a.actualizadoEn));
}

function render() {
  const lista = datos[rolActual];
  const hayAmbos = sesiones.comprador && sesiones.vendedor;
  const partes = [h("div", { class: "pp-head" },
    h("a", { class: "pp-back", href: rolActual === "vendedor" ? "vendedor.html" : "comunidad.html", "aria-label": "Volver", text: "‹" }),
    h("div", { class: "pp-head-info" }, h("b", { text: "Pedidos personalizados" }), h("span", { text: rolActual === "vendedor" ? "Solicitudes de tus clientes" : "Lo que has pedido" })))];

  if (hayAmbos) {
    partes.push(h("div", { class: "pp-tabs" },
      ["comprador", "vendedor"].map((r) => h("button", {
        type: "button", class: r === rolActual ? "on" : "", text: r === "vendedor" ? "Como vendedor" : "Como cliente",
        onclick: async () => { rolActual = r; await asegurarDatos(); render(); }
      }))));
  }

  const turnoN = (lista || []).filter((p) => esMiTurno(p, rolActual)).length;
  partes.push(h("div", { class: "pp-chips" }, FILTROS.map(([k, txt]) => h("button", {
    type: "button", class: k === filtro ? "on" : "",
    text: k === "tuturno" && turnoN ? txt + " (" + turnoN + ")" : txt,
    onclick: () => { filtro = k; render(); }
  }))));

  const filtrada = (lista || []).filter((p) => {
    if (filtro === "tuturno") return esMiTurno(p, rolActual);
    const f = FILTROS.find(([k]) => k === filtro);
    return f[2](estadoEfectivo(p));
  });

  const cont = h("div", { class: "pp-list" });
  if (!lista) cont.appendChild(h("div", { class: "pp-state", text: "Cargando…" }));
  else if (!filtrada.length) cont.appendChild(h("div", { class: "pp-state", text: lista.length ? "No hay pedidos en este filtro." : (rolActual === "vendedor" ? "Aún no tienes solicitudes personalizadas." : "Aún no has pedido nada personalizado.") }));
  else filtrada.forEach((p) => {
    const e = estadoEfectivo(p);
    const otro = rolActual === "vendedor" ? (p.compradorNombre || "Cliente") : (p.vendedorNombre || "");
    const ult = p.ultimoMensaje;
    const quien = ult && ult.autorRol === "sistema" ? "" : ult && ((ult.autorRol === "vendedor") === (rolActual === "vendedor")) ? "Tú: " : "";
    const clase = e === "entregado" ? " ok" : ["rechazado", "cancelado", "expirado"].includes(e) ? " bad" : esMiTurno(p, rolActual) ? " warn" : "";
    cont.appendChild(h("a", { class: "pp-card", href: "pedido-chat.html?pedido=" + encodeURIComponent(p.id) + "&rol=" + rolActual },
      esMiTurno(p, rolActual) ? h("span", { class: "turno", "aria-label": "Te toca responder" }) : null,
      p.productoImagen ? h("img", { src: p.productoImagen, alt: "", loading: "lazy" }) : h("div", { style: "width:54px;height:54px;border-radius:10px;background:var(--color-surface-3,#e5e7eb);flex-shrink:0" }),
      h("div", { class: "info" }, h("b", { text: p.productoNombre || "Pedido" }), h("small", { text: otro }), h("small", { text: ult ? quien + ult.texto : "" })),
      h("div", { class: "meta" }, h("span", { class: "pp-badge" + clase, text: TEXTO_ESTADO[e] || e }), h("small", { text: fechaCorta(ms(p.actualizadoEn)) }))));
  });
  partes.push(cont);
  app.replaceChildren(...partes);
}

async function asegurarDatos() {
  if (datos[rolActual]) return;
  render(); // muestra "Cargando…"
  try { await cargarRol(rolActual); }
  catch (_) { datos[rolActual] = []; }
}

// Al volver a la pestaña se refresca (es lectura única, no listener).
document.addEventListener("visibilitychange", async () => {
  if (document.hidden || !datos[rolActual]) return;
  try { await cargarRol(rolActual); render(); } catch (_) {}
});

(async function iniciar() {
  if (!window.znrFirestore || !window.znrFirestore.signIn) { app.replaceChildren(h("div", { class: "pp-state", text: "No se pudo iniciar. Recarga la página." })); return; }
  const tel = (localStorage.getItem("client_phone") || "").replace(/\D/g, "");
  if (tel.length === 10 && localStorage.getItem("comprador_token")) sesiones.comprador = { tel };
  const vs = leerSesionVendedor();
  if (vs) sesiones.vendedor = { token: vs.token, uid: vs.uid };
  if (!sesiones.comprador && !sesiones.vendedor) {
    app.replaceChildren(h("div", { class: "pp-state" }, "Para ver tus pedidos entra como cliente desde ", h("a", { href: "comunidad.html", text: "Comunidad" }), " o como vendedor desde ", h("a", { href: "vendedor.html", text: "tu panel" }), "."));
    return;
  }
  rolActual = params.get("rol") === "vendedor" && sesiones.vendedor ? "vendedor" : sesiones.comprador ? "comprador" : "vendedor";
  await asegurarDatos();
  render();
})();
