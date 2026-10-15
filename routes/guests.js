// routes/guests.js — §4.5 Guests (auth). CRUD + import/export CSV.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, genToken, csvEscape, parseCsv, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

function loadWedding(req, res) {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) { bad(res, 404, 'Wedding tidak ditemukan.'); return null; }
  return w;
}

function uniqueToken() {
  let token;
  do { token = genToken(12); }
  while (db.prepare('SELECT id FROM wedding_guests WHERE token = ?').get(token));
  return token;
}

// GET /api/weddings/:id/guests?q=&rsvp= → list + status RSVP per tamu (join rsvps by guest_id)
router.get('/weddings/:id/guests', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const { q, rsvp } = req.query;
  let sql = `SELECT g.id, g.name, g.phone, g.token, g.group_name,
             r.attendance AS rsvp_attendance, r.guest_count AS rsvp_guest_count
             FROM wedding_guests g LEFT JOIN rsvps r ON r.guest_id = g.id
             WHERE g.wedding_id = ?`;
  const params = [w.id];
  if (q) { sql += ' AND (g.name LIKE ? OR g.phone LIKE ? OR g.group_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (rsvp === 'yes' || rsvp === 'no') { sql += ' AND r.attendance = ?'; params.push(rsvp); }
  else if (rsvp === 'none') { sql += ' AND r.id IS NULL'; }
  sql += ' ORDER BY g.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/weddings/:id/guests', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const { name, phone, group_name } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, 400, 'Nama tamu wajib diisi.');
  const info = db.prepare(
    'INSERT INTO wedding_guests(wedding_id, name, phone, token, group_name) VALUES(?,?,?,?,?)'
  ).run(w.id, String(name).trim(), String(phone || ''), uniqueToken(), String(group_name || ''));
  res.status(201).json(db.prepare('SELECT * FROM wedding_guests WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/weddings/:id/guests/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const g = db.prepare('SELECT * FROM wedding_guests WHERE id = ? AND wedding_id = ?').get(req.params.gid, w.id);
  if (!g) return bad(res, 404, 'Tamu tidak ditemukan.');
  const { name, phone, group_name } = req.body || {};
  if (name !== undefined && !String(name).trim()) return bad(res, 400, 'Nama tamu tidak boleh kosong.');
  db.prepare('UPDATE wedding_guests SET name = COALESCE(?, name), phone = COALESCE(?, phone), group_name = COALESCE(?, group_name) WHERE id = ?')
    .run(name !== undefined ? String(name).trim() : null, phone !== undefined ? String(phone) : null,
      group_name !== undefined ? String(group_name) : null, g.id);
  res.json(db.prepare('SELECT * FROM wedding_guests WHERE id = ?').get(g.id));
});

router.delete('/weddings/:id/guests/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const info = db.prepare('DELETE FROM wedding_guests WHERE id = ? AND wedding_id = ?').run(req.params.gid, w.id);
  if (!info.changes) return bad(res, 404, 'Tamu tidak ditemukan.');
  res.json({ ok: true });
});

// POST /api/weddings/:id/guests/import {csv:"nama,telepon,grup\n..."} → bulk insert
router.post('/weddings/:id/guests/import', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const { csv } = req.body || {};
  if (typeof csv !== 'string' || !csv.trim()) return bad(res, 400, 'Field csv wajib diisi.');
  let rows = parseCsv(csv);
  // Lewati baris header jika terlihat seperti header (nama/name di kolom pertama).
  if (rows.length && /^(nama|name)$/i.test(rows[0][0] || '')) rows = rows.slice(1);
  const insert = db.prepare('INSERT INTO wedding_guests(wedding_id, name, phone, token, group_name) VALUES(?,?,?,?,?)');
  let count = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const name = (r[0] || '').trim();
      if (!name) continue;
      insert.run(w.id, name, (r[1] || '').trim(), uniqueToken(), (r[2] || '').trim());
      count++;
    }
  });
  tx();
  res.json({ ok: true, imported: count });
});

// GET /api/weddings/:id/guests/export → download CSV
router.get('/weddings/:id/guests/export', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const rows = db.prepare('SELECT name, phone, token, group_name FROM wedding_guests WHERE wedding_id = ? ORDER BY id').all(w.id);
  const lines = ['nama,telepon,token,grup'];
  for (const r of rows) lines.push([r.name, r.phone, r.token, r.group_name].map(csvEscape).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="guests-${w.slug}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));
});

module.exports = router;
