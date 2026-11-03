/*
 * Difficulty scale.
 *
 * Every level gets a raw score from what makes it hard to solve, then a
 * rating from 1.0 (easiest) to 10.0 (hardest). Ratings are scaled within each
 * difficulty setting and group (e.g. "Medium, See-through lines"), so a 10 in
 * Easy solid is that group's hardest level, not the hardest level overall.
 *
 * What counts, and why:
 *   partial    partial slides needed. The core skill of see-through levels: by
 *              far the strongest signal, so it is weighted most.
 *   search     how many positions the solver had to look at (log scale): more
 *              dead ends to think through before the right move.
 *   rounds     longest chain of "this line must go before that one". Long
 *              chains mean planning several moves ahead.
 *   crowding   lines per line free at the start. Few free lines on a busy
 *              board means hunting for the first move.
 *   lines      more lines to track and move.
 *   size       bigger boards are harder to read.
 *   bounce     lines whose way out bends off a reflector: paths are harder to
 *              follow by eye.
 *   turns      fewest reflector turns needed (rotating reflectors): each one
 *              is a decision about which way every bounce should go.
 *   gates      gates to manage (gates and plates): each one adds an ordering
 *              problem.
 */
'use strict';
require('../rules.js');
const { decodeLevel, mirrorMap, tracePath } = globalThis.ArrowRules;

/** Measurable features of a banked level (entry from levels-bank/). */
function features(entry) {
  const level = decodeLevel(entry.level);
  const n = level.size;
  const map = mirrorMap(n, level.mirrors);
  const bounce = level.mirrors.length
    ? level.lines.filter((l) => tracePath(n, l.cells[0][0], l.cells[0][1], l.dir, map).cells.some(([x, y]) => map.has(y * n + x))).length
    : 0;
  return {
    size: n,
    lines: level.lines.length,
    partial: entry.partial || 0,
    states: entry.states || 0,
    rounds: entry.rounds || 0,
    initialFree: Math.max(1, entry.initialFree || 1),
    mirrors: level.mirrors.length,
    bounce,
    turns: entry.turns || 0,
    gates: level.gates ? level.gates.length : 0,
  };
}

function rawScore(f) {
  return (
    6 * f.partial +
    1.5 * Math.log2(1 + f.states) +
    2 * f.rounds +
    1.5 * (f.lines / f.initialFree) +
    0.12 * f.lines +
    0.25 * f.size +
    0.4 * f.bounce +
    5 * f.turns +
    2 * f.gates
  );
}

/**
 * Rates a set of banked levels against each other. Returns a function that
 * turns an entry into a rating from 1.0 to 10.0.
 */
function scale(entries) {
  const scores = entries.map((e) => rawScore(features(e)));
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  return (entry) => {
    const s = rawScore(features(entry));
    const t = hi > lo ? (s - lo) / (hi - lo) : 0.5;
    return Math.round((1 + 9 * Math.min(1, Math.max(0, t))) * 10) / 10;
  };
}

module.exports = { features, rawScore, scale };
