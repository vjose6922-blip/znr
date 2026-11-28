# Pendientes Z&R: lista única (znr + CONTROL + znr-backend)

Actualizado: 26 nov 2026. **Este es el único archivo de pendientes.** Los `PENDIENTES.md` de CONTROL y znr-backend
apuntan aquí. Al terminar algo, cambia `[ ]` por `[x]`. Para pedir ayuda a Claude, cita el código (ej. "haz S2").

Fuentes unificadas: `PENDIENTES.md` de los 3 repos, `PRUEBAS-PENDIENTES.md` y la lista de pruebas de
`PAGOS-BACKEND.md` (znr-backend), e issues abiertos znr#18, znr#61, znr-backend#13, #15 y #37.

**Orden sugerido:** 1 → 2 → 3 → lanzar. Las secciones 4 y 5 pueden ir después del lanzamiento.

---

## ▶️ Para retomar: lo que falta antes de lanzar
Todo el código ya está en `main` de los 3 repos (sin PRs abiertos). Solo faltan pruebas:

1. **Con el celular (10 min):** T8 (seguimiento de entrega al cambiar de app) y T10 (revisión general).
2. **En casa, con 2 teléfonos:**
   - **Fuera del WiFi del trabajo**: esa red bloquea el video en vivo y el chat en tiempo real (usar datos móviles o WiFi de casa).
   - **Dos cuentas de vendedor distintas** (una transmite, otra compra): iniciar sesión con la misma cuenta en otro
     teléfono cierra la sesión del primero y el live pierde el respaldo de video.
   - **Lives:** L1, L2, L4, L5 (sección 3.2).
   - **Donaciones:** D1–D3 (sección 3.8), con una cuenta de vendedor y la cuenta dueña de una fundación aprobada.
   - **Chat de pedidos:** X1–X5 (sección 3.7). Hacer un **pedido nuevo**: solo los pedidos creados desde el 5 nov
     tienen el chat automático.
3. **Pagos con dinero real:** P2–P11 (sección 3.1). Montos chicos y reembolsar después.
4. **El día del lanzamiento (Cloud Shell, 1 min): subir de 1 a 5 el mínimo de vendedores del aviso diario por zona**
   (`avisar-zonas`; con 1 era para pruebas y con 5 no se mandan avisos de zonas casi vacías):
   ```bash
   gcloud scheduler jobs update http avisar-zonas --location=us-central1 --message-body="{\"action\":\"avisarNovedadesZonas\",\"token\":\"$(gcloud secrets versions access latest --secret=ADMIN_TOKEN)\",\"minVendedores\":5}"
   ```
   Si rotas `ADMIN_TOKEN`, este trabajo también se actualiza con el mismo comando.

Después de lanzar: sección 4 (seguridad) y 5 (mejoras).

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
- [x] **C8 Storage ciclo de vida**: `znr-backups` a clase Archive; borrar en `znr-live-grabaciones` lo de más de 7 días.
- [x] **C11** (25 nov): el trabajo de Storage Transfer `2833072074860092080` (en znr-live) copia cada noche a medianoche UTC las
      fotos a `znr-backups/storage-continuo/` y **no** borra en el destino. Se activó la API `storagetransfer` para poder consultarlo (dejarla activa).
- [x] **C9 App Check TTL**: 1 día (Verificación de aplicaciones → Apps → ZNR WEB).
- [x] **C10 Stripe**: confirmar el **primer depósito** a la CLABE (previsto ~2 nov) en Stripe → Saldos (automático lunes y viernes).

## 3. Pruebas en producción
Si algo falla, el error sale en pantalla y en el **Monitor de errores** de CONTROL: captura y llévala a Claude.
Usa montos chicos ($149 de Plus o ~$10) y reembolsa si no quieres conservarlos. Detalle técnico: `PAGOS-BACKEND.md` de znr-backend.

### 3.1 Pagos (dinero real)
Organizadas por quién puede hacerlas (27 nov). Para ser comprador y vendedor a la vez en ZNR hacen falta **dos números**
(el tuyo y uno de casa o un chip de prepago). Stripe sí acepta pagar con tu tarjeta personal a la cuenta de ZNR (montos chicos,
reembolsar en Stripe, sin repetir mucho seguido). Mercado Pago **no** deja pagarte a ti mismo: esas van con ayuda de alguien.

