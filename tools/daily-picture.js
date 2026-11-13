/*
 * Turns one picture into a day's daily puzzles: Insane is the picture itself
 * (a 40x40 level drawn by its eels, shown when solved); Easy, Medium and Hard
 * are ordinary puzzles drawn in the picture's colours.
 *
 *   node tools/daily-picture.js picture.png --day 2026-12-01 --title "Christmas tree" [--out dir]
 *     -> <out>/<day>.sql      (upserts the four rows into eel_daily_puzzles)
 *     -> <out>/<day>.json     (the rows, plus stats)
 *     -> <out>/<day>-40.png    (preview of the picture's grid)
 *   --reuse-insane 1: keep the Insane picture puzzle already in <day>.json.
 *
 * Insane: tools/picture-grid.py shrinks the picture to 40x40 (colours picked
 * from the picture, trimmed, recoloured where needed), tools/picture-level.js
 * covers it with eels, and tools/picture-tricky.js adds jams. Easy, Medium
 * and Hard: spare bank levels (tools/daily-spare.js) in the picture's
 * colours. Every puzzle is checked: it plays through with its solution, and
 * every square is covered.
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

// The picture is the day's Insane puzzle: 40x40, with jams from see-through
// and turned-round eels. Easy, Medium and Hard are ordinary puzzles (spare
// levels from the bank) drawn in the picture's colours.
const tools = __dirname;
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'daily-picture-'));
const run = (cmd, a, timeout = 20 * 60 * 1000) => execFileSync(cmd, a, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
const { takeSpare, recolour, solutionOf } = require('./daily-spare.js');

function check(name, text, sol) {
  const L = decodeLevel(text);
  const n = L.size;
  const opts = { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins };
  if (!sol || !playPath(n, L.lines, opts, pathFromText(sol))) throw new Error(`${name}: its solution doesn't play through`);
  const covered = new Set();
  L.lines.forEach((l) => l.cells.forEach(([x, y]) => covered.add(y * n + x)));
  (L.mirrors || []).forEach(([x, y]) => covered.add(y * n + x));
  (L.gates || []).forEach(([x, y]) => covered.add(y * n + x));
  if (covered.size !== n * n) throw new Error(`${name}: ${n * n - covered.size} gaps`);
  return L;
}

// Insane: the picture (or, with --reuse-insane 1, the one made before for this day).
let insane;
const prev = path.join(out, `${day}.json`);
if (opt['reuse-insane'] && fs.existsSync(prev)) {
  insane = JSON.parse(fs.readFileSync(prev, 'utf8')).find((r) => r.difficulty === 3);
}
if (!insane) {
  const size = 40;
  const grid = path.join(tmp, 'grid.json');
  run('python3', [path.join(tools, 'picture-grid.py'), src, grid, '--size', String(size), '--preview', path.join(out, `${day}-${size}.png`)]);
  const lvl = path.join(tmp, 'level.json');
  // A try can fail to find a solvable layout: new seeds, a few times.
  for (let seed = 1; ; seed++) {
    try { run('node', [path.join(tools, 'picture-level.js'), grid, lvl, '--tries', '400', '--max', '6', '--seed', String(seed * 7919)]); break; }
    catch (e) { if (seed >= 5) throw e; }
  }
  const trk = path.join(tmp, 'tricky.json');
  run('node', [path.join(tools, 'picture-tricky.js'), lvl, trk, '--target', '25', '--steps', '6000']);
  const j = JSON.parse(fs.readFileSync(trk, 'utf8'));
  insane = { day, difficulty: 3, level: j.level, solution: j.solution || solutionOf(j.level), title, picture: true };
}
const IL = check('Insane', insane.level, insane.solution);
console.log(`Insane: ${IL.size}x${IL.size} picture, ${IL.lines.length} eels, checked`);

// The picture's colours (not its sea) for the other three.
const palette = IL.colors.palette.slice(1).map((c) => c.replace(/^#/, ''));
const dayNum = Number(day.replace(/-/g, ''));
const rows = [];
takeSpare(dayNum).forEach((spare, d) => {
  const level = recolour(spare, palette, dayNum + d);
  const solution = solutionOf(level);
  const L = check(['Easy', 'Medium', 'Hard'][d], level, solution);
  console.log(`${['Easy', 'Medium', 'Hard'][d]}: ${L.size}x${L.size}, ${L.lines.length} eels, in the picture's colours, checked`);
  rows.push({ day, difficulty: d, level, solution, title, picture: false });
});
rows.push({ ...insane, day, title, picture: true });
fs.rmSync(tmp, { recursive: true, force: true });

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = rows.map((r) => `insert into public.eel_daily_puzzles (day, difficulty, level, solution, title, picture) values (${q(r.day)}, ${r.difficulty}, ${q(r.level)}, ${q(r.solution)}, ${q(r.title)}, ${r.picture}) on conflict (day, difficulty) do update set level = excluded.level, solution = excluded.solution, title = excluded.title, picture = excluded.picture;`).join('\n');
fs.writeFileSync(path.join(out, `${day}.sql`), sql + '\n');
fs.writeFileSync(path.join(out, `${day}.json`), JSON.stringify(rows, null, 1));
console.log(`wrote ${path.join(out, `${day}.sql`)}`);
