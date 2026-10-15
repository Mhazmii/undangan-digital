#!/usr/bin/env node
/* tests/template-smoke.js — validasi statis frontend publik + 2 template pertama.
 *
 * Mengecek:
 *  1. Semua file wajib ada (motion.js, i.html, invite.js, t01/t02 × meta/style/template/thumbnail).
 *  2. meta.json valid: field wajib, id == nama direktori, category sesuai kontrak §5.
 *  3. style.css: SEMUA selector ter-scope di bawah .tpl-<id> (kontrak §5).
 *  4. template.js: sintaks ESM valid, export `render` (function) + `opening`
 *     bernilai salah satu dari fade|curtain|envelope|mask|cinematic.
 *  5. Tidak ada "lorem ipsum" di file frontend/template.
 *  6. motion.js mengekspor initReveals; invite.js memuat state machine & endpoint publik.
 *  7. Bila server backend sudah jalan: GET /api/public/wedding/demo dan verifikasi
 *     shape data sesuai kontrak §4.8 (+ endpoint guest). Jika belum jalan → SKIP,
 *     test tetap lolos dan bisa dijalankan ulang nanti.
 *
 * Cara pakai: node tests/template-smoke.js   (dari ~/workspace/wedding-invitation)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const TPLS = ['t01', 't02'];
const OPENINGS = ['fade', 'curtain', 'envelope', 'mask', 'cinematic'];
const CATEGORIES = ['editorial', 'minimalist', 'romantic', 'classic', 'dark', 'garden', 'traditional', 'cinematic'];

let pass = 0, fail = 0, skip = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function bad(name, detail) { fail++; failures.push(name); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function skipped(name, detail) { skip++; console.log(`  ○ ${name} (SKIP: ${detail})`); }
const read = (p) => fs.readFileSync(p, 'utf8');

/* ---------- 1. file wajib ada ---------- */
console.log('\n[1] Kelengkapan file');
const required = [
  'public/js/motion.js',
  'public/i.html',
  'public/js/invite.js',
  ...TPLS.flatMap((t) => [
    `public/templates/${t}/meta.json`,
    `public/templates/${t}/style.css`,
    `public/templates/${t}/template.js`,
    `public/templates/${t}/thumbnail.svg`,
  ]),
];
for (const rel of required) {
  fs.existsSync(path.join(ROOT, rel)) ? ok(rel) : bad(rel, 'file tidak ditemukan');
}

/* ---------- 2. meta.json ---------- */
console.log('\n[2] meta.json');
for (const t of TPLS) {
  const p = path.join(PUBLIC, 'templates', t, 'meta.json');
  if (!fs.existsSync(p)) { bad(`${t}/meta.json`, 'tidak ada'); continue; }
  let m;
  try { m = JSON.parse(read(p)); }
  catch (e) { bad(`${t}/meta.json`, 'JSON tidak valid: ' + e.message); continue; }
  const need = ['id', 'name', 'description', 'category', 'active'];
  const missing = need.filter((k) => !(k in m));
  missing.length ? bad(`${t}/meta.json`, 'field hilang: ' + missing.join(',')) : ok(`${t}/meta.json field lengkap`);
  m.id === t ? ok(`${t} id cocok direktori`) : bad(`${t}/meta.json`, `id "${m.id}" != "${t}"`);
  CATEGORIES.includes(m.category) ? ok(`${t} category "${m.category}" valid`) : bad(`${t}/meta.json`, `category "${m.category}" tak dikenal`);
}

/* ---------- 3. scoping style.css ---------- */
console.log('\n[3] Scoping style.css di bawah .tpl-<id>');
function lintScope(css, scope) {
  const errs = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  let selStart = 0, i = 0;
  const skipActive = () => stack.includes('skip');
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === '{') {
      const sel = clean.slice(selStart, i).trim();
      if (/^@media\b/.test(sel)) stack.push('media');
      else if (sel.startsWith('@')) stack.push('skip');
      else {
        stack.push('rule');
        if (!skipActive()) {
          for (const part of sel.split(',')) {
            const s = part.trim();
            if (s && !s.includes(scope)) errs.push(s);
          }
        }
      }
      selStart = i + 1;
    } else if (ch === '}') {
      stack.pop();
      selStart = i + 1;
    }
    i++;
  }
  return errs;
}
for (const t of TPLS) {
  const p = path.join(PUBLIC, 'templates', t, 'style.css');
  if (!fs.existsSync(p)) { bad(`${t}/style.css`, 'tidak ada'); continue; }
  const css = read(p);
  const errs = lintScope(css, `.tpl-${t}`);
  errs.length
    ? bad(`${t}/style.css scoping`, `${errs.length} selector bocor, cth: ${errs.slice(0, 3).join(' | ')}`)
    : ok(`${t}/style.css semua selector ter-scope .tpl-${t}`);
  new RegExp(`\\.tpl-${t}\\s*\\{[^}]*--[\\w-]+:`).test(css)
    ? ok(`${t}/style.css mendefinisikan design tokens`)
    : bad(`${t}/style.css`, 'tidak ada CSS var token di scope root');
}

