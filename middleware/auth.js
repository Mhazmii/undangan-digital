// middleware/auth.js — requireAuth berbasis cookie httpOnly `sid` -> tabel sessions (expiry 30 hari).
const db = require('../db');

function getUserFromRequest(req) {
  const token = req.cookies && req.cookies.sid;
  if (!token) return null;
  const row = db
    .prepare('SELECT s.token, s.user_id, s.expires_at, u.id AS uid, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.uid, username: row.username };
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized. Silakan login dulu.' });
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  req.user = getUserFromRequest(req);
  next();
}

module.exports = { requireAuth, optionalAuth, getUserFromRequest };
