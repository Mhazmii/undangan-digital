/* public/js/invite.js
 * Shell undangan publik (/i/:slug dan /i/:slug/t/:token).
 * Tanggung jawab:
 *  - fetch GET /api/public/wedding/:slug (§4.8) + nama tamu via /guest/:token
 *  - dynamic import template.js + inject style.css sesuai template_id
 *  - opening state machine: loading → cover → opening → main (+ error)
 *  - musik HANYA setelah user menekan "Buka Undangan"
 *  - wiring widget lintas-template: countdown, RSVP, wishes, share, salin, musik
 *
 * Template (template.js) me-render markup section; shell mengikat perilaku
 * lewat delegasi [data-action] dan id form yang disepakati (lihat NOTES-template-core.md).
 */
import { initReveals, staggerChildren, prefersReducedMotion } from './motion.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- util ---------- */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function api(path, opts) {
  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw Object.assign(new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'), { status: 0 });
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error || ''; } catch { /* abaikan */ }
    throw Object.assign(new Error(msg || `Terjadi kesalahan (HTTP ${res.status}).`), { status: res.status });
  }
  return res.status === 204 ? null : res.json();
}

function parseJSON(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
}

function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- state machine ---------- */
const STAGE = { LOADING: 'loading', COVER: 'cover', OPENING: 'opening', MAIN: 'main', ERROR: 'error' };
let stage = STAGE.LOADING;
let openingInProgress = false;
let template = null;   // { id, render, opening }
let weddingData = null;
let guestName = null;
let guestToken = null;
let slug = '';

function showOnly(id) {
  for (const el of ['#loading', '#cover', '#main', '#error']) $(el).hidden = ('#' + id) !== el && el !== '#' + id;
  // lebih eksplisit & aman:
  $('#loading').hidden = id !== 'loading';
  $('#cover').hidden = id !== 'cover';
  $('#main').hidden = id !== 'main';
  $('#error').hidden = id !== 'error';
}

function showError(title, msg) {
  stage = STAGE.ERROR;
  $('#error-title').textContent = title;
  $('#error-msg').textContent = msg;
  showOnly('error');
  document.body.classList.add('is-main'); // buka kunci scroll agar error terbaca
}

function parseRoute() {
  const m = /^\/i\/([^/]+)(?:\/t\/([^/?#]+))?/.exec(window.location.pathname);
  if (!m) return null;
  return { slug: decodeURIComponent(m[1]), token: m[2] ? decodeURIComponent(m[2]) : null };
}

/* ---------- template loading ---------- */
async function loadTemplate(id) {
  if (!/^[a-z0-9-]{1,16}$/.test(id || '')) throw new Error('Template undangan tidak valid.');
  const cssHref = `/templates/${id}/style.css`;
  await new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.onload = resolve;
    link.onerror = () => reject(new Error('Gagal memuat tampilan undangan.'));
    document.head.appendChild(link);
  });
  let mod;
  try {
    mod = await import(`/templates/${id}/template.js`);
  } catch {
    throw new Error('Gagal memuat tampilan undangan.');
  }
  if (!mod || typeof mod.render !== 'function') throw new Error('Template undangan rusak.');
  const allowed = ['fade', 'curtain', 'envelope', 'mask', 'cinematic'];
  template = { id, render: mod.render, opening: allowed.includes(mod.opening) ? mod.opening : 'fade' };
  document.body.classList.add(`tpl-${id}`);
  document.body.dataset.template = id;
}

function applyTheme(themeConfig) {
  const cfg = parseJSON(themeConfig);
  const accent = cfg?.colors?.accent;
  if (typeof accent === 'string' && /^#(?:[0-9a-fA-F]{3,8})$/.test(accent.trim())) {
    document.documentElement.style.setProperty('--inv-accent', accent.trim());
  }
}

/* ---------- sampul (cover) ---------- */
function splitNames(names, title) {
  const raw = (names || title || '').trim();
  if (!raw) return ['Mempelai', 'Berbahagia'];
  const parts = raw.split(/\s*&\s*|\s+dan\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' & ').trim()];
  return [raw, ''];
}

function coverArtwork() {
  // Ornamen garis tipis: lengkung ganda + ranting. Netral, ditata ulang oleh CSS tiap template.
  return `<svg class="inv-cover-art-svg" viewBox="0 0 200 240" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
    <path d="M100 12 C 44 12 28 70 28 120 C 28 170 44 228 100 228 C 156 228 172 170 172 120 C 172 70 156 12 100 12 Z"/>
    <path d="M100 26 C 54 26 40 74 40 120 C 40 166 54 214 100 214 C 146 214 160 166 160 120 C 160 74 146 26 100 26 Z" opacity=".45"/>
    <path d="M100 60 C 92 90 92 110 100 140 M100 90 C 112 96 120 104 124 116 M100 110 C 88 116 80 124 76 136" opacity=".7"/>
    <circle cx="100" cy="140" r="2.4" fill="currentColor" stroke="none" opacity=".8"/>
  </svg>`;
}

