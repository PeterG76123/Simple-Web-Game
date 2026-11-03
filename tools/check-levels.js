// Verifies every level can be solved. Run with: node tools/check-levels.js
require('../levels.js');
const { LEVELS, analyse } = globalThis.ArrowLevels;
let ok = true;
LEVELS.forEach((level, i) => {
  const s = analyse(level.size, level.arrows);
  console.log(`Level ${i + 1}: ${level.size}x${level.size}, ${level.arrows.length} lines, ` +
    `${Math.round(s.coverage * 100)}% filled, ${s.initialFree} free at start, solvable: ${s.solvable}`);
  if (!s.solvable || level.size > 10) ok = false;
});
process.exit(ok ? 0 : 1);
