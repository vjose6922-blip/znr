/**
 * firestore-init.js
 * ------------------------------------------------------------------
 * Inicializa Firestore en el frontend y expone helpers de lectura en
 * window.znrFirestore para que scripts clásicos (no-módulo) como
 * comunidad.js puedan usarlos sin convertirse ellos mismos en módulos.
 *
 * Usa getApps()/getApp() para reutilizar la instancia de Firebase si
 * fcm-init.js (u otro módulo) ya la inicializó en la misma página, y
 * evitar el error "Firebase App named '[DEFAULT]' already exists".
 *
 * IMPORTANTE: agrega el <script type="module" src="firestore-init.js">
 * ANTES del <script src="comunidad.js" defer"> en el HTML, para que
 * window.znrFirestore ya exista cuando comunidad.js se ejecute.
 * ------------------------------------------------------------------
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes",
  authDomain: "znr-live.firebaseapp.com",
  databaseURL: "https://znr-live-default-rtdb.firebaseio.com",
  projectId: "znr-live",
  storageBucket: "znr-live.firebasestorage.app",
  messagingSenderId: "1038143238323",
  appId: "1:1038143238323:web:5171b9dd8823628086c0c6"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

window.znrFirestore = window.znrFirestore || {};

/**
 * Devuelve { ok: true, beneficiarios: [...] } igual que el endpoint GAS
 * obtenerBeneficiariosAprobados, o { ok: false, error } si algo falla
 * (el caller debe hacer fallback a GAS en ese caso).
 */
window.znrFirestore.getBeneficiariosAprobados = async function () {
  try {
    const snap = await getDocs(collection(db, 'beneficiarios_aprobados'));
    const beneficiarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { ok: true, beneficiarios };
  } catch (err) {
    console.warn('Firestore beneficiarios_aprobados falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};

/**
 * Devuelve { ok: true, promedio, total, detalle } igual que el endpoint
 * GAS obtenerCalificacionesVendedor, o { ok: false, error } si falla
 * (el caller debe hacer fallback a GAS en ese caso). Si el vendedor
 * todavía no tiene calificaciones, el doc puede no existir todavía en
 * Firestore (nunca se escribió) — en ese caso también se cae a GAS,
 * que sabe devolver el resumen en cero de forma segura.
 */
window.znrFirestore.getCalificacionesVendedor = async function (vendedorUid) {
  try {
    const snap = await getDoc(doc(db, 'calificaciones_vendedor', vendedorUid));
    if (!snap.exists()) return { ok: false, error: 'doc no encontrado' };
    const data = snap.data();
    return { ok: true, promedio: data.promedio, total: data.total, detalle: data.detalle || [] };
  } catch (err) {
    console.warn('Firestore calificaciones_vendedor falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};
