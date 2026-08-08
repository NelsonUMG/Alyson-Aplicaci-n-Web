INSERT INTO dbo.Permisos (Codigo, Descripcion)
VALUES ('BICICLETAACTUALIZARESTADO', N'Actualizar el estado y los datos de inventario de bicicletas.');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo IN ('OPERADORBICICLETAS', 'ADMINISTRADOR')
  AND Permiso.Codigo = 'BICICLETAACTUALIZARESTADO';
