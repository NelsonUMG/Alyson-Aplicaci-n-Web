ALTER TABLE dbo.IntentosInicioSesion
    DROP CONSTRAINT CKIntentosInicioSesionResultado;

UPDATE dbo.IntentosInicioSesion
SET Resultado = CASE Resultado
    WHEN 'EXITOSO' THEN 'Exitoso'
    WHEN 'FALLIDO' THEN 'Fallido'
    WHEN 'LIMITADO' THEN 'Limitado'
    WHEN 'BLOQUEADO' THEN 'Bloqueado'
    ELSE Resultado
END,
MotivoFallo = CASE MotivoFallo
    WHEN 'CREDENCIALESINVALIDAS' THEN 'Credenciales inválidas'
    WHEN 'LIMITEALCANZADO' THEN 'Límite alcanzado'
    ELSE MotivoFallo
END;

ALTER TABLE dbo.IntentosInicioSesion
    ADD CONSTRAINT CKIntentosInicioSesionResultado
        CHECK (Resultado IN ('Exitoso', 'Fallido', 'Limitado', 'Bloqueado'));
