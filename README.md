# Geovisor · Unidades de Atención

Geovisor en vivo que lee directo del Google Sheet del formulario de
levantamiento y lo muestra en un mapa con filtros, totales por zona,
y polígonos de provincia clicables.

## Estructura del proyecto

```
geovisor/
├── index.html              → estructura de la página
├── css/
│   └── styles.css          → todo el estilo visual (tema oscuro)
├── js/
│   ├── config.js            → EDITA AQUÍ: Sheet, fuente de datos, URLs de capas
│   ├── utils.js              → funciones genéricas (normalizar nombres, colores, etc.)
│   ├── state.js               → variables de estado compartidas
│   ├── map-init.js            → creación del mapa Leaflet
│   ├── provinces-layer.js      → capa de provincias (plantilla para cantones/parroquias)
│   ├── data.js                  → descarga y parseo de datos (Sheet o PostgreSQL)
│   ├── ui.js                     → filtros, lista, popups, mapa, etiquetado
│   ├── edit.js                    → módulo de edición de datos vectoriales (Requisito 8)
│   ├── export.js                   → descarga a Excel (Requisito 3)
│   ├── geoprocess.js                → selección por polígono (Requisito 7)
│   ├── ai-anomaly.js                 → detector de anomalías con IA (Requisito 9)
│   └── main.js                        → eventos + arranque de la app
├── sql/
│   ├── setup_postgis.sql     → esquema de la tabla en PostgreSQL/PostGIS
│   └── GUIA_postgis_shapefile.md → guía paso a paso (Windows) Sheet → Postgres → Shapefile → QGIS
├── scripts/
│   └── sync_sheet_to_postgis.py → script Python que sincroniza el Sheet con PostgreSQL
└── php/
    ├── config.php            → credenciales de conexión a PostgreSQL
    ├── get_data.php           → endpoint de LECTURA: sirve la tabla PostGIS como GeoJSON
    └── update_data.php         → endpoint de ESCRITURA: guarda ediciones (UPDATE real)
```

## Cómo cumplir el requisito de "conexión funcional con lectura y escritura"

Por defecto el geovisor lee directo del Google Sheet (`DATA_SOURCE = 'sheet'`
en `js/config.js`), que es de solo lectura. Para la sustentación del trabajo,
necesitas cambiar a la base de datos real:

1. Corre `scripts/sync_sheet_to_postgis.py` (ver `sql/GUIA_postgis_shapefile.md`)
   al menos una vez para llenar la tabla `unidades_atencion` en PostgreSQL.
2. Habilita la extensión `pdo_pgsql` en XAMPP (`php.ini`, ver comentarios en
   `php/config.php`) y ajusta tu usuario/contraseña de Postgres ahí mismo.
3. En `js/config.js`, cambia:
   ```js
   const DATA_SOURCE = 'php';
   ```
4. Recarga el geovisor desde `http://localhost/geovisor/` (necesita Apache
   corriendo). Ahora cada carga hace una consulta real a PostgreSQL
   (`php/get_data.php`), y el botón "✏️ Editar" en cada punto guarda cambios
   con un `UPDATE` real (`php/update_data.php`).

## Funcionalidades agregadas

- **Descargar en Excel** (Requisito 3): dos botones en el panel de filtros,
  uno exporta solo lo que está visible según los filtros activos, el otro
  exporta la base completa. Genera un `.xlsx` real con SheetJS, sin backend.
- **Etiquetado visible** (Requisito 6): el nombre de cada provincia queda
  siempre visible sobre el mapa (con el conteo de registros), y el código de
  cada punto se muestra permanentemente junto al marcador a partir de cierto
  zoom (para no saturar la vista de todo el país).
- **Selección por polígono** (Requisito 7): herramienta de dibujo (arriba a
  la derecha del mapa) para trazar un polígono; el geoportal calcula qué
  puntos caen dentro (punto-en-polígono, ray casting) sobre el conjunto ya
  filtrado, los resalta, y permite exportar solo esa selección a Excel.
