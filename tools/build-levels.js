/*
 * Builds levels-data.js: two groups of 25 levels, each getting harder.
 *
 *   Group 1 (solid lines): generated so lines can always be slid straight out
 *   in reverse order of placement. Ordered by board size, then by how many
 *   rounds of removal they take.
 *
 *   Group 2 (see-through lines): five hand-built tutorials, then generated
 *   levels that the solver proves can be solved, that need at least one
 *   partial slide, and that cannot be solved if their see-through parts were
 *   solid. Ordered by board size and the number of partial slides needed.
 *
 * Seeds are fixed, so the output is the same every time.
 * Run with: node tools/build-levels.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { mulberry32, generate, rounds } = require('./generator.js');
const { DIRS, inBounds, buildLine, solve, solvableWithWholeExits } = globalThis.ArrowRules;

const LEVELS_PER_GROUP = 25;

// ---------------------------------------------------------------------------
// Group 1
// ---------------------------------------------------------------------------

const G1_SIZES = [4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10];

function buildGroup1() {
  const levels = G1_SIZES.map((n, i) => {
    const rng = mulberry32(10007 + i * 7919);
    const minLen = n <= 5 ? 2 : 3;
    const maxLen = Math.min(n - 1, 3 + Math.floor(i / 3));
    let best = null;
    for (let c = 0; c < 50; c++) {
      const arrows = generate(n, { minLen, maxLen }, rng);
      const r = rounds(n, arrows);
      if (!r.cleared) continue;
      const coverage = arrows.reduce((s, a) => s + a.cells.length, 0) / (n * n);
      // Prefer full boards that take many rounds and start with few free lines.
      const score = coverage * 100 + r.rounds * 6 - r.initialFree * 2;
      if (!best || score > best.score) best = { arrows, score, rounds: r.rounds };
    }
    return { size: n, arrows: best.arrows, par: best.arrows.length, difficulty: best.score };
  });
  // Within each board size, easier boards first.
  return levels.sort((a, b) => a.size - b.size || a.difficulty - b.difficulty);
}

// ---------------------------------------------------------------------------
// Group 2
// ---------------------------------------------------------------------------

const DIR_LETTERS = { U: 0, R: 1, D: 2, L: 3 };

// Each line: head cell, arrow direction, the body as steps walking away from
// the head (U/R/D/L), and see-through cells counted from the head (0 = head).
const TUTORIALS = [
  {
    // A line passes straight through a see-through part.
    size: 5,
    lines: [
      { head: [2, 2], dir: 'U', body: 'DD' },
      { head: [3, 3], dir: 'L', body: 'RUULLL', clear: [5] },
      { head: [0, 2], dir: 'U', body: 'DD' },
    ],
  },
  {
    // Slide one line part of the way so its gap lines up.
    size: 6,
    lines: [
      { head: [2, 3], dir: 'U', body: 'DD' },
      { head: [2, 2], dir: 'R', body: 'LL', clear: [1] },
      { head: [3, 4], dir: 'L', body: 'RUU' },
      { head: [5, 1], dir: 'D', body: 'U' },
    ],
  },
  {
    // The gap only lines up at one spot; sliding too far closes it again.
    size: 7,
    lines: [
      { head: [2, 3], dir: 'U', body: 'DD' },
      { head: [3, 2], dir: 'R', body: 'LLL', clear: [2] },
      { head: [3, 4], dir: 'L', body: 'RRRUU' },
      { head: [0, 4], dir: 'D', body: 'U' },
      { head: [5, 6], dir: 'R', body: 'LLL' },
    ],
  },
  {
    // Two gaps to line up before the middle line can leave.
    size: 7,
    lines: [
      { head: [3, 4], dir: 'U', body: 'DD' },
      { head: [3, 1], dir: 'R', body: 'LL', clear: [1] },
      { head: [3, 3], dir: 'L', body: 'RR', clear: [1] },
      { head: [4, 5], dir: 'L', body: 'RRUUUUL' },
      { head: [2, 6], dir: 'R', body: 'LUUU' },
    ],
  },
  {
    // A see-through part can also slide over a solid line.
    size: 7,
    lines: [
      { head: [4, 4], dir: 'U', body: 'DD' },
      { head: [4, 2], dir: 'R', body: 'LLL', clear: [1, 2] },
      { head: [3, 4], dir: 'R', body: 'LURUU' },
      { head: [5, 6], dir: 'L', body: 'RUUUU' },
      { head: [0, 1], dir: 'U', body: 'DD' },
    ],
  },
];

function parseTutorial(spec, t) {
  const n = spec.size;
  const arrows = spec.lines.map((l, li) => {
    const dir = DIR_LETTERS[l.dir];
    const cells = [l.head.slice()];
    let [x, y] = l.head;
    for (const step of l.body) {
      const [dx, dy] = DIRS[DIR_LETTERS[step]];
      x += dx;
      y += dy;
      cells.push([x, y]);
    }
    const where = `Tutorial ${t + 1}, line ${li + 1}`;
    if (l.body[0] !== 'URDL'[(dir + 2) % 4]) throw new Error(`${where}: body must start behind the arrow`);
    if (cells.some(([cx, cy]) => !inBounds(n, cx, cy))) throw new Error(`${where}: off the board`);
    if ((l.clear || []).includes(0)) throw new Error(`${where}: the head must be solid`);
    return { cells, dir, clear: l.clear || [] };
  });
  const result = solve(n, arrows);
  if (!result.solvable) throw new Error(`Tutorial ${t + 1} cannot be solved`);
  return { size: n, arrows, par: result.par };
}

// Board size and number of partial slides needed for generated levels 6-25.
const G2_PLAN = [
  [6, 1], [6, 1], [6, 1], [6, 1],
  [7, 1], [7, 1], [7, 2], [7, 2],
  [8, 1], [8, 2], [8, 2], [8, 2],
  [8, 3], [9, 2], [9, 2], [9, 3],
  [9, 3], [10, 2], [10, 3], [10, 4],
];

const G2_OPTIONS = {
  6: { minLen: 3, maxLen: 5, tangle: 0.15, clearChance: 0.5 },
  7: { minLen: 3, maxLen: 6, tangle: 0.15, clearChance: 0.5 },
  8: { minLen: 3, maxLen: 7, tangle: 0.2, clearChance: 0.5 },
  9: { minLen: 3, maxLen: 7, tangle: 0.2, clearChance: 0.5 },
  10: { minLen: 3, maxLen: 8, tangle: 0.2, clearChance: 0.5 },
};

function allSolid(arrows) {
  return arrows.map((a) => ({ cells: a.cells, dir: a.dir, clear: [] }));
}

/** Collects valid see-through levels for one board size, keyed by partial slides needed. */
function poolFor(n, wanted, seed) {
  const rng = mulberry32(seed);
  const pool = {};
  const enough = () => Object.entries(wanted).every(([k, count]) => (pool[k] || []).length >= count * 3);
  for (let tries = 0; tries < 6000 && !enough(); tries++) {
    const arrows = generate(n, G2_OPTIONS[n], rng);
    if (!arrows.some((a) => a.clear.length > 0)) continue;
    if (solvableWithWholeExits(n, arrows)) continue;
    const result = solve(n, arrows, { maxStates: 40000 });
    if (!result.solvable) continue;
    // The see-through parts must matter: with them solid, it can't be done.
    if (solve(n, allSolid(arrows), { maxStates: 40000 }).solvable) continue;
    const key = Math.min(result.partialMoves, 4);
    (pool[key] = pool[key] || []).push({ size: n, arrows, par: result.par, partial: result.partialMoves, states: result.states });
  }
  return pool;
}

