/*
 * Makes a picture level (from tools/picture-level.js) much harder without
 * changing the picture: some eels get see-through sections and some are turned
 * round (head and tail swapped, so they face the other way), until the level
 * needs a long, exact sequence of partial slides to solve.
 *
 * Difficulty is counted jam by jam: free eels leave, then the fewest partial
 * slides that let one more eel out, and so on (see stagedSolve).
 *
 *   node tools/picture-tricky.js in.json out.json [--steps 4000] [--seed 1]
 *        [--target 12] [--maxStates 20000] [--maxStuck 40] [--clearShare 0.3]
 *
 * How: a hill climb. Each step tries one small change (a see-through run on an
 * eel, turning an eel round, or both) and keeps it only if the level can still
 * be solved and needs at least as many partial slides as before (the solver
 * finds the fewest). Changes that need more are always kept; ones that need
 * the same are kept now and then, to wander. It stops at --target partial
 * slides or after --steps tries. The squares and colours never change.
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { encodeLevel, decodeLevel, solve } = globalThis.ArrowRules;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const [src, out, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
const steps = Number(opt.steps || 4000);
const target = Number(opt.target || 12);
const maxStates = Number(opt.maxStates || 20000);
const clearShare = Number(opt.clearShare || 0.3);
const rand = rng(Number(opt.seed || 1));

const level = decodeLevel(JSON.parse(fs.readFileSync(src, 'utf8')).level);
const n = level.size;
const dirOf = (cells) => [[0, -1], [1, 0], [0, 1], [-1, 0]].findIndex(([dx, dy]) => dx === cells[0][0] - cells[1][0] && dy === cells[0][1] - cells[1][1]);
let arrows = level.lines.map((l) => ({ cells: l.cells, dir: l.dir, clear: l.clear.slice() }));

const flip = (a) => {
  const cells = a.cells.slice().reverse();
  const len = cells.length;
  return { cells, dir: dirOf(cells), clear: a.clear.map((k) => len - 1 - k).filter((k) => k !== 0) };
};
const withClear = (a) => {
  const len = a.cells.length;
  if (len < 4) return null;
  // A see-through run of 1-3 squares, never the head (or the square behind it,
  // so the head always reads clearly) and never the whole body.
  const run = 1 + Math.floor(rand() * Math.min(3, len - 3));
  const start = 2 + Math.floor(rand() * (len - 1 - run));
  const clear = new Set(a.clear);
  for (let k = start; k < start + run && k < len; k++) clear.add(k);
  if (clear.size >= len - 2) return null;
  return { ...a, clear: [...clear].sort((x, y) => x - y) };
};

const { solveStaged, pathToText } = globalThis.ArrowRules;
const maxStuck = Number(opt.maxStuck || 40);

/** Solves jam by jam (ArrowRules.solveStaged); `slides` is how hard the level is. */
function stagedSolve(as) {
  const r = solveStaged(n, as, { maxStates, maxStuck });
  if (!r.solvable) return null;
  // Deep jams count for much more than many easy ones: the score is the sum of squares.
  return { ...r, slides: r.partialMoves, partialMoves: r.stages.reduce((a, b) => a + b * b, 0) };
}
const score = stagedSolve;

/** Writes the level (with its solution and stats) to the output file. */
function save(arrows, best) {
  const text = encodeLevel({ size: n, par: best.par, lines: arrows, mirrors: [], colors: level.colors && { palette: level.colors.palette.map((h) => h.slice(1)), lines: level.colors.lines } });
  const check = decodeLevel(text);
  const again = stagedSolve(check.lines);
  const stats = {
    eels: arrows.length,
    seeThrough: arrows.filter((a) => a.clear.length).length,
    turnedRound: arrows.filter((a, i) => a.cells[0][0] !== level.lines[i].cells[0][0] || a.cells[0][1] !== level.lines[i].cells[0][1]).length,
    partialSlides: again.slides,
    jams: again.stages.join(' '),
    par: again.par,
  };
  // The solution is saved with the level, so hints can follow it on a board too big to search.
  fs.writeFileSync(out, JSON.stringify({ level: text, solution: pathToText(again.path), stats }, null, 1));
  return stats;
}

let best = score(arrows);
if (!best) { console.error('The starting level cannot be solved.'); process.exit(1); }
console.log(`start: ${best.slides} partial slides, par ${best.par}`);
const t0 = Date.now();
for (let s = 0; s < steps && best.partialMoves < target; s++) {
  const next = arrows.slice();
  const i = Math.floor(rand() * arrows.length);
  const r = rand();
  const clearCount = arrows.filter((a) => a.clear.length).length;
  const canClear = clearCount < clearShare * arrows.length || arrows[i].clear.length;
  if (r < 0.4) next[i] = flip(arrows[i]);
  else if (r < 0.75 && canClear) next[i] = withClear(arrows[i]);
  else if (canClear) next[i] = withClear(flip(arrows[i]));
  else next[i] = flip(arrows[i]);
  if (!next[i]) continue;
  // Sometimes also turn a neighbour round, so jams can build on each other.
  if (rand() < 0.3) {
    const [hx, hy] = next[i].cells[0];
    const near = arrows.findIndex((a, j) => j !== i && a.cells.some(([x, y]) => Math.abs(x - hx) + Math.abs(y - hy) <= 2));
    if (near >= 0) next[near] = flip(arrows[near]);
  }
  const got = score(next);
  if (!got) continue;
  if (got.partialMoves > best.partialMoves || (got.partialMoves === best.partialMoves && rand() < 0.15)) {
    if (got.partialMoves > best.partialMoves) save(next, got), console.log(`step ${s}: ${got.slides} partial slides, score ${got.partialMoves} (jams ${got.stages.join(' ')}), par ${got.par}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    arrows = next;
    best = got;
  }
}

// Drop see-through runs that aren't needed: each one is made solid again if
// the level still needs as many partial slides without it.
for (let i = 0; i < arrows.length; i++) {
  if (!arrows[i].clear.length) continue;
  const next = arrows.slice();
  next[i] = { ...arrows[i], clear: [] };
  const got = score(next);
  if (got && got.partialMoves >= best.partialMoves) { arrows = next; best = got; }
}

console.log(JSON.stringify(save(arrows, best)));
