# TEMPLATES — 8 Template Undangan

Setiap template tinggal di `public/templates/<id>/` berisi:
`meta.json` · `style.css` (semua selector di-scope `.tpl-<id>`) ·
`template.js` (ES module: `export function render(w, root)` + `export const opening`) ·
`thumbnail.svg` (800×1000, SVG murni).

Aturan kontrak: template **wajib terasa beda** — layout, tipografi, komposisi, dan
motion identity berbeda. Dilarang hanya mengganti warna. Section `cover` milik shell.

## Daftar Template

| ID | Nama | Kategori | Opening | Karakter visual |
|---|---|---|---|---|
| t01 | Editorial Ivory | editorial | `mask` | Elegan ala majalah: serif editorial (Cormorant Garamond), ivory hangat, garis tipis, white space luas. Sampul terangkat seperti tirai. |
| t02 | Modern Minimalist | minimalist | `fade` | Geometris dan presisi: sans-serif modern (Manrope), grid tegas, animasi pendek dan tepat. |
| t03 | Botanical Romance | romantic | `curtain` | Sage dan olive lembut, ilustrasi botanical halus, komposisi organik. |
| t04 | Royal Classic | classic | `envelope` | Formal dan megah: champagne, ivory, aksen deep green, ornamen simetris. |
| t05 | Contemporary Dark | dark | `cinematic` | Gelap yang elegan: tipografi kontras, foto sinematik, transisi cahaya terkendali. |
| t06 | Garden Wedding | garden | `mask` | Natural dan terbuka: warna kebun, foto landscape, transisi antar-section organik. |
| t07 | Nusantara Heritage | traditional | `envelope` | Nuansa Nusantara: ornamen geometris terinspirasi motif budaya, palet emas dan ivory, layout kontemporer yang khidmat. |
| t08 | Cinematic Romance | cinematic | `cinematic` | Storytelling visual sinematik: foto pasangan sebagai pusat, image reveal dramatis. |

Lima gaya opening: `fade`, `curtain`, `envelope`, `mask`, `cinematic`
(shell menyediakan semuanya; fallback `fade`).

## Kontrak Render

`render(w, root)` menerima `w` = hasil `GET /api/public/wedding/:slug`
(`{wedding, events, sections, gallery, gifts}`) dan me-render **semua section
yang enabled** sesuai `section_key`, **kecuali `cover`**.

- Perilaku diikat shell via delegasi `[data-action]`
  (`open-invite`, `toggle-music`, `copy-text`, `share-wa`, `scroll-to`, `retry`).
- Widget wajib memakai id/atribut baku: `#rsvp-form` (+ `.inv-form-error`),
  `#wish-form`, `#wishes-list`, `#wishes-more`, `[data-countdown]` +
  `[data-cd-d/h/m/s]`, `[data-reveal]` untuk reveal-on-scroll.
- Semua konten dinamis **wajib di-escape** (`esc()` / `textContent`) — anti XSS.
- Foto kosong → placeholder SVG elegan (jangan hotlink stok acak).
- Font via Google Fonts `display=swap` dengan fallback stack aman offline.
- Hormati `prefers-reduced-motion` (shell memangkas opening; reveal jadi instan).

Detail koordinat: `NOTES-template-core.md`.

## Cara Menambah Template Baru (t09)

1. Buat folder `public/templates/t09/` berisi 4 file:
   - `meta.json`: `{"id":"t09","name":"Nama Template","description":"…","category":"romantic","active":true}`
     (category bebas: editorial|minimalist|romantic|classic|dark|garden|traditional|cinematic)
   - `style.css`: SEMUA selector di bawah `.tpl-t09 { … }`; token desain sebagai CSS vars.
   - `template.js`: `export function render(w, root)` + `export const opening = 'fade'` (pilih 1 dari 5).
   - `thumbnail.svg`: 800×1000, SVG murni tanpa foto eksternal.
2. Daftarkan di `seed.js` (array `TEMPLATES`) lalu `node seed.js` (upsert, aman diulang).
3. Verifikasi: buka `/templates.html` (kartu muncul) → buat wedding dengan template t09 →
   buka `/i/<slug>` → pastikan 16 section ter-render, RSVP & ucapan berfungsi.
4. Jalankan `node tests/templates-rest-smoke.js` sebagai pola cek bila menambah
   assertion untuk template baru.

## Mengganti Template Wedding yang Sudah Ada
`PUT /api/weddings/:id {"template_id":"t05"}` — hanya kolom template yang berubah;
events, sections, gallery, dan gifts **tetap utuh** (terverifikasi uji integrasi QA final).
