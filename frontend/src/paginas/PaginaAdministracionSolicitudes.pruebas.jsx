import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  consultarSolicitudAdministrada: vi.fn(),
  actualizarPortadaTramite: vi.fn(),
  actualizarTramiteAdministrado: vi.fn(),
  crearCategoriaTramiteAdministrada: vi.fn(),
  crearTramiteAdministrado: vi.fn(),
  iniciarRevisionSolicitud: vi.fn(),
  listarCategoriasTramitesAdministradas: vi.fn(),
  listarCatalogoTramitesAdministrado: vi.fn(),
  listarSolicitudesAdministradas: vi.fn(),
  resolverSolicitud: vi.fn(),
}));

vi.mock("../api/administracionSolicitudes", () => api);

import { PaginaAdministracionSolicitudes } from "./PaginaAdministracionSolicitudes";

const detalle = {
  idSolicitud: 8,
  nombreTipoSolicitud: "Uso de cancha o instalación",
  estado: "ENVIADA",
  version: 2,
  documentos: [],
  resolucion: null,
  detalle: {
    nombreArea: "Cancha uno", fechaSolicitada: "2030-09-10",
    horaInicio: "09:00:00", horaFin: "11:00:00", tipoActividad: "Entrenamiento",
    cantidadPersonas: 15, descripcion: "Práctica deportiva",
    datosSolicitante: { nombre: "Ana", apellido: "López", correo: "ana@example.com", dpi: "1234567890101", celular: "55554444" },
  },
};

