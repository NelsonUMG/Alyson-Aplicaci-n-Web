package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

final class FormatoAuditoria {

    private static final Map<String, String> ACCIONES = Map.ofEntries(
            Map.entry("ADMINISTRADORINICIALCREADO", "Administrador inicial creado"),
            Map.entry("AREAACTUALIZADA", "Área actualizada"),
            Map.entry("AREACREADA", "Área creada"),
            Map.entry("AREAELIMINADA", "Área eliminada"),
            Map.entry("BICICLETACREADA", "Bicicleta creada"),
            Map.entry("BICICLETAINVENTARIOACTUALIZADO", "Inventario de bicicleta actualizado"),
            Map.entry("CATEGORIAAREAACTUALIZADA", "Categoría de área actualizada"),
            Map.entry("CATEGORIAAREACREADA", "Categoría de área creada"),
            Map.entry("CATEGORIAPUBLICACIONACTUALIZADA", "Categoría de publicación actualizada"),
            Map.entry("CATEGORIAPUBLICACIONCREADA", "Categoría de publicación creada"),
            Map.entry("CATEGORIAPUBLICACIONELIMINADA", "Categoría de publicación eliminada"),
            Map.entry("CIERRESESION", "Cierre de sesión"),
            Map.entry("CONEXIONMAPAACTUALIZADA", "Conexión de mapa actualizada"),
            Map.entry("CONEXIONMAPACREADA", "Conexión de mapa creada"),
            Map.entry("CONEXIONMAPAELIMINADA", "Conexión de mapa eliminada"),
            Map.entry("CONTENIDOINSTITUCIONALACTUALIZADO", "Contenido institucional actualizado"),
            Map.entry("CONTRASENAACTUALIZADA", "Contraseña actualizada"),
            Map.entry("CUENTAREGISTRADA", "Cuenta registrada"),
            Map.entry("EMPLEADOCREADO", "Empleado creado"),
            Map.entry("ESTADOBICICLETAACTUALIZADO", "Estado de bicicleta actualizado"),
            Map.entry("EVENTOACTUALIZADO", "Evento actualizado"),
            Map.entry("EVENTOCANCELADO", "Evento cancelado"),
            Map.entry("EVENTOCERRADO", "Evento cerrado"),
            Map.entry("EVENTOCREADO", "Evento creado"),
            Map.entry("EVENTOFINALIZADO", "Evento finalizado"),
            Map.entry("EVENTOPUBLICADO", "Evento publicado"),
            Map.entry("IMAGENAREAACTUALIZADA", "Imagen de área actualizada"),
            Map.entry("IMAGENAREAELIMINADA", "Imagen de área eliminada"),
            Map.entry("IMAGENEVENTOACTUALIZADA", "Imagen de evento actualizada"),
            Map.entry("IMAGENEVENTOELIMINADA", "Imagen de evento eliminada"),
            Map.entry("IMAGENPUBLICACIONAGREGADA", "Imagen de publicación agregada"),
            Map.entry("IMAGENPUBLICACIONELIMINADA", "Imagen de publicación eliminada"),
            Map.entry("INICIOSESION", "Inicio de sesión"),
            Map.entry("INSCRIPCIONEVENTOCANCELADA", "Inscripción de evento cancelada"),
            Map.entry("INSCRIPCIONEVENTOCONFIRMADA", "Inscripción de evento confirmada"),
            Map.entry("NODOMAPAACTUALIZADO", "Nodo de mapa actualizado"),
            Map.entry("NODOMAPACREADO", "Nodo de mapa creado"),
            Map.entry("NODOMAPAELIMINADO", "Nodo de mapa eliminado"),
            Map.entry("PUBLICACIONACTUALIZADA", "Publicación actualizada"),
            Map.entry("PUBLICACIONARCHIVADA", "Publicación archivada"),
            Map.entry("PUBLICACIONCREADA", "Publicación creada"),
            Map.entry("PUBLICACIONDESARCHIVADA", "Publicación desarchivada"),
            Map.entry("PUBLICACIONELIMINADA", "Publicación eliminada"),
            Map.entry("PUBLICACIONPUBLICADA", "Publicación publicada"),
            Map.entry("RESERVAAREAACTUALIZADA", "Reserva de área actualizada"),
            Map.entry("RESERVAAREACREADA", "Reserva de área creada"),
            Map.entry("ROLCREADO", "Rol creado"),
            Map.entry("ROLESUSUARIOACTUALIZADOS", "Roles de usuario actualizados"));

    private static final Map<String, String> RECURSOS = Map.ofEntries(
            Map.entry("AREA", "Área"),
            Map.entry("BICICLETA", "Bicicleta"),
            Map.entry("CATEGORIAAREA", "Categoría de área"),
            Map.entry("CATEGORIAPUBLICACION", "Categoría de publicación"),
            Map.entry("CONEXIONMAPA", "Conexión de mapa"),
            Map.entry("CONTENIDOINSTITUCIONAL", "Contenido institucional"),
            Map.entry("EVENTO", "Evento"),
            Map.entry("INSCRIPCIONEVENTO", "Inscripción de evento"),
            Map.entry("NODOMAPA", "Nodo de mapa"),
            Map.entry("PUBLICACION", "Publicación"),
            Map.entry("RESERVAAREA", "Reserva de área"),
            Map.entry("ROL", "Rol"),
            Map.entry("SESION", "Sesión"),
            Map.entry("USUARIO", "Usuario"));

    private static final Map<String, String> RESULTADOS = Map.of(
            "DENEGADO", "Denegado",
            "EXITOSO", "Exitoso",
            "FALLIDO", "Fallido");

    private FormatoAuditoria() {
    }

    static String accion(String valor) {
        return formatear(valor, ACCIONES);
    }

    static String recurso(String valor) {
        return formatear(valor, RECURSOS);
    }

    static String resultado(String valor) {
        return formatear(valor, RESULTADOS);
    }

    static String resultadoIntentoInicioSesion(String valor) {
        return switch (clave(valor)) {
            case "BLOQUEADO" -> "Bloqueado";
            case "EXITOSO" -> "Exitoso";
            case "FALLIDO" -> "Fallido";
            case "LIMITADO" -> "Limitado";
            default -> formatear(valor, Map.of());
        };
    }

    static String motivoIntentoInicioSesion(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return switch (clave(valor)) {
            case "CREDENCIALESINVALIDAS" -> "Credenciales inválidas";
            case "LIMITEALCANZADO" -> "Límite alcanzado";
            default -> formatear(valor, Map.of());
        };
    }

    private static String formatear(String valor, Map<String, String> etiquetas) {
        if (valor == null || valor.isBlank()) {
            return "";
        }
        var limpio = valor.strip().replaceAll("\\s+", " ");
        var etiqueta = etiquetas.get(clave(limpio));
        if (etiqueta != null) {
            return etiqueta;
        }
        var minusculas = limpio.toLowerCase(Locale.forLanguageTag("es-GT"));
        return minusculas.substring(0, 1).toUpperCase(Locale.forLanguageTag("es-GT"))
                + minusculas.substring(1);
    }

    private static String clave(String valor) {
        if (valor == null || valor.isBlank()) {
            return "";
        }
        return Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", "")
                .toUpperCase(Locale.ROOT);
    }
}
