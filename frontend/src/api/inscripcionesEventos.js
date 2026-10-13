import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function consultarInscripcionEvento(idEvento, idInscripcion = null) {
  return solicitarApi(`/eventos/${idEvento}/inscripcion${idInscripcion ? `?idInscripcion=${encodeURIComponent(idInscripcion)}` : ""}`);
}

export function listarMisInscripciones({ pagina = 0, tamano = 20 } = {}) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  return solicitarApi(`/eventos/inscripciones/mias?${parametros}`);
}

export async function inscribirEnEvento(idEvento, claveIdempotencia, respuestas = {}, codigoGrupo = null, participante = null) {
  await prepararCsrf();
  return solicitarApi(`/eventos/${idEvento}/inscripciones`, {
    method: "POST",
    headers: { "Idempotency-Key": claveIdempotencia },
    body: JSON.stringify({ aceptaRequisitos: true, codigoGrupo, respuestas, participante }),
  });
}

export async function cancelarInscripcionEvento(idEvento, motivo = "", idInscripcionEvento = null) {
  await prepararCsrf();
  return solicitarApi(`/eventos/${idEvento}/inscripciones/cancelar`, {
    method: "POST",
    body: JSON.stringify({ motivo: motivo || null, idInscripcionEvento }),
  });
}
