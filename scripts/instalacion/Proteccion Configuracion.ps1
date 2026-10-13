function ConvertirTextoSeguro([Security.SecureString]$Texto) {
    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Texto)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero) }
}

function NuevosBytes([int]$Cantidad) {
    $bytes = New-Object byte[] $Cantidad
    $generador = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generador.GetBytes($bytes) } finally { $generador.Dispose() }
    return ,$bytes
}

function ProtegerConfiguracion([string]$Texto, [string]$Clave) {
    $sal = NuevosBytes 16; $iv = NuevosBytes 16
    $derivador = [Security.Cryptography.Rfc2898DeriveBytes]::new($Clave, $sal, 210000, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $material = $derivador.GetBytes(64); $derivador.Dispose()
    $aes = [Security.Cryptography.Aes]::Create(); $aes.Key = $material[0..31]; $aes.IV = $iv
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Texto)
        $cifrado = $aes.CreateEncryptor().TransformFinalBlock($bytes, 0, $bytes.Length)
        $hmac = [Security.Cryptography.HMACSHA256]::new([byte[]]$material[32..63])
        try { $mac = $hmac.ComputeHash([byte[]]($sal + $iv + $cifrado)) } finally { $hmac.Dispose() }
        return [ordered]@{ version=1; sal=[Convert]::ToBase64String($sal); iv=[Convert]::ToBase64String($iv); contenido=[Convert]::ToBase64String($cifrado); firma=[Convert]::ToBase64String($mac) } | ConvertTo-Json
    } finally { $aes.Dispose(); [Array]::Clear($material, 0, $material.Length) }
}

function DesprotegerConfiguracion([string]$Documento, [string]$Clave) {
    $datos = $Documento | ConvertFrom-Json
    if ($datos.version -ne 1) { throw 'Formato de configuración desconocido.' }
    $sal=[Convert]::FromBase64String($datos.sal); $iv=[Convert]::FromBase64String($datos.iv)
    $cifrado=[Convert]::FromBase64String($datos.contenido); $firma=[Convert]::FromBase64String($datos.firma)
    $derivador=[Security.Cryptography.Rfc2898DeriveBytes]::new($Clave,$sal,210000,[Security.Cryptography.HashAlgorithmName]::SHA256)
    $material=$derivador.GetBytes(64); $derivador.Dispose()
    try {
        $hmac=[Security.Cryptography.HMACSHA256]::new([byte[]]$material[32..63])
        try { $esperada=$hmac.ComputeHash([byte[]]($sal+$iv+$cifrado)) } finally { $hmac.Dispose() }
        $diferencia=$firma.Length -bxor $esperada.Length
        for ($i=0; $i -lt $esperada.Length; $i++) { if ($i -lt $firma.Length) { $diferencia=$diferencia -bor ($firma[$i] -bxor $esperada[$i]) } }
        if ($diferencia -ne 0) { throw 'Contraseña incorrecta o configuración dañada.' }
        $aes=[Security.Cryptography.Aes]::Create(); $aes.Key=$material[0..31]; $aes.IV=$iv
        try { [Text.Encoding]::UTF8.GetString($aes.CreateDecryptor().TransformFinalBlock($cifrado,0,$cifrado.Length)) }
        finally { $aes.Dispose() }
    } finally { [Array]::Clear($material,0,$material.Length) }
}
