# Alyson-Aplicaci-n-Web
Proyecto de Graduación 2

## Página principal

En el panel administrativo, el módulo **Página principal** permite cambiar el color de Inicio y su imagen de portada. Tiene vista previa y un botón para guardar. Usa el permiso `INSTITUCIONALGESTIONAR`. Los demás módulos conservan sus colores.

## Trasladar la instalación y sus imágenes

Los archivos del frontend (CSS, JavaScript y las imágenes incluidas) se empaquetan con `npm run compilar`. No dependen de la ruta del equipo donde se desarrollaron.

Las imágenes cargadas por los usuarios y la portada son datos persistentes: se conservan fuera del ejecutable. La base guarda claves relativas, y el navegador las solicita mediante `/api/v1/...`, nunca mediante rutas `C:\Users\...`.

Al trasladar el sistema, respalda y copia **la base SQL Server y toda la carpeta de datos**, conservando sus subcarpetas. Configura la variable de entorno `PARQUEDATOS` con la nueva carpeta antes de arrancar el backend. Las variables `ALMACENAMIENTORUTA...`, si se definen, tienen prioridad. `.env.example` es una referencia: Java no carga automáticamente archivos `.env`.

El script local acepta `-DirectorioDatos 'D:\Parque\datos'` o la variable `PARQUEDATOS`. Sin ellas, busca `Datos Revision Parque` junto a la carpeta del repositorio; así conserva los datos actuales sin depender del nombre de usuario de Windows. La instalación debe tener permisos de lectura y escritura en esa carpeta.

En otro equipo también deben configurarse SQL Server, la dirección pública y SMTP. La credencial Gmail protegida con Windows DPAPI pertenece al usuario y equipo actuales: debe configurarse de nuevo en el destino. No basta con copiar únicamente el ejecutable.

## Salida a producción

Antes del arranque final se debe configurar `SPRING_PROFILES_ACTIVE=produccion` y reemplazar todos los valores de ejemplo de `.env.example` mediante variables de entorno o un gestor de secretos. El archivo `.env.example` es documentación y no debe contener credenciales reales.

La instalación de producción necesita:

- Un dominio HTTPS estable en `URLPUBLICAFRONTEND`; ese será el único origen usado para enlaces de verificación y recuperación de contraseña.
- SQL Server con certificado válido, `BDCONFIARCERTIFICADOSERVIDOR=false`, copias de seguridad automáticas y una restauración ensayada.
- Una cuenta de correo transaccional con credenciales propias del ambiente. Para entrega pública conviene usar un dominio institucional con SPF, DKIM y DMARC.
- `PARQUEDATOS` en almacenamiento persistente con copia de seguridad y permisos mínimos para la cuenta del servicio.
- Un proxy inverso que termine TLS, preserve los encabezados reenviados y restrinja el acceso directo al puerto del backend.
- Monitoreo del endpoint de salud, centralización de registros y alertas de disponibilidad, errores 5xx y fallos SMTP.

La validación previa se ejecuta con `scripts\Probar Sistema.ps1`. Después de configurar un ambiente real debe repetirse allí una prueba completa de registro, verificación de correo, recuperación de contraseña y restauración de respaldo antes de abrir el servicio al público.
