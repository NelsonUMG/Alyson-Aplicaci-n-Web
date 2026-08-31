ALTER TABLE dbo.Usuarios
ADD DpiExtendidoEn NVARCHAR(120) NULL,
    Telefono VARCHAR(24) NULL,
    Direccion NVARCHAR(300) NULL,
    ClaveFotoPerfil VARCHAR(200) NULL;

GO

ALTER TABLE dbo.Usuarios
ADD CONSTRAINT CKUsuariosTelefono
        CHECK (Telefono IS NULL OR LEN(Telefono) BETWEEN 7 AND 24),
    CONSTRAINT CKUsuariosClaveFotoPerfil
        CHECK (ClaveFotoPerfil IS NULL OR LEN(ClaveFotoPerfil) BETWEEN 1 AND 200);
