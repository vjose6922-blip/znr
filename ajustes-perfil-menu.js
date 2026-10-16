/**
 * ajustes-perfil-menu.js — Menú de la cabecera de "Ajustes de cuenta" (vendedor.html).
 *
 * Al tocar la fila de identidad (foto + nombre + plan) se abre un menú con:
 *   - Ir a mi perfil  (perfil-vendedor.html?vendedor=UID)         → todos
 *   - Ver foto        (vista ampliada)                            → Plus con foto
 *   - Cambiar foto / Subir foto de perfil                         → Plus
 *   - "Foto de perfil disponible con plan Plus"                   → Free
 *
 * El cambio de foto reutiliza el input #settings-photo-input y su flujo
 * existente (vendedor-unificado.js); aquí solo se dispara.
 */
(function () {
  'use strict';

  let menu = null, visor = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n, size) => (typeof window.Icon === 'function' ? window.Icon(n, { size }) : '');

  function css() {
    if (document.getElementById('zpm-css')) return;
    const st = document.createElement('style');
    st.id = 'zpm-css';
    st.textContent = `
      #settings-identity-row{cursor:pointer;-webkit-tap-highlight-color:transparent}
      .zpm-overlay{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
      .zpm-overlay[hidden]{display:none}
      .zpm-sheet{width:100%;max-width:520px;background:var(--color-surface,#fff);color:var(--color-text-primary,#1a1a2e);border-radius:20px 20px 0 0;padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 18px);box-shadow:0 -10px 40px rgba(0,0,0,.35)}
      .zpm-who{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .zpm-av{position:relative;flex-shrink:0;width:48px;height:48px;border-radius:50%;overflow:hidden;background:#f3e8ff;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem}
      .zpm-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
      .zpm-who b{display:block;font-size:1rem}
      .zpm-who small{opacity:.65;font-size:.78rem}
      .zpm-opt{display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;margin-bottom:8px;border-radius:12px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.07);color:inherit;text-decoration:none;font:600 .92rem inherit;font-family:inherit;text-align:left;cursor:pointer;box-sizing:border-box}
      .zpm-opt small{display:block;font-weight:500;opacity:.65;font-size:.76rem;margin-top:1px}
      .zpm-opt .i{flex-shrink:0;width:34px;height:34px;border-radius:10px;background:rgba(124,58,237,.12);color:#7c3aed;display:flex;align-items:center;justify-content:center}
      .zpm-lock{display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:8px;border-radius:12px;background:rgba(124,58,237,.08);border:1px dashed rgba(124,58,237,.4);font-size:.86rem;font-weight:600;line-height:1.35}
      .zpm-lock .i{flex-shrink:0;width:34px;height:34px;border-radius:10px;background:rgba(124,58,237,.15);color:#7c3aed;display:flex;align-items:center;justify-content:center}
      .zpm-lock small{display:block;font-weight:500;opacity:.7;font-size:.76rem;margin-top:2px}
      .zpm-close{display:block;width:100%;padding:11px;border:none;background:none;color:inherit;opacity:.7;font:700 .88rem inherit;font-family:inherit;cursor:pointer}
      .zpm-visor{position:fixed;inset:0;z-index:10003;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
      .zpm-visor[hidden]{display:none}
      .zpm-visor img{max-width:100%;max-height:100%;border-radius:16px;object-fit:contain}
      .zpm-visor button{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem}
    `;
    document.head.appendChild(st);
  }

  function datos() {
    const s = window.vendorSession;
    if (!s || !s.uid) return null;
    const esPlus = s.plan === 'plus';
    const logo = s.logo || '';
    const tieneFoto = esPlus && (logo.startsWith('http') || logo.startsWith('data:image'));
    return { uid: s.uid, nombre: s.nombre || 'Mi tienda', esPlus, logo, tieneFoto };
  }

  function cerrarMenu() { if (menu) menu.hidden = true; }

  function abrirVisor(url) {
    if (!visor) {
      visor = document.createElement('div');
      visor.className = 'zpm-visor'; visor.hidden = true;
      visor.setAttribute('role', 'dialog'); visor.setAttribute('aria-label', 'Foto de perfil');
      visor.innerHTML = '<img alt="Foto de perfil"><button type="button" aria-label="Cerrar">' + (ico('x', 18) || '✕') + '</button>';
      visor.addEventListener('click', () => { visor.hidden = true; });
      document.body.appendChild(visor);
    }
    visor.querySelector('img').src = url;
    visor.hidden = false;
  }

  function abrirMenu() {
    const d = datos();
    if (!d) return;
    css();
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'zpm-overlay'; menu.hidden = true;
      menu.addEventListener('click', (e) => { if (e.target === menu) cerrarMenu(); });
      document.body.appendChild(menu);
    }
    const inicial = esc(d.nombre.trim().charAt(0).toUpperCase());
    const perfilUrl = 'perfil-vendedor.html?vendedor=' + encodeURIComponent(d.uid);

    const opciones = [`
      <a class="zpm-opt" id="zpm-perfil" href="${esc(perfilUrl)}">
        <span class="i">${ico('vendor', 18)}</span>
        <span>Ir a mi perfil<small>Así te ven tus clientes</small></span>
      </a>`];

    if (d.esPlus) {
      if (d.tieneFoto) opciones.push(`
      <button type="button" class="zpm-opt" id="zpm-ver">
        <span class="i">${ico('eye', 18)}</span>
        <span>Ver foto<small>Tu foto de perfil actual</small></span>
      </button>`);
      opciones.push(`
      <button type="button" class="zpm-opt" id="zpm-cambiar">
        <span class="i">${ico('camera', 18)}</span>
        <span>${d.tieneFoto ? 'Cambiar foto' : 'Subir foto de perfil'}<small>Se actualiza en tu perfil y en tu tienda</small></span>
      </button>`);
    } else {
      opciones.push(`
      <div class="zpm-lock">
        <span class="i">${ico('lock', 18)}</span>
        <span>Foto de perfil disponible con plan Plus<small>Con el plan Free se muestra la inicial de tu negocio.</small></span>
      </div>`);
    }

    menu.innerHTML = `
      <div class="zpm-sheet" role="dialog" aria-modal="true" aria-label="Opciones de perfil">
        <div class="zpm-who">
          <span class="zpm-av">${inicial}${d.tieneFoto ? `<img src="${esc(d.logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
          <span><b>${esc(d.nombre)}</b><small>${d.esPlus ? 'Plan Plus' : 'Plan Free'}</small></span>
        </div>
        ${opciones.join('')}
        <button type="button" class="zpm-close" id="zpm-cerrar">Cerrar</button>
      </div>`;

    menu.querySelector('#zpm-cerrar').addEventListener('click', cerrarMenu);
    const ver = menu.querySelector('#zpm-ver');
    if (ver) ver.addEventListener('click', () => abrirVisor(d.logo));
    const cambiar = menu.querySelector('#zpm-cambiar');
    if (cambiar) cambiar.addEventListener('click', () => {
      const inp = document.getElementById('settings-photo-input');
      if (inp) inp.click();   // directo, dentro del toque; el flujo de subida ya existe
      cerrarMenu();
    });
    menu.hidden = false;
  }

  function init() {
    const fila = document.getElementById('settings-identity-row');
    if (!fila || fila._zpm) return;
    fila._zpm = true;
    // En fase de captura: también cubre el botón de la cámara, que antes abría el selector directo.
    fila.addEventListener('click', (e) => {
      // El <input type=file> vive DENTRO de esta fila: su click programatico (inp.click() de
      // "Cambiar foto") tambien pasa por aqui. Si se cancela, el selector de archivos nunca abre.
      if (e.target && e.target.id === 'settings-photo-input') return;
      e.preventDefault(); e.stopPropagation(); abrirMenu();
    }, true);
    fila.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirMenu(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (visor && !visor.hidden) { visor.hidden = true; e.stopPropagation(); }
      else if (menu && !menu.hidden) { cerrarMenu(); e.stopPropagation(); }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
