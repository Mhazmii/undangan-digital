# FINAL REPORT — Premium Wedding Invitation Studio

**Tanggal penyelesaian QA final:** Rabu, 14 Oktober 2026
**Status:** Semua suite test hijau · Server berjalan di `localhost:3000`

---

## 1. Temuan Audit Awal

Proyek dimulai dari direktori kosong dengan kontrak tertulis (`CONTRACT.md`,
`NOTES-template-core.md`). Keputusan arsitektur awal (detail: `docs/AUDIT.md` §1):

- **Express 4 + `better-sqlite3` (sync)** — operasional sederhana, tanpa ORM/migrasi
  rumit; cukup untuk skala studio undangan.
- **Tanpa framework/build di frontend** — template baru = tambah satu folder.
- **Animasi hanya CSS + IntersectionObserver** — tanpa GSAP; `prefers-reduced-motion`
  mudah dihormati.
- **Kontrak shell↔template** via atribut `data-action` + id widget — template fokus
  visual, perilaku (RSVP, countdown, musik) konsisten di shell.
- **Section `cover` milik shell** — sampul + state machine opening terpusat.
- **Session cookie httpOnly `sid` (30 hari)** — cukup untuk satu admin, tanpa JWT.
- **SQLite WAL mode, FK ON** — concurrency baca lebih baik, integritas relasional
  dijaga DB.

Temuan yang sudah diperbaiki worker sebelumnya: auto-create 16 section saat
`POST /api/weddings`, selaraskan nama t07 di seed, dan penulisan
`public/index.html` (landing). Lihat `docs/AUDIT.md` §2.

## 2. Teknologi & Arsitektur

| Lapisan | Teknologi |
|---|---|
| Runtime | Node.js ≥ 18 (teruji di Node 24), Express 4.x |
| Database | SQLite via `better-sqlite3` v11 (sync API), `data/wedding.db`, WAL, FK ON |
| Auth | `bcryptjs` (cost 10), session token di tabel `sessions`, cookie httpOnly `sid` (30 hari, SameSite=Lax) |
| Upload | `multer` (disk, batas 5 MB, allowlist MIME `image/jpeg|png|webp`, `audio/mpeg`) |
| Rate limit | `express-rate-limit` — 10/menit/IP per endpoint tulis publik (RSVP & wishes, bucket terpisah) |
| Frontend | HTML + CSS + vanilla JS. **Tanpa** framework/build/TypeScript |
| Animasi | CSS transitions/keyframes + IntersectionObserver saja |

Struktur: `server.js` (bootstrap, route `/i/:slug`), `db.js` + `schema.sql`
(idempotent, jalan tiap start), `seed.js` (idempotent), `lib/util.js`,
`middleware/auth.js`, `routes/` (12 router: auth, templates, weddings, events,
sections, gallery, gifts, guests, rsvp, wishes, upload, public),
`public/` (landing, galeri template, shell undangan `i.html`, dashboard admin,
`js/`, `templates/<id>/`, `uploads/`).

Alur tamu: `/i/:slug` → `i.html` + `invite.js` → `GET /api/public/wedding/:slug`
→ dynamic `import()` template.js + inject style.css → state machine
`loading → cover → opening → main`. Alur admin: `/admin/` SPA → `/api/*`
dengan cookie `sid` + `requireAuth`.

## 3. Delapan Template + Perbedaannya

Setiap template di `public/templates/<id>/` berisi `meta.json`, `style.css`
(seluruh selector di-scope `.tpl-<id>`), `template.js` (`export function
render(w, root)` + `export const opening`), dan `thumbnail.svg` 800×1000.
Kontrak mewajibkan template **terasa beda** (bukan sekadar ganti warna);
`cover` milik shell.

| ID | Nama | Kategori | Opening | Karakter visual |
|---|---|---|---|---|
| t01 | Editorial Ivory | editorial | `mask` | Gaya majalah: serif editorial, ivory hangat, garis tipis, white space luas; sampul terangkat seperti tirai |
| t02 | Modern Minimalist | minimalist | `fade` | Geometris presisi: sans modern, grid tegas, animasi pendek dan tepat |
| t03 | Botanical Romance | romantic | `curtain` | Sage/olive lembut, ilustrasi botanical, komposisi organik |
| t04 | Royal Classic | classic | `envelope` | Formal megah: champagne, ivory, aksen deep green, ornamen simetris |
| t05 | Contemporary Dark | dark | `cinematic` | Gelap elegan: tipografi kontras, foto sinematik, transisi cahaya terkendali |
| t06 | Garden Wedding | garden | `mask` | Natural terbuka: warna kebun, foto landscape, transisi antar-section organik |
| t07 | Nusantara Heritage | traditional | `envelope` | Nuansa Nusantara: ornamen geometris motif budaya, palet emas + ivory, layout kontemporer khidmat |
| t08 | Cinematic Romance | cinematic | `cinematic` | Storytelling visual: foto pasangan sebagai pusat, image reveal dramatis |

