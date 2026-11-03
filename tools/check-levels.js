// Confirms every level can be solved, and prints each board.
// Run with: node tools/check-levels.js
require('../levels.js');
const { LEVELS, solve, analyse, buildLine } = globalThis.ArrowLevels;

let ok = true;
LEVELS.forEach((level, i) => {
  const n = level.size;
  const crafted = i >= 5;
  const wholeExits = analyse(n, level.arrows);
  const full = crafted ? solve(n, level.arrows) : null;
  const solvable = crafted ? full.solvable : wholeExits.solvable;
  let note = `${level.arrows.length} lines, best possible ${level.par} moves`;
  if (crafted) {
    // Tutorials 7-10 must need a partial slide: whole exits alone get stuck.
    const needsPartial = !wholeExits.solvable;
    note += needsPartial ? ', needs a partial slide' : ', solvable with whole exits';
    if (i >= 6 && !needsPartial) ok = false;
    if (full.moves !== level.par) ok = false;
  }
  console.log(`Level ${i + 1} (${n}x${n}): ${solvable ? 'solvable' : 'NOT SOLVABLE'}, ${note}`);
  if (!solvable || n > 10) ok = false;

  if (process.argv.includes('--show')) {
    const g = Array.from({ length: n }, () => Array(n).fill(' .'));
    level.arrows.forEach((a, id) => {
      const line = buildLine(n, a);
      a.cells.forEach(([x, y], k) => {
        const ch = k === 0 ? '^>v<'[a.dir] : line.solid[a.cells.length - 1 - k] ? String.fromCharCode(97 + id) : '~';
        if (g[y][x] === ' .' || ch !== '~') g[y][x] = ch.padStart(2);
      });
    });
    console.log(g.map((r) => r.join('')).join('\n'));
  }
});
process.exit(ok ? 0 : 1);