beforeEach(() => {
  api.listarCategoriasTramitesAdministradas.mockResolvedValue([
    { idCategoria: 1, codigo: "RESERVASINSTALACIONES", nombre: "Reservas y uso de instalaciones", ordenVisualizacion: 1, activa: true },
  ]);
  api.listarCatalogoTramitesAdministrado.mockResolvedValue([
    {
      idTramite: 1, codigo: "RESERVACANCHAS", idCategoria: 1, categoria: "Reservas y uso de instalaciones",
      nombre: "Reserva de canchas", resumen: "Solicita una cancha.", acerca: "Uso temporal.", requisitos: ["Fecha"],
      documentosRequeridos: ["DPI"], costo: "Sin costo", tiempoRespuesta: "Revisión administrativa",
      requiereReserva: true, activo: true, version: 0, urlPortada: null,
    },
    {
      idTramite: 2, codigo: "RESERVAAREAS", idCategoria: 1, categoria: "Reservas y uso de instalaciones",
      nombre: "Reserva de áreas recreativas", resumen: "Solicita un área.", acerca: "Uso temporal.", requisitos: ["Fecha"],
      documentosRequeridos: ["DPI"], costo: "Sin costo", tiempoRespuesta: "Revisión administrativa",
      requiereReserva: true, activo: true, version: 0, urlPortada: null,
    },
  ]);
  api.listarSolicitudesAdministradas.mockResolvedValue({
    contenido: [{
      idSolicitud: 8, estado: "ENVIADA", nombreSolicitante: "Ana López",
      correoSolicitante: "ana@example.com", nombreArea: "Cancha uno",
      fechaSolicitada: "2030-09-10", actualizadoEn: "2026-08-15T12:00:00Z",
    }],
    pagina: 0, totalPaginas: 1, totalElementos: 1,
  });
  api.consultarSolicitudAdministrada.mockResolvedValue(detalle);
  api.crearCategoriaTramiteAdministrada.mockResolvedValue({
    idCategoria: 3, codigo: "ACTIVIDADESDEPORTIVAS", nombre: "Actividades deportivas", ordenVisualizacion: 2, activa: true,
  });
  api.crearTramiteAdministrado.mockResolvedValue({
    idTramite: 9, codigo: "CURSODENATACION", idCategoria: 3, categoria: "Actividades deportivas",
    nombre: "Curso de natación", resumen: "Inscripción al curso.", acerca: "Información del curso.",
    requisitos: ["Tener 12 años"], documentosRequeridos: ["DPI"], costo: "Sin costo",
    tiempoRespuesta: "Revisión administrativa", requiereReserva: false, activo: true, version: 0, urlPortada: null,
  });
  api.resolverSolicitud.mockResolvedValue({ ...detalle, estado: "APROBADA", version: 3, resolucion: "Disponible en el horario solicitado." });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Administración de solicitudes", () => {
  it("organiza el módulo de nuevas solicitudes por categoría padre y trámite hijo", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Módulo de nuevas solicitudes" })).toBeTruthy();
    const navegacion = screen.getByRole("navigation", { name: "Categorías padre y trámites hijo configurados" });
    expect(within(navegacion).getByRole("heading", { name: "Reservas y uso de instalaciones" })).toBeTruthy();
    expect(within(navegacion).getAllByText("Trámite hijo")).toHaveLength(2);
    fireEvent.click(within(navegacion).getByRole("button", { name: /Reserva de canchas/ }));
    expect(screen.getByLabelText("Categoría padre")).toBeTruthy();
    expect(screen.getByLabelText("Nombre del trámite hijo")).toBeTruthy();
    expect(screen.getByLabelText(/Campos y requisitos solicitados/)).toBeTruthy();
  });

  it("crea una categoría padre y vincula dentro de ella un trámite hijo", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Nueva categoría padre/ }));
    fireEvent.change(screen.getByLabelText("Nombre de la categoría padre"), {
      target: { value: "Actividades deportivas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría y continuar" }));

    await waitFor(() => expect(api.crearCategoriaTramiteAdministrada).toHaveBeenCalledWith({
      nombre: "Actividades deportivas",
    }));
    expect(await screen.findByRole("heading", { name: "Configura el nuevo trámite" })).toBeTruthy();
    expect(screen.getByLabelText("Categoría padre").value).toBe("3");

    fireEvent.change(screen.getByLabelText("Nombre del trámite hijo"), { target: { value: "Curso de natación" } });
    fireEvent.change(screen.getByLabelText("Resumen"), { target: { value: "Inscripción al curso." } });
    fireEvent.change(screen.getByLabelText("Acerca de este trámite"), { target: { value: "Información del curso." } });
    fireEvent.change(screen.getByLabelText(/Campos y requisitos solicitados/), { target: { value: "Tener 12 años" } });
    fireEvent.change(screen.getByLabelText(/Documentos solicitados/), { target: { value: "DPI" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear trámite hijo" }));

    await waitFor(() => expect(api.crearTramiteAdministrado).toHaveBeenCalledWith(expect.objectContaining({
      idCategoria: 3,
      nombre: "Curso de natación",
      requisitos: ["Tener 12 años"],
      documentosRequeridos: ["DPI"],
    })));
  });

  it("permite revisar disponibilidad y registrar una respuesta", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Solicitud #8/ }));

    expect(await screen.findByRole("heading", { name: "Uso de cancha o instalación" })).toBeTruthy();
    expect(screen.getAllByText("Cancha uno").length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Revisar áreas y reservas" }).getAttribute("href")).toBe("/administracion/areas");
    fireEvent.change(screen.getByLabelText("Respuesta para la persona solicitante"), {
      target: { value: "Disponible en el horario solicitado." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar respuesta" }));

    await waitFor(() => expect(api.resolverSolicitud).toHaveBeenCalledWith(
      8, "APROBADA", "Disponible en el horario solicitado.", 2,
    ));
    expect(await screen.findByText("Respuesta registrada")).toBeTruthy();
  });

  it("muestra en denuncias solo el trámite relacionado y la descripción", async () => {
    api.listarSolicitudesAdministradas.mockResolvedValue({
      contenido: [{
        idSolicitud: 9, estado: "ENVIADA", nombreSolicitante: "Ana López", correoSolicitante: "ana@example.com",
        nombreArea: "Denuncias y quejas", fechaSolicitada: null, actualizadoEn: "2026-08-15T12:00:00Z",
      }],
      pagina: 0, totalPaginas: 1, totalElementos: 1,
    });
    api.consultarSolicitudAdministrada.mockResolvedValue({
      idSolicitud: 9, tipoSolicitud: "DENUNCIAQUEJA", nombreTipoSolicitud: "Denuncias y quejas", estado: "ENVIADA",
      version: 0, documentos: [], resolucion: null,
      detalle: {
        asunto: "Reserva de canchas", descripcion: "No se respetó el horario asignado.", tipoReporte: "QUEJA",
        datosSolicitante: { nombre: "Ana", apellido: "López", correo: "ana@example.com", dpi: "1234567890101", celular: "55554444" },
      },
    });
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Solicitud #9/ }));

    const detalleDenuncia = (await screen.findByRole("heading", { name: "Denuncias y quejas" })).closest("section");
    expect(within(detalleDenuncia).getByText("Trámite relacionado")).toBeTruthy();
    expect(within(detalleDenuncia).getByText("Reserva de canchas")).toBeTruthy();
    expect(within(detalleDenuncia).getByText("No se respetó el horario asignado.")).toBeTruthy();
    expect(within(detalleDenuncia).queryByText("Tipo")).toBeNull();
    expect(within(detalleDenuncia).queryByText("Asunto")).toBeNull();
  });
});
