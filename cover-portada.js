/**
 * cover-portada.js
 * Módulo compartido para la "portada" personalizable del vendedor
 * (vendedor.html panel de ajustes + perfil-vendedor.html público).
 *
 * Se usa en ambas páginas, así que se carga como <script> normal
 * (sin módulos) antes de vendedor-unificado.js / la lógica de perfil.
 *
 * -----------------------------------------------------------------
 * CÓMO AGREGAR ICONOS (Tabler Icons - https://tabler.io/icons):
 * 1. Abre el icono en tabler.io/icons, copia solo el contenido interno
 *    del <svg> (los <path>/<circle>/etc, viewBox 0 0 24 24).
 * 2. Agrega una entrada nueva en COVER_ICON_LIBRARY, ej:
 *
 *    shirt: {
 *      label: 'Playera',
 *      svg: '<path d="M8 3h8l4 4-3 3-1-1v9a2 2 0 01-2 2h-4..."/>'
 *    },
 *
 * 3. Listo — aparece automáticamente en el picker de íconos y se puede
 *    seleccionar para la portada.
 * -----------------------------------------------------------------
 */

const COVER_ICON_LIBRARY = {
  dragon: {
    label: 'DRAGON',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10.706 8.849l-5.706 -3.301l-2 6.452l3.5 -1.973l.5 2.973l3.555 -1.385" /><path d="M15 9c0 3.5 4 3 4 7c0 3 -3 5 -5.5 5s-6 -.5 -6.5 -5c2 2 6.592 3.043 7.5 1c1.094 -2.461 -4 -3.459 -4 -6.5c0 -2.062 .5 -2.5 1.8 -3.2" /><path d="M18 6a3 3 270 1 0 -3 3h5l1 -3h-3" /><path d="M15 3h-8l5 3" />'
  },
  casa: {
    label: 'CASA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />'
  },
  estrella: {
    label: 'ESTRELLA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" />'
  },
  corazon: {
    label: 'CORAZON',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />'
  },
  rayo: {
    label: 'RAYO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />'
  },
  campana: {
    label: 'CAMPANA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />'
  },
  whatsapp: {
    label: 'WHATSAPP',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />'
  },
  facebook: {
    label: 'FACEBOOK',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" />'
  },
  chispas: {
    label: 'CHISPAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />'
  },
  carrito_de_compras: {
    label: 'CARRITO DE COMPRAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17h-11v-14h-2" /><path d="M6 5l14 1l-1 7h-13" />'
  },
  check: {
    label: 'CHECK',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1" /><path d="M9 12l2 2l4 -4" />'
  },
  libro: {
    label: 'LIBRO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" />'
  },
  avion_de_papel: {
    label: 'AVION DE PAPEL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 14l11 -11" /><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />'
  },
  chispas_2: {
    label: 'CHISPAS 2',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 7a9.3 9.3 0 0 0 1.516 -.546c.911 -.438 1.494 -1.015 1.937 -1.932c.207 -.428 .382 -.928 .547 -1.522c.165 .595 .34 1.095 .547 1.521c.443 .918 1.026 1.495 1.937 1.933c.426 .205 .925 .38 1.516 .546a9.3 9.3 0 0 0 -1.516 .547c-.911 .438 -1.494 1.015 -1.937 1.932a9 9 0 0 0 -.547 1.521c-.165 -.594 -.34 -1.095 -.547 -1.521c-.443 -.918 -1.026 -1.494 -1.937 -1.932a9 9 0 0 0 -1.516 -.547" /><path d="M3 14a21 21 0 0 0 1.652 -.532c2.542 -.953 3.853 -2.238 4.816 -4.806a20 20 0 0 0 .532 -1.662a20 20 0 0 0 .532 1.662c.963 2.567 2.275 3.853 4.816 4.806q .75 .28 1.652 .532a21 21 0 0 0 -1.652 .532c-2.542 .953 -3.854 2.238 -4.816 4.806a20 20 0 0 0 -.532 1.662a20 20 0 0 0 -.532 -1.662c-.963 -2.568 -2.275 -3.853 -4.816 -4.806a21 21 0 0 0 -1.652 -.532" />'
  },
  foco: {
    label: 'FOCO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" />'
  },
  paleta_de_color: {
    label: 'PALETA DE COLOR',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" /><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />'
  },
  corazon_comunidad: {
    label: 'CORAZON COMUNIDAD',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" /><path d="M12 6l-3.293 3.293a1 1 0 0 0 0 1.414l.543 .543c.69 .69 1.81 .69 2.5 0l1 -1a3.182 3.182 0 0 1 4.5 0l2.25 2.25" /><path d="M12.5 15.5l2 2" /><path d="M15 13l2 2" />'
  },
  celular: {
    label: 'CELULAR',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14" /><path d="M11 4h2" /><path d="M12 17v.01" />'
  },
  tienda: {
    label: 'TIENDA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 21l18 0" /><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4" /><path d="M5 21l0 -10.15" /><path d="M19 21l0 -10.15" /><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" />'
  },
  flama: {
    label: 'FLAMA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235" />'
  },
  sol: {
    label: 'SOL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />'
  },
  luna: {
    label: 'LUNA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" />'
  },
  carro: {
    label: 'CARRO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5" />'
  },
  camara: {
    label: 'CAMARA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />'
  },
  herramienta: {
    label: 'HERRAMIENTA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" />'
  },
  bolsa_de_compras: {
    label: 'BOLSA DE COMPRAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304" /><path d="M9 11v-5a3 3 0 0 1 6 0v5" />'
  },
  camion_de_entregas: {
    label: 'CAMION DE ENTREGAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" /><path d="M3 9l4 0" />'
  },
  cohete: {
    label: 'COHETE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" /><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" /><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />'
  },
  apple: {
    label: 'APPLE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8.286 7.008c-3.216 0 -4.286 3.23 -4.286 5.92c0 3.229 2.143 8.072 4.286 8.072c1.165 -.05 1.799 -.538 3.214 -.538c1.406 0 1.607 .538 3.214 .538s4.286 -3.229 4.286 -5.381c-.03 -.011 -2.649 -.434 -2.679 -3.23c-.02 -2.335 2.589 -3.179 2.679 -3.228c-1.096 -1.606 -3.162 -2.113 -3.75 -2.153c-1.535 -.12 -3.032 1.077 -3.75 1.077c-.729 0 -2.036 -1.077 -3.214 -1.077" /><path d="M12 4a2 2 0 0 0 2 -2a2 2 0 0 0 -2 2" />'
  },
  regalo: {
    label: 'REGALO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 9a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2" /><path d="M12 8l0 13" /><path d="M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5" />'
  },
  estrella_2: {
    label: 'ESTRELLA 2',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M14.504 8.522l-1.758 -4.032a.814 .814 0 0 0 -1.492 0l-1.759 4.032c-.19 .436 -.537 .784 -.973 .973l-4.032 1.759a.814 .814 0 0 0 0 1.492l4.033 1.758c.436 .19 .784 .538 .973 .974l1.759 4.033a.814 .814 0 0 0 1.492 0l1.758 -4.033c.19 -.436 .538 -.784 .974 -.974l4.033 -1.758a.814 .814 0 0 0 0 -1.492l-4.033 -1.759a1.88 1.88 0 0 1 -.974 -.973" /><path d="M3 3l2 2" /><path d="M21 3l-2 2" /><path d="M3 21l2 -2" /><path d="M21 21l-2 -2" />'
  },
  corona: {
    label: 'CORONA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4l4 -6" />'
  },
  diamante: {
    label: 'DIAMANTE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 5h12l3 5l-8.5 9.5a.7 .7 0 0 1 -1 0l-8.5 -9.5l3 -5" /><path d="M10 12l-2 -2.2l.6 -1" />'
  },
  gota: {
    label: 'GOTA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546" />'
  },
  planta: {
    label: 'PLANTA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 10a6 6 0 0 0 -6 -6h-3v2a6 6 0 0 0 6 6h3" /><path d="M12 14a6 6 0 0 1 6 -6h3v1a6 6 0 0 1 -6 6h-3" /><path d="M12 20l0 -10" />'
  },
  cubiertos: {
    label: 'CUBIERTOS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />'
  },
  videojuegos: {
    label: 'VIDEOJUEGOS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4" /><path d="M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232" /><path d="M8 9v2" /><path d="M7 10h2" /><path d="M14 10h2" />'
  },
  rompecabezas: {
    label: 'ROMPECABEZAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1" />'
  },
  cerdito: {
    label: 'CERDITO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 11v.01" /><path d="M5.173 8.378a3 3 0 1 1 4.656 -1.377" /><path d="M16 4v3.803a6.019 6.019 0 0 1 2.658 3.197h1.341a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1.342c-.336 .95 -.907 1.8 -1.658 2.473v2.027a1.5 1.5 0 0 1 -3 0v-.583a6.04 6.04 0 0 1 -1 .083h-4a6.04 6.04 0 0 1 -1 -.083v.583a1.5 1.5 0 0 1 -3 0v-2l0 -.027a6 6 0 0 1 4 -10.473h2.5l4.5 -3" />'
  },
  estrella_3: {
    label: 'ESTRELLA 3',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M17.286 21.09q -1.69 .001 -5.288 -2.615q -3.596 2.617 -5.288 2.616q -2.726 0 -.495 -6.8q -9.389 -6.775 2.135 -6.775h.076q 1.785 -5.516 3.574 -5.516q 1.785 0 3.574 5.516h.076q 11.525 0 2.133 6.774q 2.23 6.802 -.497 6.8" />'
  },
  cafe: {
    label: 'CAFE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1" /><path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5" /><path d="M16.746 16.726a3 3 0 1 0 .252 -5.555" />'
  },
  chef: {
    label: 'CHEF',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 3c1.918 0 3.52 1.35 3.91 3.151a4 4 0 0 1 2.09 7.723l0 7.126h-12v-7.126a4 4 0 1 1 2.092 -7.723a4 4 0 0 1 3.908 -3.151" /><path d="M6.161 17.009l11.839 -.009" />'
  },
  ropa: {
    label: 'ROPA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0" />'
  },
  nieve: {
    label: 'NIEVE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 4l2 1l2 -1" /><path d="M12 2v6.5l3 1.72" /><path d="M17.928 6.268l.134 2.232l1.866 1.232" /><path d="M20.66 7l-5.629 3.25l.01 3.458" /><path d="M19.928 14.268l-1.866 1.232l-.134 2.232" /><path d="M20.66 17l-5.629 -3.25l-2.99 1.738" /><path d="M14 20l-2 -1l-2 1" /><path d="M12 22v-6.5l-3 -1.72" /><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232" /><path d="M3.34 17l5.629 -3.25l-.01 -3.458" /><path d="M4.072 9.732l1.866 -1.232l.134 -2.232" /><path d="M3.34 7l5.629 3.25l2.99 -1.738" />'
  },
  balon: {
    label: 'BALON',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45" /><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45" />'
  },
  gotas: {
    label: 'GOTAS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4.072 20.3a2.999 2.999 0 0 0 3.856 0a3.002 3.002 0 0 0 .67 -3.798l-2.095 -3.227a.6 .6 0 0 0 -1.005 0l-2.098 3.227a3.003 3.003 0 0 0 .671 3.798" /><path d="M16.072 20.3a2.999 2.999 0 0 0 3.856 0a3.002 3.002 0 0 0 .67 -3.798l-2.095 -3.227a.6 .6 0 0 0 -1.005 0l-2.098 3.227a3.003 3.003 0 0 0 .671 3.798" /><path d="M10.072 10.3a2.999 2.999 0 0 0 3.856 0a3.002 3.002 0 0 0 .67 -3.798l-2.095 -3.227a.6 .6 0 0 0 -1.005 0l-2.098 3.227a3.003 3.003 0 0 0 .671 3.798l.001 0" />'
  },
  pastel: {
    label: 'PASTEL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 20h18v-8a3 3 0 0 0 -3 -3h-12a3 3 0 0 0 -3 3v8" /><path d="M3 14.803c.312 .135 .654 .204 1 .197a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1c.35 .007 .692 -.062 1 -.197" /><path d="M12 4l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737" />'
  },
  motocicleta: {
    label: 'MOTOCICLETA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M2 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M16 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M7.5 14h5l4 -4h-10.5m1.5 4l4 -4" /><path d="M13 6h2l1.5 3l2 4" />'
  },
  tazon_de_sopa: {
    label: 'TAZON DE SOPA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1" /><path d="M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" />'
  },
  diente: {
    label: 'DIENTE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5.5c-1.074 -.586 -2.583 -1.5 -4 -1.5c-2.1 0 -4 1.247 -4 5c0 4.899 1.056 8.41 2.671 10.537c.573 .756 1.97 .521 2.567 -.236c.398 -.505 .819 -1.439 1.262 -2.801c.292 -.771 .892 -1.504 1.5 -1.5c.602 0 1.21 .737 1.5 1.5c.443 1.362 .864 2.295 1.262 2.8c.597 .759 2 .993 2.567 .237c1.615 -2.127 2.671 -5.637 2.671 -10.537c0 -3.74 -1.908 -5 -4 -5c-1.423 0 -2.92 .911 -4 1.5" /><path d="M12 5.5l3 1.5" />'
  },
  botella: {
    label: 'BOTELLA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 5h4v-2a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2" /><path d="M14 3.5c0 1.626 .507 3.212 1.45 4.537l.05 .07a8.093 8.093 0 0 1 1.5 4.694v6.199a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-6.2c0 -1.682 .524 -3.322 1.5 -4.693l.05 -.07a7.823 7.823 0 0 0 1.45 -4.537" /><path d="M7 14.803a2.4 2.4 0 0 0 1 -.803a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 1 -.805" />'
  },
  kit_medico: {
    label: 'KIT MEDICO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 8v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" /><path d="M4 10a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -8" /><path d="M10 14h4" /><path d="M12 12v4" />'
  },
  motor: {
    label: 'MOTOR',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 10v6" /><path d="M12 5v3" /><path d="M10 5h4" /><path d="M5 13h-2" /><path d="M6 10h2l2 -2h3.382a1 1 0 0 1 .894 .553l1.448 2.894a1 1 0 0 0 .894 .553h1.382v-2h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2v-2h-3v2a1 1 0 0 1 -1 1h-3.465a1 1 0 0 1 -.832 -.445l-1.703 -2.555h-2v-6" />'
  },
  sillon: {
    label: 'SILLON',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 11a2 2 0 0 1 2 2v2h10v-2a2 2 0 1 1 4 0v4a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2" /><path d="M5 11v-5a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v5" /><path d="M6 19v2" /><path d="M18 19v2" />'
  },
  gato: {
    label: 'GATO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M20 3v10a8 8 0 1 1 -16 0v-10l3.432 3.432a7.963 7.963 0 0 1 4.568 -1.432c1.769 0 3.403 .574 4.728 1.546l3.272 -3.546" /><path d="M2 16h5l-4 4" /><path d="M22 16h-5l4 4" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 11v.01" /><path d="M15 11v.01" />'
  },
  microfono: {
    label: 'MICROFONO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 12.9a5 5 0 1 0 -3.902 -3.9" /><path d="M15 12.9l-3.902 -3.899l-7.513 8.584a2 2 0 1 0 2.827 2.83l8.588 -7.515" />'
  },
  tarjeta: {
    label: 'TARJETA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M2 4h9.914a3 3 0 0 1 1.92 .695l5.166 4.305" /><path d="M11.15 9h8.85a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-13a2 2 0 0 1 -2 -2v-8.7" /><path d="M3 8l7.2 4.7a1.803 1.803 0 0 0 2 -3l-4.2 -2.7" /><path d="M5 16h17" />'
  },
  ensalada: {
    label: 'ENSALADA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1" /><path d="M18.5 11c.351 -1.017 .426 -2.236 .5 -3.714v-1.286h-2.256c-2.83 0 -4.616 .804 -5.64 2.076" /><path d="M5.255 11.008a12.204 12.204 0 0 1 -.255 -2.008v-1h1.755c.98 0 1.801 .124 2.479 .35" /><path d="M8 8l1 -4l4 2.5" /><path d="M13 11v-.5a2.5 2.5 0 1 0 -5 0v.5" />'
  },
  perro: {
    label: 'PERRO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M11 5h2" /><path d="M19 12c-.667 5.333 -2.333 8 -5 8h-4c-2.667 0 -4.333 -2.667 -5 -8" /><path d="M11 16c0 .667 .333 1 1 1s1 -.333 1 -1h-2" /><path d="M12 18v2" /><path d="M10 11v.01" /><path d="M14 11v.01" /><path d="M5 4l6 .97l-6.238 6.688a1.021 1.021 0 0 1 -1.41 .111a.953 .953 0 0 1 -.327 -.954l1.975 -6.815" /><path d="M19 4l-6 .97l6.238 6.688c.358 .408 .989 .458 1.41 .111a.953 .953 0 0 0 .327 -.954l-1.975 -6.815" />'
  },
  arbol: {
    label: 'ARBOL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 13l-2 -2" /><path d="M12 12l2 -2" /><path d="M12 21v-13" /><path d="M9.824 16a3 3 0 0 1 -2.743 -3.69a3 3 0 0 1 .304 -4.833a3 3 0 0 1 4.615 -3.707a3 3 0 0 1 4.614 3.707a3 3 0 0 1 .305 4.833a3 3 0 0 1 -2.919 3.695h-4l-.176 -.005" />'
  },
  taza: {
    label: 'TAZA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4.083 5h10.834a1.08 1.08 0 0 1 1.083 1.077v8.615c0 2.38 -1.94 4.308 -4.333 4.308h-4.334c-2.393 0 -4.333 -1.929 -4.333 -4.308v-8.615a1.08 1.08 0 0 1 1.083 -1.077" /><path d="M16 8h2.5c1.38 0 2.5 1.045 2.5 2.333v2.334c0 1.288 -1.12 2.333 -2.5 2.333h-2.5" />'
  },
  pino: {
    label: 'PINO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 3l4 4l-2 1l4 4l-3 1l4 4h-14l4 -4l-3 -1l4 -4l-2 -1l4 -4" /><path d="M14 17v3a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-3" />'
  },
  computadora: {
    label: 'COMPUTADORA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 5h6v14h-6l0 -14" /><path d="M12 9h10v7h-10l0 -7" /><path d="M14 19h6" /><path d="M17 16v3" /><path d="M6 13v.01" /><path d="M6 16v.01" />'
  },
  carne: {
    label: 'CARNE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821" /><path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071" /><path d="M7.5 16l1 1" /><path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121" />'
  },
  copa: {
    label: 'COPA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 21l8 0" /><path d="M12 15l0 6" /><path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10" /><path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0" />'
  },
  vivienda: {
    label: 'VIVIENDA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M19 10l-7 -7l-9 9h2v7a2 2 0 0 0 2 2h6" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2c.387 0 .748 .11 1.054 .3" /><path d="M21 15h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5" /><path d="M19 21v1m0 -8v1" />'
  },
  corbata: {
    label: 'CORBATA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 22l4 -4l-2.5 -11l.993 -2.649a1 1 0 0 0 -.936 -1.351h-3.114a1 1 0 0 0 -.936 1.351l.993 2.649l-2.5 11l4 4" /><path d="M10.5 7h3l5 5.5" />'
  },
  cancha_de_futbol: {
    label: 'CANCHA DE FUTBOL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 9h3v6h-3l0 -6" /><path d="M18 9h3v6h-3l0 -6" /><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" /><path d="M12 5l0 14" />'
  },
  tenis: {
    label: 'TENIS',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 6h5.426a1 1 0 0 1 .863 .496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114a4 4 0 0 1 3.074 3.89v2.27a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1" /><path d="M14 13l1 -2" /><path d="M8 18v-1a4 4 0 0 0 -4 -4h-1" /><path d="M10 12l1.5 -3" />'
  },
  mariposa: {
    label: 'MARIPOSA',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856" />'
  },
  sillon_doble: {
    label: 'SILLON DOBLE',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 11a2 2 0 0 1 2 2v1h12v-1a2 2 0 1 1 4 0v5a1 1 0 0 1 -1 1h-18a1 1 0 0 1 -1 -1v-5a2 2 0 0 1 2 -2" /><path d="M4 11v-3a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v3" /><path d="M12 5v9" />'
  },
  jugando_futbol: {
    label: 'JUGANDO FUTBOL',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 17l5 1l.75 -1.5" /><path d="M14 21v-4l-4 -3l1 -6" /><path d="M6 12v-3l5 -1l3 3l3 1" /><path d="M18.007 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0" /><path d="M10.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />'
  },
  globo: {
    label: 'GLOBO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M14 8a2 2 0 0 0 -2 -2" /><path d="M6 8a6 6 0 1 1 12 0c0 4.97 -2.686 9 -6 9s-6 -4.03 -6 -9" /><path d="M12 17v1a2 2 0 0 1 -2 2h-3a2 2 0 0 0 -2 2" />'
  },
  lentes: {
    label: 'LENTES',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 4h-2l-3 10" /><path d="M16 4h2l3 10" /><path d="M10 16h4" /><path d="M21 16.5a3.5 3.5 0 0 1 -7 0v-2.5h7v2.5" /><path d="M10 16.5a3.5 3.5 0 0 1 -7 0v-2.5h7v2.5" /><path d="M4 14l4.5 4.5" /><path d="M15 14l4.5 4.5" />'
  },
  lentes_2: {
    label: 'LENTES 2',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 4h-2l-3 10v2.5" /><path d="M16 4h2l3 10v2.5" /><path d="M10 16l4 0" /><path d="M14 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" /><path d="M3 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" />'
  },
  calcetin: {
    label: 'CALCETIN',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 3v6l4.798 5.142a4 4 0 0 1 -5.441 5.86l-6.736 -6.41a2 2 0 0 1 -.621 -1.451v-9.141h8" /><path d="M7.895 15.768c.708 -.721 1.105 -1.677 1.105 -2.768a4 4 0 0 0 -4 -4" />'
  },
  batido: {
    label: 'BATIDO',
    svg: '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M17 10a5 5 0 0 0 -10 0" /><path d="M6 11a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1l0 -1" /><path d="M7 13l1.81 7.243a1 1 0 0 0 .97 .757h4.44a1 1 0 0 0 .97 -.757l1.81 -7.243" /><path d="M12 5v-2" />'
  }
};

