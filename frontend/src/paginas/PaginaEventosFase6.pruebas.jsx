import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiPortal = vi.hoisted(() => ({ consultarEvento: vi.fn() }));
const apiInscripciones = vi.hoisted(() => ({
  cancelarInscripcionEvento: vi.fn(),
  consultarInscripcionEvento: vi.fn(),
  inscribirEnEvento: vi.fn(),
}));
const apiAdministracion = vi.hoisted(() => ({
  actualizarEvento: vi.fn(),
  agregarImagenEvento: vi.fn(),
  agregarImagenSecundariaEvento: vi.fn(),
  cancelarEvento: vi.fn(),
  cerrarEvento: vi.fn(),
  crearEvento: vi.fn(),
  eliminarImagenEvento: vi.fn(),
  eliminarImagenSecundariaEvento: vi.fn(),
  finalizarEvento: vi.fn(),
  listarEventosAdministrados: vi.fn(),
  listarImagenesSecundariasEvento: vi.fn(),
  listarInscripcionesAdministradas: vi.fn(),
  publicarEvento: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiPortal);
vi.mock("../api/inscripcionesEventos", () => apiInscripciones);
vi.mock("../api/administracionEventos", () => apiAdministracion);
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({
    cargando: false,
    usuario: {
      permisos: ["EVENTOLEER", "EVENTOCREAR", "EVENTOACTUALIZAR", "EVENTOGESTIONARINSCRIPCIONES"],
    },
  }),
}));

import { PaginaAdministracionEventos } from "./PaginaAdministracionEventos";
import { PaginaDetalleEvento } from "./PaginaDetalleEvento";

afterEach(() => cleanup());

const eventoPublico = {
  idEvento: 7,
  identificadorUrl: "curso-atletismo",
  titulo: "Curso de atletismo",
  descripcion: "Actividad confirmada",
  lugar: "Pista",
  iniciaEn: "2030-08-05T15:00:00Z",
  inscripcionAbreEn: "2026-01-01T00:00:00Z",
  inscripcionCierraEn: "2030-08-04T15:00:00Z",
  capacidadTotal: 30,
  cuposDisponibles: 12,
  estado: "PUBLICADO",
  requisitos: [{ descripcion: "Presentar identificación", obligatorio: true }],
  esquemaFormularioJson: JSON.stringify({ campos: [{
    id: "campo_1",
    etiqueta: "DPI/CUI del participante",
    tipo: "DPI_CUI",
    obligatorio: true,
  }] }),
  imagenesSecundarias: [],
};

