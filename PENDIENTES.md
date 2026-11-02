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
## App Check (reCAPTCHA Enterprise / Fraud Defense)

Código ya en `main` de znr, CONTROL y znr-backend (`app-check.js`, PR znr#47, CONTROL#23, znr-backend#27).

1. **Firestore:** pulsar **Aplicar** en Firebase Console → Verificación de aplicaciones → APIs (ya tiene 98 % verificadas).
2. **Realtime Database:** todavía NO aplicar (84 % llega sin token). Prueba pendiente: en la consola de znrcommunity.com
   mandar 5 lecturas con token falso y revisar si sube "Sin verificar: solicitudes no válidas".
   ```js
   for (let i = 0; i < 5; i++) { const x = new XMLHttpRequest(); x.open('GET', 'https://znr-live-default-rtdb.firebaseio.com/banners_temporada.json?shallow=true'); x.setRequestHeader('X-Firebase-AppCheck', 'token-falso-prueba'); x.send(); }
   ```
   - Sube a 5: RTDB lee la cabecera; el 84 % es el backend (cuenta de servicio, no se bloquea). Se puede aplicar.
   - Se queda en 0: RTDB ignora la cabecera; cambiar las lecturas REST de la página antes de aplicar.
3. **APIs de Cloud Run:** desplegar los 11 servicios con `APP_CHECK=bloquear` (ver README de znr-backend). Antes,
   confirmar en F12 → Red que las llamadas a `…run.app` llevan `&_ac=`. Hacerlo al final, después de RTDB.
   **Antes de activarlo hay que corregir 2 cosas del backend** (detalle en `PENDIENTES.md` de znr-backend), o se
   bloquean trabajos de Cloud Scheduler.
4. **TTL del token:** dejarlo en **1 día** (Verificación de aplicaciones → Apps → ZNR WEB) para gastar menos reCAPTCHA.
5. **No aplicar en Storage:** las imágenes se cargan con `<img>` y no llevan token.

## Pagos (Stripe live, suscripciones, tienda por ciudad)

El código está en `main` de los tres repos. La lista completa de pruebas, con qué revisar en cada una, está en
`PAGOS-BACKEND.md` de znr-backend → *Lista de pruebas pendientes*. La copia de `PAGOS-BACKEND.md` en este repo es la
guía vieja de activación: la buena es la de znr-backend.

1. **Primera transferencia de Stripe** a la CLABE (debía llegar ~2 nov): Stripe → Saldos.
2. **Pruebas con dinero real:** suscripción del Plan Plus con Stripe y con Mercado Pago (activar, cancelar, reanudar),
   vendedor real con Stripe (webhook B), admin de ciudad con pasarela (webhook D y el 5 %) y sin pasarela (CLABE/efectivo),
   devolución pagada con Mercado Pago, donación en línea, OXXO.
3. **Probar "📋 Copiar errores"** en el Monitor de errores de CONTROL (copia o descarga `errores-znr.txt`).
4. **Aviso de errores repetidos:** confirmar que ya solo le llega a master (cada master debe abrir CONTROL con los
   avisos permitidos en su dispositivo).
5. **Configuración de 1 minuto:** Stripe → Settings → Emails → "Pagos exitosos" (recibo al comprador).
6. **Internacionalización** (antes de abrir otro país; primero decidir cuál): `+52`, 10 dígitos, `MXN` y `es-MX` fijos.
   Detalle en `PAGOS-BACKEND.md` de znr-backend → *Ideas pendientes* #3.
## Mapas (Mapbox)

Rutas por calles ya en `main` (znr#56, znr-backend#33). `MAPBOX_TOKEN` ya está en Cloud Run (`live-api`).

1. **Tráfico real:** abrir PR de la rama `claude/admiring-cannon-rz50he` de znr-backend (commit `d341ff4`: perfil
   `driving-traffic` y caché de rutas de 5 min) y unirlo.
2. **Mapa base de Mapbox:** crear token público `pk.` restringido a `https://znrcommunity.com` y
   `https://www.znrcommunity.com`, y pegarlo en `MAPBOX_PK` de `entregas-live.html` y `seguimiento-entrega.html`
   (hoy usan los tiles de OpenStreetMap, que no permiten uso intensivo).
3. **Probar en producción:** "Ver ruta completa" en `entregas-live.html` debe dar línea sólida por calles (punteada =
   error, revisar logs de `live-api`), y el link de seguimiento de un pedido en ruta debe mostrar la línea rosa y el ETA.

Opcionales:
- "Reordenar" con más de 11 paradas: hoy solo avisa (límite de Mapbox). Usar parada más cercana como respaldo.
- `baseMapa()` y el botón "◎" están duplicados en las 2 páginas: moverlos a `common.js`.
- Nominatim (dirección desde GPS en `common.js`, `vendedor-unificado.js` y backend) es lento y limitado a 1/s. Mapbox
  no permite guardar sus resultados sin el plan "permanente", así que solo cambiarlo si Nominatim falla seguido.

## Ideas de ahorro de cuota (opcionales, bajo impacto)

- `Cache-Control: public, max-age=60` en respuestas públicas de las APIs (ranking de donadores, perfil público), como ya hace historias.
- Cachear en memoria las búsquedas repetidas de Algolia en Comunidad.
- Paginar `obtenerBeneficiarios` y `obtenerDonaciones` (leen la colección completa; solo las usa el admin).
