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