**A) Solo (sin otra persona):** P4, P5, P8, P11, y la parte de **Stripe** de P3 y P10.
**B) Con alguien de confianza que pague con su Mercado Pago o tarjeta (~$10, luego reembolsar):** P2, P9 y la parte de
**Mercado Pago** de P3 y P10.
**C) Con un vendedor o admin de ciudad real que conecte su pasarela:** P6 y P7 (o una 2ª cuenta de Stripe: "+ Nueva cuenta"
en el dashboard, si Stripe deja conectarla con tus mismos datos).

- [x] **P1 Plus con Stripe** (`plan-plus.html` → "Suscribirme con tarjeta"): recuadro dentro de la página → plan activo,
      en "Pagos recibidos" de CONTROL y "Se cobra solo cada mes". Luego **Cancelar renovación** (sigue hasta vencer) y **Reanudar**.
- [ ] **P2 Plus con Mercado Pago** [B]: mismo flujo; al cancelar se corta de inmediato y dura lo pagado. En MP → Webhooks llegan con 200.
- [ ] **P3 Pro mensual y anual** [A Stripe · B MP]: insignia PRO, límite 1,000, sale como Pro en admin, ~2 días de Plus = 1 de Pro.
- [ ] **P4 "← Ver otras formas de pago"** [A] cierra el recuadro y vuelven los botones.
- [ ] **P5 OXXO** [A] (Plus y tienda): la ficha llega y el plan/pedido se activa al pagar en tienda.
- [ ] **P6 Vendedor real con Stripe** [C] (webhook B): le compran en Comunidad o live → pedido pagado, dinero en su cuenta, sin comisión.
- [ ] **P7 Admin de ciudad con pasarela** [C] (webhook D): conecta en CONTROL → Mi cuenta → Datos bancarios; compra en su Tienda Z&R → cobra él y Z&R recibe 5 %.
- [ ] **P8 Admin de ciudad sin pasarela** [A]: el link de pago muestra su CLABE o efectivo.
- [ ] **P9 Devolución con Mercado Pago** [B] de una compra de la tienda (Stripe ya funcionó).
- [ ] **P10 Donación en línea** [A Stripe · B MP] con Stripe y con MP → aparece en `donaciones_dinero` y llega aviso al beneficiario.
- [ ] **P11 "¡Hay stock disponible!"** [A]: botones de pago en línea y, en "Otras formas de pago", la CLABE con Copiar.

### 3.2 Lives (2 teléfonos)
- [ ] **L1** Apagar WiFi del vendedor ~30 s → el video vuelve solo (también con la 2ª cámara).
- [ ] **L2** El contador de espectadores cambia en el comprador.
- [x] **L3** Reportar → el clip aparece en el panel en ~3 min; finalizar justo después muestra "Terminando procesos…".
- [ ] **L4** "¿Sigues ahí?" a los 20 min sin tocar y aviso 10 min antes de las 3 h.
- [ ] **L5** Comprador con sesión escribe en el chat: en RTDB → `chats`, el `uid` **no** empieza con `cliente_`. Chat y producto destacado funcionan.

### 3.3 Comunidad, Refugios, Banners e Inicio
- [x] **R1** Comunidad → Filtros → categoría del catálogo Z&R: salen productos de Z&R (requiere C2).
- [x] **R2** Perfil de vendedor → **Ver contacto**: llamar / WhatsApp (antes "Error interno").
- [x] **R3** Refugios → **Donar artículo** con sesión de vendedor: abre la lista de productos.
- [x] **R4** Panel de vendedor → **Editar información** de la fundación con foto nueva → llega a CONTROL → Beneficiarios → Ediciones.
- [x] **R5** Cuenta con fundación aprobada: Refugios dice "Tu fundación" y no aparece al donar un producto.
- [x] **R6** Inicio: banners ("Inicio" / "Inicio y Comunidad" + automáticos) y vendedores destacados al azar.
- [x] **R7** Banner vencido muestra **"Renovar <año>"**; después ajustar con "Editar" las fechas móviles (Semana Santa, Día del Padre, Buen Fin…).
- [x] **R8** Banners creados antes de "Dónde mostrar" salen solo en Comunidad: editarlos si deben ir en Inicio.

