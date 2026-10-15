# DEPLOYMENT

## Syarat Utama: Filesystem Persisten

Aplikasi menyimpan **semuanya** di disk lokal:
- `data/wedding.db` (+ `-wal`/`-shm`) — seluruh data
- `public/uploads/` — foto & musik hasil upload

> ⚠️ **JANGAN deploy ke hosting serverless / filesystem ephemeral**
> (Vercel, Netlify Functions, AWS Lambda, dsb.): setiap cold start / redeploy
> akan me-reset database ke kosong. Gunakan VPS atau container dengan **volume
> persisten** yang di-mount ke direktori aplikasi (atau minimal ke `data/` dan
> `public/uploads/`).

Batasan lain:
- Rate limiter dan session store bersifat **in-memory** → jalankan **satu instance**
  saja. Untuk multi-instance butuh store eksternal (belum diimplementasikan).
- Jangan jalankan dua proses Node terhadap satu file DB (risiko lock).

## Persiapan Server (Ubuntu/Debian)

```bash
# Node 18+ (disarankan 18/20 LTS; lihat catatan better-sqlite3 di bawah)
node --version

git clone <repo> && cd wedding-invitation
npm ci   # atau npm install
cp .env.example .env   # sesuaikan bila perlu
node seed.js           # buat admin + template + demo (idempotent)
```

> Catatan `better-sqlite3` di Node 24: binding native kadang perlu di-rebuild:
> `cd node_modules/better-sqlite3 && rm -rf build && npx node-gyp rebuild --release`.
> Pada Node 24, `node seed.js` sesekali crash dengan assertion native saat teardown —
> data yang tertulis sudah ter-commit; ulangi perintahnya.

## Menjalankan

### Langsung
```bash
PORT=3000 node server.js
```

### PM2 (disarankan)
```bash
npm i -g pm2
pm2 start server.js --name wedding-studio --env PORT=3000
pm2 save
pm2 startup   # ikuti instruksi agar hidup setelah reboot
```

### systemd
```ini
# /etc/systemd/system/wedding-studio.service
[Unit]
Description=Premium Wedding Invitation Studio
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/wedding-invitation
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now wedding-studio
```

## Reverse Proxy (nginx, singkat)

```nginx
server {
  listen 80;
  server_name undangan.contoh.id;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  client_max_body_size 6m;  # di atas batas upload 5 MB
}
```

Untuk HTTPS, pasang sertifikat (mis. `certbot --nginx`) — cookie `sid`
sebaiknya dikirim lewat HTTPS di produksi.

## Checklist Go-Live
1. Volume persisten untuk `data/` dan `public/uploads/`.
2. `PORT` sesuai proxy; firewall hanya membuka 80/443.
3. **Ganti password admin default** (`admin`/`admin123`) — belum ada UI ganti
   password; lakukan via sqlite langsung:
   `node -e "const db=require('./db');const b=require('bcryptjs');db.prepare('UPDATE users SET password_hash=? WHERE username=?').run(b.hashSync('PASSWORD_BARU',10),'admin');db.close()"`
4. Backup harian aktif (lihat `docs/BACKUP.md`).
5. Uji `/i/demo` dari jaringan publik dan submit RSVP test.
