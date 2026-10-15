/* public/templates/t01/template.js — Editorial Ivory
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * w = data GET /api/public/wedding/:slug (§4.8). Semua teks di-escape (anti-XSS).
 * Section 'cover' milik shell (sampul pembuka); di sini di-skip.
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
function initials(a, b) {
  return firstLetter(a) + ' & ' + firstLetter(b);
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
    // Judul seed: "Aisyah Putri & Rizky Pratama" → bagian pertama = mempelai wanita.
    const [a, b] = splitTitle(w.wedding.title);
    if (!bride) bride = a;
    if (!groom) groom = b;
  }
  return { bride: bride || 'Mempelai Wanita', groom: groom || 'Mempelai Pria' };
}
function ensureFonts() {
  if (document.getElementById('tpl-t01-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t01-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@400;500&display=swap';
  document.head.appendChild(l);
}
/* Placeholder foto elegan (SVG murni, tanpa hotlink). */
function portraitSVG(label, mono) {
  return `<svg viewBox="0 0 400 500" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<rect width="400" height="500" fill="#f4eee1"/>` +
    `<rect x="18" y="18" width="364" height="464" fill="none" stroke="#a98f5f" stroke-width="1.5"/>` +
    `<rect x="28" y="28" width="344" height="444" fill="none" stroke="#a98f5f" stroke-width="0.75" opacity="0.6"/>` +
    `<circle cx="200" cy="215" r="72" fill="none" stroke="#a98f5f" stroke-width="1.5"/>` +
    `<text x="200" y="228" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#8a6d3b">${esc(mono)}</text>` +
    `<path d="M200 300 c -18 -22 -18 -40 0 -58 M200 300 c 18 -22 18 -40 0 -58" fill="none" stroke="#a98f5f" stroke-width="1"/>` +
    `<text x="200" y="420" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="20" fill="#8a7355">${esc(label || '')}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function kicker(no, label) {
  return `<p class="t01-kicker" data-reveal><span class="no">${esc(no)}</span><span>${esc(label)}</span></p>`;
}
function secOpen(id) { return `<section class="t01-sec t01-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan penuh syukur ke hadirat Allah SWT, kami bermaksud menyempurnakan separuh agama kami dalam ikatan suci pernikahan.';
  return `${secOpen('hero')}
    ${kicker('—', 'Undangan Pernikahan')}
    <p class="greeting" data-reveal>${esc(greeting)}</p>
    <div class="t01-rule" data-reveal></div>
    <p class="t01-lead" data-reveal>${esc(text)}</p>
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<blockquote data-reveal>
    <span class="mark" aria-hidden="true">&ldquo;</span>
    <p>${esc(text)}</p>
    <cite>${esc(source)}</cite>
  </blockquote></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono) => `
    <div class="t01-person" data-reveal>
      <div class="t01-portrait">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : portraitSVG(name, mono)}</div>
      <h3>${esc(name)}</h3>
      <p class="role">${esc(role)}</p>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('01', 'Mempelai')}
    <h2 class="t01-h" data-reveal>Dua Hati, <em>Satu Tujuan</em></h2>
    <div class="t01-couple-grid">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride))}
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom))}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Kami yang berbahagia, keluarga kedua mempelai.';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('02', 'Keluarga')}
    <h2 class="t01-h" data-reveal>Keluarga yang <em>Berbahagia</em></h2>
    <div class="t01-parents">
      <p class="t01-lead" data-reveal>${esc(text)}</p>
      ${fams.map((f) => `
        <div class="fam" data-reveal>
          <p class="fam-name">${esc(f.name || '')}</p>
          ${f.relation ? `<p class="fam-rel">${esc(f.relation)}</p>` : ''}
        </div>`).join('')}
    </div>
  </section>`;
}

function sEvents(w) {
  const c = cfgFor(w, 'events');
  const items = (w.events || []).map((ev) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date || '');
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const dayNum = d ? d.getDate() : '';
    const my = d ? d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';
    const wd = d ? d.toLocaleDateString('id-ID', { weekday: 'long' }) : '';
    const time = ev.start_time
      ? `Pukul ${fmtTime(ev.start_time)}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<div class="t01-event" data-reveal>
      <p class="date-num">${esc(String(dayNum))}</p>
      <p class="date-my">${esc(wd)} · ${esc(my)}</p>
      <h3>${esc(ev.title)}</h3>
      ${time ? `<p class="time">${esc(time)}</p>` : ''}
      ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
      ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
      ${ev.maps_url ? `<a class="t01-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Peta</a>` : ''}
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('03', 'Waktu & Tempat')}
    <h2 class="t01-h" data-reveal>Save <em>the</em> Date</h2>
    ${items || `<p class="t01-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}
    ${c.note ? `<p class="t01-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung hari menuju momen bahagia';
  return `${secOpen('countdown')}
    ${kicker('04', 'Hitung Mundur')}
    <h2 class="t01-h" data-reveal>Menuju Hari <em>Bahagia</em></h2>
    <p class="t01-lead" data-reveal>${esc(text)}</p>
    <div class="t01-count" data-countdown data-reveal>
      <div><b data-cd-d>00</b><span>Hari</span></div>
      <div><b data-cd-h>00</b><span>Jam</span></div>
      <div><b data-cd-m>00</b><span>Menit</span></div>
      <div><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t01-count-done" data-cd-done hidden>Acara telah berlangsung dengan penuh kebahagiaan. Terima kasih atas doa Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('05', 'Kisah Kami')}
    <h2 class="t01-h" data-reveal>Perjalanan <em>Cinta</em></h2>
    ${items.length ? `<div class="t01-story">${items.map((it) => `
      <div class="t01-story-item" data-reveal>
        ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
        <h3>${esc(it.title || '')}</h3>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}</div>`
      : `<p class="t01-empty" data-reveal>Kisah kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri Momen';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('06', 'Galeri')}
    <h2 class="t01-h" data-reveal>${esc(title)}</h2>
    ${imgs.length ? `<div class="t01-gal">${imgs.map((g, i) => `
      <figure class="${i === 0 ? 'wide' : ''}" data-reveal>
        <img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy">
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t01-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Kehadiran Anda sangat berarti bagi kami. Mohon konfirmasi kehadiran melalui formulir di bawah ini.';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('07', 'RSVP')}
    <h2 class="t01-h" data-reveal>Konfirmasi <em>Kehadiran</em></h2>
    <p class="t01-lead" data-reveal>${esc(note)}</p>
    <form id="rsvp-form" class="t01-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="rsvp-name">Nama lengkap</label>
        <input id="rsvp-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label>Konfirmasi kehadiran</label>
        <div class="attend-row">
          <label><input type="radio" name="attendance" value="yes"><span>Hadir</span></label>
          <label><input type="radio" name="attendance" value="no"><span>Berhalangan</span></label>
        </div>
      </div>
      <div class="inv-field">
        <label for="rsvp-count">Jumlah tamu</label>
        <select id="rsvp-count" name="guest_count">${opts}</select>
      </div>
      <div class="inv-field">
        <label for="rsvp-msg">Pesan <span style="text-transform:none;letter-spacing:0">(opsional)</span></label>
        <textarea id="rsvp-msg" name="message" maxlength="500" placeholder="Tulis pesan untuk kedua mempelai"></textarea>
      </div>
      <div class="center"><button type="submit" class="t01-btn">Kirim Konfirmasi</button></div>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa';
  const note = c.note || 'Berikan doa terbaik untuk kedua mempelai.';
  return `${secOpen('wishes')}
    ${kicker('08', 'Ucapan')}
    <h2 class="t01-h" data-reveal>${esc(title)}</h2>
    <p class="t01-lead" data-reveal>${esc(note)}</p>
    <form id="wish-form" class="t01-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
      </div>
      <div class="center"><button type="submit" class="t01-btn ghost">Kirim Ucapan</button></div>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:28px" data-reveal>
      <button type="button" id="wishes-more" class="t01-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Doa restu Anda merupakan hadiah terindah. Namun jika berkenan memberi tanda kasih, kami sediakan dengan penuh terima kasih.';
  const items = (w.gifts || []).map((g) => `
    <div class="t01-gift" data-reveal>
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t01-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('09', 'Tanda Kasih')}
    <h2 class="t01-h" data-reveal>Wedding <em>Gift</em></h2>
    <p class="t01-lead" data-reveal>${esc(note)}</p>
    ${items || `<p class="t01-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('10', 'Lokasi')}
    <h2 class="t01-h" data-reveal>Denah <em>Lokasi</em></h2>
    ${note ? `<p class="t01-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t01-venue" data-reveal style="margin-top:32px">
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p><strong style="color:var(--ink)">${esc(ev.venue_name)}</strong></p>` : ''}
        ${ev.address ? `<p>${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t01-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t01-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('11', 'Dresscode')}
    <h2 class="t01-h" data-reveal>Busana <em>Acara</em></h2>
    <div class="t01-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t01-lead">Berpakaianlah dengan sopan dan nyaman.</p>` : ''}
    </div>
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('12', 'Informasi')}
    <h2 class="t01-h" data-reveal>Catatan <em>Penting</em></h2>
    ${text ? `<p class="t01-info-text" data-reveal>${esc(text)}</p>` : ''}
    ${items.map((it) => `
      <div class="t01-info-item" data-reveal>
        <h4>${esc(it.title || '')}</h4>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.';
  const shareText = c.share_text || `Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan ${bride} & ${groom}.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}<div class="t01-closing">
    ${kicker('—', 'Penutup')}
    <p class="thanks" data-reveal>${esc(text)}</p>
    <p class="sign" data-reveal>${esc(bride)} <em style="font-style:italic;color:var(--accent)">&amp;</em> ${esc(groom)}</p>
    <div class="t01-share" data-reveal>
      <button type="button" class="t01-btn ghost t01-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
        <span>Bagikan Undangan</span>
      </button>
      <button type="button" class="t01-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
        <span>Konfirmasi Kehadiran</span>
      </button>
    </div>
    <p class="t01-colophon" data-reveal>${esc(initials(bride, groom))}${dateShort ? ' · ' + esc(dateShort) : ''}</p>
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
