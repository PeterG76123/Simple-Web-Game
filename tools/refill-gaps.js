/*
 * Runs trick-gen's gap filler again on a finished tricky level (one with a
 * saved solution), keeping the result only if it has fewer gaps and is at
 * least as hard. Rewrites the file in place.
 *
 *   node tools/refill-gaps.js levels-tricky/insane-solid-01.json [more files...]
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { decodeLevel, encodeLevel, solveStaged, pathFromText, pathToText } = globalThis.ArrowRules;
const { fillGaps } = require('./trick-gen.js');

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const gapsOf = (n, arrows) => {
  const cov = new Set();
  arrows.forEach((a) => a.cells.forEach(([x, y]) => cov.add(y * n + x)));
  return n * n - cov.size;
};
const score = (r) => r.stages.reduce((a, d) => a + d * d, 0);

for (const file of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const L = decodeLevel(j.level);
  const n = L.size;
  let arrows = L.lines.map((l) => ({ cells: l.cells, dir: l.dir, clear: l.clear }));
  let path = pathFromText(j.solution);
  const before = gapsOf(n, arrows);
  const r0 = solveStaged(n, arrows, { maxStates: 30000 });
  let best = { arrows, r: r0, gaps: before };
  for (let attempt = 1; attempt <= 6 && best.gaps > 0; attempt++) {
    const f = fillGaps(n, best.arrows, best.r.path || path, rng(attempt * 7919), { maxStates: 30000 });
    const r = solveStaged(n, f.arrows, { maxStates: 30000 });
    if (!r.solvable) continue;
    if (f.left < best.gaps && score(r) >= score(r0)) best = { arrows: f.arrows, r, gaps: f.left };
  }
  if (best.gaps < before) {
    const level = encodeLevel({ size: n, par: best.r.par, lines: best.arrows, mirrors: [] });
    const stats = { ...(j.stats || {}), eels: best.arrows.length, gaps: best.gaps, partialSlides: best.r.partialMoves, jams: best.r.stages.join(' '), par: best.r.par };
    fs.writeFileSync(file, JSON.stringify({ level, solution: pathToText(best.r.path), stats }, null, 1));
  }
  console.log(`${file}: gaps ${before} -> ${best.gaps}`);
}
