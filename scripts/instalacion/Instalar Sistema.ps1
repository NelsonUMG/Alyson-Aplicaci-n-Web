[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raizPaquete = Split-Path -Parent $PSScriptRoot
$rutaRegistro = Join-Path $raizPaquete 'INSTALACION-ULTIMO.log'
$transcripcionIniciada = $false
trap {
    $mensajeError = $_.Exception.Message
    $rutaError = Join-Path $raizPaquete 'ERROR-INSTALACION.txt'
    try {
        $lineasError = @(
            'INSTALACIÓN DEL SISTEMA WEB - ERROR',
            ('Fecha: ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')),
            ('Mensaje: ' + $mensajeError),
            '',
            'Detalle técnico:',
            ($_ | Out-String),
            'Registro completo:',
            $rutaRegistro
        )
        [IO.File]::WriteAllLines($rutaError,$lineasError,[Text.UTF8Encoding]::new($false))
        $raizLogsSql = Join-Path $env:ProgramFiles 'Microsoft SQL Server\170\Setup Bootstrap\Log'
        if (Test-Path -LiteralPath $raizLogsSql) {
            $ultimoLogSql = Get-ChildItem -LiteralPath $raizLogsSql -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($ultimoLogSql) {
                $destinoLogsSql = Join-Path $raizPaquete 'logs\sql-setup-ultimo'
                New-Item -ItemType Directory -Path $destinoLogsSql -Force | Out-Null
                foreach ($nombreLog in @('Summary.txt','Detail.txt')) {
                    $origenLog = Join-Path $ultimoLogSql.FullName $nombreLog
                    if (Test-Path -LiteralPath $origenLog) { Copy-Item -LiteralPath $origenLog -Destination $destinoLogsSql -Force }
                }
            }
        }
    } catch { }
    if ($transcripcionIniciada) { try { Stop-Transcript | Out-Null } catch { }; $transcripcionIniciada = $false }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host 'LA INSTALACIÓN NO PUDO CONTINUAR' -ForegroundColor Red
    Write-Host $mensajeError -ForegroundColor Yellow
    Write-Host "El detalle quedó guardado en: $rutaError" -ForegroundColor Cyan
    Write-Host 'La ventana permanecerá abierta para que puedas leer el error.'
    Write-Host '============================================================' -ForegroundColor Red
    Read-Host 'Presiona ENTER para cerrar'
    exit 1
}
$destino = $raizPaquete
$instancia = 'PEB'
$puertoSql = 15333
$nombreBase = 'ParqueErickBarrondo'
$urlSql = 'https://download.microsoft.com/download/7ab8f535-7eb8-4b16-82eb-eca0fa2d38f3/SQL2025-SSEI-Expr.exe'
$hashSql = '1C677A33B318481C3217128835F8405CF0026621DCD04B13EB6CB0982E823F27'

function Es-Administrador {
    $identidad = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identidad)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Es-Administrador)) {
    $elevado = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $PSCommandPath))
    exit $elevado.ExitCode
}

try { Start-Transcript -LiteralPath $rutaRegistro -Force | Out-Null; $transcripcionIniciada = $true } catch { }
Write-Host "Registro de instalación: $rutaRegistro"
if (-not [Environment]::Is64BitOperatingSystem) { throw 'Este sistema requiere Windows de 64 bits.' }
Write-Host "Windows de 64 bits detectado. SQL Server se instalará en inglés universal (ENU); la aplicación continuará en español."

function Nueva-Clave([int]$Bytes = 32) {
    $datos = New-Object byte[] $Bytes
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($datos) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($datos).TrimEnd('=').Replace('+','A').Replace('/','b') + 'Aa!9'
}

function Ejecutar-Sql([string]$Base, [string]$Sql, [int]$Tiempo = 120) {
    $cadena = "Server=127.0.0.1,$puertoSql;Database=$Base;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
    $conexion = [Data.SqlClient.SqlConnection]::new($cadena)
    try {
        $conexion.Open(); $comando = $conexion.CreateCommand(); $comando.CommandTimeout = $Tiempo
        $comando.CommandText = $Sql; [void]$comando.ExecuteNonQuery()
    } finally { if ($conexion.State -ne 'Closed') { $conexion.Close() }; $conexion.Dispose() }
}

