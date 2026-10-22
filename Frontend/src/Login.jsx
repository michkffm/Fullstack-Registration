import { useRef, useState } from 'react';
import './Login.css';

export default function Registration() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setSuccess(false);
    setMessage('');
    try {
      const response = await fetch('/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), signal: AbortSignal.timeout(30_000),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Die Registrierung ist fehlgeschlagen.');
        return;
      }
      setSuccess(true);
      setMessage('Falls eine Registrierung möglich ist, erhältst du eine E-Mail. Öffne den Link und lege dort dein Passwort fest. Prüfe auch den Spam-Ordner.');
    } catch {
      setMessage('Der Server ist nicht erreichbar oder hat nicht rechtzeitig geantwortet. Bitte versuche es später erneut.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <main className="login-container">
      <p className="eyebrow">FULLSTACK REGISTRATION</p>
      <h1>Konto erstellen</h1>
      <p>Gib deine E-Mail-Adresse ein. Über den Link in deinem Postfach legst du anschließend dein Passwort fest.</p>
      <form onSubmit={handleSubmit} aria-busy={pending}>
        <label htmlFor="email">E-Mail-Adresse</label>
        <input id="email" name="email" type="email" autoComplete="email" value={email}
          onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={pending} />
        <button type="submit" disabled={pending}>{pending ? 'Wird gesendet …' : 'Registrieren'}</button>
      </form>
      {message && <p className={success ? 'message success' : 'message error'} role="status">{message}</p>}
      <p className="hint">Keine Mail erhalten? Du kannst nach einer Minute erneut einen Link anfordern. Bereits bestätigte Konten bleiben unverändert.</p>
    </main>
  );
}