function renderCover(data) {
  const w = data.wedding;
  const cfg = parseJSON((data.sections.find((s) => s.section_key === 'cover') || {}).config);
  const [bride, groom] = splitNames(cfg.names, w.title);
  const dateLine = cfg.date || fmtDate((data.events[0] || {}).event_date);
  const title = cfg.title || 'Undangan Pernikahan';

  $('#cover').innerHTML = `
    <div class="inv-cover-inner">
      <div class="inv-cover-frame">
        ${guestName
          ? `<p class="inv-cover-to" data-reveal>Kepada Yth.<br>Bapak/Ibu/Saudara/i</p>
             <p class="inv-cover-guest" data-reveal><strong>${esc(guestName)}</strong></p>`
          : `<p class="inv-cover-to inv-cover-to-generic" data-reveal>Kepada Yth.<br>Bapak/Ibu/Saudara/i<br><span>Tamu Undangan</span></p>`}
        <p class="inv-cover-eyebrow" data-reveal>${esc(title)}</p>
        <div class="inv-cover-art" data-reveal>${coverArtwork()}</div>
        <h1 class="inv-cover-names" data-reveal>
          <span>${esc(bride)}</span>${groom ? `<em>&amp;</em><span>${esc(groom)}</span>` : ''}
        </h1>
        ${dateLine ? `<p class="inv-cover-date" data-reveal>${esc(dateLine)}</p>` : ''}
        <button type="button" class="inv-cover-open" data-action="open-invite" data-reveal>
          <span>Buka Undangan</span>
        </button>
      </div>
    </div>`;
  document.title = `${bride}${groom ? ' & ' + groom : ''} — Undangan Pernikahan`;
}

/* ---------- transisi opening ---------- */
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function openInvite() {
  if (stage !== STAGE.COVER || openingInProgress) return; // cegah double-click
  openingInProgress = true;
  const btn = $('[data-action="open-invite"]');
  if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }

  stage = STAGE.OPENING;
  startMusic(); // musik HANYA setelah interaksi user

  const cover = $('#cover');
  const kind = prefersReducedMotion() ? 'fade' : (template.opening || 'fade');
  cover.classList.add(`opening-${kind}`);
  // beri browser satu frame agar transisi terpicu mulus
  await wait(30);
  cover.classList.add('is-opening');
  await wait(kind === 'fade' ? 600 : 1000);
  cover.classList.add('is-gone');
  document.body.classList.add('is-main');
  window.scrollTo(0, 0);
  initReveals($('#main'));
  stage = STAGE.MAIN;
  openingInProgress = false;
}

/* ---------- musik ---------- */
let audio = null;
function setupMusic(url) {
  if (!url) return;
  audio = new Audio(url);
  audio.loop = true;
  audio.preload = 'auto';
  $('#music-btn').hidden = false;
}
async function startMusic() {
  if (!audio || !audio.paused) return;
  try { await audio.play(); } catch { /* autoplay ditolak / file rusak: tombol tetap ada */ }
  syncMusicBtn();
}
function toggleMusic() {
  if (!audio) return;
  if (audio.paused) audio.play().catch(() => toast('Musik tidak dapat diputar.'));
  else audio.pause();
  syncMusicBtn();
}
function syncMusicBtn() {
  $('#music-btn').classList.toggle('playing', !!audio && !audio.paused);
}

