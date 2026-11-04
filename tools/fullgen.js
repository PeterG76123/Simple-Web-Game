/*
 * Full-board level generator.
 *
 * Every square is filled: the grid (minus any reflector squares) is split
 * into long winding paths, each path becomes a line, and then each line's
 * arrow end is chosen so the board can be solved.
 *
 *  1. pathCover: start with every square as its own path and keep joining
 *     paths end to end, up to a maximum length. Paths that end up too short
 *     are fixed by cutting a neighbouring path and joining onto the cut.
 *  2. repair: pick a random end of each path as the arrow, then repeatedly
 *     flip the arrow to the other end on lines that are stuck, keeping flips
 *     that let more lines escape. Stops when every line can escape.
 */
'use strict';
require('../rules.js');
const { DIRS, inBounds, mirrorMap, buildLine, reach, tracePath } = globalThis.ArrowRules;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/**
 * Splits every free square into paths of adjacent squares.
 * Returns an array of paths (each an array of [x, y]), or null if it could
 * not avoid paths shorter than 2.
 */
function pathCover(n, blocked, rng, { minLen, maxLen }, seeds = []) {
  // owner[i] = path id for square i; paths[id] = array of cells (or null if merged away)
  const owner = new Int32Array(n * n).fill(-1);
  const paths = [];
  // Seed paths keep their first cell as the arrow end: they only grow and
  // get cut from the other end.
  const locked = new Set();
  for (const seed of seeds) {
    locked.add(paths.length);
    for (const [x, y] of seed) owner[y * n + x] = paths.length;
    paths.push(seed.map((c) => c.slice()));
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (blocked.has(y * n + x) || owner[y * n + x] >= 0) continue;
      owner[y * n + x] = paths.length;
      paths.push([[x, y]]);
    }
  }
  const idx = ([x, y]) => y * n + x;
  const setOwner = (id) => { for (const c of paths[id]) owner[idx(c)] = id; };

  // Join two paths at the touching ends a (end of path p) and b (end of path q).
  const join = (p, q, aAtStart, bAtStart) => {
    const P = aAtStart ? paths[p].slice().reverse() : paths[p];
    const Q = bAtStart ? paths[q] : paths[q].slice().reverse();
    paths[p] = P.concat(Q);
    paths[q] = null;
    setOwner(p);
  };

  // Each path gets a random length it stops growing at, so lengths vary.
  const cap = () => minLen + Math.floor(rng() * (maxLen - minLen + 1));
  const caps = paths.map(cap);

  // 1. Grow by joining ends.
  for (let pass = 0; pass < 6; pass++) {
    let merged = false;
    const order = shuffle(paths.map((_, i) => i), rng);
    for (const p of order) {
      if (!paths[p] || paths[p].length >= caps[p]) continue;
      const ends = locked.has(p) ? [[paths[p][paths[p].length - 1], false]] : [[paths[p][0], true], [paths[p][paths[p].length - 1], false]];
      shuffle(ends, rng);
      let done = false;
      for (const [e, eAtStart] of ends) {
        const options = [];
        for (const [dx, dy] of DIRS) {
          const c = [e[0] + dx, e[1] + dy];
          if (!inBounds(n, c[0], c[1])) continue;
          const q = owner[idx(c)];
          if (q < 0 || q === p || !paths[q]) continue;
          const Q = paths[q];
          const qStart = Q[0][0] === c[0] && Q[0][1] === c[1];
          const qEnd = Q[Q.length - 1][0] === c[0] && Q[Q.length - 1][1] === c[1];
          if (!qStart && !qEnd) continue;
          if (locked.has(q)) continue; // seeds only grow from their own tail
          if (paths[p].length + Q.length > Math.max(caps[p], minLen)) continue;
          options.push([q, qStart]);
        }
        if (options.length) {
          // Prefer joining onto shorter paths so few tiny ones are left over.
          options.sort((a, b) => paths[a[0]].length - paths[b[0]].length);
          const [q, qStart] = options[rng() < 0.7 ? 0 : (rng() * options.length) | 0];
          join(p, q, eAtStart, qStart);
          merged = true;
          done = true;
          break;
        }
      }
      if (done) continue;
    }
    if (!merged) break;
  }

  // 2. Fix paths that are too short by cutting a neighbour and joining on.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (let s = 0; s < paths.length; s++) {
      const S = paths[s];
      if (!S || S.length >= minLen) continue;
      const ends = locked.has(s) ? [[S[S.length - 1], false]] : [[S[0], true], [S[S.length - 1], false]];
      let fixed = false;
      for (const [e, eAtStart] of shuffle(ends, rng)) {
        for (const [dx, dy] of shuffle(DIRS.slice(), rng)) {
          const c = [e[0] + dx, e[1] + dy];
          if (!inBounds(n, c[0], c[1])) continue;
          const q = owner[idx(c)];
          if (q < 0 || q === s || !paths[q] || locked.has(q)) continue;
          const Q = paths[q];
          const k = Q.findIndex((d) => d[0] === c[0] && d[1] === c[1]);
          // Cut Q so that c is an end of one piece, then join S onto c.
          // Piece A = Q[0..k], piece B = Q[k+1..]; or A = Q[0..k-1], B = Q[k..].
          const cuts = [
            { keep: Q.slice(0, k + 1), rest: Q.slice(k + 1), cAtEnd: true },
            { keep: Q.slice(k), rest: Q.slice(0, k), cAtEnd: false },
          ];
          for (const cut of shuffle(cuts, rng)) {
            const longEnough = cut.rest.length === 0 || cut.rest.length >= Math.min(minLen, 2);
            if (!longEnough) continue;
            if (cut.keep.length + S.length > maxLen + 2) continue;
            const Sx = eAtStart ? S.slice().reverse() : S; // S ending at e
            const joined = cut.cAtEnd ? cut.keep.concat(Sx.slice().reverse()) : Sx.concat(cut.keep);
            // Sanity: path must stay connected.
            let ok = true;
            for (let i = 1; i < joined.length; i++) if (!adjacent(joined[i - 1], joined[i])) { ok = false; break; }
            if (!ok) continue;
            paths[q] = joined;
            setOwner(q);
            if (cut.rest.length) {
              paths[s] = cut.rest;
              setOwner(s);
            } else {
              paths[s] = null;
            }
            fixed = true;
            changed = true;
            break;
          }
          if (fixed) break;
        }
        if (fixed) break;
      }
    }
    if (!changed) break;
  }

  // Seeds first, in order, so callers know which lines they are.
  const result = paths.map((p, i) => ({ p, seed: locked.has(i) })).filter((r) => r.p);
  if (result.some((r) => r.p.length < 2)) return null;
  const out = result.map((r) => r.p);
  out.locked = result.map((r) => r.seed);
  return out;
}

