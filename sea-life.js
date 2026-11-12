/*
 * Sea life: glowing creatures that now and then swim across the background.
 * Tap one and it darts away; a startled diver drops 10-30 pearls. The
 * "Sea creatures" setting turns them off (it starts off for players whose
 * device asks for reduced motion).
 */
(function () {
  'use strict';
  const Settings = window.ArrowSettings;
  const wanted = () => !Settings || Settings.get('creatures');
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

  // Each creature faces right in its own drawing. `w` is its width at depth 1
  // as a share of the screen (for a school, the width of one fish), so whales
  // dwarf mantas, which dwarf fish. `speed` is seconds to cross the screen once.
  const fish = '<svg viewBox="0 0 60 30" class="wiggle"><path d="M10 15 C18 4 38 3 52 15 C38 27 18 26 10 15Z"/>' +
    '<path class="tail" d="M12 15 L1 5 L4 15 L1 25Z"/><circle class="eye" cx="44" cy="13" r="2"/></svg>';
  const KINDS = {
    school: {
      w: 0.13, speed: 12, weight: 4,
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
      w: 0.26, speed: 38, weight: 3, rises: true,
      html: () => '<svg viewBox="0 0 40 70" class="pulse"><path class="bell" d="M4 24 C4 6 36 6 36 24 C30 21 10 21 4 24Z"/>' +
        '<g class="tentacles"><path d="M10 24 C6 36 14 44 9 58"/><path d="M17 24 C14 38 21 48 16 66"/>' +
        '<path d="M24 24 C27 38 19 48 24 66"/><path d="M31 24 C35 36 27 44 31 58"/></g></svg>',
      size: (w) => [w, w * 1.75],
    },
    turtle: {
      w: 0.6, speed: 32, weight: 2,
      html: () => '<svg viewBox="0 0 90 56"><g class="flipper front"><path d="M56 17 C52 6 42 0 30 1 C38 7 45 13 48 19Z"/></g>' +
        '<g class="flipper back"><path d="M56 39 C52 50 42 56 30 55 C38 49 45 43 48 37Z"/></g>' +
        '<path d="M22 32 C16 38 10 40 6 40 C10 35 14 31 20 29Z"/>' +
        '<ellipse cx="42" cy="28" rx="24" ry="15"/><path class="shell" d="M26 28 L42 18 L58 28 L42 38Z M42 18 L42 38 M26 28 L58 28"/>' +
        '<circle cx="72" cy="27" r="7"/><circle class="eye" cx="75" cy="25" r="1.6"/><path d="M18 28 L8 30 L18 32Z"/></svg>',
      size: (w) => [w, w * 0.62],
    },
    manta: {
      w: 0.9, speed: 28, weight: 2,
      html: () => '<svg viewBox="0 0 100 50" class="flap"><path d="M88 25 C87 19 80 13 58 1 C56 12 48 20 36 25 C48 30 56 38 58 49 C80 37 87 31 88 25Z"/>' +
        '<path class="fin" d="M87 21 C91 20 94 18 96 16 M87 29 C91 30 94 32 96 34"/>' +
        '<path class="tail" d="M37 25 L4 24"/><circle class="eye" cx="84" cy="20" r="1.5"/><circle class="eye" cx="84" cy="30" r="1.5"/></svg>',
      size: (w) => [w, w * 0.5],
    },
    seahorse: {
      w: 0.15, speed: 45, weight: 1,
      html: () => '<svg viewBox="0 0 40 70" class="bob"><path d="M18 8 C26 4 33 8 32 14 L40 16 L31 19 C34 30 31 40 22 46 C15 51 15 60 21 62 C26 63 27 57 23 56"/>' +
        '<path class="fin" d="M18 26 C12 28 11 36 16 38"/><circle class="eye" cx="25" cy="12" r="1.8"/></svg>',
      size: (w) => [w, w * 1.75],
    },
    whale: {
      w: 1.8, speed: 60, weight: 1, far: true,
      html: () => '<svg viewBox="0 0 200 70" class="glide"><path d="M16 40 C34 12 118 8 168 28 C184 34 194 32 198 26 C196 40 188 46 174 44 C140 62 62 66 16 40Z"/>' +
        '<path class="tail" d="M20 40 L2 24 L8 40 L2 56Z"/><circle class="eye" cx="170" cy="38" r="2.2"/>' +
        '<path class="fin" d="M120 50 C116 60 106 64 98 64 C104 58 108 54 110 50Z"/></svg>',
      size: (w) => [w, w * 0.35],
    },
    // A shark: pointed snout, tall dorsal fin, a tail that sweeps side to side.
    shark: {
      w: 1.1, speed: 22, weight: 1,
      html: () => '<svg viewBox="0 0 200 76" class="sharkswim"><path d="M30 42 C60 28 120 22 160 30 C178 34 190 38 198 42 C188 46 176 50 160 52 C120 58 60 56 30 42Z"/>' +
        '<path class="dorsal" d="M98 27 L116 3 L128 28Z"/><path class="tail" d="M34 42 L4 14 L14 42 L4 70Z"/>' +
        '<path d="M122 52 L104 72 L134 53Z"/><path class="fin" d="M150 36 L148 46 M155 35 L153 46 M160 35 L158 46"/>' +
        '<path class="fin" d="M174 46 Q181 48 188 45"/><circle class="eye" cx="177" cy="38" r="2.4"/></svg>',
      size: (w) => [w, w * 0.38],
    },
    // An octopus: a round head with big eyes over curling, waving arms. It
    // drifts upwards like a jellyfish (and squirts ink if startled).
    octopus: {
      w: 0.3, speed: 34, weight: 2, rises: true,
      html: () => '<svg viewBox="0 0 80 100" class="octo"><g class="arms">' +
        '<path d="M22 50 C12 64 26 76 12 90 C10 92 8 92 7 90"/><path d="M29 54 C24 70 36 82 27 96"/>' +
        '<path d="M37 56 C36 72 44 84 38 98"/><path d="M44 56 C46 72 38 84 45 98"/>' +
        '<path d="M51 54 C56 70 44 82 53 96"/><path d="M58 50 C68 64 54 76 68 90 C70 92 72 92 73 90"/></g>' +
        '<path class="mantle" d="M40 6 C58 6 66 22 64 38 C62 50 52 56 40 56 C28 56 18 50 16 38 C14 22 22 6 40 6Z"/>' +
        '<circle class="eye" cx="32" cy="40" r="3.2"/><circle class="eye" cx="48" cy="40" r="3.2"/></svg>',
      size: (w) => [w, w * 1.25],
    },
    // A scuba diver: mask, air tank and kicking fins, breathing out bubbles.
    diver: {
      w: 0.5, speed: 50, weight: 1,
      html: () => '<svg viewBox="0 0 160 70" class="diver">' +
        '<g class="leg1"><path class="limb" d="M46 36 L16 28"/><path d="M17 28 L2 18 L5 32Z"/></g>' +
        '<g class="leg2"><path class="limb" d="M46 40 L16 46"/><path d="M17 46 L2 56 L5 42Z"/></g>' +
        '<path d="M40 34 C60 26 100 26 118 31 C125 33 125 42 118 44 C100 48 60 46 40 40Z"/>' +
        '<path d="M62 18 h44 a6 6 0 0 1 0 12 h-44 a6 6 0 0 1 0 -12z"/>' +
        '<path class="limb" d="M108 38 L140 46"/><circle cx="131" cy="32" r="10"/>' +
        '<path class="mask" d="M129 26 h11 a2 2 0 0 1 2 2 v6 a2 2 0 0 1 -2 2 h-11z"/>' +
        '<g class="breath"><circle cx="138" cy="20" r="3"/><circle cx="141" cy="14" r="2.2"/><circle cx="137" cy="8" r="1.6"/></g></svg>',
      size: (w) => [w, w * 0.44],
    },
  };
  const bag = Object.entries(KINDS).flatMap(([name, k]) => Array(k.weight).fill(name));
  let alive = 0;
  let lastKind = null;

  function spawn() {
    if (!wanted() || document.hidden || alive >= MAX_AT_ONCE) return;
    let name = pick(bag);
    if (name === lastKind) name = pick(bag);
    lastKind = name;
    const kind = KINDS[name];
    // Depth: far creatures are smaller, fainter, slower and a little blurred.
    const depth = kind.far ? rand(0.85, 1.15) : rand(0.7, 1.15);
    // The ocean fills the game's screen (a phone-shaped frame on big screens).
    const vw = ocean.clientWidth || window.innerWidth, vh = ocean.clientHeight || window.innerHeight;
    // Measured against the screen, but not absurdly wide on a desktop monitor.
    const base = Math.min(vw, vh * 0.8);
    const [w, h] = kind.size(kind.w * depth * base);
    const el = document.createElement('div');
    el.className = `creature ${name}`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.color = pick(palette());
    el.style.opacity = (kind.far ? 0.18 : 0.24 + 0.3 * (depth - 0.7)).toFixed(2);
    if (depth < 0.85 || kind.far) el.style.filter = `blur(${kind.far ? 2 : 1}px)`;
    const goingLeft = Math.random() < 0.5;
    el.innerHTML = `<div class="facing" style="transform:scaleX(${goingLeft ? -1 : 1})">${kind.html()}</div>`;
    layer.appendChild(el);
    alive++;

    // A gently wavy path across (or, for jellyfish, up) the screen.
    const frames = [];
    const steps = 8;
    const sway = Math.min(40, rand(0.04, 0.12) * h);
    const phase = rand(0, Math.PI * 2);
    let duration;
    if (kind.rises) {
      const x = rand(0.05, 0.85) * vw;
      const drift = rand(-60, 60);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        frames.push({ transform: `translate(${x + drift * t + Math.sin(phase + t * 5) * sway}px, ${vh + 20 - t * (vh + h + 40)}px)` });
      }
      duration = kind.speed * 1000 * ((vh + h) / vh) / depth;
    } else {
      const y = rand(0.08, 0.85) * vh;
      const climb = rand(-0.12, 0.12) * vh;
      const from = goingLeft ? vw + 20 : -w - 20, to = goingLeft ? -w - 20 : vw + 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        frames.push({ transform: `translate(${from + (to - from) * t}px, ${y + climb * t + Math.sin(phase + t * 6) * sway}px)` });
      }
      duration = kind.speed * 1000 * ((vw + w) / vw) / Math.sqrt(depth);
    }
    const anim = el.animate(frames, { duration: duration * rand(0.85, 1.15), easing: 'linear' });
    anim.onfinish = () => { el.remove(); alive--; };
    el._swim = anim;
    el._kind = name;
  }

  // ---------- Tap a creature and it darts away ----------
  /** A puff of dark ink that spreads and fades where a startled octopus was. */
  function squirtInk(x, y, size) {
    const ink = document.createElement('div');
    ink.className = 'ink';
    const s = Math.max(60, size * 1.4);
    ink.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px`;
    layer.appendChild(ink);
    ink.animate([{ transform: 'scale(0.3)', opacity: 0.85 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => ink.remove();
  }

  /**
   * A startled diver drops a handful of pearls (10 to 30), which sink and
   * fade, with the amount floating up. Added to the wallet straight away.
   */
  function dropPearls(x, y) {
    const n = 10 + Math.floor(Math.random() * 21);
    if (window.ArrowWallet) window.ArrowWallet.addPearls(n);
    const shown = Math.min(n, 14);
    for (let i = 0; i < shown; i++) {
      const p = document.createElement('div');
      p.className = 'pearl dropped-pearl';
      p.style.cssText = `left:${x}px;top:${y}px`;
      layer.appendChild(p);
      const dx = rand(-70, 70), fall = rand(120, 260);
      p.animate([
        { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% - ${rand(10, 40)}px)) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${fall}px)) scale(0.9)`, opacity: 0 },
      ], { duration: rand(1400, 2200), delay: i * 40, easing: 'ease-in', fill: 'both' }).onfinish = () => p.remove();
    }
    const label = document.createElement('div');
    label.className = 'dropped-pearls-label';
    label.innerHTML = `<span class="pearl" aria-hidden="true"></span>+${n}`;
    label.style.cssText = `left:${x}px;top:${y}px`;
    layer.appendChild(label);
    label.animate([
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -110%) scale(1.1)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 },
    ], { duration: 2000, easing: 'ease-out', fill: 'both' }).onfinish = () => label.remove();
    if (window.ArrowAudio) window.ArrowAudio.play('hint');
    if (window.ArrowShop && window.ArrowShop.toast) window.ArrowShop.toast(`The diver dropped ${n} pearls!`);
  }

  /** Startled: a quick zig-zag dash away from the finger and off the screen. */
  function scare(el, tapX, tapY) {
    if (el.classList.contains('scared')) return;
    el.classList.add('scared');
    const box = layer.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x0 = r.left - box.left, y0 = r.top - box.top; // where it is now
    let dx = r.left + r.width / 2 - tapX, dy = r.top + r.height / 2 - tapY;
    let d = Math.hypot(dx, dy);
    if (d < 1) { const a = rand(0, Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    dx /= d; dy /= d;
    if (el._kind === 'diver') dropPearls(r.left - box.left + r.width * 0.6, r.top - box.top + r.height * 0.5);
    if (el._kind === 'octopus') squirtInk(r.left - box.left + r.width / 2, r.top - box.top + r.height * 0.45, r.width);
    if (KINDS[el._kind] && KINDS[el._kind].rises) {
      // Jellyfish can only push themselves along, so they dart mostly upwards.
      dy = -Math.abs(dy) - 0.8;
      d = Math.hypot(dx, dy); dx /= d; dy /= d;
    } else {
      el.querySelector('.facing').style.transform = `scaleX(${dx < 0 ? -1 : 1})`;
    }
    const far = Math.max(layer.clientWidth, layer.clientHeight) + Math.max(r.width, r.height) + 40;
    const zig = Math.max(14, Math.min(60, Math.min(r.width, r.height) * 0.5));
    const sideX = -dy, sideY = dx;
    const frames = [{ transform: `translate(${x0}px, ${y0}px)` }];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const along = far * Math.pow(t, 1.25);
      // Erratic: jinks from side to side, wildest at the start.
      const jink = i < steps ? (i % 2 ? 1 : -1) * zig * rand(0.5, 1.2) * (1.2 - t) : 0;
      frames.push({ transform: `translate(${x0 + dx * along + sideX * jink}px, ${y0 + dy * along + sideY * jink}px)` });
    }
    // A school scatters as it flees.
    el.querySelectorAll('.member').forEach((m) => {
      m.style.setProperty('--sx', `${rand(-70, 70)}%`);
      m.style.setProperty('--sy', `${rand(-90, 90)}%`);
    });
    if (el._swim) { el._swim.onfinish = null; el._swim.cancel(); }
    const dash = el.animate(frames, { duration: rand(1700, 2200) * (el._kind === 'whale' ? 1.6 : 1), easing: 'cubic-bezier(0.3, 0.55, 0.55, 1)' });
    dash.onfinish = () => { el.remove(); alive--; };
    el._swim = dash;
    if (window.ArrowAudio) window.ArrowAudio.play('flee', { size: Math.max(r.width, r.height) });
  }

  /** Startles the creature at screen point (x, y), if any. Returns true if one fled. */
  function scareAt(x, y) {
    if (!wanted()) return false;
    const hit = [...layer.querySelectorAll('.creature:not(.scared)')].reverse().find((el) => {
      const r = el.getBoundingClientRect();
      const mx = r.width * 0.12, my = r.height * 0.12;
      return x >= r.left + mx && x <= r.right - mx && y >= r.top + my && y <= r.bottom - my;
    });
    if (hit) scare(hit, x, y);
    return !!hit;
  }

  // A tap on the open water (not on a button, the board or a dialog) startles
  // the creature under it. The board itself asks via ArrowSeaLife.scareAt when
  // a tap lands on an empty spot (eels and reflectors always come first).
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest || e.target.closest('button, a, input, label, canvas, .overlay, summary')) return;
    scareAt(e.clientX, e.clientY);
  });
  window.ArrowSeaLife = { scareAt };

  // Turned off: the creatures there now fade away.
  if (Settings) Settings.onChange((name, on) => {
    if (name !== 'creatures' || on) return;
    layer.querySelectorAll('.creature').forEach((el) => {
      el.style.transition = 'opacity 0.6s';
      el.style.opacity = '0';
    });
  });

  function loop() {
    spawn();
    setTimeout(loop, rand(5000, 11000));
  }
  setTimeout(loop, 1500);
})();
