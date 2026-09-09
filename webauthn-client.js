// Puente para exponer @simplewebauthn/browser a vendedor-unificado.js
// (script normal, no módulo) — mismo patrón que fcm-init.js/firestore-init.js.
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/+esm';

window.webauthnSupported = browserSupportsWebAuthn;
window.webauthnStartRegistration = (optionsJSON) => startRegistration({ optionsJSON });
window.webauthnStartAuthentication = (optionsJSON) => startAuthentication({ optionsJSON });
