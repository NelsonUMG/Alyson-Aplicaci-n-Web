ALTER TABLE dbo.Eventos ADD CursoContinuo BIT NOT NULL CONSTRAINT DFEventosCursoContinuo DEFAULT 0;
GO
ALTER TABLE dbo.InscripcionesEvento ADD
    ClaveParticipante VARCHAR(64) NOT NULL CONSTRAINT DFInscripcionesClaveParticipante DEFAULT 'TITULAR',
    NombreParticipante NVARCHAR(120) NULL,
    ApellidoParticipante NVARCHAR(120) NULL,
    NacimientoParticipante DATE NULL;
GO
ALTER TABLE dbo.InscripcionesEvento DROP CONSTRAINT UQInscripcionesEventoUsuario;
GO
ALTER TABLE dbo.InscripcionesEvento ADD CONSTRAINT UQInscripcionesEventoParticipante UNIQUE (IdEvento, IdUsuario, ClaveParticipante);
GO
ALTER TABLE dbo.Solicitudes ADD ResueltoPor BIGINT NULL, NombreResponsableResolucion NVARCHAR(250) NULL;
GO
ALTER TABLE dbo.Solicitudes ADD CONSTRAINT FKSolicitudesResueltoPor FOREIGN KEY (ResueltoPor) REFERENCES dbo.Usuarios(IdUsuario);
GO

-- Recuperar el responsable de resoluciones anteriores cuando existe una entrada de bitácora.
UPDATE s SET ResueltoPor = a.IdUsuarioActor, NombreResponsableResolucion = u.Nombre + N' ' + u.Apellido
FROM dbo.Solicitudes s
CROSS APPLY (SELECT TOP (1) e.IdUsuarioActor FROM dbo.EventosAuditoria e
    WHERE e.TipoRecurso = 'SOLICITUD' AND e.IdRecurso = CONVERT(VARCHAR(80), s.IdSolicitud)
      AND e.CodigoAccion IN ('SOLICITUDAPROBADA', 'SOLICITUDRECHAZADA') AND e.Resultado = 'EXITOSO'
    ORDER BY e.OcurridoEn DESC, e.IdEventoAuditoria DESC) a
JOIN dbo.Usuarios u ON u.IdUsuario = a.IdUsuarioActor
WHERE s.Estado IN ('APROBADA', 'RECHAZADA');
GO

