/*
 * Level makers for groups with extra pieces: rotating reflectors and
 * coloured gates with pressure plates. Both start from a full board that
 * the fast generator in fullgen.js can make, then add the new piece in a way
 * the solver can prove is needed.
 */
'use strict';
const { mulberry32, shuffle, pathCover, repair, makeSolid, makeSeeThrough, carve, unusedMirrors } = require('./fullgen.js');
const { DIRS, inBounds, solve, solveWorld, solveTwins, turnMirror, tracePath, mirrorMap, buildLine, clearFree, playPath, pathToText } = globalThis.ArrowRules;

/**
 * Rotating reflectors. Make a solvable board with every reflector set right,
 * then turn some of them away. That always leaves a solution (turn them back
 * first), so the solver only has to show the turns are needed: the level must
 * be unsolvable without turning anything, and need at least `minTurns` turns.
 */
function makeRotate(n, rng, { mirrors: count = 2, minTurns = Math.max(1, Math.floor(count / 2)), tries = 12, maxStates = 20000 } = {}) {
  const base = makeSolid(n, rng, { mirrors: count });
  if (!base) return null;
  for (let t = 0; t < tries; t++) {
    // Turn a random set of reflectors away by 1-3 clockwise taps' worth.
    let start = base.mirrors.map((m) => m.slice());
    const picks = shuffle(base.mirrors.map((_, i) => i), rng).slice(0, 1 + ((rng() * count) | 0));
    for (const k of picks) {
      const away = 1 + ((rng() * 3) | 0); // turned 1-3 steps away from where it works
      for (let r = 0; r < away; r++) start = turnMirror(start, k);
    }
    // Must not be solvable as it stands, without turning anything. Quick
    // proof: some line's way out runs into a flat side (or loops), so it can
    // never leave unless a reflector turns. Otherwise the search must finish
    // and find nothing.
    const map = mirrorMap(n, start);
    const stuck = base.arrows.some((a) => !tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).escapes);
    if (!stuck) {
      // On big boards a full proof search is too big for memory: only the
      // quick proof counts there.
      if (n > 20) continue;
      const still = solve(n, base.arrows, { mirrors: start, maxStates: maxStates * 10 });
      if (still.solvable || still.gaveUp) continue;
    }
    // Fewest turns needed (slides are free in this count). On big boards the
    // full search can run out of room; then search turns and lines leaving
    // only, which is much smaller (and can only overcount).
    const search = (opts) => {
      const full = solveWorld(n, base.arrows, { mirrors: start, rotatable: true, maxStates, ...opts });
      return full.gaveUp ? solveWorld(n, base.arrows, { mirrors: start, rotatable: true, maxStates, slides: false, ...opts }) : full;
    };
    const fewestTurns = search({ turnCost: 1, slideCost: 0 });
    if (!fewestTurns.solvable || fewestTurns.cost < minTurns) continue;
    // Fewest moves overall, for the par.
    const best = search({});
    if (!best.solvable) continue;
    return {
      arrows: base.arrows,
      mirrors: start,
      extras: { rotatable: true },
      par: best.par,
      partial: best.partialMoves,
      states: best.states,
      rounds: base.rounds,
      initialFree: base.initialFree,
      stats: { turns: fewestTurns.cost },
    };
  }
  return null;
}

/**
 * Gates and pressure plates. `colours` gate colours, one gate each (two for
 * some on bigger boards). Lines are aimed through each gate, the board is
 * filled and made solvable as if the gates were open, then plates are placed
 * until the solver shows the level can be solved with the real rules but not
 * with the gates shut.
 */
