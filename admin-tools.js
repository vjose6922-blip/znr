
async function openDonacionesStatsModal() {
  const old = document.getElementById('modal-donaciones-stats');
  if (old) old.remove();
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = window.API_URL || '';
  const beneficiariosApi = "https://beneficiarios-api-1038143238323.us-central1.run.app";
  const vendedoresApi = "https://vendedores-api-1038143238323.us-central1.run.app";
  const catalogoApi = "https://catalogo-api-1038143238323.us-central1.run.app";

  const modal = document.createElement('div');
  modal.id = 'modal-donaciones-stats';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `<div style="background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;padding:0 0 32px;color:#fff;">
    <div style="position:sticky;top:0;background:#1a1a2e;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;">
      <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('heart-fill')} Estadísticas de Donaciones</h2>
      <button id="btn-close-don-stats" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">×</button>
    </div>
    <div id="don-stats-body" style="padding:20px;">Cargando…</div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-don-stats').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  try {
    // Cargar vendedores, productos comunidad, beneficiarios y el historial de donaciones
    const [vRes, prodRes, benRes, donRes] = await Promise.all([
      fetch(vendedoresApi + '?' + new URLSearchParams({ action:'vendedoresAdmin', token })).then(r=>r.json()).catch(()=>({})),
      fetch(catalogoApi + '?' + new URLSearchParams({ action:'listarTodoComunidad', token })).then(r=>r.json()).catch(()=>({})),
      fetch(beneficiariosApi + '?' + new URLSearchParams({ action:'obtenerBeneficiarios', token })).then(r=>r.json()).catch(()=>({})),
      fetch(beneficiariosApi + '?' + new URLSearchParams({ action:'obtenerDonaciones', token })).then(r=>r.json()).catch(()=>({})),
    ]);
    const vendors    = vRes.vendors || [];
    const products   = prodRes.products || [];
    const bens       = benRes.beneficiarios || [];
    const donaciones = donRes.donaciones || [];

    const donados   = products.filter(p => p.donado === true || p.donado === 'TRUE' || p.donado === 'true');
    const sinAsig   = products.filter(p => !p.donado || p.donado === 'FALSE' || p.donado === false);
    const bensAprov = bens.filter(b => b.estado === 'aprobado');
    const bensPend  = bens.filter(b => b.estado === 'pendiente');

    const valorTotal = donados.reduce((s, p) => s + (Number(p.precio) || 0), 0);
    const vendedoresDonadores = new Set(donados.map(p => p.vendedor_uid).filter(Boolean));

    const productMap    = {}; products.forEach(p => { productMap[String(p.id)] = p; });
    const vendorNameMap = {}; vendors.forEach(v => { vendorNameMap[v.uid] = v.nombre; });
    const benMap         = {}; bens.forEach(b => { benMap[b.id] = b; });

    // Donaciones agrupadas por beneficiario: cantidad, valor total y vendedores que donaron
    const byBen = {};
    donados.forEach(p => {
      const bid = p.beneficiario_id || '__sin__';
      if (!byBen[bid]) byBen[bid] = { count: 0, valor: 0, vendedores: new Set() };
      byBen[bid].count++;
      byBen[bid].valor += Number(p.precio) || 0;
      if (p.vendedor_nombre) byBen[bid].vendedores.add(p.vendedor_nombre);
    });

    // Ranking de vendedores que más han donado
    const byVendor = {};
    donados.forEach(p => {
      const uid = p.vendedor_uid || '__sin__';
      if (!byVendor[uid]) byVendor[uid] = { nombre: p.vendedor_nombre || vendorNameMap[uid] || 'Vendedor', count: 0, valor: 0 };
      byVendor[uid].count++;
      byVendor[uid].valor += Number(p.precio) || 0;
    });
    const topVendedores = Object.values(byVendor).sort((a, b) => b.count - a.count).slice(0, 5);

    // Donaciones más recientes (historial activo, ordenado por fecha de asignación)
    const recientes = donaciones
      .filter(d => d.estado === 'activo' && d.fecha_asignacion)
      .sort((a, b) => new Date(b.fecha_asignacion) - new Date(a.fecha_asignacion))
      .slice(0, 6);

    const esc      = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtMoney = v => '$' + Number(v||0).toLocaleString('es-MX');
    const fmtFecha = d => { try { return new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }); } catch(_) { return ''; } };

    document.getElementById('don-stats-body').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div style="background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.3);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#f97316;">${donados.length}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Productos donados</div>
        </div>
        <div style="background:rgba(244,114,182,.12);border:1px solid rgba(244,114,182,.28);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.4rem;font-weight:900;color:#f472b6;">${fmtMoney(valorTotal)}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Valor total donado</div>
        </div>
        <div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#22c55e;">${bensAprov.length}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Beneficiarios activos</div>
        </div>
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#ef4444;">${bensPend.length}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Beneficiarios pendientes</div>
        </div>
        <div style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#818cf8;">${sinAsig.length}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Productos sin asignar</div>
        </div>
        <div style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.22);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#38bdf8;">${vendedoresDonadores.size}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Vendedores donadores</div>
        </div>
      </div>

      ${Object.keys(byBen).length > 0 ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Donaciones por beneficiario</p>
      ${Object.entries(byBen).sort((a,b)=>b[1].count-a[1].count).map(([bid, info]) => {
        const ben = benMap[bid];
        const label = ben ? (ben.nombre + (ben.organizacion ? ' — ' + ben.organizacion : '')) : 'Sin asignar';
        const vendsLabel = [...info.vendedores].slice(0, 3).join(', ') + (info.vendedores.size > 3 ? '…' : '');
        return `
        <div style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:.85rem;font-weight:600;">${Icon('heart-fill')} ${esc(label)}</span>
            <span style="background:#f97316;color:#fff;border-radius:20px;padding:2px 10px;font-size:.78rem;font-weight:700;">${info.count}</span>
          </div>
          <div style="font-size:.72rem;color:#aaa;margin-top:4px;">${fmtMoney(info.valor)} · donado por ${esc(vendsLabel || '—')}</div>
        </div>`;
      }).join('')}` : '<p style="color:#aaa;text-align:center;padding:16px 0;">Aún no hay donaciones asignadas.</p>'}

      ${topVendedores.length > 0 ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px;">Top vendedores donadores</p>
      ${topVendedores.map((v, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="font-size:.82rem;">${['🥇','🥈','🥉'][i] || '•'} ${esc(v.nombre)}</span>
          <span style="font-size:.75rem;color:#aaa;">${v.count} prod · ${fmtMoney(v.valor)}</span>
        </div>`).join('')}` : ''}

      ${recientes.length > 0 ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px;">Donaciones recientes</p>
      ${recientes.map(d => {
        const prod    = productMap[String(d.producto_id)] || {};
        const ben     = benMap[d.beneficiario_id] || {};
        const vNombre = prod.vendedor_nombre || vendorNameMap[d.vendedor_uid] || 'Vendedor';
        return `
        <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.78rem;color:#ccc;">
          <strong style="color:#fff;">${esc(prod.nombre || 'Producto')}</strong><br>
          ${esc(vNombre)} ${Icon('arrow-right',{size:12})} ${esc(ben.nombre || 'beneficiario')} · <span style="color:#888;">${fmtFecha(d.fecha_asignacion)}</span>
        </div>`;
      }).join('')}` : ''}
    `;
  } catch(e) {
    document.getElementById('don-stats-body').innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar estadísticas.</p>';
  }
}

// ── Gráficas y Estadísticas (ZNR + Comunidad) ──────────────────────────────
async function openAnalyticsModal(period, source) {
  period = period || 'day';
  source = source || 'znr';
  const old = document.getElementById('modal-analytics');
  if (old) old.remove();
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = window.API_URL || '';
  const periodLabels = { day:'Hoy', week:'Semana', month:'Mes', all:'Todo' };
  const sourceLabels = { znr:'Catálogo ZNR', comunidad:'Comunidad' };

  const modal = document.createElement('div');
  modal.id = 'modal-analytics';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `<div style="background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;padding:0 0 32px;color:#fff;">
    <div style="position:sticky;top:0;background:#1a1a2e;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:2;">
      <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('stats')} Gráficas y Estadísticas</h2>
      <button id="btn-close-analytics" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">×</button>
    </div>
    <div style="padding:14px 20px 0;display:flex;gap:6px;">
      ${['znr','comunidad'].map(s => `<button class="an-source-btn" data-source="${s}" style="flex:1;padding:8px 0;border-radius:30px;border:1px solid ${s===source ? 'transparent' : 'rgba(255,255,255,.12)'};background:${s===source ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(255,255,255,.05)'};color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;">${sourceLabels[s]}</button>`).join('')}
    </div>
    <div style="padding:10px 20px 0;display:flex;gap:6px;">
      ${['day','week','month','all'].map(p => `<button class="an-period-btn" data-period="${p}" style="flex:1;padding:8px 0;border-radius:30px;border:1px solid ${p===period ? 'transparent' : 'rgba(255,255,255,.12)'};background:${p===period ? 'linear-gradient(135deg,#ff4f81,#ff7a4f)' : 'rgba(255,255,255,.05)'};color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;">${periodLabels[p]}</button>`).join('')}
    </div>
    <div id="an-body" style="padding:18px 20px;">Cargando…</div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-analytics').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelectorAll('.an-period-btn').forEach(btn => {
    btn.addEventListener('click', () => openAnalyticsModal(btn.dataset.period, source));
  });
  modal.querySelectorAll('.an-source-btn').forEach(btn => {
    btn.addEventListener('click', () => openAnalyticsModal(period, btn.dataset.source));
  });

  const bodyEl = document.getElementById('an-body');
  try {
    if (!token) throw new Error('Sin sesión de admin');
    const action = source === 'comunidad' ? 'getAnalyticsComunidad' : 'getAnalytics';
    const apiUrl = source === 'comunidad' ? "https://ventas-api-1038143238323.us-central1.run.app" : "https://tienda-znr-api-1038143238323.us-central1.run.app";
    const res = await fetch(apiUrl + '?' + new URLSearchParams({ action, token, period })).then(r=>r.json());
    if (!res.ok) throw new Error(res.error || 'Error del servidor');

    const esc      = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtMoney = v => '$' + Number(v||0).toLocaleString('es-MX');
    const byDay    = res.requestsByDay  || [];
    const topProds = res.topProducts    || [];
    const topVends = res.topVendors     || [];
    const vendorStatus = res.vendorStatusSummary || [];
    const recent   = res.recentActivity || [];
    const maxDay   = Math.max(1, ...byDay.map(d => d.count));
    const maxProd  = Math.max(1, ...topProds.map(p => p.count));

    // Vocabulario de estados distinto entre ZNR (confirmed/rejected/cancelled)
    // y Comunidad (entregado/confirmada/pendiente/sin_stock/cancelada_por_baja).
    const STATUS_VISUAL = {
      confirmed:          { color:'#22c55e', label:'Confirmado' },
      entregado:          { color:'#22c55e', label:'Entregado' },
      confirmada:         { color:'#38bdf8', label:'Confirmada' },
      rejected:           { color:'#ef4444', label:'Rechazado' },
      cancelled:          { color:'#ef4444', label:'Cancelado' },
      sin_stock:          { color:'#ef4444', label:'Sin stock' },
      cancelada_por_baja: { color:'#ef4444', label:'Cancelada' },
      pending:            { color:'#f97316', label:'Pendiente' },
      pendiente:          { color:'#f97316', label:'Pendiente' }
    };

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px;">
        <div style="background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#818cf8;">${res.totalRequests}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Solicitudes</div>
        </div>
        <div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.22);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.4rem;font-weight:900;color:#22c55e;">${fmtMoney(res.totalRevenue)}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Ingresos confirmados</div>
        </div>
        <div style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.22);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#38bdf8;">${res.confirmedOrders}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Confirmados</div>
        </div>
        <div style="background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.25);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#f97316;">${res.pendingOrders}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Pendientes</div>
        </div>
      </div>

      ${byDay.length ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px;">Solicitudes en el período</p>
      <div style="display:flex;align-items:flex-end;gap:6px;height:90px;margin-bottom:24px;">
        ${byDay.map(d => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;height:100%;">
            <div title="${d.count}" style="width:100%;max-width:30px;background:linear-gradient(180deg,#ff7a4f,#ff4f81);border-radius:6px 6px 2px 2px;height:${Math.max(4, (d.count/maxDay)*64)}px;"></div>
            <span style="font-size:.62rem;color:#888;">${esc(d.label)}</span>
          </div>`).join('')}
      </div>` : '<p style="color:#aaa;text-align:center;padding:10px 0;">Sin solicitudes en este período.</p>'}

      ${topProds.length ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Productos más solicitados</p>
      ${topProds.map(p => `
        <div style="margin-bottom:9px;">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px;">
            <span style="color:#eee;">${esc(p.name)}</span><span style="color:#aaa;">${p.count}</span>
          </div>
          <div style="background:rgba(255,255,255,.08);border-radius:20px;height:6px;overflow:hidden;">
            <div style="background:#ff4f81;height:100%;width:${(p.count/maxProd)*100}%;"></div>
          </div>
        </div>`).join('')}` : ''}

      ${topVends.length ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px;">Top vendedores por ingresos</p>
      ${topVends.map((v, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="font-size:.82rem;color:#eee;">${['🥇','🥈','🥉'][i] || '•'} ${esc(v.nombre)}</span>
          <span style="font-size:.75rem;color:#aaa;">${v.orders} ped · ${fmtMoney(v.revenue)}</span>
        </div>`).join('')}` : ''}

      ${(source === 'comunidad' && vendorStatus.length) ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px;">Entregado / Sin stock por vendedor</p>
      ${vendorStatus.map(v => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.8rem;">
          <span style="color:#eee;">${esc(v.nombre)}</span>
          <span style="display:flex;gap:6px;">
            <span title="Entregados" style="background:rgba(34,197,94,.15);color:#22c55e;border-radius:20px;padding:2px 10px;font-size:.72rem;font-weight:700;">✔ ${v.entregados}</span>
            <span title="Sin stock" style="background:rgba(239,68,68,.15);color:#ef4444;border-radius:20px;padding:2px 10px;font-size:.72rem;font-weight:700;">✖ ${v.sinStock}</span>
          </span>
        </div>`).join('')}
      ` : (recent.length ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px;">Actividad reciente</p>
      ${recent.map(a => {
        const visual = STATUS_VISUAL[a.status] || { color:'#f97316', label:'Pendiente' };
        const vendedorTxt = a.vendedor ? esc(a.vendedor) + ' · ' : '';
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.78rem;">
          <span style="color:#ccc;">${vendedorTxt}${a.items} producto${a.items===1?'':'s'} · ${esc(a.date)}</span>
          <span style="background:${visual.color};color:#fff;border-radius:20px;padding:2px 9px;font-size:.7rem;font-weight:700;">${visual.label}</span>
        </div>`;
      }).join('')}` : '')}
    `;
  } catch(e) {
    bodyEl.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar estadísticas' + (e.message ? ': ' + esc_(e.message) : '') + '</p>';
  }
}


function esc_(s) { return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ── Monitor de Errores (movido al panel de Notificaciones > Herramientas) ──
// ── Reentrenar modelo de IA (auto-tag de categoría) ───────────────────────
async function resincronizarComunidadAlgoliaBtn() {
  const confirmado = await new Promise((resolve) => {
    showCustomConfirm({
      title: 'Resincronizar Comunidad con Algolia',
      message: 'Esto recorre todo el índice de Algolia y borra cualquier producto que ya no exista o no esté aprobado en la hoja (productos "fantasma"). Puede tardar unos segundos si el catálogo es grande. ¿Continuar?',
      icon: 'refresh',
      confirmText: 'Sí, resincronizar',
      cancelText: 'Cancelar',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
  if (!confirmado) return;

  showLoader('Resincronizando Comunidad con Algolia...');
  try {
    const api = "https://catalogo-api-1038143238323.us-central1.run.app";
    const token = sessionStorage.getItem('admin_token') || '';
    if (!api || !token) {
      hideLoader();
      showCustomAlert({
        title: 'Sin sesión activa',
        message: 'No hay API_URL o token de admin disponible. Inicia sesión de nuevo.',
        icon: 'error',
        confirmText: 'Entendido'
      });
      return;
    }
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'resincronizarComunidadAlgolia', token }).toString()
    });
    const data = await res.json();
    hideLoader();
    if (!data || !data.ok) {
      showCustomAlert({
        title: 'No se pudo resincronizar',
        message: (data && data.error) || 'Error desconocido.',
        icon: 'error',
        confirmText: 'Entendido'
      });
      return;
    }
    showCustomAlert({
      title: 'Resincronización disparada',
      message: data.message || 'Revisa el Registro de ejecución en Apps Script para el detalle.',
      icon: 'check',
      confirmText: 'Entendido'
    });
  } catch (err) {
    hideLoader();
    console.error('Error resincronizarComunidadAlgolia:', err);
    showCustomAlert({
      title: 'Error de conexión',
      message: 'No se pudo contactar al servidor. Intenta de nuevo.',
      icon: 'error',
      confirmText: 'Entendido'
    });
  }
}

async function reentrenarModeloIA() {
  const confirmado = await new Promise((resolve) => {
    showCustomConfirm({
      title: 'Reentrenar modelo de IA',
      message: 'Esto dispara un entrenamiento nuevo del modelo de auto-tag de categorías en GitHub Actions, usando las fotos y categorías actuales del catálogo. Puede tardar varios minutos y reemplazará el modelo en producción al terminar. ¿Continuar?',
      icon: 'sparkles',
      confirmText: 'Sí, reentrenar',
      cancelText: 'Cancelar',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
  if (!confirmado) return;

  showLoader('Disparando reentrenamiento...');
  try {
    const api = "https://admin-api-1038143238323.us-central1.run.app";
    const token = sessionStorage.getItem('admin_token') || '';
    if (!api || !token) {
      hideLoader();
      showCustomAlert({
        title: 'Sin sesión activa',
        message: 'No hay API_URL o token de admin disponible. Inicia sesión de nuevo.',
        icon: 'error',
        confirmText: 'Entendido'
      });
      return;
    }
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'reentrenarModeloIA', token }).toString()
    });
    const data = await res.json();
    hideLoader();
    if (!data || !data.ok) {
      showCustomAlert({
        title: 'No se pudo disparar el reentrenamiento',
        message: (data && data.error) || 'Error desconocido.',
        icon: 'error',
        confirmText: 'Entendido'
      });
      return;
    }
    showCustomAlert({
      title: 'Reentrenamiento disparado',
      message: data.message || 'Revisa la pestaña Actions de tu repo en GitHub para ver el progreso.',
      icon: 'check',
      confirmText: 'Entendido'
    });
  } catch (err) {
    hideLoader();
    console.error('Error reentrenarModeloIA:', err);
    showCustomAlert({
      title: 'Error de conexión',
      message: 'No se pudo contactar al servidor. Intenta de nuevo.',
      icon: 'error',
      confirmText: 'Entendido'
    });
  }
}






// ── Resumen Plan Plus (MRR) ────────────────────────────────────────────────
async function openPlanPlusResumenModal() {
  const old = document.getElementById('modal-plan-plus-resumen');
  if (old) old.remove();
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = "https://vendedores-api-1038143238323.us-central1.run.app";

  const modal = document.createElement('div');
  modal.id = 'modal-plan-plus-resumen';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `<div style="background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;padding:0 0 32px;color:#fff;">
    <div style="position:sticky;top:0;background:#1a1a2e;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:2;">
      <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('star')} Resumen Plan Plus</h2>
      <button id="btn-close-plan-plus-resumen" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">×</button>
    </div>
    <div id="ppr-body" style="padding:18px 20px;">Cargando…</div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-plan-plus-resumen').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const bodyEl = document.getElementById('ppr-body');
  try {
    if (!token) throw new Error('Sin sesión de admin');
    const res = await fetch(api + '?' + new URLSearchParams({ action: 'obtenerResumenPlanPlus', token })).then(r => r.json());
    if (!res.ok) throw new Error(res.error || 'Error del servidor');

    const esc      = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtMoney = v => '$' + Number(v || 0).toLocaleString('es-MX');
    const proximos = res.proximosVencimientos || [];

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px;">
        <div style="grid-column:span 2;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.22);border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:2rem;font-weight:900;color:#22c55e;">${fmtMoney(res.mrr)}</div>
          <div style="font-size:.75rem;color:#aaa;margin-top:2px;">MRR estimado (${res.vendedoresActivos} × ${fmtMoney(res.precioMensual)}/mes)</div>
        </div>
        <div style="background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#818cf8;">${res.vendedoresActivos}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Vendedores Plus activos</div>
        </div>
        <div style="background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.25);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:900;color:#f97316;">${res.vencenEn7dias}</div>
          <div style="font-size:.72rem;color:#aaa;margin-top:2px;">Vencen en 7 días</div>
        </div>
      </div>

      ${proximos.length ? `
      <p style="font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Próximos vencimientos</p>
      ${proximos.map(v => {
        const urgente = v.diasRestantes <= 7;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="font-size:.82rem;color:#eee;">${esc(v.nombre)}</span>
          <span style="background:${urgente ? '#ef4444' : 'rgba(255,255,255,.1)'};color:#fff;border-radius:20px;padding:2px 10px;font-size:.72rem;font-weight:700;">${v.diasRestantes} día${v.diasRestantes === 1 ? '' : 's'}</span>
        </div>`;
      }).join('')}` : '<p style="color:#aaa;text-align:center;padding:16px 0;">Nadie vence en los próximos 30 días.</p>'}
    `;
  } catch (e) {
    bodyEl.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar el resumen: ' + (e.message || '') + '</p>';
  }
}



 

// ── Sincronizar productos de un vendedor específico (fix manual) ───────────
window.openSyncVendedorModal = function() {
  let modal = document.getElementById('sync-vendedor-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sync-vendedor-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);z-index:19999;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:22px;padding:28px;max-width:400px;width:90%;position:relative;box-shadow:0 24px 64px rgba(0,0,0,.3);">
        <button onclick="document.getElementById('sync-vendedor-modal').style.display='none'" style="position:absolute;top:14px;right:14px;background:#f0f0f5;border:none;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;color:#666;">${Icon('x')}</button>
        <h3 style="margin:0 0 8px;font-size:18px;">${Icon('refresh')} Sincronizar productos de vendedor</h3>
        <p style="margin:0 0 18px;font-size:13px;color:#666;">Vuelve a sincronizar todos los productos publicados de un vendedor, según su UID.</p>
        <label style="font-size:12px;font-weight:700;color:#444;display:block;margin-bottom:6px;">UID del vendedor</label>
        <input type="text" id="sync-vendedor-uid-input" placeholder="Ej: v_1779036431879" style="width:100%;padding:12px;border:1.5px solid #e2e0eb;border-radius:10px;font-size:14px;margin-bottom:16px;box-sizing:border-box;">
        <button type="button" id="sync-vendedor-submit-btn" class="primary-button full-width" style="padding:12px;">Sincronizar</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    modal.querySelector('#sync-vendedor-submit-btn').addEventListener('click', ejecutarSyncVendedor);
    modal.querySelector('#sync-vendedor-uid-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') ejecutarSyncVendedor();
    });
  }
  const input = modal.querySelector('#sync-vendedor-uid-input');
  input.value = '';
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 50);
};

async function ejecutarSyncVendedor() {
  const input = document.getElementById('sync-vendedor-uid-input');
  const vendedorUid = (input?.value || '').trim();
  if (!vendedorUid) {
    if (window.showTemporaryMessage) window.showTemporaryMessage('Ingresa el UID del vendedor', 'error');
    return;
  }
  const api = "https://catalogo-api-1038143238323.us-central1.run.app";
  const token = sessionStorage.getItem('admin_token') || '';
  if (!api || !token) {
    showCustomAlert({
      title: 'Sin sesión activa',
      message: 'No hay API_URL o token de admin disponible. Inicia sesión de nuevo.',
      icon: 'error',
      confirmText: 'Entendido'
    });
    return;
  }
  document.getElementById('sync-vendedor-modal').style.display = 'none';
  showLoader('Sincronizando productos del vendedor...');
  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'sincronizarProductosVendedor', vendedor_uid: vendedorUid, token }).toString()
    });
    const data = await res.json();
    hideLoader();
    if (!data || !data.ok) {
      showCustomAlert({
        title: 'No se pudo sincronizar',
        message: (data && data.error) || 'Error desconocido.',
        icon: 'error',
        confirmText: 'Entendido'
      });
      return;
    }
    showCustomAlert({
      title: 'Sincronización completa',
      message: data.message || `Productos del vendedor ${vendedorUid} sincronizados.`,
      icon: 'check',
      confirmText: 'Entendido'
    });
  } catch (err) {
    hideLoader();
    console.error('Error sincronizarProductosVendedor:', err);
    showCustomAlert({
      title: 'Error de conexión',
      message: 'No se pudo contactar al servidor. Intenta de nuevo.',
      icon: 'error',
      confirmText: 'Entendido'
    });
  }
}
window.ejecutarSyncVendedor = ejecutarSyncVendedor;

