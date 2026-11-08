/*
 * What can live in the aquarium: three tanks (goldfish, tropical, marine),
 * each with its own 10 fish, 5 plants and 5 decorations.
 *
 *   ArrowAquariumItems.TANKS     [{ id, name, price, blurb }]
 *   ArrowAquariumItems.CATALOG   [{ id, tank, kind, name, price, w, ratio, svg, ... }]
 *
 * Each item:
 *   kind      fish (swims), plant (sways, on the sand) or decor (on the sand)
 *   w, ratio  width as a share of the tank's width; height / width of its picture
 *   svg       its picture: simple glowing outlines (fish face right)
 *   colors    the colours it comes in (else the game's palette)
 *   mouth     fish: where the mouth is, as a share of the picture's width and height
 *   move      fish: how it swims (see aquarium.js)
 *   sticks    can be stuck anywhere, even on the glass (starfish)
 *   tank      which tank sells it (null: no longer sold, but still shown if owned)
 *
 * The art is deliberately simple, to be replaced by richer pictures later:
 * only `svg` (and `mouth`) need to change.
 */
(function (root) {
  'use strict';

  const TANKS = [
    { id: 'goldfish', name: 'Goldfish tank', price: 200, blurb: 'Fancy goldfish, snails and a castle' },
    { id: 'tropical', name: 'Tropical tank', price: 500, blurb: 'Big rocks, a deep-sea diver and colourful fish' },
    { id: 'marine', name: 'Marine tank', price: 1000, blurb: 'Sea water, coral, a rocky cave and crabs' },
  ];

  // ---------- Plant pictures, built from a few shapes ----------
  // Ribbons: long blades of grass. Stems: jointed stems that bend at each joint.
  // Rosettes: leaves fanning out from the base.
  function ribbon({ n = 5, h = 90, w = 40, bend = 8, spread = 0.6 }) {
    let g = '';
    for (let i = 0; i < n; i++) {
      const x = (w / 2 + (i - (n - 1) / 2) * ((w * spread) / n)).toFixed(1);
      const top = (h * (0.04 + 0.3 * (((i * 37) % 10) / 10))).toFixed(1);
      const b = (i % 2 ? 1 : -1) * bend;
      g += `<g class="blade b${(i % 3) + 1}"><path d="M${x} ${h} C${+x + b} ${h * 0.65} ${x - b} ${h * 0.4} ${+x + b * 0.6} ${top}"/></g>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" class="aq-plant">${g}</svg>`;
  }
  function stems({ stems: list, h = 100, w = 50, leaf = 'pair', segs = 4 }) {
    let out = '';
    for (const [x, scale, tilt] of list) {
      const H = h * scale, hs = H / segs;
      let g = '', close = '';
      for (let s = 0; s < segs; s++) {
        const y0 = h - s * hs, y1 = y0 - hs, ym = (y0 + y1) / 2;
        const xs = x + tilt * s, xe = x + tilt * (s + 1);
        let leaves = '';
        if (leaf === 'pair') leaves = `<path class="leaf" d="M${xs} ${ym} C${xs + 6} ${ym - 4} ${xs + 11} ${ym - 9} ${xs + 13} ${ym - 13} C${xs + 7} ${ym - 11} ${xs + 3} ${ym - 6} ${xs} ${ym}Z M${xs} ${ym} C${xs - 6} ${ym - 4} ${xs - 11} ${ym - 9} ${xs - 13} ${ym - 13} C${xs - 7} ${ym - 11} ${xs - 3} ${ym - 6} ${xs} ${ym}Z"/>`;
        if (leaf === 'whorl') leaves = `<path d="M${xs} ${ym} L${xs + 10} ${ym - 6} M${xs} ${ym} L${xs - 10} ${ym - 6} M${xs} ${ym} L${xs + 8} ${ym + 3} M${xs} ${ym} L${xs - 8} ${ym + 3} M${xs} ${ym} L${xs + 3} ${ym - 10} M${xs} ${ym} L${xs - 3} ${ym - 10}"/>`;
        if (leaf === 'feather') leaves = `<path d="M${xs} ${ym} C${xs + 6} ${ym - 2} ${xs + 10} ${ym - 6} ${xs + 13} ${ym - 11} M${xs} ${ym} C${xs - 6} ${ym - 2} ${xs - 10} ${ym - 6} ${xs - 13} ${ym - 11} M${xs} ${ym} C${xs + 4} ${ym - 5} ${xs + 6} ${ym - 10} ${xs + 6} ${ym - 15} M${xs} ${ym} C${xs - 4} ${ym - 5} ${xs - 6} ${ym - 10} ${xs - 6} ${ym - 15}"/>`;
        if (leaf === 'grapes') leaves = `<circle class="leaf" cx="${xs + 5}" cy="${ym - 3}" r="3"/><circle class="leaf" cx="${xs - 5}" cy="${ym - 6}" r="3"/><circle class="leaf" cx="${xs + 4}" cy="${ym - 10}" r="2.6"/><circle class="leaf" cx="${xs - 4}" cy="${ym + 2}" r="2.6"/>`;
        g += `<g class="seg s${s + 1}"><path d="M${xs} ${y0} C${xs - 3} ${ym + 3} ${xe + 3} ${ym - 3} ${xe} ${y1}"/>${leaves}`;
        close += '</g>';
      }
      out += g + close;
    }
    return `<svg viewBox="0 0 ${w} ${h}" class="aq-plant aq-stems">${out}</svg>`;
  }
  function rosette({ n = 7, len = 60, wide = 8, h = 70, w = 70, fan = 60, spots = false }) {
    let g = '';
    const cx = w / 2;
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : -fan + (2 * fan * i) / (n - 1);
      const l = len * (0.75 + 0.25 * Math.cos((a * Math.PI) / 180));
      const leaf = `M${cx} ${h} C${cx - wide} ${h - l * 0.3} ${cx - wide * 0.8} ${h - l * 0.8} ${cx} ${h - l} C${cx + wide * 0.8} ${h - l * 0.8} ${cx + wide} ${h - l * 0.3} ${cx} ${h}Z`;
      const rib = `M${cx} ${h} L${cx} ${h - l * 0.9}`;
      const dots = spots ? `<circle class="spot" cx="${cx - wide * 0.3}" cy="${h - l * 0.5}" r="1.6"/><circle class="spot" cx="${cx + wide * 0.35}" cy="${h - l * 0.7}" r="1.4"/>` : '';
      g += `<g class="blade b${(i % 3) + 1}"><g transform="rotate(${a.toFixed(1)} ${cx} ${h})"><path class="leaf" d="${leaf}"/><path class="line" d="${rib}"/>${dots}</g></g>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" class="aq-plant">${g}</svg>`;
  }

  // ---------- Goldfish shapes ----------
  const goldBody = (extra = '', { hump = 0, dorsal = true, eye = '<circle class="eye" cx="49" cy="20" r="2.2"/>' } = {}) =>
    `<svg viewBox="0 0 64 44" class="aq-fish">` +
    `<path class="tail" d="M21 22 C14 10 6 6 2 10 C6 16 8 19 21 22 C8 25 6 28 2 34 C6 38 14 34 21 22Z"/>` +
    `<path d="M20 22 C22 ${10 - hump} 42 ${8 - hump} 54 21 C46 34 26 35 20 22Z"/>` +
    (dorsal ? `<path class="fin" d="M28 ${12 - hump} C31 ${3 - hump} 40 ${4 - hump} 42 ${11 - hump}"/>` : '') +
    `<path class="fin" d="M32 31 C32 37 38 39 40 33"/>${extra}${eye}</svg>`;
  const cometBody = (extra = '') =>
    `<svg viewBox="0 0 70 36" class="aq-fish"><path class="tail" d="M19 18 C12 12 6 6 1 3 C6 10 8 14 9 18 C8 22 6 26 1 33 C6 30 12 24 19 18Z"/>` +
    `<path d="M18 18 C26 8 44 7 57 18 C44 29 26 28 18 18Z"/><path class="fin" d="M30 10 C33 4 40 4 42 9"/><path class="fin" d="M38 25 C38 30 42 31 44 27"/>${extra}<circle class="eye" cx="50" cy="16" r="2"/></svg>`;

  const CATALOG = [
    // ===================== Goldfish tank =====================
    { id: 'snail', tank: 'goldfish', kind: 'fish', name: 'Apple snail', price: 80, w: 0.1, ratio: 40 / 50,
      colors: ['#ffd166', '#ff9f43', '#c9a7ff'], mouth: [0.9, 0.9], move: { crawl: true, speed: 0.012, retarget: [4, 9], pause: [2, 6] },
      svg: '<svg viewBox="0 0 50 40" class="aq-fish aq-snail"><path class="foot" d="M4 37 C12 31 38 31 47 37Z" style="stroke:#e8d9c0"/><g class="feelers"><path class="line" d="M42 33 L46 24 M39 32 L41 22" style="stroke:#e8d9c0"/><circle class="eye" cx="46" cy="23" r="1.3"/><circle class="eye" cx="41" cy="21" r="1.3"/></g><path class="shell" d="M32 31 C37 16 27 5 16 7 C5 10 3 25 11 31 C18 35 26 31 24 24 C22 18 15 19 16 24"/></svg>' },
    { id: 'whitecloud', tank: 'goldfish', kind: 'fish', name: 'White cloud minnow', price: 100, w: 0.1, ratio: 18 / 50,
      colors: ['#bfefff', '#d8f7ff'], mouth: [0.9, 0.5], move: { speed: 0.17, accel: 0.45, zone: [0.12, 0.65], school: true, spread: 0.8, retarget: [1.5, 3], darts: true },
      svg: '<svg viewBox="0 0 50 18" class="aq-fish"><path class="tail" d="M10 9 L2 3 L4 9 L2 15Z" style="stroke:#ff6b6b"/><path d="M8 9 C16 3 36 3 45 9 C36 15 16 15 8 9Z"/><path class="stripe" d="M14 8.5 L40 8.5" style="stroke:#ffd166"/><path class="fin" d="M24 4 L28 1 L31 4" style="stroke:#ff6b6b"/><circle class="eye" cx="40" cy="7.5" r="1.6"/></svg>' },
    { id: 'comet', tank: 'goldfish', kind: 'fish', name: 'Comet goldfish', price: 120, w: 0.15, ratio: 36 / 70,
      colors: ['#ff9f2a', '#ffb43a', '#ff6b3a'], mouth: [0.82, 0.52], move: 'goldfish', svg: cometBody() },
    { id: 'shubunkin', tank: 'goldfish', kind: 'fish', name: 'Shubunkin', price: 140, w: 0.15, ratio: 36 / 70,
      colors: ['#e6f2ff', '#cfe0ff'], mouth: [0.82, 0.52], move: 'goldfish',
      svg: cometBody('<circle class="spot" cx="30" cy="15" r="2.6" style="fill:#ff7a3a"/><circle class="spot" cx="39" cy="20" r="2.2" style="fill:#3a6bff"/><circle class="spot" cx="25" cy="20" r="1.8" style="fill:#2a2a3a"/><circle class="spot" cx="44" cy="13" r="1.6" style="fill:#ff7a3a"/>') },
    { id: 'fantail', tank: 'goldfish', kind: 'fish', name: 'Fantail', price: 180, w: 0.14, ratio: 44 / 64,
      colors: ['#ff9f2a', '#ff6b3a', '#ffd166'], mouth: [0.84, 0.48], move: 'fancy', svg: goldBody() },
    { id: 'ryukin', tank: 'goldfish', kind: 'fish', name: 'Ryukin', price: 220, w: 0.15, ratio: 44 / 64,
      colors: ['#ff5a3a', '#ff9f2a', '#fff0e0'], mouth: [0.84, 0.5], move: 'fancy', svg: goldBody('', { hump: 6 }) },
    { id: 'weatherloach', tank: 'goldfish', kind: 'fish', name: 'Weather loach', price: 240, w: 0.22, ratio: 20 / 100,
      colors: ['#d9b48a', '#c8a070'], mouth: [0.96, 0.6], move: { bottom: true, speed: 0.05, accel: 0.12, zone: [0.82, 0.88], retarget: [2, 5], pause: [1, 4] },
      svg: '<svg viewBox="0 0 100 20" class="aq-fish aq-eel"><path d="M4 10 C20 4 70 4 92 9 C96 10 96 12 92 13 C70 16 20 16 4 10Z"/><path class="fin" d="M30 6 C40 4 50 4 60 6"/><circle class="spot" cx="30" cy="10" r="1.3" style="fill:#5a4030"/><circle class="spot" cx="45" cy="11" r="1.3" style="fill:#5a4030"/><circle class="spot" cx="60" cy="10" r="1.3" style="fill:#5a4030"/><circle class="spot" cx="74" cy="11" r="1.3" style="fill:#5a4030"/><path class="fin" d="M94 12 L99 15 M93 13 L97 18"/><circle class="eye" cx="88" cy="9" r="1.5"/></svg>' },
    { id: 'oranda', tank: 'goldfish', kind: 'fish', name: 'Oranda', price: 280, w: 0.15, ratio: 44 / 64,
      colors: ['#ff9f2a', '#fff0e0', '#ffd166'], mouth: [0.85, 0.52], move: 'fancy',
      svg: goldBody('<path class="cap" d="M40 15 C40 8 46 7 48 10 C51 7 56 11 54 15 C56 18 53 22 49 21 C46 21 41 19 40 15Z" style="fill:#ff5a3a;fill-opacity:.75;stroke:#ff5a3a"/>', { eye: '<circle class="eye" cx="50" cy="22" r="2"/>' }) },
    { id: 'moor', tank: 'goldfish', kind: 'fish', name: 'Black moor', price: 300, w: 0.14, ratio: 44 / 64,
      colors: ['#8c8cff', '#a6a6d8'], mouth: [0.86, 0.55], move: 'fancy',
      svg: goldBody('<path d="M45 18 C46 12 54 11 56 16 C57 21 51 23 47 21Z"/>', { eye: '<circle class="eye" cx="52" cy="16.5" r="2.6"/>' }) },
    { id: 'bubbleeye', tank: 'goldfish', kind: 'fish', name: 'Bubble-eye', price: 360, w: 0.14, ratio: 44 / 64,
      colors: ['#ffb43a', '#fff0e0', '#ff7a3a'], mouth: [0.86, 0.45], move: 'fancy',
      svg: goldBody('<path class="bubble" d="M42 24 C41 32 54 33 55 25 C54 20 44 19 42 24Z"/>', { dorsal: false, eye: '<circle class="eye" cx="49" cy="17" r="2"/>' }) },

    { id: 'vallis', tank: 'goldfish', kind: 'plant', name: 'Eelgrass', price: 80, w: 0.13, ratio: 100 / 40, colors: ['#5dff9b', '#9bff5d'], svg: ribbon({ n: 6, h: 100, w: 40, bend: 6 }) },
    { id: 'hornwort', tank: 'goldfish', kind: 'plant', name: 'Hornwort', price: 120, w: 0.14, ratio: 100 / 50, colors: ['#3ddc84', '#7dffb0'], svg: stems({ stems: [[18, 0.95, 1], [32, 0.8, -1]], h: 100, w: 50, leaf: 'whorl', segs: 5 }) },
    { id: 'anubias', tank: 'goldfish', kind: 'plant', name: 'Anubias', price: 140, w: 0.15, ratio: 50 / 70, colors: ['#2fe08a', '#6dfc9a'], svg: rosette({ n: 6, len: 40, wide: 11, h: 50, w: 70, fan: 55 }) },
    { id: 'cabomba', tank: 'goldfish', kind: 'plant', name: 'Cabomba', price: 180, w: 0.14, ratio: 110 / 50, colors: ['#8dff5d', '#5dffc8'], svg: stems({ stems: [[16, 1, 1.5], [27, 0.85, -0.5], [37, 0.7, -1.5]], h: 110, w: 50, leaf: 'feather', segs: 5 }) },
    { id: 'lily', tank: 'goldfish', kind: 'plant', name: 'Water lily', price: 300, w: 0.18, ratio: 160 / 60, colors: ['#5dff9b'],
      svg: '<svg viewBox="0 0 60 160" class="aq-plant aq-stems aq-lily"><g class="seg s1"><path d="M30 160 C24 120 36 80 28 40 C26 30 28 20 30 14"/><g class="seg s2"><path class="leaf" d="M8 14 C8 6 52 6 52 14 C52 20 8 20 8 14Z"/><path class="flower" d="M24 9 L27 1 L30 8 L33 0 L36 9 C34 12 26 12 24 9Z" style="stroke:#ff9ad5;fill:#ff9ad5"/></g></g><g class="blade b2"><path class="leaf" d="M30 160 C20 140 14 130 10 120 C18 124 26 134 30 150Z"/></g><g class="blade b3"><path class="leaf" d="M30 160 C40 142 46 132 50 124 C42 128 34 138 30 152Z"/></g></svg>' },

    { id: 'pebbles', tank: 'goldfish', kind: 'decor', name: 'Coloured pebbles', price: 60, w: 0.16, ratio: 22 / 60, colors: ['#ffffff'],
      svg: '<svg viewBox="0 0 60 22" class="aq-decor"><ellipse cx="12" cy="16" rx="9" ry="6" style="stroke:#ff7a9a;fill:#ff7a9a"/><ellipse cx="28" cy="15" rx="8" ry="7" style="stroke:#7ad1ff;fill:#7ad1ff"/><ellipse cx="44" cy="16" rx="10" ry="6" style="stroke:#ffd166;fill:#ffd166"/><ellipse cx="22" cy="8" rx="6" ry="5" style="stroke:#a07aff;fill:#a07aff"/><ellipse cx="38" cy="7" rx="6" ry="5" style="stroke:#7affb0;fill:#7affb0"/></svg>' },
    { id: 'flowerpot', tank: 'goldfish', kind: 'decor', name: 'Tipped flowerpot', price: 120, w: 0.18, ratio: 40 / 60, colors: ['#ff8a5a'],
      svg: '<svg viewBox="0 0 60 40" class="aq-decor"><path d="M4 30 L12 6 L54 12 L50 38 L10 38Z"/><ellipse class="dark" cx="9" cy="22" rx="5" ry="14"/><path class="fin" d="M12 6 L8 4 L2 28 L4 30"/></svg>' },
    { id: 'bubbler', tank: 'goldfish', kind: 'decor', name: 'Bubbling clam', price: 160, w: 0.12, ratio: 1.4, colors: ['#9ad1ff', '#ffb0d0'],
      svg: '<svg viewBox="0 0 40 56" class="aq-decor aq-bubbler"><g class="stream"><circle cx="20" cy="40" r="2.5"/><circle cx="21" cy="40" r="2"/><circle cx="19" cy="40" r="3"/><circle cx="20" cy="40" r="1.8"/><circle cx="22" cy="40" r="2.4"/><circle cx="18" cy="40" r="2"/></g><path d="M4 50 C4 38 36 38 36 50Z"/><g class="lid"><path d="M4 50 C2 40 10 32 20 34 C30 32 38 40 36 50"/></g><path class="fin" d="M12 44 L14 50 M20 42 L20 50 M28 44 L26 50"/></svg>' },
    { id: 'bridge', tank: 'goldfish', kind: 'decor', name: 'Garden bridge', price: 280, w: 0.28, ratio: 40 / 90, colors: ['#ff5a5a', '#ffb43a'],
      svg: '<svg viewBox="0 0 90 40" class="aq-decor"><path d="M2 32 C20 8 70 8 88 32 L88 38 C70 18 20 18 2 38Z"/><path class="fin" d="M2 26 C20 2 70 2 88 26 M12 25 L12 16 M24 18 L24 8 M36 14 L36 4 M48 13 L48 4 M60 15 L60 6 M72 19 L72 10 M82 24 L82 18"/></svg>' },
    { id: 'castle', tank: 'goldfish', kind: 'decor', name: 'Castle', price: 400, w: 0.24, ratio: 1, colors: ['#c8d0ff', '#ffe0a0'],
      svg: '<svg viewBox="0 0 70 70" class="aq-decor"><path d="M14 70 L14 30 L56 30 L56 70Z"/><path d="M4 70 L4 18 L20 18 L20 70Z M50 70 L50 18 L66 18 L66 70Z"/><path class="fin" d="M4 18 L4 12 L8 12 L8 18 M12 18 L12 12 L16 12 L16 18 M50 18 L50 12 L54 12 L54 18 M58 18 L58 12 L62 12 L62 18 M20 30 L20 25 L26 25 L26 30 M32 30 L32 25 L38 25 L38 30 M44 30 L44 25 L50 25 L50 30"/><path class="dark" d="M29 70 L29 56 C29 48 41 48 41 56 L41 70Z"/><rect class="dark" x="9" y="28" width="6" height="8" rx="3"/><rect class="dark" x="55" y="28" width="6" height="8" rx="3"/><path class="fin" d="M35 30 L35 8"/><path d="M35 8 L46 12 L35 16Z" style="stroke:#ff5a5a;fill:#ff5a5a"/></svg>' },

    // ===================== Tropical tank =====================
    { id: 'danio', tank: 'tropical', kind: 'fish', name: 'Zebra danio', price: 100, w: 0.11, ratio: 20 / 56,
      colors: ['#e8f4ff', '#fff4c8'], mouth: [0.87, 0.5], move: { speed: 0.2, accel: 0.55, zone: [0.08, 0.55], school: true, spread: 0.9, retarget: [0.8, 2], darts: true },
      svg: '<svg viewBox="0 0 56 20" class="aq-fish"><path class="tail" d="M10 10 L2 4 L4 10 L2 16Z"/><path d="M8 10 C16 3 38 3 48 10 C38 17 16 17 8 10Z"/><path class="stripe" d="M14 8 L44 8 M14 11 L44 11 M16 14 L38 14" style="stroke:#4d7dff"/><circle class="eye" cx="42" cy="8.5" r="1.7"/></svg>' },
    { id: 'guppy', tank: 'tropical', kind: 'fish', name: 'Glow guppy', price: 120, w: 0.14, ratio: 34 / 60, mouth: [0.84, 0.5],
      move: { speed: 0.2, accel: 0.5, zone: [0.1, 0.75], school: true, spread: 1.1, retarget: [0.8, 2], darts: true },
      svg: '<svg viewBox="0 0 60 34" class="aq-fish"><path class="tail" d="M16 17 L3 5 C7 13 7 21 3 29Z"/><path d="M14 17 C22 6 40 5 50 17 C40 29 22 28 14 17Z"/><path class="fin" d="M27 9 L33 3 L38 10"/><circle class="eye" cx="43" cy="15" r="2.2"/></svg>' },
    { id: 'platy', tank: 'tropical', kind: 'fish', name: 'Platy', price: 140, w: 0.12, ratio: 32 / 54,
      colors: ['#ff7a2a', '#ff4a4a', '#ffd23a', '#5aa0ff'], mouth: [0.86, 0.47], move: { speed: 0.1, accel: 0.25, zone: [0.2, 0.75], school: true, spread: 1.6, retarget: [2, 4], pause: [0.5, 2] },
      svg: '<svg viewBox="0 0 54 32" class="aq-fish"><path class="tail" d="M13 16 L3 8 L5 16 L3 24Z"/><path d="M12 16 C18 5 38 4 47 15 C38 27 18 27 12 16Z"/><path class="fin" d="M24 7 L30 2 L34 7"/><circle class="eye" cx="40" cy="14" r="2"/></svg>' },
    { id: 'tetra', tank: 'tropical', kind: 'fish', name: 'Neon tetra', price: 160, w: 0.12, ratio: 26 / 60, mouth: [0.87, 0.5],
      move: { speed: 0.17, accel: 0.45, zone: [0.15, 0.7], school: true, spread: 0.8, retarget: [1.5, 3] },
      svg: '<svg viewBox="0 0 60 26" class="aq-fish"><path class="tail" d="M12 13 L2 5 L5 13 L2 21Z"/><path d="M10 13 C20 4 42 4 52 13 C42 22 20 22 10 13Z"/><path class="stripe" d="M17 13 L46 13"/><circle class="eye" cx="45" cy="11" r="2"/></svg>' },
    { id: 'cory', tank: 'tropical', kind: 'fish', name: 'Cory catfish', price: 180, w: 0.12, ratio: 28 / 56,
      colors: ['#d8c8a8', '#c0d8c0'], mouth: [0.9, 0.75], move: { bottom: true, speed: 0.07, accel: 0.18, zone: [0.82, 0.88], school: true, spread: 1.1, retarget: [1.5, 3], pause: [0.5, 2] },
      svg: '<svg viewBox="0 0 56 28" class="aq-fish"><path class="tail" d="M9 15 L2 9 L4 15 L2 21Z"/><path d="M8 16 C14 6 34 4 46 12 C50 15 50 19 46 21 L10 21Z"/><path class="fin" d="M24 8 L28 1 L33 7"/><path class="fin" d="M47 20 L52 24 M46 21 L49 26"/><circle class="spot" cx="20" cy="15" r="1.3" style="fill:#2a2a3a"/><circle class="spot" cx="27" cy="13" r="1.3" style="fill:#2a2a3a"/><circle class="spot" cx="34" cy="15" r="1.3" style="fill:#2a2a3a"/><circle class="eye" cx="42" cy="12" r="1.8"/></svg>' },
    { id: 'gourami', tank: 'tropical', kind: 'fish', name: 'Dwarf gourami', price: 280, w: 0.14, ratio: 36 / 56,
      colors: ['#5ab4ff', '#ff8a5a'], mouth: [0.86, 0.45], move: { speed: 0.05, accel: 0.1, zone: [0.15, 0.6], retarget: [2, 5], pause: [1, 3] },
      svg: '<svg viewBox="0 0 56 36" class="aq-fish"><path class="tail" d="M11 18 L3 11 L5 18 L3 25Z"/><path d="M10 18 C16 6 38 5 48 16 C40 30 18 30 10 18Z"/><path class="stripe" d="M18 10 L22 26 M25 9 L29 27 M32 9 L36 26 M39 11 L42 24" style="stroke:#ff4a6a"/><path class="fin" d="M38 26 C36 34 30 36 24 35"/><circle class="eye" cx="43" cy="15" r="2"/></svg>' },
    { id: 'angel', tank: 'tropical', kind: 'fish', name: 'Angelfish', price: 300, w: 0.14, ratio: 70 / 60, mouth: [0.86, 0.5],
      move: { speed: 0.06, accel: 0.08, zone: [0.2, 0.62], school: true, spread: 1.6, retarget: [3, 6], pause: [1, 3] },
      svg: '<svg viewBox="0 0 60 70" class="aq-fish"><path class="tail" d="M16 35 L5 27 L8 35 L5 43Z"/><path d="M30 22 L22 2 L41 20Z"/><path d="M30 48 L22 68 L41 50Z"/><path d="M14 35 C24 18 40 18 51 35 C40 52 24 52 14 35Z"/><path class="fin" d="M28 23 L28 47 M37 22 L37 48"/><circle class="eye" cx="44" cy="32" r="2.3"/></svg>' },
    { id: 'betta', tank: 'tropical', kind: 'fish', name: 'Betta', price: 320, w: 0.17, ratio: 50 / 70,
      colors: ['#ff3a5a', '#4a6aff', '#b05aff'], mouth: [0.82, 0.45], move: { speed: 0.04, accel: 0.08, zone: [0.08, 0.4], retarget: [3, 6], pause: [2, 4] },
      svg: '<svg viewBox="0 0 70 50" class="aq-fish aq-betta"><path class="tail" d="M25 24 C14 8 4 6 1 14 C6 22 2 32 8 42 C14 40 20 32 25 24Z"/><path d="M24 24 C30 17 46 16 57 22 C48 30 32 31 24 24Z"/><path class="fin" d="M32 18 C34 6 44 4 48 17"/><path class="fin" d="M32 28 C34 42 46 46 48 29"/><circle class="eye" cx="51" cy="21" r="1.8"/></svg>' },
    { id: 'clownloach', tank: 'tropical', kind: 'fish', name: 'Clown loach', price: 360, w: 0.16, ratio: 26 / 64,
      colors: ['#ff9a2a', '#ffb43a'], mouth: [0.92, 0.62], move: { bottom: true, speed: 0.08, accel: 0.2, zone: [0.72, 0.88], school: true, spread: 1.2, retarget: [1.5, 3], pause: [0.5, 1.5] },
      svg: '<svg viewBox="0 0 64 26" class="aq-fish"><path class="tail" d="M7 13 L1 6 L3 13 L1 20Z" style="stroke:#ff5a3a"/><path d="M6 13 C14 5 44 4 56 11 C58 13 58 15 56 16 C44 22 14 21 6 13Z"/><path class="band" d="M18 6 L18 20 M32 5 L32 21 M45 6 L45 19"/><path class="fin" d="M56 15 L61 18"/><circle class="eye" cx="51" cy="11" r="1.6"/></svg>' },
    { id: 'discus', tank: 'tropical', kind: 'fish', name: 'Discus', price: 600, w: 0.17, ratio: 56 / 60,
      colors: ['#ff6a8a', '#3ad6ff', '#ffa03a'], mouth: [0.9, 0.5], move: { speed: 0.04, accel: 0.07, zone: [0.25, 0.6], school: true, spread: 1.5, retarget: [3, 6], pause: [2, 4] },
      svg: '<svg viewBox="0 0 60 56" class="aq-fish"><path class="tail" d="M11 28 L3 22 L5 28 L3 34Z"/><path d="M10 28 C10 8 50 6 54 26 C52 48 12 50 10 28Z"/><path class="stripe" d="M18 12 C16 28 20 40 18 46 M26 9 C24 28 28 42 26 49 M34 8 C32 28 36 42 34 49 M42 11 C40 26 44 38 42 46" style="stroke:#7a4aff"/><circle class="eye" cx="45" cy="24" r="2.4"/></svg>' },

    { id: 'hairgrass', tank: 'tropical', kind: 'plant', name: 'Dwarf hairgrass', price: 80, w: 0.18, ratio: 40 / 60, colors: ['#7dff5d', '#b4ff5d'], svg: ribbon({ n: 12, h: 40, w: 60, bend: 3, spread: 0.9 }) },
    { id: 'crypt', tank: 'tropical', kind: 'plant', name: 'Bronze crypt', price: 120, w: 0.14, ratio: 60 / 60, colors: ['#c8a05d', '#d07a5a'], svg: rosette({ n: 7, len: 48, wide: 7, h: 60, w: 60, fan: 45 }) },
    { id: 'ludwigia', tank: 'tropical', kind: 'plant', name: 'Red ludwigia', price: 140, w: 0.15, ratio: 110 / 50, colors: ['#ff5a6a', '#ff7a4a'], svg: stems({ stems: [[16, 1, 1], [28, 0.85, -0.5], [38, 0.7, -1]], h: 110, w: 50, leaf: 'pair', segs: 5 }) },
    { id: 'fern', tank: 'tropical', kind: 'plant', name: 'Water fern', price: 180, w: 0.16, ratio: 1.3, colors: ['#5dff9b', '#3dffd0'],
      svg: '<svg viewBox="0 0 50 65" class="aq-plant"><g class="blade b1"><path d="M25 65 L25 10"/><path d="M25 50 L12 42 M25 50 L38 42 M25 38 L14 30 M25 38 L36 30 M25 26 L17 19 M25 26 L33 19"/><path d="M25 10 C22 6 28 4 25 2"/></g></svg>' },
    { id: 'tigerlotus', tank: 'tropical', kind: 'plant', name: 'Tiger lotus', price: 240, w: 0.2, ratio: 60 / 80, colors: ['#ff4a5a', '#c84aff'], svg: rosette({ n: 5, len: 46, wide: 16, h: 60, w: 80, fan: 60, spots: true }) },

    { id: 'driftwood', tank: 'tropical', kind: 'decor', name: 'Driftwood', price: 160, w: 0.3, ratio: 40 / 100, colors: ['#c8945a', '#a87a4a'],
      svg: '<svg viewBox="0 0 100 40" class="aq-decor"><path d="M2 38 C20 30 40 30 60 32 C70 30 84 22 96 8 L98 12 C88 26 76 34 66 38Z"/><path class="fin" d="M30 31 C28 22 22 14 14 10 M50 31 C52 22 58 16 64 14 M80 24 C82 18 86 14 92 14"/></svg>' },
    { id: 'hut', tank: 'tropical', kind: 'decor', name: 'Coconut hut', price: 240, w: 0.17, ratio: 44 / 50, colors: ['#c8945a'],
      svg: '<svg viewBox="0 0 50 44" class="aq-decor"><path d="M4 42 C4 10 46 10 46 42Z"/><path class="fin" d="M10 30 C14 20 20 16 25 15 M40 30 C36 20 30 16 25 15 M25 15 L25 8"/><path class="dark" d="M19 42 L19 34 C19 28 31 28 31 34 L31 42Z"/><circle class="dark" cx="12" cy="30" r="3"/></svg>' },
    { id: 'tiki', tank: 'tropical', kind: 'decor', name: 'Tiki head', price: 300, w: 0.13, ratio: 70 / 34, colors: ['#d8a05a', '#a0d85a'],
      svg: '<svg viewBox="0 0 34 70" class="aq-decor"><path d="M4 70 L4 12 C4 4 30 4 30 12 L30 70Z"/><path class="fin" d="M4 16 L30 16"/><path class="dark" d="M8 22 L15 22 L15 30 L8 30Z M19 22 L26 22 L26 30 L19 30Z"/><path class="fin" d="M17 30 L14 42 L20 42"/><path class="dark" d="M9 48 C12 56 22 56 25 48Z"/><path class="fin" d="M4 62 L30 62"/></svg>' },
    { id: 'chest', tank: 'tropical', kind: 'decor', name: 'Treasure chest', price: 600, w: 0.17, ratio: 0.78, colors: ['#ffd166', '#ff9f43'],
      svg: '<svg viewBox="0 0 64 50" class="aq-decor aq-chest"><g class="bubbles"><circle cx="30" cy="22" r="2.6"/><circle cx="36" cy="22" r="1.8"/><circle cx="27" cy="22" r="1.5"/><circle cx="33" cy="22" r="2.2"/><circle cx="39" cy="22" r="1.4"/><circle cx="24" cy="22" r="2"/><circle cx="31" cy="22" r="1.2"/><circle cx="35" cy="22" r="2.8"/><circle cx="28" cy="22" r="1.7"/><circle cx="41" cy="22" r="2.1"/><circle cx="22" cy="22" r="1.3"/><circle cx="32" cy="22" r="2.4"/><circle cx="37" cy="22" r="1.5"/><circle cx="26" cy="22" r="2.2"/></g><path d="M6 26 L58 26 L56 50 L8 50Z"/><g class="lid"><path d="M6 26 C6 14 14 10 32 10 C50 10 58 14 58 26Z"/></g><path class="fin" d="M28 30 L36 30 L36 38 L28 38Z M6 34 L58 34"/></svg>' },
    { id: 'ship', tank: 'tropical', kind: 'decor', name: 'Sunken ship', price: 700, w: 0.34, ratio: 70 / 110, colors: ['#c8945a', '#d8c0a0'],
      svg: '<svg viewBox="0 0 110 70" class="aq-decor"><path d="M4 44 L14 66 L94 70 L106 46 C80 50 30 50 4 44Z"/><path class="fin" d="M10 52 L100 56 M24 50 L24 66 M50 52 L50 68 M76 53 L76 69"/><circle class="dark" cx="36" cy="58" r="3"/><circle class="dark" cx="62" cy="60" r="3"/><circle class="dark" cx="86" cy="60" r="3"/><path class="fin" d="M44 48 L38 6 M70 50 L72 18"/><path d="M38 10 C46 14 50 22 46 32 L41 30Z" style="fill-opacity:.12"/><path class="fin" d="M38 6 L30 4"/></svg>' },

    // ===================== Marine tank =====================
    { id: 'chromis', tank: 'marine', kind: 'fish', name: 'Blue chromis', price: 120, w: 0.11, ratio: 26 / 50,
      colors: ['#3df0ff', '#4dd0ff', '#5ab4ff'], mouth: [0.88, 0.48], move: { speed: 0.16, accel: 0.45, zone: [0.1, 0.6], school: true, spread: 0.85, retarget: [1.2, 2.5], darts: true },
      svg: '<svg viewBox="0 0 50 26" class="aq-fish"><path class="tail" d="M9 13 L2 5 L5 13 L2 21Z"/><path d="M8 13 C14 4 34 3 44 12 C34 22 14 22 8 13Z"/><path class="fin" d="M18 6 L24 2 L30 5"/><circle class="eye" cx="37" cy="11" r="1.9"/></svg>' },
    { id: 'crab', tank: 'marine', kind: 'fish', name: 'Red crab', price: 140, w: 0.12, ratio: 36 / 60,
      colors: ['#ff5a4a', '#ff8a3a', '#ff6a8a'], mouth: [0.5, 0.62], move: { crab: true, crawl: true, speed: 0.05, retarget: [2, 5], pause: [1, 4] },
      svg: '<svg viewBox="0 0 60 36" class="aq-fish aq-crab"><g class="legs"><path class="fin" d="M18 26 L10 33 M22 27 L16 35 M38 27 L44 35 M42 26 L50 33"/></g><path d="M15 18 C8 18 4 12 6 8 L10 11 L9 6 C14 6 16 12 15 18Z"/><path d="M45 18 C52 18 56 12 54 8 L50 11 L51 6 C46 6 44 12 45 18Z"/><path d="M14 22 C14 10 46 10 46 22 C46 28 14 28 14 22Z"/><path class="fin" d="M25 13 L23 6 M35 13 L37 6"/><circle class="eye" cx="23" cy="5.5" r="2"/><circle class="eye" cx="37" cy="5.5" r="2"/></svg>' },
    { id: 'clownfish', tank: 'marine', kind: 'fish', name: 'Clownfish', price: 160, w: 0.12, ratio: 30 / 54,
      colors: ['#ff8a2a', '#ff6a1a'], mouth: [0.86, 0.5], move: { speed: 0.06, accel: 0.14, zone: [0.5, 0.85], retarget: [2, 4], pause: [0.5, 2], nearPlants: true, homes: ['anemone'], school: true, spread: 1, catchUp: 2 },
      svg: '<svg viewBox="0 0 54 30" class="aq-fish"><path class="tail" d="M11 15 C4 8 2 10 3 15 C2 20 4 22 11 15Z"/><path d="M10 15 C16 5 38 4 47 14 C38 26 16 26 10 15Z"/><path class="band-w" d="M20 7 C18 12 18 18 20 23 M31 5 C29 12 29 18 31 25 M40 8 C38 12 38 18 40 22"/><circle class="eye" cx="43" cy="12" r="1.9"/></svg>' },
    { id: 'yellowtang', tank: 'marine', kind: 'fish', name: 'Yellow tang', price: 240, w: 0.14, ratio: 50 / 56,
      colors: ['#ffe03a', '#ffd23a'], mouth: [0.96, 0.4], move: { speed: 0.1, accel: 0.18, zone: [0.15, 0.65], retarget: [2, 4], school: true, spread: 1.4 },
      svg: '<svg viewBox="0 0 56 50" class="aq-fish"><path class="tail" d="M9 25 L2 19 L4 25 L2 31Z"/><path d="M8 25 C14 4 42 4 50 22 C42 46 14 46 8 25Z"/><path class="fin" d="M48 20 L54 20"/><circle class="eye" cx="42" cy="18" r="2"/></svg>' },
    { id: 'bluetang', tank: 'marine', kind: 'fish', name: 'Blue tang', price: 300, w: 0.16, ratio: 38 / 64,
      colors: ['#3a7aff', '#2a9aff'], mouth: [0.88, 0.45], move: { speed: 0.11, accel: 0.18, zone: [0.15, 0.6], retarget: [2, 4], wide: true },
      svg: '<svg viewBox="0 0 64 38" class="aq-fish"><path class="tail" d="M11 19 L3 12 L5 19 L3 26Z" style="stroke:#ffd84a"/><path d="M10 19 C18 5 44 4 55 17 C44 32 18 33 10 19Z"/><path class="band" d="M18 12 C30 8 42 10 50 15 M22 24 C30 18 40 18 46 20"/><circle class="eye" cx="49" cy="15" r="2"/></svg>' },
    { id: 'puffer', tank: 'marine', kind: 'fish', name: 'Puffer', price: 400, w: 0.13, ratio: 50 / 60, mouth: [0.8, 0.6],
      move: { speed: 0.05, accel: 0.12, zone: [0.35, 0.8], retarget: [2, 4], pause: [1.5, 4], puffs: true },
      svg: '<svg viewBox="0 0 60 50" class="aq-fish"><path class="tail" d="M14 25 L3 17 L6 25 L3 33Z"/><circle cx="32" cy="25" r="16"/><path class="fin" d="M32 6 L32 2 M44 10 L47 7 M20 10 L17 7 M32 44 L32 48 M44 40 L47 43 M20 40 L17 43 M50 25 L54 25"/><circle class="eye" cx="40" cy="20" r="2.6"/><path class="fin" d="M44 30 Q47 32 44 34"/></svg>' },
    { id: 'seahorse', tank: 'marine', kind: 'fish', name: 'Seahorse', price: 440, w: 0.08, ratio: 70 / 40, mouth: [0.99, 0.23],
      move: { speed: 0.03, accel: 0.06, zone: [0.55, 0.85], retarget: [4, 8], pause: [2, 5], nearPlants: true, school: true, spread: 0.7, catchUp: 2.5 },
      svg: '<svg viewBox="0 0 40 70" class="aq-fish"><path d="M18 8 C26 4 33 8 32 14 L40 16 L31 19 C34 30 31 40 22 46 C15 51 15 60 21 62 C26 63 27 57 23 56"/><path class="fin" d="M18 26 C12 28 11 36 16 38"/><circle class="eye" cx="25" cy="12" r="1.8"/></svg>' },
    { id: 'lionfish', tank: 'marine', kind: 'fish', name: 'Lionfish', price: 700, w: 0.2, ratio: 56 / 70,
      colors: ['#ff6a5a', '#ff8a6a'], mouth: [0.85, 0.48], move: { speed: 0.03, accel: 0.06, zone: [0.3, 0.75], retarget: [4, 8], pause: [3, 6] },
      svg: '<svg viewBox="0 0 70 56" class="aq-fish"><path class="tail" d="M17 28 L8 22 L10 28 L8 34Z"/><path class="fin" d="M24 20 L18 2 M30 19 L28 1 M36 19 L38 2 M42 20 L48 4"/><path class="fin" d="M30 32 C24 44 16 52 8 50 M34 33 C30 46 26 54 18 55"/><path d="M16 28 C24 18 44 18 57 26 C46 36 26 38 16 28Z"/><path class="band-w" d="M28 21 L26 34 M34 20 L33 35 M40 21 L40 34 M46 22 L46 32"/><circle class="eye" cx="51" cy="24" r="2"/></svg>' },
    { id: 'octopus', tank: 'marine', kind: 'fish', name: 'Octopus', price: 1000, w: 0.14, ratio: 100 / 80, mouth: [0.5, 0.62], move: { octo: true },
      svg: '<svg viewBox="0 0 80 100" class="aq-fish aq-octo"><g class="arms"><path d="M22 50 C12 64 26 76 12 90"/><path d="M29 54 C24 70 36 82 27 96"/><path d="M37 56 C36 72 44 84 38 98"/><path d="M44 56 C46 72 38 84 45 98"/><path d="M51 54 C56 70 44 82 53 96"/><path d="M58 50 C68 64 54 76 68 90"/></g><path class="mantle" d="M40 6 C58 6 66 22 64 38 C62 50 52 56 40 56 C28 56 18 50 16 38 C14 22 22 6 40 6Z"/><circle class="eye" cx="32" cy="40" r="3.2"/><circle class="eye" cx="48" cy="40" r="3.2"/></svg>' },
    { id: 'shark', tank: 'marine', kind: 'fish', name: 'Reef shark', price: 1800, w: 0.34, ratio: 76 / 200, mouth: [0.94, 0.6],
      move: { speed: 0.11, accel: 0.07, zone: [0.1, 0.55], patrol: true, retarget: [6, 10] },
      svg: '<svg viewBox="0 0 200 76" class="aq-fish"><path class="tail" d="M34 42 L4 14 L14 42 L4 70Z"/><path d="M30 42 C60 28 120 22 160 30 C178 34 190 38 198 42 C188 46 176 50 160 52 C120 58 60 56 30 42Z"/><path d="M98 27 L116 3 L128 28Z"/><path d="M122 52 L104 72 L134 53Z"/><path class="fin" d="M150 36 L148 46 M155 35 L153 46 M160 35 L158 46"/><circle class="eye" cx="177" cy="38" r="2.4"/></svg>' },

    { id: 'seagrass', tank: 'marine', kind: 'plant', name: 'Seagrass', price: 100, w: 0.14, ratio: 1.8,
      svg: '<svg viewBox="0 0 40 72" class="aq-plant"><g class="blade b1"><path d="M14 72 C12 52 18 34 10 10"/></g><g class="blade b2"><path d="M20 72 C22 50 16 30 22 2"/></g><g class="blade b3"><path d="M26 72 C28 54 24 40 32 18"/></g></svg>' },
    { id: 'caulerpa', tank: 'marine', kind: 'plant', name: 'Sea grapes', price: 120, w: 0.14, ratio: 80 / 50, colors: ['#5dff9b', '#9bff5d'], svg: stems({ stems: [[18, 1, 1], [32, 0.8, -1]], h: 80, w: 50, leaf: 'grapes', segs: 4 }) },
    { id: 'featherduster', tank: 'marine', kind: 'plant', name: 'Feather duster', price: 200, w: 0.13, ratio: 80 / 50, colors: ['#ff7ad0', '#ffd166', '#7ad8ff'],
      svg: '<svg viewBox="0 0 50 80" class="aq-plant aq-anemone"><path class="tube" d="M23 80 L23 36 L27 36 L27 80Z" style="stroke:#d8c0a0;fill:#d8c0a0"/><g class="tentacle t1"><path d="M25 36 C18 30 10 26 4 26"/></g><g class="tentacle t2"><path d="M25 36 C20 28 14 20 10 14"/></g><g class="tentacle t3"><path d="M25 36 C24 26 24 18 25 8"/></g><g class="tentacle t4"><path d="M25 36 C30 28 36 20 40 14"/></g><g class="tentacle t5"><path d="M25 36 C32 30 40 26 46 26"/></g></svg>' },
    { id: 'kelp', tank: 'marine', kind: 'plant', name: 'Tall kelp', price: 240, w: 0.13, ratio: 3.2,
      svg: '<svg viewBox="0 0 30 96" class="aq-plant aq-kelp"><g class="seg s1"><path d="M15 96 C11 84 19 76 15 64"/><path class="leaf" d="M15 78 C22 74 26 70 26 64 C21 66 17 70 15 74Z"/><g class="seg s2"><path d="M15 64 C11 52 19 44 15 32"/><path class="leaf" d="M15 46 C8 42 4 38 4 32 C9 34 13 38 15 42Z"/><g class="seg s3"><path d="M15 32 C12 22 18 12 14 2"/><path class="leaf" d="M15 16 C22 12 26 8 25 2 C20 4 16 8 15 12Z"/></g></g></g></svg>' },
    { id: 'anemone', tank: 'marine', kind: 'plant', name: 'Anemone', price: 320, w: 0.17, ratio: 0.9,
      svg: '<svg viewBox="0 0 60 54" class="aq-plant aq-anemone"><g class="tentacle t1"><path d="M22 34 C16 24 12 16 8 8"/></g><g class="tentacle t2"><path d="M26 32 C24 20 22 12 22 3"/></g><g class="tentacle t3"><path d="M30 32 C31 20 32 12 34 2"/></g><g class="tentacle t4"><path d="M34 32 C38 22 42 14 48 6"/></g><g class="tentacle t5"><path d="M38 34 C44 26 50 22 56 16"/></g><path d="M14 54 C14 40 22 32 30 32 C38 32 46 40 46 54Z"/></svg>' },

    { id: 'shell', tank: 'marine', kind: 'decor', name: 'Spiral shell', price: 80, w: 0.1, ratio: 0.8,
      svg: '<svg viewBox="0 0 50 40" class="aq-decor"><path d="M6 38 C4 22 16 6 32 8 C46 10 50 26 40 34 C32 40 22 34 24 26 C26 20 34 20 34 26"/><path class="fin" d="M4 38 L46 38"/></svg>' },
    { id: 'starfish', tank: 'marine', kind: 'decor', name: 'Starfish', price: 100, w: 0.09, ratio: 0.95, sticks: true,
      svg: '<svg viewBox="0 0 50 48" class="aq-decor"><path d="M25 2 L31 18 L48 18 L34 28 L40 46 L25 35 L10 46 L16 28 L2 18 L19 18Z"/><circle class="fin" cx="25" cy="24" r="3"/></svg>' },
    { id: 'coral', tank: 'marine', kind: 'decor', name: 'Fan coral', price: 300, w: 0.14, ratio: 1,
      svg: '<svg viewBox="0 0 60 60" class="aq-decor aq-coral"><path d="M30 60 L30 36 M30 44 L18 30 M30 40 L42 26 M18 30 L10 18 M18 30 L22 14 M42 26 L50 14 M42 26 L38 10 M30 36 L30 20 M30 20 L26 6 M30 20 L34 4"/><circle cx="10" cy="18" r="2.5"/><circle cx="22" cy="14" r="2.5"/><circle cx="50" cy="14" r="2.5"/><circle cx="38" cy="10" r="2.5"/><circle cx="26" cy="6" r="2.5"/><circle cx="34" cy="4" r="2.5"/></svg>' },
    { id: 'clam', tank: 'marine', kind: 'decor', name: 'Giant clam', price: 440, w: 0.17, ratio: 40 / 60, colors: ['#7ad8ff', '#b07aff', '#5dffc8'],
      svg: '<svg viewBox="0 0 60 40" class="aq-decor aq-clam"><path d="M4 30 C4 40 56 40 56 30 C50 34 10 34 4 30Z"/><path class="mantle" d="M6 30 C12 26 18 32 24 27 C30 32 36 26 42 31 C48 26 52 30 54 30" style="stroke:#3ad6ff"/><g class="lid"><path d="M4 30 C4 12 56 12 56 30 C50 26 10 26 4 30Z"/><path class="fin" d="M14 26 L12 17 M24 25 L23 14 M36 25 L37 14 M46 26 L48 17"/></g></svg>' },
    { id: 'anchor', tank: 'marine', kind: 'decor', name: 'Old anchor', price: 500, w: 0.14, ratio: 1.15,
      svg: '<svg viewBox="0 0 52 60" class="aq-decor"><circle cx="26" cy="7" r="5"/><path d="M26 12 L26 56 M16 20 L36 20"/><path d="M6 40 C8 52 18 57 26 56 C34 57 44 52 46 40"/><path d="M6 40 L2 44 M6 40 L11 43 M46 40 L50 44 M46 40 L41 43"/></svg>' },

    // ===================== No longer sold (kept for tanks that have them) =====================
    { id: 'moonjelly', tank: null, kind: 'fish', name: 'Moon jelly', price: 520, w: 0.11, ratio: 70 / 40, mouth: [0.5, 0.4], move: { jelly: true },
      svg: '<svg viewBox="0 0 40 70" class="aq-fish aq-jelly"><path class="bell" d="M4 24 C4 6 36 6 36 24 C30 21 10 21 4 24Z"/><g class="tentacles"><path d="M10 24 C6 36 14 44 9 58"/><path d="M17 24 C14 38 21 48 16 66"/><path d="M24 24 C27 38 19 48 24 66"/><path d="M31 24 C35 36 27 44 31 58"/></g></svg>' },
    { id: 'turtle', tank: null, kind: 'fish', name: 'Sea turtle', price: 900, w: 0.22, ratio: 56 / 90, mouth: [0.88, 0.5],
      move: { speed: 0.07, accel: 0.05, zone: [0.05, 0.7], wide: true, retarget: [5, 9], tilt: 1 },
      svg: '<svg viewBox="0 0 90 56" class="aq-fish aq-turtle"><g class="flipper front"><path d="M56 17 C52 6 42 0 30 1 C38 7 45 13 48 19Z"/></g><g class="flipper back"><path d="M56 39 C52 50 42 56 30 55 C38 49 45 43 48 37Z"/></g><path d="M22 32 C16 38 10 40 6 40 C10 35 14 31 20 29Z"/><ellipse cx="42" cy="28" rx="24" ry="15"/><path class="fin" d="M26 28 L42 18 L58 28 L42 38Z M42 18 L42 38 M26 28 L58 28"/><circle cx="72" cy="27" r="7"/><circle class="eye" cx="75" cy="25" r="1.6"/></svg>' },
    { id: 'manta', tank: null, kind: 'fish', name: 'Manta ray', price: 1200, w: 0.26, ratio: 50 / 100, mouth: [0.88, 0.5],
      move: { speed: 0.08, accel: 0.06, zone: [0.15, 0.6], wide: true, retarget: [5, 9], swoop: true },
      svg: '<svg viewBox="0 0 100 50" class="aq-fish aq-manta"><path d="M88 25 C87 19 80 13 58 1 C56 12 48 20 36 25 C48 30 56 38 58 49 C80 37 87 31 88 25Z"/><path class="fin" d="M87 21 C91 20 94 18 96 16 M87 29 C91 30 94 32 96 34"/><path class="fin" d="M37 25 L4 24"/><circle class="eye" cx="84" cy="20" r="1.5"/><circle class="eye" cx="84" cy="30" r="1.5"/></svg>' },
    { id: 'rockarch', tank: null, kind: 'decor', name: 'Rock arch', price: 240, w: 0.22, ratio: 0.6,
      svg: '<svg viewBox="0 0 80 48" class="aq-decor aq-rock"><path d="M4 48 C2 22 18 6 40 6 C62 6 78 22 76 48 L60 48 C60 32 52 22 40 22 C28 22 20 32 20 48Z"/><path class="fin" d="M18 14 C22 12 26 12 28 14 M50 12 C54 11 58 12 60 15"/></svg>' },
  ];

  // Shared ways of swimming.
  const MOVE_TYPES = {
    goldfish: { speed: 0.07, accel: 0.12, zone: [0.12, 0.75], retarget: [2.5, 5], pause: [0.5, 2], school: true, spread: 1.8, catchUp: 1.6 },
    fancy: { speed: 0.045, accel: 0.08, zone: [0.15, 0.75], retarget: [3, 6], pause: [1, 3], school: true, spread: 1.7, catchUp: 1.6 },
  };
  for (const c of CATALOG) if (typeof c.move === 'string') c.move = MOVE_TYPES[c.move];

  root.ArrowAquariumItems = { TANKS, CATALOG };
})(window);