function makeGates(n, rng, { mirrors: colours = 1, tries = 30, maxStates = 20000 } = {}) {
  if (n > 14) return makeGatesBig(n, rng, { colours, tries, maxStates });
  // Gates: away from the edge and from each other.
  const gates = [];
  // Two gates per colour on mid-size boards; on the biggest boards one each
  // (six gates that must all be in use make solvable boards very rare).
  const perColour = n >= 9 && n <= 14 ? 2 : 1;
  for (let c = 0; c < colours; c++) {
    for (let k = 0; k < perColour; k++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = 1 + ((rng() * (n - 2)) | 0);
        const y = 1 + ((rng() * (n - 2)) | 0);
        if (gates.some(([gx, gy]) => Math.abs(gx - x) + Math.abs(gy - y) < 3)) continue;
        gates.push([x, y, c]);
        break;
      }
    }
  }
  if (gates.length < colours) return null;
  const gateCells = new Set(gates.map(([x, y]) => y * n + x));

  // Aim one line through each gate: a two-cell stub next to it, pointing in.
  const seeds = [];
  const taken = new Set(gateCells);
  for (const [gx, gy] of gates) {
    const options = [];
    for (let side = 0; side < 4; side++) {
      const h = [gx + DIRS[side][0], gy + DIRS[side][1]];
      const k = [gx + 2 * DIRS[side][0], gy + 2 * DIRS[side][1]];
      if (!inBounds(n, k[0], k[1]) || taken.has(h[1] * n + h[0]) || taken.has(k[1] * n + k[0])) continue;
      options.push([h, k]);
    }
    if (!options.length) return null;
    const seed = options[(rng() * options.length) | 0];
    seed.forEach(([x, y]) => taken.add(y * n + x));
    seeds.push(seed);
  }
  const paths = pathCover(n, gateCells, rng, { minLen: 3, maxLen: Math.max(5, Math.round(n * 1.4)) }, seeds);
  if (!paths) return null;
  // Solvable with gates open (gate cells are free squares to the fast check),
  // and every gate on some line's way out.
  const extra = (chosen) => {
    const hit = new Set();
    for (const o of chosen) for (const c of o.ray) if (gateCells.has(c)) hit.add(c);
    return -(gateCells.size - hit.size) * 150;
  };
  const arrows = repair(n, paths, rng, { extra });
  if (!arrows || arrows.some((a) => a.cells.length < 3)) return null;

  const lineCells = [];
  arrows.forEach((a) => a.cells.forEach(([x, y]) => lineCells.push([x, y])));
  const throughGate = arrows.some((a) => tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, null).cells.some(([x, y]) => gateCells.has(y * n + x)));
  for (let t = 0; t < tries; t++) {
    const plates = [];
    const used = new Set();
    for (let c = 0; c < colours; c++) {
      let cell;
      do cell = lineCells[(rng() * lineCells.length) | 0]; while (used.has(cell[1] * n + cell[0]));
      used.add(cell[1] * n + cell[0]);
      plates.push([cell[0], cell[1], c]);
    }
    // Shut gates must make it impossible: the gates matter. Quick proof: a
    // line whose way out goes through a gate can never leave while the gates
    // stay shut. Otherwise the search must finish and find nothing.
    if (!throughGate) {
      const shut = solveWorld(n, arrows, { gates, plates: [], maxStates: maxStates * 10 });
      if (shut.solvable || shut.gaveUp) continue;
    }
    const best = solveWorld(n, arrows, { gates, plates, maxStates });
    if (!best.solvable) continue;
    return {
      arrows,
      mirrors: [],
      extras: { gates, plates },
      par: best.par,
      partial: best.partialMoves,
      states: best.states,
      stats: { gates: gates.length },
    };
  }
  return null;
}

/**
 * Gates on big boards: make and solve a full board first, then carve each
 * gate onto a square on some line's way out (see fullgen.carve). Gates don't
 * change any path, so the board can always be cleared with the gates open,
 * and every gate is on a line's way out. Then plates are placed as for
 * smaller boards.
 */
function makeGatesBig(n, rng, { colours, tries, maxStates }) {
  const base = makeSolid(n, rng, {});
  if (!base) return null;
  const carved = carve(n, base.arrows, rng, { count: colours, type: 'gate' });
  if (!carved) return null;
  const gates = carved.cells.map(([x, y], c) => [x, y, c]);
  const { arrows } = carved;
  const lineCells = [];
  arrows.forEach((a) => a.cells.forEach(([x, y]) => lineCells.push([x, y])));
  for (let t = 0; t < tries; t++) {
    const plates = [];
    const used = new Set();
    for (let c = 0; c < colours; c++) {
      let cell;
      do cell = lineCells[(rng() * lineCells.length) | 0]; while (used.has(cell[1] * n + cell[0]));
      used.add(cell[1] * n + cell[0]);
      plates.push([cell[0], cell[1], c]);
    }
    // Every gate is on some line's way out, so with the gates shut that line
    // can never leave: the gates are needed.
    const best = solveWorld(n, arrows, { gates, plates, maxStates });
    if (!best.solvable) continue;
    return { arrows, mirrors: [], extras: { gates, plates }, par: best.par, partial: best.partialMoves, states: best.states, stats: { gates: gates.length } };
  }
  return null;
}

