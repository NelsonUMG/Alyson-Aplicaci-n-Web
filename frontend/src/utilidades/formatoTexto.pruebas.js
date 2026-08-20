import { describe, expect, it } from "vitest";
import { formatearPermiso, formatearTextoEditorial, formatearTextoTecnico } from "./formatoTexto";

describe("formato de textos técnicos", () => {
  it("convierte estados y roles concatenados en etiquetas legibles", () => {
    expect(formatearTextoTecnico("ENMANTENIMIENTO")).toBe("En mantenimiento");
    expect(formatearTextoTecnico("USUARIOREGISTRADO")).toBe("Usuario registrado");
    expect(formatearTextoTecnico("EN_REVISION")).toBe("En revisión");
  });

  it("presenta los permisos como acciones comprensibles", () => {
    expect(formatearPermiso("EVENTOGESTIONARINSCRIPCIONES")).toBe("Gestionar inscripciones de eventos");
    expect(formatearPermiso("AREAACTUALIZARESTADO")).toBe("Actualizar estado de áreas");
  });

  it("normaliza títulos completamente en mayúsculas y conserva siglas", () => {
    expect(formatearTextoEditorial("CARRERAS")).toBe("Carreras");
    expect(formatearTextoEditorial("REQUISITOS DPI Y CUI")).toBe("Requisitos DPI y CUI");
    expect(formatearTextoEditorial("Baile latino")).toBe("Baile latino");
  });
});
