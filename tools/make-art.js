/*
 * Draws the app icon, splash screen and Google Play feature graphic (from
 * SVG, in the game's look), and saves them as PNGs:
 *
 *   assets/icon-only.png, icon-foreground.png, icon-background.png,
 *   splash.png, splash-dark.png      inputs for `npx @capacitor/assets generate`
 *   store/icon-512.png               the Play Store icon
 *   store/feature-graphic.png        the Play Store feature graphic (1024 x 500)
 *
 *   node tools/make-art.js           (needs Playwright's Chromium)
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const C1 = '#5ef2ff', C2 = '#ff5dc8';

// The two eels from the menu logo: straight runs with square turns.
const EELS = `
  <g class="eel" style="--c:${C1}">
    <path class="glow" d="M12 52 L12 12 L52 12 L52 28 L84 28"/><path class="body" d="M12 52 L12 12 L52 12 L52 28 L84 28"/><path class="shine" d="M12 52 L12 12 L52 12 L52 28 L84 28"/>
    <path class="head" d="M101 28 L83 17.5 Q87.5 28 83 38.5 Z"/><circle class="eye" cx="88" cy="25" r="2.3"/><circle class="pupil" cx="88.6" cy="25" r="1.05"/>
  </g>
  <g class="eel" style="--c:${C2}">
    <path class="glow" d="M28 40 L28 60 L72 60 L72 44 L106 44"/><path class="body" d="M28 40 L28 60 L72 60 L72 44 L106 44"/><path class="shine" d="M28 40 L28 60 L72 60 L72 44 L106 44"/>
    <path class="head" d="M123 44 L105 33.5 Q109.5 44 105 54.5 Z"/><circle class="eye" cx="110" cy="41" r="2.3"/><circle class="pupil" cx="110.6" cy="41" r="1.05"/>
  </g>`;
const STYLE = `<style>
  .eel path { fill: none; stroke: var(--c); stroke-linecap: round; stroke-linejoin: round; }
  .eel .glow { stroke-width: 15; opacity: 0.25; filter: url(#blur); }
  .eel .body { stroke-width: 7.5; }
  .eel .shine { stroke: #fff; stroke-width: 1.8; opacity: 0.5; }
  .eel .head { fill: var(--c); stroke-width: 1.5; }
  .eye { fill: #fff; } .pupil { fill: #021022; }
  text { font-family: 'Fredoka', sans-serif; font-weight: 600; }
</style>`;
const DEFS = `<defs>
  <radialGradient id="sea" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#0d4f86"/><stop offset="0.55" stop-color="#062a52"/><stop offset="1" stop-color="#020a18"/></radialGradient>
  <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff6ff" stop-opacity="0.18"/><stop offset="1" stop-color="#bff6ff" stop-opacity="0"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>`;
// Deep water: a glow from above, a few light rays and bubbles.
const sea = (w, h) => `<rect width="${w}" height="${h}" fill="url(#sea)"/>
  <path d="M${w * 0.18} 0 L${w * 0.32} 0 L${w * 0.2} ${h} L${w * 0.02} ${h}Z M${w * 0.5} 0 L${w * 0.58} 0 L${w * 0.62} ${h} L${w * 0.46} ${h}Z M${w * 0.78} 0 L${w * 0.9} 0 L${w * 1.02} ${h} L${w * 0.84} ${h}Z" fill="url(#ray)"/>
  ${[[0.12, 0.8, 0.012], [0.86, 0.22, 0.016], [0.9, 0.7, 0.01], [0.16, 0.2, 0.009], [0.78, 0.88, 0.012]].map(([x, y, r]) => `<circle cx="${w * x}" cy="${h * y}" r="${Math.min(w, h) * r}" fill="none" stroke="#c8f5ff" stroke-opacity="0.5" stroke-width="${Math.min(w, h) * 0.004}"/>`).join('')}`;
// The eels (logo is 132 x 70), centred in a box.
const eels = (cx, cy, width) => { const s = width / 132; return `<g transform="translate(${cx - 66 * s} ${cy - 35 * s}) scale(${s})">${EELS}</g>`; };
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${STYLE}${body}</svg>`;

const ART = {
  'assets/icon-only.png': [1024, 1024, () => sea(1024, 1024) + eels(512, 530, 800)],
  // Android adaptive icon: the eels on a transparent layer inside the safe zone, the sea behind.
  'assets/icon-foreground.png': [1024, 1024, () => eels(512, 525, 560)],
  'assets/icon-background.png': [1024, 1024, () => sea(1024, 1024)],
  // (A plain background keeps the splash images, and so the app, small.)
  'assets/splash.png': [2732, 2732, () => `<rect width="2732" height="2732" fill="#031127"/>` + eels(1366, 1250, 900) + `<text x="1366" y="1600" font-size="190" fill="${C1}" text-anchor="middle">Eel Escape</text>`],
  'assets/splash-dark.png': [2732, 2732, () => `<rect width="2732" height="2732" fill="#031127"/>` + eels(1366, 1250, 900) + `<text x="1366" y="1600" font-size="190" fill="${C1}" text-anchor="middle">Eel Escape</text>`],
  'store/icon-512.png': [512, 512, () => sea(512, 512) + eels(256, 265, 400)],
  'store/feature-graphic.png': [1024, 500, () => sea(1024, 500) + eels(250, 250, 360) +
    `<text x="470" y="235" font-size="92" fill="${C1}">Eel Escape</text><text x="474" y="305" font-size="34" fill="#cfefff" style="font-family:Nunito,sans-serif;font-weight:700">Untangle the glowing eels.</text><text x="474" y="352" font-size="34" fill="#cfefff" style="font-family:Nunito,sans-serif;font-weight:700">Build your own aquarium.</text>`],
};

(async () => {
  // The game's own fonts, embedded (a blank page can't load local files).
  const fonts = fs.readFileSync(path.join(root, 'fonts', 'fonts.css'), 'utf8').replace(/url\(['"]?([^'")]+\.woff2)['"]?\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, 'fonts', f)).toString('base64')})`);
  const b = await chromium.launch();
  for (const [file, [w, h, draw]] of Object.entries(ART)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const transparent = file.includes('foreground');
    await p.setContent(`<html><head><style>${fonts} html,body{margin:0;background:${transparent ? 'transparent' : '#020a18'}}</style></head><body>${svg(w, h, draw())}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(root, file), omitBackground: transparent });
    await p.close();
    console.log('made', file, `${w}x${h}`);
  }
  await b.close();
})();
