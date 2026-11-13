/*
 * Spare levels for daily puzzles: bank levels (levels-bank/) the main game
 * doesn't use and no earlier daily has used (levels-daily/used.json), by
 * difficulty (0 Easy, 1 Medium, 2 Hard), plus recolouring them in a palette.
 * Used by tools/daily-picture.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
require('../rules.js');
globalThis.window = globalThis;
require('../levels-data.js');
const { decodeLevel, encodeLevel, solve, pathToText } = globalThis.ArrowRules;

const root = path.join(__dirname, '..');
const usedFile = path.join(root, 'levels-daily', 'used.json');
// Board sizes for each difficulty.
const RANGES = [[6, 10], [13, 20], [22, 30]];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Takes one spare level for each of Easy, Medium and Hard, and records them as used. */
function takeSpare(seed) {
  const used = new Set();
  for (const t of globalThis.ArrowLevelData.tiers) for (const g of t.groups) for (const l of g.levels) used.add(l);
  const usedDaily = new Set(fs.existsSync(usedFile) ? JSON.parse(fs.readFileSync(usedFile, 'utf8')) : []);
  const spare = [[], [], []];
  for (const f of fs.readdirSync(path.join(root, 'levels-bank')).sort()) {
    const [kind, size] = f.replace('.jsonl', '').split('-');
    if (kind.startsWith('twins')) continue; // twins' colours carry meaning
    const n = Number(size);
    const d = RANGES.findIndex(([a, b]) => n >= a && n <= b);
    if (d < 0) continue;
    for (const line of fs.readFileSync(path.join(root, 'levels-bank', f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      if (!used.has(e.level) && !usedDaily.has(e.level)) spare[d].push(e.level);
    }
  }
  const rand = rng(seed);
  const picks = spare.map((list, d) => {
    if (!list.length) throw new Error(`Out of spare ${['easy', 'medium', 'hard'][d]} levels`);
    return list[Math.floor(rand() * list.length)];
  });
  picks.forEach((l) => usedDaily.add(l));
  fs.writeFileSync(usedFile, JSON.stringify([...usedDaily]));
  return picks;
}

/** Colours each eel from the palette (hex without #) so touching eels differ where possible. */
function recolour(text, palette, seed) {
  const rand = rng(seed);
  const L = decodeLevel(text);
  const n = L.size;
  const owner = new Map();
  L.lines.forEach((l, i) => l.cells.forEach(([x, y]) => owner.set(y * n + x, i)));
  const near = L.lines.map(() => new Set());
  L.lines.forEach((l, i) => l.cells.forEach(([x, y]) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (x + dx < 0 || x + dx >= n) continue;
      const j = owner.get((y + dy) * n + x + dx);
      if (j !== undefined && j !== i) near[i].add(j);
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
  for (const maxStates of [100000, 2000000]) {
    const r = solve(L.size, L.lines, { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins, maxStates });
    if (r.solvable) return pathToText(r.path);
  }
  return null;
}

module.exports = { takeSpare, recolour, solutionOf };
