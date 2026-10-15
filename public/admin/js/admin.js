/* Admin Dashboard SPA — Wedding Invitation Studio
   Vanilla JS. Semua request ke /api memakai cookie session (credentials: include). */
(function () {
'use strict';

/* ================= Helpers ================= */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function api(path, opts) {
  opts = opts || {};
  const init = {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: {}
  };
  if (opts.body !== undefined && !opts.formData) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  if (opts.formData) init.body = opts.formData; // browser sets multipart boundary
  let res;
  try {
    res = await fetch('/api' + path, init);
  } catch (e) {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.', 0);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch (e) { data = null; }
  } else {
    data = await res.text();
  }
  if (!res.ok) {
    const msg = (data && data.error) || ('Terjadi kesalahan (HTTP ' + res.status + ').');
    throw new ApiError(msg, res.status);
  }
  return data;
}

async function downloadCsv(path, fallbackName) {
  const res = await fetch('/api' + path, { credentials: 'include' });
  if (!res.ok) {
    let msg = 'Gagal mengunduh.';
    try { const d = await res.json(); if (d && d.error) msg = d.error; } catch (e) {}
    throw new ApiError(msg, res.status);
  }
  const blob = await res.blob();
  let name = fallbackName || 'export.csv';
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename="?([^";]+)"?/);
  if (m) name = m[1];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) {}
    ta.remove();
    return ok;
  }
}

function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return esc(s);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d)) return esc(s);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ================= Toast & Modal ================= */
function toast(msg, type) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

function openModal(opts) {
  const root = $('#modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML =
    '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(opts.title || '') + '</h3>' +
      '<button type="button" class="modal-close" aria-label="Tutup">&times;</button></div>' +
      '<div class="modal-body"></div>' +
      (opts.foot ? '<div class="modal-foot"></div>' : '') +
    '</div>';
  $('.modal-body', backdrop).innerHTML = opts.body || '';
  if (opts.foot) $('.modal-foot', backdrop).innerHTML = opts.foot;
  const close = () => backdrop.remove();
  $('.modal-close', backdrop).addEventListener('click', close);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  root.appendChild(backdrop);
  return { el: backdrop, close, body: $('.modal-body', backdrop) };
}

function confirmDlg(title, message, dangerLabel) {
  return new Promise((resolve) => {
    const m = openModal({
      title: title,
      body: '<p>' + esc(message) + '</p>',
      foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
            '<button type="button" class="btn btn-danger" data-x="ok">' + esc(dangerLabel || 'Hapus') + '</button>'
    });
    const done = (v) => { m.close(); resolve(v); };
    $('[data-x="cancel"]', m.el).addEventListener('click', () => done(false));
    $('[data-x="ok"]', m.el).addEventListener('click', () => done(true));
  });
}

function promptDlg(title, label, initial, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const m = openModal({
      title: title,
      body: '<div class="field"><label>' + esc(label) + '</label>' +
            '<input type="text" id="prompt-input" value="' + esc(initial || '') + '"' +
            (opts.pattern ? ' pattern="' + esc(opts.pattern) + '"' : '') +
            (opts.hint ? ' aria-describedby="prompt-hint"' : '') + '>' +
            (opts.hint ? '<p class="hint" id="prompt-hint">' + esc(opts.hint) + '</p>' : '') +
            '<p class="form-error" id="prompt-error" hidden></p></div>',
      foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
            '<button type="button" class="btn btn-primary" data-x="ok">Simpan</button>'
    });
    const input = $('#prompt-input', m.el);
    input.focus(); input.select();
    const done = (v) => { m.close(); resolve(v); };
    $('[data-x="cancel"]', m.el).addEventListener('click', () => done(null));
    const submit = () => {
      const v = input.value.trim();
      if (opts.required && !v) {
        const e = $('#prompt-error', m.el);
        e.textContent = 'Nilai wajib diisi.'; e.hidden = false; return;
      }
      if (opts.pattern && v && !(new RegExp('^' + opts.pattern + '$').test(v))) {
        const e = $('#prompt-error', m.el);
        e.textContent = opts.patternMsg || 'Format tidak valid.'; e.hidden = false; return;
      }
      done(v);
    };
    $('[data-x="ok"]', m.el).addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  });
}

/* ================= State ================= */
const S = {
  user: null,
  weddings: [],
  weddingId: null,   // id undangan aktif
  wedding: null,     // detail undangan aktif
  templates: null,
  route: 'weddings'
};

/* Listener terpusat pada #content: diganti tiap render view agar tidak menumpuk. */
const _contentListeners = {};
function bindContent(event, fn) {
  const el = $('#content');
  if (_contentListeners[event]) el.removeEventListener(event, _contentListeners[event]);
  _contentListeners[event] = fn;
  el.addEventListener(event, fn);
}
let _hashBound = false;
function bindHash() {
  if (_hashBound) return;
  _hashBound = true;
  bindHash();
}

function setLoading(msg) {
  $('#content').innerHTML = '<div class="loading">' + esc(msg || 'Memuat…') + '</div>';
}
function setError(msg, retryFn) {
  const id = 'retry-' + Date.now();
  $('#content').innerHTML = '<div class="error-box"><p>' + esc(msg) + '</p>' +
    '<button class="btn" id="' + id + '">Coba lagi</button></div>';
  $('#' + id).addEventListener('click', retryFn);
}
function setTitle(title, sub) {
  $('#page-title').textContent = title;
  $('#page-sub').textContent = sub || '';
  $('#topbar-actions').innerHTML = '';
}
function topAction(label, fn, primary) {
  const b = document.createElement('button');
  b.className = 'btn btn-sm' + (primary ? ' btn-primary' : '');
  b.textContent = label;
  b.addEventListener('click', fn);
  $('#topbar-actions').appendChild(b);
  return b;
}

function parseThemeConfig(w) {
  if (!w) return {};
  const tc = w.theme_config;
  if (!tc) return {};
  if (typeof tc === 'object') return tc;
  try { return JSON.parse(tc); } catch (e) { return {}; }
}
function parseSectionConfig(s) {
  try { return JSON.parse(s.config || '{}'); } catch (e) { return {}; }
}

function needWedding() {
  if (!S.wedding) {
    setError('Pilih atau buat undangan terlebih dahulu.', () => go('#/weddings'));
    return false;
  }
  return true;
}

/* ================= Router ================= */
const TITLES = {
  'weddings': ['Semua Undangan', 'Kelola undangan pernikahan Anda'],
  'editor-umum': ['Umum & Template', 'Identitas, template, tema, dan musik'],
  'editor-acara': ['Rangkaian Acara', 'Akad, resepsi, dan acara khusus'],
  'editor-seksi': ['Seksi & Teks', 'Aktifkan, urutkan, dan sunting teks tiap bagian'],
  'editor-galeri': ['Galeri Foto', 'Kelola foto galeri undangan'],
  'editor-gift': ['Amplop & Gift', 'Rekening bank dan e-wallet'],
  'guests': ['Daftar Tamu', 'Tamu undangan dan tautan personal'],
  'rsvp': ['RSVP', 'Konfirmasi kehadiran tamu'],
  'wishes': ['Ucapan', 'Moderasi ucapan dari tamu'],
  'preview': ['Pratinjau', 'Lihat undangan seperti dilihat tamu']
};

function go(hash) { if (location.hash === hash) onRoute(); else location.hash = hash; }

