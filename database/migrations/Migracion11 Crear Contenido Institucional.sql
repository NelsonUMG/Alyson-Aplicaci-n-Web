CREATE TABLE dbo.ContenidoInstitucional (
    IdContenidoInstitucional BIGINT NOT NULL,
    Resumen NVARCHAR(1000) NOT NULL,
    Mision NVARCHAR(4000) NOT NULL,
    Vision NVARCHAR(4000) NOT NULL,
    Valores NVARCHAR(4000) NOT NULL,
    ActualizadoPor BIGINT NULL,
    ActualizadoEn DATETIME2(6) NOT NULL CONSTRAINT DFContenidoInstitucionalActualizadoEn DEFAULT SYSUTCDATETIME(),
    Version BIGINT NOT NULL CONSTRAINT DFContenidoInstitucionalVersion DEFAULT 0,
    CONSTRAINT PKContenidoInstitucional PRIMARY KEY (IdContenidoInstitucional),
    CONSTRAINT CKContenidoInstitucionalUnico CHECK (IdContenidoInstitucional = 1),
    CONSTRAINT CKContenidoInstitucionalVersion CHECK (Version >= 0),
    CONSTRAINT FKContenidoInstitucionalActualizadoPor FOREIGN KEY (ActualizadoPor) REFERENCES dbo.Usuarios (IdUsuario)
);

INSERT INTO dbo.ContenidoInstitucional (IdContenidoInstitucional, Resumen, Mision, Vision, Valores)
VALUES (
    1,
    N'El Centro Deportivo Erick Bernabé Barrondo García es un espacio público de recreación, deporte y naturaleza en la Ciudad de Guatemala. Sus áreas deportivas, ciclovía, juegos y espacios familiares permiten una convivencia activa y gratuita.',
    N'Promover el deporte, la recreación y la convivencia familiar mediante espacios accesibles, seguros e inclusivos para la comunidad.',
    N'Ser un referente de bienestar, inclusión y desarrollo deportivo para las familias de Guatemala.',
    N'Inclusión, respeto, bienestar, convivencia, seguridad y cuidado de la naturaleza.'
);

INSERT INTO dbo.Permisos (Codigo, Descripcion)
VALUES ('INSTITUCIONALGESTIONAR', N'Gestionar contenido institucional.');

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'INSTITUCIONALGESTIONAR';
