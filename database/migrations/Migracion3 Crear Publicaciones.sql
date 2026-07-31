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
