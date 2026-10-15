/* public/templates/t02/template.js — Modern Minimalist
 * ES module. Kontrak (§5): export function render(w, root), export const opening.
 * w = data GET /api/public/wedding/:slug (§4.8). Semua teks di-escape (anti-XSS).
 * Section 'cover' milik shell (sampul pembuka); di sini di-skip.
 */
export const opening = 'fade';

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
function fmtDateShort(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    .toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', '.');
}
function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5).replace(':', '.');
}
function firstLetter(s) { return (String(s || '').trim()[0] || '·').toUpperCase(); }
function initials(a, b) { return firstLetter(a) + firstLetter(b); }
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
  if (document.getElementById('tpl-t02-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tpl-t02-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Newsreader:ital,wght@1,400;1,500&display=swap';
  document.head.appendChild(l);
}
/* Placeholder foto geometris (SVG murni). */
function photoSVG(label, mono) {
  return `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(label || 'Foto')}">` +
    `<rect width="400" height="400" fill="#f3f3f0"/>` +
    `<rect x="0" y="0" width="400" height="400" fill="none" stroke="#e2e2dc" stroke-width="2"/>` +
    `<line x1="0" y1="200" x2="400" y2="200" stroke="#e2e2dc" stroke-width="1"/>` +
    `<line x1="200" y1="0" x2="200" y2="400" stroke="#e2e2dc" stroke-width="1"/>` +
    `<rect x="140" y="140" width="120" height="120" fill="#161616"/>` +
    `<text x="200" y="218" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="52" fill="#fbfbfa">${esc(mono)}</text>` +
    `<text x="200" y="330" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" letter-spacing="4" fill="#6e6e6e">${esc((label || '').toUpperCase().slice(0, 24))}</text>` +
    `</svg>`;
}

/* ---------- potongan section ---------- */
function head(no, label, headline, sub) {
  return `<div class="t02-head" data-reveal>
    <span class="t02-index">${esc(no)}</span>
    <span class="t02-label">${esc(label)}</span>
    ${headline ? `<h2 class="t02-headline">${headline}</h2>` : ''}
    ${sub ? `<p class="t02-sub">${esc(sub)}</p>` : ''}
  </div>`;
}
function secOpen(id) { return `<section class="t02-sec t02-${id}" id="sec-${id}">`; }

function sHero(w) {
  const c = cfgFor(w, 'hero');
  const { bride, groom } = coupleNames(w);
  const first = (w.events || [])[0] || {};
  const greeting = c.greeting || "Assalamu'alaikum warahmatullahi wabarakatuh";
  const text = c.text || 'Dengan penuh syukur, kami mengundang Anda untuk hadir dan memberikan doa restu pada acara pernikahan kami.';
  return `${secOpen('hero')}<div class="t02-hero">
    <p class="greet" data-reveal>${esc(greeting)}</p>
    <h1 data-reveal>${esc(bride)} <em>&amp;</em> ${esc(groom)}</h1>
    <p class="t02-sub" data-reveal style="margin-bottom:34px">${esc(text)}</p>
    <div class="t02-meta" data-reveal>
      <div><b>Tanggal</b><span>${esc(fmtDate(first.event_date) || 'Segera diumumkan')}</span></div>
      <div><b>Waktu</b><span>${first.start_time ? 'Pukul ' + esc(fmtTime(first.start_time)) + ' WIB' : '—'}</span></div>
      <div><b>Tempat</b><span>${esc(first.venue_name || '—')}</span></div>
    </div>
  </div></section>`;
}

function sQuote(w) {
  const c = cfgFor(w, 'quote');
  const text = c.text || 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.';
  const source = c.source || 'QS. Ar-Rūm: 21';
  return `${secOpen('quote')}<div class="t02-quote" data-reveal>
    <p>&ldquo;${esc(text)}&rdquo;</p>
    <cite>${esc(source)}</cite>
  </div></section>`;
}

function sCouple(w) {
  const c = cfgFor(w, 'couple');
  const { bride, groom } = coupleNames(w);
  const person = (name, parents, photo, role) => `
    <div class="person" data-reveal>
      <div class="t02-photo">${photo
        ? `<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover">`
        : photoSVG(name, initials(name, ''))}</div>
      <h3>${esc(name)}</h3>
      <p class="role">${esc(role)}</p>
      ${parents ? `<p class="parents">${esc(parents)}</p>` : ''}
    </div>`;
  return `${secOpen('couple')}
    ${head('01', 'Mempelai', 'Dua orang, <em>satu cerita.</em>')}
    <div class="t02-couple-grid">
      ${person(bride, c.bride_parents, c.bride_photo, 'Mempelai Wanita')}
      ${person(groom, c.groom_parents, c.groom_photo, 'Mempelai Pria')}
    </div>
  </section>`;
}

function sParents(w) {
  const c = cfgFor(w, 'parents');
  const text = c.text || 'Kami yang berbahagia, keluarga kedua mempelai.';
  const fams = Array.isArray(c.families) ? c.families : [];
  return `${secOpen('parents')}
    ${head('02', 'Keluarga', 'Dengan hormat, <em>keluarga kami.</em>', text)}
    ${fams.map((f) => `
      <div class="t02-info" data-reveal>
        <h4>${esc(f.relation || 'Keluarga')}</h4>
        <p>${esc(f.name || '')}</p>
      </div>`).join('')}
  </section>`;
}

function sEvents(w) {
  const c = cfgFor(w, 'events');
  const items = (w.events || []).map((ev) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.event_date || '');
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    return `<div class="t02-ev" data-reveal>
      <div class="d"><b>${d ? esc(String(d.getDate()).padStart(2, '0')) : '—'}</b>${d ? esc(d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })) : ''}</div>
      <div>
        <h3>${esc(ev.title)}</h3>
        ${ev.start_time ? `<p class="t">${esc(fmtDate(ev.event_date))} · Pukul ${esc(fmtTime(ev.start_time))}${ev.end_time ? '–' + esc(fmtTime(ev.end_time)) : ''} WIB</p>` : ''}
        ${ev.venue_name ? `<p class="v">${esc(ev.venue_name)}</p>` : ''}
        ${ev.address ? `<p class="a">${esc(ev.address)}</p>` : ''}
      </div>
      <div>${ev.maps_url ? `<a class="t02-map" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Peta ↗</a>` : ''}</div>
    </div>`;
  }).join('');
  return `${secOpen('events')}
    ${head('03', 'Jadwal', 'Waktu <em>&amp;</em> tempat.', c.note || '')}
    ${items || `<p class="t02-empty" data-reveal>Jadwal acara akan diumumkan segera.</p>`}
  </section>`;
}

function sCountdown(w) {
  const c = cfgFor(w, 'countdown');
  return `${secOpen('countdown')}
    ${head('04', 'Hitung mundur', 'Menghitung <em>hari.</em>', c.text || 'Sampai jumpa di hari bahagia.')}
    <div class="t02-count" data-countdown data-reveal>
      <div><b data-cd-d>00</b><span>Hari</span></div>
      <div><b data-cd-h>00</b><span>Jam</span></div>
      <div><b data-cd-m>00</b><span>Menit</span></div>
      <div><b data-cd-s>00</b><span>Detik</span></div>
    </div>
    <p class="t02-count-done" data-cd-done hidden>Acara telah berlangsung. Terima kasih atas doa dan kehadiran Anda.</p>
  </section>`;
}

function sStory(w) {
  const c = cfgFor(w, 'story');
  const items = Array.isArray(c.items) ? c.items : [];
  return `${secOpen('story')}
    ${head('05', 'Cerita kami', 'Bagaimana <em>semua bermula.</em>')}
    ${items.length ? items.map((it) => `
      <div class="t02-story-row" data-reveal>
        <span class="when">${esc(it.date || '—')}</span>
        <div><h3>${esc(it.title || '')}</h3><p>${esc(it.text || '')}</p></div>
      </div>`).join('')
      : `<p class="t02-empty" data-reveal>Cerita kami akan segera ditulis di sini.</p>`}
  </section>`;
}

function sGallery(w) {
  const c = cfgFor(w, 'gallery');
  const imgs = w.gallery || [];
  return `${secOpen('gallery')}
    ${head('06', 'Galeri', (c.title || 'Galeri momen') + '.')}
    ${imgs.length ? `<div class="t02-gal">${imgs.map((g, i) => `
      <figure data-reveal>
        <img src="${esc(g.url)}" alt="${esc(g.caption || 'Galeri foto ' + (i + 1))}" loading="lazy">
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}</div>`
      : `<p class="t02-empty" data-reveal>Galeri foto akan segera hadir.</p>`}
  </section>`;
}