### 3.4 Panel CONTROL
- [x] **K1** Notificaciones → Beneficiarios: contadores = Nuevas + Ediciones + Reportes; "Aprobados" lista los refugios.
- [x] **K2** Sesión en otro dispositivo: el panel anterior cierra sesión y el login muestra el aviso rojo.
- [x] **K3** Estadísticas de vendedor (Inicio y Herramientas): Activar/Quitar Plus, Ajustar días, Suspender y Eliminar exigen motivo y sale en `Audit.html` (requiere D2).
- [x] **K4** Cuentas existentes (Master): filtro por ciudad y lista a pantalla completa.
- [x] **K5** Chat de soporte: ventana completa y "Agregar personas" con buscador y varias a la vez.
- [x] **K6** Monitor de errores: ya no salen `showPanel is not defined`, CSP `connect-src` de firebaseio en `plan-plus.html`,
      `Cannot read properties of null (reading 'ok')` ni `Failed to fetch`. **"📋 Copiar errores"** copia o descarga `errores-znr.txt`.
- [x] **K7** Aviso de errores repetidos solo le llega a master.

### 3.5 Mapas y rutas de entrega (sin Mapbox)
- [ ] **M1** `entregas-live.html`: marcar pedidos con la casilla → "Iniciar ruta" → todos "En ruta" y el primero "Siguiente".
- [ ] **M2** "Abrir ruta en Google Maps" abre las paradas en el orden mostrado, en Android y en iPhone. Probar cuántas paradas
      acepta en el navegador del celular y ajustar `PARADAS_POR_ENLACE` (hoy 4 = destino + 3) en `entregas-live.html`.
- [ ] **M3** Con más paradas que el límite salen "Ruta 1", "Ruta 2"… y cada una funciona; las paradas sin GPS van al final.
- [ ] **M4** "No se pudo entregar" pide contactar primero; al confirmar, el pedido sale de la ruta y el siguiente pasa a "Siguiente".
- [ ] **M5** Comprador: recibe "En camino" → "Eres la siguiente parada" → "Entregado" / "No se pudo entregar", y cada aviso
      reemplaza al anterior en el teléfono. Antes de ser la siguiente ve "Faltan N entregas antes de la tuya" y no hay mapa.
- [ ] **M6** Siendo la siguiente parada: mapa de OpenFreeMap con el repartidor moviéndose y ETA.
- [x] **M7** Mapbox retirado (23 nov): ningún servicio tiene `MAPBOX_TOKEN` y los tokens `sk.`/`pk.` se revocaron.
- [x] **T1** Fotos de productos cargan bien (WebP con `-rw` en `lh3`) y la cuadrícula usa la miniatura de 300 px.
- [x] **T2** Preferencias → Apariencia → **Ahorro de datos**: en historias sale "▶ Ver video" y reproduce al tocar.
- [x] **T3** Android con datos móviles: aviso "Estás usando datos móviles" al abrir live o historias (en iPhone no sale, es normal).
- [x] **T4** Botón del asistente aparece ~1.5 s después; animaciones de inicio y catálogo sin parpadeo.
- [x] **T5** Tocar una notificación push abre la página correcta.
- [x] **T6** Modo avión: página "sin conexión" e imágenes caídas con placeholder.
- [x] **T7** "Elegir otra ciudad": salen ciudades chicas (Del Rio, Eagle Pass) en orden alfabético; editar vendedor/fundación con ciudad chica muestra estado y ciudad.
- [ ] **T8** Seguimiento de entrega: cambiar de app y volver → se actualiza.
- [x] **T9** Correo opcional del vendedor (Ajustes → Seguridad): código de verificación, recuperar contraseña y cambiar número con el correo (requiere C5).
- [ ] **T10 Revisión general**: catálogo, historias, perfiles, pedidos, avisos push e inicio de sesión funcionan en el sitio y en CONTROL.

