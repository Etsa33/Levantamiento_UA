/* ============================================================
   UI.JS
   Todo lo que se ve: filtrado de registros, la lista lateral
   ("bitácora"), los marcadores del mapa, los popups y el panel
   de totales por zona.
   ============================================================ */

// Filtros que aplican siempre (estado, tipo, servicio, búsqueda) — sin
// tocar provincia/cantón. Se reutiliza tanto para la lista/mapa (getFiltered)
// como para calcular los totales por provincia y por cantón.
function applyBaseFilters(records){
  const q = document.getElementById('search').value.trim().toLowerCase();
  const fEstado = document.getElementById('f-estado').value;
  const fTipo = document.getElementById('f-tipo').value;
  const fServ = document.getElementById('f-servicio').value;

  return records.filter(r => {
    if(fEstado && r.estado !== fEstado) return false;
    if(fTipo && r.tipo !== fTipo) return false;
    if(fServ && r.servicio !== fServ) return false;
    if(q){
      const hay = [r.nombreUA, r.codigoUA, r.canton, r.parroquia, r.provincia, r.servicio]
        .join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function getFiltered(){
  let list = applyBaseFilters(allRecords);
  if(selectedProvinceNorm) list = list.filter(r => normalizeName(r.provincia) === selectedProvinceNorm);
  const fCanton = document.getElementById('f-canton').value;
  if(fCanton) list = list.filter(r => r.canton === fCanton);
  return list;
}

// Dibuja una lista de totales tipo "NOMBRE ---- N" (sin texto extra),
// reutilizada por zona, provincia y cantón.
function renderStatsList(listElId, entries){
  const list = document.getElementById(listElId);
  list.innerHTML = '';
  if(entries.length === 0){
    list.innerHTML = '<div style="color:var(--muted); font-size:12px;">Sin datos</div>';
    return;
  }
  const max = Math.max(...entries.map(e => e[1]));
  entries.forEach(([name, count]) => {
    const pct = Math.max(8, Math.round((count/max)*100));
    const row = document.createElement('div');
    row.className = 'zs-row';
    row.innerHTML = `
      <span class="zs-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      <span class="zs-track"><span class="zs-bar" style="width:${pct}%"></span></span>
      <span class="zs-count">${count}</span>`;
    list.appendChild(row);
  });
}

function countBy(records, keyFn){
  const counts = {};
  records.forEach(r => {
    const key = keyFn(r) || 'Sin dato';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a,b) => b[1] - a[1]);
}

function renderZoneStats(filtered){
  renderStatsList('zs-list', countBy(filtered, r => shortenZona(r.zona)));
}

// Totales por provincia: siempre a nivel nacional (no se filtra por la
// provincia/cantón ya elegidos), para que el usuario vea todo el panorama
// sin importar qué esté seleccionado en el mapa.
function renderProvinceStats(){
  const records = applyBaseFilters(allRecords);
  renderStatsList('prov-stats-list', countBy(records, r => r.provincia));
}

// Totales por cantón: solo tiene sentido dentro de una provincia (son ~221
// en el país). Se oculta por completo si no hay provincia elegida.
function renderCantonStats(){
  const wrap = document.getElementById('canton-stats');
  if(!selectedProvinceNorm){
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  const provinciaLabel = (CANONICAL_PROVINCES.find(p => p.norm === selectedProvinceNorm) || {}).label
    || document.getElementById('f-provincia').value || '';
  document.getElementById('canton-stats-title').textContent = `Cantones — ${provinciaLabel}`;

  const records = applyBaseFilters(allRecords).filter(r => normalizeName(r.provincia) === selectedProvinceNorm);
  renderStatsList('canton-stats-list', countBy(records, r => r.canton));
}

function render(){
  const filtered = getFiltered();
  document.getElementById('count-visible').textContent = filtered.length;
  renderZoneStats(filtered);
  renderProvinceStats();
  renderCantonStats();

  // marcadores
  markerLayer.clearLayers();
  markersById = {};
  const withLoc = filtered.filter(r => r.loc);

  withLoc.forEach(r => {
    const c = colorForEstado(r.estado);
    const marker = L.marker([r.loc.lat, r.loc.lng], { icon: makeDivIcon(c.hex, r.id === activeId) });
    marker.bindPopup(buildPopup(r));
    // Etiquetado visible del punto (Requisito 6): solo se muestra a partir de
    // cierto zoom, para no saturar el mapa cuando se ve todo el país a la vez.
    marker.bindTooltip(r.codigoUA || r.nombreUA, { permanent: true, direction: 'right', offset: [8,0], className: 'marker-label' });
    marker.on('click', () => setActive(r.id, false));
    marker.addTo(markerLayer);
    markersById[r.id] = marker;
  });
  updateMarkerLabelVisibility();

  // lista
  const list = document.getElementById('record-list');
  list.innerHTML = '';
  if(filtered.length === 0){
    list.innerHTML = '<div id="empty-state">No hay registros para estos filtros.<br>Ajusta la búsqueda o espera a que se levante más información.</div>';
    return;
  }
  filtered.forEach(r => {
    const c = colorForEstado(r.estado);
    const div = document.createElement('div');
    div.className = 'record' + (r.id === activeId ? ' active' : '');
    div.dataset.id = r.id;
    div.innerHTML = `
      <div class="r-top">
        <span class="r-name">${escapeHtml(r.nombreUA)}</span>
        <span class="r-badge ${c.badge}">${escapeHtml(r.estado || 's/d')}</span>
      </div>
      <div class="r-meta">
        <span class="mono">${escapeHtml(r.codigoUA || '—')}</span> · ${escapeHtml(r.canton || '—')}, ${escapeHtml(r.provincia || '—')}<br>
        ${escapeHtml(r.servicio || '')}${r.loc ? '' : ' · <span style="color:var(--alert)">sin coordenadas</span>'}
      </div>`;
    div.addEventListener('click', () => setActive(r.id, true));
    list.appendChild(div);
  });
}

function buildPopup(r){
  const dir = [r.calle1, r.calle2].filter(Boolean).join(' y ');
  return `
    <div class="popup">
      <span class="p-badge ${r.estado.toLowerCase()==='activa' ? 'badge-activa' : r.estado.toLowerCase()==='suspendida' ? 'badge-suspendida' : 'badge-otro'}">${escapeHtml(r.estado || 's/d')}</span>
      <h3>${escapeHtml(r.nombreUA)}</h3>
      <div class="p-row"><b>Código:</b> ${escapeHtml(r.codigoUA || '—')}</div>
      <div class="p-row"><b>Tipo / Servicio:</b> ${escapeHtml(r.tipo || '—')} · ${escapeHtml(r.servicio || '—')}</div>
      <div class="p-row"><b>Modalidad:</b> ${escapeHtml(r.modalidad || '—')}</div>
      <div class="p-row"><b>Ubicación admin.:</b> ${escapeHtml(r.parroquia || '—')}, ${escapeHtml(r.canton || '—')}, ${escapeHtml(r.provincia || '—')}</div>
      ${dir ? `<div class="p-row"><b>Dirección:</b> ${escapeHtml(dir)} ${escapeHtml(r.numero||'')}</div>` : ''}
      ${r.referencia ? `<div class="p-row"><b>Referencia:</b> ${escapeHtml(r.referencia)}</div>` : ''}
      <div class="p-row"><b>Levantado:</b> ${escapeHtml(r.fecha || '—')} ${escapeHtml(r.hora || '')} por ${escapeHtml(r.nombre || '—')}</div>
      ${buildPhotoBlock(r.linkFotoCuen, 'Foto CUEN', r.nombreUA)}
      ${buildPhotoBlock(r.linkFotoFachada, 'Foto fachada', r.nombreUA)}
      ${isAdminMode ? `
        <div class="p-actions">
          <button class="p-edit-btn" onclick="event.stopPropagation(); enterEditMode('${r.id.replace(/'/g, "\\'")}')">✏️ Editar</button>
        </div>` : ''}
    </div>`;
}

function buildPhotoBlock(url, label, nombreUA){
  if(!url){
    return `<div class="p-row" style="opacity:0.6;">${escapeHtml(label)}: sin registrar</div>`;
  }
  return `
    <div class="p-row"><b>${escapeHtml(label)}:</b></div>
    <a href="${url}" target="_blank" rel="noopener" class="p-photo-link">
      <img src="${url}" alt="${escapeHtml(label)} de ${escapeHtml(nombreUA)}" class="p-thumb"
           onerror="this.closest('.p-photo-link').innerHTML='<span class=&quot;p-row&quot;>Ver foto →</span>'">
    </a>`;
}

const MARKER_LABEL_MIN_ZOOM = 10;

function updateMarkerLabelVisibility(){
  const show = map.getZoom() >= MARKER_LABEL_MIN_ZOOM;
  Object.values(markersById).forEach(m => {
    const tooltip = m.getTooltip();
    if(tooltip) tooltip.setOpacity(show ? 1 : 0);
  });
}
map.on('zoomend', updateMarkerLabelVisibility);

function setActive(id, flyTo){
  activeId = id;
  render();
  const rec = allRecords.find(r => r.id === id);
  if(rec && rec.loc && flyTo){
    map.flyTo([rec.loc.lat, rec.loc.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }
  const marker = markersById[id];
  if(marker) marker.openPopup();
  const el = document.querySelector(`.record[data-id="${CSS.escape(id)}"]`);
  if(el) el.scrollIntoView({ block:'nearest' });
}