async function onRoute() {
  const hash = location.hash || '#/weddings';
  const name = hash.replace('#/', '');
  S.route = TITLES[name] ? name : 'weddings';
  $$('#sidebar-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === S.route));
  $('#sidebar').classList.remove('open');
  const t = TITLES[S.route];
  setTitle(t[0], S.wedding ? (S.wedding.title + ' · /' + S.wedding.slug) : t[1]);
  if (S.route !== 'weddings' && S.wedding) {
    const tt = TITLES[S.route];
    $('#page-sub').textContent = S.wedding.title + ' · /' + S.wedding.slug;
  }
  try {
    switch (S.route) {
      case 'weddings': await vWeddings(); break;
      case 'editor-umum': await vEditorUmum(); break;
      case 'editor-acara': await vEditorAcara(); break;
      case 'editor-seksi': await vEditorSeksi(); break;
      case 'editor-galeri': await vEditorGaleri(); break;
      case 'editor-gift': await vEditorGift(); break;
      case 'guests': await vGuests(); break;
      case 'rsvp': await vRsvp(); break;
      case 'wishes': await vWishes(); break;
      case 'preview': await vPreview(); break;
      default: await vWeddings();
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { showLogin(); return; }
    setError(e.message || 'Terjadi kesalahan.', onRoute);
  }
  window.scrollTo(0, 0);
}

/* ================= Auth ================= */
function showLogin() {
  $('#view-login').hidden = false;
  $('#view-app').hidden = true;
  S.user = null;
}
function showApp() {
  $('#view-login').hidden = true;
  $('#view-app').hidden = false;
}

async function refreshWeddingPicker() {
  S.weddings = await api('/weddings');
  const sel = $('#wedding-picker');
  sel.innerHTML = '';
  if (!S.weddings.length) {
    const o = document.createElement('option');
    o.value = ''; o.textContent = '— belum ada undangan —';
    sel.appendChild(o);
  }
  for (const w of S.weddings) {
    const o = document.createElement('option');
    o.value = w.id;
    o.textContent = w.title + ' (/' + w.slug + ')' + (w.status === 'draft' ? ' · draft' : '');
    sel.appendChild(o);
  }
  if (S.weddingId && S.weddings.some((w) => w.id === S.weddingId)) {
    sel.value = String(S.weddingId);
  } else if (S.weddings.length) {
    S.weddingId = S.weddings[0].id;
    sel.value = String(S.weddingId);
  } else {
    S.weddingId = null;
  }
}

async function loadWeddingDetail() {
  if (!S.weddingId) { S.wedding = null; return; }
  S.wedding = await api('/weddings/' + S.weddingId);
}

async function ensureTemplates() {
  if (!S.templates) S.templates = await api('/templates');
  return S.templates;
}

async function boot() {
  $('#login-form').addEventListener('submit', onLogin);
  $('#btn-logout').addEventListener('click', onLogout);
  $('#btn-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#btn-new-wedding-top').addEventListener('click', () => { go('#/weddings'); setTimeout(createWeddingDlg, 50); });
  $('#wedding-picker').addEventListener('change', async (e) => {
    S.weddingId = e.target.value ? Number(e.target.value) : null;
    try {
      await loadWeddingDetail();
      toast('Undangan aktif: ' + (S.wedding ? S.wedding.title : '—'));
      onRoute();
    } catch (err) { toast(err.message, 'error'); }
  });
  $$('#sidebar-nav button').forEach((b) => b.addEventListener('click', () => go('#/' + b.dataset.view)));

  try {
    const me = await api('/auth/me');
    S.user = me.user;
    $('#admin-user').textContent = me.user.username;
    showApp();
    await refreshWeddingPicker();
    await loadWeddingDetail();
    bindHash();
    if (!location.hash) location.hash = '#/weddings';
    await onRoute();
  } catch (e) {
    showLogin();
  }
}

async function onLogin(e) {
  e.preventDefault();
  const btn = $('#login-btn');
  const errEl = $('#login-error');
  errEl.hidden = true;
  const username = $('#login-user').value.trim();
  const password = $('#login-pass').value;
  btn.disabled = true; btn.textContent = 'Memeriksa…';
  try {
    const res = await api('/auth/login', { method: 'POST', body: { username, password } });
    S.user = res.user;
    $('#admin-user').textContent = res.user.username;
    showApp();
    await refreshWeddingPicker();
    await loadWeddingDetail();
    bindHash();
    if (!location.hash) location.hash = '#/weddings';
    await onRoute();
    toast('Selamat datang, ' + res.user.username + '.', 'ok');
  } catch (err) {
    errEl.textContent = err.status === 401
      ? 'Nama pengguna atau kata sandi salah. Silakan coba lagi.'
      : err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = 'Masuk';
  }
}

async function onLogout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (e) {}
  location.hash = '#/weddings';
  showLogin();
  $('#login-pass').value = '';
}

/* ================= Weddings ================= */
async function vWeddings() {
  setLoading('Memuat daftar undangan…');
  await refreshWeddingPicker();
  const list = S.weddings;
  topAction('+ Undangan Baru', createWeddingDlg, true);

  if (!list.length) {
    $('#content').innerHTML =
      '<div class="panel"><div class="empty"><h4>Belum ada undangan</h4>' +
      '<p>Buat undangan pertama Anda untuk mulai mengisi detail pernikahan.</p>' +
      '<button class="btn btn-primary" id="empty-create">+ Buat Undangan</button></div></div>';
    $('#empty-create').addEventListener('click', createWeddingDlg);
    return;
  }

  let html = '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
    '<th>Judul</th><th>Slug</th><th>Template</th><th>Status</th><th>Diperbarui</th><th>Aksi</th>' +
    '</tr></thead><tbody>';
  for (const w of list) {
    html += '<tr>' +
      '<td><strong>' + esc(w.title) + '</strong></td>' +
      '<td><span class="mono">/' + esc(w.slug) + '</span></td>' +
      '<td><span class="mono">' + esc(w.template_id) + '</span></td>' +
      '<td><span class="badge ' + esc(w.status) + '">' + (w.status === 'published' ? 'Terbit' : 'Draft') + '</span></td>' +
      '<td class="small">' + fmtDateTime(w.updated_at) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn btn-sm" data-act="open" data-id="' + w.id + '">Buka Editor</button>' +
        '<button class="btn btn-sm" data-act="status" data-id="' + w.id + '">' +
          (w.status === 'published' ? 'Jadikan Draft' : 'Terbitkan') + '</button>' +
        '<button class="btn btn-sm" data-act="dup" data-id="' + w.id + '">Duplikat</button>' +
        '<button class="btn btn-sm" data-act="edit" data-id="' + w.id + '">Ubah</button>' +
        '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + w.id + '">Hapus</button>' +
      '</div></td></tr>';
  }
  html += '</tbody></table></div></div>';

  $('#content').innerHTML = html;

  bindContent('click', onWeddingRowClick);
}

async function onWeddingRowClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;
  const w = S.weddings.find((x) => x.id === id);
  if (!w) return;
  try {
    if (act === 'open') {
      S.weddingId = id;
      await loadWeddingDetail();
      await refreshWeddingPicker();
      go('#/editor-umum');
    } else if (act === 'status') {
      const next = w.status === 'published' ? 'draft' : 'published';
      await api('/weddings/' + id + '/status', { method: 'POST', body: { status: next } });
      toast(next === 'published' ? 'Undangan diterbitkan.' : 'Undangan dikembalikan ke draft.', 'ok');
      await vWeddings();
    } else if (act === 'dup') {
      const slug = await promptDlg('Duplikat Undangan',
        'Slug baru untuk salinan "' + w.title + '"',
        w.slug + '-copy',
        { required: true, pattern: '[a-z0-9-]{3,60}', patternMsg: 'Slug: 3–60 karakter, huruf kecil, angka, strip.',
          hint: 'Hanya huruf kecil, angka, dan strip. Contoh: aisyah-rizky-2' });
      if (!slug) return;
      const nw = await api('/weddings/' + id + '/duplicate', { method: 'POST', body: { slug } });
      toast('Undangan diduplikat sebagai /' + nw.slug + '.', 'ok');
      S.weddingId = nw.id;
      await loadWeddingDetail();
      await vWeddings();
    } else if (act === 'edit') {
      const title = await promptDlg('Ubah Judul Undangan', 'Judul undangan', w.title, { required: true });
      if (title == null) return;
      await api('/weddings/' + id, { method: 'PUT', body: { title } });
      toast('Judul diperbarui.', 'ok');
      if (S.weddingId === id) await loadWeddingDetail();
      await vWeddings();
    } else if (act === 'del') {
      const ok = await confirmDlg('Hapus Undangan',
        'Hapus "' + w.title + '" (/' + w.slug + ')? Semua data — acara, tamu, RSVP, ucapan — ikut terhapus dan tidak bisa dikembalikan.',
        'Ya, hapus');
      if (!ok) return;
      await api('/weddings/' + id, { method: 'DELETE' });
      toast('Undangan dihapus.', 'ok');
      if (S.weddingId === id) { S.weddingId = null; S.wedding = null; }
      await vWeddings();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function createWeddingDlg() {
  const templates = await ensureTemplates();
  const tplOpts = templates.map((t) =>
    '<option value="' + esc(t.id) + '"' + (t.id === 't01' ? ' selected' : '') + '>' +
    esc(t.name) + ' (' + esc(t.category) + ')</option>').join('');
  const m = openModal({
    title: 'Undangan Baru',
    body:
      '<div class="field"><label>Slug (alamat undangan)</label>' +
        '<input type="text" id="nw-slug" placeholder="contoh: aisyah-rizky">' +
        '<p class="hint">3–60 karakter: huruf kecil, angka, strip. Undangan diakses di <span class="mono">/i/slug</span>.</p></div>' +
      '<div class="field"><label>Judul undangan</label>' +
        '<input type="text" id="nw-title" placeholder="contoh: Aisyah & Rizky"></div>' +
      '<div class="field"><label>Template awal</label><select id="nw-tpl">' + tplOpts + '</select></div>' +
      '<p class="form-error" id="nw-error" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Buat Undangan</button>'
  });
  const done = (v) => { m.close(); if (v) afterCreate(v); };
  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const slug = $('#nw-slug', m.el).value.trim().toLowerCase();
    const title = $('#nw-title', m.el).value.trim();
    const template_id = $('#nw-tpl', m.el).value;
    const errEl = $('#nw-error', m.el);
    errEl.hidden = true;
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
      errEl.textContent = 'Slug tidak valid: 3–60 karakter, huruf kecil, angka, strip.'; errEl.hidden = false; return;
    }
    if (!title) { errEl.textContent = 'Judul wajib diisi.'; errEl.hidden = false; return; }
    try {
      const w = await api('/weddings', { method: 'POST', body: { slug, title, template_id } });
      m.close();
      afterCreate(w);
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });

  async function afterCreate(w) {
    toast('Undangan /' + w.slug + ' dibuat.', 'ok');
    S.weddingId = w.id;
    await loadWeddingDetail();
    await refreshWeddingPicker();
    go('#/editor-umum');
  }
}

/* ================= Editor: Umum ================= */
async function vEditorUmum() {
  if (!needWedding()) return;
  setLoading('Memuat editor…');
  await loadWeddingDetail();
  if (!needWedding()) return;
  const w = S.wedding;
  const templates = await ensureTemplates();
  const tc = parseThemeConfig(w);
  const accent = (tc.colors && tc.colors.accent) || '#8a6234';

  topAction('Pratinjau', () => go('#/preview'));

  const tplCards = templates.map((t) =>
    '<div class="tpl-card' + (t.id === w.template_id ? ' selected' : '') + '" data-tpl="' + esc(t.id) + '" tabindex="0" role="button" aria-label="Pilih template ' + esc(t.name) + '">' +
      '<img src="' + esc(t.thumbnail) + '" alt="Thumbnail ' + esc(t.name) + '" loading="lazy">' +
      '<div class="tpl-meta"><strong>' + esc(t.name) + '</strong>' +
      '<span>' + esc(t.category) + '</span>' +
      (t.id === w.template_id ? '<br><span class="tpl-current">Aktif</span>' : '') +
      '</div></div>').join('');

  $('#content').innerHTML =
    '<div class="panel"><div class="panel-head"><h3>Template</h3>' +
      '<span class="small">Mengganti template tidak menghapus konten — teks dan acara tersimpan di seksi &amp; acara.</span></div>' +
      '<div class="panel-body"><div class="tpl-grid">' + tplCards + '</div></div></div>' +

    '<div class="panel"><div class="panel-head"><h3>Identitas</h3></div><div class="panel-body">' +
      '<div class="form-row"><div class="field"><label>Judul undangan</label>' +
        '<div class="inline-edit"><input type="text" id="f-title" value="' + esc(w.title) + '">' +
        '<button class="btn btn-primary btn-sm" id="btn-title">Simpan</button></div></div>' +
      '<div class="field"><label>Slug</label>' +
        '<div class="inline-edit"><input type="text" value="/i/' + esc(w.slug) + '" readonly>' +
        '<button class="btn btn-sm" id="btn-copy-link">Salin Tautan</button></div>' +
        '<p class="hint">Slug tidak dapat diubah setelah dibuat.</p></div></div>' +
      '<div class="field"><label>Status publikasi</label>' +
        '<div class="inline-edit"><span class="badge ' + esc(w.status) + '">' + (w.status === 'published' ? 'Terbit' : 'Draft') + '</span>' +
        '<button class="btn btn-sm" id="btn-status">' + (w.status === 'published' ? 'Jadikan Draft' : 'Terbitkan') + '</button>' +
        '<span class="small">Draft hanya bisa dipratinjau oleh admin yang login.</span></div></div>' +
    '</div></div>' +

    '<div class="panel"><div class="panel-head"><h3>Tema</h3></div><div class="panel-body">' +
      '<div class="form-row"><div class="field"><label for="f-accent">Warna aksen</label>' +
        '<div class="inline-edit"><input type="color" id="f-accent" value="' + esc(accent) + '" style="max-width:70px">' +
        '<input type="text" id="f-accent-hex" value="' + esc(accent) + '" class="mono" style="max-width:120px">' +
        '<button class="btn btn-primary btn-sm" id="btn-accent">Simpan</button></div>' +
        '<p class="hint">Disimpan ke <span class="mono">theme_config.colors.accent</span>.</p></div></div>' +
    '</div></div>' +

    '<div class="panel"><div class="panel-head"><h3>Musik Latar</h3></div><div class="panel-body">' +
      '<div class="music-current" id="music-current">' +
        (w.music_url
          ? '<audio controls src="' + esc(w.music_url) + '"></audio>' +
            '<span class="small mono">' + esc(w.music_url) + '</span>' +
            '<button class="btn btn-sm btn-danger" id="btn-music-clear">Hapus Musik</button>'
          : '<span class="small">Belum ada musik. Musik hanya diputar setelah tamu menekan tombol buka undangan.</span>') +
      '</div>' +
      '<div class="field"><label>URL file musik (mp3)</label>' +
        '<div class="inline-edit"><input type="url" id="f-music-url" placeholder="https://…/musik.mp3" value="' + esc(w.music_url || '') + '">' +
        '<button class="btn btn-primary btn-sm" id="btn-music-url">Simpan URL</button></div></div>' +
      '<div class="field"><label>atau unggah file audio (mp3, maks 5MB)</label>' +
        '<div class="inline-edit"><input type="file" id="f-music-file" accept="audio/mpeg">' +
        '<button class="btn btn-sm" id="btn-music-upload">Unggah</button></div></div>' +
    '</div></div>';

  // Template picker
  $$('.tpl-card').forEach((card) => {
    const pick = async () => {
      const tid = card.dataset.tpl;
      if (tid === S.wedding.template_id) return;
      const tname = (S.templates.find((t) => t.id === tid) || {}).name || tid;
      const ok = await confirmDlg('Ganti Template', 'Ganti template ke "' + tname + '"? Konten (teks & acara) tetap dipertahankan.', 'Ganti');
      if (!ok) return;
      try {
        await api('/weddings/' + S.weddingId, { method: 'PUT', body: { template_id: tid } });
        toast('Template diganti ke ' + tname + '.', 'ok');
        await vEditorUmum();
      } catch (err) { toast(err.message, 'error'); }
    };
    card.addEventListener('click', pick);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });

  $('#btn-title').addEventListener('click', async () => {
    const title = $('#f-title').value.trim();
    if (!title) { toast('Judul tidak boleh kosong.', 'error'); return; }
    try {
      await api('/weddings/' + S.weddingId, { method: 'PUT', body: { title } });
      await loadWeddingDetail();
      toast('Judul disimpan.', 'ok');
      onRoute();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#btn-copy-link').addEventListener('click', async () => {
    const ok = await copyText(location.origin + '/i/' + S.wedding.slug);
    toast(ok ? 'Tautan undangan disalin.' : 'Gagal menyalin.', ok ? 'ok' : 'error');
  });

  $('#btn-status').addEventListener('click', async () => {
    const next = S.wedding.status === 'published' ? 'draft' : 'published';
    try {
      await api('/weddings/' + S.weddingId + '/status', { method: 'POST', body: { status: next } });
      toast(next === 'published' ? 'Undangan diterbitkan.' : 'Undangan menjadi draft.', 'ok');
      await vEditorUmum();
    } catch (err) { toast(err.message, 'error'); }
  });

  const accentInput = $('#f-accent'), accentHex = $('#f-accent-hex');
  accentInput.addEventListener('input', () => { accentHex.value = accentInput.value; });
  accentHex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(accentHex.value)) accentInput.value = accentHex.value;
  });
  $('#btn-accent').addEventListener('click', async () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(accentHex.value)) { toast('Format hex tidak valid (contoh: #8a6234).', 'error'); return; }
    try {
      const cur = parseThemeConfig(S.wedding);
      cur.colors = cur.colors || {};
      cur.colors.accent = accentHex.value;
      await api('/weddings/' + S.weddingId, { method: 'PUT', body: { theme_config: cur } });
      await loadWeddingDetail();
      toast('Warna aksen disimpan.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  async function saveMusicUrl(url) {
    await api('/weddings/' + S.weddingId, { method: 'PUT', body: { music_url: url } });
    await loadWeddingDetail();
    await vEditorUmum();
    toast(url ? 'Musik disimpan.' : 'Musik dihapus.', 'ok');
  }
  $('#btn-music-url').addEventListener('click', async () => {
    const url = $('#f-music-url').value.trim();
    try { await saveMusicUrl(url); } catch (err) { toast(err.message, 'error'); }
  });
  const btnClear = $('#btn-music-clear');
  if (btnClear) btnClear.addEventListener('click', async () => {
    try { await saveMusicUrl(''); } catch (err) { toast(err.message, 'error'); }
  });
  $('#btn-music-upload').addEventListener('click', async () => {
    const file = $('#f-music-file').files[0];
    if (!file) { toast('Pilih file audio dulu.', 'error'); return; }
    try {
      const url = await uploadFile(file, 'musik');
      await saveMusicUrl(url);
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function uploadFile(file, label) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('wedding_id', String(S.weddingId));
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new ApiError((data && data.error) || ('Gagal mengunggah ' + label + '.'), res.status);
  if (!data || !data.url) throw new ApiError('Server tidak mengembalikan URL file.', res.status);
  return data.url;
}

/* ================= Editor: Acara ================= */
const EVENT_KINDS = { akad: 'Akad Nikah', resepsi: 'Resepsi', custom: 'Acara Khusus' };

async function vEditorAcara() {
  if (!needWedding()) return;
  setLoading('Memuat acara…');
  await loadWeddingDetail();
  const events = S.wedding.events || [];
  topAction('+ Tambah Acara', () => eventDlg(null), true);

  if (!events.length) {
    $('#content').innerHTML =
      '<div class="panel"><div class="empty"><h4>Belum ada acara</h4>' +
      '<p>Tambahkan akad, resepsi, atau acara khusus beserta waktu dan lokasinya.</p>' +
      '<button class="btn btn-primary" id="empty-event">+ Tambah Acara</button></div></div>';
    $('#empty-event').addEventListener('click', () => eventDlg(null));
    return;
  }

  let html = '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
    '<th>Jenis</th><th>Judul</th><th>Tanggal</th><th>Jam</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>';
  for (const ev of events) {
    const jam = [ev.start_time, ev.end_time].filter(Boolean).join(' – ') || '—';
    html += '<tr>' +
      '<td><span class="badge accent">' + esc(EVENT_KINDS[ev.kind] || ev.kind) + '</span></td>' +
      '<td><strong>' + esc(ev.title) + '</strong></td>' +
      '<td>' + fmtDate(ev.event_date) + '</td>' +
      '<td>' + esc(jam) + '</td>' +
      '<td>' + (ev.venue_name ? esc(ev.venue_name) : '<span class="small">—</span>') +
        (ev.address ? '<br><span class="small">' + esc(ev.address) + '</span>' : '') + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn btn-sm" data-act="edit" data-id="' + ev.id + '">Ubah</button>' +
        '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + ev.id + '">Hapus</button>' +
      '</div></td></tr>';
  }
  $('#content').innerHTML = html + '</tbody></table></div></div>';

  bindContent('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === 'edit') {
      const ev = events.find((x) => x.id === id);
      if (ev) eventDlg(ev);
    } else if (btn.dataset.act === 'del') {
      const ev = events.find((x) => x.id === id);
      const ok = await confirmDlg('Hapus Acara', 'Hapus acara "' + (ev ? ev.title : '') + '"?', 'Ya, hapus');
      if (!ok) return;
      try {
        await api('/weddings/' + S.weddingId + '/events/' + id, { method: 'DELETE' });
        toast('Acara dihapus.', 'ok');
        await vEditorAcara();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function eventDlg(ev) {
  const isNew = !ev;
  ev = ev || {};
  const m = openModal({
    title: isNew ? 'Tambah Acara' : 'Ubah Acara',
    wide: true,
    body:
      '<div class="form-row"><div class="field"><label>Jenis acara</label>' +
        '<select id="ev-kind">' +
        Object.keys(EVENT_KINDS).map((k) =>
          '<option value="' + k + '"' + (ev.kind === k ? ' selected' : '') + '>' + EVENT_KINDS[k] + '</option>').join('') +
        '</select></div>' +
      '<div class="field"><label>Judul acara</label>' +
        '<input type="text" id="ev-title" value="' + esc(ev.title || '') + '" placeholder="contoh: Akad Nikah"></div></div>' +
      '<div class="form-row cols-3">' +
        '<div class="field"><label>Tanggal</label><input type="date" id="ev-date" value="' + esc(ev.event_date || '') + '"></div>' +
        '<div class="field"><label>Jam mulai</label><input type="time" id="ev-start" value="' + esc(ev.start_time || '') + '"></div>' +
        '<div class="field"><label>Jam selesai</label><input type="time" id="ev-end" value="' + esc(ev.end_time || '') + '"></div></div>' +
      '<div class="field"><label>Nama venue / gedung</label>' +
        '<input type="text" id="ev-venue" value="' + esc(ev.venue_name || '') + '" placeholder="contoh: Gedung Serbaguna"></div>' +
      '<div class="field"><label>Alamat</label>' +
        '<textarea id="ev-address" style="min-height:60px">' + esc(ev.address || '') + '</textarea></div>' +
      '<div class="form-row"><div class="field"><label>URL Google Maps</label>' +
        '<input type="url" id="ev-maps" value="' + esc(ev.maps_url || '') + '" placeholder="https://maps.google.com/…"></div>' +
      '<div class="field"><label>Urutan tampil</label>' +
        '<input type="number" id="ev-order" value="' + (ev.sort_order != null ? ev.sort_order : 0) + '" min="0" step="1"></div></div>' +
      '<p class="form-error" id="ev-error" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Simpan</button>'
  });
  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const errEl = $('#ev-error', m.el);
    errEl.hidden = true;
    const body = {
      kind: $('#ev-kind', m.el).value,
      title: $('#ev-title', m.el).value.trim(),
      event_date: $('#ev-date', m.el).value,
      start_time: $('#ev-start', m.el).value,
      end_time: $('#ev-end', m.el).value,
      venue_name: $('#ev-venue', m.el).value.trim(),
      address: $('#ev-address', m.el).value.trim(),
      maps_url: $('#ev-maps', m.el).value.trim(),
      sort_order: parseInt($('#ev-order', m.el).value, 10) || 0
    };
    if (!body.title) { errEl.textContent = 'Judul acara wajib diisi.'; errEl.hidden = false; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) { errEl.textContent = 'Tanggal wajib diisi (format YYYY-MM-DD).'; errEl.hidden = false; return; }
    try {
      if (isNew) await api('/weddings/' + S.weddingId + '/events', { method: 'POST', body });
      else await api('/weddings/' + S.weddingId + '/events/' + ev.id, { method: 'PUT', body });
      m.close();
      toast('Acara disimpan.', 'ok');
      await vEditorAcara();
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });
}

/* ================= Editor: Seksi ================= */
const SECTION_META = {
  cover:     { name: 'Sampul', fields: [['title', 'Judul sampul', 'text'], ['names', 'Nama pasangan', 'text'], ['date', 'Tanggal tampil', 'text']] },
  hero:      { name: 'Pembuka', fields: [['greeting', 'Salam pembuka', 'text'], ['text', 'Teks pembuka', 'textarea']] },
  quote:     { name: 'Kutipan', fields: [['text', 'Isi kutipan', 'textarea'], ['source', 'Sumber', 'text']] },
  couple:    { name: 'Mempelai', fields: [
    ['bride_name', 'Nama mempelai wanita', 'text'], ['bride_nickname', 'Panggilan wanita', 'text'],
    ['bride_parents', 'Orang tua wanita', 'text'], ['bride_photo', 'Foto wanita (URL)', 'text'],
    ['groom_name', 'Nama mempelai pria', 'text'], ['groom_nickname', 'Panggilan pria', 'text'],
    ['groom_parents', 'Orang tua pria', 'text'], ['groom_photo', 'Foto pria (URL)', 'text']] },
  parents:   { name: 'Keluarga', fields: [['text', 'Teks pengantar', 'textarea']],
               items: ['families', 'Daftar keluarga', [['name', 'Nama'], ['relation', 'Hubungan']]] },
  events:    { name: 'Rangkaian Acara', fields: [['note', 'Catatan di bawah daftar acara', 'textarea']] },
  countdown: { name: 'Hitung Mundur', fields: [['text', 'Teks pengantar', 'textarea']] },
  story:     { name: 'Kisah Kami', fields: [],
               items: ['items', 'Momen kisah', [['date', 'Tanggal'], ['title', 'Judul'], ['text', 'Cerita']]] },
  gallery:   { name: 'Galeri', fields: [['title', 'Judul galeri', 'text']] },
  rsvp:      { name: 'RSVP', fields: [['note', 'Catatan formulir RSVP', 'textarea']] },
  wishes:    { name: 'Ucapan', fields: [['title', 'Judul', 'text'], ['note', 'Catatan', 'textarea']] },
  gift:      { name: 'Amplop', fields: [['note', 'Catatan amplop / gift', 'textarea']] },
  location:  { name: 'Lokasi', fields: [['note', 'Catatan lokasi', 'textarea']] },
  dresscode: { name: 'Dresscode', fields: [['text', 'Teks dresscode', 'textarea']],
               items: ['items', 'Aturan berpakaian', [['label', 'Label'], ['text', 'Keterangan']]] },
  info:      { name: 'Informasi', fields: [['text', 'Teks pengantar', 'textarea']],
               items: ['items', 'Daftar informasi', [['title', 'Judul'], ['text', 'Isi']]] },
  closing:   { name: 'Penutup', fields: [['text', 'Teks penutup', 'textarea'], ['share_text', 'Pesan tombol bagikan WA', 'textarea']] }
};

async function vEditorSeksi() {
  if (!needWedding()) return;
  setLoading('Memuat seksi…');
  await loadWeddingDetail();
  let sections = S.wedding.sections || [];

  const order = Object.keys(SECTION_META);
  sections = sections.slice().sort((a, b) =>
    (a.sort_order - b.sort_order) || (order.indexOf(a.section_key) - order.indexOf(b.section_key)));

  let html = '<div class="panel"><div class="panel-head"><h3>Urutan & Visibilitas Seksi</h3>' +
    '<span class="small">Perubahan langsung tersimpan.</span></div><div class="panel-body flush">';
  if (!sections.length) {
    html += '<div class="empty"><h4>Belum ada seksi</h4>' +
      '<p>Undangan ini belum memiliki seksi. Inisialisasi 16 seksi standar agar bisa diaktifkan dan diisi teksnya.</p>' +
      '<button class="btn btn-primary" id="sec-init">Inisialisasi Seksi Standar</button></div>';
  }
  sections.forEach((s, i) => {
    const meta = SECTION_META[s.section_key] || { name: s.section_key };
    html += '<div class="section-row' + (s.enabled ? '' : ' off') + '">' +
      '<div class="sec-name"><strong>' + esc(meta.name) + '</strong>' +
      '<span class="mono">' + esc(s.section_key) + '</span></div>' +
      '<div class="order-btns">' +
        '<button data-act="up" data-idx="' + i + '"' + (i === 0 ? ' disabled' : '') + ' title="Naik">&#8593;</button>' +
        '<button data-act="down" data-idx="' + i + '"' + (i === sections.length - 1 ? ' disabled' : '') + ' title="Turun">&#8595;</button>' +
      '</div>' +
      '<label class="switch" title="Aktif/nonaktif"><input type="checkbox" data-act="toggle" data-idx="' + i + '"' +
        (s.enabled ? ' checked' : '') + '><span class="track"></span></label>' +
      '<button class="btn btn-sm" data-act="text" data-idx="' + i + '">Sunting Teks</button>' +
    '</div>';
  });
  html += '</div></div>';
  $('#content').innerHTML = html;

  const initBtn = $('#sec-init');
  if (initBtn) {
    initBtn.addEventListener('click', async () => {
      initBtn.disabled = true;
      try {
        const payload = Object.keys(SECTION_META).map((key, i) => ({
          section_key: key, enabled: 1, sort_order: i, config: {}
        }));
        await api('/weddings/' + S.weddingId + '/sections', { method: 'PUT', body: { sections: payload } });
        await loadWeddingDetail();
        toast('16 seksi standar dibuat.', 'ok');
        await vEditorSeksi();
      } catch (err) {
        toast(err.message, 'error');
        initBtn.disabled = false;
      }
    });
  }

  async function persist(next) {
    const payload = next.map((s, i) => ({
      section_key: s.section_key,
      enabled: s.enabled ? 1 : 0,
      sort_order: i,
      config: s.config
    }));
    await api('/weddings/' + S.weddingId + '/sections', { method: 'PUT', body: { sections: payload } });
    await loadWeddingDetail();
  }

  bindContent('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'toggle') return; // handled by change
    try {
      if (act === 'up' || act === 'down') {
        const j = act === 'up' ? idx - 1 : idx + 1;
        const tmp = sections[idx]; sections[idx] = sections[j]; sections[j] = tmp;
        await persist(sections);
        toast('Urutan seksi diperbarui.', 'ok');
        await vEditorSeksi();
      } else if (act === 'text') {
        sectionTextDlg(sections[idx], async (newConfig) => {
          sections[idx].config = JSON.stringify(newConfig);
          await persist(sections);
        });
      }
    } catch (err) { toast(err.message, 'error'); }
  });

  bindContent('change', async (e) => {
    const t = e.target.closest('[data-act="toggle"]');
    if (!t) return;
    const idx = Number(t.dataset.idx);
    try {
      sections[idx].enabled = t.checked ? 1 : 0;
      await persist(sections);
      toast('Seksi "' + (SECTION_META[sections[idx].section_key] || {}).name + '" ' +
        (t.checked ? 'diaktifkan.' : 'dinonaktifkan.'), 'ok');
      await vEditorSeksi();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function renderItemsEditor(itemsKey, itemsLabel, itemFields, items) {
  items = Array.isArray(items) ? items : [];
  let html = '<div class="field"><label>' + esc(itemsLabel) + '</label><div data-items="' + esc(itemsKey) + '">';
  items.forEach((it, i) => {
    html += '<div data-item-row style="border:1px solid var(--line-soft);border-radius:6px;padding:10px;margin-bottom:8px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong class="small">Item ' + (i + 1) + '</strong>' +
      '<button type="button" class="btn btn-sm btn-danger" data-item-del="' + i + '">Hapus</button></div>';
    itemFields.forEach(([fk, fl]) => {
      html += '<div class="field" style="margin-bottom:8px"><label>' + esc(fl) + '</label>' +
        (fk === 'text'
          ? '<textarea data-item-field="' + esc(fk) + '" data-item-idx="' + i + '" style="min-height:56px">' + esc(it[fk] || '') + '</textarea>'
          : '<input type="text" data-item-field="' + esc(fk) + '" data-item-idx="' + i + '" value="' + esc(it[fk] || '') + '">') +
        '</div>';
    });
    html += '</div>';
  });
  html += '</div><button type="button" class="btn btn-sm" data-items-add="' + esc(itemsKey) + '">+ Tambah Item</button></div>';
  return html;
}

function sectionTextDlg(section, onSave) {
  const key = section.section_key;
  const meta = SECTION_META[key] || { name: key, fields: [] };
  const cfg = parseSectionConfig(section);

  let body = '';
  (meta.fields || []).forEach(([fk, fl, ft]) => {
    body += '<div class="field"><label>' + esc(fl) + '</label>';
    if (ft === 'textarea') body += '<textarea data-cfg="' + esc(fk) + '">' + esc(cfg[fk] || '') + '</textarea>';
    else body += '<input type="text" data-cfg="' + esc(fk) + '" value="' + esc(cfg[fk] || '') + '">';
    body += '</div>';
  });
  if (meta.items) {
    const [itemsKey, itemsLabel, itemFields] = meta.items;
    body += renderItemsEditor(itemsKey, itemsLabel, itemFields, cfg[itemsKey]);
  }
  if (!body) body = '<p class="form-note">Seksi ini tidak memiliki teks yang bisa disunting.</p>';

  const m = openModal({
    title: 'Sunting Teks — ' + meta.name,
    wide: true,
    body: body + '<p class="form-error" id="sec-error" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Simpan</button>'
  });

  // tambah / hapus item
  m.body.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-items-add]');
    const delBtn = e.target.closest('[data-item-del]');
    if (addBtn) {
      const wrap = $('[data-items="' + addBtn.dataset.itemsAdd + '"]', m.body);
      const itemFields = meta.items[2];
      const idx = $$('[data-item-row]', wrap).length;
      const row = document.createElement('div');
      row.setAttribute('data-item-row', '');
      row.style.cssText = 'border:1px solid var(--line-soft);border-radius:6px;padding:10px;margin-bottom:8px';
      let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<strong class="small">Item ' + (idx + 1) + '</strong>' +
        '<button type="button" class="btn btn-sm btn-danger" data-item-del="' + idx + '">Hapus</button></div>';
      itemFields.forEach(([fk, fl]) => {
        h += '<div class="field" style="margin-bottom:8px"><label>' + esc(fl) + '</label>' +
          (fk === 'text'
            ? '<textarea data-item-field="' + esc(fk) + '" data-item-idx="' + idx + '" style="min-height:56px"></textarea>'
            : '<input type="text" data-item-field="' + esc(fk) + '" data-item-idx="' + idx + '" value="">') +
          '</div>';
      });
      row.innerHTML = h;
      wrap.appendChild(row);
    } else if (delBtn) {
      delBtn.closest('[data-item-row]').remove();
    }
  });

  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const errEl = $('#sec-error', m.el);
    errEl.hidden = true;
    const newCfg = Object.assign({}, cfg);
    $$('[data-cfg]', m.body).forEach((inp) => { newCfg[inp.dataset.cfg] = inp.value; });
    if (meta.items) {
      const [itemsKey] = meta.items;
      const wrap = $('[data-items="' + itemsKey + '"]', m.body);
      const rows = $$('[data-item-row]', wrap);
      newCfg[itemsKey] = rows.map((row) => {
        const it = {};
        $$('[data-item-field]', row).forEach((inp) => { it[inp.dataset.itemField] = inp.value; });
        return it;
      });
    }
    try {
      await onSave(newCfg);
      m.close();
      toast('Teks seksi disimpan.', 'ok');
      await vEditorSeksi();
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });
}

/* ================= Editor: Galeri ================= */
async function vEditorGaleri() {
  if (!needWedding()) return;
  setLoading('Memuat galeri…');
  await loadWeddingDetail();
  const items = (S.wedding.gallery || []).slice().sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));

  topAction('+ Tambah dari URL', () => galleryUrlDlg(), true);

  let html = '<div class="panel"><div class="panel-head"><h3>Tambah Foto</h3></div><div class="panel-body">' +
    '<div class="form-row"><div class="field"><label>URL gambar</label>' +
      '<div class="inline-edit"><input type="url" id="gal-url" placeholder="https://…/foto.jpg">' +
      '<button class="btn btn-primary btn-sm" id="gal-add-url">Tambah</button></div></div>' +
    '<div class="field"><label>atau unggah gambar (jpg/png/webp, maks 5MB)</label>' +
      '<div class="inline-edit"><input type="file" id="gal-file" accept="image/jpeg,image/png,image/webp">' +
      '<button class="btn btn-sm" id="gal-upload">Unggah</button></div></div></div>' +
    '<div class="field"><label>Keterangan (opsional)</label>' +
      '<input type="text" id="gal-caption" placeholder="Keterangan foto"></div>' +
  '</div></div>';

  html += '<div class="panel"><div class="panel-head"><h3>Foto Galeri</h3>' +
    '<span class="small">' + items.length + ' foto</span></div>';
  if (!items.length) {
    html += '<div class="empty"><h4>Belum ada foto</h4><p>Tambahkan foto melalui URL atau unggah dari perangkat.</p></div>';
  } else {
    html += '<div class="panel-body"><div class="gal-grid">';
    items.forEach((g, i) => {
      html += '<div class="gal-item">' +
        '<img src="' + esc(g.url) + '" alt="' + esc(g.caption || 'Foto galeri') + '" loading="lazy">' +
        '<div class="gal-foot"><span class="caption" title="' + esc(g.caption || '') + '">' +
          (g.caption ? esc(g.caption) : '<span class="small">tanpa keterangan</span>') + '</span>' +
          '<button data-act="up" data-id="' + g.id + '"' + (i === 0 ? ' disabled' : '') + ' title="Geser kiri">&#8592;</button>' +
          '<button data-act="down" data-id="' + g.id + '"' + (i === items.length - 1 ? ' disabled' : '') + ' title="Geser kanan">&#8594;</button>' +
          '<button data-act="cap" data-id="' + g.id + '" title="Ubah keterangan">&#9998;</button>' +
          '<button class="del" data-act="del" data-id="' + g.id + '" title="Hapus">&times;</button>' +
        '</div></div>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  $('#content').innerHTML = html;

  async function addUrl(url, caption) {
    await api('/weddings/' + S.weddingId + '/gallery', {
      method: 'POST',
      body: { url, caption: caption || '', sort_order: items.length }
    });
    toast('Foto ditambahkan.', 'ok');
    await vEditorGaleri();
  }

  $('#gal-add-url').addEventListener('click', async () => {
    const url = $('#gal-url').value.trim();
    if (!url) { toast('Isi URL gambar dulu.', 'error'); return; }
    try { await addUrl(url, $('#gal-caption').value.trim()); }
    catch (err) { toast(err.message, 'error'); }
  });
  $('#gal-upload').addEventListener('click', async () => {
    const file = $('#gal-file').files[0];
    if (!file) { toast('Pilih file gambar dulu.', 'error'); return; }
    try {
      const url = await uploadFile(file, 'gambar');
      await addUrl(url, $('#gal-caption').value.trim());
    } catch (err) { toast(err.message, 'error'); }
  });

  bindContent('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || !btn.dataset.id) return;
    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;
    try {
      if (act === 'del') {
        const ok = await confirmDlg('Hapus Foto', 'Hapus foto ini dari galeri?', 'Ya, hapus');
        if (!ok) return;
        await api('/weddings/' + S.weddingId + '/gallery/' + id, { method: 'DELETE' });
        toast('Foto dihapus.', 'ok');
      } else if (act === 'cap') {
        const g = items.find((x) => x.id === id);
        const cap = await promptDlg('Keterangan Foto', 'Keterangan', g ? g.caption : '');
        if (cap == null) return;
        await api('/weddings/' + S.weddingId + '/gallery/' + id, { method: 'PUT', body: { caption: cap } });
        toast('Keterangan disimpan.', 'ok');
      } else if (act === 'up' || act === 'down') {
        const idx = items.findIndex((x) => x.id === id);
        const j = act === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= items.length) return;
        const a = items[idx], b = items[j];
        await api('/weddings/' + S.weddingId + '/gallery/' + a.id, { method: 'PUT', body: { sort_order: b.sort_order } });
        await api('/weddings/' + S.weddingId + '/gallery/' + b.id, { method: 'PUT', body: { sort_order: a.sort_order } });
        toast('Urutan foto diperbarui.', 'ok');
      } else return;
      await vEditorGaleri();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function galleryUrlDlg() {
  const urlInput = $('#gal-url');
  if (urlInput) { urlInput.focus(); urlInput.scrollIntoView({ block: 'center' }); }
  else toast('Form tambah URL ada di atas halaman ini.', 'error');
}

/* ================= Editor: Gift ================= */
const GIFT_TYPES = { bank: 'Bank', ewallet: 'E-Wallet', address: 'Alamat Kirim' };

async function vEditorGift() {
  if (!needWedding()) return;
  setLoading('Memuat gift…');
  await loadWeddingDetail();
  const gifts = S.wedding.gifts || [];
  topAction('+ Tambah Metode', () => giftDlg(null), true);

  let html = '<div class="panel">';
  if (!gifts.length) {
    html += '<div class="empty"><h4>Belum ada metode gift</h4>' +
      '<p>Tambahkan rekening bank, e-wallet, atau alamat kirim kado.</p>' +
      '<button class="btn btn-primary" id="empty-gift">+ Tambah Metode</button></div>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Jenis</th><th>Provider</th><th>Nomor / Alamat</th><th>Atas Nama</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>';
    for (const g of gifts) {
      html += '<tr>' +
        '<td><span class="badge accent">' + esc(GIFT_TYPES[g.type] || g.type) + '</span></td>' +
        '<td><strong>' + esc(g.provider) + '</strong></td>' +
        '<td class="mono">' + esc(g.account_number) + '</td>' +
        '<td>' + esc(g.account_name) + '</td>' +
        '<td class="small">' + (g.note ? esc(g.note) : '—') + '</td>' +
        '<td><div class="table-actions">' +
          '<button class="btn btn-sm" data-act="edit" data-id="' + g.id + '">Ubah</button>' +
          '<button class="btn btn-sm" data-act="copy" data-id="' + g.id + '">Salin Nomor</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + g.id + '">Hapus</button>' +
        '</div></td></tr>';
    }
    html += '</tbody></table></div>';
  }
  html += '</div>';
  $('#content').innerHTML = html;

  const emptyBtn = $('#empty-gift');
  if (emptyBtn) emptyBtn.addEventListener('click', () => giftDlg(null));

  bindContent('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;
    try {
      if (act === 'edit') {
        const g = gifts.find((x) => x.id === id);
        if (g) giftDlg(g);
      } else if (act === 'copy') {
        const g = gifts.find((x) => x.id === id);
        const ok = await copyText(g ? g.account_number : '');
        toast(ok ? 'Nomor disalin.' : 'Gagal menyalin.', ok ? 'ok' : 'error');
      } else if (act === 'del') {
        const ok = await confirmDlg('Hapus Metode Gift', 'Hapus metode gift ini?', 'Ya, hapus');
        if (!ok) return;
        await api('/weddings/' + S.weddingId + '/gifts/' + id, { method: 'DELETE' });
        toast('Metode gift dihapus.', 'ok');
        await vEditorGift();
      }
    } catch (err) { toast(err.message, 'error'); }
  });
}

function giftDlg(g) {
  const isNew = !g;
  g = g || {};
  const m = openModal({
    title: isNew ? 'Tambah Metode Gift' : 'Ubah Metode Gift',
    body:
      '<div class="form-row"><div class="field"><label>Jenis</label>' +
        '<select id="gf-type">' +
        Object.keys(GIFT_TYPES).map((k) =>
          '<option value="' + k + '"' + (g.type === k ? ' selected' : '') + '>' + GIFT_TYPES[k] + '</option>').join('') +
        '</select></div>' +
      '<div class="field"><label>Provider</label>' +
        '<input type="text" id="gf-provider" value="' + esc(g.provider || '') + '" placeholder="contoh: BCA, DANA, GoPay"></div></div>' +
      '<div class="field"><label>Nomor rekening / nomor e-wallet / alamat</label>' +
        '<input type="text" id="gf-number" value="' + esc(g.account_number || '') + '"></div>' +
      '<div class="field"><label>Atas nama</label>' +
        '<input type="text" id="gf-name" value="' + esc(g.account_name || '') + '"></div>' +
      '<div class="field"><label>Catatan (opsional)</label>' +
        '<input type="text" id="gf-note" value="' + esc(g.note || '') + '"></div>' +
      '<p class="form-error" id="gf-error" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Simpan</button>'
  });
  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const errEl = $('#gf-error', m.el);
    errEl.hidden = true;
    const body = {
      type: $('#gf-type', m.el).value,
      provider: $('#gf-provider', m.el).value.trim(),
      account_number: $('#gf-number', m.el).value.trim(),
      account_name: $('#gf-name', m.el).value.trim(),
      note: $('#gf-note', m.el).value.trim()
    };
    if (!body.provider || !body.account_number || !body.account_name) {
      errEl.textContent = 'Provider, nomor, dan nama pemilik wajib diisi.'; errEl.hidden = false; return;
    }
    try {
      if (isNew) await api('/weddings/' + S.weddingId + '/gifts', { method: 'POST', body });
      else await api('/weddings/' + S.weddingId + '/gifts/' + g.id, { method: 'PUT', body });
      m.close();
      toast('Metode gift disimpan.', 'ok');
      await vEditorGift();
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });
}

/* ================= Guests ================= */
const guestFilter = { q: '', rsvp: '' };

async function vGuests() {
  if (!needWedding()) return;
  setLoading('Memuat daftar tamu…');
  await loadWeddingDetail();

  topAction('Impor CSV', importGuestsDlg);
  topAction('Ekspor CSV', async () => {
    try { await downloadCsv('/weddings/' + S.weddingId + '/guests/export', 'tamu.csv'); }
    catch (err) { toast(err.message, 'error'); }
  });
  topAction('+ Tambah Tamu', () => guestDlg(null), true);

  const rsvpOpts = [['', 'Semua status'], ['yes', 'Hadir'], ['no', 'Tidak hadir'], ['none', 'Belum RSVP']]
    .map(([v, l]) => '<option value="' + v + '"' + (guestFilter.rsvp === v ? ' selected' : '') + '>' + l + '</option>').join('');

  $('#content').innerHTML =
    '<div class="panel"><div class="panel-body">' +
      '<div class="toolbar">' +
        '<input type="text" class="search-input" id="guest-q" placeholder="Cari nama / telepon / grup…" value="' + esc(guestFilter.q) + '">' +
        '<select id="guest-rsvp" style="max-width:180px">' + rsvpOpts + '</select>' +
        '<span class="small grow" id="guest-count"></span>' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Nama</th><th>Telepon</th><th>Grup</th><th>RSVP</th><th>Tautan Personal</th><th>Aksi</th>' +
      '</tr></thead><tbody id="guest-rows"></tbody></table></div>' +
      '<div class="empty" id="guest-empty" hidden><h4>Belum ada tamu</h4><p>Tambahkan tamu satu per satu atau impor dari CSV.</p></div>' +
    '</div></div>';

  let timer = null;
  $('#guest-q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { guestFilter.q = e.target.value; loadGuestRows(); }, 350);
  });
  $('#guest-rsvp').addEventListener('change', (e) => { guestFilter.rsvp = e.target.value; loadGuestRows(); });

  bindContent('click', onGuestClick);
  await loadGuestRows();
}

async function loadGuestRows() {
  const tbody = $('#guest-rows');
  const empty = $('#guest-empty');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="loading">Memuat…</div></td></tr>';
  try {
    const params = new URLSearchParams();
    if (guestFilter.q) params.set('q', guestFilter.q);
    if (guestFilter.rsvp) params.set('rsvp', guestFilter.rsvp);
    const qs = params.toString();
    const guests = await api('/weddings/' + S.weddingId + '/guests' + (qs ? '?' + qs : ''));
    $('#guest-count').textContent = guests.length + ' tamu';
    empty.hidden = guests.length > 0;
    tbody.innerHTML = guests.map((g) => {
      const link = location.origin + '/i/' + S.wedding.slug + '/t/' + g.token;
      const rsvpBadge = !g.rsvp_attendance
        ? '<span class="badge hidden">Belum RSVP</span>'
        : '<span class="badge ' + esc(g.rsvp_attendance) + '">' +
          (g.rsvp_attendance === 'yes' ? 'Hadir' + (g.rsvp_guest_count > 1 ? ' (' + g.rsvp_guest_count + ')' : '') : 'Tidak hadir') +
          '</span>';
      return '<tr>' +
        '<td><strong>' + esc(g.name) + '</strong></td>' +
        '<td>' + (g.phone ? esc(g.phone) : '<span class="small">—</span>') + '</td>' +
        '<td>' + (g.group_name ? esc(g.group_name) : '<span class="small">—</span>') + '</td>' +
        '<td>' + rsvpBadge + '</td>' +
        '<td><span class="link-inline mono">/i/' + esc(S.wedding.slug) + '/t/' + esc(g.token) + '</span><br>' +
          '<div class="table-actions" style="margin-top:4px">' +
            '<button class="btn btn-sm" data-act="copy" data-id="' + g.id + '" data-link="' + esc(link) + '">Salin</button>' +
            '<button class="btn btn-sm" data-act="wa" data-id="' + g.id + '" data-name="' + esc(g.name) + '" data-link="' + esc(link) + '">WA</button>' +
          '</div></td>' +
        '<td><div class="table-actions">' +
          '<button class="btn btn-sm" data-act="edit" data-id="' + g.id + '">Ubah</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + g.id + '">Hapus</button>' +
        '</div></td></tr>';
    }).join('');
    tbody._guests = guests;
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="error-box">' + esc(err.message) + '</div></td></tr>';
  }
}

async function onGuestClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = Number(btn.dataset.id);
  const guests = $('#guest-rows')._guests || [];
  try {
    if (act === 'copy') {
      const ok = await copyText(btn.dataset.link);
      toast(ok ? 'Tautan personal disalin.' : 'Gagal menyalin.', ok ? 'ok' : 'error');
    } else if (act === 'wa') {
      const msg = 'Halo ' + btn.dataset.name + ', dengan hormat kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan kami. ' +
        'Silakan buka undangan digital berikut: ' + btn.dataset.link;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    } else if (act === 'edit') {
      const g = guests.find((x) => x.id === id);
      if (g) guestDlg(g);
    } else if (act === 'del') {
      const g = guests.find((x) => x.id === id);
      const ok = await confirmDlg('Hapus Tamu', 'Hapus tamu "' + (g ? g.name : '') + '" dari daftar?', 'Ya, hapus');
      if (!ok) return;
      await api('/weddings/' + S.weddingId + '/guests/' + id, { method: 'DELETE' });
      toast('Tamu dihapus.', 'ok');
      await loadGuestRows();
    }
  } catch (err) { toast(err.message, 'error'); }
}

function guestDlg(g) {
  const isNew = !g;
  g = g || {};
  const m = openModal({
    title: isNew ? 'Tambah Tamu' : 'Ubah Tamu',
    body:
      '<div class="field"><label>Nama tamu</label>' +
        '<input type="text" id="gs-name" value="' + esc(g.name || '') + '" placeholder="contoh: Bapak H. Ahmad & keluarga"></div>' +
      '<div class="form-row"><div class="field"><label>Telepon (opsional)</label>' +
        '<input type="text" id="gs-phone" value="' + esc(g.phone || '') + '"></div>' +
      '<div class="field"><label>Grup (opsional)</label>' +
        '<input type="text" id="gs-group" value="' + esc(g.group_name || '') + '" placeholder="contoh: Keluarga, Kantor"></div></div>' +
      (isNew ? '' : '<p class="form-note">Token personal: <span class="mono">' + esc(g.token || '') + '</span> (tidak dapat diubah)</p>') +
      '<p class="form-error" id="gs-error" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Simpan</button>'
  });
  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const errEl = $('#gs-error', m.el);
    errEl.hidden = true;
    const body = {
      name: $('#gs-name', m.el).value.trim(),
      phone: $('#gs-phone', m.el).value.trim(),
      group_name: $('#gs-group', m.el).value.trim()
    };
    if (!body.name) { errEl.textContent = 'Nama tamu wajib diisi.'; errEl.hidden = false; return; }
    try {
      if (isNew) await api('/weddings/' + S.weddingId + '/guests', { method: 'POST', body });
      else await api('/weddings/' + S.weddingId + '/guests/' + g.id, { method: 'PUT', body });
      m.close();
      toast('Tamu disimpan.', 'ok');
      await loadGuestRows();
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });
}

function importGuestsDlg() {
  const m = openModal({
    title: 'Impor Tamu dari CSV',
    wide: true,
    body:
      '<p class="form-note">Format: <span class="mono">nama,telepon,grup</span> — satu tamu per baris. Baris header opsional.</p>' +
      '<div class="field"><label>Tempel CSV</label>' +
        '<textarea id="imp-csv" style="min-height:140px" placeholder="Budi Santoso,081234567890,Keluarga&#10;Siti Aminah,,Kantor"></textarea></div>' +
      '<div class="field"><label>atau pilih file .csv</label>' +
        '<input type="file" id="imp-file" accept=".csv,text/csv"></div>' +
      '<p class="form-error" id="imp-error" hidden></p>' +
      '<p class="form-note" id="imp-result" hidden></p>',
    foot: '<button type="button" class="btn" data-x="cancel">Batal</button>' +
          '<button type="button" class="btn btn-primary" data-x="ok">Impor</button>'
  });
  $('#imp-file', m.el).addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { $('#imp-csv', m.el).value = r.result; };
    r.readAsText(f);
  });
  $('[data-x="cancel"]', m.el).addEventListener('click', () => m.close());
  $('[data-x="ok"]', m.el).addEventListener('click', async () => {
    const errEl = $('#imp-error', m.el);
    const resEl = $('#imp-result', m.el);
    errEl.hidden = true; resEl.hidden = true;
    const csv = $('#imp-csv', m.el).value;
    if (!csv.trim()) { errEl.textContent = 'Isi CSV dulu.'; errEl.hidden = false; return; }
    try {
      const res = await api('/weddings/' + S.weddingId + '/guests/import', { method: 'POST', body: { csv } });
      resEl.textContent = 'Berhasil mengimpor ' + res.imported + ' tamu.';
      resEl.hidden = false;
      toast(res.imported + ' tamu diimpor.', 'ok');
      await loadGuestRows();
    } catch (err) { errEl.textContent = err.message; errEl.hidden = false; }
  });
}

