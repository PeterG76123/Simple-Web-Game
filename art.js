/*
 * Pictures shared by the game board and the welcome-popup demos.
 *
 *   ArrowArt.reflector(ctx, half, cell, { flash, danger, turns, turnColor })
 *
 * A reflector is a piece of reef rock filling half a square, with a shining
 * mother-of-pearl face along its slanted side: the side eels bounce off. It is
 * drawn centred on (0, 0) in the "up-left" shape (the rock's corner at the
 * bottom right, the pearl face from top right to bottom left), so callers
 * rotate the canvas to turn it. `half` is half the rock's width.
 */
(function (root) {
  'use strict';

  // Little polyps and specks on the rock, as fractions of `half` from the centre.
  const POLYPS = [[0.52, 0.5, 0.11], [0.78, -0.1, 0.08], [-0.05, 0.78, 0.08]];
  const SPECKS = [[0.25, 0.72, 0.045], [0.72, 0.28, 0.04], [0.62, 0.78, 0.035]];

  function blend(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
  }

  function reflector(ctx, half, cell, opts = {}) {
    const { flash = 0, danger = '#ff4d6d', turns = false, turnColor = '#5ef2ff' } = opts;
    const h = half;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // The rock: dark violet-blue reef stone, lighter towards its corner.
    const rock = ctx.createLinearGradient(-h * 0.2, -h * 0.2, h, h);
    rock.addColorStop(0, '#2a3566');
    rock.addColorStop(1, '#4a3a78');
    ctx.fillStyle = rock;
    ctx.strokeStyle = '#4b5b96';
    ctx.lineWidth = cell * 0.05;
    ctx.beginPath();
    ctx.moveTo(h, h);
    ctx.lineTo(h, -h);
    ctx.lineTo(-h, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pink polyps and pale specks, like a little coral colony on the rock.
    for (const [x, y, r] of POLYPS) {
      ctx.fillStyle = 'rgba(255, 122, 168, 0.75)';
      ctx.beginPath(); ctx.arc(x * h, y * h, r * h, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 235, 0.9)';
      ctx.beginPath(); ctx.arc(x * h, y * h, r * h * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(200, 230, 255, 0.45)';
    for (const [x, y, r] of SPECKS) { ctx.beginPath(); ctx.arc(x * h, y * h, r * h, 0, Math.PI * 2); ctx.fill(); }

    // The pearl face: an iridescent strip with a soft glow and a bright shine.
    const glow = flash > 0 ? danger : turns ? turnColor : '#bfefff';
    ctx.strokeStyle = glow;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = cell * 0.22;
    ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(-h, h); ctx.stroke();
    ctx.globalAlpha = 1;
    const nacre = ctx.createLinearGradient(h, -h, -h, h);
    const stops = ['#ffd0ea', '#a8f6ff', '#d9c8ff', '#fff2c8', '#b8fff0'];
    stops.forEach((c, i) => nacre.addColorStop(i / (stops.length - 1), flash > 0 ? blend(c, danger, Math.min(1, flash)) : c));
    ctx.strokeStyle = nacre;
    ctx.lineWidth = cell * 0.12;
    ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(-h, h); ctx.stroke();
    // Shine, just on the open side of the face.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = cell * 0.025;
    const o = cell * 0.035;
    ctx.beginPath(); ctx.moveTo(h * 0.7 - o, -h * 0.7 - o); ctx.lineTo(-h * 0.1 - o, h * 0.1 - o); ctx.stroke();

    if (turns) {
      // A small turning arrow in the open half marks a reflector you can tap.
      ctx.strokeStyle = turnColor;
      ctx.fillStyle = turnColor;
      ctx.lineWidth = cell * 0.05;
      // Well into the open half, clear of the pearl face.
      const cx = -cell * 0.22, cy = -cell * 0.22, r = cell * 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
      const ex = cx + r * Math.cos(Math.PI * 2.1), ey = cy + r * Math.sin(Math.PI * 2.1);
      ctx.beginPath();
      ctx.moveTo(ex + cell * 0.07, ey - cell * 0.02);
      ctx.lineTo(ex - cell * 0.03, ey + cell * 0.07);
      ctx.lineTo(ex - cell * 0.05, ey - cell * 0.06);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  root.ArrowArt = { reflector };
})(typeof window !== 'undefined' ? window : globalThis);
