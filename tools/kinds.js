/*
 * Every kind of level the bank can hold. Each maker takes (size, rng,
 * { mirrors }) and returns a bank entry, or null if this attempt failed:
 *
 *   { level, lines, partial, rounds, initialFree, states, ... }
 *
 * where `level` is the compact text format from rules.js. Adding a kind here
 * is all the bank and the builder need to start making it.
 */
'use strict';
const { makeSolid, makeSeeThrough } = require('./fullgen.js');
const { makeRotate, makeGates, makeCombo, makeTwins } = require('./makers.js');
const { encodeLevel } = globalThis.ArrowRules;

function entryFor(size, level) {
  return {
    level: encodeLevel({ size, par: level.par, lines: level.arrows, mirrors: level.mirrors, extras: level.extras }),
    lines: level.arrows.length,
    partial: level.partial || 0,
    rounds: level.rounds || 0,
    initialFree: level.initialFree || 0,
    states: level.states || 0,
    ...(level.stats || {}),
  };
}

const wrap = (maker) => (size, rng, opts) => {
  const level = maker(size, rng, opts);
  return level ? entryFor(size, level) : null;
};

module.exports = {
  solid: wrap(makeSolid),
  clear: wrap(makeSeeThrough),
  // Rotating reflectors; "mirrors" is the number of reflectors.
  rotate: wrap(makeRotate),
  // Gates and pressure plates; "mirrors" is the number of gate colours.
  gates: wrap(makeGates),
  // Turnable reflectors with see-through lines; "mirrors" is the number of reflectors.
  rotclear: wrap((n, rng, { mirrors }) => makeCombo(n, rng, { mirrors, turn: true })),
  // Gates with see-through lines; "mirrors" is the number of gate colours.
  gatesclear: wrap((n, rng, { mirrors }) => makeCombo(n, rng, { colours: mirrors })),
  // Everything: see-through lines, turnable reflectors and gates. "mirrors"
  // is the number of reflectors; gate colours grow with the board.
  combo: wrap((n, rng, { mirrors }) => makeCombo(n, rng, { mirrors, turn: true, colours: n <= 8 ? 1 : n <= 14 ? 2 : 3 })),
  // Twin eels: pairs of lines that slide together. "mirrors" is the number of pairs.
  twins: wrap(makeTwins),
};
