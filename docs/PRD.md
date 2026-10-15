# PRD — Premium Wedding Invitation Studio

**Versi:** 1.0 (final, 2026-10-14)
**Status:** Selesai dikembangkan, terverifikasi QA.

## 1. Visi Produk

Studio pembuatan undangan pernikahan digital premium untuk pasar Indonesia:
satu dasbor untuk merancang, menerbitkan, dan mengelola undangan — dari memilih
template hingga merekap konfirmasi kehadiran tamu. Tamu menerima tautan personal,
membuka undangan yang terasa sinematik, lalu mengonfirmasi kehadiran dan
menitipkan doa langsung dari halamannya.

## 2. Target Pengguna

| Pengguna | Kebutuhan |
|---|---|
| **Admin / pasangan / WO** | Membuat banyak undangan, mengatur teks & tampilan tanpa coding, mengelola tamu, memantau RSVP & ucapan. |
| **Tamu undangan** | Membuka tautan dari WhatsApp, melihat detail acara, RSVP, mengirim ucapan, menyalin nomor rekening, membuka peta lokasi. |

Bahasa konten: Bahasa Indonesia. Satu akun admin tunggal (`admin`).

## 3. Scope (yang dibangun)

### 3.1 Publik
- **Landing studio** (`/`): pengenalan studio, tautan ke galeri template, undangan demo, dan dashboard admin.
- **Galeri template** (`/templates.html`): 8 template dengan filter kategori, pencarian, dan tombol pratinjau.
- **Halaman undangan** (`/i/:slug`, `/i/:slug/t/:token`): shell `i.html` + template yang dirender dinamis.
  - State machine: `loading → cover (sampul) → opening (animasi) → main`, plus state `error`.
  - Musik hanya diputar setelah tamu menekan "Buka Undangan" (kebijakan autoplay browser).
  - Hormat `prefers-reduced-motion` (animasi dipersingkat).
  - 16 seksi standar: cover, hero, quote, couple, parents, events, countdown, story,
    gallery, rsvp, wishes, gift, location, dresscode, info, closing.
  - Widget bawaan shell: countdown, form RSVP, daftar + form ucapan (paginasi),
    tombol salin (clipboard + fallback), share WhatsApp, tombol musik.
- **API publik**: data undangan (hanya yang published), nama tamu per token,
  submit RSVP (rate-limited), daftar & kirim ucapan (rate-limited).

### 3.2 Admin (`/admin/`, SPA, butuh login)
- **Semua Undangan**: CRUD, duplikat, terbitkan/tarik (draft/published), pilih aktif.
- **Umum & Template**: judul, slug, template (kartu galeri), warna aksen via theme_config, musik (URL/upload).
- **Acara**: CRUD akad/resepsi/custom (tanggal, jam, venue, alamat, maps URL).
- **Seksi & Teks**: toggle aktif/nonaktif, urutan, edit teks per seksi (form per config).
- **Galeri**: tambah/hapus foto (upload), caption, urutan.
- **Amplop & Gift**: CRUD metode (bank/e-wallet/alamat).
- **Daftar Tamu**: CRUD, impor/ekspor CSV, token personal 12 karakter, tombol salin tautan + share WA.
- **RSVP**: tabel, filter, ringkasan (hadir/tidak/total orang/total formulir), ekspor CSV.
- **Ucapan**: moderasi (setujui/sembunyikan/hapus), pencarian, filter status.
- **Pratinjau**: iframe `/i/:slug` — draft bisa dibuka bila cookie admin valid.

### 3.3 Di luar scope (sengaja tidak dibangun)
- Multi-user / peran (hanya satu admin).
- Pembayaran online & gateway; amplop digital hanya menampilkan nomor rekening.
- Peta interaktif tertanam (hanya tautan `maps_url`).
- Notifikasi real-time; analitik kunjungan.
- Aplikasi mobile; PWA/offline.

## 4. User Flow

### 4.1 Tamu
```
Terima link WA (/i/slug/t/token) → Sampul + nama tamu → "Buka Undangan"
→ animasi opening → baca seksi (scroll reveal) → countdown → RSVP (form)
→ kirim ucapan → salin rekening / buka maps → share WA
```

### 4.2 Admin
```
Login (/admin/) → Buat undangan (slug, judul, template)
→ otomatis dapat 16 seksi standar → isi teks per seksi → tambah acara, galeri, gift
→ kelola tamu (impor CSV, salin link personal) → Terbitkan
→ pantau RSVP & moderasi ucapan → ekspor CSV untuk panitia
```

## 5. Kriteria Keberhasilan (terpenuhi)
- 8 template terasa berbeda (layout, tipografi, motion) — bukan sekadar ganti warna.
- Semua tombol di admin & publik berfungsi (terverifikasi smoke test).
- 16 seksi ter-render bila enabled; konten selamat saat ganti template.
- Tamu tanpa akun tidak bisa melihat draft; admin bisa pratinjau draft.
- Ucapan tampil di publik hanya setelah disetujui; input lolos uji XSS.
- RSVP/ucapan publik dibatasi 10/menit/IP.

## 6. Asumsi & Keputusan Kunci
- Template = HTML/CSS/vanilla JS tanpa build step (mudah ditambah, murah di-hosting).
- SQLite satu file (`data/wedding.db`, WAL mode) — cukup untuk skala studio kecil–menengah,
  tetapi butuh filesystem persisten (lihat `docs/DEPLOYMENT.md`).
- Session admin via cookie httpOnly `sid`, kedaluwarsa 30 hari.
