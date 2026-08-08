CREATE INDEX IXEventosAuditoriaFecha
    ON dbo.EventosAuditoria (OcurridoEn DESC, IdEventoAuditoria DESC)
    INCLUDE (CodigoAccion, TipoRecurso, IdRecurso, Resultado, IdUsuarioActor, IdCorrelacion);

GO

CREATE TRIGGER dbo.TR_EventosAuditoriaInmutable
ON dbo.EventosAuditoria
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51000, 'Los eventos de auditoría son inmutables.', 1;
END;