/** Aclara/oscurece un color hex un % dado (negativo = oscurecer). */
function hexShade(hex, percent) {
  hex = (hex || '#7c3aed').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16) || 0;
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const amt = Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/**
 * Construye un tile SVG (mosaico) con los iconos elegidos, en un patrón
 * tipo "wallpaper" con filas alternadas (mismo estilo que hero-patterns).
 * Devuelve { svg, tileW, tileH } o null si no hay iconos válidos.
 */
function buildCoverPatternSvg(iconIds, iconColor) {
  const CELL = 68;
  const ids = (iconIds || []).filter(id => COVER_ICON_LIBRARY[id]).slice(0, 6);
  if (!ids.length) return null;

  const tileW = CELL * ids.length;
  const tileH = CELL * 2;

  let defs = '';
  ids.forEach(id => {
    defs += `<symbol id="cov-${id}" viewBox="0 0 24 24">${COVER_ICON_LIBRARY[id].svg}</symbol>`;
  });

  let uses = '';
  ids.forEach((id, i) => {
    // Fila 1
    const x1 = i * CELL + CELL / 2;
    uses += `<use href="#cov-${id}" x="${x1 - 14}" y="${CELL / 2 - 14}" width="28" height="28" transform="rotate(${i % 2 ? -8 : 8} ${x1} ${CELL / 2})"/>`;
    // Fila 2, offset medio-cell para efecto "ladrillo"
    const idB = ids[(i + Math.ceil(ids.length / 2)) % ids.length];
    const x2 = i * CELL + CELL;
    uses += `<use href="#cov-${idB}" x="${x2 - 14}" y="${CELL * 1.5 - 14}" width="28" height="28" transform="rotate(${i % 2 ? 8 : -8} ${x2} ${CELL * 1.5})"/>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}">`
    + `<defs>${defs}</defs>`
    + `<g fill="none" stroke="${iconColor || '#ffffff'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">${uses}</g>`
    + `</svg>`;

  return { svg, tileW, tileH };
}

/** Calcula los estilos CSS (background-image/repeat/size) para la portada. */
function coverBackgroundStyles(bgColor, iconIds, iconColor) {
  const base = bgColor || '#7c3aed';
  const dark = hexShade(base, -14);
  let backgroundImage = `linear-gradient(135deg, ${base}, ${dark})`;
  let backgroundRepeat = 'no-repeat';
  let backgroundSize = 'cover';

  const pattern = buildCoverPatternSvg(iconIds, iconColor);
  if (pattern) {
    const encoded = encodeURIComponent(pattern.svg).replace(/'/g, '%27').replace(/"/g, '%22');
    backgroundImage = `url("data:image/svg+xml,${encoded}"), linear-gradient(135deg, ${base}, ${dark})`;
    backgroundRepeat = 'repeat, no-repeat';
    backgroundSize = `${pattern.tileW}px ${pattern.tileH}px, cover`;
  }
  return { backgroundImage, backgroundRepeat, backgroundSize, backgroundColor: base };
}

/** Aplica la portada a un elemento del DOM. */
function applyCoverBackground(el, bgColor, iconIds, iconColor) {
  if (!el) return;
  const s = coverBackgroundStyles(bgColor, iconIds, iconColor);
  el.style.backgroundImage = s.backgroundImage;
  el.style.backgroundRepeat = s.backgroundRepeat;
  el.style.backgroundSize = s.backgroundSize;
  el.style.backgroundColor = s.backgroundColor;
}

/** Parsea el campo cover_icons guardado en Sheets (JSON string) a array. */
function parseCoverIcons(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/** Dibuja el grid de checkboxes para elegir iconos (usado en vendedor.html). */
function renderCoverIconPicker(containerEl, selectedIds, onChange) {
  if (!containerEl) return;
  const selected = new Set(selectedIds || []);
  containerEl.innerHTML = Object.entries(COVER_ICON_LIBRARY).map(([id, def]) => `
    <label data-icon-id="${id}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:2px solid ${selected.has(id) ? '#7c3aed' : '#e5e7eb'};border-radius:10px;cursor:pointer;background:${selected.has(id) ? '#f5f3ff' : '#fff'};">
      <input type="checkbox" data-cover-icon-checkbox value="${id}" ${selected.has(id) ? 'checked' : ''} style="display:none;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${def.svg}</svg>
      <span style="font-size:.65rem;color:#555;text-align:center;">${def.label}</span>
    </label>
  `).join('');

  containerEl.querySelectorAll('label[data-icon-id]').forEach(label => {
    label.addEventListener('click', (e) => {
      e.preventDefault();
      const id = label.dataset.iconId;
      const checkbox = label.querySelector('input');
      const currentlySelected = containerEl.querySelectorAll('input[data-cover-icon-checkbox]:checked').length;

      if (!checkbox.checked && currentlySelected >= 6) {
        return; // límite de 6 iconos
      }
      checkbox.checked = !checkbox.checked;
      label.style.borderColor = checkbox.checked ? '#7c3aed' : '#e5e7eb';
      label.style.background  = checkbox.checked ? '#f5f3ff' : '#fff';
      if (typeof onChange === 'function') {
        const ids = Array.from(containerEl.querySelectorAll('input[data-cover-icon-checkbox]:checked')).map(cb => cb.value);
        onChange(ids);
      }
    });
  });
}
