/**
 * functions/live-api/index.js
 * ------------------------------------------------------------------
 * Migra Live Shopping + Entregas Live (GAS/Sheets → Firestore).
 *
 * Decisiones tomadas con el usuario:
 *  - cerrarVentasLive crea pedidos en ventas_comunidad (la MISMA
 *    colección que usan los pedidos normales de Comunidad), no una
 *    estructura aparte — así heredan gratis calificaciones, feed de
 *    actividad y analytics ya construidos en ventas-api.
 *  - certificarVendedorLive y obtenerContactosParaCierre, que en GAS
 *    usaban Realtime Database, ahora usan Firestore (lives/{id} y
 *    lives_contactos/{id}/viewers/{uid}) — RTDB se queda solo para
 *    presencia/chat en vivo (eso es 100% frontend, no toca backend).
 *  - Los contactos de espectadores (antes escritos directo a RTDB
 *    desde el navegador del comprador) ahora se mandan por una acción
 *    pública nueva (registrarContactoLive) en vez de un write directo
 *    a Firestore — mismo patrón de "todo write público pasa por una
 *    Cloud Function" que el resto de la migración.
 * ------------------------------------------------------------------
 */

const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const ALLOWED_ORIGINS = ["https://vjose6922-blip.github.io"];
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const VENDEDOR_URL = "https://vjose6922-blip.github.io/znr/vendedor.html";
const INDEX_URL = "https://vjose6922-blip.github.io/znr/index.html";

// ---------------------------- Helpers compartidos ----------------------------

async function authenticateVendor(token) {
  if (!token) return null;
  const snap = await db.collection("vendedores").where("token", "==", token).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  if (d.estado !== "activo") return null;
  return { uid: d.uid, nombre: d.nombre, telefono: d.telefono, plan: d.plan };
}

async function enviarPush(ownerType, ownerId, titulo, cuerpo, url) {
  const ownerDocId = `${ownerType}_${ownerId}`;
  const tokensSnap = await db.collection("fcm_tokens").doc(ownerDocId).collection("tokens").get();
  let enviados = 0;
  await Promise.all(
    tokensSnap.docs.map(async (tDoc) => {
      try {
        await messaging.send({
          token: tDoc.data().token,
          notification: { title: titulo || "Z&R", body: cuerpo || "Novedades en Z&R!" },
          data: { url: url || INDEX_URL },
          webpush: { fcmOptions: { link: url || INDEX_URL }, notification: { icon: "https://vjose6922-blip.github.io/znr/logo.svg" } },
        });
        enviados++;
      } catch (err) {
        const code = err && err.errorInfo && err.errorInfo.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          await tDoc.ref.delete().catch(() => {});
        }
      }
    })
  );
  return enviados;
}

async function crearNotificacionCentro(ownerType, ownerId, tipo, titulo, mensaje, url, meta) {
  const id = "NC_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  await db.collection("notificaciones_centro").doc(`${ownerType}_${ownerId}`).collection("items").doc(id).set({
    tipo, titulo, mensaje, url: url || "", leida: false, fecha: FieldValue.serverTimestamp(), meta: meta || {},
  });
  const enviados = await enviarPush(ownerType, ownerId, titulo, mensaje, url).catch(() => 0);
  return { id, enviados };
}

function resumenItems(items) {
  return items.map((it) => `${it.cantidad}x ${it.nombre}`).join(", ");
}

// ---------------------------- Sesiones Live ----------------------------

async function crearSesionLive(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };
  if (vendor.plan !== "plus") return { ok: false, error: "Transmitir en vivo es exclusivo del plan Plus." };

  // TODO: quitar YouTube y volver a exigir solo Facebook cuando FB ya
  // no le pida seguidores al vendedor de prueba (agregado temporalmente
  // para poder probar lives sin depender de esa restricción de FB).
  const facebookLink = body.facebook_link;
  if (!facebookLink || !/facebook\.com|fb\.watch|youtube\.com|youtu\.be/i.test(facebookLink)) {
    return { ok: false, error: "El link debe ser de Facebook o YouTube." };
  }

  const tipo = body.tipo === "vivo" ? "vivo" : "grabado";
  const orientacion = body.orientacion === "vertical" ? "vertical" : "horizontal";
  const id = crypto.randomUUID();

  await db.collection("lives").doc(id).set({
    id,
    vendedor_id: vendor.uid,
    vendedor_nombre: vendor.nombre,
    titulo: body.titulo || "",
    descripcion: body.descripcion || "",
    productos_ids: body.productos_ids || "",
    producto_actual_id: "",
    estado: "programado",
    fecha_creacion: FieldValue.serverTimestamp(),
    fecha_inicio: null,
    fecha_fin: null,
    tipo,
    orientacion,
    facebook_link: facebookLink,
    vendedorOficialUid: null,
  });

  return { ok: true, id, tipo, orientacion };
}

