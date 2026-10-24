// Pasarelas de pago sin amarrarse a un proveedor. El backend dice cuáles están activas en
// `proveedores` (el orden es la preferencia) y crea un checkout alojado (Stripe Checkout / Mercado Pago)
// al que solo redirigimos: ningún dato de tarjeta pasa por el cliente.
(function () {
  const ETIQUETA = { stripe: '💳 Pagar con tarjeta, Apple Pay o Google Pay', mp: 'Pagar con Mercado Pago' };
  // Backends viejos solo mandan un booleano (permiteTarjeta / tarjeta), que significa Mercado Pago.
  window.proveedoresPago = (lista, legacy) => (Array.isArray(lista) && lista.length ? lista : legacy ? ['mp'] : []).filter(p => ETIQUETA[p]);
  // El primero es el botón principal; los demás van con la clase secundaria.
  window.botonesPago = (lista, cls, clsSec) => lista.map((p, i) => `<button type="button" class="${i ? clsSec : cls}" data-proveedor="${p}">${ETIQUETA[p]}</button>`).join('');
  // `crear(proveedor)` debe resolver a { ok, url }; si falla se restaura el botón.
  window.irAPagar = async (btn, crear) => {
    const txt = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Abriendo pago seguro…';
    try {
      const r = await crear(btn.dataset.proveedor);
      if (r.ok && r.url) { location.href = r.url; return; }
      alert(r.error || 'No se pudo iniciar el pago.');
    } catch (_) { alert('Error de red. Intenta de nuevo.'); }
    btn.disabled = false; btn.innerHTML = txt;
  };
})();
