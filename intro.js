/*
 * The welcome popup for each group: a small looping demo of the group's new
 * mechanic (a finger tapping, dragging and turning things on a tiny board),
 * a one-line instruction and a Dismiss button.
 *
 *   ArrowIntro.show(group, title, onClose)   open it for a group (0-4)
 *   ArrowIntro.isOpen()
 *
 * Each demo is a script of steps, replayed from the start every frame, so the
 * picture at any moment depends only on the time: easy to loop and to adjust.
 * Cells are [x, y]; an eel's track runs from its tail, through its head, and
 * on past the edge of the board, just like the lines in the game.
 */
(function (root) {
  'use strict';

  const row = (y, x0, x1) => { const out = []; for (let x = x0; x0 <= x1 ? x <= x1 : x >= x1; x += x0 <= x1 ? 1 : -1) out.push([x, y]); return out; };
  const col = (x, y0, y1) => { const out = []; for (let y = y0; y0 <= y1 ? y <= y1 : y >= y1; y += y0 <= y1 ? 1 : -1) out.push([x, y]); return out; };

  const DEMOS = [
    // Kelp Shallows: tap to send an eel out; one in the way has to go first.
    {
      text: 'Tap an eel to send it swimming out. Clear any eel in its way first.',
      n: 5,
      eels: [
        { color: 0, len: 3, tracks: [row(1, 0, 9)] },
        { color: 1, len: 3, tracks: [col(1, 4, -5)] },
      ],
      steps: [
        ['wait', 500], ['finger', 1, 3, 600], ['tap'], ['bump', 1, 0.4, 450, { eel: 0 }], ['wait', 350],
        ['finger', 0, 1, 550], ['tap'], ['move', 0, 7, 750, true], ['wait', 150],
        ['finger', 1, 3, 450], ['tap'], ['move', 1, 7, 750, true], ['wait', 900], ['fade', 450],
      ],
    },
    // Jellyfish Bay: slide an eel partway so its see-through part lets another pass.
    {
      text: 'Dotted parts are see-through. Slide an eel partway so another can pass.',
      n: 5,
      eels: [
        { color: 2, len: 4, solid: [true, false, true, true], tracks: [row(1, 0, 10)] },
        { color: 6, len: 3, tracks: [col(2, 4, -5)] },
      ],
      steps: [
        ['wait', 500], ['finger', 2, 3, 600], ['tap'], ['bump', 1, 0.4, 450, { eel: 0 }], ['wait', 350],
        ['finger', 0, 1, 550], ['drag', 0, 1, 800, 0], ['wait', 350],
        ['finger', 2, 3, 500], ['tap'], ['move', 1, 7, 900, true], ['wait', 150],
        ['finger', 3, 1, 450], ['tap'], ['move', 0, 7, 750, true], ['wait', 900], ['fade', 450],
      ],
    },
    // Crystal Reef: eels bounce off the slanted side of a reflector.
    {
      text: 'Eels bounce off the slanted side of a reflector and keep going.',
      n: 5,
      mirrors: [{ x: 3, y: 2, angle: Math.PI / 2 }],
      eels: [
        { color: 3, len: 3, tracks: [[...row(2, 0, 3), ...col(3, 1, -5)]] },
        { color: 8, len: 2, tracks: [col(1, 0, 9)] },
      ],
      steps: [
        ['wait', 500], ['finger', 1, 0, 600], ['tap'], ['bump', 1, 0.4, 450, { eel: 0 }], ['wait', 350],
        ['finger', 1, 2, 500], ['tap'], ['move', 0, 8, 1200, true], ['wait', 150],
        ['finger', 1, 0, 450], ['tap'], ['move', 1, 7, 750, true], ['wait', 900], ['fade', 450],
      ],
    },
    // Whirlpool: tap a reflector to turn it, then send the eel out its new way.
    {
      text: 'Tap a reflector to turn it, and aim an eel at a way out.',
      n: 5,
      mirrors: [{ x: 3, y: 1, angle: 0, turns: true }],
      eels: [
        // Before the turn the reflector sends it down; after, up and out.
        { color: 4, len: 3, tracks: [[...row(1, 0, 3), ...col(3, 2, 9)], [...row(1, 0, 3), ...col(3, 0, -5)]] },
        { color: 5, len: 3, tracks: [row(3, 4, -6)] },
      ],
      steps: [
        ['wait', 500], ['finger', 1, 1, 600], ['tap'], ['bump', 0, 1.35, 800, { eel: 1 }], ['wait', 350],
        ['finger', 3, 1, 550], ['tap'], ['turn', 0, 380, 0, 1], ['wait', 350],
        ['finger', 1, 1, 550], ['tap'], ['move', 0, 8, 1100, true], ['wait', 900], ['fade', 450],
      ],
    },
    // Sunken Wreck: an eel on a plate opens the gates of its colour.
    {
      text: 'An eel resting on a plate opens the gates of the same colour.',
      n: 5,
      gates: [{ x: 1, y: 0, c: 0 }],
      plates: [{ x: 4, y: 4, c: 0 }],
      eels: [
        { color: 7, len: 3, tracks: [col(1, 4, -5)] },
        { color: 1, len: 2, tracks: [row(4, 2, 8)] },
      ],
      steps: [
        ['wait', 500], ['finger', 1, 3, 600], ['tap'], ['bump', 0, 1.35, 800, { gate: 0 }], ['wait', 350],
        ['finger', 2, 4, 550], ['drag', 1, 1, 800, 0], ['wait', 450],
        ['finger', 1, 3, 550], ['tap'], ['move', 0, 8, 1000, true], ['wait', 150],
        ['finger', 3, 4, 450], ['tap'], ['move', 1, 6, 650, true], ['wait', 900], ['fade', 450],
      ],
    },
    // Mirror Lagoon: twins are banded and always move together.
    {
      text: 'Banded twins always move together. If one is blocked, neither moves.',
      n: 5,
      eels: [
        { color: 8, len: 3, twin: true, tracks: [row(1, 0, 9)] },
        { color: 8, len: 2, twin: true, tracks: [row(3, 0, 8)] },
        { color: 5, len: 3, tracks: [col(3, 2, 10)] },
      ],
      steps: [
        ['wait', 500], ['finger', 1, 1, 600], ['tap'], ['bump', 0, 1.3, 700, { eel: 2 }, 1], ['wait', 400],
        ['finger', 3, 3, 550], ['tap'], ['move', 2, 8, 700, true], ['wait', 250],
        ['finger', 1, 1, 550], ['tap'], ['move', 0, 7, 900, true, 1, 7], ['wait', 900], ['fade', 450],
      ],
    },
  ];

  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeIn = (p) => p * p;
  // How long each step takes (ms). The steps are:
  //   ['wait', ms]  ['fade', ms]  ['finger', x, y, ms]  ['tap']
  //   ['move', eel, to, ms, leaving, twin, twinTo]  ['bump', eel, amount, ms, { eel | gate }, twin]
  //   ['drag', eel, to, ms, grabbedPart]  ['turn', mirror, ms, eel, newTrack]
  const stepTime = (step) => {
    switch (step[0]) {
      case 'wait': case 'fade': return step[1];
      case 'tap': return 320;
      case 'turn': return step[2];
      default: return step[3]; // finger, move, bump, drag
    }
  };
  const total = (demo) => demo.steps.reduce((t, s) => t + stepTime(s), 0);

  function eelPoint(demo, s, e, at) {
    const track = demo.eels[e].tracks[s.track[e]];
    const t = Math.max(0, Math.min(track.length - 1, at));
    const i = Math.floor(t);
    const f = t - i;
    const a = track[i];
    const b = track[Math.min(track.length - 1, i + 1)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  /** Where everything is at time t (ms) into the demo. */
  function simulate(demo, t) {
    const s = {
      off: demo.eels.map(() => 0),
      track: demo.eels.map(() => 0),
      flash: demo.eels.map(() => 0),
      gateFlash: (demo.gates || []).map(() => 0),
      angle: (demo.mirrors || []).map((m) => m.angle),
      finger: { x: demo.n / 2 - 0.5, y: demo.n - 0.4, press: 0, ripple: -1 },
      alpha: Math.min(1, t / 300),
    };
    let time = 0;
    for (const step of demo.steps) {
      if (t < time) break;
      const dur = stepTime(step);
      const p = dur ? Math.min(1, (t - time) / dur) : 1;
      const f = s.finger;
      f.ripple = -1;
      switch (step[0]) {
        case 'finger': {
          const q = easeInOut(p);
          f.x += (step[1] - f.x) * q;
          f.y += (step[2] - f.y) * q;
          break;
        }
        case 'tap':
          f.press = Math.sin(Math.PI * p);
          f.ripple = p < 1 ? p : -1;
          break;
        case 'move': {
          const [, e, to, , out, twin, twinTo] = step;
          const q = out ? easeIn(p) : easeInOut(p);
          s.off[e] += (to - s.off[e]) * q;
          if (twin !== undefined) s.off[twin] += (twinTo - s.off[twin]) * q;
          break;
        }
        case 'bump': {
          const [, e, amount, , who, twin] = step;
          const q = p < 0.5 ? 1 - Math.pow(1 - p * 2, 2) : 1 - easeIn((p - 0.5) * 2);
          const base = s.off[e];
          s.off[e] = base + amount * q;
          const twinBase = twin !== undefined ? s.off[twin] : 0;
          if (twin !== undefined) s.off[twin] = twinBase + amount * q;
          const flash = p > 0.4 ? Math.max(0, 1 - (p - 0.4) / 0.6) : 0;
          if (who && who.eel !== undefined) s.flash[who.eel] = flash;
          if (who && who.gate !== undefined) s.gateFlash[who.gate] = flash;
          if (p >= 1) { s.off[e] = base; if (twin !== undefined) s.off[twin] = twinBase; }
          break;
        }
        case 'drag': {
          const [, e, to, , grab] = step;
          s.off[e] += (to - s.off[e]) * easeInOut(p);
          const [x, y] = eelPoint(demo, s, e, s.off[e] + grab);
          f.x = x;
          f.y = y;
          f.press = p < 1 ? Math.min(1, p * 8, (1 - p) * 8) : 0;
          break;
        }
        case 'turn': {
          const [, m, , e, track] = step;
          s.angle[m] += (Math.PI / 2) * easeInOut(p);
          if (p >= 0.5 && e !== undefined) s.track[e] = track;
          if (p >= 1) s.angle[m] = demo.mirrors[m].angle + Math.PI / 2;
          break;
        }
        case 'fade':
          s.alpha = 1 - p;
          break;
        default:
      }
      time += dur;
    }
    return s;
  }

  // ---------- Drawing ----------
  let canvas, ctx, colors;
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    colors = {
      dot: v('--dot') || 'rgba(160,230,255,0.28)',
      mirror: v('--mirror') || '#8fe6ff',
      mirrorEdge: v('--mirror-edge') || '#f2fdff',
      accent: v('--accent') || '#5ef2ff',
      gates: [v('--gate0'), v('--gate1'), v('--gate2')],
      surface: v('--surface') || '#062448',
      danger: v('--danger') || '#ff4d6d',
      lines: Array.from({ length: 10 }, (_, i) => v(`--c${i + 1}`) || '#5ef2ff'),
    };
  }

  function draw(demo, s) {
    const size = canvas.width / (window.devicePixelRatio || 1);
    const n = demo.n;
    const cell = size / (n + 0.6);
    const m = cell * 0.3;
    const cx = (x) => m + (x + 0.5) * cell;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.globalAlpha = s.alpha;

    // The pool: rounded, dark, with dots where the cells are.
    const r = cell * 0.5;
    const pool = () => { ctx.beginPath(); ctx.roundRect(1, 1, size - 2, size - 2, r); };
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(10, 50, 95, 0.9)');
    g.addColorStop(1, 'rgba(3, 17, 39, 0.95)');
    pool();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    pool();
    ctx.clip();
    ctx.fillStyle = colors.dot;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.beginPath(); ctx.arc(cx(x), cx(y), cell * 0.05, 0, Math.PI * 2); ctx.fill(); }

    // Which cells eels are on, to know which gates are open.
    const onCells = new Set();
    demo.eels.forEach((eel, e) => {
      const track = eel.tracks[s.track[e]];
      const k = Math.round(s.off[e]);
      for (let j = 0; j < eel.len; j++) { const c = track[k + j]; if (c) onCells.add(c[0] + ',' + c[1]); }
    });
    const openColours = new Set((demo.plates || []).filter((p) => onCells.has(p.x + ',' + p.y)).map((p) => p.c));

    (demo.plates || []).forEach((p) => {
      const col = colors.gates[p.c];
      ctx.globalAlpha = s.alpha * 0.35;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx(p.x), cx(p.y), cell * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineWidth = cell * 0.055;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx(p.x) + Math.cos(a) * cell * 0.3, cx(p.y) + Math.sin(a) * cell * 0.3);
        ctx.lineTo(cx(p.x) + Math.cos(a) * cell * 0.45, cx(p.y) + Math.sin(a) * cell * 0.45);
        ctx.stroke();
      }
    });
    (demo.gates || []).forEach((gt, i) => {
      const open = openColours.has(gt.c);
      const flash = s.gateFlash[i] || 0;
      const col = flash > 0 ? colors.danger : colors.gates[gt.c];
      const w = cell * 0.88;
      const bx = cx(gt.x) - w / 2;
      const by = cx(gt.y) - w / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, w, w, w * 0.15);
      if (open) {
        ctx.strokeStyle = col;
        ctx.lineWidth = cell * 0.06;
        ctx.setLineDash([cell * 0.12, cell * 0.08]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.strokeStyle = open ? col : colors.surface;
      ctx.globalAlpha = s.alpha * (open ? 0.35 : 1);
      ctx.lineWidth = cell * 0.06;
      ctx.lineCap = 'round';
      for (const f of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.moveTo(bx + w * f, by + w * 0.2); ctx.lineTo(bx + w * f, by + w * 0.8); ctx.stroke(); }
      ctx.globalAlpha = s.alpha;
    });

    (demo.mirrors || []).forEach((mr, i) => {
      ctx.save();
      ctx.translate(cx(mr.x), cx(mr.y));
      ctx.rotate(s.angle[i]);
      // The game's reflector (art.js) is drawn in its up-left shape; a quarter
      // turn back gives this demo's base shape, the rock in the top-right half.
      ctx.rotate(-Math.PI / 2);
      root.ArrowArt.reflector(ctx, cell * 0.42, cell, { turns: !!mr.turns, turnColor: colors.accent });
      ctx.restore();
    });

    // Eels, drawn like the game's: glowing bodies, dotted see-through parts, a head with an eye.
    demo.eels.forEach((eel, e) => {
      const track = eel.tracks[s.track[e]];
      const k = s.off[e];
      const color = colors.lines[eel.color];
      const pt = (a) => eelPoint(demo, s, e, a);
      const pathBetween = (a, b) => {
        const pts = [pt(a)];
        for (let i = Math.floor(a) + 1; i <= Math.ceil(b) - 1; i++) if (track[i]) pts.push(track[i]);
        pts.push(pt(b));
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(cx(x), cx(y)) : ctx.moveTo(cx(x), cx(y))));
      };
      const solid = eel.solid || Array(eel.len).fill(true);
      const runs = [];
      for (let j = 0; j < eel.len; j++) {
        if (runs.length && runs[runs.length - 1].solid === solid[j]) runs[runs.length - 1].to = j;
        else runs.push({ solid: solid[j], from: j, to: j });
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const run of runs) {
        const a = k + Math.max(0, run.from - 0.5);
        const b = k + Math.min(eel.len - 1, run.to + 0.5);
        if (run.solid) {
          ctx.strokeStyle = color;
          ctx.globalAlpha = s.alpha * 0.16; ctx.lineWidth = cell * 0.62; pathBetween(a, b); ctx.stroke();
          ctx.globalAlpha = s.alpha; ctx.lineWidth = cell * 0.34; pathBetween(a, b); ctx.stroke();
          if (eel.twin) {
            // Twins are banded, as in the game.
            ctx.strokeStyle = 'rgba(2, 16, 34, 0.6)';
            ctx.lineCap = 'butt';
            ctx.setLineDash([cell * 0.1, cell * 0.24]);
            pathBetween(a, b); ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineCap = 'round';
          }
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = cell * 0.09; pathBetween(a, b); ctx.stroke();
        } else {
          ctx.strokeStyle = color;
          ctx.globalAlpha = s.alpha * 0.12; ctx.lineWidth = cell * 0.5; pathBetween(a, b); ctx.stroke();
          ctx.globalAlpha = s.alpha; ctx.lineWidth = cell * 0.16;
          ctx.setLineDash([0.001, cell * 0.2]); pathBetween(a, b); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      if (s.flash[e] > 0) {
        ctx.strokeStyle = colors.danger;
        ctx.globalAlpha = s.alpha * s.flash[e] * 0.85;
        ctx.lineWidth = cell * 0.5;
        pathBetween(k, k + eel.len - 1); ctx.stroke();
        ctx.globalAlpha = s.alpha;
      }
      // Head
      const [hx0, hy0] = pt(k + eel.len - 1);
      const [px0, py0] = pt(k + eel.len - 1 - 0.05);
      let dx = hx0 - px0, dy = hy0 - py0;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      if (!isFinite(dx) || (dx === 0 && dy === 0)) { dx = 1; dy = 0; }
      const hx = cx(hx0), hy = cx(hy0);
      const tip = cell * 0.42, back = cell * 0.04, wing = cell * 0.27;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(hx + dx * tip, hy + dy * tip);
      ctx.lineTo(hx - dx * back - dy * wing, hy - dy * back + dx * wing);
      ctx.quadraticCurveTo(hx - dx * cell * 0.16, hy - dy * cell * 0.16, hx - dx * back + dy * wing, hy - dy * back - dx * wing);
      ctx.closePath();
      ctx.fill();
      let ox = -dy, oy = dx;
      if (oy > 0 || (oy === 0 && ox < 0)) { ox = -ox; oy = -oy; }
      const ex = hx + dx * cell * 0.08 + ox * cell * 0.09, ey = hy + dy * cell * 0.08 + oy * cell * 0.09;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, cell * 0.065, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#021022'; ctx.beginPath(); ctx.arc(ex + dx * cell * 0.02, ey + dy * cell * 0.02, cell * 0.032, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // The finger, with a ripple when it taps.
    const f = s.finger;
    const fx = cx(f.x), fy = cx(f.y);
    if (f.ripple >= 0) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - f.ripple) * 0.8})`;
      ctx.lineWidth = cell * 0.06;
      ctx.beginPath(); ctx.arc(fx, fy, cell * (0.3 + 0.55 * f.ripple), 0, Math.PI * 2); ctx.stroke();
    }
    const fr = cell * 0.3 * (1 - 0.18 * f.press);
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = cell * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * f.press})`;
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = cell * 0.045;
    ctx.stroke();
    ctx.restore();
  }

  // ---------- The popup ----------
  let open = false;
  let raf = 0;
  let onClose = null;
  let opener = null;
  const $ = (id) => document.getElementById(id);

  function show(group, title, closed) {
    const demo = DEMOS[group];
    const overlay = $('introOverlay');
    if (!demo || !overlay) { if (closed) closed(); return; }
    canvas = $('introCanvas');
    ctx = canvas.getContext('2d');
    readColors();
    onClose = closed || null;
    opener = document.activeElement;
    $('introTitle').textContent = title;
    $('introText').textContent = demo.text;
    overlay.dataset.group = String(group);
    overlay.hidden = false;
    open = true;
    const dpr = window.devicePixelRatio || 1;
    const px = canvas.clientWidth || 260;
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const copy = demo;
    const length = total(copy);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    cancelAnimationFrame(raf);
    const frame = (now) => {
      if (!open) return;
      // With reduced motion, show one clear moment instead of the loop.
      const t = still ? length * 0.45 : (now - start) % length;
      draw(copy, simulate(copy, t));
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    $('introDismiss').focus();
  }

  function hide() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    $('introOverlay').hidden = true;
    if (opener && opener.focus) opener.focus();
    const done = onClose;
    onClose = null;
    if (done) done();
  }

  function wire() {
    const overlay = $('introOverlay');
    if (!overlay) return;
    $('introDismiss').addEventListener('click', hide);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') hide(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  root.ArrowIntro = { show, hide, isOpen: () => open, demos: DEMOS, simulate };
})(window);
