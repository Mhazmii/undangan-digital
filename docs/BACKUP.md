# BACKUP & RESTORE — SQLite

File database: `data/wedding.db`. Dalam WAL mode, ada file pendamping
`data/wedding.db-wal` dan `data/wedding.db-shm` saat server berjalan.

## Batasan Penting (jujur)

- **Jangan** menyalin `wedding.db` begitu saja saat server sedang menulis:
  salinan bisa korup/tidak konsisten karena WAL belum di-checkpoint dan file
  `-wal` mungkin tidak ikut tersalin utuh.
- SQLite mengizinkan **satu writer** dalam satu waktu. Backup API di bawah
  memakai mekanisme `VACUUM INTO` yang aman terhadap pembaca/penulis konkuren
  pada single-instance ini.

## Prosedur Backup (disarankan)

### Opsi A — via API backup bawaan (aman saat server berjalan)

> Endpoint `GET /api/backup` (auth admin) tersedia dan mengembalikan file
> database yang konsisten menggunakan `VACUUM INTO` ke direktori sementara,
> lalu di-stream sebagai download. Gunakan dari browser yang sudah login
> sebagai admin, atau via curl dengan cookie `sid`.

```bash
# 1. login, simpan cookie
curl -s -c /tmp/cookies.txt -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# 2. unduh backup (server mengirim attachment bernama wedding-backup-YYYY-MM-DD.db)
curl -b /tmp/cookies.txt -o ~/backup/wedding-backup-$(date +%F).db \
  localhost:3000/api/backup

# 3. verifikasi cepat
sqlite3 ~/backup/wedding-backup-$(date +%F).db "PRAGMA integrity_check;"
```

Simpan minimal 7 salinan harian terakhir; simpan satu salinan di luar server.

### Opsi B — server berhenti dulu (paling sederhana)

```bash
# hentikan server (PM2/systemd/manual), lalu:
cp data/wedding.db ~/backup/wedding.db.$(date +%F)
# boleh juga sertakan uploads: tar -czf ~/backup/uploads-$(date +%F).tgz public/uploads
# nyalakan server kembali
```

## Restore

```bash
# 1. HENTIKAN server (wajib — jangan timpa file DB yang sedang dibuka)
# 2. Amankan DB lama
cp data/wedding.db data/wedding.db.sebelum-restore
# 3. Hapus file WAL/SHM pendamping bila ada, lalu timpa
rm -f data/wedding.db-wal data/wedding.db-shm
cp ~/backup/wedding-backup-2026-10-14.db data/wedding.db
# 4. Verifikasi lalu nyalakan server
sqlite3 data/wedding.db "PRAGMA integrity_check;"
node seed.js   # idempotent: memastikan baris template & admin ada
PORT=3000 node server.js
```

Jika backup juga mencakup `public/uploads/`, ekstrak arsipnya ke `public/uploads/`
sebelum menyalakan server.

## Jadwal yang Disarankan
- Backup harian otomatis (cron) via Opsi A + retensi 7 hari.
- Backup manual via Opsi B sebelum upgrade / perubahan skema.
