/* ============================================================
   CANTONS-LAYER.JS
   Dibuja los límites de cantón (tabla cantones_25 en PostgreSQL,
   importada con QGIS) — pero SOLO los del cantón de la provincia
   actualmente seleccionada. A nivel nacional (sin provincia elegida)
   esta capa está vacía; solo se ven los polígonos de provincia, para
   que el usuario pueda hacer clic y elegir una.

   Reutiliza el filtro "Cantón" (#f-canton) y "Provincia" (#f-provincia)
   que ya existen en la interfaz, en vez de un mecanismo aparte.

   No se usa lista canónica fija (como en provincias): los nombres
   vienen directo de la tabla oficial (dpa_descan / dpa_despro), y
   cada cantón se identifica combinando su nombre CON el de su
   provincia, porque el nombre de un cantón por sí solo no siempre
   es único en el país.
   ============================================================ */

let cantonGeoLayer = null;        // instancia L.geoJson con TODOS los cantones (no se muestra directo)
const cantonLayer = L.layerGroup().addTo(map); // solo contiene los cantones visibles en cada momento

const cantonBaseStyle     = { color: 'rgba(232,242,240,0.35)', weight: 1, fillColor: '#4fb3d9', fillOpacity: 0.02 };
const cantonHoverStyle    = { color: '#4fb3d9', weight: 2, fillOpacity: 0.12 };
const cantonSelectedStyle = { color: '#4fb3d9', weight: 2.5, fillOpacity: 0.18 };

function cantonKey(cantonName, provinciaName){
  return normalizeName(cantonName) + '|' + normalizeName(provinciaName);
}

// Compara el cantón del feature contra lo elegido en los desplegables
// de Provincia + Cantón (fuente de verdad de la selección).
function isCantonSelected(feature){
  const provSel = document.getElementById('f-provincia').value;
  const cantSel = document.getElementById('f-canton').value;
  if(!provSel || !cantSel) return false;
  return cantonKey(cantSel, provSel) === cantonKey(feature.properties.dpa_descan, feature.properties.dpa_despro);
}

function styleForCanton(feature){
  return isCantonSelected(feature) ? { ...cantonBaseStyle, ...cantonSelectedStyle } : cantonBaseStyle;
}

function refreshCantonStyles(){
  cantonLayer.eachLayer(layer => layer.setStyle(styleForCanton(layer.feature)));
}

// Decide qué cantones se muestran: ninguno si no hay provincia elegida,
// o solo los de la provincia activa.
function refreshCantonVisibility(){
  if(!cantonGeoLayer) return;
  cantonLayer.clearLayers();
  if(!selectedProvinceNorm) return; // vista nacional: solo se ven las provincias
  cantonGeoLayer.eachLayer(layer => {
    if(normalizeName(layer.feature.properties.dpa_despro) === selectedProvinceNorm){
      cantonLayer.addLayer(layer);
    }
  });
  refreshCantonStyles();
}

function loadCantonesGeo(){
  // Si hay PostgreSQL (XAMPP local), usa tu tabla en vivo vía PHP.
  // Si no (ej. GitHub Pages), usa el archivo geojson/cantones.geojson fijo.
  const url = (DATA_SOURCE === 'php') ? PHP_GET_CANTONES_URL : CANTONS_GEOJSON_URL;

  fetch(url)
    .then(res => res.json())
    .then(geo => {
      const totalFeatures = (geo.features || []).length;
      // OJO: no se hace .addTo(map) aquí — se arma la capa completa "en memoria"
      // y refreshCantonVisibility() decide cuáles polígonos se muestran.
      cantonGeoLayer = L.geoJSON(geo, {
        filter: hasValidGeometry,
        style: styleForCanton,
        onEachFeature: (feature, layer) => {
          const label = `${feature.properties.dpa_descan} · ${feature.properties.dpa_despro}`;
          layer.bindTooltip(label, { sticky: true, className: 'province-tooltip' });

          layer.on({
            mouseover: () => { if(!isCantonSelected(feature)) layer.setStyle(cantonHoverStyle); },
            mouseout: () => refreshCantonStyles(),
            click: () => {
              if(isCantonSelected(feature)){
                clearCantonSelection();
              } else {
                selectCanton(feature.properties.dpa_descan, feature.properties.dpa_despro);
                map.fitBounds(layer.getBounds(), { padding: [40, 40] });
              }
            }
          });
        }
      });
      const loaded = cantonGeoLayer.getLayers().length;
      if(loaded < totalFeatures){
        console.warn(`Cantones: se cargaron ${loaded}/${totalFeatures} (features con geometría inválida descartadas).`);
      }
      refreshCantonVisibility(); // por defecto no hay provincia elegida, así que no se muestra ninguno
    })
    .catch(err => console.error('No se pudo cargar el geojson de cantones:', err));
}

function selectCanton(cantonName, provinciaName){
  // Fija la provincia primero: esto refresca el <select> de cantón y la
  // visibilidad de esta capa (populateCantonSelect + refreshCantonVisibility,
  // ambos ya enganchados dentro de selectProvince).
  selectProvince({ label: provinciaName, norm: normalizeName(provinciaName) });

  const sel = document.getElementById('f-canton');
  let opt = [...sel.options].find(o => o.value && normalizeName(o.value) === normalizeName(cantonName));
  if(!opt){
    opt = document.createElement('option');
    opt.value = cantonName;
    opt.textContent = cantonName + ' (sin registros)';
    sel.appendChild(opt);
  }
  sel.value = opt.value;

  refreshCantonStyles();
  render();
}

function clearCantonSelection(){
  document.getElementById('f-canton').value = '';
  refreshCantonStyles();
  render();
}
