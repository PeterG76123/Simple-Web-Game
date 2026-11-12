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
const tries = Number(opt.tries || 10);
const kind = opt.kind || 'solid';
const dir = path.join(__dirname, '..', 'levels-tricky');
fs.mkdirSync(dir, { recursive: true });

for (let i = 0; i < count; i++) {
  const name = `${prefix}-${String(i + 1).padStart(2, '0')}`;
  const out = path.join(dir, `${name}.json`);
  if (fs.existsSync(out)) continue;
  const size = from + Math.floor((i * (to - from + 1)) / count);
  // Deeper jams further into the group.
  const depth = 5 + Math.floor((i * 4) / count);
  const flags = ['--size', size, '--tries', tries, '--seed', 1000 + i * 17 + (kind === 'clear' ? 7 : 0),
    '--depth', depth, '--fill', 0, '--backFill', 0, '--out', out];
  if (kind === 'solid') flags.push('--pShuffle', '0.000001', '--window', '0.000001');
  else flags.push('--keys', 4 + Math.floor((i * 3) / count), '--window', 0.45);
  // No gaps allowed: new seeds until a level comes out with every square covered.
  for (let round = 0; round < 4; round++) {
    const t0 = Date.now();
    const seeded = flags.map(String);
    seeded[seeded.indexOf('--seed') + 1] = String(1000 + i * 17 + (kind === 'clear' ? 7 : 0) + round * 100003);
    try {
      const res = execFileSync('node', [path.join(__dirname, 'trick-gen.js'), ...seeded], { encoding: 'utf8', timeout: 45 * 60 * 1000 });
      const line = res.trim().split('\n').pop();
      console.log(`${name} (${size}x${size}) round ${round + 1}: ${line} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
      const stats = JSON.parse(line);
      if (stats.gaps === 0) break;
      if (round < 3) fs.renameSync(out, `${out}.gaps`);
    } catch (e) {
      console.log(`${name}: failed (${(e.message || '').split('\n')[0]})`);
    }
  }
  if (!fs.existsSync(out) && fs.existsSync(`${out}.gaps`)) fs.renameSync(`${out}.gaps`, out);
  if (fs.existsSync(`${out}.gaps`)) fs.unlinkSync(`${out}.gaps`);
}
