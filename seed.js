// seed.js — node seed.js → admin + 8 template + 1 demo wedding (kontrak §8).
// Idempoten: aman dijalankan ulang.
const bcrypt = require('bcryptjs');
const db = require('./db');
const { genToken } = require('./lib/util');

const TEMPLATES = [
  ['t01', 'Editorial Ivory', 'Elegan ala majalah: serif editorial di atas ivory hangat, garis tipis, dan white space luas.', 'editorial'],
  ['t02', 'Modern Minimalist', 'Geometris dan presisi: sans-serif modern, grid tegas, animasi pendek dan tepat.', 'minimalist'],
  ['t03', 'Botanical Romance', 'Sage dan olive yang lembut dengan ilustrasi botanical halus dan komposisi organik.', 'romantic'],
  ['t04', 'Royal Classic', 'Formal dan megah: champagne, ivory, dan aksen deep green dengan ornamen simetris.', 'classic'],
  ['t05', 'Contemporary Dark', 'Gelap yang elegan: tipografi kontras, foto sinematik, transisi cahaya terkendali.', 'dark'],
  ['t06', 'Garden Wedding', 'Natural dan terbuka: warna kebun, foto landscape, transisi antar-section yang organik.', 'garden'],
  ['t07', 'Nusantara Heritage', 'Anggun bernuansa Nusantara: ornamen geometris modern terinspirasi motif budaya, palet emas dan ivory, layout kontemporer yang khidmat.', 'traditional'],
  ['t08', 'Cinematic Romance', 'Storytelling visual sinematik: foto pasangan sebagai pusat, image reveal dramatis.', 'cinematic'],
];

const SECTION_KEYS = [
  'cover','hero','quote','couple','parents','events','countdown','story',
  'gallery','rsvp','wishes','gift','location','dresscode','info','closing'
];

