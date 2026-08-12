IF NOT EXISTS (SELECT 1 FROM dbo.Permisos WHERE Codigo = 'AREAELIMINAR')
BEGIN
    INSERT INTO dbo.Permisos (Codigo, Descripcion)
    VALUES ('AREAELIMINAR', N'Eliminar áreas sin información operativa asociada.');
END;

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'AREAELIMINAR'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolesPermisos Existente
      WHERE Existente.IdRol = Rol.IdRol
        AND Existente.IdPermiso = Permiso.IdPermiso
  );
