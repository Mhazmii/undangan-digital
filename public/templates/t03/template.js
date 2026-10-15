/* public/templates/t03/template.js — Botanical Romance
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * Identitas: romantis lembut — sage/olive/cream, ilustrasi botanical halus,
 * foto bingkai arch organik, gerak tenang. Section 'cover' milik shell (di-skip).
 */
export const opening = 'curtain';

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
    const [a, b] = splitTitle(w.wedding.title);
    if (!bride) bride = a;
    if (!groom) groom = b;
  }
  return { bride: bride || 'Mempelai Wanita', groom: groom || 'Mempelai Pria' };
}
function ensureFonts() {
  if (document.getElementById('tpl-t03-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t03-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@400;500&display=swap';
  document.head.appendChild(l);
}

/* ---------- ornamen botanical (SVG murni) ---------- */
function leafDivider() {
  return `<div class="t03-divider" aria-hidden="true">
    <svg viewBox="0 0 220 28" fill="none" stroke="currentColor" stroke-width="1.2">
      <line x1="8" y1="14" x2="86" y2="14" opacity=".5"/>
      <line x1="134" y1="14" x2="212" y2="14" opacity=".5"/>
      <path d="M110 4 C 102 10 102 18 110 24 C 118 18 118 10 110 4 Z"/>
      <path d="M96 10 C 90 12 86 16 85 21 M124 10 C 130 12 134 16 135 21" opacity=".7"/>
      <ellipse cx="85" cy="21" rx="4.5" ry="2.2" transform="rotate(-30 85 21)" fill="currentColor" stroke="none" opacity=".55"/>
      <ellipse cx="135" cy="21" rx="4.5" ry="2.2" transform="rotate(30 135 21)" fill="currentColor" stroke="none" opacity=".55"/>
    </svg>
  </div>`;
}
function cornerSprig() {
  return `<svg class="t03-sprig" viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
    <path d="M20 150 C 30 110 28 70 52 34"/>
    <path d="M36 116 C 52 112 64 102 70 88" opacity=".7"/>
    <path d="M42 88 C 56 84 66 76 71 64" opacity=".7"/>
    <path d="M47 62 C 58 58 66 50 69 40" opacity=".7"/>
    <ellipse cx="70" cy="88" rx="9" ry="4.5" transform="rotate(28 70 88)" fill="currentColor" stroke="none" opacity=".5"/>
    <ellipse cx="71" cy="64" rx="8" ry="4" transform="rotate(28 71 64)" fill="currentColor" stroke="none" opacity=".5"/>
    <ellipse cx="69" cy="40" rx="7" ry="3.5" transform="rotate(28 69 40)" fill="currentColor" stroke="none" opacity=".5"/>
    <ellipse cx="36" cy="116" rx="9" ry="4.5" transform="rotate(-32 36 116)" fill="currentColor" stroke="none" opacity=".5"/>
  </svg>`;
}
/* Placeholder foto: arch organik + monogram + ranting halus */
function archSVG(label, mono) {
  return `<svg viewBox="0 0 400 520" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<defs><clipPath id="t03a"><path d="M40 480 L40 220 C40 120 110 40 200 40 C290 40 360 120 360 220 L360 480 Z"/></clipPath></defs>` +
    `<rect width="400" height="520" fill="#f3efe2"/>` +
    `<g clip-path="url(#t03a)"><rect x="40" y="40" width="320" height="440" fill="#e9e4d2"/>` +
    `<circle cx="200" cy="250" r="66" fill="none" stroke="#8a9a7b" stroke-width="1.5"/>` +
    `<text x="200" y="264" text-anchor="middle" font-family="Georgia,serif" font-size="36" fill="#5f7052">${esc(mono)}</text></g>` +
    `<path d="M40 480 L40 220 C40 120 110 40 200 40 C290 40 360 120 360 220 L360 480 Z" fill="none" stroke="#8a9a7b" stroke-width="2"/>` +
    `<path d="M70 470 C 62 420 62 380 74 340 M74 420 C 60 414 52 404 48 392" fill="none" stroke="#7c8b66" stroke-width="1.2" opacity=".8"/>` +
    `<ellipse cx="48" cy="392" rx="8" ry="4" transform="rotate(-30 48 392)" fill="#8a9a7b" opacity=".6"/>` +
    `<path d="M330 470 C 338 420 338 380 326 340 M326 420 C 340 414 348 404 352 392" fill="none" stroke="#7c8b66" stroke-width="1.2" opacity=".8"/>` +
    `<ellipse cx="352" cy="392" rx="8" ry="4" transform="rotate(30 352 392)" fill="#8a9a7b" opacity=".6"/>` +
    `<text x="200" y="505" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="19" fill="#7a7f6d">${esc(label || '')}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function kicker(label) {
  return `<p class="t03-kicker" data-reveal><span>${esc(label)}</span></p>`;
}
function secOpen(id) { return `<section class="t03-sec t03-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada acara pernikahan kami.';
  return `${secOpen('hero')}
    <div class="t03-hero-card" data-reveal>
      ${cornerSprig()}
      ${kicker('Undangan Pernikahan')}
      <p class="greeting">${esc(greeting)}</p>
      ${leafDivider()}
      <p class="t03-lead">${esc(text)}</p>
    </div>
  </section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<div class="t03-quote-wrap" data-reveal>
    <blockquote>
      <p>${esc(text)}</p>
      <cite>${esc(source)}</cite>
    </blockquote>
    ${leafDivider()}
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role, mono) => `
    <div class="t03-person" data-reveal>
      <div class="t03-arch">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`
        : archSVG(name, mono)}</div>
      <p class="role">${esc(role)}</p>
      <h3>${esc(name)}</h3>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${kicker('Mempelai Berbahagia')}
    <h2 class="t03-h" data-reveal>Dua insan yang <em>dipersatukan</em> dalam cinta</h2>
    <div class="t03-couple">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita', firstLetter(bride))}
      <div class="t03-amp" data-reveal aria-hidden="true">&amp;</div>
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria', firstLetter(groom))}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Dengan hormat, kami yang berbahagia:';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${kicker('Keluarga')}
    <div class="t03-parents" data-reveal>
      <p class="t03-lead">${esc(text)}</p>
      ${fams.map((f) => `
        <div class="fam">
          <p class="fam-name">${esc(f.name || '')}</p>
          ${f.relation ? `<p class="fam-rel">${esc(f.relation)}</p>` : ''}
        </div>`).join('')}
    </div>
    ${leafDivider()}
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
      ? `Pukul ${fmtTime(ev.start_time)}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''} WIB` : '';
    return `<div class="t03-event" data-reveal>
      <div class="ev-date"><b>${esc(String(dayNum))}</b><span>${esc(wd)}<br>${esc(my)}</span></div>
      <h3>${esc(ev.title)}</h3>
      ${time ? `<p class="time">${esc(time)}</p>` : ''}
      ${ev.venue_name ? `<p class="venue">${esc(ev.venue_name)}</p>` : ''}
      ${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
      ${ev.maps_url ? `<a class="t03-link" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Lihat Lokasi</a>` : ''}
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${kicker('Waktu & Tempat')}
    <h2 class="t03-h" data-reveal>Save <em>the</em> Date</h2>
    <div class="t03-events">${items || `<p class="t03-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}</div>
    ${c.note ? `<p class="t03-event-note" data-reveal>${esc(c.note)}</p>` : ''}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  const text = c.text || 'Menghitung mundur menuju hari yang dinanti';
  return `${secOpen('countdown')}
    ${kicker('Hitung Mundur')}
    <h2 class="t03-h" data-reveal>Menuju Hari <em>Bahagia</em></h2>
    <p class="t03-lead" data-reveal>${esc(text)}</p>
    <div class="t03-count" data-countdown data-reveal>
      <div class="ring"><b data-cd-d>00</b><span>Hari</span></div>
      <div class="ring"><b data-cd-h>00</b><span>Jam</span></div>
      <div class="ring"><b data-cd-m>00</b><span>Menit</span></div>
      <div class="ring"><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t03-count-done" data-cd-done hidden>Acara telah berlangsung dengan penuh kebahagiaan. Terima kasih atas doa Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${kicker('Kisah Kami')}
    <h2 class="t03-h" data-reveal>Perjalanan <em>Cinta</em> Kami</h2>
    ${items.length ? `<div class="t03-story">${items.map((it, i) => `
      <div class="t03-story-item ${i % 2 ? 'right' : 'left'}" data-reveal>
        <span class="leaf-dot" aria-hidden="true"></span>
        ${it.date ? `<p class="when">${esc(it.date)}</p>` : ''}
        <h3>${esc(it.title || '')}</h3>
        <p>${esc(it.text || '')}</p>
      </div>`).join('')}</div>`
      : `<p class="t03-empty" data-reveal>Kisah cinta kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const title = c.title || 'Galeri Momen Bahagia';
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${kicker('Galeri')}
    <h2 class="t03-h" data-reveal>${esc(title)}</h2>
    ${imgs.length ? `<div class="t03-gal">${imgs.map((g, i) => `
      <figure class="t03-gal-item ${i % 3 === 1 ? 'offset' : ''}" data-reveal>
        <div class="arch-sm"><img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy"></div>
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t03-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const note = c.note || 'Kehadiran Anda sangat berarti bagi kami. Mohon konfirmasi kehadiran melalui formulir di bawah ini.';
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${kicker('RSVP')}
    <h2 class="t03-h" data-reveal>Konfirmasi <em>Kehadiran</em></h2>
    <p class="t03-lead" data-reveal>${esc(note)}</p>
    <form id="rsvp-form" class="t03-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="rsvp-name">Nama lengkap</label>
        <input id="rsvp-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label>Konfirmasi kehadiran</label>
        <div class="attend-row">
          <label><input type="radio" name="attendance" value="yes"><span>Hadir, insyaAllah</span></label>
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
      <div class="center"><button type="submit" class="t03-btn">Kirim Konfirmasi</button></div>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  const title = c.title || 'Ucapan & Doa Restu';
  const note = c.note || 'Sampaikan doa terbaik Anda untuk kedua mempelai.';
  return `${secOpen('wishes')}
    ${kicker('Ucapan')}
    <h2 class="t03-h" data-reveal>${esc(title)}</h2>
    <p class="t03-lead" data-reveal>${esc(note)}</p>
    <form id="wish-form" class="t03-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Tulis nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan dan doa terbaik Anda"></textarea>
      </div>
      <div class="center"><button type="submit" class="t03-btn ghost">Kirim Ucapan</button></div>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div class="center" style="margin-top:30px" data-reveal>
      <button type="button" id="wishes-more" class="t03-btn ghost">Lihat ucapan lainnya</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const note = c.note || 'Doa restu Anda adalah hadiah terindah. Namun jika berkenan memberi tanda kasih, kami menerimanya dengan penuh syukur.';
  const items = (w.gifts || []).map((g) => `
    <div class="t03-gift" data-reveal>
      ${cornerSprig()}
      <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
      <p class="number">${esc(g.account_number)}</p>
      <p class="an">a.n. ${esc(g.account_name)}</p>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <button type="button" class="t03-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin Nomor</button>
    </div>`).join('');
  return `${secOpen('gift')}
    ${kicker('Tanda Kasih')}
    <h2 class="t03-h" data-reveal>Wedding <em>Gift</em></h2>
    <p class="t03-lead" data-reveal>${esc(note)}</p>
    <div class="t03-gifts">${items || `<p class="t03-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}</div>
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const note = c.note || '';
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${kicker('Lokasi')}
    <h2 class="t03-h" data-reveal>Denah <em>Lokasi</em> Acara</h2>
    ${note ? `<p class="t03-lead" data-reveal>${esc(note)}</p>` : ''}
    ${evs.map((ev) => `
      <div class="t03-venue" data-reveal>
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p class="vname">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="vaddr">${esc(ev.address)}</p>` : ''}
        ${ev.maps_url ? `<a class="t03-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ''}
      </div>`).join('') || `<p class="t03-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${kicker('Dresscode')}
    <h2 class="t03-h" data-reveal>Busana <em>Acara</em></h2>
    <div class="t03-dress" data-reveal>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${items.map((it) => `<div class="dc-item"><strong>${esc(it.label || '')}</strong><span>${esc(it.text || '')}</span></div>`).join('')}
      ${!text && !items.length ? `<p class="t03-lead">Berpakaianlah dengan rapi, sopan, dan nyaman.</p>` : ''}
    </div>
    ${leafDivider()}
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${kicker('Informasi')}
    <h2 class="t03-h" data-reveal>Catatan <em>untuk</em> Tamu</h2>
    ${text ? `<p class="t03-info-text" data-reveal>${esc(text)}</p>` : ''}
    <div class="t03-infos">
      ${items.map((it) => `
        <div class="t03-info-item" data-reveal>
          <h4>${esc(it.title || '')}</h4>
          <p>${esc(it.text || '')}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function sClosing(w) {
  const c = cfgFor(w, 'closing');
  const { bride, groom } = coupleNames(w);
  const text = c.text || 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai.';
  const shareText = c.share_text || `Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan ${bride} & ${groom}.`;
  const first = (w.events || [])[0];
  const dateShort = first ? fmtDate(first.event_date) : '';
  return `${secOpen('closing')}<div class="t03-closing">
    ${kicker('Penutup')}
    ${leafDivider()}
    <p class="thanks" data-reveal>${esc(text)}</p>
    <p class="sign" data-reveal>${esc(bride)} <em>&amp;</em> ${esc(groom)}</p>
    <div class="t03-share" data-reveal>
      <button type="button" class="t03-btn ghost t03-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
        <span>Bagikan Undangan</span>
      </button>
      <button type="button" class="t03-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">
        <span>Konfirmasi Kehadiran</span>
      </button>
    </div>
    <p class="t03-colophon" data-reveal>${esc(initials(bride, groom))}${dateShort ? ' · ' + esc(dateShort) : ''}</p>
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
