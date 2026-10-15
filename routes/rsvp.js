// routes/rsvp.js — §4.6 RSVP. Admin: list + summary + export CSV (auth).
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, csvEscape, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

router.get('/weddings/:id/rsvps', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const list = db.prepare(
    'SELECT id, guest_id, name, attendance, guest_count, message, created_at FROM rsvps WHERE wedding_id = ? ORDER BY id DESC'
  ).all(w.id);
  const summary = db.prepare(
    `SELECT
       COUNT(CASE WHEN attendance = 'yes' THEN 1 END) AS yes_count,
       COUNT(CASE WHEN attendance = 'no' THEN 1 END) AS no_count,
       COALESCE(SUM(CASE WHEN attendance = 'yes' THEN guest_count ELSE 0 END), 0) AS total_persons,
       COUNT(*) AS total_forms
     FROM rsvps WHERE wedding_id = ?`
  ).get(w.id);
  res.json({ list, summary });
});

router.get('/weddings/:id/rsvps/export', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const rows = db.prepare('SELECT name, attendance, guest_count, message, created_at FROM rsvps WHERE wedding_id = ? ORDER BY id').all(w.id);
  const lines = ['nama,kehadiran,jumlah_tamu,pesan,dibuat_pada'];
  for (const r of rows) lines.push([r.name, r.attendance, r.guest_count, r.message, r.created_at].map(csvEscape).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rsvp-${w.slug}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));
});

module.exports = router;
