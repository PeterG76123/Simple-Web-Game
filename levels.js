/*
 * Level generation for Arrow Escape.
 *
 * Every level is built so it can always be solved. Arrows are placed one at
 * a time, and a new arrow is only allowed if the straight path from its head
 * to the edge of the board is empty at the moment it is placed. Removing the
 * arrows in reverse order of placement is therefore always a valid solution:
 * when an arrow is removed, everything still on the board was placed before
 * it, so none of it can sit in its path.
 *
 * Levels are generated from fixed seeds, so they are the same for everyone,
 * and each one is double-checked by a solver before it is used.
 */
(function (root) {
  'use strict';

  // Direction vectors: up, right, down, left.
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  const LEVEL_SPECS = [
    { size: 5, minLen: 2, maxLen: 4, seed: 1101 },
    { size: 6, minLen: 2, maxLen: 5, seed: 2203 },
    { size: 7, minLen: 3, maxLen: 6, seed: 3307 },
    { size: 8, minLen: 3, maxLen: 7, seed: 4409 },
    { size: 10, minLen: 3, maxLen: 8, seed: 5501 },
  ];

  const CANDIDATES_PER_LEVEL = 60;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inBounds(n, x, y) {
    return x >= 0 && y >= 0 && x < n && y < n;
  }

  /** Cells from just in front of (x, y) to the edge, travelling in direction d. */
  function rayCells(n, x, y, d) {
    const out = [];
    let cx = x + d[0];
    let cy = y + d[1];
    while (inBounds(n, cx, cy)) {
      out.push([cx, cy]);
      cx += d[0];
      cy += d[1];
    }
    return out;
  }

  /**
   * Builds one random level. Each arrow is { cells: [[x, y], ...], dir }, where
   * cells[0] is the head and dir indexes DIRS (the way the arrow points).
   */
  function generateCandidate(n, minLen, maxLen, rng) {
    const occ = new Int16Array(n * n).fill(-1);
    const arrows = [];
    let fails = 0;

    while (fails < 300) {
      const hx = (rng() * n) | 0;
      const hy = (rng() * n) | 0;
      const dir = (rng() * 4) | 0;
      const d = DIRS[dir];

      if (occ[hy * n + hx] !== -1) { fails++; continue; }

      // The head's path out must be clear of everything placed so far.
      const ray = rayCells(n, hx, hy, d);
      if (ray.some(([x, y]) => occ[y * n + x] !== -1)) { fails++; continue; }

      // The cell behind the head fixes the arrow's direction.
      const nx = hx - d[0];
      const ny = hy - d[1];
      if (!inBounds(n, nx, ny) || occ[ny * n + nx] !== -1) { fails++; continue; }

      // The body may not lie in its own path out.
      const banned = new Set(ray.map(([x, y]) => y * n + x));
      const used = new Set([hy * n + hx, ny * n + nx]);
      const cells = [[hx, hy], [nx, ny]];
      const target = minLen + ((rng() * (maxLen - minLen + 1)) | 0);

      let cx = nx;
      let cy = ny;
      let prev = (dir + 2) % 4; // walking away from the head
      while (cells.length < target) {
        const options = [];
        for (let k = 0; k < 4; k++) {
          const x = cx + DIRS[k][0];
          const y = cy + DIRS[k][1];
          const i = y * n + x;
          if (inBounds(n, x, y) && occ[i] === -1 && !used.has(i) && !banned.has(i)) {
            options.push(k);
          }
        }
        if (options.length === 0) break;
        // Lean towards turning so the lines tangle together.
        const k = options.includes(prev) && rng() < 0.35
          ? prev
          : options[(rng() * options.length) | 0];
        cx += DIRS[k][0];
        cy += DIRS[k][1];
        used.add(cy * n + cx);
        cells.push([cx, cy]);
        prev = k;
      }

      if (cells.length < minLen) { fails++; continue; }

      const id = arrows.length;
      for (const [x, y] of cells) occ[y * n + x] = id;
      arrows.push({ cells, dir });
      fails = 0;
    }

    return arrows;
  }

  /** True if nothing in `occ` (other than arrow `id` itself) is in the arrow's path. */
  function isPathClear(n, arrow, occ, id) {
    const [hx, hy] = arrow.cells[0];
    return rayCells(n, hx, hy, DIRS[arrow.dir]).every(([x, y]) => {
      const o = occ[y * n + x];
      return o === -1 || o === id;
    });
  }

  /**
   * Greedy solver. Removing an arrow never blocks another one, so taking any
   * free arrow is always safe: the level can be solved exactly when the greedy
   * approach clears the board.
   */
  function analyse(n, arrows) {
    const occ = new Int16Array(n * n).fill(-1);
    arrows.forEach((a, id) => a.cells.forEach(([x, y]) => { occ[y * n + x] = id; }));
    const remaining = new Set(arrows.map((_, i) => i));
    let rounds = 0;
    let initialFree = -1;

    while (remaining.size > 0) {
      const free = [...remaining].filter((id) => isPathClear(n, arrows[id], occ, id));
      if (initialFree < 0) initialFree = free.length;
      if (free.length === 0) break;
      for (const id of free) {
        remaining.delete(id);
        for (const [x, y] of arrows[id].cells) occ[y * n + x] = -1;
      }
      rounds++;
    }

    const filled = arrows.reduce((s, a) => s + a.cells.length, 0);
    return {
      solvable: remaining.size === 0,
      rounds,
      initialFree,
      coverage: filled / (n * n),
    };
  }

  function buildLevel(spec) {
    const rng = mulberry32(spec.seed);
    let best = null;
    for (let c = 0; c < CANDIDATES_PER_LEVEL; c++) {
      const arrows = generateCandidate(spec.size, spec.minLen, spec.maxLen, rng);
      const stats = analyse(spec.size, arrows);
      if (!stats.solvable) continue; // cannot happen, but never ship a broken level
      // Prefer full boards that need many steps and start with few free arrows.
      const score = stats.coverage * 100 + stats.rounds * 6 - stats.initialFree * 2;
      if (!best || score > best.score) best = { arrows, stats, score };
    }
    return { size: spec.size, arrows: best.arrows, stats: best.stats };
  }

  const LEVELS = LEVEL_SPECS.map(buildLevel);

  root.ArrowLevels = { DIRS, LEVELS, rayCells, analyse };
})(typeof window !== 'undefined' ? window : globalThis);
