/*
 * The level bank: verified levels stored by kind, board size and number of
 * reflectors, one JSON object per line, in levels-bank/<kind>-<size>-m<reflectors>.jsonl.
 *
 * Add levels from the command line:
 *   node tools/bank.js --kind=solid --size=8 --count=200
 *   node tools/bank.js --kind=clear --size=10 --mirrors=4 --count=50 --workers=4
 *
 * Each run continues from what is already in the bank (new seeds, duplicates
 * skipped), so it can be run again and again to grow the bank.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const BANK_DIR = path.join(__dirname, '..', 'levels-bank');

function bankFile(kind, size, mirrors) {
  return path.join(BANK_DIR, `${kind}-${String(size).padStart(2, '0')}-m${mirrors}.jsonl`);
}

function readBank(kind, size, mirrors) {
  const file = bankFile(kind, size, mirrors);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** How hard a banked level is, for ordering levels within a group. */
function difficulty(entry) {
  return entry.partial * 40 + Math.log2(1 + entry.states) * 3 + entry.rounds * 4 + entry.lines - entry.initialFree * 2;
}

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(__dirname, 'bank-worker.js'), { workerData: data });
    w.once('message', resolve);
    w.once('error', reject);
  });
}

/** Adds `count` new levels of one kind to the bank. Returns the whole bank for that kind. */
async function grow(kind, size, mirrors, count, { workers = os.cpus().length, log = true } = {}) {
  if (size > 20) throw new Error('Boards are limited to 20x20');
  fs.mkdirSync(BANK_DIR, { recursive: true });
  const existing = readBank(kind, size, mirrors);
  const seen = new Set(existing.map((e) => e.level));
  const t0 = Date.now();
  let added = 0;
  // Seeds depend on how big the bank already is, so every run finds new levels.
  let round = existing.length;
  while (added < count) {
    const want = count - added;
    const per = Math.ceil(want / workers);
    const batches = await Promise.all(Array.from({ length: Math.min(workers, want) }, (_, w) => runWorker({
      kind, size, mirrors, count: per, maxTries: per * 400,
      seed: (size * 1000003 + mirrors * 7919 + (kind === 'clear' ? 104729 : 0) + (round + w) * 2654435761) >>> 0,
    })));
    round += workers;
    const fresh = [];
    for (const e of batches.flat()) {
      if (seen.has(e.level) || added + fresh.length >= count) continue;
      seen.add(e.level);
      fresh.push(e);
    }
    if (fresh.length) fs.appendFileSync(bankFile(kind, size, mirrors), fresh.map((e) => JSON.stringify(e)).join('\n') + '\n');
    added += fresh.length;
  }
  if (log) {
    const secs = (Date.now() - t0) / 1000;
    console.log(`  ${kind} ${size}x${size}, ${mirrors} reflectors: +${added} (${(added / Math.max(secs, 0.001)).toFixed(1)} levels/s), ${existing.length + added} in bank`);
  }
  return readBank(kind, size, mirrors);
}

module.exports = { readBank, grow, difficulty, bankFile };

if (require.main === module) {
  const arg = (name, def) => {
    const a = process.argv.find((x) => x.startsWith(`--${name}=`));
    return a ? a.split('=')[1] : def;
  };
  const kind = arg('kind', 'solid');
  if (!['solid', 'clear'].includes(kind)) throw new Error('--kind must be solid or clear');
  grow(kind, Number(arg('size', 6)), Number(arg('mirrors', 0)), Number(arg('count', 10)), { workers: Number(arg('workers', os.cpus().length)) })
    .catch((e) => { console.error(e); process.exit(1); });
}
