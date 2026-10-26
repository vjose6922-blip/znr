// Pasarelas de pago sin amarrarse a un proveedor. El backend dice cuáles están activas en
// `proveedores` (el orden es la preferencia) y crea un checkout alojado (Stripe Checkout / Mercado Pago)
// al que solo redirigimos: ningún dato de tarjeta pasa por el cliente.
(function () {
  const ETIQUETA = { stripe: '💳 Pagar con tarjeta, Apple Pay o Google Pay', mp: 'Pagar con Mercado Pago' };
  // Backends viejos solo mandan un booleano (permiteTarjeta / tarjeta), que significa Mercado Pago.
  window.proveedoresPago = (lista, legacy) => (Array.isArray(lista) && lista.length ? lista : legacy ? ['mp'] : []).filter(p => ETIQUETA[p]);
  // El primero es el botón principal; los demás van con la clase secundaria.
  window.botonesPago = (lista, cls, clsSec) => lista.map((p, i) => `<button type="button" class="${i ? clsSec : cls}" data-proveedor="${p}">${ETIQUETA[p]}</button>`).join('');
  const NOMBRE = { stripe: 'tarjeta (Stripe)', mp: 'Mercado Pago' };
  // `crear(proveedor)` debe resolver a { ok, url }. Si falla y hay otra pasarela, esa queda deshabilitada y se
  // invita a pagar con la otra; si no hay otra, el error se muestra junto a los botones.
  window.irAPagar = async (btn, crear) => {
    const txt = btn.innerHTML, prov = btn.dataset.proveedor;
    btn.disabled = true; btn.textContent = 'Abriendo pago seguro…';
    let error;
    try {
      const r = await crear(prov);
      if (r.ok && r.url) { location.href = r.url; return; }
      error = r.error;
    } catch (_) { error = ''; }
    const caja = btn.parentElement;
    // Un problema de sesión no es culpa de la pasarela: ahí no se cambia de opción.
    const otra = !/autoriz|sesi[oó]n/i.test(error || '') && [...caja.querySelectorAll('[data-proveedor]')].find(b => b !== btn && !b.disabled);
    let aviso = caja.querySelector('.aviso-pasarela');
    if (!aviso) { aviso = document.createElement('p'); aviso.className = 'aviso-pasarela'; aviso.style.cssText = 'color:#b91c1c;font-size:13px;font-weight:600;margin:8px 0;'; caja.appendChild(aviso); }
    if (otra) {
      btn.textContent = `${prov === 'mp' ? 'Mercado Pago' : 'Tarjeta'} no disponible`;
      otra.style.outline = '3px solid #22c55e';
      aviso.textContent = `${NOMBRE[prov][0].toUpperCase() + NOMBRE[prov].slice(1)} no está disponible por ahora. Paga con ${NOMBRE[otra.dataset.proveedor]}.`;
    } else {
      btn.disabled = false; btn.innerHTML = txt;
      aviso.textContent = error || 'No se pudo abrir el pago. Revisa tu conexión e intenta de nuevo.';
    }
  };
})();
