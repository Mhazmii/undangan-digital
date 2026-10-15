// routes/auth.js — §4.1 Auth. Cookie httpOnly `sid`, sesi 30 hari.
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { bad } = require('../lib/util');

const router = express.Router();
const SESSION_DAYS = 30;

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return bad(res, 400, 'Username dan password wajib diisi.');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username));
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return bad(res, 401, 'Username atau password salah.');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions(token, user_id, expires_at) VALUES(?,?,?)').run(token, user.id, expiresAt);
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    path: '/'
  });
  return res.json({ ok: true, user: { id: user.id, username: user.username } });
});

router.post('/auth/logout', (req, res) => {
  const token = req.cookies && req.cookies.sid;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie('sid', { path: '/' });
  return res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  const token = req.cookies && req.cookies.sid;
  if (!token) return bad(res, 401, 'Belum login.');
  const row = db
    .prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token);
  if (!row) return bad(res, 401, 'Sesi tidak valid.');
  const exp = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token);
  if (new Date(exp.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return bad(res, 401, 'Sesi kedaluwarsa.');
  }
  return res.json({ id: row.id, username: row.username });
});

module.exports = router;