### 3.7 Chat de pedidos normales (vendedor ↔ comprador, WhatsApp de respaldo)
- [ ] **X1** Comprador: en el aviso de su pedido (enviado / confirmado / entregado) toca **"💬 Chat con el vendedor"** → abre el chat del pedido.
- [ ] **X2** Vendedor: en la tarjeta de la venta toca **"💬 Chat con el cliente"** → abre el MISMO chat; se escriben y llega el aviso (burbuja).
- [ ] **X3** En el chat: botón **WhatsApp** (respaldo) abre WhatsApp de la otra persona; fotos y "Reportar conversación" funcionan.
- [ ] **X4** El chat aparece en **"Pedidos y chats"** (mis-pedidos.html) con la etiqueta "Chat · …". Se borra solo 30 días después de entregado.
- [ ] **X5** El chat se crea solo al hacer el pedido, con mensajes automáticos: 🛍️ pedido enviado, ✅ stock confirmado / 🚫 sin stock,
      💳 pago recibido, 📍 punto de recolección con botón a Maps (sin envío a domicilio), 🛵 va en camino (live), 🕒 "paso a recoger a las…" (desde el aviso) y 🎉 entregado.

### 3.8 Donaciones por piezas y pago a la fundación
- [ ] **D1** Donar un artículo con **varias piezas** (panel de vendedor → Donar, y desde Refugios): sale "¿Cuántas piezas donas?".
      Al donar 2 de 5 aparece una publicación aparte "Donativo" con 2 y el original queda con 3. Con 1 pieza se dona completo.
- [ ] **D2** Comprar la publicación "Donativo": la **fundación** recibe el aviso "❤️ Venta donada…" con **"✅ Recibí el pago"**;
      al tocarlo, el vendedor recibe el aviso, su tarjeta de venta dice "Pago a … ✅ confirmado" y queda el mensaje en el chat.
      Cada pago trae una **referencia de 4 dígitos** (el comprador la ve al enviar el pedido y en el chat). Aunque la fundación
      marque el aviso como leído, en su panel queda el botón flotante **"❤️ N pagos por confirmar"**.
- [ ] **D3** Quitar la donación de la copia: sus piezas regresan al original. Al venderse todas, la copia desaparece pero
      la donación sigue contando para la insignia y el ranking.

