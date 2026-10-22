import mongoose from "mongoose";
import validator from "validator";

const tokenSchema = new mongoose.Schema({
  hash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true,
    validate: value => validator.isEmail(value) },
  password: { type: String, required() { return this.verified; }, select: false },
  verified: { type: Boolean, default: false },
  verificationTokens: { type: [tokenSchema], default: undefined, select: false },
  pendingExpiresAt: { type: Date, select: false },
  verificationSentAt: { type: Date, select: false },
  // Nur zur gezielten Entfernung alter Bestätigungsdaten beim Abschluss.
  verificationTokenHash: { type: String, select: false },
  verificationToken: { type: String, select: false },
  tokenExpiresAt: { type: Date, select: false },
});

userSchema.index({ pendingExpiresAt: 1 }, {
  expireAfterSeconds: 0, partialFilterExpression: { verified: false },
});
userSchema.set("toJSON", { transform(_document, value) {
  for (const key of ["password", "verificationTokens", "pendingExpiresAt", "verificationTokenHash", "verificationToken", "tokenExpiresAt", "verificationSentAt", "__v"]) delete value[key];
  return value;
} });

export default mongoose.model("User", userSchema);