/** Arrow on the first cell, pointing away from the second. */
function toArrow(path, clear = []) {
  const [hx, hy] = path[0];
  const [nx, ny] = path[1];
  const dir = DIRS.findIndex(([dx, dy]) => dx === hx - nx && dy === hy - ny);
  return { cells: path, dir, clear };
}

/** Lines removed by repeatedly taking off every line that can leave. */
function greedy(n, arrows, map) {
  const lines = arrows.map((a) => buildLine(n, a, map));
  const offsets = lines.map(() => 0);
  let rounds = 0;
  let initialFree = -1;
  for (;;) {
    const free = [];
    for (let id = 0; id < lines.length; id++) {
      if (offsets[id] >= 0 && reach(n, lines, offsets, id).exit) free.push(id);
    }
    if (initialFree < 0) initialFree = free.length;
    if (free.length === 0) break;
    for (const id of free) offsets[id] = -1;
    rounds++;
  }
  const stuck = [];
  offsets.forEach((o, id) => { if (o >= 0) stuck.push(id); });
  return { stuck, rounds, initialFree };
}

/**
 * Fast version of greedy() for boards where every line is solid: a solid line
 * can slide straight out exactly when it could leave an empty board on its own
 * (`alone`) and no other line sits on its path out (`ray`, as cell indices).
 * `lines[i]` = { ray, alone }, `owner[cell]` = line id covering that cell.
 */
