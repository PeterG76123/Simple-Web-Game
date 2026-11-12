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

  function levelFinished() {
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

  root.ArrowDaily = { levelFinished, open };
})(window);
