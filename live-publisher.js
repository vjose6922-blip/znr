// ── Transmisión dentro de ZNR: cámara + WHIP (Cloudflare Stream) ──
// Script compartido por vendedor-live.html (dispositivo principal) y
// camara-live.html (2º dispositivo que solo graba). Cada página define
// antes window.LP = { sesion(), credenciales(), urlSubida(seq, tipo) }.
// Usa los ids de DOM: vendor-preview (video), conn-aviso (aviso).
// El vendedor publica su cámara por WebRTC (WHIP) a un live input de
// Cloudflare; los compradores lo ven por WHEP en comprador-live.html.
// Cloudflare NO graba las transmisiones WebRTC, así que además se guarda
// una copia de baja calidad en segmentos (ver "Respaldo de video") que
// el backend usa para armar el clip de un reporte.

let localStream = null;
let pcActual = null;
let whipUrl = null;
let transmitiendo = false;
let camaraFacing = 'environment'; // primero la trasera: lo normal es mostrar productos
let cambiandoCamara = false;
let reconectando = false;
let discTimer = null;
let wakeLock = null;
let segmentoMs = 30000;

function videoConstraints(facing) {
  const vertical = LP.sesion().orientacion === 'vertical';
  return {
    facingMode: { ideal: facing },
    width: { ideal: vertical ? 720 : 1280 },
    height: { ideal: vertical ? 1280 : 720 },
    frameRate: { ideal: 24, max: 30 }
  };
}

function errorCamara(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return new Error('Permite el acceso a la cámara y al micrófono en tu navegador para poder transmitir.');
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return new Error('No encontramos una cámara o micrófono disponible en este dispositivo.');
  if (n === 'NotReadableError' || n === 'AbortError') return new Error('La cámara o el micrófono están siendo usados por otra app. Ciérrala e intenta de nuevo.');
  return new Error('No se pudo abrir la cámara: ' + ((e && e.message) || 'error desconocido'));
}

async function pedirCamara(facing) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints(facing),
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  } catch (e) {
    throw errorCamara(e);
  }
}

async function pedirVideoTrack(facing) {
  const s = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(facing), audio: false });
  return s.getVideoTracks()[0];
}

function ligarPreview() {
  const v = document.getElementById('vendor-preview');
  if (!v || !localStream) return;
  v.srcObject = localStream;
  v.muted = true;
  v.playsInline = true;
  v.play().catch(() => {});
  v.style.transform = camaraFacing === 'user' ? 'scaleX(-1)' : 'none'; // la frontal se ve como espejo
}

function avisoVideo(msg, onClick) {
  const el = document.getElementById('conn-aviso');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; el.onclick = null; el.style.cursor = ''; return; }
  el.textContent = msg;
  el.style.display = 'block';
  el.onclick = onClick || null;
  el.style.cursor = onClick ? 'pointer' : '';
}

function esperarIce(pc, ms) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    const fin = () => { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete') fin(); };
    const t = setTimeout(fin, ms);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

function esperarConexion(pc, ms) {
  return new Promise((resolve, reject) => {
    if (pc.connectionState === 'connected') { resolve(); return; }
    const t = setTimeout(() => { pc.removeEventListener('connectionstatechange', check); reject(new Error('timeout')); }, ms);
    const check = () => {
      const st = pc.connectionState;
      if (st === 'connected') { clearTimeout(t); pc.removeEventListener('connectionstatechange', check); resolve(); }
      else if (st === 'failed' || st === 'closed') { clearTimeout(t); pc.removeEventListener('connectionstatechange', check); reject(new Error('conexión ' + st)); }
    };
    pc.addEventListener('connectionstatechange', check);
  });
}

function cerrarPC() {
  if (!pcActual) return;
  try { pcActual.onconnectionstatechange = null; pcActual.close(); } catch (e) { /* ya estaba cerrada */ }
  pcActual = null;
}

function limitarBitrate(pc) {
  // Tope de 1.5 Mbps al video en vivo para que no compita de más con la
  // subida del respaldo. No es crítico: si el navegador no lo permite, sigue.
  try {
    pc.getSenders().forEach((sender) => {
      if (!sender.track || sender.track.kind !== 'video') return;
      const params = sender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = 1500000;
      sender.setParameters(params).catch(() => {});
    });
  } catch (e) { /* no crítico */ }
}

// Publica localStream a Cloudflare por WHIP (offer SDP -> answer SDP).
async function conectarWHIP() {
  cerrarPC();
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    bundlePolicy: 'max-bundle'
  });
  pcActual = pc;
  // Cloudflare solo acepta H264 Constrained Baseline (42e01f) en WebRTC
  const h264 = (RTCRtpSender.getCapabilities('video')?.codecs || [])
    .filter((c) => c.mimeType === 'video/H264' && /profile-level-id=42e01f/.test(c.sdpFmtpLine));
  localStream.getTracks().forEach((track) => {
    const t = pc.addTransceiver(track, { direction: 'sendonly', streams: [localStream] });
    if (track.kind === 'video' && h264.length) t.setCodecPreferences(h264);
  });
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await esperarIce(pc, 4000);
    const res = await fetch(whipUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription.sdp
    });
    if (!res.ok) throw new Error('El servidor de video respondió ' + res.status);
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
    await esperarConexion(pc, 12000);
  } catch (err) {
    if (pcActual === pc) cerrarPC();
    throw err;
  }
  limitarBitrate(pc);
  vigilarPC(pc);
}

