// Avisos push de lives (por vendedor o por live programado). Usa el token FCM del dispositivo.
(function () {
  const API = 'https://live-api-1038143238323.us-central1.run.app', KEY = 'znr_live_subs';
  const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const activo = (tipo, id) => (leer()[tipo] || []).includes(id);

  async function alternar(tipo, id) {
    const accion = activo(tipo, id) ? 'desuscribirLive' : 'suscribirLive';
    const token = await window.solicitarPermisoNotificacionesSiFalta?.();
    if (!token) { alert('Activa las notificaciones de tu navegador para recibir el aviso.'); return null; }
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: accion, token, tipo, id }) })
      .then(x => x.json()).catch(() => null);
    if (!r?.ok) { alert(r?.error || 'No se pudo guardar. Intenta de nuevo.'); return null; }
    const s = leer(), lista = new Set(s[tipo] || []);
    accion === 'suscribirLive' ? lista.add(id) : lista.delete(id);
    s[tipo] = [...lista];
    localStorage.setItem(KEY, JSON.stringify(s));
    return accion === 'suscribirLive';
  }

  const boton = (tipo, id, texto) => `<button type="button" class="bell-live${activo(tipo, id) ? ' on' : ''}" data-bell="${tipo}:${id}" data-texto="${texto}">${Icon('bell', { size: 14 })}<span>${activo(tipo, id) ? 'Te avisaremos' : texto}</span></button>`;

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-bell]');
    if (!b) return;
    e.preventDefault();
    const [tipo, ...id] = b.dataset.bell.split(':');
    b.disabled = true;
    const on = await alternar(tipo, id.join(':'));
    b.disabled = false;
    if (on === null) return;
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'Te avisaremos' : b.dataset.texto;
  });

  const st = document.createElement('style');
  st.textContent = '.bell-live{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:7px 12px;border-radius:999px;border:1px solid var(--color-border-subtle);background:var(--color-surface);color:var(--color-text-primary);font-size:12px;font-weight:700;cursor:pointer}.bell-live.on{background:var(--color-accent-solid);color:#fff;border-color:transparent}.bell-live:disabled{opacity:.6}';
  document.head.appendChild(st);

  window.znrLiveNotif = { activo, boton };
})();
