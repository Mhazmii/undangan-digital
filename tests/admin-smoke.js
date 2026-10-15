#!/usr/bin/env node
/* tests/admin-smoke.js — Smoke test untuk Admin Dashboard SPA.
 *
 * Bagian A (tanpa server): validasi file ada & tidak ada "lorem ipsum".
 * Bagian B (butuh server): alur end-to-end via API:
 *   login admin/admin123 → buat wedding slug unik → tambah event → tambah guest
 *   → submit RSVP publik → submit wish publik → approve wish
 *   → cek wish muncul di public list → hapus wedding uji.
 *
 * Jalankan: node tests/admin-smoke.js [--port=3000]
 * Keluar dengan kode 0 bila semua lolos, 1 bila ada yang gagal.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const results = [];
let cookie = '';
let BASE = '';

function report(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  LULUS' : '  GAGAL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

async function req(p, opts) {
  opts = opts || {};
  const headers = Object.assign({}, opts.headers || {});
  if (cookie) headers['Cookie'] = cookie;
  if (opts.body !== undefined && !opts.raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + p, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? (opts.raw ? opts.body : JSON.stringify(opts.body)) : undefined,
    redirect: 'manual'
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/sid=([^;]+)/);
    if (m) cookie = 'sid=' + m[1];
  }
  const ct = res.headers.get('content-type') || '';
  let data = null;
  try { data = ct.includes('application/json') ? await res.json() : await res.text(); } catch (e) {}
  return { status: res.status, data };
}

function expect2xx(r) {
  if (r.status < 200 || r.status >= 300) {
    const msg = (r.data && r.data.error) || ('HTTP ' + r.status);
    throw new Error(msg);
  }
  return r.data;
}

/* Jalankan fn tanpa cookie auth (sebagai publik), lalu kembalikan cookie. */
async function asPublic(fn) {
  const saved = cookie; cookie = '';
  try { return await fn(); }
  finally { cookie = saved; }
}

/* ---------- Bagian A: validasi file ---------- */
function partA() {
  console.log('\n[A] Validasi file admin…');
  const files = [
    'public/admin/index.html',
    'public/admin/css/admin.css',
    'public/admin/js/admin.js'
  ];
  let allOk = true;
  for (const f of files) {
    const p = path.join(ROOT, f);
    const exists = fs.existsSync(p) && fs.statSync(p).size > 200;
    report('file ada: ' + f, exists, exists ? fs.statSync(p).size + ' bytes' : 'hilang/kosong');
    if (!exists) allOk = false;
  }
  const haystack = files
    .map((f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } })
    .join('\n');
  const noLorem = !/lorem ipsum/i.test(haystack);
  report('tidak ada "lorem ipsum"', noLorem);
  if (!noLorem) allOk = false;

  // cek sintaks JS
  try {
    new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'public/admin/js/admin.js'), 'utf8'));
    report('sintaks admin.js valid', true);
  } catch (e) {
    report('sintaks admin.js valid', false, e.message);
    allOk = false;
  }

  // endpoint kunci dipakai di admin.js (helper api() menambahkan prefix /api)
  const need = ["'/auth/login'", "'/weddings'", "'/templates'", "'/api/upload'",
    "'/weddings/' + S.weddingId + '/events'", "'/weddings/' + S.weddingId + '/sections'",
    "'/weddings/' + S.weddingId + '/guests'", "'/weddings/' + S.weddingId + '/rsvps'",
    "'/wishes/'", 'preview=1'];
  const missing = need.filter((n) => !haystack.includes(n));
  report('endpoint kunci dirujuk admin.js', missing.length === 0, missing.length ? 'hilang: ' + missing.join(', ') : need.length + ' endpoint');
  if (missing.length) allOk = false;
  return allOk;
}

/* ---------- Bagian B: alur API ---------- */
async function findServer(portArg) {
  const ports = portArg ? [portArg] : [3000, 8080, 5000, 8000];
  for (const p of ports) {
    try {
      const res = await fetch('http://localhost:' + p + '/api/auth/me', { signal: AbortSignal.timeout(2500) });
      await res.text().catch(() => {});
      return p;
    } catch (e) { /* coba port berikut */ }
  }
  return null;
}

