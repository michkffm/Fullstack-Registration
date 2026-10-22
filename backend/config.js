export function readConfig(env = process.env) {
  for (const key of ["MONGO_URI", "RESEND_API_KEY", "MAIL_FROM", "PUBLIC_URL"]) {
    if (!env[key]?.trim()) throw new Error(`Konfiguration fehlt: ${key}`);
  }
  const url = new URL(env.PUBLIC_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("PUBLIC_URL muss eine HTTP(S)-Adresse ohne Pfad oder Zugangsdaten sein.");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("PUBLIC_URL benötigt außerhalb von localhost HTTPS.");
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT ist ungültig.");
  return { mongoUri: env.MONGO_URI, resendApiKey: env.RESEND_API_KEY,
    mailFrom: env.MAIL_FROM, publicUrl: url.origin, port };
}
