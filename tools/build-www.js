/*
 * Copies the game's files into www/, the folder Capacitor packs into the
 * phone app (the web version runs straight from the repository).
 *
 * Run with: npm run build   (or npm run android / npm run ios)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const FILES = [
  'index.html', 'style.css', 'privacy.html', 'remote-config.json',
  'config.js', 'wallet.js', 'settings.js', 'audio.js', 'rules.js', 'levels-data.js',
  'art.js', 'intro.js', 'sea-life.js', 'ads.js', 'store.js', 'shop.js', 'aquarium-items.js', 'aquarium.js', 'daily.js', 'game.js',
];
const DIRS = ['fonts'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// In the app the page needs Capacitor's bridge, which Capacitor injects itself.
console.log(`Copied ${FILES.length} files and ${DIRS.length} folder${DIRS.length === 1 ? '' : 's'} into www/`);
