import React, { useState } from 'react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        setMessage('Bitte checke deine Inbox und bestätige deine E-Mail.');
      } else {
        const errorData = await response.json();
        setMessage(`Registrierung fehlgeschlagen: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Fehler:', error);
      setMessage('Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
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


