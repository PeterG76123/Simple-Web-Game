/*
 * Makes a whole group of tricky levels with tools/trick-gen.js, one after
 * another, into levels-tricky/<prefix>-01.json ... (sizes rising through the
 * group). Levels already made are skipped, so it can be stopped and re-run.
 *
 *   node tools/make-tricky-set.js --prefix insane-solid --count 25 --from 31 --to 40 --kind solid [--tries 10]
 *   node tools/make-tricky-set.js --prefix insane-clear --count 25 --from 31 --to 40 --kind clear
 *
 * kind solid: conga jams only (no see-through parts); clear: congas and
 * see-through shuffles.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const prefix = opt.prefix;
const count = Number(opt.count || 25);
const from = Number(opt.from || 31), to = Number(opt.to || 40);
const tries = Number(opt.tries || 6);
const kind = opt.kind || 'solid';
const ROUNDS = Number(opt.rounds || 12); // new seeds until a level has no gaps
const dir = path.join(__dirname, '..', 'levels-tricky');
/** Runs tools/patch-gaps.js on a level file (up to 20 minutes); returns its stats after. */
function repair(file) {
  try {
    execFileSync('node', [path.join(__dirname, 'patch-gaps.js'), file, '--tries', '4000'], { encoding: 'utf8', timeout: 20 * 60 * 1000 });
  } catch (e) { /* not fixed (or out of time): the file keeps whatever progress was saved */ }
  return JSON.parse(fs.readFileSync(file, 'utf8')).stats;
}
fs.mkdirSync(dir, { recursive: true });

// --stride 2 --offset 0/1 lets two runs share a group (alternate levels).
const stride = Number(opt.stride || 1), offset = Number(opt.offset || 0);
for (let i = offset; i < count; i += stride) {
  const name = `${prefix}-${String(i + 1).padStart(2, '0')}`;
  const out = path.join(dir, `${name}.json`);
  // A finished level with gaps isn't finished: set it aside as the best so far
  // and keep trying new seeds.
  let firstRound = 0;
  if (fs.existsSync(out)) {
    firstRound = 3; // its first three seeds were already tried
    if (JSON.parse(fs.readFileSync(out, 'utf8')).stats.gaps === 0) continue;
    fs.renameSync(out, `${out}.gaps`);
  }
  // A set-aside level with gaps from an earlier run: try repairing it first.
  if (fs.existsSync(`${out}.gaps`)) {
    fs.copyFileSync(`${out}.gaps`, out);
    const st = repair(out);
    console.log(`${name}: patched the set-aside level: ${st.gaps} gaps`);
    if (st.gaps === 0) { fs.unlinkSync(`${out}.gaps`); continue; }
    fs.renameSync(out, `${out}.gaps`);
    firstRound = Math.max(firstRound, 3);
  }
  const size = from + Math.floor((i * (to - from + 1)) / count);
  // Deeper jams further into the group.
  const depth = 5 + Math.floor((i * 4) / count);
  const flags = ['--size', size, '--tries', tries, '--seed', 1000 + i * 17 + (kind === 'clear' ? 7 : 0),
    '--depth', depth, '--fill', 0, '--backFill', 0, '--out', out];
  if (kind === 'solid') flags.push('--pShuffle', '0.000001', '--window', '0.000001');
  else flags.push('--keys', 4 + Math.floor((i * 3) / count), '--window', 0.45);
  // No gaps allowed: new seeds until a level comes out with every square covered.
  for (let round = firstRound; round < firstRound + ROUNDS; round++) {
    const t0 = Date.now();
    const seeded = flags.map(String);
    seeded[seeded.indexOf('--seed') + 1] = String(1000 + i * 17 + (kind === 'clear' ? 7 : 0) + round * 100003);
    try {
      const res = execFileSync('node', [path.join(__dirname, 'trick-gen.js'), ...seeded], { encoding: 'utf8', timeout: 45 * 60 * 1000 });
      const line = res.trim().split('\n').pop();
      console.log(`${name} (${size}x${size}) round ${round + 1}: ${line} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
      let stats = JSON.parse(line);
      // Another pass of the gap filler before deciding to try again.
      if (stats.gaps > 0) {
        execFileSync('node', [path.join(__dirname, 'refill-gaps.js'), out], { encoding: 'utf8', timeout: 30 * 60 * 1000 });
        stats = JSON.parse(fs.readFileSync(out, 'utf8')).stats;
        console.log(`  after the gap filler: ${stats.gaps} gaps`);
      }
      // Then repair the last gaps by re-covering the patch around each one.
      if (stats.gaps > 0) {
        stats = repair(out);
        console.log(`  after patching: ${stats.gaps} gaps`);
      }
      if (stats.gaps === 0) break;
      // Keep the best so far (fewest gaps) aside, and try a new seed.
      if (round < firstRound + ROUNDS - 1) {
        const prev = fs.existsSync(`${out}.gaps`) ? JSON.parse(fs.readFileSync(`${out}.gaps`, 'utf8')).stats.gaps : Infinity;
        if (stats.gaps < prev) fs.renameSync(out, `${out}.gaps`); else fs.unlinkSync(out);
      }
    } catch (e) {
      console.log(`${name}: failed (${(e.message || '').split('\n')[0]})`);
    }
  }
  // Keep whichever came out with fewer gaps.
  const gapsIn = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).stats.gaps : Infinity);
  if (gapsIn(`${out}.gaps`) < gapsIn(out)) fs.renameSync(`${out}.gaps`, out);
  if (fs.existsSync(`${out}.gaps`)) fs.unlinkSync(`${out}.gaps`);
}
