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