function fastGreedy(lines, owner) {
  const gone = new Uint8Array(lines.length);
  let rounds = 0;
  let initialFree = -1;
  for (;;) {
    const free = [];
    for (let id = 0; id < lines.length; id++) {
      if (gone[id] || !lines[id].alone) continue;
      const ray = lines[id].ray;
      let clear = true;
      for (let k = 0; k < ray.length; k++) {
        const o = owner[ray[k]];
        if (o >= 0 && o !== id && !gone[o]) { clear = false; break; }
      }
      if (clear) free.push(id);
    }
    if (initialFree < 0) initialFree = free.length;
    if (free.length === 0) break;
    for (const id of free) gone[id] = 1;
    rounds++;
  }
  const stuck = [];
  for (let id = 0; id < lines.length; id++) if (!gone[id]) stuck.push(id);
  return { stuck, rounds, initialFree };
}

/** Each orientation of a path, worked out once: its arrow, path out and whether it can leave alone. */
function orientations(n, path, map) {
  return [path, path.slice().reverse()].map((cells) => {
    const arrow = toArrow(cells);
    const ray = tracePath(n, cells[0][0], cells[0][1], arrow.dir, map).cells.map(([x, y]) => y * n + x);
    return { arrow, ray, alone: escapesAlone(n, cells, map) };
  });
}

/**
 * Picks arrow ends so every line can be slid out. Returns arrows or null.
 * `extra(chosen)` can add extra goals (e.g. reflectors in use), given each
 * line's chosen orientation ({ arrow, ray, alone }); flips that lower it
 * are rejected.
 */
/** True if the path, as a line with its arrow on path[0], could leave an empty board. */
function escapesAlone(n, path, map) {
  if (path.length < 2) return false;
  const line = buildLine(n, toArrow(path), map);
  return reach(n, [line], [0], 0).exit;
}

/**
 * Makes sure every path can leave an empty board from at least one end,
 * cutting paths in two where neither end works. Returns the new paths (with
 * .locked and .canFlip) or null.
 */
function fixDeadEnds(n, paths, map, rng) {
  // Seed paths (aimed at reflectors) start with their given end as the arrow.
  const seeded = paths.locked || paths.map(() => false);
  const out = [];
  const outSeeded = [];
  const canFlip = [];
  const queue = paths.map((p, i) => [p, seeded[i]]);
  while (queue.length) {
    const [p, isSeed] = queue.shift();
    const fwd = escapesAlone(n, p, map);
    const rev = escapesAlone(n, p.slice().reverse(), map);
    if (fwd || rev) {
      out.push(fwd ? p : p.slice().reverse());
      outSeeded.push(isSeed && fwd);
      canFlip.push(fwd && rev);
      continue;
    }
    if (p.length < 4) return null;
    // Cut into two pieces of at least 2 cells and try again.
    const cuts = shuffle(Array.from({ length: p.length - 3 }, (_, k) => k + 2), rng);
    const k = cuts.find((c) => {
      const a = p.slice(0, c);
      const b = p.slice(c);
      return (escapesAlone(n, a, map) || escapesAlone(n, a.slice().reverse(), map)) &&
        (escapesAlone(n, b, map) || escapesAlone(n, b.slice().reverse(), map));
    });
    if (k === undefined) return null;
    queue.push([p.slice(0, k), false], [p.slice(k), false]);
  }
  out.seeded = outSeeded;
  out.canFlip = canFlip;
  return out;
}

function repair(n, paths, rng, { map = null, iterations = 8000, extra = null } = {}) {
  paths = fixDeadEnds(n, paths, map, rng);
  if (!paths) return null;
  const fixed = paths.canFlip.map((c) => !c);
  const heads = paths.map((_, i) => fixed[i] || paths.seeded[i] || rng() < 0.5);
  const options = paths.map((p) => orientations(n, p, map));
  const owner = new Int32Array(n * n).fill(-1);
  paths.forEach((p, id) => p.forEach(([x, y]) => { owner[y * n + x] = id; }));
  const arrowsFor = () => paths.map((_, i) => options[i][heads[i] ? 0 : 1].arrow);
  const evaluate = () => {
    const arrows = arrowsFor();
    const chosen = paths.map((_, i) => options[i][heads[i] ? 0 : 1]);
    const g = fastGreedy(chosen, owner);
    const bonus = extra ? extra(chosen) : 0;
    return { arrows, g, score: (paths.length - g.stuck.length) * 100 + bonus, bonus };
  };
  let cur = evaluate();
  for (let it = 0; it < iterations; it++) {
    if (cur.g.stuck.length === 0 && (!extra || cur.bonus >= 0)) return cur.arrows;
    const pool = (cur.g.stuck.length ? cur.g.stuck : paths.map((_, i) => i)).filter((i) => !fixed[i]);
    if (pool.length === 0) return null;
    const i = pool[(rng() * pool.length) | 0];
    heads[i] = !heads[i];
    const next = evaluate();
    if (next.score >= cur.score || rng() < 0.03) cur = next;
    else heads[i] = !heads[i];
  }
  return null;
}

