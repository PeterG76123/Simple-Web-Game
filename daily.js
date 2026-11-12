/*
 * The daily pearl bonus and streak, on screen.
 *
 *   ArrowDaily.levelFinished()   call when a level is finished (or skipped); returns
 *                                what it did for today's bonus (for the win screen)
 *   ArrowDaily.open()            the daily bonus panel (also from the menu's streak badge)
 *
 * On opening the game each day: a reminder of today's bonus ("Solve 3 levels to
 * earn your daily pearl bonus"), after first offering to save a streak that ended
 * by one missed day (for a short ad). The rules and amounts live in wallet.js and
 * config.js (pearls.streak).
 */
(function (root) {
  'use strict';
  const W = root.ArrowWallet;
  const app = document.getElementById('app') || document.body;
  const badge = document.getElementById('menuStreakBtn');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // ---------- A small dialog of our own ----------
  let box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function dialog(title, html, buttons) {
    close();
    box = document.createElement('div');
    box.className = 'overlay shop-overlay';
    box.innerHTML = `<div class="dialog shop daily" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${html}<div class="dialog-buttons"></div></div>`;
    const row = box.querySelector('.dialog-buttons');
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = `btn ${b.primary ? 'primary' : 'ghost'}`;
      el.textContent = b.label;
      el.addEventListener('click', b.action);
      row.appendChild(el);
    }
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    app.appendChild(box);
    const first = box.querySelector('button');
    if (first) first.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box) close(); });

  /** A week of the streak: day boxes with their pearls, done ones ticked, today's ringed. */
  function week(s) {
    const target = s.doneToday ? s.count : s.count + 1; // the streak day today counts as
    const first = Math.floor((target - 1) / 7) * 7 + 1;
    let cells = '';
    for (let n = first; n < first + 7; n++) {
      const [reward, bonus] = W.streakReward(n);
      const done = n <= s.count && (s.doneToday || n < target);
      const cls = `${done ? ' done' : ''}${n === target ? ' today' : ''}${bonus ? ' bonus' : ''}`;
      cells += `<div class="day${cls}"><span class="day-n">Day ${n}</span>` +
        `<span class="day-icon" aria-hidden="true">${done ? '✓' : bonus ? '🎁' : '<span class="pearl"></span>'}</span>` +
        `<span class="day-p">+${reward + bonus}</span></div>`;
    }
    return `<div class="streak-week">${cells}</div>`;
  }

  /** The daily bonus panel. */
  function open() {
    const s = W.streak();
    let text;
    if (s.doneToday) {
      const [r, b] = W.streakReward(s.count + 1);
      text = `<p class="daily-lead">Today's bonus is yours! 🔥 ${plural(s.count, 'day', 'days')} in a row.</p>` +
        `<p class="shop-small">Come back tomorrow and solve ${plural(s.need, 'level', 'levels')} for <strong>+${r + b} pearls</strong>.</p>`;
    } else {
      const [r, b] = W.streakReward(s.count + 1);
      const left = s.need - s.levelsToday;
      text = `<p class="daily-lead">Solve ${plural(s.need, 'level', 'levels')} today to earn <strong>+${r + b} pearls</strong>.</p>` +
        `<p class="shop-small">${s.levelsToday ? `${s.levelsToday} of ${s.need} done, ${left} to go. ` : ''}` +
        `${s.count ? `You're on a ${s.count}-day streak. ` : ''}Play every day for bigger bonuses, and a big one every 7th day.</p>`;
    }
    dialog('Daily pearl bonus', text + week(s), [{ label: s.doneToday ? 'Great' : "Let's go", primary: true, action: close }]);
  }

  /** The menu's streak badge: the streak so far, and today's progress until it's earned. */
  function showBadge() {
    if (!badge) return;
    const s = W.streak();
    badge.querySelector('.streak-n').textContent = s.count;
    // Today's levels as small dots under the number (all lit once the bonus is earned).
    const lit = s.doneToday ? s.need : s.levelsToday;
    badge.querySelector('.streak-today').innerHTML = Array.from({ length: s.need }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('');
    badge.classList.toggle('earned', s.doneToday);
    badge.setAttribute('aria-label', `Daily bonus: ${plural(s.count, 'day', 'days')} in a row, ${s.doneToday ? "today's bonus earned" : `${s.levelsToday} of ${s.need} levels today`}`);
  }
  if (badge) badge.addEventListener('click', open);
  W.onChange(showBadge);
  showBadge();

  /** A level was finished. A catch-up daily puzzle (an earlier day) doesn't count towards the streak. */
  function levelFinished(meta) {
    if (meta && meta.day && meta.day !== localDay(0)) return null;
    const result = W.streakLevel();
    showBadge();
    return result;
  }

  // ---------- On opening the game each day ----------
  function greet() {
    if (!W.greetToday()) return;
    const s = W.streak();
    if (s.canSave && root.ArrowAds) offerSave(s);
    else if (!s.doneToday) open();
  }
  // A streak that ended by one missed day: offer to keep it, for a short ad.
  function offerSave(s) {
    dialog('Your streak ended', `<p>You missed a day, so your 🔥 <strong>${s.lostCount}-day</strong> streak is over.</p><p class="shop-small">Watch a short ad to keep it going.</p>`, [
      { label: 'Watch an ad to keep it', primary: true, action: async () => {
        close();
        if (await root.ArrowAds.showRewarded()) { W.saveStreak(); showBadge(); open(); }
        else { if (root.ArrowShop) root.ArrowShop.toast('Watch to the end to keep your streak'); offerSave(s); }
      } },
      { label: 'Start a new streak', action: () => { W.dropStreak(); close(); showBadge(); open(); } },
    ]);
  }
  // Shortly after the menu appears, unless something else is already on screen.
  setTimeout(() => {
    const busy = document.querySelector('.shop-overlay') || !document.getElementById('overlay').hidden;
    if (!busy) greet();
  }, 900);

  // ---------- Daily puzzles ----------
  // Four a day (Easy, Medium, Hard, Insane), fetched from Supabase. A new day
  // starts at local midnight; the last few days can be caught up on (they
  // pay pearls but don't count towards the streak). Solved puzzles are
  // remembered on the device.
  const C = () => (root.ArrowConfig && root.ArrowConfig.get('daily')) || {};
  const DIFF = ['Easy', 'Medium', 'Hard', 'Insane'];
  const CACHE_KEY = 'eel-daily-puzzles-v1';
  const DONE_KEY = 'eel-daily-done-v1';
  const pad = (v) => String(v).padStart(2, '0');
  /** The local date `back` days ago, as YYYY-MM-DD. */
  function localDay(back) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  let puzzles = read(CACHE_KEY, {}); // { day: { difficulty: { level, solution, title } } }
  const done = read(DONE_KEY, { solved: {}, bonus: {} }); // solved["day:diff"], bonus[day]

  let loading = null;
  /** Fetches the days that can be played now (today and the catch-up days). */
  function load() {
    if (loading) return loading;
    const cfg = C();
    if (!cfg.url || !cfg.key || !root.fetch) return Promise.resolve(false);
    const from = localDay(cfg.catchUpDays || 7);
    const to = localDay(0);
    const url = `${cfg.url}/rest/v1/eel_daily_puzzles?select=day,difficulty,level,solution,title&day=gte.${from}&day=lte.${to}`;
    loading = fetch(url, { headers: { apikey: cfg.key } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows) => {
        const got = {};
        for (const r of rows) (got[r.day] = got[r.day] || {})[r.difficulty] = { level: r.level, solution: r.solution, title: r.title };
        puzzles = got;
        write(CACHE_KEY, puzzles);
        showDailyCard();
        return true;
      })
      .catch(() => false)
      .finally(() => { loading = null; });
    return loading;
  }

  const days = () => Array.from({ length: (C().catchUpDays || 7) + 1 }, (_, i) => localDay(i));
  const isSolved = (day, d) => !!done.solved[`${day}:${d}`];
  const solvedOn = (day) => [0, 1, 2, 3].filter((d) => isSolved(day, d)).length;
  const dayName = (day, i) => (i === 0 ? 'Today' : i === 1 ? 'Yesterday' : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }));

  /** A daily puzzle was solved: pays its pearls the first time (and the all-four bonus). */
  function puzzleFinished(meta) {
    const cfg = C();
    const parts = [];
    if (!isSolved(meta.day, meta.difficulty)) {
      done.solved[`${meta.day}:${meta.difficulty}`] = Date.now();
      parts.push([`Daily ${DIFF[meta.difficulty]}`, (cfg.rewards || [])[meta.difficulty] || 0]);
      if (solvedOn(meta.day) === 4 && !done.bonus[meta.day]) {
        done.bonus[meta.day] = true;
        parts.push(['All four', cfg.allFour || 0]);
      }
      write(DONE_KEY, done);
    }
    const pearls = parts.reduce((a, [, n]) => a + n, 0);
    if (pearls) W.addPearls(pearls);
    showDailyCard();
    return { pearls, parts: parts.filter(([, n]) => n > 0) };
  }

  function play(day, d) {
    const p = puzzles[day] && puzzles[day][d];
    if (!p || !root.ArrowGame) return;
    close();
    root.ArrowGame.playDaily({ day, difficulty: d, level: p.level, solution: p.solution, label: DIFF[d], title: p.title });
  }

  /** The daily puzzles panel: today's four, then the catch-up days. */
  function openPuzzles(fetched) {
    const cfg = C();
    const list = days();
    const has = list.some((day) => puzzles[day]);
    let html = '';
    if (!has) {
      html = `<p class="daily-lead">${fetched === false ? 'Couldn’t load the daily puzzles. Check your connection and try again.' : 'Loading today’s puzzles…'}</p>`;
    } else {
      list.forEach((day, i) => {
        const set = puzzles[day];
        if (!set) return;
        const all = solvedOn(day) === 4;
        html += `<div class="daily-day${i === 0 ? ' today' : ''}"><div class="daily-day-head"><strong>${dayName(day, i)}</strong>` +
          `<span>${all ? `All four solved${done.bonus[day] ? ' ✓' : ''}` : i === 0 ? `+${cfg.allFour || 0} for all four` : 'Catch up: pearls, no streak'}</span></div><div class="daily-row">`;
        for (let d = 0; d < 4; d++) {
          if (!set[d]) { html += '<span class="daily-tile missing"></span>'; continue; }
          const ok = isSolved(day, d);
          html += `<button class="daily-tile${ok ? ' done' : ''}" data-day="${day}" data-d="${d}" aria-label="${dayName(day, i)}, ${DIFF[d]}${ok ? ', solved' : ''}">` +
            `<span class="daily-diff">${DIFF[d]}</span>` +
            `<span class="daily-reward">${ok ? '✓' : `+${(cfg.rewards || [])[d] || 0}<span class="pearl"></span>`}</span>` +
            `${set[d].title ? `<span class="daily-title">${set[d].title}</span>` : ''}</button>`;
        }
        html += '</div></div>';
      });
    }
    dialog('Daily puzzles', `<div class="daily-list">${html}</div>`, [{ label: 'Close', action: close }]);
    box.querySelectorAll('.daily-tile[data-day]').forEach((b) => b.addEventListener('click', () => play(b.dataset.day, Number(b.dataset.d))));
    if (!has && fetched === undefined) load().then((ok) => { if (box && box.querySelector('.daily-list')) openPuzzles(ok); });
  }

  // The menu's card: how many of today's four are solved.
  const card = document.getElementById('menuDailyBtn');
  function showDailyCard() {
    if (!card) return;
    const today = localDay(0);
    const n = solvedOn(today);
    const text = document.getElementById('menuDailyText');
    const dots = document.getElementById('menuDailyDots');
    if (text) text.textContent = n === 4 ? 'All four solved today!' : puzzles[today] ? `${4 - n} new ${4 - n === 1 ? 'puzzle' : 'puzzles'} today` : 'Four new puzzles every day';
    if (dots) dots.innerHTML = [0, 1, 2, 3].map((d) => `<i class="${isSolved(today, d) ? 'on' : ''}"></i>`).join('');
  }
  if (card) card.addEventListener('click', () => openPuzzles());
  showDailyCard();
  load();
  // A new day (left open past midnight, or back from the background).
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { showDailyCard(); load(); } });

  root.ArrowDaily = { levelFinished, open, openPuzzles, puzzleFinished, localDay };
})(window);
