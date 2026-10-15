// routes/public.js — §4.6/4.7/4.8 endpoint publik + rate limit.
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { getWeddingBySlug, ATTENDANCE, bad } = require('../lib/util');

const router = express.Router();

// Rate limit 10/menit/IP untuk tiap endpoint tulis publik (RSVP & wishes,
// bucket terpisah per endpoint).
function makePublicWriteLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak permintaan. Coba lagi dalam satu menit.' }
  });
}
const rsvpWriteLimit = makePublicWriteLimit();
const wishesWriteLimit = makePublicWriteLimit();

function publicWedding(slug) {
  const w = getWeddingBySlug(slug);
  if (!w || w.status !== 'published') return null;
  return w;
}

// §4.8 — GET /api/public/wedding/:slug → 404 jika draft/tidak ada.
router.get('/public/wedding/:slug', (req, res) => {
  const w = publicWedding(req.params.slug);
  if (!w) return bad(res, 404, 'Undangan tidak ditemukan.');
  const wedding = {
    id: w.id, slug: w.slug, title: w.title,
    template_id: w.template_id, theme_config: w.theme_config, music_url: w.music_url
  };
  const events = db.prepare('SELECT id, kind, title, event_date, start_time, end_time, venue_name, address, maps_url, sort_order FROM wedding_events WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id);
  const sections = db.prepare('SELECT section_key, enabled, sort_order, config FROM wedding_sections WHERE wedding_id = ? AND enabled = 1 ORDER BY sort_order').all(w.id);
  const gallery = db.prepare('SELECT id, url, caption, sort_order FROM gallery_images WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id);
  const gifts = db.prepare('SELECT id, type, provider, account_number, account_name, note FROM gift_methods WHERE wedding_id = ? ORDER BY id').all(w.id);
  res.json({ wedding, events, sections, gallery, gifts });
});

// §4.8 — GET /api/public/wedding/:slug/guest/:token → hanya nama.
router.get('/public/wedding/:slug/guest/:token', (req, res) => {
  const w = publicWedding(req.params.slug);
  if (!w) return bad(res, 404, 'Undangan tidak ditemukan.');
  const g = db.prepare('SELECT name FROM wedding_guests WHERE wedding_id = ? AND token = ?').get(w.id, req.params.token);
  if (!g) return bad(res, 404, 'Tamu tidak ditemukan.');
  res.json({ name: g.name });
});

// §4.6 — Publik: POST /api/public/wedding/:slug/rsvp
router.post('/public/wedding/:slug/rsvp', rsvpWriteLimit, (req, res) => {
  const w = publicWedding(req.params.slug);
  if (!w) return bad(res, 404, 'Undangan tidak ditemukan.');
  const { name, attendance, guest_count, message, guest_token } = req.body || {};
  if (!name || !String(name).trim() || String(name).length > 100) {
    return bad(res, 400, 'Nama wajib diisi (maksimal 100 karakter).');
  }
  if (!ATTENDANCE.has(attendance)) return bad(res, 400, 'attendance harus "yes" atau "no".');
  const gc = Number(guest_count);
  if (!Number.isInteger(gc) || gc < 1 || gc > 10) {
    return bad(res, 400, 'guest_count harus bilangan bulat 1–10.');
  }
  if (message !== undefined && String(message).length > 500) {
    return bad(res, 400, 'Pesan maksimal 500 karakter.');
  }
  let guestId = null;
  if (guest_token) {
    const g = db.prepare('SELECT id FROM wedding_guests WHERE wedding_id = ? AND token = ?').get(w.id, guest_token);
    if (g) guestId = g.id; // token tidak valid → RSVP tetap disimpan sebagai umum
  }
  const info = db.prepare(
    'INSERT INTO rsvps(wedding_id, guest_id, name, attendance, guest_count, message) VALUES(?,?,?,?,?,?)'
  ).run(w.id, guestId, String(name).trim(), attendance, gc, String(message || ''));
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// §4.7 — Publik: GET wishes (hanya approved, desc, paginasi)
router.get('/public/wedding/:slug/wishes', (req, res) => {
  const w = publicWedding(req.params.slug);
  if (!w) return bad(res, 404, 'Undangan tidak ditemukan.');
  let limit = parseInt(req.query.limit, 10);
  let offset = parseInt(req.query.offset, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) limit = 20;
  if (!Number.isInteger(offset) || offset < 0) offset = 0;
  const rows = db.prepare(
    `SELECT name, message, created_at FROM wedding_wishes
     WHERE wedding_id = ? AND status = 'approved' ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(w.id, limit, offset);
  res.json(rows);
});

// §4.7 — Publik: POST wishes → 201 status pending
router.post('/public/wedding/:slug/wishes', wishesWriteLimit, (req, res) => {
  const w = publicWedding(req.params.slug);
  if (!w) return bad(res, 404, 'Undangan tidak ditemukan.');
  const { name, message } = req.body || {};
  if (!name || !String(name).trim() || String(name).length > 100) {
    return bad(res, 400, 'Nama wajib diisi (maksimal 100 karakter).');
  }
  if (!message || !String(message).trim()) return bad(res, 400, 'Ucapan wajib diisi.');
  if (String(message).length > 500) return bad(res, 400, 'Ucapan maksimal 500 karakter.');
  const info = db.prepare(
    'INSERT INTO wedding_wishes(wedding_id, name, message, status) VALUES(?,?,?,\'pending\')'
  ).run(w.id, String(name).trim(), String(message).trim());
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

module.exports = router;
