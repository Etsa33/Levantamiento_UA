"""
Sincroniza el Google Sheet (formulario de levantamiento) con una tabla
PostGIS en PostgreSQL.

Qué hace:
  1. Descarga el CSV publicado del Google Sheet.
  2. Limpia los nombres de columnas y separa UBICACIÓN en lat/lon.
  3. Crea la tabla en PostgreSQL si no existe (con columna geometry).
  4. Refresca todos los registros (TRUNCATE + INSERT) y construye la
     geometría real con PostGIS a partir de lat/lon.

Requisitos (instalar una sola vez):
    pip install requests pandas psycopg2-binary

Uso:
    python sync_sheet_to_postgis.py
"""

import sys
import unicodedata
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# CONFIGURA ESTOS VALORES
# ---------------------------------------------------------------------------
SHEET_ID = "1gE6LaFEWhr5Z97YGMl28SIQTvQb-Fu9jmcwLK_Kg03o"
SHEET_NAME = "Public Form"

PG_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "geoportal_ua",       # crea esta base de datos antes de correr el script
    "user": "postgres",
    "password": "postgres",  # <-- cámbialo
}

TABLE_NAME = "unidades_atencion"

# ---------------------------------------------------------------------------
# NO HACE FALTA TOCAR NADA DEBAJO DE ESTA LÍNEA
# ---------------------------------------------------------------------------

CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
    f"?tqx=out:csv&sheet={SHEET_NAME.replace(' ', '%20')}"
)


def slugify_column(col: str) -> str:
    """'CÓDIGO UA' -> 'codigo_ua' (sin tildes, snake_case, ascii)."""
    col = unicodedata.normalize("NFKD", col).encode("ascii", "ignore").decode()
    col = col.strip().lower().replace(" ", "_").replace("-", "_")
    return "".join(ch for ch in col if ch.isalnum() or ch == "_")


def fetch_sheet() -> pd.DataFrame:
    print(f"→ Descargando datos de: {CSV_URL}")
    resp = requests.get(CSV_URL, timeout=30)
    resp.raise_for_status()
    from io import StringIO
    df = pd.read_csv(StringIO(resp.text))
    df.columns = [slugify_column(c) for c in df.columns]
    print(f"  {len(df)} filas descargadas, columnas: {list(df.columns)}")
    return df


def split_lat_lon(df: pd.DataFrame) -> pd.DataFrame:
    loc_col = "ubicacion" if "ubicacion" in df.columns else None
    if loc_col is None:
        raise RuntimeError("No se encontró la columna UBICACIÓN en el Sheet.")

    def parse(value):
        try:
            lat_str, lon_str = str(value).split(",")
            lat, lon = float(lat_str.strip()), float(lon_str.strip())
            if lat == 0 and lon == 0:
                return (None, None)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                return (None, None)
            return (lat, lon)
        except Exception:
            return (None, None)

    parsed = df[loc_col].apply(parse)
    df["lat"] = parsed.apply(lambda t: t[0])
    df["lon"] = parsed.apply(lambda t: t[1])
    return df


def ensure_table(cur):
    cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            id                text PRIMARY KEY,
            nombres_y_apellidos text,
            cargo             text,
            fecha             text,
            hora              text,
            nombre_ua         text,
            codigo_ua         text,
            estado_ua         text,
            tipo_ua           text,
            servicio_ua       text,
            modalidad_ua      text,
            provincia         text,
            canton            text,
            parroquia         text,
            zona              text,
            distrito          text,
            calle_1           text,
            calle_2           text,
            numero_casa       text,
            referencia        text,
            link_foto         text,
            link_foto_cuen    text,
            link_foto_fachada text,
            lat               double precision,
            lon               double precision,
            geom              geometry(Point, 4326)
        );
        """
    )


def refresh_data(cur, df: pd.DataFrame):
    cur.execute(f"TRUNCATE TABLE {TABLE_NAME};")

    cols = [
        "id", "nombres_y_apellidos", "cargo", "fecha", "hora", "nombre_ua",
        "codigo_ua", "estado_ua", "tipo_ua", "servicio_ua", "modalidad_ua",
        "provincia", "canton", "parroquia", "zona", "distrito", "calle_1",
        "calle_2", "numero_casa", "referencia", "link_foto",
        "link_foto_cuen", "link_foto_fachada", "lat", "lon",
    ]
    # asegura que todas las columnas existan aunque el Sheet no las tenga aún
    for c in cols:
        if c not in df.columns:
            df[c] = None

    rows = df[cols].where(pd.notnull(df[cols]), None).values.tolist()

    placeholders = ", ".join(["%s"] * (len(cols) + 1))  # +1 para geom
    insert_sql = f"""
        INSERT INTO {TABLE_NAME} ({", ".join(cols)}, geom)
        VALUES %s
    """
    template = (
        "(" + ", ".join(["%s"] * len(cols)) +
        ", CASE WHEN %s IS NOT NULL AND %s IS NOT NULL "
        "THEN ST_SetSRID(ST_MakePoint(%s, %s), 4326) ELSE NULL END)"
    )

    values = []
    for row in rows:
        lat = row[cols.index("lat")]
        lon = row[cols.index("lon")]
        values.append(tuple(row) + (lat, lon, lon, lat))  # lon primero (X), luego lat (Y)

    execute_values(cur, insert_sql, values, template=template)
    print(f"  {len(values)} registros insertados en '{TABLE_NAME}'.")


def main():
    try:
        df = fetch_sheet()
    except Exception as e:
        print(f"ERROR descargando el Sheet: {e}")
        sys.exit(1)

    df = split_lat_lon(df)

    try:
        conn = psycopg2.connect(**PG_CONFIG)
    except Exception as e:
        print(f"ERROR conectando a PostgreSQL: {e}")
        print("Revisa PG_CONFIG (host/puerto/usuario/password/dbname) al inicio del script.")
        sys.exit(1)

    try:
        with conn:
            with conn.cursor() as cur:
                ensure_table(cur)
                refresh_data(cur, df)
        print("✔ Sincronización completa.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