## 4. Seguridad (puede ser justo después del lanzamiento, en este orden)
- [x] **S1 Teléfonos filtrados (hacer primero)**: RTDB → `chats` y `presencia`: borrar mensajes con `uid` que empiece con `cliente_` (znr-backend#15).
- [x] **S2 App Check en Firestore**: Firebase → Verificación de aplicaciones → APIs → **Aplicar** (98 % verificadas).
- [x] **S3 App Check en RTDB**: aplicado (RTDB ya responde 401 sin token, 15 nov). Nota anterior: aún NO aplicar (84 % sin token). En la consola de znrcommunity.com correr la prueba y ver si sube
      "Sin verificar: solicitudes no válidas" (sube a 5 → aplicar; se queda en 0 → cambiar las lecturas REST antes):
      ```js
      for (let i = 0; i < 5; i++) { const x = new XMLHttpRequest(); x.open('GET', 'https://znr-live-default-rtdb.firebaseio.com/banners_temporada.json?shallow=true'); x.setRequestHeader('X-Firebase-AppCheck', 'token-falso-prueba'); x.send(); }
      ```
- [x] **S4 Código antes de `APP_CHECK=bloquear`** (hecho en znr-backend, rama `claude/busy-turing-3kwzsb`):
  - `catalogo-api`: `LIBRES_APP_CHECK = { body: ["cronMantenimientoCatalogo"] }` (el Scheduler usa `CRON_SECRET`, no `ADMIN_TOKEN`).
  - `appCheckOk` en los 11 servicios: parsear el body cuando llega como texto (igual que los handlers), o se rechazan jobs de Scheduler.
- [x] **S5 App Check en APIs** (26 nov): `APP_CHECK=bloquear` en los 11 servicios; en 24 h solo se rechazan bots y llamadas
      sueltas sin token. Arreglado el Scheduler `limpiar-historias` (tenía la clave vieja de antes de rotar `ADMIN_TOKEN`); los 13
      trabajos revisados. Revisar: `s5_401 <servicio> 1440` (en `~/s6.sh`). Emergencia: `gcloud run services update <servicio>
      --region=us-central1 --remove-env-vars=APP_CHECK`. **No** aplicar App Check en Storage (las `<img>` no llevan token).
- [x] **S6 Cuentas de servicio por API** (25 nov): los 17 servicios corren con su cuenta `<servicio>-sa@…`; a `…-compute@`
      se le quitó **Editor** (ahora: cloudbuild.builds.builder, run.admin, artifactregistry.writer, Cloud Tasks, eventarc,
      logWriter y `run.invoker` en los 3 servicios de Eventarc y push-send-worker). Si algo da 403/PERMISSION_DENIED, volver a darle
      Editor: `gcloud projects add-iam-policy-binding znr-live --member=serviceAccount:1038143238323-compute@developer.gserviceaccount.com --role=roles/editor --condition=None`.
- [x] **S12 Push al equipo viejo** (25 nov): al iniciar sesión de vendedor (contraseña, huella o "cerrar sesiones
      remotas") `vendedores-api` borra los equipos registrados en `fcm_tokens/vendedor_<uid>/tokens`; el que entra se vuelve a
      registrar enseguida. Probar: entrar en la PC y luego en el celular → un pedido nuevo solo avisa al celular.
- [x] **S13 `push-queue-worker`** (25 nov): borrado (servicio, cuenta `push-queue-worker-sa`, activador `push-queue-worker-auto`
      y carpeta en znr-backend). Nadie lo llamaba; la cola `push-queue` va a `push-send-worker`.
- [x] **S7 Entrada de emergencia apagada y `ADMIN_TOKEN` rotado** (19 nov): `ADMIN_PASSWORD` borrada de auth-api y
      vendedores-api; token nuevo en los 10 servicios y en los 9 trabajos de Cloud Scheduler. Revisar el monitor de errores
      1 h (sin "No autorizado") y que "Emergencia (contraseña + token)" ya no deje entrar.
- [x] **S10 `ADMIN_TOKEN` en Secret Manager** (19 nov): los 10 servicios lo leen del secreto `ADMIN_TOKEN:latest`
      (cuenta `…-compute@` con "Usuario con acceso a secretos"). Rotar: Secret Manager → Nueva versión → en cada servicio
      "Editar e implementar" sin cambios → actualizar los trabajos de Cloud Scheduler (no leen secretos).
- [x] **S11 Huella / Face ID del staff validada por el servidor** (znr-backend + CONTROL): opcional por cuenta en
      CONTROL → Mi cuenta → "Huella para entrar"; activada, `loginAdmin` pide contraseña + firma. Perderla: "¿Olvidaste tu
      contraseña?" (código al correo) la quita. Probar: activar en el celular → cerrar sesión → entrar pide la huella.
- [x] **S8 RTDB lives** (25 nov, revisado): ya cubierto con algo más estricto. En `chats` y `presencia` solo se escribe si
      `live_estado/$liveId/estado` es `en_vivo` (y borrar/editar mensajes solo el `vendedorOficial`); `contactos` ya no existe.
- [x] **S9 Storage** (25 nov): descartado. Las fotos de pedidos tienen ruta con parte aleatoria, Storage no deja listar y la URL
      solo está en el chat (Firestore, solo participantes); la URL firmada obligaba a rehacer cómo el chat muestra imágenes.

## 5. Después del lanzamiento (mejoras e ideas)
- [x] **F1 Tráfico real en mapas** (znr-backend#40, fusionado; probar con M1 y revisar consumo de Mapbox): rama `claude/admiring-cannon-rz50he` (commit `d341ff4`:
      `driving-traffic` y caché de 5 min) y unirlo.
- [x] **F2 Fondos del clima fuera de Google Drive**: `looks.js` carga 34 fondos por id (`WEATHER_IMAGES`, `lh3`). Subirlos a
      Storage o `img/clima/*.webp`, cambiar `getImageUrl` y quitar `lh3` de la CSP y del service worker.
- [x] **F10 Chats de lives sin reporte**: la limpieza de 12 h (`limpiarGrabacionesLive`) borra `chats`, `presencia` y
      `faq_enfriamiento` del live si no tiene reportes (znr-backend). Los de lives anteriores a este cambio no se borran solos.
- [x] **F11 Chats de soporte**: los finalizados se borran a los 7 días (antes la tarea nunca corría; znr-backend#43).
      Regla de RTDB con `".indexOn": ["estado"]` en `chats_soporte` publicada.
- [x] **F3 Scroll infinito** en Catálogo, Comunidad y Perfil de vendedor (`scroll-infinito.js`): tandas de 30, "Ver más" cada 150, restaura posición al regresar.
- [x] **F4 Mapas**: "Reordenar" ahora es vecino más cercano en el teléfono, sin límite de paradas. Nominatim: cambiar solo si falla seguido.
- [x] **F5 Ahorro de cuota** (25 nov): Comunidad guarda en el teléfono el catálogo de la ciudad (RTDB `catalogo/snapshot_ciudad`)
      y en cada visita solo lee sus fechas (`?shallow=true`); lo baja completo solo si cambió `datosEn` (`generadoEn` es un latido). Revisado y no hizo falta: las lecturas
      públicas ya tienen caché (historias `max-age=30`, beneficiarios y lives en memoria), Algolia-lite ya cachea búsquedas
      iguales en la sesión, y `obtenerBeneficiarios`/`obtenerDonaciones` son solo de CONTROL (paginar si crecen mucho).
- [ ] **F6 Pago de pedidos dentro de la página** (Stripe Embedded Checkout / Mercado Pago Bricks), como ya hace Plan Plus.
- [ ] **F7 Costos**: revisar cada mes los minutos de Cloudflare Stream contra lo que entra por suscripciones.
- [ ] **F8 Rendimiento**: PageSpeed (celular) cada mes o tras cambios grandes (base 69–75; preocuparse si baja de 50); revisar
      "lo que experimentan tus usuarios reales"; solo si la primera carga se nota lenta, mínimo 1 instancia en `catalogo-api` (cuesta).
- [ ] **F9 Internacionalización** (antes de abrir otro país, primero decidir cuál; znr#18):
  - Teléfono: `+52` fijo (~44 lugares) y 10 dígitos; es la llave de pedidos, sesiones y push → migrar o guardar con lada.
  - Moneda: `MXN`/`es-MX` fijos (~50 y ~75 lugares) y `currency: "mxn"` en cobros.
  - Pasarelas: MP solo cobra en su país y no opera en USA; actualizar términos y privacidad.
  - Idea: una configuración por ciudad/país (lada, dígitos, moneda, pasarelas) que lean sitio, CONTROL y backend.

## 6. Informe de 22 mejoras (ZNR_roadmap_mejoras.md, revisado 25 nov)
Ya existían: 3 (pedido + chat antes de WhatsApp), 10 (chat por pedido/consulta) y 7 (calificar solo tras entrega).
- [x] **M1 Aviso anti-reembolso** (25 nov): al ver la CLABE (aviso del pedido y chat) y al confirmar una transferencia en el chat.
- [x] **M2 "No compartas tu código"**: códigos por WhatsApp y correo, código de entrega y contraseñas temporales de CONTROL.
- [x] **M4 Rechazo con motivo**: CONTROL elige el motivo (lista fija; "Otro" pide nota); el vendedor lo ve en Rechazados con
      "Corregir y reenviar", que lo regresa a pendientes y avisa al equipo.
- [x] **M16 Tope por vendedor**: en Comunidad máx. 3 por vendedor entre los 15 Plus de arriba y nunca más de 2 seguidos del mismo.
- [x] **M9 Selección múltiple + Apartado** (25 nov): en Mis productos "☑️ Seleccionar varios" → precio (descuento % con el
      anterior tachado, o precio fijo), stock (0 = vendido, "Sin stock") y eliminar, máx. 50 (`actualizarProductosLote`).
      Botón "🔖 Apartar/Liberar" por producto: se ve con la etiqueta "Apartado" y no se puede comprar.
- [x] **M8 Estadísticas por producto** (25 nov): por día en `stats_producto/{id}` (vistas, carrito/pedidos, compartidos; 1 por
      celular al día y no las del vendedor) + piezas entregadas de `ventas_historial`. Panel: línea "👁 · 🛒 · ↗ · ✅ · 7 días"
      en cada producto y icono 📊 con el ranking (gratis 7 días; Plus/Pro 30 días y vistas vs semana anterior).
- [x] **M22 Vendedor en revisión** (25 nov): al registrarse crea su contraseña y entra enseguida con la cuenta en revisión
      (`passwordPropia`): perfil, punto de entrega, seguridad y hasta 10 productos ocultos (`enRevisionVendedor`, no salen en
      Pendientes). Lives, historias, ventas, pagos y planes siguen bloqueados. En CONTROL "Ver sus productos" en la solicitud.
      Al aprobar se manda contraseña temporal por WhatsApp como siempre (confirma que el número es suyo): su contraseña y su
      sesión en revisión dejan de servir, y sus productos se publican cuando entra con la del WhatsApp (`publicarAlEntrar`).
      Registro: máx. 3 por conexión al día, y el número de una solicitud rechazada queda libre (se borra con lo que subió).
- [x] **M11a "Cerca de ti"** (26 nov, colonias paso 1): cada producto lleva el punto de entrega del vendedor redondeado a ~500 m
      (`_geoloc`); en Comunidad "Ordenar por → Más cerca de mí" (pide la ubicación una vez, solo se guarda en el teléfono) y
      "📍 a 1.2 km" en las tarjetas. Sirve en cualquier país. Tras desplegar: CONTROL → "Resincronizar todo Comunidad con
      Algolia"; el catálogo de Comunidad lo toma en ≤1 h. Vendedores sin coordenadas van al final; su panel les muestra "📍 Agrega la ubicación de tu punto de entrega".
- [x] **M11b "Tu zona" por código postal** (26 nov, todos los países): el vendedor pone su código postal en Ajustes → Punto
      de entrega (los productos llevan `vendedor_cp`); el comprador lo escribe al tocar 📍 en Comunidad (se guarda en su
      teléfono). Vista "📍 Tu zona" con encabezado y "📍 De tu zona" en las tarjetas. Nombre de la zona: los vecinos con sesión
      y ese código postal lo proponen; con 2 iguales (sin acentos) avisa al staff y el de esa ciudad lo aprueba o edita en
      CONTROL → Notificaciones → Pendientes ("Nombres de zona propuestos"). Votos necesarios: `VOTOS_NOMBRE_ZONA` en catalogo-api.
- [x] **Paso 3 grupos por zona** (26 nov): fila "📍 Vecinos de tu zona" arriba en Comunidad (si hay menos de 6, se completa con
      los más cercanos); "🔔 Avisarme" en la vista de la zona (compradores.zonaAvisos) y aviso diario `avisarNovedadesZonas`
      (Cloud Scheduler `avisar-zonas`, `minVendedores` 1 para pruebas → **subirlo a 5 al lanzar**); "Entrego en mi zona sin
      costo" en Ajustes del vendedor (sale como "De tu zona · entrega sin costo").
- [x] **Mi zona como sección propia** (26 nov): pestañas en Comunidad "✨ Para ti · 📍 Mi zona · 🔥 Ofertas"; en Para ti, tarjeta
      grande de tu zona (nombre, vecinos, nuevos hoy, "Entrar"); página de la zona `comunidad.html?zona=CP` (enlace corto para
      compartir `zona.html?cp=CP`) con encabezado, números, Avisarme / Proponer nombre / Compartir, "Tus vecinos que venden",
      filtros rápidos (Nuevos, Sin envío, Comida, Servicios) y zonas vecinas; sin código postal, invitación + "Zonas activas en
      tu ciudad". Los nombres aprobados viajan en el catálogo (`snapshot.zonas`) y aprobar uno lo regenera. Íconos SVG (sin emojis) y
      3 diseños de "tu zona" (vecindario crema con casitas, comunidad verde azulado con siluetas, plaza coral con círculo de
      vecinos) que se eligen al azar por sesión (`TEMA_ZONA` en comunidad.js).
- [x] **Colonias** (27 nov, en rama): un código postal puede tener varias colonias y cada una es su propio grupo
      (`comunidad.html?zona=88275.el-jardin`, enlace corto `zona.html?cp=88275&c=el-jardin`). Los vecinos proponen colonias
      (2 votos → el staff de la ciudad la aprueba en CONTROL → Zonas; las que ya había quedan como 1ª colonia). Comprador y
      vendedor eligen la suya (en Mi zona y en Ajustes); lo de quien no elige sale en todas las de su código postal, y con una
      sola colonia todos quedan en ella. En "Zonas vecinas" salen primero las colonias del mismo código postal. El aviso diario
      es por colonia. En CONTROL → Todas las zonas se editan las colonias separadas por comas. **Probar:** proponer 2 colonias
      desde 2 cuentas del mismo CP, aprobarlas, elegir colonia como comprador y como vendedor, y abrir el enlace con `&c=`.
- [x] **Cuántos vecinos te vieron** (27 nov, en rama): la vista de alguien de la zona del vendedor cuenta también como `z`
      en `stats_producto`; en Mis productos la cajita de vistas dice "N vecinos" y hay orden "Más vistos por vecinos".
- [x] **"Busco…" en la zona** (27 nov, en rama): en Mi zona, tarjeta "Vecinos buscan" (3ª del carrusel) y "Busco algo".
      El comprador publica (7 días, máx. 3 al día) y les llega push a los vendedores de su código postal y colonia; ellos
      ven "Lo tengo" (pueden proponer uno de sus productos y un mensaje) y se abre el chat de consulta (el mismo de responder
      historias). Quien la publicó la cierra con "Ya lo encontré"; con 2 reportes se oculta; las vencidas se borran solas
      (`revisarPedidosManual`, cada hora). Colección `busquedas` (solo la usa pedidos-api). **Probar:** publicar desde un
      comprador, ver que llega el aviso al vendedor de esa zona, tocar "Lo tengo" y escribirse en el chat.
- [x] **Ventajas de Plus y Pro en Zonas** (28 nov, en rama): "Vecinos buscan" les llega al momento a Plus/Pro y a los del plan
      gratis al día siguiente si sigue abierta (`avisoGratis` en `busquedas`, lo manda `revisarPedidosManual`; responder antes
      da error y en la página sale "Responder mañana" con invitación a Plus). En la zona (fila "Vecinos de tu zona", página de
      la zona y "Tus vecinos que venden") van primero Plus/Pro, con aro dorado. En Para ti, después de "Tu zona", banner
      "Tienda de tu zona" con una Plus/Pro de tu zona al azar (Pro sale el doble). Están en la tabla de plan-plus.html.
      **Desplegar pedidos-api.** **Probar:** publicar un "Busco…" y ver que solo llega a un Plus; al día siguiente, al gratis.
- [ ] Más adelante (cuando haya volumen): 17–18 (puntaje/renovar), 5 (soporte), 6 (selfie).
      Descartadas por ahora: 15 (canales) y 19–21 (impulsos).

## Limpieza
- [x] **F10 Servicios** (23 nov): tipo de publicación nuevo (shows, técnicos, belleza…): precio fijo / desde / a cotizar,
      a domicilio / en local / en línea, traslado, duración y zona; el cliente agenda fecha, hora y lugar; el vendedor
      confirma o propone otra; agendado → en curso → realizado. Probar: publicar uno, agendarlo desde otra cuenta y llevarlo
      hasta "Realizado". Clases y talleres y Preventa: descartados (25 nov).
- [x] **F10b Comida por encargo y etiqueta Nuevo/Usado** (25 nov, fusionado): tipo de venta "comida" (precio por pieza,
      mínimo opcional, anticipación 0/1/2/3/7 días, "pasa a recoger" y/o a domicilio con envío; mismo flujo que Servicios:
      confirmado → en preparación → entregado) y campo `condicion` (nuevo/usado) obligatorio al publicar con stock o renta,
      chip en tarjetas y filtro "Estado del artículo" en Comunidad. **Después de fusionar:** CONTROL → Herramientas →
      "Resincronizar todo Comunidad con Algolia" (agrega solo la faceta `condicion` al índice y sus réplicas). Probar: publicar tamales, pedirlos desde otra
      cuenta hasta "Entregado"; publicar un artículo usado y filtrarlo.
- [x] **F11 Notificaciones push con mejor aspecto** (25 nov, fusionado): `sw.js` elige el icono PNG 192×192 de
      `img/push/` (general 🔔, pedido 🛒, chat 💬, en vivo 🔴, promoción 🏷️) por `data.tipo` o, si no viene, por el título y la
      página de destino; agrega el emoji al título si no trae uno y el `badge` monocromo (Z) en la barra de estado. Los chats
      siguen con la foto de quien escribe. Sin cambios en znr-backend.
- [x] **F12 Banners de temporada legibles** (25 nov): opción "Recuadro" (panel translúcido con desenfoque detrás del texto) y
      sugerencia automática en CONTROL según el brillo y la variedad de tonos de la zona del texto (se aplica sola al subir una
      imagen nueva; con un banner ya guardado solo funciona si el bucket permite leer la imagen por CORS). Ideas no hechas:
      intensidad de sombra (suave/media/fuerte) y contorno en las letras.
- [x] Rama `vjose6922-blip-patch-1` de znr: ya no existe.
- [x] Cerrados los issues znr#18, znr#61, znr-backend#13, #15 y #37: su contenido ya está aquí.
