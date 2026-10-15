# DATABASE — Skema SQLite

**File:** `data/wedding.db` (dibuat otomatis saat server start; WAL mode, `foreign_keys=ON`).
**DDL:** `schema.sql` — idempotent (`CREATE TABLE IF NOT EXISTS`), dijalankan setiap start via `db.js`.
Tidak ada sistem migrasi versi: perubahan skema dilakukan dengan menambah statement
idempotent baru di `schema.sql` (atau `ALTER TABLE` manual satu kali).

## Diagram Relasi (ASCII)

```
users 1───* weddings 1──┬──* wedding_events
  │            │         ├──* wedding_sections (UNIQUE wedding_id+section_key)
  │            │         ├──* wedding_guests ──* rsvps (guest_id, ON DELETE SET NULL)
  │            │         ├──* rsvps (langsung, tanpa guest_id)
  │            │         ├──* wedding_wishes
  │            │         ├──* gallery_images
  │            │         ├──* gift_methods
  │            │         └──* media_assets
  └──* sessions (token PK, ON DELETE CASCADE)
templates 1───* weddings (template_id TEXT FK)
```

Semua FK child → `weddings(id)` memakai `ON DELETE CASCADE`: hapus wedding =
hapus events, sections, guests, RSVP, wishes, galeri, gift, media assets.

## Tabel

| Tabel | Kolom kunci | Catatan |
|---|---|---|
| `users` | id PK, username UNIQUE, password_hash (bcrypt) | 1 baris seed: `admin` |
| `sessions` | token PK (acak 32 byte hex), user_id FK, expires_at (+30 hari) | Dihapus saat logout / kedaluwarsa |
| `templates` | id TEXT PK (`t01`–`t08`), name, description, category, active | Di-seed/upsert ulang tiap `node seed.js` |
| `weddings` | id PK, slug UNIQUE (`^[a-z0-9-]{3,60}$`), title, template_id FK, theme_config JSON, music_url, status (`draft`\|`published`), owner_id FK, created_at/updated_at | `POST /api/weddings` auto-insert 16 `wedding_sections` dalam 1 transaksi |
| `wedding_events` | wedding_id FK, kind (`akad`\|`resepsi`\|`custom`), title, event_date `YYYY-MM-DD`, start/end_time, venue_name, address, maps_url, sort_order | Countdown memakai event `akad` / sort_order terkecil |
| `wedding_sections` | wedding_id FK, section_key (16 kunci baku), enabled 0/1, sort_order, config JSON | UNIQUE(wedding_id, section_key) |
| `wedding_guests` | wedding_id FK, name, phone, **token UNIQUE (12 char url-safe)**, group_name | Token untuk `/i/:slug/t/:token` |
| `rsvps` | wedding_id FK, guest_id FK NULL→SET NULL, name, attendance (`yes`\|`no`), guest_count 1–10, message | |
| `wedding_wishes` | wedding_id FK, name, message (≤500), status (`pending`\|`approved`\|`hidden`) | Publik hanya baca `approved` |
| `gallery_images` | wedding_id FK, url, caption, sort_order | |
| `gift_methods` | wedding_id FK, type (`bank`\|`ewallet`\|`address`), provider, account_number, account_name, note | |
| `media_assets` | wedding_id FK, kind (`photo`\|`music`), url, label | Jejak file hasil upload |

16 `section_key` baku: `cover, hero, quote, couple, parents, events, countdown, story,
gallery, rsvp, wishes, gift, location, dresscode, info, closing`.

## Indeks

```sql
CREATE INDEX idx_guests_wedding ON wedding_guests(wedding_id);
CREATE INDEX idx_rsvp_wedding   ON rsvps(wedding_id);
CREATE INDEX idx_wishes_wedding ON wedding_wishes(wedding_id, status);
```

## Query Operasional Umum

```sql
-- ukuran DB & jumlah baris per wedding
SELECT slug, status, template_id FROM weddings;
SELECT section_key, enabled FROM wedding_sections WHERE wedding_id = 1 ORDER BY sort_order;
-- ringkasan RSVP (sama dengan yang dihitung API)
SELECT attendance, COUNT(*), COALESCE(SUM(CASE WHEN attendance='yes' THEN guest_count END),0)
FROM rsvps WHERE wedding_id = 1 GROUP BY attendance;
```

## Catatan Concurrency
`better-sqlite3` sinkron + WAL: baca paralel OK; tulis diserialisasi per proses.
Jangan menjalankan dua proses Node terhadap file DB yang sama (risiko `SQLITE_BUSY` / lock).
Lihat `docs/BACKUP.md` untuk batasan backup saat server berjalan.
