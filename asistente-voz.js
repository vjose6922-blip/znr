/* ============================================================
 * ASISTENTE DE VOZ — Z&R
 * ------------------------------------------------------------
 * Archivo único: no crea un botón flotante. En su lugar, inyecta
 * un switch de encendido/apagado dentro del panel de "Preferencias"
 * (el que abre el ícono de engranaje del header, #up-open-btn /
 * #up-panel en common.js) sin necesidad de tocar common.js.
 *
 * Cómo lo logra sin editar common.js:
 * Un MutationObserver vigila el <body>. Cada vez que el panel de
 * preferencias se abre (common.js crea un nuevo #up-panel desde
 * cero cada vez), este script detecta su aparición e inyecta la
 * fila "Asistente de voz" dentro de la pestaña "Apariencia".
 *
 * Con el switch en ON, el asistente queda escuchando de forma
 * continua (no hace falta mantener presionado ni hacer clic cada
 * vez): basta con decir un comando, ej. "buscar camisetas rojas".
 *
 * CÓMO INSTALARLO
 * ----------------
 * 1) Copia este archivo como "asistente-voz.js" en la raíz del
 *    proyecto (junto a common.js, script.js, etc).
 * 2) Agrega, en cada página donde quieras el asistente, DESPUÉS
 *    de common.js:
 *
 *      <script src="common.js" defer></script>
 *      <script src="asistente-voz.js" defer></script>
 *
 *    En catalogo.html, después de script.js también:
 *      <script src="script.js" defer></script>
 *      <script src="asistente-voz.js" defer></script>
 *
 * 3) No requiere nada más. El switch aparece solo la próxima vez
 *    que el usuario abra Preferencias (ícono de engranaje).
 *
 * CÓMO AGREGAR COMANDOS NUEVOS
 * ------------------------------
 *   AsistenteVoz.registerCommand({
 *     id: 'ir-a-perfil',
 *     frases: ['ir a mi perfil', 'ver mi perfil', 'mi cuenta'],
 *     accion: () => { window.location.href = 'perfil-vendedor.html'; }
 *   });
 * ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // 0) CONFIGURACIÓN GENERAL
  // ============================================================
  const AV_CONFIG = {
    idioma: 'es-MX',
    urlOfertas: 'catalogo.html',     // aún no existe página de ofertas dedicada
    urlCatalogo: 'catalogo.html',
    urlInicio: 'index.html',
    urlComunidad: 'comunidad.html',
    duracionBurbuja: 4500,           // ms que se muestra el mensaje en pantalla
    storageKey: 'zr_voice_assistant_enabled'
  };

  // ============================================================
  // 1) DATOS SIMULADOS (reemplázalos por datos reales cuando quieras)
  // ------------------------------------------------------------
  // Notificaciones reales: expón fetchNotificaciones() agregando al
  // final de notification-center.js:
  //   window.ZNR_fetchNotificaciones = fetchNotificaciones;
  // y sustituye leerNotificaciones() más abajo.
  //
  // Pedidos reales: usa el endpoint GAS de pedidos del cliente en
  // vez de PEDIDO_SIMULADO.
  // ============================================================
  const NOTIFICACIONES_SIMULADAS = [
    { titulo: 'Descuento especial', mensaje: 'Tienes un 20% de descuento en vestidos esta semana.' },
    { titulo: 'Nuevo look disponible', mensaje: 'Se agregaron nuevas chamarras para caballero al catálogo.' },
    { titulo: 'Envío gratis', mensaje: 'Envío gratis en compras mayores a 800 pesos hasta el domingo.' }
  ];

  const PEDIDO_SIMULADO = {
    numero: '1234',
    estado: 'en camino',
    texto: 'Tu pedido número 1234 está en camino y llegará en los próximos dos días.'
  };

  // ============================================================
  // 2) SOPORTE DEL NAVEGADOR
  // ============================================================
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const soportaReconocimiento = !!SpeechRecognitionAPI;
  const soportaSintesis = 'speechSynthesis' in window;
  const soportado = soportaReconocimiento && soportaSintesis;

  if (!soportado) {
    console.error('[AsistenteVoz] Este navegador no soporta Web Speech API (reconocimiento y/o síntesis de voz). Prueba con Chrome.');
  }

  // ============================================================
  // 3) ESTILOS
  // ============================================================
  const CSS = `
  .av-switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
  }
  .av-switch-info strong {
    display: block;
    font-size: 14px;
    color: var(--color-text-primary, #fff);
    margin-bottom: 3px;
  }
  .av-switch-info span {
    font-size: 12px;
    color: var(--color-text-secondary, #888);
    line-height: 1.4;
    display: block;
    max-width: 220px;
  }
  .av-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
  }
  .av-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .av-switch-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid var(--color-border-subtle, rgba(255,255,255,.12));
    border-radius: 999px;
    transition: background 0.2s ease;
  }
  .av-switch-slider::before {
    content: "";
    position: absolute;
    height: 20px;
    width: 20px;
    left: 2px;
    top: 2px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .av-switch input:checked + .av-switch-slider {
    background: #ff4f81;
    border-color: #ff4f81;
  }
  .av-switch input:checked + .av-switch-slider::before {
    transform: translateX(18px);
  }
  .av-switch input:disabled + .av-switch-slider {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .av-switch-note {
    font-size: 11px;
    color: #ff4f81;
    margin-top: -8px;
    margin-bottom: 4px;
  }

  .av-pill {
    position: fixed;
    right: 16px;
    bottom: 88px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1f2937;
    color: #fff;
    padding: 7px 12px 7px 9px;
    border-radius: 999px;
    font-size: 12px;
    z-index: 9998;
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  }
  .av-pill.av-show { opacity: 1; transform: translateY(0); }
  .av-pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6b7280;
    flex-shrink: 0;
  }
  .av-pill.av-listening .av-pill-dot { background: #ef4444; animation: av-blink 1.2s infinite; }
  .av-pill.av-speaking .av-pill-dot { background: #7c3aed; }
  @keyframes av-blink { 50% { opacity: 0.35; } }

  .av-bubble {
    position: fixed;
    right: 16px;
    bottom: 128px;
    max-width: 280px;
    background: #1f2937;
    color: #fff;
    padding: 12px 14px;
    border-radius: 14px;
    font-size: 13.5px;
    line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    z-index: 9999;
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .av-bubble.av-visible { opacity: 1; transform: translateY(0); }
  .av-bubble.av-error { background: #b91c1c; }
  .av-bubble.av-user { background: #374151; }
  .av-bubble strong { display: block; margin-bottom: 2px; font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.03em; }

  @media (max-width: 480px) {
    .av-pill { right: 12px; bottom: 78px; }
    .av-bubble { right: 12px; left: 12px; max-width: none; bottom: 114px; }
  }
  `;

  function injectStyles() {
    if (document.getElementById('av-styles')) return;
    const style = document.createElement('style');
    style.id = 'av-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ============================================================
  // 4) INDICADOR DE ESTADO (pill no interactivo) + BURBUJA
  // ============================================================
  function injectIndicators() {
    if (!document.getElementById('av-pill')) {
      const pill = document.createElement('div');
      pill.id = 'av-pill';
      pill.className = 'av-pill';
      pill.innerHTML = `<span class="av-pill-dot"></span><span class="av-pill-text">Asistente de voz activo</span>`;
      document.body.appendChild(pill);
    }
    if (!document.getElementById('av-bubble')) {
      const bubble = document.createElement('div');
      bubble.id = 'av-bubble';
      bubble.className = 'av-bubble';
      document.body.appendChild(bubble);
    }
  }

  let bubbleTimer = null;
  function mostrarBurbuja(texto, tipo, etiqueta) {
    const bubble = document.getElementById('av-bubble');
    if (!bubble) return;
    bubble.innerHTML = (etiqueta ? `<strong>${etiqueta}</strong>` : '') + texto;
    bubble.classList.remove('av-error', 'av-user');
    if (tipo === 'error') bubble.classList.add('av-error');
    if (tipo === 'user') bubble.classList.add('av-user');
    bubble.classList.add('av-visible');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('av-visible'), AV_CONFIG.duracionBurbuja);
  }

  function setEstadoPill(estado) {
    const pill = document.getElementById('av-pill');
    if (!pill) return;
    const textoEl = pill.querySelector('.av-pill-text');
    pill.classList.remove('av-listening', 'av-speaking');
    if (estado === 'listening') {
      pill.classList.add('av-listening', 'av-show');
      if (textoEl) textoEl.textContent = 'Escuchando...';
    } else if (estado === 'speaking') {
      pill.classList.add('av-speaking', 'av-show');
      if (textoEl) textoEl.textContent = 'Hablando...';
    } else if (estado === 'idle-on') {
      pill.classList.add('av-show');
      if (textoEl) textoEl.textContent = 'Asistente de voz activo';
    } else {
      pill.classList.remove('av-show');
    }
  }

  // ============================================================
  // 5) TEXTO A VOZ
  // ============================================================
  let vocesDisponibles = [];
  function cargarVoces() {
    vocesDisponibles = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  }
  if (soportaSintesis) {
    cargarVoces();
    window.speechSynthesis.onvoiceschanged = cargarVoces;
  }

  function hablar(texto) {
    if (!soportaSintesis) {
      console.error('[AsistenteVoz] Este navegador no soporta Speech Synthesis.');
      return;
    }
    // Evita que el asistente se "escuche a sí mismo": pausamos el
    // reconocimiento mientras habla y lo retomamos al terminar.
    pausarReconocimientoTemporalmente();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = AV_CONFIG.idioma;
    const voz = vocesDisponibles.find(v => v.lang === AV_CONFIG.idioma) ||
                vocesDisponibles.find(v => v.lang && v.lang.startsWith('es'));
    if (voz) utter.voice = voz;
    utter.rate = 1;
    utter.onstart = () => setEstadoPill('speaking');
    utter.onend = () => {
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      reanudarReconocimientoSiCorresponde();
    };
    utter.onerror = () => {
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      reanudarReconocimientoSiCorresponde();
    };
    window.speechSynthesis.speak(utter);
    mostrarBurbuja(texto, 'info', 'Asistente');
  }

  function normalizar(texto) {
    return (texto || '')
      .toLowerCase()
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ============================================================
  // 6) MOTOR DE COMANDOS — fácilmente ampliable
  // ============================================================
  const COMANDOS = [];

  function registrarComando(cmd) {
    // cmd = { id, frases: [..] opcional, patron: RegExp opcional, accion: fn(texto) }
    COMANDOS.push(cmd);
  }

  function coincide(cmd, textoNorm) {
    if (cmd.patron) {
      const m = textoNorm.match(cmd.patron);
      if (m) return m;
    }
    if (cmd.frases) {
      for (const frase of cmd.frases) {
        if (textoNorm.includes(normalizar(frase))) return true;
      }
    }
    return false;
  }

  async function procesarComando(textoOriginal) {
    const textoNorm = normalizar(textoOriginal);
    if (!textoNorm) return;
    mostrarBurbuja(textoOriginal, 'user', 'Tú dijiste');

    for (const cmd of COMANDOS) {
      const resultado = coincide(cmd, textoNorm);
      if (resultado) {
        try {
          await cmd.accion(textoNorm, resultado, textoOriginal);
        } catch (err) {
          console.error(`[AsistenteVoz] Error ejecutando el comando "${cmd.id}":`, err);
          hablar('Ocurrió un error al ejecutar ese comando.');
        }
        return;
      }
    }
    hablar('No entendí ese comando. Puedes decir "ayuda" para escuchar lo que puedo hacer.');
  }

  // ---- Comando: BUSCAR ------------------------------------------------
  registrarComando({
    id: 'buscar-producto',
    patron: /^(?:busca(?:r|me)?|encuentra|encontrar|quiero ver)\s+(.+)/,
    accion: (_texto, match) => {
      const query = match[1].trim();
      if (!query) {
        hablar('¿Qué producto quieres buscar?');
        return;
      }
      if (typeof window.fetchProducts === 'function' && document.getElementById('search-input')) {
        const input = document.getElementById('search-input');
        input.value = query;
        window.fetchProducts(false, 1, { search: query });
        hablar(`Buscando ${query} en el catálogo.`);
      } else {
        sessionStorage.setItem('av_pending_search', query);
        hablar(`Te llevo al catálogo para buscar ${query}.`);
        setTimeout(() => { window.location.href = `${AV_CONFIG.urlCatalogo}?buscar=${encodeURIComponent(query)}`; }, 900);
      }
    }
  });

  // ---- Comando: IR AL CARRITO ------------------------------------------
  registrarComando({
    id: 'ir-al-carrito',
    frases: ['ir al carrito', 'abrir carrito', 'ver carrito', 'mi carrito', 'ver mi carrito'],
    accion: () => {
      if (typeof window.openCartDrawer === 'function' && document.getElementById('cart-drawer')) {
        window.openCartDrawer();
        hablar('Aquí está tu carrito.');
      } else {
        hablar('Te llevo a tu carrito.');
        setTimeout(() => { window.location.href = AV_CONFIG.urlInicio; }, 900);
      }
    }
  });

  // ---- Comando: VER OFERTAS --------------------------------------------
  registrarComando({
    id: 'ver-ofertas',
    frases: ['ver ofertas', 'mostrar ofertas', 'ver descuentos', 'ir a ofertas'],
    accion: () => {
      hablar('Te muestro las ofertas disponibles.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlOfertas; }, 800);
    }
  });

  // ---- Comando: VOLVER AL INICIO ----------------------------------------
  registrarComando({
    id: 'ir-al-inicio',
    frases: ['volver al inicio', 'ir al inicio', 'ir a inicio', 'ir a la pagina principal', 'ir a la página principal'],
    accion: () => {
      hablar('Vamos al inicio.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlInicio; }, 700);
    }
  });

  // ---- Comando: IR AL CATÁLOGO ------------------------------------------
  registrarComando({
    id: 'ir-al-catalogo',
    frases: ['ir al catalogo', 'ver catalogo', 'ver productos', 'ir a catalogo'],
    accion: () => {
      hablar('Abriendo el catálogo.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlCatalogo; }, 700);
    }
  });

  // ---- Comando: IR A COMUNIDAD -------------------------------------------
  registrarComando({
    id: 'ir-a-comunidad',
    frases: ['ir a comunidad', 'ver comunidad', 'abrir comunidad'],
    accion: () => {
      hablar('Abriendo comunidad.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlComunidad; }, 700);
    }
  });

  // ---- Comando: LEER NOTIFICACIONES --------------------------------------
  registrarComando({
    id: 'leer-notificaciones',
    frases: ['leer notificaciones', 'mis notificaciones', 'tengo notificaciones', 'que notificaciones tengo'],
    accion: () => {
      if (!NOTIFICACIONES_SIMULADAS.length) {
        hablar('No tienes notificaciones nuevas.');
        return;
      }
      const resumen = NOTIFICACIONES_SIMULADAS.map(n => `${n.titulo}. ${n.mensaje}`).join(' ... ');
      hablar(`Tienes ${NOTIFICACIONES_SIMULADAS.length} notificaciones. ${resumen}`);
    }
  });

  // ---- Comando: LEER PEDIDO ------------------------------------------------
  registrarComando({
    id: 'leer-pedido',
    frases: ['mi pedido', 'donde esta mi pedido', 'estado de mi pedido', 'leer mi pedido', 'ver mi pedido'],
    accion: () => { hablar(PEDIDO_SIMULADO.texto); }
  });

  // ---- Comando: AYUDA ---------------------------------------------------
  registrarComando({
    id: 'ayuda',
    frases: ['ayuda', 'que puedes hacer', 'qué puedes hacer', 'comandos disponibles'],
    accion: () => {
      hablar('Puedo buscar productos, abrir el carrito, mostrar ofertas, llevarte al inicio o al catálogo, leer tus notificaciones y contarte el estado de tu pedido. Solo dime, por ejemplo: buscar camisetas rojas.');
    }
  });

  // ---- Comando: DETENER / SILENCIO ---------------------------------------
  registrarComando({
    id: 'detener',
    frases: ['detente', 'callate', 'silencio', 'para de hablar'],
    accion: () => {
      window.speechSynthesis.cancel();
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
    }
  });

  // ============================================================
  // 7) ESTADO DEL ASISTENTE (on/off) + PERSISTENCIA
  // ============================================================
  const AV_STATE = {
    enabled: false
  };

  function cargarEstadoGuardado() {
    AV_STATE.enabled = localStorage.getItem(AV_CONFIG.storageKey) === '1';
  }

  function guardarEstado(enabled) {
    localStorage.setItem(AV_CONFIG.storageKey, enabled ? '1' : '0');
  }

  // ============================================================
  // 8) RECONOCIMIENTO DE VOZ CONTINUO
  // ------------------------------------------------------------
  // No hay botón para "empujar a hablar": mientras el switch esté
  // en ON, el reconocimiento se reinicia solo cada vez que termina
  // (los navegadores cortan la sesión tras cada silencio/resultado).
  // ============================================================
  let reconocimiento = null;
  let reconocimientoActivo = false;   // true si "debería" estar escuchando
  let pausadoPorHabla = false;        // pausa temporal mientras el asistente habla
  let erroresSeguidos = 0;

  function crearReconocimiento() {
    const r = new SpeechRecognitionAPI();
    r.lang = AV_CONFIG.idioma;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      erroresSeguidos = 0;
      setEstadoPill('listening');
    };

    r.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const esFinal = event.results[event.results.length - 1].isFinal;
      if (esFinal) {
        procesarComando(transcript);
      } else {
        mostrarBurbuja(transcript, 'user', 'Escuchando');
      }
    };

    r.onerror = (event) => {
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          console.error('[AsistenteVoz] Permiso de micrófono denegado.');
          mostrarBurbuja('Necesito permiso para usar el micrófono. Actívalo en los permisos del navegador y vuelve a encender el switch.', 'error');
          apagarAsistente(true);
          return;
        case 'audio-capture':
          console.error('[AsistenteVoz] No se encontró micrófono.');
          mostrarBurbuja('No se encontró un micrófono disponible.', 'error');
          apagarAsistente(true);
          return;
        case 'no-speech':
        case 'aborted':
          // normal en modo continuo, no hace falta mostrar error
          return;
        default:
          erroresSeguidos++;
          console.error('[AsistenteVoz] Error de reconocimiento:', event.error);
          if (erroresSeguidos >= 5) {
            mostrarBurbuja('El asistente de voz tuvo varios errores seguidos y se apagó.', 'error');
            apagarAsistente(true);
          }
      }
    };

    r.onend = () => {
      // El navegador corta la sesión periódicamente; si el switch
      // sigue en ON y no está pausado por el habla del asistente,
      // se reinicia automáticamente.
      if (reconocimientoActivo && !pausadoPorHabla) {
        setTimeout(() => { if (reconocimientoActivo) iniciarSesionReconocimiento(); }, 250);
      } else {
        setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      }
    };

    return r;
  }

  function iniciarSesionReconocimiento() {
    if (!soportado) return;
    try {
      reconocimiento = crearReconocimiento();
      reconocimiento.start();
    } catch (err) {
      // start() puede lanzar si ya había una sesión activa; se ignora,
      // onend/onerror se encargarán de reintentar.
      console.error('[AsistenteVoz] No se pudo iniciar el reconocimiento:', err);
    }
  }

  function pausarReconocimientoTemporalmente() {
    pausadoPorHabla = true;
    if (reconocimiento) {
      try { reconocimiento.stop(); } catch (_) {}
    }
  }

  function reanudarReconocimientoSiCorresponde() {
    pausadoPorHabla = false;
    if (reconocimientoActivo) {
      setTimeout(() => { if (reconocimientoActivo) iniciarSesionReconocimiento(); }, 300);
    }
  }

  function encenderAsistente() {
    if (!soportado) {
      mostrarBurbuja('Tu navegador no soporta el asistente de voz. Prueba con Chrome.', 'error');
      return false;
    }
    AV_STATE.enabled = true;
    reconocimientoActivo = true;
    guardarEstado(true);
    setEstadoPill('idle-on');
    mostrarBurbuja('Asistente de voz activado. Di, por ejemplo: "buscar camisetas rojas".', 'info', 'Asistente');
    iniciarSesionReconocimiento();
    return true;
  }

  function apagarAsistente(porError) {
    AV_STATE.enabled = false;
    reconocimientoActivo = false;
    guardarEstado(false);
    if (reconocimiento) {
      try { reconocimiento.stop(); } catch (_) {}
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setEstadoPill('idle');
    sincronizarSwitchesEnPantalla(false);
    if (!porError) mostrarBurbuja('Asistente de voz desactivado.', 'info');
  }

  function sincronizarSwitchesEnPantalla(enabled) {
    document.querySelectorAll('#av-toggle-switch').forEach(input => {
      input.checked = enabled;
    });
  }

  // Pausar/reanudar si el usuario cambia de pestaña, para no dejar
  // el micrófono activo de fondo innecesariamente.
  document.addEventListener('visibilitychange', () => {
    if (!AV_STATE.enabled) return;
    if (document.hidden) {
      if (reconocimiento) { try { reconocimiento.stop(); } catch (_) {} }
    } else if (reconocimientoActivo && !pausadoPorHabla) {
      iniciarSesionReconocimiento();
    }
  });

  // ============================================================
  // 9) INYECCIÓN DEL SWITCH EN EL PANEL DE PREFERENCIAS
  // ============================================================
  function construirFilaSwitch() {
    const row = document.createElement('div');
    row.innerHTML = `
      <h3 class="up-section-title" style="margin-top:24px">Asistente de voz</h3>
      ${!soportado ? '<p class="av-switch-note">Tu navegador no soporta el asistente de voz. Prueba con Chrome.</p>' : ''}
      <div class="av-switch-row">
        <div class="av-switch-info">
          <strong>Activar asistente de voz</strong>
          <span>Escucha comandos como "buscar camisetas rojas" o "ir al carrito".</span>
        </div>
        <label class="av-switch">
          <input type="checkbox" id="av-toggle-switch" ${AV_STATE.enabled ? 'checked' : ''} ${!soportado ? 'disabled' : ''}>
          <span class="av-switch-slider"></span>
        </label>
      </div>
    `;
    return row;
  }

  function inyectarSwitchEnPanel(panel) {
    if (panel.querySelector('#av-toggle-switch')) return; // ya inyectado
    const contenido = panel.querySelector('.up-tab-content[data-content="apariencia"]');
    if (!contenido) return;
    contenido.appendChild(construirFilaSwitch());
    const input = contenido.querySelector('#av-toggle-switch');
    if (input) {
      input.addEventListener('change', () => {
        if (input.checked) {
          const ok = encenderAsistente();
          if (!ok) input.checked = false;
        } else {
          apagarAsistente(false);
        }
      });
    }
  }

  function observarPanelDePreferencias() {
    // Si el panel ya está abierto al cargar el script (poco común, pero
    // posible si el asistente se inyecta tarde), lo enganchamos ya mismo.
    const existente = document.getElementById('up-panel');
    if (existente) inyectarSwitchEnPanel(existente);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.id === 'up-panel') {
            inyectarSwitchEnPanel(node);
          } else if (node.querySelector) {
            const inner = node.querySelector('#up-panel');
            if (inner) inyectarSwitchEnPanel(inner);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true });
  }

  // ============================================================
  // 10) RETOMAR BÚSQUEDA POR VOZ AL LLEGAR A catalogo.html
  // ============================================================
  function aplicarBusquedaPendiente() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('buscar') || sessionStorage.getItem('av_pending_search');
    if (!query) return;
    sessionStorage.removeItem('av_pending_search');
    const intentar = () => {
      if (typeof window.fetchProducts === 'function' && document.getElementById('search-input')) {
        document.getElementById('search-input').value = query;
        window.fetchProducts(false, 1, { search: query });
      } else {
        setTimeout(intentar, 300);
      }
    };
    if (document.getElementById('search-input')) intentar();
  }

  // ============================================================
  // 11) INICIALIZACIÓN
  // ============================================================
  function init() {
    injectStyles();
    injectIndicators();
    cargarEstadoGuardado();
    observarPanelDePreferencias();
    aplicarBusquedaPendiente();

    // Si el usuario ya había encendido el asistente en una visita
    // anterior, lo reactivamos automáticamente en esta página. El
    // navegador ya tiene el permiso de micrófono concedido desde la
    // primera vez que se encendió el switch, así que no hace falta
    // una nueva interacción del usuario.
    if (AV_STATE.enabled && soportado) {
      reconocimientoActivo = true;
      setEstadoPill('idle-on');
      iniciarSesionReconocimiento();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 12) API PÚBLICA
  // ============================================================
  window.AsistenteVoz = {
    hablar,
    encender: encenderAsistente,
    apagar: () => apagarAsistente(false),
    registerCommand: registrarComando,
    commands: COMANDOS,
    config: AV_CONFIG,
    get enabled() { return AV_STATE.enabled; }
  };

})();
