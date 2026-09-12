package gt.gob.parqueerickbarrondo.identidad.api;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named = "PRUEBAS_IDENTIDAD_SQLSERVER", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "correo.verificacion.envio-habilitado=false", "spring.mail.test-connection=false",
        "inicializacion.administrador.habilitado=false", "seguridad.intentos.maximos=20" })
class IdentidadSqlServerPruebas {
    @Value("${local.server.port}") int puerto;
    @Autowired JdbcTemplate sql;
    @Autowired ServicioRecuperacionContrasena servicioRecuperacion;
    @MockitoBean EnviadorCorreoVerificacion verificacion;
    @MockitoBean EnviadorCorreoRecuperacion recuperacion;
    final ObjectMapper json = new ObjectMapper();
    final HttpClient cliente = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();

    @Test void verificaRegistroRecuperacionCaducidadYUsoUnicoConSqlReal() throws Exception {
        var tokenVerificacion = new AtomicReference<String>();
        var tokenRecuperacion = new AtomicReference<String>();
        doAnswer(i -> { tokenVerificacion.set(i.getArgument(2)); return null; }).when(verificacion).enviar(any(), any(), any());
        doAnswer(i -> { tokenRecuperacion.set(i.getArgument(2)); return null; }).when(recuperacion).enviar(any(), any(), any());

        assertThat(post("recuperar-contrasena", Map.of("correo", "persona@example.com"), false).statusCode()).isEqualTo(403);
        assertThat(post("recuperar-contrasena", Map.of("correo", "invalido"), true).statusCode()).isEqualTo(400);
        var registro = Map.of("dpi", "1234567890101", "nombre", "Persona", "apellido", "Prueba", "celular", "55551234",
                "fechaNacimiento", "1995-04-10", "correo", "persona@example.com", "contrasena", "Prueba inicial segura 123", "confirmarContrasena", "Prueba inicial segura 123");
        assertThat(post("registro", registro, true).statusCode()).isEqualTo(201);
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM dbo.Usuarios WHERE CorreoNormalizado='persona@example.com'", Integer.class)).isZero();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM dbo.RegistrosPendientes", Integer.class)).isEqualTo(1);
        assertThat(tokenVerificacion.get()).isNotBlank();
        var respuestaPendiente = post("recuperar-contrasena", Map.of("correo", "persona@example.com"), true);
        var respuestaAusente = post("recuperar-contrasena", Map.of("correo", "ausente@example.com"), true);
        assertThat(respuestaPendiente.body()).isEqualTo(respuestaAusente.body());
        verify(recuperacion, after(200).never()).enviar(any(), any(), any());

        sql.update("UPDATE dbo.RegistrosPendientes SET CreadoEn=DATEADD(hour,-25,SYSUTCDATETIME()), ExpiraEn=DATEADD(hour,-1,SYSUTCDATETIME())");
        assertThat(post("confirmar-correo", Map.of("token", tokenVerificacion.get()), true).statusCode()).isEqualTo(400);
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM dbo.Usuarios", Integer.class)).isZero();
        var anterior = tokenVerificacion.get();
        assertThat(post("reenviar-verificacion", Map.of("correo", "persona@example.com"), true).statusCode()).isEqualTo(200);
        assertThat(tokenVerificacion.get()).isNotEqualTo(anterior);
        assertThat(post("confirmar-correo", Map.of("token", anterior), true).statusCode()).isEqualTo(400);
        assertThat(post("confirmar-correo", Map.of("token", tokenVerificacion.get()), true).statusCode()).isEqualTo(200);
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM dbo.RegistrosPendientes", Integer.class)).isZero();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM dbo.Usuarios WHERE Estado='ACTIVO' AND CorreoVerificadoEn IS NOT NULL", Integer.class)).isEqualTo(1);
        var inicio = post("iniciar-sesion", Map.of("correo", "persona@example.com", "contrasena", "Prueba inicial segura 123", "mantenerSesionActiva", false), true);
        assertThat(inicio.statusCode()).withFailMessage(inicio.body()).isEqualTo(200);

        assertThat(post("recuperar-contrasena", Map.of("correo", "persona@example.com"), true).statusCode()).isEqualTo(202);
        verify(recuperacion, timeout(5000)).enviar(eq("persona@example.com"), eq("Persona"), anyString());
        // La respuesta del envío precede al commit de la tarea SMTP.
        for (int i = 0; i < 50 && sql.queryForObject("SELECT COUNT(*) FROM dbo.TokensRestablecimientoContrasena", Integer.class) == 0; i++) Thread.sleep(50);
        assertThat(sql.queryForObject("SELECT DATEDIFF(second,CreadoEn,ExpiraEn) FROM dbo.TokensRestablecimientoContrasena", Integer.class)).isEqualTo(3600);
        assertThat(post("restablecer-contrasena", cambio("token-invalido"), true).statusCode()).isEqualTo(400);
        sql.update("UPDATE dbo.TokensRestablecimientoContrasena SET CreadoEn=DATEADD(hour,-2,SYSUTCDATETIME()), ExpiraEn=DATEADD(hour,-1,SYSUTCDATETIME())");
        assertThat(post("restablecer-contrasena", cambio(tokenRecuperacion.get()), true).statusCode()).isEqualTo(400);
        assertThat(post("recuperar-contrasena", Map.of("correo", "persona@example.com"), true).statusCode()).isEqualTo(202);
        verify(recuperacion, timeout(5000).times(2)).enviar(any(), any(), any());
        var nuevoToken = tokenRecuperacion.get();
        var resultado = post("restablecer-contrasena", cambio(nuevoToken), true);
        assertThat(resultado.statusCode()).withFailMessage(resultado.body()).isEqualTo(200);
        assertThat(post("restablecer-contrasena", cambio(nuevoToken), true).statusCode()).isIn(400, 401);
        assertThat(post("iniciar-sesion", Map.of("correo", "persona@example.com", "contrasena", "Prueba inicial segura 123", "mantenerSesionActiva", false), true).statusCode()).isEqualTo(401);
        assertThat(post("iniciar-sesion", Map.of("correo", "persona@example.com", "contrasena", "Prueba renovada segura 456", "mantenerSesionActiva", false), true).statusCode()).isEqualTo(200);
        assertThat(post("restablecer-contrasena", cambio(nuevoToken), true).statusCode()).isEqualTo(400);
        sql.update("UPDATE dbo.TokensRestablecimientoContrasena SET CreadoEn=DATEADD(minute,-6,SYSUTCDATETIME()) WHERE ExpiraEn>SYSUTCDATETIME()");
        post("recuperar-contrasena", Map.of("correo", "persona@example.com"), true);
        verify(recuperacion, timeout(5000).times(3)).enviar(any(), any(), any());
        for (int i = 0; i < 50 && sql.queryForObject("SELECT COUNT(*) FROM dbo.TokensRestablecimientoContrasena", Integer.class) < 3; i++) Thread.sleep(50);
        var simultanea = new gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRestablecerContrasena(
                tokenRecuperacion.get(), "Tercera contraseña segura 789", "Tercera contraseña segura 789");
        java.util.function.Supplier<Boolean> consumir = () -> {
            try { servicioRecuperacion.restablecer(simultanea); return true; }
            catch (SolicitudInvalidaException esperada) { return false; }
        };
        var primera = java.util.concurrent.CompletableFuture.supplyAsync(consumir);
        var segunda = java.util.concurrent.CompletableFuture.supplyAsync(consumir);
        assertThat(List.of(primera.get(), segunda.get())).containsExactlyInAnyOrder(true, false);
    }
    private Map<String, String> cambio(String token) {
        return Map.of("token", token, "contrasenaNueva", "Prueba renovada segura 456", "confirmarContrasena", "Prueba renovada segura 456");
    }
    private HttpResponse<String> post(String ruta, Object datos, boolean conCsrf) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + puerto + "/api/v1/autenticacion/" + ruta))
                .timeout(Duration.ofSeconds(15)).header("Content-Type", "application/json");
        if (conCsrf) {
            var respuesta = cliente.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + puerto + "/api/v1/autenticacion/csrf")).GET().build(), HttpResponse.BodyHandlers.ofString());
            // Una sesión expirada se invalida en la primera petición; pedir un nuevo CSRF anónimo.
            if (respuesta.statusCode() != 200) respuesta = cliente.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + puerto + "/api/v1/autenticacion/csrf")).GET().build(), HttpResponse.BodyHandlers.ofString());
            var csrf = json.readTree(respuesta.body());
            builder.header(csrf.get("nombreEncabezado").asText(), csrf.get("token").asText());
        }
        return cliente.send(builder.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(datos))).build(), HttpResponse.BodyHandlers.ofString());
    }
}