/**
 * Levels that combine mechanics, built in stages and then proven by the
 * solver to need every one of them:
 *   1. A see-through jam (see-through parts needed, at least one partial
 *      slide), on a board with `mirrors` reflectors if any.
 *   2. `colours` gates carved onto squares on some line's way out.
 *   3. Plates placed under lines.
 *   4. If `turn`, some reflectors turned away (they become turnable).
 * Kept only if it is proven that: it can be solved (a known way through is
 * played by the real rules); it can't be solved with the see-through parts
 * solid, with the reflectors set as the solution uses them; it can't be
 * solved with the gates shut (if any) or without turning (if turnable); and
 * it needs a partial slide.
 */
function makeCombo(n, rng, { mirrors: mirrorCount = 0, colours = 0, turn = false, tries = 20, maxStates = 20000 } = {}) {
  // A see-through jam on a board with the reflectors (if any): its
  // see-through parts are proven needed with the reflectors set as built.
  const jam = makeSeeThrough(n, rng, { mirrors: mirrorCount });
  if (!jam) return null;
  let arrows = jam.arrows;
  const mirrors = jam.mirrors;
  let gates = [];
  if (colours) {
    const carved = carve(n, arrows, rng, { count: colours, type: 'gate', mirrors });
    if (!carved) return null;
    arrows = carved.arrows;
    gates = carved.cells.map(([x, y], c) => [x, y, c]);
  }
  if (arrows.some((a) => a.cells.length < 3)) return null;
  const gateCells = new Set(gates.map(([x, y]) => y * n + x));
  const mirrorCells = new Set(mirrors.map(([x, y]) => y * n + x));
  const map0 = mirrorMap(n, mirrors);

  // A solution with the gates open and reflectors as built: it becomes the
  // known way through (after turning reflectors back), and gives the order
  // lines leave in, for placing plates.
  const open = solve(n, arrows, { mirrors, maxStates });
  if (!open.solvable) return null;
  if (colours) {
    // Carving gates shortens lines, which can loosen the jam: prove again
    // that it needs a partial slide and can't be done with solid lines.
    if (open.partialMoves < 1) return null;
    const solid = solve(n, arrows.map((a) => ({ ...a, clear: [] })), { mirrors, maxStates: maxStates * 3 });
    if (solid.solvable || solid.gaveUp) return null;
  }
  const order = new Map();
  open.path.forEach((step, i) => { if (step.to === -1) order.set(step.line, i); });

  // See-through needed: the jam was proven to need its see-through parts
  // with these reflectors as built (the way the level is solved), and gates
  // only make things harder.

  const crossers = gates.map(([gx, gy]) => arrows.map((a, id) => id).filter((id) => {
    const a = arrows[id];
    return tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map0).cells.some(([x, y]) => x === gx && y === gy);
  }));

  for (let t = 0; t < tries; t++) {
    // Plates under lines that leave after every line that needs their gate.
    const plates = [];
    const used = new Set();
    let placedAll = true;
    gates.forEach(([, , c], gi) => {
      const last = Math.max(-1, ...crossers[gi].map((id) => order.get(id)));
      const later = arrows.map((_, id) => id).filter((id) => order.get(id) > last && !crossers[gi].includes(id));
      if (!later.length) { placedAll = false; return; }
      const holder = arrows[later[(rng() * later.length) | 0]];
      const options = holder.cells.filter(([x, y]) => !used.has(y * n + x));
      if (!options.length) { placedAll = false; return; }
      const [x, y] = options[(rng() * options.length) | 0];
      used.add(y * n + x);
      plates.push([x, y, c]);
    });
    if (!placedAll) continue;

    // Turn some reflectors away; turning them back is the start of the known way.
    let start = mirrors.map((mm) => mm.slice());
    const restore = [];
    if (turn) {
      const picks = shuffle(mirrors.map((_, i) => i), rng).slice(0, 1 + ((rng() * mirrors.length) | 0));
      for (const k of picks) {
        const away = 1 + ((rng() * 3) | 0);
        for (let r = 0; r < away; r++) start = turnMirror(start, k);
        for (let r = away; r < 4; r++) restore.push({ turn: k });
      }
      // Turning needed: some line can't leave as things stand.
      const map = mirrorMap(n, start);
      if (!arrows.some((a) => !tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, map).escapes)) continue;
    }
    // Gates needed: some line's way out reaches a gate before any reflector
    // (so turning can't steer it away), so with gates shut it can't leave.
    if (colours) {
      const blockedByGate = arrows.some((a) => {
        for (const [x, y] of tracePath(n, a.cells[0][0], a.cells[0][1], a.dir, mirrorMap(n, start)).cells) {
          const c = y * n + x;
          if (mirrorCells.has(c)) return false;
          if (gateCells.has(c)) return true;
        }
        return false;
      });
      if (!blockedByGate) continue;
    }
    const world = { mirrors: start, rotatable: turn, gates, plates };
    // Solvable: the known way must work by the real rules.
    const known = restore.concat(open.path);
    if (!playPath(n, arrows, world, known)) continue;
    // With turnable reflectors, turning alone must not clear the board, or
    // the see-through parts wouldn't be needed.
    if (turn && solveWorld(n, arrows, { ...world, slides: false, maxStates }).solvable) continue;
    // Fewest moves: exact if the search finishes, otherwise the known way's
    // length (saved so the checker can replay it).
    const best = solveWorld(n, arrows, { ...world, maxStates });
    const exact = best.solvable;
    // If even the best solution skips the see-through gaps (turning found a
    // way round them), they aren't really needed: try again.
    if (exact && best.partialMoves < 1) continue;
    const par = exact ? best.par : known.length;
    return {
      arrows, mirrors: start,
      extras: { rotatable: turn, gates, plates },
      par, partial: exact ? best.partialMoves : open.partialMoves, states: best.states,
      stats: { turns: exact ? best.turns : restore.length, gates: gates.length, ...(exact ? {} : { solution: pathToText(known) }) },
    };
  }
  return null;
}

