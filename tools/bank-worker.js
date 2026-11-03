// Worker thread for tools/bank.js: makes `count` levels of one kind.
'use strict';
const { parentPort, workerData } = require('worker_threads');
const { mulberry32, makeSolid, makeSeeThrough } = require('./fullgen.js');
const { encodeLevel } = globalThis.ArrowRules;

const { kind, size, mirrors, count, seed, maxTries } = workerData;
const rng = mulberry32(seed);
const out = [];
for (let t = 0; t < maxTries && out.length < count; t++) {
  const level = kind === 'solid' ? makeSolid(size, rng, { mirrors }) : makeSeeThrough(size, rng, { mirrors });
  if (!level) continue;
  const text = encodeLevel({ size, par: level.par, lines: level.arrows, mirrors: level.mirrors });
  out.push({
    level: text,
    lines: level.arrows.length,
    partial: level.partial,
    rounds: level.rounds || 0,
    initialFree: level.initialFree || 0,
    states: level.states || 0,
  });
}
parentPort.postMessage(out);
