import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorApi, obtenerEstadoConexionApi, solicitarApi } from "./clienteHttp";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("cliente HTTP", () => {
  it("avisa cuando el servidor informa que la sesión expiró", async () => {
    const avisar = vi.fn();
    window.addEventListener("sesionexpirada", avisar, { once: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "Debes iniciar sesión.",
      codigo: "AUTENTICACIONREQUERIDA",
    }), {
      status: 401,
      headers: { "Content-Type": "application/problem+json" },
    })));

    await expect(solicitarApi("/recurso-protegido")).rejects.toThrow("Debes iniciar sesión.");

    expect(avisar).toHaveBeenCalledOnce();
  });

  it("permite que el navegador defina el límite de un formulario multipart", async () => {
    const solicitar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ recibido: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", solicitar);
    const formulario = new window.FormData();
    formulario.append("textoAlternativo", "Vista del parque");

    await solicitarApi("/imagenes", { method: "POST", body: formulario });

    const opciones = solicitar.mock.calls[0][1];
    expect(opciones.headers.has("Content-Type")).toBe(false);
  });

  it("distingue un servidor inaccesible de un error HTTP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const operacion = solicitarApi("/sistema/estado");

    await expect(operacion).rejects.toMatchObject({
      name: "ErrorApi",
      codigo: "SERVIDORNODISPONIBLE",
      codigoSoporte: "ERR-CON-000",
      tipoError: "Servidor sin respuesta",
      recuperable: true,
    });
    await expect(operacion).rejects.toThrow("El servidor no responde en este momento");
  });

  it("traduce un 404 sin cuerpo JSON a un mensaje útil", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

    await expect(solicitarApi("/recurso-inexistente")).rejects.toMatchObject({
      estado: 404,
      codigo: "HTTP404",
      metodo: "GET",
      ruta: "/recurso-inexistente",
      message: expect.stringContaining("HTTP 404 (HTTP404)"),
    });
  });

  it("explica con ruta, método y acción recomendada cuando frontend y backend no coinciden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "La ruta no acepta el método indicado.",
      codigo: "METODONOPERMITIDO",
      ruta: "/api/v1/administracion/solicitudes/catalogo/categorias",
      metodo: "GET",
      metodosPermitidos: ["POST"],
    }), {
      status: 405,
      headers: { "Content-Type": "application/problem+json" },
    })));

    await expect(solicitarApi("/administracion/solicitudes/catalogo/categorias", {
      descripcionOperacion: "cargar las categorías padre del catálogo",
    })).rejects.toMatchObject({
      estado: 405,
      metodo: "GET",
      ruta: "/api/v1/administracion/solicitudes/catalogo/categorias",
      message: expect.stringMatching(/No se pudo cargar las categorías padre.*HTTP 405.*solo admite: POST.*misma versión.*reinicia el backend/),
    });
  });

  it("conserva la referencia de soporte en errores internos sin exponer la causa", async () => {
    const idCorrelacion = "2e148b0b-dbab-44d0-bba8-e3e48bdc040f";
    const avisarSoporte = vi.fn();
    window.addEventListener("erroroperacionapi", avisarSoporte, { once: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "No fue posible completar la solicitud.",
      codigo: "ERRORINTERNO",
      idCorrelacion,
    }), {
      status: 500,
      headers: { "Content-Type": "application/problem+json" },
    })));

    let errorRecibido;
    try {
      await solicitarApi("/operacion");
    } catch (error) {
      errorRecibido = error;
    }

    expect(errorRecibido).toBeInstanceOf(ErrorApi);
    expect(errorRecibido.idCorrelacion).toBe(idCorrelacion);
    expect(errorRecibido.message).not.toContain(idCorrelacion);
    expect(errorRecibido.codigoSoporte).toBe("ERR-SRV-500");
    expect(errorRecibido.detalleSoporte).toContain("registros del servidor");
    expect(avisarSoporte).toHaveBeenCalledOnce();
  });

  it("detecta una respuesta exitosa con contenido inválido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("contenido inesperado", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })));

    await expect(solicitarApi("/respuesta-invalida")).rejects.toMatchObject({
      codigo: "RESPUESTAINVALIDA",
      recuperable: true,
    });
  });

  it("marca como no disponible un fallo de infraestructura sin problema JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad Gateway", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    })));

    await expect(solicitarApi("/operacion")).rejects.toMatchObject({ estado: 502 });

    expect(obtenerEstadoConexionApi()).toMatchObject({
      disponible: false,
      codigoSoporte: "ERR-GTW-502",
      tipoError: "Servidor fuera de servicio",
    });
  });

  it("distingue una base de datos fuera de servicio de un mantenimiento general", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "El servicio no está disponible temporalmente.",
      codigo: "BASEDEDATOSNODISPONIBLE",
      idCorrelacion: "referencia-db",
    }), {
      status: 503,
      headers: { "Content-Type": "application/problem+json" },
    })));

    await expect(solicitarApi("/operacion")).rejects.toMatchObject({
      estado: 503,
      codigoSoporte: "ERR-DB-503",
      tipoError: "Base de datos no disponible",
      idCorrelacion: "referencia-db",
    });
  });

  it("cancela una operación que supera el tiempo máximo", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, opciones) => (
      new Promise((_resolver, rechazar) => {
        opciones.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          rechazar(error);
        }, { once: true });
      })
    )));

    const operacion = solicitarApi("/operacion-lenta", { tiempoEsperaMs: 100 });
    const resultado = expect(operacion).rejects.toMatchObject({
      codigo: "TIEMPOESPERAAGOTADO",
      recuperable: true,
    });
    await vi.advanceTimersByTimeAsync(100);

    await resultado;
  });
});