function vigilarPC(pc) {
  pc.onconnectionstatechange = () => {
    if (pc !== pcActual || !transmitiendo) return;
    const st = pc.connectionState;
    if (st === 'connected') {
      clearTimeout(discTimer);
      avisoVideo(null);
    } else if (st === 'disconnected') {
      avisoVideo('Conexión inestable… reconectando el video.');
      clearTimeout(discTimer);
      discTimer = setTimeout(() => {
        if (pc === pcActual && pc.connectionState !== 'connected') reconectar();
      }, 5000);
    } else if (st === 'failed') {
      reconectar();
    }
  };
}

// Si se cae el WiFi o los datos, vuelve a publicar a la MISMA url de
// Cloudflare. La cámara y el respaldo siguen corriendo mientras tanto.
async function reconectar() {
  if (reconectando || !transmitiendo) return;
  reconectando = true;
  avisoVideo('Reconectando el video…');
  for (let i = 0; i < 6 && transmitiendo; i++) {
    try {
      await conectarWHIP();
      avisoVideo(null);
      reconectando = false;
      return;
    } catch (e) {
      console.error('reconectar: intento ' + (i + 1) + ' falló', e);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  reconectando = false;
  if (transmitiendo) avisoVideo('Se perdió la conexión del video. Toca aquí para reintentar.', reconectar);
}

async function pedirWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* no todos los navegadores lo permiten */ }
}

// Camera + credenciales + WHIP. Lanza Error con mensaje listo para mostrar.
async function iniciarMedios() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
    throw new Error('Este navegador no permite transmitir desde ZNR. Usa Chrome en Android o un Safari actualizado en iPhone.');
  }
  const stream = await pedirCamara(camaraFacing); // primero la cámara: si la niegan, no se gasta nada en el servidor
  let cred;
  try { cred = await LP.credenciales(); } // la página decide cómo obtiene la URL de publicación
  catch (e) { stream.getTracks().forEach((t) => t.stop()); throw e; }
  whipUrl = cred.whipUrl;
  segmentoMs = (Number(cred.segundos) || 30) * 1000;
  localStream = stream;
  try {
    await conectarWHIP();
  } catch (e) {
    console.error('conectarWHIP falló:', e);
    liberarMedios();
    throw new Error('No se pudo conectar el video. Revisa tu internet e intenta de nuevo.');
  }
  transmitiendo = true;
  pedirWakeLock();
  return true;
}

function liberarMedios() {
  transmitiendo = false;
  clearTimeout(discTimer);
  cerrarPC();
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
}

// Cierra todo: corta el respaldo (esperando hasta 8 s a que termine de
// subir el último segmento), la conexión a Cloudflare y la cámara.
async function detenerTransmision() {
  transmitiendo = false;
  respaldoActivo = false;
  clearTimeout(discTimer);
  try { await withTimeout(detenerRecorderActual(), 3000); } catch (e) { /* se sigue igual */ }
  if (subidasPendientes.size) {
    try { await withTimeout(Promise.allSettled([...subidasPendientes]), 8000); } catch (e) { /* se sigue sin esperar más */ }
  }
  liberarMedios();
  if (wakeLock) { try { await wakeLock.release(); } catch (e) { /* ya liberado */ } wakeLock = null; }
  const v = document.getElementById('vendor-preview');
  if (v) v.srcObject = null;
}

