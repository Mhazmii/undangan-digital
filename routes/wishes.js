// routes/wishes.js — §4.7 Wishes (admin). List+filter, PATCH status, DELETE.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, WISH_STATUS, bad } = require('../lib/util');

const router = express.Router();
router.use(['/weddings', '/wishes'], requireAuth);

router.get('/weddings/:id/wishes', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const { status, q } = req.query;
  let sql = 'SELECT * FROM wedding_wishes WHERE wedding_id = ?';
  const params = [w.id];
  if (status) {
    if (!WISH_STATUS.has(status)) return bad(res, 400, 'status filter harus pending, approved, atau hidden.');
    sql += ' AND status = ?'; params.push(status);
  }
  if (q) { sql += ' AND (name LIKE ? OR message LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.patch('/wishes/:wid', (req, res) => {
  const row = db.prepare('SELECT * FROM wedding_wishes WHERE id = ?').get(req.params.wid);
  if (!row) return bad(res, 404, 'Ucapan tidak ditemukan.');
  const { status } = req.body || {};
  if (status !== 'approved' && status !== 'hidden') {
    return bad(res, 400, 'status harus approved atau hidden.');
  }
  db.prepare('UPDATE wedding_wishes SET status = ? WHERE id = ?').run(status, row.id);
  res.json(db.prepare('SELECT * FROM wedding_wishes WHERE id = ?').get(row.id));
});

router.delete('/wishes/:wid', (req, res) => {
  const info = db.prepare('DELETE FROM wedding_wishes WHERE id = ?').run(req.params.wid);
  if (!info.changes) return bad(res, 404, 'Ucapan tidak ditemukan.');
  res.json({ ok: true });
});

module.exports = router;