async function actualizarEstadoLive(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  const ref = db.collection("lives").doc(body.id || "");
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: "Sesión no encontrada" };
  if (doc.data().vendedor_id !== vendor.uid) return { ok: false, error: "No puedes modificar esta sesión" };

  const cambios = {};
  let fechaInicioFinal = doc.data().fecha_inicio || null;
  if (body.estado) {
    cambios.estado = body.estado;
    if (body.estado === "en_vivo" && !doc.data().fecha_inicio) {
      cambios.fecha_inicio = FieldValue.serverTimestamp();
      fechaInicioFinal = new Date();
    }
    if (body.estado === "terminado") cambios.fecha_fin = FieldValue.serverTimestamp();
  }
  if (typeof body.producto_actual_id !== "undefined") cambios.producto_actual_id = body.producto_actual_id;

  await ref.update(cambios);
  return { ok: true, fecha_inicio: fechaInicioFinal ? new Date(fechaInicioFinal).toISOString() : null };
}

async function obtenerLivesActivos() {
  const snap = await db.collection("lives").where("estado", "==", "en_vivo").get();
  return { ok: true, lives: snap.docs.map((d) => d.data()) };
}

async function obtenerSesionLivePorId(query) {
  if (!query.id) return { ok: false, error: "Falta id" };
  const doc = await db.collection("lives").doc(query.id).get();
  if (!doc.exists) return { ok: false, error: "Sesión no encontrada" };
  return { ok: true, sesion: doc.data() };
}

async function obtenerMisSesionesLive(query) {
  const vendor = await authenticateVendor(query.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };
  const snap = await db.collection("lives").where("vendedor_id", "==", vendor.uid).get();
  const sesiones = snap.docs.map((d) => d.data()).sort((a, b) => (b.fecha_creacion?.toMillis?.() || 0) - (a.fecha_creacion?.toMillis?.() || 0));
  return { ok: true, sesiones };
}

// Unifica las ventas del live con el pipeline normal de pedidos de
// Comunidad (ventas_comunidad) — así el confirmar/entregar, calificar,
// feed de actividad y analytics ya construidos aplican solos.
async function cerrarVentasLive(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  let ventas;
  try { ventas = JSON.parse(body.ventas || "[]"); }
  catch { return { ok: false, error: "Formato de ventas inválido" }; }
  if (!ventas.length) return { ok: true, added: 0, compradores: 0 };

  const productIds = [...new Set(ventas.map((v) => String(v.productId)))];
  const productDocs = await Promise.all(productIds.map((id) => db.collection("productos_comunidad").doc(id).get()));
  const productMap = {};
  productDocs.forEach((d, i) => { if (d.exists) productMap[productIds[i]] = d.data(); });

  const timestamp = Date.now();
  const grupos = {}; // telefono -> { requestId, items[], clientName, clientAddress, clientSchedule }

  ventas.forEach((v, idx) => {
    const tel = String(v.comprador_telefono || "").trim() || `sin_tel_${idx}`;
    if (!grupos[tel]) {
      grupos[tel] = {
        requestId: `LIVE_${timestamp}_${Object.keys(grupos).length}`,
        clientPhone: v.comprador_telefono || "",
        clientName: v.comprador_nombre || "",
        clientAddress: v.comprador_direccion || "",
        clientSchedule: v.comprador_horario || "",
        items: [],
      };
    }
    const prod = productMap[String(v.productId)] || {};
    grupos[tel].items.push({
      productId: v.productId || "",
      nombre: prod.nombre || "",
      cantidad: 1,
      talla: prod.talla || "",
      precio: Number(prod.precio) || 0,
      imagen: prod.imagen1 || "",
    });
  });

  const batch = db.batch();
  Object.values(grupos).forEach((g) => {
    const ref = db.collection("ventas_comunidad").doc(vendor.uid).collection("pedidos").doc(g.requestId);
    batch.set(ref, {
      requestId: g.requestId,
      estado: "pendiente",
      clientPhone: g.clientPhone,
      clientName: g.clientName,
      clientAddress: g.clientAddress,
      clientSchedule: g.clientSchedule,
      clientLat: null,
      clientLng: null,
      fecha: FieldValue.serverTimestamp(),
      items: g.items,
      origenLive: body.liveId || "",
    });
  });
  await batch.commit();

  return { ok: true, added: ventas.length, compradores: Object.keys(grupos).length };
}

// ---------------------------- Reportes de Live ----------------------------

