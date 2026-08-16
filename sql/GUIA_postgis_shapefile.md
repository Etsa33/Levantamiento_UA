# Google Sheet → PostgreSQL/PostGIS → Shapefile → QGIS (Windows)

## 1. Prepara la base de datos (una sola vez)

Abre **pgAdmin** (viene con tu instalación de PostgreSQL) y:

1. Crea una base de datos nueva llamada `geovisor` (clic derecho en *Databases* → *Create* → *Database*).
2. Abre el **Query Tool** sobre esa base y ejecuta:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
   Si te da error de que la extensión no existe, es que PostGIS no quedó instalado junto con PostgreSQL — vuelve a correr el instalador (Stack Builder) y agrega el paquete PostGIS para tu versión de Postgres.

## 2. Instala Python y las librerías necesarias

Si no tienes Python, instálalo desde [python.org](https://www.python.org/downloads/) (marca la casilla "Add python.exe to PATH" en el instalador).

Luego, en una consola (CMD o PowerShell):
```
pip install requests pandas psycopg2-binary
```

## 3. Configura y corre el script

Abre `sync_sheet_to_postgis.py` y edita el bloque `PG_CONFIG` con tu usuario/contraseña reales de PostgreSQL (el usuario suele ser `postgres`, la contraseña es la que pusiste al instalar).

Luego corre:
```
python sync_sheet_to_postgis.py
```
Esto crea la tabla `unidades_atencion` en la base `geovisor` (si no existe) y la llena con los datos actuales del Sheet, con una columna `geom` de tipo `geometry(Point, 4326)` — es decir, ya con coordenadas reales usables en cualquier software GIS.

Cada vez que quieras traer los datos más recientes del Sheet, vuelve a correr este mismo comando.

## 4. Exportar a Shapefile

Tienes dos formas, elige la que prefieras:

### Opción A — Desde QGIS (más visual)
1. En QGIS: **Capa → Añadir capa → Añadir capa PostGIS**.
2. Crea una conexión nueva con: host `localhost`, puerto `5432`, base de datos `geovisor`, tu usuario/contraseña.
3. Selecciona la tabla `unidades_atencion` y agrégala al mapa.
4. Clic derecho sobre la capa → **Exportar → Guardar objetos como...** → formato **ESRI Shapefile** → elige la carpeta de destino.

### Opción B — Con ogr2ogr (más rápido, sirve para automatizar)
`ogr2ogr` viene incluido con tu instalación de QGIS. Ábrelo desde la **consola OSGeo4W Shell** (búscala en el menú de inicio, se instala junto con QGIS) y corre:

```
ogr2ogr -f "ESRI Shapefile" C:\ruta\de\salida\unidades_atencion.shp ^
  PG:"host=localhost port=5432 dbname=geovisor user=postgres password=TU_PASSWORD" ^
  -sql "SELECT * FROM unidades_atencion"
```

Esto genera `unidades_atencion.shp` (+ `.dbf`, `.shx`, `.prj`) listo para abrir directo en QGIS con **Capa → Añadir capa → Añadir capa vectorial**.

## 5. (Opcional) Automatizar la actualización

Si quieres que la tabla en PostgreSQL se refresque sola cada cierto tiempo, sin tener que correr el script a mano:

1. Crea un archivo `sync.bat` con este contenido (ajusta las rutas):
   ```
   "C:\ruta\a\python.exe" "C:\ruta\a\sync_sheet_to_postgis.py"
   ```
2. Abre el **Programador de tareas de Windows** (Task Scheduler) → *Crear tarea básica*.
3. Define el desencadenador (ej. cada 1 hora) y como acción, ejecutar `sync.bat`.

Con eso, la tabla de PostgreSQL queda siempre al día. Si además quieres que el `.shp` se regenere solo, agrega la línea de `ogr2ogr` de la Opción B al mismo `.bat`, después del `python ...`.

---

**Nota:** este flujo (Sheet → PostgreSQL → Shapefile) es totalmente independiente del geovisor que subiste a GitHub Pages. El geovisor sigue leyendo el Sheet directo en el navegador; esta tabla de PostgreSQL es tu copia local para análisis espacial en QGIS.