/* ================= RSVP ================= */
const rsvpFilter = { att: '' };

async function vRsvp() {
  if (!needWedding()) return;
  setLoading('Memuat RSVP…');
  await loadWeddingDetail();

  topAction('Ekspor CSV', async () => {
    try { await downloadCsv('/weddings/' + S.weddingId + '/rsvps/export', 'rsvp.csv'); }
    catch (err) { toast(err.message, 'error'); }
  });

  $('#content').innerHTML =
    '<div class="stats" id="rsvp-stats"><div class="stat"><div class="num">…</div><div class="lbl">Memuat</div></div></div>' +
    '<div class="panel"><div class="panel-body">' +
      '<div class="toolbar">' +
        '<div class="segmented" id="rsvp-seg">' +
          '<button data-v="" class="active">Semua</button>' +
          '<button data-v="yes">Hadir</button>' +
          '<button data-v="no">Tidak hadir</button>' +
        '</div>' +
        '<span class="small grow" id="rsvp-count"></span>' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Nama</th><th>Kehadiran</th><th>Jumlah</th><th>Pesan</th><th>Waktu</th>' +
      '</tr></thead><tbody id="rsvp-rows"></tbody></table></div>' +
      '<div class="empty" id="rsvp-empty" hidden><h4>Belum ada RSVP</h4><p>Respons tamu akan muncul di sini setelah mereka mengisi formulir.</p></div>' +
    '</div></div>';

  $('#rsvp-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#rsvp-seg button').forEach((x) => x.classList.toggle('active', x === b));
    rsvpFilter.att = b.dataset.v;
    renderRsvpRows();
  });

  await reloadRsvp();
}

