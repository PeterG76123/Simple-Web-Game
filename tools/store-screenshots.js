// Takes the store screenshots into the folder given (Play phone 1080 x 1920; SHOT=iphone or SHOT=ipad for the App Store):
//   python3 -m http.server 8765 &   then   node tools/store-screenshots.js store/screenshots
// It seeds a player with progress, two stocked tanks and a solved daily picture.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const santa = JSON.parse(fs.readFileSync('levels-daily/pictures/2026-12-02.json', 'utf8'));
const it = (uid, type, x, extra = {}) => ({ uid, type, x, color: 0, ...extra });
const marine = ['shark', 'clownfish', 'clownfish', 'bluetang', 'yellowtang', 'puffer', 'seahorse', 'lionfish', 'crab', 'crab', 'chromis', 'octopus'].map((t, i) => it(i + 1, t, 0.08 + 0.075 * i))
  .concat(['kelp', 'anemone', 'featherduster', 'seagrass', 'caulerpa'].map((t, i) => it(20 + i, t, [0.06, 0.3, 0.55, 0.78, 0.93][i])))
  .concat(['coral', 'starfish', 'clam', 'shell'].map((t, i) => it(30 + i, t, [0.2, 0.45, 0.68, 0.86][i])));
const tropical = ['angel', 'angel', 'discus', 'betta', 'gourami', 'tetra', 'tetra', 'tetra', 'guppy', 'cory'].map((t, i) => it(i + 1, t, 0.08 + 0.075 * i))
  .concat(['hairgrass', 'crypt', 'ludwigia', 'fern', 'tigerlotus'].map((t, i) => it(20 + i, t, [0.08, 0.3, 0.5, 0.72, 0.92][i])))
  .concat(['driftwood', 'chest', 'ship'].map((t, i) => it(30 + i, t, [0.25, 0.6, 0.82][i])));
(async () => {
  const b = await chromium.launch();
  // Size: Play phone by default; SHOT=iphone (1320 x 2868) or SHOT=ipad (2064 x 2752) for the App Store.
  const size = { play: [360, 640, 3], iphone: [440, 956, 3], ipad: [1032, 1376, 2] }[process.env.SHOT || 'play'];
  const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: size[2] });
  await ctx.route('**/*supabase.co/**', (r) => r.abort());
  await ctx.route('**/game.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('game.js', 'utf8').replace('{ playDaily });', '{ playDaily, __start: (t, g, i) => { tier = t; startLevel(g, i, { fresh: true }); }, __win: () => state.lines.forEach((l) => { l.mode = "gone"; }), __tap: (k) => { const l = state.lines[k]; } });') }));
  await ctx.addInitScript(({ santa, marine, tropical }) => {
    const t = new Date().toLocaleDateString('en-CA');
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };
    const set = Object.fromEntries(santa.map((r) => [r.difficulty, { level: r.level, solution: r.solution, title: r.title, picture: r.picture }]));
    localStorage.setItem('eel-daily-puzzles-v1', JSON.stringify({ [t]: set, [day(1)]: set, [day(2)]: set }));
    localStorage.setItem('eel-daily-seen-v1', JSON.stringify({ seen: t, told: t }));
    localStorage.setItem('eel-daily-done-v1', JSON.stringify({ solved: { [t + ':0']: 1, [t + ':1']: 1, [t + ':2']: 1, [day(1) + ':0']: 1, [day(1) + ':1']: 1, [day(1) + ':2']: 1, [day(1) + ':3']: 1, [day(2) + ':0']: 1, [day(2) + ':1']: 1, [day(2) + ':2']: 1, [day(2) + ':3']: 1 }, bonus: {} }));
    localStorage.setItem('arrow-escape-wallet-v1', JSON.stringify({ pearls: 2450, owned: 5, streak: { last: day(1), count: 4, today: t, levels: 0, greeted: t, savedFor: '' }, tankSeq: 2, shownTank: 't1', tanks: { t1: { type: 'marine', items: marine, next: 40 }, t2: { type: 'tropical', items: tropical, next: 40 } } }));
    // Some progress, so the menu shows open groups.
    const done = []; for (let i = 0; i < 25; i++) { done.push(`0-0-${i}`, `0-1-${i}`, `0-2-${i}`); } for (let i = 0; i < 12; i++) done.push(`1-0-${i}`, `0-3-${i}`);
    localStorage.setItem('arrow-escape-progress-v2', JSON.stringify({ completed: done, last: { tier: 0, group: 3, index: 12 } }));
  }, { santa, marine, tropical });
  const p = await ctx.newPage();
  const clean = async () => { await p.click('button:has-text("Dismiss")', { timeout: 600 }).catch(() => {}); await p.evaluate(() => document.querySelectorAll('.shop-overlay, .streak-party, .toast').forEach((o) => o.remove())); };
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500); await clean(); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/1-menu.png` });
  for (const [name, t, g, i] of [['2-puzzle', 1, 2, 6], ['3-twins', 1, 5, 9]]) {
    await p.evaluate(([t, g, i]) => ArrowGame.__start(t, g, i), [t, g, i]); await p.waitForTimeout(700); await clean(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${name}.png` });
  }
  // The day's picture revealed by solving the Insane daily puzzle.
  await p.evaluate(() => ArrowDaily.play(ArrowDaily.localDay(0), 3)); await p.waitForTimeout(800); await clean();
  await p.evaluate(() => ArrowGame.__win()); await p.waitForTimeout(1600); await clean(); await p.waitForTimeout(2800);
  await p.evaluate(() => { document.querySelectorAll('.rush-btn').forEach((e) => e.remove()); document.getElementById('dialogText').textContent = ''; document.querySelector('#overlay .dialog').scrollTop = 0; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/4-daily-picture.png` });
  await p.evaluate(() => { document.getElementById('overlay').hidden = true; document.querySelector('#menuBtn').click(); }); await p.waitForTimeout(600); await clean();
  await p.evaluate(() => ArrowDaily.openPuzzles(true)); await p.waitForTimeout(600);
  await p.evaluate(() => { const tabs = document.querySelectorAll('.daily-day-tab'); if (tabs[0]) tabs[0].click(); }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/5-daily.png` });
  await p.evaluate(() => document.querySelectorAll('.shop-overlay').forEach((o) => o.remove())); await p.waitForTimeout(300);
  await p.evaluate(() => ArrowAquarium.open()); await p.waitForTimeout(4000); await clean();
  await p.screenshot({ path: `${OUT}/6-marine.png` });
  await p.click('#aqNext'); await p.waitForTimeout(4000); await clean();
  await p.screenshot({ path: `${OUT}/7-tropical.png` });
  await p.click('[data-cat="fish"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/8-fish-shop.png` });
  await b.close();
})();
