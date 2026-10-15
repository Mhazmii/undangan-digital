# CONTRACT.md — Kontrak Koordinasi Proyek "Premium Wedding Invitation Studio"

Dokumen ini MENGIKAT semua worker. Baca penuh sebelum menulis kode. Jika ada konflik dengan brief lisan, dokumen ini yang menang.

## 1. Tech Stack (final, jangan diganti)

- Node.js >= 18, Express 4.x
- better-sqlite3 (sync API), bcryptjs, multer, express-rate-limit, cookie-parser
- Frontend: HTML + CSS + vanilla JS. TANPA framework, TANPA build step, TANPA TypeScript.
- Animasi: CSS transitions/keyframes + IntersectionObserver saja. Jangan pasang GSAP/Framer Motion.
- Database file: `data/wedding.db` (dibuat otomatis saat server start). Jangan taruh di `public/`.

## 2. Struktur Direktori (wajib dipatuhi)

```
wedding-invitation/
  package.json
  server.js                 # bootstrap express, mount routes, serve static
  db.js                     # buka DB, jalankan schema.sql (idempotent), PRAGMA foreign_keys=ON
  schema.sql
  seed.js                   # node seed.js → admin + 8 template + 1 demo wedding
  middleware/auth.js        # requireAuth, cookie sid
  routes/
    auth.js templates.js weddings.js events.js sections.js
    gallery.js gifts.js guests.js rsvp.js wishes.js upload.js public.js
  public/
    index.html              # landing studio
    templates.html          # galeri template publik
    i.html                  # shell undangan publik (route /i/:slug dan /i/:slug/t/:token)
    admin/index.html        # dashboard SPA
    css/base.css  admin/css/admin.css
    js/app.js  js/templates.js  js/invite.js  js/motion.js  admin/js/admin.js
    templates/<id>/meta.json  style.css  template.js  thumbnail.svg
    uploads/                # hasil upload runtime
  data/  docs/  tests/
```

## 3. Skema Database (SQLite, FK ON, parameterized queries)

```sql
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS templates(
  id TEXT PRIMARY KEY,               -- 't01'..'t08'
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'classic',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS weddings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,         -- lowercase, [a-z0-9-]
  title TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 't01' REFERENCES templates(id),
  theme_config TEXT NOT NULL DEFAULT '{}',  -- JSON: colors, fonts override, music, motion preset
  music_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',     -- draft|published
  owner_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wedding_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- akad|resepsi|custom
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,          -- YYYY-MM-DD
  start_time TEXT DEFAULT '', end_time TEXT DEFAULT '',
  venue_name TEXT DEFAULT '', address TEXT DEFAULT '', maps_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wedding_sections(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,         -- cover,hero,quote,couple,parents,events,countdown,story,gallery,rsvp,wishes,gift,location,dresscode,info,closing
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}', -- JSON per-section (teks, dll)
  UNIQUE(wedding_id, section_key)
);
CREATE TABLE IF NOT EXISTS wedding_guests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  token TEXT UNIQUE NOT NULL,        -- 12 char url-safe untuk link personal
  group_name TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_guests_wedding ON wedding_guests(wedding_id);
CREATE TABLE IF NOT EXISTS rsvps(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES wedding_guests(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL,          -- yes|no
  guest_count INTEGER NOT NULL DEFAULT 1,
  message TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rsvp_wedding ON rsvps(wedding_id);
CREATE TABLE IF NOT EXISTS wedding_wishes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|hidden
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wishes_wedding ON wedding_wishes(wedding_id, status);
CREATE TABLE IF NOT EXISTS gallery_images(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  url TEXT NOT NULL, caption TEXT DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gift_methods(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- bank|ewallet|address
  provider TEXT NOT NULL,            -- BCA, DANA, ...
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS media_assets(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- photo|music
  url TEXT NOT NULL, label TEXT DEFAULT ''
);
```

## 4. API Contract

Base: `/api`. JSON request/response. Error format: `{ "error": "pesan" }` dengan status HTTP yang tepat.
Auth admin: cookie httpOnly `sid` (token di tabel sessions, expiry 30 hari). `middleware/auth.js` → `requireAuth`.

### 4.1 Auth
- `POST /api/auth/login` {username,password} → 200 `{ok:true,user:{id,username}}` + set cookie. 401 jika salah.
- `POST /api/auth/logout` → hapus session + clear cookie.
- `GET /api/auth/me` → 200 user atau 401.