function buildGroup2() {
  const levels = TUTORIALS.map(parseTutorial);
  const bySize = {};
  for (const [n, p] of G2_PLAN) {
    bySize[n] = bySize[n] || {};
    bySize[n][p] = (bySize[n][p] || 0) + 1;
  }
  const pools = {};
  for (const n of Object.keys(bySize)) pools[n] = poolFor(Number(n), bySize[n], 20011 + Number(n) * 104729);

  const chosen = G2_PLAN.map(([n, p]) => {
    // Take the candidate with the biggest search (hardest to spot) at this
    // size and partial count, falling back to a nearby partial count.
    for (const k of [p, p + 1, p - 1, p + 2, p - 2]) {
      const list = pools[n][k];
      if (list && list.length) {
        list.sort((a, b) => b.states - a.states);
        return list.shift();
      }
    }
    throw new Error(`No ${n}x${n} level with ${p} partial slides`);
  });
  // Keep the plan's order but make sure difficulty never drops within a size.
  chosen.sort((a, b) => a.size - b.size || a.partial - b.partial || a.states - b.states);
  return levels.concat(chosen);
}

// ---------------------------------------------------------------------------

function main() {
  const t0 = Date.now();
  const groups = [
    { name: 'Solid lines', levels: buildGroup1() },
    { name: 'See-through lines', levels: buildGroup2() },
  ];
  for (const g of groups) {
    if (g.levels.length !== LEVELS_PER_GROUP) throw new Error(`${g.name}: expected ${LEVELS_PER_GROUP} levels`);
  }

  const lines = [
    '// Generated by tools/build-levels.js. Do not edit by hand.',
    '// Each line: cells (head first), dir (0 up, 1 right, 2 down, 3 left), clear (see-through cells, counted from the head).',
    '(function (root) {',
    '  root.ArrowLevelData = {',
    '    unlockAfter: 10,',
    '    groups: [',
  ];
  for (const g of groups) {
    lines.push(`      { name: ${JSON.stringify(g.name)}, levels: [`);
    for (const l of g.levels) {
      const data = { size: l.size, par: l.par, lines: l.arrows.map((a) => ({ cells: a.cells, dir: a.dir, clear: a.clear })) };
      lines.push(`        ${JSON.stringify(data)},`);
    }
    lines.push('      ] },');
  }
  lines.push('    ],', '  };', "})(typeof window !== 'undefined' ? window : globalThis);", '');
  fs.writeFileSync(path.join(__dirname, '..', 'levels-data.js'), lines.join('\n'));

  groups.forEach((g, gi) => {
    console.log(`Group ${gi + 1}: ${g.name}`);
    g.levels.forEach((l, i) => {
      const extra = l.partial !== undefined ? `, ${l.partial} partial` : '';
      console.log(`  ${String(i + 1).padStart(2)}. ${l.size}x${l.size}, ${l.arrows.length} lines, par ${l.par}${extra}`);
    });
  });
  console.log(`Built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main();