function openErrorMonitorModal() {
  const old = document.getElementById('modal-error-monitor');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-error-monitor';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `<div style="background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;padding:0 0 32px;color:#fff;">
    <div style="position:sticky;top:0;background:#1a1a2e;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <h2 style="margin:0;font-size:1rem;font-weight:800;display:flex;align-items:center;gap:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" aria-hidden="true"><use href="#ic-error"/></svg> Monitor de Errores <span id="em-badge" style="display:none;background:#ef4444;color:#fff;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700"></span></h2>
      <button id="btn-close-error-monitor" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">×</button>
    </div>
    <div style="padding:16px 20px;">
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <button onclick="loadErrorLog()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" aria-hidden="true"><use href="#ic-refresh"/></svg> Actualizar
        </button>
        <button onclick="clearErrorLog()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#ef4444;padding:6px 14px;border-radius:20px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" aria-hidden="true"><use href="#ic-trash"/></svg> Limpiar log
        </button>
        <select id="em-filter" onchange="renderErrorLog()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;cursor:pointer">
          <option value="all">Todos</option>
          <option value="CRÍTICO">Solo críticos</option>
          <option value="ERROR">Solo errores</option>
        </select>
      </div>
      <div id="em-list" style="font-size:13px;line-height:1.6">
        <p style="color:#888;text-align:center;padding:20px">Cargando...</p>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-error-monitor').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  if (typeof loadErrorLog === 'function') loadErrorLog();
}

