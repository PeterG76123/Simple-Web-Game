/*
 * Tricky levels at any size, built backwards from an empty board.
 *
 *   node tools/trick-gen.js [--size 12] [--tries 40] [--seed 1] [--out level.json]
 *        [--steps 4000] [--min 3] [--max 10] [--long 0.15] [--window 0.35]
 *
 * The idea: play the solution in reverse. Going backwards in time, eels come
 * in from the edge (an eel leaving, reversed) and slide back and forth along
 * their own tracks (a partial slide, reversed). At the end every eel is moved
 * back to where it starts. Played forwards, those steps are a solution, so
 * every level made this way can be solved. The tricky part comes from three
 * moves:
 *
 *  - Gap: an eel L is slid part of the way out, leaving some of its own
 *    squares empty (or its see-through part sits over a square). A new eel X
 *    comes in with its way out running through that gap. When L later goes
 *    back to its start it covers the gap, so in the level X is stuck until
 *    L is slid to just the right place.
 *  - Lock: X's body is laid across L's way out, so L can't simply leave to
 *    let X out: it has to be slid just far enough, X leaves, then L can go.
 *  - Layers: the eel slid aside (L) can itself be stuck behind others that
 *    need their own slides first, and X can need several gaps lined up at
 *    once, so jams build on jams: you can't move A until B, until C...
 *
 * Every eel rests only on squares no other eel needs to come back to, so all
 * of them can always return to their starts. Many random builds are made;
 * each is scored jam by jam (ArrowRules.solveStaged: the fewest partial
 * slides that free each next eel) and the hardest is kept.
 *
 * Output JSON: { level, solution, stats }.
 */
'use strict';
const fs = require('fs');
require('../rules.js');
const { encodeLevel, solveStaged, pathToText } = globalThis.ArrowRules;

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * One reverse-play build. Returns { arrows, entered } or null.
 *
 * Each eel L has a track: depth 0 is the square at the board's edge on its
 * way out, depth h its head at the start, depths h+1.. its body, to depth
 * dmax (its tail at the start). L at position D has its tail at depth D and
 * segment k (0 = head) at depth D - len + 1 + k (negative = off the board).
 * At the start D = dmax; it can never go deeper than that.
 */
