/*
 * Makes daily puzzles: four a day (Easy, Medium, Hard, Insane), each day in
 * a colour theme, ready to load into the eel_daily_puzzles table.
 *
 *   node tools/daily-make.js --from 2026-11-12 --days 14 [--insane-size 28]
 *     -> levels-daily/<from>.json  (rows: day, difficulty, level, solution, title)
 *     -> levels-daily/<from>.sql   (insert statements, to run on the database)
 *
 * Easy, Medium and Hard come from spare levels in levels-bank/ (ones the main
 * game doesn't use, and that no earlier daily has used: levels-daily/used.json),
 * recoloured in the day's theme. Insane comes from tools/trick-gen.js (picture
 * levels can replace it on chosen days). Every puzzle gets a known solution,
 * for instant hints.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('../rules.js');
globalThis.window = globalThis;
require('../levels-data.js');
const { decodeLevel, encodeLevel, solve, pathToText, solveStaged } = globalThis.ArrowRules;

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const from = opt.from;
const daysCount = Number(opt.days || 14);
const insaneSize = Number(opt['insane-size'] || 28);
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'levels-daily');
fs.mkdirSync(outDir, { recursive: true });

const THEMES = [
  ['Coral reef', ['ff6f61', 'ffb347', 'ff9ff3', 'ffd166', 'ff7aa2', 'f49b70']],
  ['Deep blue', ['5ef2ff', '4cc9f0', '4895ef', '7b9cff', 'a0c4ff', '56cfe1']],
  ['Kelp forest', ['9be564', '52b788', 'b5e48c', '74c69d', 'd9ed92', '2dd4bf']],
  ['Sunset', ['ff6b6b', 'ff9f1c', 'ffbf69', 'f15bb5', 'fee440', 'ff8fab']],
  ['Glow', ['39ff14', '00f5d4', 'f15bb5', 'fee440', '9b5de5', '00bbf9']],
  ['Pearl', ['f8f9fa', 'e0c3fc', 'bde0fe', 'ffc8dd', 'cdb4db', 'a2d2ff']],
  ['Lagoon', ['00f5d4', '00bbf9', '72efdd', '64dfdf', '80ffdb', '5390d9']],
  ['Ember', ['ff595e', 'ffca3a', 'ff924c', 'ff6392', 'f9844a', 'ffd6a5']],
  ['Jellyfish', ['c77dff', 'e0aaff', 'ff8fab', '9d4edd', 'f72585', 'b8c0ff']],
  ['Seafoam', ['b9fbc0', '98f5e1', '8eecf5', '90dbf4', 'a3c4f3', 'cfbaf0']],
];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const addDays = (day, k) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };

/** Colours each line from the palette so touching lines differ where possible. */
function themed(text, palette, rand) {
  const L = decodeLevel(text);
  const n = L.size;
  const owner = new Map();
  L.lines.forEach((l, i) => l.cells.forEach(([x, y]) => owner.set(y * n + x, i)));
  const near = L.lines.map(() => new Set());
  L.lines.forEach((l, i) => l.cells.forEach(([x, y]) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = owner.get((y + dy) * n + x + dx);
      if (j !== undefined && j !== i && x + dx >= 0 && x + dx < n) near[i].add(j);
    }
  }));
  const col = new Array(L.lines.length).fill(-1);
  L.lines.forEach((_, i) => {
    const counts = palette.map((_, k) => [...near[i]].filter((j) => col[j] === k).length);
    const best = Math.min(...counts);
    const choices = counts.map((c, k) => (c === best ? k : -1)).filter((k) => k >= 0);
    col[i] = choices[Math.floor(rand() * choices.length)];
  });
  const extras = { rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins };
  return encodeLevel({ size: n, par: L.par, lines: L.lines, mirrors: L.mirrors, extras, colors: { palette, lines: col } });
}

function solutionOf(text) {
  const L = decodeLevel(text);
  const r = solve(L.size, L.lines, { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins, maxStates: 100000 });
  return r.solvable ? pathToText(r.path) : null;
}

// Spare bank levels by difficulty (no twins: their colours carry meaning).
const used = new Set();
for (const t of globalThis.ArrowLevelData.tiers) for (const g of t.groups) for (const l of g.levels) used.add(l);
const usedFile = path.join(outDir, 'used.json');
const usedDaily = new Set(fs.existsSync(usedFile) ? JSON.parse(fs.readFileSync(usedFile, 'utf8')) : []);
const spare = [[], [], []];
const RANGES = [[6, 10], [13, 20], [22, 30]];
for (const f of fs.readdirSync(path.join(root, 'levels-bank'))) {
  const [kind, size] = f.replace('.jsonl', '').split('-');
  if (kind.startsWith('twins')) continue;
  const n = Number(size);
  const d = RANGES.findIndex(([a, b]) => n >= a && n <= b);
  if (d < 0) continue;
  for (const line of fs.readFileSync(path.join(root, 'levels-bank', f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    if (!used.has(e.level) && !usedDaily.has(e.level)) spare[d].push({ level: e.level, kind, n });
  }
}
const rand = rng(Number(from.replace(/-/g, '')));
for (const list of spare) for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
console.log(`spare: easy ${spare[0].length}, medium ${spare[1].length}, hard ${spare[2].length}`);

const rows = [];
const dayNumber = (day) => Math.round(new Date(`${day}T12:00:00Z`).getTime() / 86400000);
for (let k = 0; k < daysCount; k++) {
  const day = addDays(from, k);
  const [themeName, palette] = THEMES[dayNumber(day) % THEMES.length];
  for (let d = 0; d < 3; d++) {
    // Mix the kinds: a plain one most days, the others now and then.
    const pick = spare[d].shift();
    if (!pick) throw new Error(`Out of spare ${['easy', 'medium', 'hard'][d]} levels`);
    usedDaily.add(pick.level);
    const level = themed(pick.level, palette, rand);
    rows.push({ day, difficulty: d, level, solution: solutionOf(level), title: themeName });
  }
  // Insane: a tricky level from trick-gen.
  const tmp = path.join(outDir, `.insane-${day}.json`);
  execFileSync('node', [path.join(__dirname, 'trick-gen.js'), '--size', String(insaneSize), '--tries', '4', '--seed', String(dayNumber(day)),
    '--depth', '6', '--keys', '4', '--fill', '0', '--backFill', '0', '--out', tmp], { encoding: 'utf8' });
  const t = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  const level = themed(t.level, palette, rand);
  rows.push({ day, difficulty: 3, level, solution: t.solution, title: themeName });
  console.log(`${day} ${themeName}: insane ${t.stats.size}x${t.stats.size}, ${t.stats.gaps} gaps, jams ${t.stats.jams}`);
}

fs.writeFileSync(path.join(outDir, `${from}.json`), JSON.stringify(rows, null, 1));
fs.writeFileSync(usedFile, JSON.stringify([...usedDaily]));
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const sql = rows.map((r) => `insert into public.eel_daily_puzzles (day, difficulty, level, solution, title) values (${q(r.day)}, ${r.difficulty}, ${q(r.level)}, ${q(r.solution)}, ${q(r.title)}) on conflict (day, difficulty) do update set level = excluded.level, solution = excluded.solution, title = excluded.title;`).join('\n');
fs.writeFileSync(path.join(outDir, `${from}.sql`), sql + '\n');
console.log(`wrote ${rows.length} puzzles`);