### 4.2 Templates (butuh auth untuk admin list; publik read untuk galeri)
- `GET /api/templates` → `[{id,name,description,category,active,thumbnail:"/templates/<id>/thumbnail.svg"}]`

### 4.3 Weddings (auth)
- `GET /api/weddings` → list milik owner (atau semua untuk admin tunggal).
- `POST /api/weddings` {slug,title,template_id} → 201 wedding. Slug divalidasi `^[a-z0-9-]{3,60}$`, unik.
- `GET /api/weddings/:id` → wedding + events + sections + gallery + gifts (full detail).
- `PUT /api/weddings/:id` {title,template_id,theme_config,music_url,status} → 200.
- `DELETE /api/weddings/:id` → 200 (konfirmasi di client).
- `POST /api/weddings/:id/duplicate` → 201 wedding baru (slug wajib unik, client kirim `slug` baru).
- `POST /api/weddings/:id/status` {status:"draft"|"published"} → 200.

### 4.4 Sub-resource (auth, pola sama untuk events, gallery, gifts)
- `GET /api/weddings/:id/events` | `POST` | `PUT /api/weddings/:id/events/:eid` | `DELETE .../:eid`
- `GET /api/weddings/:id/sections` | `PUT /api/weddings/:id/sections` {sections:[{section_key,enabled,sort_order,config}]} (bulk upsert)
- `GET/POST/PUT/DELETE` untuk `/api/weddings/:id/gallery`, `/api/weddings/:id/gifts` (pola sama)

### 4.5 Guests (auth)
- `GET /api/weddings/:id/guests?q=&rsvp=` → list + status RSVP per tamu (join rsvps by guest_id).
- `POST /api/weddings/:id/guests` {name,phone,group_name} → buat + generate token 12 char.
- `PUT /api/weddings/:id/guests/:gid`, `DELETE .../:gid`
- `POST /api/weddings/:id/guests/import` {csv:"nama,telepon,grup\n..."} → bulk insert, return jumlah.
- `GET /api/weddings/:id/guests/export` → download CSV.
- Link personal format: `/i/:slug/t/:token` (dibangun client).

### 4.6 RSVP
- Publik: `POST /api/public/wedding/:slug/rsvp` {name, attendance:"yes"|"no", guest_count:1..10, message?, guest_token?} → 201. Rate limit 10/menit/IP. Validasi wajib.
- Admin: `GET /api/weddings/:id/rsvps` → list + `summary:{yes_count,no_count,total_persons,total_forms}` (total_persons = SUM guest_count where yes).
- Admin: `GET /api/weddings/:id/rsvps/export` → CSV download.

### 4.7 Wishes
- Publik: `GET /api/public/wedding/:slug/wishes?limit=20&offset=0` → hanya status approved, desc.
- Publik: `POST /api/public/wedding/:slug/wishes` {name,message(≤500)} → 201 status pending. Rate limit.
- Admin: `GET /api/weddings/:id/wishes?status=&q=` → semua + filter.
- Admin: `PATCH /api/wishes/:wid` {status:"approved"|"hidden"} → 200. `DELETE /api/wishes/:wid`.

### 4.8 Public wedding data
- `GET /api/public/wedding/:slug` → 200 `{wedding:{id,slug,title,template_id,theme_config,music_url}, events:[], sections:[] (enabled, sorted), gallery:[], gifts:[]}` atau 404 jika draft/tidak ada.
- `GET /api/public/wedding/:slug/guest/:token` → 200 `{name}` atau 404. Hanya nama, tanpa data lain.

### 4.9 Upload (auth)
- `POST /api/upload` multipart field `file`, query/body `wedding_id`. Validasi: image/jpeg|png|webp atau audio/mpeg, ≤5MB. Simpan `public/uploads/<wedding_id>/<ts>-<safe-name>`. Return `{url:"/uploads/..."}`.

## 5. Kontrak Template (untuk worker template)

