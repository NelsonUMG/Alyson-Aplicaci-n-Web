DELETE RolPermiso
FROM dbo.RolesPermisos RolPermiso
INNER JOIN dbo.Roles Rol
    ON Rol.IdRol = RolPermiso.IdRol
INNER JOIN dbo.Permisos Permiso
    ON Permiso.IdPermiso = RolPermiso.IdPermiso
WHERE Rol.Codigo = 'USUARIOREGISTRADO'
  AND Permiso.Codigo IN (
      'PUBLICACIONLEER',
      'EVENTOLEER',
      'AREALEER',
      'BICICLETALEER'
  );