/**
 * Twin eels: pairs of lines that always slide together. Start from a full,
 * solvable solid board, then try many random choices of pairs and keep the
 * one where the twins matter most. A choice only counts if the board is still
 * solvable with twins, the usual way of clearing it no longer works, and it
 * takes more moves than the same board without twins.
 * "mirrors" is the number of twin pairs.
 */
function makeTwins(n, rng, { mirrors: pairCount = 1, tries = 80, maxStates = 40000 } = {}) {
  const base = makeSolid(n, rng);
  if (!base) return null;
  const arrows = base.arrows;
  const plain = solve(n, arrows, { maxStates });
  if (!plain.solvable) return null;
  let best = null;
  for (let t = 0; t < tries; t++) {
    const ids = shuffle([...arrows.keys()], rng).slice(0, pairCount * 2);
    if (ids.length < pairCount * 2) return null;
    const twins = [];
    for (let k = 0; k < pairCount; k++) twins.push([ids[2 * k], ids[2 * k + 1]].sort((a, b) => a - b));
    const r = solveTwins(n, arrows, { twins, maxStates });
    if (!r.solvable) continue;
    if (playPath(n, arrows, { twins }, plain.path)) continue; // the usual way still works
    const extra = r.par - plain.par;
    if (extra < 1) continue;
    // More extra moves, more slides of twins, and more dead ends to think through.
    const score = 4 * extra + 2 * r.partialMoves + Math.log2(1 + r.states);
    if (!best || score > best.score) best = { twins, r, extra, score };
  }
  if (!best) return null;
  return {
    arrows,
    mirrors: [],
    extras: { twins: best.twins },
    par: best.r.par,
    partial: best.r.partialMoves,
    states: best.r.states,
    rounds: base.rounds,
    initialFree: base.initialFree,
    stats: { twins: pairCount, extra: best.extra },
  };
}

module.exports = { makeRotate, makeGates, makeCombo, makeTwins, mulberry32 };