function Esperar-Sql {
    for ($i=0; $i -lt 120; $i++) {
        try { Ejecutar-Sql -Base master -Sql 'SELECT 1' -Tiempo 3; return } catch { Start-Sleep -Seconds 1 }
    }
    throw 'SQL Server no respondió en el puerto local 15333.'
}

function Actualizar-PathProceso {
    $rutas = @(
        [Environment]::GetEnvironmentVariable('Path','Machine'),
        [Environment]::GetEnvironmentVariable('Path','User')
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    $env:Path = $rutas -join ';'
}

function Java-Es-Compatible([string]$Ruta) {
    try {
        $salida = (& $Ruta -version 2>&1 | Out-String)
        if ($salida -match 'version\s+"(?<mayor>\d+)') { return ([int]$Matches.mayor -ge 21) }
    } catch { }
    return $false
}

function Node-Es-Compatible([string]$Ruta) {
    try {
        $salida = (& $Ruta --version 2>&1 | Out-String)
        if ($salida -match 'v?(?<mayor>\d+)\.') { return ([int]$Matches.mayor -ge 18) }
    } catch { }
    return $false
}

function Encontrar-Java {
    Actualizar-PathProceso
    $candidatos = @((Join-Path $raizPaquete 'runtime\java\bin\java.exe'))
    $comando = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($comando) { $candidatos += $comando.Source }
    $bases = @(
        (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
        (Join-Path $env:ProgramFiles 'Microsoft'),
        (Join-Path $env:ProgramFiles 'Java')
    )
    foreach ($base in $bases) {
        if (-not (Test-Path -LiteralPath $base)) { continue }
        $java = Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'bin\java.exe' } |
            Where-Object { Test-Path -LiteralPath $_ }
        $candidatos += $java
    }
    foreach ($java in @($candidatos | Select-Object -Unique)) {
        if (Java-Es-Compatible $java) { $env:Path = (Split-Path -Parent $java) + ';' + $env:Path; return $java }
    }
    return $null
}

function Instalar-JavaPortatil {
    Write-Host 'Descargando Java 21 portátil oficial de Eclipse Temurin...'
    $api = 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $activo = Invoke-RestMethod -Uri $api -UseBasicParsing | Select-Object -First 1
    if (-not $activo.binary.package.link -or -not $activo.binary.package.checksum) { throw 'Adoptium no devolvió un paquete Java 21 válido.' }
    $temporalJava = Join-Path $env:TEMP ('PEB-Java21-' + [guid]::NewGuid().ToString('N'))
    $zipJava = Join-Path $temporalJava 'java21.zip'
    $extraidoJava = Join-Path $temporalJava 'extraido'
    New-Item -ItemType Directory -Path $extraidoJava -Force | Out-Null
    try {
        Invoke-WebRequest -Uri ([string]$activo.binary.package.link) -OutFile $zipJava -UseBasicParsing
        if ((Get-FileHash -LiteralPath $zipJava -Algorithm SHA256).Hash -ne ([string]$activo.binary.package.checksum).ToUpperInvariant()) { throw 'El Java 21 descargado no coincide con el checksum oficial de Adoptium.' }
        Expand-Archive -LiteralPath $zipJava -DestinationPath $extraidoJava -Force
        $java = Get-ChildItem -LiteralPath $extraidoJava -Filter 'java.exe' -File -Recurse | Where-Object { $_.FullName -like '*\bin\java.exe' } | Select-Object -First 1
        if (-not $java -or -not (Java-Es-Compatible $java.FullName)) { throw 'El paquete portátil descargado no contiene un Java 21 compatible.' }
        $raizJava = Split-Path -Parent (Split-Path -Parent $java.FullName)
        $runtime = Join-Path $raizPaquete 'runtime'; New-Item -ItemType Directory -Path $runtime -Force | Out-Null
        $destinoJava = Join-Path $runtime 'java'
        if (Test-Path -LiteralPath $destinoJava) { Move-Item -LiteralPath $destinoJava -Destination (Join-Path $runtime ('java-incompleto-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))) }
        Move-Item -LiteralPath $raizJava -Destination $destinoJava
        Write-Host "Java portátil instalado en: $destinoJava"
    } finally {
        if (Test-Path -LiteralPath $temporalJava) { Remove-Item -LiteralPath $temporalJava -Recurse -Force }
    }
}

function Encontrar-Node {
    Actualizar-PathProceso
    $candidatos = @((Join-Path $raizPaquete 'runtime\node\node.exe'))
    $comando = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($comando) { $candidatos += $comando.Source }
    $node = Join-Path $env:ProgramFiles 'nodejs\node.exe'
    if (Test-Path -LiteralPath $node) { $candidatos += $node }
    foreach ($node in @($candidatos | Select-Object -Unique)) {
        if (Node-Es-Compatible $node) { $env:Path = (Split-Path -Parent $node) + ';' + $env:Path; return $node }
    }
    return $null
}

function Instalar-NodePortatil {
    Write-Host 'Descargando Node.js LTS portátil oficial...'
    # En Windows PowerShell 5.1, Invoke-RestMethod puede entregar el arreglo JSON
    # como un solo objeto al pipeline. Guardarlo primero fuerza la enumeración
    # correcta y evita construir una URL con todas las versiones concatenadas.
    $versionesNode = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
    $version = $versionesNode | Where-Object { $_.lts -and ([int]($_.version.TrimStart('v').Split('.')[0])) -ge 18 } | Select-Object -First 1
    if (-not $version.version) { throw 'Node.js no devolvió una versión LTS compatible.' }
    $nombreZip = "node-$($version.version)-win-x64.zip"
    $baseUrl = "https://nodejs.org/dist/$($version.version)"
    $temporalNode = Join-Path $env:TEMP ('PEB-Node-' + [guid]::NewGuid().ToString('N'))
    $zipNode = Join-Path $temporalNode $nombreZip
    $extraidoNode = Join-Path $temporalNode 'extraido'
    New-Item -ItemType Directory -Path $extraidoNode -Force | Out-Null
    try {
        $sumas = Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -UseBasicParsing
        $lineaSuma = $sumas.Content -split "`n" | Where-Object { $_ -match ('\s+' + [regex]::Escape($nombreZip) + '$') } | Select-Object -First 1
        if (-not $lineaSuma) { throw 'No se encontró el checksum oficial del paquete Node.js.' }
        $checksum = ($lineaSuma.Trim() -split '\s+')[0].ToUpperInvariant()
        Invoke-WebRequest -Uri "$baseUrl/$nombreZip" -OutFile $zipNode -UseBasicParsing
        if ((Get-FileHash -LiteralPath $zipNode -Algorithm SHA256).Hash -ne $checksum) { throw 'El Node.js descargado no coincide con el checksum oficial.' }
        Expand-Archive -LiteralPath $zipNode -DestinationPath $extraidoNode -Force
        $node = Get-ChildItem -LiteralPath $extraidoNode -Filter 'node.exe' -File -Recurse | Select-Object -First 1
        if (-not $node -or -not (Node-Es-Compatible $node.FullName)) { throw 'El paquete portátil descargado no contiene un Node.js compatible.' }
        $raizNode = Split-Path -Parent $node.FullName
        $runtime = Join-Path $raizPaquete 'runtime'; New-Item -ItemType Directory -Path $runtime -Force | Out-Null
        $destinoNode = Join-Path $runtime 'node'
        if (Test-Path -LiteralPath $destinoNode) { Move-Item -LiteralPath $destinoNode -Destination (Join-Path $runtime ('node-incompleto-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))) }
        Move-Item -LiteralPath $raizNode -Destination $destinoNode
        Write-Host "Node.js portátil instalado en: $destinoNode"
    } finally {
        if (Test-Path -LiteralPath $temporalNode) { Remove-Item -LiteralPath $temporalNode -Recurse -Force }
    }
}

if (Test-Path -LiteralPath (Join-Path $destino 'configuracion\equipo.dpapi')) { throw 'El sistema de esta carpeta ya fue instalado. No se sobrescribirá su configuración.' }
if (Get-Service -Name 'MSSQL$PEB' -ErrorAction SilentlyContinue) { throw 'Ya existe la instancia SQL PEB. No se modificará.' }
foreach ($ruta in @('backend\servidor.jar','frontend\index.html','respaldo\RevisionParqueLocal.bak','configuracion\correo.exportado.json','configuracion\clave-instalacion.txt')) {
    if (-not (Test-Path -LiteralPath (Join-Path $raizPaquete $ruta))) { throw "Falta en el paquete: $ruta" }
}

Write-Host 'Este instalador usa SQL Server 2025 Express y sus términos de licencia.'
Write-Host 'Licencia: https://aka.ms/useterms'
$acepta = Read-Host 'Escribe ACEPTO para continuar'
if ($acepta -cne 'ACEPTO') { throw 'Instalación cancelada: no se aceptaron los términos.' }

. (Join-Path $PSScriptRoot 'Proteccion Configuracion.ps1')
$clavePaquete = (Get-Content -Raw -LiteralPath (Join-Path $raizPaquete 'configuracion\clave-instalacion.txt')).Trim()
try {
    $correoJson = DesprotegerConfiguracion (Get-Content -Raw -LiteralPath (Join-Path $raizPaquete 'configuracion\correo.exportado.json')) $clavePaquete
    $correo = $correoJson | ConvertFrom-Json
} finally { $clavePaquete = $null }

$javaDetectado = Encontrar-Java
if (-not $javaDetectado) {
    Instalar-JavaPortatil
    $javaDetectado = Encontrar-Java
    if (-not $javaDetectado) { throw 'No se pudo instalar ni localizar el Java 21 portátil.' }
} else {
    Write-Host "Java 21 o superior ya está instalado; se omite: $javaDetectado"
}
$nodeDetectado = Encontrar-Node
if (-not $nodeDetectado) {
    Instalar-NodePortatil
    $nodeDetectado = Encontrar-Node
    if (-not $nodeDetectado) { throw 'No se pudo instalar ni localizar el Node.js LTS portátil.' }
} else {
    Write-Host "Node.js 18 o superior ya está instalado; se omite: $nodeDetectado"
}

$temporal = Join-Path $env:TEMP ('PEB-Instalacion-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporal | Out-Null
$claveSa = Nueva-Clave
$claveMigrador = Nueva-Clave
$claveAplicacion = Nueva-Clave
$correoAdministrador = 'administrador.sistema@parque.local'
$claveAdministrador = Nueva-Clave 18
try {
    $bootstrap = Join-Path $temporal 'SQL2025-SSEI-Expr.exe'
    Write-Host 'Descargando el instalador oficial de SQL Server 2025 Express...'
    Invoke-WebRequest -Uri $urlSql -OutFile $bootstrap -UseBasicParsing
    if ((Get-FileHash -LiteralPath $bootstrap -Algorithm SHA256).Hash -ne $hashSql) { throw 'El instalador descargado de SQL Server no coincide con el hash esperado.' }
    $media = Join-Path $temporal 'media'; New-Item -ItemType Directory -Path $media | Out-Null
    Write-Host 'Descargando los archivos de instalación de SQL Server...'
    $proceso = Start-Process $bootstrap -Wait -PassThru -WindowStyle Hidden -ArgumentList @('/ACTION=Download','/LANGUAGE=en-US','/MEDIATYPE=Core',('/MEDIAPATH="{0}"' -f $media),'/QUIET')
    if ($proceso.ExitCode -notin @(0,3010)) { throw "Falló la descarga del medio SQL Server (código $($proceso.ExitCode))." }
    $autoExtraible = Get-ChildItem -LiteralPath $media -Filter 'SQLEXPR_x64_ENU.exe' -File -Recurse | Select-Object -First 1
    if (-not $autoExtraible) { throw 'El descargador oficial no produjo el medio inglés SQLEXPR_x64_ENU requerido para compatibilidad universal.' }
    $extraido = Join-Path $temporal 'sql-extraido'; New-Item -ItemType Directory -Path $extraido | Out-Null
    Write-Host 'Extrayendo SQL Server...'
    $proceso = Start-Process $autoExtraible.FullName -Wait -PassThru -WindowStyle Hidden -ArgumentList @('/Q',('/X:{0}' -f $extraido))
    if ($proceso.ExitCode -notin @(0,3010)) { throw "No se pudo extraer SQL Server (código $($proceso.ExitCode))." }
    $setup = Get-ChildItem -LiteralPath $extraido -Filter setup.exe -File -Recurse | Select-Object -First 1
    if (-not $setup) { throw 'No se encontró setup.exe en el medio oficial.' }
    $cuenta = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $argumentos = @('/Q','/ENU','/ACTION=Install','/FEATURES=SQLEngine',"/INSTANCENAME=$instancia",'/SQLSVCSTARTUPTYPE=Automatic','/TCPENABLED=1','/NPENABLED=0','/SECURITYMODE=SQL',('/SAPWD="{0}"' -f $claveSa),('/SQLSYSADMINACCOUNTS="{0}"' -f $cuenta),'/IACCEPTSQLSERVERLICENSETERMS','/SUPPRESSPRIVACYSTATEMENTNOTICE','/UPDATEENABLED=True')
    Write-Host 'Instalando SQL Server 2025 Express. Este paso puede tardar varios minutos...'
    $proceso = Start-Process $setup.FullName -Wait -PassThru -WindowStyle Hidden -ArgumentList $argumentos
    if ($proceso.ExitCode -eq -2067529714) { throw 'SQL Server rechazó el idioma del medio (código -2067529714), aunque se solicitó el medio inglés universal. Revisa ERROR-INSTALACION.txt.' }
    if ($proceso.ExitCode -notin @(0,3010)) { throw "Falló la instalación de SQL Server (código $($proceso.ExitCode)). Consulta los logs de Setup de Microsoft." }
    Write-Host "SQL Server terminó con código $($proceso.ExitCode). Continuando con la base de datos..."

    $mapaInstancias = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL'
    $idInstancia = (Get-ItemProperty -LiteralPath $mapaInstancias).$instancia
    if (-not $idInstancia) { throw 'SQL Server se instaló, pero no se encontró el identificador de la instancia PEB.' }
    $ipAll = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$idInstancia\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
    Set-ItemProperty -LiteralPath $ipAll -Name TcpDynamicPorts -Value ''
    Set-ItemProperty -LiteralPath $ipAll -Name TcpPort -Value ([string]$puertoSql)
    Restart-Service -Name 'MSSQL$PEB' -Force
    Esperar-Sql

    $rutaBak = Join-Path $raizPaquete 'respaldo\RevisionParqueLocal.bak'
    $servicioSql = Get-CimInstance Win32_Service -Filter "Name='MSSQL`$PEB'"
    if (-not $servicioSql -or [string]::IsNullOrWhiteSpace($servicioSql.StartName)) { throw 'No se pudo identificar la cuenta del servicio SQL PEB.' }
    & icacls.exe $rutaBak /grant:r ($servicioSql.StartName + ':(R)') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo conceder al servicio SQL permiso temporal de lectura sobre el respaldo.' }
    $bak = $rutaBak.Replace("'","''")
    $cn=[Data.SqlClient.SqlConnection]::new("Server=127.0.0.1,$puertoSql;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;")
    try {
        $cn.Open()
        $cmd=$cn.CreateCommand();$cmd.CommandText="IF DB_ID('$nombreBase') IS NOT NULL THROW 51000, 'La base destino ya existe.', 1; RESTORE FILELISTONLY FROM DISK=N'$bak'";$lector=$cmd.ExecuteReader();$archivos=@();while($lector.Read()){$archivos += [pscustomobject]@{Nombre=[string]$lector['LogicalName'];Tipo=[string]$lector['Type']}};$lector.Close()
        $cmd=$cn.CreateCommand();$cmd.CommandText="SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)),CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS nvarchar(4000))";$lector=$cmd.ExecuteReader();[void]$lector.Read();$datos=[string]$lector.GetValue(0);$logs=[string]$lector.GetValue(1);$lector.Close()
        $movimientos=@();foreach($archivo in $archivos){$baseRuta=if($archivo.Tipo -eq 'L'){$logs}else{$datos};$extension=if($archivo.Tipo -eq 'L'){'.ldf'}else{'.mdf'};$ruta=Join-Path $baseRuta ($nombreBase+'_'+$archivo.Nombre+$extension);$movimientos += "MOVE N'$($archivo.Nombre.Replace("'","''"))' TO N'$($ruta.Replace("'","''"))'"}
        $cmd=$cn.CreateCommand();$cmd.CommandTimeout=0;$cmd.CommandText="RESTORE VERIFYONLY FROM DISK=N'$bak' WITH CHECKSUM; RESTORE DATABASE [$nombreBase] FROM DISK=N'$bak' WITH CHECKSUM, RECOVERY, "+($movimientos -join ', ');[void]$cmd.ExecuteNonQuery()
    } finally {
        if ($cn.State -ne 'Closed') { $cn.Close() }; $cn.Dispose()
        & icacls.exe $rutaBak /remove:g $servicioSql.StartName | Out-Null
    }

    $uMig='parquemigrador';$uApp='parqueaplicacion'
    $sqlMaster="CREATE LOGIN [$uMig] WITH PASSWORD=N'$($claveMigrador.Replace("'","''"))', CHECK_POLICY=ON; CREATE LOGIN [$uApp] WITH PASSWORD=N'$($claveAplicacion.Replace("'","''"))', CHECK_POLICY=ON;"
    Ejecutar-Sql master $sqlMaster
    $sqlBase="IF USER_ID('$uMig') IS NULL CREATE USER [$uMig] FOR LOGIN [$uMig] WITH DEFAULT_SCHEMA=dbo; ELSE ALTER USER [$uMig] WITH LOGIN=[$uMig], DEFAULT_SCHEMA=dbo; IF IS_ROLEMEMBER('db_owner','$uMig') <> 1 ALTER ROLE db_owner ADD MEMBER [$uMig]; IF USER_ID('$uApp') IS NULL CREATE USER [$uApp] FOR LOGIN [$uApp] WITH DEFAULT_SCHEMA=dbo; ELSE ALTER USER [$uApp] WITH LOGIN=[$uApp], DEFAULT_SCHEMA=dbo; IF IS_ROLEMEMBER('db_datareader','$uApp') <> 1 ALTER ROLE db_datareader ADD MEMBER [$uApp]; IF IS_ROLEMEMBER('db_datawriter','$uApp') <> 1 ALTER ROLE db_datawriter ADD MEMBER [$uApp]; GRANT EXECUTE TO [$uApp]; GRANT VIEW DEFINITION TO [$uApp];"
    Ejecutar-Sql $nombreBase $sqlBase
    foreach($credencial in @(@{Usuario=$uMig;Clave=$claveMigrador},@{Usuario=$uApp;Clave=$claveAplicacion})){
        $prueba=[Data.SqlClient.SqlConnection]::new("Server=127.0.0.1,$puertoSql;Database=$nombreBase;User ID=$($credencial.Usuario);Password=$($credencial.Clave);Encrypt=True;TrustServerCertificate=True;")
        try{$prueba.Open();$comandoPrueba=$prueba.CreateCommand();$comandoPrueba.CommandText='SELECT 1';[void]$comandoPrueba.ExecuteScalar()}finally{if($prueba.State -ne 'Closed'){$prueba.Close()};$prueba.Dispose()}
    }

    foreach($carpeta in @('configuracion','runtime','logs')){New-Item -ItemType Directory -Path (Join-Path $destino $carpeta) -Force | Out-Null}

    $configuracion=[ordered]@{
        SPRING_PROFILES_ACTIVE='produccion';BDSERVIDOR='127.0.0.1';BDPUERTO=[string]$puertoSql;BDNOMBRE=$nombreBase;BDCIFRAR='true';BDCONFIARCERTIFICADOSERVIDOR='true';BDUSUARIO=$uApp;BDCONTRASENA=$claveAplicacion;BDUSUARIOMIGRACION=$uMig;BDCONTRASENAMIGRACION=$claveMigrador;PARQUEDATOS=(Join-Path $destino 'datos');SEGURIDADCLAVEHUELLAS=(Nueva-Clave 48);CORREOSMTPHOST='smtp.gmail.com';CORREOSMTPPUERTO='587';CORREONOREPLY=[string]$correo.usuario;CORREOCLAVEAPLICACION=[string]$correo.clave;CORREOENVIOHABILITADO='true';CORREOPROBARCONEXIONALINICIAR='true';URLPUBLICAFRONTEND='http://127.0.0.1:5173';SERVER_SERVLET_SESSION_COOKIE_SECURE='false';ADMININICIALHABILITADO='true';ADMININICIALCORREO=$correoAdministrador;ADMININICIALNOMBRE='Administrador';ADMININICIALAPELLIDO='Sistema';ADMININICIALCONTRASENA=$claveAdministrador
    }
    Add-Type -AssemblyName System.Security
    $json=$configuracion|ConvertTo-Json -Compress
    $protegido=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($json),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [IO.File]::WriteAllText((Join-Path $destino 'configuracion\equipo.dpapi'),[Convert]::ToBase64String($protegido),[Text.UTF8Encoding]::new($false))
    $inicio=[Environment]::GetFolderPath('Startup');$acceso=Join-Path $inicio 'Parque Erick Barrondo.lnk';$shell=New-Object -ComObject WScript.Shell;$atajo=$shell.CreateShortcut($acceso);$atajo.TargetPath=(Join-Path $destino 'Iniciar.cmd');$atajo.WorkingDirectory=$destino;$atajo.Save()
    & (Join-Path $destino 'scripts\Iniciar Sistema.ps1')
    $verificacion="SELECT COUNT(*) FROM dbo.Usuarios u INNER JOIN dbo.UsuariosRoles ur ON ur.IdUsuario=u.IdUsuario INNER JOIN dbo.Roles r ON r.IdRol=ur.IdRol WHERE u.CorreoNormalizado='$correoAdministrador' AND u.Estado='ACTIVO' AND r.Codigo='ADMINISTRADOR'"
    $conexionVerificacion=[Data.SqlClient.SqlConnection]::new("Server=127.0.0.1,$puertoSql;Database=$nombreBase;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;")
    try{$conexionVerificacion.Open();$comandoVerificacion=$conexionVerificacion.CreateCommand();$comandoVerificacion.CommandText=$verificacion;if([int]$comandoVerificacion.ExecuteScalar() -ne 1){throw 'El backend no confirmó la creación del administrador inicial.'}}finally{if($conexionVerificacion.State -ne 'Closed'){$conexionVerificacion.Close()};$conexionVerificacion.Dispose()}
    $configuracion.ADMININICIALHABILITADO='false';$configuracion.Remove('ADMININICIALCONTRASENA');$configuracion.Remove('ADMININICIALCORREO');$configuracion.Remove('ADMININICIALNOMBRE');$configuracion.Remove('ADMININICIALAPELLIDO')
    $json=$configuracion|ConvertTo-Json -Compress
    $protegido=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($json),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [IO.File]::WriteAllText((Join-Path $destino 'configuracion\equipo.dpapi'),[Convert]::ToBase64String($protegido),[Text.UTF8Encoding]::new($false))
    Remove-Item -LiteralPath (Join-Path $destino 'configuracion\correo.exportado.json'),(Join-Path $destino 'configuracion\clave-instalacion.txt') -Force
    $nota=Join-Path $destino 'ACCESO-ADMINISTRADOR.txt'
    $lineas=@('SISTEMA WEB PARQUE ERICK BARRONDO','',"CARPETA DEL SISTEMA: $destino",'URL LOCAL: http://127.0.0.1:5173',"USUARIO ADMINISTRADOR: $correoAdministrador","CONTRASEÑA: $claveAdministrador",'','INICIAR TODO:',('"'+(Join-Path $destino 'Iniciar.cmd')+'"'),'','BACKEND MANUAL CON SQL Y SMTP:',('"'+(Join-Path $destino 'Backend.cmd')+'"'),'','FRONTEND MANUAL:',('"'+(Join-Path $destino 'Frontend.cmd')+'"'),'','DETENER EJECUCIÓN AUTOMÁTICA:',('"'+(Join-Path $destino 'Detener.cmd')+'"'),'','Cambie la contraseña desde el perfil después del primer ingreso y guarde este archivo en un lugar seguro.')
    [IO.File]::WriteAllLines($nota,$lineas,[Text.UTF8Encoding]::new($false))
    & icacls.exe $nota /inheritance:r /grant:r ($env:USERNAME+':R') | Out-Null
    Write-Host ''
    Write-Host '============================================================'
    Write-Host 'INSTALACIÓN COMPLETADA'
    Write-Host 'URL: http://127.0.0.1:5173'
    Write-Host "ADMINISTRADOR: $correoAdministrador"
    Write-Host "CONTRASEÑA: $claveAdministrador"
    Write-Host "Bloc de notas con acceso y comandos: $nota"
    Write-Host '============================================================'
    if ($transcripcionIniciada) { try { Stop-Transcript | Out-Null } catch { }; $transcripcionIniciada = $false }
    Read-Host 'Presiona ENTER para cerrar esta ventana'
} finally {
    $correo=$null;$correoJson=$null;$clavePaquete=$null;$claveSa=$null;$claveMigrador=$null;$claveAplicacion=$null;$claveAdministrador=$null
    if (Test-Path -LiteralPath $temporal) { Remove-Item -LiteralPath $temporal -Recurse -Force }
}
