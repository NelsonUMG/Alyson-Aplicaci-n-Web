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
