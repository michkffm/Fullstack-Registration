<div align="center">

# Fullstack Registration

**E-Mail angeben. Passwort festlegen. Registrierung abschließen.**

Ein Registrierungsprojekt mit React, Express und MongoDB.<br>
Der Bestätigungslink verbindet den Nachweis der E-Mail-Adresse mit der Passwortwahl.

**React 18 · Vite 8 · Express 5 · Mongoose 8 · bcrypt · Resend**

[Funktionen](#funktionen) · [Lokal starten](#lokal-starten) · [API](#api) · [Prüfungen](#prüfungen)

</div>

---

![Registrierungsformular zur Anforderung einer Bestätigungsmail](docs/screenshot.png)

*Aktuelle lokale Oberfläche. Keine echten Nutzerdaten im Screenshot.*

> **Projektstand:** Der Registrierungsablauf ist implementiert und lokal geprüft. Eine Anmeldung gehört nicht zum Umfang. Die echte Resend-Zustellung und der Betrieb mit deiner eigenen Datenbank sind noch zu prüfen; eine öffentliche Bereitstellung dieser Version besteht noch nicht.

## So funktioniert es

1. Du gibst deine E-Mail-Adresse ein.
2. Falls eine Registrierung möglich ist, sendet die App einen Bestätigungslink.
3. Über diesen Link legst du dein eigenes Passwort fest.
4. Erst beim Absenden dieses Formulars wird die Registrierung abgeschlossen.

Die erste Anfrage speichert kein Passwort. Wer eine fremde Adresse eingibt, kann ihr deshalb kein eigenes dauerhaftes Passwort zuweisen. Ein bloßer Aufruf des Links bestätigt noch nichts – auch ein automatischer E-Mail-Linkscanner aktiviert dadurch kein Konto.

## Funktionen

| Bereich | Umsetzung |
| --- | --- |
| Oberfläche | Deutsches Formular, beschriftete Felder, Ladezustand und verständliche Rückmeldungen |
| E-Mail-Bestätigung | Kryptografisch zufällige Links mit 24 Stunden Gültigkeit |
| Passwortwahl | Erst nach Besitz des Links; bcrypt mit Kostenfaktor 12 |
| Einmaliger Abschluss | Atomare Bestätigung; danach werden alle zugehörigen Links ungültig |
| Erneuter Versand | Nach einer Minute anforderbar; bis zu acht aktuelle Links bleiben verwendbar |
| Datenschutz der Antwort | Gültige E-Mail-Anfragen erhalten unabhängig vom Kontostatus dieselbe Bestätigung |
| Speicherbegrenzung | Höchstens acht Tokenhashes pro ausstehender Registrierung; Ablauf unbestätigter Datensätze |
| Fehlerbehandlung | Ungültige Eingaben, abgelaufene Links und fehlerhaftes JSON werden kontrolliert behandelt |

Passwörter benötigen mindestens zwölf Zeichen und dürfen höchstens 72 UTF-8-Bytes enthalten. Umlaute und Emojis können mehrere Bytes belegen.

## Lokal starten

Voraussetzungen: unterstützte Node.js-LTS-Version ab 22.12, npm und eine erreichbare MongoDB. Für echte Bestätigungsmails brauchst du einen **neuen** Resend-Schlüssel und eine geeignete verifizierte Absenderadresse.

```bash
git clone https://github.com/michkffm/Fullstack-Registration.git
cd Fullstack-Registration
```

### Backend

```bash
cd backend
npm ci
cp .env.example .env
```

Die lokale `.env` ausfüllen:

| Variable | Zweck |
| --- | --- |
| `MONGO_URI` | Verbindung zur eigenen MongoDB |
| `RESEND_API_KEY` | Neuer eigener Resend-Schlüssel |
| `MAIL_FROM` | Eigene in Resend verifizierte Absenderadresse |
| `PUBLIC_URL` | Adresse für Bestätigungslinks, lokal `http://localhost:5173` |
| `PORT` | Backend-Port, standardmäßig `3000` |

`PUBLIC_URL` enthält keine Zugangsdaten, Query-Parameter oder Unterpfade. Außerhalb von localhost ist eine HTTPS-Adresse erforderlich. Echte Zugangsdaten gehören niemals ins Repository.

```bash
npm start
```

Der Startbefehl lädt die lokale `.env`, sofern vorhanden. Pflichtwerte und Datenbankverbindung werden vor dem HTTP-Start geprüft.

### Frontend

In einem zweiten Terminal, vom Repository-Verzeichnis aus:

```bash
cd Frontend
npm ci
npm run dev
```

Die ausgegebene Adresse öffnen. Vite leitet `/register` und `/verify` an `http://127.0.0.1:3000` weiter. Bei einem geänderten Backend-Port muss das Proxyziel in `Frontend/vite.config.js` mit angepasst werden. Bei einem anderen Frontend-Port `PUBLIC_URL` entsprechend setzen und das Backend neu starten.

### Keine E-Mail erhalten?

Spam-Ordner prüfen und nach einer Minute erneut einen Link anfordern. Die öffentliche Antwort verspricht keine tatsächliche Zustellung und gibt nicht preis, ob bereits ein bestätigtes Konto besteht. Versandfehler werden serverseitig ohne E-Mail-Adressen, Passwörter oder Tokens protokolliert. Bereits bestätigte Konten werden durch erneute Anfragen nicht verändert.

## API

| Methode | Route | Verhalten |
| --- | --- | --- |
| `POST` | `/register` | JSON mit `email`; einheitliche Antwort `202` für gültige Anfragen |
| `GET` | `/verify/:token` | HTML-Formular für die Passwortwahl; keine Datenänderung |
| `POST` | `/verify/:token` | Passwort als JSON oder HTML-Formulardaten; gültigen Link einmalig verbrauchen |

Die Registrierung liefert nur eine allgemeine Nachricht, kein Nutzerdokument. Ein übermitteltes Passwort wird beim ersten Schritt nicht übernommen oder verglichen. Identitätsabhängige Cooldown- und Mailfehler verändern die öffentliche Bestätigung nicht. Der Provider-Versand läuft begrenzt im Hintergrund und wird nicht vor der Antwort abgewartet.

Fehler der öffentlichen Anfrage: `400` bei ungültigen Eingaben beziehungsweise JSON, `413` bei zu großen Anfragen, `429` bei überschrittenem IP-Limit, `503` bei ausgeschöpftem IP-Zählerspeicher und `500` bei internen Fehlern. Fehler werden als `{ "error": "…" }` zurückgegeben. Bestätigungsseiten liefern HTML; ungültige Passwörter oder Links erhalten `400`.

## Aufbau

```text
Frontend/
  src/Login.jsx              Registrierungsformular
  public/verification.css    Gestaltung der Bestätigungsseiten
  vite.config.js             Lokaler API-Proxy
backend/
  app.js                     Routen, Limits, Header und Fehlerantworten
  registration.js            E-Mail-Anfragen und begrenzter Mailversand
  config.js                  Konfiguration prüfen
  server.js                  Datenbank und Serverstart
  models/User.js             Nutzermodell und Indizes
  tests/registration.test.js  Automatisierte Backend-Prüfungen
  .env.example               Konfiguration ohne Geheimnisse
docs/screenshot.png          Aktuelle Oberfläche
```

Die Paketverzeichnisse haben eigene npm-Lockfiles. `node_modules`, Build-Ausgaben und lokale Zugangsdaten werden nicht versioniert. Es wurde keine neue Produktionsabhängigkeit ergänzt.

## Sicherheit

- Neue Passwörter werden erst beim tokenautorisierten Abschluss angenommen und als bcrypt-Hash gespeichert.
- Token bestehen aus 32 Zufallsbytes; die Datenbank erhält ausschließlich SHA-256-Hashes.
- Die Bestätigung prüft Tokenhash, Ablauf und unbestätigten Status atomar. Parallel kann nur eine Anfrage erfolgreich abschließen.
- Erneuter Versand überschreibt keine bestätigten Konten und macht einen früheren Link nicht sofort ungültig. Nur die letzten acht Links werden gehalten.
- Ausstehende Datensätze erhalten eine Ablaufzeit von 24 Stunden nach der letzten angenommenen Linkanforderung. MongoDB entfernt sie über einen TTL-Index mit Filter `verified: false`. Die Löschung kann verzögert erfolgen. Bestätigte Konten gehören nicht zu diesem Index; ihr Ablauffeld wird beim Abschluss entfernt.
- JSON und Formulardaten sind auf 8 KB begrenzt. Ein IP-Zähler begrenzt Registrierung und Bestätigung gemeinsam auf 20 Anfragen pro 15 Minuten, pro Backend-Prozess.
- React rendert Meldungen als Text. HTML-Seiten akzeptieren ausschließlich 64 hexadezimale Tokenzeichen. CSP, `no-referrer`, `nosniff` und `no-store` auf den Registrierungswegen ergänzen die Kontrollen.

Die Prüfung vom 22. Oktober 2026 fand im vorherigen Zwischenstand eine dauerhafte Reservierung fremder Adressen und unterscheidbare Registrierungsantworten. Der aktuelle Ablauf behebt diese Ursachen; Regressionstests prüfen beide Fälle. Der ursprüngliche Sicherheitsbericht beschreibt den geprüften Zwischenstand und wurde nach den Korrekturen nicht überschrieben. Daraus folgt keine Garantie, dass sämtliche denkbaren Sicherheitsprobleme ausgeschlossen sind.

## Prüfungen

### Backend

```bash
cd backend
npm test
```

Ohne `MONGO_TEST_URI` laufen die Konfigurations- und Modellprüfungen; die Datenbanktests werden als übersprungen angezeigt. Für den vollständigen Lauf eine eigene lokale MongoDB-Testinstanz starten:

```bash
MONGO_TEST_URI=mongodb://127.0.0.1:27029 npm test
```

Die Tests akzeptieren nur lokale MongoDB-Adressen, erzeugen je Lauf einen zufälligen neuen Datenbanknamen und löschen ausschließlich diese Testdatenbank anschließend wieder. Der Test-Mailtransport verschickt keine echten Nachrichten.

### Frontend

```bash
cd Frontend
npm run lint
npm run build
npm audit
```

### Verifizierter lokaler Stand

- **15 Backend-Prüfungen erfolgreich**, mit separater echter MongoDB und abgefangenem Mailtransport.
- Regressionstests für fremde Vorregistrierung, identische Antworten bei verschiedenen Kontozuständen, Passwortwahl, Mailfehler, Ablauf und parallele Anfragen.
- Durchgängiger Browsertest vom gebauten React-Frontend über Express und MongoDB bis zur Passwortwahl und einmaligen Bestätigung erfolgreich. Nur der externe Mailtransport wurde ersetzt.
- Mobile Seitenbreite und JavaScript-Fehler im Browser geprüft.
- Frontend-Lint, Produktionsbuild und Git-Formatprüfung erfolgreich.
- Beide npm-Audits meldeten nach den kompatiblen Updates keine bekannten Schwachstellen.

## Noch vor dem öffentlichen Betrieb zu klären

**Veröffentlichter Schlüssel:** Eine entfernte Testdatei enthielt früher einen Resend-Schlüssel. Dieser muss in Resend widerrufen werden. Das Entfernen aus dem aktuellen Quelltext löscht die Git-Historie nicht. Niemals den alten Schlüssel für den Betrieb übernehmen.

**Bestehende Daten:** Vor dem Start mit einer bisherigen Datenbank doppelte, unterschiedlich geschriebene oder ungültige E-Mail-Adressen prüfen und nach Sicherung gezielt migrieren. Es wurde keine vorhandene Nutzerdatenbank verändert. Alte Bestätigungslinks werden nicht übernommen; ausstehende Nutzer können einen neuen Link anfordern und ihr Passwort erst nach dem E-Mail-Nachweis selbst setzen. Bestätigte Konten werden dadurch nicht geändert. Die neue Ablaufregel gilt für neu angelegte beziehungsweise erneut angefragte ausstehende Datensätze.

**Hosting:** Nach `npm run build` im Frontend kann Express den Ordner `Frontend/dist` ausliefern. Die vollständige App braucht einen Node.js-Host, MongoDB und einen erreichbaren Resend-Absender. GitHub Pages allein führt das Backend nicht aus. HTTPS-Terminierung, Datenbankzugriffsrechte und `PUBLIC_URL` müssen zum tatsächlichen Host passen; `PUBLIC_URL` allein aktiviert keine Transportverschlüsselung am HTTP-Listener.

**Betriebsgrenzen:** Mailversand läuft im Prozess, ohne dauerhafte Warteschlange und mit maximal 50 gleichzeitigen Versandvorgängen. Ein Neustart kann ausstehende Sendungen verlieren; ein neuer Link kann angefordert werden. Hinter einem Reverse Proxy können mehrere Nutzer denselben IP-Zähler teilen. Mehrere Backend-Instanzen brauchen abgestimmte Limits. Eine konstante Antwortlaufzeit wird nicht zugesichert. Anmeldung, Passwortzurücksetzung, Passkeys und SSO sind nicht enthalten.

**Entwicklungswerkzeuge:** ESLint 9 wird von npm inzwischen als nicht mehr unterstützt markiert. Die vorhandenen React-Plugins benötigen für eine neue Hauptversion eine gesonderte Migration; hier wurden kompatible Sicherheitsupdates eingespielt.

## Autor

**Michael Koch** · [GitHub-Profil](https://github.com/michkffm)
