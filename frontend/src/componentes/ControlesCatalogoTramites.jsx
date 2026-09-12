import { useEffect, useId, useRef } from "react";

const trazos = {
  agregar: "M12 5v14M5 12h14",
  carpeta: "M3 7V5h6l2 2h10v12H3V7Z",
  documento: "M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h6",
  buscar: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  editar: "m15 5 4 4M4 20l4-1L20 7l-4-4L4 15v5Z",
  cerrar: "m6 6 12 12M6 18 18 6",
  flecha: "m9 5 7 7-7 7",
  volver: "m14 5-7 7 7 7",
  listo: "m5 12 4 4L19 6",
  bandeja: "M3 13 6 4h12l3 9v7H3v-7Zm0 0h5l2 3h4l2-3h5",
};

export function IconoCatalogo({ nombre, ...propiedades }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...propiedades}><path d={trazos[nombre]} /></svg>;
}

export function DialogoCatalogo({ titulo, descripcion, compacto = false, ocupado, cerrar, children }) {
  const referencia = useRef(null);
  const focoAnterior = useRef(document.activeElement);
  const id = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    const desbordamiento = document.body.style.overflow;
    dialogo.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialogo.close();
      document.body.style.overflow = desbordamiento;
      if (focoAnterior.current?.isConnected) focoAnterior.current.focus();
    };
  }, []);

  return (
    <dialog ref={referencia} className={`dialogo-catalogo${compacto ? " dialogo-catalogo-compacto" : ""}`} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-descripcion`}
      onCancel={(evento) => { evento.preventDefault(); if (!ocupado) cerrar(); }}>
      <header className="dialogo-catalogo-cabecera">
        <div><h2 id={`${id}-titulo`}>{titulo}</h2><p id={`${id}-descripcion`}>{descripcion}</p></div>
        <button type="button" className="catalogo-boton-icono" aria-label="Cerrar formulario" disabled={ocupado} onClick={cerrar}><IconoCatalogo nombre="cerrar" /></button>
      </header>
      {children}
    </dialog>
  );
}

export function ListaEditableCatalogo({ titulo, singular, elementos, cambiar, ayuda, ocupado }) {
  const id = useId();
  return (
    <fieldset className="catalogo-lista-editable" disabled={ocupado}>
      <legend>{titulo}</legend>
      <p id={`${id}-ayuda`}>{ayuda}</p>
      {elementos.map((elemento, indice) => (
        <div className="catalogo-elemento-editable" key={elemento.id}>
          <span aria-hidden="true">{indice + 1}.</span>
          <input aria-label={`${singular} ${indice + 1}`} aria-describedby={`${id}-ayuda`} maxLength={500} value={elemento.valor}
            onChange={(evento) => cambiar(elementos.map((item) => item.id === elemento.id ? { ...item, valor: evento.target.value } : item))} />
          <button type="button" className="catalogo-boton-icono" aria-label={`Quitar ${singular.toLowerCase()} ${indice + 1}`} onClick={() => cambiar(elementos.filter((item) => item.id !== elemento.id))}><IconoCatalogo nombre="cerrar" /></button>
        </div>
      ))}
      <button type="button" className="catalogo-boton-texto" onClick={() => cambiar([...elementos, { id: window.crypto.randomUUID(), valor: "" }])}><IconoCatalogo nombre="agregar" />Agregar {singular.toLowerCase()}</button>
    </fieldset>
  );
}
