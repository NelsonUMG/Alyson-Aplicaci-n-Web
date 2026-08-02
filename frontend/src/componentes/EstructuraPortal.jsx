import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { usarSesion } from "../autenticacion/ContextoSesion";

const enlacesNavegacion = [
  { destino: "/", texto: "Inicio" },
  { destino: "/nosotros", texto: "Nosotros" },
  { destino: "/areas-servicios", texto: "Áreas y servicios" },
  { destino: "/noticias", texto: "Noticias" },
  { destino: "/eventos", texto: "Eventos" },
  { destino: "/mapa", texto: "Mapa" },
];

function MarcaPortal() {
  return (
    <span className="portal-marca">
      <span className="portal-emblema" aria-hidden="true">PEB</span>
      <span className="portal-nombre">
        <strong>Parque Erick Barrondo</strong>
        <small>Derechos Reservados</small>
      </span>
    </span>
  );
}

export function EstructuraPortal() {
  const { cargando, usuario } = usarSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();

  useEffect(() => {
    setMenuAbierto(false);
    if (import.meta.env.MODE !== "test") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [ubicacion.pathname]);

  return (
    <div className="portal-sitio">
      <a className="salto-contenido" href="#contenido-principal">Saltar al contenido</a>

      <header className="portal-cabecera">
        <div className="portal-barra-superior">
          <div className="portal-contenedor portal-barra-contenido">
            <span>Dirección</span>
            <span>Portal</span>
          </div>
        </div>

        <div className="portal-contenedor portal-navegacion-contenedor">
          <Link className="portal-enlace-marca" to="/" aria-label="Ir al inicio">
            <MarcaPortal />
          </Link>

          <button
            className="portal-boton-menu"
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="portal-navegacion"
            onClick={() => setMenuAbierto((valorActual) => !valorActual)}
          >
            <span aria-hidden="true"><i /><i /><i /></span>
            Menú
          </button>

          <nav
            id="portal-navegacion"
            className={`portal-navegacion${menuAbierto ? " portal-navegacion-abierta" : ""}`}
            aria-label="Navegación principal"
          >
            {enlacesNavegacion.map((enlace) => (
              <NavLink
                key={enlace.destino}
                to={enlace.destino}
                end={enlace.destino === "/"}
                className={({ isActive }) => (isActive ? "portal-enlace-activo" : undefined)}
              >
                {enlace.texto}
              </NavLink>
            ))}
            {!cargando && (
              <Link className="portal-enlace-cuenta" to={usuario ? "/perfil" : "/iniciar-sesion"}>
                {usuario ? "Mi perfil" : "Iniciar sesión"}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main id="contenido-principal" className="portal-contenido-principal">
        <Outlet />
      </main>

      <footer className="portal-pie">
        <div className="portal-contenedor portal-pie-columnas">
          <div className="portal-pie-identidad">
            <MarcaPortal />
            <p>Información y activadades de Parque de Erick Barrondo.</p>
          </div>
          <div>
            <h2>Secciones</h2>
            <Link to="/nosotros">Nosotros</Link>
            <Link to="/areas-servicios">Áreas y servicios</Link>
            <Link to="/noticias">Noticias</Link>
            <Link to="/eventos">Eventos</Link>
          </div>
          <div>
            <h2>Visita</h2>
            <Link to="/mapa">Consultar mapa</Link>
            <p>Dirección de Polideportivo.</p>
            <p>Horario y contacto pendientes de validación.</p>
          </div>
        </div>
        <div className="portal-firma">
          <span>© 2026 Parque Erick Barrondo</span>
          <span>Proyecto</span>
        </div>
      </footer>
    </div>
  );
}
