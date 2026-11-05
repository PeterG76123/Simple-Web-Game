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

// Reflectors for twin levels with reflectors, by board size.
const reflectorsFor = (n) => (n <= 6 ? 1 : n <= 8 ? 2 : n <= 10 ? 3 : n <= 15 ? 4 : n <= 20 ? 5 : 6);

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
  // Twins with see-through lines.
  twinsclear: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, clear: true })),
  // Twins with fixed reflectors (more as the board grows).
  twinsmirror: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, reflectors: reflectorsFor(n) })),
  // Twins with see-through lines and fixed reflectors.
  twinsmix: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, clear: true, reflectors: reflectorsFor(n) })),
  // Twins with turning reflectors.
  twinsturn: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, turn: true, reflectors: Math.max(1, reflectorsFor(n) - 1) })),
  // Twins with gates and plates (one gate colour on small boards, two from 9x9).
  twinsgates: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, colours: n <= 8 ? 1 : 2 })),
  // Twins with everything: see-through lines, turning reflectors and gates.
  twinsall: wrap((n, rng, { mirrors }) => makeTwins(n, rng, { mirrors, turn: true, reflectors: Math.max(1, reflectorsFor(n) - 1), colours: n <= 9 ? 1 : 2 })),
};
