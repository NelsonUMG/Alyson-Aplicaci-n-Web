const base = "http://127.0.0.1:8080/api/v1";
const resultados = [];

class Cliente {
  cookies = new Map();

  async solicitar(ruta, { method = "GET", body, headers = {} } = {}) {
    if (method !== "GET") {
      const csrf = await this.solicitar("/autenticacion/csrf");
      headers[csrf.data.nombreEncabezado] = csrf.data.token;
    }
    if (this.cookies.size) {
      headers.Cookie = [...this.cookies].map(([clave, valor]) => `${clave}=${valor}`).join("; ");
    }
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const respuesta = await fetch(base + ruta, { method, body, headers, redirect: "manual" });
    for (const cookie of respuesta.headers.getSetCookie()) {
      const [primera] = cookie.split(";");
      const separador = primera.indexOf("=");
      this.cookies.set(primera.slice(0, separador), primera.slice(separador + 1));
    }
    const tipo = respuesta.headers.get("content-type") || "";
    const data = tipo.includes("json") ? await respuesta.json() : null;
    return { status: respuesta.status, data };
  }

  async login(correo, contrasena) {
    const resultado = await this.solicitar("/autenticacion/iniciar-sesion", {
      method: "POST",
      body: { correo, contrasena, mantenerSesionActiva: false },
    });
    exigir(resultado.status === 200, `No fue posible autenticar ${correo}: ${resultado.status}`);
  }
}

