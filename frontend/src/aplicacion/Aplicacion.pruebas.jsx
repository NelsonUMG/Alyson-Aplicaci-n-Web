import { createMemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Aplicacion } from "./Aplicacion";
import { rutasAplicacion } from "./rutas";

vi.mock("../paginas/PaginaMapa", () => ({
  PaginaMapa: () => (
    <section aria-label="Mapa interactivo del Parque Erick Barrondo">
      <h1>Mapa real del Parque Erick Barrondo</h1>
    </section>
  ),
}));

function mostrarRuta(ruta) {
  const enrutador = createMemoryRouter(rutasAplicacion, { initialEntries: [ruta] });
  return render(<Aplicacion enrutador={enrutador} />);
}

describe("Aplicacion", () => {
  it("muestra la portada institucional en la ruta principal", async () => {
    mostrarRuta("/");

    expect(await screen.findByRole("heading", { name: "Parque Erick Barrondo" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bicicletas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Últimas publicaciones" })).toBeTruthy();
    expect(screen.queryByLabelText("Accesos rápidos")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Instituciones aliadas" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Mapa del parque" })).toBeNull();
  });

  it("navega a páginas públicas independientes", async () => {
    mostrarRuta("/nosotros");

    expect(await screen.findByRole("heading", { name: "Nosotros", level: 1 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Misión" })).toBeTruthy();
  });

  it("mantiene el mapa en su propia página", async () => {
    mostrarRuta("/mapa");

    expect(await screen.findByRole("heading", { name: "Mapa real del Parque Erick Barrondo", level: 1 })).toBeTruthy();
    expect(screen.getByLabelText("Mapa interactivo del Parque Erick Barrondo")).toBeTruthy();
  });

  it("muestra una página accesible para rutas inexistentes", async () => {
    mostrarRuta("/ruta-inexistente");

    expect(await screen.findByRole("heading", { name: "Página no encontrada" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toBeTruthy();
  });

  it("muestra el formulario de inicio de sesión", async () => {
    mostrarRuta("/iniciar-sesion");

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Mantener sesión activa por 1 semana/ })).toBeTruthy();
  });

  it("redirige al acceso cuando el perfil no tiene sesión", async () => {
    mostrarRuta("/perfil");

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  });
});
