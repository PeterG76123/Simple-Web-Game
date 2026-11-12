/*
 * Plays every level in levels-data.js through to the end and counts empty
 * squares (gaps). Uses the stored solution, or the solver when there isn't one.
 *
 *   node tools/check-levels.js [--tier Insane]
 */
'use strict';
require('../rules.js');
require('../levels-data.js');
const { decodeLevel, solve, playPath, pathFromText } = globalThis.ArrowRules;
const data = globalThis.ArrowLevelData;
const only = process.argv.includes('--tier') ? process.argv[process.argv.indexOf('--tier') + 1] : null;

let bad = 0;
for (const tier of data.tiers) {
  if (only && tier.name !== only) continue;
  for (const g of tier.groups) {
    const notes = [];
    g.levels.forEach((text, i) => {
      const L = decodeLevel(text);
      const n = L.size;
      const opts = { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins };
      let path = g.solutions && g.solutions[i] ? pathFromText(g.solutions[i]) : null;
      if (!path) {
        const r = solve(n, L.lines, { ...opts, maxStates: 200000 });
        path = r.solvable ? r.path : null;
      }
      const played = path && playPath(n, L.lines, opts, path);
      const used = new Set();
      for (const a of L.lines) for (const [x, y] of a.cells) used.add(y * n + x);
      for (const m of L.mirrors || []) used.add(m[1] * n + m[0]);
      for (const gt of L.gates || []) used.add(gt[1] * n + gt[0]); // a gate fills its square
      const gaps = n * n - used.size;
      if (!played || gaps) { bad++; notes.push(`${i + 1}${played ? '' : ' UNSOLVED'}${gaps ? ` ${gaps} gaps` : ''}`); }
    });
    console.log(`${tier.name}, ${g.name}: ${g.levels.length} levels${notes.length ? ` — problems: ${notes.join('; ')}` : ', all played through, no gaps'}`);
  }
}
process.exitCode = bad ? 1 : 0;