describe("Inscripciones de eventos", () => {
  beforeEach(() => {
    apiPortal.consultarEvento.mockReset().mockResolvedValue(eventoPublico);
    apiInscripciones.consultarInscripcionEvento.mockReset().mockResolvedValue(null);
    apiInscripciones.inscribirEnEvento.mockReset().mockResolvedValue({
      idInscripcionEvento: 20,
      idEvento: 7,
      estado: "CONFIRMADA",
      cuposDisponibles: 11,
    });
  });

  it("solicita los requisitos configurados y presenta la confirmación recibida", async () => {
    render(
      <MemoryRouter initialEntries={["/eventos/curso-atletismo"]}>
        <Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes>
      </MemoryRouter>,
    );

    const boton = await screen.findByRole("button", { name: "Confirmar inscripción" });
    const dpi = screen.getByLabelText("DPI/CUI del participante *");
    expect(dpi.getAttribute("pattern")).toBe("[0-9]{13}");
    fireEvent.change(dpi, { target: { value: "1234567890101" } });
    fireEvent.click(boton);

    await waitFor(() => expect(apiInscripciones.inscribirEnEvento).toHaveBeenCalledWith(
      7,
      expect.any(String),
      { campo_1: "1234567890101" },
    ));
    expect(await screen.findByText("Tu inscripción quedó confirmada.")).toBeTruthy();
    expect(screen.getByText("11 de 30")).toBeTruthy();
  });

  it("presenta la galería secundaria con la descripción generada por el sistema", async () => {
    apiPortal.consultarEvento.mockResolvedValue({
      ...eventoPublico,
      imagenesSecundarias: [{
        idImagenEvento: 12,
        url: "/api/v1/publico/eventos/imagenes-secundarias/12",
        descripcionAccesible: "Curso de atletismo, imagen secundaria 1",
        anchoPixeles: 1200,
        altoPixeles: 800,
      }],
    });

    render(
      <MemoryRouter initialEntries={["/eventos/curso-atletismo"]}>
        <Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Galería del evento" })).toBeTruthy();
    expect(screen.getByAltText("Curso de atletismo, imagen secundaria 1")).toBeTruthy();
  });
});

describe("Administración de eventos", () => {
  beforeEach(() => {
    apiAdministracion.listarEventosAdministrados.mockReset().mockResolvedValue({
      contenido: [{
        ...eventoPublico,
        cantidadOcupada: 18,
        actualizadoEn: "2026-08-03T12:00:00Z",
        esquemaFormularioJson: null,
        tieneImagen: false,
        version: 2,
      }],
      pagina: 0,
      totalPaginas: 1,
      totalElementos: 1,
    });
    apiAdministracion.listarInscripcionesAdministradas.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
    });
    apiAdministracion.listarImagenesSecundariasEvento.mockReset().mockResolvedValue([]);
    apiAdministracion.crearEvento.mockReset().mockImplementation(async (datos) => ({
      ...eventoPublico,
      ...datos,
      idEvento: 40,
      cantidadOcupada: 0,
      estado: "BORRADOR",
      tieneImagen: false,
      version: 0,
    }));
  });

  it("muestra cupos calculados y habilita la gestión para el operador autorizado", async () => {
    render(<MemoryRouter><PaginaAdministracionEventos /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Listado de eventos" }));
    expect(await screen.findByText("18 de 30 cupos")).toBeTruthy();
    const filaEvento = screen.getByRole("button", { name: /Curso de atletismo/ });
    fireEvent.click(filaEvento);

    expect(screen.getByRole("heading", { name: "Actividades registradas" })).toBeTruthy();
    expect(filaEvento.getAttribute("aria-expanded")).toBe("true");
    expect(await screen.findByRole("heading", { name: "Editar evento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar inscripciones" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Inscripciones" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Imagen principal" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Imágenes secundarias" })).toBeTruthy();
    expect(screen.queryByLabelText(/texto alternativo/i)).toBeNull();
  });

  it("permite crear requisitos de inscripción sin editar JSON", async () => {
    render(<MemoryRouter><PaginaAdministracionEventos /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Nuevo evento" }));
    expect(screen.queryByText("Formulario aplicable en JSON")).toBeNull();
    expect(screen.getByText("No hay requisitos configurados para la inscripción.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Preguntas para la inscripción" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Taller de ciclismo" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Actividad de formación" } });
    fireEvent.change(screen.getByLabelText("Inicia"), { target: { value: "2030-08-05T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear requisito" }));
    fireEvent.change(screen.getByLabelText("Nombre del requisito 1"), { target: { value: "¿Qué talla de bicicleta necesitas?" } });
    fireEvent.change(screen.getByLabelText("Tipo de campo del requisito 1"), { target: { value: "SELECCION_UNICA" } });
    fireEvent.change(screen.getByLabelText("Opciones del requisito 1"), { target: { value: "Pequeña\nMediana\nGrande" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar evento" }));

    await waitFor(() => expect(apiAdministracion.crearEvento).toHaveBeenCalledOnce());
    const solicitud = apiAdministracion.crearEvento.mock.calls[0][0];
    expect(JSON.parse(solicitud.esquemaFormularioJson)).toEqual({
      campos: [{
        id: "campo_1",
        etiqueta: "¿Qué talla de bicicleta necesitas?",
        tipo: "SELECCION_UNICA",
        obligatorio: true,
        opciones: ["Pequeña", "Mediana", "Grande"],
      }],
    });
  });
});
