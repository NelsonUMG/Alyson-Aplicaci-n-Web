package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.IntentoInicioSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioIntentoInicioSesion extends JpaRepository<IntentoInicioSesion, Long> {

    @Query("""
            select count(i) from IntentoInicioSesion i
            where i.intentadoEn >= :desde
              and (i.huellaCorreo = :huellaCorreo or i.huellaIp = :huellaIp)
              and i.resultado in ('FALLIDO', 'LIMITADO', 'BLOQUEADO')
            """)
    long contarFallosRecientes(
            @Param("huellaCorreo") byte[] huellaCorreo,
            @Param("huellaIp") byte[] huellaIp,
            @Param("desde") Instant desde);
}