/* ---------- countdown ---------- */
let cdTimer = null;
function firstEvent(events) {
  const sorted = [...(events || [])].sort(
    (a, b) => (a.sort_order - b.sort_order) || String(a.event_date).localeCompare(String(b.event_date))
  );
  return sorted.find((e) => e.kind === 'akad') || sorted[0] || null;
}
function eventDateTime(ev) {
  if (!ev || !ev.event_date) return null;
  let t = (ev.start_time || '00:00').trim();
  if (/^\d{2}:\d{2}$/.test(t)) t += ':00';
  if (!/^\d{2}:\d{2}:\d{2}$/.test(t)) t = '00:00:00';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(t.slice(0, 2)), Number(t.slice(3, 5)), 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
function setupCountdown(data) {
  const box = $('[data-countdown]');
  if (!box) return;
  const target = eventDateTime(firstEvent(data.events));
  if (!target) { box.hidden = true; return; }
  const dEl = $('[data-cd-d]', box), hEl = $('[data-cd-h]', box),
        mEl = $('[data-cd-m]', box), sEl = $('[data-cd-s]', box);
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      clearInterval(cdTimer); cdTimer = null;
      if (dEl) dEl.textContent = '00'; if (hEl) hEl.textContent = '00';
      if (mEl) mEl.textContent = '00'; if (sEl) sEl.textContent = '00';
      const done = $('[data-cd-done]', box);
      if (done) done.hidden = false;
      return;
    }
    const dd = Math.floor(diff / 86400000);
    const hh = Math.floor((diff % 86400000) / 3600000);
    const mm = Math.floor((diff % 3600000) / 60000);
    const ss = Math.floor((diff % 60000) / 1000);
    if (dEl) dEl.textContent = pad(dd); if (hEl) hEl.textContent = pad(hh);
    if (mEl) mEl.textContent = pad(mm); if (sEl) sEl.textContent = pad(ss);
  };
  tick();
  clearInterval(cdTimer);
  cdTimer = setInterval(tick, 1000);
}

/* ---------- RSVP ---------- */
function setupRsvp() {
  const form = $('#rsvp-form');
  if (!form) return;
  if (guestName) {
    const nameInput = form.querySelector('[name="name"]');
    if (nameInput && !nameInput.value) nameInput.value = guestName;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('.inv-form-error', form);
    const setErr = (m) => { if (errBox) errBox.textContent = m || ''; };
    setErr('');
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const attendance = fd.get('attendance');
    const guest_count = Number(fd.get('guest_count'));
    const message = String(fd.get('message') || '').trim();
    if (name.length < 2) return setErr('Mohon isi nama Anda.');
    if (name.length > 100) return setErr('Nama maksimal 100 karakter.');
    if (attendance !== 'yes' && attendance !== 'no') return setErr('Mohon pilih konfirmasi kehadiran.');
    if (!Number.isInteger(guest_count) || guest_count < 1 || guest_count > 10)
      return setErr('Jumlah tamu harus antara 1–10.');
    if (message.length > 500) return setErr('Pesan maksimal 500 karakter.');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await api(`/api/public/wedding/${slug}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, attendance, guest_count, message,
          ...(guestToken ? { guest_token: guestToken } : {}),
        }),
      });
      form.innerHTML = `<div class="inv-form-ok" role="status">
        <p><strong>Terima kasih, ${esc(name)}.</strong></p>
        <p>Konfirmasi kehadiran Anda telah kami terima.${attendance === 'yes'
          ? ' Kami menantikan kehadiran Anda di hari bahagia.'
          : ' Terima kasih atas doa dan perhatiannya.'}</p>
      </div>`;
    } catch (err) {
      setErr(err.status === 429
        ? 'Terlalu banyak percobaan. Mohon tunggu sebentar lalu coba lagi.'
        : (err.message || 'Gagal mengirim. Silakan coba lagi.'));
      btn.disabled = false;
    }
  });
}

/* ---------- Wishes ---------- */
const WISH_LIMIT = 8;
let wishOffset = 0;
let wishesDone = false;

function wishNode(w) {
  const d = document.createElement('article');
  d.className = 'wish-item';
  d.setAttribute('data-reveal', '');
  const date = w.created_at ? new Date(String(w.created_at).replace(' ', 'T')) : null;
  const dateStr = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const h = document.createElement('p'); h.className = 'wish-name';
  h.textContent = w.name;
  const p = document.createElement('p'); p.className = 'wish-text';
  p.textContent = w.message;
  d.append(h, p);
  if (dateStr) { const t = document.createElement('time'); t.className = 'wish-date'; t.textContent = dateStr; d.append(t); }
  return d;
}

async function loadWishes(reset = false) {
  const list = $('#wishes-list');
  const moreBtn = $('#wishes-more');
  if (!list) return;
  if (reset) { wishOffset = 0; wishesDone = false; list.innerHTML = ''; }
  if (wishesDone) return;
  if (moreBtn) { moreBtn.disabled = true; moreBtn.textContent = 'Memuat…'; }
  try {
    const rows = await api(`/api/public/wedding/${slug}/wishes?limit=${WISH_LIMIT}&offset=${wishOffset}`);
    if (reset && rows.length === 0) {
      list.innerHTML = `<p class="wishes-empty">Belum ada ucapan. Jadilah yang pertama mengirim doa terbaik untuk kedua mempelai.</p>`;
    } else {
      rows.forEach((w) => list.appendChild(wishNode(w)));
      initReveals(list);
    }
    wishOffset += rows.length;
    if (rows.length < WISH_LIMIT) {
      wishesDone = true;
      if (moreBtn) moreBtn.hidden = true;
    }
  } catch {
    if (reset) list.innerHTML = `<p class="wishes-empty">Gagal memuat ucapan. Silakan muat ulang halaman.</p>`;
    toast('Gagal memuat ucapan.');
  } finally {
    if (moreBtn && !wishesDone) { moreBtn.disabled = false; moreBtn.textContent = 'Lihat ucapan lainnya'; }
  }
}

function setupWishes() {
  const form = $('#wish-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('.inv-form-error', form);
      const setErr = (m) => { if (errBox) errBox.textContent = m || ''; };
      setErr('');
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const message = String(fd.get('message') || '').trim();
      if (name.length < 2) return setErr('Mohon isi nama Anda.');
      if (name.length > 100) return setErr('Nama maksimal 100 karakter.');
      if (!message) return setErr('Mohon tulis ucapan Anda.');
      if (message.length > 500) return setErr('Ucapan maksimal 500 karakter.');
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        await api(`/api/public/wedding/${slug}/wishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message }),
        });
        form.reset();
        toast('Terima kasih! Ucapan Anda akan tampil setelah disetujui.');
      } catch (err) {
        setErr(err.status === 429
          ? 'Terlalu banyak percobaan. Mohon tunggu sebentar lalu coba lagi.'
          : (err.message || 'Gagal mengirim. Silakan coba lagi.'));
      } finally {
        btn.disabled = false;
      }
    });
  }
  const moreBtn = $('#wishes-more');
  if (moreBtn) moreBtn.addEventListener('click', () => loadWishes(false));
  loadWishes(true);
}

