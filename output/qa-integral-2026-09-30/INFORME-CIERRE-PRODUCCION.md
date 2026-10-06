# Informe de cierre para producción

Fecha de cierre técnico: 1 de octubre de 2026.

## Veredicto

El código queda como candidato listo para desplegar a producción: las incidencias reproducibles encontradas durante la QA fueron corregidas y las regresiones automatizadas, SQL y HTTP terminaron satisfactoriamente.

Esto no equivale a certificar un ambiente público que todavía no fue proporcionado. El go-live debe condicionarse a configurar y comprobar en el servidor final el dominio HTTPS, los secretos, SQL Server, el correo transaccional, los respaldos y el monitoreo descritos en el README.

## Correcciones verificadas

- La aprobación de una solicitud de uso de instalaciones crea su reserva de calendario en la misma operación y rechaza traslapes concurrentes.
- Los eventos cancelados dejaron de exponerse en el portal y en sus imágenes públicas.
- Las categorías de publicación duplicadas, incluso con diferencias de mayúsculas, se rechazan.
- Los documentos PDF, PNG y JPEG se analizan realmente; ya no basta con falsificar la firma inicial del archivo.
- La exportación CSV incluye todas las páginas y neutraliza fórmulas de hoja de cálculo.
- Los enlaces enviados por correo solo usan la URL pública configurada; no aceptan dominios de túneles aportados por una solicitud.
- Los mensajes comunes de validación se presentan en español.
- Se corrigió la cabecera móvil para mantener accesible el indicador de notificaciones.
- El módulo de usuarios permite eliminar cuentas mediante anonimización irreversible, invalida sus sesiones y conserva únicamente los registros históricos necesarios para inscripciones, solicitudes y auditoría.
- La eliminación impide borrar la propia sesión administrativa y nunca permite eliminar al último administrador activo. Con dos o más administradores sí permite eliminar cualquiera de los otros, siempre que permanezca al menos uno.
- El mapa público muestra áreas en uso, en mantenimiento y fuera de servicio; se validó con los campos del Parque Erick Barrondo en `14.63917860, -90.54108240`.
- Los avisos del mapa muestran nombre, estado, motivo y número identificador sin recortes. Solo el enlace “Ver ubicación en el mapa” acerca el mapa y resalta el perímetro afectado; el marcador no altera la posición del mapa ni abre globos superpuestos. Se verificó visualmente en escritorio y móvil.
- Se actualizaron Spring Boot, Tomcat, Jackson, PDFBox, MapLibre y Vitest a versiones sin los hallazgos detectados.

## Evidencia final

| Comprobación | Resultado |
| --- | --- |
| Backend Maven | 148 pruebas, 0 fallos, 0 errores, 1 omitida por perfil |
| Frontend Vitest | 30 archivos, 119 pruebas aprobadas |
| ESLint | Aprobado |
| Compilación frontend | Aprobada |
| Empaquetado backend | Aprobado |
| Auditoría npm | 0 vulnerabilidades |
| Consulta OSV de dependencias Maven | 127 dependencias consultadas, 0 hallazgos |
| Integración de identidad con SQL Server temporal | Aprobada con registro, verificación, recuperación y eliminación |
| Regresión HTTP con SQL Server temporal | Aprobada en todos los módulos; datos de prueba eliminados |
| Salud del backend | `UP` |
| Frontend local | HTTP 200 |
| Versión del arranque final | Spring Boot 4.1.1 / Tomcat 11.0.26 |
| Rendimiento HTTP de aceptación | 40 solicitudes, concurrencia 4, 0 fallos, p95 11.82 ms |
| Migraciones Flyway | 27 aplicadas en una base nueva |
| Paquete de entrega | Regenerado después de todas las correcciones y verificado contra su manifiesto SHA-256 |

La integración de identidad cubrió creación de cuenta, verificación, expiración y renovación, respuesta indistinguible para recuperación, token inválido y expirado, cambio correcto de contraseña, rechazo de la contraseña anterior, rechazo de reutilización y consumo concurrente único. También eliminó una segunda cuenta administrativa, comprobó su anonimización y confirmó que el último administrador no se puede eliminar. Los emisores controlados capturaron los tokens generados por la aplicación sin depender de que una persona abriera un buzón. Además, el envío SMTP real por Gmail quedó habilitado y ya había sido comprobado durante la QA.

La regresión HTTP creó categorías de publicaciones, áreas y trámites; creó y canceló una inscripción; cargó un PDF real como DPI simulado; comprobó la solicitud desde las vistas de usuario y administración; publicó contenido con imagen; creó un área con imagen y perímetro; verificó sus estados de mantenimiento y fuera de servicio en el mapa, incluido el trazo visible de la cancha, el acercamiento únicamente desde “Ver ubicación en el mapa”, la ausencia de globos superpuestos y la navegación manual posterior sin reencuadre automático; creó un segundo administrador y lo eliminó; y finalmente eliminó una cuenta con inscripciones y solicitudes, confirmando que ya no inicia sesión pero que su historial administrativo permanece disponible. También confirmó que un evento cancelado responde 404, una categoría duplicada responde 409, un PDF falso responde 400, una aprobación crea la reserva y un segundo trámite en el mismo horario responde 409.

Actualización del 2 de octubre de 2026: los avisos se reducen con la cancha al alejar el mapa y tienen un tamaño máximo compacto al acercarse. Se corrigió también la carga del worker de MapLibre y su precompilación en Vite: los modos Mapa y Satélite se comprobaron visualmente en desarrollo y en la compilación de producción. La verificación específica posterior aprobó 4 pruebas de mapa/editor, 10 de seguridad, ESLint y compilación. El detalle y las capturas están en `AJUSTES-MAPA-2026-10-02.md`.

El paquete reproducible actualizado quedó en `output/entregas-produccion/ParqueErickBarrondo-20261002-145924`. Incluye el JAR, el frontend compilado con su worker de mapas, la plantilla de configuración, el inicializador SQL y `MANIFIESTO-SHA256.txt`.

## Condiciones obligatorias antes de abrir al público

1. Ejecutar con `SPRING_PROFILES_ACTIVE=produccion`.
2. Instalar un dominio y certificado HTTPS definitivos y asignarlo a `URLPUBLICAFRONTEND`.
3. Cargar credenciales mediante variables seguras, nunca desde archivos versionados.
4. Usar correo transaccional del ambiente final y validar SPF, DKIM y DMARC.
5. Configurar copias de seguridad de SQL Server y de `PARQUEDATOS`, y demostrar una restauración.
6. Activar monitoreo, registros centralizados y alertas.
7. Repetir en el ambiente final el recorrido registro-verificación-recuperación-inicio de sesión.

## Riesgo residual no bloqueante del código

El paquete JavaScript generado es grande (aproximadamente 1.62 MB, 440 KB comprimido). Es una oportunidad de optimización por división de código, pero no impidió la compilación ni las pruebas funcionales.

La visualización automática de imágenes dentro de un correo no puede garantizarse si el proveedor coloca el mensaje en spam o bloquea contenido remoto. Para producción, la reputación y autenticación del dominio remitente forman parte de la infraestructura de correo, no del código de la aplicación.
