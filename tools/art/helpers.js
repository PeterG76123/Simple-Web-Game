// Shared drawing helpers for the daily-picture artwork (1000x1000 SVG fragments).
const O = '#3b2416', W = 22;
const st = (w = W) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const face = (cx, cy, s = 1, mouth = 'smile') => {
  s = Math.max(s, 0.5) * 1.25;
  const e = (x) => `<ellipse cx="${x}" cy="${cy}" rx="${24 * s}" ry="${30 * s}" fill="${O}"/>`;
  const m = mouth === 'o' ? `<ellipse cx="${cx}" cy="${cy + 52 * s}" rx="${16 * s}" ry="${20 * s}" fill="${O}"/>`
    : `<path d="M${cx - 34 * s} ${cy + 40 * s} Q${cx} ${cy + 84 * s} ${cx + 34 * s} ${cy + 40 * s}" fill="none" ${st(Math.max(24, 18 * s))}/>`;
  return e(cx - 62 * s) + e(cx + 62 * s) +
    `<ellipse cx="${cx - 112 * s}" cy="${cy + 42 * s}" rx="${32 * s}" ry="${22 * s}" fill="#ff8fa3"/><ellipse cx="${cx + 112 * s}" cy="${cy + 42 * s}" rx="${32 * s}" ry="${22 * s}" fill="#ff8fa3"/>` + m;
};
// Sunglasses face: dark lenses with a shine, cheeks and a grin.
const shades = (cx, cy, s = 1) => `<path d="M${cx - 150 * s} ${cy - 30 * s} L${cx + 150 * s} ${cy - 30 * s}" ${st(26 * s)}/>
  <path d="M${cx - 150 * s} ${cy - 40 * s} L${cx - 20 * s} ${cy - 40 * s} C${cx - 20 * s} ${cy + 40 * s} ${cx - 140 * s} ${cy + 50 * s} ${cx - 150 * s} ${cy - 40 * s}Z M${cx + 150 * s} ${cy - 40 * s} L${cx + 20 * s} ${cy - 40 * s} C${cx + 20 * s} ${cy + 40 * s} ${cx + 140 * s} ${cy + 50 * s} ${cx + 150 * s} ${cy - 40 * s}Z" fill="#1d1d2b" ${st(16)}/>
  <path d="M${cx - 120 * s} ${cy - 20 * s} L${cx - 80 * s} ${cy - 20 * s} M${cx + 50 * s} ${cy - 20 * s} L${cx + 90 * s} ${cy - 20 * s}" stroke="#9be7ff" stroke-width="${16 * s}" stroke-linecap="round"/>
  <ellipse cx="${cx - 170 * s}" cy="${cy + 60 * s}" rx="${36 * s}" ry="${24 * s}" fill="#ff8fa3"/><ellipse cx="${cx + 170 * s}" cy="${cy + 60 * s}" rx="${36 * s}" ry="${24 * s}" fill="#ff8fa3"/>
  <path d="M${cx - 60 * s} ${cy + 80 * s} Q${cx} ${cy + 140 * s} ${cx + 60 * s} ${cy + 80 * s}" fill="none" ${st(26)}/>`;
const leaf = (x, y, rot, s = 1, c = '#2e9e4f') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C40 -60 120 -70 170 -40 C150 -20 165 10 140 20 C150 50 120 60 100 50 C90 80 50 70 40 50 C20 60 5 30 0 0Z" fill="${c}" ${st()}/><path d="M10 5 Q90 -20 150 -30" fill="none" ${st(10)}/></g>`;
const frond = (x, y, rot, s = 1, c = '#3bb862') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C80 -70 200 -70 300 10 C250 10 250 40 210 30 C200 60 160 50 140 40 C120 70 80 50 70 40 C40 50 20 30 0 0Z" fill="${c}" ${st()}/></g>`;
const sparkle = (x, y, r, c = '#ffd23f') => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${c}" ${st(14)}/>`;
const burst = (x, y, r, c) => Array.from({ length: 12 }, (_, i) => {
  const a = i * Math.PI / 6, x1 = x + r * 0.35 * Math.cos(a), y1 = y + r * 0.35 * Math.sin(a), x2 = x + r * Math.cos(a), y2 = y + r * Math.sin(a);
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${O}" stroke-width="40" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="20" stroke-linecap="round"/>`;
}).join('') + `<circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="${c}" ${st(14)}/>`;
const confetti = (pts) => pts.map(([x, y, c], i) => `<rect x="${x - 26}" y="${y - 16}" width="52" height="32" rx="8" transform="rotate(${i * 41} ${x} ${y})" fill="${c}" ${st(12)}/>`).join('');
const waves = (y, c = '#4fc3f7') => `<path d="M60 ${y} Q150 ${y - 50} 240 ${y} T420 ${y} T600 ${y} T780 ${y} T960 ${y} L960 ${y + 120} L60 ${y + 120}Z" fill="${c}" ${st()}/>`;
const sand = (y) => `<path d="M80 ${y} C250 ${y - 50} 750 ${y - 50} 920 ${y} L920 ${y + 90} L80 ${y + 90}Z" fill="#f6d58e" ${st()}/>`;

const heart = (x, y, s, c = '#ff4b6e', w = W) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 90 C-40 40 -160 10 -160 -80 C-160 -150 -60 -170 0 -100 C60 -170 160 -150 160 -80 C160 10 40 40 0 90Z" fill="${c}" ${st(w / s)}/>`;
// A chubby eel along path d, head (circle) at hx,hy.
const eel = (d, c, hx, hy, hr = 110, mouth) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="150" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${c}" stroke-width="106" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${hx}" cy="${hy}" r="${hr}" fill="${c}" ${st()}/>${face(hx, hy - hr * 0.1, hr / 150, mouth)}`;
const bubbles = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e6f7ff" ${st(12)}/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.22}" fill="#fff"/>`).join('');

module.exports = { O, W, st, face, shades, leaf, frond, sparkle, burst, confetti, waves, sand, heart, eel, bubbles };
