/*
 * Worker thread for tools/build-levels.js: collects see-through levels with
 * reflectors for one board size. Each one is proven solvable, needs a partial
 * slide, can't be solved if its see-through parts were solid, and uses every
 * reflector.
 */
'use strict';
const { parentPort, workerData } = require('worker_threads');
const { mulberry32, generate, mirrorsUsed, bouncingLines } = require('./generator.js');
const { solve, solvableWithWholeExits } = globalThis.ArrowRules;

const { n, mirrors: mirrorCount, need, seed, maxTries, options } = workerData;
const rng = mulberry32(seed);
const found = [];
for (let tries = 0; tries < maxTries && found.length < need; tries++) {
  const { arrows, mirrors } = generate(n, { ...options, mirrors: mirrorCount }, rng);
  if (!arrows.some((a) => a.clear.length > 0)) continue;
  if (!mirrorsUsed(n, arrows, mirrors)) continue;
  if (solvableWithWholeExits(n, arrows, mirrors)) continue;
  const result = solve(n, arrows, { mirrors, maxStates: 25000 });
  if (!result.solvable) continue;
  const solidOnly = arrows.map((a) => ({ ...a, clear: [] }));
  if (solve(n, solidOnly, { mirrors, maxStates: 25000 }).solvable) continue;
  found.push({ size: n, arrows, mirrors, par: result.par, partial: result.partialMoves, states: result.states, bounce: bouncingLines(n, arrows, mirrors) });
}
parentPort.postMessage(found);
