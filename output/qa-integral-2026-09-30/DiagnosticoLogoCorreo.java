import gt.gob.parqueerickbarrondo.identidad.infraestructura.correo.EnviadorCorreoVerificacionSmtp;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import java.nio.file.*;
import java.util.UUID;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Properties;
import javax.imageio.ImageIO;

/** Envío único autorizado: usa la plantilla de la aplicación y SMTP real.
 * No crea usuarios ni tokens de activación. No lee buzones ni guarda credenciales. */
public class DiagnosticoLogoCorreo {
  public static void main(String[] args) throws Exception {
    if(args.length == 2 && args[0].equals("--validar")) {
      try(var input=Files.newInputStream(Path.of(args[1]))) {
        validar(new MimeMessage(Session.getInstance(new Properties()), input));
      }
      return;
    }
    if(args.length != 1) throw new IllegalArgumentException("Indica el archivo de salida o --validar archivo.eml");
    final var cid = "emblema-" + UUID.randomUUID() + "@parqueerickbarrondo";
    var sender = new JavaMailSenderImpl() {
      @Override public void send(MimeMessage message) {
        try {
          message.setSubject("Revisión visual del escudo — formato verificado", "UTF-8");
          message.saveChanges();
          preparar(message, cid);
          message.saveChanges();
          var out=new ByteArrayOutputStream();
          message.writeTo(out);
          var bytes=out.toByteArray();
          validar(new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(bytes)));
          Files.write(Path.of(args[0]), bytes, StandardOpenOption.CREATE_NEW);
        } catch(Exception e) { throw new IllegalStateException(e); }
        super.send(message);
      }
    };
    sender.setHost("smtp.gmail.com");sender.setPort(587);
    sender.setUsername(System.getenv("QA_SMTP_USER"));sender.setPassword(System.getenv("QA_SMTP_PASSWORD"));
    var props=sender.getJavaMailProperties();
    props.setProperty("mail.smtp.auth","true");props.setProperty("mail.smtp.starttls.enable","true");
    props.setProperty("mail.smtp.starttls.required","true");props.setProperty("mail.smtp.connectiontimeout","10000");
    props.setProperty("mail.smtp.timeout","15000");props.setProperty("mail.smtp.writetimeout","15000");
    var correo=new EnviadorCorreoVerificacionSmtp(sender,System.getenv("QA_SMTP_USER"),"http://127.0.0.1:5173",24);
    correo.enviar("nelson2031997p@gmail.com","Nelson","qa-logo-sin-token-de-activacion");
    System.out.println("SMTP aceptó la comprobación del logotipo para el destinatario autorizado.");
  }
  static void preparar(Part part,String cid) throws Exception {
    var content=part.getContent();
    if(content instanceof Multipart multi) {for(int i=0;i<multi.getCount();i++)preparar(multi.getBodyPart(i),cid);}
    else if(part.isMimeType("text/plain") && part instanceof MimeBodyPart body) {
      body.setText("Hola Nelson.\n\nEste mensaje autorizado comprueba la visualización del escudo adjunto del Parque Erick Barrondo.\nTu cuenta ya está verificada. No necesitas confirmar la cuenta ni cambiar tu contraseña.\n", "UTF-8", "plain");
    } else if(part.isMimeType("text/html") && part instanceof MimeBodyPart body) {
      var text=content.toString().replace("cid:emblema-parque","cid:"+cid)
        .replace("http://127.0.0.1:5173/verificar-correo?token=qa-logo-sin-token-de-activacion","http://127.0.0.1:5173")
        .replace("Confirmación de correo","Comprobación del logotipo")
        .replace("Confirmar mi cuenta","Abrir el sistema")
        .replace("Confirma tu correo presionando el botón <strong>“Abrir el sistema”</strong> para crear tu cuenta del Parque Erick Barrondo.","Tu cuenta ya está verificada. Este mensaje comprueba que el emblema adjunto se muestra correctamente.")
        .replace("Este enlace permanecerá disponible durante <strong>24 horas</strong>. Después de ese plazo será necesario solicitar uno nuevo.","No necesitas volver a verificar tu cuenta ni cambiar tu contraseña.")
        .replace("<strong>¿No solicitaste este registro?</strong> No realices ninguna acción; tu correo no será validado.","Revisión visual solicitada por Nelson. No modifica tu cuenta.");
      body.setText(text,"UTF-8","html");
    } else if(part.isMimeType("image/png") && part instanceof MimeBodyPart body) {
      body.setDisposition(Part.INLINE);body.setFileName("escudo-guatemala.png");body.setContentID("<"+cid+">");
    }
  }
  static void recoger(Part part, ArrayList<Part> parts) throws Exception {
    var content=part.getContent();
    if(content instanceof Multipart multi){for(int i=0;i<multi.getCount();i++)recoger(multi.getBodyPart(i),parts);}
    else parts.add(part);
  }
  static void validar(MimeMessage message) throws Exception {
    var parts=new ArrayList<Part>();recoger(message,parts);
    String html=null,plain=null,cid=null;byte[] image=null;
    for(var part:parts) {
      if(part.isMimeType("text/html")) { if(html!=null)throw new IllegalStateException("HTML duplicado");html=part.getContent().toString(); }
      else if(part.isMimeType("text/plain")) { if(plain!=null)throw new IllegalStateException("Texto plano duplicado");plain=part.getContent().toString(); }
      else if(part.isMimeType("image/png")) {
        if(image!=null)throw new IllegalStateException("Imagen duplicada");
        if(!Part.INLINE.equalsIgnoreCase(part.getDisposition()))throw new IllegalStateException("PNG no inline");
        var header=part.getHeader("Content-ID");
        if(header==null || header.length!=1 || !header[0].startsWith("<") || !header[0].endsWith(">"))throw new IllegalStateException("Content-ID inválido");
        cid=header[0].substring(1,header[0].length()-1);
        try(var input=part.getInputStream()){image=input.readAllBytes();}
      }
    }
    if(html==null || plain==null || image==null || !html.contains("src=\"cid:"+cid+"\""))throw new IllegalStateException("Falta HTML, texto plano o PNG enlazado por CID");
    if(plain.toLowerCase().contains("<!doctype") || plain.contains("<html"))throw new IllegalStateException("HTML enviado como texto plano");
    try(var original=DiagnosticoLogoCorreo.class.getResourceAsStream("/correo/imagenes/escudo-guatemala.png")) {
      if(original==null || !Arrays.equals(image,original.readAllBytes()))throw new IllegalStateException("PNG recibido no coincide con el recurso del sistema");
    }
    var decoded=ImageIO.read(new ByteArrayInputStream(image));
    if(decoded==null || decoded.getWidth()==0 || decoded.getHeight()==0)throw new IllegalStateException("PNG ilegible");
    System.out.println("MIME verificado tras serializar: text/plain separado de text/html; CID coincide; PNG inline intacto de "+image.length+" bytes, "+decoded.getWidth()+" x "+decoded.getHeight()+" píxeles.");
  }
}
