import { afterEach, describe, expect, it, vi } from "vitest";
import { solicitarApi } from "./clienteHttp";

afterEach(() => {
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
});
