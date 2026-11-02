# Pendientes

Ideas acordadas para más adelante y lo que falta para cerrar lo ya programado.

## Por publicar y probar (cambios de oct-nov 2026)
- [ ] Mergear el PR #46 (lives: segundo plano, "¿Sigues ahí?", máximo 3 h; planes Plus/Pro con anual; términos).
      Antes, desplegar el backend (ver `PENDIENTES.md` de znr-backend).
- [ ] Reglas de Realtime Database: confirmar que estén publicadas `live_estado`, `live_respaldo`, `live_espectadores`
      y `".indexOn": ["uid"]` en `chats/$liveId/messages`.
- [ ] Prueba de live con 2 teléfonos:
  - apagar el WiFi del vendedor ~30 s (el video vuelve solo);
  - el contador de espectadores cambia en el comprador;
  - reportar → el clip aparece en el panel en ~3 min;
  - finalizar justo después de un reporte ("Terminando procesos…");
  - lo mismo con la 2ª cámara;
  - "¿Sigues ahí?" (20 min sin tocar) y el aviso de 10 min antes de las 3 h.
- [ ] Pago real chico de Pro (mensual y anual) con Stripe y Mercado Pago:
  - insignia PRO y límite de 1,000;
  - el pago aparece como Pro en el panel de admin;
  - los días de Plus se convierten (~2 días de Plus = 1 de Pro).
- [ ] Con una cuenta que tenga fundación aprobada: en Refugios dice "Tu fundación" y no aparece al donar un producto.

## Miniaturas de 300 px para el catálogo
Hoy cada foto se sube a 800 px (WebP, ~80 KB) y la cuadrícula del catálogo descarga esa misma foto.
Generar al subir una miniatura de ~300 px y usarla en la cuadrícula; la de 800 px solo al abrir el artículo.
Baja ~5 veces lo que se descarga de Firebase Storage (100 GB/mes gratis, luego ~$0.12 USD por GB).

## Correo electrónico opcional (seguridad)
En la sección de Seguridad del panel: "Mejora la seguridad de tu cuenta usando tu correo electrónico".
- Verificar el correo con un código; cambiarlo pide contraseña y avisa al correo anterior.
- Usarlo para recuperar contraseña / cambiar número sin el admin, y avisos de inicio de sesión nuevo y cambios en la cuenta.
- Servicio sugerido: Resend (plan gratis 3,000 correos/mes, 100/día). Verificar el dominio znrcommunity.com (SPF/DKIM).

## Configuración en consolas (sin código)
- Alerta de presupuesto en Google Cloud (Facturación → Presupuestos) y en Cloudflare (Billing → Notifications).
- Reglas de ciclo de vida en Storage: `znr-backups` a clase Archive; borrar lo de `znr-live-grabaciones` con más de 7 días.
- Revisar cada mes los minutos de Cloudflare Stream (Stream → Analytics) contra lo que entra por suscripciones.
