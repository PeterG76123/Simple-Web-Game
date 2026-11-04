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
 *  - Rotating reflectors (when a level says so): tapping one turns it 90
 *    degrees clockwise. It can't turn while a line is on it, or while a line
 *    that has gone through it is still on the board.
 *  - Gates and pressure plates: a gate is a coloured square that blocks every
 *    part of a line. It is open while any line covers a plate of the same
 *    colour, and it can't close on a line inside it.
 *
 * Reflectors are given as [x, y, openA, openB], where the open sides are
 * directions (0 up, 1 right, 2 down, 3 left). Gates and plates are [x, y, colour].
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
      // True if no square appears twice along the track (the path never
      // crosses itself), which allows a quicker exit check.
      simple: (() => {
        const seen = new Set();
        for (const [x, y] of track) {
          if (!inBounds(n, x, y)) continue;
          const c = y * n + x;
          if (seen.has(c)) return false;
          seen.add(c);
        }
        return true;
      })(),
      firstSolid: solid.indexOf(true),
    };
  }

  /**
   * Gates and plates for a level, in a form the movement checks can use.
   * Attach it to a lines array as lines.world.
   */
  function makeWorld(n, gates = [], plates = []) {
    if (!gates.length) return null;
    const gateAt = new Map(gates.map(([x, y, c]) => [y * n + x, c]));
    const platesOf = new Map();
    for (const [x, y, c] of plates) {
      if (!platesOf.has(c)) platesOf.set(c, []);
      platesOf.get(c).push(y * n + x);
    }
    return { gateAt, platesOf };
  }

  /** Count of line segments (solid or see-through) on each cell. */
  function anyMap(n, lines, offsets) {
    const any = new Int16Array(n * n);
    lines.forEach((line, id) => {
      if (offsets[id] < 0) return;
      for (let j = 0; j < line.len; j++) {
        const [x, y] = line.track[offsets[id] + j];
        if (inBounds(n, x, y)) any[y * n + x]++;
      }
    });
    return any;
  }

  /**
   * Gate check for one step of a slide: the line is moving from offset `prev`
   * to `to` (one square), having started the whole slide at `from`. Returns
   * the cell of a closed gate it would run into, or -1. `any` counts every
   * line's segments where they were when the slide started (this line at
   * `from`).
   */
  function gateBlock(n, line, from, prev, to, world, any) {
    // Where gates and plates fall along this line's track, worked out once.
    if (!line.gateInfo || line.gateInfo.world !== world) {
      const gates = [];
      const plateT = new Map();
      const plateCells = new Set([].concat(...world.platesOf.values()));
      line.track.forEach(([x, y], t) => {
        if (!inBounds(n, x, y)) return;
        const c = y * n + x;
        if (world.gateAt.has(c)) gates.push([t, c, world.gateAt.get(c)]);
        if (plateCells.has(c)) {
          if (!plateT.has(c)) plateT.set(c, []);
          plateT.get(c).push(t);
        }
      });
      line.gateInfo = { world, gates, plateT };
    }
    const { gates, plateT } = line.gateInfo;
    if (!gates.length) return -1;
    const last = line.len - 1;
    const inAt = (t, o) => t >= o && t <= o + last;
    for (const [t, c, colour] of gates) {
      // Only gates this step newly enters matter: a line already inside a
      // gate (as of the previous step) keeps it open.
      if (!inAt(t, to) || inAt(t, prev)) continue;
      // Another line is inside it, holding it open.
      if (any[c] > 0) continue;
      // Open if any plate of its colour is covered after the step.
      let covered = false;
      for (const pc of world.platesOf.get(colour) || []) {
        const ts = plateT.get(pc);
        const before = ts && ts.some((tt) => inAt(tt, from)) ? 1 : 0;
        const after = ts && ts.some((tt) => inAt(tt, to));
        if (after || any[pc] - before > 0) { covered = true; break; }
      }
      if (!covered) return c;
    }
    return -1;
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
      // occ may include this line's own cells (a shared map); those don't block.
      if (occ[i] !== -1 && occ[i] !== id) return occ[i];
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
  function reach(n, lines, offsets, id, occ, any) {
    const line = lines[id];
    const world = lines.world;
    occ = occ || solidMap(n, lines, offsets, id);
    if (world) any = any || anyMap(n, lines, offsets);
    let s = offsets[id];
    while (s < line.limit) {
      const blocker = hitAt(n, line, occ, s + 1, id);
      if (blocker !== -1) return { max: s, exit: false, blocker, gate: -1 };
      if (world) {
        const gate = gateBlock(n, line, offsets[id], s, s + 1, world, any);
        if (gate !== -1) return { max: s, exit: false, blocker: -1, gate };
      }
      s++;
    }
    return { max: s, exit: line.escapes, blocker: -1, gate: -1 };
  }

  /**
   * How far line `id` can slide back towards where it started.
   * Returns { min, blocker }: the lowest offset it can reach (0 is its start)
   * and which line stops it (or -1).
   */
  function reachBack(n, lines, offsets, id, occ, any) {
    const line = lines[id];
    const world = lines.world;
    occ = occ || solidMap(n, lines, offsets, id);
    if (world) any = any || anyMap(n, lines, offsets);
    let s = offsets[id];
    while (s > 0) {
      const blocker = hitAt(n, line, occ, s - 1, id);
      if (blocker !== -1) return { min: s, blocker, gate: -1 };
      if (world) {
        const gate = gateBlock(n, line, offsets[id], s, s - 1, world, any);
        if (gate !== -1) return { min: s, blocker: -1, gate };
      }
      s--;
    }
    return { min: 0, blocker: -1, gate: -1 };
  }

  /**
   * Slides out every line that can leave, repeating until none can.
   * Taking a line off never blocks another, so this is always safe.
   * Returns the ids removed, in order.
   */
  /**
   * Quick exit check for a line whose track never crosses itself, with no
   * gates: its solid parts sweep every square from its first solid part
   * onwards, so it can leave exactly when none of those squares holds
   * another line's solid part. Same answer as stepping with reach().
   */
  function canExitQuick(n, line, offset, occ, id) {
    if (!line.escapes) return false;
    if (line.firstSolid < 0) return true;
    const track = line.track;
    for (let t = offset + line.firstSolid; t < track.length; t++) {
      const [x, y] = track[t];
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const o = occ[y * n + x];
      if (o !== -1 && o !== id) return false;
    }
    return true;
  }

  /** Square -> ids of lines whose track passes it (cached on the lines array). */
  function trackIndex(n, lines) {
    if (lines.trackIndex) return lines.trackIndex;
    const index = new Map();
    lines.forEach((line, id) => {
      for (const [x, y] of line.track) {
        if (!inBounds(n, x, y)) continue;
        const c = y * n + x;
        if (!index.has(c)) index.set(c, []);
        index.get(c).push(id);
      }
    });
    lines.trackIndex = index;
    return index;
  }

  function clearFree(n, lines, offsets, occ, canTake) {
    // One map shared by every line (solid parts never overlap), updated as
    // lines leave, instead of rebuilding it for each line checked.
    occ = occ || solidMap(n, lines, offsets, -1);
    if (!lines.world && !canTake) {
      // Fast path: check each line once, and after a line leaves, re-check
      // only lines whose tracks pass the squares it freed. Lines whose path
      // crosses itself use the full step-by-step check.
      const index = trackIndex(n, lines);
      const queued = new Uint8Array(lines.length);
      const queue = [];
      for (let id = 0; id < lines.length; id++) if (offsets[id] >= 0) { queue.push(id); queued[id] = 1; }
      const removed = [];
      while (queue.length) {
        const id = queue.pop();
        queued[id] = 0;
        if (offsets[id] < 0) continue;
        const free = lines[id].simple ? canExitQuick(n, lines[id], offsets[id], occ, id) : reach(n, lines, offsets, id, occ).exit;
        if (!free) continue;
        const line = lines[id];
        for (let j = 0; j < line.len; j++) {
          const [x, y] = line.track[offsets[id] + j];
          if (!inBounds(n, x, y)) continue;
          const c = y * n + x;
          if (occ[c] === id) occ[c] = -1;
          for (const k of index.get(c) || []) if (k !== id && offsets[k] >= 0 && !queued[k]) { queued[k] = 1; queue.push(k); }
        }
        offsets[id] = -1;
        removed.push(id);
      }
      return removed;
    }
    // With gates, plates depend on every segment, so keep a count map too,
    // updated the same way.
    const any = lines.world ? anyMap(n, lines, offsets) : undefined;
    const removed = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let id = 0; id < lines.length; id++) {
        if (offsets[id] < 0 || (canTake && !canTake(id, offsets)) || !reach(n, lines, offsets, id, occ, any).exit) continue;
        const line = lines[id];
        for (let j = 0; j < line.len; j++) {
          const [x, y] = line.track[offsets[id] + j];
          if (!inBounds(n, x, y)) continue;
          if (occ[y * n + x] === id) occ[y * n + x] = -1;
          if (any) any[y * n + x]--;
        }
        offsets[id] = -1;
        removed.push(id);
        changed = true;
      }
    }
    return removed;
  }

  const TURN = [1, 3, 0, 2]; // shape index after one clockwise turn: UL -> UR -> DR -> DL -> UL
  const SHAPE_LIST = [[0, 3], [0, 1], [2, 3], [2, 1]];
  const shapeOf = (a, b) => SHAPE_LIST.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));

  /** The reflectors after turning reflector `k` one step clockwise. */
  function turnMirror(mirrors, k) {
    return mirrors.map((m, i) => (i === k ? [m[0], m[1], ...SHAPE_LIST[TURN[shapeOf(m[2], m[3])]]] : m));
  }

  /**
   * True if reflector `k` may turn: no line is on it, and no line still on the
   * board has gone through it.
   */
  function canTurn(n, lines, offsets, mirror) {
    const cell = mirror[1] * n + mirror[0];
    for (let id = 0; id < lines.length; id++) {
      const o = offsets[id];
      if (o < 0) continue;
      const line = lines[id];
      // Reflectors are only ever on the track beyond the line's starting
      // body. If one is at or behind the head, the line is on it or has
      // gone through it.
      const head = Math.min(o + line.len - 1, line.track.length - 1);
      for (let t = line.len; t <= head; t++) {
        const [x, y] = line.track[t];
        if (y * n + x === cell) return false;
      }
    }
    return true;
  }

  /**
   * Finds the fewest moves to clear a level. Every line needs one move to
   * leave, so the search is over partial slides (forward or back) of lines
   * that are stuck, with free lines always taken off straight away.
   *
   * `start` gives each line's offset to search from (-1 for lines already
   * gone); by default every line is where the level starts it.
   *
   * Returns { solvable, par, partialMoves, path, states } where par counts
   * every move still needed and path lists them as { line, to } (to = -1
   * means it leaves the board).
   */
  /** A copy of `occ` with line `id` moved from offset `from` to `to` (solid parts only). */
  function movedMap(n, line, occ, id, from, to) {
    const out = occ.slice();
    for (let j = 0; j < line.len; j++) {
      if (!line.solid[j]) continue;
      const [x, y] = line.track[from + j];
      if (inBounds(n, x, y) && out[y * n + x] === id) out[y * n + x] = -1;
    }
    for (let j = 0; j < line.len; j++) {
      if (!line.solid[j]) continue;
      const [x, y] = line.track[to + j];
      if (inBounds(n, x, y)) out[y * n + x] = id;
    }
    return out;
  }

  function solve(n, arrows, opts = {}) {
    if (opts.rotatable || opts.gates) return solveWorld(n, arrows, opts);
    const { maxStates = 200000, mirrors = [], start: from } = opts;
    const map = mirrorMap(n, mirrors);
    const lines = arrows.map((a) => buildLine(n, a, map));
    const start = from ? from.slice() : lines.map(() => 0);
    const remaining = start.filter((o) => o >= 0).length;
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
          return { solvable: true, par: remaining + depth, partialMoves: depth, path: pathTo(offsets.join(',')), states: seen.size };
        }
        const key = offsets.join(',');
        const occ = solidMap(n, lines, offsets, -1);
        for (let id = 0; id < lines.length; id++) {
          if (offsets[id] < 0) continue;
          const hi = reach(n, lines, offsets, id, occ).max;
          const lo = reachBack(n, lines, offsets, id, occ).min;
          for (let s = lo; s <= hi; s++) {
            if (s === offsets[id]) continue;
            const o = offsets.slice();
            o[id] = s;
            // Start from this position's map with just the moved line updated.
            const exits = clearFree(n, lines, o, movedMap(n, lines[id], occ, id, offsets[id], s));
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

  /**
   * Solver for levels with rotating reflectors and/or gates. A state is every
   * line's offset plus every reflector's shape. Moves are slides (to any
   * reachable offset) and single clockwise turns of a reflector. Free lines
   * are taken off straight away. With `turnCost`/`slideCost` it finds the
   * cheapest solution under those costs (e.g. turnCost 1, slideCost 0 gives
   * the fewest turns needed); by default every move costs 1.
   *
   * Returns { solvable, par, turns, partialMoves, path, states } where path
   * items are { line, to } or { turn: k }.
   */
  function solveWorld(n, arrows, { maxStates = 200000, mirrors = [], rotatable = false, gates = [], plates = [], start: from, startMirrors, turnCost = 1, slideCost = 1, noTurns = false } = {}) {
    const world = makeWorld(n, gates, plates);
    const cache = new Map();
    const linesFor = (ms) => {
      const key = ms.map((m) => shapeOf(m[2], m[3])).join('');
      if (!cache.has(key)) {
        const lines = arrows.map((a) => buildLine(n, a, mirrorMap(n, ms)));
        lines.world = world;
        cache.set(key, lines);
      }
      return cache.get(key);
    };
    const shapeKey = (ms) => ms.map((m) => shapeOf(m[2], m[3])).join('');
    const startMs = (startMirrors || mirrors).map((m) => m.slice());
    const offsets0 = from ? from.slice() : arrows.map(() => 0);
    // Taking a free line off is always safe without gates. With gates it is
    // only safe if the line isn't on a plate or inside a gate (leaving could
    // close a gate); otherwise leaving is a move like any other.
    const special = world ? new Set([...world.gateAt.keys(), ...[].concat(...world.platesOf.values())]) : null;
    const safeToTake = (lines) => (id, offsets) => {
      if (!special) return true;
      const line = lines[id];
      for (let j = 0; j < line.len; j++) {
        const [x, y] = line.track[offsets[id] + j];
        if (inBounds(n, x, y) && special.has(y * n + x)) return false;
      }
      return true;
    };
    const take = (lines, o) => clearFree(n, lines, o, undefined, special ? safeToTake(lines) : undefined);
    const firstExits = take(linesFor(startMs), offsets0);
    const keyOf = (o, ms) => o.join(',') + '|' + shapeKey(ms);

    // 0-1 / small-integer cost search with buckets (costs are 0 or 1).
    const best = new Map();
    const startKey = keyOf(offsets0, startMs);
    best.set(startKey, { cost: 0, prev: null, move: null, exits: firstExits, o: offsets0, ms: startMs, turns: 0, moves: 0 });
    let buckets = [[startKey]];
    for (let cost = 0; cost < buckets.length; cost++) {
      const bucket = buckets[cost] || [];
      for (let bi = 0; bi < bucket.length; bi++) {
        const key = bucket[bi];
        const node = best.get(key);
        if (node.cost !== cost || node.done) continue;
        node.done = true;
        const { o: offsets, ms } = node;
        if (offsets.every((v) => v < 0)) {
          const path = [];
          for (let k = key; k; k = best.get(k).prev) {
            const nd = best.get(k);
            const step = [];
            if (nd.move) step.push(nd.move);
            for (const id of nd.exits) step.push({ line: id, to: -1 });
            path.unshift(...step);
          }
          const partial = path.filter((p) => p.to !== undefined && p.to >= 0).length;
          return { solvable: true, par: path.length, turns: node.turns, partialMoves: partial, path, states: best.size, cost };
        }
        const lines = linesFor(ms);
        const occ = solidMap(n, lines, offsets, -1);
        const any = world ? anyMap(n, lines, offsets) : undefined;
        // Every line leaves exactly once however it happens, so leaving costs
        // nothing extra in the search; only slides and turns are counted.
        const push = (o2, ms2, move, isTurn, isExit) => {
          const lines2 = isTurn ? linesFor(ms2) : lines;
          const exits = take(lines2, o2);
          const k2 = keyOf(o2, ms2);
          const c2 = cost + (isExit ? 0 : isTurn ? turnCost : slideCost);
          const old = best.get(k2);
          if (old && old.cost <= c2) return;
          best.set(k2, { cost: c2, prev: key, move, exits, o: o2, ms: ms2, turns: node.turns + (isTurn ? 1 : 0), moves: node.moves + 1 });
          (buckets[c2] = buckets[c2] || []).push(k2);
        };
        for (let id = 0; id < lines.length; id++) {
          if (offsets[id] < 0) continue;
          const r = reach(n, lines, offsets, id, occ, any);
          const lo = reachBack(n, lines, offsets, id, occ, any).min;
          const hi = r.exit ? Math.min(r.max, lines[id].exitAt - 1) : r.max;
          for (let s2 = lo; s2 <= hi; s2++) {
            if (s2 === offsets[id]) continue;
            const o2 = offsets.slice();
            o2[id] = s2;
            push(o2, ms, { line: id, to: s2 }, false);
          }
          if (r.exit) {
            // A line that wasn't safe to take off automatically leaves as a move.
            const o2 = offsets.slice();
            o2[id] = -1;
            push(o2, ms, { line: id, to: -1 }, false, true);
          }
        }
        if (rotatable && !noTurns) {
          for (let k = 0; k < ms.length; k++) {
            if (!canTurn(n, lines, offsets, ms[k])) continue;
            push(offsets.slice(), turnMirror(ms, k), { turn: k }, true);
          }
        }
        if (best.size > maxStates) return { solvable: false, gaveUp: true, states: best.size };
      }
    }
    return { solvable: false, states: best.size };
  }

  /** True if the level can be cleared by sliding lines straight out, with no partial slides. */
  function solvableWithWholeExits(n, arrows, mirrors = [], gates = [], plates = []) {
    const map = mirrorMap(n, mirrors);
    const lines = arrows.map((a) => buildLine(n, a, map));
    lines.world = makeWorld(n, gates, plates);
    const offsets = lines.map(() => 0);
    clearFree(n, lines, offsets);
    return offsets.every((o) => o < 0);
  }

  // ---------------------------------------------------------------------------
  // Compact level format
  // ---------------------------------------------------------------------------
  //
  //   "<size>|<par>|<line>,<line>,...|<reflectors>"
  //
  // size: base 36. Each line: head x and y (base 36), then one letter per
  // further cell for the step to it (U, R, D, L); a lowercase letter means
  // that cell is see-through. Reflectors: x, y (base 36) and the shape
  // (0-3) for each, run together. A 10x10 level is about 150 characters.

  const STEP = 'URDL';
  const SHAPES = [[0, 3], [0, 1], [2, 3], [2, 1]];

  function encodeLevel({ size, par, lines, mirrors = [], extras = {} }) {
    const enc = lines.map(({ cells, clear = [] }) => {
      let out = cells[0][0].toString(36) + cells[0][1].toString(36);
      for (let k = 1; k < cells.length; k++) {
        const d = DIRS.findIndex(([dx, dy]) => dx === cells[k][0] - cells[k - 1][0] && dy === cells[k][1] - cells[k - 1][1]);
        out += clear.includes(k) ? STEP[d].toLowerCase() : STEP[d];
      }
      return out;
    });
    const m = mirrors.map(([x, y, a, b]) => x.toString(36) + y.toString(36) +
      SHAPES.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a))).join('');
    // Extras: R = reflectors can be turned; G/P x y colour = gate / plate.
    let x = extras.rotatable ? 'R' : '';
    for (const [gx, gy, c] of extras.gates || []) x += 'G' + gx.toString(36) + gy.toString(36) + c;
    for (const [px, py, c] of extras.plates || []) x += 'P' + px.toString(36) + py.toString(36) + c;
    return `${size.toString(36)}|${par}|${enc.join(',')}|${m}` + (x ? `|${x}` : '');
  }

  function decodeLevel(text) {
    const [size, par, lineText, mirrorText, extraText = ''] = text.split('|');
    const lines = lineText.split(',').map((t) => {
      const cells = [[parseInt(t[0], 36), parseInt(t[1], 36)]];
      const clear = [];
      for (let k = 2; k < t.length; k++) {
        const ch = t[k];
        const [dx, dy] = DIRS[STEP.indexOf(ch.toUpperCase())];
        const [px, py] = cells[cells.length - 1];
        cells.push([px + dx, py + dy]);
        if (ch !== ch.toUpperCase()) clear.push(cells.length - 1);
      }
      const dir = DIRS.findIndex(([dx, dy]) => dx === cells[0][0] - cells[1][0] && dy === cells[0][1] - cells[1][1]);
      return { cells, dir, clear };
    });
    const mirrors = [];
    for (let i = 0; i + 2 < (mirrorText || '').length + 0; i += 3) {
      const [a, b] = SHAPES[Number(mirrorText[i + 2])];
      mirrors.push([parseInt(mirrorText[i], 36), parseInt(mirrorText[i + 1], 36), a, b]);
    }
    const gates = [];
    const plates = [];
    for (let i = 0; i < extraText.length; i++) {
      const ch = extraText[i];
      if (ch === 'G' || ch === 'P') {
        (ch === 'G' ? gates : plates).push([parseInt(extraText[i + 1], 36), parseInt(extraText[i + 2], 36), Number(extraText[i + 3])]);
        i += 3;
      }
    }
    return { size: parseInt(size, 36), par: Number(par), lines, mirrors, rotatable: extraText.includes('R'), gates, plates };
  }

  root.ArrowRules = { encodeLevel, decodeLevel, makeWorld, anyMap, turnMirror, canTurn, solveWorld, DIRS, inBounds, rayCells, mirrorMap, tracePath, buildLine, solidMap, reach, reachBack, clearFree, solve, solvableWithWholeExits };
})(typeof window !== 'undefined' ? window : globalThis);
