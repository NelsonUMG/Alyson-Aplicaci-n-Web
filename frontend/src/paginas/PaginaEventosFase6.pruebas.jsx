import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const personaSesion = vi.hoisted(() => ({ fechaNacimiento: undefined, idUsuario: undefined }));
const actualizarUsuario = vi.hoisted(() => vi.fn());
const apiAutenticacion = vi.hoisted(() => ({ obtenerPerfil: vi.fn() }));
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
  subirFormularioInscripcion: vi.fn(),
  eliminarFormularioInscripcion: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiPortal);
vi.mock("../api/autenticacion", () => apiAutenticacion);
vi.mock("../api/inscripcionesEventos", () => apiInscripciones);
vi.mock("../api/administracionEventos", () => apiAdministracion);
vi.mock("../componentes/CampoFotoEstudiante", () => ({
  CampoFotoEstudiante: ({ campo, alCambiar }) => <input id={`requisito-${campo.id}`} type="file" onChange={() => alCambiar(campo.id, "data:image/jpeg;base64,Zm90bw==")} />,
}));
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({
    cargando: false,
    actualizarUsuario,
    usuario: {
      idUsuario: personaSesion.idUsuario,
      fechaNacimiento: personaSesion.fechaNacimiento,
      permisos: ["EVENTOLEER", "EVENTOCREAR", "EVENTOACTUALIZAR", "EVENTOGESTIONARINSCRIPCIONES"],
    },
  }),
}));

