/*
 * Turns a colour grid (from tools/picture-grid.py) into a picture level:
 * every square is covered by eels of its own colour, each at least 3 long,
 * so the eels together draw the picture, and the level can always be solved.
 *
 *   node tools/picture-level.js grid.json out.json [--tries 200] [--min 3] [--max 9] [--seed 1]
 *                               [--long red,white,green --longmin 10 --longmax 30]
 *
 * How: eels are laid in the order they will leave the board. Each new eel's
 * head is placed where its way out (straight ahead to the edge) runs only
 * over eels already laid, which will have left by then, so every eel can
 * always get out once the ones before it have gone. The body then winds
 * back through free squares of the same colour. Squares left over at the end
 * are added onto the tail of a neighbouring eel of the same colour (no eel's
 * way out runs over them, so that's always safe). A try that strands a
 * square is thrown away and another is made.
 *
 * Output JSON: { level } in the game's compact format, with the picture's
 * colours, plus stats. The level is checked with the game's own solver.
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { encodeLevel, decodeLevel, solve } = globalThis.ArrowRules;

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function attempt(grid, n, rand, minLen, maxLen) {
  const owner = Array.from({ length: n }, () => new Array(n).fill(-1));
  const lines = []; // { cells: [[x,y]...] head first, color }
  const inb = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  const free = (x, y, c) => inb(x, y) && owner[y][x] < 0 && grid[y][x] === c;
  const rayClear = (x, y, [dx, dy]) => {
    for (let cx = x + dx, cy = y + dy; inb(cx, cy); cx += dx, cy += dy) if (owner[cy][cx] < 0) return false;
    return true;
  };
  const freeNeighbours = (x, y, c) => DIRS.reduce((k, [dx, dy]) => k + (free(x + dx, y + dy, c) ? 1 : 0), 0);
  let left = n * n;
  // For each square, the last eel (in leaving order) whose way out runs over it.
  const rayLast = Array.from({ length: n }, () => new Array(n).fill(-1));
  // Would laying `path` cut off a patch of the same colour too small to be an eel,
  // that couldn't join the tail of an eel either? (Checks the patches around the path.)
  const strands = (path, c) => {
    const seen = new Set();
    const tails = new Set(lines.filter((l) => l.color === c).map((l) => { const [x, y] = l.cells[l.cells.length - 1]; return y * n + x; }));
    const [tx, ty] = path[path.length - 1];
    tails.add(ty * n + tx);
    for (const [px, py] of path) {
      for (const [dx, dy] of DIRS) {
        const sx = px + dx, sy = py + dy;
        if (!free(sx, sy, c) || seen.has(sy * n + sx)) continue;
        // Flood the patch (up to 3 squares is enough to know it's fine).
        const patch = [[sx, sy]];
        seen.add(sy * n + sx);
        for (let i = 0; i < patch.length && patch.length < 3; i++) {
          const [qx, qy] = patch[i];
          for (const [ex, ey] of DIRS) {
            const nx = qx + ex, ny = qy + ey;
            if (free(nx, ny, c) && !seen.has(ny * n + nx)) { seen.add(ny * n + nx); patch.push([nx, ny]); }
          }
        }
        if (patch.length >= 3) continue;
        const rescued = patch.some(([qx, qy]) => DIRS.some(([ex, ey]) => tails.has((qy + ey) * n + (qx + ex))));
        if (!rescued) return true;
      }
    }
    return false;
  };

  for (;;) {
    // Every possible head: a free square, a direction whose way out is clear,
    // and a free square of the same colour right behind it.
    const cands = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (owner[y][x] >= 0) continue;
      const c = grid[y][x];
      for (const d of DIRS) {
        if (!free(x - d[0], y - d[1], c) || !rayClear(x, y, d)) continue;
        cands.push({ x, y, d, c, k: freeNeighbours(x, y, c) + rand() * (attempt.jitter || 0.9) });
      }
    }
    if (!cands.length) break;
    // Most hemmed-in squares first, so none get stranded.
    cands.sort((a, b) => a.k - b.k);
    let placed = false;
    // Try the most hemmed-in heads first; take the first eel that strands nothing
    // (or, failing that, the first one that can be laid at all).
    let fallback = null;
    for (const cand of cands.slice(0, 40)) {
      const { x, y, d, c } = cand;
      const path = [[x, y], [x - d[0], y - d[1]]];
      const inPath = new Set([y * n + x, (y - d[1]) * n + (x - d[0])]);
      // Colours listed with --long get long, winding eels; the rest stay short.
      const long = attempt.long && attempt.long.has(c);
      const lo = long ? attempt.longMin : minLen, hi = long ? attempt.longMax : maxLen;
      const want = lo + Math.floor(rand() * (hi - lo + 1));
      // Grow the body, always into the most hemmed-in free neighbour.
      while (path.length < want) {
        const [tx, ty] = path[path.length - 1];
        const next = DIRS.map(([dx, dy]) => [tx + dx, ty + dy])
          .filter(([nx, ny]) => free(nx, ny, c) && !inPath.has(ny * n + nx))
          .map(([nx, ny]) => ({ nx, ny, k: freeNeighbours(nx, ny, c) + rand() * (attempt.jitter || 0.9) }))
          .sort((a, b) => a.k - b.k);
        if (!next.length) break;
        path.push([next[0].nx, next[0].ny]);
        inPath.add(next[0].ny * n + next[0].nx);
      }
      if (path.length < minLen) continue;
      // Any length from here down to the minimum that strands nothing will do.
      let ok = null;
      for (let len = path.length; len >= minLen && !ok; len--) {
        const p = path.slice(0, len);
        for (const [px, py] of p) owner[py][px] = -2; // (taken, for the check)
        if (!strands(p, c)) ok = p;
        for (const [px, py] of p) owner[py][px] = -1;
      }
      if (!ok) { if (!fallback) fallback = { path, c }; continue; }
      path.length = ok.length;
      cand.path = path;
    }
    {
      const chosen = cands.slice(0, 40).find((cd) => cd.path) || (fallback && { path: fallback.path, c: fallback.c });
      if (!chosen) break;
      const { path, c } = chosen;
      const id = lines.length;
      lines.push({ cells: path, color: c });
      for (const [px, py] of path) owner[py][px] = id;
      {
        const [hx, hy] = path[0], [bx, by] = path[1];
        const dx = hx - bx, dy = hy - by;
        for (let cx = hx + dx, cy = hy + dy; inb(cx, cy); cx += dx, cy += dy) rayLast[cy][cx] = id;
      }
      left -= path.length;
      placed = true;
    }
    if (!placed) break;
  }

  // Squares left over: three ways to fit each into an eel, tried first keeping
  // every square its own colour, and only then letting a few change colour.
  let recoloured = 0;
  const near = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  const take = (x, y, id) => { owner[y][x] = id; left--; if (grid[y][x] !== lines[id].color) recoloured++; };
  // (1) Onto the tail of a neighbouring eel (no eel's way out runs over a left-over square, so it's always safe).
  const toTail = (same) => {
    let did = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (owner[y][x] >= 0) continue;
      const id = lines.findIndex((e) => (!same || e.color === grid[y][x]) && near(...e.cells[e.cells.length - 1], x, y));
      if (id < 0) continue;
      lines[id].cells.push([x, y]);
      take(x, y, id);
      did = true;
    }
    return did;
  };
  // Is the way out from (hx, hy) heading (dx, dy) clear once everything else has gone?
  const clearLast = (hx, hy, dx, dy, ignore) => {
    for (let cx = hx + dx, cy = hy + dy; inb(cx, cy); cx += dx, cy += dy) {
      if (owner[cy][cx] < 0 || (ignore && ignore(cx, cy))) return false;
    }
    return true;
  };
  // (2) Beside the middle of an eel: cut it there, the square becomes its new tail,
  //     and the cut-off end (3+ squares) becomes an eel that leaves after everything
  //     else (when no later eel's way out runs over those squares).
  const splice = (same) => {
    let did = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (owner[y][x] >= 0) continue;
      let done = false;
      for (let id = 0; id < lines.length && !done; id++) {
        const e = lines[id];
        if (same && e.color !== grid[y][x]) continue;
        for (let i = 1; i < e.cells.length - 3 && !done; i++) {
          if (!near(...e.cells[i], x, y)) continue;
          const cut = e.cells.slice(i + 1);
          if (cut.some(([cx, cy]) => rayLast[cy][cx] > id)) continue;
          const inCut = new Set(cut.map(([cx, cy]) => cy * n + cx));
          for (const piece of [cut, cut.slice().reverse()]) {
            const [hx, hy] = piece[0], [bx, by] = piece[1];
            if (!clearLast(hx, hy, hx - bx, hy - by, (cx, cy) => (cx === x && cy === y) || inCut.has(cy * n + cx))) continue;
            e.cells.length = i + 1;
            e.cells.push([x, y]);
            take(x, y, id);
            const nid = lines.length;
            lines.push({ cells: piece, color: e.color });
            for (const [px, py] of piece) owner[py][px] = nid;
            done = did = true;
            break;
          }
        }
      }
    }
    return did;
  };
  // (3) A new 3-square eel of the square and the last two squares of a neighbouring
  //     eel's tail, leaving after everything else.
  const steal = (same) => {
    let did = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (owner[y][x] >= 0) continue;
      for (let id = 0; id < lines.length; id++) {
        const e = lines[id];
        if (e.cells.length < 5 || (same && e.color !== grid[y][x])) continue;
        const [tx, ty] = e.cells[e.cells.length - 1], [sx, sy] = e.cells[e.cells.length - 2];
        if (!near(tx, ty, x, y) || rayLast[ty][tx] > id || rayLast[sy][sx] > id) continue;
        if (!clearLast(x, y, x - tx, y - ty)) continue;
        e.cells.length -= 2;
        const nid = lines.length;
        lines.push({ cells: [[x, y], [tx, ty], [sx, sy]], color: e.color });
        owner[ty][tx] = nid; owner[sy][sx] = nid;
        take(x, y, nid);
        did = true;
        break;
      }
    }
    return did;
  };
  for (const same of [true, false]) {
    while (left > 0 && (toTail(same) || splice(same) || steal(same)));
  }
  lines.recoloured = recoloured;
  if (left === 0) return lines;
  attempt.lastLeft = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (owner[y][x] < 0) attempt.lastLeft.push([x, y, grid[y][x]]);
  return null;
}

function main() {
  const [src, out] = process.argv.slice(2);
  const opt = Object.fromEntries(process.argv.slice(4).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : null)).filter(Boolean));
  const tries = Number(opt.tries || 200), minLen = Number(opt.min || 3), maxLen = Number(opt.max || 9);
  attempt.jitter = Number(opt.jitter || 0.9);
  const { size: n, palette, grid } = JSON.parse(fs.readFileSync(src, 'utf8'));
  // --long red,white,green: those colours' eels are long and winding (--longmin to --longmax squares).
  if (opt.long) {
    attempt.long = new Set(opt.long.split(',').map((name) => palette.findIndex((p) => p.name === name)).filter((i) => i >= 0));
    attempt.longMin = Number(opt.longmin || 10);
    attempt.longMax = Number(opt.longmax || 30);
  }
  let best = null;
  for (let t = 0; t < tries && !(best && best.lines.recoloured === 0); t++) {
    const lines = attempt(grid, n, rng(Number(opt.seed || 1) * 7919 + t), minLen, maxLen);
    if (lines && (!best || lines.recoloured < best.lines.recoloured)) best = { lines, t };
    else if (opt.debug && (!attempt.fewest || attempt.lastLeft.length < attempt.fewest.length)) attempt.fewest = attempt.lastLeft;
  }
  if (!best && opt.debug) console.error('fewest leftovers:', JSON.stringify(attempt.fewest));
  if (!best) { console.error(`No solvable covering found in ${tries} tries`); process.exit(1); }
  const { lines } = best;
  const level = encodeLevel({
    size: n,
    par: lines.length,
    lines: lines.map((l) => ({ cells: l.cells })),
    colors: { palette: palette.map((p) => p.hex.replace('#', '')), lines: lines.map((l) => l.color) },
  });
  // Check it with the game's own solver.
  const L = decodeLevel(level);
  const r = solve(L.size, L.lines, {});
  const lens = lines.map((l) => l.cells.length);
  const stats = { recoloured: lines.recoloured, eels: lines.length, shortest: Math.min(...lens), longest: Math.max(...lens), solvable: r.solvable, solvedIn: r.solvable ? r.path.length : null, try: best.t + 1 };
  fs.writeFileSync(out, JSON.stringify({ level, stats }, null, 1));
  console.log(JSON.stringify(stats));
  if (!r.solvable) process.exit(2);
}

main();
