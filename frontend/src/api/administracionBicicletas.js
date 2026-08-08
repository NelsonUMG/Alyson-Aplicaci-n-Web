import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

async function enviar(ruta, metodo, datos, claveIdempotencia) {
  await prepararCsrf();
  const encabezados = claveIdempotencia ? { "Idempotency-Key": claveIdempotencia } : undefined;
  return solicitarApi(ruta, {
    method: metodo,
    headers: encabezados,
    body: JSON.stringify(datos),
  });
}

export function listarBicicletasAdministradas({
  busqueda = "",
  estado = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    estado,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return solicitarApi(`/administracion/bicicletas?${parametros}`);
}

export function consultarBicicletaAdministrada(idBicicleta) {
  return solicitarApi(`/administracion/bicicletas/${idBicicleta}`);
}

export function crearBicicleta(datos, claveIdempotencia) {
  return enviar("/administracion/bicicletas", "POST", datos, claveIdempotencia);
}

export function actualizarBicicleta(idBicicleta, datos) {
  return enviar(`/administracion/bicicletas/${idBicicleta}`, "PUT", datos);
}

export function cambiarEstadoBicicleta(idBicicleta, datos, claveIdempotencia) {
  return enviar(
    `/administracion/bicicletas/${idBicicleta}/estado`,
    "POST",
    datos,
    claveIdempotencia,
  );
}

export function listarHistorialBicicleta(idBicicleta) {
  return solicitarApi(`/administracion/bicicletas/${idBicicleta}/historial`);
}
