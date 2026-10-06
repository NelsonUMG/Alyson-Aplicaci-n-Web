param([string]$Servidor='127.0.0.1,1433',[string]$BaseDatos='RevisionParqueLocal')
$ErrorActionPreference='Stop'
# Consulta exclusivamente metadatos; no lee cuentas, correos, tokens ni contraseñas.
$conexion=[System.Data.SqlClient.SqlConnection]::new("Server=$Servidor;Database=$BaseDatos;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Connect Timeout=5")
function Consultar([string]$sql) {
  $comando=$conexion.CreateCommand(); $comando.CommandText=$sql
  $lector=$comando.ExecuteReader()
  try {
    while($lector.Read()) {
      $fila=[ordered]@{}
      for($i=0;$i -lt $lector.FieldCount;$i++) {
        $fila[$lector.GetName($i)]=if($lector.IsDBNull($i)){$null}else{$lector.GetValue($i)}
      }
      [pscustomobject]$fila
    }
  } finally { $lector.Close(); $comando.Dispose() }
}
try {
  $conexion.Open()
  $resultado=[ordered]@{
    capturadoEn=(Get-Date -Format o)
    base=$BaseDatos
    motor=@(Consultar "SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) AS version,CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) AS edicion")
    objetos=@(Consultar "SELECT SCHEMA_NAME(schema_id) AS esquema,name AS nombre,type_desc AS tipo FROM sys.objects WHERE is_ms_shipped=0 AND type IN ('U','V','P','TR') ORDER BY type_desc,name")
    columnas=@(Consultar "SELECT t.name AS tabla,c.name AS columna,ty.name AS tipo,c.max_length AS bytes,c.is_nullable AS nullable,c.is_identity AS identidad FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id ORDER BY t.name,c.column_id")
    relaciones=@(Consultar "SELECT f.name AS restriccion,OBJECT_NAME(f.parent_object_id) AS tabla,COL_NAME(fc.parent_object_id,fc.parent_column_id) AS columna,OBJECT_NAME(f.referenced_object_id) AS referencia,COL_NAME(fc.referenced_object_id,fc.referenced_column_id) AS columnaReferencia FROM sys.foreign_keys f JOIN sys.foreign_key_columns fc ON f.object_id=fc.constraint_object_id ORDER BY tabla,columna")
    roles=@(Consultar "SELECT Codigo,Nombre,Activo FROM dbo.Roles ORDER BY Codigo")
    permisos=@(Consultar "SELECT Codigo,Descripcion FROM dbo.Permisos ORDER BY Codigo")
    rolPermiso=@(Consultar "SELECT r.Codigo AS rol,p.Codigo AS permiso FROM dbo.Roles r JOIN dbo.RolesPermisos rp ON rp.IdRol=r.IdRol JOIN dbo.Permisos p ON p.IdPermiso=rp.IdPermiso ORDER BY r.Codigo,p.Codigo")
    migraciones=@(Consultar "SELECT version,description,success FROM dbo.HistorialMigraciones ORDER BY installed_rank")
  }
  $resultado | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'esquema-verificado.json') -Encoding utf8
  "Metadatos exportados: $($resultado.objetos.Count) objetos; $($resultado.relaciones.Count) claves foráneas; $($resultado.migraciones.Count) migraciones."
} finally { $conexion.Dispose() }
