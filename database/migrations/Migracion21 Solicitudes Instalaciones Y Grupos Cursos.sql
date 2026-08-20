CREATE TABLE dbo.SolicitudesDocumentos (
    IdSolicitudDocumento BIGINT IDENTITY(1, 1) NOT NULL,
    IdSolicitud BIGINT NOT NULL,
    IdDocumento BIGINT NOT NULL,
    CategoriaDocumento VARCHAR(64) NOT NULL,
    Obligatorio BIT NOT NULL CONSTRAINT DFSolicitudesDocumentosObligatorio DEFAULT 0,
    CreadoEn DATETIME2(6) NOT NULL CONSTRAINT DFSolicitudesDocumentosCreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PKSolicitudesDocumentos PRIMARY KEY (IdSolicitudDocumento),
    CONSTRAINT FKSolicitudesDocumentosSolicitud FOREIGN KEY (IdSolicitud)
        REFERENCES dbo.Solicitudes (IdSolicitud),
    CONSTRAINT FKSolicitudesDocumentosDocumento FOREIGN KEY (IdDocumento)
        REFERENCES dbo.Documentos (IdDocumento),
    CONSTRAINT UQSolicitudesDocumentosDocumento UNIQUE (IdDocumento),
    CONSTRAINT CKSolicitudesDocumentosCategoria CHECK (
        CategoriaDocumento IN ('RESPALDOACTIVIDAD')
    )
);

CREATE INDEX IXSolicitudesDocumentosSolicitud
    ON dbo.SolicitudesDocumentos (IdSolicitud, CreadoEn, IdSolicitudDocumento);

ALTER TABLE dbo.Eventos
ADD ConfiguracionGruposJson NVARCHAR(MAX) NULL;
GO

ALTER TABLE dbo.Eventos
ADD CONSTRAINT CKEventosConfiguracionGruposJson
    CHECK (ConfiguracionGruposJson IS NULL OR ISJSON(ConfiguracionGruposJson) = 1);

ALTER TABLE dbo.InscripcionesEvento
ADD GrupoSeleccionadoCodigo VARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM dbo.Permisos WHERE Codigo = 'SOLICITUDGESTIONAR')
BEGIN
    INSERT INTO dbo.Permisos (Codigo, Descripcion)
    VALUES ('SOLICITUDGESTIONAR', N'Gestionar solicitudes de uso de instalaciones.');
END;

INSERT INTO dbo.RolesPermisos (IdRol, IdPermiso)
SELECT Rol.IdRol, Permiso.IdPermiso
FROM dbo.Roles Rol
CROSS JOIN dbo.Permisos Permiso
WHERE Rol.Codigo = 'ADMINISTRADOR'
  AND Permiso.Codigo = 'SOLICITUDGESTIONAR'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolesPermisos Existente
      WHERE Existente.IdRol = Rol.IdRol
        AND Existente.IdPermiso = Permiso.IdPermiso
  );
