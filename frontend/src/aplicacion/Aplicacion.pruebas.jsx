import { createMemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Aplicacion } from "./Aplicacion";
import { rutasAplicacion } from "./rutas";

function mostrarRuta(ruta) {
  const enrutador = createMemoryRouter(rutasAplicacion, { initialEntries: [ruta] });
  return render(<Aplicacion enrutador={enrutador} />);
}

describe("Aplicacion", () => {
  it("muestra la base técnica en la ruta principal", async () => {
    mostrarRuta("/");

    expect(await screen.findByRole("heading", { name: "Sistema web en preparación" })).toBeTruthy();
    expect(screen.getByText("Microsoft SQL Server")).toBeTruthy();
  });

  it("muestra una página accesible para rutas inexistentes", async () => {
    mostrarRuta("/ruta-inexistente");

    expect(await screen.findByRole("heading", { name: "Página no encontrada" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toBeTruthy();
  });
});
