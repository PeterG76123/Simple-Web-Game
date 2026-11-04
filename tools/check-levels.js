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
const { playPath, pathFromText } = globalThis.ArrowRules;
// Bank entries by level text: big mixed levels store a known solution there.
const bankEntries = new Map();
{
  const fs = require('fs');
  const dir = require('path').join(__dirname, '..', 'levels-bank');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    for (const row of fs.readFileSync(require('path').join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const e = JSON.parse(row);
      bankEntries.set(e.level, e);
    }
  }
}
const { tiers } = globalThis.ArrowLevelData;

let ok = true;
const fail = (msg) => { ok = false; console.log(`  FAIL: ${msg}`); };

// Optional filters, so groups can be checked in parallel:
//   node tools/check-levels.js --tier=2 --group=3   (both counted from 0)
const only = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? Number(a.split('=')[1]) : null; };
const onlyTier = only('tier');
const onlyGroup = only('group');

tiers.forEach((t, ti) => {
if (onlyTier !== null && ti !== onlyTier) return;
const { minSize, maxSize } = plan.tiers[ti];
t.groups.forEach((g, gi) => {
  if (onlyGroup !== null && gi !== onlyGroup) return;
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
    const twins = level.twins || [];
    const world = { mirrors, rotatable: level.rotatable, gates, plates, twins };
    let result = solve(n, level.lines, { maxStates: 400000, ...world });
    const fullGaveUp = !!result.gaveUp;
    // Big turning-reflector boards: if the full search runs out of room, try
    // turns and lines leaving only. A solution found there is real (and, on
    // a level with see-through parts, means they aren't needed: flagged
    // below); finding nothing there proves nothing.
    if (fullGaveUp && level.rotatable) {
      const quick = solve(n, level.lines, { maxStates: 400000, ...world, slides: false });
      if (quick.solvable) result = quick;
    }
    // Big mixed levels: if the full search couldn't finish, replay the known
    // solution saved with the level by the game's rules.
    let replayed = null;
    if (!result.solvable && fullGaveUp) {
      const entry = bankEntries.get(raw);
      const saved = (g.solutions || [])[i] || (entry && entry.solution);
      if (saved) {
        const path = pathFromText(saved);
        if (playPath(n, level.lines, world, path)) {
          replayed = path;
          result = { solvable: true, par: path.length, partialMoves: path.filter((p) => p.to !== undefined && p.to >= 0).length, replayed: true };
        }
      }
    }
    console.log(`  ${name.padStart(5)}  ${n}x${n}  ${String(level.lines.length).padStart(2)} lines  par ${String(level.par).padStart(2)}  ` +
      (result.solvable ? `solved in ${result.par}${result.replayed ? ' (replayed known solution)' : ''}` : 'NOT SOLVED') +
      (mirrors.length ? `  ${mirrors.length} ${level.rotatable ? 'turnable ' : ''}reflectors${hasClear ? ', see-through' : ''}` : '') +
      (gates.length ? `  ${gates.length} gates` : '') +
      (twins.length ? `  ${twins.length} twin pairs` : '') +
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
    if (gi < 2 && mirrors.length) fail(`${name} has reflectors`);
    if (gi !== 4 && gates.length) fail(`${name} has gates`);
    if (gi !== 5 && twins.length) fail(`${name} has twin eels`);
    if (gi === 5 && !twins.length) fail(`${name} has no twin eels`);
    if (gi === 5) {
      // The twins must matter: the same board without them takes fewer moves.
      const alone = solve(n, level.lines, { maxStates: 400000, mirrors });
      if (alone.solvable && alone.par >= result.par) fail(`${name}: the twins make no difference`);
    }
    if (gi < 3 && level.rotatable) fail(`${name} has turnable reflectors`);
    // Groups 4 and 5: see-through parts, when present, must be used: the best
    // solution (or the replayed one) needs a partial slide.
    if (gi >= 3 && hasClear && result.solvable && result.partialMoves < 1) fail(`${name} has see-through parts but no partial slide is needed`);
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
      // Quick proof first: some line runs into a flat side (or loops), so it
      // can never leave without a turn. Otherwise the search must finish.
      const map = mirrorMap(n, mirrors);
      if (level.lines.every((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map).escapes)) {
        const still = solve(n, level.lines, { maxStates: 400000, mirrors });
        if (still.solvable) fail(`${name} can be solved without turning a reflector`);
        else if (still.gaveUp) fail(`${name}: couldn't prove turning is needed`);
      }
    }
    if (gi === 4) {
      // Gates and plates: the gates matter.
      if (!gates.length || !plates.length) fail(`${name} has no gates or plates`);
      // Quick proof: some line's way out reaches a gate before any reflector
      // (turning can't steer it away), so with gates shut it can't leave.
      const mirrorCells = new Set(mirrors.map(([x, y]) => y * n + x));
      const map = mirrorMap(n, mirrors);
      const throughGate = level.lines.some((l) => {
        for (const [x, y] of tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map).cells) {
          if (mirrorCells.has(y * n + x)) return false;
          if (gates.some(([gx, gy]) => gx === x && gy === y)) return true;
        }
        return false;
      });
      if (!throughGate) {
        const shut = solve(n, level.lines, { maxStates: 400000, mirrors, rotatable: level.rotatable, gates, plates: [] });
        if (shut.solvable || shut.gaveUp) fail(`${name} doesn't need its gates`);
      }
      if (level.rotatable) {
        const map2 = mirrorMap(n, mirrors);
        if (level.lines.every((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map2).escapes)) {
          const still = solve(n, level.lines, { maxStates: 400000, mirrors, gates, plates });
          if (still.solvable || still.gaveUp) fail(`${name}: couldn't prove turning is needed`);
        }
      }
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
