# Informe de QA integral

Fecha de cierre técnico: 1 de octubre de 2026 (America/Guatemala)

## Dictamen

El sistema fue recorrido contra la instalación local real (Vite en `127.0.0.1:5173`, API Java en `127.0.0.1:8080`, SQL Server `RevisionParqueLocal` y Gmail SMTP). Se probaron rutas públicas, cuenta ciudadana verificada, administrador, permisos, solicitudes, documentos, reservas, eventos, notificaciones, auditoría y correo. Las llamadas E2E no usaron mocks.

**No está listo para producción.** Hay fallos funcionales y de seguridad pendientes, y la ejecución sigue siendo local por HTTP, con Vite, perfil `default` y Swagger disponible. No existe en esta revisión un dominio HTTPS ni una configuración de despliegue productivo que pueda validarse.

## Cobertura ejecutada

| Área | Resultado y evidencia |
|---|---|
| Salud e infraestructura | `/api/v1/sistema/estado` disponible; `/actuator/health` `UP`; SQL Server y SMTP reales. Respaldo `RevisionParqueLocal-preQA-20260930-2050.bak` comprobado previamente con `RESTORE VERIFYONLY ... CHECKSUM`; copia de 30 archivos de datos conservada. `DBCC CHECKDB ... PHYSICAL_ONLY` finalizó sin errores. |
| Rutas públicas | Inicio, Nosotros, Áreas y servicios, Noticias/listado/detalle, Eventos/listado/detalle, Mapa, registro, inicio de sesión, recuperación, verificación, 403, 404, 500 y redirección de Bicicletas. Barrido visual a 320 y 1280 px; sin desbordamiento horizontal en estas rutas. |
| Usuario | Perfil, actualización/validaciones, foto válida e inválida, contraseña (validaciones previas), Mis inscripciones, inscripción por edad, cupos y concurrencia, cancelación/reinscripción, Mis solicitudes, catálogo, trámite con/sin reserva, queja, cinco documentos, sexto rechazado, reemplazo, descargas propias e IDOR. |
| Administrador | Nueve módulos visibles: página principal, usuarios/roles, noticias, eventos, áreas/mapa, institucional, solicitudes/trámites, reportes de inscripciones y auditoría. Barrido a 375 y 1280 px. Bicicletas está deliberadamente oculto por `MODULO_BICICLETAS_VISIBLE=false`; la ruta redirige y no se habilitó artificialmente. |
| Permisos | Ciudadano y anónimo rechazados en endpoints administrativos; empleado limitado solo pudo leer eventos; creación y asignación de roles no autorizadas fueron rechazadas; retirar permisos invalidó la sesión antigua; rol base obligatorio protegido. |
| Solicitudes y archivos | Dos solicitudes normales, una sin horario, una queja y una superpuesta; estados y documentos persistieron. PDF falso por MIME rechazado, pero un archivo de cinco bytes con solo `%PDF-` fue aceptado: fallo confirmado. |
| Reservas/eventos | Límite de cupo concurrente: un `201` y un `400` con mensaje de cupos agotados; contador quedó en 1. Una solicitud aprobada no creó reserva ni bloqueó horario: fallo confirmado. |
| Correo | Verificación y resoluciones enviadas únicamente a `nelson2031997p@gmail.com`. MIME serializado validó `multipart/related`, HTML/texto separados, CID coincidente y PNG idéntico de 180233 bytes (447×447). Gmail mostró el mensaje en Spam y el usuario observó el logotipo roto: incidencia abierta, sin atribuir causa definitiva al filtro. |
| Recuperación | Correo real enviado el 1/10/2026 a las 08:34:42; token presente, no consumido al momento de este informe y con vencimiento a las 09:34:42. El usuario debe escribir y guardar la contraseña nueva. Hasta entonces no se puede certificar consumo, reuso rechazado ni invalidación de sesiones por cambio de contraseña. |
| Pruebas automáticas | Frontend: 30 archivos y 117 pruebas aprobadas. Backend: 139 pruebas, 0 errores, 0 fallos y 1 omitida. La integración SQL separada con SMTP/base temporales permanece omitida; no se presenta como ejecutada. Compilación frontend aprobada con bundle JS de ~1.527 MB (~405 KB gzip). |
| Consola/navegador | No se registraron errores ni advertencias de consola durante el barrido final. |

## Fallos confirmados y prioridad

### P1 — aprobación solapada no reserva ni bloquea calendario

