// server.js — bootstrap Express: mount routes, serve static, route /i/:slug.
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

require('./db'); // buka DB + jalankan schema (idempotent)

const { optionalAuth } = require('./middleware/auth');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/templates'));
app.use('/api', require('./routes/weddings'));
app.use('/api', require('./routes/events'));
app.use('/api', require('./routes/sections'));
app.use('/api', require('./routes/gallery'));
app.use('/api', require('./routes/gifts'));
app.use('/api', require('./routes/guests'));
app.use('/api', require('./routes/rsvp'));
app.use('/api', require('./routes/wishes'));
app.use('/api', require('./routes/upload'));
app.use('/api', require('./routes/backup'));
app.use('/api', require('./routes/public'));

// Static
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Route undangan publik: /i/:slug dan /i/:slug/t/:token → public/i.html
// Jika wedding draft tapi request membawa cookie sid valid → tetap serve (preview).
function serveInvite(req, res) {
  const slug = req.params.slug;
  const w = db.prepare('SELECT status FROM weddings WHERE slug = ?').get(slug);
  if (!w) return res.status(404).send('Undangan tidak ditemukan.');
  if (w.status !== 'published') {
    const { getUserFromRequest } = require('./middleware/auth');
    if (!getUserFromRequest(req)) {
      return res.status(404).send('Undangan tidak ditemukan.');
    }
  }
  res.sendFile(path.join(__dirname, 'public', 'i.html'));
}
app.get('/i/:slug', optionalAuth, serveInvite);
app.get('/i/:slug/t/:token', optionalAuth, serveInvite);

// 404 JSON untuk /api yang tidak dikenal
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

// Error handler umum (format kontrak)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Wedding Invitation Studio berjalan di http://localhost:${PORT}`);
});
