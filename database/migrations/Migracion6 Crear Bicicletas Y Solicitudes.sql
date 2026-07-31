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
