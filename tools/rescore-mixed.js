/*
 * Re-solves banked mixed-mechanic levels (rotclear, gatesclear, combo) with
 * the same search budget the checker uses:
 *  - if the search finishes, the level gets its exact fewest moves and that
 *    solution is saved; if the best solution needs no partial slide, the
 *    see-through parts aren't really needed and the level is removed;
 *  - if the search can't finish, the level keeps its known solution.
 * Run:  node tools/rescore-mixed.js levels-bank/combo-20-m5.jsonl [more...]
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { decodeLevel, encodeLevel, solve, playPath, pathToText, pathFromText } = globalThis.ArrowRules;

for (const file of process.argv.slice(2)) {
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let exact = 0, kept = 0, dropped = 0;
  const keep = [];
  for (const e of rows) {
    const L = decodeLevel(e.level);
    const world = { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates };
    let r = solve(L.size, L.lines, { ...world, maxStates: 400000 });
    if (r.solvable) {
      if (r.partialMoves < 1) { dropped++; continue; }
      const level = encodeLevel({ size: L.size, par: r.par, lines: L.lines, mirrors: L.mirrors, extras: { rotatable: L.rotatable, gates: L.gates, plates: L.plates } });
      keep.push({ ...e, level, partial: r.partialMoves, states: r.states, solution: pathToText(r.path), exact: true });
      exact++;
    } else if (r.gaveUp && e.solution && playPath(L.size, L.lines, world, pathFromText(e.solution))) {
      keep.push(e);
      kept++;
    } else {
      dropped++;
    }
  }
  fs.writeFileSync(file, keep.map((x) => JSON.stringify(x)).join('\n') + (keep.length ? '\n' : ''));
  console.log(`${file}: ${rows.length} levels, ${exact} re-solved exactly, ${kept} kept with known solution, ${dropped} removed`);
}
