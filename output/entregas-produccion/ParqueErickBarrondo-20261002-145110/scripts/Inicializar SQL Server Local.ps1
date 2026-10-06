[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [string]$InstanciaServidor = 'localhost',

    [Parameter()]
    [string]$NombreBaseDatos = 'ParqueErickBarrondo',

    [Parameter()]
    [string]$UsuarioMigracion = 'parquemigrador',

    [Parameter()]
    [string]$UsuarioAplicacion = 'parqueaplicacion'
)

$ErrorActionPreference = 'Stop'

function ValidarIdentificadorSql {
    param([Parameter(Mandatory)][string]$Valor)

    if ($Valor -notmatch '^[A-Za-z][A-Za-z0-9]{0,63}$') {
        throw "Identificador SQL no permitido: $Valor"
    }
}

function ConvertirATextoPlano {
    param([Parameter(Mandatory)][Security.SecureString]$ValorSeguro)

    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ValorSeguro)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero)
    }
}

function EscaparCadenaSql {
    param([Parameter(Mandatory)][string]$Valor)
    return "N'$($Valor.Replace("'", "''"))'"
}

function EscaparIdentificadorSql {
    param([Parameter(Mandatory)][string]$Valor)
    return "[$($Valor.Replace(']', ']]'))]"
}

function EjecutarLoteSql {
    param(
        [Parameter(Mandatory)][string]$CadenaConexion,
        [Parameter(Mandatory)][string]$TextoComando
    )

    $conexion = [System.Data.SqlClient.SqlConnection]::new($CadenaConexion)
    try {
        $conexion.Open()
        $comando = $conexion.CreateCommand()
        $comando.CommandTimeout = 60
        $comando.CommandText = $TextoComando
        [void]$comando.ExecuteNonQuery()
    }
    finally {
        if ($conexion.State -ne [System.Data.ConnectionState]::Closed) {
            $conexion.Close()
        }
        $conexion.Dispose()
    }
}

ValidarIdentificadorSql -Valor $NombreBaseDatos
ValidarIdentificadorSql -Valor $UsuarioMigracion
ValidarIdentificadorSql -Valor $UsuarioAplicacion

$descripcionDestino = "base '$NombreBaseDatos' y cuentas locales en '$InstanciaServidor'"
if (-not $PSCmdlet.ShouldProcess($descripcionDestino, 'Inicializar SQL Server local')) {
    return
}

$contrasenaSeguraMigracion = Read-Host 'Contraseña local para el usuario de migración' -AsSecureString
$contrasenaSeguraAplicacion = Read-Host 'Contraseña local para el usuario de la aplicación' -AsSecureString
$contrasenaMigracion = ConvertirATextoPlano -ValorSeguro $contrasenaSeguraMigracion
$contrasenaAplicacion = ConvertirATextoPlano -ValorSeguro $contrasenaSeguraAplicacion

try {
    if ($contrasenaMigracion.Length -lt 12 -or $contrasenaAplicacion.Length -lt 12) {
        throw 'Las contraseñas locales deben tener al menos 12 caracteres.'
    }

    $conexionPrincipal = "Server=$InstanciaServidor;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
    $identificadorBaseDatos = EscaparIdentificadorSql -Valor $NombreBaseDatos
    $literalBaseDatos = EscaparCadenaSql -Valor $NombreBaseDatos
    $identificadorUsuarioMigracion = EscaparIdentificadorSql -Valor $UsuarioMigracion
    $literalUsuarioMigracion = EscaparCadenaSql -Valor $UsuarioMigracion
    $literalContrasenaMigracion = EscaparCadenaSql -Valor $contrasenaMigracion
    $identificadorUsuarioAplicacion = EscaparIdentificadorSql -Valor $UsuarioAplicacion
    $literalUsuarioAplicacion = EscaparCadenaSql -Valor $UsuarioAplicacion
    $literalContrasenaAplicacion = EscaparCadenaSql -Valor $contrasenaAplicacion

    $consultaPrincipal = @"
IF DB_ID($literalBaseDatos) IS NULL
BEGIN
    CREATE DATABASE $identificadorBaseDatos;
END;

IF SUSER_ID($literalUsuarioMigracion) IS NULL
BEGIN
    CREATE LOGIN $identificadorUsuarioMigracion WITH PASSWORD = $literalContrasenaMigracion, CHECK_POLICY = ON;
END;

IF SUSER_ID($literalUsuarioAplicacion) IS NULL
BEGIN
    CREATE LOGIN $identificadorUsuarioAplicacion WITH PASSWORD = $literalContrasenaAplicacion, CHECK_POLICY = ON;
END;
"@
    EjecutarLoteSql -CadenaConexion $conexionPrincipal -TextoComando $consultaPrincipal

    $conexionBaseDatos = "Server=$InstanciaServidor;Database=$NombreBaseDatos;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
    $consultaBaseDatos = @"
IF USER_ID($literalUsuarioMigracion) IS NULL
BEGIN
    CREATE USER $identificadorUsuarioMigracion FOR LOGIN $identificadorUsuarioMigracion WITH DEFAULT_SCHEMA = dbo;
END;

IF USER_ID($literalUsuarioAplicacion) IS NULL
BEGIN
    CREATE USER $identificadorUsuarioAplicacion FOR LOGIN $identificadorUsuarioAplicacion WITH DEFAULT_SCHEMA = dbo;
END;

IF IS_ROLEMEMBER('db_ddladmin', $literalUsuarioMigracion) <> 1
    ALTER ROLE db_ddladmin ADD MEMBER $identificadorUsuarioMigracion;
IF IS_ROLEMEMBER('db_datareader', $literalUsuarioMigracion) <> 1
    ALTER ROLE db_datareader ADD MEMBER $identificadorUsuarioMigracion;
IF IS_ROLEMEMBER('db_datawriter', $literalUsuarioMigracion) <> 1
    ALTER ROLE db_datawriter ADD MEMBER $identificadorUsuarioMigracion;
IF IS_ROLEMEMBER('db_datareader', $literalUsuarioAplicacion) <> 1
    ALTER ROLE db_datareader ADD MEMBER $identificadorUsuarioAplicacion;
IF IS_ROLEMEMBER('db_datawriter', $literalUsuarioAplicacion) <> 1
    ALTER ROLE db_datawriter ADD MEMBER $identificadorUsuarioAplicacion;
"@
    EjecutarLoteSql -CadenaConexion $conexionBaseDatos -TextoComando $consultaBaseDatos

    Write-Host "SQL Server local quedó preparado para '$NombreBaseDatos'."
    Write-Host 'Guarda las dos contraseñas únicamente en tu archivo .env local.'
}
finally {
    $contrasenaMigracion = $null
    $contrasenaAplicacion = $null
}
