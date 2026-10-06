# Activación para desarrollo y pruebas — 2 de octubre de 2026

Los cuatro componentes quedaron activos y comprobados a las 20:20 (Guatemala):

- Sistema local: http://127.0.0.1:5173 — interfaz HTTP 200, API DISPONIBLE.
- Gmail SMTP: conexión STARTTLS y autenticación aceptadas; salud del backend UP con SMTP habilitado. Esta comprobación no envió mensajes.
- Cloudflare: https://retail-effects-affecting-physical.trycloudflare.com — interfaz HTTP 200, API y mapa públicos disponibles.
- Protección contra suspensión: proceso 9372 activo, actualización periódica y solicitud aceptada por Windows.

## SQL Server

La instancia MSSQLSERVER tenía SQL Server 2025 Enterprise Evaluation 17.0.1000.7, vencida. Se cambió con el instalador firmado de Microsoft a Enterprise Developer para el uso de desarrollo/pruebas confirmado por el usuario. El resultado del instalador fue Passed, código 0. No se desinstaló la instancia ni se recreó la base.

Antes del cambio se copiaron los archivos de datos y registros con comprobación SHA-256. Respaldo final previo al cambio: `C:\Users\Nelson\AppData\Local\ParqueErickBarrondo\Respaldos\SQL-antes-Developer-20261002-200816`.

`RevisionParqueLocal` quedó ONLINE. `DBCC CHECKDB` terminó sin errores.

La comprobación inicial del motor vencido falló. Se utilizó la opción específica `SkipRules=Engine_SqlEngineHealthCheck` documentada por Microsoft para este fallo. No se modificó la fecha del equipo ni se reinició la evaluación.

Referencia: https://learn.microsoft.com/en-us/sql/database-engine/install-windows/upgrade-downgrade-sql-server-edition-setup?view=sql-server-ver17

## Arranque y verificaciones

El inicio local admite ahora `-UrlPublicaFrontend`. El inicio de publicación obtiene primero el enlace temporal y lo configura en el backend al arrancarlo, para que los correos utilicen el enlace vigente. No se amplió la confianza a dominios arbitrarios enviados por visitantes. Si el backend ya estaba activo, el script avisa si conserva otra URL de correo.

- Backend: 148 pruebas contabilizadas, 147 aprobadas y 1 de integración omitida; sin fallos ni errores.
- Frontend: 119 pruebas aprobadas en 30 archivos.
- ESLint y compilaciones frontend/backend correctos. Persiste el aviso informativo de tamaño del paquete JavaScript.
- Navegador: página `/mapa` local y cartografía satelital visibles, sin errores de consola; se dejó la pestaña abierta.
- Comprobación de API pública del mapa en los puertos locales 5173 y 4173 y mediante HTTPS de Cloudflare.

Los detalles y PID están en `servicios-verificados.json`; SMTP en `smtp-comprobacion.json`; instalación en `sql-developer-resultado.json`.

Esto confirma el arranque para desarrollo y pruebas, no certifica un despliegue de producción. Developer no está licenciada para producción; el túnel es temporal y depende de esta computadora y de su conexión.
