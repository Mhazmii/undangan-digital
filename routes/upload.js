// routes/upload.js — §4.9 Upload (auth). multipart `file`, wedding_id di query/body.
// Validasi: image/jpeg|png|webp atau audio/mpeg, ≤5MB. Simpan ke public/uploads/<wedding_id>/.
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOwnedWedding, bad } = require('../lib/util');

const router = express.Router();
router.use('/upload', requireAuth);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg']);
const MAX_BYTES = 5 * 1024 * 1024;

function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
}

const storage = multer.diskStorage({
  // Tahap 1: simpan ke staging _tmp dulu, karena wedding_id (multipart body)
  // baru tersedia setelah multer mem-parse request. Setelah validasi,
  // file dipindah ke public/uploads/<wedding_id>/.
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'public', 'uploads', '_tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + safeName(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Tipe file tidak didukung. Hanya jpeg, png, webp, mp3.'));
  }
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return bad(res, 413, 'Ukuran file melebihi 5MB.');
      return bad(res, 400, err.message || 'Upload gagal.');
    }
    if (!req.file) return bad(res, 400, 'Field file wajib diisi.');
    // wedding_id boleh di query string ATAU multipart body (terbaca setelah parse).
    const wid = req.query.wedding_id || req.body.wedding_id;
    const w = wid ? getOwnedWedding(wid, req.user) : null;
    if (!w) {
      fs.unlink(req.file.path, () => {});
      return bad(res, 400, 'wedding_id wajib dan harus milik Anda.');
    }
    const dir = path.join(__dirname, '..', 'public', 'uploads', String(w.id));
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, path.basename(req.file.filename));
    fs.renameSync(req.file.path, dest);
    const url = `/uploads/${w.id}/${path.basename(req.file.filename)}`;
    const kind = req.file.mimetype.startsWith('audio/') ? 'music' : 'photo';
    db.prepare('INSERT INTO media_assets(wedding_id, kind, url, label) VALUES(?,?,?,?)')
      .run(w.id, kind, url, req.file.originalname);
    res.json({ url });
  });
});

module.exports = router;