import { PaginaAdministracionEventos } from "./PaginaAdministracionEventos";
import { PaginaDetalleEvento } from "./PaginaDetalleEvento";
import { ErrorApi } from "../api/clienteHttp";

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
    personaSesion.fechaNacimiento = undefined;
    personaSesion.idUsuario = undefined;
    actualizarUsuario.mockReset().mockImplementation((perfil) => Object.assign(personaSesion, perfil));
    apiPortal.consultarEvento.mockReset().mockResolvedValue(eventoPublico);
    apiInscripciones.consultarInscripcionEvento.mockReset().mockResolvedValue(null);
    apiInscripciones.cancelarInscripcionEvento.mockReset();
    apiInscripciones.inscribirEnEvento.mockReset().mockResolvedValue({
      idInscripcionEvento: 20,
      idEvento: 7,
      estado: "CONFIRMADA",
      cuposDisponibles: 11,
    });
  });

  it("inscribe a un hijo en un curso continuo usando sus datos y no la edad del padre", async () => {
    personaSesion.fechaNacimiento = "1998-01-01";
    const nacimiento = new Date(); nacimiento.setFullYear(nacimiento.getFullYear() - 6);
    apiPortal.consultarEvento.mockResolvedValue({
      ...eventoPublico, cursoContinuo: true, iniciaEn: "2020-01-01T15:00:00Z", inscripcionCierraEn: null,
      esquemaFormularioJson: null,
      configuracionGruposJson: JSON.stringify({ grupos: [{ codigo: "infantil", nombre: "Infantil", categoriaEdad: "5 a 6 años", edadMinima: 5, edadMaxima: 6, horarios: [] }] }),
    });
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    await screen.findByLabelText("Grupo o categoría *");
    fireEvent.change(screen.getByLabelText("Grupo o categoría *"), { target: { value: "infantil" } });
    expect(screen.getByRole("button", { name: "Confirmar inscripción" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("No puedes inscribirte");
    fireEvent.click(screen.getByLabelText("Un(a) niño(a)"));
    fireEvent.change(screen.getByLabelText("Nombre del estudiante"), { target: { value: "Lucía" } });
    fireEvent.change(screen.getByLabelText("Apellido del estudiante"), { target: { value: "Prueba" } });
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento del estudiante"), { target: { value: nacimiento.toISOString().slice(0, 10) } });
    fireEvent.change(screen.getByLabelText("Grupo o categoría *"), { target: { value: "infantil" } });
    expect(screen.getByRole("button", { name: "Confirmar inscripción" }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Sube la fotografía del niño(a) a inscribir *"), { target: { files: [new File(["foto"], "foto.webp", { type: "image/webp" })] } });
    expect(screen.getByRole("button", { name: "Confirmar inscripción" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inscripción" }));
    await waitFor(() => expect(apiInscripciones.inscribirEnEvento).toHaveBeenCalledWith(7, expect.any(String), { _fotoParticipante: expect.any(String) }, "infantil",
      expect.objectContaining({ nombre: "Lucía", apellido: "Prueba" })));
  });

  it("solicita los requisitos configurados y presenta la confirmación recibida", async () => {
    render(
      <MemoryRouter initialEntries={["/eventos/curso-atletismo"]}>
        <Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes>
      </MemoryRouter>,
    );

    const boton = await screen.findByRole("button", { name: "Confirmar inscripción" });
    expect(apiInscripciones.inscribirEnEvento).not.toHaveBeenCalled();
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

  it("recupera la fecha guardada aunque la sesión inicial no la incluya", async () => {
    personaSesion.idUsuario = 42;
    apiAutenticacion.obtenerPerfil.mockResolvedValue({ idUsuario: 42, fechaNacimiento: "1997-03-20" });
    apiPortal.consultarEvento.mockResolvedValue({ ...eventoPublico,
      configuracionGruposJson: JSON.stringify({ grupos: [{ codigo: "infantil", nombre: "Infantil", categoriaEdad: "7 a 8 años", edadMinima: 7, edadMaxima: 8, horarios: [] }] }),
    });
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Grupo o categoría *"), { target: { value: "infantil" } });
    expect(await screen.findByText(/No puedes inscribirte en este grupo/)).toBeTruthy();
    expect(screen.queryByText(/Tu cuenta no tiene una fecha/)).toBeNull();
    expect(actualizarUsuario).toHaveBeenCalledWith({ idUsuario: 42, fechaNacimiento: "1997-03-20" });
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

  it("muestra solo la descarga del PDF sin agregar documentos físicos a la inscripción", async () => {
    apiPortal.consultarEvento.mockResolvedValue({ ...eventoPublico,
      requisitos: [{ descripcion: "Partida de nacimiento", obligatorio: true }, { descripcion: "Copia del DPI del encargado", obligatorio: true }],
      urlFormularioInscripcion: "/api/v1/publico/eventos/curso/formulario-inscripcion",
    });
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { name: "Inscripción" });
    expect(screen.queryByRole("heading", { name: "Documentos para llevar físicamente" })).toBeNull();
    expect(screen.queryByText("Partida de nacimiento")).toBeNull();
    expect(screen.queryByLabelText("Partida de nacimiento")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Descargar", exact: true })[0].getAttribute("href"))
      .toBe("/api/v1/publico/eventos/curso/formulario-inscripcion");
  });

  it("muestra varios horarios y solicita el grupo antes de inscribir", async () => {
    personaSesion.fechaNacimiento = "2015-01-01";
    apiPortal.consultarEvento.mockResolvedValue({
      ...eventoPublico,
      configuracionGruposJson: JSON.stringify({ grupos: [{
        codigo: "adolescentes", nombre: "Adolescentes", categoriaEdad: "13 a 17 años",
        edadMinima: 13, edadMaxima: 17,
        horarios: [
          { dia: "MARTES", horaInicio: "14:00", horaFin: "16:00", lugar: "Pista" },
          { dia: "JUEVES", horaInicio: "14:00", horaFin: "16:00", lugar: "Pista" },
        ],
      }] }),
    });
    render(
      <MemoryRouter initialEntries={["/eventos/curso-atletismo"]}>
        <Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Grupos y horarios" })).toBeTruthy();
    expect(screen.getByText(/Martes/)).toBeTruthy();
    expect(screen.getByText(/Jueves/)).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Grupo o categoría *"), { target: { value: "adolescentes" } });
    fireEvent.change(screen.getByLabelText("DPI/CUI del participante *"), { target: { value: "1234567890101" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inscripción" }));

    await waitFor(() => expect(apiInscripciones.inscribirEnEvento).toHaveBeenCalledWith(
      7, expect.any(String), { campo_1: "1234567890101" }, "adolescentes",
    ));
  });

  it("espera la consulta y permite cancelar una inscripción que ya existía", async () => {
    let resolverConsulta;
    apiInscripciones.consultarInscripcionEvento.mockReturnValue(new Promise((resolver) => { resolverConsulta = resolver; }));
    apiInscripciones.cancelarInscripcionEvento.mockResolvedValue({ estado: "CANCELADA", cuposDisponibles: 13 });
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    await screen.findByText("Consultando tu inscripción…");
    expect(screen.queryByRole("button", { name: "Confirmar inscripción" })).toBeNull();
    expect(apiInscripciones.inscribirEnEvento).not.toHaveBeenCalled();
    resolverConsulta({ estado: "CONFIRMADA", confirmadaEn: "2026-09-11T18:00:00Z" });
    const cancelar = await screen.findByRole("button", { name: "Cancelar mi inscripción" });
    expect(screen.queryByRole("button", { name: "Confirmar inscripción" })).toBeNull();
    expect(apiInscripciones.cancelarInscripcionEvento).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Motivo de cancelación (opcional)"), { target: { value: "Cambio de horario" } });
    fireEvent.click(cancelar);
    await screen.findByText("La inscripción fue cancelada.");
    expect(apiInscripciones.cancelarInscripcionEvento).toHaveBeenCalledWith(7, "Cambio de horario", undefined);
    expect(screen.getByText("13 de 30")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar inscripción" })).toBeTruthy();
  });

  it("no ofrece inscribir cuando falla la consulta y permite reintentar", async () => {
    apiInscripciones.consultarInscripcionEvento.mockRejectedValueOnce(new Error("Conexión fallida"));
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    const reintentar = await screen.findByRole("button", { name: "Reintentar" });
    expect(screen.queryByRole("button", { name: "Confirmar inscripción" })).toBeNull();
    fireEvent.click(reintentar);
    expect(await screen.findByRole("button", { name: "Confirmar inscripción" })).toBeTruthy();
    expect(apiInscripciones.inscribirEnEvento).not.toHaveBeenCalled();
  });

  it("ofrece confirmar ante una inscripción inexistente sin crearla al consultar", async () => {
    apiInscripciones.consultarInscripcionEvento.mockRejectedValue(new ErrorApi("Sin inscripción", { estado: 404 }));
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Confirmar inscripción" })).toBeTruthy();
    expect(apiInscripciones.inscribirEnEvento).not.toHaveBeenCalled();
  });

  it("no arrastra la inscripción del evento anterior al cambiar de actividad", async () => {
    apiPortal.consultarEvento.mockResolvedValueOnce(eventoPublico).mockResolvedValue({ ...eventoPublico, idEvento: 8, titulo: "Yoga", identificadorUrl: "yoga" });
    apiInscripciones.consultarInscripcionEvento.mockResolvedValueOnce({ estado: "CONFIRMADA" }).mockResolvedValue(null);
    render(<MemoryRouter initialEntries={["/eventos/curso-atletismo"]}><Link to="/eventos/yoga">Otra actividad</Link><Routes><Route path="/eventos/:identificadorUrl" element={<PaginaDetalleEvento />} /></Routes></MemoryRouter>);
    await screen.findByRole("button", { name: "Cancelar mi inscripción" });
    fireEvent.click(screen.getByRole("link", { name: "Otra actividad" }));
    await screen.findByRole("heading", { name: "Yoga" });
    expect(await screen.findByRole("button", { name: "Confirmar inscripción" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar mi inscripción" })).toBeNull();
    expect(apiInscripciones.inscribirEnEvento).not.toHaveBeenCalled();
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
    expect(solicitud.requisitos).toEqual([]);
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

  it("permite subir el formulario PDF y muestra su descarga en el editor", async () => {
    apiAdministracion.subirFormularioInscripcion.mockResolvedValue({ nombreFormularioInscripcion: "formulario.pdf",
      urlFormularioInscripcion: "/api/v1/administracion/eventos/7/formulario-inscripcion", version: 3 });
    render(<MemoryRouter><PaginaAdministracionEventos /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Listado de eventos" }));
    fireEvent.click(await screen.findByRole("button", { name: /Curso de atletismo/ }));
    const input = await screen.findByLabelText("Archivo PDF del formulario");
    const archivo = new File(["fixture"], "formulario.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [archivo] } });
    fireEvent.submit(input.closest("form"));
    await waitFor(() => expect(apiAdministracion.subirFormularioInscripcion).toHaveBeenCalledWith(7, archivo));
    expect(await screen.findByRole("link", { name: "formulario.pdf" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reemplazar formulario PDF" })).toBeTruthy();
  });
});
