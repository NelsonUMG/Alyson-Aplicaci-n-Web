import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMapa = vi.hoisted(() => ({
  calcularRecorridoPeatonal: vi.fn(),
  consultarMapa: vi.fn(),
}));

const simuladorMapLibre = vi.hoisted(() => {
  const estado = {
    eventosMapa: new Map(),
    fuentes: new Map(),
    marcadores: [],
    controles: [],
    ultimoGeolocalizador: null,
  };

  estado.instanciaMapa = {
    addControl: vi.fn((control) => {
      estado.controles.push(control);
      return estado.instanciaMapa;
    }),
    addLayer: vi.fn(),
    addSource: vi.fn((identificador, fuente) => {
      estado.fuentes.set(identificador, { ...fuente, setData: vi.fn() });
    }),
    fitBounds: vi.fn(),
    getStyle: vi.fn(() => ({ layers: [{ id: "etiquetas-base", type: "symbol" }] })),
    getSource: vi.fn((identificador) => estado.fuentes.get(identificador)),
    off: vi.fn(),
    on: vi.fn((evento, capaOManejador, manejadorDelegado) => {
      const manejador = manejadorDelegado || capaOManejador;
      const clave = manejadorDelegado ? `${evento}:${capaOManejador}` : evento;
      estado.eventosMapa.set(clave, manejador);
      if (evento === "load") Promise.resolve().then(manejador);
      return estado.instanciaMapa;
    }),
    queryRenderedFeatures: vi.fn(() => []),
    remove: vi.fn(),
    setLayoutProperty: vi.fn(),
  };

  estado.Map = vi.fn(function MapaSimulado(opciones) {
    estado.opcionesMapa = opciones;
    return estado.instanciaMapa;
  });
  estado.NavigationControl = vi.fn(function NavegacionSimulada(opciones) {
    this.opciones = opciones;
  });
  estado.GeolocateControl = vi.fn(function GeolocalizadorSimulado(opciones) {
    this.opciones = opciones;
    this.eventos = new Map();
    this.activo = false;
    this.on = vi.fn((evento, manejador) => {
      this.eventos.set(evento, manejador);
      return this;
    });
    this.trigger = vi.fn(() => {
      this.activo = !this.activo;
      this.eventos.get(this.activo ? "trackuserlocationstart" : "trackuserlocationend")?.({});
      if (this.activo) {
        this.eventos.get("geolocate")?.({
          coords: { latitude: 14.60001, longitude: -90.55001, accuracy: 6.8 },
        });
      }
      return true;
    });
    estado.ultimoGeolocalizador = this;
  });
  estado.Popup = vi.fn(function PopupSimulado() {
    this.setLngLat = vi.fn(() => this);
    this.setDOMContent = vi.fn((contenido) => {
      this.contenido = contenido;
      return this;
    });
    this.addTo = vi.fn(() => this);
  });
  estado.Marker = vi.fn(function MarcadorSimulado(opciones = {}) {
    this.opciones = opciones;
    this.setLngLat = vi.fn((coordenada) => {
      this.coordenada = coordenada;
      return this;
    });
    this.setPopup = vi.fn((popup) => {
      this.popup = popup;
      return this;
    });
    this.addTo = vi.fn(() => this);
    this.remove = vi.fn();
    estado.marcadores.push(this);
  });
  estado.LngLatBounds = vi.fn(function LimitesSimulados() {
    this.extend = vi.fn(() => this);
  });
  estado.setWorkerUrl = vi.fn();
  estado.supported = vi.fn(() => true);
  estado.emitirMapa = (evento, datos) => estado.eventosMapa.get(evento)?.(datos);
  estado.emitirCapa = (evento, capa, datos) => estado.eventosMapa.get(`${evento}:${capa}`)?.(datos);
  estado.reiniciar = () => {
    estado.eventosMapa.clear();
    estado.fuentes.clear();
    estado.marcadores.length = 0;
    estado.controles.length = 0;
    estado.ultimoGeolocalizador = null;
    estado.opcionesMapa = null;
    estado.Map.mockClear();
    estado.NavigationControl.mockClear();
    estado.GeolocateControl.mockClear();
    estado.Popup.mockClear();
    estado.Marker.mockClear();
    estado.LngLatBounds.mockClear();
    Object.values(estado.instanciaMapa).forEach((valor) => valor?.mockClear?.());
  };
  return estado;
});

vi.mock("../api/portalPublico", () => apiMapa);
vi.mock("maplibre-gl", () => simuladorMapLibre);

import { PaginaMapa } from "./PaginaMapa";

