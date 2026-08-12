package gt.gob.parqueerickbarrondo.compartido.configuracion;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
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
            ManejadorCierreSesion manejadorCierreSesion,
            ManejadorErroresSeguridad manejadorErroresSeguridad) throws Exception {
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
                        .requestMatchers(
                                "/actuator/info",
                                "/actuator/metrics/**",
                                "/actuator/prometheus")
                        .hasAuthority("REPORTELEER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/autenticacion/csrf")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/publico/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/autenticacion/registro",
                                "/api/v1/autenticacion/iniciar-sesion")
                        .permitAll()
                        .requestMatchers(
                                "/api/v1/autenticacion/**",
                                "/api/v1/administracion/**",
                                "/api/v1/eventos/**")
                        .authenticated()
                        .anyRequest().denyAll())
                .logout(cierre -> cierre
                        .logoutUrl("/api/v1/autenticacion/cerrar-sesion")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                        .logoutSuccessHandler(manejadorCierreSesion))
                .exceptionHandling(errores -> errores
                        .authenticationEntryPoint((peticion, respuesta, excepcion) ->
                                manejadorErroresSeguridad.responderAutenticacionRequerida(peticion, respuesta))
                        .accessDeniedHandler((peticion, respuesta, excepcion) ->
                                manejadorErroresSeguridad.responderAccesoDenegado(peticion, respuesta)))
                .headers(encabezados -> encabezados
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; "
                                + "script-src 'self' https://maps.googleapis.com https://maps.gstatic.com; "
                                + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                                + "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com "
                                + "https://*.google.com https://*.googleusercontent.com "
                                + "https://server.arcgisonline.com; "
                                + "font-src 'self' https://fonts.gstatic.com; "
                                + "connect-src 'self' https://*.googleapis.com https://*.gstatic.com "
                                + "https://*.google.com https://tiles.openfreemap.org "
                                + "https://server.arcgisonline.com https://valhalla1.openstreetmap.de data: blob:; "
                                + "frame-src https://*.google.com; worker-src blob:; "
                                + "object-src 'none'; base-uri 'self'; form-action 'self'; "
                                + "frame-ancestors 'none'"))
                        .referrerPolicy(referente -> referente.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicyHeader(permisos -> permisos.policy(
                                "camera=(), microphone=(), geolocation=(self)")));

        return seguridadHttp.build();
    }
}
