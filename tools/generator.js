/*
 * Random level generator used by tools/build-levels.js.
 *
 * Lines are placed one at a time. Normally a line is only placed where its
 * path out is empty, which on its own makes a level that can be cleared by
 * sliding lines straight out in reverse order. With `tangle` > 0, some lines
 * are allowed to point straight into others; see-through sections are then
 * added, and the solver decides whether the result can still be solved.
 */
'use strict';
require('../rules.js');
const { DIRS, inBounds, rayCells, mirrorMap, tracePath } = globalThis.ArrowRules;

// The four reflector shapes, as their two open sides.
const MIRROR_SHAPES = [[0, 3], [0, 1], [2, 3], [2, 1]];
const MIRROR = -2; // marks a reflector cell in the occupancy grid

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns { arrows, mirrors }. With opts.mirrors > 0, that many reflectors are
 * placed first (away from the edge), and lines' paths bend around them.
 */
function generate(n, opts, rng) {
  const { minLen, maxLen, tangle = 0, clearChance = 0, maxLines = 99, mirrors: mirrorCount = 0 } = opts;
  const occ = new Int16Array(n * n).fill(-1);
  const arrows = [];
  const mirrors = [];
  while (mirrors.length < mirrorCount) {
    const x = 1 + ((rng() * (n - 2)) | 0);
    const y = 1 + ((rng() * (n - 2)) | 0);
    if (occ[y * n + x] !== -1) continue;
    // Keep reflectors from touching each other, so paths stay readable.
    if (mirrors.some(([mx, my]) => Math.abs(mx - x) <= 1 && Math.abs(my - y) <= 1)) continue;
    const [a, b] = MIRROR_SHAPES[(rng() * 4) | 0];
    mirrors.push([x, y, a, b]);
    occ[y * n + x] = MIRROR;
  }
  const map = mirrorCount > 0 ? mirrorMap(n, mirrors) : null;
  let fails = 0;

  const aim = opts.aim === undefined ? 0.6 : opts.aim;
  // Reflectors no line uses yet. Lines are aimed at these first, while the
  // board is still empty, so every reflector ends up on some line's way out.
  const unused = new Set(mirrors.map((_, i) => i));
  let aimTries = 0;
  while (fails < 300 && arrows.length < maxLines) {
    let hx = (rng() * n) | 0;
    let hy = (rng() * n) | 0;
    let dir = (rng() * 4) | 0;
    const forceAim = map && unused.size > 0 && aimTries < 80 * mirrors.length;
    if (forceAim) aimTries++;
    if (map && (forceAim || rng() < aim)) {
      // Aim the line at a reflector: put its head somewhere out from one of
      // the reflector's open sides, pointing back at it.
      const pick = forceAim ? [...unused][(rng() * unused.size) | 0] : (rng() * mirrors.length) | 0;
      const [mx, my, a, b] = mirrors[pick];
      const side = rng() < 0.5 ? a : b;
      const dist = 1 + ((rng() * (n - 1)) | 0);
      hx = mx + DIRS[side][0] * dist;
      hy = my + DIRS[side][1] * dist;
      dir = (side + 2) % 4;
      if (!inBounds(n, hx, hy)) { fails++; continue; }
    }
    const d = DIRS[dir];
    if (occ[hy * n + hx] !== -1) { fails++; continue; }

    let ray;
    if (map) {
      const path = tracePath(n, hx, hy, dir, map);
      if (!path.escapes) { fails++; continue; }
      // A path that crosses itself would make the line run into its own body.
      if (new Set(path.cells.map(([x, y]) => y * n + x)).size !== path.cells.length) { fails++; continue; }
      ray = path.cells;
    } else {
      ray = rayCells(n, hx, hy, d);
    }
    const blocked = ray.some(([x, y]) => occ[y * n + x] >= 0);
    if (blocked && rng() >= tangle) { fails++; continue; }

    const nx = hx - d[0];
    const ny = hy - d[1];
    if (!inBounds(n, nx, ny) || occ[ny * n + nx] !== -1) { fails++; continue; }

    const banned = new Set(ray.map(([x, y]) => y * n + x));
    const used = new Set([hy * n + hx, ny * n + nx]);
    const cells = [[hx, hy], [nx, ny]];
    const target = minLen + ((rng() * (maxLen - minLen + 1)) | 0);
    let cx = nx;
    let cy = ny;
    let prev = (dir + 2) % 4;
    while (cells.length < target) {
      const options = [];
      for (let k = 0; k < 4; k++) {
        const x = cx + DIRS[k][0];
        const y = cy + DIRS[k][1];
        const i = y * n + x;
        if (inBounds(n, x, y) && occ[i] === -1 && !used.has(i) && !banned.has(i)) options.push(k);
      }
      if (options.length === 0) break;
      const k = options.includes(prev) && rng() < 0.35 ? prev : options[(rng() * options.length) | 0];
      cx += DIRS[k][0];
      cy += DIRS[k][1];
      used.add(cy * n + cx);
      cells.push([cx, cy]);
      prev = k;
    }
    if (cells.length < minLen) { fails++; continue; }

    // Optional see-through run of 1-2 cells somewhere behind the head.
    const clear = [];
    if (cells.length >= 3 && rng() < clearChance) {
      const start = 1 + ((rng() * (cells.length - 1)) | 0);
      const run = Math.min(cells.length - start, 1 + ((rng() * 2) | 0));
      for (let k = start; k < start + run; k++) clear.push(k);
    }

    const id = arrows.length;
    for (const [x, y] of cells) occ[y * n + x] = id;
    arrows.push({ cells, dir, clear });
    if (map) {
      const onRay = new Set(ray.map(([x, y]) => y * n + x));
      mirrors.forEach(([x, y], i) => { if (onRay.has(y * n + x)) unused.delete(i); });
    }
    fails = 0;
  }
  return mirrorCount > 0 ? { arrows, mirrors } : arrows;
}

/** True if every reflector is on at least one line's way out. */
function mirrorsUsed(n, arrows, mirrors) {
  const map = mirrorMap(n, mirrors);
  const onPath = new Set();
  for (const a of arrows) {
    for (const [x, y] of tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).cells) onPath.add(y * n + x);
  }
  return mirrors.every(([x, y]) => onPath.has(y * n + x));
}

/** How many lines bounce off at least one reflector on their way out. */
function bouncingLines(n, arrows, mirrors) {
  const map = mirrorMap(n, mirrors);
  return arrows.filter((a) => tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).cells.some(([x, y]) => map.has(y * n + x))).length;
}

/** Greedy depth: how many rounds of "take off every free line" it takes. */
function rounds(n, arrows, mirrors) {
  const { buildLine, reach } = globalThis.ArrowRules;
  const map = mirrors ? mirrorMap(n, mirrors) : null;
  const lines = arrows.map((a) => buildLine(n, a, map));
  const offsets = lines.map(() => 0);
  let r = 0;
  let initialFree = -1;
  for (;;) {
    const free = lines.map((_, id) => id).filter((id) => offsets[id] >= 0 && reach(n, lines, offsets, id).exit);
    if (initialFree < 0) initialFree = free.length;
    if (free.length === 0) break;
    free.forEach((id) => { offsets[id] = -1; });
    r++;
  }
  return { rounds: r, initialFree, cleared: offsets.every((o) => o < 0) };
}

module.exports = { mulberry32, generate, rounds, mirrorsUsed, bouncingLines };
