# Pagos multi-proveedor — lo que falta en el backend

El frontend ya no depende de Mercado Pago: pinta un botón por cada pasarela que el backend diga
que está activa, en el orden recibido (el primero es el principal). Todo es **checkout alojado**
(Stripe Checkout / MP): el cliente solo redirige a la `url`, nunca toca datos de tarjeta.

Ids de proveedor: `stripe`, `mp`. Si un endpoint no manda `proveedores`, el frontend cae al
comportamiento viejo (booleano → solo `mp`), así que se puede desplegar en cualquier orden.

## Respuestas que deben incluir `proveedores` (y opcional `moneda`, default `MXN`)

| Acción | Campo |
|---|---|
| `getPlusSolicitudVendedor` (vendedores-api) | `proveedores: ['stripe','mp']`, `moneda`. Si no hay `clabe`, se oculta la transferencia. |
| `obtenerMetodosPagoEntrega` (live-api) | `metodos.proveedores` = pasarelas conectadas por ese vendedor; `moneda` |
| Notificación `confirmacion_vendedor` | `meta.proveedores` = pasarelas conectadas por ese vendedor |

## Acciones que reciben `proveedor`

- `crearPreferenciaPlanPlus` y `crearPreferenciaComunidad` reciben `proveedor` (`stripe` | `mp`;
  si falta, `mp`). Responden `{ ok, url }`.
  - Stripe: `checkout.sessions.create({ mode: 'payment', line_items, success_url, cancel_url,
    metadata: { requestId | vendorUid } })`. Activar en el dashboard Apple Pay, Google Pay, Link y OXXO
    (métodos de pago dinámicos: Stripe muestra los del país del comprador).
  - Comunidad con Stripe Connect: añadir `payment_intent_data: { transfer_data: { destination: acctId } }`
    (o crear la sesión con `stripeAccount: acctId` = direct charge, para que el dinero sea 100% del vendedor).

## Stripe Connect para vendedores (vendedores-api)

- `stripeConectarUrl` → crea (si no existe) una cuenta `type: 'express'`, guarda `acctId` en el vendedor y
  devuelve `{ ok, url }` de `accountLinks.create({ type: 'account_onboarding',
  return_url: '<sitio>/vendedor.html', refresh_url: '<sitio>/vendedor.html' })`. No hace falta callback.
- `stripeEstadoConexion` → `{ ok, conectado: charges_enabled, pendiente: !!acctId && !charges_enabled }`.
- `stripeDesconectar` → borra `acctId` del vendedor.

## Webhook (nuevo endpoint `stripeWebhook`)

Verificar firma con `STRIPE_WEBHOOK_SECRET` y, en `checkout.session.completed` /
`checkout.session.async_payment_succeeded` (OXXO), hacer lo mismo que hoy hace `mpWebhook`
(activar Plan Plus / marcar pedido pagado). En `checkout.session.async_payment_*` de OXXO se puede
reutilizar la notificación `pago_pendiente` con `meta.comprobanteUrl` = `hosted_voucher_url`.

Secretos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (en Secret Manager, nunca en el frontend).
