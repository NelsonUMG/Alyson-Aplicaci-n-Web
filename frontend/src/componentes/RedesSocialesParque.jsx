export function RedesSocialesParque() {
  return (
    <aside className="portal-redes-sociales" aria-label="Redes sociales del parque">
      <div className="portal-redes-enlaces">
        <a
          href="https://www.facebook.com/ParqueErickBarrondo"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook del Parque Erick Barrondo"
          title="Facebook"
        >
          <IconoFacebook />
        </a>
        <a
          href="https://www.instagram.com/cderickbarrondo/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram del Parque Erick Barrondo"
          title="Instagram"
        >
          <IconoInstagram />
        </a>
      </div>
    </aside>
  );
}

function IconoFacebook() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.7c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.1H7.8V13h2.7v8h3.3Z" fill="currentColor" /></svg>;
}

function IconoInstagram() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>;
}
