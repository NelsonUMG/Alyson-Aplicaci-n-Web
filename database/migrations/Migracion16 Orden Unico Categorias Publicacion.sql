;WITH CategoriasOrdenadas AS (
    SELECT
        IdCategoriaPublicacion,
        ROW_NUMBER() OVER (
            ORDER BY OrdenVisualizacion, Nombre, IdCategoriaPublicacion
        ) AS NuevoOrden
    FROM dbo.CategoriasPublicacion
)
UPDATE categoria
SET OrdenVisualizacion = ordenada.NuevoOrden
FROM dbo.CategoriasPublicacion categoria
INNER JOIN CategoriasOrdenadas ordenada
    ON ordenada.IdCategoriaPublicacion = categoria.IdCategoriaPublicacion;

ALTER TABLE dbo.CategoriasPublicacion
DROP CONSTRAINT CKCategoriasPublicacionOrden;

ALTER TABLE dbo.CategoriasPublicacion
ADD CONSTRAINT CKCategoriasPublicacionOrden
CHECK (OrdenVisualizacion >= 1);

ALTER TABLE dbo.CategoriasPublicacion
ADD CONSTRAINT UQCategoriasPublicacionOrdenVisualizacion
UNIQUE (OrdenVisualizacion);
