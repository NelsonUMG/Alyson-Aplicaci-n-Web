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
