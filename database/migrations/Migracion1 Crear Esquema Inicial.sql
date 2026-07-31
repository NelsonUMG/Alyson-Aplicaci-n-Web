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
