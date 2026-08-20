import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  consultarSolicitudAdministrada: vi.fn(),
  iniciarRevisionSolicitud: vi.fn(),
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
  api.listarSolicitudesAdministradas.mockResolvedValue({
    contenido: [{
      idSolicitud: 8, estado: "ENVIADA", nombreSolicitante: "Ana López",
      correoSolicitante: "ana@example.com", nombreArea: "Cancha uno",
      fechaSolicitada: "2030-09-10", actualizadoEn: "2026-08-15T12:00:00Z",
    }],
    pagina: 0, totalPaginas: 1, totalElementos: 1,
  });
  api.consultarSolicitudAdministrada.mockResolvedValue(detalle);
  api.resolverSolicitud.mockResolvedValue({ ...detalle, estado: "APROBADA", version: 3, resolucion: "Disponible en el horario solicitado." });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Administración de solicitudes", () => {
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
});