// ── Monitor de Errores: funciones de carga y renderizado ──────────────────

window.loadErrorLog = function() {
  const list = document.getElementById('em-list');
  if (!list) return;
  list.innerHTML = '<p style="color:#888;text-align:center;padding:20px">' + Icon('clock') + ' Cargando errores...</p>';
  const api   = "https://admin-api-1038143238323.us-central1.run.app";
  const token = sessionStorage.getItem('admin_token') || '';

  if (!api || !token) {
    list.innerHTML = '<p style="color:#f97316;text-align:center;padding:20px">' + Icon('error') + ' Sin sesión activa o sin API_URL. Inicia sesión de nuevo.</p>';
    return;
  }

  const url = api + '?' + new URLSearchParams({ action: 'obtenerErrorLog', token }).toString();
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      if (!data.ok && data.error) {
        // Backend respondió con error (ej: token inválido)
        list.innerHTML = `<p style="color:#ef4444;text-align:center;padding:20px">${Icon('x')} ${data.error}</p>`;
        return;
      }
      // Normalizar campos en español del Apps Script → formato interno
      const remote = (Array.isArray(data.errors) ? data.errors : []).map(e => ({
        ts:       e.ts        || e.Timestamp || new Date().toISOString(),
        level:    e.nivel     || e.Nivel     || e.level    || 'ERROR',
        source:   e.fuente    || e.Fuente    || e.source   || '',
        action:   e.accion    || e.Accion    || e.action   || '',
        message:  e.mensaje   || e.Mensaje   || e.message  || '',
        url:      e.url       || e.URL       || '',
        filename: e.archivo   || e.Archivo   || e.filename || '',
        lineno:   e.linea     || e.Linea     || e.lineno   || 0,
        colno:    e.columna   || e.Columna   || e.colno    || 0,
        stack:    e.stack     || e.Stack     || '',
      }));
      // Combinar con errores locales del localStorage si los hay
      const local = (window.ZRMonitor ? window.ZRMonitor.getErrors() : []);
      const seen  = new Set();
      window._emErrors = [...remote, ...local]
        .filter(e => { const k = (e.ts||'') + (e.message||''); return seen.has(k) ? false : seen.add(k); })
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
      renderErrorLog();
    })
    .catch(err => {
      console.error('[Monitor] Error al obtener errores:', err);
      list.innerHTML = `<p style="color:#ef4444;text-align:center;padding:20px">${Icon('x')} Error de red: ${err.message}.<br><span style="color:#888;font-size:11px;">Revisa la consola para más detalles.</span></p>`;
    });
};