## 4. Opening Animation & Motion System

Lima gaya opening (shell menyediakan semuanya; fallback `fade`):
`fade`, `curtain`, `envelope`, `mask`, `cinematic`. Setiap template mendeklarasikan
satu gaya lewat `export const opening`.

- **Shell** (`public/js/invite.js`): `renderCover()` (sampul + nama tamu + tombol
  `[data-action=open-invite]`), lalu animasi opening sesuai pilihan template
  sebelum konten utama tampil.
- **`motion.js`**: `initReveals()`, `staggerChildren()`, `revealNow()`,
  `prefersReducedMotion()` — dipakai ulang semua template; reveal-on-scroll via
  IntersectionObserver (sekali reveal lalu unobserve); bila pengguna memakai
  `prefers-reduced-motion`, opening dipangkas dan reveal jadi instan.
- Perilaku diikat lewat delegasi klik global `[data-action]` (`open-invite`,
  `toggle-music`, `copy-text`, `share-wa`, `scroll-to`, `retry`) dan id/atribut
  widget baku (`#rsvp-form`, `#wish-form`, `#wishes-list`, `#wishes-more`,
  `[data-countdown]` + `[data-cd-d/h/m/s]`, `[data-reveal]`).

## 5. Struktur DB

SQLite `data/wedding.db` (WAL, FK ON). Tabel utama:

```
users 1───* weddings 1──┬──* wedding_events
                        ├──* wedding_sections (UNIQUE wedding_id+section_key)
                        ├──* gallery_images
                        ├──* gift_methods
                        ├──* wedding_guests (token per tamu)
                        ├──* rsvps
                        ├──* wedding_wishes (status: pending/approved/hidden)
                        └──* media_assets
users 1───* sessions (token cookie sid, expiry 30 hari)
templates (8 baris seed: id, nama, kategori)
```

DDL `schema.sql` idempotent (`CREATE TABLE IF NOT EXISTS`), dijalankan tiap
server start via `db.js`. Tidak ada sistem migrasi versi — perubahan skema
dilakukan dengan menambah statement idempotent. Detail: `docs/DATABASE.md`.

## 6. Fitur yang Benar-Benar Berfungsi (terverifikasi)

- **Landing studio** (`/`) + **galeri template** (`/templates.html`) — semua tautan 200.
- **Halaman undangan publik** `/i/:slug` (+ link tamu personal `/i/:slug/t/:token`
  dengan nama tamu di sampul), 404 untuk slug tak dikenal/draft tanpa auth,
  pratinjau draft (200) untuk admin ber-cookie.
- **8 template** me-render 16 section (cover milik shell): countdown, events,
  galeri, RSVP, ucapan, hadiah, copy rekening/nomor, share WhatsApp, tombol musik.
- **Admin dashboard** (`/admin/`): login/logout, CRUD wedding, duplikasi wedding,
  CRUD events/sections/gallery/gifts, manajemen tamu (tambah/edit/hapus,
  import & export CSV), ringkasan & export CSV RSVP, moderasi ucapan
  (pending→approved/hidden, filter, pencarian), upload foto/musik.
- **API publik**: data undangan (hanya published), RSVP (validasi nama 1–100,
  attendance yes/no, guest_count 1–10, pesan ≤500), ucapan (pending → moderasi →
  tampil), lookup tamu per token.
- **Backup**: `GET /api/backup` (auth) mengunduh DB konsisten via `VACUUM INTO`.

## 7. Hasil Pengujian AKTUAL

Semua dijalankan ulang pada 14 Okt 2026 terhadap server port 3000.

