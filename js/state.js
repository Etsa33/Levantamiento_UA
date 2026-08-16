/* ============================================================
   STATE.JS
   Variables de estado compartidas entre módulos. Todo lo que
   cambia mientras el usuario interactúa (filtros, selección,
   datos cargados) vive aquí, en un solo lugar.
   ============================================================ */

let allRecords = [];        // todos los registros del Sheet, ya parseados
let markersById = {};       // marcadores del mapa, indexados por id de registro
let activeId = null;        // id del registro seleccionado (clic en la lista o el mapa)

let selectedProvinceNorm = null; // provincia activa (nombre normalizado) o null = todas
let provinceCounts = {};         // { NORM_PROVINCIA: cantidad de registros }
let isAdminMode = false;         // false = solo consulta. true = se puede editar (ver config.js -> ADMIN_PASSWORD)

// Cuando actives cantones/parroquias (ver config.js), agrega aquí su propio
// estado siguiendo el mismo patrón, ej:
//   let selectedCantonNorm = null;
//   let cantonCounts = {};