window.renderErrorLog = function() {
  const list = document.getElementById('em-list');
  if (!list) return;
  const filter = (document.getElementById('em-filter') || {}).value || 'all';
  const all    = window._emErrors || [];
  const errors = filter === 'all' ? all : all.filter(e => (e.level||'') === filter);
  const badge  = document.getElementById('em-badge');
  if (badge) { badge.textContent = all.length; badge.style.display = all.length ? 'inline' : 'none'; }
  if (!errors.length) {
    list.innerHTML = '<p style="color:#888;text-align:center;padding:30px">' + Icon('check') + ' Sin errores registrados</p>';
    return;
  }
  const colorMap = { 'CRÍTICO':'#ef4444', 'ERROR':'#f97316', 'WARN':'#eab308' };
  list.innerHTML = errors.map(e => {
    const fecha = e.ts ? new Date(e.ts).toLocaleString('es-MX', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '–';
    const c     = colorMap[e.level] || '#aaa';
    const src   = e.source || (e.filename||'').split('/').pop() || '?';
    const msg   = (e.message || '').slice(0, 200);
    const file  = e.filename || '';
    const line  = e.lineno || 0;
    const col   = e.colno  || 0;
    const stk   = e.stack  || '';
    return `<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:12px 14px;margin-bottom:10px;border-left:3px solid ${c};">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
        <span style="color:${c};font-weight:700;font-size:11px;">${e.level||'?'} &bull; ${src}</span>
        <span style="color:#666;font-size:11px;">${fecha}</span>
      </div>
      <div style="color:#ddd;font-size:12px;word-break:break-word;">${msg}</div>
      ${file||line ? `<div style="color:#555;font-size:11px;margin-top:3px;">${file}${line?':'+line+':'+col:''}</div>` : ''}
      ${stk ? `<details style="margin-top:5px;"><summary style="color:#666;font-size:11px;cursor:pointer;">Stack trace</summary><pre style="color:#888;font-size:10px;margin:4px 0 0;white-space:pre-wrap;word-break:break-all;">${stk}</pre></details>` : ''}
    </div>`;
  }).join('');
};

window.clearErrorLog = async function() {
  if (!confirm('¿Borrar todos los errores del log?')) return;
  const api   = "https://admin-api-1038143238323.us-central1.run.app";
  const token = sessionStorage.getItem('admin_token') || '';
  if (window.ZRMonitor) window.ZRMonitor.clear();
  if (api && token) {
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'limpiarErrorLog', token }).toString()
      });
      const data = await res.json();
      if (!data.ok) {
        showTemporaryMessage('No se pudo limpiar el log del servidor: ' + (data.error || 'error desconocido'), 'error');
      }
    } catch (err) {
      showTemporaryMessage('No se pudo limpiar el log del servidor: ' + err.message, 'error');
    }
  }
  // Volver a pedir el log real al servidor en vez de confiar en un
  // borrado local optimista — así se ve de inmediato si algo no se
  // borró de verdad.
  window.loadErrorLog();
};







 // ── Sugerencias: Vendedor confiable ────────────────────────────────────────
