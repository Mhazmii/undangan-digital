// routes/backup.js — GET /api/backup (auth): unduh salinan konsisten database.
// Memakai better-sqlite3 db.backup() (SQLite online backup API): aman dipanggil
// saat server berjalan dan ada tulis konkuren. File sementara dihapus setelah dikirim.
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { bad } = require('../lib/util');

const router = express.Router();
router.use('/backup', requireAuth);

router.get('/backup', async (req, res) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const tmp = path.join(os.tmpdir(), `wedding-backup-${Date.now()}-${process.pid}.db`);
  try {
    await db.backup(tmp);
  } catch (e) {
    return bad(res, 500, 'Backup database gagal.');
  }
  res.download(tmp, `wedding-backup-${stamp}.db`, (err) => {
    fs.unlink(tmp, () => {});
    if (err && !res.headersSent) bad(res, 500, 'Gagal mengirim file backup.');
  });
});

module.exports = router;