/**
 * Picks arrow ends by peeling the board: repeatedly find a line that could
 * slide straight out given the lines still on the board, point its arrow
 * that way, and take it off. The board is solvable by construction (the
 * peel order is a solution). If no line can leave, the longest stuck line is
 * cut in two and the peel starts again. Fast enough for 30x30 boards, where
 * random flipping (repair) almost never succeeds.
 * Seed paths (aimed at reflectors) keep their first cell as the arrow if they
 * can. Returns arrows or null.
 */
function peel(n, paths, rng, { map = null, minLen = 3, cuts = 200 } = {}) {
  let items = paths.map((p, i) => ({ cells: p, seed: paths.locked ? paths.locked[i] : false }));
  for (let attempt = 0; attempt <= cuts; attempt++) {
    const owner = new Int32Array(n * n).fill(-1);
    items.forEach((it, id) => it.cells.forEach(([x, y]) => { owner[y * n + x] = id; }));
    const opts = items.map((it) => orientations(n, it.cells, map));
    const gone = new Uint8Array(items.length);
    const chosen = new Array(items.length);
    let left = items.length;
    const order = shuffle(items.map((_, i) => i), rng);
    let progress = true;
    while (left && progress) {
      progress = false;
      for (const id of order) {
        if (gone[id]) continue;
        // Lines aimed at a reflector only ever point at it, so it gets used.
        const tryOrder = items[id].seed ? [0] : rng() < 0.5 ? [0, 1] : [1, 0];
        for (const k of tryOrder) {
          const o = opts[id][k];
          if (!o.alone) continue;
          let clear = true;
          for (const c of o.ray) {
            const w = owner[c];
            if (w >= 0 && w !== id && !gone[w]) { clear = false; break; }
          }
          if (!clear) continue;
          chosen[id] = k;
          gone[id] = 1;
          left--;
          progress = true;
          break;
        }
      }
    }
    if (!left) return items.map((it, id) => opts[id][chosen[id]].arrow);
    // Stuck: cut a stuck line in two so that one piece can leave right away
    // (searching stuck lines and cut points), so every cut makes progress.
    // Pieces stay at least minLen long.
    const stuckIds = shuffle(items.map((_, i) => i).filter((i) => !gone[i] && items[i].cells.length >= 2 * minLen), rng);
    let cut = null;
    for (const i of stuckIds) {
      const c = items[i].cells;
      const points = shuffle(Array.from({ length: c.length - 2 * minLen + 1 }, (_, j) => minLen + j), rng);
      for (const k of points) {
        // The piece that leaves must not need the other piece gone, so only
        // its own line id counts as clear (the other piece still sits there).
        const a = c.slice(0, k);
        const b = c.slice(k);
        const aCells = new Set(a.map(([x, y]) => y * n + x));
        const bCells = new Set(b.map(([x, y]) => y * n + x));
        const clearOf = (piece, other) => {
          for (const way of [piece, piece.slice().reverse()]) {
            const o = orientations(n, way, map)[0];
            if (!o.alone) continue;
            if (o.ray.every((cc) => !other.has(cc) && (owner[cc] < 0 || gone[owner[cc]] || owner[cc] === i))) return true;
          }
          return false;
        };
        if (clearOf(a, bCells) || clearOf(b, aCells)) { cut = [i, k]; break; }
      }
      if (cut) break;
    }
    if (!cut) {
      // No cut helps straight away: fall back to cutting the longest stuck line.
      const target = items.map((_, i) => i).filter((i) => !gone[i]).sort((x, y) => items[y].cells.length - items[x].cells.length).find((i) => items[i].cells.length >= 2 * minLen);
      if (target === undefined) return null;
      cut = [target, minLen + ((rng() * (items[target].cells.length - 2 * minLen + 1)) | 0)];
    }
    const [ti, k] = cut;
    const c = items[ti].cells;
    items.splice(ti, 1, { cells: c.slice(0, k), seed: items[ti].seed }, { cells: c.slice(k), seed: false });
  }
  return null;
}

