// Checks every level in levels-data.js, for every difficulty setting: board
// sizes are within the setting's range (from tools/level-plan.js), ratings run
// from easiest to hardest, it can be solved, its par (fewest moves) is right,
// Group 1 has no see-through parts, Group 2 levels need their see-through parts, and Group 3 levels have reflectors that
// are all on some line's way out (and need see-through parts when they have them).
// Every level must fill the whole board, with every line 3 squares or longer.
// Run with: node tools/check-levels.js        (add --show to print boards)
'use strict';
require('../rules.js');
require('../levels-data.js');
const { solve, buildLine, mirrorMap, tracePath, decodeLevel } = globalThis.ArrowRules;
const plan = require('./level-plan.js');
const { tiers } = globalThis.ArrowLevelData;

let ok = true;
const fail = (msg) => { ok = false; console.log(`  FAIL: ${msg}`); };

tiers.forEach((t, ti) => {
const { minSize, maxSize } = plan.tiers[ti];
t.groups.forEach((g, gi) => {
  console.log(`${t.name}, Group ${gi + 1}: ${g.name} (${g.levels.length} levels)`);
  const ratings = g.ratings || [];
  if (ratings.length !== g.levels.length) fail(`${t.name} ${g.name}: ${ratings.length} ratings for ${g.levels.length} levels`);
  ratings.forEach((r, i) => { if (i && r < ratings[i - 1]) fail(`${t.name} ${g.name}: level ${i + 1} is rated easier than level ${i}`); });
  g.levels.forEach((raw, i) => {
    const level = typeof raw === 'string' ? decodeLevel(raw) : raw;
    const n = level.size;
    const name = `${t.name[0]}${gi + 1}-${i + 1}`;
    const hasClear = level.lines.some((l) => l.clear.length > 0);
    const mirrors = level.mirrors || [];
    const gates = level.gates || [];
    const plates = level.plates || [];
    const world = { mirrors, rotatable: level.rotatable, gates, plates };
    let result = solve(n, level.lines, { maxStates: 400000, ...world });
    // Big turning-reflector boards: if the full search runs out of room, use
    // the same turns-and-exits-only search the generator used.
    if (result.gaveUp && level.rotatable) result = solve(n, level.lines, { maxStates: 400000, ...world, slides: false });
    console.log(`  ${name.padStart(5)}  ${n}x${n}  ${String(level.lines.length).padStart(2)} lines  par ${String(level.par).padStart(2)}  ` +
      (result.solvable ? `solved in ${result.par}` : 'NOT SOLVED') +
      (mirrors.length ? `  ${mirrors.length} ${level.rotatable ? 'turnable ' : ''}reflectors${hasClear ? ', see-through' : ''}` : '') +
      (gates.length ? `  ${gates.length} gates` : '') +
      (ratings[i] !== undefined ? `  rated ${ratings[i].toFixed(1)}` : ''));
    if (!result.solvable) fail(`${name} cannot be solved`);
    else if (result.par !== level.par) fail(`${name} par is ${result.par}, data says ${level.par}`);
    if (n < minSize || n > maxSize) fail(`${name} is ${n}x${n}, outside ${minSize}-${maxSize}`);
    // Reflectors and gates fill their squares; plates sit under lines.
    const covered = new Set([...mirrors, ...gates].map(([x, y]) => y * n + x));
    level.lines.forEach((l) => l.cells.forEach(([x, y]) => {
      if (covered.has(y * n + x)) fail(`${name}: two things on square ${x},${y}`);
      covered.add(y * n + x);
    }));
    if (covered.size !== n * n) fail(`${name}: ${n * n - covered.size} empty squares`);
    const short = level.lines.filter((l) => l.cells.length < 3).length;
    if (short) fail(`${name}: ${short} lines shorter than 3 squares`);
    if (gi === 0 && hasClear) fail(`${name} has see-through parts`);
    if ((gi < 2 || gi === 4) && mirrors.length) fail(`${name} has reflectors`);
    if (gi !== 4 && gates.length) fail(`${name} has gates`);
    if (gi !== 3 && level.rotatable) fail(`${name} has turnable reflectors`);
    if (gi === 1 && !hasClear) fail(`${name} has no see-through parts`);
    if (gi === 1 || (gi === 2 && hasClear)) {
      const solidOnly = level.lines.map((l) => ({ ...l, clear: [] }));
      if (solve(n, solidOnly, { maxStates: 400000, mirrors }).solvable) fail(`${name} can be solved without its see-through parts`);
    }
    if (gi === 2) {
      if (!mirrors.length) fail(`${name} has no reflectors`);
      const map = mirrorMap(n, mirrors);
      const onPath = new Set();
      level.lines.forEach((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map).cells.forEach(([x, y]) => onPath.add(y * n + x)));
      mirrors.forEach(([x, y]) => { if (!onPath.has(y * n + x)) fail(`${name}: reflector at ${x},${y} is never used`); });
      level.lines.forEach((l) => l.cells.forEach(([x, y]) => { if (map.has(y * n + x)) fail(`${name}: a line starts on a reflector`); }));
    }

    if (gi === 3) {
      // Turning reflectors: every reflector turns, and turning is needed.
      if (!level.rotatable || !mirrors.length) fail(`${name} has no turnable reflectors`);
      const still = solve(n, level.lines, { maxStates: 400000, mirrors });
      if (still.solvable) fail(`${name} can be solved without turning a reflector`);
      if (still.gaveUp) {
        const map = mirrorMap(n, mirrors);
        if (level.lines.every((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map).escapes)) fail(`${name}: couldn't prove turning is needed`);
      }
      if (hasClear) fail(`${name} has see-through parts`);
    }
    if (gi === 4) {
      // Gates and plates: the gates matter.
      if (!gates.length || !plates.length) fail(`${name} has no gates or plates`);
      const throughGate = level.lines.some((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, null).cells.some(([x, y]) => gates.some(([gx, gy]) => gx === x && gy === y)));
      if (!throughGate) {
        const shut = solve(n, level.lines, { maxStates: 400000, gates, plates: [] });
        if (shut.solvable || shut.gaveUp) fail(`${name} doesn't need its gates`);
      }
      if (hasClear) fail(`${name} has see-through parts`);
    }

    if (process.argv.includes('--show')) {
      const grid = Array.from({ length: n }, () => Array(n).fill(' .'));
      mirrors.forEach(([x, y, a, b]) => { grid[y][x] = ((a === 0) === (b === 3) ? ' /' : ' \\'); });
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
});
console.log(ok ? 'All levels OK' : 'Some levels failed');
process.exit(ok ? 0 : 1);