/* ---------- 4. template.js: sintaks + exports ---------- */
console.log('\n[4] template.js (ESM valid + kontrak ekspor)');
function esmCheck(src, label) {
  const tmp = path.join(os.tmpdir(), `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp, src);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    ok(`${label} sintaks ESM valid`);
    return true;
  } catch (e) {
    bad(`${label} sintaks`, String(e.stderr || e.message).split('\n').slice(0, 3).join(' '));
    return false;
  } finally { try { fs.unlinkSync(tmp); } catch {} }
}
for (const t of TPLS) {
  const p = path.join(PUBLIC, 'templates', t, 'template.js');
  if (!fs.existsSync(p)) { bad(`${t}/template.js`, 'tidak ada'); continue; }
  const src = read(p);
  if (!esmCheck(src, `${t}/template.js`)) continue;
  /export\s+(async\s+)?function\s+render\s*\(/.test(src)
    ? ok(`${t} export function render(w, root)`) : bad(`${t}/template.js`, 'tidak mengekspor function render');
  const mo = src.match(/export\s+const\s+opening\s*=\s*['"]([^'"]+)['"]/);
  mo && OPENINGS.includes(mo[1])
    ? ok(`${t} export const opening = '${mo[1]}'`)
    : bad(`${t}/template.js`, `opening tidak valid: ${mo ? mo[1] : '(tidak ditemukan)'}`);
  src.includes('data-reveal')
    ? ok(`${t} memakai [data-reveal] (motion system)`) : bad(`${t}/template.js`, 'tidak memakai data-reveal');
  /esc\s*\(/.test(src)
    ? ok(`${t} meng-escape output (anti-XSS)`) : bad(`${t}/template.js`, 'tidak terlihat esc()');
}

/* ---------- 5. tanpa lorem ipsum ---------- */
console.log('\n[5] Tanpa "lorem ipsum"');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const textExts = ['.js', '.html', '.css', '.json', '.svg', '.md'];
const hitFiles = [];
for (const f of walk(PUBLIC)) {
  if (!textExts.includes(path.extname(f))) continue;
  if (/lorem\s+ipsum/i.test(read(f))) hitFiles.push(path.relative(ROOT, f));
}
hitFiles.length ? bad('lorem ipsum', 'ditemukan di: ' + hitFiles.join(', ')) : ok('tidak ada "lorem ipsum" di public/');

/* ---------- 6. motion.js & invite.js ---------- */
console.log('\n[6] motion.js & invite.js');
{
  const mp = path.join(PUBLIC, 'js', 'motion.js');
  if (fs.existsSync(mp)) {
    const src = read(mp);
    esmCheck(src, 'motion.js');
    /export\s+(async\s+)?function\s+initReveals/.test(src)
      ? ok('motion.js export initReveals()') : bad('motion.js', 'initReveals tidak diekspor');
    /prefers-reduced-motion/.test(src)
      ? ok('motion.js hormati prefers-reduced-motion') : bad('motion.js', 'tidak ada cek reduced-motion');
    /IntersectionObserver/.test(src)
      ? ok('motion.js memakai IntersectionObserver') : bad('motion.js', 'tanpa IntersectionObserver');
    /unobserve/.test(src)
      ? ok('motion.js unobserve setelah reveal') : bad('motion.js', 'tidak unobserve');
  } else bad('motion.js', 'tidak ada');

  const ip = path.join(PUBLIC, 'js', 'invite.js');
  const hp = path.join(PUBLIC, 'i.html');
  if (fs.existsSync(ip) && fs.existsSync(hp)) {
    const src = read(ip), html = read(hp);
    esmCheck(src, 'invite.js');
    const checks = [
      [/\/api\/public\/wedding\//, 'fetch GET /api/public/wedding/:slug'],
      [/\/guest\//, 'fetch nama tamu /guest/:token'],
      [/import\(\s*`\/templates\//, 'dynamic import() template.js'],
      [/style\.css/, 'inject style.css template'],
      [/loading.*cover.*opening.*main/is, 'state machine loading→cover→opening→main'],
      [/openingInProgress|double-click/i, 'pengaman double-click'],
      [/new Audio\(/, 'musik via Audio (setelah klik)'],
      [/data-action="open-invite"|data-action:\s*['"]open-invite/, 'tombol Buka Undangan'],
      [/\/rsvp/, 'POST RSVP'],
      [/\/wishes/, 'GET/POST wishes'],
      [/wa\.me\/\?text=/, 'share WhatsApp wa.me/?text='],
      [/navigator\.clipboard|execCommand\(['"]copy/, 'salin rekening (clipboard + fallback)'],
      [/data-cd-d/, 'countdown bindings'],
      [/status.{0,8}===?\s*404|404/, 'penanganan 404'],
    ];
    for (const [re, name] of checks) re.test(src) ? ok(`invite.js: ${name}`) : bad('invite.js', 'hilang: ' + name);
    const htmlChecks = [
      [/<section[^>]*id="cover"/, 'shell #cover'],
      [/<main[^>]*id="main"/, 'shell #main'],
      [/id="loading"/, 'shell #loading'],
      [/id="error"/, 'shell #error'],
      [/id="music-btn"/, 'tombol musik'],
      [/type="module"[^>]*invite\.js|invite\.js[^>]*type="module"/, 'script module invite.js'],
    ];
    for (const [re, name] of htmlChecks) re.test(html) ? ok(`i.html: ${name}`) : bad('i.html', 'hilang: ' + name);
  } else bad('invite.js/i.html', 'file tidak ada');
}

/* ---------- 7. live check ke backend (opsional) ---------- */
console.log('\n[7] Live check API (bila server jalan)');
async function liveCheck() {
  const ports = [...new Set([process.env.PORT, 3000, 8080, 5000, 8000].filter(Boolean))];
  const timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
  for (const port of ports) {
    const base = `http://127.0.0.1:${port}`;
    try {
      const r = await fetch(`${base}/api/public/wedding/demo`, { signal: timeout(3000) });
      if (r.status === 404) {
        skipped('GET /api/public/wedding/demo', `server :${port} jalan tapi slug "demo" 404 (seed belum dijalankan?)`);
        return;
      }
      if (!r.ok) continue;
      const d = await r.json();
      ok(`server merespons di :${port}`);
      const w = d.wedding || {};
      ['id', 'slug', 'title', 'template_id'].every((k) => k in w) && 'theme_config' in w && 'music_url' in w
        ? ok('shape wedding {id,slug,title,template_id,theme_config,music_url} sesuai §4.8')
        : bad('shape wedding', 'field tidak lengkap: ' + Object.keys(w).join(','));
      w.slug === 'demo' ? ok('slug demo cocok') : bad('slug demo', `dapat "${w.slug}"`);
      Array.isArray(d.events) && d.events.every((e) => 'kind' in e && 'event_date' in e && 'title' in e)
        ? ok(`events[] valid (${d.events.length} event)`) : bad('shape events', JSON.stringify(d.events).slice(0, 120));
      Array.isArray(d.sections) && d.sections.every((s) => 'section_key' in s)
        ? ok(`sections[] valid (${d.sections.length} section enabled)`) : bad('shape sections', 'invalid');
      Array.isArray(d.gallery) ? ok(`gallery[] valid (${d.gallery.length} foto)`) : bad('shape gallery', 'bukan array');
      Array.isArray(d.gifts) ? ok(`gifts[] valid (${d.gifts.length} metode)`) : bad('shape gifts', 'bukan array');
      // endpoint guest (token contoh dari seed)
      try {
        const g = await fetch(`${base}/api/public/wedding/demo/guest/dem0guest001`, { signal: timeout(3000) });
        if (g.ok) {
          const gj = await g.json();
          gj && gj.name ? ok(`guest endpoint → nama "${gj.name}"`) : bad('guest endpoint', 'tanpa field name');
        } else skipped('guest endpoint', `HTTP ${g.status}`);
      } catch { skipped('guest endpoint', 'gagal fetch'); }
      return;
    } catch { /* coba port berikutnya */ }
  }
  skipped('live check API', 'server backend belum berjalan (node server.js). Jalankan ulang test ini setelah server + seed siap.');
}

/* ---------- 8. render aktual template.js dengan data mock (§4.8) ---------- */
console.log('\n[8] Render aktual template.js (mock data §4.8)');
async function renderCheck() {
  const J = (o) => JSON.stringify(o);
  const mockW = {
    wedding: { id: 1, slug: 'demo', title: 'Aisyah Putri & Rizky Pratama', template_id: 't01', theme_config: '{}', music_url: '' },
    events: [
      { id: 1, kind: 'akad', title: 'Akad Nikah', event_date: '2026-12-12', start_time: '08:00', end_time: '10:00', venue_name: 'Gedung Serbaguna Graha Cinta', address: 'Jl. Kenanga No. 88, Jakarta Selatan', maps_url: 'https://maps.google.com/?q=x', sort_order: 0 },
      { id: 2, kind: 'resepsi', title: 'Resepsi', event_date: '2026-12-12', start_time: '11:00', end_time: '14:00', venue_name: 'Gedung Serbaguna Graha Cinta', address: 'Jl. Kenanga No. 88', maps_url: '', sort_order: 1 },
    ],
    sections: [
      'cover', 'hero', 'quote', 'couple', 'parents', 'events', 'countdown', 'story',
      'gallery', 'rsvp', 'wishes', 'gift', 'location', 'dresscode', 'info', 'closing',
    ].map((k, i) => ({ section_key: k, enabled: 1, sort_order: i, config: J({
      cover: { title: 'Undangan Pernikahan', names: 'Aisyah Putri & Rizky Pratama', date: 'Sabtu, 12 Desember 2026' },
      hero: { greeting: "Assalamu'alaikum Wr. Wb.", text: 'Teks hero.' },
      quote: { text: 'Kutipan.', source: 'Sumber' },
      couple: { bride_name: '<script>alert("xss")</script>', bride_parents: 'Putri dari B & I', groom_name: 'Rizky Pratama', groom_parents: 'Putra dari B & I' },
      parents: { text: 'Keluarga berbahagia.' },
      events: { note: 'Catatan acara.' },
      countdown: { text: 'Hitung mundur.' },
      story: { items: [{ date: '2019', title: 'Bertemu', text: 'Awal cerita.' }] },
      gallery: { title: 'Galeri' },
      rsvp: { note: 'RSVP note.' },
      wishes: { title: 'Ucapan', note: 'Note.' },
      gift: { note: 'Gift note.' },
      location: { note: 'Lokasi note.' },
      dresscode: { text: 'Earth tone.' },
      info: { text: 'Info.' },
      closing: { text: 'Terima kasih.' },
    }[k] || {}) })),
    gallery: [
      { id: 1, url: '/assets/placeholder-photo-1.svg', caption: 'Foto 1', sort_order: 0 },
      { id: 2, url: '/assets/placeholder-photo-2.svg', caption: 'Foto 2', sort_order: 1 },
    ],
    gifts: [
      { id: 1, type: 'bank', provider: 'BCA', account_number: '1234567890', account_name: 'Aisyah Putri', note: '' },
    ],
  };
  const needIds = ['sec-hero', 'sec-quote', 'sec-couple', 'sec-parents', 'sec-events', 'sec-countdown',
    'sec-story', 'sec-gallery', 'sec-rsvp', 'sec-wishes', 'sec-gift', 'sec-location',
    'sec-dresscode', 'sec-info', 'sec-closing'];
  for (const t of TPLS) {
    const srcPath = path.join(PUBLIC, 'templates', t, 'template.js');
    const tmp = path.join(os.tmpdir(), `tmpl-${t}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.copyFileSync(srcPath, tmp);
    global.document = { getElementById: () => ({ stub: true }) }; // ensureFonts() early-return
    try {
      const mod = await import('file://' + tmp);
      const root = { innerHTML: '' };
      mod.render(mockW, root);
      const html = root.innerHTML;
      const missing = needIds.filter((id) => !html.includes(id));
      missing.length
        ? bad(`${t} render sections`, 'hilang: ' + missing.join(','))
        : ok(`${t} render 15 section (cover milik shell)`);
      const widgets = ['id="rsvp-form"', 'id="wish-form"', 'id="wishes-list"', 'id="wishes-more"',
        'data-countdown', 'data-cd-d', 'data-action="copy-text"', 'data-action="share-wa"',
        'data-action="scroll-to"', 'data-reveal'];
      const missingW = widgets.filter((s) => !html.includes(s));
      missingW.length
        ? bad(`${t} render widgets`, 'hilang: ' + missingW.join(','))
        : ok(`${t} render memuat form RSVP/wishes, countdown, copy, share`);
      // XSS: nama berisi <script> harus ter-escape
      const xssRaw = html.includes('<script>alert');
      const xssEsc = html.includes('&lt;script&gt;');
      !xssRaw && xssEsc
        ? ok(`${t} output ter-escape (uji XSS lolos)`)
        : bad(`${t} XSS`, xssRaw ? 'HTML mentah lolos!' : 'tidak ada output ter-escape');
      // empty state galeri
      const emptyW = { ...mockW, gallery: [] };
      const root2 = { innerHTML: '' };
      mod.render(emptyW, root2);
      /segera hadir|segera ditulis|diumumkan segera/i.test(root2.innerHTML)
        ? ok(`${t} empty state galeri ditangani`)
        : bad(`${t} empty state`, 'tidak ada pesan empty state');
    } catch (e) {
      delete global.document;
      bad(`${t} render`, 'throw: ' + String(e.message).split('\n')[0]);
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
}

liveCheck().then(() => renderCheck()).then(() => {
  console.log(`\n==== HASIL: ${pass} lolos, ${fail} gagal, ${skip} skip ====`);
  if (failures.length) console.log('Gagal: ' + failures.join(', '));
  process.exit(fail ? 1 : 0);
});
