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
    #__dc-btn-clear__, #__dc-btn-min__ {
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
    #__dc-btn-clear__:hover { color: var(--dc-error); border-color: var(--dc-error); }
    #__dc-btn-min__:hover   { color: var(--dc-accent); border-color: var(--dc-accent); }

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

    .dc-entry.dc-warn  { background: var(--dc-warn-bg);  border-bottom-color: rgba(210,153,34,.12); }
    .dc-entry.dc-error { background: var(--dc-error-bg); border-bottom-color: rgba(248,81,73,.12); }

    .dc-badge {
      flex-shrink: 0;
      width: 14px;
      margin-right: 8px;
      margin-top: 1px;
      font-size: 10px;
      font-weight: 600;
    }
    .dc-badge-log   { color: var(--dc-muted); }
    .dc-badge-info  { color: var(--dc-info); }
    .dc-badge-warn  { color: var(--dc-warn); }
    .dc-badge-error { color: var(--dc-error); }
    .dc-badge-debug { color: var(--dc-success); }
    .dc-badge-cmd   { color: var(--dc-accent); }
    .dc-badge-res   { color: var(--dc-success); }

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
    .dc-msg.dc-log   { color: var(--dc-log); }
    .dc-msg.dc-info  { color: var(--dc-info); }
    .dc-msg.dc-warn  { color: var(--dc-warn); }
    .dc-msg.dc-error { color: var(--dc-error); }
    .dc-msg.dc-debug { color: var(--dc-success); }
    .dc-msg.dc-cmd   { color: var(--dc-accent); font-style: italic; }
    .dc-msg.dc-res   { color: var(--dc-success); }

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
    #__dev-console-root__.dc-minimized #__dev-console-input-bar__ {
      display: none;
    }
    #__dev-console-root__.dc-minimized {
      box-shadow: 0 2px 12px rgba(0,0,0,.4);
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
      <button id="__dc-btn-clear__">clear</button>
      <button id="__dc-btn-min__">–</button>
    </div>
    <div id="__dev-console-body__"></div>
    <div id="__dev-console-input-bar__">
      <span>›</span>
      <input id="__dc-input__" type="text" autocomplete="off" spellcheck="false" placeholder="Ejecutar JavaScript…" />
      <button id="__dc-btn-run__">▶ Run</button>
    </div>
  `;
  document.body.appendChild(root);

  const body   = document.getElementById("__dev-console-body__");
  const input  = document.getElementById("__dc-input__");
  const btnRun = document.getElementById("__dc-btn-run__");
  const btnMin = document.getElementById("__dc-btn-min__");
  const btnClr = document.getElementById("__dc-btn-clear__");

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

  const BADGE = { log:"·", info:"i", warn:"!", error:"✕", debug:"d", cmd:">", res:"←" };

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