function sRsvp(w) {
  const c = cfgFor(w, 'rsvp');
  const opts = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang</option>`).join('');
  return `${secOpen('rsvp')}
    ${head('07', 'RSVP', 'Konfirmasi <em>kehadiran.</em>', c.note || 'Mohon konfirmasi kehadiran Anda melalui formulir berikut.')}
    <form id="rsvp-form" class="t02-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="rsvp-name">Nama lengkap</label>
        <input id="rsvp-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Nama Anda">
      </div>
      <div class="inv-field">
        <label>Kehadiran</label>
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
        <textarea id="rsvp-msg" name="message" maxlength="500" placeholder="Pesan untuk kedua mempelai"></textarea>
      </div>
      <button type="submit" class="t02-btn">Kirim <span aria-hidden="true">→</span></button>
    </form>
  </section>`;
}

function sWishes(w) {
  const c = cfgFor(w, 'wishes');
  return `${secOpen('wishes')}
    ${head('08', 'Ucapan', (c.title || 'Ucapan & doa') + '.', c.note || 'Kirim doa terbaik untuk kedua mempelai.')}
    <form id="wish-form" class="t02-form" data-reveal novalidate>
      <p class="inv-form-error" role="alert"></p>
      <div class="inv-field">
        <label for="wish-name">Nama</label>
        <input id="wish-name" name="name" type="text" maxlength="100" autocomplete="name" placeholder="Nama Anda">
      </div>
      <div class="inv-field">
        <label for="wish-msg">Ucapan</label>
        <textarea id="wish-msg" name="message" maxlength="500" placeholder="Tulis ucapan Anda (maks. 500 karakter)"></textarea>
      </div>
      <button type="submit" class="t02-btn ghost">Kirim ucapan</button>
    </form>
    <div id="wishes-list" data-reveal></div>
    <div style="margin-top:24px" data-reveal>
      <button type="button" id="wishes-more" class="t02-btn ghost">Muat lebih banyak</button>
    </div>
  </section>`;
}

function sGift(w) {
  const c = cfgFor(w, 'gift');
  const items = (w.gifts || []).map((g) => `
    <div class="t02-gift" data-reveal>
      <div>
        <p class="provider">${esc(g.provider)}${g.type && g.type !== 'bank' ? ' · ' + esc(g.type) : ''}</p>
        <p class="number">${esc(g.account_number)}</p>
        <p class="an">a.n. ${esc(g.account_name)}</p>
      </div>
      <button type="button" class="t02-copy" data-action="copy-text" data-copy="${esc(g.account_number)}">Salin</button>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
    </div>`).join('');
  return `${secOpen('gift')}
    ${head('09', 'Tanda kasih', 'Wedding <em>gift.</em>', c.note || 'Doa restu Anda adalah hadiah terindah. Jika berkenan memberi tanda kasih, kami sediakan dengan penuh terima kasih.')}
    ${items || `<p class="t02-empty" data-reveal>Informasi tanda kasih akan diumumkan segera.</p>`}
  </section>`;
}

function sLocation(w) {
  const c = cfgFor(w, 'location');
  const evs = (w.events || []).filter((e) => e.venue_name || e.address);
  return `${secOpen('location')}
    ${head('10', 'Lokasi', 'Denah <em>lokasi.</em>', c.note || '')}
    ${evs.map((ev) => `
      <div class="t02-loc" data-reveal>
        <h3>${esc(ev.title)}</h3>
        ${ev.venue_name ? `<p><strong style="color:var(--ink)">${esc(ev.venue_name)}</strong>${ev.address ? '<br>' + esc(ev.address) : ''}</p>` : ''}
        ${ev.maps_url ? `<a class="t02-btn ghost" href="${esc(ev.maps_url)}" target="_blank" rel="noopener">Buka Google Maps <span aria-hidden="true">↗</span></a>` : ''}
      </div>`).join('') || `<p class="t02-empty" data-reveal>Detail lokasi akan diumumkan segera.</p>`}
  </section>`;
}

function sDresscode(w) {
  const c = cfgFor(w, 'dresscode');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('dresscode')}
    ${head('11', 'Dresscode', 'Panduan <em>berpakaian.</em>')}
    ${text && !items.length ? `<p class="t02-dc-text" data-reveal>${esc(text)}</p>` : ''}
    ${items.length ? `<div class="t02-dc">${items.map((it) => `
      <div data-reveal><b>${esc(it.label || '')}</b><p>${esc(it.text || '')}</p></div>`).join('')}</div>`
      : (!text ? `<p class="t02-dc-text" data-reveal>Berpakaianlah dengan sopan dan nyaman.</p>` : '')}
  </section>`;
}

