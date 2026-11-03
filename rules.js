/*
 * Game rules for Arrow Escape, shared by the game, the level builder and the
 * level checker.
 *
 *  - A line slides along its own track: forward the way its arrow points (the
 *    body follows the head like a worm, and the head travels in a straight
 *    line off the board), or back again, but never behind where it started.
 *  - A line may stop anywhere. It is removed once it has slid fully off.
 *  - Some parts of a line are see-through. Two lines may share a cell as long
 *    as at least one of them is see-through there. Two solid parts never
 *    overlap, so a solid part blocks another solid part.
 *  - Reflectors are fixed triangles that fill half a cell. A line coming in
 *    through one of the two open sides hits the slanted side and leaves
 *    through the other open side, turned 90 degrees. The flat sides block.
 *
 * Reflectors are given as [x, y, openA, openB], where the open sides are
 * directions (0 up, 1 right, 2 down, 3 left).
 */
(function (root) {
  'use strict';

  // Direction vectors: up, right, down, left.
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

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

  /** Map of cell index -> [openA, openB] for a level's reflectors. */
  function mirrorMap(n, mirrors) {
    const map = new Map();
    for (const [x, y, a, b] of mirrors || []) map.set(y * n + x, [a, b]);
    return map;
  }

  /**
   * The cells a head at (x, y) passes through travelling in `dir`, bouncing
   * off reflectors, until it leaves the board. Returns { cells, escapes, dir }:
   * escapes is false if the path runs into a flat side or loops forever, and
   * dir is the direction it leaves the board in.
   */
  function tracePath(n, x, y, dir, mirrors) {
    const cells = [];
    const seen = new Set();
    for (;;) {
      const nx = x + DIRS[dir][0];
      const ny = y + DIRS[dir][1];
      if (!inBounds(n, nx, ny)) return { cells, escapes: true, dir };
      let next = dir;
      const m = mirrors && mirrors.get(ny * n + nx);
      if (m) {
        const entry = (dir + 2) % 4; // the side it comes in through
        if (!m.includes(entry)) return { cells, escapes: false, dir };
        next = m[0] === entry ? m[1] : m[0];
      }
      const key = (ny * n + nx) * 4 + next;
      if (seen.has(key)) return { cells, escapes: false, dir };
      seen.add(key);
      cells.push([nx, ny]);
      x = nx;
      y = ny;
      dir = next;
    }
  }

  /**
   * Turns level data ({ cells: head first, dir, clear: see-through indices
   * counted from the head }) into a line that can slide along its track.
   * The track runs tail -> head -> straight out past the edge. A line at
   * offset o has its segment j (0 = tail) on track[o + j]. `ray` is the path
   * from just in front of the head to the edge, bent by any reflectors.
   */
  function buildLine(n, arrow, mirrors) {
    const len = arrow.cells.length;
    const [hx, hy] = arrow.cells[0];
    const path = tracePath(n, hx, hy, arrow.dir, mirrors);
    const ray = path.cells;
    const track = arrow.cells.slice().reverse().concat(ray);
    if (path.escapes) {
      const [ex, ey] = ray.length ? ray[ray.length - 1] : [hx, hy];
      const d = DIRS[path.dir];
      for (let i = 1; i <= len + 2; i++) track.push([ex + d[0] * i, ey + d[1] * i]);
    }
    const solid = new Array(len).fill(true);
    for (const k of arrow.clear || []) solid[len - 1 - k] = false;
    return {
      len,
      dir: arrow.dir,
      ray,
      track,
      solid,
      escapes: path.escapes,
      // Offset at which it is fully off the board (if it can get off at all).
      exitAt: path.escapes ? len + ray.length : Infinity,
      // Furthest offset the track allows.
      limit: path.escapes ? len + ray.length : ray.length,
    };
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
   * First line hit by line `id`'s solid parts when it moves to offset `to`,
   * or -1. A path that bends back across itself can make a line hit itself.
   */
  function hitAt(n, line, occ, to, id) {
    let own = null;
    for (let j = 0; j < line.len; j++) {
      if (!line.solid[j]) continue;
      const [x, y] = line.track[to + j];
      if (!inBounds(n, x, y)) continue;
      const i = y * n + x;
      if (occ[i] !== -1) return occ[i];
      own = own || new Set();
      if (own.has(i)) return id;
      own.add(i);
    }
    return -1;
  }

  /**
   * How far line `id` can slide forward from where it is now.
   * Returns { max, exit, blocker }: the furthest offset it can reach, whether
   * it can slide all the way off, and which line stops it (or -1).
   */
  function reach(n, lines, offsets, id, occ) {
    const line = lines[id];
    occ = occ || solidMap(n, lines, offsets, id);
    let s = offsets[id];
    while (s < line.limit) {
      const blocker = hitAt(n, line, occ, s + 1, id);
      if (blocker !== -1) return { max: s, exit: false, blocker };
      s++;
    }
    return { max: s, exit: line.escapes, blocker: -1 };
  }

  /**
   * How far line `id` can slide back towards where it started.
   * Returns { min, blocker }: the lowest offset it can reach (0 is its start)
   * and which line stops it (or -1).
   */
  function reachBack(n, lines, offsets, id, occ) {
    const line = lines[id];
    occ = occ || solidMap(n, lines, offsets, id);
    let s = offsets[id];
    while (s > 0) {
      const blocker = hitAt(n, line, occ, s - 1, id);
      if (blocker !== -1) return { min: s, blocker };
      s--;
    }
    return { min: 0, blocker: -1 };
  }

  /**
   * Slides out every line that can leave, repeating until none can.
   * Taking a line off never blocks another, so this is always safe.
   * Returns the ids removed, in order.
   */
  function clearFree(n, lines, offsets) {
    const removed = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let id = 0; id < lines.length; id++) {
        if (offsets[id] >= 0 && reach(n, lines, offsets, id).exit) {
          offsets[id] = -1;
          removed.push(id);
          changed = true;
        }
      }
    }
    return removed;
  }

  /**
   * Finds the fewest moves to clear a level. Every line needs one move to
   * leave, so the search is over partial slides (forward or back) of lines
   * that are stuck, with free lines always taken off straight away.
   *
   * Returns { solvable, par, partialMoves, path, states } where par counts
   * every move and path lists them as { line, to } (to = -1 means it left).
   */
  function solve(n, arrows, { maxStates = 200000, mirrors = [] } = {}) {
    const map = mirrorMap(n, mirrors);
    const lines = arrows.map((a) => buildLine(n, a, map));
    const start = lines.map(() => 0);
    const startExits = clearFree(n, lines, start);
    const seen = new Map([[start.join(','), null]]);
    let frontier = [start];
    let depth = 0;

    const pathTo = (key) => {
      const steps = [];
      for (let s = seen.get(key); s; s = seen.get(s.prev)) steps.unshift(s);
      const path = startExits.map((id) => ({ line: id, to: -1 }));
      for (const s of steps) {
        path.push({ line: s.line, to: s.to });
        for (const id of s.exits) path.push({ line: id, to: -1 });
      }
      return path;
    };

    while (frontier.length > 0) {
      const next = [];
      for (const offsets of frontier) {
        if (offsets.every((o) => o < 0)) {
          return { solvable: true, par: lines.length + depth, partialMoves: depth, path: pathTo(offsets.join(',')), states: seen.size };
        }
        const key = offsets.join(',');
        for (let id = 0; id < lines.length; id++) {
          if (offsets[id] < 0) continue;
          const occ = solidMap(n, lines, offsets, id);
          const hi = reach(n, lines, offsets, id, occ).max;
          const lo = reachBack(n, lines, offsets, id, occ).min;
          for (let s = lo; s <= hi; s++) {
            if (s === offsets[id]) continue;
            const o = offsets.slice();
            o[id] = s;
            const exits = clearFree(n, lines, o);
            const k = o.join(',');
            if (seen.has(k)) continue;
            seen.set(k, { prev: key, line: id, to: s, exits });
            next.push(o);
          }
        }
        if (seen.size > maxStates) return { solvable: false, gaveUp: true, states: seen.size };
      }
      frontier = next;
      depth++;
    }
    return { solvable: false, states: seen.size };
  }

  /** True if the level can be cleared by sliding lines straight out, with no partial slides. */
  function solvableWithWholeExits(n, arrows, mirrors = []) {
    const map = mirrorMap(n, mirrors);
    const lines = arrows.map((a) => buildLine(n, a, map));
    const offsets = lines.map(() => 0);
    clearFree(n, lines, offsets);
    return offsets.every((o) => o < 0);
  }

  root.ArrowRules = { DIRS, inBounds, rayCells, mirrorMap, tracePath, buildLine, solidMap, reach, reachBack, clearFree, solve, solvableWithWholeExits };
})(typeof window !== 'undefined' ? window : globalThis);
