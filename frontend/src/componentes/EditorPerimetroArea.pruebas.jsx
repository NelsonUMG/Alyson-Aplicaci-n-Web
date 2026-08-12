import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const simulador = vi.hoisted(() => {
  const estado = { eventos: new Map(), fuentes: new Map(), marcadores: [] };
  estado.instancia = {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn((identificador, fuente) => {
      estado.fuentes.set(identificador, { ...fuente, setData: vi.fn() });
    }),
    fitBounds: vi.fn(),
    getSource: vi.fn((identificador) => estado.fuentes.get(identificador)),
    getStyle: vi.fn(() => ({ layers: [{ id: "etiquetas", type: "symbol" }] })),
    off: vi.fn(),
    on: vi.fn((evento, manejador) => {
      estado.eventos.set(evento, manejador);
      if (evento === "load") Promise.resolve().then(manejador);
    }),
    remove: vi.fn(),
  };
  estado.Map = vi.fn(function Mapa() { return estado.instancia; });
  estado.NavigationControl = vi.fn(function Control() {});
  estado.Marker = vi.fn(function Marcador(opciones) {
    this.opciones = opciones;
    this.setLngLat = vi.fn(() => this);
    this.addTo = vi.fn(() => this);
    this.remove = vi.fn();
    estado.marcadores.push(this);
  });
  estado.LngLatBounds = vi.fn(function Limites() { this.extend = vi.fn(() => this); });
  estado.setWorkerUrl = vi.fn();
  estado.reiniciar = () => {
    estado.eventos.clear();
    estado.fuentes.clear();
    estado.marcadores.length = 0;
    Object.values(estado.instancia).forEach((valor) => valor?.mockClear?.());
  };
  return estado;
});

vi.mock("maplibre-gl", () => simulador);

import { EditorPerimetroArea } from "./EditorPerimetroArea";

function EditorControlado() {
  const [perimetro, establecerPerimetro] = useState([]);
  return <EditorPerimetroArea perimetro={perimetro} alCambiar={establecerPerimetro} />;
}

describe("Editor del perímetro de un área", () => {
  beforeEach(() => simulador.reiniciar());

  it("agrega vértices en orden, cierra el polígono y permite deshacer", async () => {
    render(<EditorControlado />);
    await waitFor(() => expect(simulador.eventos.has("click")).toBe(true));

    act(() => simulador.eventos.get("click")({ lngLat: { lat: 14.6391, lng: -90.5413 } }));
    act(() => simulador.eventos.get("click")({ lngLat: { lat: 14.6391, lng: -90.5409 } }));
    act(() => simulador.eventos.get("click")({ lngLat: { lat: 14.6395, lng: -90.5409 } }));

    expect(await screen.findByText("3 vértices marcados.")).toBeTruthy();
    expect(simulador.marcadores).toHaveLength(6);
    const datos = simulador.fuentes.get("perimetro-area-edicion").setData.mock.calls.at(-1)[0];
    expect(datos.features[0].geometry.type).toBe("Polygon");
    expect(datos.features[0].geometry.coordinates[0][0])
      .toEqual(datos.features[0].geometry.coordinates[0].at(-1));

    fireEvent.click(screen.getByRole("button", { name: "Deshacer último punto" }));
    expect(await screen.findByText("2 vértices marcados.")).toBeTruthy();
  });
});
