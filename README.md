# Fullstack-Registration

Ein Lernprojekt für die Registrierung von Nutzern mit React, Express und MongoDB. Im Mittelpunkt stehen das Zusammenspiel von Formular und API, Passwort-Hashing und die Vorbereitung einer E-Mail-Bestätigung über Resend.

**React 18 · Vite 8 · Node.js · Express 5 · MongoDB / Mongoose · bcrypt · Resend**

![Aktueller Stand des Registrierungsformulars](docs/screenshot.png)

> **Stand:** Prototyp. Die Oberfläche ist als Anmeldung beschriftet, sendet aber eine Registrierung. Ein vollständiger Anmelde- und Verifizierungsablauf ist noch nicht umgesetzt.

## Was bereits im Code vorhanden ist

- React-Formular mit E-Mail-Adresse und Passwort.
- `POST /register` zum Anlegen eines Nutzers in MongoDB.
- Passwort-Hashing mit bcrypt.
- Erzeugung eines zufälligen Bestätigungstokens mit Ablaufzeit.
- Versand einer E-Mail über Resend an einen fest im Backend eingetragenen Testempfänger.

## Projektstruktur

```text
Frontend/             React-Oberfläche (Großschreibung beachten)
  src/Login.jsx       Formular und API-Anfrage
backend/
  server.js           API und Mailversand
  models/User.js      MongoDB-Nutzermodell
```

`backend/server.js` ist der über `npm start` verwendete Einstiegspunkt. Die weiteren Backend-Dateien sind nicht Teil dieses Startbefehls.

## Lokal starten

Voraussetzungen: Node.js ab 22.12, npm, eine erreichbare MongoDB und ein eigener Resend-Versandzugang. Keine echten Zugangsdaten committen.

```bash
git clone https://github.com/michkffm/Fullstack-Registration.git
cd Fullstack-Registration
```

### Backend

In `backend/.env` die Variablen `MONGO_URI` und `RESEND_API_KEY` mit eigenen Werten hinterlegen. Die Datei bleibt lokal und darf nicht in Git eingecheckt werden.

```bash
cd backend
npm ci
node --env-file=.env server.js
```

Die API startet auf Port `3000`. `npm start` lädt `.env` nicht selbst; dabei müssen die Variablen bereits in der Umgebung gesetzt sein.

### Frontend in einem zweiten Terminal

```bash
cd Fullstack-Registration/Frontend
npm ci
npm run dev
```

Die von Vite ausgegebene Adresse öffnen. Das Formular erwartet die API unter `http://localhost:3000/register`.

## Grenzen und nächste Entwicklungsschritte

- Das Backend stellt aktuell keine `/verify/:token`-Route bereit, obwohl die E-Mail darauf verweist.
- Es gibt keine konfigurierte CORS-Freigabe für das auf einem anderen Port laufende Frontend. Der durchgängige Formularversand benötigt daher noch eine passende CORS- oder Proxy-Konfiguration.
- Passkey, SSO, „Passwort vergessen“ und „angemeldet bleiben“ sind keine fertigen Funktionen.
- Der Mailversand nutzt einen festen Testempfänger und den Resend-Testabsender; er ist kein fertiger Versand an registrierte Nutzer.
- Die API-Antwort gibt derzeit das erstellte Nutzerdokument zurück. Für den produktiven Einsatz sind eine begrenzte Antwort ohne Passwort-Hash/Token und eine vollständigere Eingabe- und Fehlerbehandlung erforderlich.

## Prüfung

Am 21. Oktober 2026 wurden `npm ci --ignore-scripts` und `npm run build` im Frontend erfolgreich ausgeführt. Der Screenshot wurde lokal aufgenommen. Backend, Datenbank und Mailversand wurden bei dieser Dokumentationsüberarbeitung nicht gestartet. Das Backend-Testskript ist derzeit nur ein Platzhalter.

[Michael Koch auf GitHub](https://github.com/michkffm) · [Interaktives Portfolio](https://michael-koch-portfolio.onrender.com/)
