export function evaluarFortalezaContrasena(contrasena = "") {
  if (!contrasena) return { nivel: 0, etiqueta: "", clase: "" };

  let puntos = 0;
  if (contrasena.length >= 8) puntos += 1;
  if (contrasena.length >= 12) puntos += 1;
  if (contrasena.length >= 16) puntos += 1;
  if (/[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena)) puntos += 1;
  if (/\d/.test(contrasena)) puntos += 1;
  if (/[^\p{L}\d\s]/u.test(contrasena)) puntos += 1;

  if (contrasena.length < 8 || puntos <= 1) return { nivel: 1, etiqueta: "Muy débil", clase: "muy-debil" };
  if (contrasena.length < 12 || puntos <= 3) return { nivel: 2, etiqueta: "Débil", clase: "debil" };
  if (puntos <= 4) return { nivel: 3, etiqueta: "Normal", clase: "normal" };
  return { nivel: 4, etiqueta: "Segura", clase: "segura" };
}

export function IndicadorFortalezaContrasena({ contrasena, id }) {
  const fortaleza = evaluarFortalezaContrasena(contrasena);
  return (
    <div id={id} className={`fortaleza-contrasena fortaleza-${fortaleza.clase}`} aria-live="polite">
      <span className="fortaleza-contrasena-barras" aria-hidden="true">
        {[1, 2, 3, 4].map((nivel) => <i key={nivel} className={nivel <= fortaleza.nivel ? "activa" : ""} />)}
      </span>
      <span>Seguridad: <strong>{fortaleza.etiqueta || "Sin evaluar"}</strong></span>
      <small>{contrasena && contrasena.length < 12
        ? `${contrasena.length === 11 ? "Falta" : "Faltan"} ${12 - contrasena.length} ${contrasena.length === 11 ? "carácter" : "caracteres"} para alcanzar el mínimo.`
        : "Usa entre 12 y 128 caracteres."}</small>
    </div>
  );
}
