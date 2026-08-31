import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiSolicitudes = vi.hoisted(() => ({
  actualizarBorradorUsoInstalacion: vi.fn(),
  agregarDocumentoSolicitud: vi.fn(),
  consultarProcedimientoUsoInstalacion: vi.fn(),
  consultarSolicitud: vi.fn(),
  crearBorradorUsoInstalacion: vi.fn(),
  eliminarBorradorSolicitud: vi.fn(),
  eliminarDocumentoSolicitud: vi.fn(),
  enviarSolicitud: vi.fn(),
  guardarResenaTramite: vi.fn(),
  iniciarBorradorTramite: vi.fn(),
  enviarDenunciaQueja: vi.fn(),
  listarCatalogoTramites: vi.fn(),
  consultarTramite: vi.fn(),
  listarMisSolicitudes: vi.fn(),
}));
const apiPortal = vi.hoisted(() => ({ listarAreas: vi.fn() }));

vi.mock("../api/solicitudes", () => apiSolicitudes);
vi.mock("../api/portalPublico", () => apiPortal);

import { PaginaMisSolicitudes } from "./PaginaMisSolicitudes";

const respuestaBase = {
  contenido: [],
  pagina: 0,
  totalPaginas: 0,
  totalElementos: 0,
  conteos: { borradores: 1, enProceso: 1, finalizadas: 0, rechazadas: 0 },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("Solicitudes del usuario", () => {
  beforeEach(() => {
    apiSolicitudes.listarMisSolicitudes.mockResolvedValue(respuestaBase);
    apiSolicitudes.listarCatalogoTramites.mockResolvedValue([
      { idCategoria: 1, codigo: "RESERVASINSTALACIONES", nombre: "Reservas y uso de instalaciones", tramites: [
        { idTramite: 1, codigo: "RESERVACANCHAS", nombre: "Reserva de canchas", resumen: "Solicita una cancha.", requiereReserva: true, urlPortada: null },
        { idTramite: 2, codigo: "RESERVAAREAS", nombre: "Reserva de áreas recreativas", resumen: "Solicita un área recreativa.", requiereReserva: true, urlPortada: null },
      ] },
      { idCategoria: 2, codigo: "ATENCIONCIUDADANA", nombre: "Atención ciudadana", tramites: [
        { idTramite: 3, codigo: "DENUNCIASQUEJAS", nombre: "Denuncias y quejas", resumen: "Informa una situación.", requiereReserva: false, urlPortada: null },
      ] },
    ]);
    apiSolicitudes.consultarTramite.mockResolvedValue({ idTramite: 1, codigo: "RESERVACANCHAS", nombre: "Reserva de canchas", resumen: "Solicita una cancha.", acerca: "La administración comprobará la disponibilidad.", requisitos: ["Información del solicitante", "Fecha y horario"], documentosRequeridos: ["DPI en PDF"], costo: "Sin costo", tiempoRespuesta: "Revisión administrativa", requiereReserva: true, categoria: "Reservas y uso de instalaciones", urlPortada: null, promedioEstrellas: 0, totalResenas: 0, resenas: [] });
    apiPortal.listarAreas.mockResolvedValue([{
      codigo: "CANCHA1", nombre: "Cancha uno", estado: "DISPONIBLE", notaDisponibilidad: "Sujeta a revisión.",
    }]);
  });

  it("muestra las solicitudes enviadas del usuario", async () => {
    apiSolicitudes.listarMisSolicitudes.mockResolvedValue({
      ...respuestaBase,
      contenido: [{
        idSolicitud: 12,
        nombreTipoSolicitud: "Uso de cancha o instalación",
        estado: "ENREVISION",
        resolucion: null,
        creadoEn: "2026-08-01T14:00:00Z",
        actualizadoEn: "2026-08-02T14:00:00Z",
      }],
      totalPaginas: 1,
      totalElementos: 1,
    });
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);

    await waitFor(() => expect(apiSolicitudes.listarMisSolicitudes).toHaveBeenCalledWith({ grupo: "TODOS", pagina: 0 }));
    expect(await screen.findByRole("heading", { name: "Uso de cancha o instalación" })).toBeTruthy();
    expect(screen.getByText("En revisión")).toBeTruthy();
    expect(screen.getByText("#12")).toBeTruthy();
  });

  it("permite consultar los borradores sin mezclar grupos", async () => {
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes registradas.");

    const navegacionEstados = screen.getByRole("navigation", { name: "Estados de solicitudes" });
    fireEvent.click(within(navegacionEstados).getByRole("button", { name: /Borradores/ }));

    await waitFor(() => expect(apiSolicitudes.listarMisSolicitudes).toHaveBeenLastCalledWith({ grupo: "BORRADORES", pagina: 0 }));
    expect(await screen.findByText("No tienes solicitudes guardadas como borrador.")).toBeTruthy();
  });

  it("restaura todas las solicitudes después de consultar otro grupo y oculta rechazadas", async () => {
    const borrador = {
      idSolicitud: 44,
      nombreTipoSolicitud: "Reserva de cancha",
      estado: "BORRADOR",
      resolucion: null,
      creadoEn: "2026-08-20T14:00:00Z",
      actualizadoEn: "2026-08-20T14:00:00Z",
    };
    apiSolicitudes.listarMisSolicitudes.mockImplementation(({ grupo }) => Promise.resolve({
      ...respuestaBase,
      contenido: grupo === "TODOS" ? [borrador] : [],
      totalElementos: grupo === "TODOS" ? 1 : 0,
      totalPaginas: grupo === "TODOS" ? 1 : 0,
    }));
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Reserva de cancha" })).toBeTruthy();
    const navegacionEstados = screen.getByRole("navigation", { name: "Estados de solicitudes" });
    expect(within(navegacionEstados).queryByRole("button", { name: /Rechazadas/ })).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Navegación de solicitudes" }))
      .queryByRole("button", { name: /Rechazadas/ })).toBeNull();

    fireEvent.click(within(navegacionEstados).getByRole("button", { name: /En proceso/ }));
    expect(await screen.findByText("No tienes solicitudes enviadas o en revisión.")).toBeTruthy();
    fireEvent.click(within(navegacionEstados).getByRole("button", { name: /Todos/ }));

    await waitFor(() => expect(apiSolicitudes.listarMisSolicitudes)
      .toHaveBeenLastCalledWith({ grupo: "TODOS", pagina: 0 }));
    expect(await screen.findByRole("heading", { name: "Reserva de cancha" })).toBeTruthy();
  });

  it("permite eliminar un borrador después de confirmarlo", async () => {
    let eliminado = false;
    const borrador = {
      idSolicitud: 44,
      nombreTipoSolicitud: "Reserva de cancha",
      estado: "BORRADOR",
      resolucion: null,
      creadoEn: "2026-08-20T14:00:00Z",
      actualizadoEn: "2026-08-20T14:00:00Z",
    };
    apiSolicitudes.listarMisSolicitudes.mockImplementation(() => Promise.resolve({
      ...respuestaBase,
      contenido: eliminado ? [] : [borrador],
      totalElementos: eliminado ? 0 : 1,
      totalPaginas: eliminado ? 0 : 1,
    }));
    apiSolicitudes.eliminarBorradorSolicitud.mockImplementation(() => {
      eliminado = true;
      return Promise.resolve();
    });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);

    await screen.findByRole("heading", { name: "Reserva de cancha" });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(confirmar).toHaveBeenCalledWith("¿Deseas eliminar este borrador? Esta acción no se puede deshacer.");
    await waitFor(() => expect(apiSolicitudes.eliminarBorradorSolicitud).toHaveBeenCalledWith(44));
    expect(await screen.findByText("Borrador eliminado correctamente.")).toBeTruthy();
  });

  it("ofrece únicamente las gestiones propias del parque", async () => {
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes registradas.");
    expect(screen.queryByText("¿Necesitas ayuda?")).toBeNull();
    expect(screen.queryByText("Centro de ayuda")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByRole("link", { name: "Parque Erick Barrondo · Inicio" })).toBeTruthy();
    const navegacionSuperior = screen.getByRole("navigation", { name: "Navegación de solicitudes" });
    expect(within(navegacionSuperior).getByRole("button", { name: "Denuncias y quejas" })).toBeTruthy();
    expect(within(navegacionSuperior).queryByRole("link", { name: "Inicio" })).toBeNull();
    expect(within(navegacionSuperior).queryByRole("button", { name: "Nueva solicitud" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Filtros/ })).toBeNull();
    expect(within(navegacionSuperior).getByRole("textbox", { name: "Buscar en mis solicitudes" })).toBeTruthy();

    fireEvent.click(within(screen.getByRole("main")).getByRole("button", { name: "Nueva solicitud" }));

    expect(await screen.findByRole("heading", { name: "¿Qué trámite deseas realizar?" })).toBeTruthy();
    const dialogo = screen.getByRole("dialog", { name: "Nueva solicitud" });
    expect(within(dialogo).getByText("Categoría padre")).toBeTruthy();
    expect(within(dialogo).getAllByText("Trámite hijo")).toHaveLength(2);
    expect(within(dialogo).getByText("Reserva de canchas")).toBeTruthy();
    expect(within(dialogo).getByText("Reserva de áreas recreativas")).toBeTruthy();
    expect(within(dialogo).getByRole("button", { name: "Reservas y uso de instalaciones" })).toBeTruthy();
    expect(within(dialogo).queryByText("Denuncias y quejas")).toBeNull();
    expect(within(dialogo).queryByRole("button", { name: "Atención ciudadana" })).toBeNull();
  });

  it("abre denuncias desde el menú y solicita únicamente el trámite relacionado y la descripción", async () => {
    apiSolicitudes.enviarDenunciaQueja.mockResolvedValue(undefined);
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes registradas.");

    fireEvent.click(screen.getByRole("button", { name: "Denuncias y quejas" }));

    const dialogo = await screen.findByRole("dialog", { name: "Denuncias y quejas" });
    expect(within(dialogo).queryByLabelText(/^Tipo/)).toBeNull();
    expect(within(dialogo).queryByLabelText(/^Asunto/)).toBeNull();
    expect(within(dialogo).queryByText(/Dependencia/)).toBeNull();
    fireEvent.change(within(dialogo).getByLabelText(/Trámite relacionado/), { target: { value: "RESERVACANCHAS" } });
    fireEvent.change(within(dialogo).getByLabelText(/Describe aquí lo sucedido/), { target: { value: "No se respetó el horario asignado." } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(apiSolicitudes.enviarDenunciaQueja).toHaveBeenCalledWith({
      tipo: "QUEJA",
      asunto: "Reserva de canchas",
      descripcion: "No se respetó el horario asignado.",
    }));
  });

  it("explica el trámite y guarda la primera fase como borrador", async () => {
    apiSolicitudes.iniciarBorradorTramite.mockResolvedValue({
      idSolicitud: 30,
      estado: "BORRADOR",
      version: 0,
      documentos: [],
      detalle: {
        codigoTramite: "RESERVACANCHAS",
        datosSolicitante: { nombre: "Ana", apellido: "López", correo: "ana@example.com", dpi: "1234567890101", celular: "55554444" },
      },
    });
    apiSolicitudes.actualizarBorradorUsoInstalacion.mockResolvedValue({ idSolicitud: 30, estado: "BORRADOR", version: 1, documentos: [], detalle: { codigoTramite: "RESERVACANCHAS", codigoArea: "CANCHA1", nombreArea: "Cancha uno", fechaSolicitada: "2030-09-10", horaInicio: "09:00:00", horaFin: "11:00:00", tipoActividad: "Entrenamiento", tipoReserva: "AFLUENCIAMEDIA", cantidadPersonas: 51, descripcion: "Práctica deportiva", nombreResponsable: "Ana López" } });
    apiSolicitudes.agregarDocumentoSolicitud.mockResolvedValue({
      idSolicitudDocumento: 45,
      nombreArchivo: "dpi-ambos-lados.pdf",
      urlDescarga: "/api/v1/solicitudes/30/documentos/45/archivo",
    });
    apiSolicitudes.enviarSolicitud.mockResolvedValue(undefined);
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes registradas.");
    fireEvent.click(within(screen.getByRole("main")).getByRole("button", { name: "Nueva solicitud" }));
    fireEvent.click(await screen.findByRole("button", { name: /Reserva de canchas/ }));

    expect(await screen.findByText("Documentos y requisitos solicitados")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Iniciar solicitud/ }));
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Ana López" } });
    fireEvent.change(screen.getByLabelText(/DPI - CUI/), { target: { value: "1234567890101" } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: "55554444" } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y siguiente" }));

    await waitFor(() => expect(apiSolicitudes.iniciarBorradorTramite).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByRole("heading", { name: /Información del solicitante/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y siguiente" }));
    await waitFor(() => expect(apiSolicitudes.iniciarBorradorTramite).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: /Reserva recreativa de afluencia media/ }));
    expect(screen.queryByText("Disponibilidad: Sujeta a revisión.")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Campo o cancha/), { target: { value: "CANCHA1" } });
    fireEvent.change(screen.getByLabelText(/Nombre de la actividad/), { target: { value: "Entrenamiento" } });
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: "2030-09-10" } });
    fireEvent.change(screen.getByLabelText(/Hora de inicio/), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText(/Hora de finalización/), { target: { value: "11:00" } });
    fireEvent.change(screen.getByLabelText(/Nombre completo del responsable/), { target: { value: "Ana López" } });
    fireEvent.change(screen.getByLabelText(/Descripción de la actividad/), { target: { value: "Práctica deportiva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y siguiente" }));
    await waitFor(() => expect(apiSolicitudes.actualizarBorradorUsoInstalacion).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: /Carga de documentos/ })).toBeTruthy();
    expect(screen.getByText("Formato PDF, tamaño máximo 20 MB. El DPI debe incluir ambos lados.")).toBeTruthy();
    expect(screen.queryByText(/Documento pendiente de cargar/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(screen.getAllByText("Debes subir el DPI del solicitante en formato PDF.").length).toBeGreaterThan(0);
    expect(apiSolicitudes.enviarSolicitud).not.toHaveBeenCalled();

    const dpi = new window.File(["%PDF-1.4 DPI"], "dpi-ambos-lados.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("DPI en PDF"), { target: { files: [dpi] } });
    await waitFor(() => expect(apiSolicitudes.agregarDocumentoSolicitud).toHaveBeenCalledWith(30, dpi));
    expect(await screen.findByRole("link", { name: "dpi-ambos-lados.pdf" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await waitFor(() => expect(apiSolicitudes.enviarSolicitud).toHaveBeenCalledWith(30, 1));
  }, 10000);
});
