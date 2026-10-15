/* public/js/sample-wedding.js — data contoh untuk pratinjau template.
 * Bentuknya PERSSIS response GET /api/public/wedding/:slug (kontrak §4.8):
 * { wedding:{id,slug,title,template_id,theme_config,music_url},
 *   events:[], sections:[], gallery:[], gifts:[] }
 * config tiap section berupa STRING JSON (seperti yang dikembalikan API).
 */
const S = (key, config, order) => ({
  section_key: key,
  enabled: 1,
  sort_order: order,
  config: JSON.stringify(config || {}),
});

export const sampleWedding = {
  wedding: {
    id: 1,
    slug: 'demo',
    title: 'Nadia Rahma & Dimas Arya',
    template_id: 't03',
    theme_config: '{}',
    music_url: '',
  },
  events: [
    {
      id: 1,
      wedding_id: 1,
      kind: 'akad',
      title: 'Akad Nikah',
      event_date: '2026-12-12',
      start_time: '08:00',
      end_time: '10:00',
      venue_name: 'Masjid Agung Al-Azhar',
      address: 'Jl. Sisingamangaraja No. 1, Kebayoran Baru, Jakarta Selatan',
      maps_url: 'https://maps.google.com/?q=Masjid+Agung+Al-Azhar+Jakarta',
      sort_order: 0,
    },
    {
      id: 2,
      wedding_id: 1,
      kind: 'resepsi',
      title: 'Resepsi Pernikahan',
      event_date: '2026-12-12',
      start_time: '11:00',
      end_time: '14:00',
      venue_name: 'The Majestic Ballroom, Hotel Grand Kebon Sirih',
      address: 'Jl. Kebon Sirih No. 55, Menteng, Jakarta Pusat',
      maps_url: 'https://maps.google.com/?q=Hotel+Grand+Kebon+Sirih+Jakarta',
      sort_order: 1,
    },
  ],
  sections: [
    S('cover', { title: 'Undangan Pernikahan', names: 'Nadia Rahma & Dimas Arya', date: 'Sabtu, 12 Desember 2026' }, 0),
    S('hero', {
      greeting: "Assalamu'alaikum warahmatullahi wabarakatuh",
      text: 'Dengan penuh syukur ke hadirat Allah SWT, kami bermaksud menyempurnakan separuh agama kami dan mengikuti sunnah Rasul-Nya dalam ikatan suci pernikahan.',
    }, 1),
    S('quote', {
      text: 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
      source: 'QS. Ar-Rūm: 21',
    }, 2),
    S('couple', {
      bride_name: 'Nadia Rahma, S.Pd.',
      bride_nickname: 'Nadia',
      bride_parents: 'Putri pertama dari Bapak H. Ahmad Fauzi & Ibu Hj. Siti Aminah',
      bride_photo: '',
      groom_name: 'Dimas Arya Pratama, S.T.',
      groom_nickname: 'Dimas',
      groom_parents: 'Putra kedua dari Bapak Ir. Budi Santoso & Ibu Dra. Ratna Dewi',
      groom_photo: '',
    }, 3),
    S('parents', {
      text: 'Dengan penuh hormat dan sukacita, kami yang berbahagia:',
      families: [
        { name: 'Keluarga Besar H. Ahmad Fauzi', relation: 'Keluarga Mempelai Wanita' },
        { name: 'Keluarga Besar Ir. Budi Santoso', relation: 'Keluarga Mempelai Pria' },
      ],
    }, 4),
    S('events', { note: 'Acara akan diselenggarakan dengan mematuhi protokol kesehatan. Mohon datang tepat waktu.' }, 5),
    S('countdown', { text: 'Menghitung hari menuju momen paling bahagia dalam hidup kami' }, 6),
    S('story', {
      items: [
        { date: 'Maret 2019', title: 'Pertemuan Pertama', text: 'Kami dipertemukan dalam sebuah acara kampus. Siapa sangka obrolan singkat sore itu menjadi awal dari segalanya.' },
        { date: 'Januari 2021', title: 'Menjalin Kasih', text: 'Setelah dua tahun bersahabat, Dimas memberanikan diri mengungkapkan perasaannya di bawah langit senja Ancol.' },
        { date: 'Agustus 2025', title: 'Lamaran', text: 'Dengan restu kedua keluarga, Dimas melamar Nadia dalam acara keluarga yang hangat dan penuh haru.' },
      ],
    }, 7),
    S('gallery', { title: 'Galeri Momen Bahagia' }, 8),
    S('rsvp', { note: 'Kehadiran Anda sangat berarti bagi kami. Mohon konfirmasi kehadiran paling lambat 5 Desember 2026.' }, 9),
    S('wishes', { title: 'Ucapan & Doa Restu', note: 'Berikan doa terbaik untuk kedua mempelai tercinta.' }, 10),
    S('gift', { note: 'Doa restu Anda merupakan hadiah terindah bagi kami. Namun jika berkenan memberi tanda kasih, kami sediakan dengan penuh terima kasih.' }, 11),
    S('location', { note: 'Kedua acara bertempat di lokasi yang berbeda. Silakan periksa peta di bawah ini.' }, 12),
    S('dresscode', {
      text: 'Kami akan sangat senang jika para tamu mengenakan busana dengan nuansa berikut:',
      items: [
        { label: 'Akad Nikah', text: 'Busana muslim formal bernuansa pastel' },
        { label: 'Resepsi', text: 'Batik atau busana formal bernuansa earth tone' },
      ],
    }, 13),
    S('info', {
      text: 'Beberapa hal yang perlu diperhatikan demi kelancaran acara:',
      items: [
        { title: 'Tamu Undangan', text: 'Demi kenyamanan bersama, mohon hadir sesuai jumlah yang tertera pada undangan.' },
        { title: 'Anak-anak', text: 'Kami menyayangi si kecil, namun mohon pengertiannya untuk tidak membawa anak di bawah 5 tahun ke area acara.' },
        { title: 'Dokumentasi', text: 'Tim fotografer resmi kami akan mengabadikan setiap momen. Tamu dipersilakan berfoto setelah sesi resmi selesai.' },
      ],
    }, 14),
    S('closing', {
      text: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai.',
      share_text: 'Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan Nadia Rahma & Dimas Arya.',
    }, 15),
  ],
  gallery: [
    { id: 1, wedding_id: 1, url: '/assets/placeholder-photo-1.svg', caption: 'Momen lamaran', sort_order: 0 },
    { id: 2, wedding_id: 1, url: '/assets/placeholder-photo-2.svg', caption: 'Foto prewedding di pantai', sort_order: 1 },
    { id: 3, wedding_id: 1, url: '/assets/placeholder-photo-3.svg', caption: 'Bersama keluarga besar', sort_order: 2 },
  ],
  gifts: [
    { id: 1, wedding_id: 1, type: 'bank', provider: 'BCA', account_number: '8210445567', account_name: 'Nadia Rahma', note: '' },
    { id: 2, wedding_id: 1, type: 'bank', provider: 'Mandiri', account_number: '1370099887765', account_name: 'Dimas Arya Pratama', note: '' },
    { id: 3, wedding_id: 1, type: 'ewallet', provider: 'DANA', account_number: '081234567890', account_name: 'Nadia Rahma', note: '' },
    { id: 4, wedding_id: 1, type: 'address', provider: 'Kirim Hadiah Fisik', account_number: '-', account_name: 'Nadia & Dimas', note: 'Jl. Kenanga No. 88, Jakarta Selatan 12730' },
  ],
};
