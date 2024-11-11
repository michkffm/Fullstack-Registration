import express from "express";
import mongoose from "mongoose";
import User from "./models/User.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { Resend } from "resend";

// Zugriff auf die Umgebungsvariablen
const MONGO_URI = process.env.MONGO_URI;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!MONGO_URI || !RESEND_API_KEY) {
  console.error("Bitte stelle sicher, dass alle Umgebungsvariablen gesetzt sind!");
  process.exit(1);
}

// MongoDB Verbindung
await mongoose.connect(MONGO_URI);

const app = express();
const resend = new Resend(RESEND_API_KEY);

app.use(express.json());

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Invalid registration" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24;

    const user = await User.create({
      email: email,
      password: hashedPassword,
      verificationToken: verificationToken,
      tokenExpiresAt: tokenExpiresAt,
    });

    const emailResponse = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "michael.koch@vodafone.de",
      subject: "Willkommen! Bitte E-Mail bestätigen",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Welcome to d01b!</h2>
          <p style="font-size: 16px; line-height: 1.5;">Wir freuen uns, dich in unserem Team zu haben. Bitte bestätige deine E-Mail, um fortzufahren:</p>
          <p style="font-size: 16px; line-height: 1.5;">
            <a href="http://localhost:3000/verify/${verificationToken}" style="color: #007bff; text-decoration: none; font-weight: bold;">E-Mail bestätigen</a>
          </p>
          <p style="font-size: 16px; line-height: 1.5;">Nächste Schritte:</p>
          <ul style="font-size: 16px; line-height: 1.5;">
            <li>1. Explore our features</li>
            <li>2. Set up your profile</li>
            <li>3. Start using our platform to maximize productivity</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.5;">Bis bald!</p>
          <p style="font-size: 16px; line-height: 1.5;">Das d01b Team</p>
        </div>
      `
    });

    if (emailResponse.error) {
      return res.status(500).json({ error: "Failed to send verification email" });
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen("3000", () => console.log("server started on port 3000"));
