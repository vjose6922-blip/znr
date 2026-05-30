
/**
 * dev-console.js — Consola de desarrollo incrustable
 * Uso: <script src="dev-console.js"></script>
 * Opciones globales (definir ANTES de cargar el script):
 *   window.DEV_CONSOLE_OPTIONS = { position: 'bottom-right', maxLines: 200, theme: 'dark' }
 *
 * CSP compatible: no realiza ninguna petición externa.
 * Fuentes del sistema únicamente (Consolas, Menlo, Monaco, monospace).
 */
(function () {
  "use strict";

  const defaults = {
    position: "bottom-right", // bottom-right | bottom-left | top-right | top-left
    maxLines: 300,
    theme: "dark",
    height: 280,
    width: 420,
  };

  const opts = Object.assign({}, defaults, window.DEV_CONSOLE_OPTIONS || {});

  /* ─── Estado ─────────────────────────────────────────── */
  let minimized = false;
  let logCount = 0;
  const history = [];
  let historyIndex = -1;

  /* ─── Estado inspector ───────────────────────────────── */
  let inspectorActive = false;
  let inspectorTarget = null;
  const INSPECTOR_STYLE_ID = "__dc-inspector-highlight__";

  /* ─── Inyección de CSS ───────────────────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    #__dev-console-root__ {
      --dc-bg:        #0d1117;
      --dc-bg2:       #161b22;
      --dc-border:    #30363d;
      --dc-text:      #e6edf3;
      --dc-muted:     #6e7681;
      --dc-log:       #e6edf3;
      --dc-info:      #58a6ff;
      --dc-warn:      #d29922;
      --dc-warn-bg:   rgba(210,153,34,.08);
      --dc-error:     #f85149;
      --dc-error-bg:  rgba(248,81,73,.08);
      --dc-success:   #3fb950;
      --dc-accent:    #58a6ff;
      --dc-inspect:   #a371f7;
      --dc-radius:    10px;
      --dc-font:      'Cascadia Code', 'Fira Code', Consolas, Menlo, Monaco, 'Courier New', monospace;
      --dc-shadow:    0 8px 32px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4);
      --dc-w:         ${opts.width}px;
      --dc-h:         ${opts.height}px;

      position: fixed;
      z-index: 2147483647;
      font-family: var(--dc-font);
      font-size: 11.5px;
      line-height: 1.5;
      ${positionCSS(opts.position)}
      width: var(--dc-w);
      box-shadow: var(--dc-shadow);
      border: 1px solid var(--dc-border);
      border-radius: var(--dc-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: height .25s cubic-bezier(.4,0,.2,1), box-shadow .2s;
      resize: both;
      min-width: 280px;
      max-width: 90vw;
    }

    /* Header */
    #__dev-console-header__ {
      background: var(--dc-bg2);
      border-bottom: 1px solid var(--dc-border);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 34px;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    #__dev-console-header__ .dc-dots {
      display: flex; gap: 5px;
    }
    #__dev-console-header__ .dc-dot {
      width: 11px; height: 11px; border-radius: 50%;
    }
    .dc-dot-r { background: #f85149; }
    .dc-dot-y { background: #d29922; }
    .dc-dot-g { background: #3fb950; }
    #__dev-console-header__ .dc-title {
      flex: 1;
      color: var(--dc-muted);
      font-size: 10.5px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    #__dc-btn-clear__, #__dc-btn-min__, #__dc-btn-inspect__ {
      background: none;
      border: 1px solid var(--dc-border);
      color: var(--dc-muted);
      border-radius: 5px;
      padding: 1px 7px;
      cursor: pointer;
      font-family: var(--dc-font);
      font-size: 10px;
      transition: color .15s, border-color .15s, background .15s;
    }
    #__dc-btn-clear__:hover   { color: var(--dc-error);   border-color: var(--dc-error); }
    #__dc-btn-min__:hover     { color: var(--dc-accent);  border-color: var(--dc-accent); }
    #__dc-btn-inspect__:hover { color: var(--dc-inspect); border-color: var(--dc-inspect); }
    #__dc-btn-inspect__.dc-active {
      color: var(--dc-inspect);
      border-color: var(--dc-inspect);
      background: rgba(163,113,247,.15);
    }

    /* Área de info del inspector */
    #__dc-inspector-bar__ {
      display: none;
      align-items: center;
      gap: 8px;
      background: rgba(163,113,247,.08);
      border-top: 1px solid rgba(163,113,247,.25);
      padding: 0 10px;
      height: 30px;
      flex-shrink: 0;
      font-size: 10.5px;
      color: #a371f7;
      overflow: hidden;
    }
    #__dc-inspector-bar__.dc-visible {
      display: flex;
    }
    #__dc-inspector-bar__ .dc-inspect-icon {
      font-size: 12px;
      flex-shrink: 0;
      animation: dc-blink 1.2s ease-in-out infinite;
    }
    @keyframes dc-blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: .35; }
    }
    #__dc-inspector-bar__ .dc-inspect-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #c9b1fd;
    }
    #__dc-inspector-bar__ .dc-inspect-hint {
      flex-shrink: 0;
      color: #6e7681;
      font-size: 9.5px;
    }

    /* Log body */
    #__dev-console-body__ {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--dc-bg);
      padding: 4px 0;
      scroll-behavior: smooth;
    }
    #__dev-console-body__::-webkit-scrollbar { width: 5px; }
    #__dev-console-body__::-webkit-scrollbar-track { background: transparent; }
    #__dev-console-body__::-webkit-scrollbar-thumb { background: var(--dc-border); border-radius: 3px; }

    .dc-entry {
      display: flex;
      align-items: flex-start;
      gap: 0;
      padding: 2px 10px;
      border-bottom: 1px solid transparent;
      animation: dc-fadein .15s ease;
    }
    @keyframes dc-fadein { from { opacity:0; transform:translateY(-2px); } to { opacity:1; transform:none; } }

    .dc-entry:hover { background: rgba(255,255,255,.03); }

    .dc-entry.dc-warn    { background: var(--dc-warn-bg);           border-bottom-color: rgba(210,153,34,.12); }
    .dc-entry.dc-error   { background: var(--dc-error-bg);          border-bottom-color: rgba(248,81,73,.12); }
    .dc-entry.dc-inspect { background: rgba(163,113,247,.07);       border-bottom-color: rgba(163,113,247,.18); }

    .dc-badge {
      flex-shrink: 0;
      width: 14px;
      margin-right: 8px;
      margin-top: 1px;
      font-size: 10px;
      font-weight: 600;
    }
    .dc-badge-log     { color: var(--dc-muted); }
    .dc-badge-info    { color: var(--dc-info); }
    .dc-badge-warn    { color: var(--dc-warn); }
    .dc-badge-error   { color: var(--dc-error); }
    .dc-badge-debug   { color: var(--dc-success); }
    .dc-badge-cmd     { color: var(--dc-accent); }
    .dc-badge-res     { color: var(--dc-success); }
    .dc-badge-inspect { color: var(--dc-inspect); }

    .dc-time {
      flex-shrink: 0;
      color: var(--dc-muted);
      font-size: 10px;
      margin-right: 8px;
      margin-top: 1px;
      opacity: .6;
    }

    .dc-msg {
      flex: 1;
      word-break: break-all;
      white-space: pre-wrap;
    }
    .dc-msg.dc-log     { color: var(--dc-log); }
    .dc-msg.dc-info    { color: var(--dc-info); }
    .dc-msg.dc-warn    { color: var(--dc-warn); }
    .dc-msg.dc-error   { color: var(--dc-error); }
    .dc-msg.dc-debug   { color: var(--dc-success); }
    .dc-msg.dc-cmd     { color: var(--dc-accent); font-style: italic; }
    .dc-msg.dc-res     { color: var(--dc-success); }
    .dc-msg.dc-inspect { color: #c9b1fd; }

    .dc-count {
      flex-shrink: 0;
      margin-left: 6px;
      background: var(--dc-border);
      color: var(--dc-muted);
      border-radius: 10px;
      padding: 0 5px;
      font-size: 9px;
      align-self: center;
    }

    /* Input bar */
    #__dev-console-input-bar__ {
      display: flex;
      align-items: center;
      background: var(--dc-bg2);
      border-top: 1px solid var(--dc-border);
      padding: 0 10px;
      height: 34px;
      gap: 6px;
      flex-shrink: 0;
    }
    #__dev-console-input-bar__ span {
      color: var(--dc-accent);
      font-size: 13px;
      font-weight: 600;
    }
    #__dc-input__ {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--dc-text);
      font-family: var(--dc-font);
      font-size: 11.5px;
      caret-color: var(--dc-accent);
    }
    #__dc-input__::placeholder { color: var(--dc-muted); }
    #__dc-btn-run__ {
      background: var(--dc-accent);
      color: #0d1117;
      border: none;
      border-radius: 5px;
      padding: 2px 10px;
      cursor: pointer;
      font-family: var(--dc-font);
      font-size: 10px;
      font-weight: 600;
      transition: opacity .15s;
    }
    #__dc-btn-run__:hover { opacity: .8; }

    /* Minimized state */
    #__dev-console-root__.dc-minimized {
      height: 34px !important;
      resize: none;
    }
    #__dev-console-root__.dc-minimized #__dev-console-body__,
    #__dev-console-root__.dc-minimized #__dev-console-input-bar__,
    #__dev-console-root__.dc-minimized #__dc-inspector-bar__ {
      display: none !important;
    }
    #__dev-console-root__.dc-minimized {
      box-shadow: 0 2px 12px rgba(0,0,0,.4);
    }

    /* Cursor inspector activo en toda la página */
    body.dc-inspector-mode *:not(#__dev-console-root__):not(#__dev-console-root__ *) {
      cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);

  /* ─── HTML ───────────────────────────────────────────── */
  const root = document.createElement("div");
  root.id = "__dev-console-root__";
  root.innerHTML = `
    <div id="__dev-console-header__">
      <div class="dc-dots">
        <div class="dc-dot dc-dot-r"></div>
        <div class="dc-dot dc-dot-y"></div>
        <div class="dc-dot dc-dot-g"></div>
      </div>
      <span class="dc-title">⬡ DevConsole</span>
      <button id="__dc-btn-inspect__" title="Modo Inspector (clic para activar)">⊕ inspect</button>
      <button id="__dc-btn-clear__">clear</button>
      <button id="__dc-btn-min__">–</button>
    </div>
    <div id="__dc-inspector-bar__">
      <span class="dc-inspect-icon">◉</span>
      <span class="dc-inspect-label" id="__dc-inspect-label__">Pasa el cursor sobre un elemento…</span>
      <span class="dc-inspect-hint">Esc para salir</span>
    </div>
    <div id="__dev-console-body__"></div>
    <div id="__dev-console-input-bar__">
      <span>›</span>
      <input id="__dc-input__" type="text" autocomplete="off" spellcheck="false" placeholder="Ejecutar JavaScript…" />
      <button id="__dc-btn-run__">▶ Run</button>
    </div>
  `;
  document.body.appendChild(root);

  const body          = document.getElementById("__dev-console-body__");
  const input         = document.getElementById("__dc-input__");
  const btnRun        = document.getElementById("__dc-btn-run__");
  const btnMin        = document.getElementById("__dc-btn-min__");
  const btnClr        = document.getElementById("__dc-btn-clear__");
  const btnInspect    = document.getElementById("__dc-btn-inspect__");
  const inspectorBar  = document.getElementById("__dc-inspector-bar__");
  const inspectLabel  = document.getElementById("__dc-inspect-label__");

  /* ─── Helpers ────────────────────────────────────────── */
  function positionCSS(pos) {
    const map = {
      "bottom-right": "bottom:18px; right:18px;",
      "bottom-left":  "bottom:18px; left:18px;",
      "top-right":    "top:18px; right:18px;",
      "top-left":     "top:18px; left:18px;",
    };
    return map[pos] || map["bottom-right"];
  }

  function timestamp() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  }

  function serialize(args) {
    return args.map(a => {
      if (a === null) return "null";
      if (a === undefined) return "undefined";
      if (typeof a === "function") return a.toString().split("\n")[0] + "…}";
      if (typeof a === "object") {
        try { return JSON.stringify(a, null, 2); } catch { return String(a); }
      }
      return String(a);
    }).join(" ");
  }

  const BADGE = { log:"·", info:"i", warn:"!", error:"✕", debug:"d", cmd:">", res:"←", inspect:"⊕" };

  /* deduplicación */
  let lastText = null, lastType = null, lastEl = null;

  function addEntry(type, text) {
    if (logCount >= opts.maxLines) {
      body.firstChild && body.removeChild(body.firstChild);
    }
    logCount++;

    /* duplicados consecutivos: solo aumentar contador */
    if (text === lastText && type === lastType && lastEl) {
      let cnt = lastEl.querySelector(".dc-count");
      if (!cnt) {
        cnt = document.createElement("span");
        cnt.className = "dc-count";
        cnt.textContent = "2";
        lastEl.appendChild(cnt);
      } else {
        cnt.textContent = parseInt(cnt.textContent) + 1;
      }
      return;
    }

    const entry = document.createElement("div");
    entry.className = `dc-entry dc-${type}`;
    entry.innerHTML = `
      <span class="dc-badge dc-badge-${type}">${BADGE[type] || "·"}</span>
      <span class="dc-time">${timestamp()}</span>
      <span class="dc-msg dc-${type}"></span>
    `;
    entry.querySelector(".dc-msg").textContent = text;

    body.appendChild(entry);
    body.scrollTop = body.scrollHeight;

    lastText = text; lastType = type; lastEl = entry;
  }

  /* ─── Intercepción de console.* ─────────────────────── */
  const _orig = {};
  ["log","info","warn","error","debug","table","dir","group","groupEnd","groupCollapsed","time","timeEnd","assert","count","countReset","trace"].forEach(method => {
    _orig[method] = console[method].bind(console);
    console[method] = function (...args) {
      _orig[method](...args);

      let type = "log";
      if (method === "warn") type = "warn";
      else if (method === "error") type = "error";
      else if (method === "info") type = "info";
      else if (method === "debug") type = "debug";
      else if (method === "assert") {
        if (!args[0]) { type = "error"; args = ["Assertion failed:", ...args.slice(1)]; }
        else return;
      }

      let label = method !== "log" ? `[${method}] ` : "";
      addEntry(type, label + serialize(args));
    };
  });

  /* ─── Errores globales ───────────────────────────────── */
  window.addEventListener("error", e => {
    addEntry("error", `Uncaught ${e.message}\n  → ${e.filename}:${e.lineno}:${e.colno}`);
  });

  window.addEventListener("unhandledrejection", e => {
    addEntry("error", `Unhandled Promise: ${serialize([e.reason])}`);
  });

  /* ─── Ejecución de comandos ──────────────────────────── */
  function runCommand(cmd) {
    cmd = cmd.trim();
    if (!cmd) return;

    history.unshift(cmd);
    historyIndex = -1;
    addEntry("cmd", cmd);

    try {
      // eslint-disable-next-line no-new-func
      const result = (new Function(`"use strict"; try { return eval(${JSON.stringify(cmd)}) } catch(e){ return e }`))();
      if (result !== undefined) {
        addEntry("res", serialize([result]));
      }
    } catch (err) {
      addEntry("error", String(err));
    }
    input.value = "";
  }

  btnRun.addEventListener("click", () => runCommand(input.value));

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      runCommand(input.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      } else {
        historyIndex = -1;
        input.value = "";
      }
    }
  });

  /* ─── Minimizar / Maximizar ──────────────────────────── */
  btnMin.addEventListener("click", () => {
    minimized = !minimized;
    root.classList.toggle("dc-minimized", minimized);
    btnMin.textContent = minimized ? "▲" : "–";
  });

  /* doble click en header también */
  document.getElementById("__dev-console-header__").addEventListener("dblclick", (e) => {
    if (e.target.tagName === "BUTTON") return;
    minimized = !minimized;
    root.classList.toggle("dc-minimized", minimized);
    btnMin.textContent = minimized ? "▲" : "–";
  });

  /* ─── Clear ──────────────────────────────────────────── */
  btnClr.addEventListener("click", () => {
    body.innerHTML = "";
    logCount = 0;
    lastText = lastType = lastEl = null;
    addEntry("info", "Consola limpiada");
  });

  /* ─── Inspector de elementos ─────────────────────────── */

  /* Estilo de resaltado inyectado dinámicamente */
  function getOrCreateHighlightStyle() {
    let s = document.getElementById(INSPECTOR_STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = INSPECTOR_STYLE_ID;
      document.head.appendChild(s);
    }
    return s;
  }

  /* Construir descripción breve de un elemento */
  function describeElement(el) {
    const tag = el.tagName.toLowerCase();
    const id  = el.id ? `#${el.id}` : "";
    const cls = el.classList.length
      ? "." + Array.from(el.classList).join(".")
      : "";
    return `${tag}${id}${cls}`;
  }

  /* Construir mensaje completo para el log */
  function buildInspectLog(el) {
    const tag   = el.tagName.toLowerCase();
    const id    = el.id    || "(sin id)";
    const cls   = el.classList.length
      ? Array.from(el.classList).join(" ")
      : "(sin clases)";
    const txt   = el.textContent.trim().slice(0, 40);
    const tPart = txt ? ` | texto: "${txt}${txt.length >= 40 ? "…" : ""}"` : "";
    return `<${tag}>  id: "${id}"  clases: "${cls}"${tPart}`;
  }

  /* Resaltar / quitar resaltado */
  function highlightElement(el) {
    const hs = getOrCreateHighlightStyle();
    if (!el) {
      hs.textContent = "";
      inspectorTarget = null;
      inspectLabel.textContent = "Pasa el cursor sobre un elemento…";
      return;
    }
    /* Añadir atributo temporal para selector único */
    el.setAttribute("data-dc-hover", "1");
    hs.textContent = `
      [data-dc-hover="1"] {
        outline: 2px solid #a371f7 !important;
        outline-offset: 2px !important;
        background-color: rgba(163,113,247,.08) !important;
      }
    `;
    inspectorTarget = el;
    inspectLabel.textContent = describeElement(el);
  }

  function clearHighlight() {
    const hs = getOrCreateHighlightStyle();
    hs.textContent = "";
    if (inspectorTarget) {
      inspectorTarget.removeAttribute("data-dc-hover");
    }
    inspectorTarget = null;
    inspectLabel.textContent = "Pasa el cursor sobre un elemento…";
  }

  /* Activar / desactivar modo inspector */
  function setInspectorMode(active) {
    inspectorActive = active;
    btnInspect.classList.toggle("dc-active", active);
    inspectorBar.classList.toggle("dc-visible", active);
    document.body.classList.toggle("dc-inspector-mode", active);

    if (!active) {
      clearHighlight();
    } else {
      /* Si estaba minimizado, expandir para ver el inspector bar */
      if (minimized) {
        minimized = false;
        root.classList.remove("dc-minimized");
        btnMin.textContent = "–";
      }
      addEntry("inspect", "Modo Inspector activado — haz clic sobre cualquier elemento");
    }
  }

  btnInspect.addEventListener("click", () => {
    setInspectorMode(!inspectorActive);
  });

  /* Eventos de ratón en el documento */
  document.addEventListener("mouseover", e => {
    if (!inspectorActive) return;
    /* Ignorar elementos de la propia consola */
    if (root.contains(e.target)) {
      clearHighlight();
      return;
    }
    /* Quitar atributo del anterior */
    if (inspectorTarget && inspectorTarget !== e.target) {
      inspectorTarget.removeAttribute("data-dc-hover");
    }
    highlightElement(e.target);
  }, true);

  document.addEventListener("mouseout", e => {
    if (!inspectorActive) return;
    if (root.contains(e.target)) return;
    /* Solo limpiar si salimos hacia fuera de la ventana o hacia la consola */
    if (!e.relatedTarget || root.contains(e.relatedTarget)) {
      clearHighlight();
    }
  }, true);

  document.addEventListener("click", e => {
    if (!inspectorActive) return;
    /* Ignorar clics dentro de la consola */
    if (root.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const el  = e.target;
    const msg = buildInspectLog(el);
    addEntry("inspect", msg);

    /* Parpadeo visual al capturar */
    el.setAttribute("data-dc-hover", "1");
    const hs = getOrCreateHighlightStyle();
    hs.textContent = `
      [data-dc-hover="1"] {
        outline: 2px solid #f0abfc !important;
        outline-offset: 2px !important;
        background-color: rgba(240,171,252,.15) !important;
        transition: none !important;
      }
    `;
    setTimeout(() => {
      if (inspectorActive) highlightElement(el);
      else clearHighlight();
    }, 220);

  }, true);

  /* Escape para salir del inspector */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && inspectorActive) {
      setInspectorMode(false);
      addEntry("inspect", "Modo Inspector desactivado");
    }
  });

  /* ─── Drag (mover el panel) ──────────────────────────── */
  (function makeDraggable() {
    const header = document.getElementById("__dev-console-header__");
    let ox = 0, oy = 0, startX = 0, startY = 0;

    header.addEventListener("mousedown", e => {
      if (e.target.tagName === "BUTTON") return;
      e.preventDefault();
      const rect = root.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      startX = e.clientX; startY = e.clientY;

      // quitar position fixed basada en esquina y usar top/left absolutos
      root.style.right = "auto"; root.style.bottom = "auto";
      root.style.left = ox + "px"; root.style.top = oy + "px";

      function onMove(ev) {
        root.style.left = (ox + ev.clientX - startX) + "px";
        root.style.top  = (oy + ev.clientY - startY) + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  })();

  /* ─── Mensaje de bienvenida ──────────────────────────── */
  addEntry("info", "DevConsole listo. Todos los mensajes de console.* serán capturados.");
  addEntry("info", "Usa ↑ ↓ para navegar el historial de comandos.");

})();
