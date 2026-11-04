/*
 * Sea life: glowing creatures that now and then swim across the background.
 * Purely decorative: they sit behind everything, ignore taps, and are left
 * out entirely when the player has asked for reduced motion.
 */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ocean = document.querySelector('.ocean');
  if (!ocean || !Element.prototype.animate) return;
  const layer = document.createElement('div');
  layer.className = 'sea-life';
  ocean.appendChild(layer);

  const MAX_AT_ONCE = 3;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const palette = () => {
    const css = getComputedStyle(document.documentElement);
    const list = [];
    for (let i = 1; i <= 10; i++) { const c = css.getPropertyValue(`--c${i}`).trim(); if (c) list.push(c); }
    return list.length ? list : ['#5ef2ff'];
  };

  // Each creature faces right in its own drawing. `w` is its width in px at
  // depth 1; `speed` is how many seconds it takes to cross a 400px screen.
  const fish = '<svg viewBox="0 0 60 30" class="wiggle"><path d="M10 15 C18 4 38 3 52 15 C38 27 18 26 10 15Z"/>' +
    '<path class="tail" d="M12 15 L1 5 L4 15 L1 25Z"/><circle class="eye" cx="44" cy="13" r="2"/></svg>';
  const KINDS = {
    school: {
      w: 26, speed: 9, weight: 4,
      html: () => {
        const n = 3 + Math.floor(Math.random() * 5);
        let out = '';
        for (let i = 0; i < n; i++) {
          out += `<div class="member" style="left:${(i % 3) * 30 + rand(-6, 6)}%;top:${i * (90 / n) + rand(-5, 5)}%;animation-delay:${rand(-1, 0).toFixed(2)}s">${fish}</div>`;
        }
        return `<div class="school">${out}</div>`;
      },
      size: (w) => [w * 3.4, w * 2.6],
    },
    jelly: {
      w: 34, speed: 30, weight: 3, rises: true,
      html: () => '<svg viewBox="0 0 40 70" class="pulse"><path class="bell" d="M4 24 C4 6 36 6 36 24 C30 21 10 21 4 24Z"/>' +
        '<g class="tentacles"><path d="M10 24 C6 36 14 44 9 58"/><path d="M17 24 C14 38 21 48 16 66"/>' +
        '<path d="M24 24 C27 38 19 48 24 66"/><path d="M31 24 C35 36 27 44 31 58"/></g></svg>',
      size: (w) => [w, w * 1.75],
    },
    turtle: {
      w: 70, speed: 26, weight: 2,
      html: () => '<svg viewBox="0 0 90 56"><g class="flipper front"><path d="M56 17 C52 6 42 0 30 1 C38 7 45 13 48 19Z"/></g>' +
        '<g class="flipper back"><path d="M56 39 C52 50 42 56 30 55 C38 49 45 43 48 37Z"/></g>' +
        '<path d="M22 32 C16 38 10 40 6 40 C10 35 14 31 20 29Z"/>' +
        '<ellipse cx="42" cy="28" rx="24" ry="15"/><path class="shell" d="M26 28 L42 18 L58 28 L42 38Z M42 18 L42 38 M26 28 L58 28"/>' +
        '<circle cx="72" cy="27" r="7"/><circle class="eye" cx="75" cy="25" r="1.6"/><path d="M18 28 L8 30 L18 32Z"/></svg>',
      size: (w) => [w, w * 0.62],
    },
    manta: {
      w: 90, speed: 22, weight: 2,
      html: () => '<svg viewBox="0 0 100 50" class="flap"><path d="M88 25 C87 19 80 13 58 1 C56 12 48 20 36 25 C48 30 56 38 58 49 C80 37 87 31 88 25Z"/>' +
        '<path class="fin" d="M87 21 C91 20 94 18 96 16 M87 29 C91 30 94 32 96 34"/>' +
        '<path class="tail" d="M37 25 L4 24"/><circle class="eye" cx="84" cy="20" r="1.5"/><circle class="eye" cx="84" cy="30" r="1.5"/></svg>',
      size: (w) => [w, w * 0.5],
    },
    seahorse: {
      w: 26, speed: 40, weight: 1,
      html: () => '<svg viewBox="0 0 40 70" class="bob"><path d="M18 8 C26 4 33 8 32 14 L40 16 L31 19 C34 30 31 40 22 46 C15 51 15 60 21 62 C26 63 27 57 23 56"/>' +
        '<path class="fin" d="M18 26 C12 28 11 36 16 38"/><circle class="eye" cx="25" cy="12" r="1.8"/></svg>',
      size: (w) => [w, w * 1.75],
    },
    whale: {
      w: 280, speed: 50, weight: 1, far: true,
      html: () => '<svg viewBox="0 0 200 70" class="glide"><path d="M16 40 C34 12 118 8 168 28 C184 34 194 32 198 26 C196 40 188 46 174 44 C140 62 62 66 16 40Z"/>' +
        '<path class="tail" d="M20 40 L2 24 L8 40 L2 56Z"/><circle class="eye" cx="170" cy="38" r="2.2"/>' +
        '<path class="fin" d="M120 50 C116 60 106 64 98 64 C104 58 108 54 110 50Z"/></svg>',
      size: (w) => [w, w * 0.35],
    },
  };
  const bag = Object.entries(KINDS).flatMap(([name, k]) => Array(k.weight).fill(name));
  let alive = 0;
  let lastKind = null;

  function spawn() {
    if (document.hidden || alive >= MAX_AT_ONCE) return;
    let name = pick(bag);
    if (name === lastKind) name = pick(bag);
    lastKind = name;
    const kind = KINDS[name];
    // Depth: far creatures are smaller, fainter, slower and a little blurred.
    const depth = kind.far ? rand(0.9, 1.2) : rand(0.55, 1.15);
    const [w, h] = kind.size(kind.w * depth);
    const vw = window.innerWidth, vh = window.innerHeight;
    const el = document.createElement('div');
    el.className = `creature ${name}`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.color = pick(palette());
    el.style.opacity = (kind.far ? 0.16 : 0.22 + 0.3 * (depth - 0.55)).toFixed(2);
    if (depth < 0.75 || kind.far) el.style.filter = `blur(${kind.far ? 1.5 : 0.8}px)`;
    const goingLeft = Math.random() < 0.5;
    el.innerHTML = `<div class="facing" style="transform:scaleX(${goingLeft ? -1 : 1})">${kind.html()}</div>`;
    layer.appendChild(el);
    alive++;

    // A gently wavy path across (or, for jellyfish, up) the screen.
    const frames = [];
    const steps = 8;
    const sway = rand(10, 30) * depth;
    const phase = rand(0, Math.PI * 2);
    let duration;
    if (kind.rises) {
      const x = rand(0.05, 0.85) * vw;
      const drift = rand(-60, 60);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        frames.push({ transform: `translate(${x + drift * t + Math.sin(phase + t * 5) * sway}px, ${vh + 20 - t * (vh + h + 40)}px)` });
      }
      duration = kind.speed * 1000 * (vh / 700) / depth;
    } else {
      const y = rand(0.08, 0.85) * vh;
      const climb = rand(-0.12, 0.12) * vh;
      const from = goingLeft ? vw + 20 : -w - 20, to = goingLeft ? -w - 20 : vw + 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        frames.push({ transform: `translate(${from + (to - from) * t}px, ${y + climb * t + Math.sin(phase + t * 6) * sway}px)` });
      }
      duration = kind.speed * 1000 * ((vw + w) / 400) / Math.sqrt(depth);
    }
    const anim = el.animate(frames, { duration: duration * rand(0.85, 1.15), easing: 'linear' });
    anim.onfinish = () => { el.remove(); alive--; };
  }

  function loop() {
    spawn();
    setTimeout(loop, rand(5000, 11000));
  }
  setTimeout(loop, 1500);
})();