async function reportarSesionLive(body) {
  try {
    const ref = db.collection("lives_reportes").doc();
    await ref.set({
      reporteId: ref.id,
      timestamp: FieldValue.serverTimestamp(),
      liveId: body.liveId || "",
      liveTitulo: body.liveTitulo || "",
      vendedorUid: body.vendedor_uid || "",
      vendedorNombre: body.vendedor_nombre || "",
      motivo: body.motivo || "",
      telefonoUsuario: body.telefonoUsuario || "",
      revisado: false,
      facebookLink: body.facebookLink || "",
    });
    return { ok: true, reporteId: ref.id };
  } catch (err) {
    logger.error("Error reportarSesionLive", err);
    return { ok: false, error: String(err) };
  }
}

async function obtenerReportesLive(query) {
  if (!query.token || query.token !== ADMIN_TOKEN) return { ok: false, error: "No autorizado" };
  const snap = await db.collection("lives_reportes").where("revisado", "==", false).get();
  return { ok: true, reportes: snap.docs.map((d) => d.data()) };
}

async function marcarReporteLiveRevisado(body) {
  if (!body.token || body.token !== ADMIN_TOKEN) return { ok: false, error: "No autorizado" };
  const ref = db.collection("lives_reportes").doc(body.reporteId || "");
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: "Reporte no encontrado" };
  await ref.update({ revisado: true });
  return { ok: true };
}

// ---------------------------- Certificación + contactos (antes RTDB) ----------------------------

async function certificarVendedorLive(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  const liveId = String(body.liveId || "").trim();
  const uid = String(body.uid || "").trim();
  if (!liveId || !uid) return { ok: false, error: "Faltan parámetros" };

  const liveDoc = await db.collection("lives").doc(liveId).get();
  if (!liveDoc.exists || liveDoc.data().vendedor_id !== vendor.uid) {
    return { ok: false, error: "No eres dueño de esta transmisión" };
  }

  await liveDoc.ref.update({ vendedorOficialUid: uid });
  return { ok: true };
}

async function registrarContactoLive(body) {
  const liveId = String(body.liveId || "").trim();
  const viewerUid = String(body.viewerUid || "").trim();
  if (!liveId || !viewerUid) return { ok: false, error: "Faltan parámetros" };

  const payload = {
    telefono: body.telefono || "",
    direccion: body.direccion || "",
    horario: body.horario || "",
    ts: FieldValue.serverTimestamp(),
  };
  if (typeof body.lat === "number" || (body.lat !== undefined && body.lat !== "")) payload.lat = Number(body.lat);
  if (typeof body.lng === "number" || (body.lng !== undefined && body.lng !== "")) payload.lng = Number(body.lng);

  await db.collection("lives_contactos").doc(liveId).collection("viewers").doc(viewerUid).set(payload, { merge: true });
  return { ok: true };
}

// Solo el vendedor dueño del live, al cerrarlo, puede leer los
// contactos — mismo criterio de acceso que tenía en RTDB.
async function obtenerContactosParaCierre(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  const liveId = String(body.liveId || "").trim();
  if (!liveId) return { ok: false, error: "Falta liveId" };

  const liveDoc = await db.collection("lives").doc(liveId).get();
  if (!liveDoc.exists || liveDoc.data().vendedor_id !== vendor.uid) {
    return { ok: false, error: "No eres dueño de esta transmisión" };
  }

  const snap = await db.collection("lives_contactos").doc(liveId).collection("viewers").get();
  const contactos = {};
  snap.forEach((d) => { contactos[d.id] = d.data(); });

  let uidsSolicitados = [];
  try { uidsSolicitados = JSON.parse(body.uids || "[]"); } catch { /* noop */ }
  const expiraEn = new Date();
  expiraEn.setMonth(expiraEn.getMonth() + 3);
  await db.collection("lives_accesos_contacto").add({
    vendorUid: vendor.uid, liveId, uidsSolicitados, fecha: FieldValue.serverTimestamp(), expiraEn,
  });

  return { ok: true, contactos };
}

// ---------------------------- Entregas Live ----------------------------

