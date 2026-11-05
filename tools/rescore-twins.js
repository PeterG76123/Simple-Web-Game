/*
 * Re-checks every twin level in the bank with the current rules (e.g. after
 * the solver learns a new rule from the game). A level is kept only if it is
 * still solvable with the same par, its twins still make a difference, and
 * any gates or turning reflectors are still needed; kept levels get a fresh
 * saved solution. Dropped levels are made again by the next build.
 *
 * Run with: node tools/rescore-twins.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
require('../rules.js');
const { decodeLevel, solveTwins, pathToText } = globalThis.ArrowRules;

const dir = path.join(__dirname, '..', 'levels-bank');
let kept = 0, dropped = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.startsWith('twins'))) {
  const out = [];
  for (const line of fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter(Boolean)) {
    const entry = JSON.parse(line);
    const L = decodeLevel(entry.level);
    const n = L.size;
    const hasClear = L.lines.some((l) => l.clear.length);
    const world = { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, maxStates: 400000, slides: hasClear || n <= 12 || L.gates.length > 0 };
    const r = solveTwins(n, L.lines, { twins: L.twins, ...world });
    let why = '';
    if (!r.solvable) why = r.gaveUp ? 'search gave up' : 'unsolvable';
    else if (r.par !== L.par) why = `par is now ${r.par}, was ${L.par}`;
    else {
      const alone = solveTwins(n, L.lines, { twins: [], ...world });
      if (alone.solvable && alone.par >= r.par) why = 'twins make no difference';
      else if (L.gates.length && solveTwins(n, L.lines, { twins: L.twins, ...world, plates: [] }).solvable) why = "gates aren't needed";
      else if (L.rotatable && solveTwins(n, L.lines, { twins: L.twins, ...world, noTurns: true }).solvable) why = "turning isn't needed";
    }
    if (why) { dropped++; console.log(`  dropped from ${file}: ${why}`); continue; }
    entry.solution = pathToText(r.path);
    entry.partial = r.partialMoves;
    entry.states = r.states;
    out.push(JSON.stringify(entry));
    kept++;
  }
  fs.writeFileSync(path.join(dir, file), out.join('\n') + (out.length ? '\n' : ''));
}
console.log(`Kept ${kept} twin levels, dropped ${dropped}.`);
