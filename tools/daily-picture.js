/*
 * Turns one picture into a day's four daily puzzles (Easy, Medium, Hard,
 * Insane), each drawn by its eels and showing the picture when solved.
 *
 *   node tools/daily-picture.js picture.png --day 2026-12-01 --title "Christmas tree" [--out dir]
 *     -> <out>/<day>.sql      (upserts the four rows into eel_daily_puzzles)
 *     -> <out>/<day>.json     (the rows, plus stats)
 *     -> <out>/<day>-<size>.png (previews of each grid)
 *
 * Each difficulty: tools/picture-grid.py shrinks the picture to the board
 * size (colours picked from the picture itself), tools/picture-level.js
 * covers it with eels, and (Medium and up) tools/picture-tricky.js adds
 * jams by giving eels see-through parts and turning some round. Every
 * puzzle is checked: it plays through with its solution, and every square
 * is covered.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('../rules.js');
const { decodeLevel, solve, playPath, pathToText, pathFromText } = globalThis.ArrowRules;

const args = process.argv.slice(2);

// `--days MM-DD MM-DD`: the days of a theme period still to come (from
// tomorrow, Australian time, to the period's end; next year's if this
// year's is over), one per line, for picking the next free one.
if (args[0] === '--days') {
  const [from, to] = [args[1], args[2]];
  const now = new Date(Date.now() + 11 * 3600 * 1000); // AEDT, near enough
  const iso = (d) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  for (const year of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    const start = new Date(`${year}-${from}T00:00:00Z`);
    let end = new Date(`${year}-${to}T00:00:00Z`);
    if (end < start) end = new Date(`${year + 1}-${to}T00:00:00Z`);
    const days = [];
    for (let d = new Date(Math.max(start, tomorrow)); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(iso(d));
    if (days.length) { console.log(days.join('\n')); process.exit(0); }
  }
  process.exit(0);
}
const src = args[0];
const opt = {};
for (let i = 1; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const day = opt.day;
const title = opt.title || 'Picture';
const out = opt.out || path.join(__dirname, '..', 'levels-daily', 'pictures');
if (!src || !/^\d{4}-\d{2}-\d{2}$/.test(day || '')) {
  console.error('usage: node tools/daily-picture.js picture.png --day YYYY-MM-DD --title "Name" [--out dir]');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

// Board size and how many partial slides (jams) to aim for, per difficulty.
const PLAN = [
  { name: 'Easy', size: 20, target: 0 },
  { name: 'Medium', size: 26, target: 3 },
  { name: 'Hard', size: 32, target: 10 },
  { name: 'Insane', size: 40, target: 25 },
];

const tools = __dirname;
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'daily-picture-'));
const run = (cmd, a, timeout = 20 * 60 * 1000) => execFileSync(cmd, a, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });

const rows = [];
PLAN.forEach((p, d) => {
  const grid = path.join(tmp, `grid-${p.size}.json`);
  const preview = path.join(out, `${day}-${p.size}.png`);
  run('python3', [path.join(tools, 'picture-grid.py'), src, grid, '--size', String(p.size), '--preview', preview]);
  const lvl = path.join(tmp, `level-${p.size}.json`);
  run('node', [path.join(tools, 'picture-level.js'), grid, lvl, '--tries', '400', '--max', '6']);
  let file = lvl;
  if (p.target) {
    const trk = path.join(tmp, `tricky-${p.size}.json`);
    run('node', [path.join(tools, 'picture-tricky.js'), lvl, trk, '--target', String(p.target), '--steps', String(1000 + p.target * 200)]);
    file = trk;
  }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const L = decodeLevel(j.level);
  const n = L.size;
  let sol = j.solution ? pathFromText(j.solution) : null;
  if (!sol) {
    const r = solve(n, L.lines, { maxStates: 200000 });
    if (!r.solvable) throw new Error(`${p.name}: not solvable`);
    sol = r.path;
  }
  if (!playPath(n, L.lines, {}, sol)) throw new Error(`${p.name}: its solution doesn't play through`);
  const covered = new Set();
  L.lines.forEach((l) => l.cells.forEach(([x, y]) => covered.add(y * n + x)));
  if (covered.size !== n * n) throw new Error(`${p.name}: ${n * n - covered.size} gaps`);
  const stats = { size: n, eels: L.lines.length, partialSlides: (j.stats && j.stats.partialSlides) || 0, par: L.par };
  console.log(`${p.name}: ${n}x${n}, ${stats.eels} eels, ${stats.partialSlides} partial slides, checked`);
  rows.push({ day, difficulty: d, level: j.level, solution: pathToText(sol), title, picture: true, stats });
});
fs.rmSync(tmp, { recursive: true, force: true });

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = rows.map((r) => `insert into public.eel_daily_puzzles (day, difficulty, level, solution, title, picture) values (${q(r.day)}, ${r.difficulty}, ${q(r.level)}, ${q(r.solution)}, ${q(r.title)}, true) on conflict (day, difficulty) do update set level = excluded.level, solution = excluded.solution, title = excluded.title, picture = excluded.picture;`).join('\n');
fs.writeFileSync(path.join(out, `${day}.sql`), sql + '\n');
fs.writeFileSync(path.join(out, `${day}.json`), JSON.stringify(rows, null, 1));
console.log(`wrote ${path.join(out, `${day}.sql`)}`);
