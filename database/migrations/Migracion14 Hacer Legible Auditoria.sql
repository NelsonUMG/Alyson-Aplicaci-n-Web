DISABLE TRIGGER dbo.TR_EventosAuditoriaInmutable ON dbo.EventosAuditoria;

ALTER TABLE dbo.EventosAuditoria
    DROP CONSTRAINT CKEventosAuditoriaResultado;

UPDATE evento
SET CodigoAccion = etiquetas.Etiqueta
FROM dbo.EventosAuditoria evento
INNER JOIN (VALUES
    ('ADMINISTRADORINICIALCREADO', 'Administrador inicial creado'),
    ('AREAACTUALIZADA', 'Área actualizada'),
    ('AREACREADA', 'Área creada'),
    ('AREAELIMINADA', 'Área eliminada'),
    ('BICICLETACREADA', 'Bicicleta creada'),
    ('BICICLETAINVENTARIOACTUALIZADO', 'Inventario de bicicleta actualizado'),
    ('CATEGORIAAREAACTUALIZADA', 'Categoría de área actualizada'),
    ('CATEGORIAAREACREADA', 'Categoría de área creada'),
    ('CATEGORIAPUBLICACIONACTUALIZADA', 'Categoría de publicación actualizada'),
    ('CATEGORIAPUBLICACIONCREADA', 'Categoría de publicación creada'),
    ('CIERRESESION', 'Cierre de sesión'),
    ('CONEXIONMAPAACTUALIZADA', 'Conexión de mapa actualizada'),
    ('CONEXIONMAPACREADA', 'Conexión de mapa creada'),
    ('CONEXIONMAPAELIMINADA', 'Conexión de mapa eliminada'),
    ('CONTENIDOINSTITUCIONALACTUALIZADO', 'Contenido institucional actualizado'),
    ('CONTRASENAACTUALIZADA', 'Contraseña actualizada'),
    ('CUENTAREGISTRADA', 'Cuenta registrada'),
    ('EMPLEADOCREADO', 'Empleado creado'),
    ('ESTADOBICICLETAACTUALIZADO', 'Estado de bicicleta actualizado'),
    ('EVENTOACTUALIZADO', 'Evento actualizado'),
    ('EVENTOCANCELADO', 'Evento cancelado'),
    ('EVENTOCERRADO', 'Evento cerrado'),
    ('EVENTOCREADO', 'Evento creado'),
    ('EVENTOFINALIZADO', 'Evento finalizado'),
    ('EVENTOPUBLICADO', 'Evento publicado'),
    ('IMAGENAREAACTUALIZADA', 'Imagen de área actualizada'),
    ('IMAGENAREAELIMINADA', 'Imagen de área eliminada'),
    ('IMAGENEVENTOACTUALIZADA', 'Imagen de evento actualizada'),
    ('IMAGENEVENTOELIMINADA', 'Imagen de evento eliminada'),
    ('IMAGENPUBLICACIONAGREGADA', 'Imagen de publicación agregada'),
    ('IMAGENPUBLICACIONELIMINADA', 'Imagen de publicación eliminada'),
    ('INICIOSESION', 'Inicio de sesión'),
    ('INSCRIPCIONEVENTOCANCELADA', 'Inscripción de evento cancelada'),
    ('INSCRIPCIONEVENTOCONFIRMADA', 'Inscripción de evento confirmada'),
    ('NODOMAPAACTUALIZADO', 'Nodo de mapa actualizado'),
    ('NODOMAPACREADO', 'Nodo de mapa creado'),
    ('NODOMAPAELIMINADO', 'Nodo de mapa eliminado'),
    ('PUBLICACIONACTUALIZADA', 'Publicación actualizada'),
    ('PUBLICACIONARCHIVADA', 'Publicación archivada'),
    ('PUBLICACIONCREADA', 'Publicación creada'),
    ('PUBLICACIONDESARCHIVADA', 'Publicación desarchivada'),
    ('PUBLICACIONELIMINADA', 'Publicación eliminada'),
    ('PUBLICACIONPUBLICADA', 'Publicación publicada'),
    ('RESERVAAREAACTUALIZADA', 'Reserva de área actualizada'),
    ('RESERVAAREACREADA', 'Reserva de área creada'),
    ('ROLCREADO', 'Rol creado'),
    ('ROLESUSUARIOACTUALIZADOS', 'Roles de usuario actualizados')
) etiquetas(Codigo, Etiqueta) ON etiquetas.Codigo = evento.CodigoAccion;

UPDATE evento
SET TipoRecurso = etiquetas.Etiqueta
FROM dbo.EventosAuditoria evento
INNER JOIN (VALUES
    ('AREA', 'Área'),
    ('BICICLETA', 'Bicicleta'),
    ('CATEGORIAAREA', 'Categoría de área'),
    ('CATEGORIAPUBLICACION', 'Categoría de publicación'),
    ('CONEXIONMAPA', 'Conexión de mapa'),
    ('CONTENIDOINSTITUCIONAL', 'Contenido institucional'),
    ('EVENTO', 'Evento'),
    ('INSCRIPCIONEVENTO', 'Inscripción de evento'),
    ('NODOMAPA', 'Nodo de mapa'),
    ('PUBLICACION', 'Publicación'),
    ('RESERVAAREA', 'Reserva de área'),
    ('ROL', 'Rol'),
    ('SESION', 'Sesión'),
    ('USUARIO', 'Usuario')
) etiquetas(Codigo, Etiqueta) ON etiquetas.Codigo = evento.TipoRecurso;

UPDATE dbo.EventosAuditoria
SET Resultado = CASE Resultado
    WHEN 'EXITOSO' THEN 'Exitoso'
    WHEN 'DENEGADO' THEN 'Denegado'
    WHEN 'FALLIDO' THEN 'Fallido'
    ELSE Resultado
END;

ALTER TABLE dbo.EventosAuditoria
    ADD CONSTRAINT CKEventosAuditoriaResultado
        CHECK (Resultado IN ('Exitoso', 'Denegado', 'Fallido'));

ENABLE TRIGGER dbo.TR_EventosAuditoriaInmutable ON dbo.EventosAuditoria;
