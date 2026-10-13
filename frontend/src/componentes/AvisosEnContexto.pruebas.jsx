import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useState } from "react";
import { ProveedorAvisosEnContexto, AvisoEnContexto } from "./AvisosEnContexto";
import { CampoContrasena } from "./CampoContrasena";

afterEach(cleanup);
it("muestra el resultado dentro del formulario utilizado y permite cerrarlo", () => {
  function Pagina() {
    const [mensaje, setMensaje] = useState("");
    return <ProveedorAvisosEnContexto>
      {mensaje && <AvisoEnContexto>{mensaje}</AvisoEnContexto>}
      <form aria-label="Editar curso" onSubmit={(e) => { e.preventDefault(); setMensaje("Curso guardado"); }}><button>Guardar curso</button></form>
    </ProveedorAvisosEnContexto>;
  }
  render(<Pagina />);
  fireEvent.click(screen.getByRole("button", { name: "Guardar curso" }));
  expect(screen.getByRole("form").contains(screen.getByRole("status"))).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
  expect(screen.queryByRole("status")).toBeNull();
});
it("muestra y oculta la contraseña sin cambiar su valor ni enviar el formulario", () => {
  render(<><label htmlFor="clave">Contraseña</label><CampoContrasena id="clave" defaultValue="Una contraseña" /></>);
  const campo = screen.getByLabelText("Contraseña");
  expect(campo.type).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña (clave)" }));
  expect(campo.type).toBe("text");
  expect(campo.value).toBe("Una contraseña");
  fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña (clave)" }));
  expect(campo.type).toBe("password");
});

it("mantiene la alerta fuera del campo al mostrar u ocultar la contraseña", () => {
  function Acceso() {
    const [error, setError] = useState("");
    return <ProveedorAvisosEnContexto>
      {error && <AvisoEnContexto role="alert">{error}</AvisoEnContexto>}
      <form aria-label="Acceso" onSubmit={(e) => { e.preventDefault(); setError("Contraseña incorrecta"); }}>
        <label htmlFor="claveAcceso">Contraseña</label>
        <CampoContrasena id="claveAcceso" defaultValue="Prueba de contraseña" />
        <button type="submit">Ingresar</button>
      </form>
    </ProveedorAvisosEnContexto>;
  }
  render(<Acceso />);
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña (claveAcceso)" }));
  const campo = screen.getByLabelText("Contraseña");
  expect(campo.type).toBe("text");
  expect(campo.parentElement.contains(screen.getByRole("alert"))).toBe(false);
  expect(screen.getByRole("alert").closest("form")).toBe(screen.getByRole("form"));
  fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña (claveAcceso)" }));
  expect(campo.type).toBe("password");
  expect(campo.parentElement.contains(screen.getByRole("alert"))).toBe(false);
});