async function openSugerenciasConfiableModal() {
  const old = document.getElementById('modal-sugerencias-confiable');
  if (old) old.remove();
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = "https://vendedores-api-1038143238323.us-central1.run.app";
  const esc   = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const modal = document.createElement('div');
  modal.id = 'modal-sugerencias-confiable';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `<div style="background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;padding:0 0 32px;color:#fff;">
    <div style="position:sticky;top:0;background:#1a1a2e;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:2;">
      <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('lock')} Sugerencias: Vendedor confiable</h2>
      <button id="btn-close-sugerencias-confiable" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">×</button>
    </div>
    <div id="sc-body" style="padding:18px 20px;">Cargando…</div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-sugerencias-confiable').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const bodyEl = document.getElementById('sc-body');

  async function marcarConfiable(uid, btn) {
    btn.disabled = true;
    btn.textContent = 'Marcando…';
    try {
      const params = new URLSearchParams();
      params.append('action', 'marcarVendedorConfiable');
      params.append('token', token);
      params.append('uid', uid);
      params.append('confiable', 'true');
      const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || 'Error del servidor');
      const row = btn.closest('.sc-row');
      if (row) row.remove();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Reintentar';
      alert('Error al marcar confiable: ' + e.message);
    }
  }

  try {
    if (!token) throw new Error('Sin sesión de admin');
    const res = await fetch(api + '?' + new URLSearchParams({ action: 'obtenerSugerenciasConfiable', token })).then(r => r.json());
    if (!res.ok) throw new Error(res.error || 'Error del servidor');

    const sugerencias = res.sugerencias || [];
    bodyEl.innerHTML = `
      <p style="font-size:.78rem;color:#aaa;margin:0 0 16px;">Vendedores activos con al menos ${res.minVentasRequeridas} pedidos entregados, sin reportes pendientes de revisar, que todavía no están marcados como confiables.</p>
      <div id="sc-list">
        ${sugerencias.length ? sugerencias.map(s => `
          <div class="sc-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);gap:10px;">
            <div>
              <div style="font-size:.85rem;color:#eee;font-weight:600;">${esc(s.nombre)}</div>
              <div style="font-size:.72rem;color:#888;">${s.ventasEntregadas} pedidos entregados</div>
            </div>
            <button class="sc-marcar-btn" data-uid="${esc(s.uid)}" style="padding:7px 14px;border:none;border-radius:20px;background:#2563eb;color:#fff;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">Marcar confiable</button>
          </div>`).join('') : '<p style="color:#aaa;text-align:center;padding:20px 0;">No hay vendedores nuevos que sugerir por ahora.</p>'}
      </div>`;

    bodyEl.querySelectorAll('.sc-marcar-btn').forEach(btn => {
      btn.addEventListener('click', () => marcarConfiable(btn.dataset.uid, btn));
    });
  } catch (e) {
    bodyEl.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar sugerencias: ' + (e.message || '') + '</p>';
  }
}

// ── Tiles de Crear Producto / Lista de Productos ───────────────────────────
// Colapsados: tarjeta compacta (igual a las mini-cards de Notificaciones).
// Al tocarlas se abren a pantalla completa; solo el botón ✕ las cierra.
function openGridTile(tileId, bodyId) {
  const tile = document.getElementById(tileId);
  const body = document.getElementById(bodyId);
  if (!tile || !body) return;
  tile.classList.add('expanded');
  body.style.display = '';
  document.body.style.overflow = 'hidden';
  try { localStorage.setItem('admin_section_' + bodyId, 'open'); } catch(_) {}
}
function closeGridTile(tileId, bodyId) {
  const tile = document.getElementById(tileId);
  const body = document.getElementById(bodyId);
  if (!tile || !body) return;
  tile.classList.remove('expanded');
  body.style.display = 'none';
  document.body.style.overflow = '';
  try { localStorage.setItem('admin_section_' + bodyId, 'closed'); } catch(_) {}
}
window.openGridTile = openGridTile;
window.closeGridTile = closeGridTile;
window.expandGridTile = openGridTile; // alias por compatibilidad
(function restoreAdminSectionsState() {
  [['admin-create-section','create-product-body'], ['admin-list-section','list-products-body']].forEach(([tileId, bodyId]) => {
    try {
      if (localStorage.getItem('admin_section_' + bodyId) === 'open') {
        openGridTile(tileId, bodyId);
      }
    } catch(_) {}
  });
})();

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.classList.toggle('zero', count === 0);
}

function openInspectorMode() {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { if (window.showTemporaryMessage) window.showTemporaryMessage('Sin sesión de admin', 'error'); return; }
  const url = 'comunidad.html?inspector=1&token=' + encodeURIComponent(token);
  window.open(url, '_blank');
}

window.openVendorStatsGlobal = async function() {
  const token = sessionStorage.getItem('admin_token') || '';
  const vendedoresApi = "https://vendedores-api-1038143238323.us-central1.run.app";
  const catalogoApi = "https://catalogo-api-1038143238323.us-central1.run.app";
  let modal = document.getElementById('global-vendor-stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-vendor-stats-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);z-index:19999;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:22px;padding:28px;max-width:500px;width:93%;max-height:85vh;overflow-y:auto;position:relative;box-shadow:0 24px 64px rgba(0,0,0,.3);">
        <button onclick="document.getElementById('global-vendor-stats-modal').style.display='none'; const m=document.getElementById('gvs-action-menu'); if(m) m.style.display='none';" style="position:absolute;top:14px;right:14px;background:#f0f0f5;border:none;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;color:#666;">${Icon('x')}</button>
        <h3 style="margin:0 0 18px;font-size:19px;">${Icon('stats')} Estadísticas de Vendedores</h3>
        <div id="gvs-summary" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;"></div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          <input id="gvs-search" type="text" placeholder="Buscar por nombre o teléfono..." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #ddd;font-size:13px;box-sizing:border-box;">
          <div style="display:flex;gap:8px;">
            <select id="gvs-filter-estado" style="flex:1;min-width:0;padding:10px 8px;border-radius:10px;border:1px solid #ddd;font-size:13px;">
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="pendiente">Pendientes</option>
              <option value="suspendido">Suspendidos/Rechazados</option>
            </select>
            <select id="gvs-filter-plan" style="flex:1;min-width:0;padding:10px 8px;border-radius:10px;border:1px solid #ddd;font-size:13px;">
              <option value="">Free y Plus</option>
              <option value="plus">Solo Plus</option>
              <option value="free">Solo Free</option>
            </select>
          </div>
        </div>
        <div id="gvs-list"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target===modal) { modal.style.display='none'; const m=document.getElementById('gvs-action-menu'); if(m) m.style.display='none'; } });
  }
  modal.style.display = 'flex';
  document.getElementById('gvs-summary').innerHTML = '<p style="color:#aaa;grid-column:span 3;text-align:center;">Cargando...</p>';
  document.getElementById('gvs-list').innerHTML = '';
  try {
    const [vRes, pRes] = await Promise.all([
      fetch(vendedoresApi + '?' + new URLSearchParams({ action: "vendedoresAdmin", token: token }).toString()).then(r=>r.json()).catch(()=>({})),
      fetch(catalogoApi + '?' + new URLSearchParams({ action: "listarTodoComunidad", token: token }).toString()).then(r=>r.json()).catch(()=>({}))
    ]);
    const vendors  = vRes.vendors  || [];
    const products = pRes.products || pRes.pendientes || [];
    const activos  = vendors.filter(v=>v.estado==='activo').length;
    const pendientes = vendors.filter(v=>v.estado==='pendiente').length;
    const suspendidos= vendors.filter(v=>v.estado==='suspendido'||v.estado==='rechazado').length;
    document.getElementById('gvs-summary').innerHTML = `
      <div style="background:#f0fff4;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#2e7d32;">${activos}</div>
        <div style="font-size:11px;color:#555;text-transform:uppercase;">Activos</div>
      </div>
      <div style="background:#fff8e1;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#f57f17;">${pendientes}</div>
        <div style="font-size:11px;color:#555;text-transform:uppercase;">Pendientes</div>
      </div>
      <div style="background:#ffebee;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#c62828;">${suspendidos}</div>
        <div style="font-size:11px;color:#555;text-transform:uppercase;">Suspendidos</div>
      </div>`;

    // Guardamos los datos crudos para poder re-filtrar sin volver a pedirlos.
    window._gvsData = { vendors, products };

    const searchEl = document.getElementById('gvs-search');
    const estadoEl = document.getElementById('gvs-filter-estado');
    const planEl   = document.getElementById('gvs-filter-plan');
    searchEl.oninput = () => window._renderVendorStatsList();
    estadoEl.onchange = () => window._renderVendorStatsList();
    planEl.onchange   = () => window._renderVendorStatsList();

    window._renderVendorStatsList();
  } catch(e) {
    document.getElementById('gvs-summary').innerHTML = `<p style="color:#ef4444;grid-column:span 3;">Error: ${escapeHtml(e.message)}</p>`;
  }
};

window._renderVendorStatsList = function() {
  const menuElPrev = document.getElementById('gvs-action-menu');
  if (menuElPrev) menuElPrev.style.display = 'none';
  const { vendors, products } = window._gvsData || { vendors: [], products: [] };
  const listEl = document.getElementById('gvs-list');
  if (!listEl) return;
  if (!vendors.length) { listEl.innerHTML = '<p style="color:#aaa;text-align:center;">Sin vendedores</p>'; return; }

  const q = (document.getElementById('gvs-search')?.value || '').trim().toLowerCase();
  const filtroEstado = document.getElementById('gvs-filter-estado')?.value || '';
  const filtroPlan   = document.getElementById('gvs-filter-plan')?.value || '';

  const filtrados = vendors.filter(v => {
    if (q) {
      const nombre = String(v.nombre||'').toLowerCase();
      const tel    = String(v.telefono||'').toLowerCase();
      if (!nombre.includes(q) && !tel.includes(q)) return false;
    }
    if (filtroEstado) {
      if (filtroEstado === 'suspendido') {
        if (v.estado !== 'suspendido' && v.estado !== 'rechazado') return false;
      } else if (v.estado !== filtroEstado) return false;
    }
    if (filtroPlan) {
      const esPlus = v.plan === 'plus';
      if (filtroPlan === 'plus' && !esPlus) return false;
      if (filtroPlan === 'free' && esPlus) return false;
    }
    return true;
  });

  if (!filtrados.length) { listEl.innerHTML = '<p style="color:#aaa;text-align:center;padding:16px 0;">Ningún vendedor coincide con el filtro.</p>'; return; }

  listEl.innerHTML = filtrados.map(v => {
      const myProds = products.filter(p=>p.vendedor_uid===v.uid);
      const aprobados = myProds.filter(p=>p.estado==='aprobado').length;
      const pendProd  = myProds.filter(p=>p.estado==='pendiente').length;
      const stock = myProds.reduce((s,p)=>s+(Number(p.stock)||0),0);
      const esPlus    = v.plan === 'plus';
      const limite    = v.limite != null ? v.limite : (esPlus ? 200 : 2);
      const actuales  = v.productosActuales != null ? v.productosActuales : myProds.length;
      const diasRestantes = v.planVence ? Math.ceil((new Date(v.planVence) - new Date()) / 86400000) : null;
      const puedeSuspender = v.estado==='activo' && typeof AdminComunidad!=='undefined';
      const planBadge = esPlus
        ? `<span style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">PLUS</span>`
        : `<span style="background:#eee;color:#999;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">FREE</span>`;
      const venceTxt = (esPlus && diasRestantes != null)
        ? `<div style="font-size:11px;color:${diasRestantes<=7?'#c62828':'#888'};margin-top:2px;">vence en ${diasRestantes}d</div>`
        : '';
      return `<div class="gvs-row" style="padding:14px 0;border-bottom:1px solid #f0f0f5;" data-uid="${v.uid}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:14px;">${escapeHtml(v.nombre||'—')}</span>
              ${planBadge}
            </div>
            <div style="font-size:12px;color:#888;margin-top:2px;">${escapeHtml(v.telefono||'—')} · <span style="color:${v.estado==='activo'?'#2e7d32':'#f57f17'}">${escapeHtml(v.estado)}</span></div>
            ${venceTxt}
          </div>
          <button class="btn-row-menu" data-uid="${v.uid}" data-plan="${v.plan||'free'}" data-nombre="${escapeHtml(v.nombre||'')}" data-dias="${diasRestantes != null ? diasRestantes : 0}" data-suspendible="${puedeSuspender ? '1':'0'}" style="flex-shrink:0;width:32px;height:32px;border-radius:50%;border:1px solid #eee;background:#fafafa;color:#555;font-size:16px;font-weight:700;line-height:1;cursor:pointer;">⋮</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;font-size:11.5px;color:#888;flex-wrap:wrap;">
          <span style="font-weight:700;color:#333;">${actuales}/${limite} productos</span>
          <span>${aprobados} aprobados · ${Icon('clock',{size:12})} ${pendProd} pend. · Stock: ${stock}</span>
        </div>
      </div>`;
    }).join('');

  let menuEl = document.getElementById('gvs-action-menu');
  if (!menuEl) {
    menuEl = document.createElement('div');
    menuEl.id = 'gvs-action-menu';
    menuEl.style.cssText = 'display:none;position:fixed;z-index:100001;background:#fff;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.22);border:1px solid #eee;min-width:170px;overflow:hidden;padding:4px;';
    document.body.appendChild(menuEl);
    document.addEventListener('click', () => { menuEl.style.display = 'none'; });
  }

  function itemHtml(label, color, extra) {
    return `<button class="gvs-menu-item" ${extra||''} style="display:flex;width:100%;align-items:center;gap:8px;padding:9px 12px;border:none;background:none;color:${color||'#333'};font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;">${label}</button>`;
  }

  listEl.querySelectorAll('.btn-row-menu').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const yaAbierto = menuEl.style.display === 'block' && menuEl.dataset.forUid === this.dataset.uid;
      menuEl.style.display = 'none';
      if (yaAbierto) return; // clic de nuevo en el mismo botón: solo cerrar

      const uid = this.dataset.uid;
      const nombre = this.dataset.nombre;
      const plan = this.dataset.plan;
      const dias = Number(this.dataset.dias) || 0;
      const esPlus = plan === 'plus';
      const puedeSuspender = this.dataset.suspendible === '1';

      menuEl.dataset.forUid = uid;
      menuEl.innerHTML = [
        itemHtml(esPlus ? 'Quitar Plus' : 'Activar Plus', '#7c3aed', 'data-act="toggle-plan"'),
        esPlus ? itemHtml('Ajustar días', '#7c3aed', 'data-act="adjust-days"') : '',
        puedeSuspender ? itemHtml('Suspender', '#555', 'data-act="suspend"') : '',
        itemHtml('Eliminar cuenta', '#dc2626', 'data-act="delete"'),
      ].join('');

      menuEl.querySelectorAll('.gvs-menu-item').forEach(mi => {
        mi.addEventListener('click', function(ev) {
          ev.stopPropagation();
          menuEl.style.display = 'none';
          const act = this.dataset.act;
          if (act === 'toggle-plan') window.togglePlanVendedor(uid, nombre, plan);
          else if (act === 'adjust-days') window.ajustarDiasPlus(uid, nombre, dias);
          else if (act === 'suspend') AdminComunidad.suspenderVendedor(uid, nombre);
          else if (act === 'delete') window.eliminarCuentaVendedorAdmin(uid, nombre);
        });
      });

      const rect = this.getBoundingClientRect();
      menuEl.style.display = 'block';
      const menuWidth = menuEl.offsetWidth || 170;
      let left = rect.right - menuWidth;
      if (left < 8) left = 8;
      let top = rect.bottom + 4;
      const menuHeight = menuEl.offsetHeight || 150;
      if (top + menuHeight > window.innerHeight - 8) top = rect.top - menuHeight - 4;
      menuEl.style.left = left + 'px';
      menuEl.style.top = top + 'px';
    });
  });
};