Setiap template di `public/templates/<id>/`:
- `meta.json`: `{id,name,description,category,active}` — category: editorial|minimalist|romantic|classic|dark|garden|traditional|cinematic
- `style.css`: SEMUA selector di-scope di bawah `.tpl-<id>` (contoh `.tpl-t01 .hero {...}`). Design tokens sebagai CSS vars di `.tpl-t01`.
- `template.js`: ES module, `export function render(w, root)` — w = data dari `GET /api/public/wedding/:slug` (lihat §4.8), root = elemen container. Wajib render SEMUA section yang enabled dari `w.sections` sesuai `section_key`. `export const opening = 'fade'|'curtain'|'envelope'|'mask'|'cinematic'` (jenis transisi opening).
- `thumbnail.svg`: preview 800x1000, tanpa foto eksternal (SVG murni).
- Template HARUS terasa beda: layout, tipografi, komposisi, motion identity berbeda. DILARANG hanya ganti warna.
- Konten default Bahasa Indonesia. JANGAN lorem ipsum di demo.
- Foto: gunakan placeholder SVG elegan bila tidak ada foto (jangan hotlink foto stok acak).

## 6. Kontrak Halaman Publik (`public/i.html` + `js/invite.js` + `js/motion.js`)

- Route Express: `GET /i/:slug` dan `GET /i/:slug/t/:token` → serve `public/i.html`.
- `invite.js`: fetch data (§4.8), fetch guest name jika ada token, dynamic `import()` template.js + inject style.css, jalankan opening state machine: `loading → cover → opening → main`. Cegah double-click. Musik hanya mulai setelah interaksi user (tombol buka). Hormati `prefers-reduced-motion` (persingkat opening).
- `motion.js`: `initReveals()` — IntersectionObserver untuk `[data-reveal]`, sekali reveal lalu unobserve. Jangan animasi ulang saat scroll.
- Section wajib bila enabled: cover, hero, quote, couple, parents, events, countdown, story, gallery, rsvp, wishes, gift, location, dresscode, info, closing.
- RSVP form → POST §4.6 dengan validasi + feedback sukses/error. Wishes form → POST §4.7.
- Tombol WhatsApp share: `https://wa.me/?text=<encoded>` dengan pesan dari config. Maps: link `maps_url` dari event. Gift: tombol salin nomor rekening (navigator.clipboard + fallback).
- Countdown: hitung ke event pertama (kind akad / sort_order terkecil).

## 7. Kontrak Admin (`public/admin/`)

- SPA satu file `index.html` + `js/admin.js` + `css/admin.css`. Login page → redirect dashboard.
- Modul: Weddings (CRUD, duplicate, publish/unpublish, slug), Editor (pilih template dari galeri, edit teks/nama/tanggal/lokasi via form per section config, toggle+urut section, warna via theme_config, musik URL/upload, preview iframe `/i/:slug?preview=1`), Guests (CRUD, import/export CSV, link personal + tombol salin + share WA), RSVP (tabel, filter, summary, export CSV), Wishes (moderasi approve/hide/delete, search).
- Semua tombol HARUS berfungsi (terhubung ke API §4). Tidak ada tombol mati.
- Preview: iframe ke `/i/:slug?preview=1` — server harus mengizinkan akses draft bila ada cookie auth valid ATAU query `preview=1` + auth. Sederhanakan: route `/i/:slug` cek status published; jika draft dan request punya cookie sid valid → tetap serve.

## 8. Seed (seed.js)

- User: `admin` / `admin123` (bcrypt).
- 8 template rows t01..t08 (nama sesuai master prompt).
- 1 demo wedding: slug `demo`, status published, template t01, pasangan "Aisyah Putri & Rizky Pratama", events akad+resepsi (tanggal 2026-12-12), semua section enabled dengan config Bahasa Indonesia yang natural, 2 gift methods, 3 gallery placeholder, 3 guests (token contoh), 2 wishes approved + 1 pending.

## 9. Aturan Kualitas Global

- NO AI SLOP: tidak ada gradient ungu-biru tanpa alasan, tidak ada glassmorphism paksa, tidak ada emoji sebagai ikon utama, tidak ada lorem ipsum di produksi.
- Semua input divalidasi server-side. Parameterized queries. Escape output (wishes) untuk cegah XSS.
- Tidak ada console.error yang tidak dijelaskan. Tangani empty state & error state di UI.
- README: cara install, run, akun default, backup/restore DB.

## 10. Definisi Selesai per Worker

Setiap worker WAJIB menjalankan test aktual (bukan klaim): backend → curl/node script ke semua endpoint; template → buka halaman via `node` static? minimal validasi file + screenshot? (tanpa live browser, verifikasi via test script + HTML valid). Laporkan hasil test konkret di laporan akhir.
