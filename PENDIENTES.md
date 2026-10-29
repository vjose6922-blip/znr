# Pendientes

Ideas acordadas para más adelante.

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
