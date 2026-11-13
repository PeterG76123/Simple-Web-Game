/*
 * Repairs the last few gaps in a tricky level instead of throwing the level
 * away. For a gap, the eels in a small patch around it are lifted off and the
 * whole patch (their squares plus the gap) is covered again exactly with new
 * eels, so the patch has no gaps by construction. The result is kept only if
 * the level is still solvable and at least as hard (same staged-jam score or
 * better). Each try is one solve (well under a second on 40x40), so thousands
 * of tries are cheap. Eels that slide in the solution (the jams) are kept
 * unless the patch can't be fixed without them.
 *
 *   node tools/patch-gaps.js levels-tricky/insane-solid-14.json [--tries 4000] [--out file]
 *
 * Rewrites the file (or --out) only if it ends with fewer gaps; exits 0 when
 * the level has no gaps left.
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { decodeLevel, encodeLevel, solveStaged, pathToText, playPath, DIRS } = globalThis.ArrowRules;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const score = (r) => r.stages.reduce((a, d) => a + d * d, 0);
const dirOf = (cells) => DIRS.findIndex(([dx, dy]) => dx === cells[0][0] - cells[1][0] && dy === cells[0][1] - cells[1][1]);

/** Splits a set of squares into paths of 2+ squares, or null if one is left alone. */
function tile(n, region, rand, maxLen) {
  const free = new Set(region);
  const nb = (c) => {
    const x = c % n, y = Math.floor(c / n), out = [];
    if (x > 0) out.push(c - 1); if (x < n - 1) out.push(c + 1);
    if (y > 0) out.push(c - n); if (y < n - 1) out.push(c + n);
    return out;
  };
  const deg = (c) => nb(c).filter((d) => free.has(d)).length;
  // Lowest-degree pick, random among ties: corners and dead ends first, so
  // nothing gets cut off on its own.
  const pick = (list) => {
    let best = [], bd = 9;
    for (const c of list) { const d = deg(c); if (d < bd) { bd = d; best = [c]; } else if (d === bd) best.push(c); }
    return best.length ? best[Math.floor(rand() * best.length)] : -1;
  };
  const paths = [];
  const endOf = new Map(); // square -> path whose end it is
  while (free.size) {
    const start = pick([...free]);
    free.delete(start);
    const p = [start];
    const len = 2 + Math.floor(rand() * (maxLen - 1));
    while (p.length < len) {
      const next = pick(nb(p[p.length - 1]).filter((d) => free.has(d)));
      if (next < 0) break;
      free.delete(next);
      p.push(next);
    }
    if (p.length === 1) {
      // On its own: join the end of a path already made next to it.
      const host = nb(start).map((d) => endOf.get(d)).find((q) => q);
      if (!host) return null;
      endOf.delete(host[0]); endOf.delete(host[host.length - 1]);
      if (nb(start).includes(host[0])) host.unshift(start); else host.push(start);
      endOf.set(host[0], host); endOf.set(host[host.length - 1], host);
      continue;
    }
    paths.push(p);
    endOf.set(p[0], p); endOf.set(p[p.length - 1], p);
  }
  return paths;
}

function patch(n, arrows, rand, { tries = 4000, maxStates = 30000, log = () => {}, onBetter = () => {} } = {}) {
  const N = n * n;
  const hard = (as) => { const r = solveStaged(n, as, { maxStates }); return r.solvable ? r : null; };
  let best = { arrows, r: hard(arrows) };
  if (!best.r) throw new Error('level is not solvable to start with');
  const base = score(best.r);
  const gapsOf = (as) => {
    const cov = new Uint8Array(N);
    as.forEach((a) => a.cells.forEach(([x, y]) => { cov[y * n + x] = 1; }));
    const g = [];
    for (let c = 0; c < N; c++) if (!cov[c]) g.push(c);
    return g;
  };
  let gaps = gapsOf(arrows);
  for (let t = 0; t < tries && gaps.length; t++) {
    const as = best.arrows;
    const slides = new Set(best.r.path.filter((s) => s.to !== -1).map((s) => s.line));
    const g = gaps[Math.floor(rand() * gaps.length)];
    const gx = g % n, gy = Math.floor(g / n);
    // Patch size grows slowly with the tries; jam eels can go after a while.
    const r = 1 + Math.floor(rand() * Math.min(5, 1 + t / 300));
    const takeSliders = t > tries / 3 && rand() < 0.3;
    const near = (x, y) => Math.abs(x - gx) <= r && Math.abs(y - gy) <= r;
    const lift = new Set();
    as.forEach((a, i) => { if ((takeSliders || !slides.has(i)) && a.cells.some(([x, y]) => near(x, y))) lift.add(i); });
    const region = [];
    as.forEach((a, i) => { if (lift.has(i)) a.cells.forEach(([x, y]) => region.push(y * n + x)); });
    for (const c of gaps) if (near(c % n, Math.floor(c / n))) region.push(c);
    const paths = tile(n, region, rand, 3 + Math.floor(rand() * 6));
    if (!paths) continue;
    const kept = as.filter((_, i) => !lift.has(i));
    // A few ways round for the new eels before giving up on this patch.
    for (let o = 0; o < 4; o++) {
      const fresh = paths.map((p) => {
        const cells = (rand() < 0.5 ? p : p.slice().reverse()).map((c) => [c % n, Math.floor(c / n)]);
        return { cells, dir: dirOf(cells), clear: [] };
      });
      const trial = kept.concat(fresh);
      const rr = hard(trial);
      if (!rr || score(rr) < base) continue;
      best = { arrows: trial, r: rr };
      gaps = gapsOf(trial);
      onBetter({ ...best, gaps: gaps.length });
      log(`try ${t}: patch r=${r}${takeSliders ? ' (jam eels too)' : ''} -> ${gaps.length} gaps, score ${score(rr)}`);
      break;
    }
  }
  return { ...best, gaps: gaps.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0];
  const opt = {};
  for (let i = 1; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
  const out = opt.out || file;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const L = decodeLevel(j.level);
  const n = L.size;
  const arrows = L.lines.map((l) => ({ cells: l.cells, dir: l.dir, clear: l.clear || [] }));
  const before = j.stats.gaps;
  const t0 = Date.now();
  // Saved after every improvement, so a run that's stopped part-way keeps its progress.
  const save = (res) => {
    if (!(res.gaps < before) || !playPath(n, res.arrows, {}, res.r.path)) return;
    const level = encodeLevel({ size: n, par: res.r.par, lines: res.arrows, mirrors: [] });
    const stats = { ...j.stats, eels: res.arrows.length, gaps: res.gaps, partialSlides: res.r.partialMoves, jams: res.r.stages.join(' '),
      deepest: Math.max(...res.r.stages), score: score(res.r), par: res.r.par, patched: true };
    fs.writeFileSync(out, JSON.stringify({ level, solution: pathToText(res.r.path), stats }, null, 1));
  };
  const res = patch(n, arrows, rng(Number(opt.seed || 12345)), { tries: Number(opt.tries || 4000), log: (s) => console.log(s), onBetter: save });
  console.log(`${file}: gaps ${before} -> ${res.gaps} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  process.exitCode = res.gaps === 0 ? 0 : 1;
}

module.exports = { patch, tile };
