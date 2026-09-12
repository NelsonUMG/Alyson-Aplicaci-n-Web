package gt.gob.parqueerickbarrondo.compartido.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class ConfiguracionCorreoAsincrono {
    @Bean("recuperacionExecutor")
    ThreadPoolTaskExecutor recuperacionExecutor() {
        var ejecutor = new ThreadPoolTaskExecutor();
        ejecutor.setCorePoolSize(2);
        ejecutor.setMaxPoolSize(4);
        ejecutor.setQueueCapacity(50);
        ejecutor.setThreadNamePrefix("recuperacion-");
        return ejecutor;
    }
}
