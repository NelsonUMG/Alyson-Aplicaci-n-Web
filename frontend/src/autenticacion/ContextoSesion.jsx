import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  cerrarSesion as solicitarCierreSesion,
  iniciarSesion as solicitarInicioSesion,
  obtenerPerfil,
} from "../api/autenticacion";
import { ErrorApi } from "../api/clienteHttp";

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [estado, setEstado] = useState({ cargando: true, usuario: null });

  useEffect(() => {
    let vigente = true;
    const expirarSesion = () => {
      if (vigente) setEstado({ cargando: false, usuario: null });
    };
    window.addEventListener("sesionexpirada", expirarSesion);

    obtenerPerfil()
      .then((usuario) => {
        if (vigente) setEstado({ cargando: false, usuario });
      })
      .catch((error) => {
        if (!vigente) return;
        if (error instanceof ErrorApi && error.estado !== 401) {
          setEstado({ cargando: false, usuario: null, error: error.message });
          return;
        }
        setEstado({ cargando: false, usuario: null });
      });

    return () => {
      vigente = false;
      window.removeEventListener("sesionexpirada", expirarSesion);
    };
  }, []);

  const acciones = useMemo(
    () => ({
      async iniciar(datos) {
        const usuario = await solicitarInicioSesion(datos);
        setEstado({ cargando: false, usuario });
        return usuario;
      },
      async cerrar() {
        await solicitarCierreSesion();
        setEstado({ cargando: false, usuario: null });
      },
      actualizarUsuario(usuario) {
        setEstado({ cargando: false, usuario });
      },
    }),
    [],
  );

  const valor = useMemo(() => ({ ...estado, ...acciones }), [estado, acciones]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function usarSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error("usarSesion debe utilizarse dentro de ProveedorSesion.");
  }
  return contexto;
}