function cambiarTracksEnPC(nuevoStream) {
  if (!pcActual) return;
  pcActual.getSenders().forEach((sender) => {
    const kind = sender.track && sender.track.kind;
    if (!kind) return;
    const t = nuevoStream.getTracks().find((x) => x.kind === kind);
    if (t) sender.replaceTrack(t).catch((e) => console.error('replaceTrack falló:', e));
  });
}

// Frontal <-> trasera sin cortar la transmisión. En muchos Android hay que
// soltar la cámara actual antes de abrir la otra.
async function cambiarCamara() {
  if (!transmitiendo || !localStream || cambiandoCamara) return;
  cambiandoCamara = true;
  const btn = document.getElementById('btn-camara');
  if (btn) btn.disabled = true;
  const destino = camaraFacing === 'user' ? 'environment' : 'user';
  await pausarRespaldo();
  const viejoVideo = localStream.getVideoTracks()[0];
  if (viejoVideo) viejoVideo.stop();
  let video = null;
  try {
    video = await pedirVideoTrack(destino);
    camaraFacing = destino;
  } catch (e) {
    try { video = await pedirVideoTrack(camaraFacing); }
    catch (e2) { avisoVideo('No se pudo cambiar de cámara. Toca 🔄 Cámara para reintentar.'); }
  }
  if (video) {
    localStream = new MediaStream([video, ...localStream.getAudioTracks()]);
    cambiarTracksEnPC(localStream);
    ligarPreview();
    avisoVideo(null);
  }
  reanudarRespaldo();
  cambiandoCamara = false;
  if (btn) btn.disabled = false;
}

// Algunos celulares cortan la cámara si la pestaña pasa a segundo plano.
// Al volver, si las pistas murieron, se vuelve a abrir.
async function reabrirCamara() {
  if (!transmitiendo || !localStream || cambiandoCamara) return;
  const v = localStream.getVideoTracks()[0];
  const a = localStream.getAudioTracks()[0];
  if (v && v.readyState === 'live' && (!a || a.readyState === 'live')) return;
  cambiandoCamara = true;
  try {
    await pausarRespaldo();
    const nuevo = await pedirCamara(camaraFacing);
    const viejo = localStream;
    localStream = nuevo;
    cambiarTracksEnPC(nuevo);
    ligarPreview();
    viejo.getTracks().forEach((t) => t.stop());
    avisoVideo(null);
  } catch (e) {
    avisoVideo('No se pudo reactivar la cámara. Toca 🔄 Cámara para reintentar.');
  }
  reanudarRespaldo();
  cambiandoCamara = false;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !transmitiendo) return;
  pedirWakeLock();
  reabrirCamara();
});

window.addEventListener('beforeunload', (e) => {
  if (transmitiendo) { e.preventDefault(); e.returnValue = ''; }
});

// ── Respaldo de video para reportes ──
// Copia de baja calidad (~500 kbps) grabada en el celular, partida en
// segmentos de 30 s que se suben a un bucket privado con URLs firmadas.
// Cada segmento es un archivo independiente (se reinicia el MediaRecorder
// en cada corte), así el backend puede sacar la ventana de unos minutos
// alrededor de un reporte. Si algo falla aquí, la transmisión sigue.

let respaldoActivo = false;
let recTimer = null;
let recActual = null; // { rec, cerrado: Promise }
let mimeRespaldo = null;
let tipoRespaldo = null; // 'video/webm' | 'video/mp4'
let ultimaSeq = -1;
const subidasPendientes = new Set();

function elegirMimeRespaldo() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidatos = [
    'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'
  ];
  for (const c of candidatos) {
    try { if (MediaRecorder.isTypeSupported(c)) return c; } catch (e) { /* siguiente */ }
  }
  return null;
}

// Número de segmento = segundos desde el inicio del live, y nunca menor
// al último que se usó (se guarda en este navegador por si la vendedora
// recarga y reanuda: así no se pisa un segmento ya subido).
function siguienteSeq() {
  const ses = LP.sesion();
  const clave = 'znr_live_seq_' + ses.id;
  const inicio = ses.fecha_inicio ? new Date(ses.fecha_inicio).getTime() : NaN;
  const base = Number.isFinite(inicio) ? Math.floor((Date.now() - inicio) / 1000) : 0;
  let guardada = -1;
  try {
    const raw = localStorage.getItem(clave);
    if (raw !== null && Number.isFinite(Number(raw))) guardada = Number(raw);
  } catch (e) { /* sin storage: se usa solo el tiempo transcurrido */ }
  ultimaSeq = Math.max(base, ultimaSeq + 1, guardada + 1, 0);
  try { localStorage.setItem(clave, String(ultimaSeq)); } catch (e) { /* sin storage */ }
  return ultimaSeq;
}

