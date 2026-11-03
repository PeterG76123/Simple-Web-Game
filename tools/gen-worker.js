// Long-lived worker thread for tools/bank.js. It receives jobs
// { id, kind, size, mirrors, seed } one at a time, makes one verified level
// of that kind, and replies { id, entry } (entry is null if it gave up).
// Keeping workers alive avoids start-up costs, and handing out one level at
// a time keeps every core busy until the very end of a build.
'use strict';
const { parentPort } = require('worker_threads');
const { mulberry32 } = require('./fullgen.js');
const kinds = require('./kinds.js');

parentPort.on('message', (job) => {
  const make = kinds[job.kind];
  const rng = mulberry32(job.seed);
  let entry = null;
  for (let t = 0; t < 400 && !entry; t++) entry = make(job.size, rng, { mirrors: job.mirrors });
  parentPort.postMessage({ id: job.id, entry });
});
