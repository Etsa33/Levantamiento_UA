-- ============================================================
-- setup_postgis.sql
-- Crea la extensión PostGIS y la tabla donde se guardan los
-- registros del formulario, con una columna de geometría real
-- (punto) construida a partir de lat/lon.
--
-- Uso: ábrelo en pgAdmin (Query Tool) sobre la base "geovisor"
-- y ejecútalo una sola vez. El script de Python
-- (sync_sheet_to_postgis.py, en la raíz del proyecto anterior)
-- hace esto mismo automáticamente cada vez que corre.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS unidades_atencion (
    id                  text PRIMARY KEY,
    nombres_y_apellidos text,
    cargo               text,
    fecha               text,
    hora                text,
    nombre_ua           text,
    codigo_ua           text,
    estado_ua           text,
    tipo_ua             text,
    servicio_ua         text,
    modalidad_ua        text,
    provincia           text,
    canton              text,
    parroquia           text,
    zona                text,
    distrito            text,
    calle_1             text,
    calle_2             text,
    numero_casa         text,
    referencia          text,
    link_foto           text,
    lat                 double precision,
    lon                 double precision,
    geom                geometry(Point, 4326)
);

-- Índice espacial, recomendable si vas a hacer consultas geográficas
-- (ej. "qué UA están a menos de 500m de aquí", intersecciones con
-- polígonos de provincia/cantón, etc.)
CREATE INDEX IF NOT EXISTS idx_unidades_atencion_geom
    ON unidades_atencion USING GIST (geom);

-- Ejemplo: si ya tienes datos en una tabla "staging" sin geometría
-- (por ejemplo, importada a mano desde un CSV validado), puedes
-- generar la columna geom así:
--
-- UPDATE unidades_atencion
-- SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
-- WHERE lat IS NOT NULL AND lon IS NOT NULL;

-- Ejemplo: exportar luego a shapefile por línea de comandos (ogr2ogr,
-- incluido con QGIS):
--
-- ogr2ogr -f "ESRI Shapefile" salida\unidades_atencion.shp ^
--   PG:"host=localhost port=5432 dbname=geovisor user=postgres password=TU_PASSWORD" ^
--   -sql "SELECT * FROM unidades_atencion"
