// routes/weddings.js — §4.3 Weddings (auth).
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  getWedding, getOwnedWedding, isValidSlug, WEDDING_STATUS, SECTION_KEYS, bad
} = require('../lib/util');

const router = express.Router();
router.use('/weddings', requireAuth);

function weddingDetail(w) {
  const events = db.prepare('SELECT * FROM wedding_events WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id);
  const sections = db.prepare('SELECT section_key, enabled, sort_order, config FROM wedding_sections WHERE wedding_id = ? ORDER BY sort_order').all(w.id);
  const gallery = db.prepare('SELECT * FROM gallery_images WHERE wedding_id = ? ORDER BY sort_order, id').all(w.id);
  const gifts = db.prepare('SELECT * FROM gift_methods WHERE wedding_id = ? ORDER BY id').all(w.id);
  return { ...w, events, sections, gallery, gifts };
}

function validThemeConfig(v) {
  if (v === undefined || v === null) return '{}';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string') {
    try { JSON.parse(v); return v; } catch { return null; }
  }
  return null;
}

router.get('/weddings', (req, res) => {
  const rows = db.prepare('SELECT * FROM weddings ORDER BY id DESC').all();
  res.json(rows);
});

router.post('/weddings', (req, res) => {
  const { slug, title, template_id } = req.body || {};
  if (!isValidSlug(slug)) return bad(res, 400, 'Slug tidak valid. Gunakan huruf kecil, angka, tanda hubung (3–60 karakter).');
  if (!title || !String(title).trim()) return bad(res, 400, 'Judul wajib diisi.');
  const tplId = template_id || 't01';
  const tpl = db.prepare('SELECT id FROM templates WHERE id = ?').get(tplId);
  if (!tpl) return bad(res, 400, 'template_id tidak dikenal.');
  const exists = db.prepare('SELECT id FROM weddings WHERE slug = ?').get(slug);
  if (exists) return bad(res, 409, 'Slug sudah dipakai.');
  // Wedding baru otomatis mendapat 16 section standar (semua enabled),
  // sehingga undangan langsung bisa dipratinjau/diisi tanpa langkah init manual.
  const wid = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO weddings(slug, title, template_id, owner_id) VALUES(?,?,?,?)'
    ).run(slug, String(title).trim(), tplId, req.user.id);
    const secStmt = db.prepare(
      'INSERT INTO wedding_sections(wedding_id, section_key, enabled, sort_order, config) VALUES(?,?,?,?,?)'
    );
    let i = 0;
    for (const key of SECTION_KEYS) secStmt.run(info.lastInsertRowid, key, 1, i++, '{}');
    return info.lastInsertRowid;
  })();
  return res.status(201).json(getWedding(wid));
});

router.get('/weddings/:id', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  res.json(weddingDetail(w));
});

router.put('/weddings/:id', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const { title, template_id, theme_config, music_url, status } = req.body || {};
  const updates = {};
  if (title !== undefined) {
    if (!String(title).trim()) return bad(res, 400, 'Judul tidak boleh kosong.');
    updates.title = String(title).trim();
  }
  if (template_id !== undefined) {
    const tpl = db.prepare('SELECT id FROM templates WHERE id = ?').get(template_id);
    if (!tpl) return bad(res, 400, 'template_id tidak dikenal.');
    updates.template_id = template_id;
  }
  if (theme_config !== undefined) {
    const tc = validThemeConfig(theme_config);
    if (tc === null) return bad(res, 400, 'theme_config harus JSON valid.');
    updates.theme_config = tc;
  }
  if (music_url !== undefined) updates.music_url = String(music_url);
  if (status !== undefined) {
    if (!WEDDING_STATUS.has(status)) return bad(res, 400, 'status harus draft atau published.');
    updates.status = status;
  }
  if (Object.keys(updates).length) {
    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE weddings SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(updates), w.id);
  }
  res.json(getWedding(w.id));
});

router.delete('/weddings/:id', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  db.prepare('DELETE FROM weddings WHERE id = ?').run(w.id);
  res.json({ ok: true });
});

router.post('/weddings/:id/duplicate', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const { slug } = req.body || {};
  if (!isValidSlug(slug)) return bad(res, 400, 'Slug baru wajib diisi dan valid (huruf kecil, angka, tanda hubung, 3–60 karakter).');
  if (db.prepare('SELECT id FROM weddings WHERE slug = ?').get(slug)) {
    return bad(res, 409, 'Slug sudah dipakai.');
  }
  const dup = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO weddings(slug, title, template_id, theme_config, music_url, status, owner_id) VALUES(?,?,?,?,?,\'draft\',?)'
    ).run(slug, w.title + ' (copy)', w.template_id, w.theme_config, w.music_url, req.user.id);
    const nid = info.lastInsertRowid;
    for (const t of ['wedding_events','wedding_sections','gallery_images','gift_methods','media_assets']) {
      const cols = {
        wedding_events: ['kind','title','event_date','start_time','end_time','venue_name','address','maps_url','sort_order'],
        wedding_sections: ['section_key','enabled','sort_order','config'],
        gallery_images: ['url','caption','sort_order'],
        gift_methods: ['type','provider','account_number','account_name','note'],
        media_assets: ['kind','url','label']
      }[t];
      const rows = db.prepare(`SELECT ${cols.join(',')} FROM ${t} WHERE wedding_id = ?`).all(w.id);
      const stmt = db.prepare(`INSERT INTO ${t}(wedding_id,${cols.join(',')}) VALUES(?,${cols.map(()=>'?').join(',')})`);
      for (const r of rows) stmt.run(nid, ...cols.map(c => r[c]));
    }
    // Tamu ikut diduplikasi TANPA token yang sama — token baru per tamu.
    const guests = db.prepare('SELECT name, phone, group_name FROM wedding_guests WHERE wedding_id = ?').all(w.id);
    const gstmt = db.prepare('INSERT INTO wedding_guests(wedding_id,name,phone,token,group_name) VALUES(?,?,?,?,?)');
    for (const g of guests) {
      let token;
      do { token = require('../lib/util').genToken(12); }
      while (db.prepare('SELECT id FROM wedding_guests WHERE token = ?').get(token));
      gstmt.run(nid, g.name, g.phone, token, g.group_name);
    }
    return getWedding(nid);
  })();
  res.status(201).json(dup);
});

router.post('/weddings/:id/status', (req, res) => {
  const w = getOwnedWedding(req.params.id, req.user);
  if (!w) return bad(res, 404, 'Wedding tidak ditemukan.');
  const { status } = req.body || {};
  if (!WEDDING_STATUS.has(status)) return bad(res, 400, 'status harus draft atau published.');
  db.prepare('UPDATE weddings SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, w.id);
  res.json(getWedding(w.id));
});

module.exports = router;
module.exports.weddingDetail = weddingDetail;
