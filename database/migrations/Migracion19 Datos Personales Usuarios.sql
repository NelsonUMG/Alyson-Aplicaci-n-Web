ALTER TABLE dbo.Usuarios
ADD Dpi VARCHAR(13) NULL,
    Celular VARCHAR(8) NULL,
    FechaNacimiento DATE NULL;

GO

ALTER TABLE dbo.Usuarios
ADD CONSTRAINT CKUsuariosDpi
        CHECK (Dpi IS NULL OR (LEN(Dpi) = 13 AND Dpi NOT LIKE '%[^0-9]%')),
    CONSTRAINT CKUsuariosCelular
        CHECK (Celular IS NULL OR (LEN(Celular) = 8 AND Celular NOT LIKE '%[^0-9]%'));

CREATE UNIQUE INDEX UQUsuariosDpi
    ON dbo.Usuarios (Dpi)
    WHERE Dpi IS NOT NULL;
