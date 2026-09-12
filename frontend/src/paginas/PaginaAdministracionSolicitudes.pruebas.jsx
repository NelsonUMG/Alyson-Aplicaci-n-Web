import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

// jsdom no implementa los métodos del diálogo nativo del navegador.
beforeAll(() => {
  Object.defineProperties(window.HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute("open", ""); } },
    close: { configurable: true, value() { this.removeAttribute("open"); } },
  });
});

beforeEach(() => {
  api.actualizarTramiteAdministrado.mockImplementation(async (idTramite, datos) => ({
    ...datos, idTramite, categoria: "Reservas y uso de instalaciones", version: datos.version + 1, urlPortada: null,
  }));
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

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Administración de solicitudes", () => {
  it("filtra trámites por nombre sin tildes y permite recuperar el listado", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    expect(await screen.findByRole("button", { name: "Editar Reserva de canchas" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar trámite" }), { target: { value: "areas" } });
    expect(screen.queryByRole("button", { name: "Editar Reserva de canchas" })).toBeNull();
    expect(screen.getByRole("button", { name: "Editar Reserva de áreas recreativas" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByText("No encontramos ese trámite")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver todos los trámites" }));
    expect(screen.getByRole("button", { name: "Editar Reserva de canchas" })).toBeTruthy();
  });

  it("crea una categoría y un trámite vinculado mediante los tres pasos", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(await screen.findByRole("button", { name: "Nueva categoría general" }));
    fireEvent.change(screen.getByLabelText("Nombre de la categoría general"), { target: { value: "Actividades deportivas" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
    await waitFor(() => expect(api.crearCategoriaTramiteAdministrada).toHaveBeenCalledWith({ nombre: "Actividades deportivas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Agregar primer trámite" }));
    expect(screen.getByLabelText("Categoría general").value).toBe("3");
    fireEvent.change(screen.getByLabelText("Nombre del trámite"), { target: { value: "Curso de natación" } });
    fireEvent.change(screen.getByLabelText("Descripción breve"), { target: { value: "Inscripción al curso." } });
    fireEvent.change(screen.getByLabelText("Información del trámite"), { target: { value: "Información del curso." } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(api.crearTramiteAdministrado).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Agregar requisito" }));
    fireEvent.change(screen.getByLabelText("Requisito 1"), { target: { value: "Tener 12 años" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar documento" }));
    fireEvent.change(screen.getByLabelText("Documento 1"), { target: { value: "DPI" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(api.crearTramiteAdministrado).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Crear trámite" }));
    await waitFor(() => expect(api.crearTramiteAdministrado).toHaveBeenCalledWith(expect.objectContaining({
      idCategoria: 3, nombre: "Curso de natación", requisitos: ["Tener 12 años"], documentosRequeridos: ["DPI"],
    })));
    expect(await screen.findByRole("button", { name: "Editar Curso de natación" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edita conservando versión y datos al volver entre pasos", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar Reserva de canchas" }));
    fireEvent.change(screen.getByLabelText("Nombre del trámite"), { target: { value: "Reserva de cancha deportiva" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar requisito 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByLabelText("Nombre del trámite").value).toBe("Reserva de cancha deportiva");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByLabelText("Requisito 1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar en el catálogo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(api.actualizarTramiteAdministrado).toHaveBeenCalledWith(1, expect.objectContaining({
      nombre: "Reserva de cancha deportiva", requisitos: [], documentosRequeridos: ["DPI"], activo: false, requiereReserva: true, version: 0,
    })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Visibilidad")).toBeNull();
    expect(screen.queryByText("Oculto")).toBeNull();
    expect(api.crearTramiteAdministrado).not.toHaveBeenCalled();
  });

  it("conserva el formulario y permite reintentar si falla el guardado", async () => {
    api.actualizarTramiteAdministrado.mockRejectedValueOnce(new Error("No fue posible guardar el trámite."));
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar Reserva de canchas" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Costo").value).toBe("Sin costo");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.actualizarTramiteAdministrado).toHaveBeenCalledTimes(2);
  });

  it("informa de un fallo de portada sin repetir el guardado del trámite", async () => {
    api.actualizarPortadaTramite.mockRejectedValueOnce(new Error("Falló la imagen"));
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar Reserva de canchas" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const archivo = new window.File(["imagen"], "portada.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Imagen de portada/), { target: { files: [archivo] } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText(/la portada no se pudo cargar/)).toBeTruthy();
    expect(api.actualizarPortadaTramite).toHaveBeenCalledWith(1, archivo);
    expect(api.actualizarTramiteAdministrado).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("permite crear la primera categoría y cerrar sin enviar datos", async () => {
    api.listarCategoriasTramitesAdministradas.mockResolvedValue([]);
    api.listarCatalogoTramitesAdministrado.mockResolvedValue([]);
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    const crear = await screen.findByRole("button", { name: "Crear categoría general" });
    expect(screen.getByRole("button", { name: "Nuevo trámite" }).disabled).toBe(true);
    crear.focus();
    fireEvent.click(crear);
    expect(screen.getByRole("dialog", { name: "Nueva categoría general" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(crear);
    expect(api.crearCategoriaTramiteAdministrada).not.toHaveBeenCalled();
  });

  it("permite revisar disponibilidad y registrar una respuesta", async () => {
    render(<MemoryRouter><PaginaAdministracionSolicitudes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitudes recibidas" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Categorías y trámites" }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitudes recibidas" }));
    fireEvent.click(await screen.findByRole("button", { name: /Solicitud #9/ }));

    const detalleDenuncia = (await screen.findByRole("heading", { name: "Denuncias y quejas" })).closest("section");
    expect(within(detalleDenuncia).getByText("Trámite relacionado")).toBeTruthy();
    expect(within(detalleDenuncia).getByText("Reserva de canchas")).toBeTruthy();
    expect(within(detalleDenuncia).getByText("No se respetó el horario asignado.")).toBeTruthy();
    expect(within(detalleDenuncia).queryByText("Tipo")).toBeNull();
    expect(within(detalleDenuncia).queryByText("Asunto")).toBeNull();
  });
});