Las solicitudes QA `#1` y `#5` de la misma área y exactamente el mismo horario (20/11/2026, 09:00–10:00) quedaron `APROBADA`. Ninguna creó una fila en `ReservasArea`; el calendario solo contenía la reserva administrativa del 21/11. `ServicioAdministracionSolicitudes.resolver` cambia estado y envía notificación/correo, pero no integra la aprobación con reservas ni valida colisiones. La regla de negocio y la corrección deben acordarse antes de implementarse.

### P1 — dependencias con avisos de seguridad

`npm audit` reporta 6 vulnerabilidades: 1 crítica, 3 altas y 2 moderadas. La crítica corresponde a `maplibre-gl` (bypass del sanitizador/XSS); también aparecen `brace-expansion`, `nanoid`, `undici`, `vitest` y `@vitest/mocker`. No se demostró explotación XSS en esta aplicación y el contenido probado se mostró como texto literal; el aviso no debe presentarse como exploit confirmado. No se aplicaron actualizaciones automáticas a ciegas.

### P1 — validación PDF insuficiente

Un archivo de cinco bytes con contenido `%PDF-` fue aceptado con HTTP 201. El validador comprueba firma inicial, pero no estructura PDF válida. El archivo y su borrador de QA se retiraron por API; el defecto permanece.

### P2 — recuperación aún requiere intervención humana

El correo fue enviado y SQL confirma un token vigente con hash de contraseña al emitir. Por seguridad, el usuario debe completar el guardado. Quedan pendientes consumo único, rechazo de reuso e invalidación de sesiones anteriores.

### P2 — correo en Spam y logotipo roto en Gmail

La estructura MIME generada pasa las pruebas offline, pero la copia real observada por el usuario mostró el logotipo roto. Hace falta marcar «No es spam»/permitir imágenes o aportar el `.eml` original recibido para separar filtrado remoto de un defecto de renderizado. Véase `INCIDENCIA-LOGO-CORREO.md`.

### P2 — evento cancelado sigue expuesto públicamente

El evento QA fue cancelado y su inscripción retirada, pero `/publico/eventos` y el detalle por URL siguen devolviéndolo con estado `CANCELADO`. No existe operación de borrado administrativo y no se alteró SQL. Debe decidirse si los eventos cancelados se muestran con aviso o deben excluirse del catálogo público.

### P2 — desbordamiento móvil en Mis solicitudes

A 375 px, el documento tiene 360 px útiles pero `Mis solicitudes` alcanza 400 px. La campana de notificaciones queda fuera del área interactuable visible en ese estado. El resto de rutas barridas no mostró overflow horizontal.

### P2 — categorías de noticias duplicadas

La API aceptó dos categorías con el mismo nombre `QA integral 20260930`; el selector las mostró duplicadas. La categoría duplicada de QA fue eliminada y la usada por la noticia archivada quedó inactiva. Se debe definir unicidad normalizada de nombre/código.

### P2 — exportación CSV

El CSV usa solo `cursos.contenido` o `personas.contenido`, es decir, la página actualmente cargada, aunque la pantalla informe un total mayor. Además, solo escapa comillas; no neutraliza valores que comiencen por `=`, `+`, `-` o `@`, por lo que existe riesgo de fórmula al abrir datos administrativos no confiables en Excel. Es una conclusión de revisión de código; no se introdujeron fórmulas maliciosas en datos reales.

### P2 — origen de enlaces de correo

`ResolvedorUrlPublicaCorreo` acepta cualquier host terminado en `.trycloudflare.com` proveniente de `Origin` o encabezados reenviados. En una configuración productiva con proxies no estrictos, esto puede permitir envenenar el host del enlace. Debe reemplazarse por una lista explícita de orígenes confiables y una política de encabezados del proxy.

### P3 — mensajes de validación heterogéneos

Algunas restricciones Bean Validation sin mensaje propio pueden devolver textos en inglés, por ejemplo `must not be blank`, mientras el resto de la interfaz está en español.

### P3 — alcance limitado de reportes

El módulo llamado Reportes cubre inscripciones a eventos/cursos. No hay reporte histórico equivalente de solicitudes, reservas, noticias, áreas o usuarios; esto es una brecha de alcance, no un fallo de esa pantalla.

## Diseño solicitado: Correo verificado

Se implementó una pantalla independiente con fondo blanco, sin fotografía provisional, tarjeta con líneas negras, logotipo, texto y acceso a iniciar sesión. El enlace de éxito es blanco con borde negro. No se cambió el diseño de registro ni de inicio de sesión.

