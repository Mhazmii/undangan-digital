# ARCHITECTURE — Premium Wedding Invitation Studio

## 1. Stack

| Lapisan | Teknologi |
|---|---|
| Runtime | Node.js ≥ 18 (teruji di Node 24), Express 4.x |
| Database | SQLite via `better-sqlite3` v11 (sync API), file `data/wedding.db`, WAL mode, FK ON |
| Auth | `bcryptjs` (hash password), session token di tabel `sessions`, cookie httpOnly `sid` (30 hari) |
| Upload | `multer` (disk storage, batas 5 MB, allowlist MIME) |
| Rate limit | `express-rate-limit` (10/menit/IP untuk tulis publik) |
| Frontend | HTML + CSS + vanilla JS. **Tanpa** framework, build step, TypeScript |
| Animasi | CSS transitions/keyframes + IntersectionObserver saja (tanpa GSAP/dll) |

## 2. Struktur Direktori

```
wedding-invitation/
  server.js            bootstrap express, mount routes, serve static, route /i/:slug
  db.js                buka DB, jalankan schema.sql (idempotent), PRAGMA FK + WAL
  schema.sql           DDL idempotent (CREATE TABLE IF NOT EXISTS …)
  seed.js              admin + 8 template + 1 demo wedding (idempotent, aman diulang)
  lib/util.js          helper: validasi slug, SECTION_KEYS, CSV, token, error
  middleware/auth.js   getUserFromRequest, requireAuth, optionalAuth
  routes/              auth, templates, weddings, events, sections, gallery,
                       gifts, guests, rsvp, wishes, upload, public
  public/
    index.html         landing studio (dibuat di fase final)
    templates.html     galeri template publik
    i.html             shell undangan publik
    preview.html       (pendukung pratinjau)
    admin/             SPA dashboard (index.html + js/admin.js + css/admin.css)
    js/                invite.js (shell), motion.js, templates.js, preview.js,
                       sample-wedding.js
    templates/<id>/    meta.json, style.css, template.js, thumbnail.svg
    uploads/           hasil upload runtime (<wedding_id>/, _tmp/ staging)
  data/                wedding.db (+ -wal/-shm) — JANGAN di-commit bila berisi data nyata
  docs/                dokumentasi (folder ini)
  tests/               backend-smoke, template-smoke, templates-rest-smoke, admin-smoke
```

## 3. Arsitektur Template & Motion System

Setiap template adalah **ES module mandiri** di `public/templates/<id>/`:

- `meta.json` — `{id, name, description, category, active}`.
- `style.css` — semua selector di-scope `.tpl-<id>`; design token sebagai CSS vars.
- `template.js` — `export function render(w, root)` me-render semua section enabled
  **kecuali `cover`** (milik shell); `export const opening` = `'fade'|'curtain'|'envelope'|'mask'|'cinematic'`.
- `thumbnail.svg` — preview 800×1000, SVG murni.

Shell (`public/js/invite.js`):

```
fetch /api/public/wedding/:slug ─┐
fetch /api/public/wedding/:slug/guest/:token (opsional)
        │ dynamic import() template.js + inject style.css
        ▼
state machine: loading → cover → opening → main (+ error)
        │ renderCover(): sampul + nama tamu + tombol [data-action=open-invite]
        ▼ klik "Buka Undangan"
        animasi opening sesuai `opening` template → reveal konten
        ▼
        initReveals(): IntersectionObserver pada [data-reveal],
        sekali reveal lalu unobserve; hormat prefers-reduced-motion
```

Kontrak perilaku shell ↔ template lewat **delegasi klik global** `[data-action]`
(`open-invite`, `toggle-music`, `copy-text`, `share-wa`, `scroll-to`, `retry`) dan
**id/atribut widget** (`#rsvp-form`, `#wish-form`, `#wishes-list`, `[data-countdown]`,
`[data-cd-d/h/m/s]`). Detail: `NOTES-template-core.md`.

`motion.js` menyediakan `initReveals()`, `staggerChildren()`, `revealNow()`,
`prefersReducedMotion()` — dipakai ulang semua template.

## 4. Alur Auth

```
POST /api/auth/login {username,password}
  → bcrypt.compare → buat token acak 32 byte → INSERT sessions (expires +30 hari)
  → Set-Cookie: sid=<token>; HttpOnly; Path=/; SameSite=Lax

requireAuth: cookie sid → JOIN sessions+users → cek expiry (hapus bila basi)
  → req.user = {id, username} | 401

Route publik (/api/public/*, /i/:slug published): tanpa auth.
Route /i/:slug draft: serve bila cookie sid valid (pratinjau admin).
```

## 5. Alur Data Penting

```
POST /api/weddings ──► INSERT weddings ──► auto-create 16 wedding_sections
                        (enabled=1, sort_order 0..15, config='{}') dalam 1 transaksi
                        [ditambahkan di fase final QA]

PUT /api/weddings/:id {template_id} ──► hanya kolom template_id berubah;
                        events/sections/gallery/gifts UTUH (terverifikasi uji integrasi)

POST /api/public/wedding/:slug/rsvp ──► rate limit 10/mnt/IP ──► INSERT rsvps
POST /api/public/wedding/:slug/wishes ──► rate limit ──► INSERT status='pending'
PATCH /api/wishes/:wid {status} ──► 'approved' baru tampil di GET publik
```

## 6. Diagram Sederhana

```
                 ┌──────────────┐
  Tamu ──WA link─▶│  /i/:slug    │──▶ i.html + invite.js ──▶ template.js (render)
                 │  (Express)   │         │ dynamic import + CSS inject
                 └──────────────┘         ▼
                                   ┌─────────────┐
                                   │ /api/public │──▶ SQLite (read-only publik)
                                   └─────────────┘
  Admin ──login──▶ /admin/ SPA ──▶ /api/* (cookie sid, requireAuth)
                                   ├── weddings/events/sections/gallery/gifts
                                   ├── guests (+import/export CSV)
                                   ├── rsvp (+summary, export CSV)
                                   ├── wishes (moderasi)
                                   └── /api/upload (multer, auth)
```

## 7. Keputusan Arsitektur (dari audit awal)
Lihat `docs/AUDIT.md` §1: repo kosong → dipilih Express + better-sqlite3 sinkron
(operasional sederhana, tanpa ORM), template sebagai modul ES tanpa build
(penambahan template = tambah folder), dan kontrak shell↔template berbasis
`data-action` agar template tidak butuh JS perilaku sendiri.
