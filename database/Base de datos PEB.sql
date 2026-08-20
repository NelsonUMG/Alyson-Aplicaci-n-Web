USE master;
GO
IF DB_ID(N'ParqueErickBarrondo') IS NULL
BEGIN
    CREATE DATABASE [ParqueErickBarrondo];
END
GO
USE [ParqueErickBarrondo];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE TABLE dbo.Usuarios (
    IdUsuario BIGINT IDENTITY(1,1) NOT NULL,
    CorreoNormalizado VARCHAR(254) COLLATE Latin1_General_100_CI_AI NOT NULL,
    Nombre NVARCHAR(80) NOT NULL,
    Apellido NVARCHAR(80) NOT NULL,
    HashContrasena VARCHAR(255) NOT NULL,
    Estado VARCHAR(32) NOT NULL CONSTRAINT DFUsuariosEstado DEFAULT 'PENDIENTEVERIFICACION',
    CorreoVerificadoEn DATETIME2(6) NULL,
    BloqueadoHasta DATETIME2(6) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFUsuariosCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFUsuariosActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFUsuariosVersion DEFAULT 0,
    CONSTRAINT PKUsuarios PRIMARY KEY (IdUsuario),
    CONSTRAINT UQUsuariosCorreoNormalizado UNIQUE (CorreoNormalizado),
    CONSTRAINT CKUsuariosEstado CHECK (Estado IN ('PENDIENTEVERIFICACION', 'ACTIVO', 'BLOQUEADO', 'DESHABILITADO')),
    CONSTRAINT CKUsuariosVersion CHECK (Version >= 0)
);

CREATE INDEX IXUsuariosEstadoCreadoEn
    ON dbo.Usuarios (Estado, CreadoEn, IdUsuario);

GO

CREATE TABLE dbo.Roles (
    IdRol BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(300) NULL,
    Activo BIT NOT NULL CONSTRAINT DFRolesActivo DEFAULT 1,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRolesCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRolesActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFRolesVersion DEFAULT 0,
    CONSTRAINT PKRoles PRIMARY KEY (IdRol),
    CONSTRAINT UQRolesCodigo UNIQUE (Codigo)
);

CREATE TABLE dbo.Permisos (
    IdPermiso BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(80) NOT NULL,
    Descripcion NVARCHAR(300) NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFPermisosCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKPermisos PRIMARY KEY (IdPermiso),
    CONSTRAINT UQPermisosCodigo UNIQUE (Codigo)
);

CREATE TABLE dbo.UsuariosRoles (
    IdUsuario BIGINT NOT NULL,
    IdRol BIGINT NOT NULL,
    AsignadoPor BIGINT NULL,
    AsignadoEn DATETIME2(6) NOT NULL CONSTRAINT DFUsuariosRolesAsignadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKUsuariosRoles PRIMARY KEY (IdUsuario, IdRol),
    CONSTRAINT FKUsuariosRolesUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKUsuariosRolesRol FOREIGN KEY (IdRol) REFERENCES dbo.Roles (IdRol),
    CONSTRAINT FKUsuariosRolesAsignadoPor FOREIGN KEY (AsignadoPor) REFERENCES dbo.Usuarios (IdUsuario)
);

CREATE INDEX IXUsuariosRolesIdRol
    ON dbo.UsuariosRoles (IdRol, IdUsuario);

CREATE TABLE dbo.RolesPermisos (
    IdRol BIGINT NOT NULL,
    IdPermiso BIGINT NOT NULL,
    OtorgadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRolesPermisosOtorgadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKRolesPermisos PRIMARY KEY (IdRol, IdPermiso),
    CONSTRAINT FKRolesPermisosRol FOREIGN KEY (IdRol) REFERENCES dbo.Roles (IdRol),
    CONSTRAINT FKRolesPermisosPermiso FOREIGN KEY (IdPermiso) REFERENCES dbo.Permisos (IdPermiso)
);

CREATE INDEX IXRolesPermisosIdPermiso
    ON dbo.RolesPermisos (IdPermiso, IdRol);

CREATE TABLE dbo.TokensRestablecimientoContrasena (
    IdTokenRestablecimientoContrasena BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuario BIGINT NOT NULL,
    HashToken VARBINARY(32) NOT NULL,
    ExpiraEn DATETIME2(6) NOT NULL,
    ConsumidoEn DATETIME2(6) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFTokensRestablecimientoCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKTokensRestablecimientoContrasena PRIMARY KEY (IdTokenRestablecimientoContrasena),
    CONSTRAINT UQTokensRestablecimientoHashToken UNIQUE (HashToken),
    CONSTRAINT FKTokensRestablecimientoUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKTokensRestablecimientoExpiracion CHECK (ExpiraEn > CreadoEn)
);

CREATE INDEX IXTokensRestablecimientoUsuarioExpiracion
    ON dbo.TokensRestablecimientoContrasena (IdUsuario, ExpiraEn);

CREATE TABLE dbo.TokensVerificacionCorreo (
    IdTokenVerificacionCorreo BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuario BIGINT NOT NULL,
    HashToken VARBINARY(32) NOT NULL,
    ExpiraEn DATETIME2(6) NOT NULL,
    ConsumidoEn DATETIME2(6) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFTokensVerificacionCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKTokensVerificacionCorreo PRIMARY KEY (IdTokenVerificacionCorreo),
    CONSTRAINT UQTokensVerificacionHashToken UNIQUE (HashToken),
    CONSTRAINT FKTokensVerificacionUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKTokensVerificacionExpiracion CHECK (ExpiraEn > CreadoEn)
);

CREATE INDEX IXTokensVerificacionUsuarioExpiracion
    ON dbo.TokensVerificacionCorreo (IdUsuario, ExpiraEn);

CREATE TABLE dbo.IntentosInicioSesion (
    IdIntentoInicioSesion BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuario BIGINT NULL,
    HuellaCorreo VARBINARY(32) NOT NULL,
    HuellaIp VARBINARY(32) NOT NULL,
    HuellaAgenteUsuario VARBINARY(32) NULL,
    Resultado VARCHAR(32) NOT NULL,
    MotivoFallo VARCHAR(64) NULL,
    IdCorrelacion VARCHAR(64) NOT NULL,
    IntentadoEn DATETIME2(6) NOT NULL CONSTRAINT DFIntentosInicioSesionIntentadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKIntentosInicioSesion PRIMARY KEY (IdIntentoInicioSesion),
    CONSTRAINT FKIntentosInicioSesionUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKIntentosInicioSesionResultado CHECK (Resultado IN ('EXITOSO', 'FALLIDO', 'LIMITADO', 'BLOQUEADO'))
);

CREATE INDEX IXIntentosInicioSesionCorreoFecha
    ON dbo.IntentosInicioSesion (HuellaCorreo, IntentadoEn DESC);

CREATE INDEX IXIntentosInicioSesionIpFecha
    ON dbo.IntentosInicioSesion (HuellaIp, IntentadoEn DESC);

