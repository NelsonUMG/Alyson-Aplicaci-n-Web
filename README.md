# Sistema Web del Parque Erick Barrondo

Aplicación web para la gestión y consulta de servicios del Parque Erick Barrondo. El sistema permite publicar noticias e información institucional, consultar áreas e instalaciones en un mapa, conocer eventos y cursos e inscribirse, y realizar solicitudes y trámites. El personal autorizado administra el contenido, las áreas, las actividades, las solicitudes, los usuarios, los permisos y los reportes.

La aplicación está desarrollada con React en el frontend y Java con Spring Boot en el backend. Utiliza Microsoft SQL Server para almacenar la información.

## Funcionalidades

- Portal público con información institucional y noticias.
- Consulta de áreas e instalaciones del parque, su ubicación y disponibilidad.
- Publicación y administración de eventos y cursos, grupos, horarios, requisitos e inscripciones.
- Registro e inscripción de participantes en actividades publicadas.
- Catálogo de trámites y recepción de solicitudes, incluida la solicitud de uso de instalaciones.
- Administración de usuarios, roles y permisos.
- Gestión de contenido institucional, portada, publicaciones, áreas y mantenimiento.
- Reportes y auditoría de operaciones administrativas.

El módulo de bicicletas está deshabilitado en la interfaz actual.

## Requisitos

- Java 21.
- Node.js 24.
- Microsoft SQL Server.
- Configuración de variables de entorno para la conexión a la base de datos y, según las funciones que se utilicen, el correo SMTP y la dirección pública del frontend.

## Base de datos

El backend aplica las migraciones de SQL Server mediante Flyway al iniciar. Las migraciones se encuentran en `database/migrations`. Configura las variables `BDSERVIDOR`, `BDPUERTO`, `BDNOMBRE`, `BDUSUARIO` y `BDCONTRASENA` para conectar con la base de datos. En producción, configura también las credenciales de migración cuando sean distintas y usa un certificado válido para SQL Server.

## Desarrollo

Desde `frontend`, instala dependencias y ejecuta el servidor de desarrollo:

```powershell
npm install
npm run desarrollo
```

Desde `backend`, inicia la API con Maven Wrapper:

```powershell
./mvnw spring-boot:run
```

En Windows también puedes usar `mvnw.cmd spring-boot:run`.

## Datos e imágenes

Las imágenes y archivos cargados por usuarios se guardan en una carpeta de datos persistente, separada del ejecutable. Configura `PARQUEDATOS` para indicar esa ubicación; las variables `ALMACENAMIENTORUTA...` permiten definir rutas específicas por tipo de archivo. Al trasladar la instalación, respalda y copia la base de datos y toda la carpeta de datos.

## Instalación

Los scripts de instalación y operación están en `scripts\instalacion`. Consulta `scripts\instalacion\LEEME-INSTALACION.txt` para preparar, instalar, iniciar y detener el sistema.

Para producción, configura el perfil `produccion`, reemplaza los valores de ejemplo por secretos del ambiente, publica el sistema detrás de un proxy HTTPS y establece una URL pública estable. Configura correo SMTP y copias de seguridad de SQL Server antes de habilitar el servicio al público.