| Suite | Hasil |
|---|---|
| `tests/backend-smoke.js` | **88 lolos, 0 gagal** |
| `tests/template-smoke.js` | **74 lolos, 0 gagal, 0 skip** |
| `tests/templates-rest-smoke.js` | **196 lolos, 0 gagal, 0 skip** |
| `tests/admin-smoke.js` | **20 lolos, 0 gagal** (rerun; run pertama 17/20 karena artefak rate-limit, lihat §12) |
| **Total suite** | **378 lolos, 0 gagal** |

**Uji integrasi lintas-modul** (skrip khusus, 34 cek — semua lolos):
- (a) PUT `template_id` demo t01→t05→t08→t01: `GET /api/public/wedding/demo`
  menunjukkan events (2), sections (16), gallery (3) **tetap utuh** setiap ganti.
- (b) `GET /i/demo/t/<token>` → 200 HTML; `GET /api/public/wedding/demo/guest/<token>`
  mengembalikan nama benar ("Andi Wijaya"); token salah → 404.
- (c) Wedding draft baru: tanpa auth `/i/<slug>` → 404; dengan cookie `sid` → 200
  (pratinjau). Wedding baru otomatis punya **16 section standar** (item #4 tugas:
  sudah terimplementasi di `routes/weddings.js` dalam satu transaksi — tidak ada
  perubahan kode yang diperlukan). Data uji dihapus setelahnya.
- (d) **Restart server** (`pkill` + start ulang): hash MD5 respons
  `/api/public/wedding/demo` identik sebelum/sesudah — data demo utuh
  (2 events, 16 sections, 3 foto, 2 gift methods).
- (e) Alur publik end-to-end: publish wedding uji → POST RSVP (201) + POST wish
  (201 pending) → keduanya tampil di endpoint admin (`/rsvps`, `/wishes?status=pending`);
  wedding uji dihapus, data publik bersih (404).

**Audit keamanan cepat** (termasuk dalam 34 cek di atas):
- Endpoint admin tanpa auth → **401** (`GET /api/weddings`, `GET /wishes`, `POST /api/weddings`).
- POST wish berisi `<script>alert("xss")</script>` → tersimpan inert (status pending);
  escaping terjadi di render (`esc()` di `public/js/templates.js` & `invite.js`
  memakai `textContent`); lolos uji XSS di semua template.
- Upload `evil.exe` → **400 ditolak** (dengan auth); tanpa auth → 401; file >5 MB → 413.
- RSVP `guest_count: 99` dan `0` → **400 ditolak** (batas valid 1–10).
- Burst request ke endpoint tulis publik → **429** (rate limit 10/menit/IP bekerja).

## 8. Audit Keamanan (ringkas)

| Area | Hasil |
|---|---|
| Auth | bcrypt cost 10; token acak 32 byte di DB, expiry 30 hari; cookie httpOnly + SameSite=Lax; probe tanpa cookie → 401 |
| Otorisasi | Semua sub-resource memakai `getOwnedWedding` (milik owner); draft → 404 publik / 200 pratinjau admin |
| Validasi input | Slug regex `^[a-z0-9-]{3,60}$`; attendance enum; guest_count 1–10; wish ≤500 char; section_key dari set tetap; theme_config harus JSON valid; semua query parameterized (tanpa interpolasi SQL) |
| XSS | Konten dinamis di-escape saat render; payload tersimpan inert sebagai pending |
| Rate limit | 10/menit/IP per endpoint tulis publik, bucket terpisah; terverifikasi 429 |
| Upload | Auth wajib; allowlist MIME; maks 5 MB; nama file disanitasi; staging `_tmp` lalu pindah setelah `wedding_id` tervalidasi; catatan: MIME dari header client, bukan magic bytes |
| CSRF | SameSite=Lax; tanpa token CSRF eksplisit — risiko rendah untuk admin tunggal |
| Secret | Tidak ada secret di kode; kredensial seed `admin`/`admin123` **wajib diganti di produksi** |

## 9. Cara Menjalankan

```bash
cd ~/workspace/wedding-invitation
npm install            # bila node_modules belum ada
node seed.js           # buat admin + 8 template + demo (idempotent, aman diulang)
PORT=3000 node server.js
```

- Studio: `http://localhost:3000/`
- Galeri template: `http://localhost:3000/templates.html`
- Dashboard admin: `http://localhost:3000/admin/` — login `admin` / `admin123`
- Contoh undangan: `http://localhost:3000/i/demo`
- Produksi: disarankan PM2 atau systemd + reverse proxy nginx (lihat `docs/DEPLOYMENT.md`).
- Catatan lingkungan: bila error binding `better-sqlite3` di Node 24, rebuild:
  `cd node_modules/better-sqlite3 && npx node-gyp rebuild --release --nodedir=/usr/include/node`
  (disarankan Node 18/20 LTS untuk operasional).

