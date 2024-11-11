import { Resend } from 'resend';
// import crypto from "node:crypto";

// const token = crypto.randomBytes(32).toString("hex");

// console.log(token);
//  console.log(Date.now())


const resend = new Resend('re_KZWK4mEZ_CeTcEbKFMsAyh9fUZsQ4YYh5');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'michael.koch@vodafone.de',
  subject: 'Hello World 1',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p><p>Click <a href="https://www.google.com" target="_blank">here</a> to visit Google.</p>'
});


// const date = Date.now() + 24 * 60 * 60 * 1000;
// console.log(Date.now())
// console.log(date)
// console.log(Date.now() < date)


// import bcrypt from "bcrypt";

// // $2b$10$mLUPXOc6qWmN9Zb2HH9lvuocMJO65.Yj8ZCZb2X5BSl6Rd6HpFD6q
// // $2b$10$v.lyccxiYrfPnZz/UKXy8.x/sD1IfSjRqymOKWPRLNmr2FElBLmF2

// const password = "katze1";

// const hashedPassword = await bcrypt.hash(password, 10);

// console.log(hashedPassword)

// const passwordCorrect = await bcrypt.compare("katze", hashedPassword);

// console.log(passwordCorrect);