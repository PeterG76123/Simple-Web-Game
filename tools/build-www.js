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
  'config.js', 'wallet.js', 'pearl-pour.js', 'settings.js', 'audio.js', 'rules.js', 'levels-data.js',
  'art.js', 'intro.js', 'sea-life.js', 'ads.js', 'store.js', 'shop.js', 'aquarium-items.js', 'aquarium.js', 'daily.js', 'game.js',
];
const DIRS = ['fonts', 'music'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });

// Which build this is, shown small at the bottom of Settings:
//   phone app: "Version 1.0 (build 135) · 1a2b3c4 · 15 Nov 2026" (VERSION_NAME and
//   VERSION_CODE come from the Android workflow; BUILD_EXTRA notes test builds)
//   web:       "Web version · 1a2b3c4 · 15 Nov 2026"
{
  const { execSync } = require('child_process');
  const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return ''; } };
  const sha = (process.env.GITHUB_SHA || git('rev-parse HEAD')).slice(0, 7);
  const when = new Date(Number(git('log -1 --format=%ct')) * 1000 || Date.now())
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });
  const parts = [
    process.env.VERSION_CODE ? `Version ${process.env.VERSION_NAME || '1.0'} (build ${process.env.VERSION_CODE})` : 'Web version',
    sha, when, process.env.BUILD_EXTRA,
  ].filter(Boolean);
  const file = path.join(out, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const stamped = html.replace(/(<p id="buildVersion"[^>]*>)[^<]*(<\/p>)/, `$1${parts.join(' · ')}$2`);
  if (stamped === html) throw new Error('No buildVersion line in index.html');
  fs.writeFileSync(file, stamped);
  console.log(`Build: ${parts.join(' · ')}`);
}
// In the app the page needs Capacitor's bridge, which Capacitor injects itself.
console.log(`Copied ${FILES.length} files and ${DIRS.length} folder${DIRS.length === 1 ? '' : 's'} into www/`);
