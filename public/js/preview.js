/* public/js/preview.js — pratinjau template dengan data contoh.
 * Alur: baca ?t=<id> → muat sampleWedding (bentuk persis §4.8) → inject
 * /templates/<id>/style.css → dynamic import template.js → render sampul
 * (replika markup shell .inv-cover-*) + render main via template.render().
 * Widget: countdown lokal, reveal sederhana, form dicegah (mode pratinjau).
 */
'use strict';

import { sampleWedding } from './sample-wedding.js';

const $ = (s, r) => (r || document).querySelector(s);
const VALID = ['t01', 't02', 't03', 't04', 't05', 't06', 't07', 't08'];
const OPENINGS = ['fade', 'curtain', 'envelope', 'mask', 'cinematic'];
const NAMES = {
  t01: 'Editorial Ivory', t02: 'Modern Minimalist', t03: 'Botanical Romance',
  t04: 'Royal Classic', t05: 'Contemporary Dark', t06: 'Garden Wedding',
  t07: 'Nusantara Heritage', t08: 'Cinematic Romance',
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function toast(msg) {
  const el = $('#pv-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- sampul (replika markup shell invite.js: renderCover) ---------- */
function coverArtwork() {
  return `<svg class="inv-cover-art-svg" viewBox="0 0 200 240" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
    <path d="M100 12 C 44 12 28 70 28 120 C 28 170 44 228 100 228 C 156 228 172 170 172 120 C 172 70 156 12 100 12 Z"/>
    <path d="M100 26 C 54 26 40 74 40 120 C 40 166 54 214 100 214 C 146 214 160 166 160 120 C 160 74 146 26 100 26 Z" opacity=".45"/>
    <path d="M100 60 C 92 90 92 110 100 140 M100 90 C 112 96 120 104 124 116 M100 110 C 88 116 80 124 76 136" opacity=".7"/>
    <circle cx="100" cy="140" r="2.4" fill="currentColor" stroke="none" opacity=".8"/>
  </svg>`;
}
function renderCover(w) {
  const cfg = parseJSON((w.sections.find((s) => s.section_key === 'cover') || {}).config);
  const raw = (cfg.names || w.wedding.title || '').trim();
  const parts = raw.split(/\s*&\s*|\s+dan\s+/i);
  const bride = parts[0] ? parts[0].trim() : 'Mempelai';
  const groom = parts.length >= 2 ? parts.slice(1).join(' & ').trim() : '';
  const dateLine = cfg.date || fmtDate((w.events[0] || {}).event_date);
  const title = cfg.title || 'Undangan Pernikahan';
  $('#pv-cover').innerHTML = `
    <div class="inv-cover-inner">
      <div class="inv-cover-frame">
        <p class="inv-cover-to inv-cover-to-generic">Kepada Yth.<br>Bapak/Ibu/Saudara/i<br><span>Tamu Undangan</span></p>
        <p class="inv-cover-eyebrow">${esc(title)}</p>
        <div class="inv-cover-art">${coverArtwork()}</div>
        <h1 class="inv-cover-names">
          <span>${esc(bride)}</span>${groom ? `<em>&amp;</em><span>${esc(groom)}</span>` : ''}
        </h1>
        ${dateLine ? `<p class="inv-cover-date">${esc(dateLine)}</p>` : ''}
        <button type="button" class="inv-cover-open" id="pv-open">
          <span>Buka Undangan</span>
        </button>
      </div>
    </div>`;
  document.title = `${bride}${groom ? ' & ' + groom : ''} — Pratinjau Template`;
}

/* ---------- reveal & countdown lokal (khusus pratinjau) ---------- */
function initReveals(scope) {
  const els = scope.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}
function firstEvent(events) {
  const list = (events || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return list.find((e) => e.kind === 'akad') || list[0] || null;
}
function initCountdown(scope, events) {
  const box = scope.querySelector('[data-countdown]');
  if (!box) return;
  const ev = firstEvent(events);
  const done = scope.querySelector('[data-cd-done]');
  if (!ev || !ev.event_date) return;
  const target = new Date(ev.event_date + 'T' + (ev.start_time || '00:00') + ':00').getTime();
  const d = box.querySelector('[data-cd-d]'), h = box.querySelector('[data-cd-h]');
  const m = box.querySelector('[data-cd-m]'), s = box.querySelector('[data-cd-s]');
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  const tick = () => {
    let diff = target - Date.now();
    if (diff <= 0) {
      box.style.display = 'none';
      if (done) done.hidden = false;
      clearInterval(timer);
      return;
    }
    const dd = Math.floor(diff / 864e5); diff -= dd * 864e5;
    const hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
    const mm = Math.floor(diff / 6e4); diff -= mm * 6e4;
    const ss = Math.floor(diff / 1e3);
    if (d) d.textContent = pad(dd);
    if (h) h.textContent = pad(hh);
    if (m) m.textContent = pad(mm);
    if (s) s.textContent = pad(ss);
  };
  const timer = setInterval(tick, 1000);
  tick();
}

/* ---------- boot ---------- */
async function boot() {
  const params = new URLSearchParams(location.search);
  const id = (params.get('t') || '').toLowerCase();
  if (!VALID.includes(id)) {
    $('#pv-frame').innerHTML = `<div class="pv-err">
      <h1>Template tidak valid</h1>
      <p>Parameter <code>?t=</code> harus salah satu dari ${VALID.join(', ')}.</p>
      <p><a href="/templates.html">Kembali ke galeri template</a></p>
    </div>`;
    return;
  }
  $('#pv-tname').textContent = `Pratinjau — ${NAMES[id]}`;

  // Toggle Desktop / Mobile
  const frame = $('#pv-frame');
  const bD = $('#pv-desktop'), bM = $('#pv-mobile');
  bD.addEventListener('click', () => { frame.classList.remove('mobile'); bD.classList.add('active'); bM.classList.remove('active'); });
  bM.addEventListener('click', () => { frame.classList.add('mobile'); bM.classList.add('active'); bD.classList.remove('active'); });

  // Data contoh (bentuk persis §4.8), template_id disesuaikan
  const w = JSON.parse(JSON.stringify(sampleWedding));
  w.wedding.template_id = id;

  // Muat CSS + module template
  await new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/templates/${id}/style.css`;
    link.onload = resolve;
    link.onerror = () => reject(new Error('CSS gagal dimuat'));
    document.head.appendChild(link);
  });
  let mod;
  try {
    mod = await import(`/templates/${id}/template.js`);
  } catch {
    $('#pv-frame').innerHTML = `<div class="pv-err"><h1>Gagal memuat template</h1>
      <p>File <code>/templates/${esc(id)}/template.js</code> tidak dapat dimuat.</p></div>`;
    return;
  }
  if (!mod || typeof mod.render !== 'function') {
    $('#pv-frame').innerHTML = `<div class="pv-err"><h1>Template rusak</h1>
      <p>Module tidak mengekspor <code>render()</code>.</p></div>`;
    return;
  }

  document.body.classList.add(`tpl-${id}`);
  document.body.dataset.template = id;
  const opening = OPENINGS.includes(mod.opening) ? mod.opening : 'fade';

  // Render sampul + isi
  renderCover(w);
  const main = $('#pv-main');
  mod.render(w, main);

  // Tombol buka: transisi opening ala shell (disederhanakan)
  $('#pv-open').addEventListener('click', () => {
    const cover = $('#pv-cover');
    cover.classList.add(`opening-${opening}`);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cover.classList.add('is-opening');
      setTimeout(() => {
        cover.classList.add('is-gone');
        main.hidden = false;
        initReveals(main);
        initCountdown(main, w.events);
        frame.scrollIntoView();
      }, opening === 'fade' ? 600 : 1000);
    }));
  });

  // Form dinonaktifkan lembut di mode pratinjau
  main.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Mode pratinjau — formulir tidak dikirim.');
  });
  const more = $('#wishes-more');
  if (more) more.addEventListener('click', () => toast('Mode pratinjau — daftar ucapan contoh tidak tersedia.'));
}

boot().catch((e) => {
  $('#pv-frame').innerHTML = `<div class="pv-err"><h1>Gagal memuat pratinjau</h1>
    <p>${esc(e.message || e)}</p><p><a href="/templates.html">Kembali ke galeri template</a></p></div>`;
});
