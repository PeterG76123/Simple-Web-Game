/*
 * Level makers for groups with extra pieces: rotating reflectors and
 * coloured gates with pressure plates. Both start from a full board that
 * the fast generator in fullgen.js can make, then add the new piece in a way
 * the solver can prove is needed.
 */
'use strict';
const { mulberry32, shuffle, pathCover, repair, makeSolid, carve } = require('./fullgen.js');
const { DIRS, inBounds, solve, solveWorld, turnMirror, tracePath, mirrorMap } = globalThis.ArrowRules;

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
      const still = solve(n, base.arrows, { mirrors: start, maxStates: maxStates * 10 });
      if (still.solvable || still.gaveUp) continue;
    }
    // Fewest turns needed (slides are free in this count).
    const fewestTurns = solveWorld(n, base.arrows, { mirrors: start, rotatable: true, maxStates, turnCost: 1, slideCost: 0 });
    if (!fewestTurns.solvable || fewestTurns.cost < minTurns) continue;
    // Fewest moves overall, for the par.
    const best = solveWorld(n, base.arrows, { mirrors: start, rotatable: true, maxStates });
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

module.exports = { makeRotate, makeGates, mulberry32 };