async function pedirUrlSubida(seq) {
  try { return await LP.urlSubida(seq, tipoRespaldo); } catch (e) { return null; }
}

function encolarSubida(seq, urlPromise, blob) {
  if (subidasPendientes.size >= 20) {
    console.warn('Respaldo: cola de subida llena, se descarta el segmento', seq);
    return;
  }
  const p = (async () => {
    let url = await urlPromise;
    for (let intento = 0; intento < 4; intento++) {
      try {
        if (!url) url = await pedirUrlSubida(seq);
        if (!url) throw new Error('sin URL de subida');
        const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': tipoRespaldo }, body: blob });
        if (res.ok) return true;
        throw new Error('PUT ' + res.status);
      } catch (e) {
        url = null; // si la URL falló o caducó, se pide una nueva
        await new Promise((r) => setTimeout(r, 1500 * (intento + 1)));
      }
    }
    console.warn('Respaldo: no se pudo subir el segmento', seq);
    return false;
  })().finally(() => subidasPendientes.delete(p));
  subidasPendientes.add(p);
}

function iniciarCicloSegmento() {
  if (!respaldoActivo || !localStream || !mimeRespaldo) return;
  const seq = siguienteSeq();
  let rec;
  try {
    rec = new MediaRecorder(localStream, { mimeType: mimeRespaldo, videoBitsPerSecond: 500000, audioBitsPerSecond: 32000 });
  } catch (e) {
    console.error('Respaldo: no se pudo crear el MediaRecorder', e);
    respaldoActivo = false;
    return;
  }
  const chunks = [];
  const urlPromise = pedirUrlSubida(seq); // en paralelo: la hora que anota el servidor ≈ inicio de la grabación
  const cerrado = new Promise((resolve) => {
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (chunks.length) encolarSubida(seq, urlPromise, new Blob(chunks, { type: tipoRespaldo }));
      resolve();
    };
    rec.onerror = (e) => { console.error('Respaldo: error del MediaRecorder', e); };
  });
  rec.start();
  recActual = { rec, cerrado };
  recTimer = setTimeout(() => { detenerRecorderActual(); iniciarCicloSegmento(); }, segmentoMs);
}

// Detiene el segmento en curso (dispara el encolado de su subida).
function detenerRecorderActual() {
  clearTimeout(recTimer);
  recTimer = null;
  const actual = recActual;
  recActual = null;
  if (!actual) return Promise.resolve();
  try { if (actual.rec.state !== 'inactive') actual.rec.stop(); } catch (e) { /* ya estaba detenido */ }
  return actual.cerrado;
}

function pausarRespaldo() { return detenerRecorderActual(); }
function reanudarRespaldo() { if (respaldoActivo) iniciarCicloSegmento(); }

function iniciarRespaldo() {
  mimeRespaldo = elegirMimeRespaldo();
  if (!mimeRespaldo) {
    alert('Ojo: este navegador no puede guardar el respaldo de video que se usa para revisar reportes. La transmisión funciona normal.');
    return;
  }
  tipoRespaldo = mimeRespaldo.indexOf('video/mp4') === 0 ? 'video/mp4' : 'video/webm';
  respaldoActivo = true;
  iniciarCicloSegmento();
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

// Barra de nivel de audio: se pone roja si hay ~6 s de silencio (micrófono caído).
// Devuelve una función para detenerla.
function medidorAudio(stream, barra) {
  if (!barra || !stream.getAudioTracks().length) return () => {};
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const an = ctx.createAnalyser();
  an.fftSize = 256;
  ctx.createMediaStreamSource(stream).connect(an);
  ctx.resume().catch(() => {});
  const buf = new Uint8Array(an.fftSize);
  let mudo = 0;
  const t = setInterval(() => {
    an.getByteTimeDomainData(buf);
    const nivel = Math.max(...buf.map((b) => Math.abs(b - 128)));
    mudo = nivel < 2 ? mudo + 1 : 0;
    barra.style.width = Math.min(100, nivel * 2) + '%';
    barra.style.background = mudo > 40 ? '#ef4444' : '#4ade80';
  }, 150);
  return () => { clearInterval(t); ctx.close().catch(() => {}); };
}
