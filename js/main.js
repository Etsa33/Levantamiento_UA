/* ============================================================
   MAIN.JS
   Conecta los eventos de la interfaz (filtros, búsqueda, botón
   de refrescar) y arranca la aplicación. Este archivo se carga
   al final, cuando todo lo demás ya está definido.
   ============================================================ */

document.getElementById('search').addEventListener('input', render);

['f-estado','f-tipo','f-servicio'].forEach(id =>
  document.getElementById(id).addEventListener('change', render)
);

document.getElementById('f-canton').addEventListener('change', () => {
  refreshCantonStyles(); // mantiene el mapa sincronizado si el cantón se elige desde el desplegable
  render();
});

document.getElementById('f-provincia').addEventListener('change', (e) => {
  const val = e.target.value;
  selectProvince(val ? { label: val, norm: normalizeName(val) } : null);
  refreshCantonStyles();
});

document.getElementById('refresh-btn').addEventListener('click', loadData);

document.getElementById('export-filtered').addEventListener('click', () => {
  exportToExcel(getFiltered(), 'unidades_atencion_filtro');
});
document.getElementById('export-all').addEventListener('click', () => {
  exportToExcel(allRecords, 'unidades_atencion_completo');
});

document.getElementById('ai-btn').addEventListener('click', runAnomalyDetector);



/* ---------------- INIT ---------------- */
loadProvincesGeo();
loadCantonesGeo();
loadData();
setInterval(loadData, REFRESH_MS);
