import { solicitarApi } from "./clienteHttp";

export function listarReporteInscripciones({
  busqueda = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return solicitarApi(`/administracion/reportes/inscripciones?${parametros}`);
}

export function listarPersonasInscritasReporte(idEvento, {
  busqueda = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return solicitarApi(`/administracion/reportes/inscripciones/${idEvento}/personas?${parametros}`);
}
