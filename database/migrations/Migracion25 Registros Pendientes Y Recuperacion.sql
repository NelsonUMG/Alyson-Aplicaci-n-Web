CREATE TABLE dbo.RegistrosPendientes (
    IdRegistroPendiente BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CorreoNormalizado VARCHAR(254) NOT NULL UNIQUE,
    Nombre NVARCHAR(80) NOT NULL,
    Apellido NVARCHAR(80) NOT NULL,
    Dpi VARCHAR(13) NULL,
    Celular VARCHAR(8) NULL,
    FechaNacimiento DATE NULL,
    HashContrasena VARCHAR(255) NOT NULL,
    HashToken VARBINARY(32) NOT NULL UNIQUE,
    CreadoEn DATETIME2(6) NOT NULL,
    ExpiraEn DATETIME2(6) NOT NULL,
    CONSTRAINT CKRegistrosPendientesExpiracion CHECK (ExpiraEn > CreadoEn)
);
CREATE INDEX IXRegistrosPendientesExpiracion ON dbo.RegistrosPendientes (ExpiraEn);
-- Vincula cada recuperación a la contraseña vigente al emitir el enlace.
ALTER TABLE dbo.TokensRestablecimientoContrasena ADD HashContrasenaAlEmitir VARCHAR(255) NULL;
UPDATE dbo.TokensRestablecimientoContrasena SET ConsumidoEn = SYSUTCDATETIME() WHERE ConsumidoEn IS NULL;
