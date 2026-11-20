// Cute Lunar New Year / Valentine / ocean drawings for February 2027, 1000x1000, transparent background.
// Render: node tools/art/render.js ./tools/art/february-2027.js <out-dir>
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

const ART = {
'2027-02-01': ['Red lantern', `
  <path d="M500 40 L500 160" ${st(20)}/>
  <rect x="380" y="140" width="240" height="70" rx="18" fill="#ffc12b" ${st()}/>
  <path d="M500 190 C220 190 160 340 160 470 C160 600 220 750 500 750 C780 750 840 600 840 470 C840 340 780 190 500 190Z" fill="#e3263a" ${st()}/>
  <path d="M500 200 C380 260 360 680 500 740 M500 200 C620 260 640 680 500 740 M330 220 C220 330 220 610 330 720 M670 220 C780 330 780 610 670 720" fill="none" stroke="#b5121f" stroke-width="18"/>
  <rect x="380" y="730" width="240" height="70" rx="18" fill="#ffc12b" ${st()}/>
  ${[420, 470, 530, 580].map((x) => `<path d="M${x} 800 L${x} 950" stroke="${O}" stroke-width="36" stroke-linecap="round"/><path d="M${x} 800 L${x} 950" stroke="#ffd23f" stroke-width="16" stroke-linecap="round"/>`).join('')}
  ${face(500, 450, 1)}`],
'2027-02-02': ['Goat', `
  <path d="M330 240 C260 120 120 140 140 260 C160 340 240 320 250 280" fill="none" stroke="${O}" stroke-width="70" stroke-linecap="round"/><path d="M330 240 C260 120 120 140 140 260 C160 340 240 320 250 280" fill="none" stroke="#e8c48a" stroke-width="42" stroke-linecap="round"/>
  <path d="M670 240 C740 120 880 140 860 260 C840 340 760 320 750 280" fill="none" stroke="${O}" stroke-width="70" stroke-linecap="round"/><path d="M670 240 C740 120 880 140 860 260 C840 340 760 320 750 280" fill="none" stroke="#e8c48a" stroke-width="42" stroke-linecap="round"/>
  <path d="M260 380 C150 360 90 420 120 470 C160 520 250 480 290 440Z M740 380 C850 360 910 420 880 470 C840 520 750 480 710 440Z" fill="#f4ece0" ${st()}/>
  <path d="M500 220 C340 220 260 330 270 480 C280 640 380 760 500 760 C620 760 720 640 730 480 C740 330 660 220 500 220Z" fill="#fffaf2" ${st()}/>
  <path d="M380 260 C400 200 460 190 500 230 C540 190 600 200 620 260 C580 250 540 280 500 270 C460 280 420 250 380 260Z" fill="#f4ece0" ${st()}/>
  <path d="M440 740 C450 840 480 900 500 920 C520 900 550 840 560 740Z" fill="#f4ece0" ${st()}/>
  ${face(500, 450, 0.85)}
  <path d="M470 600 L530 600 L500 635Z" fill="${O}" ${st(12)}/>
  <path d="M400 790 L600 790" stroke="#e3263a" stroke-width="40" stroke-linecap="round"/><circle cx="500" cy="830" r="44" fill="#ffc12b" ${st()}/>`],
'2027-02-03': ['Dragon', `
  <path d="M220 820 C120 700 240 600 380 640 C540 690 620 600 560 500" fill="none" stroke="${O}" stroke-width="170" stroke-linecap="round"/>
  <path d="M220 820 C120 700 240 600 380 640 C540 690 620 600 560 500" fill="none" stroke="#2fae55" stroke-width="126" stroke-linecap="round"/>
  ${[[200, 740], [300, 640], [430, 660], [560, 600]].map(([x, y]) => `<path d="M${x - 40} ${y - 50} L${x} ${y - 120} L${x + 40} ${y - 50}Z" fill="#ffc12b" ${st(16)}/>`).join('')}
  <path d="M220 820 C180 880 120 900 80 880 C120 860 140 830 150 800Z" fill="#ffc12b" ${st()}/>
  <path d="M430 300 C380 180 420 120 470 130 C470 190 500 230 540 250 M690 300 C760 190 740 130 690 130 C680 190 650 230 610 250" fill="#ffc12b" ${st()}/>
  <ellipse cx="570" cy="420" rx="230" ry="190" fill="#3cc865" ${st()}/>
  <ellipse cx="640" cy="500" rx="170" ry="100" fill="#b8f5c8" ${st()}/>
  <circle cx="620" cy="480" r="12" fill="${O}"/><circle cx="700" cy="480" r="12" fill="${O}"/>
  <path d="M780 470 C860 430 900 480 940 440 M790 520 C870 540 900 600 950 580" fill="none" ${st(16)}/>
  <ellipse cx="480" cy="370" rx="26" ry="34" fill="${O}"/><ellipse cx="620" cy="360" rx="26" ry="34" fill="${O}"/>
  <ellipse cx="420" cy="440" rx="36" ry="24" fill="#ff8fa3"/>
  <path d="M600 560 Q660 600 720 560" fill="none" ${st(24)}/>
  ${sparkle(820, 200, 55)}${sparkle(150, 300, 45, '#ff9cc4')}`],
'2027-02-04': ['Red envelope', `
  <rect x="240" y="140" width="520" height="740" rx="40" fill="#e3263a" ${st()}/>
  <path d="M240 200 C240 160 280 140 320 140 L680 140 C720 140 760 160 760 200 L760 360 C640 440 360 440 240 360Z" fill="#c4162a" ${st()}/>
  <circle cx="500" cy="400" r="90" fill="#ffc12b" ${st()}/>
  <rect x="465" y="365" width="70" height="70" rx="8" fill="none" stroke="#b5121f" stroke-width="18"/>
  ${face(500, 620, 0.85)}
  <path d="M300 820 L700 820" stroke="#ffc12b" stroke-width="22" stroke-linecap="round"/>
  ${[[800, 300], [180, 700], [820, 760]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="50" fill="#ffd23f" ${st(16)}/><rect x="${x - 16}" y="${y - 16}" width="32" height="32" fill="none" stroke="#e08a12" stroke-width="12"/>`).join('')}`],
'2027-02-05': ['Firecrackers', `
  <path d="M500 60 C460 120 540 160 500 220" fill="none" ${st(16)}/>
  ${[[330, 260, -14], [670, 260, 14], [350, 540, -10], [650, 540, 10], [500, 400, 0], [500, 690, 0]].map(([x, y, r], i) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 70}" y="${y - 120}" width="140" height="240" rx="24" fill="${i % 2 ? '#e3263a' : '#ff4b5c'}" ${st()}/><rect x="${x - 70}" y="${y - 100}" width="140" height="34" fill="#ffc12b" ${st(14)}/><rect x="${x - 70}" y="${y + 66}" width="140" height="34" fill="#ffc12b" ${st(14)}/><path d="M${x} ${y - 120} L${x} ${y - 170}" ${st(14)}/></g>`).join('')}
  ${face(500, 380, 0.5)}
  ${sparkle(150, 140, 60)}${sparkle(850, 140, 60, '#ff9f1c')}${sparkle(150, 820, 45, '#ff9f1c')}${sparkle(850, 830, 45)}`],
'2027-02-06': ['Dumplings', `
  <ellipse cx="500" cy="760" rx="420" ry="130" fill="#c98b3a" ${st()}/>
  <ellipse cx="500" cy="730" rx="360" ry="90" fill="#e8b46a" ${st(16)}/>
  ${[[300, 560, 0.8], [700, 560, 0.8], [500, 520, 1]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-220 120 C-240 -60 -120 -160 0 -160 C120 -160 240 -60 220 120 C120 170 -120 170 -220 120Z" fill="#fffaf0" ${st(W / s)}/>${[-120, -60, 0, 60, 120].map((dx) => `<path d="M${dx} -150 C${dx + 10} -110 ${dx - 10} -80 ${dx} -50" fill="none" stroke="#e5d7bf" stroke-width="${20 / s}" stroke-linecap="round"/>`).join('')}${face(0, 20, 0.6)}</g>`).join('')}
  <path d="M640 220 L900 80 M680 260 L930 140" stroke="${O}" stroke-width="40" stroke-linecap="round"/><path d="M640 220 L900 80 M680 260 L930 140" stroke="#c98b3a" stroke-width="20" stroke-linecap="round"/>
  <path d="M260 280 C230 230 290 200 260 150 M380 260 C350 210 410 180 380 130" fill="none" stroke="#c9c9d6" stroke-width="26" stroke-linecap="round"/>`],
'2027-02-07': ['Plum blossom', `
  <path d="M120 900 C300 760 360 600 520 520 C640 460 760 360 880 160 M420 600 C380 480 300 420 220 380 M640 460 C720 470 820 520 900 520" fill="none" stroke="${O}" stroke-width="60" stroke-linecap="round"/>
  <path d="M120 900 C300 760 360 600 520 520 C640 460 760 360 880 160 M420 600 C380 480 300 420 220 380 M640 460 C720 470 820 520 900 520" fill="none" stroke="#7a4a2c" stroke-width="34" stroke-linecap="round"/>
  ${[[500, 500, 1.6], [240, 360, 0.9], [830, 240, 0.9], [860, 520, 0.8], [300, 760, 0.8]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="-62" r="58" transform="rotate(${a})" fill="#ff9cc4" ${st(W / s)}/>`).join('')}<circle r="44" fill="#ffd23f" ${st(16 / s)}/></g>`).join('')}
  <circle cx="500" cy="500" r="120" fill="#ffd9e8" ${st()}/>${face(500, 490, 0.55)}
  ${[[640, 330], [380, 280], [700, 640]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" fill="#ff6fa8" ${st(14)}/>`).join('')}`],
'2027-02-08': ['Heart', `
  ${heart(500, 520, 2.5)}
  <path d="M250 330 C270 260 330 230 380 240" fill="none" stroke="#ffb3c4" stroke-width="40" stroke-linecap="round"/>
  ${face(500, 480, 1.05)}
  ${heart(150, 170, 0.45, '#ff9cc4')}${heart(860, 200, 0.55, '#ff9cc4')}${heart(860, 850, 0.4, '#ff6f91')}${heart(140, 820, 0.35, '#ff6f91')}`],
'2027-02-09': ['Love letter', `
  <rect x="130" y="270" width="740" height="520" rx="40" fill="#fff3f6" ${st()}/>
  <path d="M130 310 L500 590 L870 310" fill="none" ${st()}/>
  <path d="M150 770 L420 540 M850 770 L580 540" fill="none" stroke="#f0c8d2" stroke-width="20" stroke-linecap="round"/>
  ${heart(500, 590, 0.75, '#e3263a')}
  ${face(500, 400, 0.6)}
  ${heart(760, 150, 0.45, '#ff9cc4')}${heart(220, 140, 0.35, '#ff6f91')}${heart(880, 880, 0.35, '#ff6f91')}`],
'2027-02-10': ['Rose', `
  <path d="M500 520 C480 680 520 800 500 950" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M500 520 C480 680 520 800 500 950" fill="none" stroke="#2e9e4f" stroke-width="30" stroke-linecap="round"/>
  ${leaf(500, 760, -160, 1.1)}${leaf(500, 700, -20, 1)}
  <path d="M500 560 C320 560 240 440 270 300 C340 340 380 340 400 300 C430 360 570 360 600 300 C620 340 660 340 730 300 C760 440 680 560 500 560Z" fill="#e3263a" ${st()}/>
  <path d="M300 300 C290 170 400 110 500 110 C600 110 710 170 700 300 C640 340 360 340 300 300Z" fill="#ff4b6e" ${st()}/>
  <path d="M500 290 C400 290 400 170 500 170 C580 170 590 250 530 250 C480 250 480 200 520 200" fill="none" ${st(18)}/>
  ${face(500, 410, 0.7)}`],
'2027-02-11': ['Box of chocolates', `
  <path d="M500 860 C220 760 100 600 100 440 C100 280 250 200 360 230 C430 250 470 290 500 330 C530 290 570 250 640 230 C750 200 900 280 900 440 C900 600 780 760 500 860Z" fill="#e3263a" ${st()}/>
  <path d="M500 780 C280 700 180 580 180 450 C180 330 290 280 370 300 C430 320 470 360 500 400 C530 360 570 320 630 300 C710 280 820 330 820 450 C820 580 720 700 500 780Z" fill="#ffd9e0" ${st(16)}/>
  ${[[300, 440, '#7a3e1d'], [420, 520, '#5e2f14'], [580, 520, '#a0612f'], [700, 440, '#7a3e1d'], [500, 650, '#5e2f14'], [360, 620, '#a0612f'], [640, 620, '#7a3e1d']].map(([x, y, c], i) => `<circle cx="${x}" cy="${y}" r="62" fill="${c}" ${st(16)}/>${i % 2 ? `<path d="M${x - 30} ${y - 10} Q${x} ${y - 40} ${x + 30} ${y - 10}" fill="none" stroke="#fff3d6" stroke-width="12" stroke-linecap="round"/>` : `<circle cx="${x}" cy="${y - 10}" r="16" fill="#ff9cc4"/>`}`).join('')}
  <circle cx="500" cy="420" r="80" fill="#a0612f" ${st(16)}/>${face(500, 410, 0.45)}
  <path d="M500 230 C400 130 320 180 380 240 C420 280 470 250 500 230Z M500 230 C600 130 680 180 620 240 C580 280 530 250 500 230Z" fill="#ffd23f" ${st()}/><circle cx="500" cy="230" r="34" fill="#ffc12b" ${st()}/>`],
'2027-02-12': ["Cupid's arrow", `
  <path d="M140 860 L860 140" stroke="${O}" stroke-width="50" stroke-linecap="round"/><path d="M140 860 L860 140" stroke="#c98b3a" stroke-width="26" stroke-linecap="round"/>
  <path d="M860 140 L700 170 L830 300Z" fill="#ffc12b" ${st()}/>
  <path d="M200 800 L120 760 L160 700 L240 760Z M250 750 L170 710 L210 650 L290 710Z M200 800 L240 880 L300 840 L240 760Z M250 750 L290 830 L350 790 L290 710Z" fill="#ff9cc4" ${st(16)}/>
  ${heart(500, 520, 1.7)}
  <path d="M370 470 L630 470" fill="none"/>
  ${face(500, 460, 0.8)}
  ${heart(200, 220, 0.45, '#ff9cc4')}${heart(810, 780, 0.45, '#ff9cc4')}`],
'2027-02-13': ['Teddy holding a heart', `
  <circle cx="290" cy="200" r="90" fill="#c98b3a" ${st()}/><circle cx="710" cy="200" r="90" fill="#c98b3a" ${st()}/><circle cx="290" cy="200" r="45" fill="#f2c08a"/><circle cx="710" cy="200" r="45" fill="#f2c08a"/>
  <ellipse cx="500" cy="760" rx="260" ry="200" fill="#c98b3a" ${st()}/>
  <ellipse cx="320" cy="900" rx="100" ry="70" fill="#c98b3a" ${st()}/><ellipse cx="680" cy="900" rx="100" ry="70" fill="#c98b3a" ${st()}/>
  <circle cx="500" cy="380" r="250" fill="#d79a52" ${st()}/>
  <ellipse cx="500" cy="470" rx="110" ry="80" fill="#f2d3a8" ${st(16)}/><ellipse cx="500" cy="440" rx="40" ry="28" fill="${O}"/>
  <ellipse cx="410" cy="360" rx="28" ry="36" fill="${O}"/><ellipse cx="590" cy="360" rx="28" ry="36" fill="${O}"/>
  <ellipse cx="330" cy="450" rx="40" ry="26" fill="#ff8fa3"/><ellipse cx="670" cy="450" rx="40" ry="26" fill="#ff8fa3"/>
  <path d="M460 500 Q500 540 540 500" fill="none" ${st(18)}/>
  ${heart(500, 760, 1.15, '#e3263a')}
  <ellipse cx="320" cy="720" rx="80" ry="60" fill="#d79a52" ${st()}/><ellipse cx="680" cy="720" rx="80" ry="60" fill="#d79a52" ${st()}/>`],
'2027-02-14': ['Two eels in a heart', `
  <path d="M500 900 C200 700 80 520 80 360 C80 200 220 110 340 130 C420 145 470 190 500 240 C530 190 580 145 660 130 C780 110 920 200 920 360 C920 520 800 700 500 900Z" fill="#ffe3ea" ${st()}/>
  ${eel('M470 780 C330 700 230 560 260 420 C280 330 330 300 380 300', '#4fc3f7', 380, 330, 105)}
  ${eel('M530 780 C670 700 770 560 740 420 C720 330 670 300 620 300', '#ff9cc4', 620, 330, 105)}
  ${heart(500, 560, 0.65, '#e3263a')}
  ${heart(150, 120, 0.3, '#ff6f91')}${heart(860, 110, 0.3, '#ff6f91')}`],
'2027-02-15': ['Happy eel', `
  ${eel('M160 800 C260 940 460 900 480 760 C500 620 300 600 320 460 C340 330 520 300 620 330', '#4cd964', 640, 320, 170)}
  ${bubbles([[860, 160, 50], [800, 80, 30], [900, 270, 26]])}${sparkle(150, 200, 55)}`],
'2027-02-16': ['Sleepy eel', `
  <path d="M500 700 C760 700 860 560 820 460 C780 360 620 380 600 470 C580 560 700 580 720 520" fill="none" stroke="${O}" stroke-width="150" stroke-linecap="round"/>
  <path d="M500 700 C760 700 860 560 820 460 C780 360 620 380 600 470 C580 560 700 580 720 520" fill="none" stroke="#9b7bff" stroke-width="106" stroke-linecap="round"/>
  <ellipse cx="330" cy="660" rx="200" ry="160" fill="#9b7bff" ${st()}/>
  <path d="M220 640 Q260 680 300 640 M360 640 Q400 680 440 640" fill="none" ${st(20)}/>
  <ellipse cx="200" cy="700" rx="36" ry="24" fill="#ff8fa3"/><ellipse cx="460" cy="700" rx="36" ry="24" fill="#ff8fa3"/>
  <ellipse cx="330" cy="740" rx="20" ry="16" fill="${O}"/>
  <path d="M210 520 C180 380 300 300 380 330 L460 510Z" fill="#4fc3f7" ${st()}/><circle cx="210" cy="370" r="44" fill="#fff" ${st(16)}/>
  <text x="540" y="280" font-family="DejaVu Sans" font-weight="bold" font-size="130" fill="#9be7ff" stroke="${O}" stroke-width="18" paint-order="stroke">z</text>
  <text x="680" y="180" font-family="DejaVu Sans" font-weight="bold" font-size="100" fill="#9be7ff" stroke="${O}" stroke-width="16" paint-order="stroke">z</text>
  ${sparkle(880, 860, 45)}${sparkle(130, 180, 40)}`],
'2027-02-17': ['Eel in a hat', `
  ${eel('M200 880 C380 960 560 860 520 720 C480 580 320 600 340 480', '#ff9f1c', 400, 470, 170)}
  <ellipse cx="400" cy="320" rx="230" ry="50" fill="#3a3a55" ${st()}/>
  <path d="M290 320 L310 90 C320 60 480 60 490 90 L510 320Z" fill="#3a3a55" ${st()}/>
  <path d="M300 250 L500 250 L505 300 L295 300Z" fill="#e3263a" ${st(14)}/>
  ${sparkle(820, 200, 60)}${sparkle(800, 640, 45, '#9be7ff')}`],
'2027-02-18': ['Dolphin', `
  ${waves(860)}
  <path d="M180 620 C200 380 420 220 640 240 C760 250 840 320 880 380 C820 390 800 420 820 440 C760 470 700 470 640 450 C560 560 420 700 260 700 C220 760 160 800 100 790 C140 740 160 700 180 620Z" fill="#6fb7e8" ${st()}/>
  <path d="M480 260 C470 180 520 120 600 110 C580 170 590 210 620 240Z" fill="#6fb7e8" ${st()}/>
  <path d="M400 520 C500 560 600 520 650 450 C560 600 420 640 300 640Z" fill="#d6efff" ${st(16)}/>
  <path d="M440 540 C430 620 380 660 340 660" fill="#6fb7e8" ${st()}/>
  <ellipse cx="700" cy="340" rx="26" ry="32" fill="${O}"/><ellipse cx="680" cy="410" rx="34" ry="22" fill="#ff8fa3"/>
  <path d="M760 400 Q800 420 830 400" fill="none" ${st(16)}/>
  ${bubbles([[880, 200, 40], [820, 120, 26]])}`],
'2027-02-19': ['Sea otter', `
  <ellipse cx="500" cy="760" rx="440" ry="90" fill="#4fc3f7" ${st()}/>
  <path d="M180 700 C180 560 320 480 500 480 C680 480 820 560 820 700 C760 760 240 760 180 700Z" fill="#8a5a3a" ${st()}/>
  <ellipse cx="500" cy="660" rx="210" ry="80" fill="#c99a72"/>
  <circle cx="500" cy="380" r="200" fill="#a06b46" ${st()}/>
  <circle cx="340" cy="230" r="44" fill="#a06b46" ${st()}/><circle cx="660" cy="230" r="44" fill="#a06b46" ${st()}/>
  <ellipse cx="500" cy="440" rx="140" ry="100" fill="#f2dcc4" ${st(16)}/><ellipse cx="500" cy="410" rx="34" ry="24" fill="${O}"/>
  <path d="M430 470 Q470 500 500 470 Q530 500 570 470" fill="none" ${st(14)}/>
  <ellipse cx="420" cy="330" rx="24" ry="30" fill="${O}"/><ellipse cx="580" cy="330" rx="24" ry="30" fill="${O}"/>
  <ellipse cx="350" cy="420" rx="34" ry="22" fill="#ff8fa3"/><ellipse cx="650" cy="420" rx="34" ry="22" fill="#ff8fa3"/>
  <path d="M500 560 C440 560 420 640 500 650 C580 640 560 560 500 560Z" fill="#ffb3c7" ${st(16)}/>
  <ellipse cx="410" cy="600" rx="56" ry="40" fill="#a06b46" ${st()}/><ellipse cx="590" cy="600" rx="56" ry="40" fill="#a06b46" ${st()}/>
  <ellipse cx="190" cy="700" rx="60" ry="40" fill="#8a5a3a" ${st()}/><ellipse cx="810" cy="700" rx="60" ry="40" fill="#8a5a3a" ${st()}/>`],
'2027-02-20': ['Lobster', `
  <path d="M440 260 C380 140 300 90 220 80 M560 260 C620 140 700 90 780 80" fill="none" ${st(16)}/>
  <path d="M380 420 C300 380 260 300 250 240 M620 420 C700 380 740 300 750 240" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M380 420 C300 380 260 300 250 240 M620 420 C700 380 740 300 750 240" fill="none" stroke="#ff5a3a" stroke-width="30" stroke-linecap="round"/>
  <path d="M250 260 C140 230 140 90 230 70 C230 140 270 160 300 140 C330 200 310 260 250 260Z M750 260 C860 230 860 90 770 70 C770 140 730 160 700 140 C670 200 690 260 750 260Z" fill="#e8402a" ${st()}/>
  ${[0, 1, 2].map((k) => `<path d="M${380} ${560 + k * 70} L${260} ${600 + k * 80} M${620} ${560 + k * 70} L${740} ${600 + k * 80}" ${st(26)}/>`).join('')}
  <path d="M430 800 L400 920 L500 880 L600 920 L570 800Z" fill="#e8402a" ${st()}/>
  ${[700, 760].map((y) => `<rect x="${400 + (y - 700) * 0.3}" y="${y}" width="${200 - (y - 700) * 0.6}" height="70" rx="30" fill="#ff6a4a" ${st()}/>`).join('')}
  <ellipse cx="500" cy="500" rx="170" ry="230" fill="#ff5a3a" ${st()}/>
  ${face(500, 420, 0.75)}`],
'2027-02-21': ['Angelfish', `
  <path d="M480 220 C420 120 470 60 560 60 C540 160 560 220 600 260Z M480 780 C420 880 470 940 560 940 C540 840 560 780 600 740Z" fill="#ffd23f" ${st()}/>
  <path d="M780 500 L920 360 C950 460 950 540 920 640Z" fill="#ffd23f" ${st()}/>
  <path d="M160 500 C220 300 420 200 580 230 C720 260 800 380 800 500 C800 620 720 740 580 770 C420 800 220 700 160 500Z" fill="#9be7ff" ${st()}/>
  <defs><clipPath id="af"><path d="M160 500 C220 300 420 200 580 230 C720 260 800 380 800 500 C800 620 720 740 580 770 C420 800 220 700 160 500Z"/></clipPath></defs>
  <g clip-path="url(#af)"><path d="M440 150 L440 850 M620 150 L620 850" stroke="#3a3a55" stroke-width="56"/><path d="M440 150 L440 850 M620 150 L620 850" stroke="#ffd23f" stroke-width="20"/></g>
  <path d="M160 500 C220 300 420 200 580 230 C720 260 800 380 800 500 C800 620 720 740 580 770 C420 800 220 700 160 500Z" fill="none" ${st()}/>
  <ellipse cx="300" cy="460" rx="26" ry="32" fill="${O}"/><ellipse cx="290" cy="530" rx="34" ry="22" fill="#ff8fa3"/>
  <path d="M190 520 Q210 550 240 540" fill="none" ${st(16)}/>
  ${bubbles([[120, 300, 40], [180, 200, 26]])}`],
'2027-02-22': ['Sea urchin', `
  ${Array.from({ length: 22 }, (_, i) => { const a = Math.PI + i * Math.PI / 21; return `<path d="M${500 + 280 * Math.cos(a)} ${640 + 240 * Math.sin(a)} L${500 + 440 * Math.cos(a)} ${640 + 420 * Math.sin(a)}" stroke="${O}" stroke-width="40" stroke-linecap="round"/><path d="M${500 + 280 * Math.cos(a)} ${640 + 240 * Math.sin(a)} L${500 + 440 * Math.cos(a)} ${640 + 420 * Math.sin(a)}" stroke="#b07cff" stroke-width="18" stroke-linecap="round"/>`; }).join('')}
  ${sand(860)}
  <path d="M190 820 C190 560 330 420 500 420 C670 420 810 560 810 820Z" fill="#7b4fd6" ${st()}/>
  ${face(500, 650, 0.85)}
  ${bubbles([[150, 180, 40], [860, 200, 32]])}`],
'2027-02-23': ['Octopus', `
  ${[-3, -2, -1, 0, 1, 2, 3].map((k) => { const x = 500 + k * 95; return `<path d="M${x} 560 C${x + k * 30} 700 ${x + k * 60 - 60} 760 ${x + k * 50} 880 C${x + k * 50 + 40} 900 ${x + k * 50 + 60} 870 ${x + k * 50 + 50} 850" fill="none" stroke="${O}" stroke-width="96" stroke-linecap="round"/><path d="M${x} 560 C${x + k * 30} 700 ${x + k * 60 - 60} 760 ${x + k * 50} 880 C${x + k * 50 + 40} 900 ${x + k * 50 + 60} 870 ${x + k * 50 + 50} 850" fill="none" stroke="#ff7eb0" stroke-width="56" stroke-linecap="round"/>`; }).join('')}
  <path d="M190 560 C170 300 320 140 500 140 C680 140 830 300 810 560 C700 640 300 640 190 560Z" fill="#ff7eb0" ${st()}/>
  ${[[330, 260], [660, 280], [700, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#ffb3d1"/>`).join('')}
  ${face(500, 420, 0.9)}
  ${bubbles([[870, 140, 40], [930, 260, 24]])}`],
'2027-02-24': ['Seahorse', `
  <path d="M520 280 C620 300 680 400 640 520 C600 640 480 660 470 760 C460 860 560 900 600 840 C630 800 600 760 560 770" fill="none" stroke="${O}" stroke-width="170" stroke-linecap="round"/>
  <path d="M520 280 C620 300 680 400 640 520 C600 640 480 660 470 760 C460 860 560 900 600 840 C630 800 600 760 560 770" fill="none" stroke="#ffb31a" stroke-width="126" stroke-linecap="round"/>
  <path d="M640 380 C720 380 760 440 740 520 C700 500 680 460 650 470Z" fill="#ffd84d" ${st()}/>
  <path d="M520 400 C560 440 590 500 560 560" fill="none" stroke="#ffd84d" stroke-width="40" stroke-linecap="round"/>
  <ellipse cx="430" cy="260" rx="170" ry="140" fill="#ffb31a" ${st()}/>
  <path d="M300 280 L200 290 C180 320 190 350 220 350 L300 340Z" fill="#ffb31a" ${st()}/>
  <path d="M440 130 L470 60 L510 130 L560 80 L570 160" fill="#ffd84d" ${st()}/>
  <ellipse cx="440" cy="240" rx="28" ry="34" fill="${O}"/><ellipse cx="420" cy="310" rx="36" ry="22" fill="#ff8fa3"/>
  
  ${bubbles([[200, 140, 44], [270, 70, 26]])}${sparkle(820, 200, 50, '#9be7ff')}`],
'2027-02-25': ['Turtle', `
  <ellipse cx="220" cy="460" rx="140" ry="110" fill="#8fdc6a" ${st()}/>
  <ellipse cx="320" cy="760" rx="110" ry="70" transform="rotate(30 320 760)" fill="#8fdc6a" ${st()}/><ellipse cx="740" cy="760" rx="110" ry="70" transform="rotate(-30 740 760)" fill="#8fdc6a" ${st()}/>
  <ellipse cx="380" cy="300" rx="120" ry="70" transform="rotate(-30 380 300)" fill="#8fdc6a" ${st()}/><ellipse cx="760" cy="320" rx="120" ry="70" transform="rotate(30 760 320)" fill="#8fdc6a" ${st()}/>
  <path d="M880 560 L960 600 L880 620Z" fill="#8fdc6a" ${st()}/>
  <ellipse cx="580" cy="540" rx="330" ry="250" fill="#2e9e4f" ${st()}/>
  <path d="M580 340 L680 420 L660 560 L500 560 L480 420Z" fill="#4cc26b" ${st(16)}/>
  <path d="M500 560 L380 640 M660 560 L780 640 M480 420 L330 420 M680 420 L830 420 M580 340 L580 300 M580 560 L580 780" ${st(16)}/>
  <ellipse cx="190" cy="430" rx="22" ry="28" fill="${O}"/><ellipse cx="270" cy="430" rx="22" ry="28" fill="${O}"/>
  <ellipse cx="150" cy="490" rx="28" ry="18" fill="#ff8fa3"/><ellipse cx="300" cy="490" rx="28" ry="18" fill="#ff8fa3"/>
  <path d="M190 490 Q230 530 270 490" fill="none" ${st(18)}/>
  ${bubbles([[150, 200, 40], [880, 180, 32]])}`],
'2027-02-26': ['Clownfish', `
  <path d="M790 500 L930 370 C960 460 960 540 930 630Z" fill="#ff7a1a" ${st()}/>
  <path d="M440 260 C480 160 600 150 640 240Z M440 740 C480 840 600 850 640 760Z" fill="#ff7a1a" ${st()}/>
  <ellipse cx="480" cy="500" rx="340" ry="260" fill="#ff8a2a" ${st()}/>
  <defs><clipPath id="cf"><ellipse cx="480" cy="500" rx="340" ry="260"/></clipPath></defs>
  <g clip-path="url(#cf)">${[330, 560, 760].map((x) => `<path d="M${x} 200 C${x - 40} 400 ${x - 40} 600 ${x} 800" fill="none" stroke="${O}" stroke-width="110"/><path d="M${x} 200 C${x - 40} 400 ${x - 40} 600 ${x} 800" fill="none" stroke="#fff" stroke-width="70"/>`).join('')}</g>
  <ellipse cx="480" cy="500" rx="340" ry="260" fill="none" ${st()}/>
  ${face(220, 470, 0.55)}
  ${bubbles([[120, 200, 44], [210, 110, 26]])}`],
'2027-02-27': ['Whale', `
  <path d="M440 220 C400 150 420 90 460 60 M500 220 C500 140 540 90 600 80 M560 230 C600 170 660 160 700 180" fill="none" stroke="${O}" stroke-width="44" stroke-linecap="round"/>
  <path d="M440 220 C400 150 420 90 460 60 M500 220 C500 140 540 90 600 80 M560 230 C600 170 660 160 700 180" fill="none" stroke="#9be7ff" stroke-width="22" stroke-linecap="round"/>
  <path d="M120 560 C120 360 300 250 500 250 C700 250 840 380 840 500 C880 460 920 380 960 380 C960 480 930 560 860 600 C820 720 680 800 480 800 C260 800 120 720 120 560Z" fill="#4a8fe0" ${st()}/>
  <path d="M150 620 C260 720 420 740 600 720 C700 700 780 660 820 610 C700 760 260 800 150 620Z" fill="#d6efff" ${st(16)}/>
  <path d="M240 650 L240 700 M320 680 L320 730 M400 690 L400 740 M480 690 L480 740 M560 680 L560 730" stroke="#9cc4e8" stroke-width="14" stroke-linecap="round"/>
  ${face(330, 480, 0.75)}
  <path d="M560 600 C620 640 680 640 700 600" fill="#4a8fe0" ${st()}/>`],
'2027-02-28': ['Jellyfish', `
  ${[300, 400, 500, 600, 700].map((x, i) => `<path d="M${x} 560 C${x - 50} 640 ${x + 50} 720 ${x} 800 C${x - 40} 860 ${x + 20} 900 ${x} 940" fill="none" stroke="${O}" stroke-width="54" stroke-linecap="round"/><path d="M${x} 560 C${x - 50} 640 ${x + 50} 720 ${x} 800 C${x - 40} 860 ${x + 20} 900 ${x} 940" fill="none" stroke="${i % 2 ? '#ffb3d1' : '#b8a4ff'}" stroke-width="28" stroke-linecap="round"/>`).join('')}
  <path d="M170 560 C150 300 320 140 500 140 C680 140 850 300 830 560 C780 600 740 540 700 580 C660 620 620 560 580 590 C540 620 460 620 420 590 C380 560 340 620 300 580 C260 540 220 600 170 560Z" fill="#c9a8ff" ${st()}/>
  <path d="M280 330 C300 260 360 220 420 210" fill="none" stroke="#f0e6ff" stroke-width="34" stroke-linecap="round"/>
  ${face(500, 400, 0.9)}
  ${bubbles([[150, 160, 40], [860, 180, 34], [880, 700, 26]])}`],
};
module.exports = ART;
