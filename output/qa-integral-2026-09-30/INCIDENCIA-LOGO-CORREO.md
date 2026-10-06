# Incidencia: logotipo en correo de verificación

Estado: pendiente de verificar en el mensaje recibido en Gmail. No resuelto visualmente.

## Evidencias

- El usuario confirmó que el correo de verificación llegó y activó la cuenta.
- En la primera comprobación de logotipo, el script de diagnóstico modificó partes MIME antes de finalizar sus cabeceras. El resultado mostró HTML como texto y un adjunto incorrecto. Fue un fallo del script de diagnóstico, no una reproducción demostrada del envío normal de la aplicación.
- `comprobacion-logo-enviado.eml` conserva esa copia defectuosa. El nuevo validador la rechaza con `Texto plano duplicado` (salida 1 esperada).
- `comprobacion-logo-cid-enviado.eml` conserva la segunda copia, con HTML y texto plano separados. Su PNG inline tiene 180233 bytes y 447 × 447 píxeles. El contenido decodificado coincide byte por byte con el recurso del sistema, y el Content-ID coincide con la referencia del HTML. La validación local termina con salida 0.
- La captura más reciente del usuario muestra que la segunda copia renderiza el diseño HTML, pero sigue mostrando un escudo roto. El mensaje está en Spam. Esto no prueba por sí solo si Gmail bloquea la imagen o si la copia recibida difiere de la enviada.

## Verificaciones realizadas en esta continuación

- Se reforzó `DiagnosticoLogoCorreo.java`: validación después de serializar y volver a interpretar el mensaje, comprobación de PNG decodificable e idéntico al recurso, disposición inline, CID coincidente y separación de HTML/texto plano. El envío se detiene si falla una comprobación.
- Se separó el texto plano del diagnóstico de cualquier instrucción de activación. No se generan nuevos tokens ni se cambia la cuenta.
- Se añadió una prueba de regresión al generador real de correo, comprobando MIME serializado, imagen intacta y escape del nombre del destinatario.
- `mvnw.cmd -q -Dtest=EnviadorCorreoVerificacionSmtpPruebas test`: 3 pruebas, 0 fallos, 0 errores. Es una prueba local que no envía correos ni demuestra renderización en Gmail.
- No se envió otra copia en esta continuación: la segunda ya mostraba el HTML correctamente, por lo que primero se solicitó comprobarla fuera de Spam.
- No se modificó el código de envío normal ni se reinició la aplicación en esta continuación. Los cambios son pruebas y diagnóstico.

## Siguiente comprobación

El usuario debe abrir únicamente este correo del sistema desde Recibidos tras marcarlo «No es spam», y habilitar imágenes para ese mensaje si Gmail lo solicita. Si el escudo sigue roto, se necesita el `.eml` descargado desde «Mostrar original → Descargar original» del mensaje más reciente. No se requiere acceso al resto del buzón ni cambiar globalmente sus controles de seguridad.

Google documenta que los mensajes o remitentes considerados sospechosos pueden no mostrar imágenes automáticamente: https://support.google.com/mail/answer/145919?co=GENIE.Platform%3DDesktop&hl=en_sg

La validación local del MIME no debe presentarse como confirmación de que el destinatario ve el logotipo. La revisión general de producción tampoco está terminada.
