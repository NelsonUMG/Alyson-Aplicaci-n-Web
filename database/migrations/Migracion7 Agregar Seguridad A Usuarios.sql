ALTER TABLE dbo.Usuarios
ADD TerminosAceptadosEn DATETIME2(6) NULL,
    UltimoAccesoEn DATETIME2(6) NULL;

CREATE INDEX IXUsuariosUltimoAccesoEn
    ON dbo.Usuarios (UltimoAccesoEn DESC, IdUsuario);
