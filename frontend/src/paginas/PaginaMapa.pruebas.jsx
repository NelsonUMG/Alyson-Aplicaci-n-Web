import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMapa = vi.hoisted(() => ({
  calcularRutaMapa: vi.fn(),
  consultarMapa: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiMapa);

import { PaginaMapa } from "./PaginaMapa";

describe("Mapa público", () => {
  beforeEach(() => {
    apiMapa.consultarMapa.mockReset().mockResolvedValue({
      nodos: [
        { idNodoMapa: 1, nombre: "Entrada principal", tipoNodo: "ENTRADA", latitud: 14.6, longitud: -90.55, accesible: true },
        { idNodoMapa: 2, nombre: "Intersección", tipoNodo: "INTERSECCION", latitud: 14.601, longitud: -90.551, accesible: true },
        {
          idNodoMapa: 3,
          idArea: 9,
          nombre: "Cancha",
          nombreArea: "Cancha",
          tipoNodo: "DESTINO",
          latitud: 14.602,
          longitud: -90.552,
          accesible: true,
          estadoArea: "DISPONIBLE",
          estadoCalculadoArea: "ENUSO",
          disponibleAhora: false,
          cambiaEstadoEn: new Date(Date.now() + 3600000).toISOString(),
          tituloReservaActiva: "Entrenamiento",
        },
      ],
      conexiones: [
        { idConexionMapa: 11, idNodoOrigen: 1, idNodoDestino: 2, cerrada: false },
        { idConexionMapa: 12, idNodoOrigen: 2, idNodoDestino: 3, cerrada: false },
      ],
      actualizadoEn: "2026-08-03T12:00:00Z",
    });
    apiMapa.calcularRutaMapa.mockReset().mockResolvedValue({
      distanciaTotalMetros: 125,
      pasos: [
        { idNodoMapa: 1, nombre: "Entrada principal" },
        { idNodoMapa: 2, nombre: "Intersección" },
        { idNodoMapa: 3, nombre: "Cancha" },
      ],
    });
    Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => null),
    });
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: vi.fn((correcto) => {
          correcto({ coords: { latitude: 14.60001, longitude: -90.55001, accuracy: 8 } });
          return 31;
        }),
        clearWatch: vi.fn(),
      },
    });
  });

  it("usa la ubicación solo para elegir un nodo y calcula con identificadores", async () => {
    render(<PaginaMapa />);

    expect(await screen.findAllByRole("option", { name: "Cancha" })).toHaveLength(2);
    expect(await screen.findByText("ENUSO")).toBeTruthy();
    expect(screen.getByText("Entrenamiento")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
    expect(await screen.findByText(/precisión aproximada de 8 metros/)).toBeTruthy();
    expect(screen.getByLabelText("Origen").value).toBe("1");
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular recorrido" }));

    expect(await screen.findByText("Distancia aproximada: 125 metros.")).toBeTruthy();
    expect(apiMapa.calcularRutaMapa).toHaveBeenCalledWith("1", "3", false);
    expect(screen.getByLabelText("Mapa pendiente de habilitación")).toBeTruthy();
  });
});
