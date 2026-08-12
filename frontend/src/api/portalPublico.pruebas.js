import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularRecorridoPeatonal } from "./portalPublico";

function codificarPolilinea6(coordenadas) {
  let latitudAnterior = 0;
  let longitudAnterior = 0;

  function codificarDiferencia(diferencia) {
    let valor = diferencia < 0 ? ~(diferencia << 1) : diferencia << 1;
    let resultado = "";
    while (valor >= 0x20) {
      resultado += String.fromCharCode((0x20 | (valor & 0x1f)) + 63);
      valor >>= 5;
    }
    return resultado + String.fromCharCode(valor + 63);
  }

  return coordenadas.map(([longitud, latitud]) => {
    const latitudActual = Math.round(latitud * 1e6);
    const longitudActual = Math.round(longitud * 1e6);
    const segmento = codificarDiferencia(latitudActual - latitudAnterior)
      + codificarDiferencia(longitudActual - longitudAnterior);
    latitudAnterior = latitudActual;
    longitudAnterior = longitudActual;
    return segmento;
  }).join("");
}

afterEach(() => vi.unstubAllGlobals());

describe("Servicio público de recorridos peatonales", () => {
  it("solicita una ruta peatonal y transforma la geometría para MapLibre", async () => {
    const coordenadas = [
      [-90.55001, 14.60001],
      [-90.551, 14.601],
      [-90.552, 14.602],
    ];
    const fetchSimulado = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        trip: {
          status: 0,
          summary: { length: 0.125, time: 95 },
          legs: [{
            shape: codificarPolilinea6(coordenadas),
            maneuvers: [{ instruction: "Camine hacia el norte.", length: 0.08, time: 60 }],
          }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSimulado);

    const recorrido = await calcularRecorridoPeatonal(
      { latitud: 14.60001, longitud: -90.55001 },
      { latitud: 14.602, longitud: -90.552 },
    );

    expect(fetchSimulado).toHaveBeenCalledWith(
      expect.stringContaining("/route?json="),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Client-Id": "parque-erick-barrondo-web" }),
      }),
    );
    const urlSolicitada = new window.URL(fetchSimulado.mock.calls[0][0]);
    const solicitud = JSON.parse(urlSolicitada.searchParams.get("json"));
    expect(solicitud).toEqual(expect.objectContaining({ costing: "pedestrian" }));
    expect(solicitud.locations).toEqual([
      { lat: 14.60001, lon: -90.55001, type: "break" },
      { lat: 14.602, lon: -90.552, type: "break" },
    ]);
    expect(recorrido).toEqual({
      distanciaTotalMetros: 125,
      duracionTotalSegundos: 95,
      coordenadas,
      instrucciones: [{
        instruccion: "Camine hacia el norte.",
        distanciaMetros: 80,
        duracionSegundos: 60,
      }],
      proveedor: "Valhalla y OpenStreetMap",
    });
  });
});
