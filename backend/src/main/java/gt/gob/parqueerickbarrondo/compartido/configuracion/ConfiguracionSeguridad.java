package gt.gob.parqueerickbarrondo.compartido.configuracion;

import java.nio.charset.StandardCharsets;

import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.session.HttpSessionEventPublisher;

@Configuration
@EnableMethodSecurity
public class ConfiguracionSeguridad {

    @Bean
    PasswordEncoder codificadorContrasena() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    DaoAuthenticationProvider proveedorAutenticacion(
            ServicioDetallesUsuario servicioDetallesUsuario,
            PasswordEncoder codificadorContrasena) {
        var proveedor = new DaoAuthenticationProvider(servicioDetallesUsuario);
        proveedor.setPasswordEncoder(codificadorContrasena);
        return proveedor;
    }

    @Bean
    AuthenticationManager administradorAutenticacion(DaoAuthenticationProvider proveedorAutenticacion) {
        return new ProviderManager(proveedorAutenticacion);
    }

    @Bean
    SecurityContextRepository repositorioContextoSeguridad() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SessionRegistry registroSesiones() {
        return new SessionRegistryImpl();
    }

    @Bean
    HttpSessionEventPublisher publicadorEventosSesion() {
        return new HttpSessionEventPublisher();
    }

    @Bean
    SecurityFilterChain seguridadAplicacion(
            HttpSecurity seguridadHttp,
            SecurityContextRepository repositorioContextoSeguridad,
            SessionRegistry registroSesiones,
            ManejadorCierreSesion manejadorCierreSesion) throws Exception {
        var repositorioCsrf = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repositorioCsrf.setCookiePath("/");

        seguridadHttp
                .securityContext(contexto -> contexto
                        .securityContextRepository(repositorioContextoSeguridad)
                        .requireExplicitSave(true))
                .csrf(csrf -> csrf.csrfTokenRepository(repositorioCsrf))
                .sessionManagement(sesion -> sesion
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fijacion -> fijacion.changeSessionId())
                        .maximumSessions(-1)
                        .sessionRegistry(registroSesiones))
                .authorizeHttpRequests(autorizacion -> autorizacion
                        .requestMatchers(
                                "/api/v1/sistema/estado",
                                "/actuator/health",
                                "/api/v1/openapi/**",
                                "/api/v1/swagger-ui/**",
                                "/swagger-ui/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/autenticacion/csrf")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/autenticacion/registro",
                                "/api/v1/autenticacion/iniciar-sesion")
                        .permitAll()
                        .requestMatchers("/api/v1/autenticacion/**", "/api/v1/administracion/**")
                        .authenticated()
                        .anyRequest().denyAll())
                .logout(cierre -> cierre
                        .logoutUrl("/api/v1/autenticacion/cerrar-sesion")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                        .logoutSuccessHandler(manejadorCierreSesion))
                .exceptionHandling(errores -> errores
                        .authenticationEntryPoint((peticion, respuesta, excepcion) -> escribirProblema(
                                respuesta,
                                HttpServletResponse.SC_UNAUTHORIZED,
                                "AUTENTICACIONREQUERIDA",
                                "Debes iniciar sesión para consultar este recurso."))
                        .accessDeniedHandler((peticion, respuesta, excepcion) -> escribirProblema(
                                respuesta,
                                HttpServletResponse.SC_FORBIDDEN,
                                "ACCESODENEGADO",
                                "No tienes permiso para realizar esta operación.")))
                .headers(encabezados -> encabezados
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
                        .referrerPolicy(referente -> referente.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicyHeader(permisos -> permisos.policy(
                                "camera=(), microphone=(), geolocation=(self)")));

        return seguridadHttp.build();
    }

    private void escribirProblema(
            HttpServletResponse respuesta,
            int estado,
            String codigo,
            String detalle) throws java.io.IOException {
        respuesta.setStatus(estado);
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.setContentType("application/problem+json");
        respuesta.getWriter().write("""
                {"title":"Acceso rechazado","status":%d,"detail":"%s","codigo":"%s"}
                """.formatted(estado, detalle, codigo).strip());
    }
}
