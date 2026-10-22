import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { createApp } from '../app.js';
import { readConfig } from '../config.js';
import { hashToken, validPassword } from '../registration.js';

const validConfig = { MONGO_URI: 'mongodb://127.0.0.1/test', RESEND_API_KEY: 'test-only', MAIL_FROM: 'test@example.com', PUBLIC_URL: 'http://localhost:5173' };
test('Konfiguration: Pflichtwerte, HTTPS, URL und Port', () => {
  assert.throws(() => readConfig({}), /Konfiguration fehlt/);
  for (const PUBLIC_URL of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com/?x=1']) assert.throws(() => readConfig({ ...validConfig, PUBLIC_URL }));
  assert.throws(() => readConfig({ ...validConfig, PORT: '0' }), /PORT/);
  assert.equal(readConfig(validConfig).port, 3000);
});
test('Modell: keine sensiblen Felder in JSON; bestätigte Konten brauchen Passwort', async () => {
  const user = new User({ email: 'test@example.com', verificationTokens: [{ hash: 'secret', expiresAt: new Date() }], pendingExpiresAt: new Date() });
  await user.validate();
  for (const key of ['password', 'verificationTokens', 'pendingExpiresAt']) assert.equal(key in user.toJSON(), false);
  user.verified = true;
  await assert.rejects(user.validate());
  assert.equal(validPassword('short'), false);
  assert.equal(validPassword('😀'.repeat(20)), false);
  assert.equal(validPassword('Testpasswort-123!'), true);
});
test('Integration mit separater lokaler MongoDB', { skip: !process.env.MONGO_TEST_URI }, async t => {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(process.env.MONGO_TEST_URI).hostname));
  const dbName = `registration_test_${crypto.randomBytes(8).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName });
  await User.init();
  let clock = new Date();
  const firstExpiry = new Date(+clock + 86_400_000).toISOString();
  let mailFailure = false;
  let mailErrors = 0;
  const mails = [];
  const app = createApp({ User, publicUrl: 'http://localhost:5173', mailFrom: 'test@example.com', now: () => clock,
    onMailError: () => { mailErrors++; }, sendMail: async mail => {
      if (mailFailure) return { error: { message: 'test failure' } };
      mails.push(mail); return { data: { id: 'test-message' } };
    } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, path = '/register') => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const tokenFrom = mail => mail.text.match(/verify\/([a-f0-9]{64})/)[1];
  const password = 'Mailbox-Passwort-123!';
  const acknowledgement = { message: 'Falls eine Registrierung möglich ist, erhältst du eine E-Mail. Prüfe auch den Spam-Ordner. Nach einer Minute kannst du es erneut versuchen.' };
  async function accepted(body) { const response = await post(body); assert.equal(response.status, 202); assert.deepEqual(await response.json(), acknowledgement); }
  try {
    await t.test('Ungültige Typen, E-Mail-Adressen und NoSQL-Objekte werden abgelehnt', async () => {
      for (const body of [null, {}, { email: {} }, { email: { $ne: null } }, { email: 'invalid' }]) assert.equal((await post(body)).status, 400);
      assert.equal(await User.countDocuments(), 0);
    });
    await t.test('Neue Anfrage speichert noch kein Passwort und ausschließlich Tokenhash', async () => {
      await accepted({ email: '  TEST@example.com ', password: 'Angreifer-Passwort-123!' });
      assert.equal(mails[0].to, 'test@example.com');
      const user = await User.findOne({ email: 'test@example.com' }).select('+password +verificationTokens +pendingExpiresAt');
      assert.equal(user.password, undefined);
      assert.equal(user.verificationTokens[0].hash, hashToken(tokenFrom(mails[0])));
      assert.equal(user.pendingExpiresAt.toISOString(), firstExpiry);
    });
    await t.test('Vorregistrierung blockiert den Mailboxinhaber nicht und bindet kein fremdes Passwort', async () => {
      await accepted({ email: 'test@example.com', password });
      const path = '/verify/' + tokenFrom(mails[0]);
      assert.equal((await fetch(base + path)).status, 200);
      assert.equal((await User.findOne({ email: 'test@example.com' })).verified, false);
      assert.equal((await post({}, path)).status, 400);
      assert.equal((await post({ password: 'short' }, path)).status, 400);
      assert.equal((await post({ password: '😀'.repeat(20) }, path)).status, 400);
      assert.equal((await post({ password }, path)).status, 200);
      const user = await User.findOne({ email: 'test@example.com' }).select('+password +verificationTokens +pendingExpiresAt');
      assert.equal(user.verified, true);
      assert.ok(await bcrypt.compare(password, user.password));
      assert.equal(await bcrypt.compare('Angreifer-Passwort-123!', user.password), false);
      assert.equal(user.verificationTokens, undefined);
      assert.equal(user.pendingExpiresAt, undefined);
      assert.equal((await post({ password }, path)).status, 400);
    });
    await t.test('Bestätigte Konten und falsche Passwortangaben geben dieselbe Antwort ohne Änderung', async () => {
      const before = (await User.findOne({ email: 'test@example.com' }).select('+password')).password;
      await accepted({ email: 'test@example.com', password: 'different' });
      assert.equal((await User.findOne({ email: 'test@example.com' }).select('+password')).password, before);
    });
    await t.test('Mailfehler und Cooldown verraten keine Existenz; erneuter Versuch funktioniert', async () => {
      clock = new Date(+clock + 900_001);
      mailFailure = true;
      await accepted({ email: 'retry@example.com' });
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(mailErrors, 1);
      mailFailure = false;
      const before = mails.length;
      await accepted({ email: 'retry@example.com' });
      assert.equal(mails.length, before);
      clock = new Date(+clock + 61_000);
      await accepted({ email: 'retry@example.com', password: 'irrelevant' });
      assert.equal(mails.length, before + 1);
    });
    await t.test('Erneuter Versand entwertet einen früheren noch gültigen Link nicht sofort', async () => {
      const firstToken = tokenFrom(mails.at(-1));
      clock = new Date(+clock + 61_000);
      await accepted({ email: 'retry@example.com' });
      const secondToken = tokenFrom(mails.at(-1));
      assert.notEqual(firstToken, secondToken);
      assert.equal((await post({ password }, '/verify/' + firstToken)).status, 200);
      assert.equal((await post({ password }, '/verify/' + secondToken)).status, 400);
    });
    await t.test('Abgelaufene Links bleiben ungültig; neue Anfrage ohne Kenntnis eines alten Passworts möglich', async () => {
      await accepted({ email: 'expired@example.com' });
      const expired = tokenFrom(mails.at(-1));
      clock = new Date(+clock + 86_400_001);
      assert.equal((await post({ password }, '/verify/' + expired)).status, 400);
      await accepted({ email: 'expired@example.com' });
      assert.equal((await post({ password }, '/verify/' + tokenFrom(mails.at(-1)))).status, 200);
    });
    await t.test('Parallele Erstregistrierungen bleiben eindeutig und bestätigen keine fremden Daten', async () => {
      const responses = await Promise.all([post({ email: 'race@example.com' }), post({ email: 'race@example.com' })]);
      assert.deepEqual(responses.map(r => r.status), [202, 202]);
      assert.equal(await User.countDocuments({ email: 'race@example.com' }), 1);
    });
    await t.test('Passwort wird auch über das tatsächliche HTML-Formularformat akzeptiert', async () => {
      await accepted({ email: 'form@example.com' });
      const response = await fetch(base + '/verify/' + tokenFrom(mails.at(-1)), { method: 'POST', body: new URLSearchParams({ password }) });
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Registrierung ist abgeschlossen/);
    });
    await t.test('Parallele Bestätigungen verbrauchen den Token genau einmal', async () => {
      clock = new Date(+clock + 900_001);
      await accepted({ email: 'verify-race@example.com' });
      const path = '/verify/' + tokenFrom(mails.at(-1));
      const responses = await Promise.all([post({ password }, path), post({ password }, path)]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    });
    await t.test('Tokenliste bleibt auf acht Einträge begrenzt; bestätigte Konten nicht im TTL-Index', async () => {
      for (let i = 0; i < 10; i++) { clock = new Date(+clock + 900_001); await accepted({ email: 'bounded@example.com' }); }
      const user = await User.findOne({ email: 'bounded@example.com' }).select('+verificationTokens');
      assert.equal(user.verificationTokens.length, 8);
      const indexes = await User.collection.indexes();
      const ttl = indexes.find(index => index.key.pendingExpiresAt);
      assert.equal(ttl.expireAfterSeconds, 0);
      assert.deepEqual(ttl.partialFilterExpression, { verified: false });
    });
    await t.test('Ungültiges JSON, übergroße Anfragen, HTML-Tokeninjektion und Header', async () => {
      assert.equal((await fetch(base + '/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
      assert.equal((await post({ email: 'x'.repeat(9000) })).status, 413);
      const response = await fetch(base + '/verify/%3Cscript%3E');
      assert.equal(response.status, 400);
      assert.equal((await response.text()).includes('<script>'), false);
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      let limited;
      for (let i = 0; i < 25; i++) limited = await post({});
      assert.equal(limited.status, 429);
      assert.ok(limited.headers.get('retry-after'));
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
