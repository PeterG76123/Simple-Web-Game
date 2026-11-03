(function () {
  'use strict';

  const { DIRS, buildLine, mirrorMap, reach, reachBack, solve, decodeLevel, makeWorld, anyMap, turnMirror, canTurn } = window.ArrowRules;
  const { unlockAfter: UNLOCK_AFTER } = window.ArrowLevelData;
  // Older level files had one list of groups and no difficulty settings.
  const TIERS = window.ArrowLevelData.tiers || [{ name: 'Easy', groups: window.ArrowLevelData.groups }];
  const STORAGE_KEY = 'arrow-escape-progress-v2';

  // The difficulty setting (Easy, Medium, ...) being shown or played. Groups
  // and levels below always mean those of this setting.
  let tier = 0;
  const groupsNow = () => TIERS[tier].groups;

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

  // Hints shown under the board, per group, for the first few levels.
  const HINTS = [
    [
      'Tap a line to send it straight out, or drag it the way its arrow points to slide it as far as you like.',
      'Lines can’t pass through each other. Clear the way first.',
      'Stuck? Drag a line back the way it came, or use Undo.',
      'You can stop a line partway, and drag it back as far as where it started.',
      'Work out which lines are free first.',
    ],
    [
      'Dashed parts of a line are see-through. Other lines can slide right through them.',
      'A line can’t get out? Slide another one partway so its see-through gap lines up.',
      'Slide too far and the gap closes again. Drag it back.',
      'Some levels need more than one gap lined up.',
      'See-through parts can slide over other lines too.',
      'From here on, it’s up to you to spot which gaps to use.',
    ],
    [
      'Triangles are reflectors. A line that hits the slanted side turns 90° and keeps going.',
      'Follow each line’s path around the reflectors before you move it.',
      'A line that bounces can still be blocked by lines on its new path.',
      'Reflectors work with see-through parts too.',
      'Some lines bounce off more than one reflector on the way out.',
    ],
    [
      'Tap a reflector to turn it a quarter turn. Some lines can only get out once a reflector is turned.',
      'Each tap turns it a little further. Watch where each line would bounce.',
      'A reflector can’t turn while a line is on it, or while a line that went through it is still on the board.',
      'Sometimes a reflector has to be turned more than once as you go.',
      'Plan the order: turn, slide, then turn again.',
    ],
    [
      'Gates block lines. A gate opens while any line sits on a plate of the same colour.',
      'Slide a line partway onto a plate to hold its gate open, then send another line through.',
      'A gate can’t close on a line that’s inside it.',
      'Some colours have more than one gate. One plate opens them all.',
      'Think about which line should leave last.',
    ],
  ];

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
  const progress = loadProgress();
  const isCompleted = (g, i) => progress.completed.includes(`${tier}-${g}-${i}`);
  const completedIn = (g) => groupsNow()[g].levels.filter((_, i) => isCompleted(g, i)).length;
  const isGroupUnlocked = (g) => g === 0 || completedIn(g - 1) >= UNLOCK_AFTER;
  const isUnlocked = (g, i) => isGroupUnlocked(g) && (i === 0 || isCompleted(g, i - 1));

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

  function startLevel(group, index) {
    const level = levelAt(group, index);
    const n = level.size;
    const mirrors = (level.mirrors || []).map((m) => m.slice());
    const map = mirrorMap(n, mirrors);
    const world = makeWorld(n, level.gates || [], level.plates || []);
    const lines = level.lines.map((a, id) => Object.assign(buildLine(n, a, map), {
      id,
      colorIndex: (id * 3) % 10,
      rest: 0, // where the line sits (-1 once it has left)
      offset: 0, // where it is drawn
      mode: 'idle', // idle | drag | settle | exit | gone
      speed: 0,
      flash: 0,
    }));
    lines.world = world; // gates and plates, used by the movement checks

    state = {
      tier, group, index, n, lines, mirrors, history: [], finished: false,
      rotatable: !!level.rotatable,
      gates: level.gates || [],
      plates: level.plates || [],
      mirrorAnim: [], // per reflector: { from, to, start } angles while turning
      mirrorFlash: [], // per reflector: 0-1, flashes when it can't turn
      gateFlash: new Map(), // gate cell -> 0-1, flashes when it blocks a line
      rating: (groupsNow()[group].ratings || [])[index],
      // Tips are for learning the game, so only on Easy.
      levelHint: tier === 0 ? (HINTS[group] || [])[index] || '' : '',
      hint: null, // { id, to, start, moves } while a hint is showing
      hintsUsed: 0, // counted so hints can be tied to ads later
    };
    drag = null;

    $('levelLabel').textContent = `Group ${group + 1} · Level ${index + 1}`;
    $('hint').textContent = state.levelHint;
    $('hint').classList.remove('active');
    delete canvas.dataset.hintLine;
    delete canvas.dataset.hintTo;
    updateHud();
    hideDialog();
    showScreen('game');
    resizeCanvas();
  }

  const restOffsets = () => state.lines.map((l) => l.rest);

  function updateHud() {
    const moves = state.history.length;
    const rating = state.rating !== undefined ? ` · ${state.rating.toFixed(1)}/10` : '';
    $('moves').textContent = `${TIERS[state.tier].name}${rating} · ${moves === 1 ? '1 move' : `${moves} moves`}`;
    const left = state.lines.filter((l) => l.rest >= 0).length;
    $('remaining').textContent = left === 1 ? '1 line left' : `${left} lines left`;
    $('undoBtn').disabled = moves === 0 || state.finished;
    $('hintBtn').disabled = state.finished || left === 0;
    // Any move (or undo) makes the current hint out of date.
    if (state.hint && state.hint.moves !== moves) clearHint();
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
    // Big boards can take a moment: say so, and let the message show first.
    state.thinking = true;
    setHintText('Working out the best move…');
    const asked = state;
    setTimeout(() => {
      asked.thinking = false;
      if (state !== asked || state.finished || drag) return;
      computeHint();
    }, 30);
  }

  function computeHint() {
    const level = levelAt(state.group, state.index);
    const result = solve(state.n, level.lines, {
      mirrors: state.mirrors, rotatable: state.rotatable, gates: state.gates, plates: state.plates,
      start: restOffsets(), maxStates: 150000,
    });
    state.hintsUsed++;
    const moves = state.history.length;
    if (!result.solvable) {
      state.hint = { id: -1, to: 0, start: performance.now(), moves };
      setHintText(result.gaveUp
        ? 'This is too tangled to work out from here. Try Undo or Restart.'
        : 'There’s no way out from here. Undo some moves or restart.');
      return;
    }
    const move = result.path[0];
    if (move.turn !== undefined) {
      state.hint = { id: -1, turn: move.turn, start: performance.now(), moves };
      canvas.dataset.hintTurn = String(move.turn);
      setHintText(`Tap the flashing reflector to turn it.${result.par > 1 ? ` You can finish in ${result.par} moves.` : ''}`);
      return;
    }
    const line = state.lines[move.line];
    let text;
    if (move.to === -1) {
      text = 'Slide the flashing line all the way out.';
    } else {
      const d = move.to - line.rest;
      const k = Math.abs(d);
      text = `Slide the flashing line ${d > 0 ? 'forward' : 'back'} ${k} ${k === 1 ? 'square' : 'squares'}, until its head reaches the ring.`;
    }
    text += result.par > 1 ? ` You can finish in ${result.par} moves.` : '';
    state.hint = { id: move.line, to: move.to, start: performance.now(), moves };
    canvas.dataset.hintLine = String(move.line);
    canvas.dataset.hintTo = String(move.to);
    setHintText(text);
  }

  // ---------- Input ----------
  function boardPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const { cell, margin } = layout(rect.width);
    return { px: evt.clientX - rect.left, py: evt.clientY - rect.top, cell, margin };
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
      return;
    }
    const before = state.mirrors;
    state.mirrors = turnMirror(state.mirrors, k);
    const a = ANGLE[shapeIndex(m[2], m[3])];
    animateTurn(k, a, a + 1);
    rebuildLines();
    state.history.push({ turn: k, mirrors: before });
    updateHud();
  }

  function onPointerDown(evt) {
    if (!state || state.finished || drag) return;
    const { px, py, cell, margin } = boardPoint(evt);
    const x = Math.floor((px - margin) / cell);
    const y = Math.floor((py - margin) / cell);
    const line = lineAt(x, y);
    if (!line) {
      const k = state.rotatable ? state.mirrors.findIndex(([mx, my]) => mx === x && my === y) : -1;
      if (k >= 0) {
        evt.preventDefault();
        turnAt(k);
      }
      return;
    }
    evt.preventDefault();
    canvas.setPointerCapture(evt.pointerId);
    const offsets = restOffsets();
    const r = reach(state.n, state.lines, offsets, line.id);
    const back = reachBack(state.n, state.lines, offsets, line.id);
    drag = {
      line, pointerId: evt.pointerId, startX: px, startY: py, lastX: px, lastY: py,
      cell, reach: r, back, time: performance.now(), moved: 0, wanted: line.rest,
    };
    line.mode = 'drag';
  }

  function onPointerMove(evt) {
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const { px, py } = boardPoint(evt);
    const { line, reach: r, back } = drag;
    drag.moved = Math.max(drag.moved, Math.hypot(px - drag.startX, py - drag.startY) / drag.cell);
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
    let blockerId = -1;
    if (!r.exit && wanted > r.max + BLOCK_PUSH) {
      blockerId = r.blocker;
      if (r.gate >= 0) flashGate(r.gate);
    }
    if (wanted < back.min - BLOCK_PUSH) {
      if (back.blocker !== -1) blockerId = back.blocker;
      if (back.gate >= 0) flashGate(back.gate);
    }
    const blocker = state.lines[blockerId];
    if (blocker && blocker.flash < 0.4) {
      blocker.flash = 1;
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  function onPointerUp(evt) {
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const { line, reach: r, back } = drag;
    const now = performance.now();
    const isTap = drag.moved < TAP_MAX_MOVE && now - drag.time < TAP_MAX_MS;
    drag = null;
    const from = line.rest;

    if (isTap) {
      // A tap sends the line out (or bumps whatever is in its way); dragging
      // moves it exactly as far as you drag.
      line.offset = line.rest;
      sendOut(line, r);
      return;
    }

    if (r.exit && line.offset >= line.ray.length + 0.5) {
      // The head is past the edge and nothing stops it: let it slide out.
      line.rest = -1;
      line.mode = 'exit';
      line.speed = EXIT_SPEED_START;
      state.history.push({ id: line.id, from });
    } else {
      const to = Math.min(Math.round(line.offset), r.max, line.exitAt - 1);
      line.rest = Math.max(back.min, to);
      line.mode = 'settle';
      if (line.rest !== from) state.history.push({ id: line.id, from });
    }
    updateHud();
  }

  function flashGate(cell) {
    if ((state.gateFlash.get(cell) || 0) < 0.4) {
      state.gateFlash.set(cell, 1);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  /** Tap: slide all the way off if nothing is in the way, otherwise bump and spring back. */
  function sendOut(line, r) {
    if (r.exit) {
      state.history.push({ id: line.id, from: line.rest });
      line.rest = -1;
      line.mode = 'exit';
      line.speed = EXIT_SPEED_START;
      updateHud();
    } else {
      line.mode = 'bump';
      line.bumpTarget = r.max + BUMP_OVERLAP;
      line.blocker = r.blocker;
      line.blockGate = r.gate;
    }
  }

  function undo() {
    if (!state || state.finished || drag) return;
    const last = state.history.pop();
    if (!last) return;
    if (last.turn !== undefined) {
      const m = state.mirrors[last.turn];
      const a = ANGLE[shapeIndex(m[2], m[3])];
      state.mirrors = last.mirrors;
      animateTurn(last.turn, a, a - 1);
      rebuildLines();
      updateHud();
      return;
    }
    const line = state.lines[last.id];
    if (line.mode === 'gone' || line.mode === 'exit') line.offset = Math.min(line.offset, line.exitAt);
    line.rest = last.from;
    line.mode = 'settle';
    updateHud();
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
        if (l.offset >= l.bumpTarget) {
          l.offset = l.bumpTarget;
          l.mode = 'settle'; // springs back to where it was; not counted as a move
          if (l.blockGate >= 0) flashGate(l.blockGate);
          const blocker = state.lines[l.blocker];
          if (blocker) blocker.flash = 1;
          if (navigator.vibrate) navigator.vibrate(30);
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
      state.unlockedGroup = next < groupsNow().length && !isGroupUnlocked(next) ? next : -1;
      if (!isCompleted(state.group, state.index)) {
        progress.completed.push(`${tier}-${state.group}-${state.index}`);
        saveProgress();
      }
      if (state.unlockedGroup >= 0 && !isGroupUnlocked(state.unlockedGroup)) state.unlockedGroup = -1;
      updateHud();
      setTimeout(showWinDialog, 250);
    }
  }

  // ---------- Drawing ----------
  function layout(size) {
    const cell = size / (state.n + 0.6);
    return { cell, margin: cell * 0.3 };
  }

  function resizeCanvas() {
    if (!state) return;
    const size = boardWrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    const size = canvas.width / (window.devicePixelRatio || 1);
    const { cell, margin } = layout(size);
    const center = (v) => margin + (v + 0.5) * cell;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = colors.dot;
    for (let y = 0; y < state.n; y++) {
      for (let x = 0; x < state.n; x++) {
        ctx.beginPath();
        ctx.arc(center(x), center(y), cell * 0.07, 0, Math.PI * 2);
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
      // Plates: round pads, brighter while something is on them.
      for (const [px, py, c] of state.plates) {
        ctx.fillStyle = colors.gates[c];
        ctx.globalAlpha = covered.has(c) ? 0.5 : 0.2;
        ctx.beginPath();
        ctx.arc(center(px), center(py), cell * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.gates[c];
        ctx.lineWidth = cell * 0.07;
        ctx.stroke();
      }
      for (const [gx, gy, c] of state.gates) {
        const cellIndex = gy * state.n + gx;
        const open = covered.has(c) || any[cellIndex] > 0;
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
    }

    // Reflectors: a triangle filling half the cell, with its slanted side
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
      // Up-left shape: corner at bottom-right, slanted side from top-right to bottom-left.
      ctx.fillStyle = flash > 0 ? mix(colors.mirror, colors.danger, Math.min(1, flash)) : colors.mirror;
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.lineTo(half, -half);
      ctx.lineTo(-half, half);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = state.rotatable ? colors.turnable : colors.mirrorEdge;
      ctx.lineWidth = cell * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(half, -half);
      ctx.lineTo(-half, half);
      ctx.stroke();
      if (state.rotatable) {
        // A small turning arrow in the open half marks reflectors you can tap.
        ctx.lineWidth = cell * 0.05;
        ctx.beginPath();
        ctx.arc(-cell * 0.12, -cell * 0.12, cell * 0.14, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();
        const ex = -cell * 0.12 + cell * 0.14 * Math.cos(Math.PI * 2.1);
        const ey = -cell * 0.12 + cell * 0.14 * Math.sin(Math.PI * 2.1);
        ctx.fillStyle = colors.turnable;
        ctx.beginPath();
        ctx.moveTo(ex + cell * 0.07, ey - cell * 0.02);
        ctx.lineTo(ex - cell * 0.03, ey + cell * 0.07);
        ctx.lineTo(ex - cell * 0.05, ey - cell * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    const visible = state.lines.filter((l) => l.mode !== 'gone');
    // Moving lines are drawn on top.
    visible.sort((a, b) => (a.mode === 'idle' ? 0 : 1) - (b.mode === 'idle' ? 0 : 1));

    const width = cell * 0.26;

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
      const base = colors.lines[l.colorIndex];
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
        ctx.lineCap = 'butt';
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        stroke(pts);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = width * 0.28;
        ctx.setLineDash([cell * 0.12, cell * 0.1]);
        stroke(pts);
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Layer 2: solid parts and arrowheads.
    for (const l of visible) {
      const color = colorOf(l);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = l.mode === 'drag' ? width * 1.15 : width;
      ctx.lineCap = 'butt';
      for (const [from, to] of runs(l, true)) {
        const pts = piece(l, from, to);
        if (!pts) continue;
        stroke(pts);
        if (from === 0) {
          // Rounded tail end.
          ctx.beginPath();
          ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const [hx, hy] = pathOf(l, l.offset + l.len - 1, l.offset + l.len - 1)[0];
      // The head points the way it is travelling, which changes at reflectors.
      const hp = Math.max(1, Math.min(l.track.length - 1, Math.ceil(l.offset + l.len - 1 - 1e-6)));
      const dx = l.track[hp][0] - l.track[hp - 1][0];
      const dy = l.track[hp][1] - l.track[hp - 1][1];
      const tip = cell * 0.42;
      const back = cell * 0.02;
      const wing = cell * 0.27;
      ctx.beginPath();
      ctx.moveTo(hx + dx * tip, hy + dy * tip);
      ctx.lineTo(hx - dx * back - dy * wing, hy - dy * back + dx * wing);
      ctx.lineTo(hx - dx * back + dy * wing, hy - dy * back - dx * wing);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---------- Dialogs ----------
  function showDialog(title, text, buttons) {
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

  function showWinDialog() {
    const { group, index } = state;
    const levels = groupsNow()[group].levels;
    const moves = state.history.length;
    const par = levelAt(group, index).par;
    let detail = moves <= par
      ? `Solved in ${moves} moves. That’s the best possible!`
      : `Solved in ${moves} moves. It can be done in ${par}.`;
    const nextGroup = group + 1 < groupsNow().length && isGroupUnlocked(group + 1) ? group + 1 : -1;
    const startNextGroup = { label: `Start Group ${nextGroup + 1}`, action: () => startLevel(nextGroup, 0) };

    if (state.unlockedGroup >= 0) detail += ` You’ve unlocked Group ${state.unlockedGroup + 1}: ${groupsNow()[state.unlockedGroup].name}.`;

    if (index + 1 < levels.length) {
      const buttons = [{ label: 'Next level', primary: true, action: () => startLevel(group, index + 1) }];
      if (state.unlockedGroup >= 0) buttons.push(startNextGroup);
      buttons.push({ label: 'Play again', action: () => startLevel(group, index) });
      buttons.push({ label: 'Menu', action: goToMenu });
      showDialog(state.unlockedGroup >= 0 ? 'New group unlocked!' : 'Level complete!', detail, buttons);
    } else {
      const buttons = [];
      if (nextGroup >= 0) buttons.push({ ...startNextGroup, primary: true });
      buttons.push({ label: 'Back to menu', primary: nextGroup < 0, action: goToMenu });
      buttons.push({ label: 'Play again', action: () => startLevel(group, index) });
      const last = group + 1 >= groupsNow().length;
      showDialog(`Group ${group + 1} complete!`, `${detail} ${last ? `You untangled every ${TIERS[tier].name} level.` : ''}`.trim(), buttons);
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

  /** The next level to play: the first unfinished level in the newest unlocked group. */
  function nextLevel() {
    for (let gi = groupsNow().length - 1; gi >= 0; gi--) {
      if (!isGroupUnlocked(gi)) continue;
      const i = groupsNow()[gi].levels.findIndex((_, li) => !isCompleted(gi, li));
      if (i >= 0) return { group: gi, index: i };
    }
    return null;
  }

  function renderMenu() {
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
        menuGroup = (nextLevel() || { group: 0 }).group;
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
      b.innerHTML = `<span class="group-title">Group ${gi + 1}</span>` +
        `<span class="group-sub">${grp.name}</span>` +
        `<span class="group-count${unlocked ? '' : ' locked'}">${unlocked ? `${completedIn(gi)} / ${grp.levels.length} done` : 'Locked'}</span>`;
      b.addEventListener('click', () => { menuGroup = gi; renderMenu(); });
      tabs.appendChild(b);
    });

    const unlocked = isGroupUnlocked(menuGroup);
    const note = $('groupNote');
    if (unlocked) {
      note.hidden = true;
    } else {
      const prev = menuGroup - 1;
      const left = UNLOCK_AFTER - completedIn(prev);
      note.hidden = false;
      note.textContent = `Finish ${left} more ${left === 1 ? 'level' : 'levels'} in Group ${prev + 1} to unlock this group.`;
    }

    const grid = $('levelGrid');
    grid.innerHTML = '';
    grid.dataset.group = String(menuGroup); // each group's buttons have their own colour
    groupsNow()[menuGroup].levels.forEach((_, i) => {
      const level = levelAt(menuGroup, i);
      const b = document.createElement('button');
      b.className = 'level-btn';
      const open = isUnlocked(menuGroup, i);
      const done = isCompleted(menuGroup, i);
      b.disabled = !open;
      if (done) b.classList.add('done');
      const sub = done ? 'Done' : open ? `${level.size}×${level.size}` : 'Locked';
      b.innerHTML = `<span>${i + 1}</span><span class="sub">${sub}</span>`;
      const rating = (groupsNow()[menuGroup].ratings || [])[i];
      b.setAttribute('aria-label', `Group ${menuGroup + 1}, level ${i + 1}, ${sub}${rating !== undefined ? `, difficulty ${rating} of 10` : ''}`);
      if (rating !== undefined) b.title = `Difficulty ${rating}/10`;
      const gi = menuGroup;
      b.addEventListener('click', () => startLevel(gi, i));
      grid.appendChild(b);
    });

    const next = nextLevel();
    $('playBtn').textContent = progress.completed.length === 0 ? 'Play'
      : next ? `Continue: Group ${next.group + 1}, Level ${next.index + 1}` : 'Play again';
  }

  $('playBtn').addEventListener('click', () => {
    const next = nextLevel() || { group: 0, index: 0 };
    startLevel(next.group, next.index);
  });
  $('menuBtn').addEventListener('click', goToMenu);
  $('restartBtn').addEventListener('click', () => startLevel(state.group, state.index));
  $('undoBtn').addEventListener('click', undo);
  $('hintBtn').addEventListener('click', showHint);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && screens.game.classList.contains('active')) {
      e.preventDefault();
      undo();
    } else if (e.key === 'h' && !e.ctrlKey && !e.metaKey && screens.game.classList.contains('active') && overlay.hidden) {
      showHint();
    }
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  new ResizeObserver(resizeCanvas).observe(boardWrap);

  menuGroup = (nextLevel() || { group: 0 }).group;
  renderMenu();
  requestAnimationFrame(frame);
})();
