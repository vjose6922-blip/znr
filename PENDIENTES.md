# Pendientes Z&R: lista única (znr + CONTROL + znr-backend)

Actualizado: 2 nov 2026. **Este es el único archivo de pendientes.** Los `PENDIENTES.md` de CONTROL y znr-backend
apuntan aquí. Al terminar algo, cambia `[ ]` por `[x]`. Para pedir ayuda a Claude, cita el código (ej. "haz S2").

Fuentes unificadas: `PENDIENTES.md` de los 3 repos, `PRUEBAS-PENDIENTES.md` y la lista de pruebas de
`PAGOS-BACKEND.md` (znr-backend), e issues abiertos znr#18, znr#61, znr-backend#13, #15 y #37.

**Orden sugerido:** 1 → 2 → 3 → lanzar. Las secciones 4 y 5 pueden ir después del lanzamiento.

---

## 1. Despliegue (confirmar en Cloud Run) — antes de probar nada
Los servicios se despliegan solos al fusionar en `main`. Confirma en **Cloud Run** que la última revisión de cada uno
es posterior al cambio; si no, en **Cloud Build → Activadores** revisa que tenga activador hacia `main` o despliégalo a mano.

- [x] **D1 `live-api`**: ventas antes de buscar direcciones; `live_estado`; respaldo solo con reporte (`live_respaldo`) y
      5 min para la 2ª cámara; aviso de 15 min con consumo de datos; caché corto de la lista de lives (#12).
- [x] **D2 `vendedores-api`**: Plus (400) / Pro (1,000), anual y conversión de días; Activar/Quitar Plus y Ajustar días
      con motivo en `staff_actividad`; fotos borradas de Storage; `_activoVigente` ("Ver contacto"); correo con Resend.
- [x] **D3 `catalogo-api`**: límites 400/1,000; productos Z&R a Algolia y sincronización; `backfillCiudadComunidad` solo master.
- [x] **D4 `beneficiarios-api`**: no se puede donar a la fundación propia; fotos borradas de Storage.
- [x] **D5 `admin-api`**: banners (posición, tamaño, sombra, "Mostrar solo este banner", "Dónde mostrar").
- [x] **D6 `tienda-znr-api`**: sincroniza Algolia al vender/devolver (mismo `ADMIN_TOKEN` que catálogo); precio siempre del producto guardado.
- [x] **D7 `ventas-api`**: donación en línea con nombre del refugio y regreso a `refugios.html`.
- [x] **D8 `historias-api`**: un token de admin vencido ya no llega al monitor de errores.

## 2. Configuración en consolas (sin código)
- [x] **C1 RTDB reglas** publicadas: `live_estado`, `live_respaldo`, `live_espectadores` y `".indexOn": ["uid"]` en `chats/$liveId/messages`.
- [x] **C2 Algolia** (una vez, después de D3): CONTROL → Herramientas → **Resincronizar todo Comunidad con Algolia**.
- [x] **C3 Stripe** → Settings → Emails → activar "Pagos exitosos" (recibo al comprador).
- [x] **C4 Push en CONTROL**: cada master permite notificaciones en el navegador donde usa el panel.
- [x] **C5 Resend**: `RESEND_API_KEY` en `vendedores-api` y dominio `znrcommunity.com` verificado (SPF/DKIM). Sin esto el correo opcional da error.
- [x] **C6 Mapbox**: token público `pk.` restringido a `https://znrcommunity.com` y `https://www.znrcommunity.com`; pegarlo en
      `MAPBOX_PK` de `entregas-live.html` y `seguimiento-entrega.html` (hoy usan tiles de OpenStreetMap, no aptos para uso intensivo).
- [x] **C7 Alerta de presupuesto** en Google Cloud (Facturación → Presupuestos y alertas). Cloudflare no ofrece aviso por correo: se cubre con F7.
- [ ] **C8 Storage ciclo de vida**: `znr-backups` a clase Archive; borrar en `znr-live-grabaciones` lo de más de 7 días.
- [x] **C9 App Check TTL**: 1 día (Verificación de aplicaciones → Apps → ZNR WEB).
- [x] **C10 Stripe**: confirmar el **primer depósito** a la CLABE (previsto ~2 nov) en Stripe → Saldos (automático lunes y viernes).

## 3. Pruebas en producción
Si algo falla, el error sale en pantalla y en el **Monitor de errores** de CONTROL: captura y llévala a Claude.
Usa montos chicos ($149 de Plus o ~$10) y reembolsa si no quieres conservarlos. Detalle técnico: `PAGOS-BACKEND.md` de znr-backend.

### 3.1 Pagos (dinero real)
- [x] **P1 Plus con Stripe** (`plan-plus.html` → "Suscribirme con tarjeta"): recuadro dentro de la página → plan activo,
      en "Pagos recibidos" de CONTROL y "Se cobra solo cada mes". Luego **Cancelar renovación** (sigue hasta vencer) y **Reanudar**.
- [ ] **P2 Plus con Mercado Pago**: mismo flujo; al cancelar se corta de inmediato y dura lo pagado. En MP → Webhooks llegan con 200.
- [ ] **P3 Pro mensual y anual** (Stripe y MP): insignia PRO, límite 1,000, sale como Pro en admin, ~2 días de Plus = 1 de Pro.
- [ ] **P4 "← Ver otras formas de pago"** cierra el recuadro y vuelven los botones.
- [ ] **P5 OXXO** (Plus y tienda): la ficha llega y el plan/pedido se activa al pagar en tienda.
- [ ] **P6 Vendedor real con Stripe** (webhook B): le compran en Comunidad o live → pedido pagado, dinero en su cuenta, sin comisión.
- [ ] **P7 Admin de ciudad con pasarela** (webhook D): conecta en CONTROL → Mi cuenta → Datos bancarios; compra en su Tienda Z&R → cobra él y Z&R recibe 5 %.
- [ ] **P8 Admin de ciudad sin pasarela**: el link de pago muestra su CLABE o efectivo.
- [ ] **P9 Devolución con Mercado Pago** de una compra de la tienda (Stripe ya funcionó).
- [ ] **P10 Donación en línea** con Stripe y con MP → aparece en `donaciones_dinero` y llega aviso al beneficiario.
- [ ] **P11 "¡Hay stock disponible!"**: botones de pago en línea y, en "Otras formas de pago", la CLABE con Copiar.

### 3.2 Lives (2 teléfonos)
- [ ] **L1** Apagar WiFi del vendedor ~30 s → el video vuelve solo (también con la 2ª cámara).
- [ ] **L2** El contador de espectadores cambia en el comprador.
- [ ] **L3** Reportar → el clip aparece en el panel en ~3 min; finalizar justo después muestra "Terminando procesos…".
- [ ] **L4** "¿Sigues ahí?" a los 20 min sin tocar y aviso 10 min antes de las 3 h.
- [ ] **L5** Comprador con sesión escribe en el chat: en RTDB → `chats`, el `uid` **no** empieza con `cliente_`. Chat y producto destacado funcionan.

### 3.3 Comunidad, Refugios, Banners e Inicio
- [x] **R1** Comunidad → Filtros → categoría del catálogo Z&R: salen productos de Z&R (requiere C2).
- [ ] **R2** Perfil de vendedor → **Ver contacto**: llamar / WhatsApp (antes "Error interno").
- [ ] **R3** Refugios → **Donar artículo** con sesión de vendedor: abre la lista de productos.
- [ ] **R4** Panel de vendedor → **Editar información** de la fundación con foto nueva → llega a CONTROL → Beneficiarios → Ediciones.
- [ ] **R5** Cuenta con fundación aprobada: Refugios dice "Tu fundación" y no aparece al donar un producto.
- [ ] **R6** Inicio: banners ("Inicio" / "Inicio y Comunidad" + automáticos) y vendedores destacados al azar.
- [ ] **R7** Banner vencido muestra **"Renovar <año>"**; después ajustar con "Editar" las fechas móviles (Semana Santa, Día del Padre, Buen Fin…).
- [ ] **R8** Banners creados antes de "Dónde mostrar" salen solo en Comunidad: editarlos si deben ir en Inicio.

### 3.4 Panel CONTROL
- [ ] **K1** Notificaciones → Beneficiarios: contadores = Nuevas + Ediciones + Reportes; "Aprobados" lista los refugios.
- [ ] **K2** Sesión en otro dispositivo: el panel anterior cierra sesión y el login muestra el aviso rojo.
- [ ] **K3** Estadísticas de vendedor (Inicio y Herramientas): Activar/Quitar Plus, Ajustar días, Suspender y Eliminar exigen motivo y sale en `Audit.html` (requiere D2).
- [ ] **K4** Cuentas existentes (Master): filtro por ciudad y lista a pantalla completa.
- [ ] **K5** Chat de soporte: ventana completa y "Agregar personas" con buscador y varias a la vez.
- [ ] **K6** Monitor de errores: ya no salen `showPanel is not defined`, CSP `connect-src` de firebaseio en `plan-plus.html`,
      `Cannot read properties of null (reading 'ok')` ni `Failed to fetch`. **"📋 Copiar errores"** copia o descarga `errores-znr.txt`.
- [ ] **K7** Aviso de errores repetidos solo le llega a master.

### 3.5 Mapas
- [x] **M1** `entregas-live.html` → "Ver ruta completa": línea sólida por calles (punteada = error, ver logs de `live-api`).
- [x] **M2** Link de seguimiento de un pedido en ruta: línea rosa y ETA.

### 3.6 Celular, datos móviles y carga (znr#61)
- [ ] **T1** Fotos de productos cargan bien (WebP con `-rw` en `lh3`) y la cuadrícula usa la miniatura de 300 px.
- [ ] **T2** Preferencias → Apariencia → **Ahorro de datos**: en historias sale "▶ Ver video" y reproduce al tocar.
- [ ] **T3** Android con datos móviles: aviso "Estás usando datos móviles" al abrir live o historias (en iPhone no sale, es normal).
- [ ] **T4** Botón del asistente aparece ~1.5 s después; animaciones de inicio y catálogo sin parpadeo.
- [ ] **T5** Tocar una notificación push abre la página correcta.
- [ ] **T6** Modo avión: página "sin conexión" e imágenes caídas con placeholder.
- [ ] **T7** "Elegir otra ciudad": salen ciudades chicas (Del Rio, Eagle Pass) en orden alfabético; editar vendedor/fundación con ciudad chica muestra estado y ciudad.
- [ ] **T8** Seguimiento de entrega: cambiar de app y volver → se actualiza.
- [ ] **T9** Correo opcional del vendedor (Ajustes → Seguridad): código de verificación, recuperar contraseña y cambiar número con el correo (requiere C5).
- [ ] **T10 Revisión general**: catálogo, historias, perfiles, pedidos, avisos push e inicio de sesión funcionan en el sitio y en CONTROL.

## 4. Seguridad (puede ser justo después del lanzamiento, en este orden)
- [x] **S1 Teléfonos filtrados (hacer primero)**: RTDB → `chats` y `presencia`: borrar mensajes con `uid` que empiece con `cliente_` (znr-backend#15).
- [ ] **S2 App Check en Firestore**: Firebase → Verificación de aplicaciones → APIs → **Aplicar** (98 % verificadas).
- [ ] **S3 App Check en RTDB**: aún NO aplicar (84 % sin token). En la consola de znrcommunity.com correr la prueba y ver si sube
      "Sin verificar: solicitudes no válidas" (sube a 5 → aplicar; se queda en 0 → cambiar las lecturas REST antes):
      ```js
      for (let i = 0; i < 5; i++) { const x = new XMLHttpRequest(); x.open('GET', 'https://znr-live-default-rtdb.firebaseio.com/banners_temporada.json?shallow=true'); x.setRequestHeader('X-Firebase-AppCheck', 'token-falso-prueba'); x.send(); }
      ```
- [x] **S4 Código antes de `APP_CHECK=bloquear`** (hecho en znr-backend, rama `claude/busy-turing-3kwzsb`):
  - `catalogo-api`: `LIBRES_APP_CHECK = { body: ["cronMantenimientoCatalogo"] }` (el Scheduler usa `CRON_SECRET`, no `ADMIN_TOKEN`).
  - `appCheckOk` en los 11 servicios: parsear el body cuando llega como texto (igual que los handlers), o se rechazan jobs de Scheduler.
- [ ] **S5 App Check en APIs** (al final, después de S3 y S4): F12 → Red, las llamadas a `…run.app` llevan `&_ac=`; poner
      `APP_CHECK=bloquear` en admin, auth, beneficiarios, catálogo, historias, live, pedidos, registrar-token-fcm, tienda,
      vendedores y ventas; revisar logs (`401` con "App Check" = falta excepción). Emergencia: quitar la variable.
      **No** aplicar App Check en Storage (las `<img>` no llevan token).
- [ ] **S6 Cuentas de servicio por API** (znr-backend#13): revisar roles de `…-compute@developer.gserviceaccount.com`, crear una
      cuenta por API solo con sus roles (tabla en el issue), asignarla en Cloud Run y quitar **Editor** a la cuenta por defecto.
- [ ] **S7 Retirar `ADMIN_TOKEN` maestro**: confirmar que el Master tiene su documento en `admins` y quitar la variable de Cloud Run.
- [ ] **S8 (opcional) RTDB**: agregar `&& root.child('vendedorOficial').child($liveId).exists()` al `.write` de `chats`, `presencia` y
      `contactos`. Probar antes con un live programado (el comprador que entra antes que el vendedor sería rechazado).
- [ ] **S9 (futuro) Storage**: servir fotos de `pedidos_personalizados/` con URL firmada desde `pedidos-api` en vez de `allow get: if true`.

## 5. Después del lanzamiento (mejoras e ideas)
- [x] **F1 Tráfico real en mapas** (znr-backend#40, fusionado; probar con M1 y revisar consumo de Mapbox): rama `claude/admiring-cannon-rz50he` (commit `d341ff4`:
      `driving-traffic` y caché de 5 min) y unirlo.
- [x] **F2 Fondos del clima fuera de Google Drive**: `looks.js` carga 34 fondos por id (`WEATHER_IMAGES`, `lh3`). Subirlos a
      Storage o `img/clima/*.webp`, cambiar `getImageUrl` y quitar `lh3` de la CSP y del service worker.
- [x] **F10 Chats de lives sin reporte**: la limpieza de 12 h (`limpiarGrabacionesLive`) borra `chats`, `presencia` y
      `faq_enfriamiento` del live si no tiene reportes (znr-backend). Los de lives anteriores a este cambio no se borran solos.
- [x] **F3 Scroll infinito** en Catálogo, Comunidad y Perfil de vendedor (`scroll-infinito.js`): tandas de 30, "Ver más" cada 150, restaura posición al regresar.
- [ ] **F4 Mapas**: "Reordenar" con >11 paradas (respaldo: parada más cercana); mover `baseMapa()` y "◎" a `common.js`;
      cambiar Nominatim solo si falla seguido.
- [ ] **F5 Ahorro de cuota**: `Cache-Control: public, max-age=60` en respuestas públicas; caché de búsquedas de Algolia;
      paginar `obtenerBeneficiarios` y `obtenerDonaciones`.
- [ ] **F6 Pago de pedidos dentro de la página** (Stripe Embedded Checkout / Mercado Pago Bricks), como ya hace Plan Plus.
- [ ] **F7 Costos**: revisar cada mes los minutos de Cloudflare Stream contra lo que entra por suscripciones.
- [ ] **F8 Rendimiento**: PageSpeed (celular) cada mes o tras cambios grandes (base 69–75; preocuparse si baja de 50); revisar
      "lo que experimentan tus usuarios reales"; solo si la primera carga se nota lenta, mínimo 1 instancia en `catalogo-api` (cuesta).
- [ ] **F9 Internacionalización** (antes de abrir otro país, primero decidir cuál; znr#18):
  - Teléfono: `+52` fijo (~44 lugares) y 10 dígitos; es la llave de pedidos, sesiones y push → migrar o guardar con lada.
  - Moneda: `MXN`/`es-MX` fijos (~50 y ~75 lugares) y `currency: "mxn"` en cobros.
  - Pasarelas: MP solo cobra en su país y no opera en USA; actualizar términos y privacidad.
  - Idea: una configuración por ciudad/país (lada, dígitos, moneda, pasarelas) que lean sitio, CONTROL y backend.

## Limpieza
- [ ] Borrar la rama `vjose6922-blip-patch-1` de znr (historia vieja de sep 2026, sin relación con `main`).
- [x] Cerrados los issues znr#18, znr#61, znr-backend#13, #15 y #37: su contenido ya está aquí.
