import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPortal = vi.hoisted(() => ({ consultarEvento: vi.fn() }));
const apiInscripciones = vi.hoisted(() => ({
  cancelarInscripcionEvento: vi.fn(),
  consultarInscripcionEvento: vi.fn(),
  inscribirEnEvento: vi.fn(),
}));
const apiAdministracion = vi.hoisted(() => ({
  actualizarEvento: vi.fn(),
  agregarImagenEvento: vi.fn(),
  cancelarEvento: vi.fn(),
  cerrarEvento: vi.fn(),
  crearEvento: vi.fn(),
  eliminarImagenEvento: vi.fn(),
  finalizarEvento: vi.fn(),
  listarEventosAdministrados: vi.fn(),
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

  it("exige aceptar requisitos y presenta la confirmación recibida del servidor", async () => {
    render(
      <MemoryRouter initialEntries={["/eventos/curso-atletismo"]}>
        <Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes>
      </MemoryRouter>,
    );

    const boton = await screen.findByRole("button", { name: "Confirmar inscripción" });
    expect(boton.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(boton);

    await waitFor(() => expect(apiInscripciones.inscribirEnEvento).toHaveBeenCalledWith(7, expect.any(String)));
    expect(await screen.findByText("Tu inscripción quedó confirmada.")).toBeTruthy();
    expect(screen.getByText("11 de 30")).toBeTruthy();
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
  });

  it("muestra cupos calculados y habilita la gestión para el operador autorizado", async () => {
    render(<MemoryRouter><PaginaAdministracionEventos /></MemoryRouter>);

    expect(await screen.findByText("18 de 30 cupos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Curso de atletismo/ }));

    expect(await screen.findByRole("heading", { name: "Editar evento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar inscripciones" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Inscripciones" })).toBeTruthy();
  });
});
