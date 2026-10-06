import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMapa = vi.hoisted(() => ({ consultarMapa: vi.fn() }));

const simuladorMapLibre = vi.hoisted(() => {
  const estado = { fuentes: new Map(), marcadores: [] };
  estado.instanciaMapa = {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn((identificador, fuente) => estado.fuentes.set(identificador, {
      ...fuente, setData: vi.fn((datos) => { estado.fuentes.get(identificador).data = datos; }),
    })),
    getSource: vi.fn((identificador) => estado.fuentes.get(identificador)),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    getStyle: vi.fn(() => ({ layers: [{ id: "etiquetas-base", type: "symbol" }] })),
    getZoom: vi.fn(() => 18.5),
    project: vi.fn(([longitud, latitud]) => ({ x: (longitud + 91) * 1000, y: (15 - latitud) * 1000 })),
    off: vi.fn(),
    on: vi.fn((evento, manejador) => {
      if (evento === "style.load") Promise.resolve().then(manejador);
    }),
    remove: vi.fn(),
    setLayoutProperty: vi.fn(),
  };
  estado.Map = vi.fn(function MapaSimulado(opciones) {
    estado.opcionesMapa = opciones;
    return estado.instanciaMapa;
  });
  estado.NavigationControl = vi.fn();
  estado.Popup = vi.fn(function PopupSimulado() {
    this.setLngLat = vi.fn(() => this);
    this.setDOMContent = vi.fn(() => this);
    this.addTo = vi.fn(() => this);
    this.remove = vi.fn();
  });
  estado.Marker = vi.fn(function MarcadorSimulado(opciones) {
    this.elemento = opciones.element;
    this.coordenadas = undefined;
    this.setLngLat = vi.fn((coordenadas) => {
      this.coordenadas = coordenadas;
      return this;
    });
    this.setPopup = vi.fn(() => this);
    this.addTo = vi.fn(() => {
      if (!this.coordenadas) throw new Error("El marcador requiere coordenadas antes de agregarse al mapa.");
      return this;
    });
    this.remove = vi.fn();
    estado.marcadores.push(this);
  });
  estado.LngLatBounds = vi.fn(function LimitesSimulados() {
    this.extend = vi.fn(() => this);
  });
  estado.setWorkerUrl = vi.fn();
  estado.reiniciar = () => {
    estado.fuentes.clear();
    estado.marcadores.length = 0;
    estado.Map.mockClear();
    estado.NavigationControl.mockClear();
    estado.Popup.mockClear();
    estado.Marker.mockClear();
    estado.LngLatBounds.mockClear();
    estado.setWorkerUrl.mockClear();
    Object.values(estado.instanciaMapa).forEach((valor) => valor?.mockClear?.());
    estado.instanciaMapa.getZoom.mockReturnValue(18.5);
  };
  return estado;
});

vi.mock("../api/portalPublico", () => apiMapa);
vi.mock("maplibre-gl", () => simuladorMapLibre);

import { PaginaMapa } from "./PaginaMapa";