- **Edición de datos vectoriales** (Requisito 8): **desactivada para todos por
  defecto** — el geovisor es de solo consulta para quien lo abra, incluidos
  los técnicos que levantan información en territorio. Solo aparece si
  alguien hace clic en "🔒 Admin" (arriba a la derecha) e ingresa la
  contraseña definida en `js/config.js` (`ADMIN_PASSWORD`, cámbiala antes de
  usar el geovisor de verdad). Una vez activo el modo administrador, aparece
  el botón "✏️ Editar" en cada punto: permite arrastrar el marcador para
  corregir su ubicación y cambiar Estado/Referencia, guardando con un
  `UPDATE` real en PostgreSQL. Solo funciona con `DATA_SOURCE = 'php'`.

  **Nota de seguridad honesta:** esta contraseña vive en un archivo
  JavaScript que llega al navegador, así que es una traba de uso (evita
  ediciones accidentales o de alguien que no sabía que existía la opción),
  no un control de acceso real — alguien con conocimientos técnicos podría
  revisar el código fuente y encontrarla. Si vas a dar este geoportal a
  técnicos de campo, es suficiente para tu caso (ellos no tienen por qué
  andar inspeccionando el código). Si necesitas una barrera más fuerte
  (usuarios con contraseña individual, registro de quién editó qué), eso
  requiere autenticación real en el backend PHP — avísame si llegas a
  necesitarlo y lo armamos.
- **Detector de anomalías con IA** (Requisito 9): botón "🤖 IA: anomalías"
  en la barra superior. Agrupa los puntos por provincia, calcula su
  centroide, y marca como atípico cualquier punto que se aleje
  estadísticamente del resto de su provincia (posible error de GPS en
  campo). Es aprendizaje no supervisado simple (z-score sobre distancias
  haversine), corre 100% en el navegador, sin API externa ni costos.

## ¿Qué archivo edito según lo que quiera cambiar?

| Quiero... | Edito... |
|---|---|
| Cambiar el Google Sheet de origen | `js/config.js` |
| Cambiar colores, tipografía, tamaños | `css/styles.css` |
| Cambiar qué columnas se muestran en la lista o el popup | `js/ui.js` |
| Agregar una capa de cantones o parroquias | `js/config.js` (URL) + copiar el patrón de `js/provinces-layer.js` |
| Guardar los datos en PostgreSQL / exportar a Shapefile | `sql/`, `scripts/` |
| Servir los datos desde PostgreSQL en vez del Sheet (solo en servidor con PHP) | `php/` |

## Cómo probarlo en tu equipo (con XAMPP)

Como el geovisor hace `fetch()` al Google Sheet, **no funciona bien si
solo abres `index.html` con doble clic** (muchos navegadores bloquean
peticiones así desde `file://`). Como ya tienes XAMPP instalado, es el
lugar más simple para probarlo:

1. Copia toda la carpeta `geovisor/` dentro de `C:\xampp\htdocs\`.
2. Inicia Apache desde el panel de control de XAMPP (no hace falta MySQL para esto).
3. Abre en el navegador: `http://localhost/geovisor/`

Con eso ya deberías ver el geovisor funcionando igual que en GitHub Pages.

## Cómo publicarlo en GitHub Pages

1. Sube toda la carpeta `geovisor/` (o su contenido) a tu repositorio.
2. En Settings → Pages, activa GitHub Pages apuntando a la raíz.
3. La URL te la muestra la propia página de Settings → Pages una vez publicado.

**Nota:** la carpeta `php/` no funcionará en GitHub Pages (es hosting
estático, no ejecuta PHP). Eso está bien — el geovisor no la necesita
para funcionar, solo la usarías si más adelante decides servir los
datos desde tu propia base de datos en un servidor con PHP.

## Cómo agregar cantones o parroquias más adelante

1. Consigue un GeoJSON de cantones/parroquias del Ecuador (por ejemplo
   del mismo repositorio que usamos para provincias, o exportado por ti
   mismo desde QGIS/PostGIS: **Capa → Exportar → Guardar objetos como…
   → formato GeoJSON**).
2. Pon la URL (o ruta local, ej. `geojson/cantones.geojson`) en
   `js/config.js`, en `CANTONS_GEOJSON_URL`.
3. Duplica `js/provinces-layer.js` como `js/cantons-layer.js`, y
   ajústalo:
   - Los nombres de cantón no siempre son únicos en el país, así que
     conviene identificar el polígono comparando **cantón + provincia**
     juntos, no solo el nombre del cantón.
   - Cambia todas las referencias de "provincia" por "canton"
     (`selectedProvinceNorm` → `selectedCantonNorm`, etc.).
4. Agrega el nuevo `<script src="js/cantons-layer.js"></script>` en
   `index.html`, después de `provinces-layer.js`.
5. Agrega el filtro correspondiente en `getFiltered()` (en `js/ui.js`).

El mismo patrón sirve para parroquias.
