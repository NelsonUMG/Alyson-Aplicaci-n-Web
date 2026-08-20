import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiSolicitudes = vi.hoisted(() => ({
  actualizarBorradorUsoInstalacion: vi.fn(),
  agregarDocumentoSolicitud: vi.fn(),
  consultarProcedimientoUsoInstalacion: vi.fn(),
  consultarSolicitud: vi.fn(),
  crearBorradorUsoInstalacion: vi.fn(),
  eliminarDocumentoSolicitud: vi.fn(),
  enviarSolicitud: vi.fn(),
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
  vi.clearAllMocks();
});

describe("Solicitudes del usuario", () => {
  beforeEach(() => {
    apiSolicitudes.listarMisSolicitudes.mockResolvedValue(respuestaBase);
    apiSolicitudes.consultarProcedimientoUsoInstalacion.mockResolvedValue({
      nombre: "Uso de cancha o instalación",
      descripcion: "Gestión para solicitar el uso temporal de una instalación.",
      finalidad: "Comprobar disponibilidad antes de responder.",
      informacionRequerida: ["Instalación, fecha y horario"],
      documentosObligatorios: [],
      documentosOpcionales: ["Documento de respaldo"],
      costo: "Sin costo definido en el sistema.",
      advertenciaDisponibilidad: "Enviar la solicitud no reserva automáticamente el espacio.",
    });
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

    await waitFor(() => expect(apiSolicitudes.listarMisSolicitudes).toHaveBeenCalledWith({ grupo: "ENPROCESO", pagina: 0 }));
    expect(await screen.findByRole("heading", { name: "Uso de cancha o instalación" })).toBeTruthy();
    expect(screen.getByText("En revisión")).toBeTruthy();
    expect(screen.getByText("Solicitud #12")).toBeTruthy();
  });

  it("permite consultar los borradores sin mezclar grupos", async () => {
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes enviadas o en revisión.");

    fireEvent.click(screen.getByRole("button", { name: /Borradores/ }));

    await waitFor(() => expect(apiSolicitudes.listarMisSolicitudes).toHaveBeenLastCalledWith({ grupo: "BORRADORES", pagina: 0 }));
    expect(await screen.findByText("No tienes solicitudes guardadas como borrador.")).toBeTruthy();
  });

  it("ofrece únicamente las gestiones propias del parque", async () => {
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes enviadas o en revisión.");

    fireEvent.click(screen.getByRole("button", { name: "Nueva solicitud" }));

    expect(screen.getByRole("heading", { name: "Solicitudes disponibles" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Uso de cancha o instalación" })).toBeTruthy();
    expect(screen.getByText("Solo se muestran gestiones correspondientes al Parque Erick Barrondo.")).toBeTruthy();
    expect(screen.queryByText(/Ventanilla Ágil/i)).toBeNull();
  });

  it("explica el trámite y guarda la primera fase como borrador", async () => {
    apiSolicitudes.crearBorradorUsoInstalacion.mockResolvedValue({
      idSolicitud: 30,
      estado: "BORRADOR",
      version: 0,
      documentos: [],
      detalle: {
        codigoArea: "CANCHA1", nombreArea: "Cancha uno", fechaSolicitada: "2030-09-10",
        horaInicio: "09:00:00", horaFin: "11:00:00", tipoActividad: "Entrenamiento",
        cantidadPersonas: 12, descripcion: "Práctica deportiva",
        datosSolicitante: { nombre: "Ana", apellido: "López", correo: "ana@example.com", dpi: "1234567890101", celular: "55554444" },
      },
    });
    render(<MemoryRouter><PaginaMisSolicitudes /></MemoryRouter>);
    await screen.findByText("No tienes solicitudes enviadas o en revisión.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva solicitud" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver requisitos y comenzar" }));

    expect(await screen.findByText("Documentos obligatorios")).toBeTruthy();
    expect(screen.getByText("Ninguno")).toBeTruthy();
    expect(screen.getByText(/no reserva automáticamente/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Comenzar solicitud" }));
    fireEvent.change(screen.getByLabelText("Cancha o instalación"), { target: { value: "CANCHA1" } });
    fireEvent.change(screen.getByLabelText("Fecha solicitada"), { target: { value: "2030-09-10" } });
    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hora de finalización"), { target: { value: "11:00" } });
    fireEvent.change(screen.getByLabelText("Tipo de actividad"), { target: { value: "Entrenamiento" } });
    fireEvent.change(screen.getByLabelText("Cantidad estimada de personas"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Descripción de la actividad"), { target: { value: "Práctica deportiva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }));

    await waitFor(() => expect(apiSolicitudes.crearBorradorUsoInstalacion).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Documentos" })).toBeTruthy();
    expect(screen.getByText(/Obligatorios:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continuar a revisión" })).toBeTruthy();
  });
});
