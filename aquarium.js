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
  // Fish face right in their pictures.
  const CATALOG = [
    // Fish
    { id: 'guppy', kind: 'fish', name: 'Glow guppy', price: 60, w: 0.14, ratio: 34 / 60,
      svg: '<svg viewBox="0 0 60 34" class="aq-fish"><path class="tail" d="M16 17 L3 5 C7 13 7 21 3 29Z"/><path d="M14 17 C22 6 40 5 50 17 C40 29 22 28 14 17Z"/><path class="fin" d="M27 9 L33 3 L38 10"/><circle class="eye" cx="43" cy="15" r="2.2"/></svg>' },
    { id: 'tetra', kind: 'fish', name: 'Neon tetra', price: 80, w: 0.12, ratio: 26 / 60,
      svg: '<svg viewBox="0 0 60 26" class="aq-fish"><path class="tail" d="M12 13 L2 5 L5 13 L2 21Z"/><path d="M10 13 C20 4 42 4 52 13 C42 22 20 22 10 13Z"/><path class="stripe" d="M17 13 L46 13"/><circle class="eye" cx="45" cy="11" r="2"/></svg>' },
    { id: 'angel', kind: 'fish', name: 'Angelfish', price: 150, w: 0.14, ratio: 70 / 60,
      svg: '<svg viewBox="0 0 60 70" class="aq-fish"><path class="tail" d="M16 35 L5 27 L8 35 L5 43Z"/><path d="M30 22 L22 2 L41 20Z"/><path d="M30 48 L22 68 L41 50Z"/><path d="M14 35 C24 18 40 18 51 35 C40 52 24 52 14 35Z"/><path class="fin" d="M28 23 L28 47 M37 22 L37 48"/><circle class="eye" cx="44" cy="32" r="2.3"/></svg>' },
    { id: 'puffer', kind: 'fish', name: 'Puffer', price: 200, w: 0.13, ratio: 50 / 60,
      svg: '<svg viewBox="0 0 60 50" class="aq-fish"><path class="tail" d="M14 25 L3 17 L6 25 L3 33Z"/><circle cx="32" cy="25" r="16"/><path class="fin" d="M32 6 L32 2 M44 10 L47 7 M20 10 L17 7 M32 44 L32 48 M44 40 L47 43 M20 40 L17 43 M50 25 L54 25"/><circle class="eye" cx="40" cy="20" r="2.6"/><path class="fin" d="M44 30 Q47 32 44 34"/></svg>' },
    { id: 'seahorse', kind: 'fish', name: 'Seahorse', price: 220, w: 0.08, ratio: 70 / 40, bob: true,
      svg: '<svg viewBox="0 0 40 70" class="aq-fish"><path d="M18 8 C26 4 33 8 32 14 L40 16 L31 19 C34 30 31 40 22 46 C15 51 15 60 21 62 C26 63 27 57 23 56"/><path class="fin" d="M18 26 C12 28 11 36 16 38"/><circle class="eye" cx="25" cy="12" r="1.8"/></svg>' },
    { id: 'moonjelly', kind: 'fish', name: 'Moon jelly', price: 260, w: 0.11, ratio: 70 / 40, drifts: true,
      svg: '<svg viewBox="0 0 40 70" class="aq-fish aq-jelly"><path class="bell" d="M4 24 C4 6 36 6 36 24 C30 21 10 21 4 24Z"/><g class="tentacles"><path d="M10 24 C6 36 14 44 9 58"/><path d="M17 24 C14 38 21 48 16 66"/><path d="M24 24 C27 38 19 48 24 66"/><path d="M31 24 C35 36 27 44 31 58"/></g></svg>' },
    { id: 'turtle', kind: 'fish', name: 'Sea turtle', price: 450, w: 0.22, ratio: 56 / 90,
      svg: '<svg viewBox="0 0 90 56" class="aq-fish aq-turtle"><g class="flipper front"><path d="M56 17 C52 6 42 0 30 1 C38 7 45 13 48 19Z"/></g><g class="flipper back"><path d="M56 39 C52 50 42 56 30 55 C38 49 45 43 48 37Z"/></g><path d="M22 32 C16 38 10 40 6 40 C10 35 14 31 20 29Z"/><ellipse cx="42" cy="28" rx="24" ry="15"/><path class="fin" d="M26 28 L42 18 L58 28 L42 38Z M42 18 L42 38 M26 28 L58 28"/><circle cx="72" cy="27" r="7"/><circle class="eye" cx="75" cy="25" r="1.6"/></svg>' },
    { id: 'octopus', kind: 'fish', name: 'Octopus', price: 500, w: 0.14, ratio: 100 / 80, drifts: true,
      svg: '<svg viewBox="0 0 80 100" class="aq-fish aq-octo"><g class="arms"><path d="M22 50 C12 64 26 76 12 90"/><path d="M29 54 C24 70 36 82 27 96"/><path d="M37 56 C36 72 44 84 38 98"/><path d="M44 56 C46 72 38 84 45 98"/><path d="M51 54 C56 70 44 82 53 96"/><path d="M58 50 C68 64 54 76 68 90"/></g><path class="mantle" d="M40 6 C58 6 66 22 64 38 C62 50 52 56 40 56 C28 56 18 50 16 38 C14 22 22 6 40 6Z"/><circle class="eye" cx="32" cy="40" r="3.2"/><circle class="eye" cx="48" cy="40" r="3.2"/></svg>' },
    { id: 'manta', kind: 'fish', name: 'Manta ray', price: 600, w: 0.26, ratio: 50 / 100,
      svg: '<svg viewBox="0 0 100 50" class="aq-fish aq-manta"><path d="M88 25 C87 19 80 13 58 1 C56 12 48 20 36 25 C48 30 56 38 58 49 C80 37 87 31 88 25Z"/><path class="fin" d="M87 21 C91 20 94 18 96 16 M87 29 C91 30 94 32 96 34"/><path class="fin" d="M37 25 L4 24"/><circle class="eye" cx="84" cy="20" r="1.5"/><circle class="eye" cx="84" cy="30" r="1.5"/></svg>' },
    { id: 'shark', kind: 'fish', name: 'Reef shark', price: 900, w: 0.34, ratio: 76 / 200,
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
    { id: 'starfish', kind: 'decor', name: 'Starfish', price: 50, w: 0.09, ratio: 0.95,
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
    <p class="aq-tip">Drag plants and decorations along the sand. Tap one to sell it.</p>
    <nav class="aq-bar" aria-label="Buy for your aquarium">
      <button class="action-btn" data-cat="fish"><span class="aq-bar-icon" aria-hidden="true">🐟</span><span>Fish</span></button>
      <button class="action-btn" data-cat="plant"><span class="aq-bar-icon" aria-hidden="true">🌿</span><span>Plants</span></button>
      <button class="action-btn" data-cat="decor"><span class="aq-bar-icon" aria-hidden="true">🐚</span><span>Decor</span></button>
    </nav>`;
  // Before the dialogs so they stay on top.
  const firstOverlay = app.querySelector('.overlay');
  app.insertBefore(screen, firstOverlay || null);
  const tank = screen.querySelector('#tank');
  const layer = screen.querySelector('#tankItems');

  const showPearls = () => { screen.querySelector('.pearl-count').textContent = W.pearls().toLocaleString(); };
  W.onChange(showPearls);

  let fish = [];
  let raf = 0;
  let last = 0;

  function sizeOf(c) {
    const tw = tank.clientWidth;
    const w = c.w * tw;
    return [w, w * c.ratio];
  }

  /** Draws everything in the tank afresh. */
  function render() {
    layer.innerHTML = '';
    fish = [];
    const colors = palette();
    const tw = tank.clientWidth, th = tank.clientHeight;
    const sand = th * 0.1;
    // Plants and decorations first (behind the fish), back to front by size.
    const items = W.tank().items.filter((i) => byId[i.type]);
    for (const item of items.filter((i) => byId[i.type].kind !== 'fish')) {
      const c = byId[item.type];
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = `aq-item aq-${c.kind}-item`;
      el.style.cssText = `width:${w}px;height:${h}px;left:${item.x * (tw - w)}px;bottom:${sand * rand(0.35, 0.75)}px;color:${colors[item.color % colors.length]}`;
      el.innerHTML = c.svg;
      el.dataset.uid = item.uid;
      el.querySelectorAll('.blade, .seg, .tentacle').forEach((g) => { g.style.animationDelay = `${rand(-3, 0).toFixed(2)}s`; });
      layer.appendChild(el);
      makeDraggable(el, item, w);
    }
    for (const item of items.filter((i) => byId[i.type].kind === 'fish')) {
      const c = byId[item.type];
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = 'aq-item aq-fish-item';
      el.style.cssText = `width:${w}px;height:${h}px;color:${colors[item.color % colors.length]}`;
      el.innerHTML = `<div class="aq-facing">${c.svg}</div>`;
      layer.appendChild(el);
      const f = {
        el, c, item, w, h,
        x: item.x * (tw - w), y: rand(th * 0.08, th * 0.7 - h),
        vx: (Math.random() < 0.5 ? -1 : 1) * rand(18, 40) * (c.w > 0.2 ? 0.6 : 1),
        phase: rand(0, Math.PI * 2),
      };
      if (c.drifts) f.vy = rand(-8, -4);
      el.addEventListener('click', () => itemMenu(item));
      fish.push(f);
    }
    showPearls();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const tw = tank.clientWidth, th = tank.clientHeight;
    for (const f of fish) {
      f.phase += dt;
      if (motionOK) {
        if (f.c.drifts) {
          // Jellies and octopuses drift up slowly, then sink back.
          f.y += f.vy * dt;
          if (f.y < th * 0.05) f.vy = Math.abs(f.vy);
          if (f.y > th * 0.68 - f.h) f.vy = -Math.abs(f.vy);
          f.x += Math.sin(f.phase * 0.4) * 6 * dt;
        } else {
          f.x += f.vx * dt;
          if (f.x < 0) { f.x = 0; f.vx = Math.abs(f.vx); }
          if (f.x > tw - f.w) { f.x = tw - f.w; f.vx = -Math.abs(f.vx); }
          // Now and then a fish changes its mind.
          if (Math.random() < dt * 0.08) f.vx = -f.vx;
        }
      }
      const bob = Math.sin(f.phase * (f.c.bob ? 1.6 : 1.1)) * (f.c.bob ? 6 : 3);
      f.el.style.transform = `translate(${f.x}px, ${f.y + bob}px)`;
      f.el.firstElementChild.style.transform = `scaleX(${f.c.drifts || f.vx > 0 ? 1 : -1})`;
    }
    raf = screen.classList.contains('active') ? requestAnimationFrame(frame) : 0;
  }

  // Plants and decorations slide along the sand; a tap (no slide) offers to sell.
  function makeDraggable(el, item, w) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, left: parseFloat(el.style.left), moved: 0 };
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      start.moved = Math.max(start.moved, Math.abs(dx));
      const tw = tank.clientWidth;
      el.style.left = `${Math.max(0, Math.min(tw - w, start.left + dx))}px`;
    });
    const end = () => {
      if (!start) return;
      el.classList.remove('dragging');
      const tw = tank.clientWidth;
      if (start.moved < 6) itemMenu(item);
      else W.moveInTank(item.uid, tw > w ? parseFloat(el.style.left) / (tw - w) : 0.5);
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
