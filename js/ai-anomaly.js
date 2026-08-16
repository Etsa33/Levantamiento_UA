/* ============================================================
   AI-ANOMALY.JS
   Funcionalidad de Inteligencia Artificial (Requisito 9), pensada
   para un problema real de este tipo de levantamiento en campo:
   un brigadista puede anotar mal las coordenadas GPS de una UA
   (typo, punto decimal corrido, dispositivo sin señal, etc.).

   Técnica: detección de anomalías no supervisada por z-score.
   Para cada provincia:
     1. Se calcula el centroide (promedio de lat/lon) de sus puntos.
     2. Se mide la distancia (haversine, en km) de cada punto al
        centroide de su provincia.
     3. Se calcula la media y desviación estándar de esas distancias.
     4. Se marca como "atípico" cualquier punto cuya distancia se
        aleje más de 2 desviaciones estándar de la media del grupo
        (o esté a más de 40 km, para provincias con muy pocos puntos
        donde la desviación estándar no es confiable).

   Esto NO necesita ninguna API externa: es aprendizaje automático
   no supervisado simple, corriendo 100% en el navegador.
   ============================================================ */

function haversineKm(a, b){
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLon = (b.lng - a.lng) * Math.PI/180;
  const lat1 = a.lat * Math.PI/180, lat2 = b.lat * Math.PI/180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeAnomalies(records){
  const withLoc = records.filter(r => r.loc);
  const byProvince = {};
  withLoc.forEach(r => {
    const key = normalizeName(r.provincia) || 'SIN_PROVINCIA';
    (byProvince[key] = byProvince[key] || []).push(r);
  });

  const anomalies = [];
  Object.values(byProvince).forEach(group => {
    if(group.length < 3) return; // muy pocos puntos para que la estadística tenga sentido

    const centroid = {
      lat: group.reduce((s,r) => s + r.loc.lat, 0) / group.length,
      lng: group.reduce((s,r) => s + r.loc.lng, 0) / group.length,
    };
    const distances = group.map(r => haversineKm(r.loc, centroid));
    const mean = distances.reduce((a,b) => a+b, 0) / distances.length;
    const variance = distances.reduce((s,d) => s + (d-mean)**2, 0) / distances.length;
    const std = Math.sqrt(variance);
    const threshold = Math.max(mean + 2*std, 40); // al menos 40km, para no marcar todo en grupos muy compactos

    group.forEach((r, i) => {
      if(distances[i] > threshold){
        anomalies.push({ record: r, distanceKm: distances[i], provinceMeanKm: mean });
      }
    });
  });

  return anomalies.sort((a,b) => b.distanceKm - a.distanceKm);
}

function runAnomalyDetector(){
  const anomalies = computeAnomalies(allRecords);
  renderAnomalyPanel(anomalies);
  highlightAnomalies(anomalies);
}

function highlightAnomalies(anomalies){
  const flaggedIds = new Set(anomalies.map(a => a.record.id));
  Object.entries(markersById).forEach(([id, marker]) => {
    const el = marker.getElement();
    if(!el) return;
    el.style.outline = flaggedIds.has(id) ? '2px dashed #d5604f' : '';
    el.style.outlineOffset = flaggedIds.has(id) ? '3px' : '';
  });
}

function renderAnomalyPanel(anomalies){
  const panel = document.getElementById('anomaly-panel');
  const body = document.getElementById('anomaly-body');
  panel.classList.remove('hidden');

  if(anomalies.length === 0){
    body.innerHTML = '<div class="sel-empty">No se detectaron ubicaciones atípicas con los datos actuales. ✔</div>';
    return;
  }

  body.innerHTML = `
    <div class="sel-count">${anomalies.length} posible${anomalies.length===1?'':'s'} error${anomalies.length===1?'':'es'} de georreferenciación</div>
    <div class="sel-list">
      ${anomalies.slice(0, 30).map(a => `
        <div class="sel-item anomaly-item" data-id="${escapeHtml(a.record.id)}">
          <div>${escapeHtml(a.record.nombreUA)} <span class="mono">· ${escapeHtml(a.record.provincia)}</span></div>
          <div class="anomaly-detail">≈${a.distanceKm.toFixed(0)} km del resto de su provincia (promedio: ${a.provinceMeanKm.toFixed(0)} km)</div>
        </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('.anomaly-item').forEach(el => {
    el.addEventListener('click', () => setActive(el.dataset.id, true));
  });
}

function closeAnomalyPanel(){
  document.getElementById('anomaly-panel').classList.add('hidden');
  Object.values(markersById).forEach(marker => {
    const el = marker.getElement();
    if(el){ el.style.outline = ''; el.style.outlineOffset = ''; }
  });
}