async function partB() {
  console.log('\n[B] Alur end-to-end via API…');
  const portArg = process.argv.find((a) => a.startsWith('--port='));
  const port = await findServer(portArg ? Number(portArg.split('=')[1]) : null);
  if (!port) {
    console.log('  LEWATI  server backend tidak berjalan (coba port 3000/8080/5000/8000).');
    console.log('         Jalankan `node server.js` lalu ulangi test ini.');
    return null;
  }
  BASE = 'http://localhost:' + port + '/api';
  console.log('  server ditemukan di port ' + port);

  const slug = 'smoke-' + Date.now().toString(36);
  let wedding = null;

  // 1. login salah → 401
  try {
    const r = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'salah' } });
    report('login salah → 401', r.status === 401, 'status ' + r.status);
  } catch (e) { report('login salah → 401', false, e.message); }

  // 2. login benar
  try {
    const r = expect2xx(await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } }));
    report('login admin/admin123', r.ok === true && !!cookie, 'cookie sid ' + (cookie ? 'diterima' : 'HILANG'));
  } catch (e) { report('login admin/admin123', false, e.message); return false; }

  // 3. buat wedding
  try {
    wedding = expect2xx(await req('/weddings', {
      method: 'POST', body: { slug, title: 'Smoke Test Wedding', template_id: 't01' }
    }));
    report('buat wedding /' + slug, wedding.slug === slug, 'id ' + wedding.id);
  } catch (e) { report('buat wedding /' + slug, false, e.message); return false; }

  // 3b. publish (endpoint publik menolak wedding draft → 404)
  try {
    expect2xx(await req('/weddings/' + wedding.id + '/status', { method: 'POST', body: { status: 'published' } }));
    report('publish wedding', true);
  } catch (e) { report('publish wedding', false, e.message); return false; }

  // 4. tambah event
  try {
    const ev = expect2xx(await req('/weddings/' + wedding.id + '/events', {
      method: 'POST',
      body: { kind: 'akad', title: 'Akad Nikah', event_date: '2026-12-12', start_time: '08:00', venue_name: 'Gedung Tes' }
    }));
    report('tambah event akad', ev.id > 0, 'event id ' + ev.id);
  } catch (e) { report('tambah event akad', false, e.message); }

  // 5. tambah guest
  let guest = null;
  try {
    guest = expect2xx(await req('/weddings/' + wedding.id + '/guests', {
      method: 'POST', body: { name: 'Tamu Smoke', phone: '0811', group_name: 'Tes' }
    }));
    report('tambah guest', !!guest.token && guest.token.length === 12, 'token ' + guest.token);
  } catch (e) { report('tambah guest', false, e.message); }

  // 6. RSVP publik (tanpa auth)
  let rsvpOk = false;
  try {
    const r = await asPublic(() => req('/public/wedding/' + slug + '/rsvp', {
      method: 'POST',
      body: { name: 'Tamu Smoke', attendance: 'yes', guest_count: 2, message: 'Selamat!' }
    }));
    rsvpOk = r.status === 201;
    report('RSVP publik', rsvpOk, 'status ' + r.status);
  } catch (e) { report('RSVP publik', false, e.message); }

  // 7. cek summary RSVP admin
  try {
    const r = expect2xx(await req('/weddings/' + wedding.id + '/rsvps'));
    const okSum = r.summary && r.summary.total_forms >= 1 && r.summary.total_persons >= 2;
    report('summary RSVP admin', okSum, JSON.stringify(r.summary));
  } catch (e) { report('summary RSVP admin', false, e.message); }

  // 8. wish publik (pending)
  let wish = null;
  try {
    const r = await asPublic(() => req('/public/wedding/' + slug + '/wishes', {
      method: 'POST', body: { name: 'Tamu Smoke', message: 'Barakallahu laka wa baraka alaika!' }
    }));
    wish = (r.status === 201 && r.data && r.data.id) ? r.data : null;
    let pendingOk = false;
    if (wish) {
      const adm = expect2xx(await req('/weddings/' + wedding.id + '/wishes?status=pending'));
      pendingOk = Array.isArray(adm) && adm.some((w) => w.id === wish.id && w.status === 'pending');
    }
    report('wish publik (pending)', !!wish && pendingOk, 'status ' + r.status + ', id ' + (wish && wish.id));
  } catch (e) { report('wish publik (pending)', false, e.message); }

  // 9. approve wish
  try {
    if (!wish) throw new Error('wish tidak terbuat, lewati');
    const r = expect2xx(await req('/wishes/' + wish.id, { method: 'PATCH', body: { status: 'approved' } }));
    report('approve wish', r.status === 'approved', 'id ' + wish.id);
  } catch (e) { report('approve wish', false, e.message); }

  // 10. wish muncul di public list (public list hanya: name, message, created_at)
  try {
    const r = expect2xx(await asPublic(() => req('/public/wedding/' + slug + '/wishes?limit=20')));
    const found = Array.isArray(r) && r.some((w) =>
      w.name === 'Tamu Smoke' && String(w.message).includes('Barakallahu'));
    report('wish tampil di public list', found, (r.length || 0) + ' approved');
  } catch (e) { report('wish tampil di public list', false, e.message); }

  // 11. public wedding data 200 (sudah published di langkah 3b)
  try {
    const r = expect2xx(await asPublic(() => req('/public/wedding/' + slug)));
    report('public data 200', r.wedding && r.wedding.slug === slug, 'template ' + (r.wedding && r.wedding.template_id));
  } catch (e) { report('public data 200', false, e.message); }

  // 12. hapus wedding uji
  try {
    const r = expect2xx(await req('/weddings/' + wedding.id, { method: 'DELETE' }));
    report('hapus wedding uji', r.ok === true, 'id ' + wedding.id);
  } catch (e) { report('hapus wedding uji', false, e.message); }

  // 13. logout
  try {
    expect2xx(await req('/auth/logout', { method: 'POST' }));
    report('logout', true);
  } catch (e) { report('logout', false, e.message); }

  return true;
}

(async () => {
  const aOk = partA();
  const bRes = await partB();
  const failed = results.filter((r) => !r.ok);
  console.log('\n==== RINGKASAN ====');
  console.log('Total: ' + results.length + ' | Lulus: ' + (results.length - failed.length) + ' | Gagal: ' + failed.length +
    (bRes === null ? ' | (alur API dilewati: server mati)' : ''));
  if (failed.length) {
    console.log('Yang gagal:');
    failed.forEach((r) => console.log(' - ' + r.name + (r.detail ? ' (' + r.detail + ')' : '')));
  }
  process.exit(failed.length ? 1 : 0);
})();
