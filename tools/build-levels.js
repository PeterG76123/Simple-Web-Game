/*
 * Builds levels-data.js: three groups of 25 levels, each getting harder.
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
 *   Group 3 (reflectors): a mix of solid levels (built the same way as Group 1)
 *   and see-through levels (checked the same way as Group 2), all with
 *   reflectors, where every reflector is on at least one line's way out.
 *
 * Seeds are fixed, so the output is the same every time.
 * Run with: node tools/build-levels.js            (all groups, ~20 minutes)
 *           node tools/build-levels.js --only=3   (rebuild one group, keep the rest)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { mulberry32, generate, rounds, mirrorsUsed, bouncingLines } = require('./generator.js');
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
// Group 3
// ---------------------------------------------------------------------------

// [board size, 'solid' or 'clear', number of reflectors]
const G3_PLAN = [
  [5, 'solid', 1], [5, 'solid', 1], [6, 'solid', 2], [6, 'clear', 1], [6, 'solid', 2],
  [7, 'solid', 2], [7, 'clear', 2], [7, 'solid', 3], [7, 'clear', 2], [8, 'solid', 3],
  [8, 'clear', 3], [8, 'solid', 4], [8, 'clear', 3], [9, 'solid', 4], [8, 'clear', 3],
  [9, 'solid', 5], [9, 'clear', 3], [9, 'solid', 5], [9, 'clear', 3], [10, 'solid', 6],
  [10, 'clear', 4], [10, 'solid', 6], [10, 'clear', 4], [10, 'solid', 7], [10, 'clear', 4],
];

const G3_CLEAR_OPTIONS = { minLen: 3, tangle: 0.2, clearChance: 0.5 };

function buildG3Solid(n, mirrorCount, i) {
  const rng = mulberry32(30011 + i * 7919);
  // The first two levels are kept small to introduce reflectors gently.
  const maxLines = i === 0 ? 4 : i === 1 ? 6 : 99;
  let best = null;
  for (let c = 0; c < 400 && (!best || c < 80); c++) {
    const { arrows, mirrors } = generate(n, { minLen: 2, maxLen: Math.min(n - 1, 3 + Math.floor(i / 3)), mirrors: mirrorCount, maxLines }, rng);
    if (!mirrorsUsed(n, arrows, mirrors)) continue;
    const r = rounds(n, arrows, mirrors);
    if (!r.cleared) continue;
    const coverage = arrows.reduce((s, a) => s + a.cells.length, 0) / (n * n);
    const bounce = bouncingLines(n, arrows, mirrors);
    const score = (i < 2 ? 0 : coverage * 100) + r.rounds * 6 - r.initialFree * 2 + bounce * 8;
    if (!best || score > best.score) best = { size: n, arrows, mirrors, par: arrows.length, score };
  }
  if (!best) throw new Error(`No solid reflector level for slot ${i + 1}`);
  return best;
}

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(__dirname, 'pool-worker.js'), { workerData: data });
    w.once('message', resolve);
    w.once('error', reject);
  });
}

async function buildGroup3() {
  // See-through slots, grouped by board size and reflector count.
  const wanted = new Map();
  G3_PLAN.forEach(([n, kind, m]) => {
    if (kind !== 'clear') return;
    const key = `${n}:${m}`;
    wanted.set(key, (wanted.get(key) || 0) + 1);
  });
  const pools = new Map();
  await Promise.all([...wanted].map(async ([key, count]) => {
    const [n, m] = key.split(':').map(Number);
    const found = await runWorker({
      n, mirrors: m, need: count * 3, seed: 40009 + n * 104729 + m * 7,
      maxTries: 4000, options: { ...G3_CLEAR_OPTIONS, maxLen: n - 2 },
    });
    if (found.length < count) throw new Error(`Only found ${found.length} of ${count} see-through ${n}x${n} levels`);
    // Hardest last: more partial slides, then a bigger search.
    found.sort((a, b) => a.partial - b.partial || a.states - b.states);
    pools.set(key, found);
  }));

  const levels = G3_PLAN.map(([n, kind, m], i) => {
    if (kind === 'solid') return buildG3Solid(n, m, i);
    // Spread picks across the pool, easiest first.
    const pool = pools.get(`${n}:${m}`);
    const total = wanted.get(`${n}:${m}`);
    const taken = G3_PLAN.slice(0, i).filter(([pn, pk, pm]) => pn === n && pk === kind && pm === m).length;
    return pool[Math.round(((taken + 1) / total) * (pool.length - 1))] || pool[pool.length - 1];
  });
  return levels;
}

// ---------------------------------------------------------------------------

function readExisting() {
  const file = path.join(__dirname, '..', 'levels-data.js');
  if (!fs.existsSync(file)) return null;
  delete globalThis.ArrowLevelData;
  require(file);
  return globalThis.ArrowLevelData.groups.map((g) => ({
    name: g.name,
    levels: g.levels.map((l) => ({ size: l.size, par: l.par, arrows: l.lines, mirrors: l.mirrors || [] })),
  }));
}

async function main() {
  const t0 = Date.now();
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
  const existing = only ? readExisting() : null;
  const builders = [
    { name: 'Solid lines', build: buildGroup1 },
    { name: 'See-through lines', build: buildGroup2 },
    { name: 'Reflectors', build: buildGroup3 },
  ];
  const groups = [];
  for (let gi = 0; gi < builders.length; gi++) {
    const keep = only && Number(only) !== gi + 1 && existing && existing[gi];
    groups.push({ name: builders[gi].name, levels: keep ? existing[gi].levels : await builders[gi].build() });
  }
  for (const g of groups) {
    if (g.levels.length !== LEVELS_PER_GROUP) throw new Error(`${g.name}: expected ${LEVELS_PER_GROUP} levels`);
  }

  const lines = [
    '// Generated by tools/build-levels.js. Do not edit by hand.',
    '// Each line: cells (head first), dir (0 up, 1 right, 2 down, 3 left), clear (see-through cells, counted from the head).',
    '// Reflectors: [x, y, openA, openB], the two open sides as directions.',
    '(function (root) {',
    '  root.ArrowLevelData = {',
    '    unlockAfter: 10,',
    '    groups: [',
  ];
  for (const g of groups) {
    lines.push(`      { name: ${JSON.stringify(g.name)}, levels: [`);
    for (const l of g.levels) {
      const data = { size: l.size, par: l.par, lines: l.arrows.map((a) => ({ cells: a.cells, dir: a.dir, clear: a.clear })) };
      if (l.mirrors && l.mirrors.length) data.mirrors = l.mirrors;
      lines.push(`        ${JSON.stringify(data)},`);
    }
    lines.push('      ] },');
  }
  lines.push('    ],', '  };', "})(typeof window !== 'undefined' ? window : globalThis);", '');
  fs.writeFileSync(path.join(__dirname, '..', 'levels-data.js'), lines.join('\n'));

  groups.forEach((g, gi) => {
    console.log(`Group ${gi + 1}: ${g.name}`);
    g.levels.forEach((l, i) => {
      let extra = l.partial !== undefined ? `, ${l.partial} partial` : '';
      if (l.mirrors && l.mirrors.length) extra += `, ${l.mirrors.length} reflectors${l.arrows.some((a) => a.clear.length) ? ', see-through' : ''}`;
      console.log(`  ${String(i + 1).padStart(2)}. ${l.size}x${l.size}, ${l.arrows.length} lines, par ${l.par}${extra}`);
    });
  });
  console.log(`Built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
