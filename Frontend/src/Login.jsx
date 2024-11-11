import  { useState } from 'react';
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === 'test@example.com' && password === 'password123') {
      setMessage('Login erfolgreich!');
    } else {
      setMessage('Ungültige Anmeldedaten!');
    }
  };

  return (
    <div className="login-container">
      <h1>Bei Ihrem Konto anmelden</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>E-Mail-Adresse:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Passwort:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <div className="password-recover">
            <a href="/recover">Passwort vergessen?</a>
          </div>
        </div>
        <div>
          <input 
            type="checkbox" 
            checked={rememberMe} 
            onChange={() => setRememberMe(!rememberMe)} 
          />
          <label>Auf diesem Gerät angemeldet bleiben</label>
        </div>
        <button type="submit">Anmelden</button>
      </form>
      {message && <p>{message}</p>}
      <h2>Mit Passkey anmelden</h2>
      <p>Verwenden Sie einmalige Anmeldung (SSO)</p>
      <p>
        Neu bei Stripe? <a href="/register">Konto erstellen</a>
      </p>
    </div>
  );
}


