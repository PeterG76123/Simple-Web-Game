(function () {
  'use strict';

  const { DIRS, LEVELS, buildLine, reach, reachBack } = window.ArrowLevels;
  const STORAGE_KEY = 'arrow-escape-progress';

  const SETTLE_SPEED = 14; // cells per second when snapping to a cell
  const EXIT_SPEED_START = 10;
  const EXIT_ACCEL = 40;
  const BLOCK_PUSH = 0.35; // how far past a blocker you must push to see it flash
  const BUMP_SPEED = 16; // cells per second when a double-tapped line runs at a blocker
  const BUMP_OVERLAP = 0.3; // how far it pokes into the blocker before springing back
  const DOUBLE_TAP_MS = 350;
  const TAP_MAX_MS = 300;
  const TAP_MAX_MOVE = 0.2; // in cells

  const HINTS = [
    'Drag a line the way its arrow points to slide it off the board, or double-tap it to send it straight out.',
    'Lines can’t pass through each other. Clear the way first.',
    'Stuck? Drag a line back the way it came, or use Undo.',
    'You can stop a line partway, and drag it back as far as where it started.',
    'Big board, same rules. Work out which lines are free first.',
    'Dashed parts of a line are see-through. Other lines can slide right through them.',
    'A line can’t get out? Slide another one partway so its see-through gap lines up.',
    'The gap only lines up in one spot. Slide too far and it closes again, so drag it back.',
    'Two gaps to line up this time.',
    'See-through parts can also slide over other lines.',
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const screens = { menu: $('menu'), game: $('game') };
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const boardWrap = $('boardWrap');
  const overlay = $('overlay');

  // ---------- Progress (saved per browser, optional) ----------
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.completed)) return data;
    } catch (e) { /* storage unavailable: play without saving */ }
    return { completed: [] };
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }
  const progress = loadProgress();
  const isCompleted = (i) => progress.completed.includes(i);
  const isUnlocked = (i) => i === 0 || isCompleted(i - 1);

  // ---------- Theme colours for the canvas ----------
  let colors = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    colors = {
      dot: v('--dot'),
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
  let lastTap = null; // { id, time } of the last quick tap, for double-tap

  function startLevel(index) {
    const level = LEVELS[index];
    const n = level.size;
    const lines = level.arrows.map((a, id) => Object.assign(buildLine(n, a), {
      id,
      colorIndex: (id * 3) % 10,
      rest: 0, // where the line sits (-1 once it has left)
      offset: 0, // where it is drawn
      mode: 'idle', // idle | drag | settle | exit | gone
      speed: 0,
      flash: 0,
    }));

    state = { index, n, lines, history: [], finished: false };
    drag = null;
    lastTap = null;

    $('levelLabel').textContent = `Level ${index + 1} of ${LEVELS.length}`;
    $('hint').textContent = HINTS[index] || '';
    updateHud();
    hideDialog();
    showScreen('game');
    resizeCanvas();
  }

  const restOffsets = () => state.lines.map((l) => l.rest);

  function updateHud() {
    const moves = state.history.length;
    $('moves').textContent = moves === 1 ? '1 move' : `${moves} moves`;
    const left = state.lines.filter((l) => l.rest >= 0).length;
    $('remaining').textContent = left === 1 ? '1 line left' : `${left} lines left`;
    $('undoBtn').disabled = moves === 0 || state.finished;
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

  function onPointerDown(evt) {
    if (!state || state.finished || drag) return;
    const { px, py, cell, margin } = boardPoint(evt);
    const x = Math.floor((px - margin) / cell);
    const y = Math.floor((py - margin) / cell);
    const line = lineAt(x, y);
    if (!line) return;
    evt.preventDefault();
    canvas.setPointerCapture(evt.pointerId);
    const offsets = restOffsets();
    const r = reach(state.n, state.lines, offsets, line.id);
    const back = reachBack(state.n, state.lines, offsets, line.id);
    drag = { line, pointerId: evt.pointerId, startX: px, startY: py, cell, reach: r, back, time: performance.now(), moved: 0 };
    line.mode = 'drag';
  }

  function onPointerMove(evt) {
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const { px, py } = boardPoint(evt);
    const { line, reach: r, back } = drag;
    const [dx, dy] = DIRS[line.dir];
    const pushed = ((px - drag.startX) * dx + (py - drag.startY) * dy) / drag.cell;
    drag.moved = Math.max(drag.moved, Math.hypot(px - drag.startX, py - drag.startY) / drag.cell);
    const wanted = line.rest + pushed;
    const limit = r.exit ? line.exitAt : r.max;
    line.offset = Math.max(back.min, Math.min(wanted, limit));
    let blockerId = -1;
    if (!r.exit && wanted > r.max + BLOCK_PUSH) blockerId = r.blocker;
    if (back.blocker !== -1 && wanted < back.min - BLOCK_PUSH) blockerId = back.blocker;
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
      line.offset = line.rest;
      if (lastTap && lastTap.id === line.id && now - lastTap.time < DOUBLE_TAP_MS) {
        lastTap = null;
        sendOut(line, r);
      } else {
        lastTap = { id: line.id, time: now };
        line.mode = 'idle';
      }
      return;
    }
    lastTap = null;

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

  /** Double-tap: slide all the way off if nothing is in the way, otherwise bump and spring back. */
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
    }
  }

  function undo() {
    if (!state || state.finished || drag) return;
    const last = state.history.pop();
    if (!last) return;
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
      if (!isCompleted(state.index)) {
        progress.completed.push(state.index);
        saveProgress();
      }
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
      const [dx, dy] = DIRS[l.dir];
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
    const i = state.index;
    const moves = state.history.length;
    const par = LEVELS[i].par;
    const detail = moves <= par
      ? `Solved in ${moves} moves. That’s the best possible!`
      : `Solved in ${moves} moves. It can be done in ${par}.`;
    if (i + 1 < LEVELS.length) {
      showDialog('Level complete!', detail, [
        { label: 'Next level', primary: true, action: () => startLevel(i + 1) },
        { label: 'Play again', action: () => startLevel(i) },
        { label: 'Menu', action: goToMenu },
      ]);
    } else {
      showDialog('You beat every level!', `${detail} You untangled them all.`, [
        { label: 'Back to menu', primary: true, action: goToMenu },
        { label: 'Play again', action: () => startLevel(i) },
      ]);
    }
  }

  // ---------- Menu ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  }

  function goToMenu() {
    hideDialog();
    renderMenu();
    showScreen('menu');
  }

  function renderMenu() {
    const grid = $('levelGrid');
    grid.innerHTML = '';
    LEVELS.forEach((level, i) => {
      const b = document.createElement('button');
      b.className = 'level-btn';
      const unlocked = isUnlocked(i);
      b.disabled = !unlocked;
      if (isCompleted(i)) b.classList.add('done');
      const sub = isCompleted(i) ? 'Done' : unlocked ? `${level.size}×${level.size}` : 'Locked';
      b.innerHTML = `<span>${i + 1}</span><span class="sub">${sub}</span>`;
      b.setAttribute('aria-label', `Level ${i + 1}, ${sub}`);
      b.addEventListener('click', () => startLevel(i));
      grid.appendChild(b);
    });

    const next = LEVELS.findIndex((_, i) => !isCompleted(i));
    $('playBtn').textContent = progress.completed.length === 0 ? 'Play' : next === -1 ? 'Play again' : `Continue: Level ${next + 1}`;
  }

  $('playBtn').addEventListener('click', () => {
    const next = LEVELS.findIndex((_, i) => !isCompleted(i));
    startLevel(next === -1 ? 0 : next);
  });
  $('menuBtn').addEventListener('click', goToMenu);
  $('restartBtn').addEventListener('click', () => startLevel(state.index));
  $('undoBtn').addEventListener('click', undo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && screens.game.classList.contains('active')) {
      e.preventDefault();
      undo();
    }
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  new ResizeObserver(resizeCanvas).observe(boardWrap);

  renderMenu();
  requestAnimationFrame(frame);
})();
