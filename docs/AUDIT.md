# AUDIT — Premium Wedding Invitation Studio

## 1. Audit Awal (repo kosong → keputusan)

Proyek dimulai dari direktori kosong dengan kontrak tertulis (`CONTRACT.md`,
`NOTES-template-core.md`). Keputusan arsitektur yang diambil di awal:

| Keputusan | Alasan |
|---|---|
| Express 4 + `better-sqlite3` (sync) | Operasional sederhana, tanpa ORM/migrasi rumit; cukup untuk skala studio. |
| Tanpa framework/build di frontend | Template bisa ditambah hanya dengan membuat folder; hosting semurah static file. |
| Animasi hanya CSS + IntersectionObserver | Tanpa dependensi GSAP; `prefers-reduced-motion` mudah dihormati. |
| Kontrak shell↔template via `data-action` + id widget | Template fokus ke visual; perilaku (RSVP, countdown, musik) konsisten di shell. |
| Section `cover` milik shell | Sampul + state machine opening terpusat; template menata lewat CSS. |
| Session cookie httpOnly `sid` (30 hari) | Cukup untuk satu admin; tanpa JWT/refresh complexity. |
| SQLite WAL mode, FK ON | Concurrency baca lebih baik; integritas relasional dijaga DB. |

## 2. Temuan QA Final (2026-10-14) & Status

| # | Temuan | Tingkat | Status |
|---|---|---|---|
| 1 | `POST /api/weddings` tidak membuat section → undangan baru kosong sampai admin menekan "Inisialisasi Seksi Standar" | Minor (UX) | **Diperbaiki**: auto-create 16 section enabled dalam 1 transaksi; test backend-smoke diperbarui (86/86 lolos) |
| 2 | Nama t07 di seed (`Traditional Indonesian Elegance`) ≠ `meta.json` (`Nusantara Heritage`) — inkonsistensi nama tampil di galeri, sekelas temuan t01/t02 di NOTES §5 | Minor (data) | **Diperbaiki**: seed.js diselaraskan ke `Nusantara Heritage`; re-seed terverifikasi |
| 3 | `public/index.html` (landing studio) belum dibuat worker mana pun; `/` hanya serve directory listing/static default | Minor (fitur hilang) | **Diperbaiki**: landing page ditulis, semua tautan 200, HTML tervalidasi |
| 4 | Suite admin-smoke gagal 3 test (429) bila dijalankan < 1 menit setelah backend-smoke | Bukan bug — artefak rate limiter in-memory 10/mnt/IP antar-suite | **Dikonfirmasi**: rerun setelah jeda → 20/20 |
| 5 | `node seed.js` kadang crash dengan assertion native (`RemoveEnvironmentCleanupHook`) pada Node 24 + better-sqlite3 v11 | Lingkungan (flaky) | **Didokumentasikan**: data yang tertulis sinkron sudah ter-commit sebelum crash; rerun selesai bersih. Rekomendasi: Node 18/20 LTS untuk operasional |
| 6 | Rate limiter & session store in-memory | Keterbatasan desain | **Didokumentasikan** di DEPLOYMENT: tidak cocok untuk multi-instance / serverless |

## 3. Yang Belum / Tidak Diuji

- **Uji visual browser nyata** (render tiap template, animasi opening, screenshot):
  subagent tidak memiliki akses live browser; verifikasi template dilakukan via
  smoke test Node (struktur file, kontrak render, escaping, empty state) — 270 cek lolos.
- **Uji beban / concurrency**: tidak dilakukan; SQLite WAL + single Node process
  diasumsikan cukup untuk traffic undangan skala kecil–menengah.
- **Upload file biner berbahaya**: validasi hanya allowlist MIME dari header
  client (bukan magic bytes) — risiko rendah, dicatat di §4.
- **Aksesibilitas formal** (screen reader, kontras AA): tidak diaudit; hanya
  `prefers-reduced-motion` yang ditangani.

## 4. Ringkasan Audit Keamanan (hasil pemeriksaan kode + probe aktual)

