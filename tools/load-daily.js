/*
 * Loads days' daily puzzles (levels-daily/pictures/<day>.json) into Supabase's
 * eel_daily_puzzles table through its REST API, then reads them back and checks
 * every row matches the file exactly.
 *
 *   NODE_USE_ENV_PROXY=1 node tools/load-daily.js 2026-12-09 2026-12-10 ...
 *
 * Needs the project's secret key: in a Claude cloud session it's injected by the
 * network proxy (SUPABASE_KEY can be a placeholder); elsewhere set SUPABASE_KEY.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL = 'https://ikekuyyvunkulgvhwpqi.supabase.co/rest/v1/eel_daily_puzzles';
const KEY = process.env.SUPABASE_KEY || 'proxy-injected';
const headers = { apikey: KEY, 'Content-Type': 'application/json' };
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

async function load(day) {
  const file = path.join(__dirname, '..', 'levels-daily', 'pictures', `${day}.json`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')).map((r) => ({
    day: r.day, difficulty: r.difficulty, level: r.level, solution: r.solution, title: r.title, picture: !!r.picture,
  }));
  if (rows.length !== 4 || rows.some((r) => r.day !== day)) throw new Error(`${day}: expected 4 rows for the day`);
  const put = await fetch(`${URL}?on_conflict=day,difficulty`, {
    method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows),
  });
  if (!put.ok) throw new Error(`${day}: upload failed, HTTP ${put.status}: ${await put.text()}`);
  const get = await fetch(`${URL}?day=eq.${day}&select=difficulty,level,solution,title,picture&order=difficulty`, { headers });
  if (!get.ok) throw new Error(`${day}: read-back failed, HTTP ${get.status}`);
  const back = await get.json();
  const bad = rows.filter((r) => {
    const b = back.find((x) => x.difficulty === r.difficulty);
    return !b || md5(b.level) !== md5(r.level) || b.solution !== r.solution || b.title !== r.title || b.picture !== r.picture;
  });
  if (bad.length) throw new Error(`${day}: ${bad.length} row(s) differ after loading`);
  console.log(`${day}: loaded and checked (${rows[0].title})`);
}

(async () => {
  let failed = 0;
  for (const day of process.argv.slice(2)) {
    try { await load(day); } catch (e) { failed++; console.error(String(e.message || e)); }
  }
  process.exit(failed ? 1 : 0);
})();
