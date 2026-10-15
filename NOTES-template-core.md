# NOTES-template-core.md — Koordinasi frontend publik & template

Ditulis oleh worker template-core (frontend publik + t01/t02). Dibaca oleh worker template
t03–t08 dan worker admin. CONTRACT.md tidak diubah.

## 1. Kontrak data-action (shell `invite.js` ↔ `template.js`)

`invite.js` mengikat perilaku lewat **delegasi klik global** pada `[data-action]`.
Template cukup me-render markup berikut (tidak perlu JS sendiri):

| data-action | atribut tambahan | efek |
|---|---|---|
| `open-invite` | — | (dipakai shell di sampul) mulai transisi opening |
| `toggle-music` | — | play/pause musik |
| `copy-text` | `data-copy="<teks>"` | salin ke clipboard (dengan fallback) + toast |
| `share-wa` | `data-share-text="<pesan>"` | buka `https://wa.me/?text=<pesan + URL halaman>` |
| `scroll-to` | `data-target="<selector>"` | smooth scroll (auto bila reduced-motion) |
| `retry` | — | (dipakai shell di layar error) reload halaman |

## 2. Widget yang diikat shell otomatis (berdasarkan id / atribut)

Template **wajib** memakai id/atribut ini bila section-nya enabled:

- Countdown: wrapper `[data-countdown]` berisi `[data-cd-d] [data-cd-h] [data-cd-m] [data-cd-s]`
  dan opsional `[data-cd-done][hidden]` (pesan "acara telah berlangsung").
  Target = event pertama (kind `akad`, lalu `sort_order` terkecil). Interval 1 detik.
- RSVP: `<form id="rsvp-form">` dengan field `name="name"`, `name="attendance"`
  (radio `yes`/`no`), `name="guest_count"` (1–10), `name="message"`, dan
  `<p class="inv-form-error">` untuk pesan error. Shell: validasi → POST
  `/api/public/wedding/:slug/rsvp` (+ `guest_token` bila ada) → feedback sukses/error.
- Wishes: `<form id="wish-form">` (`name`, `message` ≤500), `<div id="wishes-list">`,
  `<button id="wishes-more">`. Shell: POST + GET paginasi (limit 8, hanya approved).
- Reveal: tambahkan `data-reveal` pada blok yang ingin dianimasikan; shell
  menjalankan `initReveals()` (IntersectionObserver, sekali reveal, hormat
  `prefers-reduced-motion`). Opsional stagger via `motion.js: staggerChildren()`.

## 3. Pembagian section 'cover'

Section `cover` **milik shell** (sampul pembuka + state machine). `render(w, root)`
template me-render semua section enabled **kecuali** `cover`. Markup sampul memakai
kelas generik `.inv-cover-*` (lihat `invite.js: renderCover`) yang **ditata oleh
CSS tiap template** di bawah scope `.tpl-<id> .inv-cover...`. Jangan ubah nama
kelas `.inv-cover-*` tanpa koordinasi.

## 4. Kunci config section yang didukung t01/t02

API mengembalikan `config` sebagai **string JSON** (t01/t02 mem-parse keduanya).
Kunci seed (dipakai demo) didukung penuh; kunci tambahan bersifat opsional:

- cover: `{title, names, date}` · hero: `{greeting, text}` · quote: `{text, source}`
- couple: `{bride_name, bride_nickname, bride_parents, bride_photo, groom_name,
  groom_nickname, groom_parents, groom_photo}` (fallback: pecah `wedding.title` di "&")
- parents: `{text, families:[{name, relation}]}` · events: `{note}` (data dari `w.events`)
- countdown: `{text}` · story: `{items:[{date,title,text}]}` · gallery: `{title}` (+ `w.gallery`)
- rsvp: `{note}` · wishes: `{title, note}` · gift: `{note}` (+ `w.gifts`)
- location: `{note}` · dresscode: `{text, items:[{label,text}]}` · info: `{text, items:[{title,text}]}`
- closing: `{text, share_text}`
- `theme_config.colors.accent` (hex): dipakai sebagai `--inv-accent` override.

## 5. ⚠️ PERLU DISELARASKAN: nama & kategori template t01/t02 di seed

Brief worker ini menetapkan: **t01 = "Editorial Ivory" (editorial)**,
**t02 = "Modern Minimalist" (minimalist)** — sesuai itu `meta.json` ditulis.
Namun `seed.js` saat ini men-seed baris DB berbeda:

- t01 → `Klasik Abadi` / `classic`
- t02 → `Editorial Modern` / `editorial`

Baris DB dipakai `GET /api/templates` (galeri template admin & publik), sehingga
nama/deskripsi yang tampil tidak cocok dengan isi template sebenarnya.
Usulan: backend worker memperbarui array `TEMPLATES` di `seed.js` menjadi
t01 `Editorial Ivory`/editorial ("Elegan ala majalah: serif editorial di atas
ivory hangat...") dan t02 `Modern Minimalist`/minimalist ("Geometris dan
presisi: sans-serif modern, grid tegas..."), sesuai `meta.json` masing-masing.

## 6. Catatan lain

- Font dimuat tiap template via `ensureFonts()` (Google Fonts, `display=swap`,
  fallback stack aman offline). t01: Cormorant Garamond + Jost; t02: Manrope + Newsreader italic.
- Placeholder foto = inline SVG di `template.js` (t01: bingkai monogram; t02: blok
  geometris). Galeri demo memakai `/assets/placeholder-photo-*.svg` (milik backend worker).
- `opening` yang dipakai: t01 = `mask` (sampul terangkat seperti tirai), t02 = `fade`.
  Shell juga menangani `curtain`/`envelope`/`cinematic` (fallback fade) untuk t03–t08.
- Musik: `<audio>` dibuat dari `wedding.music_url`, `play()` hanya dipanggil di
  dalam handler klik "Buka Undangan". Tombol `#music-btn` (shell) hidden bila
  tidak ada `music_url`.
