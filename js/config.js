/* ============================================================
   CONFIG.JS
   Todo lo que normalmente cambia (Sheet, capas geográficas,
   tiempos de refresco) vive aquí. Edita este archivo primero
   cuando quieras ajustar el geovisor.
   ============================================================ */

/* ---------- Google Sheet (fuente de datos) ---------- */
const SHEET_ID = "1gE6LaFEWhr5Z97YGMl28SIQTvQb-Fu9jmcwLK_Kg03o";
const SHEET_NAME = "Public Form";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&_ts=`;
const REFRESH_MS = 60000; // cada cuánto se refresca solo (ms). 60000 = 1 minuto.

/* ---------- Fuente de datos: Google Sheet directo vs PostgreSQL (vía PHP) ----------
   'sheet' -> lee el CSV publicado del Google Sheet directo en el navegador.
              Simple, funciona en GitHub Pages, pero es SOLO LECTURA.
   'php'   -> lee/escribe contra la tabla PostgreSQL/PostGIS a través de los
              endpoints en /php. Necesita XAMPP + PostgreSQL corriendo, y
              habilita el módulo de edición (mover un punto, cambiar estado).
   Para cumplir el requisito de "conexión funcional con operaciones reales de
   consulta y escritura", usa 'php' cuando sustentes el trabajo. Antes de eso,
   corre scripts/sync_sheet_to_postgis.py al menos una vez para llenar la tabla. */
const DATA_SOURCE = 'sheet'; // cámbialo a 'php' cuando tengas Postgres + XAMPP listos

const PHP_GET_DATA_URL = 'php/get_data.php';
const PHP_UPDATE_DATA_URL = 'php/update_data.php';
const PHP_GET_PROVINCIAS_URL = 'php/get_provincias.php'; // provincias_25, importada desde shapefile con QGIS
const PHP_GET_CANTONES_URL = 'php/get_cantones.php';      // cantones_25, importada desde shapefile con QGIS

/* ---------- Modo administrador (edición protegida) ----------
   Por defecto NADIE ve el botón "Editar" en el geovisor: los técnicos
   que levantan información en campo solo pueden CONSULTAR, nunca
   modificar lo ya levantado. La edición (mover un punto, cambiar su
   estado) solo aparece si alguien activa el "🔒 Modo administrador"
   con esta contraseña.

   IMPORTANTE — esto es una traba de uso, no seguridad real: como la
   contraseña vive en un archivo JavaScript, cualquiera que sepa
   revisar el código fuente de la página podría encontrarla. Sirve
   para evitar que alguien edite por accidente o sin saber que existe
   esa opción, pero NO reemplaza un control de acceso real (usuario y
   sesión en el servidor). Si necesitas eso, dímelo y lo pasamos al
   backend PHP (que sí puede validar sin exponer nada al navegador). */
const ADMIN_PASSWORD = '1720166469';

/* ---------- Capa de PROVINCIAS (ya activa) ---------- */
// Límites de provincias del Ecuador (GeoJSON público, equivalente al shapefile)
const PROVINCES_GEOJSON_URL = "https://raw.githubusercontent.com/pabl-o-ce/Ecuador-geoJSON/master/geojson/provinces.geojson";

const PROVINCE_LABELS = [
  'Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas',
  'Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo',
  'Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas',
  'Sucumbíos','Tungurahua','Zamora Chinchipe'
];

/* ---------- Capas futuras: CANTONES / PARROQUIAS ----------
   Todavía no están activas. Para agregarlas más adelante:

   1. Consigue un GeoJSON de cantones o parroquias del Ecuador
      (por ejemplo, del mismo repo que usamos para provincias:
      https://github.com/pabl-o-ce/Ecuador-geoJSON, archivo
      "cantons.geojson" o "parishes.geojson"), o expórtalo tú
      mismo desde QGIS/PostGIS a GeoJSON (Capa → Exportar →
      Guardar objetos como… → formato GeoJSON).

   2. Pon aquí la URL (puede ser un link raw de GitHub, o un
      archivo que subas junto a este proyecto, ej:
      "geojson/cantones.geojson"):

         const CANTONS_GEOJSON_URL = "";
         const PARISHES_GEOJSON_URL = "";

   3. Sigue el mismo patrón que ves en js/provinces-layer.js
      (esa es la plantilla a copiar): normalizar el nombre,
      encontrar la propiedad correcta del GeoJSON, dibujar el
      polígono, filtrar al hacer clic. La diferencia importante
      es que los nombres de cantón NO son siempre únicos en
      todo el país, así que conviene comparar cantón + provincia
      juntos al hacer el match, no solo el nombre del cantón.
   ------------------------------------------------------------ */
const CANTONS_GEOJSON_URL = null;   // <- cuando la actives, pon aquí la URL
const PARISHES_GEOJSON_URL = null;  // <- cuando la actives, pon aquí la URL