Evidencia visual:

- `verificacion-blanca-escritorio.jpg` (1280 px)
- `verificacion-blanca-movil.jpg` (375 px)

La ruta sin token fue verificada en navegador real: fondo `rgb(255,255,255)`, `background-image: none`, borde negro y sin overflow. El estado de éxito está cubierto por la prueba de componente; no se simuló en el navegador una respuesta exitosa de backend.

## Limpieza y residuos QA

Se retiraron por API, sin SQL directo: inscripción QA cancelada, noticia archivada, categoría de noticia desactivada, categoría duplicada eliminada, área cerrada, categoría de área desactivada, dos trámites inactivos, reserva administrativa cancelada, conexión y dos nodos eliminados. El evento quedó `CANCELADO`. Los borradores de límites y el PDF truncado ya habían sido eliminados.

Se conservaron por trazabilidad: solicitudes `#1`–`#5`, documentos válidos asociados, auditoría, ciudadano QA, empleado QA sin permisos administrativos, roles y notificaciones. La categoría de trámite no admite estado activo/inactivo en su API; quedó sin trámites activos. El evento cancelado permanece visible públicamente por comportamiento actual. No se tocó Patinaje ni las tres noticias originales.

Estado final de datos QA relevante: 5 solicitudes (2 aprobadas, 2 enviadas, 1 rechazada), evento `CANCELADO`, reserva `CANCELADA`, 0 nodos y 0 conexiones. SQL Server contiene 26 migraciones.

## Por qué aparece un contador grande de cambios

El contador no representa 12 mil líneas nuevas de funcionalidad. Antes del último ajuste de evidencia, el inventario era: 49 archivos de aplicación/base de datos (~+938/−114), 3 archivos de pruebas (~+135/−2), 4 de configuración/documentación (~+30/−6) y 23 de salida/evidencias/herramientas (~10,111 líneas). La carpeta `output` incluye también informes previos del 15 de septiembre.

En el estado final visible hay 60 entradas de Git: 43 archivos rastreados modificados con +595/−124, más recursos no rastreados. Clasificando archivos rastreados y no rastreados: 50 de aplicación, 4 de pruebas, 4 de configuración y 30 de evidencia. Las ~12,300 líneas físicas bajo evidencia son resultados JSON, copias MIME, informes y herramientas de QA; no son 12,300 líneas de producto. No se borraron ni ignoraron en bloque artefactos anteriores.

## Bloqueos para producción

- Resolver colisiones y creación transaccional de reservas al aprobar solicitudes.
- Endurecer validación estructural de PDF.
- Resolver o mitigar las 6 vulnerabilidades de dependencias, con regresión posterior.
- Definir política de visibilidad de eventos cancelados.
- Corregir overflow móvil de Mis solicitudes/campana.
- Endurecer orígenes de enlaces de correo y validar en dominio HTTPS real.
- Diagnosticar entregabilidad/imagen embebida con el mensaje original recibido.
- Completar y comprobar recuperación de contraseña real.
- Ejecutar pruebas en infraestructura de preproducción equivalente a producción; la ejecución local con Vite/HTTP no sustituye esa validación.

## Evidencias principales

- `estado-qa.json`: inventario de recursos QA, sin contraseñas.
- `resultados-*.json`: resultados HTTP por escenario, incluido `cobertura-final` 46/46 y limpieza.
- `qa-real.mjs`: arnés real con cookies y CSRF, sin mocks.
- `comprobacion-logo-cid-enviado.eml`: MIME correcto validado offline.
- `comprobacion-logo-enviado.eml`: primera copia diagnóstica, fallo esperado por texto plano duplicado.
- `INCIDENCIA-LOGO-CORREO.md`: investigación del logotipo.
- `verificacion-blanca-escritorio.jpg` y `verificacion-blanca-movil.jpg`: nuevo diseño.

## No ejecutado o no afirmado

- Despliegue productivo, HTTPS, DNS, CDN, proxy y dominio final.
- Restauración global del backup (se evitó para preservar el estado actual).
- Impresión física; solo se revisó el flujo `window.print` y el código de exportación.
- Suite de integración SQL marcada como omitida.
- Reenvío de diagnósticos SMTP repetidos a otros destinatarios.
- Prueba final de token consumido/reutilizado hasta que el usuario complete el cambio de contraseña.