describe("Mapa público con OpenFreeMap y MapLibre", () => {
  beforeEach(() => {
    simuladorMapLibre.reiniciar();
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
      conexiones: [],
      areas: [
        {
          idArea: 9,
          codigoArea: "CANCHA",
          nombreArea: "Cancha",
          estadoArea: "DISPONIBLE",
          estadoCalculadoArea: "ENUSO",
          disponibleAhora: false,
          cambiaEstadoEn: new Date(Date.now() + 3600000).toISOString(),
          tituloReservaActiva: "Entrenamiento",
          latitudCentro: 14.602,
          longitudCentro: -90.552,
        },
      ],
      actualizadoEn: "2026-08-03T12:00:00Z",
    });
    apiMapa.calcularRecorridoPeatonal.mockReset().mockResolvedValue({
      distanciaTotalMetros: 125,
      duracionTotalSegundos: 95,
      coordenadas: [
        [-90.55001, 14.60001],
        [-90.551, 14.601],
        [-90.552, 14.602],
      ],
      instrucciones: [
        { instruccion: "Camine hacia el norte." },
        { instruccion: "Su destino está a la derecha." },
      ],
      proveedor: "Valhalla y OpenStreetMap",
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("inicia en el parque, usa GPS real y dibuja el recorrido hacia el área seleccionada", async () => {
    render(<PaginaMapa />);

    expect(await screen.findByRole("option", { name: "Cancha" })).toBeTruthy();
    await waitFor(() => expect(simuladorMapLibre.Map).toHaveBeenCalledOnce());
    expect(simuladorMapLibre.opcionesMapa).toEqual(expect.objectContaining({
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-90.5410824, 14.6391786],
      zoom: 15.5,
      attributionControl: { compact: false },
    }));
    expect(simuladorMapLibre.setWorkerUrl).toHaveBeenCalledOnce();
    expect(simuladorMapLibre.NavigationControl).toHaveBeenCalledOnce();
    expect(simuladorMapLibre.GeolocateControl).toHaveBeenCalledWith(expect.objectContaining({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    }));
    const marcadorParque = simuladorMapLibre.marcadores.find((marcador) => marcador.opciones.element?.className === "mapa-marcador-parque");
    expect(marcadorParque.coordenada).toEqual([-90.5410824, 14.6391786]);
    expect(marcadorParque.popup.contenido.textContent).toContain("Parque Erick Barrondo");
    expect(marcadorParque.popup.contenido.textContent).toContain("Centro deportivo y recreativo");
    expect(simuladorMapLibre.fuentes.get("vista-satelital")).toEqual(expect.objectContaining({
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    }));
    expect(simuladorMapLibre.fuentes.has("areas-parque")).toBe(false);
    expect(simuladorMapLibre.fuentes.has("conexiones-parque")).toBe(false);
    expect(simuladorMapLibre.Marker).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Estados de las áreas")).toBeNull();
    expect(screen.getByRole("button", { name: "Satélite" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ver información y atribuciones del mapa" }));
    expect(screen.getByRole("dialog", { name: "Información del mapa y atribuciones" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Imágenes satelitales" })).toBeTruthy();
    expect(screen.getByText("Esri")).toBeTruthy();
    expect(screen.getByText(/Esta aplicación no reclama propiedad/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar información del mapa" }));
    expect(screen.queryByRole("dialog", { name: "Información del mapa y atribuciones" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Mapa" }));
    await waitFor(() => expect(simuladorMapLibre.instanciaMapa.setLayoutProperty)
      .toHaveBeenLastCalledWith("vista-satelital", "visibility", "none"));
    expect(screen.getByRole("button", { name: "Mapa" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ver información y atribuciones del mapa" }));
    expect(screen.getByRole("heading", { name: "Mapa estándar" })).toBeTruthy();
    expect(screen.getByText("OpenFreeMap")).toBeTruthy();

    expect(await screen.findByText("En uso", { selector: ".mapa-estado-disponibilidad" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
    expect(await screen.findByText(/precisión aproximada de 7 metros/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Detener ubicación" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "9" } });

    expect(await screen.findByText("Distancia aproximada: 125 metros.")).toBeTruthy();
    expect(screen.getByText("Tiempo estimado caminando: 2 min.")).toBeTruthy();
    expect(screen.getByText("Camine hacia el norte.")).toBeTruthy();
    expect(apiMapa.calcularRecorridoPeatonal).toHaveBeenCalledWith(
      { latitud: 14.60001, longitud: -90.55001, precision: 6.8 },
      { latitud: 14.602, longitud: -90.552 },
    );
    await waitFor(() => expect(simuladorMapLibre.fuentes.get("ruta-parque").setData).toHaveBeenCalled());
    const recorrido = simuladorMapLibre.fuentes.get("ruta-parque").setData.mock.calls.at(-1)[0];
    expect(recorrido.features[0].geometry.coordinates).toEqual([
      [-90.55001, 14.60001],
      [-90.551, 14.601],
      [-90.552, 14.602],
    ]);
    expect(screen.getByLabelText("Mapa interactivo del Parque Erick Barrondo")).toBeTruthy();
  });

  it("no expone coordenadas, perímetros ni áreas disponibles", async () => {
    apiMapa.consultarMapa.mockResolvedValue({
      nodos: [],
      conexiones: [],
      areas: [{
        idArea: 12,
        nombreArea: "Cancha disponible",
        estadoCalculadoArea: "DISPONIBLE",
        latitudCentro: 14.639,
        longitudCentro: -90.541,
      }],
      actualizadoEn: null,
    });
    render(<PaginaMapa />);

    expect(await screen.findByRole("heading", { name: "Mapa del Parque Erick Barrondo" })).toBeTruthy();
    expect(screen.getByText("No hay áreas en uso ni en mantenimiento en este momento.")).toBeTruthy();
    expect(screen.queryByText("Cancha disponible")).toBeNull();
    expect(screen.queryByText(/Latitud:/)).toBeNull();
    expect(screen.queryByText(/Longitud:/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Copiar coordenadas" })).toBeNull();
    expect(simuladorMapLibre.eventosMapa.has("click")).toBe(false);
    expect(simuladorMapLibre.Marker).toHaveBeenCalledTimes(1);
  });
});