async function reloadRsvp() {
  const data = await api('/weddings/' + S.weddingId + '/rsvps');
  const s = data.summary || {};
  $('#rsvp-stats').innerHTML =
    '<div class="stat"><div class="num">' + (s.total_forms || 0) + '</div><div class="lbl">Total Formulir</div></div>' +
    '<div class="stat"><div class="num">' + (s.yes_count || 0) + '</div><div class="lbl">Konfirmasi Hadir</div></div>' +
    '<div class="stat"><div class="num">' + (s.no_count || 0) + '</div><div class="lbl">Berhalangan</div></div>' +
    '<div class="stat"><div class="num">' + (s.total_persons || 0) + '</div><div class="lbl">Total Orang Hadir</div></div>';
  $('#rsvp-stats')._list = data.list || [];
  renderRsvpRows();
}

function renderRsvpRows() {
  const list = ($('#rsvp-stats')._list || []).filter((r) => !rsvpFilter.att || r.attendance === rsvpFilter.att);
  const tbody = $('#rsvp-rows');
  $('#rsvp-count').textContent = list.length + ' respons';
  $('#rsvp-empty').hidden = list.length > 0;
  tbody.innerHTML = list.map((r) =>
    '<tr>' +
      '<td><strong>' + esc(r.name) + '</strong></td>' +
      '<td><span class="badge ' + esc(r.attendance) + '">' + (r.attendance === 'yes' ? 'Hadir' : 'Tidak hadir') + '</span></td>' +
      '<td>' + esc(r.guest_count) + ' orang</td>' +
      '<td class="small">' + (r.message ? esc(r.message) : '—') + '</td>' +
      '<td class="small">' + fmtDateTime(r.created_at) + '</td>' +
    '</tr>').join('');
}