| Area | Hasil |
|---|---|
| Auth | Login bcrypt (cost 10); session token acak di DB, expiry 30 hari, cookie httpOnly + SameSite=Lax; semua route admin di belakang `requireAuth`; probe tanpa cookie → 401. |
| Otorisasi | Semua sub-resource memakai `getOwnedWedding` (milik owner); draft hanya 404 untuk publik, 200 untuk cookie admin valid. |
| Validasi input | Slug regex `^[a-z0-9-]{3,60}$`; attendance enum; guest_count 1–10; wish ≤500 char; section_key dari set tetap; theme_config harus JSON valid; parameterized queries di semua route (tidak ada string interpolation SQL). |
| XSS | Ucapan & semua konten dinamis di-render via `textContent` (invite.js) atau `esc()` (8 template, admin). Probe `<script>`/`<img onerror>` tersimpan inert sebagai pending lalu dihapus. |
| Rate limit | 10/menit/IP per endpoint tulis publik (RSVP, wishes), bucket terpisah; terverifikasi memicu 429. |
| Upload | Auth wajib; allowlist `image/jpeg|png|webp`, `audio/mpeg`; maks 5 MB; nama file disanitasi; staging `_tmp` lalu pindah setelah `wedding_id` tervalidasi milik user; file yatim dihapus saat validasi gagal. Catatan: MIME dari header client, bukan deteksi magic bytes. |
| CSRF | Cookie SameSite=Lax; tidak ada token CSRF eksplisit — risiko rendah untuk admin tunggal, tetapi endpoint state-changing memakai cookie; pertimbangkan SameSite=Strict/token CSRF bila multi-user. |
| Secret | Tidak ada secret di kode; kredensial seed hanya untuk demo (`admin`/`admin123`) — **wajib diganti di produksi**. |

## 5. Rekomendasi Tindak Lanjut
1. Ganti password admin default di produksi (tidak ada alur ganti password di UI).
2. Pertimbangkan backup otomatis berkala (lihat `docs/BACKUP.md`).
3. Untuk traffic tinggi/multi-instance: pindah session + rate limit ke store eksternal,
   atau tetap single-instance dengan reverse proxy.
4. Tambah deteksi magic bytes untuk upload bila menerima file dari publik tak dikenal
   (saat ini upload hanya untuk admin terotentikasi).

## 6. Addendum — Run QA Final Kedua (2026-10-14, ~21:52 WIB)

Rerun penuh semua suite + uji integrasi lintas-modul + probe keamanan oleh QA
penyelesaian akhir. Hasil: backend-smoke **88/88**, template-smoke **74/74**,
templates-rest-smoke **196/196**, admin-smoke **20/20** (rerun; run pertama
17/20 karena artefak rate-limit antar-suite — konfirmasi ulang temuan #4 §2).

Uji integrasi (34 cek, semua lolos):
- PUT template_id demo t01→t05→t08→t01: events/sections/gallery publik tetap utuh.
- `/i/demo/t/<token>` → 200; guest API mengembalikan nama benar; token salah → 404.
- Wedding draft baru: `/i/<slug>` → 404 tanpa auth, 200 pratinjau dengan cookie sid;
  terkonfirmasi wedding baru otomatis mendapat 16 section standar (temuan #1 §2 tetap fixed).
- Restart server: hash MD5 `/api/public/wedding/demo` identik sebelum/sesudah — data demo utuh.
- Alur publik RSVP (201) + wish (201 pending) → tampil di endpoint admin; data uji dihapus.

Probe keamanan (semua sesuai harapan): endpoint admin tanpa auth → 401; wish
`<script>` tersimpan inert (escaping di render via `esc()`); upload `.exe` → 400;
RSVP `guest_count` 99/0 → 400; burst → 429.

Catatan operasional insiden: `pkill -f "node server.js"` sempat membunuh shell
QA itu sendiri (string cocok di cmdline sendiri) sehingga server mati sesaat;
server dinyalakan ulang (`PORT=3000 node server.js`) dan data terverifikasi utuh.
Pelajaran: gunakan pola pkill yang tidak cocok dengan perintah sendiri, atau
kelola proses via PM2/systemd di produksi.
