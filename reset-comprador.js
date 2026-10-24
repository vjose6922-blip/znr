// Recuperar contraseña de comprador: pide el código de 6 dígitos que el admin envía por WhatsApp + contraseña nueva.
// api(obj) -> Promise<json> la aporta cada página. Devuelve la contraseña nueva (para iniciar sesión) o null si se cierra.
window.abrirResetComprador = (tel, api) => new Promise((resolve) => {
  tel = String(tel).replace(/\D/g, "").slice(0, 10);
  const o = document.createElement("div");
  o.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px";
  const inp = ([i, p, t]) => `<input id="_rc-${i}" type="${t}" placeholder="${p}" autocomplete="off" inputmode="${i === "c" ? "numeric" : "text"}" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:10px;border-radius:8px;border:1px solid #444;background:#111;color:#fff">`;
  const btn = (i, txt, bg, fg) => `<button id="_rc-${i}" style="flex:1;padding:10px;border-radius:8px;border:0;background:${bg};color:${fg};font-weight:700">${txt}</button>`;
  o.innerHTML = `<div style="background:#1a1a1a;color:#fff;border-radius:14px;padding:20px;max-width:340px;width:100%;font:14px system-ui">
    <b>Recuperar contraseña</b>
    <p style="color:#aaa;margin:8px 0 12px">Pedimos tu código. El administrador te lo enviará por WhatsApp al ${tel}; puede tardar un poco. Escríbelo aquí cuando lo tengas (vale 30 minutos).</p>
    ${[["c", "Código de 6 dígitos", "text"], ["p", "Contraseña nueva", "password"], ["q", "Repite la contraseña", "password"]].map(inp).join("")}
    <div id="_rc-e" style="min-height:18px;color:#f87171;margin-bottom:8px"></div>
    <div style="display:flex;gap:8px">${btn("x", "Cerrar", "#333", "#fff")}${btn("ok", "Cambiar", "#22c55e", "#000")}</div></div>`;
  document.body.appendChild(o);
  const $ = (i) => o.querySelector("#_rc-" + i), fin = (v) => { o.remove(); resolve(v); };
  api({ action: "solicitarResetComprador", telefono: tel }).catch(() => {});
  $("x").onclick = () => fin(null);
  $("ok").onclick = async () => {
    $("ok").disabled = true;
    const r = await api({ action: "resetPasswordCompradorConCodigo", telefono: tel, codigo: $("c").value, nuevaPassword: $("p").value, confirmarPassword: $("q").value })
      .catch(() => ({ error: "Sin conexión. Intenta de nuevo." }));
    $("ok").disabled = false;
    if (r.ok) fin($("p").value); else $("e").textContent = r.error || "No se pudo cambiar la contraseña.";
  };
});
