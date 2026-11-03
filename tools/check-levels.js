// Checks every level in levels-data.js: it can be solved, its par (fewest
// moves) is right, Group 1 has no see-through parts, and Group 2 levels after
// the first need their see-through parts.
// Run with: node tools/check-levels.js        (add --show to print boards)
'use strict';
require('../rules.js');
require('../levels-data.js');
const { solve, buildLine } = globalThis.ArrowRules;
const { groups } = globalThis.ArrowLevelData;

let ok = true;
const fail = (msg) => { ok = false; console.log(`  FAIL: ${msg}`); };

groups.forEach((g, gi) => {
  console.log(`Group ${gi + 1}: ${g.name} (${g.levels.length} levels)`);
  g.levels.forEach((level, i) => {
    const n = level.size;
    const name = `${gi + 1}-${i + 1}`;
    const hasClear = level.lines.some((l) => l.clear.length > 0);
    const result = solve(n, level.lines, { maxStates: 400000 });
    console.log(`  ${name.padStart(5)}  ${n}x${n}  ${String(level.lines.length).padStart(2)} lines  par ${String(level.par).padStart(2)}  ` +
      (result.solvable ? `solved in ${result.par}` : 'NOT SOLVED'));
    if (!result.solvable) fail(`${name} cannot be solved`);
    else if (result.par !== level.par) fail(`${name} par is ${result.par}, data says ${level.par}`);
    if (n > 10) fail(`${name} is bigger than 10x10`);
    if (gi === 0 && hasClear) fail(`${name} has see-through parts`);
    if (gi === 1 && i > 0) {
      const solidOnly = level.lines.map((l) => ({ ...l, clear: [] }));
      if (solve(n, solidOnly, { maxStates: 400000 }).solvable) fail(`${name} can be solved without its see-through parts`);
    }

    if (process.argv.includes('--show')) {
      const grid = Array.from({ length: n }, () => Array(n).fill(' .'));
      level.lines.forEach((a, id) => {
        const line = buildLine(n, a);
        a.cells.forEach(([x, y], k) => {
          const ch = k === 0 ? '^>v<'[a.dir] : line.solid[a.cells.length - 1 - k] ? String.fromCharCode(97 + (id % 26)) : '~';
          if (grid[y][x] === ' .' || ch !== '~') grid[y][x] = ch.padStart(2);
        });
      });
      console.log(grid.map((r) => '        ' + r.join('')).join('\n'));
    }
  });
});
console.log(ok ? 'All levels OK' : 'Some levels failed');
process.exit(ok ? 0 : 1);
