CREATE TABLE dbo.CategoriasTramite (
    IdCategoriaTramite BIGINT IDENTITY(1,1) NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Nombre NVARCHAR(160) NOT NULL,
    OrdenVisualizacion SMALLINT NOT NULL,
    Activa BIT NOT NULL CONSTRAINT DFCategoriasTramiteActiva DEFAULT 1,
    CONSTRAINT PKCategoriasTramite PRIMARY KEY (IdCategoriaTramite),
    CONSTRAINT UQCategoriasTramiteCodigo UNIQUE (Codigo),
    CONSTRAINT CKCategoriasTramiteOrden CHECK (OrdenVisualizacion > 0)
);

CREATE TABLE dbo.Tramites (
    IdTramite BIGINT IDENTITY(1,1) NOT NULL,
    IdCategoriaTramite BIGINT NOT NULL,
    Codigo VARCHAR(64) NOT NULL,
    Nombre NVARCHAR(180) NOT NULL,
    Resumen NVARCHAR(500) NOT NULL,
    Acerca NVARCHAR(MAX) NOT NULL,
    RequisitosJson NVARCHAR(MAX) NOT NULL,
    DocumentosRequeridosJson NVARCHAR(MAX) NOT NULL,
    Costo NVARCHAR(180) NOT NULL,
    TiempoRespuesta NVARCHAR(180) NOT NULL,
    RequiereReserva BIT NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DFTramitesActivo DEFAULT 1,
    ClavePortada NVARCHAR(500) NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFTramitesCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFTramitesActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFTramitesVersion DEFAULT 0,
    CONSTRAINT PKTramites PRIMARY KEY (IdTramite),
    CONSTRAINT FKTramitesCategoria FOREIGN KEY (IdCategoriaTramite)
        REFERENCES dbo.CategoriasTramite (IdCategoriaTramite),
    CONSTRAINT UQTramitesCodigo UNIQUE (Codigo),
    CONSTRAINT CKTramitesRequisitosJson CHECK (ISJSON(RequisitosJson) = 1),
    CONSTRAINT CKTramitesDocumentosJson CHECK (ISJSON(DocumentosRequeridosJson) = 1)
);

CREATE INDEX IXTramitesCategoriaActivo
    ON dbo.Tramites (IdCategoriaTramite, Activo, Nombre);

CREATE TABLE dbo.ResenasTramite (
    IdResenaTramite BIGINT IDENTITY(1,1) NOT NULL,
    IdTramite BIGINT NOT NULL,
    IdUsuario BIGINT NOT NULL,
    Estrellas TINYINT NOT NULL,
    Comentario NVARCHAR(1000) NOT NULL,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFResenasTramiteCreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFResenasTramiteActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFResenasTramiteVersion DEFAULT 0,
    CONSTRAINT PKResenasTramite PRIMARY KEY (IdResenaTramite),
    CONSTRAINT FKResenasTramiteTramite FOREIGN KEY (IdTramite) REFERENCES dbo.Tramites (IdTramite),
    CONSTRAINT FKResenasTramiteUsuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (IdUsuario),
    CONSTRAINT UQResenasTramiteUsuario UNIQUE (IdTramite, IdUsuario),
    CONSTRAINT CKResenasTramiteEstrellas CHECK (Estrellas BETWEEN 1 AND 5)
);

CREATE INDEX IXResenasTramiteActualizacion
    ON dbo.ResenasTramite (IdTramite, ActualizadoEn DESC, IdResenaTramite DESC);

INSERT INTO dbo.CategoriasTramite (Codigo, Nombre, OrdenVisualizacion, Activa)
VALUES
    ('RESERVASINSTALACIONES', N'Reservas y uso de instalaciones', 1, 1),
    ('ATENCIONCIUDADANA', N'Atención ciudadana', 2, 1);

DECLARE @IdReservas BIGINT = (
    SELECT IdCategoriaTramite FROM dbo.CategoriasTramite WHERE Codigo = 'RESERVASINSTALACIONES'
);
DECLARE @IdAtencion BIGINT = (
    SELECT IdCategoriaTramite FROM dbo.CategoriasTramite WHERE Codigo = 'ATENCIONCIUDADANA'
);

INSERT INTO dbo.Tramites (
    IdCategoriaTramite, Codigo, Nombre, Resumen, Acerca, RequisitosJson,
    DocumentosRequeridosJson, Costo, TiempoRespuesta, RequiereReserva, Activo)
VALUES
    (@IdReservas, 'RESERVACANCHAS', N'Reserva de canchas',
     N'Solicita el uso temporal de una cancha registrada en el Parque Erick Barrondo.',
     N'Permite solicitar una cancha para actividades recreativas o deportivas. La disponibilidad será comprobada por la administración antes de aprobar.',
     N'["Información de la persona solicitante","Tipo de reserva, cancha, actividad, fecha y horario","Nombre de la persona responsable"]',
     N'["DPI de la persona solicitante o representante legal en formato PDF"]',
     N'Q 0.00 (sin costo)', N'Revisión administrativa', 1, 1),
    (@IdReservas, 'RESERVAAREAS', N'Reserva de áreas recreativas',
     N'Solicita el uso temporal de un área recreativa o instalación del parque.',
     N'Permite solicitar áreas recreativas para una actividad programada. La solicitud no constituye una reserva hasta ser aprobada.',
     N'["Información de la persona solicitante","Área, actividad, fecha y horario","Cantidad estimada de asistentes"]',
     N'["DPI de la persona solicitante o representante legal en formato PDF"]',
     N'Q 0.00 (sin costo)', N'Revisión administrativa', 1, 1),
    (@IdAtencion, 'DENUNCIASQUEJAS', N'Denuncias y quejas',
     N'Informa una situación o presenta una queja relacionada con los servicios del parque.',
     N'Canal de atención para comunicar hechos, inconformidades o situaciones que necesiten seguimiento por la administración del Parque Erick Barrondo.',
     N'["Tipo de reporte","Asunto","Descripción clara de lo sucedido"]',
     N'[]', N'Sin costo', N'Revisión administrativa', 0, 1);

ALTER TABLE dbo.SolicitudesDocumentos
DROP CONSTRAINT CKSolicitudesDocumentosCategoria;

ALTER TABLE dbo.SolicitudesDocumentos
ADD CONSTRAINT CKSolicitudesDocumentosCategoria CHECK (
    CategoriaDocumento IN ('RESPALDOACTIVIDAD', 'DPISOLICITANTE')
);
