// routes/gifts.js — §4.4 gifts (auth). GET/POST/PUT/DELETE.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

const GIFT_TYPES = new Set(['bank', 'ewallet', 'address']);

function loadWedding(req, res) {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) { bad(res, 404, 'Wedding tidak ditemukan.'); return null; }
  return w;
}

function validateGift(b, partial = false) {
  if (!partial || b.type !== undefined) {
    if (!GIFT_TYPES.has(b.type)) return 'type harus bank, ewallet, atau address.';
  }
  for (const f of ['provider', 'account_number', 'account_name']) {
    if ((!partial || b[f] !== undefined) && (!b[f] || !String(b[f]).trim())) return `${f} wajib diisi.`;
  }
  return null;
}

router.get('/weddings/:id/gifts', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  res.json(db.prepare('SELECT * FROM gift_methods WHERE wedding_id = ? ORDER BY id').all(w.id));
});

router.post('/weddings/:id/gifts', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const err = validateGift(req.body);
  if (err) return bad(res, 400, err);
  const b = req.body;
  const info = db.prepare(
    'INSERT INTO gift_methods(wedding_id, type, provider, account_number, account_name, note) VALUES(?,?,?,?,?,?)'
  ).run(w.id, b.type, String(b.provider).trim(), String(b.account_number).trim(),
    String(b.account_name).trim(), String(b.note || ''));
  res.status(201).json(db.prepare('SELECT * FROM gift_methods WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/weddings/:id/gifts/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const g = db.prepare('SELECT * FROM gift_methods WHERE id = ? AND wedding_id = ?').get(req.params.gid, w.id);
  if (!g) return bad(res, 404, 'Metode gift tidak ditemukan.');
  const err = validateGift(req.body, true);
  if (err) return bad(res, 400, err);
  const cols = ['type', 'provider', 'account_number', 'account_name', 'note'];
  const updates = {};
  for (const c of cols) if (req.body[c] !== undefined) updates[c] = String(req.body[c]).trim();
  if (Object.keys(updates).length) {
    db.prepare(`UPDATE gift_methods SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...Object.values(updates), g.id);
  }
  res.json(db.prepare('SELECT * FROM gift_methods WHERE id = ?').get(g.id));
});

router.delete('/weddings/:id/gifts/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const info = db.prepare('DELETE FROM gift_methods WHERE id = ? AND wedding_id = ?').run(req.params.gid, w.id);
  if (!info.changes) return bad(res, 404, 'Metode gift tidak ditemukan.');
  res.json({ ok: true });
});

module.exports = router;