module.exports = { mulberry32, shuffle, pathCover, toArrow, greedy, fastGreedy, orientations, repair, peel };

// ---------------------------------------------------------------------------
// Level makers
// ---------------------------------------------------------------------------

const { solve, solvableWithWholeExits, clearFree } = globalThis.ArrowRules;
const MIRROR_SHAPES = [[0, 3], [0, 1], [2, 3], [2, 1]];

function placeMirrors(n, count, rng) {
  const mirrors = [];
  let tries = 0;
  while (mirrors.length < count && tries++ < 500) {
    const x = 1 + ((rng() * (n - 2)) | 0);
    const y = 1 + ((rng() * (n - 2)) | 0);
    if (mirrors.some(([mx, my]) => Math.abs(mx - x) <= 1 && Math.abs(my - y) <= 1)) continue;
    const [a, b] = MIRROR_SHAPES[(rng() * 4) | 0];
    mirrors.push([x, y, a, b]);
  }
  return mirrors;
}

/** Number of reflectors on no line's way out (0 means all are used). */
function unusedMirrors(n, arrows, mirrors, map) {
  const onPath = new Set();
  for (const a of arrows) for (const [x, y] of tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).cells) onPath.add(y * n + x);
  return mirrors.filter(([x, y]) => !onPath.has(y * n + x)).length;
}

function lengths(n) {
  // Longer lines on bigger boards; never shorter than 3.
  return { minLen: 3, maxLen: Math.max(5, Math.round(n * 1.4)) };
}

/**
 * A full board of solid lines that can be cleared by sliding lines straight
 * out. Returns { size, arrows, mirrors, rounds, initialFree } or null.
 */
/**
 * Places reflectors and, for each, a two-cell stub just outside one of its
 * open sides, pointing in, whose path then bounces out to the edge. Retries
 * placement until every reflector gets a stub.
 */
function placeMirrorsWithSeeds(n, mirrorCount, rng) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const mirrors = placeMirrors(n, mirrorCount, rng);
    if (mirrors.length < mirrorCount) continue;
    const map = mirrorMap(n, mirrors);
    const seeds = aimSeeds(n, mirrors, map, rng);
    if (seeds) return { mirrors, map, seeds };
  }
  return null;
}

function aimSeeds(n, mirrors, map, rng) {
  const seeds = [];
  const taken = new Set(mirrors.map(([x, y]) => y * n + x));
  for (const [mx, my, a, b] of mirrors) {
    const options = [];
    for (const side of [a, b]) {
      for (let dist = 1; dist < n; dist++) {
        const h = [mx + DIRS[side][0] * dist, my + DIRS[side][1] * dist];
        const k = [mx + DIRS[side][0] * (dist + 1), my + DIRS[side][1] * (dist + 1)];
        if (!inBounds(n, k[0], k[1])) break;
        if (taken.has(h[1] * n + h[0]) || taken.has(k[1] * n + k[0])) break;
        const path = tracePath(n, h[0], h[1], (side + 2) % 4, map);
        if (path.escapes) options.push([h, k]);
      }
    }
    if (!options.length) return null;
    const seed = options[(rng() * options.length) | 0];
    seed.forEach(([x, y]) => taken.add(y * n + x));
    seeds.push(seed);
  }
  return seeds;
}

/**
 * Carves special squares (reflectors or gates) into a solved full board.
 * Each one goes on a square that is on some line A's way out and is the tail
 * end of another line B (B gets one square shorter, so it stays a line and
 * every square stays filled). A then has to pass through it, so it is used.
 *  - Gates don't change any path, so the board stays solvable (gates open).
 *  - Reflectors bend A's path (and any other path through that square), so
 *    the fast check confirms the board can still be cleared.
 * Returns { arrows, cells: [[x, y, ...shape]] } or null.
 */
