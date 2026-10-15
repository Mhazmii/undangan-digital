/* public/templates/t05/template.js — Contemporary Dark
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * Identitas: gelap elegan — tipografi kontras terang, foto sinematik full-bleed,
 * hairline emas, transisi cahaya terkendali. Keterbacaan dijaga (kontras tinggi).
 * Section 'cover' milik shell (di-skip).
 */
export const opening = 'cinematic';

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
  if (document.getElementById('tpl-t05-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t05-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Italiana&family=Jost:ital,wght@0,300;0,400;0,500;1,400&display=swap';
  document.head.appendChild(l);
}
/* Placeholder foto: monogram emas di atas hitam hangat */
function darkSVG(label, mono) {
  return `<svg viewBox="0 0 400 500" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<rect width="400" height="500" fill="#161310"/>` +
    `<rect x="14" y="14" width="372" height="472" fill="none" stroke="#c8a35f" stroke-width="1" opacity="0.6"/>` +
    `<circle cx="200" cy="205" r="64" fill="none" stroke="#c8a35f" stroke-width="1.2"/>` +
    `<text x="200" y="220" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#e8d9b8">${esc(mono)}</text>` +
    `<line x1="120" y1="320" x2="280" y2="320" stroke="#c8a35f" stroke-width="1" opacity="0.5"/>` +
    `<text x="200" y="400" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="20" fill="#a89e88">${esc(label || '')}</text>` +
    `</svg>`;
}
/* Pita foto sinematik full-bleed (letterbox) */
function cineBand(photo, altText, caption) {
  const inner = photo
    ? `<img src="${esc(photo)}" alt="${esc(altText)}" loading="lazy">`
    : darkSVG(altText, '');
  return `<figure class="t05-band" data-reveal>
    <div class="t05-band-frame">${inner}</div>
    ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
  </figure>`;
}

/* ---------- potongan section ---------- */
function kicker(label) {
  return `<p class="t05-kicker" data-reveal><span>${esc(label)}</span></p>`;
}
function secOpen(id) { return `<section class="t05-sec t05-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const { bride, groom } = coupleNames(w);
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan penuh syukur, kami mengundang Anda untuk menjadi saksi momen paling berharga dalam hidup kami.';
  const heroPhoto = c.photo || '';
  return `<section class="t05-hero" id="sec-hero">
    <div class="t05-hero-media" data-reveal>${heroPhoto
      ? `<img src="${esc(heroPhoto)}" alt="Foto kedua mempelai" loading="lazy">`
      : darkSVG(bride + ' & ' + groom, firstLetter(bride) + firstLetter(groom))}
      <div class="t05-hero-veil" aria-hidden="true"></div>
    </div>
    <div class="t05-hero-text">
      ${kicker('Undangan Pernikahan')}
      <h2 class="t05-names" data-reveal><span>${esc(bride)}</span><em>&amp;</em><span>${esc(groom)}</span></h2>
      <p class="greeting" data-reveal>${esc(greeting)}</p>
      <p class="t05-lead" data-reveal>${esc(text)}</p>
    </div>
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<div class="t05-quote" data-reveal>
    <p class="t05-quote-text">${esc(text)}</p>
    <p class="t05-quote-src">${esc(source)}</p>
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono, idx) => `
    <div class="t05-person" data-reveal>
      <p class="idx">0${idx}</p>
      <div class="t05-portrait">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : darkSVG(name, mono)}</div>
      <p class="role">${esc(role)}</p>
      <h3>${esc(name)}</h3>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('Mempelai')}
    <div class="t05-couple">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride), 1)}
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom), 2)}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Dengan hormat, keluarga kedua mempelai yang berbahagia.';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('Keluarga')}
    <div class="t05-parents" data-reveal>
      <p class="t05-lead">${esc(text)}</p>
      ${fams.map((f) => `
        <div class="fam">
          <p class="fam-name">${esc(f.name || '')}</p>
          ${f.relation ? `<p class="fam-rel">${esc(f.relation)}</p>` : ''}
        </div>`).join('')}
    </div>
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
      ? `${fmtTime(ev.start_time)}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<div class="t05-event" data-reveal>
      <p class="idx">0${i + 1}</p>
      <h3>${esc(ev.title)}</h3>
      <p class="date">${esc(wd)}${wd && full ? ', ' : ''}${esc(full)}</p>
      ${time ? `<p class="time">${esc(time)}</p>` : ''}
      ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
      ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
      ${ev.maps_url ? `<a class="t05-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Peta</a>` : ''}
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('Waktu & Tempat')}
    <h2 class="t05-h" data-reveal>Rangkaian Acara</h2>
    <div class="t05-events">${items || `<p class="t05-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}</div>
    ${c.note ? `<p class="t05-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung mundur menuju hari bahagia';
  return `${secOpen('countdown')}
    ${kicker('Hitung Mundur')}
    <p class="t05-lead" data-reveal>${esc(text)}</p>
    <div class="t05-count" data-countdown data-reveal>
      <div><b data-cd-d>00</b><span>Hari</span></div>
      <div><b data-cd-h>00</b><span>Jam</span></div>
      <div><b data-cd-m>00</b><span>Menit</span></div>
      <div><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t05-count-done" data-cd-done hidden>Acara telah berlangsung. Terima kasih atas doa Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('Kisah Kami')}
    <h2 class="t05-h" data-reveal>Perjalanan Cinta</h2>
    ${items.length ? `<div class="t05-story">${items.map((it, i) => `
      <div class="t05-chapter" data-reveal>
        <p class="ch">Bab ${i + 1}</p>
        ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
        <h3>${esc(it.title || '')}</h3>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}</div>`
      : `<p class="t05-empty" data-reveal>Kisah kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('Galeri')}
    <h2 class="t05-h" data-reveal>${esc(title)}</h2>
    <div class="t05-gal">
      ${imgs.length ? imgs.map((g, i) => `
        <figure class="t05-gal-item" data-reveal>
          <img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy">
          ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
        </figure>`).join('')
        : `<p class="t05-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
    </div>
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Konfirmasikan kehadiran Anda melalui formulir di bawah ini.';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('RSVP')}
    <h2 class="t05-h" data-reveal>Konfirmasi Kehadiran</h2>
    <p class="t05-lead" data-reveal>${esc(note)}</p>
    <form id="rsvp-form" class="t05-form" data-reveal novalidate>
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
        <label for="rsvp-msg">Pesan (opsional)</label>
        <textarea id="rsvp-msg" name="message" maxlength="500" placeholder="Tulis pesan untuk kedua mempelai"></textarea>
      </div>
      <div class="center"><button type="submit" class="t05-btn">Kirim Konfirmasi</button></div>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa';
  const note = c.note || 'Kirimkan doa terbaik untuk kedua mempelai.';
  return `${secOpen('wishes')}
    ${kicker('Ucapan')}
    <h2 class="t05-h" data-reveal>${esc(title)}</h2>
    <p class="t05-lead" data-reveal>${esc(note)}</p>
    <form id="wish-form" class="t05-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
      </div>
      <div class="center"><button type="submit" class="t05-btn ghost">Kirim Ucapan</button></div>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:30px" data-reveal>
      <button type="button" id="wishes-more" class="t05-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Doa restu Anda adalah hadiah terindah. Jika berkenan memberi tanda kasih, kami menerimanya dengan syukur.';
  const items = (w.gifts || []).map((g) => `
    <div class="t05-gift" data-reveal>
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t05-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('Tanda Kasih')}
    <h2 class="t05-h" data-reveal>Wedding Gift</h2>
    <p class="t05-lead" data-reveal>${esc(note)}</p>
    <div class="t05-gifts">${items || `<p class="t05-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}</div>
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('Lokasi')}
    <h2 class="t05-h" data-reveal>Denah Lokasi</h2>
    ${note ? `<p class="t05-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t05-venue" data-reveal>
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p class="vname">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="vaddr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t05-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t05-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('Dresscode')}
    <h2 class="t05-h" data-reveal>Busana Acara</h2>
    <div class="t05-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t05-lead">Berpakaianlah dengan rapi dan nyaman.</p>` : ''}
    </div>
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('Informasi')}
    <h2 class="t05-h" data-reveal>Catatan Penting</h2>
    ${text ? `<p class="t05-info-text" data-reveal>${esc(text)}</p>` : ''}
    <div class="t05-infos">
      ${items.map((it) => `
        <div class="t05-info-item" data-reveal>
          <h4>${esc(it.title || '')}</h4>
          <p>${esc(it.text || '')}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Merupakan kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.';
  const shareText = c.share_text || `Kami mengundang Anda ke acara pernikahan ${bride} & ${groom}.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}<div class="t05-closing">
    ${kicker('Penutup')}
    <p class="thanks" data-reveal>${esc(text)}</p>
    <p class="sign" data-reveal>${esc(bride)} <em>&amp;</em> ${esc(groom)}</p>
    <div class="t05-share" data-reveal>
      <button type="button" class="t05-btn ghost t05-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
        <span>Bagikan Undangan</span>
      </button>
      <button type="button" class="t05-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
        <span>Konfirmasi Kehadiran</span>
      </button>
    </div>
    <p class="t05-colophon" data-reveal>${esc(firstLetter(bride))} &amp; ${esc(firstLetter(groom))}${dateShort ? ' — ' + esc(dateShort) : ''}</p>
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
