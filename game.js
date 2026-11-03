(function () {
  'use strict';

  const { DIRS, LEVELS, rayCells } = window.ArrowLevels;
  const MAX_LIVES = 3;
  const STORAGE_KEY = 'arrow-escape-progress';

  // Animation speeds, in cells per second.
  const EXIT_SPEED_START = 9;
  const EXIT_ACCEL = 40;
  const BUMP_FORWARD_SPEED = 14;
  const BUMP_BACK_SPEED = 9;
  const BUMP_OVERLAP = 0.38; // how far the head pokes into the blocking cell

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
  let progress = loadProgress();

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

  // ---------- Game state ----------
  let state = null;

  function startLevel(index) {
    const level = LEVELS[index];
    const n = level.size;
    const arrows = level.arrows.map((a, id) => {
      const len = a.cells.length;
      const d = DIRS[a.dir];
      const [hx, hy] = a.cells[0];
      const ray = rayCells(n, hx, hy, d);
      // The path the line slides along: tail ... head, then straight out past the edge.
      const track = a.cells.slice().reverse();
      for (let i = 1; i <= ray.length + len + 2; i++) track.push([hx + d[0] * i, hy + d[1] * i]);
      return {
        id,
        cells: a.cells,
        dir: a.dir,
        len,
        ray,
        track,
        colorIndex: (id * 3) % 10,
        mode: 'idle', // idle | exiting | bumpOut | bumpBack | gone
        offset: 0,
        speed: 0,
        bumpTarget: 0,
        flash: 0,
      };
    });

    const occ = new Int16Array(n * n).fill(-1);
    arrows.forEach((a) => a.cells.forEach(([x, y]) => { occ[y * n + x] = a.id; }));

    state = {
      index,
      n,
      arrows,
      occ,
      lives: MAX_LIVES,
      over: false,
      finished: false,
    };

    $('levelLabel').textContent = `Level ${index + 1} of ${LEVELS.length}`;
    renderLives(false);
    updateRemaining();
    hideDialog();
    showScreen('game');
    resizeCanvas();
  }

  function remainingCount() {
    return state.arrows.filter((a) => a.mode !== 'gone' && a.mode !== 'exiting').length;
  }

  function updateRemaining() {
    const left = remainingCount();
    $('remaining').textContent = left === 1 ? '1 line left' : `${left} lines left`;
  }

  // ---------- Input ----------
  function handleTap(evt) {
    if (!state || state.over || state.finished) return;
    const rect = canvas.getBoundingClientRect();
    const { cell, margin } = layout(rect.width);
    const x = Math.floor((evt.clientX - rect.left - margin) / cell);
    const y = Math.floor((evt.clientY - rect.top - margin) / cell);
    if (x < 0 || y < 0 || x >= state.n || y >= state.n) return;
    const id = state.occ[y * state.n + x];
    if (id === -1) return;
    const arrow = state.arrows[id];
    if (arrow.mode !== 'idle') return;
    launch(arrow);
  }

  function launch(arrow) {
    const { n, occ } = state;
    const blockAt = arrow.ray.findIndex(([x, y]) => occ[y * n + x] !== -1);

    if (blockAt === -1) {
      // Clear path: it is free to go, so take it off the board straight away.
      arrow.mode = 'exiting';
      arrow.speed = EXIT_SPEED_START;
      arrow.cells.forEach(([x, y]) => { occ[y * n + x] = -1; });
      updateRemaining();
    } else {
      // Blocked: slide up to the blocking line, bump it, and slide back.
      const [bx, by] = arrow.ray[blockAt];
      arrow.mode = 'bumpOut';
      arrow.bumpTarget = blockAt + BUMP_OVERLAP;
      arrow.blocker = state.arrows[occ[by * n + bx]];
    }
  }

  function onBump(arrow) {
    arrow.flash = 1;
    if (arrow.blocker) arrow.blocker.flash = 1;
    state.lives = Math.max(0, state.lives - 1);
    renderLives(true);
    boardWrap.classList.remove('shake');
    void boardWrap.offsetWidth; // restart the CSS animation
    boardWrap.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(80);
    if (state.lives <= 0) state.over = true;
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
    let busy = false;
    for (const a of state.arrows) {
      if (a.flash > 0) a.flash = Math.max(0, a.flash - dt * 1.8);

      if (a.mode === 'exiting') {
        busy = true;
        a.speed += EXIT_ACCEL * dt;
        a.offset += a.speed * dt;
        if (a.offset >= a.len + a.ray.length + 1) a.mode = 'gone';
      } else if (a.mode === 'bumpOut') {
        busy = true;
        a.offset += BUMP_FORWARD_SPEED * dt;
        if (a.offset >= a.bumpTarget) {
          a.offset = a.bumpTarget;
          a.mode = 'bumpBack';
          onBump(a);
        }
      } else if (a.mode === 'bumpBack') {
        busy = true;
        a.offset -= BUMP_BACK_SPEED * dt;
        if (a.offset <= 0) {
          a.offset = 0;
          a.mode = 'idle';
        }
      }
    }

    if (busy || state.finished) return;

    if (state.over) {
      state.finished = true;
      setTimeout(showLoseDialog, 250);
    } else if (state.arrows.every((a) => a.mode === 'gone')) {
      state.finished = true;
      if (!isCompleted(state.index)) {
        progress.completed.push(state.index);
        saveProgress();
      }
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

  function draw() {
    const size = canvas.width / (window.devicePixelRatio || 1);
    const { cell, margin } = layout(size);
    const center = (v) => margin + (v + 0.5) * cell;
    ctx.clearRect(0, 0, size, size);

    // Grid dots
    ctx.fillStyle = colors.dot;
    for (let y = 0; y < state.n; y++) {
      for (let x = 0; x < state.n; x++) {
        ctx.beginPath();
        ctx.arc(center(x), center(y), cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw moving lines last so they appear on top.
    const order = state.arrows
      .filter((a) => a.mode !== 'gone')
      .sort((a, b) => (a.mode === 'idle' ? 0 : 1) - (b.mode === 'idle' ? 0 : 1));

    for (const a of order) {
      const pointAt = (p) => {
        const i = Math.max(0, Math.min(a.track.length - 2, Math.floor(p)));
        const f = p - i;
        const [x0, y0] = a.track[i];
        const [x1, y1] = a.track[i + 1];
        return [center(x0 + (x1 - x0) * f), center(y0 + (y1 - y0) * f)];
      };

      const start = a.offset;
      const end = a.offset + a.len - 1;
      const pts = [pointAt(start)];
      for (let i = Math.floor(start) + 1; i < end; i++) pts.push(pointAt(i));
      pts.push(pointAt(end));

      const base = colors.lines[a.colorIndex];
      const color = a.flash > 0 ? mix(base, colors.danger, Math.min(1, a.flash * 1.4)) : base;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = cell * 0.26;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();

      // Arrow head
      const [hx, hy] = pts[pts.length - 1];
      const [dx, dy] = DIRS[a.dir];
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

  // ---------- Lives ----------
  const HEART_PATH = 'M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.3 4c2.2 0 3.7 1.3 4.7 2.7h2C14 5.3 15.5 4 17.7 4c4.1 0 6 4.4 4.3 7.7C19.5 16.4 12 21 12 21z';

  function renderLives(animateLoss) {
    const el = $('lives');
    el.innerHTML = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.classList.add('heart');
      if (i >= state.lives) svg.classList.add('empty');
      if (animateLoss && i === state.lives) svg.classList.add('pop');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', HEART_PATH);
      svg.appendChild(path);
      el.appendChild(svg);
    }
    el.setAttribute('aria-label', `${state.lives} of ${MAX_LIVES} lives left`);
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
    const lost = MAX_LIVES - state.lives;
    const detail = lost === 0 ? 'Perfect: no lives lost!' : `You lost ${lost} ${lost === 1 ? 'life' : 'lives'}.`;
    if (i + 1 < LEVELS.length) {
      showDialog('Level complete!', detail, [
        { label: 'Next level', primary: true, action: () => startLevel(i + 1) },
        { label: 'Menu', action: goToMenu },
      ]);
    } else {
      showDialog('You beat every level!', `${detail} You untangled them all.`, [
        { label: 'Back to menu', primary: true, action: goToMenu },
        { label: 'Play this level again', action: () => startLevel(i) },
      ]);
    }
  }

  function showLoseDialog() {
    showDialog('Out of lives', 'A line got in the way one too many times. Look for arrows with a clear path first.', [
      { label: 'Try again', primary: true, action: () => startLevel(state.index) },
      { label: 'Menu', action: goToMenu },
    ]);
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
  canvas.addEventListener('pointerdown', handleTap);
  new ResizeObserver(resizeCanvas).observe(boardWrap);

  renderMenu();
  requestAnimationFrame(frame);
})();