/* ================= Wishes ================= */
const wishFilter = { status: '', q: '' };

async function vWishes() {
  if (!needWedding()) return;
  setLoading('Memuat ucapan…');
  await loadWeddingDetail();

  $('#content').innerHTML =
    '<div class="panel"><div class="panel-body">' +
      '<div class="toolbar">' +
        '<div class="segmented" id="wish-seg">' +
          '<button data-v="" class="active">Semua</button>' +
          '<button data-v="pending">Menunggu</button>' +
          '<button data-v="approved">Disetujui</button>' +
          '<button data-v="hidden">Disembunyikan</button>' +
        '</div>' +
        '<input type="text" class="search-input" id="wish-q" placeholder="Cari nama / pesan…" value="' + esc(wishFilter.q) + '">' +
        '<span class="small grow" id="wish-count"></span>' +
      '</div>' +
      '<div id="wish-list"></div>' +
      '<div class="empty" id="wish-empty" hidden><h4>Belum ada ucapan</h4><p>Ucapan dari tamu akan muncul di sini untuk dimoderasi.</p></div>' +
    '</div></div>';

  let timer = null;
  $('#wish-q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { wishFilter.q = e.target.value; loadWishList(); }, 350);
  });
  $('#wish-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#wish-seg button').forEach((x) => x.classList.toggle('active', x === b));
    wishFilter.status = b.dataset.v;
    loadWishList();
  });
  bindContent('click', onWishClick);
  await loadWishList();
}

