(function () {
  'use strict';

  const { DIRS, buildLine, mirrorMap, reach, reachBack, solve, decodeLevel, makeWorld, anyMap, turnMirror, canTurn, findTurnWay, twinMap, twinReach } = window.ArrowRules;
  // Older level files had one list of groups and no difficulty settings.
  const TIERS = window.ArrowLevelData.tiers || [{ name: 'Easy', groups: window.ArrowLevelData.groups }];
  const STORAGE_KEY = 'arrow-escape-progress-v2';

  // The difficulty setting (Easy, Medium, ...) being shown or played. Groups
  // and levels below always mean those of this setting.
  let tier = 0;
  const groupsNow = () => TIERS[tier].groups;
  // Each group's place in the sea. (The level data names the mechanic, which
  // is shown under it.)
  const GROUP_TITLES = ['Kelp Shallows', 'Jellyfish Bay', 'Crystal Reef', 'Whirlpool', 'Sunken Wreck', 'Mirror Lagoon'];
  const groupTitle = (g) => GROUP_TITLES[g] || `Group ${g + 1}`;
  // What's new in each group, in the game's own words (shown under the group
  // cards and when a group unlocks).
  const GROUP_BLURBS = ['Solid eels', 'See-through eels', 'Eels bounce off pearl reflectors', 'Turn the pearl reflectors', "Anemones open the wreck's gates", 'Twin eels move together'];
  const groupBlurb = (g) => GROUP_BLURBS[g] || groupsNow()[g].name;

  // Levels are stored compactly (see rules.js) and decoded when first needed.
  const decoded = new Map();
  function levelAt(group, index) {
    const key = `${tier}-${group}-${index}`;
    if (!decoded.has(key)) {
      const raw = groupsNow()[group].levels[index];
      decoded.set(key, typeof raw === 'string' ? decodeLevel(raw) : raw);
    }
    return decoded.get(key);
  }

  const SETTLE_SPEED = 14; // cells per second when snapping to a cell
  const EXIT_SPEED_START = 10;
  const EXIT_ACCEL = 40;
  const BLOCK_PUSH = 0.35; // how far past a blocker you must push to see it flash
  const BUMP_SPEED = 16; // cells per second when a tapped line runs at a blocker
  const BUMP_OVERLAP = 0.3; // how far it pokes into the blocker before springing back
  const TAP_MAX_MS = 500; // a press this short that barely moves counts as a tap
  const TAP_MAX_MOVE = 0.2; // in cells

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const screens = { menu: $('menu'), game: $('game') };
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const boardWrap = $('boardWrap');
  const overlay = $('overlay');

  // ---------- Progress (saved per browser, optional) ----------
  // progress.completed holds "setting-group-level" keys, e.g. "0-2-4" (all
  // counted from 0). Older saves used "group-level" for Easy; those are read
  // as Easy.
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.completed)) {
        data.completed = data.completed.map((k) => (k.split('-').length === 2 ? `0-${k}` : k));
        return data;
      }
    } catch (e) { /* storage unavailable: play without saving */ }
    return { completed: [] };
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }

  // ---------- Welcome popups ----------
  // Each group's welcome popup (intro.js) shows the first time you play any
  // level in it; the ? button brings it back.
  const INTROS_KEY = 'arrow-escape-intros-seen-v1';
  let introsSeen = [];
  try { introsSeen = JSON.parse(localStorage.getItem(INTROS_KEY)) || []; } catch (e) { introsSeen = []; }
  function showIntro(group) {
    if (!window.ArrowIntro) return;
    window.ArrowIntro.show(group, groupTitle(group), () => {
      if (!introsSeen.includes(group)) {
        introsSeen.push(group);
        try { localStorage.setItem(INTROS_KEY, JSON.stringify(introsSeen)); } catch (e) { /* ignore */ }
      }
      resetIdle();
    });
  }
  const introOpen = () => !!(window.ArrowIntro && window.ArrowIntro.isOpen());

  // ---------- Nudging towards a hint ----------
  // If nothing happens for a while, the Hint button pulses with a little bubble.
  const IDLE_MS = 20000;
  let lastActive = performance.now();
  function resetIdle() {
    lastActive = performance.now();
    const b = document.getElementById('hintBtn');
    if (b) b.classList.remove('nudge');
  }
  ['pointerdown', 'keydown', 'wheel'].forEach((type) => document.addEventListener(type, resetIdle, { capture: true, passive: true }));
  setInterval(() => {
    const b = document.getElementById('hintBtn');
    const settingsOpen = window.ArrowSettings && window.ArrowSettings.isOpen && window.ArrowSettings.isOpen();
    const waiting = state && screens.game.classList.contains('active') && !state.finished && !state.hint && !state.thinking
      && overlay.hidden && !settingsOpen && !introOpen() && !(window.ArrowShop && window.ArrowShop.isOpen()) && !b.disabled && !document.hidden;
    if (!waiting) { lastActive = Math.max(lastActive, performance.now() - IDLE_MS / 2); return; }
    if (performance.now() - lastActive > IDLE_MS) b.classList.add('nudge');
  }, 1000);

  // ---------- Levels in progress ----------
  // Where every line (and reflector) is on levels you've started but not
  // finished, with the undo history, so leaving and coming back loses nothing.
  const IN_PLAY_KEY = 'arrow-escape-in-play-v1';
  let inPlay = {};
  try { inPlay = JSON.parse(localStorage.getItem(IN_PLAY_KEY)) || {}; } catch (e) { inPlay = {}; }
  const levelKey = (t, g, i) => `${t}-${g}-${i}`;
  // A short fingerprint of a level, so a save is never applied to a level
  // that has since been replaced by a new version of the game.
  function levelSig(t, g, i) {
    const text = TIERS[t].groups[g].levels[i];
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    let h = 0;
    for (let k = 0; k < str.length; k++) h = (h * 31 + str.charCodeAt(k)) | 0;
    return h;
  }
  function savedRun(t, g, i) {
    const run = inPlay[levelKey(t, g, i)];
    return run && run.sig === levelSig(t, g, i) ? run : null;
  }
  function writeInPlay() {
    try { localStorage.setItem(IN_PLAY_KEY, JSON.stringify(inPlay)); } catch (e) { /* ignore */ }
  }
  function forgetRun(t, g, i) {
    const key = levelKey(t, g, i);
    if (inPlay[key]) { delete inPlay[key]; writeInPlay(); }
  }
  /** Saves the level being played (or forgets it once it's finished or back at the start). */
  function rememberRun() {
    if (!state) return;
    if (state.finished || state.history.length === 0) { forgetRun(state.tier, state.group, state.index); return; }
    inPlay[levelKey(state.tier, state.group, state.index)] = {
      sig: levelSig(state.tier, state.group, state.index),
      rests: restOffsets(),
      mirrors: state.rotatable ? state.mirrors : undefined,
      history: state.history,
      hints: state.hintsUsed,
      left: state.lines.filter((l) => l.rest >= 0).length,
      total: state.lines.length,
    };
    writeInPlay();
  }
  const progress = loadProgress();
  const isCompleted = (g, i) => progress.completed.includes(`${tier}-${g}-${i}`);
  const completedIn = (g) => groupsNow()[g].levels.filter((_, i) => isCompleted(g, i)).length;
  // Unlocking: levels in order within a group; a group opens once the whole group
  // before it (same difficulty) is done, and once the same group is done on the
  // difficulty below (Medium after Easy, Hard after Medium).
  // (The testUnlockAll setting opens everything, for testing only.)
  const unlockAll = () => !!(window.ArrowConfig && window.ArrowConfig.get('testUnlockAll') === true);
  const doneIn = (t, g) => {
    const grp = (TIERS[t] && TIERS[t].groups[g]);
    return grp ? grp.levels.filter((_, i) => progress.completed.includes(`${t}-${g}-${i}`)).length : 0;
  };
  const groupDone = (t, g) => { const grp = TIERS[t] && TIERS[t].groups[g]; return !!grp && doneIn(t, g) >= grp.levels.length; };
  const groupOpen = (t, g) => unlockAll() || ((g === 0 || groupDone(t, g - 1)) && (t === 0 || groupDone(t - 1, g)));
  const isGroupUnlocked = (g) => groupOpen(tier, g);
  const isUnlocked = (g, i) => isGroupUnlocked(g) && (unlockAll() || i === 0 || isCompleted(g, i - 1));
  /** Why a group is still locked, for the menu. */
  function lockReason(g) {
    if (g > 0 && !groupDone(tier, g - 1)) {
      const left = groupsNow()[g - 1].levels.length - doneIn(tier, g - 1);
      return `Finish ${left} more ${left === 1 ? 'level' : 'levels'} in ${groupTitle(g - 1)} to unlock this group.`;
    }
    const left = TIERS[tier - 1].groups[g].levels.length - doneIn(tier - 1, g);
    return `Finish ${left} more ${left === 1 ? 'level' : 'levels'} of ${groupTitle(g)} on ${TIERS[tier - 1].name} to unlock it here.`;
  }

  // ---------- Theme colours for the canvas ----------
  let colors = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    colors = {
      dot: v('--dot'),
      mirror: v('--mirror'),
      mirrorEdge: v('--mirror-edge'),
      turnable: v('--accent'),
      gates: [v('--gate0'), v('--gate1'), v('--gate2')],
      surface: v('--surface'),
      danger: v('--danger'),
      lines: Array.from({ length: 10 }, (_, i) => v(`--c${i + 1}`)),
    };
  }
  readColors();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- Game state ----------
  let state = null;
  let drag = null;

  /** Opens a level, carrying on where you left it unless `fresh` is set. */
  function startLevel(group, index, { fresh = false } = {}) {
    // Remember where the player is, so the menu opens here next time.
    progress.last = { tier, group, index };
    progress.lastGroup = { ...(progress.lastGroup || {}), [tier]: group };
    saveProgress();
    const level = levelAt(group, index);
    const n = level.size;
    const mirrors = (level.mirrors || []).map((m) => m.slice());
    const map = mirrorMap(n, mirrors);
    const world = makeWorld(n, level.gates || [], level.plates || []);
    const lines = level.lines.map((a, id) => Object.assign(buildLine(n, a, map), {
      id,
      colorIndex: (id * 3) % 10,
      // Picture and theme levels give each eel its own colour.
      ownColor: a.color || null,
      rest: 0, // where the line sits (-1 once it has left)
      offset: 0, // where it is drawn
      mode: 'idle', // idle | drag | settle | exit | gone
      speed: 0,
      flash: 0,
    }));
    lines.world = world; // gates and plates, used by the movement checks
    // Twin eels share a colour of their own (and are drawn banded): each pair
    // gets a colour no other eel on the board uses.
    const twins = level.twins || [];
    const TWIN_COLOURS = [8, 1, 6, 3]; // sunny yellow, pink, coral, orange
    const reserved = TWIN_COLOURS.slice(0, twins.length);
    lines.forEach((l) => { while (reserved.includes(l.colorIndex)) l.colorIndex = (l.colorIndex + 1) % 10; });
    twins.forEach(([a, b], k) => { lines[a].colorIndex = lines[b].colorIndex = reserved[k]; });

    state = {
      tier, group, index, n, lines, mirrors, history: [], finished: false,
      // A picture level: its eels are the picture's colours, drawn fat so they fill their squares.
      picture: !!level.colors,
      rotatable: !!level.rotatable,
      gates: level.gates || [],
      plates: level.plates || [],
      twins,
      twinOf: twinMap(lines.length, twins),
      mirrorAnim: [], // per reflector: { from, to, start } angles while turning
      mirrorFlash: [], // per reflector: 0-1, flashes when it can't turn
      gateFlash: new Map(), // gate cell -> 0-1, flashes when it blocks a line
      rating: (groupsNow()[group].ratings || [])[index],
      // Tips are for learning the game, so only on Easy.
      // No standing tips under the board (the welcome popups teach each
      // group); the space is only used to explain a hint.
      levelHint: '',
      hint: null, // { id, to, start, moves } while a hint is showing
      hintsUsed: 0, // counted so hints can be tied to ads later
    };
    drag = null;

    // Carry on from where this level was left, if it was.
    if (fresh) forgetRun(tier, group, index);
    const run = fresh ? null : savedRun(tier, group, index);
    if (run && run.rests.length === lines.length) {
      if (run.mirrors) {
        state.mirrors = run.mirrors.map((m) => m.slice());
        rebuildLines();
      }
      lines.forEach((l, i) => {
        l.rest = run.rests[i];
        if (l.rest < 0) { l.mode = 'gone'; l.offset = l.exitAt + 1; } else l.offset = l.rest;
      });
      state.history = run.history;
      state.hintsUsed = run.hints || 0;
    }

    screens.game.dataset.group = String(group);
    $('levelLabel').textContent = `${groupTitle(group)} · ${index + 1}`;
    $('levelLabel').title = `${groupTitle(group)}, level ${index + 1}`;
    $('hint').textContent = state.levelHint;
    $('hint').classList.remove('active');
    delete canvas.dataset.hintLine;
    delete canvas.dataset.hintTo;
    updateHud();
    hideDialog();
    showScreen('game');
    pointers.clear();
    pinch = null;
    pan = null;
    $('zoomControls').hidden = n < 9;
    resetView();
    resizeCanvas();
    resetIdle();
    // First time in this group? Show how its new mechanic works.
    if (!introsSeen.includes(group)) {
      setTimeout(() => { if (state && state.group === group && !introOpen()) showIntro(group); }, 300);
    }
  }

  const restOffsets = () => state.lines.map((l) => l.rest);

  /** A line's twin while both are on the board (they move together), else null. */
  function partnerOf(line) {
    const t = state.twinOf ? state.twinOf[line.id] : -1;
    if (t < 0 || line.rest < 0) return null;
    const other = state.lines[t];
    return other.rest >= 0 && other.mode !== 'exit' && other.mode !== 'gone' ? other : null;
  }

  /** Moves a line's twin by the same amount the line just moved, and returns its history note. */
  function moveTwinBy(twin, from, delta) {
    twin.rest = from + delta;
    if (twin.rest >= twin.exitAt) {
      twin.rest = -1;
      twin.mode = 'exit';
      twin.speed = EXIT_SPEED_START;
    } else {
      twin.mode = 'settle';
    }
    return { id: twin.id, from };
  }

  function updateHud() {
    const moves = state.history.length;
    $('moves').textContent = `${TIERS[state.tier].name} · ${moves === 1 ? '1 move' : `${moves} moves`}`;
    const left = state.lines.filter((l) => l.rest >= 0).length;
    $('remaining').textContent = left === 1 ? '1 eel left' : `${left} eels left`;
    $('undoBtn').disabled = moves === 0 || state.finished;
    $('hintBtn').disabled = state.finished || left === 0;
    // Skipping (for a short ad) is offered whenever it's allowed, hints or not.
    $('skipBtn').hidden = !skipAllowed() || state.finished;
    updateHintBadge();
    // Any move (or undo) makes the current hint out of date.
    if (state.hint && state.hint.moves !== moves) clearHint();
    rememberRun();
  }

  // ---------- Hints ----------
  function setHintText(text) {
    $('hint').textContent = text;
    $('hint').classList.add('active');
  }

  function clearHint() {
    state.hint = null;
    delete canvas.dataset.hintTurn;
    delete canvas.dataset.hintLine;
    delete canvas.dataset.hintTo;
    $('hint').textContent = state.levelHint;
    $('hint').classList.remove('active');
  }

  /** Works out the best next move from where the lines are now, and flashes that line. */
  function showHint() {
    if (!state || state.finished || drag || state.thinking) return;
    if (state.lines.every((l) => l.rest < 0)) return;
    // The hint already showing (nothing has moved since): flash it again, free.
    const shown = state.hint;
    if (shown && shown.moves === state.history.length && (shown.id >= 0 || shown.turn !== undefined)) {
      shown.start = performance.now();
      sfx('hint');
      return;
    }
    // Out of hints: watch an ad, visit the shop, or (on some difficulties) skip.
    const W = window.ArrowWallet;
    if (W && W.hintsLeft() <= 0) {
      if (window.ArrowShop) window.ArrowShop.outOfHints({ onSkip: skipAllowed() ? skipLevel : undefined });
      return;
    }
    // Big boards can take a moment: say so, and let the message show first.
    state.thinking = true;
    setHintText('Working out the best move…');
    const asked = state;
    setTimeout(() => {
      asked.thinking = false;
      if (state !== asked || state.finished || drag) return;
      computeHint();
      const h = state.hint;
      if (h && (h.id >= 0 || h.turn !== undefined)) {
        sfx('hint');
        // A hint is only paid for when it actually shows a move.
        if (W) W.useHint();
        updateHintBadge();
      }
    }, 30);
  }

  /** The number of hints left, on the Hint button. */
  function updateHintBadge() {
    const el = document.getElementById('hintCount');
    if (!el || !window.ArrowWallet) return;
    const left = window.ArrowWallet.hintsLeft();
    el.textContent = left > 0 ? String(left) : '+';
    el.classList.toggle('empty', left <= 0);
    $('hintBtn').setAttribute('aria-label', left > 0 ? `Hint (${left} left)` : 'Hint (none left: get more)');
  }
  if (window.ArrowWallet) window.ArrowWallet.onChange(updateHintBadge);

  /** Skipping a level (for watching an ad) is allowed on some difficulties. */
  function skipAllowed() {
    const skip = window.ArrowConfig && window.ArrowConfig.get('skip');
    return !!(state && skip && skip.enabled && (skip.tiers || []).includes(state.tier));
  }

  /** Skips the current level: it counts as finished, and the next one opens. */
  function skipLevel() {
    if (!state) return;
    const { group, index } = state;
    if (!isCompleted(group, index)) {
      progress.completed.push(`${tier}-${group}-${index}`);
      saveProgress();
    }
    forgetRun(state.tier, group, index);
    state.finished = true;
    // A skipped level counts towards today's daily bonus too.
    const daily = window.ArrowDaily ? window.ArrowDaily.levelFinished() : null;
    if (window.ArrowShop) window.ArrowShop.toast(daily && daily.day ? `Level skipped. Day ${daily.day} streak: +${daily.reward + daily.bonus} pearls!` : 'Level skipped');
    if (index + 1 < groupsNow()[group].levels.length) startLevel(group, index + 1);
    else goToMenu();
  }

  /**
   * Between levels: a full-screen ad if one is due, then (once, after a few
   * levels) the starter bundle offer, then on to wherever the player chose.
   */
  async function afterLevel(next) {
    hideDialog();
    const W = window.ArrowWallet;
    if (state && state.adDue && window.ArrowAds) {
      state.adDue = false;
      await window.ArrowAds.showInterstitial();
      if (W) W.adShown();
    }
    if (W && W.starterDue() && window.ArrowShop) await window.ArrowShop.offerStarter();
    next();
  }

  /**
   * A line that can slide out right now, if taking it off can't hurt (no
   * gates, or it isn't on a plate or inside a gate). Every line has to leave
   * once, so this is always a correct next move, and needs no search.
   */
  function freeLineNow() {
    const offsets = restOffsets();
    const n = state.n;
    const special = new Set([...state.gates, ...state.plates].map(([x, y]) => y * n + x));
    for (const l of state.lines) {
      if (l.rest < 0 || l.mode !== 'idle' || partnerOf(l)) continue;
      let onSpecial = false;
      for (let j = 0; j < l.len && special.size; j++) {
        const [x, y] = l.track[l.rest + j];
        if (x >= 0 && y >= 0 && x < n && y < n && special.has(y * n + x)) { onSpecial = true; break; }
      }
      if (!onSpecial && reach(n, state.lines, offsets, l.id).exit) return l;
    }
    return null;
  }

  /**
   * Turning-reflector levels with no free line: look for a reflector that,
   * turned 1-3 taps, frees a line, and check with a small search that the
   * level can still be finished from there. Much faster than a full search
   * on big boards. Returns { k, taps } or null.
   */
  function turnThatFrees(level) {
    // With twins a freed line may still be held by its twin: leave it to the search.
    if (state.twins && state.twins.length) return null;
    // Not with gates: the quick search takes lines off freely, which can
    // close a gate.
    if (!state.rotatable || state.gates.length) return null;
    return findTurnWay(state.n, level.lines, { mirrors: state.mirrors, start: restOffsets() });
  }

  /**
   * If the level has a saved solution and the board is exactly where that
   * solution would have it after some number of moves, the next move of the
   * solution. Otherwise null.
   */
  function knownNextStep(level) {
    const text = (groupsNow()[state.group].solutions || [])[state.index];
    if (!text) return null;
    const path = ArrowRules.pathFromText(text);
    const n = state.n;
    let ms = (level.mirrors || []).map((m) => m.slice());
    const offsets = level.lines.map(() => 0);
    const now = restOffsets();
    const same = () => offsets.every((o, i) => o === now[i]) && ms.every((m, i) => m[2] === state.mirrors[i][2] && m[3] === state.mirrors[i][3]);
    for (let i = 0; i < path.length; i++) {
      if (same()) return path[i];
      const step = path[i];
      if (step.turn !== undefined) ms = turnMirror(ms, step.turn);
      else applyStep(offsets, step);
    }
    return null;
  }

  /** Plays one saved-solution step on `offsets` (a twin's step moves its twin too). */
  function applyStep(offsets, step) {
    const t = state.twinOf ? ArrowRules.activeTwin(state.twinOf, offsets, step.line) : -1;
    if (t < 0) { offsets[step.line] = step.to; return; }
    const line = state.lines[step.line];
    const delta = step.to === -1 ? line.exitAt - offsets[step.line] : step.to - offsets[step.line];
    ArrowRules.moveTwins(state.lines, offsets, step.line, t, delta);
  }

  /**
   * How many undos would put the board back on the level's saved solution,
   * or -1 if none do (or there is no saved solution).
   */
  function undosToKnownRoute(level) {
    const text = (groupsNow()[state.group].solutions || [])[state.index];
    if (!text) return -1;
    // Positions along the saved solution, as text keys.
    const path = ArrowRules.pathFromText(text);
    let ms = (level.mirrors || []).map((m) => m.slice());
    const offsets = level.lines.map(() => 0);
    const keyOf = (o, m) => o.join(',') + '|' + m.map((x) => x[2] + '' + x[3]).join('');
    const onRoute = new Set([keyOf(offsets, ms)]);
    for (const step of path) {
      if (step.turn !== undefined) ms = turnMirror(ms, step.turn);
      else applyStep(offsets, step);
      onRoute.add(keyOf(offsets, ms));
    }
    // Walk back through the player's moves.
    const o = restOffsets();
    let m = state.mirrors.map((x) => x.slice());
    for (let k = 0; k <= state.history.length; k++) {
      if (onRoute.has(keyOf(o, m))) return k;
      const h = state.history[state.history.length - 1 - k];
      if (!h) break;
      if (h.turn !== undefined) m = h.mirrors.map((x) => x.slice());
      else { o[h.id] = h.from; if (h.twin) o[h.twin.id] = h.twin.from; }
    }
    return -1;
  }

  function computeHint() {
    const level = levelAt(state.group, state.index);
    // Levels with a saved solution: if the board is on it, its next step is
    // the hint (instant, and following hints stays on the route).
    const known = knownNextStep(level);
    const free = known ? null : freeLineNow();
    const turn = free || known ? null : turnThatFrees(level);
    if (turn) {
      const moves = state.history.length;
      state.hint = { id: -1, turn: turn.k, start: performance.now(), moves };
      canvas.dataset.hintTurn = String(turn.k);
      const { cell, margin } = layout(boardSize());
      const [mx, my] = state.mirrors[turn.k];
      focusHint(margin + (mx + 0.5) * cell, margin + (my + 0.5) * cell);
      setHintText(`Tap the flashing reflector to turn it${turn.taps > 1 ? ` (${turn.taps} taps)` : ''}.`);
      return;
    }
    if (free) {
      const moves = state.history.length;
      state.hint = { id: free.id, to: -1, start: performance.now(), moves };
      canvas.dataset.hintLine = String(free.id);
      canvas.dataset.hintTo = '-1';
      const { cell, margin } = layout(boardSize());
      const [hx, hy] = free.track[free.rest + free.len - 1];
      focusHint(margin + (hx + 0.5) * cell, margin + (hy + 0.5) * cell);
      setHintText('Slide the flashing eel all the way out.');
      return;
    }
    const opts = {
      mirrors: state.mirrors, rotatable: state.rotatable, gates: state.gates, plates: state.plates,
      twins: state.twins, start: restOffsets(), maxStates: 150000,
    };
    // Big twin boards with no see-through parts: single eels only need to
    // leave, so the quicker search is enough.
    if (state.twins.length && state.n > 12 && !state.lines.some((l) => l.solid.includes(false))) opts.slides = false;
    // Otherwise search. Big boards and turning reflectors get a smaller budget
    // so a hint never keeps a player waiting; turning boards then try a
    // search of turns and lines leaving only.
    let result = known ? { solvable: true, path: [known], par: 0 } : null;
    let proven = false; // true once a full search has finished
    if (!result) {
      const big = state.n > 12;
      result = solve(state.n, level.lines, big ? { ...opts, maxStates: 15000 } : opts);
      proven = !result.gaveUp;
      if (!result.solvable && result.gaveUp && state.rotatable) {
        const quick = solve(state.n, level.lines, { ...opts, slides: false, maxStates: 15000 });
        if (quick.solvable) result = quick;
      }
    }
    state.hintsUsed++;
    const moves = state.history.length;
    if (!result.solvable) {
      state.hint = { id: -1, to: 0, start: performance.now(), moves };
      // Only say there's no way out when a full search has proven it. If
      // undoing gets back onto the saved solution, say how far.
      const back = undosToKnownRoute(level);
      setHintText(back > 0
        ? `Undo ${back} ${back === 1 ? 'move' : 'moves'} to get back on track.`
        : proven
          ? 'There’s no way out from here. Undo some moves or restart.'
          : 'This is too tangled to work out from here. Try Undo or Restart.');
      return;
    }
    const move = result.path[0];
    if (move.turn !== undefined) {
      state.hint = { id: -1, turn: move.turn, start: performance.now(), moves };
      canvas.dataset.hintTurn = String(move.turn);
      {
        const { cell, margin } = layout(boardSize());
        const [mx, my] = state.mirrors[move.turn];
        focusHint(margin + (mx + 0.5) * cell, margin + (my + 0.5) * cell);
      }
      setHintText(`Tap the flashing reflector to turn it.${result.par > 1 ? ` You can finish in ${result.par} moves.` : ''}`);
      return;
    }
    const line = state.lines[move.line];
    let text;
    if (move.to === -1) {
      text = 'Slide the flashing eel all the way out.';
    } else {
      const d = move.to - line.rest;
      const k = Math.abs(d);
      text = `Slide the flashing eel ${d > 0 ? 'forward' : 'back'} ${k} ${k === 1 ? 'square' : 'squares'}, until its head reaches the ring.`;
    }
    text += result.par > 1 ? ` You can finish in ${result.par} moves.` : '';
    state.hint = { id: move.line, to: move.to, start: performance.now(), moves };
    {
      const { cell, margin } = layout(boardSize());
      const [hx, hy] = line.track[line.rest + line.len - 1];
      focusHint(margin + (hx + 0.5) * cell, margin + (hy + 0.5) * cell);
    }
    canvas.dataset.hintLine = String(move.line);
    canvas.dataset.hintTo = String(move.to);
    setHintText(text);
  }

  // ---------- Input ----------
  /** Pointer position in board coordinates (undoing any zoom and pan). */
  function boardPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const { cell, margin } = layout(rect.width);
    return {
      px: (evt.clientX - rect.left - view.x) / view.scale,
      py: (evt.clientY - rect.top - view.y) / view.scale,
      cell,
      margin,
    };
  }

  // ---------- Zoom (pinch, two-finger pan, buttons, wheel) ----------
  // view: how the board is drawn, in CSS pixels: scale, then shift by x, y.
  const view = { scale: 1, x: 0, y: 0 };
  const pointers = new Map(); // pointerId -> { x, y } for every finger down
  let pinch = null; // { dist, midX, midY, scale, x, y } while two fingers are down
  // One finger pressed on an empty square while zoomed in moves the view
  // (pressing on an eel always moves the eel instead).
  let pan = null; // { id, x, y, viewX, viewY } while panning

  const boardSize = () => canvas.width / (window.devicePixelRatio || 1);
  // Zoom in until about six squares fill the board (at least 2x).
  const maxZoom = () => Math.max(2, state ? state.n / 6 : 2);

  function clampView() {
    const size = boardSize();
    view.scale = Math.min(maxZoom(), Math.max(1, view.scale));
    const min = size - size * view.scale;
    view.x = Math.min(0, Math.max(min, view.x));
    view.y = Math.min(0, Math.max(min, view.y));
    $('zoomFit').disabled = view.scale <= 1.001;
    $('zoomIn').disabled = view.scale >= maxZoom() - 0.001;
    $('zoomOut').disabled = view.scale <= 1.001;
  }

  /** Zoom to `scale`, keeping the board point under (sx, sy) where it is on screen. */
  function zoomAt(sx, sy, scale) {
    const bx = (sx - view.x) / view.scale;
    const by = (sy - view.y) / view.scale;
    view.scale = Math.min(maxZoom(), Math.max(1, scale));
    view.x = sx - bx * view.scale;
    view.y = sy - by * view.scale;
    clampView();
  }

  function resetView() {
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    clampView();
  }

  /** When zoomed in, move the view so board point (bx, by) is on screen. */
  function showPoint(bx, by) {
    if (view.scale <= 1.001) return;
    const size = boardSize();
    const sx = bx * view.scale + view.x;
    const sy = by * view.scale + view.y;
    const edge = size * 0.15;
    if (sx > edge && sx < size - edge && sy > edge && sy < size - edge) return;
    view.x = size / 2 - bx * view.scale;
    view.y = size / 2 - by * view.scale;
    clampView();
  }

  /** For a hint: on boards too small to see on screen, zoom in on board point (bx, by)
   *  so the flashing eel or reflector is easy to spot (Fit zooms back out); otherwise
   *  just make sure it's on screen. */
  function focusHint(bx, by) {
    const { cell } = layout(boardSize());
    const want = 26; // pixels per square: big enough to see what's flashing
    if (cell * view.scale < want) {
      view.scale = Math.min(maxZoom(), want / cell);
      const size = boardSize();
      view.x = size / 2 - bx * view.scale;
      view.y = size / 2 - by * view.scale;
      clampView();
    } else showPoint(bx, by);
  }

  function canvasPoint(p) {
    const rect = canvas.getBoundingClientRect();
    return [p.x - rect.left, p.y - rect.top];
  }

  function startPinch() {
    const [a, b] = [...pointers.values()];
    const [ax, ay] = canvasPoint(a);
    const [bx, by] = canvasPoint(b);
    pinch = { dist: Math.max(1, Math.hypot(ax - bx, ay - by)), midX: (ax + bx) / 2, midY: (ay + by) / 2, scale: view.scale, x: view.x, y: view.y };
  }

  function movePinch() {
    const [a, b] = [...pointers.values()];
    const [ax, ay] = canvasPoint(a);
    const [bx, by] = canvasPoint(b);
    const dist = Math.max(1, Math.hypot(ax - bx, ay - by));
    const midX = (ax + bx) / 2;
    const midY = (ay + by) / 2;
    // The board point that was under the fingers' midpoint stays under it.
    const px = (pinch.midX - pinch.x) / pinch.scale;
    const py = (pinch.midY - pinch.y) / pinch.scale;
    view.scale = Math.min(maxZoom(), Math.max(1, pinch.scale * (dist / pinch.dist)));
    view.x = midX - px * view.scale;
    view.y = midY - py * view.scale;
    clampView();
  }

  /** A second finger landed mid-drag: put the line back where it was. */
  function cancelDrag() {
    if (!drag) return;
    drag.line.mode = 'settle';
    drag = null;
  }

  /** The line under a cell, preferring a solid part over a see-through one. */
  function lineAt(x, y) {
    let fallback = null;
    for (const l of state.lines) {
      if (l.mode !== 'idle') continue;
      for (let j = 0; j < l.len; j++) {
        const [cx, cy] = l.track[l.rest + j];
        if (cx === x && cy === y) {
          if (l.solid[j]) return l;
          fallback = fallback || l;
        }
      }
    }
    return fallback;
  }

  // ---------- Turning reflectors ----------
  const ANGLE = [0, 1, 3, 2]; // quarter turns from the up-left shape, per shape index
  const shapeIndex = (a, b) => [[0, 3], [0, 1], [2, 3], [2, 1]].findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));

  /** Rebuild every line's path after a reflector turns (where lines are now doesn't change). */
  function rebuildLines() {
    const level = levelAt(state.group, state.index);
    const map = mirrorMap(state.n, state.mirrors);
    state.lines.forEach((l, id) => {
      const geo = buildLine(state.n, level.lines[id], map);
      Object.assign(l, geo);
      delete l.gateInfo;
    });
  }

  function animateTurn(k, from, to) {
    state.mirrorAnim[k] = { from, to, start: performance.now() };
  }

  function turnAt(k) {
    const m = state.mirrors[k];
    const busy = state.lines.some((l) => l.mode !== 'idle' && l.mode !== 'gone');
    if (busy || !canTurn(state.n, state.lines, restOffsets(), m)) {
      // A line is on it, or has gone through it: it can't turn.
      state.mirrorFlash[k] = 1;
      if (navigator.vibrate) navigator.vibrate(30);
      sfx('noTurn');
      return;
    }
    const before = state.mirrors;
    state.mirrors = turnMirror(state.mirrors, k);
    const a = ANGLE[shapeIndex(m[2], m[3])];
    animateTurn(k, a, a + 1);
    rebuildLines();
    state.history.push({ turn: k, mirrors: before });
    updateHud();
    sfx('turn');
  }

  /** Startles the sea creature (sea-life.js) behind a screen point, if there is one. */
  function scareCreature(x, y) {
    if (window.ArrowSeaLife) window.ArrowSeaLife.scareAt(x, y);
  }

  function onPointerDown(evt) {
    if (!state) return;
    pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    // Track every finger until it lifts, even if it lands on an empty square.
    try { canvas.setPointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
    if (pointers.size >= 2) {
      // Two fingers: pinch to zoom and pan, never move a line.
      evt.preventDefault();
      canvas.setPointerCapture(evt.pointerId);
      cancelDrag();
      pan = null;
      startPinch();
      return;
    }
    if (state.finished || drag || pinch) return;
    const { px, py, cell, margin } = boardPoint(evt);
    const x = Math.floor((px - margin) / cell);
    const y = Math.floor((py - margin) / cell);
    const line = lineAt(x, y);
    if (!line) {
      const k = state.rotatable ? state.mirrors.findIndex(([mx, my]) => mx === x && my === y) : -1;
      if (k >= 0) {
        evt.preventDefault();
        turnAt(k);
      } else if (view.scale > 1.001) {
        // An empty square while zoomed in: drag to look around the board (a
        // quick tap that doesn't move startles a sea creature behind it).
        evt.preventDefault();
        pan = { id: evt.pointerId, x: evt.clientX, y: evt.clientY, viewX: view.x, viewY: view.y, time: performance.now(), moved: 0 };
        canvas.classList.add('panning');
      } else {
        // Nothing on the board here: a sea creature behind it may take fright.
        scareCreature(evt.clientX, evt.clientY);
      }
      return;
    }
    evt.preventDefault();
    canvas.setPointerCapture(evt.pointerId);
    const offsets = restOffsets();
    let r = reach(state.n, state.lines, offsets, line.id);
    let back = reachBack(state.n, state.lines, offsets, line.id);
    // A twin: both eels slide together, as far as both can go.
    const twin = partnerOf(line);
    if (twin) {
      const t = twinReach(state.n, state.lines, offsets, line.id, twin.id);
      r = { max: line.rest + t.fwd, exit: t.out[0], blocker: t.blocker, gate: t.gate, twinLeaves: t.out[1] };
      back = { min: line.rest - t.back, blocker: t.backBlocker, gate: t.backGate };
      twin.mode = 'drag';
    }
    drag = {
      line, pointerId: evt.pointerId, startX: px, startY: py, lastX: px, lastY: py,
      cell, reach: r, back, time: performance.now(), moved: 0, wanted: line.rest,
      clientX: evt.clientX, clientY: evt.clientY,
      // Zoomed in on an eel that can't move either way: a tap still bumps it,
      // but moving the finger pans the board instead (boards are packed, so
      // there's often no empty square to pan from).
      stuck: view.scale > 1.001 && !r.exit && r.max <= line.rest && back.min >= line.rest,
      twin, twinFrom: twin ? twin.rest : 0,
    };
    line.mode = 'drag';
  }

  function onPointerMove(evt) {
    if (pointers.has(evt.pointerId)) pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    if (pinch && pointers.size >= 2) {
      movePinch();
      return;
    }
    if (pan && evt.pointerId === pan.id) {
      pan.moved = Math.max(pan.moved || 0, Math.hypot(evt.clientX - pan.x, evt.clientY - pan.y));
      view.x = pan.viewX + (evt.clientX - pan.x);
      view.y = pan.viewY + (evt.clientY - pan.y);
      clampView();
      return;
    }
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const { px, py } = boardPoint(evt);
    const { line, reach: r, back } = drag;
    drag.moved = Math.max(drag.moved, Math.hypot(px - drag.startX, py - drag.startY) / drag.cell);
    if (drag.stuck && drag.moved >= TAP_MAX_MOVE) {
      // A stuck eel: this becomes a pan, from where the finger first pressed.
      line.offset = line.rest;
      line.mode = 'idle';
      if (drag.twin) { drag.twin.offset = drag.twin.rest; drag.twin.mode = 'idle'; }
      pan = { id: drag.pointerId, x: drag.clientX, y: drag.clientY, viewX: view.x, viewY: view.y };
      drag = null;
      canvas.classList.add('panning');
      view.x = pan.viewX + (evt.clientX - pan.x);
      view.y = pan.viewY + (evt.clientY - pan.y);
      clampView();
      return;
    }
    if (!drag.sounded && drag.moved >= TAP_MAX_MOVE) { drag.sounded = true; sfx('pick'); }
    // Follow the path: project the finger's movement onto the way the head is
    // travelling right now, which changes when the line goes round a reflector.
    const mx = px - drag.lastX;
    const my = py - drag.lastY;
    drag.lastX = px;
    drag.lastY = py;
    const head = line.offset + line.len - 1;
    const fwd = Math.min(line.track.length - 2, Math.floor(head + 1e-6));
    const bwd = Math.max(1, Math.ceil(head - 1e-6));
    const step = (i) => [line.track[i + 1][0] - line.track[i][0], line.track[i + 1][1] - line.track[i][1]];
    const [fx, fy] = step(fwd);
    const [bx, by] = step(bwd - 1);
    const ahead = (mx * fx + my * fy) / drag.cell; // along the way forward
    const behind = (mx * bx + my * by) / drag.cell; // along the way it came
    const pushed = ahead > 0 ? ahead : behind < 0 ? behind : 0;
    const limit = r.exit ? line.exitAt : r.max;
    drag.wanted = Math.max(back.min - 1, Math.min(limit + 1, drag.wanted + pushed));
    const wanted = drag.wanted;
    line.offset = Math.max(back.min, Math.min(wanted, limit));
    // Its twin follows, square for square.
    if (drag.twin) drag.twin.offset = drag.twinFrom + (line.offset - line.rest);
    let blockerId = -1;
    let hit = false;
    if (!r.exit && wanted > r.max + BLOCK_PUSH) {
      blockerId = r.blocker;
      if (r.gate >= 0) hit = flashGate(r.gate);
    }
    if (wanted < back.min - BLOCK_PUSH) {
      if (back.blocker !== -1) blockerId = back.blocker;
      if (back.gate >= 0) hit = flashGate(back.gate) || hit;
    }
    const blocker = state.lines[blockerId];
    if (blocker && blocker.flash < 0.4) {
      blocker.flash = 1;
      if (navigator.vibrate) navigator.vibrate(30);
      hit = true;
    }
    if (hit) sfx('bump');
  }

  function onPointerUp(evt) {
    pointers.delete(evt.pointerId);
    if (pinch) {
      if (pinch.ended && pointers.size === 0) { pinch = null; return; }
      // The pinch ends when a finger lifts; the other finger does nothing
      // until it lifts too.
      if (pointers.size < 2) pinch = pointers.size ? { ended: true } : null;
      return;
    }
    if (pan && evt.pointerId === pan.id) {
      // A tap, not a drag: startle any sea creature behind that spot.
      if ((pan.moved || 0) < 8 && pan.time && performance.now() - pan.time < TAP_MAX_MS) scareCreature(evt.clientX, evt.clientY);
      pan = null;
      canvas.classList.remove('panning');
      return;
    }
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const { line, reach: r, back, twin, twinFrom } = drag;
    const now = performance.now();
    const isTap = drag.moved < TAP_MAX_MOVE && now - drag.time < TAP_MAX_MS;
    drag = null;
    const from = line.rest;

    if (isTap) {
      // A tap sends the line out (or bumps whatever is in its way); dragging
      // moves it exactly as far as you drag.
      line.offset = line.rest;
      if (twin) { twin.offset = twin.rest; twin.mode = 'idle'; }
      sendOut(line, r, twin);
      return;
    }

    // The head is past the edge and nothing stops it: let it slide out. A twin
    // only goes when dragged the pair's whole way, since how far it moves
    // decides where its twin ends up.
    const goes = twin ? line.offset >= r.max - 0.5 : line.offset >= line.ray.length + 0.5;
    if (r.exit && goes) {
      line.rest = -1;
      line.mode = 'exit';
      line.speed = EXIT_SPEED_START;
      const entry = { id: line.id, from };
      if (twin) entry.twin = moveTwinBy(twin, twinFrom, line.exitAt - from);
      state.history.push(entry);
      if (twin) twinCarriesOn(twin);
      sfx('exit');
    } else {
      const to = Math.min(Math.round(line.offset), r.max, line.exitAt - 1);
      line.rest = Math.max(back.min, to);
      line.mode = 'settle';
      const entry = { id: line.id, from };
      if (twin) {
        entry.twin = moveTwinBy(twin, twinFrom, line.rest - from);
        if (twin.rest === twinFrom) twin.mode = 'settle';
      }
      if (line.rest !== from) { state.history.push(entry); sfx(twin && twin.rest < 0 ? 'exit' : 'slide'); }
    }
    updateHud();
  }

  function flashGate(cell) {
    if ((state.gateFlash.get(cell) || 0) < 0.4) {
      state.gateFlash.set(cell, 1);
      if (navigator.vibrate) navigator.vibrate(30);
      return true;
    }
    return false;
  }

  /** Tap: slide all the way off if nothing is in the way, otherwise bump and spring back. */
  /**
   * A twin whose partner has just swum off is free again: if its own way out
   * is clear it carries on out too, rather than stopping where the pair's
   * slide left it (perhaps half off the board). That's its own move, as when
   * done by hand. One that's still fully on the board and resting on a plate
   * or in a gate stays put, as it may be holding a gate open.
   */
  function twinCarriesOn(twin) {
    if (twin.rest < 0) return;
    const n = state.n;
    const hanging = twin.rest > twin.ray.length; // head past the edge
    if (!hanging && (state.gates.length || state.plates.length)) {
      const special = new Set([...state.gates, ...state.plates].map(([x, y]) => y * n + x));
      for (let j = 0; j < twin.len; j++) {
        const [x, y] = twin.track[twin.rest + j];
        if (x >= 0 && y >= 0 && x < n && y < n && special.has(y * n + x)) return;
      }
    }
    if (!reach(n, state.lines, restOffsets(), twin.id).exit) return;
    state.history.push({ id: twin.id, from: twin.rest });
    twin.rest = -1;
    twin.mode = 'exit';
    twin.speed = Math.max(twin.speed || 0, EXIT_SPEED_START);
  }

  function sendOut(line, r, twin) {
    if (r.exit) {
      const entry = { id: line.id, from: line.rest };
      // Its twin swims the same distance (and leaves too if that takes it off).
      if (twin) entry.twin = moveTwinBy(twin, twin.rest, line.exitAt - line.rest);
      state.history.push(entry);
      line.rest = -1;
      line.mode = 'exit';
      line.speed = EXIT_SPEED_START;
      if (twin) twinCarriesOn(twin);
      updateHud();
      sfx('exit');
    } else if (twin && r.twinLeaves) {
      // Its twin reaches the edge first and swims off. That frees this eel,
      // which carries on out alone if its way is clear (two moves, as when
      // done by hand: the pair's slide, then this eel leaving).
      const from = line.rest;
      const delta = r.max - from;
      state.history.push({ id: line.id, from, twin: moveTwinBy(twin, twin.rest, delta) });
      line.rest = from + delta;
      if (reach(state.n, state.lines, restOffsets(), line.id).exit) {
        state.history.push({ id: line.id, from: line.rest });
        line.rest = -1;
        line.mode = 'exit';
        line.speed = EXIT_SPEED_START;
      } else {
        line.mode = 'settle';
      }
      updateHud();
      sfx('exit');
    } else {
      line.mode = 'bump';
      line.bumpTarget = r.max + BUMP_OVERLAP;
      line.blocker = r.blocker;
      line.blockGate = r.gate;
      // A twin bumps along with it.
      line.bumpTwin = twin || null;
      if (twin) twin.mode = 'drag';
    }
  }

  /** Reset button: start the level again, after checking if you've made moves. */
  function askRestart() {
    if (!state || drag) return;
    const again = () => startLevel(state.group, state.index, { fresh: true });
    if (state.finished || state.history.length === 0) { again(); return; }
    const moves = state.history.length;
    showDialog('Start this level again?', `Your ${moves === 1 ? 'move' : `${moves} moves`} on this level will be cleared.`, [
      { label: 'Keep playing', primary: true, action: hideDialog },
      { label: 'Reset level', action: again },
    ]);
  }

  function undo() {
    if (!state || state.finished || drag) return;
    const last = state.history.pop();
    if (!last) return;
    sfx('undo');
    if (last.turn !== undefined) {
      const m = state.mirrors[last.turn];
      const a = ANGLE[shapeIndex(m[2], m[3])];
      state.mirrors = last.mirrors;
      animateTurn(last.turn, a, a - 1);
      rebuildLines();
      updateHud();
      return;
    }
    for (const step of [last, last.twin].filter(Boolean)) {
      const line = state.lines[step.id];
      if (line.mode === 'gone' || line.mode === 'exit') line.offset = Math.min(line.offset, line.exitAt);
      line.rest = step.from;
      line.mode = 'settle';
    }
    updateHud();
  }

  /** Plays a sound effect from audio.js (if sound is available and on). */
  function sfx(name) {
    if (window.ArrowAudio) window.ArrowAudio.play(name);
  }

  // ---------- Update loop ----------
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (state && screens.game.classList.contains('active')) {
      update(dt);
      draw();
    }
    requestAnimationFrame(frame);
  }

  function update(dt) {
    state.mirrorFlash = state.mirrorFlash.map((f) => Math.max(0, (f || 0) - dt * 2.2));
    for (const [c, f] of state.gateFlash) state.gateFlash.set(c, Math.max(0, f - dt * 2.2));
    let busy = !!drag;
    for (const l of state.lines) {
      if (l.flash > 0) l.flash = Math.max(0, l.flash - dt * 2.2);
      if (l.mode === 'settle') {
        busy = true;
        const diff = l.rest - l.offset;
        const step = SETTLE_SPEED * dt;
        if (Math.abs(diff) <= step) {
          l.offset = l.rest;
          l.mode = 'idle';
        } else {
          l.offset += Math.sign(diff) * step;
        }
      } else if (l.mode === 'bump') {
        busy = true;
        l.offset += BUMP_SPEED * dt;
        if (l.bumpTwin) l.bumpTwin.offset = l.bumpTwin.rest + Math.min(l.offset, l.bumpTarget) - l.rest;
        if (l.offset >= l.bumpTarget) {
          l.offset = l.bumpTarget;
          l.mode = 'settle'; // springs back to where it was; not counted as a move
          if (l.bumpTwin) { l.bumpTwin.mode = 'settle'; l.bumpTwin = null; }
          if (l.blockGate >= 0) flashGate(l.blockGate);
          const blocker = state.lines[l.blocker];
          if (blocker) blocker.flash = 1;
          if (navigator.vibrate) navigator.vibrate(30);
          sfx('bump');
        }
      } else if (l.mode === 'exit') {
        busy = true;
        l.speed += EXIT_ACCEL * dt;
        l.offset += l.speed * dt;
        if (l.offset >= l.exitAt + 1) l.mode = 'gone';
      }
    }

    if (!busy && !state.finished && state.lines.every((l) => l.mode === 'gone')) {
      state.finished = true;
      const next = state.group + 1;
      const nextTier = tier + 1;
      const wasOpen = next < groupsNow().length && isGroupUnlocked(next);
      const harderWasOpen = !!TIERS[nextTier] && groupOpen(nextTier, state.group);
      const firstClear = !isCompleted(state.group, state.index);
      if (firstClear) {
        progress.completed.push(`${tier}-${state.group}-${state.index}`);
        saveProgress();
      }
      // Finishing a group can open the next group, and the same group one difficulty up.
      state.unlockedGroup = next < groupsNow().length && !wasOpen && isGroupUnlocked(next) ? next : -1;
      state.unlockedHarder = !!TIERS[nextTier] && !harderWasOpen && groupOpen(nextTier, state.group);
      updateHud();
      // Count it (for ad timing and the starter offer); an ad may be due before the next level.
      state.adDue = window.ArrowWallet ? window.ArrowWallet.levelFinished() : false;
      awardPearls(firstClear);
      // Towards today's daily bonus (and the streak).
      state.daily = window.ArrowDaily ? window.ArrowDaily.levelFinished() : null;
      burstBubbles();
      sfx('win');
      setTimeout(showWinDialog, 650);
    }
  }

  // ---------- Drawing ----------
  function layout(size) {
    // A border of 0.3 squares, but never under 8px, so the board's rounded
    // corners never cut into the corner squares of the biggest boards.
    const margin = Math.max((size / (state.n + 0.6)) * 0.3, 8);
    return { cell: (size - 2 * margin) / state.n, margin };
  }

  function resizeCanvas() {
    if (!state) return;
    const size = boardWrap.clientWidth;
    // Keep the same part of the board in view when the board changes size.
    const old = boardSize();
    if (old > 0 && size > 0) {
      view.x *= size / old;
      view.y *= size / old;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clampView();
    draw();
  }

  function mix(hexA, hexB, t) {
    const pa = parseInt(hexA.slice(1), 16);
    const pb = parseInt(hexB.slice(1), 16);
    const ch = (p, s) => (p >> s) & 255;
    const c = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  }

  /** Contiguous runs [from, to] of segments that are solid (or see-through). */
  function runs(line, solid) {
    const out = [];
    let start = -1;
    for (let j = 0; j <= line.len; j++) {
      const match = j < line.len && line.solid[j] === solid;
      if (match && start < 0) start = j;
      if (!match && start >= 0) { out.push([start, j - 1]); start = -1; }
    }
    return out;
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.width / dpr;
    const { cell, margin } = layout(size);
    const center = (v) => margin + (v + 0.5) * cell;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    // Zoom and pan: everything below is drawn in board coordinates.
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);

    // Grid points: tiny glints of plankton in the water.
    ctx.fillStyle = colors.dot;
    for (let y = 0; y < state.n; y++) {
      for (let x = 0; x < state.n; x++) {
        ctx.beginPath();
        ctx.arc(center(x), center(y), cell * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Plates and gates sit under the lines. A gate is open while a plate of
    // its colour is covered or a line is inside it.
    if (state.gates.length) {
      const any = anyMap(state.n, state.lines, restOffsets());
      const covered = new Set(state.plates.filter(([x, y]) => any[y * state.n + x] > 0).map(([, , c]) => c));
      const box = (x, y, inset) => [margin + x * cell + cell * inset, margin + y * cell + cell * inset, cell * (1 - 2 * inset)];
      const roundRect = (x, y, w, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + w, r);
        ctx.arcTo(x + w, y + w, x, y + w, r);
        ctx.arcTo(x, y + w, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      // Plates: anemones, glowing brighter while something sits on them.
      for (const [px, py, c] of state.plates) {
        const on = covered.has(c);
        const cx = center(px);
        const cy = center(py);
        ctx.fillStyle = colors.gates[c];
        ctx.globalAlpha = on ? 0.45 : 0.18;
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = on ? 1 : 0.75;
        ctx.strokeStyle = colors.gates[c];
        ctx.lineCap = 'round';
        ctx.lineWidth = cell * 0.055;
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + (on ? 0.15 : 0);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * cell * 0.3, cy + Math.sin(a) * cell * 0.3);
          ctx.lineTo(cx + Math.cos(a) * cell * 0.45, cy + Math.sin(a) * cell * 0.45);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Which gates are open, to chime when one opens or closes.
      let openNow = '';
      for (const [gx, gy, c] of state.gates) {
        const cellIndex = gy * state.n + gx;
        const open = covered.has(c) || any[cellIndex] > 0;
        openNow += open ? '1' : '0';
        const flash = state.gateFlash.get(cellIndex) || 0;
        const color = flash > 0 ? mix(colors.gates[c], colors.danger, Math.min(1, flash * 1.3)) : colors.gates[c];
        const [bx, by, w] = box(gx, gy, 0.06);
        if (open) {
          // Open: a dashed outline with faint bars, so lines can be seen passing through.
          ctx.strokeStyle = color;
          ctx.lineWidth = cell * 0.06;
          ctx.setLineDash([cell * 0.12, cell * 0.08]);
          roundRect(bx, by, w, w * 0.15);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = cell * 0.05;
          ctx.lineCap = 'round';
          for (const f of [0.3, 0.5, 0.7]) {
            ctx.beginPath();
            ctx.moveTo(bx + w * f, by + w * 0.2);
            ctx.lineTo(bx + w * f, by + w * 0.8);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else {
          // Shut: a solid block with bars.
          ctx.fillStyle = color;
          roundRect(bx, by, w, w * 0.15);
          ctx.fill();
          ctx.strokeStyle = colors.surface;
          ctx.lineWidth = cell * 0.07;
          ctx.lineCap = 'round';
          for (const f of [0.3, 0.5, 0.7]) {
            ctx.beginPath();
            ctx.moveTo(bx + w * f, by + w * 0.2);
            ctx.lineTo(bx + w * f, by + w * 0.8);
            ctx.stroke();
          }
        }
      }
      if (state.gatesOpen !== undefined && openNow !== state.gatesOpen) {
        let opened = 0;
        let closed = 0;
        for (let i = 0; i < openNow.length; i++) {
          if (openNow[i] === '1' && state.gatesOpen[i] === '0') opened++;
          if (openNow[i] === '0' && state.gatesOpen[i] === '1') closed++;
        }
        if (opened) sfx('gateOpen');
        else if (closed) sfx('gateClose');
      }
      state.gatesOpen = openNow;
    }

    // Reflectors: reef rock filling half the cell, with its pearly slanted side
    // facing the two open sides. Drawn from the up-left shape, turned by a
    // number of quarter turns (animated while a reflector is turning).
    const half = cell * 0.4;
    const now = performance.now();
    state.mirrors.forEach(([mx, my, a, b], k) => {
      let quarter = ANGLE[shapeIndex(a, b)];
      const anim = state.mirrorAnim[k];
      if (anim) {
        const t = Math.min(1, (now - anim.start) / 160);
        if (t >= 1) state.mirrorAnim[k] = null;
        else quarter = anim.from + (anim.to - anim.from) * (1 - (1 - t) * (1 - t));
      }
      const flash = state.mirrorFlash[k] || 0;
      const hinted = state.hint && state.hint.turn === k;
      ctx.save();
      ctx.translate(center(mx), center(my));
      if (hinted) {
        // Pulse behind a reflector the hint says to turn.
        const pulse = 0.5 + 0.5 * Math.sin((now - state.hint.start) / 1000 * 7);
        ctx.fillStyle = colors.turnable;
        ctx.globalAlpha = 0.15 + 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, cell * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.rotate((quarter * Math.PI) / 2);
      // Up-left shape: corner at bottom-right, slanted side from top-right to
      // bottom-left. A piece of reef rock with a mother-of-pearl face (art.js).
      window.ArrowArt.reflector(ctx, half, cell, { flash, danger: colors.danger, turns: state.rotatable, turnColor: colors.turnable });
      ctx.restore();
    });

    const visible = state.lines.filter((l) => l.mode !== 'gone');
    // Moving lines are drawn on top.
    visible.sort((a, b) => (a.mode === 'idle' ? 0 : 1) - (b.mode === 'idle' ? 0 : 1));

    const width = cell * (state.picture ? 0.66 : 0.26);

    const pathOf = (l, a, b) => {
      const at = (p) => {
        const i = Math.max(0, Math.min(l.track.length - 2, Math.floor(p)));
        const f = p - i;
        const [x0, y0] = l.track[i];
        const [x1, y1] = l.track[i + 1];
        return [center(x0 + (x1 - x0) * f), center(y0 + (y1 - y0) * f)];
      };
      const pts = [at(a)];
      for (let i = Math.floor(a) + 1; i < b; i++) pts.push(at(i));
      pts.push(at(b));
      return pts;
    };

    const stroke = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };

    const colorOf = (l) => {
      const base = l.ownColor || colors.lines[l.colorIndex];
      return l.flash > 0 ? mix(base, colors.danger, Math.min(1, l.flash * 1.3)) : base;
    };

    // Piece of the line covering segments from..to, clipped to the line's ends.
    const piece = (l, from, to) => {
      const a = Math.max(l.offset, l.offset + from - 0.5);
      const b = Math.min(l.offset + l.len - 1, l.offset + to + 0.5);
      return b > a ? pathOf(l, a, b) : null;
    };

    ctx.lineJoin = 'round';

    // The hinted line pulses, with a dotted outline where it should stop.
    if (state.hint && state.hint.id >= 0) {
      const l = state.lines[state.hint.id];
      if (l && l.mode !== 'gone' && l.mode !== 'exit') {
        const t = (performance.now() - state.hint.start) / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorOf(l);
        ctx.globalAlpha = 0.2 + 0.35 * pulse;
        ctx.lineWidth = width * 2.6;
        stroke(pathOf(l, l.offset, l.offset + l.len - 1));
        const to = state.hint.to;
        if (to >= 0 && l.mode === 'idle') {
          // Round dots along where the line will be, and a ring where its head stops.
          const target = pathOf(l, to, to + l.len - 1);
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = width * 0.4;
          ctx.setLineDash([0.001, cell * 0.22]);
          stroke(target);
          ctx.setLineDash([]);
          const [tx, ty] = target[target.length - 1];
          ctx.lineWidth = width * 0.3;
          ctx.beginPath();
          ctx.arc(tx, ty, cell * 0.34, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Layer 1: see-through parts (faint with a dashed centre), under everything solid.
    for (const l of visible) {
      const color = colorOf(l);
      for (const [from, to] of runs(l, false)) {
        const pts = piece(l, from, to);
        if (!pts) continue;
        // Translucent like a jellyfish: a faint glow with a string of lights.
        ctx.setLineDash([]);
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = width * 2;
        stroke(pts);
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = width;
        stroke(pts);
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = width * 0.38;
        ctx.setLineDash([0.001, cell * 0.2]);
        stroke(pts);
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Bigger heads when the squares are small on screen (up to 1.45x, under 20px a square).
    const onScreen = cell * view.scale;
    const headScale = onScreen >= 20 ? 1 : Math.min(1.45, 1 + (20 - onScreen) / 20);
    // Layer 2: solid parts and heads, drawn as glowing eels: a soft glow,
    // the body, then a pale sheen along the top.
    for (const l of visible) {
      const color = colorOf(l);
      const bodyWidth = l.mode === 'drag' ? width * 1.15 : width;
      const solidRuns = runs(l, true).map(([from, to]) => [from, piece(l, from, to)]).filter(([, pts]) => pts);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = 'round';
      ctx.globalAlpha = l.mode === 'drag' ? 0.3 : 0.16;
      ctx.lineWidth = bodyWidth * (state.picture ? 1.25 : 2.4);
      for (const [, pts] of solidRuns) stroke(pts);
      ctx.globalAlpha = 1;
      ctx.lineWidth = bodyWidth;
      ctx.lineCap = 'butt';
      for (const [from, pts] of solidRuns) {
        stroke(pts);
        if (from === 0) {
          // Rounded tail end.
          ctx.beginPath();
          ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (partnerOf(l)) {
        // Twins are banded, like sea snakes: dark rings along the body.
        ctx.strokeStyle = mix(colors.lines[l.colorIndex], '#021022', 0.62);
        ctx.lineWidth = bodyWidth * 1.02;
        ctx.setLineDash([cell * 0.13, cell * 0.3]);
        for (const [, pts] of solidRuns) stroke(pts);
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = bodyWidth * 0.26;
      ctx.lineCap = 'round';
      for (const [, pts] of solidRuns) stroke(pts);
      ctx.strokeStyle = color;

      const [hx, hy] = pathOf(l, l.offset + l.len - 1, l.offset + l.len - 1)[0];
      // The head points the way it is travelling, which changes at reflectors.
      const hp = Math.max(1, Math.min(l.track.length - 1, Math.ceil(l.offset + l.len - 1 - 1e-6)));
      const dx = l.track[hp][0] - l.track[hp - 1][0];
      const dy = l.track[hp][1] - l.track[hp - 1][1];
      // Eel head: a rounded arrowhead (it still shows which way the line
      // goes) with a glow and an eye.
      // On boards with small squares on screen (Insane, the biggest Hard ones),
      // heads are drawn bigger so they're easy to pick out.
      const tip = cell * 0.42 * headScale;
      const back = cell * 0.04 * headScale;
      const wing = cell * 0.27 * headScale;
      const head = () => {
        ctx.beginPath();
        ctx.moveTo(hx + dx * tip, hy + dy * tip);
        ctx.lineTo(hx - dx * back - dy * wing, hy - dy * back + dx * wing);
        ctx.quadraticCurveTo(hx - dx * cell * 0.16, hy - dy * cell * 0.16, hx - dx * back + dy * wing, hy - dy * back - dx * wing);
        ctx.closePath();
      };
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = cell * 0.18;
      ctx.lineJoin = 'round';
      head();
      ctx.stroke();
      ctx.globalAlpha = 1;
      head();
      ctx.fill();
      // The eye sits on the upper side of the head (so no eel swims upside
      // down), and on the right-hand side of the screen for vertical heads.
      let px = -dy, py = dx;
      if (py > 0 || (py === 0 && px < 0)) { px = -px; py = -py; }
      const ex = hx + dx * cell * 0.08 * headScale + px * cell * 0.09 * headScale;
      const ey = hy + dy * cell * 0.08 * headScale + py * cell * 0.09 * headScale;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, cell * 0.065 * headScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#021022';
      ctx.beginPath();
      ctx.arc(ex + dx * cell * 0.02, ey + dy * cell * 0.02, cell * 0.032 * headScale, 0, Math.PI * 2);
      ctx.fill();

      // A swimming eel leaves a trail of bubbles.
      if (l.mode === 'exit' && motionOK && Math.random() < 0.6) {
        bubbles.push({ x: hx - dx * cell * 0.3, y: hy - dy * cell * 0.3, r: cell * (0.05 + Math.random() * 0.08), vx: (Math.random() - 0.5) * cell * 0.4, vy: -cell * (0.6 + Math.random() * 0.8), life: 1 });
      }
    }

    drawBubbles(cell);
  }

  // ---------- Bubbles ----------
  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let bubbles = [];
  let lastBubbleTime = performance.now();

  /**
   * Level cleared: a rush of bubbles wells up from below the bottom of the
   * screen and rises over everything (on its own layer above the dialogs).
   */
  const fx = $('bubbleLayer');
  const fxCtx = fx.getContext('2d');
  let fxBubbles = [];
  let fxRunning = false;
  let fxLast = 0;
  // One light-blue bubble, glow and shine included, drawn once and stamped at
  // every size (drawing glows live for a hundred bubbles is far too slow).
  const BUBBLE_PAD = 1.35; // the sprite's half-width, in bubble radii, with room for the glow
  const bubbleSprite = (() => {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2 / BUBBLE_PAD;
    const m = size / 2;
    const fill = g.createRadialGradient(m - r * 0.3, m - r * 0.3, r * 0.1, m, m, r);
    fill.addColorStop(0, 'rgba(190, 240, 255, 0.10)');
    fill.addColorStop(0.8, 'rgba(120, 215, 255, 0.10)');
    fill.addColorStop(1, 'rgba(150, 230, 255, 0.28)');
    g.fillStyle = fill;
    g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'rgba(140, 225, 255, 0.95)';
    g.shadowBlur = r * 0.35;
    g.strokeStyle = 'rgba(205, 245, 255, 0.95)';
    g.lineWidth = r * 0.11;
    g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.beginPath(); g.arc(m - r * 0.36, m - r * 0.38, r * 0.2, 0, Math.PI * 2); g.fill();
    return c;
  })();

  function burstBubbles() {
    if (!motionOK) return;
    // Two device pixels per screen pixel is plenty for soft bubbles.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = fx.clientWidth, h = fx.clientHeight;
    fx.width = Math.round(w * dpr);
    fx.height = Math.round(h * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.min(w, h * 0.6);
    const count = Math.round(100 * Math.max(0.7, Math.min(1.3, (w * h) / (400 * 860))));
    for (let k = 0; k < count; k++) {
      // Mostly small, a few big ones, coming in quick waves.
      const big = Math.random() < 0.12;
      const r = unit * (big ? 0.05 + Math.random() * 0.06 : 0.012 + Math.random() * 0.035);
      fxBubbles.push({
        x: Math.random() * w,
        y: h + r * BUBBLE_PAD + Math.random() * h * 0.12,
        r,
        delay: Math.random() * 0.5,
        speed: h * (0.85 + Math.random() * 0.6) * (big ? 0.85 : 1), // px per second
        wobble: r * (0.5 + Math.random() * 0.8) + 5,
        phase: Math.random() * Math.PI * 2,
        age: 0,
      });
    }
    if (!fxRunning) { fxRunning = true; fxLast = performance.now(); requestAnimationFrame(fxFrame); }
  }

  function fxFrame(now) {
    // Real elapsed time, so a slow frame doesn't slow the bubbles down.
    const dt = Math.min(0.1, (now - fxLast) / 1000);
    fxLast = now;
    const w = fx.clientWidth, h = fx.clientHeight;
    fxCtx.clearRect(0, 0, w, h);
    fxBubbles = fxBubbles.filter((b) => b.y > -b.r * BUBBLE_PAD);
    for (const b of fxBubbles) {
      b.age += dt;
      if (b.age < b.delay) continue;
      const t = b.age - b.delay;
      b.y -= b.speed * (0.8 + Math.min(0.5, t * 0.6)) * dt;
      const x = b.x + Math.sin(b.phase + t * 4) * b.wobble;
      const half = b.r * BUBBLE_PAD;
      fxCtx.drawImage(bubbleSprite, x - half, b.y - half, half * 2, half * 2);
    }
    if (fxBubbles.length) requestAnimationFrame(fxFrame);
    else { fxRunning = false; fxCtx.clearRect(0, 0, w, h); }
  }

  /** The trail of bubbles behind an eel swimming off the board. */
  function drawBubbles(cell) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastBubbleTime) / 1000);
    lastBubbleTime = now;
    if (!bubbles.length) return;
    bubbles = bubbles.filter((b) => (b.life -= dt * 0.7) > 0);
    for (const b of bubbles) {
      b.x += (b.vx + Math.sin((now / 300) + b.r * 50) * cell * 0.3) * dt;
      b.y += b.vy * dt;
      ctx.globalAlpha = Math.min(1, b.life) * 0.8;
      ctx.strokeStyle = 'rgba(200,245,255,0.9)';
      ctx.lineWidth = Math.max(1, b.r * 0.18);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ---------- Dialogs ----------
  function showDialog(title, text, buttons) {
    $('dialogReward').hidden = true;
    $('dialogTitle').textContent = title;
    $('dialogText').textContent = text;
    const box = $('dialogButtons');
    box.innerHTML = '';
    buttons.forEach(({ label, primary, action }) => {
      const b = document.createElement('button');
      b.className = `btn ${primary ? 'primary' : 'ghost'}`;
      b.textContent = label;
      b.addEventListener('click', action);
      box.appendChild(b);
    });
    overlay.hidden = false;
    box.querySelector('button').focus();
  }

  function hideDialog() { overlay.hidden = true; }

  // Adds "Double pearls (watch an ad)" after the main button, while it's on offer.
  function withDouble(buttons) {
    const on = window.ArrowConfig && window.ArrowConfig.get('pearls.doubleByAd') !== false;
    if (!on || !state.pearls || state.pearlsDoubled || !window.ArrowAds) return buttons;
    const out = buttons.slice();
    out.splice(1, 0, { label: `Double pearls (watch an ad)`, action: doublePearls });
    return out;
  }

  /** Pearls for the aquarium: per level by difficulty, plus first-clear and best-solve bonuses. */
  function awardPearls(firstClear) {
    const W = window.ArrowWallet;
    const C = window.ArrowConfig;
    state.pearls = 0;
    state.pearlsDoubled = false;
    if (!W || !C) return;
    const t = state.tier;
    const pick = (name) => Number((C.get(`pearls.${name}`) || [])[t]) || 0;
    const best = state.history.length <= levelAt(state.group, state.index).par;
    // The best-solve bonus is paid once per level; replays pay a smaller amount.
    const bestBonus = best && W.firstBestSolve(`${t}-${state.group}-${state.index}`) ? pick('bestSolve') : 0;
    state.pearlParts = [
      firstClear ? ['Level', pick('perLevel')] : ['Replay', pick('replay')],
      ['First clear', firstClear ? pick('firstClear') : 0],
      ['Best solve', bestBonus],
    ].filter(([, n]) => n > 0);
    state.pearls = state.pearlParts.reduce((a, [, n]) => a + n, 0);
    if (state.pearls > 0) W.addPearls(state.pearls);
  }

  /** Watch an ad on the win screen to double that level's pearls (stands in for the between-levels ad). */
  async function doublePearls() {
    hideDialog();
    const W = window.ArrowWallet;
    if (await window.ArrowAds.showRewarded()) {
      W.addPearls(state.pearls);
      state.pearls *= 2;
      state.pearlsDoubled = true;
      W.adShown();
      state.adDue = false;
    }
    showWinDialog();
  }

  /** The pearls earned, big, with a pearl icon, under the win message. */
  function showPearlReward() {
    const box = $('dialogReward');
    if (!state.pearls) return;
    const parts = state.pearlParts.map(([name, n]) => `${name} +${n}`);
    if (state.pearlsDoubled) parts.push('Doubled ×2');
    const d = state.daily;
    const daily = !d ? ''
      : d.day ? `<div class="reward-streak">🔥 Day ${d.day} streak! Daily bonus +${d.reward}${d.bonus ? ` · Weekly bonus +${d.bonus}` : ''}</div>`
      : d.progress ? `<div class="reward-daily">Daily bonus: ${d.progress} of ${d.need} levels solved today</div>` : '';
    box.innerHTML = `<div class="reward-main"><span class="pearl big" aria-hidden="true"></span><span class="reward-num">+${state.pearls}</span><span class="reward-unit">pearls</span></div>` +
      `<div class="reward-parts">${parts.join(' · ')}</div>${daily}`;
    box.setAttribute('aria-label', `${state.pearls} pearls earned for your aquarium`);
    box.classList.toggle('doubled', !!state.pearlsDoubled);
    box.hidden = false;
  }

  function showWinDialog() {
    showWinDialogInner();
    showPearlReward();
  }

  function showWinDialogInner() {
    const { group, index } = state;
    const levels = groupsNow()[group].levels;
    const moves = state.history.length;
    const par = levelAt(group, index).par;
    let detail = moves <= par
      ? `Solved in ${moves} moves. That’s the best possible!`
      : `Solved in ${moves} moves. It can be done in ${par}.`;
    const nextGroup = group + 1 < groupsNow().length && isGroupUnlocked(group + 1) ? group + 1 : -1;
    const startNextGroup = { label: `Go to ${groupTitle(nextGroup)}`, action: () => startLevel(nextGroup, 0) };

    if (state.unlockedGroup >= 0) detail += ` You’ve unlocked ${groupTitle(state.unlockedGroup)}: ${groupBlurb(state.unlockedGroup).toLowerCase()}.`;
    if (state.unlockedHarder) detail += ` ${groupTitle(group)} is now open on ${TIERS[tier + 1].name}.`;

    if (index + 1 < levels.length) {
      const buttons = [{ label: 'Next level', primary: true, action: () => startLevel(group, index + 1) }];
      if (state.unlockedGroup >= 0) buttons.push(startNextGroup);
      buttons.push({ label: 'Play again', action: () => startLevel(group, index, { fresh: true }) });
      buttons.push({ label: 'Menu', action: goToMenu });
      showDialog(state.unlockedGroup >= 0 ? 'New group unlocked!' : 'Level complete!', detail, withDouble(buttons.map((b) => ({ ...b, action: () => afterLevel(b.action) }))));
    } else {
      const buttons = [];
      if (nextGroup >= 0) buttons.push({ ...startNextGroup, primary: true });
      buttons.push({ label: 'Back to menu', primary: nextGroup < 0, action: goToMenu });
      buttons.push({ label: 'Play again', action: () => startLevel(group, index, { fresh: true }) });
      const last = group + 1 >= groupsNow().length;
      showDialog(`${groupTitle(group)} complete!`, `${detail} ${last ? `You untangled every ${TIERS[tier].name} level.` : ''}`.trim(), withDouble(buttons.map((b) => ({ ...b, action: () => afterLevel(b.action) }))));
    }
  }

  // ---------- Menu ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  }

  function goToMenu() {
    hideDialog();
    if (state) {
      tier = state.tier;
      menuGroup = state.group;
    }
    renderMenu();
    showScreen('menu');
  }

  let menuGroup = 0;

  function renderMenu() {
    // (In case a difficulty is missing a group.)
    menuGroup = Math.max(0, Math.min(menuGroup, groupsNow().length - 1));
    const tierTabs = $('tierTabs');
    tierTabs.innerHTML = '';
    TIERS.forEach((t, ti) => {
      const b = document.createElement('button');
      b.className = 'tier-tab';
      b.id = `tierTab${ti}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(ti === tier));
      const sizes = t.groups.flatMap((grp, gi) => grp.levels.map((_, li) => (tier === ti ? levelAt(gi, li).size : 0))).filter(Boolean);
      b.textContent = t.name;
      b.title = sizes.length ? `Boards up to ${Math.max(...sizes)}×${Math.max(...sizes)}` : t.name;
      b.addEventListener('click', () => {
        tier = ti;
        // The group last played on this difficulty, else the first.
        menuGroup = (progress.lastGroup || {})[ti] || 0;
        renderMenu();
      });
      tierTabs.appendChild(b);
    });

    const tabs = $('groupTabs');
    tabs.innerHTML = '';
    groupsNow().forEach((grp, gi) => {
      const b = document.createElement('button');
      const unlocked = isGroupUnlocked(gi);
      b.className = 'group-tab';
      b.dataset.group = String(gi);
      b.id = `groupTab${gi}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(gi === menuGroup));
      // Compact cards (the menu never scrolls): the group's name and progress.
      // The chosen group's mechanic is named once, under the cards.
      b.innerHTML = `<span class="group-title">${groupTitle(gi)}</span>` +
        `<span class="group-count${unlocked ? '' : ' locked'}">${unlocked ? `${completedIn(gi)} / ${grp.levels.length}` : 'Locked'}</span>`;
      b.setAttribute('aria-label', `${groupTitle(gi)}: ${groupBlurb(gi)}, ${unlocked ? `${completedIn(gi)} of ${grp.levels.length} done` : 'locked'}`);
      b.addEventListener('click', () => { menuGroup = gi; renderMenu(); });
      tabs.appendChild(b);
    });

    const unlocked = isGroupUnlocked(menuGroup);
    const note = $('groupNote');
    note.hidden = false;
    note.dataset.group = String(menuGroup);
    note.textContent = unlocked ? groupBlurb(menuGroup) : lockReason(menuGroup);

    const grid = $('levelGrid');
    grid.innerHTML = '';
    grid.dataset.group = String(menuGroup); // each group's buttons have their own colour
    grid.style.setProperty('--rows', String(Math.ceil(groupsNow()[menuGroup].levels.length / 5)));
    groupsNow()[menuGroup].levels.forEach((_, i) => {
      const level = levelAt(menuGroup, i);
      const b = document.createElement('button');
      b.className = 'level-btn';
      const open = isUnlocked(menuGroup, i);
      const done = isCompleted(menuGroup, i);
      b.disabled = !open;
      if (done) b.classList.add('done');
      // A level you've started: a ring round the bubble fills with the share of lines cleared.
      const run = open ? savedRun(tier, menuGroup, i) : null;
      const pct = run ? Math.round((100 * (run.total - run.left)) / run.total) : 0;
      if (run) {
        b.classList.add('partial');
        b.style.setProperty('--progress', pct);
      }
      const sub = done ? 'Done' : run ? `${pct}%` : open ? `${level.size}×${level.size}` : 'Locked';
      b.innerHTML = `<span>${i + 1}</span><span class="sub">${sub}</span>`;
      const rating = (groupsNow()[menuGroup].ratings || [])[i];
      b.setAttribute('aria-label', `${groupTitle(menuGroup)}, level ${i + 1}, ${run ? `in progress, ${pct}% cleared${done ? ', done before' : ''}` : sub}${rating !== undefined ? `, difficulty ${rating} of 10` : ''}`);
      if (rating !== undefined) b.title = `Difficulty ${rating}/10`;
      const gi = menuGroup;
      b.addEventListener('click', () => startLevel(gi, i));
      grid.appendChild(b);
    });
  }

  $('menuBtn').addEventListener('click', goToMenu);
  $('restartBtn').addEventListener('click', askRestart);
  $('undoBtn').addEventListener('click', undo);
  $('helpBtn').addEventListener('click', () => { if (state) showIntro(state.group); });
  $('skipBtn').addEventListener('click', () => {
    if (!state || state.finished || !skipAllowed()) return;
    showDialog('Skip this level?', 'Watch a short ad to skip it. It counts as finished, so the next level opens.', [
      { label: 'Watch an ad and skip', primary: true, action: async () => {
        hideDialog();
        if (!window.ArrowAds) return;
        if (await window.ArrowAds.showRewarded()) skipLevel();
        else if (window.ArrowShop) window.ArrowShop.toast('Watch to the end to skip');
      } },
      { label: 'Keep playing', action: hideDialog },
    ]);
  });
  $('hintBtn').addEventListener('click', showHint);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && screens.game.classList.contains('active')) {
      e.preventDefault();
      undo();
    } else if (e.key === 'h' && !e.ctrlKey && !e.metaKey && screens.game.classList.contains('active') && overlay.hidden && !introOpen() && !(window.ArrowShop && window.ArrowShop.isOpen()) && !(window.ArrowSettings.isOpen && window.ArrowSettings.isOpen())) {
      showHint();
    }
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  // Mouse wheel / trackpad pinch zooms around the pointer.
  canvas.addEventListener('wheel', (e) => {
    if (!state) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, view.scale * Math.exp(-e.deltaY * 0.002));
  }, { passive: false });
  const zoomButton = (factor) => () => { const s = boardSize() / 2; zoomAt(s, s, view.scale * factor); };
  $('zoomIn').addEventListener('click', zoomButton(1.6));
  $('zoomOut').addEventListener('click', zoomButton(1 / 1.6));
  $('zoomFit').addEventListener('click', resetView);
  new ResizeObserver(resizeCanvas).observe(boardWrap);

  // Open on the difficulty and group of the last level started (first time: Easy, Kelp Shallows).
  if (progress.last && TIERS[progress.last.tier]) { tier = progress.last.tier; menuGroup = progress.last.group; }
  else { tier = 0; menuGroup = 0; }
  renderMenu();
  requestAnimationFrame(frame);
})();