window.togglePlanVendedor = async function(uid, nombre, currentPlan) {
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = "https://vendedores-api-1038143238323.us-central1.run.app";

  if (!api) {
    if (window.showTemporaryMessage) window.showTemporaryMessage('API no disponible', 'error');
    return;
  }
  if (!token) {
    if (window.showTemporaryMessage) window.showTemporaryMessage('Token no encontrado. Re-inicia sesión.', 'error');
    return;
  }

  const nuevoPlan = currentPlan === 'plus' ? 'free' : 'plus';
  let dias = 20;

  if (nuevoPlan === 'plus') {
    const input = prompt(`¿Por cuántos días activar el plan Plus para "${nombre}"?`, '30');
    if (input === null) return; // cancelado
    const parsed = parseInt(input, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      if (window.showTemporaryMessage) window.showTemporaryMessage('Número de días inválido.', 'error');
      else alert('Número de días inválido.');
      return;
    }
    dias = parsed;
  } else {

    if (!confirm(`¿Quitar el plan Plus a "${nombre}"? Se ocultarán productos si excede el límite.`)) {
      return;
    }
  }

  try {
    if (window.showLoader) window.showLoader('Actualizando plan...');
    const params = new URLSearchParams();
    params.append('action', 'marcarVendedorPlan');
    params.append('uid', uid);
    params.append('plan', nuevoPlan);
    params.append('dias', String(dias));
    params.append('token', token);

    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');

    const mensaje = nuevoPlan === 'plus'
      ? `Plan Plus activado por ${dias} días para ${nombre}`
      : `Plan Plus removido de ${nombre}`;

    if (window.showTemporaryMessage) window.showTemporaryMessage(mensaje, 'success');
    else alert(mensaje);

    window.openVendorStatsGlobal();

  } catch (err) {
    if (window.showTemporaryMessage) window.showTemporaryMessage(err.message, 'error');
    else alert('Error: ' + err.message);
  } finally {
    if (window.hideLoader) window.hideLoader();
  }
};

