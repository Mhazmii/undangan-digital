// tests/backend-smoke.js — smoke test backend Premium Wedding Invitation Studio.
// Menjalankan rangkaian test aktual ke semua endpoint (kontrak §4, §8, §10).
// Cara pakai: 1) PORT=3000 node server.js  2) node tests/backend-smoke.js
const BASE = process.env.BASE_URL || 'http://localhost:3000';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`); }
}

let cookie = '';
async function req(method, path, { body, form, headers = {}, useAuth = true } = {}) {
  const h = { ...headers };
  if (useAuth && cookie) h['Cookie'] = cookie;
  let payload;
  if (form) { payload = form; } // FormData: fetch set boundary otomatis
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/sid=([^;]*)/);
    cookie = m && m[1] ? `sid=${m[1]}` : '';
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

(async () => {
  console.log('== 1. Auth ==');
  let r = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'salah' }, useAuth: false });
  ok('login salah → 401', r.status === 401 && r.json && r.json.error, `got ${r.status}`);
  r = await req('GET', '/api/auth/me', { useAuth: false });
  ok('me tanpa cookie → 401', r.status === 401, `got ${r.status}`);
  r = await req('GET', '/api/weddings', { useAuth: false });
  ok('endpoint auth tanpa cookie → 401', r.status === 401, `got ${r.status}`);
  r = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' }, useAuth: false });
  ok('login benar → 200 + cookie sid', r.status === 200 && r.json.ok && cookie.startsWith('sid='), `got ${r.status}`);
  r = await req('GET', '/api/auth/me');
  ok('me dengan cookie → 200 admin', r.status === 200 && r.json.username === 'admin', `got ${r.status} ${r.text.slice(0,80)}`);

  // Preamble: bersihkan sisa wedding test dari run sebelumnya (idempoten).
  r = await req('GET', '/api/weddings');
  if (r.status === 200) {
    for (const w of r.json.filter(w => w.slug.startsWith('tes-'))) {
      await req('DELETE', `/api/weddings/${w.id}`);
    }
    console.log('  (preamble: sisa wedding tes-* dibersihkan)');
  }

  console.log('== 2. Templates ==');
  r = await req('GET', '/api/templates', { useAuth: false });
  ok('GET /api/templates → 8 template + thumbnail', r.status === 200 && r.json.length === 8 && r.json[0].thumbnail === '/templates/t01/thumbnail.svg', `got ${r.status} len=${r.json && r.json.length}`);
  ok('template t01 = Editorial Ivory/editorial', r.json[0].name === 'Editorial Ivory' && r.json[0].category === 'editorial');

  console.log('== 3. Weddings CRUD ==');
  r = await req('POST', '/api/weddings', { body: { slug: 'BAD SLUG!', title: 'X' } });
  ok('create slug invalid → 400', r.status === 400 && !!r.json.error, `got ${r.status}`);
  r = await req('POST', '/api/weddings', { body: { slug: 'demo', title: 'Duplikat' } });
  ok('create slug duplikat → 409', r.status === 409, `got ${r.status}`);
  r = await req('POST', '/api/weddings', { body: { slug: 'tes-nikah', title: 'Tes & Coba', template_id: 't03' } });
  ok('create wedding → 201', r.status === 201 && r.json.slug === 'tes-nikah' && r.json.status === 'draft', `got ${r.status}`);
  const wid = r.json.id;
  r = await req('POST', '/api/weddings', { body: { slug: 'tes-nikah', title: 'X' } });
  ok('create slug sama → 409', r.status === 409, `got ${r.status}`);
  r = await req('GET', '/api/weddings');
  ok('list weddings memuat tes-nikah', r.status === 200 && r.json.some(w => w.slug === 'tes-nikah'), `got ${r.status}`);
  r = await req('GET', `/api/weddings/${wid}`);
  ok('detail wedding → ada events/sections/gallery/gifts', r.status === 200 && Array.isArray(r.json.events) && Array.isArray(r.json.sections), `got ${r.status}`);
  ok('wedding baru auto-init 16 section enabled', r.json.sections.length === 16 && r.json.sections.every(s => s.enabled === 1), `len=${r.json.sections.length}`);
  r = await req('GET', '/api/weddings/999999');
  ok('detail wedding tidak ada → 404', r.status === 404, `got ${r.status}`);
  r = await req('PUT', `/api/weddings/${wid}`, { body: { title: 'Tes & Coba Updated', theme_config: { colors: { a: 1 } }, music_url: '/uploads/x.mp3' } });
  ok('PUT wedding → 200 + title berubah', r.status === 200 && r.json.title === 'Tes & Coba Updated', `got ${r.status}`);
  r = await req('PUT', `/api/weddings/${wid}`, { body: { theme_config: '{invalid' } });
  ok('PUT theme_config invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/status`, { body: { status: 'live' } });
  ok('status invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/status`, { body: { status: 'published' } });
  ok('publish → 200 published', r.status === 200 && r.json.status === 'published', `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/duplicate`, { body: { slug: 'tes-nikah-copy' } });
  ok('duplicate → 201 slug baru, status draft', r.status === 201 && r.json.slug === 'tes-nikah-copy' && r.json.status === 'draft', `got ${r.status}`);
  const copyId = r.json.id;
  r = await req('POST', `/api/weddings/${wid}/duplicate`, { body: {} });
  ok('duplicate tanpa slug → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/status`, { body: { status: 'draft' } });
  ok('unpublish → 200 draft', r.status === 200 && r.json.status === 'draft', `got ${r.status}`);

  console.log('== 4. Events CRUD ==');
  r = await req('POST', `/api/weddings/${wid}/events`, { body: { kind: 'pesta', title: 'X', event_date: '2026-12-12' } });
  ok('event kind invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/events`, { body: { kind: 'akad', title: 'Akad', event_date: '12-12-2026' } });
  ok('event tanggal invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/events`, { body: { kind: 'akad', title: 'Akad Nikah', event_date: '2027-01-10', start_time: '08:00', venue_name: 'Gedung A' } });
  ok('create event → 201', r.status === 201 && r.json.title === 'Akad Nikah', `got ${r.status}`);
  const eid = r.json.id;
  r = await req('GET', `/api/weddings/${wid}/events`);
  ok('list events → 1', r.status === 200 && r.json.length === 1, `got ${r.status}`);
  r = await req('PUT', `/api/weddings/${wid}/events/${eid}`, { body: { title: 'Akad Nikah Updated', sort_order: 2 } });
  ok('PUT event → 200', r.status === 200 && r.json.title === 'Akad Nikah Updated', `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}/events/${eid}`);
  ok('DELETE event → 200', r.status === 200 && r.json.ok, `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}/events/${eid}`);
  ok('DELETE event 2x → 404', r.status === 404, `got ${r.status}`);

  console.log('== 5. Sections bulk ==');
  r = await req('GET', `/api/weddings/${wid}/sections`);
  ok('GET sections → array', r.status === 200 && Array.isArray(r.json), `got ${r.status}`);
  r = await req('PUT', `/api/weddings/${wid}/sections`, { body: { sections: [
    { section_key: 'cover', enabled: 1, sort_order: 0, config: { title: 'Halo' } },
    { section_key: 'hero', enabled: 0, sort_order: 1, config: '{}' }
  ] } });
  const cover = r.json.find(s => s.section_key === 'cover');
  const hero = r.json.find(s => s.section_key === 'hero');
  ok('PUT sections bulk → 200, 16 rows (auto-init) + 2 ter-update', r.status === 200 && r.json.length === 16 && hero.enabled === 0 && cover.config.includes('Halo'), `got ${r.status} len=${r.json.length}`);
  r = await req('PUT', `/api/weddings/${wid}/sections`, { body: { sections: [{ section_key: 'ngaco', enabled: 1 }] } });
  ok('PUT sections key invalid → 400', r.status === 400, `got ${r.status}`);

  console.log('== 6. Gallery & Gifts CRUD ==');
  r = await req('POST', `/api/weddings/${wid}/gallery`, { body: { url: '' } });
  ok('gallery url kosong → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/gallery`, { body: { url: '/uploads/1/a.jpg', caption: 'Foto 1' } });
  ok('create gallery → 201', r.status === 201, `got ${r.status}`);
  const gid = r.json.id;
  r = await req('PUT', `/api/weddings/${wid}/gallery/${gid}`, { body: { caption: 'Foto 1 edit' } });
  ok('PUT gallery → 200', r.status === 200 && r.json.caption === 'Foto 1 edit', `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}/gallery/${gid}`);
  ok('DELETE gallery → 200', r.status === 200, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/gifts`, { body: { type: 'kripto', provider: 'X', account_number: '1', account_name: 'Y' } });
  ok('gift type invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/gifts`, { body: { type: 'bank', provider: 'BCA', account_number: '111', account_name: 'Tes' } });
  ok('create gift → 201', r.status === 201, `got ${r.status}`);
  const giftId = r.json.id;
  r = await req('PUT', `/api/weddings/${wid}/gifts/${giftId}`, { body: { note: 'catatan' } });
  ok('PUT gift → 200', r.status === 200 && r.json.note === 'catatan', `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}/gifts/${giftId}`);
  ok('DELETE gift → 200', r.status === 200, `got ${r.status}`);

  console.log('== 7. Guests CRUD + import/export ==');
  r = await req('POST', `/api/weddings/${wid}/guests`, { body: { name: '' } });
  ok('guest nama kosong → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/guests`, { body: { name: 'Tamu Satu', phone: '081', group_name: 'Keluarga' } });
  ok('create guest → 201 + token 12 char', r.status === 201 && r.json.token && r.json.token.length === 12, `got ${r.status}`);
  const guestId = r.json.id, guestToken = r.json.token;
  r = await req('GET', `/api/weddings/${wid}/guests?q=Satu`);
  ok('list guests?q= → 1', r.status === 200 && r.json.length === 1 && 'rsvp_attendance' in r.json[0], `got ${r.status}`);
  r = await req('PUT', `/api/weddings/${wid}/guests/${guestId}`, { body: { phone: '082' } });
  ok('PUT guest → 200', r.status === 200 && r.json.phone === '082', `got ${r.status}`);
  r = await req('POST', `/api/weddings/${wid}/guests/import`, { body: { csv: 'nama,telepon,grup\nBudi,0811,Keluarga\n"Sinta, Jr",0822,Sahabat\n\n' } });
  ok('import CSV → 2', r.status === 200 && r.json.imported === 2, `got ${r.status} ${r.text.slice(0,100)}`);
  r = await req('GET', `/api/weddings/${wid}/guests/export`);
  ok('export CSV → 200 text/csv berisi Tamu Satu', r.status === 200 && r.headers.get('content-type').includes('text/csv') && r.text.includes('Tamu Satu'), `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}/guests/${guestId}`);
  ok('DELETE guest → 200', r.status === 200, `got ${r.status}`);

  console.log('== 8. Public wedding data ==');
  r = await req('GET', '/api/public/wedding/demo', { useAuth: false });
  ok('public demo published → 200 + shape lengkap', r.status === 200 && r.json.wedding.slug === 'demo' && Array.isArray(r.json.events) && Array.isArray(r.json.sections) && Array.isArray(r.json.gallery) && Array.isArray(r.json.gifts), `got ${r.status}`);
  ok('public demo sections hanya enabled+sorted', r.json.sections.length === 16 && r.json.sections.every(s => s.enabled !== 0), `len=${r.json.sections.length}`);
  ok('public wedding tidak bocorkan owner/status', !('owner_id' in r.json.wedding) && !('status' in r.json.wedding), '');
  r = await req('GET', '/api/public/wedding/tes-nikah-copy', { useAuth: false });
  ok('public wedding draft → 404', r.status === 404 && !!r.json.error, `got ${r.status}`);
  r = await req('GET', '/api/public/wedding/tidak-ada', { useAuth: false });
  ok('public wedding tidak ada → 404', r.status === 404, `got ${r.status}`);

  console.log('== 9. Guest token lookup ==');
  r = await req('GET', '/api/public/wedding/demo/guest/dem0guest001', { useAuth: false });
  ok('guest token valid → 200 {name} saja', r.status === 200 && r.json.name === 'Keluarga Budi Santoso' && Object.keys(r.json).length === 1, `got ${r.status} ${r.text.slice(0,80)}`);
  r = await req('GET', '/api/public/wedding/demo/guest/token-ngaco', { useAuth: false });
  ok('guest token invalid → 404', r.status === 404, `got ${r.status}`);
  r = await req('GET', '/api/public/wedding/tes-nikah-copy/guest/abc', { useAuth: false });
  ok('guest lookup di draft → 404', r.status === 404, `got ${r.status}`);

  console.log('== 10. RSVP publik ==');
  r = await req('POST', '/api/public/wedding/demo/rsvp', { useAuth: false, body: { name: 'Tamu RSVP', attendance: 'yes', guest_count: 2, message: 'Hadir!' } });
  ok('RSVP valid → 201', r.status === 201 && r.json.ok, `got ${r.status} ${r.text.slice(0,80)}`);
  r = await req('POST', '/api/public/wedding/demo/rsvp', { useAuth: false, body: { name: 'X', attendance: 'maybe', guest_count: 1 } });
  ok('RSVP attendance invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', '/api/public/wedding/demo/rsvp', { useAuth: false, body: { name: 'X', attendance: 'yes', guest_count: 99 } });
  ok('RSVP guest_count 99 → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', '/api/public/wedding/demo/rsvp', { useAuth: false, body: { attendance: 'yes', guest_count: 1 } });
  ok('RSVP tanpa nama → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', '/api/public/wedding/tes-nikah-copy/rsvp', { useAuth: false, body: { name: 'X', attendance: 'yes', guest_count: 1 } });
  ok('RSVP ke draft → 404', r.status === 404, `got ${r.status}`);

  console.log('== 11. RSVP admin ==');
  r = await req('GET', `/api/weddings/${wid}/rsvps`);
  ok('admin rsvps → list + summary', r.status === 200 && Array.isArray(r.json.list) && r.json.summary && typeof r.json.summary.total_forms === 'number', `got ${r.status}`);
  r = await req('GET', `/api/weddings/${wid}/rsvps/export`);
  ok('admin rsvps export → CSV', r.status === 200 && r.headers.get('content-type').includes('text/csv'), `got ${r.status}`);

  console.log('== 12. Wishes publik + moderasi ==');
  r = await req('GET', '/api/public/wedding/demo/wishes?limit=5', { useAuth: false });
  ok('public wishes → hanya approved (2)', r.status === 200 && r.json.length === 2 && r.json.every(w => !('status' in w)), `got ${r.status} len=${r.json && r.json.length}`);
  r = await req('POST', '/api/public/wedding/demo/wishes', { useAuth: false, body: { name: 'Pengunjung', message: 'Selamat ya!' } });
  ok('POST wish → 201', r.status === 201 && r.json.ok, `got ${r.status}`);
  const wishId = r.json.id;
  r = await req('POST', '/api/public/wedding/demo/wishes', { useAuth: false, body: { name: 'X', message: 'a'.repeat(501) } });
  ok('wish >500 char → 400', r.status === 400, `got ${r.status}`);
  const demoId = (await req('GET', '/api/public/wedding/demo', { useAuth: false })).json.wedding.id;
  r = await req('GET', `/api/weddings/${demoId}/wishes?status=pending`);
  ok('admin wishes filter pending → memuat wish baru', r.status === 200 && r.json.some(w => w.id === wishId), `got ${r.status}`);
  r = await req('PATCH', `/api/wishes/${wishId}`, { body: { status: 'approved' } });
  ok('PATCH wish approve → 200', r.status === 200 && r.json.status === 'approved', `got ${r.status}`);
  r = await req('PATCH', `/api/wishes/${wishId}`, { body: { status: 'ngaco' } });
  ok('PATCH wish status invalid → 400', r.status === 400, `got ${r.status}`);
  r = await req('DELETE', `/api/wishes/${wishId}`);
  ok('DELETE wish → 200', r.status === 200, `got ${r.status}`);
  r = await req('DELETE', `/api/wishes/999999`);
  ok('DELETE wish tidak ada → 404', r.status === 404, `got ${r.status}`);

  console.log('== 13. Upload ==');
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  let form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'foto.png');
  form.append('wedding_id', String(wid));
  r = await req('POST', '/api/upload', { form });
  ok('upload png valid → 200 + url /uploads/', r.status === 200 && r.json.url && r.json.url.startsWith('/uploads/'), `got ${r.status} ${r.text.slice(0,100)}`);
  const upUrl = r.json.url;
  r = await req('GET', upUrl, { useAuth: false });
  ok('file upload bisa diakses publik', r.status === 200, `got ${r.status}`);
  form = new FormData();
  form.append('file', new Blob(['MZ fake exe'], { type: 'application/x-msdownload' }), 'virus.exe');
  form.append('wedding_id', String(wid));
  r = await req('POST', '/api/upload', { form });
  ok('upload .exe → 400 ditolak', r.status === 400 && !!r.json.error, `got ${r.status}`);
  form = new FormData();
  form.append('file', new Blob([Buffer.alloc(6 * 1024 * 1024)], { type: 'image/jpeg' }), 'besar.jpg');
  form.append('wedding_id', String(wid));
  r = await req('POST', '/api/upload', { form });
  ok('upload >5MB → 413', r.status === 413, `got ${r.status}`);
  form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'x.png');
  r = await req('POST', '/api/upload', { form });
  ok('upload tanpa wedding_id → 400', r.status === 400, `got ${r.status}`);
  form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'x.png');
  form.append('wedding_id', String(wid));
  r = await req('POST', '/api/upload', { form, useAuth: false });
  ok('upload tanpa auth → 401', r.status === 401, `got ${r.status}`);

  console.log('== 14. Route /i/:slug ==');
  r = await req('GET', '/i/demo', { useAuth: false });
  ok('/i/demo published → 200 html', r.status === 200 && r.text.includes('<html'), `got ${r.status}`);
  r = await req('GET', '/i/demo/t/dem0guest001', { useAuth: false });
  ok('/i/demo/t/:token → 200 html', r.status === 200 && r.text.includes('<html'), `got ${r.status}`);
  r = await req('GET', '/i/tes-nikah-copy', { useAuth: false });
  ok('/i/draft tanpa auth → 404', r.status === 404, `got ${r.status}`);
  r = await req('GET', '/i/tes-nikah-copy');
  ok('/i/draft dengan cookie sid valid → 200 (preview)', r.status === 200 && r.text.includes('<html'), `got ${r.status}`);
  r = await req('GET', '/i/tidak-ada', { useAuth: false });
  ok('/i/slug tidak ada → 404', r.status === 404, `got ${r.status}`);

  console.log('== 15. Rate limit publik ==');
  let saw429 = false, saw201 = false;
  for (let i = 0; i < 15; i++) {
    const rr = await req('POST', '/api/public/wedding/demo/wishes', { useAuth: false, body: { name: `RL${i}`, message: 'rate limit test' } });
    if (rr.status === 429) saw429 = true;
    if (rr.status === 201) saw201 = true;
  }
  ok('rate limit: ada 429 setelah burst', saw429, 'tidak ada 429');

  console.log('== 16. Cleanup + logout ==');
  r = await req('DELETE', `/api/weddings/${copyId}`);
  ok('delete duplikat → 200', r.status === 200, `got ${r.status}`);
  r = await req('DELETE', `/api/weddings/${wid}`);
  ok('delete wedding → 200', r.status === 200, `got ${r.status}`);

  console.log('== 17. Backup ==');
  r = await req('GET', '/api/backup');
  ok('GET /api/backup (auth) → 200 + attachment db',
    r.status === 200 && /attachment/.test(r.headers.get('content-disposition') || '') && r.text.startsWith('SQLite'),
    `got ${r.status}`);
  r = await req('GET', '/api/backup', { useAuth: false });
  ok('GET /api/backup tanpa auth → 401', r.status === 401, `got ${r.status}`);

  r = await req('POST', '/api/auth/logout');
  ok('logout → 200', r.status === 200 && r.json.ok, `got ${r.status}`);
  r = await req('GET', '/api/auth/me');
  ok('me setelah logout → 401', r.status === 401, `got ${r.status}`);

  console.log(`\nHASIL: ${pass} lolos, ${fail} gagal`);
  if (failures.length) console.log('Gagal:', failures.join(' | '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
