CREATE TABLE dbo.ConfiguracionApariencia (
    Id int NOT NULL CONSTRAINT PKConfiguracionApariencia PRIMARY KEY,
    ColorPrincipal varchar(7) NOT NULL,
    ClavePortada nvarchar(500) NULL,
    TipoPortada varchar(100) NULL,
    Version bigint NOT NULL DEFAULT 0,
    CONSTRAINT CKConfiguracionAparienciaUnica CHECK (Id = 1)
);
INSERT dbo.ConfiguracionApariencia (Id, ColorPrincipal) VALUES (1, '#0b4536');
