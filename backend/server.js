import mongoose from "mongoose";
import { Resend } from "resend";
import User from "./models/User.js";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

try {
  const config = readConfig();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  await User.init();
  const resend = new Resend(config.resendApiKey);
  const app = createApp({ User, sendMail: mail => resend.emails.send(mail),
    publicUrl: config.publicUrl, mailFrom: config.mailFrom });
  const server = app.listen(config.port, () => console.log(`Server läuft auf Port ${config.port}.`));
  server.on("error", async () => {
    console.error("Der HTTP-Server konnte nicht gestartet werden.");
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => {
    server.close(async () => { await mongoose.disconnect(); });
  });
} catch (error) {
  console.error(error.message.startsWith("Konfiguration fehlt:") ? error.message : "Serverstart fehlgeschlagen. Bitte Konfiguration, Datenbank und eindeutige E-Mail-Adressen prüfen.");
  await mongoose.disconnect();
  process.exitCode = 1;
}