/* ---------- aksi generik (delegasi) ---------- */
async function copyText(text) {
  const done = () => toast('Berhasil disalin.');
  if (navigator.clipboard && window.isSecureContext !== false) {
    try { await navigator.clipboard.writeText(text); return done(); } catch { /* fallback */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); }
  catch { toast('Gagal menyalin. Silakan salin manual.'); }
  ta.remove();
}

function shareWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`;
  window.open(url, '_blank', 'noopener');
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;
  if (action === 'open-invite') { e.preventDefault(); openInvite(); }
  else if (action === 'retry') { window.location.reload(); }
  else if (action === 'toggle-music') { toggleMusic(); }
  else if (action === 'copy-text') { if (t.dataset.copy) copyText(t.dataset.copy); }
  else if (action === 'share-wa') { shareWhatsApp(t.dataset.shareText || 'Undangan Pernikahan'); }
  else if (action === 'scroll-to') {
    const target = t.dataset.target && $(t.dataset.target);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }); }
  }
});
$('#music-btn').addEventListener('click', toggleMusic);

/* ---------- boot ---------- */
async function boot() {
  showOnly('loading');
  const route = parseRoute();
  if (!route) { showError('Tautan tidak valid', 'Format tautan undangan tidak dikenali.'); return; }
  slug = route.slug;
  guestToken = route.token;

  if (new URLSearchParams(window.location.search).has('preview')) {
    $('#preview-badge').hidden = false;
  }

  try {
    const data = await api(`/api/public/wedding/${encodeURIComponent(slug)}`);
    weddingData = data;

    if (guestToken) {
      try {
        const g = await api(`/api/public/wedding/${encodeURIComponent(slug)}/guest/${encodeURIComponent(guestToken)}`);
        guestName = g && g.name ? g.name : null;
      } catch { guestName = null; /* token tak dikenal: tampilkan sampul umum */ }
    }

    await loadTemplate(data.wedding.template_id);
    applyTheme(data.wedding.theme_config);
    setupMusic(data.wedding.music_url);

    renderCover(data);
    // Render isi utama SEKARANG (di balik sampul) agar transisi opening tanpa flash.
    template.render(data, $('#main'));
    staggerChildren($('#cover'));

    showOnly('cover');
    stage = STAGE.COVER;
    initReveals($('#cover'));

    // Widget diikat setelah render; countdown/RSVP/wishes aktif saat main tampil.
    setupCountdown(data);
    setupRsvp();
    setupWishes();
  } catch (err) {
    if (err.status === 404) {
      showError('Undangan tidak ditemukan', 'Tautan undangan ini tidak valid atau acara belum dipublikasikan.');
    } else {
      showError('Gagal memuat undangan', err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }
}

boot();
