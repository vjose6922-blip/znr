# Pendientes

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
