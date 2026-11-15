/*
 * Pearls pouring into the pearl count: whenever pearls are won or bought, they fly
 * from where they were won (the Level complete box's big pearl, a startled diver, a
 * fish that was fed...) up to the pearl count on screen, shrinking from their size
 * there to the count's pearl, and the count ticks up as they land.
 *
 *   ArrowPearls.shown()           the number the pearl counts should show now
 *   ArrowPearls.onShow(fn)        fn(n) whenever that changes
 *   ArrowPearls.hold()            keep the counts where they are (pearls about to pour)
 *   ArrowPearls.pour(from, opts)  pour what's been added since: from an element, or
 *                                 { x, y, size } on screen; opts.to picks the count
 *   ArrowPearls.release()         stop pouring and show the real total
 *
 * Add the pearls to the wallet first, then call pour() straight away (the counts wait a
 * moment before following the wallet, so they don't jump ahead of the pour).
 */
(function (root) {
  'use strict';
  const W = root.ArrowWallet;
  if (!W) return;
  const subs = [];
  let shown = W.pearls();
  let frozen = false;
  const flights = new Set();
  const show = (n) => { shown = n; subs.forEach((fn) => fn(n)); };

  // Follow the wallet, unless pearls are pouring (checked a moment later, so a pour
  // started straight after adding them is in time).
  W.onChange(() => (root.queueMicrotask || setTimeout)(() => { if (!frozen) show(W.pearls()); }));

  function release() {
    for (const f of [...flights]) f.stop(true);
    frozen = false;
    show(W.pearls());
  }

  /** The pearl count on show: the game's, the aquarium's or the menu's. */
  function visibleCount() {
    for (const sel of ['#hudPearls', '#aqPearls', '#menu .pearl-chip']) {
      const el = document.querySelector(sel);
      const scr = el && el.closest('.screen');
      if (el && el.offsetParent && (!scr || scr.classList.contains('active'))) return el;
    }
    return null;
  }

  function pour(from, opts = {}) {
    frozen = true;
    const gain = W.pearls() - shown - [...flights].reduce((a, f) => a + f.left(), 0);
    const chip = opts.to || visibleCount();
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let a = from && from.getBoundingClientRect ? from.getBoundingClientRect() : from;
    if (a && a.x !== undefined && a.width === undefined) a = { left: a.x - (a.size || 16) / 2, top: a.y - (a.size || 16) / 2, width: a.size || 16, height: a.size || 16 };
    if (gain <= 0 || !chip || !chip.offsetParent || !a || reduce) { if (!flights.size) release(); return; }
    const b = chip.getBoundingClientRect();

    // On top of everything (the count may be under a dialog's shade): a copy of the
    // count, and the pearls.
    const layer = document.createElement('div');
    layer.className = 'pearl-pour';
    const ghost = chip.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    Object.assign(ghost.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    layer.appendChild(ghost);
    document.body.appendChild(layer);
    const num = ghost.querySelector('.pearl ~ span') || ghost.lastElementChild;
    const fmt = chip.dataset.short ? short : (n) => n.toLocaleString();
    const tp = ghost.querySelector('.pearl').getBoundingClientRect();
    const sx = a.left + a.width / 2, sy = a.top + a.height / 2, tx = tp.left + tp.width / 2, ty = tp.top + tp.height / 2;
    const startSize = Math.max(10, Math.min(48, a.width)), endScale = tp.width / startSize;

    const n = Math.max(4, Math.min(24, gain));
    let landed = 0, added = 0;
    const timers = [];
    const flight = {
      left: () => gain - added,
      stop(quiet) {
        timers.forEach(clearTimeout);
        layer.remove();
        flights.delete(flight);
        if (!quiet && !flights.size) release();
      },
    };
    flights.add(flight);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'pearl pour-pearl';
      p.style.width = p.style.height = `${startSize}px`;
      layer.appendChild(p);
      const t = 650 + Math.random() * 200, delay = i * Math.min(70, 1100 / n);
      // Up and across in a curve, spilling a little to one side first, and shrinking.
      const midX = sx + (tx - sx) * 0.3 + (Math.random() - 0.5) * 80, midY = Math.min(sy, ty) + (sy - ty) * 0.35 - 30;
      const midScale = 1 + (endScale - 1) * 0.45;
      p.animate([
        { transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.05 },
        { transform: `translate(${midX}px, ${midY}px) translate(-50%, -50%) scale(${midScale})`, opacity: 1, offset: 0.45 },
        { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(${endScale})`, opacity: 1 },
      ], { duration: t, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
      timers.push(setTimeout(() => {
        p.remove();
        landed++;
        const step = Math.round((gain * landed) / n) - added;
        added += step;
        show(shown + step);
        num.textContent = fmt(shown);
        ghost.classList.remove('bump'); void ghost.offsetWidth; ghost.classList.add('bump');
        if (root.ArrowAudio && landed % 3 === 1) root.ArrowAudio.play('nibble');
        if (landed === n) timers.push(setTimeout(() => flight.stop(), 450));
      }, delay + t));
    }
  }

  /** A short count, to fit small spaces: 12.3k, 125k. */
  function short(n) {
    return n >= 100000 ? `${Math.floor(n / 1000)}k` : n >= 10000 ? `${(Math.floor(n / 100) / 10).toFixed(1)}k` : n.toLocaleString();
  }

  root.ArrowPearls = {
    shown: () => shown,
    onShow: (fn) => subs.push(fn),
    hold: () => { frozen = true; },
    release,
    pour,
    short,
  };
})(window);
