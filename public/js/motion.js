/* public/js/motion.js
 * Sistem motion reusable untuk halaman publik.
 * Prinsip: CSS transition + IntersectionObserver saja (tanpa library animasi).
 * - initReveals(): reveal SEKALI untuk [data-reveal], lalu unobserve.
 * - Hormati prefers-reduced-motion: elemen langsung tampil, tanpa transisi.
 * - Hanya menganimasikan properti murah (opacity, transform); tidak ada
 *   animasi properti mahal (box-shadow, filter, layout) yang berjalan terus.
 */

let _reduced = null;

/** true bila user meminta gerakan diminimalkan. */
export function prefersReducedMotion() {
  if (_reduced === null) {
    _reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return _reduced;
}

/**
 * Amati semua [data-reveal] di dalam root. Saat masuk viewport, tambahkan
 * .is-visible SEKALI lalu berhenti mengamati (tidak animasi ulang saat scroll).
 */
export function initReveals(root = document) {
  const els = Array.from(root.querySelectorAll('[data-reveal]:not(.is-visible)'));
  if (els.length === 0) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );

  els.forEach((el) => io.observe(el));
}

/**
 * Stagger singkat: beri --reveal-delay berjenjang pada anak-anak container.
 * Dipakai untuk grup (mis. daftar acara, galeri) agar reveal terasa berurutan.
 */
export function staggerChildren(container, selector = '[data-reveal]', stepMs = 70, maxMs = 420) {
  if (!container) return;
  const kids = Array.from(container.querySelectorAll(selector));
  kids.forEach((el, i) => {
    if (!el.style.getPropertyValue('--reveal-delay')) {
      el.style.setProperty('--reveal-delay', Math.min(i * stepMs, maxMs) + 'ms');
    }
  });
}

/**
 * Tampilkan elemen segera tanpa menunggu observer (untuk konten kritis
 * seperti sampul pembuka). Tetap aman untuk reduced-motion.
 */
export function revealNow(root = document) {
  root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => {
    el.classList.add('is-visible');
  });
}
