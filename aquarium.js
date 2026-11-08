/*
 * The aquarium: spend pearls (earned by finishing levels) on fish, plants
 * and decorations, and arrange them in your own tank.
 *
 *   ArrowAquarium.open()    shows the aquarium screen
 *
 * Fish swim about by themselves; plants sway; plants and decorations sit on
 * the sand and can be dragged along it. Tap an item to sell it back for half
 * its price. Everything is drawn as simple glowing outlines, like the rest of
 * the game (to be replaced by richer artwork later: each item's picture is
 * just its `svg` below).
 */
(function (root) {
  'use strict';
  const W = root.ArrowWallet;
  const cfg = (p) => root.ArrowConfig.get(p);
  const rand = (a, b) => a + Math.random() * (b - a);
  const motionOK = !root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = () => {
    const css = getComputedStyle(document.documentElement);
    return Array.from({ length: 10 }, (_, i) => css.getPropertyValue(`--c${i + 1}`).trim() || '#5ef2ff');
  };

  // ---------- What can go in the tank ----------
  // kind: fish (swims), plant (sways, on the sand) or decor (on the sand).
  // w: width as a share of the tank's width. ratio: height / width of its picture.
  // Fish face right in their pictures. mouth: where the mouth is, as a share of the picture's width and height.
  const CATALOG = [
    // Fish
    { id: 'guppy', kind: 'fish', mouth: [0.84, 0.5], name: 'Glow guppy', price: 60, w: 0.14, ratio: 34 / 60,
      svg: '<svg viewBox="0 0 60 34" class="aq-fish"><path class="tail" d="M16 17 L3 5 C7 13 7 21 3 29Z"/><path d="M14 17 C22 6 40 5 50 17 C40 29 22 28 14 17Z"/><path class="fin" d="M27 9 L33 3 L38 10"/><circle class="eye" cx="43" cy="15" r="2.2"/></svg>' },
    { id: 'tetra', kind: 'fish', mouth: [0.87, 0.5], name: 'Neon tetra', price: 80, w: 0.12, ratio: 26 / 60,
      svg: '<svg viewBox="0 0 60 26" class="aq-fish"><path class="tail" d="M12 13 L2 5 L5 13 L2 21Z"/><path d="M10 13 C20 4 42 4 52 13 C42 22 20 22 10 13Z"/><path class="stripe" d="M17 13 L46 13"/><circle class="eye" cx="45" cy="11" r="2"/></svg>' },
    { id: 'angel', kind: 'fish', mouth: [0.86, 0.5], name: 'Angelfish', price: 150, w: 0.14, ratio: 70 / 60,
      svg: '<svg viewBox="0 0 60 70" class="aq-fish"><path class="tail" d="M16 35 L5 27 L8 35 L5 43Z"/><path d="M30 22 L22 2 L41 20Z"/><path d="M30 48 L22 68 L41 50Z"/><path d="M14 35 C24 18 40 18 51 35 C40 52 24 52 14 35Z"/><path class="fin" d="M28 23 L28 47 M37 22 L37 48"/><circle class="eye" cx="44" cy="32" r="2.3"/></svg>' },
    { id: 'puffer', kind: 'fish', mouth: [0.8, 0.6], name: 'Puffer', price: 200, w: 0.13, ratio: 50 / 60,
      svg: '<svg viewBox="0 0 60 50" class="aq-fish"><path class="tail" d="M14 25 L3 17 L6 25 L3 33Z"/><circle cx="32" cy="25" r="16"/><path class="fin" d="M32 6 L32 2 M44 10 L47 7 M20 10 L17 7 M32 44 L32 48 M44 40 L47 43 M20 40 L17 43 M50 25 L54 25"/><circle class="eye" cx="40" cy="20" r="2.6"/><path class="fin" d="M44 30 Q47 32 44 34"/></svg>' },
    { id: 'seahorse', kind: 'fish', mouth: [0.99, 0.23], name: 'Seahorse', price: 220, w: 0.08, ratio: 70 / 40, bob: true,
      svg: '<svg viewBox="0 0 40 70" class="aq-fish"><path d="M18 8 C26 4 33 8 32 14 L40 16 L31 19 C34 30 31 40 22 46 C15 51 15 60 21 62 C26 63 27 57 23 56"/><path class="fin" d="M18 26 C12 28 11 36 16 38"/><circle class="eye" cx="25" cy="12" r="1.8"/></svg>' },
    { id: 'moonjelly', kind: 'fish', mouth: [0.5, 0.4], name: 'Moon jelly', price: 260, w: 0.11, ratio: 70 / 40, drifts: true,
      svg: '<svg viewBox="0 0 40 70" class="aq-fish aq-jelly"><path class="bell" d="M4 24 C4 6 36 6 36 24 C30 21 10 21 4 24Z"/><g class="tentacles"><path d="M10 24 C6 36 14 44 9 58"/><path d="M17 24 C14 38 21 48 16 66"/><path d="M24 24 C27 38 19 48 24 66"/><path d="M31 24 C35 36 27 44 31 58"/></g></svg>' },
    { id: 'turtle', kind: 'fish', mouth: [0.88, 0.5], name: 'Sea turtle', price: 450, w: 0.22, ratio: 56 / 90,
      svg: '<svg viewBox="0 0 90 56" class="aq-fish aq-turtle"><g class="flipper front"><path d="M56 17 C52 6 42 0 30 1 C38 7 45 13 48 19Z"/></g><g class="flipper back"><path d="M56 39 C52 50 42 56 30 55 C38 49 45 43 48 37Z"/></g><path d="M22 32 C16 38 10 40 6 40 C10 35 14 31 20 29Z"/><ellipse cx="42" cy="28" rx="24" ry="15"/><path class="fin" d="M26 28 L42 18 L58 28 L42 38Z M42 18 L42 38 M26 28 L58 28"/><circle cx="72" cy="27" r="7"/><circle class="eye" cx="75" cy="25" r="1.6"/></svg>' },
    { id: 'octopus', kind: 'fish', mouth: [0.5, 0.62], name: 'Octopus', price: 500, w: 0.14, ratio: 100 / 80, drifts: true,
      svg: '<svg viewBox="0 0 80 100" class="aq-fish aq-octo"><g class="arms"><path d="M22 50 C12 64 26 76 12 90"/><path d="M29 54 C24 70 36 82 27 96"/><path d="M37 56 C36 72 44 84 38 98"/><path d="M44 56 C46 72 38 84 45 98"/><path d="M51 54 C56 70 44 82 53 96"/><path d="M58 50 C68 64 54 76 68 90"/></g><path class="mantle" d="M40 6 C58 6 66 22 64 38 C62 50 52 56 40 56 C28 56 18 50 16 38 C14 22 22 6 40 6Z"/><circle class="eye" cx="32" cy="40" r="3.2"/><circle class="eye" cx="48" cy="40" r="3.2"/></svg>' },
    { id: 'manta', kind: 'fish', mouth: [0.88, 0.5], name: 'Manta ray', price: 600, w: 0.26, ratio: 50 / 100,
      svg: '<svg viewBox="0 0 100 50" class="aq-fish aq-manta"><path d="M88 25 C87 19 80 13 58 1 C56 12 48 20 36 25 C48 30 56 38 58 49 C80 37 87 31 88 25Z"/><path class="fin" d="M87 21 C91 20 94 18 96 16 M87 29 C91 30 94 32 96 34"/><path class="fin" d="M37 25 L4 24"/><circle class="eye" cx="84" cy="20" r="1.5"/><circle class="eye" cx="84" cy="30" r="1.5"/></svg>' },
    { id: 'shark', kind: 'fish', mouth: [0.94, 0.6], name: 'Reef shark', price: 900, w: 0.34, ratio: 76 / 200,
      svg: '<svg viewBox="0 0 200 76" class="aq-fish"><path class="tail" d="M34 42 L4 14 L14 42 L4 70Z"/><path d="M30 42 C60 28 120 22 160 30 C178 34 190 38 198 42 C188 46 176 50 160 52 C120 58 60 56 30 42Z"/><path d="M98 27 L116 3 L128 28Z"/><path d="M122 52 L104 72 L134 53Z"/><path class="fin" d="M150 36 L148 46 M155 35 L153 46 M160 35 L158 46"/><circle class="eye" cx="177" cy="38" r="2.4"/></svg>' },

    // Plants (they sway)
    { id: 'seagrass', kind: 'plant', name: 'Seagrass', price: 50, w: 0.14, ratio: 1.8,
      svg: '<svg viewBox="0 0 40 72" class="aq-plant"><g class="blade b1"><path d="M14 72 C12 52 18 34 10 10"/></g><g class="blade b2"><path d="M20 72 C22 50 16 30 22 2"/></g><g class="blade b3"><path d="M26 72 C28 54 24 40 32 18"/></g></svg>' },
    { id: 'fern', kind: 'plant', name: 'Water fern', price: 90, w: 0.16, ratio: 1.3,
      svg: '<svg viewBox="0 0 50 65" class="aq-plant"><g class="blade b1"><path d="M25 65 L25 10"/><path d="M25 50 L12 42 M25 50 L38 42 M25 38 L14 30 M25 38 L36 30 M25 26 L17 19 M25 26 L33 19"/><path d="M25 10 C22 6 28 4 25 2"/></g></svg>' },
    { id: 'kelp', kind: 'plant', name: 'Tall kelp', price: 120, w: 0.13, ratio: 3.2,
      svg: '<svg viewBox="0 0 30 96" class="aq-plant aq-kelp"><g class="seg s1"><path d="M15 96 C11 84 19 76 15 64"/><path class="leaf" d="M15 78 C22 74 26 70 26 64 C21 66 17 70 15 74Z"/><g class="seg s2"><path d="M15 64 C11 52 19 44 15 32"/><path class="leaf" d="M15 46 C8 42 4 38 4 32 C9 34 13 38 15 42Z"/><g class="seg s3"><path d="M15 32 C12 22 18 12 14 2"/><path class="leaf" d="M15 16 C22 12 26 8 25 2 C20 4 16 8 15 12Z"/></g></g></g></svg>' },
    { id: 'anemone', kind: 'plant', name: 'Anemone', price: 160, w: 0.17, ratio: 0.9,
      svg: '<svg viewBox="0 0 60 54" class="aq-plant aq-anemone"><g class="tentacle t1"><path d="M22 34 C16 24 12 16 8 8"/></g><g class="tentacle t2"><path d="M26 32 C24 20 22 12 22 3"/></g><g class="tentacle t3"><path d="M30 32 C31 20 32 12 34 2"/></g><g class="tentacle t4"><path d="M34 32 C38 22 42 14 48 6"/></g><g class="tentacle t5"><path d="M38 34 C44 26 50 22 56 16"/></g><path d="M14 54 C14 40 22 32 30 32 C38 32 46 40 46 54Z"/></svg>' },

    // Decorations
    { id: 'shell', kind: 'decor', name: 'Spiral shell', price: 40, w: 0.1, ratio: 0.8,
      svg: '<svg viewBox="0 0 50 40" class="aq-decor"><path d="M6 38 C4 22 16 6 32 8 C46 10 50 26 40 34 C32 40 22 34 24 26 C26 20 34 20 34 26"/><path class="fin" d="M4 38 L46 38"/></svg>' },
    { id: 'starfish', kind: 'decor', name: 'Starfish', price: 50, w: 0.09, ratio: 0.95, sticks: true,
      svg: '<svg viewBox="0 0 50 48" class="aq-decor"><path d="M25 2 L31 18 L48 18 L34 28 L40 46 L25 35 L10 46 L16 28 L2 18 L19 18Z"/><circle class="fin" cx="25" cy="24" r="3"/></svg>' },
    { id: 'rockarch', kind: 'decor', name: 'Rock arch', price: 120, w: 0.22, ratio: 0.6,
      svg: '<svg viewBox="0 0 80 48" class="aq-decor aq-rock"><path d="M4 48 C2 22 18 6 40 6 C62 6 78 22 76 48 L60 48 C60 32 52 22 40 22 C28 22 20 32 20 48Z"/><path class="fin" d="M18 14 C22 12 26 12 28 14 M50 12 C54 11 58 12 60 15"/></svg>' },
    { id: 'coral', kind: 'decor', name: 'Fan coral', price: 150, w: 0.14, ratio: 1,
      svg: '<svg viewBox="0 0 60 60" class="aq-decor aq-coral"><path d="M30 60 L30 36 M30 44 L18 30 M30 40 L42 26 M18 30 L10 18 M18 30 L22 14 M42 26 L50 14 M42 26 L38 10 M30 36 L30 20 M30 20 L26 6 M30 20 L34 4"/><circle cx="10" cy="18" r="2.5"/><circle cx="22" cy="14" r="2.5"/><circle cx="50" cy="14" r="2.5"/><circle cx="38" cy="10" r="2.5"/><circle cx="26" cy="6" r="2.5"/><circle cx="34" cy="4" r="2.5"/></svg>' },
    { id: 'anchor', kind: 'decor', name: 'Old anchor', price: 250, w: 0.14, ratio: 1.15,
      svg: '<svg viewBox="0 0 52 60" class="aq-decor"><circle cx="26" cy="7" r="5"/><path d="M26 12 L26 56 M16 20 L36 20"/><path d="M6 40 C8 52 18 57 26 56 C34 57 44 52 46 40"/><path d="M6 40 L2 44 M6 40 L11 43 M46 40 L50 44 M46 40 L41 43"/></svg>' },
    { id: 'chest', kind: 'decor', name: 'Treasure chest', price: 300, w: 0.16, ratio: 0.78,
      svg: '<svg viewBox="0 0 64 50" class="aq-decor aq-chest"><g class="bubbles"><circle cx="30" cy="14" r="2.5"/><circle cx="36" cy="10" r="1.8"/><circle cx="27" cy="6" r="1.4"/></g><path d="M6 26 L58 26 L56 50 L8 50Z"/><g class="lid"><path d="M6 26 C6 14 14 10 32 10 C50 10 58 14 58 26Z"/></g><path class="fin" d="M28 30 L36 30 L36 38 L28 38Z M6 34 L58 34"/></svg>' },
  ];
  const byId = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
  const priceOf = (c) => {
    const override = cfg('aquariumPrices') || {};
    return override[c.id] !== undefined ? override[c.id] : c.price;
  };
  const LIMITS = { fish: 12, plant: 10, decor: 10 };
  const KIND_NAMES = { fish: 'Fish', plant: 'Plants', decor: 'Decorations' };

  // ---------- The screen ----------
  const app = document.getElementById('app') || document.body;
  const screen = document.createElement('section');
  screen.id = 'aquarium';
  screen.className = 'screen';
  screen.setAttribute('aria-label', 'Aquarium');
  screen.innerHTML = `
    <header class="aq-head">
      <button id="aqBack" class="btn ghost icon-btn aq-back" aria-label="Back to the menu" title="Back">&#8592;</button>
      <h2>My aquarium</h2>
      <button id="aqPearls" class="pearl-chip" title="Get more pearls"><span class="pearl" aria-hidden="true"></span><span class="pearl-count">0</span></button>
    </header>
    <div class="tank" id="tank">
      <div class="tank-rays" aria-hidden="true"></div>
      <svg class="tank-sand" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 C40 12 80 18 120 14 C170 9 210 20 260 16 C310 12 350 20 400 14 L400 60 L0 60Z"/><path class="sand-ripple" d="M20 34 C60 30 90 36 130 32 M200 40 C240 36 270 42 310 38 M90 50 C130 46 160 52 200 48"/></svg>
      <div class="tank-items" id="tankItems"></div>
      <div class="tank-bubbles" aria-hidden="true"><span style="--x:12%;--t:7s;--d:-1s"></span><span style="--x:30%;--t:9s;--d:-4s"></span><span style="--x:58%;--t:6s;--d:-2s"></span><span style="--x:77%;--t:8s;--d:-6s"></span><span style="--x:90%;--t:10s;--d:-3s"></span></div>
    </div>
    <p class="aq-tip">Drag to move fish, plants and decor. Tap and hold to sell.</p>
    <nav class="aq-bar" aria-label="Buy for your aquarium">
      <button class="action-btn" data-cat="fish"><span class="aq-bar-icon" aria-hidden="true">🐟</span><span>Fish</span></button>
      <button class="action-btn" data-cat="plant"><span class="aq-bar-icon" aria-hidden="true">🌿</span><span>Plants</span></button>
      <button class="action-btn" data-cat="decor"><span class="aq-bar-icon" aria-hidden="true">🐚</span><span>Decor</span></button>
      <button class="action-btn" id="aqFeed"><span class="aq-bar-icon" aria-hidden="true">🦐</span><span>Feed</span></button>
    </nav>`;
  // Before the dialogs so they stay on top.
  const firstOverlay = app.querySelector('.overlay');
  app.insertBefore(screen, firstOverlay || null);
  const tank = screen.querySelector('#tank');
  const layer = screen.querySelector('#tankItems');

  const menuPearls = document.getElementById('menuPearls');
  const showPearls = () => {
    const n = W.pearls().toLocaleString();
    screen.querySelector('.pearl-count').textContent = n;
    if (menuPearls) menuPearls.textContent = n;
  };
  showPearls();
  W.onChange(showPearls);

  // ---------- How each kind of fish moves ----------
  // speed/accel in tank-widths per second; zone: the band of the tank (0 top, 1 sand) it likes;
  // school: same-kind fish stick together (spread: how far apart, in body lengths);
  // pause: stops now and then; wide: picks far-off targets (long, slow crossings).
  const MOVES = {
    guppy: { speed: 0.2, accel: 0.5, zone: [0.1, 0.75], school: true, spread: 1.1, retarget: [0.8, 2], darts: true },
    tetra: { speed: 0.17, accel: 0.45, zone: [0.15, 0.7], school: true, spread: 0.8, retarget: [1.5, 3] },
    angel: { speed: 0.06, accel: 0.08, zone: [0.2, 0.62], school: true, spread: 1.6, retarget: [3, 6], pause: [1, 3] },
    puffer: { speed: 0.05, accel: 0.12, zone: [0.35, 0.8], retarget: [2, 4], pause: [1.5, 4], puffs: true },
    seahorse: { speed: 0.03, accel: 0.06, zone: [0.55, 0.85], retarget: [4, 8], pause: [2, 5], nearPlants: true, school: true, spread: 0.7, catchUp: 2.5 },
    moonjelly: { jelly: true },
    turtle: { speed: 0.07, accel: 0.05, zone: [0.05, 0.7], wide: true, retarget: [5, 9], tilt: 1 },
    octopus: { octo: true },
    manta: { speed: 0.08, accel: 0.06, zone: [0.15, 0.6], wide: true, retarget: [5, 9], swoop: true },
    shark: { speed: 0.11, accel: 0.07, zone: [0.1, 0.55], patrol: true, retarget: [6, 10] },
  };
  const DEFAULT_MOVE = { speed: 0.08, accel: 0.15, zone: [0.15, 0.7], retarget: [2, 5] };

  let fish = [];
  // Food sinking in the tank ({ x, y, vy, el, life }), and the finger the fish follow ({ x, y } or null).
  let food = [];
  let lure = null;
  // Seconds left of "feeding time" after the Feed button: everyone heads for the surface.
  let feedTime = 0;
  let raf = 0;
  let last = 0;

  function sizeOf(c) {
    const tw = tank.clientWidth;
    const w = c.w * tw;
    return [w, w * c.ratio];
  }
  // A steady per-item number in [0, 1) (so things don't jump about between redraws).
  const steady = (uid, salt) => ((Math.sin(uid * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

  /** Draws everything in the tank afresh. */
  function render() {
    layer.innerHTML = '';
    fish = [];
    food = [];
    const colors = palette();
    const tw = tank.clientWidth, th = tank.clientHeight;
    const sand = th * 0.1;
    const items = W.tank().items.filter((i) => byId[i.type]);
    // Plants and decorations first (behind the fish).
    for (const item of items.filter((i) => byId[i.type].kind !== 'fish')) {
      const c = byId[item.type];
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = `aq-item aq-${c.kind}-item${c.sticks ? ' aq-sticker' : ''}`;
      const left = item.x * (tw - w);
      const place = c.sticks && item.y != null
        ? `top:${item.y * (th - h)}px`
        : `bottom:${sand * (0.35 + 0.4 * steady(item.uid, 1))}px`;
      el.style.cssText = `width:${w}px;height:${h}px;left:${left}px;${place};color:${colors[item.color % colors.length]}`;
      el.innerHTML = c.svg;
      if (c.sticks) el.firstElementChild.style.transform = `rotate(${Math.round(steady(item.uid, 2) * 72)}deg)`;
      el.dataset.uid = item.uid;
      el.querySelectorAll('.blade, .seg, .tentacle').forEach((g) => { g.style.animationDelay = `${(-3 * steady(item.uid, 3 + g.getAttribute('class').length)).toFixed(2)}s`; });
      layer.appendChild(el);
      makeDraggable(el, item, w, h, !!c.sticks);
    }
    const plantsX = items.filter((i) => byId[i.type].kind === 'plant').map((i) => i.x);
    for (const item of items.filter((i) => byId[i.type].kind === 'fish')) {
      const c = byId[item.type];
      const m = MOVES[c.id] || DEFAULT_MOVE;
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = 'aq-item aq-fish-item';
      el.style.cssText = `width:${w}px;height:${h}px;color:${colors[item.color % colors.length]}`;
      el.innerHTML = `<div class="aq-facing">${c.svg}</div>`;
      layer.appendChild(el);
      const zoneY = (z) => Math.min(th * 0.9 - h / 2, Math.max(h / 2, th * z));
      const f = {
        el, c, m, item, w, h, plantsX,
        x: w / 2 + item.x * (tw - w), y: zoneY(rand(m.zone ? m.zone[0] : 0.3, m.zone ? m.zone[1] : 0.6)),
        vx: (Math.random() < 0.5 ? -1 : 1) * 10, vy: 0,
        dir: 1, tilt: 0, puff: 1, puffT: rand(4, 10), flipCd: 0,
        wait: 0, timer: 0, tx: 0, ty: 0,
        phase: rand(0, Math.PI * 2),
        jet: 0, // octopus: >0 while jetting upwards
        offset: [rand(-1, 1), rand(-1, 1)],
      };
      f.dir = f.vx > 0 ? 1 : -1;
      newTarget(f, tw, th);
      makeFishDraggable(f);
      fish.push(f);
    }
    // Schools: the first fish of each schooling kind leads; the rest follow it.
    const leaders = {};
    for (const f of fish) {
      if (!f.m.school) continue;
      if (!leaders[f.c.id]) leaders[f.c.id] = f;
      else f.leader = leaders[f.c.id];
    }
    showPearls();
  }

  /** Picks somewhere new for a fish to head for. */
  function newTarget(f, tw, th) {
    const m = f.m;
    const minX = f.w / 2, maxX = tw - f.w / 2;
    const minY = f.h / 2, maxY = th * 0.9 - f.h / 2;
    const band = m.zone || [0.2, 0.7];
    let tx = rand(minX, maxX);
    if (m.wide || m.patrol) tx = f.x < tw / 2 ? rand(tw * 0.75, maxX) : rand(minX, tw * 0.25);
    if (m.nearPlants && f.plantsX.length) tx = f.plantsX[Math.floor(Math.random() * f.plantsX.length)] * tw + rand(-20, 20);
    if (m.darts && Math.random() < 0.5) tx = f.x + rand(-0.25, 0.25) * tw;
    f.tx = Math.min(maxX, Math.max(minX, tx));
    f.ty = Math.min(maxY, Math.max(minY, th * rand(band[0], band[1])));
    if (m.patrol) f.ty = Math.min(maxY, Math.max(minY, f.y + rand(-0.08, 0.08) * th));
    f.timer = rand(...(m.retarget || [2, 5]));
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const tw = tank.clientWidth, th = tank.clientHeight;
    const floor = th * 0.9;
    if (feedTime > 0) feedTime -= dt;
    for (const f of fish) {
      const m = f.m;
      f.phase += dt;
      if (motionOK && !f.held) {
        if (m.jelly) {
          // Pulses upwards in little pushes, then sinks slowly.
          f.timer -= dt;
          if (f.timer <= 0) { f.vy = f.y < th * 0.15 ? 4 : -rand(35, 55); f.timer = 2.2; }
          f.vy = Math.min(10, f.vy + 30 * dt);
          f.vx = Math.sin(f.phase * 0.35) * 8;
        } else if (m.octo) {
          // Creeps along the sand, and now and then jets up and floats back down.
          if (f.jet > 0) {
            f.jet -= dt;
            f.vy = Math.min(14, f.vy + 50 * dt);
            if (f.y >= floor - f.h / 2 - 1 && f.vy > 0) f.jet = 0;
          } else {
            f.timer -= dt;
            if (f.timer <= 0) { f.tx = rand(f.w / 2, tw - f.w / 2); f.timer = rand(4, 8); }
            const snack = !f.full && nearestFood(f);
            if (lure) f.tx = lure.x;
            else if (snack) {
              f.tx = snack.x;
              // It waits under falling food and grabs it as it reaches its mouth.
              const [ex, ey] = mouthOf(f);
              if (Math.abs(ex - snack.x) < f.w * 0.25 && Math.abs(ey - snack.y) < f.h * 0.15) eat(f, snack);
            }
            f.vx += Math.max(-8 * dt, Math.min(8 * dt, Math.sign(f.tx - f.x) * 12 - f.vx));
            if (Math.abs(f.tx - f.x) < 4) f.vx *= 0.9;
            f.vy = Math.min(14, f.vy + 30 * dt);
            if (Math.random() < dt * 0.06) { f.jet = 6; f.vy = -rand(90, 130); f.vx = rand(-30, 30); }
          }
        } else if (f.scared > 0) {
          // Darting away in a fright, zig-zagging, faster than it ever swims.
          f.scared -= dt;
          f.zig -= dt;
          if (f.zig <= 0) { f.zig = rand(0.12, 0.3); f.fleeA += rand(-0.8, 0.8); }
          const fast = tw * (0.55 + 0.3 * (f.w / tw < 0.15 ? 1 : 0));
          f.vx += (Math.cos(f.fleeA) * fast - f.vx) * Math.min(1, dt * 8);
          f.vy += (Math.sin(f.fleeA) * fast * 0.7 - f.vy) * Math.min(1, dt * 8);
          // Bounce off the glass.
          if ((f.x <= f.w / 2 + 1 && f.vx < 0) || (f.x >= tw - f.w / 2 - 1 && f.vx > 0)) f.fleeA = Math.PI - f.fleeA;
          if ((f.y <= f.h / 2 + 1 && f.vy < 0) || (f.y >= floor - f.h / 2 - 1 && f.vy > 0)) f.fleeA = -f.fleeA;
          if (f.scared <= 0) { f.el.classList.remove('scared'); f.wait = 0; newTarget(f, tw, th); }
        } else {
          const speed = m.speed * tw, accel = m.accel * tw;
          let gx, gy, boost = 1;
          const snack = !lure && !f.full && nearestFood(f);
          if (lure) {
            // Following the finger: gather round it, each in its own spot.
            gx = lure.x + f.offset[0] * f.w * 0.9; gy = lure.y + f.offset[1] * f.h * 1.2;
            boost = 1.7;
          } else if (snack) {
            // Food! Swim over, mouth first, and eat it.
            if (snack !== f.snack) {
              f.snack = snack; f.snackT = 0;
              f.side = f.x < snack.x ? 1 : -1;
              // Come at it from the other side if the glass is in the way.
              const reach = (mouthOf(f, f.side)[0] - f.x);
              const cx = snack.x - reach;
              if (cx < f.w / 2 || cx > tw - f.w / 2) f.side = -f.side;
            }
            // Can't get it after a while? Leave it for someone else.
            f.snackT += dt;
            if (f.snackT > 5) { f.skip = snack; snack.claimedBy = null; f.snack = null; }
            // Aim so the mouth (not the middle) arrives at the flake.
            const [mx, my] = mouthOf(f, f.side);
            gx = snack.x - (mx - f.x); gy = snack.y - (my - f.y);
            boost = feedTime > 0 ? Math.min(6, Math.max(2.2, 0.16 / m.speed)) : 1.5;
            const [ex, ey] = mouthOf(f);
            if (Math.hypot(ex - snack.x, ey - snack.y) < 4) eat(f, snack);
          } else if (feedTime > 0) {
            // Feeding time: up to the surface, even if full (just in case).
            gx = f.x + f.offset[0] * f.w; gy = th * 0.03 + f.h * (0.5 + Math.abs(f.offset[1]) * 0.6);
            boost = Math.min(6, Math.max(2.2, 0.16 / m.speed));
          } else if (f.leader && !f.leader.held && !(f.leader.scared > 0)) {
            // Followers keep their own spot near the leader (behind it, a little to the side).
            const s = f.w * (m.spread || 1);
            gx = f.leader.x - f.leader.dir * s * (0.6 + Math.abs(f.offset[0])) ;
            gy = f.leader.y + f.offset[1] * s * 0.9;
          } else {
            f.timer -= dt;
            if (f.wait > 0) { f.wait -= dt; gx = f.x; gy = f.y; }
            else {
              if (f.timer <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < f.w * 0.3) {
                if (m.pause && f.timer > 0) f.wait = rand(...m.pause);
                newTarget(f, tw, th);
              }
              gx = f.tx; gy = f.ty;
            }
          }
          if (m.swoop) gy += Math.sin(f.phase * 0.8) * th * 0.06;
          // Steer towards the goal, slowing on arrival.
          const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy) || 1;
          const want = Math.min(speed * Math.max(boost, f.leader && boost === 1 ? m.catchUp || 1.4 : 1), Math.max(d * 2.5, snack ? 30 : 0));
          let ax = (dx / d) * want - f.vx, ay = (dy / d) * want * (boost > 1 ? 1 : 0.7) - f.vy;
          // Keep a little space from the others, and steer round fish ahead.
          for (const o of fish) {
            if (o === f) continue;
            const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy);
            const room = o.c === f.c ? f.w * 0.8 : (f.w + o.w) * 0.45 + (f.h + o.h) * 0.2;
            if (od > 0 && od < room) {
              // (A fish about to eat barely gives way.)
              const push = (1 - od / room) * speed * (o.c === f.c ? 0.8 : 1.6) * (snack && d < f.w ? 0.2 : 1);
              ax += (ox / od) * push; ay += (oy / od) * push * 1.3;
            }
          }
          const a = Math.hypot(ax, ay), lim = accel * Math.min(4, Math.max(1, boost * 1.5)) * dt;
          if (a > lim) { ax *= lim / a; ay *= lim / a; }
          f.vx += ax; f.vy += ay;
          if (m.darts && Math.random() < dt * 0.3 && !f.leader) { f.vx *= 2.2; }
          // Puffers puff up now and then.
          if (m.puffs) {
            f.puffT -= dt;
            if (f.puffT <= 0) { f.puffT = rand(6, 12); f.puffing = 2.5; }
            if (f.puffing > 0) f.puffing -= dt;
            const goal = f.puffing > 0 ? 1.35 : 1;
            f.puff += (goal - f.puff) * Math.min(1, dt * 6);
          }
        }
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.x = Math.min(tw - f.w / 2, Math.max(f.w / 2, f.x));
        f.y = Math.min(floor - f.h / 2, Math.max(f.h / 2, f.y));
      }
    }
    collide(dt);
    updateFood(dt, tw, th);
    for (const f of fish) {
      const m = f.m;
      if (!f.held) {
        f.x = Math.min(tw - f.w / 2, Math.max(f.w / 2, f.x));
        f.y = Math.min(floor - f.h / 2, Math.max(f.h / 2, f.y));
      }
      // Turn round only when really heading the other way.
      if (!m.jelly && !m.octo) {
        // Only turn round when properly swimming the other way, and not too often.
        if (f.flipCd > 0) f.flipCd -= dt;
        const turnAt = Math.max(8, m.speed ? m.speed * tw * 0.25 : 8);
        let want = f.vx > turnAt ? 1 : f.vx < -turnAt ? -1 : f.dir;
        // Right by its food: face it, so the mouth meets it.
        if (f.snack && !f.snack.eaten && f.side && Math.hypot(f.snack.x - f.x, f.snack.y - f.y) < f.w * 1.2) want = f.side;
        if (want !== f.dir && (f.flipCd <= 0 || f.scared > 0 || f.held)) { f.dir = want; f.flipCd = 0.6; }
        const goalTilt = Math.max(-22, Math.min(22, Math.atan2(f.vy, Math.abs(f.vx) + 8) * 180 / Math.PI)) * (m.tilt || 0.8);
        f.tilt += (goalTilt - f.tilt) * Math.min(1, dt * 4);
      }
      const bob = m.nearPlants ? Math.sin(f.phase * 1.6) * 5 : m.jelly || m.octo ? 0 : Math.sin(f.phase * 1.1) * 2;
      f.bobY = bob;
      f.el.style.transform = `translate(${f.x - f.w / 2}px, ${f.y - f.h / 2 + bob}px)`;
      if (f.gulp > 0) f.gulp -= dt;
      const gulp = f.gulp > 0 ? 1 + Math.sin((0.25 - f.gulp) / 0.25 * Math.PI) * 0.12 : 1;
      f.gulpScale = gulp;
      f.el.firstElementChild.style.transform = `scaleX(${f.dir}) rotate(${f.tilt}deg) scale(${f.puff * gulp})`;
    }
    raf = screen.classList.contains('active') ? requestAnimationFrame(frame) : 0;
  }

  // ---------- Feeding ----------
  const MAX_FOOD = 40;
  function dropFood(x, y, n) {
    const colors = ['#ffb03a', '#ff7a59', '#ffd166', '#c98b4f'];
    for (let i = 0; i < n && food.length < MAX_FOOD; i++) {
      const el = document.createElement('div');
      el.className = 'aq-food';
      el.style.background = colors[i % colors.length];
      layer.appendChild(el);
      food.push({ x: x + rand(-18, 18), y: y + rand(-6, 6), vy: rand(14, 24), sway: rand(0, 6), el, life: 8, age: 0 });
    }
    if (root.ArrowAudio) root.ArrowAudio.play('sprinkle');
  }
  function updateFood(dt, tw, th) {
    const sand = th * 0.92;
    for (const p of food) {
      p.sway += dt * 2;
      // Food that lands on the sand fades away after a few seconds (and nothing lingers more than half a minute).
      p.age += dt;
      if (p.y < sand) { p.y += p.vy * dt; p.x += Math.sin(p.sway) * 6 * dt; }
      else { p.life -= dt; }
      if (p.age > 30) p.life = Math.min(p.life, 3 - (p.age - 30));
      p.x = Math.min(tw - 3, Math.max(3, p.x));
      p.el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px)`;
      p.el.style.opacity = Math.min(1, p.life / 3);
    }
    food = food.filter((p) => { if (p.life > 0 && !p.eaten) return true; p.el.remove(); return false; });
    for (const f of fish) {
      if (f.full > 0) { f.full -= dt; if (f.full <= 0) { f.full = 0; f.ate = 0; } }
    }
  }
  /** Where a fish's mouth is right now, if it faced `dir` (follows its tilt, puffing and bobbing). */
  function mouthOf(f, dir = f.dir) {
    const [mx, my] = f.c.mouth || [0.85, 0.5];
    const s = (f.puff || 1) * (f.gulpScale || 1);
    const px = (mx - 0.5) * f.w * s, py = (my - 0.5) * f.h * s;
    const t = ((f.tilt || 0) * Math.PI) / 180;
    return [f.x + dir * (px * Math.cos(t) - py * Math.sin(t)), f.y + (f.bobY || 0) + px * Math.sin(t) + py * Math.cos(t)];
  }

  /** The closest bit of food this fish could go for (fish go for different bits). */
  function nearestFood(f) {
    // Sticks with the flake it's already after, unless someone else got it.
    if (f.snack && !f.snack.eaten && f.snack.life > 0 && food.includes(f.snack) && f.snack.claimedBy === f) return f.snack;
    let best = null, bd = Infinity;
    for (const p of food) {
      if (p.eaten || p === f.skip) continue;
      const taken = p.claimedBy && p.claimedBy !== f && !p.claimedBy.full && p.claimedBy.snack === p;
      const d = Math.hypot(p.x - f.x, p.y - f.y) + (taken ? 200 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) best.claimedBy = f;
    return best;
  }
  function eat(f, p) {
    p.eaten = true;
    // The first feed of the day earns a few pearls.
    const n = W.takeFeedPearls();
    if (n) toast(`Thanks for feeding your fish! +${n} pearls`);
    f.ate = (f.ate || 0) + 1;
    // A few bites and it's full for a while (bigger fish eat more).
    if (f.ate >= 3 + Math.round(f.c.w * 10)) f.full = rand(25, 40);
    f.gulp = 0.25;
    if (root.ArrowAudio && Math.random() < 0.6) root.ArrowAudio.play('nibble');
  }

  // Tap the water to drop food; drag through it and the fish follow your finger.
  (function waterTouches() {
    let start = null;
    const at = (e) => { const r = tank.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    tank.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.aq-item')) return;
      e.preventDefault();
      tank.setPointerCapture(e.pointerId);
      start = { ...at(e), moved: 0 };
    });
    tank.addEventListener('pointermove', (e) => {
      if (!start) return;
      const p = at(e);
      start.moved = Math.max(start.moved, Math.hypot(p.x - start.x, p.y - start.y));
      if (start.moved >= 8) lure = p;
    });
    const end = (e) => {
      if (!start) return;
      if (start.moved < 8) { const p = at(e); dropFood(p.x, Math.min(p.y, tank.clientHeight * 0.85), 5); }
      start = null;
      lure = null;
    };
    tank.addEventListener('pointerup', end);
    tank.addEventListener('pointercancel', end);
  })();

  // ---------- Bumping into each other ----------
  // Fish are treated as ellipses a little smaller than their pictures.
  const body = (f) => [f.w * 0.42 * (f.puff || 1), f.h * 0.38 * (f.puff || 1)];
  const sizeScore = (f) => f.w * f.h * (f.puff || 1);

  /** Pushes overlapping fish apart, and lets them react to the bump. */
  function collide(dt) {
    for (const f of fish) if (f.bumpCd > 0) f.bumpCd -= dt;
    for (let i = 0; i < fish.length; i++) {
      for (let j = i + 1; j < fish.length; j++) {
        const a = fish[i], b = fish[j];
        const [arx, ary] = body(a), [brx, bry] = body(b);
        const dx = b.x - a.x, dy = b.y - a.y;
        // Overlap of two ellipses, roughly: distance in "sum of radii" units.
        const rx = arx + brx, ry = ary + bry;
        const n = Math.hypot(dx / rx, dy / ry);
        if (n >= 1) continue;
        const d = Math.hypot(dx, dy) || 0.01;
        const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
        const depth = (1 - n) * Math.hypot(rx * ux, ry * uy);
        // The bigger (or the one being held) barely moves; the smaller one gets shoved.
        const sa = a.held ? 1e9 : sizeScore(a), sb = b.held ? 1e9 : sizeScore(b);
        const ka = sb / (sa + sb), kb = sa / (sa + sb);
        a.x -= ux * depth * ka; a.y -= uy * depth * ka;
        b.x += ux * depth * kb; b.y += uy * depth * kb;
        // Knock their speeds apart along the line between them.
        const rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
        if (rel < 0) {
          a.vx += ux * rel * ka * 1.2; a.vy += uy * rel * ka * 1.2;
          b.vx -= ux * rel * kb * 1.2; b.vy -= uy * rel * kb * 1.2;
        }
        react(a, b, sa, sb);
        react(b, a, sb, sa);
      }
    }
  }

  /** What a fish does when it bumps into another. */
  function react(f, o, mine, theirs) {
    if (f.held || f.bumpCd > 0 || f.m.jelly) return;
    f.bumpCd = rand(0.8, 1.5);
    if (f.m.octo) { if (theirs > mine * 1.5 && Math.random() < 0.5) { f.jet = 6; f.vy = -110; } return; }
    if (o.c === f.c && f.m.school) return; // schoolmates just jostle
    if (f.m.puffs) { f.puffing = 2.5; return; } // a bumped puffer puffs up
    if (theirs > mine * 2 || o.c.id === 'shark') {
      // Startled by something bigger: dart away (and the school with it).
      f.scared = rand(0.6, 1); f.zig = 0;
      f.fleeA = Math.atan2(f.y - o.y, f.x - o.x) + rand(-0.3, 0.3);
      f.el.classList.add('scared');
    } else if (!f.leader) {
      // About the same size: turn and go somewhere else.
      f.wait = 0;
      newTarget(f, tank.clientWidth, tank.clientHeight);
      if (Math.sign(f.tx - f.x) === Math.sign(o.x - f.x)) f.tx = Math.min(tank.clientWidth - f.w / 2, Math.max(f.w / 2, f.x - (f.tx - f.x)));
    }
  }

  /** A fright: the fish (and its school) dart away from (px, py), in tank coordinates. */
  function scare(f, px, py) {
    const flee = (o, delay) => {
      const go = () => {
        if (o.m.jelly) { o.vy = -70; o.timer = 2.2; return; }
        if (o.m.octo) { o.jet = 6; o.vy = -150; o.vx = (o.x < px ? -1 : 1) * 50; return; }
        o.scared = rand(1.2, 1.8);
        o.zig = 0;
        o.fleeA = Math.atan2(o.y - py, o.x - px) + rand(-0.4, 0.4);
        o.el.classList.add('scared');
      };
      if (delay) setTimeout(go, delay); else go();
    };
    flee(f, 0);
    for (const o of fish) if (o !== f && o.c === f.c && f.m.school) flee(o, rand(60, 220));
    if (root.ArrowAudio) root.ArrowAudio.play('flee', { size: Math.max(f.w, f.h) });
  }

  // Tap a fish to startle it; drag one to move it; press and hold to sell it.
  function makeFishDraggable(f) {
    const el = f.el;
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, moved: 0, menu: false };
      start.hold = setTimeout(() => {
        if (!start || start.moved >= 6) return;
        start.menu = true;
        f.held = false;
        el.classList.remove('dragging');
        itemMenu(f.item);
      }, 600);
      f.held = true;
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start || start.menu) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start.moved = Math.max(start.moved, Math.hypot(dx, dy));
      if (start.moved < 6) return;
      f.x = start.fx + dx; f.y = start.fy + dy;
      f.vx = 0; f.vy = 0;
    });
    const end = (e) => {
      if (!start) return;
      clearTimeout(start.hold);
      el.classList.remove('dragging');
      f.held = false;
      if (start.menu) { /* the sell sheet is open */ }
      else if (start.moved < 6) {
        const r = tank.getBoundingClientRect();
        scare(f, (e.clientX || start.x) - r.left, (e.clientY || start.y) - r.top);
      } else {
        // Let go: off it goes from here (a follower may become a leader for a while).
        f.wait = 0;
        newTarget(f, tank.clientWidth, tank.clientHeight);
        if (f.m.octo) { f.jet = 0; }
      }
      start = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Plants and decorations slide along the sand (starfish stick anywhere, even
  // on the glass); press and hold (no slide) offers to sell.
  function makeDraggable(el, item, w, h, free) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      if (free && !el.style.top) { el.style.top = `${el.offsetTop}px`; el.style.bottom = ''; }
      start = { x: e.clientX, y: e.clientY, left: parseFloat(el.style.left), top: parseFloat(el.style.top), moved: 0, menu: false };
      start.hold = setTimeout(() => {
        if (!start || start.moved >= 6) return;
        start.menu = true;
        el.classList.remove('dragging');
        itemMenu(item);
      }, 600);
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start || start.menu) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start.moved = Math.max(start.moved, free ? Math.hypot(dx, dy) : Math.abs(dx));
      const tw = tank.clientWidth, th = tank.clientHeight;
      el.style.left = `${Math.max(0, Math.min(tw - w, start.left + dx))}px`;
      if (free) el.style.top = `${Math.max(0, Math.min(th - h, start.top + dy))}px`;
    });
    const end = () => {
      if (!start) return;
      el.classList.remove('dragging');
      clearTimeout(start.hold);
      const tw = tank.clientWidth, th = tank.clientHeight;
      if (start.menu || start.moved < 6) { /* held: the sell sheet is open; tapped: nothing to do */ }
      else {
        const x = tw > w ? parseFloat(el.style.left) / (tw - w) : 0.5;
        W.moveInTank(item.uid, x, free && th > h ? parseFloat(el.style.top) / (th - h) : undefined);
      }
      start = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // ---------- Small dialogs ----------
  let sheet = null;
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }
  function openSheet(title, html, wide) {
    closeSheet();
    sheet = document.createElement('div');
    sheet.className = 'overlay shop-overlay';
    sheet.innerHTML = `<div class="dialog shop aq-sheet${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${html}</div>`;
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
    app.appendChild(sheet);
    return sheet;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet) closeSheet(); });
  const toast = (t) => root.ArrowShop && root.ArrowShop.toast(t);

  function itemMenu(item) {
    const c = byId[item.type];
    const refund = Math.floor(priceOf(c) / 2);
    const s = openSheet(c.name, `<div class="aq-preview" style="color:${palette()[item.color % 10]}">${c.svg}</div>` +
      `<div class="dialog-buttons"><button class="btn ghost" data-act="sell">Sell for ${refund} pearls</button><button class="btn primary" data-act="keep">Keep</button></div>`);
    s.querySelector('[data-act="keep"]').addEventListener('click', closeSheet);
    s.querySelector('[data-act="sell"]').addEventListener('click', () => {
      W.removeFromTank(item.uid);
      W.addPearls(refund);
      closeSheet();
      render();
      toast(`Sold for ${refund} pearls`);
    });
  }

  /** The shop sheet for one kind of item. */
  function catalog(kind) {
    const colors = palette();
    const have = W.tank().items.filter((i) => byId[i.type] && byId[i.type].kind === kind).length;
    const full = have >= LIMITS[kind];
    const rows = CATALOG.filter((c) => c.kind === kind).map((c, i) => {
      const price = priceOf(c);
      const afford = W.pearls() >= price;
      return `<button class="shop-item aq-buy" data-id="${c.id}"${afford && !full ? '' : ' aria-disabled="true"'}>` +
        `<span class="aq-thumb" style="color:${colors[(i * 3 + 1) % colors.length]}">${c.svg}</span>` +
        `<span class="shop-item-text"><strong>${c.name}</strong><span>${full ? 'Your tank is full of these' : afford ? '' : 'Not enough pearls yet'}</span></span>` +
        `<span class="shop-price pearl-price"><span class="pearl" aria-hidden="true"></span>${price}</span></button>`;
    }).join('');
    const s = openSheet(KIND_NAMES[kind],
      `<p class="shop-balance"><span class="pearl" aria-hidden="true"></span> <strong>${W.pearls().toLocaleString()}</strong> pearls<span class="shop-small">${have} of ${LIMITS[kind]} in your tank</span></p>` +
      `<div class="shop-list">${rows}</div>` +
      '<div class="dialog-buttons"><button class="btn ghost" data-act="pearls">Get more pearls</button><button class="btn primary" data-act="done">Done</button></div>', true);
    s.querySelector('[data-act="done"]').addEventListener('click', closeSheet);
    s.querySelector('[data-act="pearls"]').addEventListener('click', () => { closeSheet(); if (root.ArrowShop) root.ArrowShop.open(); });
    s.querySelectorAll('.aq-buy').forEach((b) => b.addEventListener('click', () => {
      const c = byId[b.dataset.id];
      if (full) { toast('Sell something to make room'); return; }
      if (!W.spendPearls(priceOf(c))) { toast('Not enough pearls yet'); return; }
      W.addToTank(c.id, Math.random(), Math.floor(Math.random() * 10));
      closeSheet();
      render();
      toast(`${c.name} added to your tank`);
    }));
  }

  // ---------- Opening and closing ----------
  function open() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s === screen));
    render();
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() {
    closeSheet();
    screen.classList.remove('active');
    const menu = document.getElementById('menu');
    if (menu) menu.classList.add('active');
  }
  screen.querySelector('#aqBack').addEventListener('click', close);
  screen.querySelector('#aqPearls').addEventListener('click', () => root.ArrowShop && root.ArrowShop.open());
  screen.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => catalog(b.dataset.cat)));
  // The Feed button sprinkles a pinch of food across the top of the water.
  screen.querySelector('#aqFeed').addEventListener('click', () => {
    const tw = tank.clientWidth;
    feedTime = 5;
    // The octopus shoots up too.
    for (const f of fish) if (f.m.octo && !f.held) { f.jet = 6; f.vy = -rand(150, 190); }
    for (let i = 0; i < 3; i++) dropFood(rand(tw * 0.15, tw * 0.85), tank.clientHeight * 0.06, 4);
  });
  root.addEventListener('resize', () => { if (screen.classList.contains('active')) render(); });
  const menuBtn = document.getElementById('menuAquariumBtn');
  if (menuBtn) menuBtn.addEventListener('click', open);

  // A gift of pearls on the first visit each day.
  setTimeout(() => {
    const n = W.takeDailyPearls();
    if (n) toast(`Daily gift: +${n} pearls`);
  }, 1500);

  root.ArrowAquarium = { open, close, catalog: CATALOG };
})(window);
