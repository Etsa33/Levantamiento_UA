/* ============================================================
   MAP-INIT.JS
   Crea el mapa Leaflet, el tile layer (mapa base) y los grupos
   de capas donde luego se dibujan los polígonos y los puntos.
   ============================================================ */

const map = L.map('map', { zoomControl:false, attributionControl:true }).setView([-1.5, -78.4], 6.3);
L.control.zoom({ position:'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

const provinceLayer = L.layerGroup().addTo(map); // aquí se dibuja el polígono de provincias
const markerLayer = L.layerGroup().addTo(map);   // aquí se dibujan los puntos del formulario

// Cuando actives cantones/parroquias, agrega aquí su propio layer group, ej:
//   const cantonLayer = L.layerGroup().addTo(map);
