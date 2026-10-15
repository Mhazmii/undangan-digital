# Premium Wedding Invitation Studio

Studio undangan pernikahan digital: 8 template eksklusif, animasi opening sinematik,
RSVP, ucapan tamu termoderasi, tautan personal per tamu, dan dashboard admin lengkap.
Stack: Node.js + Express + SQLite (`better-sqlite3`), frontend HTML/CSS/vanilla JS
tanpa build step.

## Cara Menjalankan

```bash
npm install
node seed.js        # buat akun admin + 8 template + undangan demo (idempotent, aman diulang)
PORT=3000 node server.js
```

Buka:
- `/` — landing studio
- `/templates.html` — galeri 8 template
- `/i/demo` — undangan demo (published)
- `/admin/` — dashboard admin

**Akun default:** `admin` / `admin123` — **wajib diganti di produksi.**

> Catatan Node 24: bila `better-sqlite3` error binding, rebuild:
> `cd node_modules/better-sqlite3 && rm -rf build && npx node-gyp rebuild --release`.
> `node seed.js` sesekali crash saat teardown di Node 24 — data sudah ter-commit,
> ulangi perintahnya. Disarankan Node 18/20 LTS.

## Struktur

```
server.js  db.js  schema.sql  seed.js
lib/            helper (validasi, SECTION_KEYS, CSV, token)
middleware/     auth (cookie sid httpOnly, 30 hari)
routes/         auth, templates, weddings, events, sections, gallery,
                gifts, guests, rsvp, wishes, upload, backup, public
public/
  index.html templates.html i.html admin/ js/
  templates/t01..t08/   meta.json, style.css, template.js, thumbnail.svg
  uploads/              hasil upload runtime
data/           wedding.db (dibuat otomatis)
docs/           dokumentasi lengkap
tests/          4 smoke-test suite (node tests/*.js, butuh server jalan)
```

## API (ringkas)

| Area | Contoh |
|---|---|
| Auth | `POST /api/auth/login` → cookie `sid` httpOnly |
| Admin | `/api/weddings` CRUD, `/api/weddings/:id/{events,sections,gallery,gifts,guests,rsvps,wishes}`, `/api/upload`, `GET /api/backup` |
| Publik | `GET /api/public/wedding/:slug`, `POST …/rsvp`, `GET/POST …/wishes` (rate limit 10/mnt/IP), `GET …/guest/:token` |

Kontrak lengkap: `CONTRACT.md`. Koordinasi frontend/template: `NOTES-template-core.md`.

## Dokumentasi

- [docs/PRD.md](docs/PRD.md) — visi, scope, fitur, user flow
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, direktori, template & motion system, auth
- [docs/TEMPLATES.md](docs/TEMPLATES.md) — 8 template + cara menambah template baru
- [docs/DATABASE.md](docs/DATABASE.md) — skema, relasi, indeks
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — VPS + volume persisten, PM2/systemd, nginx
- [docs/BACKUP.md](docs/BACKUP.md) — backup/restore via `GET /api/backup` atau salin file
- [docs/AUDIT.md](docs/AUDIT.md) — audit awal, temuan QA final, audit keamanan

## Testing

Butuh server berjalan (`PORT=3000 node server.js`), lalu:

```bash
node tests/backend-smoke.js        # API + auth + CRUD + backup (88 cek)
node tests/template-smoke.js       # template t01/t02 (74 cek)
node tests/templates-rest-smoke.js # template t03–t08 (196 cek)
node tests/admin-smoke.js          # alur dashboard admin (20 cek)
```

> Jangan jalankan dua suite dalam < 1 menit berurutan: rate limiter in-memory
> (10/mnt/IP) bisa membuat test bertetangga gagal 429. Beri jeda ~70 detik.

## Backup / Restore

```bash
# unduh backup konsisten saat server berjalan (butuh login admin)
curl -s -c /tmp/c.txt -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'
curl -b /tmp/c.txt -o backup.db localhost:3000/api/backup
```

Detail & restore: [docs/BACKUP.md](docs/BACKUP.md).

## Keamanan (ringkas)

Cookie httpOnly + SameSite=Lax, bcrypt, parameterized queries, escape output (anti-XSS),
rate limit tulis publik, upload allowlist MIME ≤ 5 MB. Audit penuh: [docs/AUDIT.md](docs/AUDIT.md).
