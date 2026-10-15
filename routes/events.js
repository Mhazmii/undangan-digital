// routes/events.js — §4.4 events (auth). GET/POST/PUT/DELETE per wedding.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, validDate, EVENT_KIND, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

function loadWedding(req, res) {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) { bad(res, 404, 'Wedding tidak ditemukan.'); return null; }
  return w;
}

function validateEventBody(b, partial = false) {
  const { kind, title, event_date } = b || {};
  if (!partial || kind !== undefined) {
    if (!EVENT_KIND.has(kind)) return 'kind harus akad, resepsi, atau custom.';
  }
  if (!partial || title !== undefined) {
    if (!title || !String(title).trim()) return 'Judul event wajib diisi.';
  }
  if (!partial || event_date !== undefined) {
    if (!validDate(event_date)) return 'event_date harus format YYYY-MM-DD yang valid.';
  }
  return null;
}

router.get('/weddings/:id/events', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  res.json(db.prepare('SELECT * FROM wedding_events WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id));
});

router.post('/weddings/:id/events', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const err = validateEventBody(req.body);
  if (err) return bad(res, 400, err);
  const b = req.body;
  const info = db.prepare(
    `INSERT INTO wedding_events(wedding_id,kind,title,event_date,start_time,end_time,venue_name,address,maps_url,sort_order)
     VALUES(?,?,?,?,?,?,?,?,?,?)`
  ).run(w.id, b.kind, String(b.title).trim(), b.event_date,
    String(b.start_time || ''), String(b.end_time || ''),
    String(b.venue_name || ''), String(b.address || ''), String(b.maps_url || ''),
    Number.isInteger(b.sort_order) ? b.sort_order : 0);
  res.status(201).json(db.prepare('SELECT * FROM wedding_events WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/weddings/:id/events/:eid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const ev = db.prepare('SELECT * FROM wedding_events WHERE id = ? AND wedding_id = ?').get(req.params.eid, w.id);
  if (!ev) return bad(res, 404, 'Event tidak ditemukan.');
  const err = validateEventBody(req.body, true);
  if (err) return bad(res, 400, err);
  const allowed = ['kind','title','event_date','start_time','end_time','venue_name','address','maps_url','sort_order'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      if (k === 'sort_order') {
        if (!Number.isInteger(req.body[k])) return bad(res, 400, 'sort_order harus bilangan bulat.');
        updates[k] = req.body[k];
      } else updates[k] = String(req.body[k]);
    }
  }
  if (updates.title !== undefined && !updates.title.trim()) return bad(res, 400, 'Judul event tidak boleh kosong.');
  if (Object.keys(updates).length) {
    db.prepare(`UPDATE wedding_events SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...Object.values(updates), ev.id);
  }
  res.json(db.prepare('SELECT * FROM wedding_events WHERE id = ?').get(ev.id));
});

router.delete('/weddings/:id/events/:eid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const info = db.prepare('DELETE FROM wedding_events WHERE id = ? AND wedding_id = ?').run(req.params.eid, w.id);
  if (!info.changes) return bad(res, 404, 'Event tidak ditemukan.');
  res.json({ ok: true });
});

module.exports = router;
