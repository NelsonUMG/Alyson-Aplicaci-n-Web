const diagnosticoGenerico = {
  codigoSoporte: "ERR-APP-000",
  tipo: "Fallo de aplicación",
  titulo: "No pudimos completar la operación",
  mensajeUsuario: "Ocurrió un problema inesperado. Intenta nuevamente en unos minutos.",
  detalleSoporte: "La aplicación informó un fallo sin una clasificación específica. Revisar los registros usando la referencia de atención.",
};

function contiene(codigo, fragmento) {
  return String(codigo || "").toUpperCase().includes(fragmento);
}

export function diagnosticarError({ estado, codigo } = {}) {
  const numeroEstado = Number(estado) || 0;

  if (contiene(codigo, "BASEDEDATOS")) {
    return {
      codigoSoporte: "ERR-DB-503",
      tipo: "Base de datos no disponible",
      titulo: "El servicio está temporalmente fuera de servicio",
      mensajeUsuario: "No podemos consultar la información en este momento. Tus datos no fueron modificados; intenta nuevamente más tarde.",
      detalleSoporte: "La API no pudo obtener una conexión con la base de datos. Verificar disponibilidad, credenciales, red y grupo de conexiones del motor de datos.",
    };
  }

  if (contiene(codigo, "MANTENIMIENTO")) {
    return {
      codigoSoporte: "ERR-MNT-503",
      tipo: "Servidor en mantenimiento",
      titulo: "El sistema está en mantenimiento",
      mensajeUsuario: "Estamos realizando tareas técnicas. Vuelve a intentarlo dentro de unos minutos.",
      detalleSoporte: "El servicio declaró una ventana de mantenimiento. Verificar el estado del despliegue y la hora prevista de restablecimiento.",
    };
  }

  if (contiene(codigo, "SERVIDORNODISPONIBLE")) {
    return {
      codigoSoporte: "ERR-CON-000",
      tipo: "Servidor sin respuesta",
      titulo: "No podemos comunicarnos con el sistema",
      mensajeUsuario: "El servidor no responde en este momento. Comprueba tu conexión y vuelve a intentarlo.",
      detalleSoporte: "El navegador no logró establecer una conexión HTTP con la API. Verificar proceso del backend, proxy, DNS, puerto y conectividad de red.",
    };
  }

  if (contiene(codigo, "TIEMPOESPERAAGOTADO") || numeroEstado === 408 || numeroEstado === 504) {
    return {
      codigoSoporte: numeroEstado === 504 ? "ERR-GTW-504" : "ERR-TMO-408",
      tipo: "Tiempo de respuesta agotado",
      titulo: "El sistema está tardando más de lo esperado",
      mensajeUsuario: "La operación no terminó a tiempo. Espera un momento y vuelve a intentarlo.",
      detalleSoporte: numeroEstado === 504
        ? "La puerta de enlace agotó el tiempo de espera al comunicarse con el servicio de aplicación. Revisar proxy, carga y dependencias aguas arriba."
        : "El cliente agotó el tiempo máximo configurado para la petición. Revisar latencia, carga del servidor y operaciones bloqueadas.",
    };
  }

  if (contiene(codigo, "ERRORINTERFAZ") || contiene(codigo, "ERR-UI")) {
    return {
      codigoSoporte: "ERR-UI-500",
      tipo: "Fallo de interfaz",
      titulo: "La página encontró un problema",
      mensajeUsuario: "Detuvimos esta pantalla para proteger la información. Recarga la página para continuar.",
      detalleSoporte: "El límite de errores de la interfaz interceptó una excepción durante el renderizado. Revisar la consola y el registro de frontend asociado a la referencia.",
    };
  }

  if (numeroEstado === 404) {
    return {
      codigoSoporte: "ERR-HTTP-404",
      tipo: "Recurso no encontrado",
      titulo: "Página no encontrada",
      mensajeUsuario: "La dirección o información solicitada no está disponible.",
      detalleSoporte: "El servidor o el enrutador respondió HTTP 404. Verificar la URL, el identificador del recurso y la configuración de rutas.",
    };
  }

  if (numeroEstado === 502) {
    return {
      codigoSoporte: "ERR-GTW-502",
      tipo: "Servidor fuera de servicio",
      titulo: "El sistema está fuera de servicio",
      mensajeUsuario: "El servicio principal no está respondiendo. Intenta nuevamente dentro de unos minutos.",
      detalleSoporte: "La puerta de enlace respondió HTTP 502 porque no recibió una respuesta válida del servicio de aplicación. Revisar backend, proxy y red interna.",
    };
  }

  if (numeroEstado === 503) {
    return {
      codigoSoporte: "ERR-SVC-503",
      tipo: "Servicio temporalmente no disponible",
      titulo: "El servicio no está disponible",
      mensajeUsuario: "El sistema está temporalmente fuera de servicio. Intenta nuevamente más tarde.",
      detalleSoporte: "El servicio respondió HTTP 503. Verificar mantenimiento, capacidad, disponibilidad de instancias y dependencias críticas.",
    };
  }

  if (numeroEstado >= 500) {
    return {
      codigoSoporte: `ERR-SRV-${numeroEstado}`,
      tipo: "Error interno del servidor",
      titulo: "El servidor tuvo un problema",
      mensajeUsuario: "No pudimos completar la operación. Tus datos no fueron modificados; intenta nuevamente.",
      detalleSoporte: `La API respondió HTTP ${numeroEstado}. Consultar los registros del servidor mediante la referencia de atención; la causa interna no se expone al usuario.`,
    };
  }

  if (numeroEstado === 403) {
    return {
      codigoSoporte: "ERR-SEC-403",
      tipo: "Acceso denegado",
      titulo: "No tienes acceso a esta sección",
      mensajeUsuario: "Tu cuenta no tiene permiso para realizar esta operación.",
      detalleSoporte: "La autorización respondió HTTP 403. Verificar los roles y permisos efectivos de la cuenta.",
    };
  }

  if (numeroEstado === 401) {
    return {
      codigoSoporte: "ERR-AUT-401",
      tipo: "Sesión no válida",
      titulo: "Necesitas iniciar sesión nuevamente",
      mensajeUsuario: "Tu sesión terminó o ya no es válida. Inicia sesión para continuar.",
      detalleSoporte: "La autenticación respondió HTTP 401. Verificar expiración de sesión, cookie y estado de la cuenta.",
    };
  }

  if (numeroEstado >= 400) {
    return {
      codigoSoporte: `ERR-HTTP-${numeroEstado}`,
      tipo: "Solicitud no completada",
      titulo: "No pudimos completar la solicitud",
      mensajeUsuario: "Revisa la información e intenta nuevamente.",
      detalleSoporte: `La operación respondió HTTP ${numeroEstado}. Revisar el código funcional y la referencia de atención para identificar la validación aplicada.`,
    };
  }

  return diagnosticoGenerico;
}
