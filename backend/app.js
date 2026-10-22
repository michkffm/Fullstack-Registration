import express from "express";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";
import { createRegistration, hashToken, validPassword, RegistrationError } from "./registration.js";

function confirmationPage(title, message, token = null) {
  const form = token ? `<form method="post" action="/verify/${token}"><label for="password">Neues Passwort</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="12" required aria-describedby="hint"><p id="hint">Mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes.</p><button type="submit">Registrierung abschließen</button></form>` : `<a href="/">Zur Registrierung</a>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><link rel="stylesheet" href="/verification.css"><title>${title}</title></head><body><main><h1>${title}</h1><p role="status">${message}</p>${form}</main></body></html>`;
}

export function createApp({ User, sendMail, publicUrl, mailFrom, now = () => new Date(), onMailError }) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    next();
  });
  const attempts = new Map();
  app.use(["/register", "/verify"], (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const currentTime = +now();
    for (const [ip, entry] of attempts) if (entry.until <= currentTime) attempts.delete(ip);
    const key = req.ip;
    let entry = attempts.get(key);
    if (!entry) {
      if (attempts.size >= 10_000) return res.status(503).json({ error: "Bitte versuche es später erneut." });
      entry = { count: 0, until: currentTime + 900_000 };
      attempts.set(key, entry);
    }
    if (++entry.count > 20) {
      res.set("Retry-After", String(Math.ceil((entry.until - currentTime) / 1000)));
      return res.status(429).json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." });
    }
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  app.use(express.urlencoded({ extended: false, limit: "8kb", parameterLimit: 5 }));
  const register = createRegistration({ User, sendMail, publicUrl, mailFrom, now, onMailError });
  app.post("/register", async (req, res) => res.status(202).json(await register(req.body)));

  app.get("/verify/:token", (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(400).type("html").send(confirmationPage("Ungültiger Link", "Bitte fordere eine neue Bestätigung an."));
    // GET bestätigt nichts: Mailprogramme können Links automatisch aufrufen.
    res.type("html").send(confirmationPage("Registrierung abschließen", "Lege dein eigenes Passwort fest. Damit bestätigst du gleichzeitig deine E-Mail-Adresse.", req.params.token));
  });
  app.post("/verify/:token", async (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(400).type("html").send(confirmationPage("Ungültiger Link", "Bitte fordere eine neue Bestätigung an."));
    if (!validPassword(req.body?.password)) return res.status(400).type("html").send(confirmationPage("Passwort prüfen", "Verwende mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes.", req.params.token));
    const verificationFilter = () => ({ verified: false, verificationTokens: { $elemMatch: { hash: hashToken(req.params.token), expiresAt: { $gt: now() } } } });
    const invalidLink = () => res.status(400).type("html").send(confirmationPage("Link nicht mehr gültig", "Fordere über die Registrierung eine neue Bestätigungsmail an."));
    if (!await User.exists(verificationFilter())) return invalidLink();
    const password = await bcrypt.hash(req.body.password, 12);
    const user = await User.findOneAndUpdate(verificationFilter(),
      { $set: { verified: true, password }, $unset: { verificationTokens: 1, pendingExpiresAt: 1, verificationTokenHash: 1, verificationToken: 1, tokenExpiresAt: 1, verificationSentAt: 1 } }, { new: true });
    if (!user) return invalidLink();
    res.type("html").send(confirmationPage("E-Mail bestätigt", "Deine Registrierung ist abgeschlossen."));
  });
  app.use(express.static(fileURLToPath(new URL("../Frontend/dist/", import.meta.url))));
  app.use((_req, res) => res.status(404).json({ error: "Diese Seite wurde nicht gefunden." }));
  app.use((error, _req, res, _next) => {
    if (error instanceof RegistrationError) return res.status(error.status).json({ error: error.message });
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Die Anfrage enthält ungültiges JSON." });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Die Anfrage ist zu groß." });
    console.error("Anfrage fehlgeschlagen:", error.name || "Unbekannter Fehler");
    res.status(500).json({ error: "Ein interner Fehler ist aufgetreten. Bitte versuche es später erneut." });
  });
  return app;
}
