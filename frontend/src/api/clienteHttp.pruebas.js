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
});
