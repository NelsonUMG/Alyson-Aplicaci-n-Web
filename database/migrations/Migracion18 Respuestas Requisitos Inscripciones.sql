ALTER TABLE dbo.InscripcionesEvento
ADD RespuestasFormularioJson NVARCHAR(MAX) NULL;

GO

ALTER TABLE dbo.InscripcionesEvento
ADD CONSTRAINT CKInscripcionesEventoRespuestasFormularioJson
CHECK (RespuestasFormularioJson IS NULL OR ISJSON(RespuestasFormularioJson) = 1);
