/*
 * Test daily puzzles: each day's four puzzles spell out that day's date
 * ("12 11" = 12 November) with an eel or two per digit, in the day's colour
 * theme. Easy and Medium use small digits; Hard and Insane use digits twice
 * the size on bigger boards. Every puzzle is checked to be solvable.
 *
 *   node tools/daily-test-dates.js --from 2026-11-12 --days 30
 *     -> levels-daily/test-<from>.sql (replaces those days' puzzles)
 */
'use strict';
const fs = require('fs');
const path = require('path');
require('../rules.js');
const { encodeLevel, solve, pathToText } = globalThis.ArrowRules;

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const from = opt.from;
const daysCount = Number(opt.days || 30);

// Digits on a 3x5 grid, as strokes (each stroke is one eel; it runs from its
// tail to its head along the corner points given).
const DIGITS = {
  0: [[[0, 1], [0, 0], [2, 0], [2, 4], [0, 4], [0, 2]]],
  1: [[[1, 4], [1, 0]]],
  2: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 4], [2, 4]]],
  3: [[[0, 0], [2, 0], [2, 4], [0, 4]], [[0, 2], [1, 2]]],
  4: [[[0, 0], [0, 2], [1, 2]], [[2, 0], [2, 4]]],
  5: [[[2, 0], [0, 0], [0, 2], [2, 2], [2, 4], [0, 4]]],
  6: [[[2, 0], [0, 0], [0, 4], [2, 4], [2, 2], [1, 2]]],
  7: [[[0, 0], [2, 0], [2, 4]]],
  8: [[[0, 3], [0, 4], [2, 4], [2, 0], [0, 0]], [[0, 1], [0, 2], [1, 2]]],
  9: [[[1, 2], [0, 2], [0, 0], [2, 0], [2, 4], [0, 4]]],
};
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
const SIZES = [[18, 1], [20, 1], [30, 2], [40, 2]]; // board size, digit scale per difficulty
const addDays = (day, k) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };
const dayNumber = (day) => Math.round(new Date(`${day}T12:00:00Z`).getTime() / 86400000);

/** The eels for "DD MM" on an n x n board, digits scaled by s, centred. */
function dateEels(day, n, s) {
  const [, mm, dd] = day.split('-');
  const chars = [dd[0], dd[1], ' ', mm[0], mm[1]];
  const dw = 2 * s + 1, gap = s; // digit width, gap between digits
  const width = chars.reduce((w, ch) => w + (ch === ' ' ? 2 * s : dw + gap), -gap);
  const height = 4 * s + 1;
  let x0 = Math.floor((n - width) / 2);
  const y0 = Math.floor((n - height) / 2);
  const eels = [];
  for (const ch of chars) {
    if (ch === ' ') { x0 += 2 * s; continue; }
    for (const stroke of DIGITS[ch]) {
      const cells = [];
      for (let k = 0; k < stroke.length; k++) {
        const [px, py] = stroke[k].map((v) => v * s);
        if (k === 0) { cells.push([x0 + px, y0 + py]); continue; }
        const [qx, qy] = cells[cells.length - 1];
        const tx = x0 + px, ty = y0 + py;
        for (let x = qx, y = qy; x !== tx || y !== ty;) {
          x += Math.sign(tx - x); y += Math.sign(ty - y);
          cells.push([x, y]);
        }
      }
      eels.push(cells.reverse()); // head first: the stroke's last point
    }
    x0 += dw + gap;
  }
  return eels.map((cells) => {
    const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]].findIndex(([dx, dy]) => dx === cells[0][0] - cells[1][0] && dy === cells[0][1] - cells[1][1]);
    return { cells, dir, clear: [] };
  });
}

/** Turns eels round until the whole thing can be solved. */
function solvable(n, eels) {
  const flip = (a) => {
    const cells = a.cells.slice().reverse();
    const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]].findIndex(([dx, dy]) => dx === cells[0][0] - cells[1][0] && dy === cells[0][1] - cells[1][1]);
    return { cells, dir, clear: [] };
  };
  for (let mask = 0; mask < 1 << Math.min(eels.length, 12); mask++) {
    const trial = eels.map((a, i) => ((mask >> i) & 1 ? flip(a) : a));
    const r = solve(n, trial, { maxStates: 20000 });
    if (r.solvable) return { eels: trial, r };
  }
  return null;
}

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const sql = [];
for (let k = 0; k < daysCount; k++) {
  const day = addDays(from, k);
  const [themeName, palette] = THEMES[dayNumber(day) % THEMES.length];
  const label = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  for (let d = 0; d < 4; d++) {
    const [n, s] = SIZES[d];
    const eels = dateEels(day, n, s);
    if (eels.some((a) => a.cells.some(([x, y]) => x < 0 || y < 0 || x >= n || y >= n))) throw new Error(`${day} difficulty ${d}: the date doesn't fit on ${n}x${n}`);
    const got = solvable(n, eels);
    if (!got) throw new Error(`${day} difficulty ${d}: can't make it solvable`);
    const colors = { palette, lines: got.eels.map((_, i) => (i + d) % palette.length) };
    const level = encodeLevel({ size: n, par: got.r.par, lines: got.eels, mirrors: [], colors });
    sql.push(`insert into public.eel_daily_puzzles (day, difficulty, level, solution, title) values (${q(day)}, ${d}, ${q(level)}, ${q(pathToText(got.r.path))}, ${q(`Test: ${label}`)}) on conflict (day, difficulty) do update set level = excluded.level, solution = excluded.solution, title = excluded.title;`);
  }
}
const out = path.join(__dirname, '..', 'levels-daily', `test-${from}.sql`);
fs.writeFileSync(out, sql.join('\n') + '\n');
console.log(`wrote ${sql.length} puzzles (${daysCount} days) to ${out} (${fs.statSync(out).size} bytes)`);
