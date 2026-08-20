const etiquetasTecnicas = {
  ACTIVO: "Activo",
  ACTIVA: "Activa",
  INACTIVO: "Inactivo",
  INACTIVA: "Inactiva",
  PENDIENTECONFIRMACION: "Pendiente de confirmación",
  DISPONIBLE: "Disponible",
  ENUSO: "En uso",
  ENMANTENIMIENTO: "En mantenimiento",
  CERRADA: "Cerrada",
  CERRADO: "Cerrado",
  FUERADESERVICIO: "Fuera de servicio",
  PRESTADA: "Prestada",
  DANADA: "Dañada",
  NODEVUELTA: "No devuelta",
  INICIAL: "Inicial",
  BORRADOR: "Borrador",
  PUBLICADA: "Publicada",
  PUBLICADO: "Publicado",
  ARCHIVADA: "Archivada",
  CANCELADA: "Cancelada",
  CANCELADO: "Cancelado",
  FINALIZADA: "Finalizada",
  FINALIZADO: "Finalizado",
  CONFIRMADA: "Confirmada",
  ENVIADA: "Enviada",
  ENREVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  USUARIOREGISTRADO: "Usuario registrado",
  ADMINISTRADOR: "Administrador",
  OPERADOREVENTOS: "Operador de eventos",
  OPERADORBICICLETAS: "Operador de bicicletas",
  OPERADORMANTENIMIENTO: "Operador de mantenimiento",
  CONSULTAREPORTES: "Consulta de reportes",
  USOINSTALACION: "Uso de cancha o instalación",
  RESERVAAREA: "Uso de área o instalación",
};

const etiquetasPermisos = {
  PUBLICACIONLEER: "Consultar publicaciones",
  PUBLICACIONCREAR: "Crear publicaciones",
  PUBLICACIONACTUALIZAR: "Actualizar publicaciones",
  PUBLICACIONELIMINAR: "Archivar o eliminar publicaciones",
  EVENTOLEER: "Consultar eventos",
  EVENTOCREAR: "Crear eventos",
  EVENTOACTUALIZAR: "Actualizar eventos",
  EVENTOGESTIONARINSCRIPCIONES: "Gestionar inscripciones de eventos",
  SOLICITUDGESTIONAR: "Gestionar solicitudes de instalaciones",
  AREALEER: "Consultar áreas",
  AREAACTUALIZARESTADO: "Actualizar estado de áreas",
  AREAELIMINAR: "Eliminar áreas",
  BICICLETALEER: "Consultar bicicletas",
  BICICLETACREAR: "Registrar bicicletas",
  BICICLETAPRESTAR: "Registrar préstamos de bicicletas",
  BICICLETADEVOLVER: "Registrar devoluciones de bicicletas",
  BICICLETAACTUALIZARESTADO: "Actualizar estado de bicicletas",
  MANTENIMIENTOLEER: "Consultar mantenimiento",
  MANTENIMIENTOCREAR: "Crear solicitudes de mantenimiento",
  MANTENIMIENTOACTUALIZAR: "Actualizar mantenimiento",
  REPORTELEER: "Consultar reportes",
  USUARIOGESTIONAR: "Gestionar usuarios",
  ROLGESTIONAR: "Gestionar roles y permisos",
  AUDITORIALEER: "Consultar auditoría",
  INSTITUCIONALGESTIONAR: "Gestionar contenido institucional",
};

const siglasConservadas = new Set(["API", "CUI", "DPI", "GPS", "HTTP", "HTTPS", "SQL", "URL"]);

function claveTecnica(valor) {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "")
    .toUpperCase();
}

export function formatearTextoTecnico(valor) {
  if (valor == null || String(valor).trim() === "") return "";
  const texto = String(valor).trim();
  const etiqueta = etiquetasTecnicas[claveTecnica(texto)];
  if (etiqueta) return etiqueta;
  if (/[a-záéíóúñ]/.test(texto)) return texto;

  const separado = texto.replace(/[_-]+/g, " ").toLocaleLowerCase("es-GT");
  return separado.charAt(0).toLocaleUpperCase("es-GT") + separado.slice(1);
}

export function formatearPermiso(codigo) {
  if (!codigo) return "";
  return etiquetasPermisos[claveTecnica(codigo)] || formatearTextoTecnico(codigo);
}

export function formatearTextoEditorial(valor) {
  if (valor == null || String(valor).trim() === "") return "";
  const texto = String(valor).trim();
  const letras = texto.replace(/[^\p{L}]/gu, "");
  if (!letras || letras !== letras.toLocaleUpperCase("es-GT")) return texto;

  const normalizado = texto.replace(/\p{L}+/gu, (palabra) => {
    const clave = claveTecnica(palabra);
    return siglasConservadas.has(clave) ? clave : palabra.toLocaleLowerCase("es-GT");
  });
  return normalizado.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase("es-GT"));
}
