// Adds a ?v=<content hash> to the page's own CSS and JS links in index.html,
// so browsers fetch new copies whenever a file changes instead of mixing a
// fresh page with stale cached scripts. Run after changing any of them:
//   node tools/stamp-versions.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/(src|href)="([\w.-]+\.(?:js|css))(?:\?v=\w+)?"/g, (all, attr, name) => {
  const target = path.join(root, name);
  if (!fs.existsSync(target)) return all;
  const hash = crypto.createHash('sha1').update(fs.readFileSync(target)).digest('hex').slice(0, 8);
  return `${attr}="${name}?v=${hash}"`;
});
fs.writeFileSync(file, html);
console.log(html.match(/(src|href)="[\w.-]+\.(js|css)\?v=\w+"/g).join('\n'));
