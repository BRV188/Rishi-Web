'use strict';

/* ── Circle cursor ── */
const ring = document.getElementById('cursor-ring');
const dot  = document.getElementById('cursor-dot');
if (ring && window.matchMedia('(pointer: fine)').matches) {
  let rx = window.innerWidth / 2, ry = window.innerHeight / 2;
  let mx = rx, my = ry;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function animRing() {
    rx += (mx - rx) * 0.10;
    ry += (my - ry) * 0.10;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-link'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-link'));
  });
}

/* ────────────────────────────────────
   SCRAMBLE TEXT
──────────────────────────────────── */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!#@&*%';

function scramble(el) {
  const target = el.dataset.target || el.textContent.trim();
  let frame = null;
  let iter  = 0;
  const total = target.replace(/\s/g, '').length;
  const speed = 1.8;

  el.classList.add('ready');

  clearInterval(frame);
  frame = setInterval(() => {
    el.textContent = target
      .split('')
      .map((ch, i) => {
        if (ch === ' ' || ch === "'") return ch;
        const nonSpaceIdx = target.slice(0, i + 1).replace(/[\s']/g, '').length - (ch === ' ' || ch === "'" ? 1 : 0);
        if (nonSpaceIdx < Math.floor(iter)) return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join('');

    if (iter >= total) {
      clearInterval(frame);
      el.textContent = target;
    }
    iter += speed;
  }, 32);
}

/* ────────────────────────────────────
   INTERSECTION OBSERVER — headings
──────────────────────────────────── */
const headings = Array.from(document.querySelectorAll('.js-scramble'));

/* Hero fires on load after a short delay */
window.addEventListener('load', () => {
  if (headings[0]) setTimeout(() => scramble(headings[0]), 280);
});

/* Remaining headings fire on scroll */
const headingObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    scramble(entry.target);
    const rule = entry.target.nextElementSibling;
    if (rule && rule.classList.contains('heading-rule')) {
      setTimeout(() => rule.classList.add('animate'), 380);
    }
    headingObserver.unobserve(entry.target);
  });
}, { threshold: 0.25 });

headings.slice(1).forEach(el => {
  el.classList.add('ready');
  headingObserver.observe(el);
});

/* ────────────────────────────────────
   INTERSECTION OBSERVER — work rows
──────────────────────────────────── */
const workRows = document.querySelectorAll('.work-row');

const rowObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const siblings = Array.from(entry.target.parentElement.children);
    const idx = siblings.indexOf(entry.target);
    setTimeout(() => entry.target.classList.add('in-view'), idx * 90);
    rowObserver.unobserve(entry.target);
  });
}, { threshold: 0.15 });

workRows.forEach(row => rowObserver.observe(row));

/* ────────────────────────────────────
   INTERSECTION OBSERVER — reveal-up elements
──────────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal-up');

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in-view');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.25 });

revealEls.forEach(el => revealObserver.observe(el));

/* ────────────────────────────────────
   PROJECT VIEWER (modal)
   Cards stay real links to YouTube, so without JS they still work —
   this only intercepts the click when JS is available and swaps it
   for an in-page <dialog> playing the YouTube embed.
──────────────────────────────────── */
const viewer      = document.getElementById('viewer');
const viewerFrame = document.getElementById('viewer-iframe');
const viewerClose = document.querySelector('.viewer-close');
const viewerIdx   = document.getElementById('viewer-index');
const viewerTitle = document.getElementById('viewer-title');
const viewerCat   = document.getElementById('viewer-cat');
const projectCards = document.querySelectorAll('.project-card[data-video-id]');

if (viewer && viewerFrame && projectCards.length) {
  let lastFocused = null;

  /* Build the embed URL from the 11-char ID. youtube-nocookie is the
     privacy-preserving host and behaves the same as youtube.com/embed. */
  const embedSrc = id =>
    `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

  projectCards.forEach(card => {
    card.addEventListener('click', e => {
      /* Let people open in a new tab with ctrl/cmd/shift/middle-click. */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      e.preventDefault();

      const id   = card.dataset.videoId;
      const list = Array.from(projectCards);
      const pos  = list.indexOf(card) + 1;

      viewerIdx.textContent   = String(pos).padStart(2, '0');
      viewerTitle.textContent = card.dataset.title || '';
      viewerCat.textContent   = card.dataset.category || '';

      lastFocused = card;
      viewerFrame.src = embedSrc(id);
      viewer.showModal();

      /* Lock background scroll so the wheel does not scroll the page
         behind the modal. Compensate for the scrollbar width so the
         layout does not jump sideways as it disappears. */
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (gap > 0) document.body.style.paddingRight = gap + 'px';

      /* Shift focus into the dialog so the next Tab lands on the close
         button rather than continuing behind the modal. */
      viewerClose.focus();
    });
  });

  const unlockScroll = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  viewerClose.addEventListener('click', () => viewer.close());

  /* Click outside the dialog content closes it. The click target is the
     <dialog> itself only when the backdrop was hit, because clicks on
     .viewer-inner bubble up from the inner element instead. */
  viewer.addEventListener('click', e => {
    if (e.target === viewer) viewer.close();
  });

  /* ESC is handled natively by <dialog>, but tearing down the iframe is
     ours: leaving a src attached keeps audio playing behind the closed
     modal. An empty src must NOT be used here — it resolves against the
     document and reloads this very page inside the iframe. */
  viewer.addEventListener('close', () => {
    unlockScroll();
    viewerFrame.removeAttribute('src');
    viewerFrame.src = 'about:blank';
    if (lastFocused) lastFocused.focus();
  });
}
