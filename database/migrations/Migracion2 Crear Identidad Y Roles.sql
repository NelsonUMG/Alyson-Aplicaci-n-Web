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