function build(n, rand, opt) {
  const N = n * n;
  const occS = new Int32Array(N).fill(-1); // solid segment owner, now
  const occA = new Int32Array(N).fill(-1); // any segment owner, now (eels at rest never overlap)
  const res = new Int32Array(N).fill(-1); // reserved: the eel whose start position covers it
  const rayMark = new Int32Array(N); // how many eels' ways out (at their starts) cross it
  const lines = [];
  const inb = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  const cid = ([x, y]) => y * n + x;

  const segs = (L, D) => {
    const out = [];
    for (let k = 0; k < L.len; k++) {
      const d = D - L.len + 1 + k;
      if (d >= 0) out.push({ k, c: cid(L.track[d]), solid: !L.clear.has(k) });
    }
    return out;
  };
  const put = (L, D, on) => {
    for (const s of segs(L, D)) {
      if (s.solid) occS[s.c] = on ? L.id : -1;
      occA[s.c] = on ? L.id : -1;
    }
  };
  // Can L rest at D? Its squares must be free. A slid eel may sit on another
  // slid-out eel's start squares for a while (that's how one eel's slide gets
  // in another's way); everyone has to get back to their start at the end.
  const canRest = (L, D, borrow = true) => segs(L, D).every((s) => (occA[s.c] === -1 || occA[s.c] === L.id) &&
    (res[s.c] === -1 || res[s.c] === L.id || (borrow && D !== L.dmax && lines[res[s.c]].D !== lines[res[s.c]].dmax)));
  // Can L slide from where it is to D? Solid parts must not hit another eel's solid parts on the way.
  const canSlide = (L, D) => {
    const step = D > L.D ? 1 : -1;
    for (let p = L.D + step; ; p += step) {
      for (const s of segs(L, p)) if (s.solid && occS[s.c] !== -1 && occS[s.c] !== L.id) return false;
      if (p === D) return true;
    }
  };
  const move = (L, D) => { put(L, L.D, false); L.D = D; put(L, D, true); L.moves++; };

  /** A new eel with its head at `head`, leaving in direction `dir`, or null. */
  function makeEel(head, dir, len, lock, lockAll, straight = 0) {
    const [dx, dy] = DIRS[dir];
    // Its way out: straight to the edge. It must be clear of solid parts now.
    const ray = [];
    for (let x = head[0] + dx, y = head[1] + dy; inb(x, y); x += dx, y += dy) {
      if (occS[y * n + x] !== -1) return null;
      ray.push([x, y]);
    }
    const track = ray.reverse().concat([head]);
    const own = new Set(track.map(cid));
    const restOK = (c) => occA[c] === -1 && res[c] === -1 && !own.has(c);
    own.delete(cid(head));
    if (!restOK(cid(head))) return null;
    own.add(cid(head));
    // The square behind the head is straight back (the head points along the body).
    let cur = [head[0] - dx, head[1] - dy];
    if (!inb(...cur) || !restOK(cid(cur))) return null;
    track.push(cur); own.add(cid(cur));
    let heading = dir;
    while (track.length - ray.length < len) {
      const options = [];
      // Each step goes back from the square before (d = the way the body points, towards the head).
      for (let d = 0; d < 4; d++) {
        const nx = cur[0] - DIRS[d][0], ny = cur[1] - DIRS[d][1];
        if (!inb(nx, ny)) continue;
        const c = ny * n + nx;
        if (!restOK(c)) continue;
        // Weight: lying across other eels' ways out makes locks; turns make it winding.
        let w = 1 + opt.blockBias * rayMark[c] + (lock && lock.has(c) ? 40 : 0) + (lockAll && lockAll.has(c) ? 15 : 0);
        if (d !== heading) w *= opt.turnBias;
        // The first squares behind the head can be made to run straight.
        if (track.length - ray.length < straight && d !== heading) continue;
        options.push([w, d, [nx, ny]]);
      }
      if (!options.length) break;
      let t = rand() * options.reduce((a, o) => a + o[0], 0);
      let pick = options[0];
      for (const o of options) { t -= o[0]; if (t <= 0) { pick = o; break; } }
      heading = pick[1];
      cur = pick[2];
      track.push(cur); own.add(cid(cur));
    }
    const realLen = track.length - ray.length;
    if (realLen < opt.min) return null;
    // A lock: the body must lie across the given squares' eel's way out.
    if (lock && !track.slice(ray.length).some((p) => lock.has(cid(p)))) return null;
    const L = { id: lines.length, dir, track, h: ray.length, len: realLen, dmax: track.length - 1, clear: new Set(), moves: 0 };
    // A see-through window (1-2 squares, never the head or the square behind it).
    if (realLen >= 5 && rand() < opt.window) {
      const w = 1 + (rand() < 0.4 ? 1 : 0);
      const k0 = 2 + Math.floor(rand() * (realLen - 2 - w));
      for (let k = k0; k < k0 + w && k < realLen - 1; k++) L.clear.add(k);
    }
    return L;
  }

  /**
   * A new eel with its head at `head` (leaving in direction `dir`) whose body
   * runs (by a shortest free path) to the square `target`, then winds on to
   * about `len` squares. Used for locks: the body has to be on that square.
   */
  function makeEelVia(head, dir, target, len) {
    const [dx, dy] = DIRS[dir];
    const ray = [];
    for (let x = head[0] + dx, y = head[1] + dy; inb(x, y); x += dx, y += dy) {
      if (occS[y * n + x] !== -1) return null;
      ray.push([x, y]);
    }
    const track = ray.reverse().concat([head]);
    const own = new Set(track.map(cid));
    const restOK = (c) => occA[c] === -1 && res[c] === -1 && !own.has(c);
    if (!inb(...head)) return null;
    own.delete(cid(head));
    if (!restOK(cid(head))) return null;
    own.add(cid(head));
    const second = [head[0] - dx, head[1] - dy];
    if (!inb(...second) || !restOK(cid(second))) return null;
    track.push(second); own.add(cid(second));
    // Shortest path from `second` to `target` through free squares (random tie-breaks).
    const t = cid(target);
    if (t !== cid(second)) {
      if (!restOK(t)) return null;
      const prev = new Map([[cid(second), -1]]);
      const queue = [cid(second)];
      while (queue.length && !prev.has(t)) {
        const c = queue.shift();
        const order = [0, 1, 2, 3].sort(() => rand() - 0.5);
        for (const d of order) {
          const nx = c % n + DIRS[d][0], ny = Math.floor(c / n) + DIRS[d][1];
          if (!inb(nx, ny)) continue;
          const nc = ny * n + nx;
          if (prev.has(nc) || !restOK(nc)) continue;
          prev.set(nc, c);
          queue.push(nc);
        }
      }
      if (!prev.has(t)) return null;
      const path = [];
      for (let c = t; c !== cid(second); c = prev.get(c)) path.unshift(c);
      if (path.length + 2 > Math.max(len, opt.max * 2)) return null;
      for (const c of path) { track.push([c % n, Math.floor(c / n)]); own.add(c); }
    }
    // Wind on a little.
    while (track.length - ray.length < len) {
      const cur = track[track.length - 1];
      const options = [];
      for (let d = 0; d < 4; d++) {
        const nx = cur[0] + DIRS[d][0], ny = cur[1] + DIRS[d][1];
        if (inb(nx, ny) && restOK(ny * n + nx)) options.push([nx, ny]);
      }
      if (!options.length) break;
      const pick = options[Math.floor(rand() * options.length)];
      track.push(pick); own.add(cid(pick));
    }
    const realLen = track.length - ray.length;
    if (realLen < opt.min) return null;
    return { id: lines.length, dir, track, h: ray.length, len: realLen, dmax: track.length - 1, clear: new Set(), moves: 0 };
  }

  /**
   * A new eel whose tail is on square `tail`: its body winds from there to a
   * head that points (straight on) to the edge, with a clear way out.
   */
  function makeEelFromTail(tail, len, second) {
    // The tail square may be under an eel that's slid out for now (it moves away later).
    const restOK = (c, own) => (occA[c] === -1 || (c === cid(tail) && lines[occA[c]].D !== lines[occA[c]].dmax)) && res[c] === -1 && !own.has(c);
    for (let attempt = 0; attempt < 8; attempt++) {
      const body = [tail];
      const own = new Set([cid(tail)]);
      let heading = Math.floor(rand() * 4);
      if (second) {
        if (!inb(...second) || !restOK(cid(second), own)) return null;
        body.push(second);
        own.add(cid(second));
        heading = DIRS.findIndex(([dx, dy]) => dx === second[0] - tail[0] && dy === second[1] - tail[1]);
      }
      while (body.length < len) {
        const cur = body[body.length - 1];
        const options = [];
        for (let d = 0; d < 4; d++) {
          const nx = cur[0] + DIRS[d][0], ny = cur[1] + DIRS[d][1];
          if (!inb(nx, ny) || !restOK(ny * n + nx, own)) continue;
          options.push([d === heading ? 1 : opt.turnBias, d, [nx, ny]]);
        }
        if (!options.length) break;
        let t = rand() * options.reduce((a, o) => a + o[0], 0);
        let pick = options[0];
        for (const o of options) { t -= o[0]; if (t <= 0) { pick = o; break; } }
        heading = pick[1];
        body.push(pick[2]);
        own.add(cid(pick[2]));
      }
      if (body.length < Math.max(3, opt.min)) continue;
      // The head points the way the last step went; its way out must be clear.
      const head = body[body.length - 1];
      const [dx, dy] = DIRS[heading];
      const ray = [];
      let ok = true;
      for (let x = head[0] + dx, y = head[1] + dy; inb(x, y); x += dx, y += dy) {
        const c = y * n + x;
        if (occS[c] !== -1 || own.has(c)) { ok = false; break; }
        ray.push([x, y]);
      }
      if (!ok) continue;
      const track = ray.reverse().concat(body.slice().reverse());
      const L = { id: lines.length, dir: heading, track, h: ray.length, len: body.length, dmax: track.length - 1, clear: new Set(), moves: 0 };
      return L;
    }
    return null;
  }

  // Undo for recipes that don't work out.
  const snapshot = () => ({ occS: occS.slice(), occA: occA.slice(), res: res.slice(), rayMark: rayMark.slice(), count: lines.length, Ds: lines.map((L) => L.D) });
  const restore = (snap) => {
    occS.set(snap.occS); occA.set(snap.occA); res.set(snap.res); rayMark.set(snap.rayMark);
    lines.length = snap.count;
    snap.Ds.forEach((D, i) => { lines[i].D = D; });
  };

  /**
   * The conga line: eels G1..Gk where G(i)'s tail sits just in front of
   * G(i+1)'s head, pointing straight along G(i+1)'s way out. G1's way out is
   * crossed by the body of an eel X, whose own way out runs through Gk's
   * tail square. Played forwards: G1 slides one square (X stops it going
   * further); G2 slides into the square G1's tail left (G1's new tail stops
   * it); ... Gk slides, leaving its tail square, and only then can X leave:
   * k slides in a set order. Then the chain unwinds: G1 leaves, then G2, ...
   *
   * Built backwards: Gk comes in one square short of its start, G(k-1) comes
   * in behind it (its tail where Gk's head is) one square short, ..., X comes
   * in through Gk's tail square, then Gk, G(k-1), ... G1 slide back to their starts.
   */
  function conga(k) {
    const snap = snapshot();
    const fail = () => { restore(snap); return false; };
    const chain = []; // Gk first
    for (let i = 0; i < k; i++) {
      const next = chain[chain.length - 1];
      let made = null;
      for (let a = 0; a < opt.attempts && !made; a++) {
        let E;
        if (!next) {
          E = makeEel([Math.floor(rand() * n), Math.floor(rand() * n)], Math.floor(rand() * 4), randLen());
        } else {
          // Tail on next's head square, the square before it straight on along next's way out.
          const T = next.track[next.D - next.len + 1];
          const [dx, dy] = DIRS[next.dir];
          E = makeEelFromTail(T, randLen(), [T[0] + dx, T[1] + dy]);
        }
        if (!E || E.h < 2) continue;
        if (enterAt(E, E.dmax - 1)) made = E;
      }
      if (!made) return fail();
      chain.push(made);
    }
    const G1 = chain[chain.length - 1], Gk = chain[0];
    // X: its way out through Gk's tail square, its body across G1's way out (beyond where G1 slides).
    const gap = cid(Gk.track[Gk.dmax]);
    // Its body right in front of G1's head once it's slid: G1 can slide exactly one square.
    let made = null;
    for (let a = 0; a < opt.attempts * 3 && !made; a++) {
      const dir = Math.floor(rand() * 4);
      const back = 1 + Math.floor(rand() * 3);
      const head = [gap % n - DIRS[dir][0] * back, Math.floor(gap / n) - DIRS[dir][1] * back];
      if (!inb(...head)) continue;
      const X = makeEelVia(head, dir, G1.track[G1.D - G1.len], randLen());
      if (!X || !X.track.slice(0, X.h).some((p) => cid(p) === gap)) continue;
      if (enter(X)) made = X;
    }
    if (!made) return fail();
    // Back to their starts: Gk first, then G(k-1) into the square it left, ...
    for (const E of chain) {
      if (!(canRest(E, E.dmax) && canSlide(E, E.dmax))) return fail();
      move(E, E.dmax);
    }
    congas.push(k);
    return true;
  }

  /**
   * The shuffle: a long eel W with a see-through window, and keys K1..Km
   * whose ways out cross W's body just ahead of the window. Key i can only
   * get out when W has slid exactly i squares (the window over its path),
   * and its body sits just in front of W's head then, so W can't slide on
   * until it's gone. Played forwards: slide W, K1 leaves, slide W, K2
   * leaves, ... in that order.
   *
   * Built backwards: W comes in m squares short of its start, Km comes in
   * through the window; W slides back one, K(m-1) comes in through the
   * window; ...; W slides back to its start.
   */
  function shuffle(m) {
    const snap = snapshot();
    const fail = (why) => { if (process.env.TRICK_DEBUG) (globalThis.failWhy = globalThis.failWhy || {})[why] = ((globalThis.failWhy || {})[why] || 0) + 1; restore(snap); return false; };
    let W = null;
    for (let a = 0; a < opt.attempts && !W; a++) {
      const len = Math.max(m + 4, opt.max + Math.floor(rand() * opt.max));
      const E = makeEel([Math.floor(rand() * n), Math.floor(rand() * n)], Math.floor(rand() * 4), len, null, null, m + 4);
      if (!E || E.len < m + 3 || E.h < m + 2) continue;
      E.clear = new Set([m + 1 + Math.floor(rand() * 2)].filter((k) => k < E.len - 1));
      if (!E.clear.size) continue;
      if (enterAt(E, E.dmax - m)) W = E;
    }
    if (!W) return fail('W');
    const kw = [...W.clear][0];
    for (let o = m; o >= 1; o--) {
      // The square of W's start that the window is over when W has slid o squares.
      const c = W.track[W.h + kw - o];
      const g = cid(c);
      // Key: its way out through that square; its body just in front of W's head.
      let made = null;
      for (let a = 0; a < opt.attempts * 3 && !made; a++) {
        const dir = (W.dir + (rand() < 0.5 ? 1 : 3)) % 4; // across W, not along it
        const back = 1 + Math.floor(rand() * 3);
        const head = [c[0] - DIRS[dir][0] * back, c[1] - DIRS[dir][1] * back];
        if (!inb(...head)) continue;
        const K = makeEelVia(head, dir, W.track[W.D - W.len], randLen());
        const note = () => {};
        if (!K) { note('make'); continue; }
        if (!K.track.slice(0, K.h).some((p) => cid(p) === g)) { note('ray'); continue; }
        if (enter(K)) made = K; else note('enter');
      }
      if (!made) return fail('key');
      // W one square back towards its start.
      if (!(canRest(W, W.D + 1) && canSlide(W, W.D + 1))) return fail('back');
      move(W, W.D + 1);
    }
    shuffles.push(m);
    return true;
  }

  /**
   * Brings a new eel in from the edge only as far as position D (short of
   * its start): it slides back to its start later. Its start squares are
   * reserved now; one of them may still be under an eel that's slid out.
   */
  function enterAt(L, D) {
    L.D = -1;
    for (let p = 0; p <= D; p++) for (const s of segs(L, p)) if (s.solid && occS[s.c] !== -1) return false;
    if (!segs(L, D).every((s) => occA[s.c] === -1 && (res[s.c] === -1))) return false;
    for (let d = L.h; d <= L.dmax; d++) if (res[cid(L.track[d])] !== -1) return false;
    L.D = D;
    put(L, D, true);
    for (let d = L.h; d <= L.dmax; d++) res[cid(L.track[d])] = L.id;
    for (let d = 0; d < L.h; d++) rayMark[cid(L.track[d])]++;
    lines.push(L);
    return true;
  }

  /** Brings a new eel in from the edge to its start (checked), and records it. */
  function enter(L) {
    L.D = -1;
    // Coming in sweeps its whole track: solid parts must not hit anything.
    for (let p = 0; p <= L.dmax; p++) for (const s of segs(L, p)) if (s.solid && occS[s.c] !== -1) return false;
    if (!segs(L, L.dmax).every((s) => occA[s.c] === -1 && res[s.c] === -1)) return false;
    L.D = L.dmax;
    put(L, L.D, true);
    for (let d = L.h; d <= L.dmax; d++) res[cid(L.track[d])] = L.id;
    for (let d = 0; d < L.h; d++) rayMark[cid(L.track[d])]++;
    lines.push(L);
    return true;
  }

  const randLen = () => (rand() < opt.long
    ? opt.max + Math.floor(rand() * opt.max)
    : opt.min + Math.floor(rand() * (opt.max - opt.min + 1)));

  let gapEntries = 0;
  const congas = [];
  const shuffles = [];
  // Rounds: a burst of recipes, then ordinary eels and slides (which later
  // recipes then build over), and so on.
  for (let step = 0; step < opt.steps; step++) {
    const r = rand();
    const recipeRound = Math.floor(step / opt.round) % 2 === 0;
    if (recipeRound) {
      if (rand() < opt.pShuffle / (opt.pShuffle + opt.pConga)) shuffle(2 + Math.floor(rand() * (opt.keys - 1)));
      else conga(2 + Math.floor(rand() * (opt.depth - 1)));
      continue;
    }
    if (rand() < opt.pConga) {
      conga(2 + Math.floor(rand() * (opt.depth - 1)));
      continue;
    }
    if (rand() < opt.pShuffle) {
      shuffle(2 + Math.floor(rand() * (opt.keys - 1)));
      continue;
    }
    if (r < opt.pMove && lines.length) {
      // Slide an eel: part of the way out (leaving gaps), or back towards its start.
      const L = lines[Math.floor(rand() * lines.length)];
      let D;
      if (L.D < L.dmax && rand() < 0.4) D = Math.min(L.dmax, L.D + 1 + Math.floor(rand() * 4));
      else D = L.D - 1 - Math.floor(rand() * 4);
      D = Math.max(L.len - 1, Math.min(L.dmax, D)); // its head never past the edge
      if (D !== L.D && canRest(L, D, false) && canSlide(L, D)) move(L, D);
      continue;
    }
    // A new eel through a gap: some eel L is slid out, leaving squares of its
    // start empty. The new eel's way out runs through one of them, and its
    // body lies across L's way out, so L can't just leave: it has to be slid
    // to just the right place.
    const out = lines.filter((L) => L.D < L.dmax || L.clear.size);
    if (out.length && rand() < opt.pGap) {
      const L = out[Math.floor(rand() * out.length)];
      // Squares of slid-out eels' starts that are empty now: gaps.
      const gapOf = new Map();
      for (const O of out) for (let d = O.h; d <= O.dmax; d++) {
        const c = cid(O.track[d]);
        if (!O.clear.has(d - O.h) && occS[c] === -1) gapOf.set(c, O.id);
      }
      // Ways out of slid-out eels, beyond their heads: lying there locks them.
      const lockOf = new Map();
      for (const O of out) for (let d = 0; d < O.D - O.len + 1; d++) lockOf.set(cid(O.track[d]), O.id);
      const gaps = [...gapOf].filter(([, id]) => id === L.id).map(([c]) => c);
      const lock = new Set([...lockOf].filter(([, id]) => id === L.id).map(([c]) => c));
      if (!gaps.length || !lock.size) continue;
      let best = null;
      for (let a = 0; a < opt.attempts; a++) {
        const g = gaps[Math.floor(rand() * gaps.length)];
        const dir = Math.floor(rand() * 4);
        const back = 1 + Math.floor(rand() * 3);
        const head = [g % n - DIRS[dir][0] * back, Math.floor(g / n) - DIRS[dir][1] * back];
        if (!inb(...head)) continue;
        const X = makeEel(head, dir, randLen(), lock, lockOf);
        if (!X) continue;
        // Better: its way out runs through more eels' gaps (they must all line
        // up at once), and its body locks more slid-out eels.
        const through = new Set(), locks = new Set();
        for (let d = 0; d < X.h; d++) { const id = gapOf.get(cid(X.track[d])); if (id !== undefined) through.add(id); }
        for (let d = X.h; d <= X.dmax; d++) { const id = lockOf.get(cid(X.track[d])); if (id !== undefined) locks.add(id); }
        const v = through.size * 2 + locks.size + rand() * 0.5;
        if (!best || v > best.v) best = { v, X };
      }
      if (best && enter(best.X)) gapEntries++;
      continue;
    }
    // Or an ordinary eel anywhere (filling in; it may get caught up in later jams).
    const head = [Math.floor(rand() * n), Math.floor(rand() * n)];
    const X = makeEel(head, Math.floor(rand() * 4), randLen());
    if (X) enter(X);
  }
  // Everyone back to their starts, in whatever order works.
  for (let left = lines.filter((L) => L.D !== L.dmax); left.length;) {
    const ready = left.filter((L) => canSlide(L, L.dmax) && canRest(L, L.dmax));
    if (!ready.length) return null;
    for (const L of ready) if (canSlide(L, L.dmax)) move(L, L.dmax);
    left = left.filter((L) => L.D !== L.dmax);
  }
  // Pack the space that's left with small eels (coming in last, so they're
  // the first ones free: they make the board look full and hide the jams).
  for (let a = 0; a < opt.fill * N; a++) {
    const head = [Math.floor(rand() * n), Math.floor(rand() * n)];
    if (occA[cid(head)] !== -1 || res[cid(head)] !== -1) continue;
    const E = makeEel(head, Math.floor(rand() * 4), opt.min + Math.floor(rand() * 4));
    if (E) enter(E);
  }
  // Background eels, there from the very beginning: they leave last, after
  // everything above, so their bodies must keep off every square any eel
  // above ever uses (its whole track, including its way out), and each one's
  // way out must miss the bodies of background eels added before it (those
  // leave after it). Their ways out may cross anything else. They fill the
  // board and make the last stretch an untangle of its own.
  const used = new Uint8Array(N);
  for (const L of lines) for (const p of L.track) used[cid(p)] = 1;
  const late = new Uint8Array(N); // bodies of background eels
  const back = [];
  for (let a = 0; a < opt.backFill * N; a++) {
    const head = [Math.floor(rand() * n), Math.floor(rand() * n)];
    const h0 = cid(head);
    if (used[h0] || late[h0]) continue;
    const dir = Math.floor(rand() * 4);
    const [dx, dy] = DIRS[dir];
    let ok = true;
    for (let x = head[0] + dx, y = head[1] + dy; inb(x, y); x += dx, y += dy) if (late[y * n + x]) { ok = false; break; }
    if (!ok) continue;
    const body = [head];
    const own = new Set([h0]);
    // Its own way out mustn't run over its own body either.
    const rayOwn = new Set();
    for (let x = head[0] + dx, y = head[1] + dy; inb(x, y); x += dx, y += dy) rayOwn.add(y * n + x);
    const free = (c) => !used[c] && !late[c] && !own.has(c) && !rayOwn.has(c);
    const second = [head[0] - dx, head[1] - dy];
    if (!inb(...second) || !free(cid(second))) continue;
    body.push(second); own.add(cid(second));
    const want = opt.min + Math.floor(rand() * (opt.max - opt.min + 1));
    while (body.length < want) {
      const cur = body[body.length - 1];
      const options = [];
      for (let d = 0; d < 4; d++) {
        const nx = cur[0] + DIRS[d][0], ny = cur[1] + DIRS[d][1];
        if (inb(nx, ny) && free(ny * n + nx)) options.push([nx, ny]);
      }
      if (!options.length) break;
      const pick = options[Math.floor(rand() * options.length)];
      body.push(pick); own.add(cid(pick));
    }
    if (body.length < opt.min) continue;
    for (const c of own) late[c] = 1;
    back.push({ cells: body, dir, clear: [] });
  }
  const arrows = lines.map((L) => {
    const cells = L.track.slice(L.h).map(([x, y]) => [x, y]);
    return { cells, dir: L.dir, clear: [...L.clear].sort((a, b) => a - b) };
  }).concat(back);
  const covered = arrows.reduce((a, A) => a + A.cells.length, 0) / N;
  return { arrows, covered, gapEntries, congas, shuffles };
}

