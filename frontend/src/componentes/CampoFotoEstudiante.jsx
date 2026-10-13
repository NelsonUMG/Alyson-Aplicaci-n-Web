import { useEffect, useRef, useState } from "react";
import { FotografiaParticipante } from "./FotografiaParticipante";

export function CampoFotoEstudiante({ campo, valor, alCambiar }) {
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const seleccionActual = useRef(0);
  useEffect(() => () => { seleccionActual.current += 1; }, []);
  async function seleccionar(evento) {
    const input = evento.target;
    const archivo = input.files?.[0];
    const seleccion = ++seleccionActual.current;
    setError("");
    alCambiar(campo.id, archivo ? "FOTO_PENDIENTE" : "");
    input.setCustomValidity("");
    if (!archivo) { setProcesando(false); return; }
    if (archivo.size > 15 * 1024 * 1024) {
      setProcesando(false);
      const mensaje = "Selecciona una fotografía de hasta 15 MB.";
      input.setCustomValidity(mensaje); setError(mensaje); return;
    }
    setProcesando(true);
    try {
      const url = window.URL.createObjectURL(archivo);
      try {
        const imagen = await new Promise((resolve, reject) => {
          const elemento = new window.Image();
          elemento.onload = () => resolve(elemento);
          elemento.onerror = reject;
          elemento.src = url;
        });
        const escala = Math.min(1, 1600 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
        lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
        const contexto = lienzo.getContext("2d");
        contexto.fillStyle = "white"; contexto.fillRect(0, 0, lienzo.width, lienzo.height);
        contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        let dato = lienzo.toDataURL("image/jpeg", .85);
        if (dato.length > 1_390_000) dato = lienzo.toDataURL("image/jpeg", .6);
        if (dato.length > 1_390_000) throw new Error("Fotografía demasiado grande");
        if (seleccion === seleccionActual.current) alCambiar(campo.id, dato);
      } finally { window.URL.revokeObjectURL(url); }
    } catch {
      if (seleccion === seleccionActual.current) {
        input.setCustomValidity("No se pudo abrir la fotografía. Prueba con JPG, PNG, WebP, GIF, BMP o AVIF.");
        setError(input.validationMessage);
      }
    } finally { if (seleccion === seleccionActual.current) setProcesando(false); }
  }
  return <span className="campo-foto-estudiante">
    <input id={`requisito-${campo.id}`} type="file" accept="image/*" required={campo.obligatorio} onChange={seleccionar} />
    <small>Sube una fotografía de hasta 15 MB. La imagen se adapta automáticamente para la inscripción.</small>
    {procesando && <span role="status">Preparando fotografía…</span>}
    {error && <span role="alert">{error}</span>}
    {valor && <FotografiaParticipante src={valor} nombre="estudiante" />}
  </span>;
}
