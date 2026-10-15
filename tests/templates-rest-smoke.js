#!/usr/bin/env node
/* tests/templates-rest-smoke.js — validasi 6 template tersisa (t03–t08) + galeri + pratinjau.
 *
 * Mengecek:
 *  1. 24 file wajib ada (6 template × meta.json/style.css/template.js/thumbnail.svg)
 *     + public/templates.html + public/js/templates.js + public/preview.html
 *     + public/js/preview.js + public/js/sample-wedding.js.
 *  2. meta.json valid: field lengkap, id == direktori, category sesuai kontrak §5,
 *     nama/deskripsi cocok dengan identitas yang ditetapkan.
 *  3. style.css: SEMUA selector ter-scope di bawah .tpl-<id> (kontrak §5),
 *     design tokens terdefinisi.
 *  4. template.js: sintaks ESM valid (node --check), export function render(w, root),
 *     export const opening ∈ {fade,curtain,envelope,mask,cinematic},
 *     memakai [data-reveal], meng-escape output (esc()).
 *  5. Render aktual tiap template dengan public/js/sample-wedding.js memakai DOM
 *     stub ringan: 15 section ter-render (cover milik shell → tidak di-render),
 *     widget terikat shell (rsvp/wishes/countdown/copy/share/scroll), uji XSS,
 *     empty state galeri.
 *  6. Tidak ada "lorem ipsum" di file t03–t08.
 *  7. Tidak ada emoji sebagai ikon (regex rentang emoji) di template.js/css/svg.
 *  8. thumbnail.svg: XML well-formed + tanpa referensi eksternal (<image>/http).
 *  9. sample-wedding.js: bentuk persis response GET /api/public/wedding/:slug (§4.8).
 *
 * Cara pakai: node tests/templates-rest-smoke.js   (dari ~/workspace/wedding-invitation)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const TPLS = ['t03', 't04', 't05', 't06', 't07', 't08'];
const OPENINGS = ['fade', 'curtain', 'envelope', 'mask', 'cinematic'];
const CATEGORIES = ['editorial', 'minimalist', 'romantic', 'classic', 'dark', 'garden', 'traditional', 'cinematic'];
const EXPECTED = {
  t03: { name: 'Botanical Romance', category: 'romantic', opening: 'curtain' },
  t04: { name: 'Royal Classic', category: 'classic', opening: 'envelope' },
  t05: { name: 'Contemporary Dark', category: 'dark', opening: 'cinematic' },
  t06: { name: 'Garden Wedding', category: 'garden', opening: 'mask' },
  t07: { name: 'Nusantara Heritage', category: 'traditional', opening: 'envelope' },
  t08: { name: 'Cinematic Romance', category: 'cinematic', opening: 'cinematic' },
};
const SECTIONS = ['hero', 'quote', 'couple', 'parents', 'events', 'countdown', 'story',
  'gallery', 'rsvp', 'wishes', 'gift', 'location', 'dresscode', 'info', 'closing'];

let pass = 0, fail = 0, skip = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function bad(name, detail) { fail++; failures.push(name); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function skipped(name, detail) { skip++; console.log(`  ○ ${name} (SKIP: ${detail})`); }
const read = (p) => fs.readFileSync(p, 'utf8');

/* ---------- 1. kelengkapan file ---------- */
console.log('\n[1] Kelengkapan file (24 file template + galeri + pratinjau)');
const required = [
  ...TPLS.flatMap((t) => [
    `public/templates/${t}/meta.json`,
    `public/templates/${t}/style.css`,
    `public/templates/${t}/template.js`,
    `public/templates/${t}/thumbnail.svg`,
  ]),
  'public/templates.html',
  'public/js/templates.js',
  'public/preview.html',
  'public/js/preview.js',
  'public/js/sample-wedding.js',
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
  m.name === EXPECTED[t].name ? ok(`${t} name "${m.name}"`) : bad(`${t}/meta.json`, `name "${m.name}" != "${EXPECTED[t].name}"`);
  m.category === EXPECTED[t].category
    ? ok(`${t} category "${m.category}"`)
    : bad(`${t}/meta.json`, `category "${m.category}" != "${EXPECTED[t].category}"`);
  CATEGORIES.includes(m.category) ? ok(`${t} category valid per kontrak §5`) : bad(`${t}/meta.json`, 'category tak dikenal');
  String(m.description || '').length >= 20 ? ok(`${t} description terisi`) : bad(`${t}/meta.json`, 'description terlalu pendek');
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
  // sampul milik shell harus ditata template (kelas .inv-cover-* di bawah scope)
  new RegExp(`\\.tpl-${t}\\s+\\.inv-cover-frame`).test(css)
    ? ok(`${t}/style.css menata sampul shell (.inv-cover-*)`)
    : bad(`${t}/style.css`, 'tidak menata .inv-cover-* (sampul milik shell)');
}