// Modal propio de texto+número, para no depender de prompt()/alert()
// nativos (en algunos entornos — WebView, PWA instalada, etc. — esos
// diálogos del navegador no se muestran encima del resto de la página).
// z-index más alto que el de #global-vendor-stats-modal (19999) para
// que nunca quede tapado detrás de él.
function customPromptModal(mensaje, valorInicial) {
  return new Promise(resolve => {
    const old = document.getElementById('custom-input-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'custom-input-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;';
    const msgHtml = String(mensaje).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:22px;max-width:340px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);">
        <p style="margin:0 0 14px;font-size:.85rem;color:#333;line-height:1.5;">${msgHtml}</p>
        <input id="custom-input-field" type="text" inputmode="numeric" value="${String(valorInicial).replace(/"/g,'&quot;')}" style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px;box-sizing:border-box;margin-bottom:14px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="custom-input-cancel" style="padding:9px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#555;font-weight:600;cursor:pointer;">Cancelar</button>
          <button id="custom-input-ok" style="padding:9px 14px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-weight:700;cursor:pointer;">Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const field = document.getElementById('custom-input-field');
    field.focus();
    field.select();
    const cleanup = (result) => { modal.remove(); resolve(result); };
    document.getElementById('custom-input-ok').addEventListener('click', () => cleanup(field.value));
    document.getElementById('custom-input-cancel').addEventListener('click', () => cleanup(null));
    modal.addEventListener('click', e => { if (e.target === modal) cleanup(null); });
    field.addEventListener('keydown', e => {
      if (e.key === 'Enter') cleanup(field.value);
      if (e.key === 'Escape') cleanup(null);
    });
  });
}

