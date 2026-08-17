/* ============================================================
   DATA.JS
   Descarga los datos (del Google Sheet o de PostgreSQL vía PHP,
   según DATA_SOURCE en config.js) y los convierte en `allRecords`.
   Se ejecuta al cargar la página y luego cada REFRESH_MS ms.
   ============================================================ */

// Normaliza un registro crudo (fila del CSV o fila de PostgreSQL) a un
// mismo formato interno, sin importar de qué fuente vino.
// Busca una columna del CSV sin importar mayúsculas/minúsculas, espacios o
// guiones bajos exactos (ej. encuentra "Link_Foto_Cuen" o "LINK FOTO CUEN"
// aunque el código pida "LINKFOTOCUEN"). Solo se usa para las fotos, que son
// las columnas que más han cambiado de nombre en el formulario.
function findColumnValue(row, targetName){
  for(const key in row){
    const k = key.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(k === targetName) return row[key] || '';
  }
  return '';
}

function normalizeRecordFromSheetRow(r, i){
  const loc = parseLatLng(r['UBICACIÓN']);
  return {
    id: r['ID'] || ('row-' + i),
    nombre: r['NOMBRES Y APELLIDOS'] || '',
    cargo: r['CARGO'] || '',
    fecha: r['FECHA'] || '',
    hora: r['HORA'] || '',
    nombreUA: r['NOMBRE UA'] || 'Sin nombre',
    codigoUA: r['CÓDIGO UA'] || '',
    estado: r['ESTADO UA'] || '',
    tipo: r['TIPO UA'] || '',
    servicio: r['SERVICIO UA'] || '',
    modalidad: r['MODALIDAD UA'] || '',
    provincia: r['PROVINCIA'] || '',
    canton: r['CANTÓN'] || '',
    parroquia: r['PARROQUIA'] || '',
    zona: r['ZONA'] || '',
    distrito: r['DISTRITO'] || '',
    calle1: r['CALLE 1'] || '',
    calle2: r['CALLE 2'] || '',
    numero: r['NÚMERO CASA'] || '',
    referencia: r['REFERENCIA'] || '',
    linkFotoCuen: findColumnValue(r, 'LINKFOTOCUEN'),
    linkFotoFachada: findColumnValue(r, 'LINKFOTOFACHADA'),
    loc
  };
}

// Igual que arriba, pero para un Feature GeoJSON devuelto por php/get_data.php
function normalizeRecordFromFeature(feature){
  const p = feature.properties || {};
  let loc = null;
  if(feature.geometry && feature.geometry.type === 'Point'){
    const [lng, lat] = feature.geometry.coordinates;
    loc = { lat, lng };
  }
  return {
    id: p.id,
    nombre: p.nombres_y_apellidos || '',
    cargo: p.cargo || '',
    fecha: p.fecha || '',
    hora: p.hora || '',
    nombreUA: p.nombre_ua || 'Sin nombre',
    codigoUA: p.codigo_ua || '',
    estado: p.estado_ua || '',
    tipo: p.tipo_ua || '',
    servicio: p.servicio_ua || '',
    modalidad: p.modalidad_ua || '',
    provincia: p.provincia || '',
    canton: p.canton || '',
    parroquia: p.parroquia || '',
    zona: p.zona || '',
    distrito: p.distrito || '',
    calle1: p.calle_1 || '',
    calle2: p.calle_2 || '',
    numero: p.numero_casa || '',
    referencia: p.referencia || '',
    linkFotoCuen: p.link_foto_cuen || '',
    linkFotoFachada: p.link_foto_fachada || '',
    loc
  };
}

async function fetchFromSheet(){
  const res = await fetch(CSV_URL + Date.now());
  const text = await res.text();
  const parsed = Papa.parse(text, { header:true, skipEmptyLines:true });
  return parsed.data.map(normalizeRecordFromSheetRow)
    .filter(r => r.nombreUA || r.codigoUA || r.loc);
}

async function fetchFromPhp(){
  const res = await fetch(PHP_GET_DATA_URL + '?_ts=' + Date.now());
  if(!res.ok) throw new Error('El endpoint PHP respondió con error ' + res.status);
  const geo = await res.json();
  return (geo.features || []).map(normalizeRecordFromFeature)
    .filter(r => r.nombreUA || r.codigoUA || r.loc);
}

// Rellena el <select> de cantón solo con los cantones que tienen registros
// dentro de la provincia actualmente seleccionada (o todos, si no hay
// provincia elegida). Se llama cada vez que cambian los datos o la provincia.
function populateCantonSelect(){
  const relevant = selectedProvinceNorm
    ? allRecords.filter(r => normalizeName(r.provincia) === selectedProvinceNorm)
    : allRecords;
  const sel = document.getElementById('f-canton');
  sel.options[0].textContent = selectedProvinceNorm ? 'Cantón: todos' : 'Cantón: elige una provincia primero';
  sel.disabled = !selectedProvinceNorm;
  populateSelect('f-canton', new Set(relevant.map(r => r.canton)));
}

async function loadData(){
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  try{
    allRecords = DATA_SOURCE === 'php' ? await fetchFromPhp() : await fetchFromSheet();

    document.getElementById('count-total').textContent = allRecords.length;

    provinceCounts = {};
    allRecords.forEach(r => {
      const n = normalizeName(r.provincia);
      if(n) provinceCounts[n] = (provinceCounts[n] || 0) + 1;
    });
    refreshProvinceStyles();

    populateSelect('f-estado', new Set(allRecords.map(r=>r.estado)));
    populateSelect('f-provincia', new Set(allRecords.map(r=>r.provincia)));
    populateCantonSelect();
    populateSelect('f-tipo', new Set(allRecords.map(r=>r.tipo)));
    populateSelect('f-servicio', new Set(allRecords.map(r=>r.servicio)));

    // si hay una provincia seleccionada desde el mapa, mantenerla visible en el select
    if(selectedProvinceNorm){
      const sel = document.getElementById('f-provincia');
      let opt = [...sel.options].find(o => o.value && normalizeName(o.value) === selectedProvinceNorm);
      if(!opt){
        const label = (CANONICAL_PROVINCES.find(p => p.norm === selectedProvinceNorm) || {}).label || selectedProvinceNorm;
        opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label + ' (sin registros)';
        sel.appendChild(opt);
      }
      sel.value = opt.value;
    }

    render();
    document.getElementById('last-update').textContent =
      'actualizado ' + new Date().toLocaleTimeString('es-EC', {hour:'2-digit', minute:'2-digit'}) +
      (DATA_SOURCE === 'php' ? ' · fuente: PostgreSQL' : ' · fuente: Google Sheet');
  }catch(err){
    console.error(err);
    document.getElementById('last-update').textContent = 'error al actualizar';
  }finally{
    setTimeout(()=>btn.classList.remove('spinning'), 400);
  }
}
