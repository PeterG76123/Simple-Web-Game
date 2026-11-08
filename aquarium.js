/*
 * The aquarium: spend pearls (earned by finishing levels) on tanks, fish,
 * plants and decorations, and arrange them.
 *
 *   ArrowAquarium.open()    shows the aquarium screen
 *
 * There are three tanks (goldfish, tropical, marine: see aquarium-items.js),
 * bought with pearls; swipe (or use the arrows) to move between them. Fish
 * swim about by themselves, each kind in its own way; plants sway; plants and
 * decorations sit on the sand and can be dragged along it. Tap a fish to
 * startle it, press and hold anything to sell it, tap the water (or Feed) to
 * feed the fish, and drag through the water for the fish to follow.
 */
(function (root) {
  'use strict';
  const W = root.ArrowWallet;
  const cfg = (p) => root.ArrowConfig.get(p);
  const { TANKS, CATALOG } = root.ArrowAquariumItems;
  const rand = (a, b) => a + Math.random() * (b - a);
  const motionOK = !root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = () => {
    const css = getComputedStyle(document.documentElement);
    return Array.from({ length: 10 }, (_, i) => css.getPropertyValue(`--c${i + 1}`).trim() || '#5ef2ff');
  };
  const byId = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
  const prices = () => cfg('aquariumPrices') || {};
  const priceOf = (c) => (prices()[c.id] !== undefined ? prices()[c.id] : c.price);
  const tankPrice = (t) => (prices()[`tank:${t.id}`] !== undefined ? prices()[`tank:${t.id}`] : t.price);
  const colorOf = (c, item, pal) => (c.colors ? c.colors[item.color % c.colors.length] : pal[item.color % pal.length]);
  const LIMITS = { fish: 12, plant: 10, decor: 10 };
  const KIND_NAMES = { fish: 'Fish', plant: 'Plants', decor: 'Decorations' };
  const DEFAULT_MOVE = { speed: 0.08, accel: 0.15, zone: [0.15, 0.7], retarget: [2, 5] };
  const tankById = Object.fromEntries(TANKS.map((t) => [t.id, t]));

  // ---------- The scenery behind (and in front of) each tank ----------
  const ROCK = 'class="rock"';
  const SCENES = {
    goldfish: { back: '', mid: '', front: '' },
    tropical: {
      back:
        `<svg class="scene-piece" style="left:0;width:46%" viewBox="0 0 160 120"><path ${ROCK} d="M0 120 L0 60 C10 40 30 30 50 34 C60 18 84 14 100 26 C116 22 134 34 138 52 C150 60 158 80 160 120Z"/><path ${ROCK} d="M60 120 C64 96 84 86 104 92 C120 96 130 108 132 120Z"/><path class="rock-line" d="M30 60 C40 56 50 58 58 64 M90 40 C98 38 106 40 112 46 M14 90 C22 86 30 88 36 92"/></svg>` +
        `<svg class="scene-piece" style="right:0;width:36%" viewBox="0 0 120 100"><path ${ROCK} d="M0 100 C4 70 20 50 44 48 C60 30 92 30 108 52 C116 66 120 84 120 100Z"/><path ${ROCK} d="M40 100 C44 84 60 76 76 80 C88 84 94 92 96 100Z"/><path class="rock-line" d="M56 44 C64 42 72 44 78 48 M20 76 C26 72 34 72 40 76"/></svg>` +
        // The deep-sea diver in his brass helmet, with bubbles rising.
        `<div class="scene-piece diver" style="left:46%;width:21%"><span class="diver-bubbles"><i></i><i></i><i></i><i></i><i></i></span><svg viewBox="0 0 60 110"><path class="hose" d="M30 8 C30 -2 44 -6 58 2"/><path class="suit" d="M14 48 L46 48 L48 80 L12 80Z"/><path class="suit" d="M14 80 L16 104 L28 104 L28 80Z M32 80 L32 104 L44 104 L46 80Z"/><path class="suit" d="M14 50 L4 72 L10 75 L18 58Z M46 50 L56 70 L50 73 L42 58Z"/><path class="brass" d="M12 104 L30 104 L30 110 L12 110Z M30 104 L48 104 L48 110 L30 110Z"/><path class="brass" d="M14 38 L46 38 L50 48 L10 48Z"/><path class="belt" d="M12 66 L48 66"/><circle class="brass" cx="30" cy="24" r="16"/><circle class="glass" cx="30" cy="26" r="7"/><circle class="glass" cx="16" cy="24" r="3"/><circle class="glass" cx="44" cy="24" r="3"/><path class="glare" d="M26 23 C27 21 29 20 31 20"/></svg></div>`,
      mid: '',
      front: '',
    },
    marine: {
      // The dark inside of the cave sits on the sand; the rock is drawn in front of
      // everything, so a crab in the cave is seen through the opening.
      mid: `<svg class="scene-piece cave" style="left:0;width:52%" viewBox="0 0 200 140"><path class="cave-dark" d="M64 140 C64 106 80 90 100 90 C120 90 136 106 136 140Z"/><circle class="cave-mouth" cx="100" cy="124" r="1"/></svg>`,
      back:
        `<svg class="scene-piece" style="right:0;width:44%" viewBox="0 0 160 120"><path ${ROCK} d="M10 120 C14 90 30 70 60 68 C76 50 110 48 130 66 C146 76 156 96 158 120Z"/>` +
        `<path class="coral" style="--k:#ff6ab0" d="M38 72 C38 54 72 54 72 72Z"/><path class="coral-line" style="--k:#ff6ab0" d="M44 68 C48 62 52 66 56 60 C60 66 64 60 68 66"/>` +
        `<path class="coral-branch" style="--k:#b07aff" d="M104 56 L104 30 M104 44 L94 32 M104 40 L114 26 M94 32 L90 22 M114 26 L118 16"/>` +
        `<path class="coral-branch" style="--k:#ffd23a" d="M80 66 L80 46 M88 66 L88 40 M96 66 L96 50"/>` +
        `<path class="coral" style="--k:#ff8a3a" d="M132 66 C126 50 132 36 146 34 C150 46 146 60 136 68Z"/><path class="coral-line" style="--k:#ff8a3a" d="M134 64 L142 40 M136 62 L132 46 M138 60 L148 46"/></svg>` +
        `<svg class="scene-piece" style="left:42%;width:16%" viewBox="0 0 60 40"><path class="coral" style="--k:#3ad6ff" d="M6 40 C6 24 26 20 30 30 C34 20 54 24 54 40Z"/><path class="coral-branch" style="--k:#ff5a7a" d="M30 30 L30 8 M30 18 L22 10 M30 14 L38 6"/></svg>`,
      front:
        `<svg class="scene-piece cave" style="left:0;width:52%" viewBox="0 0 200 140"><path ${ROCK} d="M0 140 C0 96 14 52 56 30 C92 10 150 14 178 48 C194 70 200 104 200 140 L136 140 C136 106 120 90 100 90 C80 90 64 106 64 140Z"/>` +
        `<path class="rock-line" d="M30 70 C40 64 52 66 60 72 M150 50 C160 50 168 56 172 62 M20 110 C28 104 40 106 46 112 M160 100 C168 96 178 98 184 104"/>` +
        `<path class="coral" style="--k:#ff6ab0" d="M70 30 C70 14 100 12 104 26Z"/><path class="coral-line" style="--k:#ff6ab0" d="M74 26 C80 18 86 24 92 16 C96 22 100 18 102 24"/>` +
        `<path class="coral-branch" style="--k:#5dff9b" d="M140 30 L140 6 M140 18 L130 8 M140 14 L150 4"/><path class="coral-branch" style="--k:#ffd23a" d="M40 46 L36 28 M44 44 L46 24 M48 46 L54 30"/></svg>`,
    },
  };

  // ---------- The screen ----------
  const app = document.getElementById('app') || document.body;
  const screen = document.createElement('section');
  screen.id = 'aquarium';
  screen.className = 'screen';
  screen.setAttribute('aria-label', 'Aquarium');
  screen.innerHTML = `
    <header class="aq-head">
      <button id="aqBack" class="btn ghost icon-btn aq-back" aria-label="Back to the menu" title="Back">&#8592;</button>
      <div class="aq-title">
        <button id="aqPrev" class="aq-arrow" aria-label="Previous tank">&#8249;</button>
        <h2 id="aqName">My aquarium</h2>
        <button id="aqNext" class="aq-arrow" aria-label="Next tank">&#8250;</button>
      </div>
      <button id="aqPearls" class="pearl-chip" title="Get more pearls"><span class="pearl" aria-hidden="true"></span><span class="pearl-count">0</span></button>
    </header>
    <div class="tank" id="tank">
      <div class="tank-rays" aria-hidden="true"></div>
      <div class="tank-scene" id="sceneBack" aria-hidden="true"></div>
      <!-- The sand is in front of the scenery, so rocks sink into it. -->
      <svg class="tank-sand" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16 C40 10 80 15 120 12 C170 8 210 16 260 13 C310 10 350 16 400 12 L400 60 L0 60Z"/><path class="sand-ripple" d="M20 34 C60 30 90 36 130 32 M200 40 C240 36 270 42 310 38 M90 50 C130 46 160 52 200 48"/></svg>
      <div class="tank-scene" id="sceneMid" aria-hidden="true"></div>
      <div class="tank-items" id="tankItems"></div>
      <div class="tank-scene tank-front" id="sceneFront" aria-hidden="true"></div>
      <div class="tank-bubbles" aria-hidden="true"><span style="--x:12%;--t:7s;--d:-1s"></span><span style="--x:30%;--t:9s;--d:-4s"></span><span style="--x:58%;--t:6s;--d:-2s"></span><span style="--x:77%;--t:8s;--d:-6s"></span><span style="--x:90%;--t:10s;--d:-3s"></span></div>
      <div class="tank-dots" id="tankDots" aria-hidden="true"></div>
      <div class="aq-locked" id="aqLocked" hidden></div>
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
  const sceneBack = screen.querySelector('#sceneBack');
  const sceneMid = screen.querySelector('#sceneMid');
  const sceneFront = screen.querySelector('#sceneFront');
  const lockedBox = screen.querySelector('#aqLocked');

  const menuPearls = document.getElementById('menuPearls');
  const showPearls = () => {
    const n = W.pearls().toLocaleString();
    screen.querySelector('.pearl-count').textContent = n;
    if (menuPearls) menuPearls.textContent = n;
  };
  showPearls();
  W.onChange(showPearls);

  // The tank on show: the last one looked at, else the first owned, else the goldfish tank.
  let cur = TANKS.some((t) => t.id === W.shownTank()) ? W.shownTank() : (TANKS.find((t) => W.ownsTank(t.id)) || TANKS[0]).id;
  const owned = () => W.ownsTank(cur);
  const tankItems = () => (W.tank(cur) ? W.tank(cur).items : []);

  let fish = [];
  // Food sinking in the tank ({ x, y, vy, el, life }), and the finger the fish follow ({ x, y } or null).
  let food = [];
  let lure = null;
  // Seconds left of "feeding time" after the Feed button: everyone heads for the surface.
  let feedTime = 0;
  // Where the marine tank's cave is (tank coordinates), for crabs to hide in.
  let cave = null;
  let raf = 0;
  let last = 0;

  function sizeOf(c) {
    const tw = tank.clientWidth;
    const w = c.w * tw;
    return [w, w * c.ratio];
  }
  // The ground: a strip of sand with depth, from its back edge (at the foot of the rocks and
  // the cave's door) to the front of the tank. Things further forward are drawn in front.
  const ground = (th) => ({ top: th * 0.9, bot: th * 0.985 });
  const groundZ = (fy, G) => 10 + Math.round(Math.max(0, Math.min(1, (fy - G.top) / (G.bot - G.top))) * 80);
  // A steady per-item number in [0, 1) (so things don't jump about between redraws).
  const steady = (uid, salt) => ((Math.sin(uid * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

  /** The scenery, title, arrows and dots for the tank on show. */
  function renderScene() {
    const t = tankById[cur];
    TANKS.forEach((x) => tank.classList.toggle(`tank-${x.id}`, x.id === cur));
    sceneBack.innerHTML = SCENES[cur].back;
    sceneMid.innerHTML = SCENES[cur].mid;
    sceneFront.innerHTML = SCENES[cur].front;
    screen.querySelector('#aqName').textContent = t.name;
    const i = TANKS.indexOf(t);
    screen.querySelector('#aqPrev').disabled = i === 0;
    screen.querySelector('#aqNext').disabled = i === TANKS.length - 1;
    screen.querySelector('#tankDots').innerHTML = TANKS.map((x) => `<i class="${x.id === cur ? 'on' : ''}${W.ownsTank(x.id) ? '' : ' locked'}"></i>`).join('');
    screen.querySelectorAll('.aq-bar .action-btn').forEach((b) => { b.disabled = !owned(); });
    // Where the cave mouth is, if this tank has one.
    // The cave: its door (at the back of the ground) and how far it goes in behind the rock.
    const rock = sceneMid.querySelector('.cave');
    cave = null;
    if (rock) {
      const r = rock.getBoundingClientRect(), tr = tank.getBoundingClientRect();
      const at = (u) => r.left - tr.left + (u / 200) * r.width;
      cave = { x: at(100), doorL: at(68), doorR: at(132), inL: at(24), inR: at(176) };
    }
  }

  /** The "buy this tank" panel for a tank not owned yet. */
  function renderLocked() {
    const t = tankById[cur];
    lockedBox.hidden = owned();
    if (owned()) return;
    const price = tankPrice(t);
    const afford = W.pearls() >= price;
    lockedBox.innerHTML = `<div class="aq-locked-card"><h3>${t.name}</h3><p>${t.blurb}.</p><p class="shop-small">Comes with a free fish.</p>` +
      `<button class="btn primary" data-act="buyTank"${afford ? '' : ' disabled'}><span class="pearl" aria-hidden="true"></span> Buy for ${price} pearls</button>` +
      (afford ? '' : `<p class="shop-small">You have ${W.pearls().toLocaleString()} pearls. Finish levels to earn more.</p><button class="btn ghost" data-act="pearls">Get more pearls</button>`) +
      '</div>';
    lockedBox.querySelector('[data-act="buyTank"]').addEventListener('click', () => buyTank(t));
    const more = lockedBox.querySelector('[data-act="pearls"]');
    if (more) more.addEventListener('click', () => root.ArrowShop && root.ArrowShop.open());
  }

  function buyTank(t) {
    const price = tankPrice(t);
    const s = openSheet(`Buy the ${t.name.toLowerCase()}?`, `<p>${t.blurb}, for <strong>${price} pearls</strong>. A fish comes with it.</p>` +
      '<div class="dialog-buttons"><button class="btn primary" data-act="yes">Buy it</button><button class="btn ghost" data-act="no">Not now</button></div>');
    s.querySelector('[data-act="no"]').addEventListener('click', closeSheet);
    s.querySelector('[data-act="yes"]').addEventListener('click', () => {
      // The free fish: one of the tank's three cheapest.
      const cheap = CATALOG.filter((c) => c.tank === t.id && c.kind === 'fish').sort((a, b) => priceOf(a) - priceOf(b)).slice(0, 3);
      const starter = cheap[Math.floor(Math.random() * cheap.length)];
      closeSheet();
      if (!W.buyTank(t.id, price, starter && starter.id)) { toast('Not enough pearls yet'); return; }
      render();
      toast(`Welcome to your ${t.name.toLowerCase()}! A ${starter.name.toLowerCase()} came with it.`);
    });
  }

  /** Draws everything in the tank afresh. */
  function render() {
    renderScene();
    renderLocked();
    layer.innerHTML = '';
    fish = [];
    food = [];
    const pal = palette();
    const tw = tank.clientWidth, th = tank.clientHeight;
    const sand = th * 0.1;
    const items = tankItems().filter((i) => byId[i.type]);
    // Plants and decorations first (behind the fish).
    for (const item of items.filter((i) => byId[i.type].kind !== 'fish')) {
      const c = byId[item.type];
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = `aq-item aq-${c.kind}-item${c.sticks ? ' aq-sticker' : ''}`;
      const left = item.x * (tw - w);
      // Things on the ground stand at their depth (item.d: 0 back, 1 front); starfish stick anywhere.
      const G = ground(th);
      const fy = G.top + (item.d != null ? item.d : 0.15 + 0.6 * steady(item.uid, 1)) * (G.bot - G.top);
      const place = c.sticks
        ? (item.y != null ? `top:${item.y * (th - h)}px` : `top:${fy - h * 0.92}px`)
        : `top:${fy - h * 0.92}px;z-index:${groundZ(fy, G)}`;
      el.style.cssText = `width:${w}px;height:${h}px;left:${left}px;${place};color:${colorOf(c, item, pal)}`;
      el.innerHTML = c.svg;
      if (c.sticks) el.firstElementChild.style.transform = `rotate(${Math.round(steady(item.uid, 2) * 72)}deg)`;
      el.dataset.uid = item.uid;
      el.querySelectorAll('.blade, .seg, .tentacle').forEach((g, k) => { g.style.animationDelay = `${(-3 * steady(item.uid, 3 + k)).toFixed(2)}s`; });
      el.querySelectorAll('.lid, .stream circle').forEach((g, k) => { g.style.animationDelay = `${(-6 * steady(item.uid, 9) - k * 0.4).toFixed(2)}s`; });
      layer.appendChild(el);
      makeDraggable(el, item, w, h, !!c.sticks);
    }
    const plants = items.filter((i) => byId[i.type].kind === 'plant');
    for (const item of items.filter((i) => byId[i.type].kind === 'fish')) {
      const c = byId[item.type];
      const m = c.move || DEFAULT_MOVE;
      const [w, h] = sizeOf(c);
      const el = document.createElement('div');
      el.className = `aq-item aq-fish-item${m.crawl ? ' aq-crawler' : ''}`;
      el.style.cssText = `width:${w}px;height:${h}px;color:${colorOf(c, item, pal)}`;
      el.innerHTML = `<div class="aq-facing">${c.svg}</div>`;
      layer.appendChild(el);
      const zoneY = (z) => Math.min(th * 0.9 - h / 2, Math.max(h / 2, th * z));
      // Fish that like to stay near plants (clownfish near anemones, if there are any).
      const homes = m.homes && plants.some((p) => m.homes.includes(p.type)) ? plants.filter((p) => m.homes.includes(p.type)) : plants;
      const f = {
        el, c, m, item, w, h, plantsX: homes.map((p) => p.x),
        x: w / 2 + item.x * (tw - w), y: zoneY(rand(m.zone ? m.zone[0] : 0.3, m.zone ? m.zone[1] : 0.6)),
        vx: (Math.random() < 0.5 ? -1 : 1) * 10, vy: 0,
        dir: 1, tilt: 0, puff: 1, puffT: rand(4, 10), flipCd: 0,
        wait: 0, timer: 0, tx: 0, ty: 0,
        phase: rand(0, Math.PI * 2),
        jet: 0, // octopus: >0 while jetting upwards
        offset: [rand(-1, 1), rand(-1, 1)],
      };
      if (m.crawl) {
        const G = ground(th);
        f.fy = G.top + (0.2 + 0.6 * steady(item.uid, 5)) * (G.bot - G.top);
        f.y = f.fy - h * 0.38;
        f.inCave = false;
      }
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
    if (m.crawl) tx = f.x + rand(-0.4, 0.4) * tw;
    f.tx = Math.min(maxX, Math.max(minX, tx));
    f.ty = Math.min(maxY, Math.max(minY, th * rand(band[0], band[1])));
    if (m.patrol) f.ty = Math.min(maxY, Math.max(minY, f.y + rand(-0.08, 0.08) * th));
    f.timer = rand(...(m.retarget || [2, 5]));
  }

  /** Snails and crabs: walk about on the ground. Crabs can go into the cave (through
   * its door, at the back of the ground) and hide inside, behind the rock. */
  function crawl(f, dt, tw, th) {
    const m = f.m;
    const G = ground(th);
    if (f.fy == null) f.fy = G.top + (G.bot - G.top) / 2;
    if (f.retract > 0) { f.retract -= dt; f.vx = 0; if (f.retract <= 0) f.el.classList.remove('retract'); place(); return; }
    let tx = f.x, tfy = f.fy, speed = m.speed * tw;
    const hideSpot = () => (Math.random() < 0.5 ? rand(cave.inL, cave.doorL - f.w * 0.5) : rand(cave.doorR + f.w * 0.5, cave.inR));
    if (f.inCave && cave) {
      tfy = G.top;
      if (f.hidden > 0) {
        f.hidden -= dt;
        if (f.hidden <= 0) f.plan = 'leave';
      } else if (f.plan === 'leave') {
        tx = cave.x; speed *= 1.5;
        if (Math.abs(f.x - cave.x) < 3) { f.inCave = false; f.plan = null; f.wait = 0; f.tx = cave.x; f.tfy = G.top + rand(0.3, 0.8) * (G.bot - G.top); f.timer = rand(2, 4); }
      } else {
        if (f.hideX == null || f.plan !== 'hide') { f.plan = 'hide'; f.hideX = hideSpot(); }
        tx = f.hideX; speed *= 5;
        if (Math.abs(f.x - f.hideX) < 3) { f.hidden = rand(5, 9); f.plan = null; f.hideX = null; }
      }
    } else if (f.plan === 'hide' && cave) {
      // Off to the cave door, then in.
      tx = cave.x; tfy = G.top; speed *= f.fleeing ? 7 : 1.5;
      if (Math.abs(f.x - cave.x) < 4 && f.fy - G.top < 3) { f.inCave = true; f.fleeing = false; f.hideX = hideSpot(); }
    } else if (f.fleeing) {
      tx = f.fleeX; speed *= 7;
      if (Math.abs(tx - f.x) < 3) f.fleeing = false;
    } else {
      // Food that has landed on the sand.
      const snack = !f.full && nearestFood(f, G.top - 2);
      if (lure) { tx = lure.x; tfy = Math.max(G.top, Math.min(G.bot, lure.y)); }
      else if (snack && snack.landed) {
        const [mx] = mouthOf(f, f.x < snack.x ? 1 : -1);
        tx = snack.x - (mx - f.x); tfy = snack.y;
        speed *= 2;
        const [ex] = mouthOf(f);
        if (Math.abs(ex - snack.x) < 5 && Math.abs(f.fy - snack.y) < 6) eat(f, snack);
      } else {
        f.timer -= dt;
        if (f.wait > 0) f.wait -= dt;
        else {
          if (f.timer <= 0 || Math.hypot(f.tx - f.x, (f.tfy || f.fy) - f.fy) < 3) {
            if (m.pause) f.wait = rand(...m.pause);
            newTarget(f, tw, th);
            f.tfy = G.top + rand(0.05, 1) * (G.bot - G.top);
            // Now and then a crab wanders into the cave by itself.
            if (m.crab && cave && Math.random() < 0.15) f.plan = 'hide';
          }
          tx = f.tx; tfy = f.tfy;
        }
      }
    }
    // Walk towards (tx, tfy), easing in and out.
    const dx = tx - f.x, dy = tfy - f.fy, d = Math.hypot(dx, dy);
    const v = d > 0.5 ? Math.min(speed, d * 3) : 0;
    const wantX = d ? (dx / d) * v : 0, wantY = d ? (dy / d) * v : 0;
    const k = Math.min(1, dt * 6);
    f.vx += (wantX - f.vx) * k; f.vfy = (f.vfy || 0) + (wantY - (f.vfy || 0)) * k;
    f.x += f.vx * dt; f.fy += f.vfy * dt;
    place();
    function place() {
      if (f.inCave && cave) { f.fy = G.top; f.x = Math.max(cave.inL, Math.min(cave.inR, f.x)); }
      else { f.fy = Math.max(G.top, Math.min(G.bot, f.fy)); f.x = Math.max(f.w / 2, Math.min(tw - f.w / 2, f.x)); }
      // (In the cave it stands just inside, its feet hidden by the rock's edge.)
      f.y = f.fy - f.h * (f.inCave ? 0.62 : 0.38);
      f.vy = 0;
    }
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
        if (m.crawl) {
          crawl(f, dt, tw, th);
        } else if (m.jelly) {
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
          // Bottom-dwellers only go for food that has sunk low.
          const snack = !lure && !f.full && nearestFood(f, m.bottom ? th * 0.6 : 0);
          if (lure) {
            // Following the finger: gather round it, each in its own spot.
            gx = lure.x + f.offset[0] * f.w * 0.9; gy = m.bottom ? f.ty : lure.y + f.offset[1] * f.h * 1.2;
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
          } else if (feedTime > 0 && !m.bottom) {
            // Feeding time: up to the surface, even if full (just in case).
            gx = f.x + f.offset[0] * f.w; gy = th * 0.03 + f.h * (0.5 + Math.abs(f.offset[1]) * 0.6);
            boost = Math.min(6, Math.max(2.2, 0.16 / m.speed));
          } else if (f.leader && !f.leader.held && !(f.leader.scared > 0)) {
            // Followers keep their own spot near the leader (behind it, a little to the side).
            const s = f.w * (m.spread || 1);
            gx = f.leader.x - f.leader.dir * s * (0.6 + Math.abs(f.offset[0]));
            gy = f.leader.y + f.offset[1] * s * (m.bottom ? 0.2 : 0.9);
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
            if (o === f || o.m.crawl) continue;
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
        if (!m.crawl) {
          f.x += f.vx * dt; f.y += f.vy * dt;
          f.x = Math.min(tw - f.w / 2, Math.max(f.w / 2, f.x));
          f.y = Math.min(floor - f.h / 2, Math.max(f.h / 2, f.y));
        }
      }
    }
    collide(dt);
    updateFood(dt, tw, th);
    for (const f of fish) {
      const m = f.m;
      if (!f.held && !m.crawl) {
        f.x = Math.min(tw - f.w / 2, Math.max(f.w / 2, f.x));
        f.y = Math.min(floor - f.h / 2, Math.max(f.h / 2, f.y));
      }
      if (m.crawl) {
        // On the ground: nearer the front draws in front. Inside the cave: behind its rock.
        f.el.style.zIndex = f.held ? '' : f.inCave ? 2 : groundZ(f.fy, ground(th));
        f.el.classList.toggle('in-cave', !!f.inCave);
      }
      // Turn round only when properly swimming the other way, and not too often.
      // (Crabs walk sideways and never turn.)
      if (!m.jelly && !m.octo && !m.crab) {
        if (f.flipCd > 0) f.flipCd -= dt;
        const turnAt = m.crawl ? 2 : Math.max(8, m.speed ? m.speed * tw * 0.25 : 8);
        let want = f.vx > turnAt ? 1 : f.vx < -turnAt ? -1 : f.dir;
        // Right by its food: face it, so the mouth meets it.
        if (!m.crawl && f.snack && !f.snack.eaten && f.side && Math.hypot(f.snack.x - f.x, f.snack.y - f.y) < f.w * 1.2) want = f.side;
        if (want !== f.dir && (f.flipCd <= 0 || f.scared > 0 || f.held)) { f.dir = want; f.flipCd = 0.6; }
        const goalTilt = m.crawl || m.bottom ? 0 : Math.max(-22, Math.min(22, Math.atan2(f.vy, Math.abs(f.vx) + 8) * 180 / Math.PI)) * (m.tilt || 0.8);
        f.tilt += (goalTilt - f.tilt) * Math.min(1, dt * 4);
      }
      if (m.crab) f.dir = 1;
      const bob = m.crawl ? 0 : m.nearPlants ? Math.sin(f.phase * 1.6) * 5 : m.jelly || m.octo ? 0 : Math.sin(f.phase * 1.1) * (m.bottom ? 1 : 2);
      f.bobY = bob;
      f.el.style.transform = `translate(${f.x - f.w / 2}px, ${f.y - f.h / 2 + bob}px)`;
      if (f.gulp > 0) f.gulp -= dt;
      const gulp = f.gulp > 0 ? 1 + Math.sin((0.25 - f.gulp) / 0.25 * Math.PI) * 0.12 : 1;
      f.gulpScale = gulp;
      f.el.firstElementChild.style.transform = `scaleX(${f.dir}) rotate(${f.tilt}deg) scale(${f.puff * gulp})`;
      f.el.classList.toggle('walking', !!m.crawl && Math.abs(f.vx) > 1);
    }
    raf = screen.classList.contains('active') ? requestAnimationFrame(frame) : 0;
  }

  // ---------- Feeding ----------
  const MAX_FOOD = 40;
  function dropFood(x, y, n, quiet) {
    const colors = ['#ffb03a', '#ff7a59', '#ffd166', '#c98b4f'];
    for (let i = 0; i < n && food.length < MAX_FOOD; i++) {
      const el = document.createElement('div');
      el.className = 'aq-food';
      el.style.background = colors[i % colors.length];
      layer.appendChild(el);
      const G = ground(tank.clientHeight);
      food.push({ x: x + rand(-18, 18), y: y + rand(-6, 6), vy: rand(14, 24), sway: rand(0, 6), el, life: 8, age: 0, land: G.top + rand(0.1, 0.9) * (G.bot - G.top) });
    }
    if (!quiet && root.ArrowAudio) root.ArrowAudio.play('sprinkle');
  }
  function updateFood(dt, tw, th) {
    for (const p of food) {
      p.sway += dt * 2;
      // Food that lands on the sand fades away after a few seconds (and nothing lingers more than half a minute).
      p.age += dt;
      if (p.y < p.land) { p.y = Math.min(p.land, p.y + p.vy * dt); p.x += Math.sin(p.sway) * 6 * dt; }
      else { p.landed = true; p.life -= dt; }
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

  /** The closest bit of food this fish could go for (fish go for different bits), below `minY`. */
  function nearestFood(f, minY = 0) {
    // Sticks with the flake it's already after, unless someone else got it.
    if (f.snack && !f.snack.eaten && f.snack.life > 0 && food.includes(f.snack) && f.snack.claimedBy === f && f.snack.y >= minY) return f.snack;
    let best = null, bd = Infinity;
    for (const p of food) {
      if (p.eaten || p === f.skip || p.y < minY) continue;
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

  // Tap the water to drop food; drag through it and the fish follow your finger;
  // a quick swipe sideways goes to the next or previous tank.
  (function waterTouches() {
    let start = null;
    const at = (e) => { const r = tank.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    tank.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.aq-item, .aq-locked-card')) return;
      e.preventDefault();
      tank.setPointerCapture(e.pointerId);
      start = { ...at(e), moved: 0, t: performance.now() };
    });
    tank.addEventListener('pointermove', (e) => {
      if (!start) return;
      const p = at(e);
      start.moved = Math.max(start.moved, Math.hypot(p.x - start.x, p.y - start.y));
      if (start.moved >= 8 && owned()) lure = p;
    });
    const end = (e) => {
      if (!start) return;
      const p = at(e);
      const dx = p.x - start.x, dy = p.y - start.y;
      const quick = performance.now() - start.t < 400;
      if (quick && Math.abs(dx) > tank.clientWidth * 0.2 && Math.abs(dx) > Math.abs(dy) * 1.5) switchTank(dx < 0 ? 1 : -1);
      else if (start.moved < 8 && owned()) dropFood(p.x, Math.min(p.y, tank.clientHeight * 0.85), 5);
      start = null;
      lure = null;
    };
    tank.addEventListener('pointerup', end);
    tank.addEventListener('pointercancel', () => { start = null; lure = null; });
  })();

  /** Shows the next (+1) or previous (-1) tank. */
  function switchTank(step) {
    const i = TANKS.findIndex((t) => t.id === cur) + step;
    if (i < 0 || i >= TANKS.length) {
      tank.classList.remove('bump-l', 'bump-r');
      void tank.offsetWidth;
      tank.classList.add(step < 0 ? 'bump-l' : 'bump-r');
      return;
    }
    cur = TANKS[i].id;
    W.showTank(cur);
    closeSheet();
    tank.classList.remove('slide-l', 'slide-r');
    void tank.offsetWidth;
    tank.classList.add(step > 0 ? 'slide-l' : 'slide-r');
    render();
  }

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
        if (a.inCave || b.inCave) continue;
        // Crawlers only jostle each other, sideways, along the sand.
        const crawlers = !!a.m.crawl + !!b.m.crawl;
        if (crawlers === 1) continue;
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
        // (Crawlers just shuffle sideways.)
        a.x -= ux * depth * ka; b.x += ux * depth * kb;
        if (!crawlers) { a.y -= uy * depth * ka; b.y += uy * depth * kb; }
        // Knock their speeds apart along the line between them.
        const rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
        if (rel < 0) {
          a.vx += ux * rel * ka * 1.2; a.vy += uy * rel * ka * 1.2;
          b.vx -= ux * rel * kb * 1.2; b.vy -= uy * rel * kb * 1.2;
        }
        if (!crawlers) { react(a, b, sa, sb); react(b, a, sb, sa); }
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
        if (o.m.crab) {
          // Crabs run for the cave (or, with no cave, scuttle off to the side).
          if (o.inCave) { o.hidden = Math.max(o.hidden || 0, 3) + 3; return; }
          o.fleeing = true;
          if (cave) o.plan = 'hide';
          else o.fleeX = o.x < px ? o.w / 2 : tank.clientWidth - o.w / 2;
          return;
        }
        if (o.m.crawl) { o.retract = 3; o.el.classList.add('retract'); return; } // snails pull in
        o.scared = rand(1.2, 1.8);
        o.zig = 0;
        o.fleeA = Math.atan2(o.y - py, o.x - px) + rand(-0.4, 0.4);
        o.el.classList.add('scared');
      };
      if (delay) setTimeout(go, delay); else go();
    };
    flee(f, 0);
    for (const o of fish) if (o !== f && o.c === f.c && (f.m.school || f.m.crab)) flee(o, rand(60, 220));
    if (root.ArrowAudio) root.ArrowAudio.play('flee', { size: Math.max(f.w, f.h) });
  }

  // Tap a fish to startle it; drag one to move it; press and hold to sell it.
  function makeFishDraggable(f) {
    const el = f.el;
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, ffy: f.fy, moved: 0, menu: false };
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
      f.vx = 0; f.vy = 0;
      if (!f.m.crawl) { f.x = start.fx + dx; f.y = start.fy + dy; return; }
      // Crawlers are moved about the ground; a crab pushed up through the cave door goes
      // into the cave, where it can only move sideways (pull it back down to bring it out).
      const G = ground(tank.clientHeight);
      const x = start.fx + dx, fy = start.ffy + dy;
      const atDoor = cave && f.m.crab && x > cave.doorL && x < cave.doorR;
      if (!f.inCave && atDoor && fy < G.top - 8) { f.inCave = true; f.plan = null; f.hidden = 0; }
      else if (f.inCave && atDoor && fy > G.top + 8) { f.inCave = false; f.plan = null; f.hidden = 0; }
      f.x = x; f.fy = fy;
      if (f.inCave) { f.fy = G.top; f.x = Math.max(cave.inL, Math.min(cave.inR, f.x)); }
      else { f.fy = Math.max(G.top, Math.min(G.bot, f.fy)); f.x = Math.max(f.w / 2, Math.min(tank.clientWidth - f.w / 2, f.x)); }
      f.y = f.fy - f.h * (f.inCave ? 0.62 : 0.38);
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
        f.fleeing = false;
        newTarget(f, tank.clientWidth, tank.clientHeight);
        if (f.m.crawl) {
          f.tx = f.x; f.tfy = f.fy; f.wait = rand(1, 2);
          // Let go inside the cave: hidden if behind the rock, else it goes and hides.
          if (f.inCave) { if (f.x < cave.doorL || f.x > cave.doorR) f.hidden = rand(5, 9); else f.plan = 'hide'; }
        }
        if (f.m.octo) { f.jet = 0; }
      }
      start = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Plants and decorations can be put anywhere on the ground (starfish anywhere at all,
  // even on the glass); press and hold (no slide) offers to sell.
  function makeDraggable(el, item, w, h, free) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      if (free && !el.style.top) { el.style.top = `${el.offsetTop}px`; el.style.bottom = ''; }
      start = { x: e.clientX, y: e.clientY, left: parseFloat(el.style.left), top: parseFloat(el.style.top), moved: 0, menu: false };
      el.style.zIndex = '';
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
      start.moved = Math.max(start.moved, Math.hypot(dx, dy));
      const tw = tank.clientWidth, th = tank.clientHeight;
      el.style.left = `${Math.max(0, Math.min(tw - w, start.left + dx))}px`;
      if (free) el.style.top = `${Math.max(0, Math.min(th - h, start.top + dy))}px`;
      else {
        // Anywhere on the ground: from its back edge to the front of the tank.
        const G = ground(th);
        const fy = Math.max(G.top, Math.min(G.bot, start.top + h * 0.92 + dy));
        el.style.top = `${fy - h * 0.92}px`;
      }
    });
    const end = () => {
      if (!start) return;
      el.classList.remove('dragging');
      clearTimeout(start.hold);
      const tw = tank.clientWidth, th = tank.clientHeight;
      const G = ground(th);
      const fy = parseFloat(el.style.top) + h * 0.92;
      if (!free) el.style.zIndex = groundZ(fy, G);
      if (start.menu || start.moved < 6) { /* held: the sell sheet is open; tapped: nothing to do */ }
      else {
        const x = tw > w ? parseFloat(el.style.left) / (tw - w) : 0.5;
        if (free) W.moveInTank(cur, item.uid, x, th > h ? parseFloat(el.style.top) / (th - h) : undefined);
        else W.moveInTank(cur, item.uid, x, undefined, Math.max(0, Math.min(1, (fy - G.top) / (G.bot - G.top))));
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
  document.addEventListener('keydown', (e) => {
    if (!screen.classList.contains('active')) return;
    if (e.key === 'Escape' && sheet) closeSheet();
    else if (!sheet && e.key === 'ArrowLeft') switchTank(-1);
    else if (!sheet && e.key === 'ArrowRight') switchTank(1);
  });
  const toast = (t) => root.ArrowShop && root.ArrowShop.toast(t);

  function itemMenu(item) {
    const c = byId[item.type];
    const refund = Math.floor(priceOf(c) / 2);
    const s = openSheet(c.name, `<div class="aq-preview" style="color:${colorOf(c, item, palette())}">${c.svg}</div>` +
      `<div class="dialog-buttons"><button class="btn ghost" data-act="sell">Sell for ${refund} pearls</button><button class="btn primary" data-act="keep">Keep</button></div>`);
    s.querySelector('[data-act="keep"]').addEventListener('click', closeSheet);
    s.querySelector('[data-act="sell"]').addEventListener('click', () => {
      W.removeFromTank(cur, item.uid);
      W.addPearls(refund);
      closeSheet();
      render();
      toast(`Sold for ${refund} pearls`);
    });
  }

  /** The shop sheet for one kind of item, for the tank on show. */
  function catalog(kind) {
    if (!owned()) return;
    const pal = palette();
    const have = tankItems().filter((i) => byId[i.type] && byId[i.type].kind === kind).length;
    const full = have >= LIMITS[kind];
    const rows = CATALOG.filter((c) => c.tank === cur && c.kind === kind).sort((a, b) => priceOf(a) - priceOf(b)).map((c, i) => {
      const price = priceOf(c);
      const afford = W.pearls() >= price;
      return `<button class="shop-item aq-buy" data-id="${c.id}"${afford && !full ? '' : ' aria-disabled="true"'}>` +
        `<span class="aq-thumb" style="color:${c.colors ? c.colors[0] : pal[(i * 3 + 1) % pal.length]}">${c.svg}</span>` +
        `<span class="shop-item-text"><strong>${c.name}</strong><span>${full ? 'Your tank is full of these' : afford ? '' : 'Not enough pearls yet'}</span></span>` +
        `<span class="shop-price pearl-price"><span class="pearl" aria-hidden="true"></span>${price}</span></button>`;
    }).join('');
    const s = openSheet(KIND_NAMES[kind],
      `<p class="shop-balance"><span class="pearl" aria-hidden="true"></span> <strong>${W.pearls().toLocaleString()}</strong> pearls<span class="shop-small">${have} of ${LIMITS[kind]} in your ${tankById[cur].name.toLowerCase()}</span></p>` +
      `<div class="shop-list">${rows}</div>` +
      '<div class="dialog-buttons"><button class="btn ghost" data-act="pearls">Get more pearls</button><button class="btn primary" data-act="done">Done</button></div>', true);
    s.querySelector('[data-act="done"]').addEventListener('click', closeSheet);
    s.querySelector('[data-act="pearls"]').addEventListener('click', () => { closeSheet(); if (root.ArrowShop) root.ArrowShop.open(); });
    s.querySelectorAll('.aq-buy').forEach((b) => b.addEventListener('click', () => {
      const c = byId[b.dataset.id];
      if (full) { toast('Sell something to make room'); return; }
      if (!W.spendPearls(priceOf(c))) { toast('Not enough pearls yet'); return; }
      W.addToTank(cur, c.id, Math.random(), Math.floor(Math.random() * 10));
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
  screen.querySelector('#aqPrev').addEventListener('click', () => switchTank(-1));
  screen.querySelector('#aqNext').addEventListener('click', () => switchTank(1));
  screen.querySelector('#aqPearls').addEventListener('click', () => root.ArrowShop && root.ArrowShop.open());
  screen.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => catalog(b.dataset.cat)));
  // The Feed button sprinkles a pinch of food across the top of the water.
  screen.querySelector('#aqFeed').addEventListener('click', () => {
    if (!owned()) return;
    const tw = tank.clientWidth;
    feedTime = 5;
    // The octopus shoots up too.
    for (const f of fish) if (f.m.octo && !f.held) { f.jet = 6; f.vy = -rand(150, 190); }
    for (let i = 0; i < 3; i++) dropFood(rand(tw * 0.15, tw * 0.85), tank.clientHeight * 0.06, 4, i > 0);
  });
  // The "buy a tank" panel shows the pearls you have, so it changes when they do.
  W.onChange(() => { if (screen.classList.contains('active') && !owned()) renderLocked(); });
  root.addEventListener('resize', () => { if (screen.classList.contains('active')) render(); });
  const menuBtn = document.getElementById('menuAquariumBtn');
  if (menuBtn) menuBtn.addEventListener('click', open);

  // A gift of pearls on the first visit each day.
  setTimeout(() => {
    const n = W.takeDailyPearls();
    if (n) toast(`Daily gift: +${n} pearls`);
  }, 1500);

  root.ArrowAquarium = { open, close, tanks: TANKS, catalog: CATALOG };
})(window);