## 10. Backup / Restore

- **Opsi A (server jalan):** login admin → `GET /api/backup` → unduh
  `wedding-backup-YYYY-MM-DD.db` (konsisten via `VACUUM INTO`). Disarankan cron
  harian + retensi 7 hari, satu salinan di luar server.
- **Opsi B (server berhenti):** `cp data/wedding.db ~/backup/wedding.db.$(date +%F)`
  (+ arsip `public/uploads/`).
- **Restore:** hentikan server → amankan DB lama → hapus file `-wal`/`-shm` →
  timpa DB → `PRAGMA integrity_check;` → `node seed.js` → nyalakan server.
- Jangan salin `wedding.db` mentah saat server sedang menulis (WAL belum checkpoint).
  Detail: `docs/BACKUP.md`.

## 11. Deployment

- **Wajib filesystem persisten** (VPS/container dengan volume) untuk `data/` dan
  `public/uploads/`. **Jangan** deploy ke serverless/ephemeral (Vercel, Lambda,
  dsb.) — DB akan ter-reset.
- **Satu instance saja**: rate limiter & session store in-memory.
- Jangan jalankan dua proses Node pada satu file DB.
- Checklist go-live: volume persisten, `PORT` sesuai proxy, firewall 80/443,
  **ganti password admin default** (via sqlite/bcrypt — belum ada UI ganti password),
  HTTPS (cookie `sid` sebaiknya via HTTPS), `client_max_body_size 6m` di nginx.
  Detail: `docs/DEPLOYMENT.md`.

## 12. Risiko / Pekerjaan Tersisa (jujur)

1. **Tidak sempat diuji: uji visual di browser nyata.** Subagent ini tidak punya
   akses live browser. Render tiap template, animasi opening, dan screenshot
   hanya diverifikasi via smoke test Node (struktur file, kontrak render,
   escaping, empty state — 270 cek lolos), bukan dilihat langsung di Chromium.
   Disarankan QA visual manual sebelum go-live.
2. **Tidak diuji: beban/concurrency.** SQLite WAL + satu proses Node diasumsikan
   cukup untuk traffic undangan skala kecil–menengah.
3. **Artefak rate-limit antar-suite:** `admin-smoke.js` gagal 3 test (429) bila
   dijalankan < 1 menit setelah `backend-smoke.js` karena bucket in-memory
   10/menit/IP. Bukan bug — rerun setelah jeda: 20/20. Perlu jeda antar-suite
   atau menjalankan berurutan dengan jeda.
4. **Upload validasi MIME dari header client** (bukan magic bytes) — risiko rendah
   karena upload hanya untuk admin terautentikasi; pertimbangkan deteksi magic
   bytes bila upload dibuka ke publik.
5. **Tidak ada UI ganti password**; password default harus diganti manual via sqlite.
6. **Tanpa token CSRF eksplisit** (SameSite=Lax saja) — dapat diterima untuk admin
   tunggal; pertimbangkan penguatan bila multi-user.
7. **In-memory session + rate limit** — tidak cocok multi-instance/serverless.
8. **Aksesibilitas formal** (screen reader, kontras AA) belum diaudit; hanya
   `prefers-reduced-motion` yang ditangani.
9. **Tidak ada backup otomatis** — perlu cron manual (lihat `docs/BACKUP.md`).
10. **Flaky `node seed.js` di Node 24** (`better-sqlite3` v11 kadang crash dengan
    assertion native saat teardown; data sudah ter-commit, rerun bersih).
    Rekomendasi operasional: Node 18/20 LTS.
11. **Perbaikan #4 dari tugas ini sudah terimplementasi** (auto-create 16 section
    di `POST /api/weddings`) — tidak ada perubahan kode yang dilakukan sesi ini;
    hanya pengujian. Tidak ada file docs lama yang ditulis ulang; `docs/AUDIT.md`
    ditambahi addendum hasil run final ini.

---

*Dokumen terkait: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
`docs/BACKUP.md`, `docs/DEPLOYMENT.md`, `docs/TEMPLATES.md`, `docs/AUDIT.md`,
`CONTRACT.md`, `README.md`.*