// Modal propio de solo-aviso, mismo motivo que customPromptModal.
function customAlertModal(mensaje) {
  return new Promise(resolve => {
    const old = document.getElementById('custom-alert-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'custom-alert-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;';
    const msgHtml = String(mensaje).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:22px;max-width:340px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);">
        <p style="margin:0 0 16px;font-size:.85rem;color:#333;line-height:1.5;">${msgHtml}</p>
        <div style="display:flex;justify-content:flex-end;">
          <button id="custom-alert-ok" style="padding:9px 16px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-weight:700;cursor:pointer;">OK</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const ok = document.getElementById('custom-alert-ok');
    ok.focus();
    const cleanup = () => { modal.remove(); resolve(); };
    ok.addEventListener('click', cleanup);
    modal.addEventListener('click', e => { if (e.target === modal) cleanup(); });
  });
}

window.ajustarDiasPlus = async function(uid, nombre, diasActuales) {
  const token = sessionStorage.getItem('admin_token') || '';
  const api   = "https://vendedores-api-1038143238323.us-central1.run.app";

  if (!api) { await customAlertModal('API no disponible'); return; }
  if (!token) { await customAlertModal('Token no encontrado. Re-inicia sesión.'); return; }

  const input = await customPromptModal(`"${nombre}" tiene ${diasActuales} días de Plus restantes.\n¿Cuántos días quieres agregar? (usa un número negativo para restar, ej. -5)`, '30');
  if (input === null) return; // cancelado
  // Normaliza guiones "tipográficos" (–, —, −) que a veces quedan al
  // copiar texto desde un chat o documento, para que sigan
  // reconociéndose como signo negativo.
  const cleanInput = String(input).trim().replace(/[\u2010-\u2015\u2212]/g, '-');
  const delta = parseInt(cleanInput, 10);
  if (!Number.isFinite(delta) || delta === 0) {
    await customAlertModal('Número de días inválido: "' + input + '". Usa solo dígitos, opcionalmente con un signo "-" al inicio (ej. 30 o -5).');
    return;
  }

  try {
    if (window.showLoader) window.showLoader('Ajustando días de Plus...');
    const params = new URLSearchParams();
    params.append('action', 'ajustarDiasPlanPlus');
    params.append('uid', uid);
    params.append('dias', String(delta));
    params.append('token', token);

    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');

    const mensaje = data.plan === 'plus'
      ? `Plan Plus de ${nombre} ${delta > 0 ? 'extendido' : 'acortado'} (${delta > 0 ? '+' : ''}${delta} días).`
      : `El ajuste dejó el plan de ${nombre} vencido — volvió a Free.`;
    await customAlertModal(mensaje);

    window.openVendorStatsGlobal();
  } catch (err) {
    await customAlertModal('Error: ' + err.message);
  } finally {
    if (window.hideLoader) window.hideLoader();
  }
};

window.eliminarCuentaVendedorAdmin = async function(uid, nombre) {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { if (window.showTemporaryMessage) window.showTemporaryMessage('Token no encontrado. Re-inicia sesión.', 'error'); return; }

  if (!confirm(`Esto borrará TODO de "${nombre}": productos, sesiones en vivo, entregas y su cuenta. Es irreversible. ¿Continuar?`)) return;
  if (!confirm(`Última confirmación: se eliminará por completo a "${nombre}" y no podrás recuperar sus datos. ¿Eliminar definitivamente?`)) return;

  try {
    if (window.showLoader) window.showLoader('Eliminando cuenta...');
    const params = new URLSearchParams();
    params.append('action', 'eliminarCuentaVendedor');
    params.append('uid', uid);
    params.append('token', token);

    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');

    const mensaje = `Cuenta de "${nombre}" eliminada por completo`;
    if (window.showTemporaryMessage) window.showTemporaryMessage(mensaje, 'success');
    else alert(mensaje);

    window.openVendorStatsGlobal();
    if (typeof AdminComunidad !== 'undefined' && AdminComunidad.loadVendors) AdminComunidad.loadVendors();
    if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();

  } catch (err) {
    if (window.showTemporaryMessage) window.showTemporaryMessage(err.message, 'error');
    else alert('Error: ' + err.message);
  } finally {
    if (window.hideLoader) window.hideLoader();
  }
};
