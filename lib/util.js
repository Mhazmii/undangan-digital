// lib/util.js — helper bersama route backend.
const crypto = require('crypto');
const db = require('../db');

const SLUG_RE = /^[a-z0-9-]{3,60}$/;
const SECTION_KEYS = new Set([
  'cover','hero','quote','couple','parents','events','countdown','story',
  'gallery','rsvp','wishes','gift','location','dresscode','info','closing'
]);
const WEDDING_STATUS = new Set(['draft','published']);
const ATTENDANCE = new Set(['yes','no']);
const WISH_STATUS = new Set(['pending','approved','hidden']);
const EVENT_KIND = new Set(['akad','resepsi','custom']);

function getWedding(id) {
  return db.prepare('SELECT * FROM weddings WHERE id = ?').get(id);
}

function getWeddingBySlug(slug) {
  return db.prepare('SELECT * FROM weddings WHERE slug = ?').get(slug);
}

// Untuk admin tunggal: semua wedding dianggap milik owner. Jika owner_id di-set dan
// tidak cocok dengan user saat ini → null. (Kontrak §4.3: list milik owner).
function getOwnedWedding(id, user) {
  const w = getWedding(id);
  if (!w) return null;
  if (w.owner_id && user && w.owner_id !== user.id) return null;
  return w;
}

function isValidSlug(s) { return typeof s === 'string' && SLUG_RE.test(s); }

function genToken(len = 12) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4)).toString('base64url').slice(0, len);
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function parseCsv(text) {
  // Parser CSV sederhana yang menangani kutip ganda.
  const rows = [];
  let row = [], cur = '', inQ = false;
  const t = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.map(r => r.map(v => v.trim())).filter(r => r.some(v => v !== ''));
}

function bad(res, status, msg) {
  return res.status(status).json({ error: msg });
}

function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

module.exports = {
  SLUG_RE, SECTION_KEYS, WEDDING_STATUS, ATTENDANCE, WISH_STATUS, EVENT_KIND,
  getWedding, getWeddingBySlug, getOwnedWedding, isValidSlug, genToken,
  csvEscape, parseCsv, bad, validDate
};
