$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$cliente = [Net.Sockets.TcpClient]::new()
$flujoTls = $null
$claveBytes = $null
$resultado = [ordered]@{ fecha = (Get-Date).ToString('o'); tls = $false; autenticacion = $false; envioReal = $false }
function LeerRespuestaSmtp([int]$Esperado) {
    do {
        $linea = $script:lector.ReadLine()
        if (-not $linea -or $linea.Length -lt 3) { throw 'El servidor SMTP cerro la conexion.' }
        $codigo = [int]$linea.Substring(0,3)
    } while ($linea.Length -gt 3 -and $linea[3] -eq '-')
    if ($codigo -ne $Esperado) { throw "Respuesta SMTP inesperada: $codigo (esperada $Esperado)." }
}
try {
    $conexion = $cliente.ConnectAsync('smtp.gmail.com', 587)
    if (-not $conexion.Wait(15000)) { throw 'Tiempo de conexion SMTP agotado.' }
    $flujo = $cliente.GetStream()
    $flujo.ReadTimeout = 15000
    $flujo.WriteTimeout = 15000
    $script:lector = [IO.StreamReader]::new($flujo,[Text.Encoding]::ASCII,$false,1024,$true)
    $escritor = [IO.StreamWriter]::new($flujo,[Text.Encoding]::ASCII,1024,$true)
    $escritor.NewLine = "`r`n"
    $escritor.AutoFlush = $true
    LeerRespuestaSmtp 220
    $escritor.WriteLine('EHLO localhost')
    LeerRespuestaSmtp 250
    $escritor.WriteLine('STARTTLS')
    LeerRespuestaSmtp 220
    $script:lector.Dispose()
    $escritor.Dispose()
    $flujoTls = [Net.Security.SslStream]::new($flujo,$false)
    $flujoTls.AuthenticateAsClient('smtp.gmail.com')
    $resultado.tls = $flujoTls.IsEncrypted -and $flujoTls.IsAuthenticated
    $script:lector = [IO.StreamReader]::new($flujoTls,[Text.Encoding]::ASCII,$false,1024,$true)
    $escritor = [IO.StreamWriter]::new($flujoTls,[Text.Encoding]::ASCII,1024,$true)
    $escritor.NewLine = "`r`n"
    $escritor.AutoFlush = $true
    $escritor.WriteLine('EHLO localhost')
    LeerRespuestaSmtp 250
    $rutaCredencial = Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\correo-gmail.dpapi'
    $protegida = [Convert]::FromBase64String((Get-Content -Raw -LiteralPath $rutaCredencial).Trim())
    $claveBytes = [Security.Cryptography.ProtectedData]::Unprotect($protegida,
        [Text.Encoding]::UTF8.GetBytes('ParqueErickBarrondo.CorreoGmail.v1'),
        [Security.Cryptography.DataProtectionScope]::CurrentUser)
    $escritor.WriteLine('AUTH LOGIN')
    LeerRespuestaSmtp 334
    $escritor.WriteLine([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('notific.parqueerickbarrondo@gmail.com')))
    LeerRespuestaSmtp 334
    $escritor.WriteLine([Convert]::ToBase64String($claveBytes))
    LeerRespuestaSmtp 235
    $resultado.autenticacion = $true
    $escritor.WriteLine('QUIT')
    LeerRespuestaSmtp 221
    $resultado | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'smtp-comprobacion.json') -Encoding UTF8
    $resultado | ConvertTo-Json
}
finally {
    if ($claveBytes) { [Array]::Clear($claveBytes,0,$claveBytes.Length) }
    if ($flujoTls) { $flujoTls.Dispose() }
    $cliente.Dispose()
}
