/*
 * Builds levels-data.js from tools/level-plan.js and the level bank.
 *
 * For each difficulty setting and group:
 *  1. Top up the bank so each kind of slot (size, kind, reflectors) has
 *     `pool` candidates per slot.
 *  2. Rate every candidate on the difficulty scale (tools/difficulty.js),
 *     scaled within this setting and group.
 *  3. Fill each slot with a candidate spread across that slot kind's ratings.
 *  4. Rate the chosen levels again, scaled across just this group (so each
 *     group runs from 1.0 to 10.0), and order it from lowest to highest.
 *     A group with `phases` (e.g. [10, 15]) keeps its slots in those blocks:
 *     the first block's levels come first (ordered among themselves), then
 *     the next block's, and so on; each block's ratings cover its own share
 *     of the 1.0-10.0 range, so ratings still rise through the group.
 *
 * Run with: node tools/build-levels.js
 *           node tools/build-levels.js --no-grow   (use only what is already in
 *           the bank, leaving out groups that don't have enough levels yet)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const plan = require('./level-plan.js');
const { readBank, fill } = require('./bank.js');
const { scale } = require('./difficulty.js');
require('../rules.js');
const { decodeLevel, solve, pathToText } = globalThis.ArrowRules;
const MIXED = new Set(['rotclear', 'gatesclear', 'combo', 'twins', 'twinsclear', 'twinsmirror', 'twinsmix']);

/** A known solution for a mixed level (used by hints), as compact text. */
function solutionFor(entry) {
  if (entry.solution) return entry.solution;
  const L = decodeLevel(entry.level);
  const r = solve(L.size, L.lines, { mirrors: L.mirrors, rotatable: L.rotatable, gates: L.gates, plates: L.plates, twins: L.twins, maxStates: 100000 });
  return r.solvable ? pathToText(r.path) : null;
}

async function main() {
  const t0 = Date.now();
  const noGrow = process.argv.includes('--no-grow');

  // First work out everything the whole plan still needs, so the bank can
  // make it all in one parallel run instead of one kind at a time.
  const wants = new Map();
  for (const tier of plan.tiers) {
    for (const g of tier.groups) {
      const counts = new Map();
      for (const [size, kind, mirrors] of g.slots) counts.set(`${kind}:${size}:${mirrors}`, (counts.get(`${kind}:${size}:${mirrors}`) || 0) + 1);
      for (const [key, count] of counts) wants.set(key, (wants.get(key) || 0) + count * tier.pool);
    }
  }
  const jobs = [...wants].map(([key, want]) => {
    const [kind, size, mirrors] = [key.split(':')[0], Number(key.split(':')[1]), Number(key.split(':')[2])];
    return { kind, size, mirrors, count: Math.max(0, want - readBank(kind, size, mirrors).length) };
  }).filter((j) => j.count > 0);
  if (jobs.length && !noGrow) {
    console.log(`Making ${jobs.reduce((s, j) => s + j.count, 0)} levels for the bank:`);
    await fill(jobs);
  }

  const tiers = [];
  for (const tier of plan.tiers) {
    const groups = [];
    for (const g of tier.groups) {
      const needed = new Map();
      for (const [size, kind, mirrors] of g.slots) {
        if (size < tier.minSize || size > tier.maxSize) throw new Error(`${tier.name} ${g.name}: ${size}x${size} is outside ${tier.minSize}-${tier.maxSize}`);
        const key = `${kind}:${size}:${mirrors}`;
        needed.set(key, (needed.get(key) || 0) + 1);
      }
      console.log(`${tier.name}, ${g.name}:`);
      const pools = new Map();
      let short = false;
      for (const [key, count] of needed) {
        const [kind, size, mirrors] = [key.split(':')[0], Number(key.split(':')[1]), Number(key.split(':')[2])];
        const bank = readBank(kind, size, mirrors);
        if (bank.length < count) short = true;
        pools.set(key, bank);
      }
      if (short) {
        console.log('  left out: not enough levels in the bank yet');
        continue;
      }
      // One difficulty scale for the whole group, over every candidate.
      const rate = scale([...pools.values()].flat());
      const used = new Map();
      const picked = [];
      for (const [size, kind, mirrors] of g.slots) {
        const key = `${kind}:${size}:${mirrors}`;
        const pool = pools.get(key).map((e) => ({ e, r: rate(e) })).sort((a, b) => a.r - b.r);
        const total = needed.get(key);
        const k = used.get(key) || 0;
        used.set(key, k + 1);
        // The k-th of `total` slots of this kind takes from the k-th slice of
        // the pool's ratings, so a group gets a spread from easy to hard.
        picked.push({ ...pool[Math.min(pool.length - 1, Math.floor(((k + 0.5) / total) * pool.length))], kind });
      }
      // Final ratings: the same scale, stretched over this group's own levels,
      // so every group runs from 1.0 (its easiest) to 10.0 (its hardest).
      if (g.phases) {
        // Blocks of slots in order (e.g. the group's own mechanic first, then
        // levels that mix in others); each block spans its share of 1-10.
        const total = picked.length;
        const ordered = [];
        let start = 0;
        for (const size of g.phases) {
          const block = picked.slice(start, start + size);
          const final = scale(block.map((p) => p.e));
          const lo = 1 + (9 * start) / total, hi = 1 + (9 * (start + size)) / total;
          block.forEach((p) => { p.r = Math.round((lo + ((final(p.e) - 1) / 9) * (hi - lo)) * 10) / 10; });
          block.sort((a, b) => a.r - b.r);
          ordered.push(...block);
          start += size;
        }
        picked.splice(0, picked.length, ...ordered);
      } else {
        const final = scale(picked.map((p) => p.e));
        picked.forEach((p) => { p.r = final(p.e); });
        picked.sort((a, b) => a.r - b.r);
      }
      // Known solutions for mixed levels, so hints can follow them instantly.
      const solutions = picked.map((p) => (MIXED.has(p.kind) ? solutionFor(p.e) : null));
      groups.push({ name: g.name, levels: picked.map((p) => p.e.level), ratings: picked.map((p) => p.r), solutions });
      console.log(`  ratings: ${picked.map((p) => p.r.toFixed(1)).join(' ')}`);
    }
    tiers.push({ name: tier.name, groups });
  }

  const out = [
    '// Generated by tools/build-levels.js from tools/level-plan.js and levels-bank/. Do not edit by hand.',
    '// Levels use the compact format described in rules.js (ArrowRules.decodeLevel).',
    '// ratings: difficulty from 1.0 to 10.0, scaled within each setting and group (tools/difficulty.js).',
    '(function (root) {',
    '  root.ArrowLevelData = {',
    `    unlockAfter: ${plan.unlockAfter},`,
    '    tiers: [',
    ...tiers.flatMap((t) => [
      `      { name: ${JSON.stringify(t.name)}, groups: [`,
      ...t.groups.flatMap((g) => [
        `        { name: ${JSON.stringify(g.name)},`,
        `          ratings: ${JSON.stringify(g.ratings)},`,
        // Known solutions for big mixed levels (null elsewhere), used by hints.
        ...(g.solutions.some(Boolean) ? [`          solutions: ${JSON.stringify(g.solutions)},`] : []),
        '          levels: [',
        ...g.levels.map((l) => `            ${JSON.stringify(l)},`),
        '          ] },',
      ]),
      '      ] },',
    ]),
    '    ],',
    '  };',
    "})(typeof window !== 'undefined' ? window : globalThis);",
    '',
  ];
  fs.writeFileSync(path.join(__dirname, '..', 'levels-data.js'), out.join('\n'));
  console.log(`Wrote levels-data.js in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
