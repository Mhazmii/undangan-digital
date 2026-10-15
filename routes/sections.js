// routes/sections.js — §4.4 sections (auth). GET + bulk upsert via PUT.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, SECTION_KEYS, bad } = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

router.get('/weddings/:id/sections', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  res.json(db.prepare('SELECT section_key, enabled, sort_order, config FROM wedding_sections WHERE wedding_id = ? ORDER BY sort_order').all(w.id));
});

router.put('/weddings/:id/sections', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const { sections } = req.body || {};
  if (!Array.isArray(sections)) return bad(res, 400, 'Body harus {sections:[...]}.');
  for (const s of sections) {
    if (!s || !SECTION_KEYS.has(s.section_key)) return bad(res, 400, `section_key tidak dikenal: ${s && s.section_key}.`);
    if (s.config !== undefined) {
      try { if (typeof s.config === 'string') JSON.parse(s.config); else JSON.stringify(s.config); }
      catch { return bad(res, 400, `config untuk ${s.section_key} harus JSON valid.`); }
    }
  }
  const upsert = db.prepare(
    `INSERT INTO wedding_sections(wedding_id, section_key, enabled, sort_order, config)
     VALUES(?,?,?,?,?)
     ON CONFLICT(wedding_id, section_key) DO UPDATE SET enabled=excluded.enabled, sort_order=excluded.sort_order, config=excluded.config`
  );
  const tx = db.transaction(() => {
    for (const s of sections) {
      const cfg = typeof s.config === 'string' ? s.config : JSON.stringify(s.config ?? {});
      upsert.run(w.id, s.section_key, s.enabled ? 1 : 0,
        Number.isInteger(s.sort_order) ? s.sort_order : 0, cfg);
    }
  });
  tx();
  db.prepare('UPDATE weddings SET updated_at = datetime(\'now\') WHERE id = ?').run(w.id);
  res.json(db.prepare('SELECT section_key, enabled, sort_order, config FROM wedding_sections WHERE wedding_id = ? ORDER BY sort_order').all(w.id));
});

module.exports = router;
