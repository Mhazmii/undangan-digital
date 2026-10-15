/* public/js/templates.js — galeri template publik.
 * Memuat daftar template dari GET /api/templates (kontrak §4.2); bila API belum
 * tersedia, pakai manifes lokal dari meta.json masing-masing template.
 * Fitur: filter kategori, search nama, tombol Preview (preview.html?t=<id>),
 * tombol "Gunakan Template" (→ /admin/).
 */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);

const CATEGORIES = [
  ['all', 'Semua'],
  ['editorial', 'Editorial'],
  ['minimalist', 'Minimalist'],
  ['romantic', 'Romantic'],
  ['classic', 'Classic'],
  ['dark', 'Dark'],
  ['garden', 'Garden'],
  ['traditional', 'Traditional'],
  ['cinematic', 'Cinematic'],
];

/* Manifes lokal (fallback) — disalin dari public/templates/<id>/meta.json */
const LOCAL_MANIFEST = [
  { id: 't01', name: 'Editorial Ivory', description: 'Elegan ala majalah: serif editorial di atas ivory hangat, foto besar, garis tipis, dan white space yang lapang.', category: 'editorial', active: 1 },
  { id: 't02', name: 'Modern Minimalist', description: 'Geometris dan presisi: sans-serif modern, grid tegas, warna netral, tanpa ornamen berlebih.', category: 'minimalist', active: 1 },
  { id: 't03', name: 'Botanical Romance', description: 'Romantis dan lembut: palet sage-olive-cream, ilustrasi botanical halus, foto bingkai arch, dan gerak yang tenang.', category: 'romantic', active: 1 },
  { id: 't04', name: 'Royal Classic', description: 'Formal dan agung: serif klasik Cinzel, bingkai ganda emas, ornamen simetris, champagne-ivory berpadu hijau tua dan burgundy.', category: 'classic', active: 1 },
  { id: 't05', name: 'Contemporary Dark', description: 'Gelap yang elegan: tipografi kontras terang di atas hitam hangat, foto sinematik full-bleed, garis hairline emas, transisi cahaya terkendali.', category: 'dark', active: 1 },
  { id: 't06', name: 'Garden Wedding', description: 'Segar dan lapang: warna natural kebun, layout terbuka dengan foto landscape lebar, motif botanical minimal, transisi organik.', category: 'garden', active: 1 },
  { id: 't07', name: 'Nusantara Heritage', description: 'Anggun bernuansa Nusantara: ornamen geometris modern terinspirasi motif budaya, palet emas dan ivory, layout kontemporer yang khidmat.', category: 'traditional', active: 1 },
  { id: 't08', name: 'Cinematic Romance', description: 'Sinematik dan dramatis: foto pasangan sebagai hero visual, tipografi besar nan elegan, image reveal lambat, dan storytelling visual yang kuat.', category: 'cinematic', active: 1 },
];

const state = { items: [], category: 'all', q: '' };

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function catLabel(cat) {
  const hit = CATEGORIES.find((c) => c[0] === cat);
  return hit ? hit[1] : cat;
}

async function loadTemplates() {
  try {
    const r = await fetch('/api/templates', { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) throw new Error('respons kosong');
    state.items = data.filter((t) => t && t.active !== 0);
  } catch {
    state.items = LOCAL_MANIFEST.slice();
  }
}

function renderFilters() {
  const box = $('#filters');
  box.innerHTML = CATEGORIES.map(([v, label]) =>
    `<button type="button" class="fbtn${state.category === v ? ' active' : ''}" data-cat="${esc(v)}">${esc(label)}</button>`
  ).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.category = b.dataset.cat;
    box.querySelectorAll('.fbtn').forEach((x) => x.classList.toggle('active', x === b));
    renderGrid();
  });
}

function cardHTML(t) {
  const id = esc(t.id);
  return `<article class="card" data-id="${id}">
    <div class="thumb"><img src="/templates/${id}/thumbnail.svg" alt="Pratinjau template ${esc(t.name)}" loading="lazy"></div>
    <div class="card-body">
      <span class="cat">${esc(catLabel(t.category))}</span>
      <h2>${esc(t.name)}</h2>
      <p class="desc">${esc(t.description || '')}</p>
      <div class="card-actions">
        <a class="btn ghost" href="/preview.html?t=${id}">Preview</a>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  const grid = $('#grid');
  const q = state.q.trim().toLowerCase();
  const list = state.items.filter((t) =>
    (state.category === 'all' || t.category === state.category) &&
    (!q || String(t.name || '').toLowerCase().includes(q))
  );
  grid.innerHTML = list.map(cardHTML).join('');
  $('#empty').classList.toggle('show', list.length === 0);
  $('#count').textContent = list.length
    ? `Menampilkan ${list.length} dari ${state.items.length} template`
    : '';
}

function initSearch() {
  const input = $('#q');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = input.value; renderGrid(); }, 160);
  });
}

async function init() {
  renderFilters();
  initSearch();
  await loadTemplates();
  const loading = $('#loading');
  if (loading) loading.remove();
  renderGrid();
}

init();
