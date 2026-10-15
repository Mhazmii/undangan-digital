/* public/templates/t07/template.js — Nusantara Heritage (Traditional Indonesian Elegance)
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * Identitas: anggun bernuansa Nusantara — ornamen geometris MODERN yang
 * terinspirasi motif budaya Indonesia (digambar ulang abstrak: lengkung awan
 * berlapis & pola lingkaran geometris), palet emas/tua + ivory, layout
 * kontemporer. Tidak meniru motif sakral dan tidak mengklaim akurasi adat.
 * Section 'cover' milik shell (di-skip).
 */
export const opening = 'envelope';

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
function initials(a, b) {
  return firstLetter(a) + ' — ' + firstLetter(b);
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
  if (document.getElementById('tpl-t07-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t07-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=Jost:ital,wght@0,400;0,500;1,400&display=swap';
  document.head.appendChild(l);
}

/* ---------- ornamen modern terinspirasi budaya (SVG abstrak, bukan motif sakral) ---------- */
/* Pita pola lingkaran geometris — interpretasi kontemporer */
function geoBand() {
  let circles = '';
  for (let i = 0; i < 8; i++) {
    const cx = 40 + i * 80;
    circles += `<circle cx="${cx}" cy="22" r="15"/><circle cx="${cx}" cy="22" r="8" opacity=".6"/>`;
  }
  return `<div class="t07-band" aria-hidden="true">
    <svg viewBox="0 0 680 44" fill="none" stroke="currentColor" stroke-width="1.4" preserveAspectRatio="xMidYMid slice">${circles}</svg>
  </div>`;
}
/* Lengkung awan berlapis — interpretasi modern yang disederhanakan */
function cloudArc() {
  return `<div class="t07-arc" aria-hidden="true">
    <svg viewBox="0 0 280 44" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M30 30 C 60 8 100 8 120 30 C 140 8 180 8 200 30 C 220 12 250 12 262 26"/>
      <path d="M48 38 C 72 22 104 22 120 38 C 136 22 168 22 184 38" opacity=".5"/>
      <circle cx="141" cy="30" r="3" fill="currentColor" stroke="none"/>
    </svg>
  </div>`;
}
/* Placeholder foto: bingkai emas + pola geometris sudut */
function heritageSVG(label, mono) {
  return `<svg viewBox="0 0 400 500" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<rect width="400" height="500" fill="#f3ead6"/>` +
    `<rect x="18" y="18" width="364" height="464" fill="none" stroke="#b98a2f" stroke-width="2.5"/>` +
    `<rect x="30" y="30" width="340" height="440" fill="none" stroke="#b98a2f" stroke-width="1" opacity="0.6"/>` +
    `<g fill="none" stroke="#b98a2f" stroke-width="1.2" opacity="0.8">` +
    `<circle cx="60" cy="60" r="14"/><circle cx="60" cy="60" r="7"/>` +
    `<circle cx="340" cy="60" r="14"/><circle cx="340" cy="60" r="7"/>` +
    `<circle cx="60" cy="440" r="14"/><circle cx="60" cy="440" r="7"/>` +
    `<circle cx="340" cy="440" r="14"/><circle cx="340" cy="440" r="7"/></g>` +
    `<circle cx="200" cy="215" r="66" fill="none" stroke="#5c2e1e" stroke-width="1.5"/>` +
    `<text x="200" y="229" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#5c2e1e">${esc(mono)}</text>` +
    `<path d="M140 330 C 170 312 230 312 260 330" fill="none" stroke="#b98a2f" stroke-width="1.4"/>` +
    `<circle cx="200" cy="322" r="3.5" fill="#b98a2f"/>` +
    `<text x="200" y="412" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="20" fill="#6d5a3e">${esc(label || '')}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function kicker(label) {
  return `<div class="t07-kicker" data-reveal><span class="rule"></span><span class="txt">${esc(label)}</span><span class="rule"></span></div>`;
}
function secOpen(id) { return `<section class="t07-sec t07-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan memohon rahmat Allah SWT dan restu para sesepuh, kami bermaksud menyatukan dua keluarga dalam ikatan pernikahan yang suci.';
  return `${secOpen('hero')}
    ${geoBand()}
    <div class="t07-hero-in" data-reveal>
      ${kicker('Undangan Pernikahan')}
      <p class="greeting">${esc(greeting)}</p>
      ${cloudArc()}
      <p class="t07-lead">${esc(text)}</p>
    </div>
    ${geoBand()}
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<div class="t07-quote" data-reveal>
    ${cloudArc()}
    <blockquote>
      <p>${esc(text)}</p>
      <cite>${esc(source)}</cite>
    </blockquote>
    ${cloudArc()}
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono) => `
    <div class="t07-person" data-reveal>
      <div class="t07-photo">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : heritageSVG(name, mono)}</div>
      <p class="role">${esc(role)}</p>
      <h3>${esc(name)}</h3>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('Mempelai')}
    <h2 class="t07-h" data-reveal>Dua Insan <span>Berbahagia</span></h2>
    <div class="t07-couple">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride))}
      <div class="t07-amp" data-reveal aria-hidden="true"><span>&amp;</span></div>
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom))}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Kami memohon doa restu dari keluarga besar kedua belah pihak:';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('Keluarga')}
    <h2 class="t07-h" data-reveal>Keluarga <span>Besar</span></h2>
    <div class="t07-parents" data-reveal>
      <p class="t07-lead">${esc(text)}</p>
      ${fams.map((f) => `
        <div class="fam">
          <p class="fam-name">${esc(f.name || '')}</p>
          ${f.relation ? `<p class="fam-rel">${esc(f.relation)}</p>` : ''}
        </div>`).join('')}
    </div>
    ${cloudArc()}
  </section>`;
}

function sEvents(w) {
  const c = cfgFor(w, 'events');
  const items = (w.events || []).map((ev, i) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date || '');
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const wd = d ? d.toLocaleDateString('id-ID', { weekday: 'long' }) : '';
    const full = d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const time = ev.start_time
      ? `Pukul ${fmtTime(ev.start_time)}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<div class="t07-event" data-reveal>
      <p class="no">${['I', 'II', 'III', 'IV', 'V'][i] || (i + 1)}</p>
      <h3>${esc(ev.title)}</h3>
      <p class="date">${esc(wd)}${wd && full ? ', ' : ''}${esc(full)}</p>
      ${time ? `<p class="time">${esc(time)}</p>` : ''}
      ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
      ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
      ${ev.maps_url ? `<a class="t07-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Peta</a>` : ''}
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('Waktu & Tempat')}
    <h2 class="t07-h" data-reveal>Rangkaian <span>Acara</span></h2>
    <div class="t07-events">${items || `<p class="t07-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}</div>
    ${c.note ? `<p class="t07-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung hari menuju acara yang penuh berkah';
  return `${secOpen('countdown')}
    <div class="t07-cd-panel" data-reveal>
      ${kicker('Hitung Mundur')}
      <h2 class="t07-h">Menuju Hari <span>Bahagia</span></h2>
      <p class="t07-lead">${esc(text)}</p>
      <div class="t07-count" data-countdown>
        <div><b data-cd-d>00</b><span>Hari</span></div>
        <div><b data-cd-h>00</b><span>Jam</span></div>
        <div><b data-cd-m>00</b><span>Menit</span></div>
        <div><b data-cd-s>00</b><span>Detik</span></div>
      </div>
      <p class="t07-count-done" data-cd-done hidden>Acara telah terlaksana dengan lancar. Terima kasih atas doa restu Anda.</p>
    </div>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('Kisah Kami')}
    <h2 class="t07-h" data-reveal>Lembaran <span>Cerita</span></h2>
    ${items.length ? `<div class="t07-story">${items.map((it) => `
      <div class="t07-story-item" data-reveal>
        ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
        <h3>${esc(it.title || '')}</h3>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}</div>`
      : `<p class="t07-empty" data-reveal>Kisah kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('Galeri')}
    <h2 class="t07-h" data-reveal>${esc(title)}</h2>
    ${imgs.length ? `<div class="t07-gal">${imgs.map((g, i) => `
      <figure class="t07-gal-item ${i === 0 ? 'wide' : ''}" data-reveal>
        <div class="t07-photo sm"><img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy"></div>
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t07-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Kehadiran Anda adalah suatu kehormatan. Mohon konfirmasi kehadiran melalui formulir berikut.';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('RSVP')}
    <h2 class="t07-h" data-reveal>Konfirmasi <span>Kehadiran</span></h2>
    <p class="t07-lead" data-reveal>${esc(note)}</p>
    <form id="rsvp-form" class="t07-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="rsvp-name">Nama lengkap</label>
        <input id="rsvp-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label>Konfirmasi kehadiran</label>
        <div class="attend-row">
          <label><input type="radio" name="attendance" value="yes"><span>Bersedia Hadir</span></label>
          <label><input type="radio" name="attendance" value="no"><span>Berhalangan</span></label>
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
      <div class="center"><button type="submit" class="t07-btn">Kirim Konfirmasi</button></div>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa Restu';
  const note = c.note || 'Sampaikan doa terbaik untuk kedua mempelai.';
  return `${secOpen('wishes')}
    ${kicker('Ucapan')}
    <h2 class="t07-h" data-reveal>${esc(title)}</h2>
    <p class="t07-lead" data-reveal>${esc(note)}</p>
    <form id="wish-form" class="t07-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
      </div>
      <div class="center"><button type="submit" class="t07-btn ghost">Kirim Ucapan</button></div>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:30px" data-reveal>
      <button type="button" id="wishes-more" class="t07-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Doa restu Anda adalah anugerah terindah. Apabila berkenan memberi tanda kasih, kami menerimanya dengan penuh syukur.';
  const items = (w.gifts || []).map((g) => `
    <div class="t07-gift" data-reveal>
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t07-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('Tanda Kasih')}
    <h2 class="t07-h" data-reveal>Wedding <span>Gift</span></h2>
    <p class="t07-lead" data-reveal>${esc(note)}</p>
    <div class="t07-gifts">${items || `<p class="t07-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}</div>
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('Lokasi')}
    <h2 class="t07-h" data-reveal>Denah <span>Lokasi</span></h2>
    ${note ? `<p class="t07-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t07-venue" data-reveal>
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p class="vname">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="vaddr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t07-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t07-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('Dresscode')}
    <h2 class="t07-h" data-reveal>Tata <span>Busana</span></h2>
    <div class="t07-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t07-lead">Para tamu diharapkan mengenakan busana formal yang sopan; batik sangat disarankan.</p>` : ''}
    </div>
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('Informasi')}
    <h2 class="t07-h" data-reveal>Catatan <span>Penting</span></h2>
    ${text ? `<p class="t07-info-text" data-reveal>${esc(text)}</p>` : ''}
    <div class="t07-infos">
      ${items.map((it) => `
        <div class="t07-info-item" data-reveal>
          <h4>${esc(it.title || '')}</h4>
          <p>${esc(it.text || '')}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Atas kehadiran dan doa restu Bapak/Ibu/Saudara/i, kami haturkan terima kasih yang sebesar-besarnya.';
  const shareText = c.share_text || `Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan ${bride} & ${groom}.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}
    ${geoBand()}
    <div class="t07-closing">
      ${kicker('Penutup')}
      <p class="thanks" data-reveal>${esc(text)}</p>
      <p class="sign" data-reveal>${esc(bride)} <em>&amp;</em> ${esc(groom)}</p>
      <div class="t07-share" data-reveal>
        <button type="button" class="t07-btn ghost t07-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
          <span>Bagikan Undangan</span>
        </button>
        <button type="button" class="t07-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
          <span>Konfirmasi Kehadiran</span>
        </button>
      </div>
      <p class="t07-colophon" data-reveal>${esc(initials(bride, groom))}${dateShort ? ' · ' + esc(dateShort) : ''}</p>
    </div>
    ${geoBand()}
  </section>`;
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
