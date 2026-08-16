/* ============================================================
   GEOPROCESS.JS
   Herramienta de análisis espacial (Requisito 7): el usuario
   dibuja un polígono sobre el mapa y el geoportal calcula qué
   puntos levantados caen dentro, usando un test punto-en-polígono
   (ray casting) — un geoproceso real, no una simulación visual.
   ============================================================ */

const selectionLayer = L.featureGroup().addTo(map);
let lastSelectedRecords = [];

// Algoritmo estándar de ray casting: cuenta cuántas veces un rayo horizontal
// desde el punto cruza los bordes del polígono. Si cruza un número impar de
// veces, el punto está dentro.
function pointInPolygon(point, vs){
  const [x, y] = point;
  let inside = false;
  for(let i = 0, j = vs.length - 1; i < vs.length; j = i++){
    const [xi, yi] = vs[i];
    const [xj, yj] = vs[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if(intersect) inside = !inside;
  }
  return inside;
}

const drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    polygon: { shapeOptions: { color: '#e6a13c', weight: 2, fillOpacity: 0.08 } },
    polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false
  },
  edit: { featureGroup: selectionLayer, remove: false }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, (e) => {
  selectionLayer.clearLayers();
  selectionLayer.addLayer(e.layer);
  runPolygonSelection(e.layer);
});

function runPolygonSelection(polygonLayer){
  const ring = polygonLayer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
  const candidates = getFiltered().filter(r => r.loc); // geoproceso sobre lo que ya está filtrado
  const selected = candidates.filter(r => pointInPolygon([r.loc.lng, r.loc.lat], ring));
  lastSelectedRecords = selected;
  highlightSelection(selected);
  renderSelectionPanel(selected);
}

function highlightSelection(selected){
  const selectedIds = new Set(selected.map(r => r.id));
  Object.entries(markersById).forEach(([id, marker]) => {
    const el = marker.getElement();
    if(!el) return;
    el.style.filter = selectedIds.has(id) ? 'drop-shadow(0 0 6px #e6a13c)' : 'opacity(0.25)';
  });
}

function clearSelection(){
  selectionLayer.clearLayers();
  lastSelectedRecords = [];
  Object.values(markersById).forEach(marker => {
    const el = marker.getElement();
    if(el) el.style.filter = '';
  });
  document.getElementById('selection-panel').classList.add('hidden');
}

function renderSelectionPanel(selected){
  const panel = document.getElementById('selection-panel');
  const body = document.getElementById('selection-body');
  panel.classList.remove('hidden');
  if(selected.length === 0){
    body.innerHTML = '<div class="sel-empty">Ningún punto cayó dentro del polígono dibujado.</div>';
    return;
  }
  body.innerHTML = `
    <div class="sel-count">${selected.length} unidad${selected.length===1?'':'es'} dentro del polígono</div>
    <div class="sel-list">
      ${selected.slice(0, 40).map(r => `<div class="sel-item">${escapeHtml(r.nombreUA)} <span class="mono">· ${escapeHtml(r.codigoUA||'')}</span></div>`).join('')}
      ${selected.length > 40 ? `<div class="sel-item" style="opacity:.6">…y ${selected.length-40} más</div>` : ''}
    </div>
    <button id="selection-export">⬇ Descargar esta selección (Excel)</button>
  `;
  document.getElementById('selection-export').addEventListener('click', () => {
    exportToExcel(selected, 'seleccion_poligono');
  });
}
