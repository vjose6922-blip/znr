# Pagos con Stripe y Mercado Pago — cómo activarlo

El backend ya soporta las dos pasarelas y **ninguna es obligatoria**: cada una aparece solo si su llave
está configurada. Sin `MP_ACCESS_TOKEN`, Mercado Pago desaparece de Plan Plus y de la tienda; sin
`STRIPE_SECRET_KEY`, desaparece Stripe. Los vendedores eligen cuál conectar (o ambas).

Servicios modificados: `vendedores-api`, `ventas-api`, `live-api`, `tienda-znr-api`
(los tres que cobran agregan la dependencia `stripe` en `package.json`).

## 1. En el dashboard de Stripe

1. Crea la cuenta de Z&R y completa la verificación (México).
2. **Settings → Payment methods**: activa tarjeta, Apple Pay, Google Pay, Link y OXXO.
3. **Connect → Get started**: activa Connect (los vendedores usan cuentas *Standard*: la cuenta es
   suya, el dinero y las comisiones de Stripe son suyos, igual que con Mercado Pago).
4. **Developers → Webhooks**: crea 3 endpoints con los eventos `checkout.session.completed` y
   `checkout.session.async_payment_succeeded`:

| Endpoint | Tipo de eventos |
|---|---|
| `https://vendedores-api-1038143238323.us-central1.run.app?action=stripeWebhook` | Tu cuenta |
| `https://tienda-znr-api-1038143238323.us-central1.run.app?action=stripeWebhook` | Tu cuenta |
| `https://ventas-api-1038143238323.us-central1.run.app?action=stripeWebhook` | **Cuentas conectadas** |

## 2. Variables de entorno (Secret Manager)

| Servicio | `STRIPE_SECRET_KEY` | `STRIPE_WEBHOOK_SECRET` |
|---|---|---|
| vendedores-api | `sk_live_…` | el *signing secret* de su endpoint |
| tienda-znr-api | `sk_live_…` | el de su endpoint |
| ventas-api | `sk_live_…` | el del endpoint de cuentas conectadas |

Para probar primero usa las llaves `sk_test_…` y la tarjeta `4242 4242 4242 4242`.

## 3. Qué hace cada pieza

- **Plan Plus**: botón de Stripe (principal) y de Mercado Pago. El aviso firmado de Stripe activa el plan
  solo; con OXXO se activa cuando el vendedor paga en la tienda.
- **Vendedores**: en su panel conectan Stripe (registro alojado por Stripe, regresa a `vendedor.html`).
  `vendedores.stripe = { accountId, listo }`; `listo` se refresca cada vez que abren el panel.
- **Ventas de Comunidad y lives**: el comprador ve un botón por cada pasarela que tenga conectada ese
  vendedor. El cobro de Stripe se hace directo en la cuenta del vendedor. Solo hay una sesión de
  pago abierta por pedido, y si llega un segundo pago se avisa como posible cobro duplicado, igual que con MP.
- **Tienda Z&R**: el link de pago ahora es `tienda-znr-api?action=pagarLote&r=…&l=…`. No vence; al
  abrirlo crea el cobro en ese momento (Stripe si está configurado, si no Mercado Pago) y redirige.
  Si el lote ya está pagado, no vuelve a cobrar. Con OXXO el comprador recibe su ficha en notificaciones.
- **Libro de pagos** (`pagos_mp`): ahora guarda `proveedor` y `orden` (hora del pago) para detectar
  duplicados entre pasarelas.

## Pendiente / a futuro

- Todo cobra en **MXN**. Para otros países basta con cambiar `currency` por la moneda del comprador.
- `crearPreferenciaDonacion` sigue solo con Mercado Pago (hoy ninguna pantalla la usa).
