[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$nombreBasePrueba = 'PruebaIdentidad_' + [Guid]::NewGuid().ToString('N')
$loginPrueba = $nombreBasePrueba
$clavePrueba = [Guid]::NewGuid().ToString('N') + 'Aa9!'
$conexionPrueba = [System.Data.SqlClient.SqlConnection]::new('Server=localhost;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;')
$conexionPrueba.Open()
try {
    $comandoPrueba = $conexionPrueba.CreateCommand()
    $comandoPrueba.CommandText = "CREATE DATABASE [$nombreBasePrueba]; CREATE LOGIN [$loginPrueba] WITH PASSWORD=N'$clavePrueba', CHECK_POLICY=OFF;"
    [void]$comandoPrueba.ExecuteNonQuery()
    $conexionPrueba.ChangeDatabase($nombreBasePrueba)
    $comandoPrueba.CommandText = "CREATE USER [$loginPrueba] FOR LOGIN [$loginPrueba]; ALTER ROLE db_owner ADD MEMBER [$loginPrueba];"
    [void]$comandoPrueba.ExecuteNonQuery()
    $conexionPrueba.ChangeDatabase('master')
    $env:BDSERVIDOR = 'localhost'
    $env:BDPUERTO = '1433'
    $env:BDNOMBRE = $nombreBasePrueba
    $env:BDUSUARIO = $loginPrueba
    $env:BDCONTRASENA = $clavePrueba
    $env:BDUSUARIOMIGRACION = $loginPrueba
    $env:BDCONTRASENAMIGRACION = $clavePrueba
    $env:BDCIFRAR = 'true'
    $env:BDCONFIARCERTIFICADOSERVIDOR = 'true'
    $env:SEGURIDADCLAVEHUELLAS = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $env:PRUEBAS_IDENTIDAD_SQLSERVER = 'true'
    Push-Location (Join-Path $PSScriptRoot '..\backend')
    try {
        & .\mvnw.cmd -q '-Dtest=IdentidadSqlServerPruebas' test
        if ($LASTEXITCODE -ne 0) { throw 'Falló la prueba integral de identidad.' }
    } finally { Pop-Location }
} finally {
    if ($nombreBasePrueba -notmatch '^PruebaIdentidad_[a-f0-9]{32}$') { throw 'Nombre de base temporal no válido.' }
    $conexionPrueba.ChangeDatabase('master')
    $limpiezaPrueba = $conexionPrueba.CreateCommand()
    $limpiezaPrueba.CommandText = "IF DB_ID('$nombreBasePrueba') IS NOT NULL BEGIN ALTER DATABASE [$nombreBasePrueba] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$nombreBasePrueba]; END; IF SUSER_ID('$loginPrueba') IS NOT NULL DROP LOGIN [$loginPrueba];"
    [void]$limpiezaPrueba.ExecuteNonQuery()
    $conexionPrueba.Dispose()
    Remove-Item Env:PRUEBAS_IDENTIDAD_SQLSERVER -ErrorAction SilentlyContinue
}
