/*
 * The level bank: verified levels stored by kind, board size and number of
 * reflectors, one JSON object per line, in
 * levels-bank/<kind>-<size>-m<reflectors>.jsonl.
 *
 * Add levels from the command line:
 *   node tools/bank.js --kind=solid --size=8 --count=200
 *   node tools/bank.js --kind=clear --size=10 --mirrors=4 --count=50 --workers=4
 *
 * Kinds are listed in tools/kinds.js. Each run continues from what is already
 * in the bank (new seeds, duplicates skipped), so it can be run again and
 * again to grow the bank.
 *
 * Speed: one pool of long-lived workers (one per CPU core) serves every job
 * at once, one level at a time, so all cores stay busy even when each kind
 * only needs a few levels. Results are written as soon as they arrive.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const BANK_DIR = path.join(__dirname, '..', 'levels-bank');

const keyOf = (kind, size, mirrors) => `${kind}-${String(size).padStart(2, '0')}-m${mirrors}`;
const bankFile = (kind, size, mirrors) => path.join(BANK_DIR, `${keyOf(kind, size, mirrors)}.jsonl`);

function readBank(kind, size, mirrors) {
  const file = bankFile(kind, size, mirrors);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Makes `count` more levels for every job [{ kind, size, mirrors, count }],
 * all in parallel. Returns a Map of job key -> whole bank for that key.
 */
async function fill(jobs, { workers = os.cpus().length, log = true } = {}) {
  fs.mkdirSync(BANK_DIR, { recursive: true });
  const state = jobs.filter((j) => j.count > 0).map((j) => {
    if (j.size > 40) throw new Error("Boards are limited to 40x40");
    const existing = readBank(j.kind, j.size, j.mirrors);
    return {
      ...j,
      key: keyOf(j.kind, j.size, j.mirrors),
      seen: new Set(existing.map((e) => e.level)),
      have: existing.length,
      left: j.count, // still to find
      running: 0,
      seq: existing.length * 1000, // seeds continue from the bank's size
      started: Date.now(),
    };
  });
  const t0 = Date.now();
  const total = state.reduce((s, j) => s + j.left, 0);
  if (total === 0) return collect(jobs);

  await new Promise((resolve, reject) => {
    const pool = [];
    let done = 0;
    let finished = false;
    const next = () => {
      // The job with the most work still unclaimed goes first. When every
      // remaining level is already being worked on, spare workers race on
      // the same jobs (first answer wins), so no core sits idle at the end.
      let best = null;
      for (const j of state) if (j.left - j.running > 0 && (!best || j.left - j.running > best.left - best.running)) best = j;
      if (best) return best;
      for (const j of state) if (j.left > 0 && (!best || j.running / j.left < best.running / best.left)) best = j;
      return best;
    };
    const assign = (w) => {
      const j = next();
      if (!j) {
        w.idle = true;
        if (pool.every((p) => p.idle) && !finished) {
          finished = true;
          pool.forEach((p) => p.terminate());
          resolve();
        }
        return;
      }
      j.running++;
      w.idle = false;
      w.job = j;
      w.postMessage({ id: j.key, kind: j.kind, size: j.size, mirrors: j.mirrors, seed: (hash(j.key) ^ Math.imul(++j.seq, 2654435761)) >>> 0 });
    };
    for (let i = 0; i < workers; i++) {
      const w = new Worker(path.join(__dirname, 'gen-worker.js'));
      w.on('message', ({ entry }) => {
        const j = w.job;
        j.running--;
        if (entry && !j.seen.has(entry.level) && j.left > 0) {
          j.seen.add(entry.level);
          j.left--;
          j.have++;
          done++;
          fs.appendFileSync(bankFile(j.kind, j.size, j.mirrors), JSON.stringify(entry) + '\n');
          if (log && j.left === 0) {
            const secs = (Date.now() - j.started) / 1000;
            console.log(`  ${j.key}: +${j.count} in ${secs.toFixed(0)}s, ${j.have} in bank  [${done}/${total} overall, ${((Date.now() - t0) / 1000).toFixed(0)}s]`);
          }
        }
        assign(w);
      });
      w.on('error', reject);
      pool.push(w);
      assign(w);
    }
  });
  if (log) console.log(`  made ${total} levels in ${((Date.now() - t0) / 1000).toFixed(0)}s on ${workers} workers`);
  return collect(jobs);
}

function collect(jobs) {
  const out = new Map();
  for (const j of jobs) out.set(`${j.kind}:${j.size}:${j.mirrors}`, readBank(j.kind, j.size, j.mirrors));
  return out;
}

/** Adds `count` new levels of one kind. Returns the whole bank for that kind. */
async function grow(kind, size, mirrors, count, opts) {
  return (await fill([{ kind, size, mirrors, count }], opts)).get(`${kind}:${size}:${mirrors}`);
}

module.exports = { readBank, fill, grow, bankFile };

if (require.main === module) {
  const arg = (name, def) => {
    const a = process.argv.find((x) => x.startsWith(`--${name}=`));
    return a ? a.split('=')[1] : def;
  };
  const kind = arg('kind', 'solid');
  if (!require('./kinds.js')[kind]) throw new Error(`Unknown kind ${kind}; see tools/kinds.js`);
  grow(kind, Number(arg('size', 6)), Number(arg('mirrors', 0)), Number(arg('count', 10)), { workers: Number(arg('workers', os.cpus().length)) })
    .catch((e) => { console.error(e); process.exit(1); });
}