async function loadWishList() {
  const list = $('#wish-list');
  const empty = $('#wish-empty');
  list.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    if (wishFilter.status) params.set('status', wishFilter.status);
    if (wishFilter.q) params.set('q', wishFilter.q);
    const qs = params.toString();
    const wishes = await api('/weddings/' + S.weddingId + '/wishes' + (qs ? '?' + qs : ''));
    $('#wish-count').textContent = wishes.length + ' ucapan';
    empty.hidden = wishes.length > 0;
    list.innerHTML = wishes.map((wsh) => {
      const badge = wsh.status === 'approved' ? '<span class="badge approved">Disetujui</span>'
        : wsh.status === 'pending' ? '<span class="badge pending">Menunggu</span>'
        : '<span class="badge hidden">Disembunyikan</span>';
      return '<div class="wish-item">' +
        '<div class="wish-head"><strong>' + esc(wsh.name) + '</strong>' + badge +
        '<time>' + fmtDateTime(wsh.created_at) + '</time></div>' +
        '<p class="wish-msg">' + esc(wsh.message) + '</p>' +
        '<div class="wish-actions">' +
          (wsh.status !== 'approved' ? '<button class="btn btn-sm" data-act="approve" data-id="' + wsh.id + '">Setujui</button>' : '') +
          (wsh.status !== 'hidden' ? '<button class="btn btn-sm" data-act="hide" data-id="' + wsh.id + '">Sembunyikan</button>' : '') +
          '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + wsh.id + '">Hapus</button>' +
        '</div></div>';
    }).join('');
    list._wishes = wishes;
  } catch (err) {
    list.innerHTML = '<div class="error-box">' + esc(err.message) + '</div>';
  }
}