function score(r) {
  return r.stages.reduce((a, d) => a + d * d, 0);
}

function main() {
  const args = process.argv.slice(2);
  const opt = {};
  for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
  const n = Number(opt.size || 12);
  const tries = Number(opt.tries || 40);
  const seed = Number(opt.seed || 1);
  const o = {
    steps: Number(opt.steps || n * n * 6),
    min: Number(opt.min || 3),
    max: Number(opt.max || Math.max(5, Math.round(n / 2))),
    long: Number(opt.long || 0.15),
    window: Number(opt.window || 0.35),
    pMove: Number(opt.pMove || 0.45),
    pGap: Number(opt.pGap || 0.8),
    attempts: Number(opt.attempts || 30),
    pConga: Number(opt.pConga || 0.05),
    depth: Number(opt.depth || 4),
    pShuffle: Number(opt.pShuffle || 0.05),
    round: Number(opt.round || 60),
    fill: Number(opt.fill || 3),
    backFill: Number(opt.backFill || 4),
    keys: Number(opt.keys || 4),
    blockBias: Number(opt.blockBias || 4),
    turnBias: Number(opt.turnBias || 1.6),
  };
  const maxStates = Number(opt.maxStates || 30000);
  let best = null;
  const t0 = Date.now();
  for (let t = 0; t < tries; t++) {
    const rand = rng(seed * 7919 + t);
    const b = build(n, rand, o);
    if (!b) continue;
    const r = solveStaged(n, b.arrows, { maxStates });
    if (!r.solvable) { console.log(`try ${t}: ${r.gaveUp ? 'too big to check' : 'NOT SOLVABLE (bug)'}`); continue; }
    const s = score(r);
    if (opt.verbose) console.log(`try ${t}: ${b.arrows.length} eels, ${b.gapEntries} gaps, congas ${b.congas.join(',')}, shuffles ${b.shuffles.join(',')}, ${(b.covered * 100).toFixed(0)}% covered, slides ${r.partialMoves}, jams ${r.stages.join(' ')}, score ${s}`);
    if (!best || s > best.s) best = { s, b, r, t };
  }
  if (!best) { console.log('nothing made'); process.exit(1); }
  const { b, r } = best;
  const level = encodeLevel({ size: n, par: r.par, lines: b.arrows, mirrors: [] });
  const stats = {
    size: n, eels: b.arrows.length, covered: +(b.covered.toFixed(2)),
    seeThrough: b.arrows.filter((a) => a.clear.length).length,
    partialSlides: r.partialMoves, jams: r.stages.join(' '), deepest: Math.max(0, ...r.stages), score: best.s, par: r.par,
    try: best.t, seconds: +((Date.now() - t0) / 1000).toFixed(1),
  };
  if (opt.out) fs.writeFileSync(opt.out, JSON.stringify({ level, solution: pathToText(r.path), stats }, null, 1));
  console.log(JSON.stringify(stats));
}

if (require.main === module) main();
module.exports = { build };
