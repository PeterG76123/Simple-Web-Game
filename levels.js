/*
 * Levels and game rules for Arrow Escape.
 *
 * Rules (shared by the game and the solver):
 *  - A line slides along its own track: forward the way its arrow points (the
 *    body follows the head like a worm, and the head travels in a straight
 *    line off the board), or back again, but never behind where it started.
 *  - A line may stop anywhere. It is removed once it has slid fully off.
 *  - Some parts of a line are see-through. Two lines may share a cell as long
 *    as at least one of them is see-through there. Two solid parts never
 *    overlap, so a solid part blocks another solid part.
 *
 * Levels 1-5 are generated so they can always be solved: lines are placed one
 * at a time, each only where its path out is empty, so removing them in reverse
 * order always works. Levels 6-10 are hand-built tutorials for see-through
 * parts. tools/check-levels.js solves every level to confirm it can be done.
 */
(function (root) {
  'use strict';

  // Direction vectors: up, right, down, left.
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const DIR_LETTERS = { U: 0, R: 1, D: 2, L: 3 };

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

  // ---------------------------------------------------------------------------
  // Rules model
  // ---------------------------------------------------------------------------

  /**
   * Turns level data ({ cells: head first, dir, clear: see-through indices
   * counted from the head }) into a line that can slide along its track.
   * The track runs tail -> head -> straight out past the edge. A line at
   * offset o has its segment j (0 = tail) on track[o + j].
   */
  function buildLine(n, arrow) {
    const len = arrow.cells.length;
    const d = DIRS[arrow.dir];
    const [hx, hy] = arrow.cells[0];
    const ray = rayCells(n, hx, hy, d);
    const track = arrow.cells.slice().reverse();
    for (let i = 1; i <= ray.length + len + 2; i++) track.push([hx + d[0] * i, hy + d[1] * i]);
    const solid = new Array(len).fill(true);
    for (const k of arrow.clear || []) solid[len - 1 - k] = false;
    return { len, dir: arrow.dir, ray, track, solid, exitAt: len + ray.length };
  }

  /** Map of cell -> id of the line whose solid part is there (-1 if none). */
  function solidMap(n, lines, offsets, skip) {
    const occ = new Int16Array(n * n).fill(-1);
    lines.forEach((line, id) => {
      if (id === skip || offsets[id] < 0) return;
      for (let j = 0; j < line.len; j++) {
        if (!line.solid[j]) continue;
        const [x, y] = line.track[offsets[id] + j];
        if (inBounds(n, x, y)) occ[y * n + x] = id;
      }
    });
    return occ;
  }

  /**
   * How far line `id` can slide forward from where it is now.
   * Returns { max, exit, blocker }: the furthest offset it can reach, whether
   * it can slide all the way off, and which line stops it (or -1).
   */
  function reach(n, lines, offsets, id) {
    const line = lines[id];
    const occ = solidMap(n, lines, offsets, id);
    let s = offsets[id];
    while (s < line.exitAt) {
      const next = s + 1;
      for (let j = 0; j < line.len; j++) {
        if (!line.solid[j]) continue;
        const [x, y] = line.track[next + j];
        if (inBounds(n, x, y) && occ[y * n + x] !== -1) {
          return { max: s, exit: false, blocker: occ[y * n + x] };
        }
      }
      s = next;
    }
    return { max: s, exit: true, blocker: -1 };
  }

  /**
   * How far line `id` can slide back towards where it started.
   * Returns { min, blocker }: the lowest offset it can reach (0 is its start)
   * and which line stops it (or -1).
   */
  function reachBack(n, lines, offsets, id) {
    const line = lines[id];
    const occ = solidMap(n, lines, offsets, id);
    let s = offsets[id];
    while (s > 0) {
      const next = s - 1;
      for (let j = 0; j < line.len; j++) {
        if (!line.solid[j]) continue;
        const [x, y] = line.track[next + j];
        if (inBounds(n, x, y) && occ[y * n + x] !== -1) {
          return { min: s, blocker: occ[y * n + x] };
        }
      }
      s = next;
    }
    return { min: 0, blocker: -1 };
  }

  /**
   * Breadth-first solver. A move slides one line to any reachable offset,
   * forward or back (or all the way off). With partial = false only whole
   * exits are allowed. Returns { solvable, moves, path } where moves is the fewest
   * possible and path lists them as { line, to } (to = -1 means it left).
   */
  function solve(n, arrows, { partial = true, maxStates = 500000 } = {}) {
    const lines = arrows.map((a) => buildLine(n, a));
    const start = lines.map(() => 0);
    const seen = new Map([[start.join(','), null]]);
    let frontier = [start];
    let depth = 0;
    while (frontier.length > 0) {
      const next = [];
      for (const offsets of frontier) {
        if (offsets.every((o) => o < 0)) {
          const path = [];
          for (let step = seen.get(offsets.join(',')); step; step = seen.get(step.prev)) {
            path.unshift({ line: step.line, to: step.to });
          }
          return { solvable: true, moves: depth, path };
        }
        for (let id = 0; id < lines.length; id++) {
          if (offsets[id] < 0) continue;
          const r = reach(n, lines, offsets, id);
          const targets = [];
          if (r.exit) targets.push(-1);
          if (partial) {
            const top = Math.min(r.max, lines[id].exitAt - 1);
            for (let s = offsets[id] + 1; s <= top; s++) targets.push(s);
            const low = reachBack(n, lines, offsets, id).min;
            for (let s = low; s < offsets[id]; s++) targets.push(s);
          }
          for (const t of targets) {
            const o = offsets.slice();
            o[id] = t;
            const key = o.join(',');
            if (seen.has(key)) continue;
            seen.set(key, { prev: offsets.join(','), line: id, to: t });
            next.push(o);
          }
        }
        if (seen.size > maxStates) return { solvable: false, moves: -1, gaveUp: true };
      }
      frontier = next;
      depth++;
    }
    return { solvable: false, moves: -1 };
  }

  // ---------------------------------------------------------------------------
  // Levels 1-5: generated, all solid
  // ---------------------------------------------------------------------------

  const GENERATED_SPECS = [
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
        // Lean towards turning so the lines tangle together.
        const k = options.includes(prev) && rng() < 0.35 ? prev : options[(rng() * options.length) | 0];
        cx += DIRS[k][0];
        cy += DIRS[k][1];
        used.add(cy * n + cx);
        cells.push([cx, cy]);
        prev = k;
      }

      if (cells.length < minLen) { fails++; continue; }

      const id = arrows.length;
      for (const [x, y] of cells) occ[y * n + x] = id;
      arrows.push({ cells, dir, clear: [] });
      fails = 0;
    }

    return arrows;
  }

  /**
   * Greedy check using whole exits only. Removing a line never blocks another,
   * so if greedy removal gets stuck, no order of whole exits can work.
   */
  function analyse(n, arrows) {
    const lines = arrows.map((a) => buildLine(n, a));
    const offsets = lines.map(() => 0);
    let rounds = 0;
    let initialFree = -1;
    for (;;) {
      const active = offsets.map((o, id) => (o >= 0 ? id : -1)).filter((id) => id >= 0);
      if (active.length === 0) break;
      const free = active.filter((id) => reach(n, lines, offsets, id).exit);
      if (initialFree < 0) initialFree = free.length;
      if (free.length === 0) break;
      for (const id of free) offsets[id] = -1;
      rounds++;
    }
    const filled = arrows.reduce((s, a) => s + a.cells.length, 0);
    return {
      solvable: offsets.every((o) => o < 0),
      rounds,
      initialFree,
      coverage: filled / (n * n),
    };
  }

  function buildGeneratedLevel(spec) {
    const rng = mulberry32(spec.seed);
    let best = null;
    for (let c = 0; c < CANDIDATES_PER_LEVEL; c++) {
      const arrows = generateCandidate(spec.size, spec.minLen, spec.maxLen, rng);
      const stats = analyse(spec.size, arrows);
      if (!stats.solvable) continue;
      // Prefer full boards that need many steps and start with few free lines.
      const score = stats.coverage * 100 + stats.rounds * 6 - stats.initialFree * 2;
      if (!best || score > best.score) best = { arrows, score };
    }
    // Each line leaves in one move, so the best possible is one move per line.
    return { size: spec.size, arrows: best.arrows, par: best.arrows.length };
  }

  // ---------------------------------------------------------------------------
  // Levels 6-10: hand-built see-through tutorials
  // ---------------------------------------------------------------------------
  //
  // Each line: head cell, arrow direction, then the body as steps walking away
  // from the head (U/R/D/L), and which cells are see-through, counted from the
  // head (0 = head, which is always solid).

  const CRAFTED = [
    {
      // 6: a line passes straight through a see-through part.
      size: 5,
      lines: [
        { head: [2, 2], dir: 'U', body: 'DD' },
        { head: [3, 3], dir: 'L', body: 'RUULLL', clear: [5] },
        { head: [0, 2], dir: 'U', body: 'DD' },
      ],
    },
    {
      // 7: slide one line part of the way so its gap lines up.
      size: 6,
      lines: [
        { head: [2, 3], dir: 'U', body: 'DD' },
        { head: [2, 2], dir: 'R', body: 'LL', clear: [1] },
        { head: [3, 4], dir: 'L', body: 'RUU' },
        { head: [5, 1], dir: 'D', body: 'U' },
      ],
    },
    {
      // 8: the gap only lines up at one spot; sliding too far closes it again.
      size: 7,
      lines: [
        { head: [2, 3], dir: 'U', body: 'DD' },
        { head: [3, 2], dir: 'R', body: 'LLL', clear: [2] },
        { head: [5, 4], dir: 'L', body: 'RUU' },
        { head: [0, 4], dir: 'D', body: 'U' },
        { head: [5, 6], dir: 'R', body: 'LLL' },
      ],
    },
    {
      // 9: two gaps to line up before the middle line can leave.
      size: 7,
      lines: [
        { head: [3, 4], dir: 'U', body: 'DD' },
        { head: [3, 1], dir: 'R', body: 'LL', clear: [1] },
        { head: [3, 3], dir: 'L', body: 'RR', clear: [1] },
        { head: [4, 5], dir: 'L', body: 'RRUUUUL' },
        { head: [2, 6], dir: 'R', body: 'LUUU' },
      ],
    },
    {
      // 10: a see-through part can also slide over a solid line.
      size: 7,
      lines: [
        { head: [4, 4], dir: 'U', body: 'DD' },
        { head: [4, 2], dir: 'R', body: 'LLL', clear: [1, 2] },
        { head: [3, 4], dir: 'R', body: 'LURUU' },
        { head: [5, 6], dir: 'L', body: 'RUUUU' },
        { head: [0, 1], dir: 'U', body: 'DD' },
      ],
    },
  ];

  function buildCraftedLevel(spec, index) {
    const n = spec.size;
    const arrows = spec.lines.map((l, li) => {
      const dir = DIR_LETTERS[l.dir];
      const cells = [l.head.slice()];
      let [x, y] = l.head;
      for (const step of l.body) {
        const [dx, dy] = DIRS[DIR_LETTERS[step]];
        x += dx;
        y += dy;
        cells.push([x, y]);
      }
      const where = `Level ${index + 6}, line ${li + 1}`;
      if (l.body[0] !== 'URDL'[(dir + 2) % 4]) throw new Error(`${where}: body must start behind the arrow`);
      if (cells.some(([cx, cy]) => !inBounds(n, cx, cy))) throw new Error(`${where}: off the board`);
      if ((l.clear || []).includes(0)) throw new Error(`${where}: the head must be solid`);
      return { cells, dir, clear: l.clear || [] };
    });

    // No two solid parts may start on the same cell.
    const lines = arrows.map((a) => buildLine(n, a));
    const seen = new Map();
    lines.forEach((line, id) => line.track.slice(0, line.len).forEach(([x, y], j) => {
      const key = `${x},${y}`;
      const prev = seen.get(key);
      if (prev && prev.solid && line.solid[j]) throw new Error(`Level ${index + 6}: solid overlap at ${key}`);
      if (prev && prev.id === id) throw new Error(`Level ${index + 6}: line ${id + 1} crosses itself`);
      if (!prev || line.solid[j]) seen.set(key, { id, solid: line.solid[j] });
    }));

    const result = solve(n, arrows);
    if (!result.solvable) throw new Error(`Level ${index + 6} cannot be solved`);
    return { size: n, arrows, par: result.moves };
  }

  const LEVELS = [
    ...GENERATED_SPECS.map(buildGeneratedLevel),
    ...CRAFTED.map(buildCraftedLevel),
  ];

  root.ArrowLevels = { DIRS, LEVELS, rayCells, inBounds, buildLine, reach, reachBack, solve, analyse };
})(typeof window !== 'undefined' ? window : globalThis);
