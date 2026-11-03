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
const { DIRS, inBounds, rayCells } = globalThis.ArrowRules;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(n, opts, rng) {
  const { minLen, maxLen, tangle = 0, clearChance = 0, maxLines = 99 } = opts;
  const occ = new Int16Array(n * n).fill(-1);
  const arrows = [];
  let fails = 0;

  while (fails < 300 && arrows.length < maxLines) {
    const hx = (rng() * n) | 0;
    const hy = (rng() * n) | 0;
    const dir = (rng() * 4) | 0;
    const d = DIRS[dir];
    if (occ[hy * n + hx] !== -1) { fails++; continue; }

    const ray = rayCells(n, hx, hy, d);
    const blocked = ray.some(([x, y]) => occ[y * n + x] !== -1);
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
    fails = 0;
  }
  return arrows;
}

/** Greedy depth: how many rounds of "take off every free line" it takes. */
function rounds(n, arrows) {
  const { buildLine, reach } = globalThis.ArrowRules;
  const lines = arrows.map((a) => buildLine(n, a));
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

module.exports = { mulberry32, generate, rounds };
