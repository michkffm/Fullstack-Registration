import crypto from "node:crypto";
import validator from "validator";

export class RegistrationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");
export const acknowledgement = () => ({ message: "Falls eine Registrierung möglich ist, erhältst du eine E-Mail. Prüfe auch den Spam-Ordner. Nach einer Minute kannst du es erneut versuchen." });

export function validPassword(password) {
  return typeof password === "string" && password.length >= 12 && Buffer.byteLength(password, "utf8") <= 72;
}

export function createRegistration({ User, sendMail, publicUrl, mailFrom, now = () => new Date(), onMailError = () => console.error("Bestätigungsmail konnte nicht versendet werden.") }) {
  let activeDeliveries = 0;

  function deliver(email, token) {
    // Begrenzter Hintergrundversand: Providerlaufzeit und -fehler dürfen keine Kontoauskunft geben.
    if (activeDeliveries >= 50) { onMailError(); return; }
    activeDeliveries++;
    const verificationUrl = `${publicUrl}/verify/${token}`;
    Promise.resolve().then(() => sendMail({ from: mailFrom, to: email, subject: "Registrierung abschließen",
      text: `Lege dein Passwort fest und bestätige deine E-Mail-Adresse: ${verificationUrl}\nDer Link ist 24 Stunden gültig. Falls du kein Konto angefordert hast, ignoriere diese Nachricht.` }))
      .then(result => { if (result?.error || !result?.data?.id) onMailError(); })
      .catch(() => onMailError())
      .finally(() => { activeDeliveries--; });
  }

  return async function register(body) {
    if (!body || typeof body.email !== "string" || !validator.isEmail(body.email.trim())) {
      throw new RegistrationError(400, "Bitte gib eine gültige E-Mail-Adresse an.");
    }
    const email = body.email.trim().toLowerCase();
    const currentTime = now();
    const token = crypto.randomBytes(32).toString("hex");
    const challenge = { hash: hashToken(token), expiresAt: new Date(+currentTime + 86_400_000) };
    const user = await User.findOne({ email }).select("+verificationSentAt");
    if (user?.verified || (user?.verificationSentAt && currentTime - user.verificationSentAt < 60_000)) return acknowledgement();
    if (user) {
      const updated = await User.findOneAndUpdate({ _id: user._id, verified: false,
        $or: [{ verificationSentAt: { $exists: false } }, { verificationSentAt: null }, { verificationSentAt: { $lte: new Date(currentTime - 60_000) } }] },
      { $set: { verificationSentAt: currentTime, pendingExpiresAt: challenge.expiresAt },
        $push: { verificationTokens: { $each: [challenge], $slice: -8 } } }, { new: true });
      if (!updated) return acknowledgement();
    } else {
      try {
        await User.create({ email, verificationTokens: [challenge], pendingExpiresAt: challenge.expiresAt, verificationSentAt: currentTime });
      } catch (error) {
        if (error.code === 11000) return acknowledgement();
        throw error;
      }
    }
    deliver(email, token);
    return acknowledgement();
  };
}
