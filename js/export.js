/* ============================================================
   EXPORT.JS
   Descarga de la información en Excel (.xlsx), ya sea la base
   completa o solo lo que quedó visible después de aplicar los
   filtros (Requisito 3: la consulta también se puede exportar).
   Usa SheetJS (cargado en index.html).
   ============================================================ */

// Convierte un registro interno a un objeto "plano" con encabezados
// legibles, listo para volcarse a una hoja de Excel.
function recordToExcelRow(r){
  return {
    'ID': r.id,
    'Nombres y Apellidos': r.nombre,
    'Cargo': r.cargo,
    'Fecha': r.fecha,
    'Hora': r.hora,
    'Nombre UA': r.nombreUA,
    'Código UA': r.codigoUA,
    'Estado UA': r.estado,
    'Tipo UA': r.tipo,
    'Servicio UA': r.servicio,
    'Modalidad UA': r.modalidad,
    'Provincia': r.provincia,
    'Cantón': r.canton,
    'Parroquia': r.parroquia,
    'Zona': r.zona,
    'Distrito': r.distrito,
    'Calle 1': r.calle1,
    'Calle 2': r.calle2,
    'Número Casa': r.numero,
    'Referencia': r.referencia,
    'Latitud': r.loc ? r.loc.lat : '',
    'Longitud': r.loc ? r.loc.lng : '',
    'Link Foto CUEN': r.linkFotoCuen,
    'Link Foto Fachada': r.linkFotoFachada,
  };
}

function exportToExcel(records, filenamePrefix){
  if(!records.length){
    alert('No hay registros para exportar con los filtros actuales.');
    return;
  }
  const rows = records.map(recordToExcelRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(12, k.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unidades de Atención');

  const stamp = new Date().toISOString().slice(0,16).replace('T', '_').replace(':', 'h');
  XLSX.writeFile(workbook, `${filenamePrefix}_${stamp}.xlsx`);
}
