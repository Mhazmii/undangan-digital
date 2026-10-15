/* public/templates/t04/template.js — Royal Classic
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * Identitas: formal & agung — champagne/ivory + hijau tua/burgundy, serif klasik
 * Cinzel, bingkai ganda tipis, ornamen simetris. Section 'cover' milik shell.
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
  return firstLetter(a) + ' · ' + firstLetter(b);
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
  if (document.getElementById('tpl-t04-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t04-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap';
  document.head.appendChild(l);
}

/* ---------- ornamen simetris (SVG murni) ---------- */
function flourish() {
  return `<div class="t04-flourish" aria-hidden="true">
    <svg viewBox="0 0 320 30" fill="none" stroke="currentColor" stroke-width="1.3">
      <line x1="10" y1="15" x2="128" y2="15" opacity=".6"/>
      <line x1="192" y1="15" x2="310" y2="15" opacity=".6"/>
      <path d="M160 6 l9 9 -9 9 -9 -9 Z" fill="currentColor" stroke="none"/>
      <path d="M132 15 l7 0 M181 15 l7 0" opacity=".6"/>
      <circle cx="118" cy="15" r="2.4" fill="currentColor" stroke="none"/>
      <circle cx="202" cy="15" r="2.4" fill="currentColor" stroke="none"/>
    </svg>
  </div>`;
}
function cornerFrame(inner) {
  return `<span class="t04-corner tl" aria-hidden="true"></span><span class="t04-corner tr" aria-hidden="true"></span>` +
    `<span class="t04-corner bl" aria-hidden="true"></span><span class="t04-corner br" aria-hidden="true"></span>${inner || ''}`;
}
/* Placeholder foto: bingkai ganda + monogram klasik */
function classicSVG(label, mono) {
  return `<svg viewBox="0 0 400 500" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<rect width="400" height="500" fill="#f6efdd"/>` +
    `<rect x="16" y="16" width="368" height="468" fill="none" stroke="#b9924f" stroke-width="2"/>` +
    `<rect x="26" y="26" width="348" height="448" fill="none" stroke="#b9924f" stroke-width="0.8" opacity="0.7"/>` +
    `<path d="M16 46 l14 -14 14 14 -14 14 Z M356 46 l14 -14 14 14 -14 14 Z M16 468 l14 -14 14 14 -14 14 Z M356 468 l14 -14 14 14 -14 14 Z" fill="#b9924f"/>` +
    `<circle cx="200" cy="210" r="70" fill="none" stroke="#1f3d2b" stroke-width="1.5"/>` +
    `<circle cx="200" cy="210" r="62" fill="none" stroke="#1f3d2b" stroke-width="0.8" opacity="0.6"/>` +
    `<text x="200" y="224" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#1f3d2b">${esc(mono)}</text>` +
    `<path d="M120 330 C 160 316 240 316 280 330" fill="none" stroke="#b9924f" stroke-width="1.2"/>` +
    `<path d="M200 322 l8 8 -8 8 -8 -8 Z" fill="#b9924f"/>` +
    `<text x="200" y="410" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="20" fill="#5c5344">${esc(label || '')}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function kicker(no, label) {
  return `<p class="t04-kicker" data-reveal><span class="n">${esc(no)}</span><span class="l">${esc(label)}</span></p>`;
}
function secOpen(id) { return `<section class="t04-sec t04-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud menyelenggarakan acara pernikahan putra-putri kami.';
  return `${secOpen('hero')}
    <div class="t04-panel" data-reveal>${cornerFrame()}
      ${kicker('I', 'Undangan Pernikahan')}
      <p class="greeting">${esc(greeting)}</p>
      ${flourish()}
      <p class="t04-lead">${esc(text)}</p>
    </div>
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<div class="t04-quote" data-reveal>${cornerFrame()}
    <blockquote>
      <p>${esc(text)}</p>
      <cite>— ${esc(source)} —</cite>
    </blockquote>
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono) => `
    <div class="t04-person" data-reveal>
      <div class="t04-frame">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : classicSVG(name, mono)}</div>
      <p class="role">${esc(role)}</p>
      <h3>${esc(name)}</h3>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('II', 'Mempelai')}
    <h2 class="t04-h" data-reveal>Mempelai <span>Berbahagia</span></h2>
    ${flourish()}
    <div class="t04-couple">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride))}
      <div class="t04-amp" data-reveal aria-hidden="true"><span>&amp;</span></div>
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom))}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Dengan penuh hormat, kedua keluarga besar yang berbahagia:';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('III', 'Keluarga')}
    <h2 class="t04-h" data-reveal>Keluarga <span>Besar</span></h2>
    ${flourish()}
    <div class="t04-parents" data-reveal>
      <p class="t04-lead">${esc(text)}</p>
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
  const items = (w.events || []).map((ev) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date || '');
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const dayNum = d ? d.getDate() : '';
    const wd = d ? d.toLocaleDateString('id-ID', { weekday: 'long' }) : '';
    const my = d ? d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';
    const time = ev.start_time
      ? `Pukul ${fmtTime(ev.start_time)}${ev.end_time ? ' s.d. ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<div class="t04-event" data-reveal>${cornerFrame()}
      <p class="kind">${esc(ev.kind === 'akad' ? 'Akad Nikah' : ev.kind === 'resepsi' ? 'Resepsi' : ev.kind || '')}</p>
      <p class="date-num">${esc(String(dayNum))}</p>
      <p class="date-line">${esc(wd)} · ${esc(my)}</p>
      <h3>${esc(ev.title)}</h3>
      ${time ? `<p class="time">${esc(time)}</p>` : ''}
      ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
      ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
      ${ev.maps_url ? `<a class="t04-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Peta Lokasi</a>` : ''}
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('IV', 'Waktu & Tempat')}
    <h2 class="t04-h" data-reveal>Rangkaian <span>Acara</span></h2>
    ${flourish()}
    <div class="t04-events">${items || `<p class="t04-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}</div>
    ${c.note ? `<p class="t04-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung hari menuju acara yang mulia';
  return `${secOpen('countdown')}
    ${kicker('V', 'Hitung Mundur')}
    <h2 class="t04-h" data-reveal>Menuju Hari <span>Bahagia</span></h2>
    ${flourish()}
    <p class="t04-lead" data-reveal>${esc(text)}</p>
    <div class="t04-count" data-countdown data-reveal>
      <div class="cell"><b data-cd-d>00</b><span>Hari</span></div>
      <div class="cell"><b data-cd-h>00</b><span>Jam</span></div>
      <div class="cell"><b data-cd-m>00</b><span>Menit</span></div>
      <div class="cell"><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t04-count-done" data-cd-done hidden>Acara telah terlaksana dengan khidmat. Terima kasih atas doa restu Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('VI', 'Kisah Kami')}
    <h2 class="t04-h" data-reveal>Perjalanan <span>Cinta</span></h2>
    ${flourish()}
    ${items.length ? `<div class="t04-story">${items.map((it) => `
      <div class="t04-story-item" data-reveal>
        <span class="dia" aria-hidden="true"></span>
        ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
        <h3>${esc(it.title || '')}</h3>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}</div>`
      : `<p class="t04-empty" data-reveal>Kisah kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('VII', 'Galeri')}
    <h2 class="t04-h" data-reveal>${esc(title)}</h2>
    ${flourish()}
    ${imgs.length ? `<div class="t04-gal">${imgs.map((g, i) => `
      <figure class="t04-gal-item ${i === 0 ? 'wide' : ''}" data-reveal>
        <div class="t04-frame sm"><img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy"></div>
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t04-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Kehadiran Bapak/Ibu/Saudara/i merupakan suatu kehormatan bagi kami. Mohon konfirmasi kehadiran melalui formulir berikut.';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('VIII', 'RSVP')}
    <h2 class="t04-h" data-reveal>Konfirmasi <span>Kehadiran</span></h2>
    ${flourish()}
    <p class="t04-lead" data-reveal>${esc(note)}</p>
    <div class="t04-panel" data-reveal>${cornerFrame()}
      <form id="rsvp-form" class="t04-form" novalidate>
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
        <div class="center"><button type="submit" class="t04-btn">Kirim Konfirmasi</button></div>
      </form>
    </div>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa Restu';
  const note = c.note || 'Berikanlah doa restu terbaik untuk kedua mempelai.';
  return `${secOpen('wishes')}
    ${kicker('IX', 'Ucapan')}
    <h2 class="t04-h" data-reveal>${esc(title)}</h2>
    ${flourish()}
    <p class="t04-lead" data-reveal>${esc(note)}</p>
    <div class="t04-panel" data-reveal>${cornerFrame()}
      <form id="wish-form" class="t04-form" novalidate>
        <p class="inv-form-error" role="alert"></p>
        <div class="inv-field">
          <label for="wish-name">Nama</label>
          <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
        </div>
        <div class="inv-field">
          <label for="wish-msg">Ucapan</label>
          <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
        </div>
        <div class="center"><button type="submit" class="t04-btn ghost">Kirim Ucapan</button></div>
      </form>
    </div>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:30px" data-reveal>
      <button type="button" id="wishes-more" class="t04-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Doa restu Anda merupakan hadiah yang paling berharga. Apabila berkenan memberikan tanda kasih, kami sediakan dengan penuh terima kasih.';
  const items = (w.gifts || []).map((g) => `
    <div class="t04-gift" data-reveal>${cornerFrame()}
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t04-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('X', 'Tanda Kasih')}
    <h2 class="t04-h" data-reveal>Wedding <span>Gift</span></h2>
    ${flourish()}
    <p class="t04-lead" data-reveal>${esc(note)}</p>
    <div class="t04-gifts">${items || `<p class="t04-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}</div>
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('XI', 'Lokasi')}
    <h2 class="t04-h" data-reveal>Denah <span>Lokasi</span></h2>
    ${flourish()}
    ${note ? `<p class="t04-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t04-venue" data-reveal>${cornerFrame()}
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p class="vname">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="vaddr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t04-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t04-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('XII', 'Dresscode')}
    <h2 class="t04-h" data-reveal>Tata <span>Busana</span></h2>
    ${flourish()}
    <div class="t04-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t04-lead">Para tamu diharapkan berpakaian formal dan sopan.</p>` : ''}
    </div>
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('XIII', 'Informasi')}
    <h2 class="t04-h" data-reveal>Catatan <span>Penting</span></h2>
    ${flourish()}
    ${text ? `<p class="t04-info-text" data-reveal>${esc(text)}</p>` : ''}
    <div class="t04-infos">
      ${items.map((it) => `
        <div class="t04-info-item" data-reveal>
          <h4>${esc(it.title || '')}</h4>
          <p>${esc(it.text || '')}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Atas kehadiran serta doa restu Bapak/Ibu/Saudara/i, kami mengucapkan terima kasih yang sebesar-besarnya.';
  const shareText = c.share_text || `Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan ${bride} & ${groom}.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}<div class="t04-closing">
    ${kicker('XIV', 'Penutup')}
    <div class="t04-panel" data-reveal>${cornerFrame()}
      <p class="thanks">${esc(text)}</p>
      <p class="sign">${esc(bride)} <em>&amp;</em> ${esc(groom)}</p>
      <div class="t04-share">
        <button type="button" class="t04-btn ghost t04-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
          <span>Bagikan Undangan</span>
        </button>
        <button type="button" class="t04-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
          <span>Konfirmasi Kehadiran</span>
        </button>
      </div>
      <p class="t04-colophon">${esc(initials(bride, groom))}${dateShort ? ' · ' + esc(dateShort) : ''}</p>
    </div>
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