async function guardarEntregasLive(body) {
  const vendor = await authenticateVendor(body.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  let grupos;
  try { grupos = JSON.parse(body.grupos || "[]"); }
  catch { return { ok: false, error: "Formato de grupos inválido" }; }
  if (!grupos.length) return { ok: true, added: 0 };

  const liveId = body.liveId || "";
  const liveTitulo = body.liveTitulo || "";
  const batch = db.batch();
  grupos.forEach((g) => {
    const id = `${liveId}_${g.key}`;
    const ref = db.collection("entregas_live").doc(id);
    batch.set(ref, {
      id, liveId, liveTitulo, vendedorUid: vendor.uid, vendedorNombre: vendor.nombre,
      compradorKey: g.key || "", compradorNombre: g.nombre || "", compradorTelefono: g.telefono || "",
      compradorDireccion: g.direccion || "", compradorHorario: g.horario || "",
      lat: typeof g.lat === "number" ? g.lat : null, lng: typeof g.lng === "number" ? g.lng : null,
      items: g.items || [], total: Number(g.total) || 0, estado: "pendiente", fecha: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { ok: true, added: grupos.length, liveId };
}

async function obtenerEntregasLive(query) {
  const liveId = query.liveId;
  if (!liveId) return { ok: false, error: "Falta liveId" };
  const snap = await db.collection("entregas_live").where("liveId", "==", liveId).get();
  if (snap.empty) return { ok: false, error: "No se encontraron entregas para esta transmisión." };
  const grupos = snap.docs.map((d) => d.data());
  return { ok: true, liveId, liveTitulo: grupos[0].liveTitulo, vendedorNombre: grupos[0].vendedorNombre, grupos };
}

async function actualizarEstadoEntrega(body) {
  const liveId = body.liveId || "";
  const compradorKey = body.compradorKey || "";
  const estado = body.estado === "entregado" ? "entregado" : "pendiente";
  if (!liveId || !compradorKey) return { ok: false, error: "Faltan parámetros" };

  const ref = db.collection("entregas_live").doc(`${liveId}_${compradorKey}`);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: "No se encontró ese comprador en esta transmisión." };

  const estadoAnterior = doc.data().estado;
  await ref.update({ estado });

  if (estado === "entregado" && estadoAnterior !== "entregado") {
    const telefono = String(doc.data().compradorTelefono || "").replace(/\D/g, "");
    const vendedorNombre = doc.data().vendedorNombre || "";
    if (telefono) {
      await crearNotificacionCentro(
        "cliente", telefono, "pedido_entregado", "🎉 ¡Pedido entregado!",
        vendedorNombre
          ? `Tu pedido de ${vendedorNombre} fue entregado con éxito. 📦 ¡Gracias por tu compra! No olvides calificar tu experiencia. ⭐`
          : "Tu pedido fue entregado con éxito. 📦 ¡Gracias por tu compra!",
        INDEX_URL, { liveId, compradorKey }
      ).catch(() => {});
    }
  }
  return { ok: true, estado };
}

async function obtenerMisEntregasLive(query) {
  const vendor = await authenticateVendor(query.vendorToken);
  if (!vendor) return { ok: false, error: "No autorizado" };

  const snap = await db.collection("entregas_live").where("vendedorUid", "==", vendor.uid).get();
  const lives = {};
  snap.forEach((d) => {
    const o = d.data();
    if (!lives[o.liveId]) lives[o.liveId] = { liveId: o.liveId, liveTitulo: o.liveTitulo, fecha: o.fecha, grupos: [] };
    lives[o.liveId].grupos.push(o);
  });
  const lista = Object.values(lives).sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
  return { ok: true, lives: lista };
}

async function notificarLlegadaEntrega(body) {
  const liveId = String(body.liveId || "");
  const key = String(body.compradorKey || "");
  if (!liveId || !key) return { ok: false, error: "Faltan parámetros" };

  const doc = await db.collection("entregas_live").doc(`${liveId}_${key}`).get();
  if (!doc.exists) return { ok: false, error: "No se encontró ese comprador en esta transmisión." };

  const telefono = String(doc.data().compradorTelefono || "").replace(/\D/g, "");
  if (!telefono) return { ok: false, error: "Este comprador no tiene teléfono registrado" };
  const vendedorNombre = doc.data().vendedorNombre || "";

  const resultado = await crearNotificacionCentro(
    "cliente", telefono, "pedido_en_camino", "🛵 ¡Ya casi llegamos!",
    vendedorNombre ? `El repartidor de ${vendedorNombre} está afuera de tu domicilio con tu pedido. 📦` : "El repartidor está afuera de tu domicilio con tu pedido. 📦",
    INDEX_URL, { liveId, compradorKey: key }
  );
  return { ok: true, enviados: resultado.enviados };
}

// ---------------------------- Router ----------------------------

const GET_ACTIONS = {
  obtenerLivesActivos, obtenerSesionLivePorId, obtenerMisSesionesLive,
  obtenerReportesLive, obtenerEntregasLive, obtenerMisEntregasLive,
};
const POST_ACTIONS = {
  crearSesionLive, actualizarEstadoLive, cerrarVentasLive,
  reportarSesionLive, marcarReporteLiveRevisado,
  certificarVendedorLive, obtenerContactosParaCierre, registrarContactoLive,
  guardarEntregasLive, actualizarEstadoEntrega, notificarLlegadaEntrega,
};

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); }
}

exports.liveApi = onRequest({ region: "us-central1", cors: ALLOWED_ORIGINS }, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const params = req.method === "GET" ? req.query : parseBody(req);
    const fn = (req.method === "GET" ? GET_ACTIONS : POST_ACTIONS)[params.action];
    if (!fn) return res.status(400).json({ ok: false, error: "Acción no reconocida: " + params.action });
    return res.status(200).json(await fn(params));
  } catch (err) {
    logger.error("Error en liveApi", err);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
});
