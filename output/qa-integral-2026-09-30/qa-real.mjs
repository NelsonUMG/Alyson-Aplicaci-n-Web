// QA contra la API y SQL Server de la instalación, sin mocks ni modificación SQL.
// Credenciales únicamente por variables de entorno; no se guardan en evidencias.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const dir = fileURLToPath(new URL('./', import.meta.url));
const base = 'http://127.0.0.1:8080/api/v1';
const mode = process.argv[2] || 'lecturas';
const statePath = `${dir}estado-qa.json`;
const state = await readFile(statePath, 'utf8').then(JSON.parse).catch(() => ({ prefijo: 'QA integral 20260930', recursos: {} }));
const results = [];
const save = () => writeFile(statePath, JSON.stringify(state, null, 2));
const record = (name, ok, detail = {}) => { results.push({ name, ok, ...detail }); console.log(`${ok ? 'OK' : 'FALLO'} ${name} ${JSON.stringify(detail)}`); };
class Client {
  cookies = new Map();
  async request(path, { method = 'GET', body, headers = {}, csrf = true } = {}) {
    if (method !== 'GET' && csrf) {
      const token = await this.request('/autenticacion/csrf');
      headers[token.data.nombreEncabezado] = token.data.token;
    }
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ');
    if (body !== undefined && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const start = Date.now();
    const response = await fetch(base + path, { method, body, headers, redirect: 'manual', signal: AbortSignal.timeout(35000) });
    for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0]; const split = first.indexOf('='); this.cookies.set(first.slice(0,split),first.slice(split+1)); }
    const type = response.headers.get('content-type') || '';
    const data = type.includes('json') ? await response.json() : { bytes: (await response.arrayBuffer()).byteLength };
    return { status: response.status, data, ms: Date.now()-start, headers: Object.fromEntries(response.headers) };
  }
  async check(name, path, options = {}, statuses = [200], verify = null) {
    const r = await this.request(path, options);
    record(name, statuses.includes(r.status) && (!verify || verify(r.data)), { status:r.status, ms:r.ms, ...(r.status>=400 ? {detail:r.data.detail} : {}) });
    return r.data;
  }
  async login(email, password) {
    if (!password) throw new Error('Falta credencial de QA en variable de entorno.');
    const r = await this.request('/autenticacion/iniciar-sesion', {method:'POST', body:{correo:email,contrasena:password,mantenerSesionActiva:false}});
    if (r.status!==200) throw new Error(`Inicio de sesión: ${r.status} ${r.data.detail}`);
    return r.data;
  }
}
const anon = new Client();
const admin = new Client();
const user = new Client();
const prefix = state.prefijo;
const own = state.recursos;
const imagen = await readFile(new URL('../../frontend/public/imagenes/escudo-guatemala.png', import.meta.url));
function imageForm() { const f = new FormData(); f.append('archivo',new Blob([imagen],{type:'image/png'}),'qa-escudo.png'); return f; }
function badForm() { const f = new FormData(); f.append('archivo',new Blob(['<script>alert("QA")</script>'],{type:'image/png'}),'qa-invalida.png'); return f; }
function pdfForm() {
  // Documento sintético de QA: no contiene un DPI real ni datos personales.
  let pdf='%PDF-1.4\n'; const offsets=[0];
  const stream='BT /F1 12 Tf 50 750 Td (QA INTEGRAL - DOCUMENTO SIN VALIDEZ) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf); pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const f = new FormData();f.append('archivo',new Blob([pdf],{type:'application/pdf'}),'QA-sin-validez.pdf');return f;
}
async function remember(key, value) { own[key]=value;await save();return value; }
async function requireUser() { const p=await user.login('nelson2031997p@gmail.com',process.env.QA_USER_PASSWORD);state.idUsuarioQa=p.idUsuario;await save();return p; }
try {
  await mkdir(dir,{recursive:true});
  const profile = await admin.login('administrador.revision@parque.local',process.env.QA_ADMIN_PASSWORD);
  record('Administrador autentica en servidor real',!!profile);
  if (mode==='lecturas') {
    const paths=['/publico/institucional','/publico/publicaciones','/publico/categorias-publicaciones','/publico/eventos','/publico/areas','/publico/mapa','/publico/apariencia','/publico/bicicletas/resumen'];
    for(const p of paths) await anon.check(`Público ${p}`,p);
    for(const p of ['/administracion/usuarios','/administracion/roles','/administracion/permisos','/administracion/publicaciones','/administracion/eventos','/administracion/areas','/administracion/categorias-areas','/administracion/institucional','/administracion/solicitudes','/administracion/solicitudes/catalogo','/administracion/solicitudes/catalogo/categorias','/administracion/reportes/inscripciones','/administracion/auditoria','/administracion/mapa/nodos','/administracion/mapa/conexiones','/administracion/bicicletas']) await admin.check(`Administración ${p}`,p);
    await requireUser();
    for(const p of ['/autenticacion/perfil','/solicitudes/catalogo','/solicitudes/mias','/eventos/inscripciones/mias','/notificaciones']) await user.check(`Usuario ${p}`,p);
    for(const p of ['/administracion/usuarios','/administracion/publicaciones','/administracion/eventos','/administracion/areas','/administracion/institucional','/administracion/solicitudes','/administracion/auditoria','/administracion/reportes/inscripciones']) {
      await user.check(`Usuario no accede ${p}`,p,{},[403]);
      await anon.check(`Anónimo no accede ${p}`,p,{},[401]);
    }
    await user.check('POST sin CSRF se rechaza','/solicitudes/denuncias-quejas',{method:'POST',csrf:false,body:{tipo:'QUEJA',asunto:'No debe guardarse',descripcion:'Comprobación CSRF'}},[403]);
    await admin.check('Búsqueda con comillas SQL no provoca error','/administracion/usuarios?busqueda='+encodeURIComponent("' OR 1=1 --"));
    await admin.check('Paginación fuera de rango no provoca error','/administracion/publicaciones?pagina=-1&tamano=99999');
    const categories=await admin.request('/administracion/categorias-publicaciones');
    console.log('CATEGORIAS',JSON.stringify(categories.data));
  }
  if (mode==='crear' || mode==='noticias') {
    if((mode==='crear' && (own.area||own.evento)) || own.publicacion?.idPublicacion) throw new Error('Ya existen recursos de esta ejecución. No se repite la creación.');
    const cat=await admin.check('Crear categoría de noticia','/administracion/categorias-publicaciones',{method:'POST',body:{nombre:prefix,descripcion:'Categoría temporal identificada para QA',ordenVisualizacion:50,activa:true}},[201]);
    if(!cat.idCategoriaPublicacion) throw new Error('No se creó categoría; se detiene para evitar resultados en cascada.');
    await remember('categoriaPublicacion',cat);
    await admin.check('Categoría noticia duplicada rechazada','/administracion/categorias-publicaciones',{method:'POST',body:{nombre:prefix,ordenVisualizacion:51,activa:true}},[409]);
    const newsData={idCategoriaPublicacion:cat.idCategoriaPublicacion,titulo:prefix+' noticia',resumen:'Texto de comprobación: áéíóú ñ <b>literal</b>',contenido:'<script>window.__qaNoEjecutar=1</script> Contenido de QA sin información real.',fechaEditorial:'2026-09-30'};
    const key=randomUUID();
    let news=await admin.check('Crear borrador de noticia','/administracion/publicaciones',{method:'POST',body:newsData,headers:{'Idempotency-Key':key}},[201]);
    await remember('publicacion',news);
    await admin.check('Reintento idempotente no duplica noticia','/administracion/publicaciones',{method:'POST',body:newsData,headers:{'Idempotency-Key':key}},[200,201],d=>d.idPublicacion===news.idPublicacion);
    await anon.check('Borrador no visible en portal',`/publico/publicaciones/${news.identificadorUrl}`,{},[404]);
    await admin.check('Imagen falsa de noticia rechazada',`/administracion/publicaciones/${news.idPublicacion}/imagenes`,{method:'POST',body:badForm()},[400]);
    const img=await admin.check('Subir imagen real de noticia',`/administracion/publicaciones/${news.idPublicacion}/imagenes`,{method:'POST',body:imageForm()},[201]);await remember('imagenPublicacion',img);
    news=(await admin.request(`/administracion/publicaciones/${news.idPublicacion}`)).data;
    news=await admin.check('Editar noticia',`/administracion/publicaciones/${news.idPublicacion}`,{method:'PUT',body:{...newsData,titulo:prefix+' noticia editada',version:news.version}});await remember('publicacion',news);
    await admin.check('Conflicto de edición antigua controlado',`/administracion/publicaciones/${news.idPublicacion}`,{method:'PUT',body:{...newsData,version:0}},[409]);
    news=await admin.check('Publicar noticia',`/administracion/publicaciones/${news.idPublicacion}/publicar`,{method:'POST',body:{version:news.version}});await remember('publicacion',news);
    await anon.check('Noticia publicada se consulta',`/publico/publicaciones/${news.identificadorUrl}`);
    if(mode==='crear') {
    const ca=await admin.check('Crear categoría de área','/administracion/categorias-areas',{method:'POST',body:{nombre:prefix+' áreas',descripcion:'Recursos de QA, no instalaciones reales',activa:true}},[201]);await remember('categoriaArea',ca);
    const arData={idCategoriaArea:ca.idCategoriaArea,nombre:prefix+' área',descripcion:'No es un espacio real; validación funcional',estado:'DISPONIBLE',motivoCambioEstado:'Alta controlada de QA',horarioJson:null,perimetro:[]};
    let area=await admin.check('Crear área','/administracion/areas',{method:'POST',body:arData},[201]);await remember('area',area);state.areaData=arData;await save();
    await admin.check('Subir imagen de área',`/administracion/areas/${area.idArea}/imagen`,{method:'POST',body:imageForm()},[200,201]);
    await admin.check('Historial de área disponible',`/administracion/areas/${area.idArea}/historial`);
    const tc=await admin.check('Crear categoría de trámite','/administracion/solicitudes/catalogo/categorias',{method:'POST',body:{nombre:prefix+' trámites'}},[201]);await remember('categoriaTramite',tc);
    await admin.check('Editar categoría de trámite',`/administracion/solicitudes/catalogo/categorias/${tc.idCategoria}`,{method:'PUT',body:{nombre:prefix+' trámites editada'}});
    for(const reserve of [true,false]) {
      const trData={idCategoria:tc.idCategoria,nombre:prefix+(reserve?' reserva':' sin horario'),resumen:'Trámite identificado para revisión funcional',acerca:'No corresponde a una gestión real.',requisitos:[],documentosRequeridos:['PDF de comprobación sin datos reales'],costo:'Sin costo',tiempoRespuesta:'QA',requiereReserva:reserve,activo:true};
      const tr=await admin.check(`Crear trámite ${reserve?'con':'sin'} reserva sin imagen`,'/administracion/solicitudes/catalogo',{method:'POST',body:trData},[201]);await remember(reserve?'tramiteReserva':'tramiteGeneral',tr);
    }
    const groups={grupos:[{codigo:'ninos',nombre:'Niños QA',categoriaEdad:'Niños',edadMinima:0,edadMaxima:14,horarios:[{dia:'SABADO',horaInicio:'09:00',horaFin:'10:00',lugar:'QA'}]},{codigo:'adultos',nombre:'Adultos QA',categoriaEdad:'Adultos',edadMinima:15,edadMaxima:120,horarios:[{dia:'SABADO',horaInicio:'10:00',horaFin:'11:00',lugar:'QA'}]}]};
    const eventData={titulo:prefix+' evento',descripcion:'Evento de validación, no actividad real',lugar:'QA',iniciaEn:'2026-11-14T15:00:00Z',finalizaEn:'2026-11-14T17:00:00Z',inscripcionAbreEn:'2026-09-01T00:00:00Z',inscripcionCierraEn:'2026-11-10T00:00:00Z',capacidadTotal:2,esquemaFormularioJson:null,configuracionGruposJson:JSON.stringify(groups),requisitos:[{descripcion:'Comprobación de requisitos',obligatorio:true,ordenVisualizacion:1}]};
    let ev=await admin.check('Crear evento con grupos de edad','/administracion/eventos',{method:'POST',body:eventData},[201]);await remember('evento',ev);state.eventData=eventData;await save();
    await admin.check('Subir portada de evento',`/administracion/eventos/${ev.idEvento}/imagen`,{method:'POST',body:imageForm()},[200,201]);
    await admin.check('Subir galería de evento',`/administracion/eventos/${ev.idEvento}/imagenes-secundarias`,{method:'POST',body:imageForm()},[201]);
    ev=(await admin.request(`/administracion/eventos/${ev.idEvento}`)).data;
    ev=await admin.check('Publicar evento',`/administracion/eventos/${ev.idEvento}/publicar`,{method:'POST',body:{version:ev.version}});await remember('evento',ev);
    await anon.check('Evento publicado visible',`/publico/eventos/${ev.identificadorUrl}`);
    }
  }
  if(mode==='usuario') {
    await requireUser();
    const ev=own.evento;
    await user.check('Adulto no puede elegir grupo infantil',`/eventos/${ev.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:true,codigoGrupo:'ninos',respuestas:{}}},[400]);
    await user.check('No se inscribe sin aceptar requisitos',`/eventos/${ev.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:false,codigoGrupo:'adultos',respuestas:{}}},[400]);
    const enrollmentKey=randomUUID();
    const enrollment=await user.check('Usuario se inscribe en grupo correcto',`/eventos/${ev.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':enrollmentKey},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}},[200,201]);await remember('inscripcion',enrollment);
    await user.check('Reintento de inscripción es idempotente',`/eventos/${ev.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':enrollmentKey},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}},[200,201],d=>d.idInscripcionEvento===enrollment.idInscripcionEvento);
    await user.check('No duplica inscripción con otra clave',`/eventos/${ev.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}},[409]);
    await user.check('Mis inscripciones refleja el registro','/eventos/inscripciones/mias');
    await admin.check('Reporte incluye la inscripción',`/administracion/reportes/inscripciones/${ev.idEvento}/personas`,{},[200],d=>d.totalElementos===1);
    await user.check('Notificación de inscripción disponible','/notificaciones');
    const applicant={nombreCompleto:'QA Integral Preproduccion',dpi:'9000000930001',telefono:'55550001',correo:'nelson2031997p@gmail.com',representanteLegal:false,institucion:null};
    const tr=own.tramiteReserva;
    await user.check('Teléfono excesivo rechazado',`/solicitudes/tramites/${tr.codigo}/borradores`,{method:'POST',body:{...applicant,telefono:'123456789999'}},[400]);
    await user.check('DPI corto rechazado',`/solicitudes/tramites/${tr.codigo}/borradores`,{method:'POST',body:{...applicant,dpi:'1234'}},[400]);
    await user.check('Representante debe indicar institución',`/solicitudes/tramites/${tr.codigo}/borradores`,{method:'POST',body:{...applicant,representanteLegal:true}},[400]);
    const requests=[];
    for(let i=0;i<2;i++) {
      let req=await user.check(`Crear solicitud ${i+1} con mismo usuario`, `/solicitudes/tramites/${tr.codigo}/borradores`,{method:'POST',body:applicant},[201]);
      requests.push(req);own.solicitudes=requests;await save();
      await user.check(`Solicitud ${i+1} incompleta no se envía`,`/solicitudes/${req.idSolicitud}/enviar`,{method:'POST',body:{version:req.version}},[400]);
      const data={codigoArea:own.area.codigo,fechaSolicitada:'2026-11-20',horaInicio:i?'11:00':'09:00',horaFin:i?'12:00':'10:00',tipoActividad:'QA sin actividad real',cantidadPersonas:60,descripcion:'Comprobación integral autorizada; no es una reserva real.',tipoReserva:'AFLUENCIAMEDIA',nombreResponsable:'QA Integral',version:req.version};
      req=await user.check(`Guardar espacio y horario solicitud ${i+1}`,`/solicitudes/${req.idSolicitud}/borrador`,{method:'PUT',body:data});
      requests[i]=req;await save();
      await user.check(`Solicitud ${i+1} exige documento`, `/solicitudes/${req.idSolicitud}/enviar`,{method:'POST',body:{version:req.version}},[400]);
      const invalid=new FormData();invalid.append('archivo',new Blob(['No es PDF'],{type:'application/pdf'}),'archivo.pdf');
      await user.check(`PDF falso rechazado ${i+1}`,`/solicitudes/${req.idSolicitud}/documentos`,{method:'POST',body:invalid},[400]);
      const doc=await user.check(`Cargar PDF sintético ${i+1}`,`/solicitudes/${req.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
      await user.check(`Descargar documento propio ${i+1}`,doc.urlDescarga?.replace('/api/v1','')||`/solicitudes/${req.idSolicitud}/documentos/${doc.idDocumentoSolicitud}/archivo`);
      req=(await user.request(`/solicitudes/${req.idSolicitud}`)).data;
      req=await user.check(`Enviar solicitud real ${i+1}`,`/solicitudes/${req.idSolicitud}/enviar`,{method:'POST',body:{version:req.version}});requests[i]=req;await save();
      await user.check(`No permite reenviar solicitud ${i+1}`,`/solicitudes/${req.idSolicitud}/enviar`,{method:'POST',body:{version:req.version}},[409]);
      await admin.check(`Administración recibe solicitud ${i+1}`,`/administracion/solicitudes/${req.idSolicitud}`);
    }
    let general=await user.check('Crear trámite sin horario',`/solicitudes/tramites/${own.tramiteGeneral.codigo}/borradores`,{method:'POST',body:applicant},[201]);await remember('solicitudGeneral',general);
    await user.check('Adjuntar documento a trámite sin reserva',`/solicitudes/${general.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
    general=(await user.request(`/solicitudes/${general.idSolicitud}`)).data;
    general=await user.check('Enviar trámite sin exigir espacio ni horario',`/solicitudes/${general.idSolicitud}/enviar`,{method:'POST',body:{version:general.version}});await remember('solicitudGeneral',general);
    const complaint=await user.check('Enviar queja real','/solicitudes/denuncias-quejas',{method:'POST',body:{tipo:'QUEJA',asunto:prefix+' queja controlada',descripcion:'Validación funcional autorizada. No es una denuncia contra una persona ni un reclamo real.'}},[201]);await remember('queja',complaint);
  }
  if(mode==='resolver') {
    await requireUser();
    for(let i=0;i<own.solicitudes.length;i++) {
      let req=(await admin.request(`/administracion/solicitudes/${own.solicitudes[i].idSolicitud}`)).data;
      req=await admin.check(`Iniciar revisión ${i+1}`,`/administracion/solicitudes/${req.idSolicitud}/iniciar-revision`,{method:'POST',body:{version:req.version}});
      req=await admin.check(`Resolver ${i?'rechazo':'aprobación'} y enviar correo real`, `/administracion/solicitudes/${req.idSolicitud}/resolver`,{method:'POST',body:{decision:i?'RECHAZADA':'APROBADA',respuesta:'QA INTEGRAL: resolución de comprobación. No constituye una autorización real de uso del parque.',version:req.version}});own.solicitudes[i]=req;await save();
    }
    await user.check('Resoluciones visibles para solicitante','/solicitudes/mias');
    const ns=await user.check('Notificaciones de resolución','/notificaciones');console.log('NOTIFICACIONES',JSON.stringify(ns));
    await admin.check('Reservas tras aprobar una solicitud',`/administracion/areas/${own.area.idArea}/reservas`);
    await admin.check('Auditoría de operaciones','/administracion/auditoria?tamano=100');
  }
  if(mode==='ampliadas') {
    const up=await requireUser();
    await user.check('Fecha futura de perfil rechazada','/autenticacion/perfil',{method:'PUT',body:{nombre:'QA Integral',apellido:'Preproduccion',dpiExtendidoEn:'QA',celular:'55550001',telefono:'',direccion:'',fechaNacimiento:'2099-01-01'}},[400]);
    const personal={nombre:'QA Integral',apellido:'Preproduccion',dpiExtendidoEn:'QA sin documento real',celular:'55550001',telefono:'',direccion:'Dato sintético QA',fechaNacimiento:'1995-05-10'};
    await user.check('Actualizar perfil real','/autenticacion/perfil',{method:'PUT',body:personal});
    await user.check('Perfil persiste tras recarga','/autenticacion/perfil',{},[200],d=>d.direccion===personal.direccion);
    await user.check('Foto inválida perfil rechazada','/autenticacion/perfil/foto',{method:'POST',body:badForm()},[400]);
    await user.check('Subir foto de perfil','/autenticacion/perfil/foto',{method:'POST',body:imageForm()},[200,201]);
    await user.check('Leer foto de perfil','/autenticacion/perfil/foto');
    await user.check('Retirar foto propia de QA','/autenticacion/perfil/foto',{method:'DELETE'},[200,204]);
    const role=await admin.check('Crear rol limitado para QA','/administracion/roles',{method:'POST',body:{nombre:prefix+' lectura eventos',descripcion:'Rol limitado de comprobación',codigosPermisos:['EVENTOLEER']}},[201]);await remember('rol',role);
    await admin.check('Rol duplicado rechazado','/administracion/roles',{method:'POST',body:{nombre:prefix+' lectura eventos',descripcion:'No debe duplicarse',codigosPermisos:['EVENTOLEER']}},[409]);
    const emp=await admin.check('Registrar empleado con permiso limitado','/administracion/empleados',{method:'POST',body:{nombre:'QA',apellido:'Operador limitado',correo:'qa.operador.20260930@example.invalid',dpi:'9000000930002',celular:'55550002',fechaNacimiento:'1990-05-10',contrasenaInicial:process.env.QA_USER_PASSWORD,codigosRoles:[role.codigo]}},[201]);await remember('empleado',emp);
    const op=new Client();await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);
    await op.check('Empleado limitado puede leer eventos','/administracion/eventos');
    await op.check('Empleado limitado no crea evento','/administracion/eventos',{method:'POST',body:state.eventData},[403]);
    await op.check('Empleado limitado no asigna administrador',`/administracion/usuarios/${emp.idUsuario}/roles`,{method:'PUT',body:{versionUsuario:emp.version,codigosRoles:['USUARIOREGISTRADO','ADMINISTRADOR']}},[403]);
    await admin.check('No se puede quitar rol base obligatorio',`/administracion/usuarios/${emp.idUsuario}/roles`,{method:'PUT',body:{versionUsuario:emp.version,codigosRoles:[role.codigo]}},[400]);
    await op.check('Otra cuenta no lee solicitud ajena',`/solicitudes/${own.solicitudes[0].idSolicitud}`,{},[404]);
    const req=(await user.request(`/solicitudes/${own.solicitudes[0].idSolicitud}`)).data;
    await op.check('Otra cuenta no descarga documento ajeno',`/solicitudes/${req.idSolicitud}/documentos/${req.documentos[0].idDocumentoSolicitud}/archivo`,{},[404]);
    await user.check('Usuario no resuelve su propia solicitud',`/administracion/solicitudes/${own.solicitudGeneral.idSolicitud}/resolver`,{method:'POST',body:{decision:'APROBADA',respuesta:'No debe aceptarse',version:own.solicitudGeneral.version}},[403]);
    const roleUpdate=await admin.check('Actualizar roles de empleado',`/administracion/usuarios/${emp.idUsuario}/roles`,{method:'PUT',body:{versionUsuario:emp.version,codigosRoles:['USUARIOREGISTRADO']}},[200]);await remember('empleado',roleUpdate);
    await op.check('Cambio de rol revoca sesión antigua','/administracion/eventos',{},[401,403]);
    const area=own.area;
    const reservationData={titulo:prefix+' bloqueo administrativo',iniciaEn:'2026-11-21T15:00:00Z',finalizaEn:'2026-11-21T16:00:00Z',estado:'PROGRAMADA',observaciones:'QA sin actividad real'};
    const res=await admin.check('Crear reserva administrativa',`/administracion/areas/${area.idArea}/reservas`,{method:'POST',body:reservationData},[201]);await remember('reserva',res);
    await admin.check('Bloquear reserva administrativa superpuesta',`/administracion/areas/${area.idArea}/reservas`,{method:'POST',body:reservationData},[409]);
    await admin.check('Horario final anterior se rechaza',`/administracion/areas/${area.idArea}/reservas`,{method:'POST',body:{...reservationData,finalizaEn:'2026-11-21T14:00:00Z'}},[400]);
    const reservadas=(await admin.request(`/administracion/areas/${area.idArea}/reservas`)).data;
    record('Solicitud aprobada aparece en calendario de reservas',JSON.stringify(reservadas).includes('2026-11-20'),{fechaEsperada:'2026-11-20',cantidad:Array.isArray(reservadas)?reservadas.length:null});
    const applicant={nombreCompleto:'QA Integral Preproduccion',dpi:'9000000930001',telefono:'55550001',correo:'nelson2031997p@gmail.com',representanteLegal:false,institucion:null};
    let overlap=await user.check('Crear solicitud para horario ya aprobado',`/solicitudes/tramites/${own.tramiteReserva.codigo}/borradores`,{method:'POST',body:applicant},[201]);await remember('solicitudSolapada',overlap);
    const overlapData={codigoArea:area.codigo,fechaSolicitada:'2026-11-20',horaInicio:'09:00',horaFin:'10:00',tipoActividad:'QA superposición',cantidadPersonas:60,descripcion:'Control de conflicto de horario; no es una actividad real.',tipoReserva:'AFLUENCIAMEDIA',nombreResponsable:'QA',version:overlap.version};
    overlap=await user.check('Guardar horario ya aprobado',`/solicitudes/${overlap.idSolicitud}/borrador`,{method:'PUT',body:overlapData});await remember('solicitudSolapada',overlap);
    await user.check('Documento de solicitud superpuesta',`/solicitudes/${overlap.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
    overlap=(await user.request(`/solicitudes/${overlap.idSolicitud}`)).data;
    overlap=await user.check('Enviar solicitud superpuesta para revisión',`/solicitudes/${overlap.idSolicitud}/enviar`,{method:'POST',body:{version:overlap.version}});await remember('solicitudSolapada',overlap);
    overlap=await admin.check('Revisar solicitud superpuesta',`/administracion/solicitudes/${overlap.idSolicitud}/iniciar-revision`,{method:'POST',body:{version:overlap.version}});await remember('solicitudSolapada',overlap);
    const conflict=await admin.request(`/administracion/solicitudes/${overlap.idSolicitud}/resolver`,{method:'POST',body:{decision:'APROBADA',respuesta:'QA: comprobación de conflicto de horario, no autorización real.',version:overlap.version}});
    record('Bloquea aprobar dos solicitudes para misma área y horario',[400,409].includes(conflict.status),{status:conflict.status,estado:conflict.data.estado});
    if(conflict.status===200) await remember('solicitudSolapada',conflict.data);
    let draft=await user.check('Crear borrador para límites de archivos',`/solicitudes/tramites/${own.tramiteGeneral.codigo}/borradores`,{method:'POST',body:applicant},[201]);await remember('borradorArchivos',draft);
    const truncated=new FormData();truncated.append('archivo',new Blob(['%PDF-'],{type:'application/pdf'}),'qa-truncado.pdf');
    const badPdf=await user.request(`/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:truncated});
    record('Rechaza PDF truncado de solo cinco bytes',badPdf.status===400,{status:badPdf.status});
    if(badPdf.status===201) await user.check('Retirar PDF truncado de QA',`/solicitudes/${draft.idSolicitud}/documentos/${badPdf.data.idDocumentoSolicitud}`,{method:'DELETE'},[200,204]);
    for(let i=0;i<5;i++) await user.check(`Adjuntar documento ${i+1} de cinco`, `/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
    await user.check('Sexto documento rechazado',`/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[400]);
    await user.check('Borrar únicamente borrador de QA',`/solicitudes/${draft.idSolicitud}`,{method:'DELETE'},[200,204]);
    await user.check('Borrador borrado no reaparece',`/solicitudes/${draft.idSolicitud}`,{},[404]);
    const notes=await user.check('Leer notificaciones','/notificaciones');
    if(notes.contenido?.length){await user.check('Marcar notificación propia como leída',`/notificaciones/${notes.contenido[0].idNotificacion}/leida`,{method:'PUT'},[200,204]);await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);await op.check('No marca notificación ajena',`/notificaciones/${notes.contenido[0].idNotificacion}/leida`,{method:'PUT'},[404]);}
    const nodes=[];
    for(let i=0;i<2;i++){const n=await admin.check(`Crear nodo de mapa ${i+1}`,'/administracion/mapa/nodos',{method:'POST',body:{tipoNodo:'INTERSECCION',nombre:prefix+` nodo ${i+1}`,latitud:14.626+i*0.0001,longitud:-90.559,coordenadasConfirmadas:false,accesible:true}},[201]);nodes.push(n);own.nodos=nodes;await save();}
    const conn=await admin.check('Crear conexión del mapa','/administracion/mapa/conexiones',{method:'POST',body:{idNodoOrigen:nodes[0].idNodoMapa,idNodoDestino:nodes[1].idNodoMapa,distanciaMetros:15,bidireccional:true,accesible:true,cerrada:false}},[201]);await remember('conexion',conn);
    await admin.check('No conectar nodo consigo mismo','/administracion/mapa/conexiones',{method:'POST',body:{idNodoOrigen:nodes[0].idNodoMapa,idNodoDestino:nodes[0].idNodoMapa,distanciaMetros:15,bidireccional:true,accesible:true,cerrada:false}},[400]);
    await user.check('Calificación fuera de rango rechazada',`/solicitudes/tramites/${own.tramiteGeneral.codigo}/resena`,{method:'PUT',body:{estrellas:6,comentario:'QA'}},[400]);
    await user.check('Guardar reseña válida',`/solicitudes/tramites/${own.tramiteGeneral.codigo}/resena`,{method:'PUT',body:{estrellas:5,comentario:'QA integral; no es una reseña real.'}},[200,201]);
  }
  if(mode==='cobertura-final') {
    await requireUser();
    const op=new Client(); await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);
    const baseline=await admin.check('Leer contenido institucional antes de verificar guardado','/administracion/institucional');
    await remember('institucionalOriginal',baseline);
    await admin.check('Institucional rechaza resumen vacío','/administracion/institucional',{method:'PUT',body:{...baseline,resumen:''}},[400]);
    await user.check('Ciudadano no modifica contenido institucional','/administracion/institucional',{method:'PUT',body:baseline},[403]);
    const saved=await admin.check('Guardar institucional conservando textos originales','/administracion/institucional',{method:'PUT',body:baseline});
    await anon.check('Contenido institucional público conserva originales','/publico/institucional',{},[200],d=>['resumen','mision','vision','valores'].every(k=>d[k]===baseline[k]));
    await admin.check('Institucional detecta versión obsoleta','/administracion/institucional',{method:'PUT',body:{...baseline,version:saved.version-1}},[409]);
    const appearance=await anon.check('Leer configuración real de portada','/publico/apariencia');await remember('aparienciaOriginal',appearance);
    const configForm=(change,file=null)=>{const f=new FormData();f.append('configuracion',new Blob([JSON.stringify(change)],{type:'application/json'}));if(file)f.append('imagen',file,'qa-invalida.png');return f;};
    const change={colorPrincipal:appearance.colorPrincipal,version:appearance.version,quitarPortada:false};
    await user.check('Ciudadano no cambia portada','/administracion/apariencia',{method:'PUT',body:configForm(change)},[403]);
    await admin.check('Color inválido se rechaza','/administracion/apariencia',{method:'PUT',body:configForm({...change,colorPrincipal:'red;background:url(test)'})},[400]);
    await admin.check('Portada rechaza imagen inferior a resolución mínima','/administracion/apariencia',{method:'PUT',body:configForm(change,new Blob([imagen],{type:'image/png'}))},[400]);
    await anon.check('Rechazo de portada conserva configuración','/publico/apariencia',{},[200],d=>JSON.stringify(d)===JSON.stringify(appearance));
    await admin.check('Guardar color actual sin tocar imagen existente','/administracion/apariencia',{method:'PUT',body:configForm(change)});
    await anon.check('Color e imagen originales se conservan','/publico/apariencia',{},[200],d=>d.colorPrincipal===appearance.colorPrincipal && Boolean(d.portadaUrl)===Boolean(appearance.portadaUrl));
    await admin.check('Portada detecta edición obsoleta','/administracion/apariencia',{method:'PUT',body:configForm(change)},[409]);
    for(const p of ['/administracion/mapa/nodos','/administracion/mapa/conexiones','/administracion/categorias-areas','/administracion/bicicletas']) await user.check(`Permisos de ciudadano ${p}`,p,{},[403]);
    await admin.check('Nodo fuera del rango de latitud rechazado','/administracion/mapa/nodos',{method:'POST',body:{tipoNodo:'INTERSECCION',nombre:prefix+' inválido',latitud:95,longitud:-90.559,coordenadasConfirmadas:false,accesible:true}},[400]);
    const area=(await admin.request(`/administracion/areas/${own.area.idArea}`)).data;
    await admin.check('Área rechaza perímetro incompleto',`/administracion/areas/${area.idArea}`,{method:'PUT',body:{...state.areaData,version:area.version,perimetro:[{latitud:14.626,longitud:-90.559}]}},[400]);
    await admin.check('Nombre de área excedido se rechaza',`/administracion/areas/${area.idArea}`,{method:'PUT',body:{...state.areaData,version:area.version,nombre:'A'.repeat(151)}},[400]);
    await user.check('Enlace verificación inexistente se rechaza','/autenticacion/confirmar-correo',{method:'POST',body:{token:'QA-inexistente-no-activa-cuenta'}},[400]);
    await anon.check('Login inválido devuelve error sin detalle técnico','/autenticacion/iniciar-sesion',{method:'POST',body:{correo:'qa.operador.20260930@example.invalid',contrasena:'NoEsLaClave-2026!',mantenerSesionActiva:false}},[401],d=>!JSON.stringify(d).includes('java.lang'));
    await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);
    const eventId=own.evento.idEvento;
    let ev=(await admin.request(`/administracion/eventos/${eventId}`)).data;
    if(!ev.titulo.startsWith(prefix))throw new Error('El evento no pertenece a QA.');
    await user.check('Liberar cupo propio antes de prueba simultánea',`/eventos/${eventId}/inscripciones/cancelar`,{method:'POST',body:{motivo:'QA de concurrencia'}},[200]);
    ev=(await admin.request(`/administracion/eventos/${eventId}`)).data;
    await admin.check('Configurar un único cupo en evento de QA',`/administracion/eventos/${eventId}`,{method:'PUT',body:{...state.eventData,capacidadTotal:1,version:ev.version}});
    const competitors=[user,op];
    const attempts=await Promise.all(competitors.map(c=>c.request(`/eventos/${eventId}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}})));
    record('Concurrencia: solo una cuenta gana el último cupo',attempts.filter(r=>[200,201].includes(r.status)).length===1&&attempts.filter(r=>r.status===400&&r.data.detail==='No hay cupos disponibles para este evento.').length===1,{estados:attempts.map(r=>r.status),rechazos:attempts.filter(r=>r.status>=400).map(r=>r.data.detail)});
    await admin.check('Contador del evento no excede capacidad',`/administracion/eventos/${eventId}`,{},[200],d=>d.cantidadOcupada===1&&d.capacidadTotal===1);
    for(let i=0;i<attempts.length;i++)if([200,201].includes(attempts[i].status)) await competitors[i].check('Liberar inscripción de carrera controlada',`/eventos/${eventId}/inscripciones/cancelar`,{method:'POST',body:{motivo:'Fin de QA de concurrencia'}},[200]);
    ev=(await admin.request(`/administracion/eventos/${eventId}`)).data;
    await admin.check('Restaurar capacidad del evento QA',`/administracion/eventos/${eventId}`,{method:'PUT',body:{...state.eventData,version:ev.version}});
    await user.check('Restaurar inscripción QA para comprobar reporte visual',`/eventos/${eventId}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}},[200,201]);
    const applicant={nombreCompleto:'QA Integral Preproduccion',dpi:'9000000930001',telefono:'55550001',correo:'nelson2031997p@gmail.com',representanteLegal:false,institucion:null};
    const draft=await user.check('Crear borrador de límites independiente',`/solicitudes/tramites/${own.tramiteGeneral.codigo}/borradores`,{method:'POST',body:applicant},[201]);
    if(!draft.idSolicitud)throw new Error('No se creó borrador de QA.');await remember('borradorLimitesFinal',draft);
    try {
      for(let i=0;i<5;i++)await user.check(`PDF válido ${i+1}/5`, `/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
      await user.check('El sexto PDF no se admite',`/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[400]);
      const docs=(await user.request(`/solicitudes/${draft.idSolicitud}`)).data.documentos;
      record('La base expone exactamente cinco documentos',docs.length===5,{cantidad:docs.length});
      await user.check('Eliminar un documento propio libera espacio',`/solicitudes/${draft.idSolicitud}/documentos/${docs[0].idSolicitudDocumento}`,{method:'DELETE'},[200,204]);
      await user.check('Adjuntar reemplazo después de quitar uno',`/solicitudes/${draft.idSolicitud}/documentos`,{method:'POST',body:pdfForm()},[201]);
    } finally {
      await user.check('Eliminar solo borrador temporal de límites',`/solicitudes/${draft.idSolicitud}`,{method:'DELETE'},[200,204]);
    }
    const notes=await user.request('/notificaciones');
    console.log('ESTRUCTURA_NOTIFICACIONES',JSON.stringify(notes.data));
    const list=Array.isArray(notes.data)?notes.data:(notes.data.notificaciones||notes.data.contenido||[]);
    if(list.length){const id=list[0].idNotificacion;await user.check('Marcar notificación propia leída',`/notificaciones/${id}/leida`,{method:'PUT'},[200,204]);await op.check('Otra cuenta no puede marcar esa notificación',`/notificaciones/${id}/leida`,{method:'PUT'},[404]);}
    const health=await fetch('http://127.0.0.1:8080/actuator/health').then(r=>r.json());record('Salud de API, base y SMTP',health.status==='UP',{estado:health.status});
    const headers=(await anon.request('/publico/eventos')).headers;record('API impide interpretación de tipo inesperado',headers['x-content-type-options']==='nosniff',{valor:headers['x-content-type-options']});
  }
  if(mode==='confirmaciones') {
    await requireUser();
    const op=new Client();await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);
    const users=(await admin.request('/administracion/usuarios?busqueda=qa.operador.20260930')).data;
    const employee=(Array.isArray(users)?users:users.contenido).find(u=>u.correo==='qa.operador.20260930@example.invalid');
    if(!employee)throw new Error('Empleado de QA no encontrado.');
    await admin.check('Rol base obligatorio con versión actual',`/administracion/usuarios/${employee.idUsuario}/roles`,{method:'PUT',body:{versionUsuario:employee.version,codigosRoles:[own.rol.codigo]}},[400]);
    const updated=await admin.check('Retirar permisos de empleado QA con versión actual',`/administracion/usuarios/${employee.idUsuario}/roles`,{method:'PUT',body:{versionUsuario:employee.version,codigosRoles:['USUARIOREGISTRADO']}},[200]);await remember('empleado',updated);
    await op.check('Cambio de permisos invalida sesión anterior','/administracion/eventos',{},[401,403]);
    await op.login('qa.operador.20260930@example.invalid',process.env.QA_USER_PASSWORD);
    await op.check('Cuenta sin permiso de eventos ya no puede consultarlos','/administracion/eventos',{},[403]);
    const req=(await user.request(`/solicitudes/${own.solicitudes[0].idSolicitud}`)).data;
    const file=req.documentos[0].urlDescarga.replace('/api/v1','');
    await user.check('Descarga propia del PDF correcto',file);
    await op.check('Documento ajeno protegido contra IDOR',file,{},[404]);
    await anon.check('Documento no accesible anónimamente',file,{},[401]);
    const reservations=await admin.check('Calendario consultado con rango explícito',`/administracion/areas/${own.area.idArea}/reservas?desde=2026-11-19T00:00:00Z&hasta=2026-11-22T00:00:00Z`);
    record('Calendario incorpora la solicitud aprobada',JSON.stringify(reservations).includes('2026-11-20'),{reservasEncontradas:reservations.length});
    await user.check('Versión antigua de solicitud rechazada',`/solicitudes/${own.solicitudes[0].idSolicitud}/enviar`,{method:'POST',body:{version:0}},[409]);
    let evento=(await admin.request(`/administracion/eventos/${own.evento.idEvento}`)).data;
    await user.check('Cancelar inscripción propia',`/eventos/${evento.idEvento}/inscripciones/cancelar`,{method:'POST',body:{motivo:'QA: comprobación de cancelación'}},[200]);
    const freed=(await admin.request(`/administracion/eventos/${evento.idEvento}`)).data;
    record('Cancelación libera cupo real',freed.cantidadOcupada===0,{ocupados:freed.cantidadOcupada});
    await user.check('Usuario puede reinscribirse después de cancelar',`/eventos/${evento.idEvento}/inscripciones`,{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{aceptaRequisitos:true,codigoGrupo:'adultos',respuestas:{}}},[200,201]);
    evento=(await admin.request(`/administracion/eventos/${evento.idEvento}`)).data;
    record('Reinscripción no duplica contador',evento.cantidadOcupada===1,{ocupados:evento.cantidadOcupada});
    await user.check('Token de recuperación inválido se rechaza','/autenticacion/restablecer-contrasena',{method:'POST',body:{token:'token-invalido-de-qa',contrasenaNueva:'NoSeAplicara-2026!Aa',confirmarContrasena:'NoSeAplicara-2026!Aa'}},[400]);
    await user.check('Cerrar sesión','/autenticacion/cerrar-sesion',{method:'POST'},[200,204]);
    await user.check('Sesión cerrada no consulta perfil','/autenticacion/perfil',{},[401]);
  }
  if(mode==='limpieza') {
    await requireUser();
    const evento=(await admin.request(`/administracion/eventos/${own.evento.idEvento}`)).data;
    const inscripciones=(await user.request('/eventos/inscripciones/mias')).data;
    const listaInscripciones=Array.isArray(inscripciones)?inscripciones:(inscripciones.contenido||[]);
    const inscripcionActiva=listaInscripciones.find(i=>i.idEvento===evento.idEvento&&i.estado==='CONFIRMADA');
    if(inscripcionActiva) await user.check('Cancelar inscripción QA antes de retirar el evento',`/eventos/${evento.idEvento}/inscripciones/cancelar`,{method:'POST',body:{motivo:'Cierre controlado de QA integral'}},[200]);
    const eventoActual=(await admin.request(`/administracion/eventos/${evento.idEvento}`)).data;
    if(eventoActual.estado!=='CANCELADO') await admin.check('Cancelar evento temporal de QA',`/administracion/eventos/${evento.idEvento}/cancelar`,{method:'POST',body:{version:eventoActual.version}},[200]);

    const publicacion=(await admin.request(`/administracion/publicaciones/${own.publicacion.idPublicacion}`)).data;
    if(publicacion.estado!=='ARCHIVADA') await admin.check('Archivar noticia temporal de QA',`/administracion/publicaciones/${publicacion.idPublicacion}/archivar`,{method:'POST',body:{version:publicacion.version}},[200]);
    const categoriasPublicacion=(await admin.request('/administracion/categorias-publicaciones')).data;
    for(const categoria of categoriasPublicacion.filter(c=>c.nombre===prefix)) {
      if(categoria.idCategoriaPublicacion===own.categoriaPublicacion.idCategoriaPublicacion) {
        if(categoria.activa) await admin.check('Desactivar categoría usada por noticia QA',`/administracion/categorias-publicaciones/${categoria.idCategoriaPublicacion}`,{method:'PUT',body:{nombre:categoria.nombre,descripcion:categoria.descripcion,ordenVisualizacion:categoria.ordenVisualizacion,activa:false,version:categoria.version}},[200]);
      } else {
        await admin.check('Eliminar categoría duplicada creada por QA',`/administracion/categorias-publicaciones/${categoria.idCategoriaPublicacion}`,{method:'DELETE',body:{version:categoria.version}},[200,204]);
      }
    }

    const reservas=(await admin.request(`/administracion/areas/${own.area.idArea}/reservas?desde=2026-11-20T00:00:00Z&hasta=2026-11-22T23:59:59Z`)).data;
    const reserva=reservas.find(r=>r.idReservaArea===own.reserva.idReservaArea);
    if(reserva&&reserva.estado!=='CANCELADA') await admin.check('Cancelar reserva administrativa temporal',`/administracion/areas/${own.area.idArea}/reservas/${reserva.idReservaArea}`,{method:'PUT',body:{titulo:reserva.titulo,iniciaEn:reserva.iniciaEn,finalizaEn:reserva.finalizaEn,estado:'CANCELADA',observaciones:reserva.observaciones,version:reserva.version}},[200]);
    const area=(await admin.request(`/administracion/areas/${own.area.idArea}`)).data;
    if(area.estado!=='CERRADA') await admin.check('Cerrar área temporal de QA',`/administracion/areas/${area.idArea}`,{method:'PUT',body:{idCategoriaArea:area.idCategoriaArea,numeroVisibleMapa:area.numeroVisibleMapa,nombre:area.nombre,descripcion:area.descripcion,estado:'CERRADA',perimetro:area.perimetro||[],horarioJson:area.horarioJson,observacionesInternas:area.observacionesInternas,motivoCambioEstado:'Cierre controlado de QA integral',version:area.version}},[200]);
    const categoriasArea=(await admin.request('/administracion/categorias-areas')).data;
    const categoriaArea=categoriasArea.find(c=>c.idCategoriaArea===own.categoriaArea.idCategoriaArea);
    if(categoriaArea?.activa) await admin.check('Desactivar categoría de área temporal',`/administracion/categorias-areas/${categoriaArea.idCategoriaArea}`,{method:'PUT',body:{nombre:categoriaArea.nombre,descripcion:categoriaArea.descripcion,activa:false,version:categoriaArea.version}},[200]);

    const catalogo=(await admin.request('/administracion/solicitudes/catalogo')).data;
    const tramites=Array.isArray(catalogo)?catalogo:(catalogo.tramites||catalogo.contenido||[]);
    for(const idTramite of [own.tramiteReserva.idTramite,own.tramiteGeneral.idTramite]) {
      const tramite=tramites.find(t=>t.idTramite===idTramite);
      if(tramite?.activo) await admin.check(`Desactivar trámite temporal ${idTramite}`,`/administracion/solicitudes/catalogo/${idTramite}`,{method:'PUT',body:{idCategoria:tramite.idCategoria,nombre:tramite.nombre,resumen:tramite.resumen,acerca:tramite.acerca,requisitos:tramite.requisitos||[],documentosRequeridos:tramite.documentosRequeridos||[],costo:tramite.costo,tiempoRespuesta:tramite.tiempoRespuesta,requiereReserva:tramite.requiereReserva,activo:false,version:tramite.version}},[200]);
    }
    if(own.conexion?.idConexionMapa) await admin.check('Eliminar conexión temporal del mapa',`/administracion/mapa/conexiones/${own.conexion.idConexionMapa}`,{method:'DELETE'},[200,204,404]);
    for(const nodo of [...(own.nodos||[])].reverse()) await admin.check(`Eliminar nodo temporal ${nodo.idNodoMapa}`,`/administracion/mapa/nodos/${nodo.idNodoMapa}`,{method:'DELETE'},[200,204,404]);

    await anon.check('Noticia QA ya no es pública',`/publico/publicaciones/${own.publicacion.identificadorUrl}`,{},[404]);
    const eventosPublicos=await anon.check('Consultar listado público tras cancelar evento','/publico/eventos');
    record('Evento QA ya no figura en el listado público',!JSON.stringify(eventosPublicos).includes(own.evento.identificadorUrl),{});
    await anon.check('Detalle público conserva aviso del evento cancelado',`/publico/eventos/${own.evento.identificadorUrl}`,{},[200],d=>d.estado==='CANCELADO');
    const areasPublicas=await anon.check('Área QA ya no figura disponible','/publico/areas');
    record('Área QA retirada de la exposición pública',!JSON.stringify(areasPublicas).includes(prefix),{});
  }
} catch(error) { record(`Escenario ${mode} interrumpido`,false,{error:error.message}); process.exitCode=1; }
finally { await save(); await writeFile(`${dir}resultados-${mode}-${Date.now()}.json`,JSON.stringify({fecha:new Date().toISOString(),mode,results},null,2)); console.log(`RESUMEN ${results.filter(r=>r.ok).length}/${results.length}`); }