/* ---------- 4. template.js: sintaks + exports ---------- */
console.log('\n[4] template.js (ESM valid + kontrak ekspor)');
function esmCheck(src, label) {
  const tmp = path.join(os.tmpdir(), `rsmoke-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
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
  mo && mo[1] === EXPECTED[t].opening
    ? ok(`${t} export const opening = '${mo[1]}'`)
    : bad(`${t}/template.js`, `opening "${mo ? mo[1] : '(tidak ditemukan)'}" != "${EXPECTED[t].opening}"`);
  src.includes('data-reveal')
    ? ok(`${t} memakai [data-reveal] (motion system)`) : bad(`${t}/template.js`, 'tidak memakai data-reveal');
  /function esc\(/.test(src)
    ? ok(`${t} mendefinisikan esc() anti-XSS`) : bad(`${t}/template.js`, 'tidak ada esc()');
  /section_key\s*!==?\s*['"]cover['"]/.test(src)
    ? ok(`${t} melewati section 'cover' (milik shell)`) : bad(`${t}/template.js`, 'tidak memfilter cover');
}

/* ---------- 5. render aktual dengan sample-wedding.js ---------- */
console.log('\n[5] Render aktual template.js + sample-wedding.js (§4.8)');

/* DOM stub ringan: cukup untuk ensureFonts() (getElementById/createElement/head). */
function installDomStub() {
  const el = () => ({ style: {} });
  global.document = {
    getElementById: () => null,
    createElement: el,
    head: { appendChild: () => {} },
  };
}
function removeDomStub() { delete global.document; }

/* Pemeriksa XML well-formed sederhana (stack tag). */
function xmlWellFormed(src) {
  const s = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<![A-Z]+[^>]*>/g, '');
  const stack = [];
  const re = /<\/?([A-Za-z_][\w:.-]*)(?:\s[^<>]*?)?(\/?)>/g;
  let m;
  while ((m = re.exec(s))) {
    const [full, name, selfClose] = m;
    if (full.startsWith('</')) {
      if (!stack.length || stack.pop() !== name) return { ok: false, at: full };
    } else if (!selfClose && !full.endsWith('/>')) {
      stack.push(name);
    }
  }
  return stack.length ? { ok: false, at: 'tag tak tertutup: ' + stack.join(',') } : { ok: true };
}

async function renderCheck() {
  let sampleMod;
  try {
    sampleMod = await import(pathToFileURL(path.join(PUBLIC, 'js', 'sample-wedding.js')).href);
  } catch (e) {
    bad('sample-wedding.js', 'gagal di-import: ' + e.message);
    return;
  }
  const w = sampleMod.sampleWedding;

  /* 9. bentuk sample persis §4.8 */
  const wkeys = ['id', 'slug', 'title', 'template_id', 'theme_config', 'music_url'];
  (w.wedding && wkeys.every((k) => k in w.wedding))
    ? ok('sample: wedding {id,slug,title,template_id,theme_config,music_url}')
    : bad('sample-wedding.js', 'field wedding tidak lengkap');
  (Array.isArray(w.events) && w.events.length >= 2 && w.events.every((e) => 'kind' in e && 'event_date' in e && 'title' in e))
    ? ok(`sample: events[] valid (${w.events.length} event)`) : bad('sample-wedding.js', 'events invalid');
  const secKeys = (w.sections || []).map((s) => s.section_key);
  const allSecs = ['cover', ...SECTIONS];
  allSecs.every((k) => secKeys.includes(k))
    ? ok(`sample: sections[] memuat 16 section (cover + 15)`)
    : bad('sample-wedding.js', 'section hilang: ' + allSecs.filter((k) => !secKeys.includes(k)).join(','));
  (w.sections.every((s) => typeof s.config === 'string')
    ? ok('sample: config tiap section berupa string JSON (seperti API)') : bad('sample-wedding.js', 'config bukan string'));
  (Array.isArray(w.gallery) && Array.isArray(w.gifts)
    ? ok(`sample: gallery[] (${w.gallery.length}) + gifts[] (${w.gifts.length})`) : bad('sample-wedding.js', 'gallery/gifts bukan array'));

  const needIds = SECTIONS.map((k) => `sec-${k}`);
  const widgets = ['id="rsvp-form"', 'id="wish-form"', 'id="wishes-list"', 'id="wishes-more"',
    'data-countdown', 'data-cd-d', 'data-cd-h', 'data-cd-m', 'data-cd-s', 'data-cd-done',
    'data-action="copy-text"', 'data-action="share-wa"', 'data-action="scroll-to"', 'data-reveal',
    'name="attendance"', 'name="guest_count"', 'inv-form-error'];

  for (const t of TPLS) {
    const srcPath = path.join(PUBLIC, 'templates', t, 'template.js');
    const tmp = path.join(os.tmpdir(), `rtpl-${t}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.copyFileSync(srcPath, tmp);
    installDomStub();
    try {
      const mod = await import(pathToFileURL(tmp).href);
      const ww = JSON.parse(JSON.stringify(w));
      ww.wedding.template_id = t;
      // uji XSS: nama mempelai berisi tag script
      const couple = ww.sections.find((s) => s.section_key === 'couple');
      const cc = JSON.parse(couple.config);
      cc.bride_name = '<script>alert("xss")</script>';
      couple.config = JSON.stringify(cc);

      const root = { innerHTML: '' };
      mod.render(ww, root);
      const html = root.innerHTML;

      const missing = needIds.filter((id) => !html.includes(`id="${id}"`));
      missing.length
        ? bad(`${t} render sections`, 'hilang: ' + missing.join(','))
        : ok(`${t} render 15 section (cover milik shell)`);
      html.includes('sec-cover') || html.includes('inv-cover-frame')
        ? bad(`${t} render`, 'me-render cover (milik shell)!')
        : ok(`${t} tidak me-render cover`);

      const missingW = widgets.filter((s) => !html.includes(s));
      missingW.length
        ? bad(`${t} render widgets`, 'hilang: ' + missingW.join(','))
        : ok(`${t} widget terikat shell lengkap (rsvp/wishes/countdown/copy/share/scroll/reveal)`);

      const xssRaw = html.includes('<script>alert');
      const xssEsc = html.includes('&lt;script&gt;');
      !xssRaw && xssEsc
        ? ok(`${t} output ter-escape (uji XSS lolos)`)
        : bad(`${t} XSS`, xssRaw ? 'HTML mentah lolos!' : 'tidak ada output ter-escape');

      // empty state galeri
      const emptyW = JSON.parse(JSON.stringify(w));
      emptyW.gallery = [];
      const root2 = { innerHTML: '' };
      mod.render(emptyW, root2);
      /segera hadir|segera ditulis|diumumkan segera/i.test(root2.innerHTML)
        ? ok(`${t} empty state galeri ditangani`)
        : bad(`${t} empty state`, 'tidak ada pesan empty state galeri');
      // hanya section enabled yang di-render
      const disW = JSON.parse(JSON.stringify(w));
      disW.sections = disW.sections.filter((s) => s.section_key !== 'story');
      const root3 = { innerHTML: '' };
      mod.render(disW, root3);
      !root3.innerHTML.includes('id="sec-story"')
        ? ok(`${t} menghormati section yang dinonaktifkan`)
        : bad(`${t} render`, 'section disabled ikut ter-render');
    } catch (e) {
      bad(`${t} render`, 'throw: ' + String(e && e.message || e).split('\n')[0]);
    } finally {
      removeDomStub();
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
}

/* ---------- 6/7/8. lorem, emoji, thumbnail ---------- */
console.log('\n[6] Tanpa "lorem ipsum" di t03–t08');
{
  const hits = [];
  for (const t of TPLS) {
    for (const f of ['meta.json', 'style.css', 'template.js', 'thumbnail.svg']) {
      const p = path.join(PUBLIC, 'templates', t, f);
      if (fs.existsSync(p) && /lorem\s+ipsum/i.test(read(p))) hits.push(`${t}/${f}`);
    }
  }
  hits.length ? bad('lorem ipsum', 'ditemukan di: ' + hits.join(', ')) : ok('tidak ada "lorem ipsum" di t03–t08');
}

console.log('\n[7] Tanpa emoji sebagai ikon');
{
  // rentang emoji umum (simbol piktografik), bukan tanda baca tipografis seperti — · “ ”
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  const hits = [];
  for (const t of TPLS) {
    for (const f of ['template.js', 'style.css', 'thumbnail.svg']) {
      const p = path.join(PUBLIC, 'templates', t, f);
      if (!fs.existsSync(p)) continue;
      const m = read(p).match(EMOJI);
      if (m) hits.push(`${t}/${f} ("${m[0]}" U+${m[0].codePointAt(0).toString(16).toUpperCase()})`);
    }
  }
  hits.length ? bad('emoji sebagai ikon', hits.join(', ')) : ok('tidak ada emoji di t03–t08');
}

console.log('\n[8] thumbnail.svg valid XML + tanpa referensi eksternal');
for (const t of TPLS) {
  const p = path.join(PUBLIC, 'templates', t, 'thumbnail.svg');
  if (!fs.existsSync(p)) { bad(`${t}/thumbnail.svg`, 'tidak ada'); continue; }
  const src = read(p);
  const chk = xmlWellFormed(src);
  chk.ok ? ok(`${t}/thumbnail.svg XML well-formed`) : bad(`${t}/thumbnail.svg`, 'XML rusak di ' + chk.at);
  /<svg[^>]*width="800"[^>]*height="1000"/.test(src) || (/width="800"/.test(src) && /height="1000"/.test(src))
    ? ok(`${t}/thumbnail.svg berukuran 800×1000`) : bad(`${t}/thumbnail.svg`, 'bukan 800×1000');
  /<image/i.test(src) || /xlink:href\s*=\s*["']https?:/i.test(src) || /href\s*=\s*["']https?:/i.test(src)
    ? bad(`${t}/thumbnail.svg`, 'memuat referensi eksternal')
    : ok(`${t}/thumbnail.svg murni (tanpa foto eksternal)`);
}

/* ---------- 9. halaman galeri & pratinjau ---------- */
console.log('\n[9] Halaman galeri & pratinjau');
{
  const th = path.join(PUBLIC, 'templates.html');
  const tj = path.join(PUBLIC, 'js', 'templates.js');
  const ph = path.join(PUBLIC, 'preview.html');
  const pj = path.join(PUBLIC, 'js', 'preview.js');
  const checks = [
    [th, /\/js\/templates\.js/, 'templates.html memuat js/templates.js'],
    [th, /id="grid"/, 'templates.html punya #grid kartu'],
    [th, /id="filters"/, 'templates.html punya filter kategori'],
    [th, /id="q"/, 'templates.html punya search nama'],
    [tj, /\/api\/templates/, 'templates.js fetch GET /api/templates'],
    [tj, /preview\.html\?t=/, 'templates.js tombol Preview → preview.html?t=<id>'],
    [tj, /\/admin\//, 'templates.js tombol "Gunakan Template" → /admin/'],
    [tj, /thumbnail\.svg/, 'templates.js memakai thumbnail.svg tiap kartu'],
    [ph, /\/js\/preview\.js/, 'preview.html memuat js/preview.js'],
    [ph, /pv-desktop/, 'preview.html punya toggle Desktop'],
    [ph, /pv-mobile/, 'preview.html punya toggle Mobile (390px)'],
    [pj, /sample-wedding\.js/, 'preview.js memakai sample-wedding.js'],
    [pj, /\/templates\/\$\{id\}\/template\.js|`\/templates\/`/, 'preview.js dynamic import template.js'],
    [pj, /style\.css/, 'preview.js inject style.css template'],
  ];
  for (const [p, re, name] of checks) {
    if (!fs.existsSync(p)) { bad(name, 'file tidak ada: ' + path.relative(ROOT, p)); continue; }
    re.test(read(p)) ? ok(name) : bad(name, 'pola tidak ditemukan');
  }
  // sintaks ESM halaman-halaman JS
  for (const [p, label] of [[tj, 'templates.js'], [pj, 'preview.js']]) {
    if (fs.existsSync(p)) esmCheck(read(p), `public/js/${label}`);
  }
}

renderCheck().then(() => {
  console.log(`\n==== HASIL: ${pass} lolos, ${fail} gagal, ${skip} skip ====`);
  if (failures.length) console.log('Gagal: ' + failures.join(' | '));
  process.exit(fail ? 1 : 0);
});
