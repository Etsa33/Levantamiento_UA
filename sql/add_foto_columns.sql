-- ============================================================
-- add_foto_columns.sql
-- Agrega las columnas de las dos fotos nuevas del formulario
-- (LINK_FOTO_CUEN y LINK_FOTO_FACHADA) a la tabla ya existente,
-- sin borrar ni afectar los datos que ya tienes cargados.
--
-- Corre esto UNA SOLA VEZ en el Query Tool de pgAdmin.
-- ============================================================

ALTER TABLE unidades_atencion
    ADD COLUMN IF NOT EXISTS link_foto_cuen text,
    ADD COLUMN IF NOT EXISTS link_foto_fachada text;

-- La columna vieja "link_foto" ya no se usa (el formulario cambió a dos
-- fotos separadas), pero no hace falta borrarla: no molesta si se queda ahí.