describe("Mapa público", () => {
  afterEach(cleanup);

  beforeEach(() => {
    simuladorMapLibre.reiniciar();
    apiMapa.consultarMapa.mockReset().mockResolvedValue({
      nodos: [{
        idNodoMapa: 3,
        idArea: 9,
        nombre: "Cancha",
        nombreArea: "Cancha",
        tipoNodo: "DESTINO",
        latitud: 14.602,
        longitud: -90.552,
        estadoCalculadoArea: "ENUSO",
        cambiaEstadoEn: new Date(Date.now() + 3600000).toISOString(),
      }],
      conexiones: [],
      areas: [{
        idArea: 9,
        nombreArea: "Cancha",
        estadoCalculadoArea: "FUERADESERVICIO",
        latitudCentro: 14.6391786,
        longitudCentro: -90.5410824,
        perimetro: [
          { latitud: 14.6390786, longitud: -90.5411824 },
          { latitud: 14.6392786, longitud: -90.5411824 },
          { latitud: 14.6392786, longitud: -90.5409824 },
          { latitud: 14.6390786, longitud: -90.5409824 },
        ],
        cambiaEstadoEn: new Date(Date.now() + 3600000).toISOString(),
      }],
      actualizadoEn: "2026-08-03T12:00:00Z",
    });
  });

  it("muestra el mapa, sus avisos y la ubicación actual sin calcular recorridos", async () => {
    const solicitarUbicacion = vi.fn((exito) => exito({
      coords: { latitude: 14.60001, longitude: -90.55001, accuracy: 6.8 },
    }));
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: solicitarUbicacion },
    });
    render(<PaginaMapa />);

    expect(await screen.findByRole("heading", { name: "Avisos activos de las áreas" })).toBeTruthy();
    await waitFor(() => expect(simuladorMapLibre.Map).toHaveBeenCalledOnce());
    expect(simuladorMapLibre.opcionesMapa).toEqual(expect.objectContaining({
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-90.5410824, 14.6391786],
      zoom: 15.5,
    }));
    expect(screen.getByText("Cancha")).toBeTruthy();
    expect(screen.queryByText("Fuera de servicio")).toBeNull();
    expect(screen.queryByLabelText("Destino")).toBeNull();
    expect(screen.queryByText("Cómo llegar a una cancha")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Activar GPS" }));
    expect(solicitarUbicacion).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
    expect(await screen.findByText(/Ubicación actual mostrada en el mapa/)).toBeTruthy();
    await waitFor(() => expect(simuladorMapLibre.instanciaMapa.flyTo)
      .toHaveBeenLastCalledWith({ center: [-90.55001, 14.60001], zoom: 17, essential: true }));
    const marcadorUbicacion = simuladorMapLibre.marcadores.at(-1);
    expect(marcadorUbicacion.setLngLat).toHaveBeenCalledWith([-90.55001, 14.60001]);
    expect(marcadorUbicacion.addTo).toHaveBeenCalledWith(simuladorMapLibre.instanciaMapa);

    fireEvent.click(screen.getByRole("button", { name: "Mapa" }));
    await waitFor(() => expect(simuladorMapLibre.instanciaMapa.setLayoutProperty)
      .toHaveBeenLastCalledWith("vista-satelital", "visibility", "none"));
  });

  it("informa una lectura GPS inválida sin intentar agregar un marcador", async () => {
    const solicitarUbicacion = vi.fn((exito) => exito({
      coords: { latitude: 95, longitude: -90.55001, accuracy: 6.8 },
    }));
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: solicitarUbicacion },
    });
    render(<PaginaMapa />);

    await screen.findByRole("heading", { name: "Avisos activos de las áreas" });
    fireEvent.click(screen.getByRole("button", { name: "Activar GPS" }));

    expect((await screen.findByRole("alert")).textContent).toBe("El GPS devolvió una ubicación inválida. Verifica la señal e inténtalo nuevamente.");
    expect(simuladorMapLibre.marcadores).toHaveLength(2);
    expect(simuladorMapLibre.instanciaMapa.flyTo).not.toHaveBeenCalled();
  });

  it("dibuja el perímetro y solo acerca el mapa al pulsar el enlace de ubicación", async () => {
    render(<PaginaMapa />);
    const enlaceUbicacion = await screen.findByRole("button", { name: "Ver ubicación en el mapa ↗" });
    await waitFor(() => expect(simuladorMapLibre.fuentes.get("areas-con-aviso")?.data.features).toHaveLength(1));
    const figura = simuladorMapLibre.fuentes.get("areas-con-aviso").data.features[0];
    expect(figura.geometry.type).toBe("Polygon");
    expect(figura.geometry.coordinates[0]).toHaveLength(5);
    expect(figura.geometry.coordinates[0][0]).toEqual(figura.geometry.coordinates[0][4]);
    const perimetroVisible = document.querySelector('polygon[data-id-area="9"]');
    expect(perimetroVisible).toBeTruthy();
    expect(perimetroVisible.getAttribute("stroke-width")).toBe("3");
    const cantidadVentanasAntes = simuladorMapLibre.Popup.mock.calls.length;
    simuladorMapLibre.instanciaMapa.fitBounds.mockClear();
    fireEvent.click(enlaceUbicacion);
    expect(simuladorMapLibre.instanciaMapa.fitBounds).toHaveBeenLastCalledWith(
      expect.anything(), expect.objectContaining({ maxZoom: 18.5, duration: 900 }),
    );
    expect(simuladorMapLibre.Popup).toHaveBeenCalledTimes(cantidadVentanasAntes);
    expect(simuladorMapLibre.fuentes.get("areas-con-aviso").data.features[0].properties.seleccionada).toBe(true);
    expect(document.querySelector('polygon[data-id-area="9"]').getAttribute("stroke-width")).toBe("5");
    const marcador = simuladorMapLibre.marcadores.find((m) => m.elemento.classList.contains("mapa-marcador-area"));
    expect(marcador.coordenadas).toEqual([-90.5410824, 14.6391786]);
    expect(marcador.elemento.textContent).toContain("Fuera de servicio");
    simuladorMapLibre.instanciaMapa.fitBounds.mockClear();
    fireEvent.click(marcador.elemento);
    expect(simuladorMapLibre.instanciaMapa.fitBounds).not.toHaveBeenCalled();
    const manejadorMovimiento = simuladorMapLibre.instanciaMapa.on.mock.calls
      .findLast(([evento]) => evento === "move")?.[1];
    manejadorMovimiento();
    expect(simuladorMapLibre.instanciaMapa.fitBounds).not.toHaveBeenCalled();

    const manejarZoom = simuladorMapLibre.instanciaMapa.on.mock.calls
      .find(([evento]) => evento === "zoom")[1];
    const contenedor = screen.getByLabelText("Mapa interactivo del Parque Erick Barrondo");
    // Lejos debe acompañar a la cancha, nunca conservar un mínimo grande en pantalla.
    simuladorMapLibre.instanciaMapa.getZoom.mockReturnValue(14.5);
    manejarZoom();
    manejadorMovimiento();
    expect(Number(contenedor.style.getPropertyValue("--escala-avisos-mapa"))).toBeCloseTo(1 / 16);
    expect(Number(document.querySelector('polygon[data-id-area="9"]').getAttribute("stroke-width"))).toBeCloseTo(5 / 16);
    expect(marcador.elemento.textContent).toContain("Fuera de servicio");
    simuladorMapLibre.instanciaMapa.getZoom.mockReturnValue(20);
    manejarZoom();
    expect(Number(contenedor.style.getPropertyValue("--escala-avisos-mapa"))).toBe(1);
    expect(simuladorMapLibre.instanciaMapa.fitBounds).not.toHaveBeenCalled();
  });
});
