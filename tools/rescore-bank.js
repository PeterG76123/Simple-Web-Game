/*
 * Re-solves banked levels with the current solver and updates their fewest
 * moves (par) and solver stats. Levels the solver can no longer solve are
 * removed. Use after a change to the rules or the solver.
 *   node tools/rescore-bank.js levels-bank/gates-10-m3.jsonl [more files...]
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { decodeLevel, encodeLevel, solve } = globalThis.ArrowRules;

for (const file of process.argv.slice(2)) {
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let changed = 0;
  let dropped = 0;
  const keep = [];
  for (const e of rows) {
    const L = decodeLevel(e.level);
    const r = solve(L.size, L.lines, { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, maxStates: 400000 });
    if (!r.solvable) { dropped++; continue; }
    const level = encodeLevel({ size: L.size, par: r.par, lines: L.lines, mirrors: L.mirrors, extras: { rotatable: L.rotatable, gates: L.gates, plates: L.plates } });
    if (level !== e.level || r.partialMoves !== e.partial) changed++;
    keep.push({ ...e, level, partial: r.partialMoves, states: r.states });
  }
  fs.writeFileSync(file, keep.map((e) => JSON.stringify(e)).join('\n') + '\n');
  console.log(`${file}: ${rows.length} levels, ${changed} updated, ${dropped} removed`);
}
