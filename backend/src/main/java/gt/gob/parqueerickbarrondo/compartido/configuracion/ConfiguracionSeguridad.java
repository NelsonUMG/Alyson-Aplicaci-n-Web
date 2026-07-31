package gt.gob.parqueerickbarrondo.compartido.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ConfiguracionSeguridad {

    @Bean
    SecurityFilterChain seguridadAplicacion(HttpSecurity seguridadHttp) throws Exception {
        seguridadHttp.authorizeHttpRequests(autorizacion -> autorizacion
                .requestMatchers(
                        "/api/v1/sistema/estado",
                        "/actuator/health",
                        "/api/v1/openapi/**",
                        "/api/v1/swagger-ui/**",
                        "/swagger-ui/**")
                .permitAll()
                .anyRequest().denyAll());

        return seguridadHttp.build();
    }
}
