import { Link } from "react-router-dom";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

export function PaginaEventos() {
  return (
    <>
      <CabeceraPagina
        etiqueta="Agenda del parque"
        titulo="Eventos y cursos"
        descripcion="Actividades, requisitos, cupos y periodos de inscripción."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor eventos-contenido">
          <div className="eventos-fecha" aria-hidden="true">
            <span>Agenda</span>
            <strong>—</strong>
          </div>
          <div>
            <p className="portal-sobrelinea">Próximas actividades</p>
            <h2>No hay eventos publicados todavía</h2>
            <p>Cuando una actividad sea confirmada podrás consultar aquí su fecha, ubicación, requisitos y cupos.</p>
            <Link className="portal-boton portal-boton-verde" to="/registro">Crear una cuenta</Link>
          </div>
        </div>
      </section>
    </>
  );
}
