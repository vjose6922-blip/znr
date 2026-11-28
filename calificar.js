// Calificar compras en cualquier página. Un artículo recién entregado se pide al momento (al cargar la página o al
// llegar la notificación); los que siguen pendientes vuelven a salir, uno al azar, como mucho cada 6 horas.
(() => {
  const CADA = 6 * 3600e3, API = 'https://ventas-api-1038143238323.us-central1.run.app', PED = 'https://pedidos-api-1038143238323.us-central1.run.app';
  const tel = () => (localStorage.getItem('client_phone') || '').replace(/\D/g, '');
  const lee = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const clave = (it) => it.pedidoId ? 'p_' + it.pedidoId : String(it.productId);
  let ultimaRevision = 0;

  async function revisar() {
    const phone = tel();
    if (!phone || document.getElementById('modal-calificar') || Date.now() - ultimaRevision < 60e3) return;
    ultimaRevision = Date.now();
    const d = await fetch(`${API}?action=obtenerCalificacionesPendientes&clientPhone=${phone}&_t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    const hechos = lee('rated_products_' + phone, []), vistos = lee('calif_vistos_' + phone, []);
    const pend = ((d && d.pendientes) || []).filter((p) => !hechos.includes(clave(p)) && !hechos.includes(String(p.productId)));
    const nuevo = pend.find((p) => !vistos.includes(clave(p)));
    const item = nuevo || (Date.now() - lee('calif_ultimo_' + phone, 0) > CADA && pend[Math.floor(Math.random() * pend.length)]);
    if (!item) return;
    guarda('calif_vistos_' + phone, [...new Set([...vistos, clave(item)])].slice(-200));
    guarda('calif_ultimo_' + phone, Date.now());
    mostrar(item, phone);
  }

  function mostrar(item, phone) {
    if (!document.getElementById('modal-calificar-styles')) document.head.insertAdjacentHTML('beforeend', `<style id="modal-calificar-styles">
#modal-calificar{position:fixed;inset:0;background:rgba(15,12,20,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:mcIn .22s}
@keyframes mcIn{from{opacity:0}}
#modal-calificar .mc-panel{background:var(--color-surface,#fff);color:var(--color-text-main,#1f1f24);border-radius:24px;padding:26px 22px 20px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 60px -12px rgba(0,0,0,.35);position:relative}
#modal-calificar .mc-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:none;background:var(--color-border-subtle,rgba(0,0,0,.06));color:var(--color-text-muted,#888);font-size:18px;cursor:pointer}
#modal-calificar .mc-img{width:88px;height:88px;object-fit:contain;border-radius:16px;background:var(--color-bg,#f5f5f8);padding:8px;box-sizing:border-box;margin:0 auto 14px;display:block}
#modal-calificar h2{margin:0 0 4px;font-size:19px}
#modal-calificar .mc-sub{margin:0 0 18px;font-size:13px;color:var(--color-text-muted,#8a8a92);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#modal-calificar .mc-stars{display:flex;justify-content:center;gap:6px;user-select:none}
#modal-calificar .mc-star{cursor:pointer;padding:4px;line-height:0;color:var(--color-border-subtle,#ddd);background:none;border:0;transition:transform .15s}
#modal-calificar .mc-star:hover{transform:scale(1.15)}#modal-calificar .mc-star.on{color:#f59e0b}
#modal-calificar .mc-label{font-size:12.5px;font-weight:600;color:#d97706;min-height:18px;margin:6px 0 16px}
#modal-calificar textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--color-border-subtle,#e6e6ec);border-radius:12px;padding:11px 12px;font:inherit;font-size:13px;margin-bottom:16px;resize:none;min-height:68px;color:inherit;background:var(--color-bg,#fafafc);outline:none}
#modal-calificar .mc-actions{display:flex;gap:10px}
#modal-calificar .mc-actions button{flex:1;padding:12px;border-radius:12px;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}
#modal-calificar .mc-skip{border:1.5px solid var(--color-border-subtle,#e6e6ec);background:transparent;color:var(--color-text-muted,#666)}
#modal-calificar .mc-send{border:none;color:#fff;background:linear-gradient(135deg,#c85c78,#d68a5f)}
#modal-calificar .mc-send:disabled{opacity:.7;cursor:wait}</style>`);
    const LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'];
    const star = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.56 6.1 20.67l1.13-6.57L2.45 9.44l6.6-.96z"/></svg>';
    const m = document.createElement('div');
    m.id = 'modal-calificar'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="mc-panel"><button class="mc-close" aria-label="Cerrar">×</button>
      ${item.imagen ? `<img class="mc-img" src="${esc(item.imagen)}" alt="" onerror="this.remove()">` : ''}
      <h2>¿Cómo estuvo tu compra?</h2><p class="mc-sub">${esc(item.nombre || 'tu producto')}</p>
      <div class="mc-stars" role="radiogroup" aria-label="Calificación">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="mc-star" data-v="${n}" role="radio" aria-label="${n} estrellas">${star}</button>`).join('')}</div>
      <div class="mc-label"></div><textarea maxlength="300" placeholder="Cuéntanos algo (opcional)" aria-label="Comentario"></textarea>
      <div class="mc-actions"><button class="mc-skip">Ahora no</button><button class="mc-send">Enviar</button></div></div>`;
    document.body.appendChild(m);
    let n = 5;
    const pinta = (k) => { m.querySelectorAll('.mc-star').forEach((s, i) => { s.classList.toggle('on', i < k); s.setAttribute('aria-checked', String(i + 1 === n)); }); m.querySelector('.mc-label').textContent = LABELS[n]; };
    const stars = m.querySelector('.mc-stars');
    stars.onmouseover = (e) => { const s = e.target.closest('[data-v]'); if (s) pinta(+s.dataset.v); };
    stars.onmouseleave = () => pinta(n);
    stars.onclick = (e) => { const s = e.target.closest('[data-v]'); if (s) { n = +s.dataset.v; pinta(n); } };
    pinta(n);
    const cerrar = () => { m.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = (e) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', esc_);
    m.querySelector('.mc-close').onclick = m.querySelector('.mc-skip').onclick = cerrar;
    m.onclick = (e) => e.target === m && cerrar();
    m.querySelector('.mc-send').onclick = async (e) => {
      const b = e.currentTarget, comentario = m.querySelector('textarea').value.trim(), compradorToken = localStorage.getItem('comprador_token') || '';
      // Pedidos personalizados (renta, servicio, bajo pedido) se califican en pedidos-api; las compras normales, en catálogo.
      const [url, datos] = item.pedidoId
        ? [PED, { action: 'calificarPedido', pedidoId: item.pedidoId, telefono: phone, compradorToken, estrellas: n, comentario }]
        : [window.CATALOGO_API_URL || 'https://catalogo-api-1038143238323.us-central1.run.app', { action: 'calificarProducto', productId: String(item.productId), clientPhone: phone, compradorToken, calificacion: n, comentario, requestId: item.requestId || '' }];
      b.disabled = true; b.textContent = 'Enviando…';
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(datos) }).then((x) => x.json());
        if (!r.ok) throw new Error(r.error || 'No se pudo enviar la calificación');
        guarda('rated_products_' + phone, [...lee('rated_products_' + phone, []), clave(item)]);
        window.showTemporaryMessage?.('¡Gracias por tu calificación!', 'success');
        cerrar();
      } catch (err) { window.showTemporaryMessage ? window.showTemporaryMessage(err.message, 'error') : alert(err.message); b.disabled = false; b.textContent = 'Enviar'; }
    };
  }

  // Al cargar, al volver a la pestaña y cuando llegan notificaciones nuevas (notification-center.js).
  const iniciar = () => setTimeout(revisar, 2500);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
  document.addEventListener('visibilitychange', () => !document.hidden && revisar());
  window.addEventListener('znr:notificaciones-cargadas', revisar);
  window.znrRevisarCalificaciones = () => { ultimaRevision = 0; revisar(); };
})();
