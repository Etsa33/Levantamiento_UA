/* ============================================================
   PROVINCES-LAYER.JS
   Dibuja los límites de provincias sobre el mapa, permite hacer
   clic en un polígono para filtrar el geovisor por esa provincia,
   y mantiene el <select> de provincia sincronizado con el mapa.

   ESTA ES LA PLANTILLA A COPIAR si más adelante quieres agregar
   una capa de cantones o parroquias (ver la nota en config.js).
   ============================================================ */

const CANONICAL_PROVINCES = PROVINCE_LABELS.map(label => ({ label, norm: normalizeName(label) }));

// Busca, entre todas las propiedades del feature del GeoJSON, cuál coincide
// con el nombre de una provincia conocida (sin importar el nombre exacto
// de la columna en el GeoJSON: DPA_DESPRO, name, NOMBRE, etc.)
function findCanonicalProvince(properties){
  for(const val of Object.values(properties || {})){
    if(typeof val !== 'string') continue;
    const n = normalizeName(val);
    const hit = CANONICAL_PROVINCES.find(p => p.norm === n);
    if(hit) return hit;
  }
  return null;
}

let provinceGeoLayer = null; // instancia L.geoJson ya cargada

const provinceBaseStyle     = { color: 'rgba(232,242,240,0.35)', weight: 1, fillColor: '#e6a13c', fillOpacity: 0.02 };
const provinceHoverStyle    = { color: '#e6a13c', weight: 2, fillOpacity: 0.10 };
const provinceSelectedStyle = { color: '#e6a13c', weight: 2.5, fillOpacity: 0.16 };

function styleForProvince(feature){
  const isSelected = feature._canonical && selectedProvinceNorm === feature._canonical.norm;
  return isSelected ? { ...provinceBaseStyle, ...provinceSelectedStyle } : provinceBaseStyle;
}

function refreshProvinceStyles(){
  if(!provinceGeoLayer) return;
  provinceGeoLayer.eachLayer(layer => {
    layer.setStyle(styleForProvince(layer.feature));
    const c = layer.feature._canonical;
    const label = c ? c.label : (layer.feature._fallbackLabel || 'Provincia');
    if(layer.getTooltip()) layer.setTooltipContent(label.toUpperCase());
  });
}

// Valida recursivamente que todas las coordenadas de una geometría sean
// números finitos, para descartar features corruptas del GeoJSON público
// sin que rompan la carga de todo el resto de provincias.
function hasValidCoordinates(coords){
  if(Array.isArray(coords)) return coords.every(hasValidCoordinates);
  return typeof coords === 'number' && isFinite(coords);
}
function hasValidGeometry(feature){
  return !!(feature && feature.geometry && feature.geometry.coordinates &&
    hasValidCoordinates(feature.geometry.coordinates));
}

function loadProvincesGeo(){
  // Si el geovisor está en modo PostgreSQL, usa tu propia tabla provincias_25
  // (importada con QGIS) en vez del GeoJSON público externo — es más confiable
  // y además cumple con usar la base de datos real del curso.
  const url = (DATA_SOURCE === 'php') ? PHP_GET_PROVINCIAS_URL : PROVINCES_GEOJSON_URL;

  fetch(url)
    .then(res => res.json())
    .then(geo => {
      const totalFeatures = (geo.features || []).length;
      provinceGeoLayer = L.geoJSON(geo, {
        filter: hasValidGeometry, // descarta features con coordenadas rotas en vez de tronar
        style: styleForProvince,
        onEachFeature: (feature, layer) => {
          feature._canonical = findCanonicalProvince(feature.properties);
          feature._fallbackLabel = feature.properties && (feature.properties.name || feature.properties.NAME) || 'Provincia';
          const label = feature._canonical ? feature._canonical.label : feature._fallbackLabel;
          layer.bindTooltip(label, {
            permanent: true, direction: 'center', className: 'province-label', interactive: false
          });
          layer.on({
            mouseover: () => { if(!(feature._canonical && selectedProvinceNorm === feature._canonical.norm)) layer.setStyle(provinceHoverStyle); },
            mouseout: () => refreshProvinceStyles(),
            click: () => {
              if(!feature._canonical){ return; } // polígono sin nombre reconocible, no se puede filtrar
              selectProvince(feature._canonical);
              map.fitBounds(layer.getBounds(), { padding: [40, 40] });
            }
          });
        }
      }).addTo(provinceLayer);
      const loaded = provinceGeoLayer.getLayers().length;
      if(loaded < totalFeatures){
        console.warn(`Provincias: se cargaron ${loaded}/${totalFeatures} (se descartaron features con coordenadas inválidas del GeoJSON público).`);
      }
      refreshProvinceStyles();
    })
    .catch(err => console.error('No se pudo cargar el geojson de provincias:', err));
}

function selectProvince(canonical){
  // canonical: { label, norm } o null para limpiar el filtro
  selectedProvinceNorm = canonical ? canonical.norm : null;

  const sel = document.getElementById('f-provincia');
  if(!canonical){
    sel.value = '';
  } else {
    let opt = [...sel.options].find(o => o.value && normalizeName(o.value) === canonical.norm);
    if(!opt){
      opt = document.createElement('option');
      opt.value = canonical.label;
      opt.textContent = canonical.label + ' (sin registros)';
      sel.appendChild(opt);
    }
    sel.value = opt.value;
  }

  populateCantonSelect(); // el cantón depende de la provincia: se refresca siempre que ésta cambia
  if(typeof refreshCantonVisibility === 'function') refreshCantonVisibility();
  refreshProvinceStyles();
  render();
}
