[CmdletBinding()]
param([switch]$HabilitarSmtp, [switch]$ActualizarBackend)
$ErrorActionPreference = 'Stop'
$rutaEstado = Join-Path $env:TEMP 'parque-erick-barrondo-ejecucion.json'
$estado = Get-Content -Raw -LiteralPath $rutaEstado | ConvertFrom-Json
$conectorApi = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
$pidReal = if ($conectorApi) { $conectorApi.OwningProcess } else { $estado.backendPid }
$procesoActual = Get-CimInstance Win32_Process -Filter "ProcessId=$pidReal"
if (-not $procesoActual -or $procesoActual.Name -ne 'java.exe' -or
    $procesoActual.CommandLine -notmatch 'servidor-revision-.*\.jar') {
    throw 'No se encontró el backend de revisión registrado.'
}
if (-not (Test-Path -LiteralPath $estado.backendJarEjecucion -PathType Leaf)) {
    throw 'No se encontró el archivo del backend activo.'
}
# Copia únicamente la configuración de esta aplicación, sin guardar ni mostrar claves.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ConfiguracionProcesoRevision {
    [StructLayout(LayoutKind.Sequential)]
    public struct PBI { public IntPtr A, Peb, B, C, Id, Parent; }
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int id);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool ReadProcessMemory(IntPtr h, IntPtr address, byte[] buffer, IntPtr size, out IntPtr read);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(IntPtr h, int kind, out PBI result, int size, out int returned);
    static IntPtr Pointer(IntPtr h, IntPtr address) {
        byte[] buffer = new byte[IntPtr.Size]; IntPtr read;
        if (!ReadProcessMemory(h, address, buffer, (IntPtr)buffer.Length, out read) || read.ToInt32()!=buffer.Length)
            throw new InvalidOperationException("No se pudo recuperar la configuración del backend.");
        return new IntPtr(BitConverter.ToInt64(buffer,0));
    }
    public static string ReadEnvironment(int id) {
        if (IntPtr.Size!=8) throw new InvalidOperationException("Se requiere PowerShell de 64 bits.");
        IntPtr h=OpenProcess(0x410,false,id);
        if (h==IntPtr.Zero) throw new InvalidOperationException("No se pudo abrir el backend registrado.");
        try {
            PBI info; int returned;
            if(NtQueryInformationProcess(h,0,out info,Marshal.SizeOf(typeof(PBI)),out returned)!=0)
                throw new InvalidOperationException("No se pudo consultar el backend registrado.");
            IntPtr parameters=Pointer(h,IntPtr.Add(info.Peb,0x20));
            IntPtr environment=Pointer(h,IntPtr.Add(parameters,0x80));
            var result=new System.Text.StringBuilder();
            byte[] buffer=new byte[2]; IntPtr read;
            bool previousNull=false;
            for(int offset=0;offset<131072;offset+=2) {
                if(!ReadProcessMemory(h,IntPtr.Add(environment,offset),buffer,(IntPtr)2,out read)||read.ToInt32()!=2)
                    throw new InvalidOperationException("No se pudo copiar la configuración completa.");
                char value=(char)(buffer[0]|buffer[1]<<8);
                if(value=='\0' && previousNull) return result.ToString();
                result.Append(value); previousNull=value=='\0';
            }
            throw new InvalidOperationException("El bloque de configuración es demasiado grande.");
        } finally {CloseHandle(h);}
    }
}
'@
$configuracion = @{}
foreach ($entrada in ([ConfiguracionProcesoRevision]::ReadEnvironment($estado.backendPid) -split "`0")) {
    $separador = $entrada.IndexOf('=')
    if ($separador -gt 0) {
        $nombre = $entrada.Substring(0, $separador)
        if ($nombre -match '^(BD|ADMININICIAL|ALMACENAMIENTO|CORREO|SEGURIDAD|URLPUBLICAFRONTEND$|PARQUEDATOS$|PUERTOSERVIDOR$|SERVER_ADDRESS$|SPRING_)') {
            $configuracion[$nombre] = $entrada.Substring($separador + 1)
        }
    }
}
if ($configuracion['BDNOMBRE'] -ne 'RevisionParqueLocal' -or
    [string]::IsNullOrWhiteSpace($configuracion['BDCONTRASENA'])) {
    throw 'No se recuperó la configuración original de la base de revisión.'
}
$configuracion['CORREOENVIOHABILITADO'] = 'false'
$configuracion['CORREOPROBARCONEXIONALINICIAR'] = 'false'
$configuracion['CORREOCLAVEAPLICACION'] = ''
$configuracion['URLPUBLICAFRONTEND'] = 'http://127.0.0.1:5173'
$configuracion['ADMININICIALHABILITADO'] = 'false'
if ($HabilitarSmtp) {
    Add-Type -AssemblyName System.Security -ErrorAction Stop
    $rutaCredencial = Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\correo-gmail.dpapi'
    $claveCifrada = [Convert]::FromBase64String((Get-Content -Raw -LiteralPath $rutaCredencial).Trim())
    $claveBytes = $null
    try {
        $claveBytes = [Security.Cryptography.ProtectedData]::Unprotect(
            $claveCifrada,
            [Text.Encoding]::UTF8.GetBytes('ParqueErickBarrondo.CorreoGmail.v1'),
            [Security.Cryptography.DataProtectionScope]::CurrentUser)
        $configuracion['CORREOCLAVEAPLICACION'] = [Text.Encoding]::UTF8.GetString($claveBytes).Replace(' ', '')
    }
    finally {
        [Array]::Clear($claveCifrada, 0, $claveCifrada.Length)
        if ($claveBytes) { [Array]::Clear($claveBytes, 0, $claveBytes.Length) }
    }
    if ($configuracion['CORREOCLAVEAPLICACION'].Length -ne 16) {
        throw 'La credencial SMTP cifrada no contiene una contraseña de aplicación válida.'
    }
    $configuracion['CORREOENVIOHABILITADO'] = 'true'
    $configuracion['CORREOPROBARCONEXIONALINICIAR'] = 'true'
    $configuracion['CORREOSMTPHOST'] = 'smtp.gmail.com'
    $configuracion['CORREOSMTPPUERTO'] = '587'
    $configuracion['CORREONOREPLY'] = 'notific.parqueerickbarrondo@gmail.com'
}
$rutaJava = (Get-Command java.exe -ErrorAction Stop).Source
$directorioBackend = Join-Path (Split-Path -Parent $PSScriptRoot) 'backend'
$rutaJarArranque = $estado.backendJarEjecucion
if ($ActualizarBackend) {
    $rutaCompilada = Join-Path $directorioBackend 'target\servidor-0.0.1-SNAPSHOT.jar'
    if (-not (Test-Path -LiteralPath $rutaCompilada -PathType Leaf)) {
        throw 'No se encontró el backend compilado para actualizar la revisión local.'
    }
    $rutaJarArranque = Join-Path (Split-Path -Parent $estado.backendJarEjecucion) `
        "servidor-revision-$(Get-Date -Format 'yyyyMMddHHmmss')-$([Guid]::NewGuid().ToString('N')).jar"
    Copy-Item -LiteralPath $rutaCompilada -Destination $rutaJarArranque
}
foreach ($nombre in $configuracion.Keys) {
    [Environment]::SetEnvironmentVariable($nombre, $configuracion[$nombre], 'Process')
}
$marca = Get-Date -Format 'yyyyMMddHHmmss'
$rutaSalida = Join-Path $env:TEMP "parque-backend-$marca.log"
$rutaErrores = Join-Path $env:TEMP "parque-backend-$marca.err.log"
Stop-Process -Id $pidReal -Force
if ($estado.backendPid -ne $pidReal) {
    $procesoRegistrado = Get-CimInstance Win32_Process -Filter "ProcessId=$($estado.backendPid)"
    if ($procesoRegistrado -and $procesoRegistrado.Name -eq 'java.exe' -and
        $procesoRegistrado.CommandLine -match 'servidor-revision-.*\.jar') {
        Stop-Process -Id $estado.backendPid -Force
    }
}
for ($i=0; $i -lt 20; $i++) {
    if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 250
}
$nuevo = Start-Process -FilePath $rutaJava -ArgumentList @('-jar', ('"{0}"' -f $rutaJarArranque)) `
    -WorkingDirectory $directorioBackend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $rutaSalida -RedirectStandardError $rutaErrores
$disponible = $false
for ($i=0; $i -lt 60; $i++) {
    if ($nuevo.HasExited) { break }
    try {
        $respuesta = Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/sistema/estado' -TimeoutSec 2
        if ($respuesta.estado -eq 'DISPONIBLE') { $disponible=$true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
}
if (-not $disponible) { throw 'El backend no quedó disponible después de actualizar SMTP.' }
$listenerApi = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction Stop | Select-Object -First 1
$estado.backendPid=$listenerApi.OwningProcess
$estado.backendJarEjecucion=$rutaJarArranque
$estado.correoSmtpHabilitado=[bool]$HabilitarSmtp
$estado.urlPublicaFrontend='http://127.0.0.1:5173'
$estado.iniciadoEn=(Get-Date).ToString('o')
$estado.backendLog=$rutaSalida
$estado.backendErrorLog=$rutaErrores
$estado | ConvertTo-Json | Set-Content -LiteralPath $rutaEstado -Encoding UTF8
if ($HabilitarSmtp) {
    $salud = Invoke-RestMethod 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 20
    if ($salud.status -ne 'UP') { throw 'La API no confirmó el servicio SMTP.' }
}
Write-Output "SMTP $(if ($HabilitarSmtp) { 'habilitado y verificado' } else { 'deshabilitado' }). API disponible. SQL y frontend conservados. Cloudflare apagado."
