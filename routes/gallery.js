// routes/gallery.js — §4.4 gallery (auth). GET/POST/PUT/DELETE.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

function loadWedding(req, res) {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) { bad(res, 404, 'Wedding tidak ditemukan.'); return null; }
  return w;
}

router.get('/weddings/:id/gallery', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  res.json(db.prepare('SELECT * FROM gallery_images WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id));
});

router.post('/weddings/:id/gallery', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const { url, caption, sort_order } = req.body || {};
  if (!url || !String(url).trim()) return bad(res, 400, 'URL gambar wajib diisi.');
  if (sort_order !== undefined && !Number.isInteger(sort_order)) return bad(res, 400, 'sort_order harus bilangan bulat.');
  const info = db.prepare(
    'INSERT INTO gallery_images(wedding_id, url, caption, sort_order) VALUES(?,?,?,?)'
  ).run(w.id, String(url).trim(), String(caption || ''), sort_order ?? 0);
  res.status(201).json(db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/weddings/:id/gallery/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const g = db.prepare('SELECT * FROM gallery_images WHERE id = ? AND wedding_id = ?').get(req.params.gid, w.id);
  if (!g) return bad(res, 404, 'Gambar tidak ditemukan.');
  const { url, caption, sort_order } = req.body || {};
  if (url !== undefined && !String(url).trim()) return bad(res, 400, 'URL gambar tidak boleh kosong.');
  if (sort_order !== undefined && !Number.isInteger(sort_order)) return bad(res, 400, 'sort_order harus bilangan bulat.');
  db.prepare('UPDATE gallery_images SET url = COALESCE(?, url), caption = COALESCE(?, caption), sort_order = COALESCE(?, sort_order) WHERE id = ?')
    .run(url !== undefined ? String(url).trim() : null, caption !== undefined ? String(caption) : null, sort_order ?? null, g.id);
  res.json(db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(g.id));
});

router.delete('/weddings/:id/gallery/:gid', (req, res) => {
  const w = loadWedding(req, res); if (!w) return;
  const info = db.prepare('DELETE FROM gallery_images WHERE id = ? AND wedding_id = ?').run(req.params.gid, w.id);
  if (!info.changes) return bad(res, 404, 'Gambar tidak ditemukan.');
  res.json({ ok: true });
});

module.exports = router;