function carve(n, arrows, rng, { count, type, minLen = 3, tries = 400 }) {
  arrows = arrows.map((a) => ({ cells: a.cells.slice(), dir: a.dir, clear: [] }));
  const placed = [];
  const near = (x, y) => placed.some(([px, py]) => Math.abs(px - x) <= 1 && Math.abs(py - y) <= 1);
  for (let t = 0; t < tries && placed.length < count; t++) {
    const map = type === 'mirror' ? mirrorMap(n, placed) : null;
    const a = arrows[(rng() * arrows.length) | 0];
    const path = tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map);
    if (!path.cells.length) continue;
    const k = (rng() * path.cells.length) | 0;
    const [x, y] = path.cells[k];
    if (x === 0 || y === 0 || x === n - 1 || y === n - 1 || near(x, y)) continue;
    const bi = arrows.findIndex((b) => { const tail = b.cells[b.cells.length - 1]; return tail[0] === x && tail[1] === y; });
    if (bi < 0 || arrows[bi].cells.length <= minLen || arrows[bi] === a) continue;
    // Travel direction as A enters the square.
    const prev = k ? path.cells[k - 1] : a.cells[0];
    const dir = DIRS.findIndex(([dx, dy]) => dx === x - prev[0] && dy === y - prev[1]);
    let piece;
    if (type === 'gate') {
      piece = [x, y];
    } else {
      // A reflector whose open sides include the side A comes in through.
      const entry = (dir + 2) % 4;
      const fits = MIRROR_SHAPES.filter(([p, q]) => p === entry || q === entry);
      piece = [x, y, ...fits[(rng() * fits.length) | 0]];
    }
    const trial = arrows.slice();
    trial[bi] = { ...arrows[bi], cells: arrows[bi].cells.slice(0, -1) };
    if (type === 'mirror') {
      const m2 = mirrorMap(n, placed.concat([piece]));
      const owner = new Int32Array(n * n).fill(-1);
      trial.forEach((b, id) => b.cells.forEach(([cx, cy]) => { owner[cy * n + cx] = id; }));
      const g = fastGreedy(trial.map((b) => orientations(n, b.cells, m2)[0]), owner);
      if (g.stuck.length) continue;
    }
    arrows = trial;
    placed.push(piece);
  }
  return placed.length === count ? { arrows, cells: placed } : null;
}

function makeSolid(n, rng, { mirrors: mirrorCount = 0 } = {}) {
  if (mirrorCount && n > 12) {
    // Big boards: solve the board first, then carve the reflectors in.
    const base = makeSolid(n, rng, {});
    if (!base) return null;
    const carved = carve(n, base.arrows, rng, { count: mirrorCount, type: 'mirror' });
    if (!carved) return null;
    const mirrors = carved.cells;
    const map = mirrorMap(n, mirrors);
    const owner = new Int32Array(n * n).fill(-1);
    carved.arrows.forEach((a, id) => a.cells.forEach(([x, y]) => { owner[y * n + x] = id; }));
    const g = fastGreedy(carved.arrows.map((a) => orientations(n, a.cells, map)[0]), owner);
    return { size: n, arrows: carved.arrows, mirrors, par: carved.arrows.length, partial: 0, rounds: g.rounds, initialFree: g.initialFree };
  }
  let mirrors = [];
  let map = null;
  let seeds = [];
  if (mirrorCount) {
    const placed = placeMirrorsWithSeeds(n, mirrorCount, rng);
    if (!placed) return null;
    ({ mirrors, map, seeds } = placed);
  }
  const blocked = new Set(mirrors.map(([x, y]) => y * n + x));
  const paths = pathCover(n, blocked, rng, lengths(n), seeds);
  if (!paths) return null;
  // Penalty for reflectors that no line's path out goes through, counted from
  // the paths repair() already worked out for each line.
  const mirrorCells = new Set(mirrors.map(([x, y]) => y * n + x));
  const extra = mirrorCount ? (chosen) => {
    const hit = new Set();
    for (const o of chosen) for (const c of o.ray) if (mirrorCells.has(c)) hit.add(c);
    return -(mirrorCells.size - hit.size) * 150;
  } : null;
  // Small and medium boards: random flips (repair) give more varied boards.
  // Big boards: peel, which reliably finds a solvable layout.
  let arrows = n <= 12 ? repair(n, paths, rng, { map, extra }) : peel(n, paths, rng, { map });
  if (arrows && mirrorCount && n > 12) {
    const used = new Set();
    for (const a of arrows) for (const [x, y] of tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).cells) if (mirrorCells.has(y * n + x)) used.add(y * n + x);
    if (used.size < mirrorCells.size) arrows = null;
  }
  // Cutting dead ends can leave short pieces; every line must be 3 or longer.
  if (!arrows || arrows.some((a) => a.cells.length < lengths(n).minLen)) return null;
  const owner = new Int32Array(n * n).fill(-1);
  arrows.forEach((a, id) => a.cells.forEach(([x, y]) => { owner[y * n + x] = id; }));
  const g = fastGreedy(arrows.map((a) => orientations(n, a.cells, map)[0]), owner);
  return { size: n, arrows, mirrors, par: arrows.length, partial: 0, rounds: g.rounds, initialFree: g.initialFree };
}