function registrar(nombre, condicion, detalle = {}) {
  resultados.push({ nombre, ok: Boolean(condicion), ...detalle });
  console.log(`${condicion ? "OK" : "FALLO"} ${nombre} ${JSON.stringify(detalle)}`);
  exigir(condicion, nombre);
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function pdfValido() {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  const stream = "BT /F1 12 Tf 50 750 Td (QA REGRESION - SIN VALIDEZ) Tj ET";
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  objetos.forEach((objeto, indice) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const formulario = new FormData();
  formulario.append("archivo", new Blob([pdf], { type: "application/pdf" }), "qa-regresion.pdf");
  return formulario;
}

async function crearSolicitud(cliente, horaInicio, horaFin) {
  const solicitante = {
    nombreCompleto: "QA Regresion Produccion",
    dpi: "9000000930002",
    telefono: "55550002",
    correo: "qa.operador.20260930@example.invalid",
    representanteLegal: false,
    institucion: null,
  };
  let respuesta = await cliente.solicitar(
    "/solicitudes/tramites/RESERVACANCHAS/borradores",
    { method: "POST", body: solicitante },
  );
  exigir(respuesta.status === 201, `Crear borrador: ${respuesta.status}`);
  let solicitud = respuesta.data;
  respuesta = await cliente.solicitar(`/solicitudes/${solicitud.idSolicitud}/borrador`, {
    method: "PUT",
    body: {
      codigoArea: "1",
      fechaSolicitada: "2026-12-15",
      horaInicio,
      horaFin,
      tipoActividad: "QA regresión producción",
      cantidadPersonas: 60,
      descripcion: "Comprobación automatizada sin actividad real.",
      tipoReserva: "AFLUENCIAMEDIA",
      nombreResponsable: "QA Regresión",
      version: solicitud.version,
    },
  });
  exigir(respuesta.status === 200, `Guardar horario: ${respuesta.status}`);
  solicitud = respuesta.data;
  respuesta = await cliente.solicitar(`/solicitudes/${solicitud.idSolicitud}/documentos`, {
    method: "POST",
    body: pdfValido(),
  });
  exigir(respuesta.status === 201, `Adjuntar PDF válido: ${respuesta.status}`);
  solicitud = (await cliente.solicitar(`/solicitudes/${solicitud.idSolicitud}`)).data;
  respuesta = await cliente.solicitar(`/solicitudes/${solicitud.idSolicitud}/enviar`, {
    method: "POST",
    body: { version: solicitud.version },
  });
  exigir(respuesta.status === 200, `Enviar solicitud: ${respuesta.status}`);
  return respuesta.data;
}

const admin = new Cliente();
const usuario = new Cliente();
const anonimo = new Cliente();
const ids = { solicitudes: [] };

await admin.login("administrador.revision@parque.local", process.env.QA_TEMP_PASSWORD);
await usuario.login("qa.operador.20260930@example.invalid", process.env.QA_TEMP_PASSWORD);

let respuesta = await anonimo.solicitar("/publico/eventos/qa-integral-20260930-evento");
registrar("El evento cancelado dejó de ser público", respuesta.status === 404, { status: respuesta.status });

respuesta = await admin.solicitar("/administracion/categorias-publicaciones", {
  method: "POST",
  body: { nombre: "QA integral 20260930", descripcion: "duplicada", ordenVisualizacion: 99, activa: true, version: null },
});
registrar("Se rechaza una categoría de publicación duplicada", respuesta.status === 409, { status: respuesta.status });

let borrador = await usuario.solicitar(
  "/solicitudes/tramites/RESERVACANCHAS/borradores",
  {
    method: "POST",
    body: {
      nombreCompleto: "QA Regresion Produccion",
      dpi: "9000000930002",
      telefono: "55550002",
      correo: "qa.operador.20260930@example.invalid",
      representanteLegal: false,
      institucion: null,
    },
  },
);
exigir(borrador.status === 201, `Crear borrador PDF: ${borrador.status}`);
ids.borradorPdf = borrador.data.idSolicitud;
const truncado = new FormData();
truncado.append("archivo", new Blob(["%PDF-"], { type: "application/pdf" }), "truncado.pdf");
respuesta = await usuario.solicitar(`/solicitudes/${ids.borradorPdf}/documentos`, {
  method: "POST",
  body: truncado,
});
registrar("Se rechaza un PDF truncado de cinco bytes", respuesta.status === 400, { status: respuesta.status });

let solicitud = await crearSolicitud(usuario, "08:00", "09:00");
ids.solicitudes.push(solicitud.idSolicitud);
respuesta = await admin.solicitar(`/administracion/solicitudes/${solicitud.idSolicitud}/iniciar-revision`, {
  method: "POST",
  body: { version: solicitud.version },
});
exigir(respuesta.status === 200, `Iniciar revisión: ${respuesta.status}`);
respuesta = await admin.solicitar(`/administracion/solicitudes/${solicitud.idSolicitud}/resolver`, {
  method: "POST",
  body: { decision: "APROBADA", respuesta: "QA regresión automatizada.", version: respuesta.data.version },
});
registrar("Aprobar una solicitud crea su reserva", respuesta.status === 200, { status: respuesta.status });

const reservas = await admin.solicitar("/administracion/areas/1/reservas?desde=2026-12-15T00:00:00Z&hasta=2026-12-16T00:00:00Z");
registrar(
  "La reserva creada aparece en el calendario",
  reservas.status === 200 && JSON.stringify(reservas.data).includes(`Solicitud #${solicitud.idSolicitud}`),
  { status: reservas.status },
);

solicitud = await crearSolicitud(usuario, "08:00", "09:00");
ids.solicitudes.push(solicitud.idSolicitud);
respuesta = await admin.solicitar(`/administracion/solicitudes/${solicitud.idSolicitud}/iniciar-revision`, {
  method: "POST",
  body: { version: solicitud.version },
});
exigir(respuesta.status === 200, `Iniciar revisión superpuesta: ${respuesta.status}`);
respuesta = await admin.solicitar(`/administracion/solicitudes/${solicitud.idSolicitud}/resolver`, {
  method: "POST",
  body: { decision: "APROBADA", respuesta: "No debe aprobarse.", version: respuesta.data.version },
});
registrar("Se bloquea una aprobación con horario superpuesto", respuesta.status === 409, { status: respuesta.status });

console.log(`QA_IDS ${JSON.stringify(ids)}`);
console.log(`QA_RESULTADOS ${JSON.stringify(resultados)}`);