function sInfo(w) {
  const c = cfgFor(w, 'info');
  const items = Array.isArray(c.items) ? c.items : [];
  const text = c.text || '';
  return `${secOpen('info')}
    ${head('12', 'Informasi', 'Hal yang <em>perlu diketahui.</em>')}
    ${text ? `<p class="t02-dc-text" data-reveal style="margin-bottom:20px">${esc(text)}</p>` : ''}
    ${items.map((it, i) => `
      <div class="t02-info" data-reveal>
        <h4>${esc(it.title || 'Catatan ' + (i + 1))}</h4>
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
  return `${secOpen('closing')}<div class="t02-close-grid">
    <div data-reveal>
      <p class="t02-sign">${esc(bride)} &amp; ${esc(groom)}</p>
      <p class="t02-thanks">${esc(text)}</p>
    </div>
    <div data-reveal>
      <div class="t02-share">
        <button type="button" class="t02-btn t02-wa" data-action="share-wa" data-share-text="${esc(shareText)}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.4-.2z"/></svg>
          <span>Bagikan</span>
        </button>
        <button type="button" class="t02-btn ghost" data-action="scroll-to" data-target="#sec-rsvp">RSVP</button>
      </div>
    </div>
  </div>
  <div class="t02-colophon" data-reveal>
    <span>${esc(initials(bride, groom))}</span>
    <span>${first ? esc(fmtDateShort(first.event_date)) : ''}</span>
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