/**
 * A full board with see-through sections that needs at least one partial
 * slide, and can't be solved if the see-through parts were solid.
 * Built from a solvable solid board: add see-through runs, then flip a few
 * arrows to create a jam that only a see-through gap can undo.
 */
function makeSeeThrough(n, rng, { mirrors: mirrorCount = 0, layouts = 12, pairs = 40, maxStates = 2500 } = {}) {
  const base = makeSolid(n, rng, { mirrors: mirrorCount });
  if (!base) return null;
  const { mirrors } = base;
  const map = mirrorMap(n, mirrors);

  const flip = (a) => {
    const cells = a.cells.slice().reverse();
    const len = cells.length;
    return toArrow(cells, a.clear.map((k) => len - 1 - k).filter((k) => k !== 0));
  };
  // How many lines stay stuck once every free line is taken off. A small jam
  // makes as good a puzzle as a big one and is far cheaper to prove, so big
  // jams are skipped before any search.
  const maxStuck = 14;
  const stuckAfterClearing = (arrows) => {
    const lines = arrows.map((a) => buildLine(n, a, map));
    const offsets = lines.map(() => 0);
    clearFree(n, lines, offsets);
    return offsets.filter((o) => o >= 0).length;
  };
  const check = (arrows) => {
    if (mirrorCount && unusedMirrors(n, arrows, mirrors, map)) return null;
    const stuck = stuckAfterClearing(arrows);
    if (stuck === 0 || stuck > maxStuck) return null;
    const result = solve(n, arrows, { mirrors, maxStates });
    if (!result.solvable) return null;
    // Proof that the see-through parts are needed: with them solid, the
    // solver must finish its search and find no solution. If it runs out of
    // room it doesn't know, so the board is rejected.
    const solidOnly = arrows.map((a) => ({ ...a, clear: [] }));
    const without = solve(n, solidOnly, { mirrors, maxStates: maxStates * 20 });
    if (without.solvable || without.gaveUp) return null;
    return { size: n, arrows, mirrors, par: result.par, partial: result.partialMoves, states: result.states };
  };

  for (let t = 0; t < layouts; t++) {
    // A random layout of see-through runs (1-2 cells, never the head)...
    const layout = base.arrows.map((a) => ({ cells: a.cells, dir: a.dir, clear: [] }));
    for (const a of layout) {
      if (a.cells.length < 3 || rng() > 0.45) continue;
      const start = 1 + ((rng() * (a.cells.length - 1)) | 0);
      const run = Math.min(a.cells.length - start, 1 + ((rng() * 2) | 0));
      for (let k = start; k < start + run; k++) a.clear.push(k);
    }
    if (!layout.some((a) => a.clear.length)) continue;
    // ...then jam it by flipping one arrow (trying every line), or two.
    const order = shuffle(layout.map((_, i) => i), rng);
    for (const i of order) {
      const arrows = layout.slice();
      arrows[i] = flip(arrows[i]);
      const found = check(arrows);
      if (found) return found;
    }
    for (let p = 0; p < pairs; p++) {
      const i = (rng() * layout.length) | 0;
      const j = (rng() * layout.length) | 0;
      if (i === j) continue;
      const arrows = layout.slice();
      arrows[i] = flip(arrows[i]);
      arrows[j] = flip(arrows[j]);
      const found = check(arrows);
      if (found) return found;
    }
  }
  return null;
}

module.exports.makeSolid = makeSolid;
module.exports.carve = carve;
module.exports.makeSeeThrough = makeSeeThrough;
module.exports.unusedMirrors = unusedMirrors;
