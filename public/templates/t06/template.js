/* public/templates/t06/template.js — Garden Wedding
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * Identitas: segar & lapang — warna natural, foto landscape lebar, layout terbuka,
 * motif botanical minimal, transisi organik. Section 'cover' milik shell (di-skip).
 */
export const opening = 'mask';

/* ---------- util ---------- */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function parseJSON(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
}
function cfgFor(w, key) {
  const s = (w.sections || []).find((x) => x.section_key === key);
  return parseJSON(s && s.config);
}
function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return esc(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5).replace(':', '.');
}
function firstLetter(s) {
  return (String(s || '').trim()[0] || '·').toUpperCase();
}
function splitTitle(title) {
  const parts = String(title || '').split(/\s*&\s*|\s+dan\s+/i);
  return parts.length >= 2 ? [parts[0].trim(), parts.slice(1).join(' & ').trim()] : [String(title || '').trim(), ''];
}
function coupleNames(w) {
  const c = cfgFor(w, 'couple');
  let bride = c.bride_name || '';
  let groom = c.groom_name || '';
  if (!bride || !groom) {
    const [a, b] = splitTitle(w.wedding.title);
    if (!bride) bride = a;
    if (!groom) groom = b;
  }
  return { bride: bride || 'Mempelai Wanita', groom: groom || 'Mempelai Pria' };
}
function ensureFonts() {
  if (document.getElementById('tpl-t06-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t06-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Karla:wght@400;500;600&display=swap';
  document.head.appendChild(l);
}

/* ---------- motif botanical minimal (SVG murni) ---------- */
function sprigDivider() {
  return `<div class="t06-sprig" aria-hidden="true">
    <svg viewBox="0 0 200 34" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M100 6 C 100 14 100 22 100 30"/>
      <path d="M100 16 C 88 13 80 7 78 0 M100 16 C 112 13 120 7 122 0" opacity=".8"/>
      <path d="M100 24 C 90 22 84 17 83 10 M100 24 C 110 22 116 17 117 10" opacity=".8"/>
      <ellipse cx="78" cy="2" rx="7" ry="3.4" transform="rotate(-28 78 2)" fill="currentColor" stroke="none" opacity=".55"/>
      <ellipse cx="122" cy="2" rx="7" ry="3.4" transform="rotate(28 122 2)" fill="currentColor" stroke="none" opacity=".55"/>
      <ellipse cx="83" cy="10" rx="6" ry="3" transform="rotate(-28 83 10)" fill="currentColor" stroke="none" opacity=".55"/>
      <ellipse cx="117" cy="10" rx="6" ry="3" transform="rotate(28 117 10)" fill="currentColor" stroke="none" opacity=".55"/>
    </svg>
  </div>`;
}
/* Placeholder foto: lanskap kebun abstrak + monogram */
function gardenSVG(label, mono, wide) {
  const vb = wide ? '0 0 640 360' : '0 0 400 500';
  const sky = wide
    ? `<rect width="640" height="360" fill="#eef1e2"/><path d="M0 260 C 120 220 240 250 360 235 C 480 220 560 250 640 235 L640 360 L0 360 Z" fill="#dfe5cb"/>`
    : `<rect width="400" height="500" fill="#eef1e2"/><path d="M0 360 C 100 320 200 350 300 335 C 340 330 370 340 400 335 L400 500 L0 500 Z" fill="#dfe5cb"/>`;
  const cx = wide ? 320 : 200, cy = wide ? 150 : 190;
  return `<svg viewBox="${vb}" role="img" aria-label="${esc(label || 'Foto')}" preserveAspectRatio="xMidYMid slice">` +
    sky +
    `<circle cx="${cx}" cy="${cy}" r="${wide ? 58 : 62}" fill="#fbfaf4" stroke="#8a9a5b" stroke-width="1.5"/>` +
    `<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#43502f">${esc(mono)}</text>` +
    `<text x="${cx}" y="${cy + (wide ? 118 : 150)}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="19" fill="#7a8468">${esc(label || '')}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function kicker(label) {
  return `<p class="t06-kicker" data-reveal>${esc(label)}</p>`;
}
function secOpen(id) { return `<section class="t06-sec t06-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Di tengah hijaunya kebun dan semilir angin, kami mengundang Anda untuk merayakan hari bahagia kami di alam terbuka.';
  const photo = c.photo || '';
  return `<section class="t06-hero" id="sec-hero">
    <div class="t06-hero-photo" data-reveal>${photo
      ? `<img src="${esc(photo)}" alt="Foto kedua mempelai" loading="lazy">`
      : gardenSVG('', '', true)}</div>
    <div class="t06-hero-text">
      ${kicker('Undangan Pernikahan')}
      <p class="greeting" data-reveal>${esc(greeting)}</p>
      ${sprigDivider()}
      <p class="t06-lead" data-reveal>${esc(text)}</p>
    </div>
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Tuhan menciptakan alam dengan segala keindahannya, dan di antaranya Dia pertemukan dua hati untuk saling melengkapi.';
  const source = c.source || '';
  return `${secOpen('quote')}<div class="t06-quote" data-reveal>
    ${sprigDivider()}
    <blockquote>
      <p>${esc(text)}</p>
      ${source ? `<cite>${esc(source)}</cite>` : ''}
    </blockquote>
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono) => `
    <div class="t06-person" data-reveal>
      <div class="t06-photo">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : gardenSVG(name, mono, false)}</div>
      <p class="role">${esc(role)}</p>
      <h3>${esc(name)}</h3>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('Mempelai')}
    <h2 class="t06-h" data-reveal>Dua Hati di <em>Taman</em> yang Sama</h2>
    <div class="t06-couple">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride))}
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom))}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Dengan penuh sukacita, keluarga kedua mempelai:';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('Keluarga')}
    <div class="t06-parents" data-reveal>
      <p class="t06-lead">${esc(text)}</p>
      <div class="fams">
        ${fams.map((f) => `
          <div class="fam">
            <p class="fam-name">${esc(f.name || '')}</p>
            ${f.relation ? `<p class="fam-rel">${esc(f.relation)}</p>` : ''}
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function sEvents(w) {
  const c = cfgFor(w, 'events');
  const items = (w.events || []).map((ev) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date || '');
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const wd = d ? d.toLocaleDateString('id-ID', { weekday: 'long' }) : '';
    const full = d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const time = ev.start_time
      ? `Pukul ${fmtTime(ev.start_time)}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<article class="t06-event" data-reveal>
      <div class="ev-photo">${ev.photo ? `<img src="${esc(ev.photo)}" alt="${esc(ev.title)}" loading="lazy">` : gardenSVG(ev.title, '', true)}</div>
      <div class="ev-body">
        <p class="date">${esc(wd)}${wd && full ? ', ' : ''}${esc(full)}</p>
        <h3>${esc(ev.title)}</h3>
        ${time ? `<p class="time">${esc(time)}</p>` : ''}
        ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t06-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Peta</a>` : ''}
      </div>
    </article>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('Waktu & Tempat')}
    <h2 class="t06-h" data-reveal>Save <em>the</em> Date</h2>
    ${sprigDivider()}
    <div class="t06-events">${items || `<p class="t06-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}</div>
    ${c.note ? `<p class="t06-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung hari menuju perayaan di taman';
  return `${secOpen('countdown')}
    ${kicker('Hitung Mundur')}
    <h2 class="t06-h" data-reveal>Menuju Hari <em>Bahagia</em></h2>
    <p class="t06-lead" data-reveal>${esc(text)}</p>
    <div class="t06-count" data-countdown data-reveal>
      <div><b data-cd-d>00</b><span>Hari</span></div>
      <div><b data-cd-h>00</b><span>Jam</span></div>
      <div><b data-cd-m>00</b><span>Menit</span></div>
      <div><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t06-count-done" data-cd-done hidden>Acara telah berlangsung dengan meriah. Terima kasih atas kehadiran dan doa Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('Kisah Kami')}
    <h2 class="t06-h" data-reveal>Benih <em>Cinta</em> yang Tumbuh</h2>
    ${sprigDivider()}
    ${items.length ? `<div class="t06-story">${items.map((it, i) => `
      <div class="t06-story-item ${i % 2 ? 'flip' : ''}" data-reveal>
        <div class="s-photo">${it.photo ? `<img src="${esc(it.photo)}" alt="${esc(it.title || 'Cerita')}" loading="lazy">` : gardenSVG(it.title || '', '', true)}</div>
        <div class="s-text">
          ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
          <h3>${esc(it.title || '')}</h3>
          <p>${esc(it.text || '')}</p>
        </div>
      </div>`).join('')}</div>`
      : `<p class="t06-empty" data-reveal>Kisah kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri Kebun Kami';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('Galeri')}
    <h2 class="t06-h" data-reveal>${esc(title)}</h2>
    ${sprigDivider()}
    ${imgs.length ? `<div class="t06-gal">${imgs.map((g, i) => `
      <figure class="t06-gal-item ${i % 4 === 0 ? 'wide' : ''}" data-reveal>
        <img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy">
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t06-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Beri tahu kami apakah Anda bisa bergabung merayakan di taman. Kami menanti kehadiran Anda!';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('RSVP')}
    <h2 class="t06-h" data-reveal>Konfirmasi <em>Kehadiran</em></h2>
    <p class="t06-lead" data-reveal>${esc(note)}</p>
    <form id="rsvp-form" class="t06-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="rsvp-name">Nama lengkap</label>
        <input id="rsvp-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label>Apakah Anda akan hadir?</label>
        <div class="attend-row">
          <label><input type="radio" name="attendance" value="yes"><span>Ya, saya hadir</span></label>
          <label><input type="radio" name="attendance" value="no"><span>Maaf, berhalangan</span></label>
        </div>
      </div>
      <div class="inv-field">
        <label for="rsvp-count">Jumlah tamu</label>
        <select id="rsvp-count" name="guest_count">${opts}</select>
      </div>
      <div class="inv-field">
        <label for="rsvp-msg">Pesan (opsional)</label>
        <textarea id="rsvp-msg" name="message" maxlength="500" placeholder="Tulis pesan untuk kedua mempelai"></textarea>
      </div>
      <div class="center"><button type="submit" class="t06-btn">Kirim Konfirmasi</button></div>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa';
  const note = c.note || 'Tuliskan doa terbaik Anda di bawah pohon harapan kami.';
  return `${secOpen('wishes')}
    ${kicker('Ucapan')}
    <h2 class="t06-h" data-reveal>${esc(title)}</h2>
    <p class="t06-lead" data-reveal>${esc(note)}</p>
    <form id="wish-form" class="t06-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
      </div>
      <div class="center"><button type="submit" class="t06-btn ghost">Kirim Ucapan</button></div>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:30px" data-reveal>
      <button type="button" id="wishes-more" class="t06-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Kehadiran Anda sudah menjadi hadiah terindah. Jika ingin memberi tanda kasih, kami menerimanya dengan gembira.';
  const items = (w.gifts || []).map((g) => `
    <div class="t06-gift" data-reveal>
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t06-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('Tanda Kasih')}
    <h2 class="t06-h" data-reveal>Wedding <em>Gift</em></h2>
    <p class="t06-lead" data-reveal>${esc(note)}</p>
    <div class="t06-gifts">${items || `<p class="t06-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}</div>
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('Lokasi')}
    <h2 class="t06-h" data-reveal>Denah <em>Lokasi</em></h2>
    ${sprigDivider()}
    ${note ? `<p class="t06-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t06-venue" data-reveal>
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p class="vname">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="vaddr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t06-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t06-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('Dresscode')}
    <h2 class="t06-h" data-reveal>Busana <em>Taman</em></h2>
    <div class="t06-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t06-lead">Kenakan busana santai rapi bernuansa alam — earth tone sangat disarankan.</p>` : ''}
    </div>
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('Informasi')}
    <h2 class="t06-h" data-reveal>Info <em>Acara</em></h2>
    ${text ? `<p class="t06-info-text" data-reveal>${esc(text)}</p>` : ''}
    <div class="t06-infos">
      ${items.map((it) => `
        <div class="t06-info-item" data-reveal>
          <h4>${esc(it.title || '')}</h4>
          <p>${esc(it.text || '')}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Terima kasih telah menjadi bagian dari hari bahagia kami di taman. Sampai jumpa di bawah langit yang sama!';
  const shareText = c.share_text || `Kami mengundang Anda ke acara pernikahan ${bride} & ${groom} di taman.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}<div class="t06-closing">
    ${kicker('Penutup')}
    ${sprigDivider()}
    <p class="thanks" data-reveal>${esc(text)}</p>
    <p class="sign" data-reveal>${esc(bride)} <em>&amp;</em> ${esc(groom)}</p>
    <div class="t06-share" data-reveal>
      <button type="button" class="t06-btn ghost t06-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
        <span>Bagikan Undangan</span>
      </button>
      <button type="button" class="t06-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
        <span>Konfirmasi Kehadiran</span>
      </button>
    </div>
    <p class="t06-colophon" data-reveal>${esc(firstLetter(bride))} &amp; ${esc(firstLetter(groom))}${dateShort ? ' · ' + esc(dateShort) : ''}</p>
  </div></section>`;
}

/* ---------- render utama ---------- */
const RENDERERS = {
  hero: sHero, quote: sQuote, couple: sCouple, parents: sParents,
  events: sEvents, countdown: sCountdown, story: sStory, gallery: sGallery,
  rsvp: sRsvp, wishes: sWishes, gift: sGift, location: sLocation,
  dresscode: sDresscode, info: sInfo, closing: sClosing,
};

export function render(w, root) {
  ensureFonts();
  const secs = (w.sections || []).filter((s) => s.section_key !== 'cover' && RENDERERS[s.section_key]);
  root.innerHTML = secs.map((s) => RENDERERS[s.section_key](w)).join('');
}
