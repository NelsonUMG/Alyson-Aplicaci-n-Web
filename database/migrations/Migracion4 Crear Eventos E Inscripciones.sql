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