const DEMO_CONFIG = {
  cover:   { title: 'Undangan Pernikahan', names: 'Aisyah Putri & Rizky Pratama', date: 'Sabtu, 12 Desember 2026' },
  hero:    { greeting: "Assalamu'alaikum Wr. Wb.", text: 'Dengan penuh syukur kepada Allah SWT, kami bermaksud menyempurnakan separuh agama kami.' },
  quote:   { text: 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.', source: 'QS. Ar-Rum: 21' },
  couple:  {
    bride_name: 'Aisyah Putri', bride_nickname: 'Aisyah',
    bride_parents: 'Putri pertama dari Bapak H. Ahmad Hidayat & Ibu Hj. Siti Rahma',
    groom_name: 'Rizky Pratama', groom_nickname: 'Rizky',
    groom_parents: 'Putra kedua dari Bapak H. Bambang Sutrisno & Ibu Hj. Dewi Lestari'
  },
  parents: { text: 'Kami yang berbahagia, keluarga kedua mempelai.' },
  events:  { note: 'Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir.' },
  countdown:{ text: 'Menghitung hari menuju momen bahagia' },
  story:   { items: [
    { title: 'Awal Bertemu', text: 'Kami dipertemukan dalam sebuah acara keluarga pada tahun 2019. Sapaan sederhana itu menjadi awal dari segalanya.' },
    { title: 'Lamaran', text: 'Pada bulan Maret 2026, dengan restu kedua keluarga, kami mengikat janji untuk melangkah ke jenjang yang lebih serius.' }
  ]},
  gallery: { title: 'Galeri Momen' },
  rsvp:    { note: 'Mohon konfirmasi kehadiran Anda melalui formulir di bawah ini.' },
  wishes:  { title: 'Ucapan & Doa', note: 'Berikan doa terbaik untuk kedua mempelai.' },
  gift:    { note: 'Doa restu Anda adalah hadiah terindah. Namun jika berkenan memberi, kami sediakan dengan penuh terima kasih.' },
  location:{ note: 'Lokasi acara dapat dilihat melalui peta di bawah.' },
  dresscode:{ text: 'Dresscode: earth tone / pastel. Mohon hindari warna putih.' },
  info:    { text: 'Acara diselenggarakan dengan mematuhi protokol yang berlaku. Terima kasih atas pengertiannya.' },
  closing: { text: "Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu. Wassalamu'alaikum Wr. Wb." }
};

const seed = db.transaction(() => {
  // 1. Admin user
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT OR IGNORE INTO users(username, password_hash) VALUES(\'admin\', ?)').run(hash);

  // 2. Templates (upsert: aman dijalankan ulang, baris yang sudah ada di-update)
  const tplStmt = db.prepare(
    `INSERT INTO templates(id, name, description, category, active) VALUES(?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
       category=excluded.category, active=excluded.active`
  );
  for (const [id, name, description, category] of TEMPLATES) tplStmt.run(id, name, description, category);

  // 3. Demo wedding (skip bila slug demo sudah ada)
  if (db.prepare('SELECT id FROM weddings WHERE slug = ?').get('demo')) {
    console.log('Seed: demo wedding sudah ada, dilewati.');
    return;
  }
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  const info = db.prepare(
    `INSERT INTO weddings(slug, title, template_id, theme_config, music_url, status, owner_id)
     VALUES('demo', 'Aisyah Putri & Rizky Pratama', 't01', '{}', '', 'published', ?)`
  ).run(admin.id);
  const wid = info.lastInsertRowid;

  // Events
  const evStmt = db.prepare(
    `INSERT INTO wedding_events(wedding_id,kind,title,event_date,start_time,end_time,venue_name,address,maps_url,sort_order)
     VALUES(?,?,?,?,?,?,?,?,?,?)`
  );
  evStmt.run(wid, 'akad', 'Akad Nikah', '2026-12-12', '08:00', '10:00',
    'Gedung Serbaguna Graha Cinta', 'Jl. Kenanga No. 88, Jakarta Selatan',
    'https://maps.google.com/?q=Gedung+Serbaguna+Graha+Cinta+Jakarta', 0);
  evStmt.run(wid, 'resepsi', 'Resepsi Pernikahan', '2026-12-12', '11:00', '14:00',
    'Gedung Serbaguna Graha Cinta', 'Jl. Kenanga No. 88, Jakarta Selatan',
    'https://maps.google.com/?q=Gedung+Serbaguna+Graha+Cinta+Jakarta', 1);

  // Sections (semua enabled)
  const secStmt = db.prepare(
    'INSERT INTO wedding_sections(wedding_id, section_key, enabled, sort_order, config) VALUES(?,?,?,?,?)'
  );
  SECTION_KEYS.forEach((key, i) => {
    secStmt.run(wid, key, 1, i, JSON.stringify(DEMO_CONFIG[key] || {}));
  });

  // Gifts (2 metode)
  const giftStmt = db.prepare(
    'INSERT INTO gift_methods(wedding_id, type, provider, account_number, account_name, note) VALUES(?,?,?,?,?,?)'
  );
  giftStmt.run(wid, 'bank', 'BCA', '1234567890', 'Aisyah Putri', 'Rekening mempelai wanita');
  giftStmt.run(wid, 'ewallet', 'DANA', '081234567890', 'Rizky Pratama', 'E-wallet mempelai pria');

  // Gallery (3 placeholder lokal)
  const galStmt = db.prepare('INSERT INTO gallery_images(wedding_id, url, caption, sort_order) VALUES(?,?,?,?)');
  galStmt.run(wid, '/assets/placeholder-photo-1.svg', 'Momen bahagia 1', 0);
  galStmt.run(wid, '/assets/placeholder-photo-2.svg', 'Momen bahagia 2', 1);
  galStmt.run(wid, '/assets/placeholder-photo-3.svg', 'Momen bahagia 3', 2);

  // Guests (3, token contoh 12 char)
  const guestStmt = db.prepare('INSERT INTO wedding_guests(wedding_id, name, phone, token, group_name) VALUES(?,?,?,?,?)');
  const tokens = ['dem0guest001', 'dem0guest002', 'dem0guest003'];
  [['Keluarga Budi Santoso', '081111111111', 'Keluarga'],
   ['Sinta Maharani', '082222222222', 'Sahabat'],
   ['Andi Wijaya', '083333333333', 'Rekan Kerja']].forEach((g, i) => {
    try { guestStmt.run(wid, g[0], g[1], tokens[i] || genToken(12), g[2]); }
    catch { guestStmt.run(wid, g[0], g[1], genToken(12), g[2]); }
  });

  // Wishes (2 approved + 1 pending)
  const wishStmt = db.prepare('INSERT INTO wedding_wishes(wedding_id, name, message, status) VALUES(?,?,?,?)');
  wishStmt.run(wid, 'Budi Santoso', 'Barakallahu laka wa baraka alaika wa jamaa bainakuma fii khair. Selamat menempuh hidup baru, Aisyah & Rizky!', 'approved');
  wishStmt.run(wid, 'Sinta Maharani', 'Happy wedding sayangku! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Aamiin.', 'approved');
  wishStmt.run(wid, 'Andi Wijaya', 'Selamat untuk kalian berdua! Semoga lancar sampai hari H.', 'pending');

  console.log('Seed: demo wedding dibuat (id=%d).', wid);
});

seed();
require('./db').close(); // tutup DB agar proses exit bersih (better-sqlite3 v11 + Node 24)
console.log('Seed selesai.');