async function onWishClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;
  const wishes = $('#wish-list')._wishes || [];
  try {
    if (act === 'approve' || act === 'hide') {
      const status = act === 'approve' ? 'approved' : 'hidden';
      await api('/wishes/' + id, { method: 'PATCH', body: { status } });
      toast(act === 'approve' ? 'Ucapan disetujui dan tampil di publik.' : 'Ucapan disembunyikan.', 'ok');
      await loadWishList();
    } else if (act === 'del') {
      const wsh = wishes.find((x) => x.id === id);
      const ok = await confirmDlg('Hapus Ucapan', 'Hapus ucapan dari "' + (wsh ? wsh.name : '') + '"?', 'Ya, hapus');
      if (!ok) return;
      await api('/wishes/' + id, { method: 'DELETE' });
      toast('Ucapan dihapus.', 'ok');
      await loadWishList();
    }
  } catch (err) { toast(err.message, 'error'); }
}

/* ================= Preview ================= */
async function vPreview() {
  if (!needWedding()) return;
  await loadWeddingDetail();
  const w = S.wedding;
  const url = '/i/' + w.slug + '?preview=1';

  $('#content').innerHTML =
    '<div class="panel"><div class="panel-body">' +
      '<div class="preview-toolbar">' +
        '<div class="segmented" id="pv-seg">' +
          '<button data-v="desktop" class="active">Desktop</button>' +
          '<button data-v="mobile">Mobile</button>' +
        '</div>' +
        '<button class="btn btn-sm" id="pv-reload">Muat Ulang</button>' +
        '<a class="btn btn-sm" id="pv-open" href="' + esc(url) + '" target="_blank" rel="noopener">Buka di Tab Baru</a>' +
        (w.status === 'draft'
          ? '<span class="badge draft">Draft — pratinjau memakai sesi login admin</span>'
          : '<span class="badge published">Terbit</span>') +
      '</div>' +
      '<div class="preview-frame-wrap" id="pv-wrap">' +
        '<iframe id="pv-frame" title="Pratinjau undangan" src="' + esc(url) + '"></iframe>' +
      '</div>' +
    '</div></div>';

  $('#pv-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#pv-seg button').forEach((x) => x.classList.toggle('active', x === b));
    $('#pv-wrap').classList.toggle('mobile', b.dataset.v === 'mobile');
  });
  $('#pv-reload').addEventListener('click', () => {
    $('#pv-frame').src = url + '&_=' + Date.now();
  });
}

/* ================= Boot ================= */
document.addEventListener('DOMContentLoaded', boot);

})();