CREATE TABLE dbo.EventosAuditoria (
    IdEventoAuditoria BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuarioActor BIGINT NULL,
    CodigoAccion VARCHAR(80) NOT NULL,
    TipoRecurso VARCHAR(80) NOT NULL,
    IdRecurso VARCHAR(80) NULL,
    Resultado VARCHAR(32) NOT NULL,
    IdCorrelacion VARCHAR(64) NOT NULL,
    MetadatosJson NVARCHAR(MAX) NULL,
    OcurridoEn DATETIME2(6) NOT NULL CONSTRAINT DFEventosAuditoriaOcurridoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKEventosAuditoria PRIMARY KEY (IdEventoAuditoria),
    CONSTRAINT FKEventosAuditoriaActor FOREIGN KEY (IdUsuarioActor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKEventosAuditoriaResultado CHECK (Resultado IN ('EXITOSO', 'DENEGADO', 'FALLIDO')),
    CONSTRAINT CKEventosAuditoriaMetadatosJson CHECK (MetadatosJson IS NULL OR ISJSON(MetadatosJson) = 1)
);

CREATE INDEX IXEventosAuditoriaRecursoFecha
    ON dbo.EventosAuditoria (TipoRecurso, IdRecurso, OcurridoEn DESC);

CREATE INDEX IXEventosAuditoriaActorFecha
    ON dbo.EventosAuditoria (IdUsuarioActor, OcurridoEn DESC);

CREATE TABLE dbo.RegistrosIdempotencia (
    IdRegistroIdempotencia BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuarioActor BIGINT NULL,
    AlcanceActor VARCHAR(128) NOT NULL,
    CodigoOperacion VARCHAR(80) NOT NULL,
    HashClaveIdempotencia VARBINARY(32) NOT NULL,
    HashSolicitud VARBINARY(32) NOT NULL,
    Estado VARCHAR(24) NOT NULL,
    EstadoRespuesta SMALLINT NULL,
    RespuestaJson NVARCHAR(MAX) NULL,
    ExpiraEn DATETIME2(6) NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRegistrosIdempotenciaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRegistrosIdempotenciaActualizadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKRegistrosIdempotencia PRIMARY KEY (IdRegistroIdempotencia),
    CONSTRAINT UQRegistrosIdempotenciaAlcance UNIQUE (AlcanceActor, CodigoOperacion, HashClaveIdempotencia),
    CONSTRAINT FKRegistrosIdempotenciaActor FOREIGN KEY (IdUsuarioActor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKRegistrosIdempotenciaEstado CHECK (Estado IN ('PROCESANDO', 'COMPLETADO', 'FALLIDO')),
    CONSTRAINT CKRegistrosIdempotenciaRespuestaJson CHECK (RespuestaJson IS NULL OR ISJSON(RespuestaJson) = 1),
    CONSTRAINT CKRegistrosIdempotenciaExpiracion CHECK (ExpiraEn > CreadoEn)
);

CREATE INDEX IXRegistrosIdempotenciaExpiracion
    ON dbo.RegistrosIdempotencia (ExpiraEn);

INSERT INTO dbo.Roles (Codigo, Nombre, Descripcion) VALUES
    ('USUARIOREGISTRADO', N'Usuario registrado', N'Persona con cuenta activa.'),
    ('OPERADOREVENTOS', N'Operador de eventos', N'Gestiona eventos e inscripciones.'),
    ('OPERADORBICICLETAS', N'Operador de bicicletas', N'Gestiona inventario y préstamos autorizados.'),
    ('OPERADORMANTENIMIENTO', N'Operador de mantenimiento', N'Gestiona estados y mantenimiento.'),
    ('CONSULTAREPORTES', N'Consulta de reportes', N'Consulta reportes expresamente autorizados.'),
    ('ADMINISTRADOR', N'Administrador', N'Administra seguridad y configuración autorizada.');

INSERT INTO dbo.Permisos (Codigo, Descripcion) VALUES
    ('PUBLICACIONLEER', N'Consultar publicaciones.'),
    ('PUBLICACIONCREAR', N'Crear publicaciones.'),
    ('PUBLICACIONACTUALIZAR', N'Actualizar publicaciones.'),
    ('PUBLICACIONELIMINAR', N'Archivar o eliminar publicaciones según política.'),
    ('EVENTOLEER', N'Consultar eventos.'),
    ('EVENTOCREAR', N'Crear eventos.'),
    ('EVENTOACTUALIZAR', N'Actualizar eventos.'),
    ('EVENTOGESTIONARINSCRIPCIONES', N'Gestionar inscripciones de eventos.'),
    ('AREALEER', N'Consultar áreas.'),
    ('AREAACTUALIZARESTADO', N'Actualizar estado de áreas.'),
    ('BICICLETALEER', N'Consultar bicicletas.'),
    ('BICICLETACREAR', N'Registrar bicicletas.'),
    ('BICICLETAPRESTAR', N'Registrar préstamo de bicicleta.'),
    ('BICICLETADEVOLVER', N'Registrar devolución de bicicleta.'),
    ('MANTENIMIENTOLEER', N'Consultar mantenimiento.'),
    ('MANTENIMIENTOCREAR', N'Crear solicitud de mantenimiento.'),
    ('MANTENIMIENTOACTUALIZAR', N'Actualizar mantenimiento.'),
    ('REPORTELEER', N'Consultar reportes autorizados.'),
    ('USUARIOGESTIONAR', N'Gestionar usuarios.'),
    ('ROLGESTIONAR', N'Gestionar roles y permisos.'),
    ('AUDITORIALEER', N'Consultar auditoría.');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR';

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'USUARIOREGISTRADO'
  AND Permiso.Codigo IN ('PUBLICACIONLEER', 'EVENTOLEER', 'AREALEER', 'BICICLETALEER');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'OPERADOREVENTOS'
  AND Permiso.Codigo IN ('EVENTOLEER', 'EVENTOCREAR', 'EVENTOACTUALIZAR', 'EVENTOGESTIONARINSCRIPCIONES');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'OPERADORBICICLETAS'
  AND Permiso.Codigo IN ('BICICLETALEER', 'BICICLETACREAR', 'BICICLETAPRESTAR', 'BICICLETADEVOLVER');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'OPERADORMANTENIMIENTO'
  AND Permiso.Codigo IN ('AREALEER', 'AREAACTUALIZARESTADO', 'MANTENIMIENTOLEER', 'MANTENIMIENTOCREAR', 'MANTENIMIENTOACTUALIZAR');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'CONSULTAREPORTES'
  AND Permiso.Codigo = 'REPORTELEER';

GO

CREATE TABLE dbo.CategoriasPublicacion (
    IdCategoriaPublicacion BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(300) NULL,
    OrdenVisualizacion SMALLINT NOT NULL CONSTRAINT DFCategoriasPublicacionOrden DEFAULT 0,
    Activa BIT NOT NULL CONSTRAINT DFCategoriasPublicacionActiva DEFAULT 1,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFCategoriasPublicacionCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFCategoriasPublicacionActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFCategoriasPublicacionVersion DEFAULT 0,
    CONSTRAINT PKCategoriasPublicacion PRIMARY KEY (IdCategoriaPublicacion),
    CONSTRAINT UQCategoriasPublicacionCodigo UNIQUE (Codigo),
    CONSTRAINT CKCategoriasPublicacionOrden CHECK (OrdenVisualizacion >= 0)
);

CREATE TABLE dbo.Publicaciones (
    IdPublicacion BIGINT IDENTITY(1,1) NOT NULL,
    IdCategoriaPublicacion BIGINT NOT NULL,
    IdUsuarioAutor BIGINT NOT NULL,
    Titulo NVARCHAR(180) NOT NULL,
    IdentificadorUrl VARCHAR(190) NOT NULL,
    Resumen NVARCHAR(500) NOT NULL,
    Contenido NVARCHAR(MAX) NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFPublicacionesEstado DEFAULT 'BORRADOR',
    FechaEditorial DATE NULL,
    PublicadoEn DATETIME2(6) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFPublicacionesCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFPublicacionesActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFPublicacionesVersion DEFAULT 0,
    CONSTRAINT PKPublicaciones PRIMARY KEY (IdPublicacion),
    CONSTRAINT UQPublicacionesIdentificadorUrl UNIQUE (IdentificadorUrl),
    CONSTRAINT FKPublicacionesCategoria FOREIGN KEY (IdCategoriaPublicacion) REFERENCES dbo.CategoriasPublicacion (IdCategoriaPublicacion),
    CONSTRAINT FKPublicacionesAutor FOREIGN KEY (IdUsuarioAutor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKPublicacionesEstado CHECK (Estado IN ('BORRADOR', 'PUBLICADA', 'ARCHIVADA')),
    CONSTRAINT CKPublicacionesFechaPublicacion CHECK (Estado <> 'PUBLICADA' OR PublicadoEn IS NOT NULL)
);

CREATE INDEX IXPublicacionesListadoPublico
    ON dbo.Publicaciones (Estado, PublicadoEn DESC, IdPublicacion DESC);

CREATE INDEX IXPublicacionesCategoriaFecha
    ON dbo.Publicaciones (IdCategoriaPublicacion, PublicadoEn DESC, IdPublicacion DESC);

CREATE TABLE dbo.ImagenesPublicacion (
    IdImagenPublicacion BIGINT IDENTITY(1,1) NOT NULL,
    IdPublicacion BIGINT NOT NULL,
    ClaveAlmacenamiento NVARCHAR(500) NOT NULL,
    NombreArchivoOriginal NVARCHAR(255) NOT NULL,
    TipoMedio VARCHAR(100) NOT NULL,
    TamanoBytes BIGINT NOT NULL,
    AnchoPixeles INT NOT NULL,
    AltoPixeles INT NOT NULL,
    TextoAlternativo NVARCHAR(255) NOT NULL,
    OrdenVisualizacion SMALLINT NOT NULL CONSTRAINT DFImagenesPublicacionOrden DEFAULT 0,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFImagenesPublicacionCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKImagenesPublicacion PRIMARY KEY (IdImagenPublicacion),
    CONSTRAINT UQImagenesPublicacionClaveAlmacenamiento UNIQUE (ClaveAlmacenamiento),
    CONSTRAINT FKImagenesPublicacionPublicacion FOREIGN KEY (IdPublicacion) REFERENCES dbo.Publicaciones (IdPublicacion),
    CONSTRAINT CKImagenesPublicacionTamano CHECK (TamanoBytes > 0),
    CONSTRAINT CKImagenesPublicacionDimensiones CHECK (AnchoPixeles > 0 AND AltoPixeles > 0),
    CONSTRAINT CKImagenesPublicacionOrden CHECK (OrdenVisualizacion >= 0)
);

CREATE INDEX IXImagenesPublicacionOrden
    ON dbo.ImagenesPublicacion (IdPublicacion, OrdenVisualizacion, IdImagenPublicacion);

GO

CREATE TABLE dbo.Eventos (
    IdEvento BIGINT IDENTITY(1,1) NOT NULL,
    CreadoPor BIGINT NOT NULL,
    Titulo NVARCHAR(180) NOT NULL,
    IdentificadorUrl VARCHAR(190) NOT NULL,
    Descripcion NVARCHAR(MAX) NOT NULL,
    Lugar NVARCHAR(180) NULL,
    IniciaEn DATETIME2(6) NOT NULL,
    FinalizaEn DATETIME2(6) NULL,
    InscripcionAbreEn DATETIME2(6) NULL,
    InscripcionCierraEn DATETIME2(6) NULL,
    CapacidadTotal INT NOT NULL,
    CantidadOcupada INT NOT NULL CONSTRAINT DFEventosCantidadOcupada DEFAULT 0,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFEventosEstado DEFAULT 'BORRADOR',
    ClaveImagen NVARCHAR(500) NULL,
    EsquemaFormularioJson NVARCHAR(MAX) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFEventosCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFEventosActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFEventosVersion DEFAULT 0,
    CONSTRAINT PKEventos PRIMARY KEY (IdEvento),
    CONSTRAINT UQEventosIdentificadorUrl UNIQUE (IdentificadorUrl),
    CONSTRAINT FKEventosCreadoPor FOREIGN KEY (CreadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKEventosEstado CHECK (Estado IN ('BORRADOR', 'PUBLICADO', 'CERRADO', 'CANCELADO', 'FINALIZADO')),
    CONSTRAINT CKEventosCapacidad CHECK (CapacidadTotal >= 0 AND CantidadOcupada >= 0 AND CantidadOcupada <= CapacidadTotal),
    CONSTRAINT CKEventosFechas CHECK (FinalizaEn IS NULL OR FinalizaEn >= IniciaEn),
    CONSTRAINT CKEventosVentanaInscripcion CHECK (
        InscripcionAbreEn IS NULL OR InscripcionCierraEn IS NULL OR InscripcionCierraEn >= InscripcionAbreEn
    ),
    CONSTRAINT CKEventosFormularioJson CHECK (EsquemaFormularioJson IS NULL OR ISJSON(EsquemaFormularioJson) = 1)
);

CREATE INDEX IXEventosListadoPublico
    ON dbo.Eventos (Estado, IniciaEn, IdEvento);

CREATE INDEX IXEventosVentanaInscripcion
    ON dbo.Eventos (Estado, InscripcionAbreEn, InscripcionCierraEn);

CREATE TABLE dbo.RequisitosEvento (
    IdRequisitoEvento BIGINT IDENTITY(1,1) NOT NULL,
    IdEvento BIGINT NOT NULL,
    Descripcion NVARCHAR(500) NOT NULL,
    Obligatorio BIT NOT NULL CONSTRAINT DFRequisitosEventoObligatorio DEFAULT 1,
    OrdenVisualizacion SMALLINT NOT NULL CONSTRAINT DFRequisitosEventoOrden DEFAULT 0,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFRequisitosEventoCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKRequisitosEvento PRIMARY KEY (IdRequisitoEvento),
    CONSTRAINT FKRequisitosEventoEvento FOREIGN KEY (IdEvento) REFERENCES dbo.Eventos (IdEvento),
    CONSTRAINT CKRequisitosEventoOrden CHECK (OrdenVisualizacion >= 0)
);

CREATE INDEX IXRequisitosEventoOrden
    ON dbo.RequisitosEvento (IdEvento, OrdenVisualizacion, IdRequisitoEvento);

CREATE TABLE dbo.InscripcionesEvento (
    IdInscripcionEvento BIGINT IDENTITY(1,1) NOT NULL,
    IdEvento BIGINT NOT NULL,
    IdUsuario BIGINT NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFInscripcionesEventoEstado DEFAULT 'CONFIRMADA',
    RequisitosAceptadosEn DATETIME2(6) NOT NULL,
    ConfirmadaEn DATETIME2(6) NULL,
    CanceladaEn DATETIME2(6) NULL,
    MotivoCancelacion NVARCHAR(300) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFInscripcionesEventoCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFInscripcionesEventoActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFInscripcionesEventoVersion DEFAULT 0,
    CONSTRAINT PKInscripcionesEvento PRIMARY KEY (IdInscripcionEvento),
    CONSTRAINT UQInscripcionesEventoUsuario UNIQUE (IdEvento, IdUsuario),
    CONSTRAINT FKInscripcionesEventoEvento FOREIGN KEY (IdEvento) REFERENCES dbo.Eventos (IdEvento),
    CONSTRAINT FKInscripcionesEventoUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKInscripcionesEventoEstado CHECK (Estado IN ('CONFIRMADA', 'CANCELADA')),
    CONSTRAINT CKInscripcionesEventoConfirmacion CHECK (Estado <> 'CONFIRMADA' OR ConfirmadaEn IS NOT NULL),
    CONSTRAINT CKInscripcionesEventoCancelacion CHECK (Estado <> 'CANCELADA' OR CanceladaEn IS NOT NULL)
);

CREATE INDEX IXInscripcionesEventoEstado
    ON dbo.InscripcionesEvento (IdEvento, Estado, CreadoEn, IdInscripcionEvento);

CREATE INDEX IXInscripcionesUsuarioEstado
    ON dbo.InscripcionesEvento (IdUsuario, Estado, CreadoEn DESC, IdInscripcionEvento DESC);

GO

CREATE TABLE dbo.CategoriasArea (
    IdCategoriaArea BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(300) NULL,
    Activa BIT NOT NULL CONSTRAINT DFCategoriasAreaActiva DEFAULT 1,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFCategoriasAreaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFCategoriasAreaActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFCategoriasAreaVersion DEFAULT 0,
    CONSTRAINT PKCategoriasArea PRIMARY KEY (IdCategoriaArea),
    CONSTRAINT UQCategoriasAreaCodigo UNIQUE (Codigo)
);

CREATE TABLE dbo.Areas (
    IdArea BIGINT IDENTITY(1,1) NOT NULL,
    IdCategoriaArea BIGINT NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    NumeroVisibleMapa INT NULL,
    Nombre NVARCHAR(150) NOT NULL,
    Descripcion NVARCHAR(MAX) NULL,
    Estado VARCHAR(40) NOT NULL CONSTRAINT DFAreasEstado DEFAULT 'PENDIENTECONFIRMACION',
    NotaDisponibilidad NVARCHAR(300) NULL,
    Latitud DECIMAL(10,8) NULL,
    Longitud DECIMAL(11,8) NULL,
    CoordenadasConfirmadas BIT NOT NULL CONSTRAINT DFAreasCoordenadasConfirmadas DEFAULT 0,
    HorarioJson NVARCHAR(MAX) NULL,
    ObservacionesInternas NVARCHAR(MAX) NULL,
    ClaveImagen NVARCHAR(500) NULL,
    CreadoPor BIGINT NOT NULL,
    ActualizadoPor BIGINT NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFAreasCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFAreasActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFAreasVersion DEFAULT 0,
    CONSTRAINT PKAreas PRIMARY KEY (IdArea),
    CONSTRAINT UQAreasCodigo UNIQUE (Codigo),
    CONSTRAINT UQAreasNumeroVisibleMapa UNIQUE (NumeroVisibleMapa),
    CONSTRAINT FKAreasCategoria FOREIGN KEY (IdCategoriaArea) REFERENCES dbo.CategoriasArea (IdCategoriaArea),
    CONSTRAINT FKAreasCreadoPor FOREIGN KEY (CreadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKAreasActualizadoPor FOREIGN KEY (ActualizadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKAreasEstado CHECK (Estado IN (
        'DISPONIBLE', 'ENUSO', 'ENMANTENIMIENTO', 'CERRADA', 'FUERADESERVICIO', 'PENDIENTECONFIRMACION'
    )),
    CONSTRAINT CKAreasParCoordenadas CHECK (
        (Latitud IS NULL AND Longitud IS NULL) OR (Latitud IS NOT NULL AND Longitud IS NOT NULL)
    ),
    CONSTRAINT CKAreasCoordenadasConfirmadas CHECK (
        CoordenadasConfirmadas = 0 OR (Latitud IS NOT NULL AND Longitud IS NOT NULL)
    ),
    CONSTRAINT CKAreasLatitud CHECK (Latitud IS NULL OR Latitud BETWEEN -90 AND 90),
    CONSTRAINT CKAreasLongitud CHECK (Longitud IS NULL OR Longitud BETWEEN -180 AND 180),
    CONSTRAINT CKAreasHorarioJson CHECK (HorarioJson IS NULL OR ISJSON(HorarioJson) = 1)
);

CREATE INDEX IXAreasCategoriaEstado
    ON dbo.Areas (IdCategoriaArea, Estado, Nombre, IdArea);

CREATE INDEX IXAreasEstadoPublico
    ON dbo.Areas (Estado, CoordenadasConfirmadas, IdArea);

CREATE TABLE dbo.HistorialEstadosArea (
    IdHistorialEstadoArea BIGINT IDENTITY(1,1) NOT NULL,
    IdArea BIGINT NOT NULL,
    EstadoAnterior VARCHAR(40) NULL,
    EstadoNuevo VARCHAR(40) NOT NULL,
    Motivo NVARCHAR(500) NOT NULL,
    CambiadoPor BIGINT NOT NULL,
    CambiadoEn DATETIME2(6) NOT NULL CONSTRAINT DFHistorialEstadosAreaCambiadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKHistorialEstadosArea PRIMARY KEY (IdHistorialEstadoArea),
    CONSTRAINT FKHistorialEstadosAreaArea FOREIGN KEY (IdArea) REFERENCES dbo.Areas (IdArea),
    CONSTRAINT FKHistorialEstadosAreaCambiadoPor FOREIGN KEY (CambiadoPor) REFERENCES dbo.Usuarios (IdUsuario)
);

CREATE INDEX IXHistorialEstadosAreaFecha
    ON dbo.HistorialEstadosArea (IdArea, CambiadoEn DESC, IdHistorialEstadoArea DESC);

CREATE TABLE dbo.NodosMapa (
    IdNodoMapa BIGINT IDENTITY(1,1) NOT NULL,
    IdArea BIGINT NULL,
    TipoNodo VARCHAR(32) NOT NULL,
    Nombre NVARCHAR(150) NOT NULL,
    Latitud DECIMAL(10,8) NULL,
    Longitud DECIMAL(11,8) NULL,
    CoordenadasConfirmadas BIT NOT NULL CONSTRAINT DFNodosMapaCoordenadasConfirmadas DEFAULT 0,
    Accesible BIT NOT NULL CONSTRAINT DFNodosMapaAccesible DEFAULT 1,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFNodosMapaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFNodosMapaActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFNodosMapaVersion DEFAULT 0,
    CONSTRAINT PKNodosMapa PRIMARY KEY (IdNodoMapa),
    CONSTRAINT FKNodosMapaArea FOREIGN KEY (IdArea) REFERENCES dbo.Areas (IdArea),
    CONSTRAINT CKNodosMapaTipo CHECK (TipoNodo IN ('ENTRADA', 'INTERSECCION', 'DESTINO')),
    CONSTRAINT CKNodosMapaParCoordenadas CHECK (
        (Latitud IS NULL AND Longitud IS NULL) OR (Latitud IS NOT NULL AND Longitud IS NOT NULL)
    ),
    CONSTRAINT CKNodosMapaCoordenadasConfirmadas CHECK (
        CoordenadasConfirmadas = 0 OR (Latitud IS NOT NULL AND Longitud IS NOT NULL)
    ),
    CONSTRAINT CKNodosMapaLatitud CHECK (Latitud IS NULL OR Latitud BETWEEN -90 AND 90),
    CONSTRAINT CKNodosMapaLongitud CHECK (Longitud IS NULL OR Longitud BETWEEN -180 AND 180)
);

CREATE INDEX IXNodosMapaAreaTipo
    ON dbo.NodosMapa (IdArea, TipoNodo, IdNodoMapa);

CREATE TABLE dbo.ConexionesMapa (
    IdConexionMapa BIGINT IDENTITY(1,1) NOT NULL,
    IdNodoOrigen BIGINT NOT NULL,
    IdNodoDestino BIGINT NOT NULL,
    DistanciaMetros DECIMAL(10,2) NOT NULL,
    Bidireccional BIT NOT NULL CONSTRAINT DFConexionesMapaBidireccional DEFAULT 1,
    Accesible BIT NOT NULL CONSTRAINT DFConexionesMapaAccesible DEFAULT 1,
    Cerrada BIT NOT NULL CONSTRAINT DFConexionesMapaCerrada DEFAULT 0,
    MotivoCierre NVARCHAR(300) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFConexionesMapaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFConexionesMapaActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFConexionesMapaVersion DEFAULT 0,
    CONSTRAINT PKConexionesMapa PRIMARY KEY (IdConexionMapa),
    CONSTRAINT UQConexionesMapaDireccion UNIQUE (IdNodoOrigen, IdNodoDestino),
    CONSTRAINT FKConexionesMapaOrigen FOREIGN KEY (IdNodoOrigen) REFERENCES dbo.NodosMapa (IdNodoMapa),
    CONSTRAINT FKConexionesMapaDestino FOREIGN KEY (IdNodoDestino) REFERENCES dbo.NodosMapa (IdNodoMapa),
    CONSTRAINT CKConexionesMapaNodosDistintos CHECK (IdNodoOrigen <> IdNodoDestino),
    CONSTRAINT CKConexionesMapaDistancia CHECK (DistanciaMetros > 0)
);

CREATE INDEX IXConexionesMapaEstadoRuta
    ON dbo.ConexionesMapa (IdNodoOrigen, Cerrada, Accesible, IdNodoDestino);

GO

CREATE TABLE dbo.Bicicletas (
    IdBicicleta BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Estado NVARCHAR(32) NOT NULL CONSTRAINT DFBicicletasEstado DEFAULT N'DISPONIBLE',
    ObservacionesInventario NVARCHAR(500) NULL,
    CreadoPor BIGINT NOT NULL,
    ActualizadoPor BIGINT NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFBicicletasCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFBicicletasActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFBicicletasVersion DEFAULT 0,
    CONSTRAINT PKBicicletas PRIMARY KEY (IdBicicleta),
    CONSTRAINT UQBicicletasCodigo UNIQUE (Codigo),
    CONSTRAINT FKBicicletasCreadoPor FOREIGN KEY (CreadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKBicicletasActualizadoPor FOREIGN KEY (ActualizadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKBicicletasEstado CHECK (Estado IN (
        N'DISPONIBLE', N'PRESTADA', N'ENMANTENIMIENTO', N'DAÑADA', N'NODEVUELTA', N'FUERADESERVICIO'
    ))
);

CREATE INDEX IXBicicletasEstadoActualizadoEn
    ON dbo.Bicicletas (Estado, ActualizadoEn DESC, IdBicicleta);

CREATE TABLE dbo.PrestamosBicicleta (
    IdPrestamoBicicleta BIGINT IDENTITY(1,1) NOT NULL,
    IdBicicleta BIGINT NOT NULL,
    IdUsuario BIGINT NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFPrestamosBicicletaEstado DEFAULT 'ACTIVO',
    PrestadoEn DATETIME2(6) NOT NULL,
    VenceEn DATETIME2(6) NOT NULL,
    DevueltoEn DATETIME2(6) NULL,
    PrestadoPor BIGINT NOT NULL,
    RecibidoPor BIGINT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFPrestamosBicicletaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFPrestamosBicicletaActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFPrestamosBicicletaVersion DEFAULT 0,
    CONSTRAINT PKPrestamosBicicleta PRIMARY KEY (IdPrestamoBicicleta),
    CONSTRAINT FKPrestamosBicicletaBicicleta FOREIGN KEY (IdBicicleta) REFERENCES dbo.Bicicletas (IdBicicleta),
    CONSTRAINT FKPrestamosBicicletaUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKPrestamosBicicletaPrestadoPor FOREIGN KEY (PrestadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKPrestamosBicicletaRecibidoPor FOREIGN KEY (RecibidoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKPrestamosBicicletaEstado CHECK (Estado IN ('ACTIVO', 'DEVUELTO', 'CANCELADO')),
    CONSTRAINT CKPrestamosBicicletaVencimiento CHECK (VenceEn >= PrestadoEn),
    CONSTRAINT CKPrestamosBicicletaDevolucion CHECK (Estado <> 'DEVUELTO' OR DevueltoEn IS NOT NULL)
);

CREATE UNIQUE INDEX UQPrestamosBicicletaActiva
    ON dbo.PrestamosBicicleta (IdBicicleta)
    WHERE Estado = 'ACTIVO';

CREATE UNIQUE INDEX UQPrestamosBicicletaUsuarioActivo
    ON dbo.PrestamosBicicleta (IdUsuario)
    WHERE Estado = 'ACTIVO';

CREATE INDEX IXPrestamosBicicletaHistorialUsuario
    ON dbo.PrestamosBicicleta (IdUsuario, CreadoEn DESC, IdPrestamoBicicleta DESC);

CREATE TABLE dbo.HistorialEstadosBicicleta (
    IdHistorialEstadoBicicleta BIGINT IDENTITY(1,1) NOT NULL,
    IdBicicleta BIGINT NOT NULL,
    EstadoAnterior NVARCHAR(32) NULL,
    EstadoNuevo NVARCHAR(32) NOT NULL,
    Motivo NVARCHAR(500) NOT NULL,
    CambiadoPor BIGINT NOT NULL,
    CambiadoEn DATETIME2(6) NOT NULL CONSTRAINT DFHistorialEstadosBicicletaCambiadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKHistorialEstadosBicicleta PRIMARY KEY (IdHistorialEstadoBicicleta),
    CONSTRAINT FKHistorialEstadosBicicletaBicicleta FOREIGN KEY (IdBicicleta) REFERENCES dbo.Bicicletas (IdBicicleta),
    CONSTRAINT FKHistorialEstadosBicicletaCambiadoPor FOREIGN KEY (CambiadoPor) REFERENCES dbo.Usuarios (IdUsuario)
);

CREATE INDEX IXHistorialEstadosBicicletaFecha
    ON dbo.HistorialEstadosBicicleta (IdBicicleta, CambiadoEn DESC, IdHistorialEstadoBicicleta DESC);

CREATE TABLE dbo.SolicitudesMantenimiento (
    IdSolicitudMantenimiento BIGINT IDENTITY(1,1) NOT NULL,
    IdArea BIGINT NULL,
    IdBicicleta BIGINT NULL,
    ReportadoPor BIGINT NOT NULL,
    AsignadoA BIGINT NULL,
    Prioridad VARCHAR(16) NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFSolicitudesMantenimientoEstado DEFAULT 'ABIERTA',
    Descripcion NVARCHAR(MAX) NOT NULL,
    ObservacionesResolucion NVARCHAR(MAX) NULL,
    AbiertaEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesMantenimientoAbiertaEn DEFAULT SYSUTCDATETIME(),
    ResueltaEn DATETIME2(6) NULL,
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesMantenimientoActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFSolicitudesMantenimientoVersion DEFAULT 0,
    CONSTRAINT PKSolicitudesMantenimiento PRIMARY KEY (IdSolicitudMantenimiento),
    CONSTRAINT FKSolicitudesMantenimientoArea FOREIGN KEY (IdArea) REFERENCES dbo.Areas (IdArea),
    CONSTRAINT FKSolicitudesMantenimientoBicicleta FOREIGN KEY (IdBicicleta) REFERENCES dbo.Bicicletas (IdBicicleta),
    CONSTRAINT FKSolicitudesMantenimientoReportadoPor FOREIGN KEY (ReportadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKSolicitudesMantenimientoAsignadoA FOREIGN KEY (AsignadoA) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKSolicitudesMantenimientoObjetivo CHECK (
        (IdArea IS NOT NULL AND IdBicicleta IS NULL) OR (IdArea IS NULL AND IdBicicleta IS NOT NULL)
    ),
    CONSTRAINT CKSolicitudesMantenimientoPrioridad CHECK (Prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    CONSTRAINT CKSolicitudesMantenimientoEstado CHECK (Estado IN ('ABIERTA', 'ASIGNADA', 'ENPROCESO', 'RESUELTA', 'CANCELADA')),
    CONSTRAINT CKSolicitudesMantenimientoResolucion CHECK (Estado <> 'RESUELTA' OR ResueltaEn IS NOT NULL)
);

CREATE INDEX IXSolicitudesMantenimientoEstadoPrioridad
    ON dbo.SolicitudesMantenimiento (Estado, Prioridad, AbiertaEn, IdSolicitudMantenimiento);

CREATE INDEX IXSolicitudesMantenimientoArea
    ON dbo.SolicitudesMantenimiento (IdArea, Estado, AbiertaEn DESC);

CREATE INDEX IXSolicitudesMantenimientoBicicleta
    ON dbo.SolicitudesMantenimiento (IdBicicleta, Estado, AbiertaEn DESC);

CREATE TABLE dbo.Documentos (
    IdDocumento BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuarioPropietario BIGINT NOT NULL,
    TipoDocumento VARCHAR(64) NOT NULL,
    ClaveAlmacenamiento NVARCHAR(500) NOT NULL,
    NombreArchivoOriginal NVARCHAR(255) NOT NULL,
    TipoMedio VARCHAR(100) NOT NULL,
    TamanoBytes BIGINT NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFDocumentosEstado DEFAULT 'ACTIVO',
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFDocumentosCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFDocumentosActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFDocumentosVersion DEFAULT 0,
    CONSTRAINT PKDocumentos PRIMARY KEY (IdDocumento),
    CONSTRAINT UQDocumentosClaveAlmacenamiento UNIQUE (ClaveAlmacenamiento),
    CONSTRAINT FKDocumentosPropietario FOREIGN KEY (IdUsuarioPropietario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKDocumentosTamano CHECK (TamanoBytes > 0),
    CONSTRAINT CKDocumentosEstado CHECK (Estado IN ('ACTIVO', 'ARCHIVADO', 'ELIMINADO'))
);

CREATE TABLE dbo.Solicitudes (
    IdSolicitud BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuarioSolicitante BIGINT NOT NULL,
    TipoSolicitud VARCHAR(64) NOT NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFSolicitudesEstado DEFAULT 'ENVIADA',
    Detalle NVARCHAR(MAX) NOT NULL,
    Resolucion NVARCHAR(MAX) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesActualizadoEn DEFAULT SYSUTCDATETIME(),
    ResueltoEn DATETIME2(6) NULL,
    Version BIGINT NOT NULL CONSTRAINT DFSolicitudesVersion DEFAULT 0,
    CONSTRAINT PKSolicitudes PRIMARY KEY (IdSolicitud),
    CONSTRAINT FKSolicitudesSolicitante FOREIGN KEY (IdUsuarioSolicitante) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKSolicitudesEstado CHECK (Estado IN ('ENVIADA', 'ENREVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA'))
);

CREATE INDEX IXSolicitudesSolicitanteEstado
    ON dbo.Solicitudes (IdUsuarioSolicitante, Estado, CreadoEn DESC, IdSolicitud DESC);

CREATE TABLE dbo.Notificaciones (
    IdNotificacion BIGINT IDENTITY(1,1) NOT NULL,
    IdUsuarioDestinatario BIGINT NOT NULL,
    TipoNotificacion VARCHAR(64) NOT NULL,
    Asunto NVARCHAR(180) NOT NULL,
    ContenidoJson NVARCHAR(MAX) NULL,
    Estado VARCHAR(24) NOT NULL CONSTRAINT DFNotificacionesEstado DEFAULT 'PENDIENTE',
    LeidaEn DATETIME2(6) NULL,
    EnviadaEn DATETIME2(6) NULL,
    CantidadIntentos SMALLINT NOT NULL CONSTRAINT DFNotificacionesCantidadIntentos DEFAULT 0,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFNotificacionesCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFNotificacionesActualizadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKNotificaciones PRIMARY KEY (IdNotificacion),
    CONSTRAINT FKNotificacionesDestinatario FOREIGN KEY (IdUsuarioDestinatario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKNotificacionesEstado CHECK (Estado IN ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'CANCELADA')),
    CONSTRAINT CKNotificacionesCantidadIntentos CHECK (CantidadIntentos >= 0),
    CONSTRAINT CKNotificacionesContenidoJson CHECK (ContenidoJson IS NULL OR ISJSON(ContenidoJson) = 1)
);

CREATE INDEX IXNotificacionesDestinatarioEstado
    ON dbo.Notificaciones (IdUsuarioDestinatario, Estado, CreadoEn DESC, IdNotificacion DESC);

GO

ALTER TABLE dbo.Usuarios
ADD TerminosAceptadosEn DATETIME2(6) NULL,
    UltimoAccesoEn DATETIME2(6) NULL;

CREATE INDEX IXUsuariosUltimoAccesoEn
    ON dbo.Usuarios (UltimoAccesoEn DESC, IdUsuario);

GO

INSERT INTO dbo.Permisos (Codigo, Descripcion)
VALUES ('BICICLETAACTUALIZARESTADO', N'Actualizar el estado y los datos de inventario de bicicletas.');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo IN ('OPERADORBICICLETAS', 'ADMINISTRADOR')
  AND Permiso.Codigo = 'BICICLETAACTUALIZARESTADO';

GO

CREATE INDEX IXEventosAuditoriaFecha
    ON dbo.EventosAuditoria (OcurridoEn DESC, IdEventoAuditoria DESC)
    INCLUDE (CodigoAccion, TipoRecurso, IdRecurso, Resultado, IdUsuarioActor, IdCorrelacion);

GO

CREATE TRIGGER dbo.TR_EventosAuditoriaInmutable
ON dbo.EventosAuditoria
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51000, 'Los eventos de auditoría son inmutables.', 1;
END;

GO

CREATE TABLE dbo.ReservasArea (
    IdReservaArea BIGINT IDENTITY(1,1) NOT NULL,
    IdArea BIGINT NOT NULL,
    Titulo NVARCHAR(150) NOT NULL,
    IniciaEn DATETIME2(6) NOT NULL,
    FinalizaEn DATETIME2(6) NOT NULL,
    Estado VARCHAR(32) NOT NULL CONSTRAINT DFReservasAreaEstado DEFAULT 'PROGRAMADA',
    Observaciones NVARCHAR(300) NULL,
    CreadoPor BIGINT NOT NULL,
    ActualizadoPor BIGINT NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFReservasAreaCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFReservasAreaActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFReservasAreaVersion DEFAULT 0,
    CONSTRAINT PKReservasArea PRIMARY KEY (IdReservaArea),
    CONSTRAINT FKReservasAreaArea FOREIGN KEY (IdArea) REFERENCES dbo.Areas (IdArea),
    CONSTRAINT FKReservasAreaCreadoPor FOREIGN KEY (CreadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT FKReservasAreaActualizadoPor FOREIGN KEY (ActualizadoPor) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT CKReservasAreaEstado CHECK (Estado IN ('PROGRAMADA', 'ENUSO', 'FINALIZADA', 'CANCELADA')),
    CONSTRAINT CKReservasAreaIntervalo CHECK (FinalizaEn > IniciaEn)
);

CREATE INDEX IXReservasAreaDisponibilidad
    ON dbo.ReservasArea (IdArea, Estado, IniciaEn, FinalizaEn);

CREATE INDEX IXReservasAreaAgenda
    ON dbo.ReservasArea (IdArea, IniciaEn DESC, IdReservaArea DESC);

GO

CREATE TABLE dbo.ContenidoInstitucional (
    IdContenidoInstitucional BIGINT NOT NULL,
    Resumen NVARCHAR(1000) NOT NULL,
    Mision NVARCHAR(4000) NOT NULL,
    Vision NVARCHAR(4000) NOT NULL,
    Valores NVARCHAR(4000) NOT NULL,
    ActualizadoPor BIGINT NULL,
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFContenidoInstitucionalActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFContenidoInstitucionalVersion DEFAULT 0,
    CONSTRAINT PKContenidoInstitucional PRIMARY KEY (IdContenidoInstitucional),
    CONSTRAINT CKContenidoInstitucionalUnico CHECK (IdContenidoInstitucional = 1),
    CONSTRAINT CKContenidoInstitucionalVersion CHECK (Version >= 0),
    CONSTRAINT FKContenidoInstitucionalActualizadoPor FOREIGN KEY (ActualizadoPor) REFERENCES dbo.Usuarios (IdUsuario)
);

INSERT INTO dbo.ContenidoInstitucional (IdContenidoInstitucional, Resumen, Mision, Vision, Valores)
VALUES (
    1,
    N'El Centro Deportivo Erick Bernabé Barrondo García es un espacio público de recreación, deporte y naturaleza en la Ciudad de Guatemala. Sus áreas deportivas, ciclovía, juegos y espacios familiares permiten una convivencia activa y gratuita.',
    N'Promover el deporte, la recreación y la convivencia familiar mediante espacios accesibles, seguros e inclusivos para la comunidad.',
    N'Ser un referente de bienestar, inclusión y desarrollo deportivo para las familias de Guatemala.',
    N'Inclusión, respeto, bienestar, convivencia, seguridad y cuidado de la naturaleza.'
);

INSERT INTO dbo.Permisos (Codigo, Descripcion)
VALUES ('INSTITUCIONALGESTIONAR', N'Gestionar contenido institucional.');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'INSTITUCIONALGESTIONAR';

GO

ALTER TABLE dbo.Areas
ADD PerimetroConfirmado BIT NOT NULL
        CONSTRAINT DFAreasPerimetroConfirmado DEFAULT 0;

CREATE TABLE dbo.VerticesAreasMapa (
    IdArea BIGINT NOT NULL,
    Orden INT NOT NULL,
    Latitud DECIMAL(10,8) NOT NULL,
    Longitud DECIMAL(11,8) NOT NULL,
    CONSTRAINT PKVerticesAreasMapa PRIMARY KEY (IdArea, Orden),
    CONSTRAINT FKVerticesAreasMapaArea FOREIGN KEY (IdArea)
        REFERENCES dbo.Areas (IdArea) ON DELETE CASCADE,
    CONSTRAINT CKVerticesAreasMapaOrden CHECK (Orden >= 0),
    CONSTRAINT CKVerticesAreasMapaLatitud CHECK (Latitud BETWEEN -90 AND 90),
    CONSTRAINT CKVerticesAreasMapaLongitud CHECK (Longitud BETWEEN -180 AND 180)
);

CREATE INDEX IXVerticesAreasMapaArea
    ON dbo.VerticesAreasMapa (IdArea, Orden);

GO

IF NOT EXISTS (SELECT 1 FROM dbo.Permisos WHERE Codigo = 'AREAELIMINAR')
BEGIN
    INSERT INTO dbo.Permisos (Codigo, Descripcion)
    VALUES ('AREAELIMINAR', N'Eliminar áreas sin información operativa asociada.');
END;

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'AREAELIMINAR'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolesPermisos Existente
      WHERE Existente.IdRol = Rol.IdRol
        AND Existente.IdPermiso = Permiso.IdPermiso
  );

GO

DISABLE TRIGGER dbo.TR_EventosAuditoriaInmutable ON dbo.EventosAuditoria;

ALTER TABLE dbo.EventosAuditoria
    DROP CONSTRAINT CKEventosAuditoriaResultado;

UPDATE evento
SET CodigoAccion = etiquetas.Etiqueta
FROM dbo.EventosAuditoria evento
INNER JOIN (VALUES
    ('ADMINISTRADORINICIALCREADO', 'Administrador inicial creado'),
    ('AREAACTUALIZADA', 'Área actualizada'),
    ('AREACREADA', 'Área creada'),
    ('AREAELIMINADA', 'Área eliminada'),
    ('BICICLETACREADA', 'Bicicleta creada'),
    ('BICICLETAINVENTARIOACTUALIZADO', 'Inventario de bicicleta actualizado'),
    ('CATEGORIAAREAACTUALIZADA', 'Categoría de área actualizada'),
    ('CATEGORIAAREACREADA', 'Categoría de área creada'),
    ('CATEGORIAPUBLICACIONACTUALIZADA', 'Categoría de publicación actualizada'),
    ('CATEGORIAPUBLICACIONCREADA', 'Categoría de publicación creada'),
    ('CIERRESESION', 'Cierre de sesión'),
    ('CONEXIONMAPAACTUALIZADA', 'Conexión de mapa actualizada'),
    ('CONEXIONMAPACREADA', 'Conexión de mapa creada'),
    ('CONEXIONMAPAELIMINADA', 'Conexión de mapa eliminada'),
    ('CONTENIDOINSTITUCIONALACTUALIZADO', 'Contenido institucional actualizado'),
    ('CONTRASENAACTUALIZADA', 'Contraseña actualizada'),
    ('CUENTAREGISTRADA', 'Cuenta registrada'),
    ('EMPLEADOCREADO', 'Empleado creado'),
    ('ESTADOBICICLETAACTUALIZADO', 'Estado de bicicleta actualizado'),
    ('EVENTOACTUALIZADO', 'Evento actualizado'),
    ('EVENTOCANCELADO', 'Evento cancelado'),
    ('EVENTOCERRADO', 'Evento cerrado'),
    ('EVENTOCREADO', 'Evento creado'),
    ('EVENTOFINALIZADO', 'Evento finalizado'),
    ('EVENTOPUBLICADO', 'Evento publicado'),
    ('IMAGENAREAACTUALIZADA', 'Imagen de área actualizada'),
    ('IMAGENAREAELIMINADA', 'Imagen de área eliminada'),
    ('IMAGENEVENTOACTUALIZADA', 'Imagen de evento actualizada'),
    ('IMAGENEVENTOELIMINADA', 'Imagen de evento eliminada'),
    ('IMAGENPUBLICACIONAGREGADA', 'Imagen de publicación agregada'),
    ('IMAGENPUBLICACIONELIMINADA', 'Imagen de publicación eliminada'),
    ('INICIOSESION', 'Inicio de sesión'),
    ('INSCRIPCIONEVENTOCANCELADA', 'Inscripción de evento cancelada'),
    ('INSCRIPCIONEVENTOCONFIRMADA', 'Inscripción de evento confirmada'),
    ('NODOMAPAACTUALIZADO', 'Nodo de mapa actualizado'),
    ('NODOMAPACREADO', 'Nodo de mapa creado'),
    ('NODOMAPAELIMINADO', 'Nodo de mapa eliminado'),
    ('PUBLICACIONACTUALIZADA', 'Publicación actualizada'),
    ('PUBLICACIONARCHIVADA', 'Publicación archivada'),
    ('PUBLICACIONCREADA', 'Publicación creada'),
    ('PUBLICACIONDESARCHIVADA', 'Publicación desarchivada'),
    ('PUBLICACIONELIMINADA', 'Publicación eliminada'),
    ('PUBLICACIONPUBLICADA', 'Publicación publicada'),
    ('RESERVAAREAACTUALIZADA', 'Reserva de área actualizada'),
    ('RESERVAAREACREADA', 'Reserva de área creada'),
    ('ROLCREADO', 'Rol creado'),
    ('ROLESUSUARIOACTUALIZADOS', 'Roles de usuario actualizados')
) etiquetas(Codigo, Etiqueta) ON etiquetas.Codigo = evento.CodigoAccion;

UPDATE evento
SET TipoRecurso = etiquetas.Etiqueta
FROM dbo.EventosAuditoria evento
INNER JOIN (VALUES
    ('AREA', 'Área'),
    ('BICICLETA', 'Bicicleta'),
    ('CATEGORIAAREA', 'Categoría de área'),
    ('CATEGORIAPUBLICACION', 'Categoría de publicación'),
    ('CONEXIONMAPA', 'Conexión de mapa'),
    ('CONTENIDOINSTITUCIONAL', 'Contenido institucional'),
    ('EVENTO', 'Evento'),
    ('INSCRIPCIONEVENTO', 'Inscripción de evento'),
    ('NODOMAPA', 'Nodo de mapa'),
    ('PUBLICACION', 'Publicación'),
    ('RESERVAAREA', 'Reserva de área'),
    ('ROL', 'Rol'),
    ('SESION', 'Sesión'),
    ('USUARIO', 'Usuario')
) etiquetas(Codigo, Etiqueta) ON etiquetas.Codigo = evento.TipoRecurso;

UPDATE dbo.EventosAuditoria
SET Resultado = CASE Resultado
    WHEN 'EXITOSO' THEN 'Exitoso'
    WHEN 'DENEGADO' THEN 'Denegado'
    WHEN 'FALLIDO' THEN 'Fallido'
    ELSE Resultado
END;

ALTER TABLE dbo.EventosAuditoria
    ADD CONSTRAINT CKEventosAuditoriaResultado
        CHECK (Resultado IN ('Exitoso', 'Denegado', 'Fallido'));

ENABLE TRIGGER dbo.TR_EventosAuditoriaInmutable ON dbo.EventosAuditoria;

GO

ALTER TABLE dbo.IntentosInicioSesion
    DROP CONSTRAINT CKIntentosInicioSesionResultado;

UPDATE dbo.IntentosInicioSesion
SET Resultado = CASE Resultado
    WHEN 'EXITOSO' THEN 'Exitoso'
    WHEN 'FALLIDO' THEN 'Fallido'
    WHEN 'LIMITADO' THEN 'Limitado'
    WHEN 'BLOQUEADO' THEN 'Bloqueado'
    ELSE Resultado
END,
MotivoFallo = CASE MotivoFallo
    WHEN 'CREDENCIALESINVALIDAS' THEN 'Credenciales inválidas'
    WHEN 'LIMITEALCANZADO' THEN 'Límite alcanzado'
    ELSE MotivoFallo
END;

ALTER TABLE dbo.IntentosInicioSesion
    ADD CONSTRAINT CKIntentosInicioSesionResultado
        CHECK (Resultado IN ('Exitoso', 'Fallido', 'Limitado', 'Bloqueado'));

GO

;WITH CategoriasOrdenadas AS (
    SELECT
        IdCategoriaPublicacion,
        ROW_NUMBER() OVER (
            ORDER BY OrdenVisualizacion, Nombre, IdCategoriaPublicacion
        ) AS NuevoOrden
    FROM dbo.CategoriasPublicacion
)
UPDATE categoria
SET OrdenVisualizacion = ordenada.NuevoOrden
FROM dbo.CategoriasPublicacion categoria
INNER JOIN CategoriasOrdenadas ordenada
    ON ordenada.IdCategoriaPublicacion = categoria.IdCategoriaPublicacion;

ALTER TABLE dbo.CategoriasPublicacion
DROP CONSTRAINT CKCategoriasPublicacionOrden;

ALTER TABLE dbo.CategoriasPublicacion
ADD CONSTRAINT CKCategoriasPublicacionOrden
CHECK (OrdenVisualizacion >= 1);

ALTER TABLE dbo.CategoriasPublicacion
ADD CONSTRAINT UQCategoriasPublicacionOrdenVisualizacion
UNIQUE (OrdenVisualizacion);

GO

CREATE TABLE dbo.ImagenesEvento (
    IdImagenEvento BIGINT IDENTITY(1,1) NOT NULL,
    IdEvento BIGINT NOT NULL,
    ClaveAlmacenamiento NVARCHAR(500) NOT NULL,
    NombreArchivoOriginal NVARCHAR(255) NOT NULL,
    TipoMedio VARCHAR(100) NOT NULL,
    TamanoBytes BIGINT NOT NULL,
    AnchoPixeles INT NOT NULL,
    AltoPixeles INT NOT NULL,
    OrdenVisualizacion SMALLINT NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFImagenesEventoCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKImagenesEvento PRIMARY KEY (IdImagenEvento),
    CONSTRAINT FKImagenesEventoEvento FOREIGN KEY (IdEvento)
        REFERENCES dbo.Eventos (IdEvento) ON DELETE CASCADE,
    CONSTRAINT CKImagenesEventoTamano CHECK (TamanoBytes > 0),
    CONSTRAINT CKImagenesEventoDimensiones CHECK (AnchoPixeles > 0 AND AltoPixeles > 0),
    CONSTRAINT CKImagenesEventoOrden CHECK (OrdenVisualizacion >= 1)
);

CREATE INDEX IXImagenesEventoEventoOrden
    ON dbo.ImagenesEvento (IdEvento, OrdenVisualizacion, IdImagenEvento);

GO

ALTER TABLE dbo.InscripcionesEvento
ADD RespuestasFormularioJson NVARCHAR(MAX) NULL;

GO

ALTER TABLE dbo.InscripcionesEvento
ADD CONSTRAINT CKInscripcionesEventoRespuestasFormularioJson
CHECK (RespuestasFormularioJson IS NULL OR ISJSON(RespuestasFormularioJson) = 1);

GO

ALTER TABLE dbo.Usuarios
ADD Dpi VARCHAR(13) NULL,
    Celular VARCHAR(8) NULL,
    FechaNacimiento DATE NULL;

GO

ALTER TABLE dbo.Usuarios
ADD CONSTRAINT CKUsuariosDpi
        CHECK (Dpi IS NULL OR (LEN(Dpi) = 13 AND Dpi NOT LIKE '%[^0-9]%')),
    CONSTRAINT CKUsuariosCelular
        CHECK (Celular IS NULL OR (LEN(Celular) = 8 AND Celular NOT LIKE '%[^0-9]%'));

CREATE UNIQUE INDEX UQUsuariosDpi
    ON dbo.Usuarios (Dpi)
    WHERE Dpi IS NOT NULL;

GO

ALTER TABLE dbo.Solicitudes
DROP CONSTRAINT CKSolicitudesEstado;

ALTER TABLE dbo.Solicitudes
ADD CONSTRAINT CKSolicitudesEstado
    CHECK (Estado IN ('BORRADOR', 'ENVIADA', 'ENREVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA'));

GO

CREATE TABLE dbo.SolicitudesDocumentos (
    IdSolicitudDocumento BIGINT IDENTITY(1, 1) NOT NULL,
    IdSolicitud BIGINT NOT NULL,
    IdDocumento BIGINT NOT NULL,
    CategoriaDocumento VARCHAR(64) NOT NULL,
    Obligatorio BIT NOT NULL CONSTRAINT DFSolicitudesDocumentosObligatorio DEFAULT 0,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesDocumentosCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKSolicitudesDocumentos PRIMARY KEY (IdSolicitudDocumento),
    CONSTRAINT FKSolicitudesDocumentosSolicitud FOREIGN KEY (IdSolicitud)
        REFERENCES dbo.Solicitudes (IdSolicitud),
    CONSTRAINT FKSolicitudesDocumentosDocumento FOREIGN KEY (IdDocumento)
        REFERENCES dbo.Documentos (IdDocumento),
    CONSTRAINT UQSolicitudesDocumentosDocumento UNIQUE (IdDocumento),
    CONSTRAINT CKSolicitudesDocumentosCategoria CHECK (
        CategoriaDocumento IN ('RESPALDOACTIVIDAD')
    )
);

CREATE INDEX IXSolicitudesDocumentosSolicitud
    ON dbo.SolicitudesDocumentos (IdSolicitud, CreadoEn, IdSolicitudDocumento);

ALTER TABLE dbo.Eventos
ADD ConfiguracionGruposJson NVARCHAR(MAX) NULL;
GO

ALTER TABLE dbo.Eventos
ADD CONSTRAINT CKEventosConfiguracionGruposJson
    CHECK (ConfiguracionGruposJson IS NULL OR ISJSON(ConfiguracionGruposJson) = 1);

ALTER TABLE dbo.InscripcionesEvento
ADD GrupoSeleccionadoCodigo VARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM dbo.Permisos WHERE Codigo = 'SOLICITUDGESTIONAR')
BEGIN
    INSERT INTO dbo.Permisos (Codigo, Descripcion)
    VALUES ('SOLICITUDGESTIONAR', N'Gestionar solicitudes de uso de instalaciones.');
END;

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'SOLICITUDGESTIONAR'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolesPermisos Existente
      WHERE Existente.IdRol = Rol.IdRol
        AND Existente.IdPermiso = Permiso.IdPermiso
  );

GO

DELETE RolPermiso
FROM dbo.RolesPermisos RolPermiso
INNER JOIN dbo.Roles Rol
    ON Rol.IdRol = RolPermiso.IdRol
INNER JOIN dbo.Permisos Permiso
    ON Permiso.IdPermiso = RolPermiso.IdPermiso
WHERE Rol.Codigo = 'USUARIOREGISTRADO'
  AND Permiso.Codigo IN (
      'PUBLICACIONLEER',
      'EVENTOLEER',
      'AREALEER',
      'BICICLETALEER'
  );

GO

