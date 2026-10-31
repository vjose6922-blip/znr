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
4. **TTL del token:** dejarlo en **1 día** (Verificación de aplicaciones → Apps → ZNR WEB) para gastar menos reCAPTCHA.
5. **No aplicar en Storage:** las imágenes se cargan con `<img>` y no llevan token.

## Ideas de ahorro de cuota (opcionales, bajo impacto)

- `Cache-Control: public, max-age=60` en respuestas públicas de las APIs (ranking de donadores, perfil público), como ya hace historias.
- Cachear en memoria las búsquedas repetidas de Algolia en Comunidad.
- Paginar `obtenerBeneficiarios` y `obtenerDonaciones` (leen la colección completa; solo las usa el admin).
