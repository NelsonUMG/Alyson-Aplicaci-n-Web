[CmdletBinding()]
param(
    [Parameter()]
    [string]$Url = 'http://127.0.0.1:8080/api/v1/publico/publicaciones',

    [Parameter()]
    [ValidateRange(1, 2000)]
    [int]$CantidadSolicitudes = 40,

    [Parameter()]
    [ValidateRange(1, 100)]
    [int]$Concurrencia = 4
)

$ErrorActionPreference = 'Stop'
$uri = [Uri]$Url
if ($uri.Scheme -notin @('http', 'https')) {
    throw 'La URL de medición debe usar HTTP o HTTPS.'
}

if (-not ('ParqueErickBarrondo.MedidorHttp' -as [type])) {
    Add-Type -Language CSharp -ReferencedAssemblies 'System.Net.Http.dll' -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace ParqueErickBarrondo {
    public sealed class ResultadoHttp {
        public double Milisegundos { get; set; }
        public int Estado { get; set; }
        public string Error { get; set; }
    }

    public static class MedidorHttp {
        public static ResultadoHttp[] Ejecutar(string url, int cantidad, int concurrencia) {
            using (var cliente = new HttpClient { Timeout = TimeSpan.FromSeconds(30) })
            using (var limite = new SemaphoreSlim(concurrencia)) {
                var resultados = new ConcurrentBag<ResultadoHttp>();
                var tareas = Enumerable.Range(0, cantidad).Select(async indice => {
                    await limite.WaitAsync().ConfigureAwait(false);
                    var reloj = Stopwatch.StartNew();
                    try {
                        using (var respuesta = await cliente.GetAsync(url).ConfigureAwait(false)) {
                            await respuesta.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                            resultados.Add(new ResultadoHttp {
                                Milisegundos = reloj.Elapsed.TotalMilliseconds,
                                Estado = (int)respuesta.StatusCode,
                                Error = respuesta.IsSuccessStatusCode ? null : "HTTP " + (int)respuesta.StatusCode
                            });
                        }
                    } catch (Exception excepcion) {
                        resultados.Add(new ResultadoHttp {
                            Milisegundos = reloj.Elapsed.TotalMilliseconds,
                            Estado = 0,
                            Error = excepcion.GetType().Name
                        });
                    } finally {
                        limite.Release();
                    }
                }).ToArray();
                Task.WhenAll(tareas).GetAwaiter().GetResult();
                return resultados.ToArray();
            }
        }
    }
}
'@
}

$resultados = [ParqueErickBarrondo.MedidorHttp]::Ejecutar(
    $uri.AbsoluteUri,
    $CantidadSolicitudes,
    $Concurrencia)
$fallos = @($resultados | Where-Object { $_.Error }).Count
$duraciones = @($resultados | Sort-Object Milisegundos | Select-Object -ExpandProperty Milisegundos)

function ObtenerPercentil {
    param([double[]]$Valores, [double]$Percentil)
    $indice = [Math]::Ceiling(($Percentil / 100) * $Valores.Count) - 1
    return $Valores[[Math]::Max(0, [Math]::Min($indice, $Valores.Count - 1))]
}

$resumen = [PSCustomObject]@{
    Url = $uri.AbsoluteUri
    Solicitudes = $CantidadSolicitudes
    Concurrencia = $Concurrencia
    Exitosas = $CantidadSolicitudes - $fallos
    Fallidas = $fallos
    MinimoMs = [Math]::Round($duraciones[0], 2)
    P50Ms = [Math]::Round((ObtenerPercentil -Valores $duraciones -Percentil 50), 2)
    P95Ms = [Math]::Round((ObtenerPercentil -Valores $duraciones -Percentil 95), 2)
    MaximoMs = [Math]::Round($duraciones[-1], 2)
}
$resumen | Format-List | Out-String | Write-Host

if ($fallos -gt 0) {
    throw "La medición recibió $fallos respuestas fallidas."
}

$resumen
