import { beforeEach, expect, it, vi } from "vitest";
const http = vi.hoisted(() => ({ solicitarApi: vi.fn(), recordarTokenCsrf: vi.fn() }));
vi.mock("./clienteHttp", () => http);
import { prepararCsrf } from "./autenticacion";
beforeEach(() => vi.resetAllMocks());
it("renueva CSRF después de revocar una sesión por recuperación", async () => {
  http.solicitarApi.mockRejectedValueOnce(Object.assign(new Error("Sesión revocada"), { estado: 401 }))
    .mockResolvedValueOnce({ token: "nuevo-token" });
  await prepararCsrf();
  expect(http.solicitarApi).toHaveBeenCalledTimes(2);
  expect(http.recordarTokenCsrf).toHaveBeenCalledWith("nuevo-token");
});
it("no repite la petición si el error no es una sesión revocada", async () => {
  http.solicitarApi.mockRejectedValue(Object.assign(new Error("Sin conexión"), { estado: 503 }));
  await expect(prepararCsrf()).rejects.toThrow("Sin conexión");
  expect(http.solicitarApi).toHaveBeenCalledTimes(1);
});
