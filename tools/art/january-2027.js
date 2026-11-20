// Cute New Year / summer drawings for January 2027, 1000x1000, transparent background.
// Render: node tools/art/render.js ./tools/art/january-2027.js <out-dir>
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

const ART = {
'2027-01-01': ['2027 fireworks', `
  ${burst(220, 230, 170, '#ff4b8b')}${burst(780, 210, 160, '#4cd964')}${burst(500, 150, 120, '#9be7ff')}
  <text x="500" y="720" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="330" fill="#ffd23f" stroke="${O}" stroke-width="26" paint-order="stroke" stroke-linejoin="round">2027</text>
  ${sparkle(110, 860, 50, '#ffb3d1')}${sparkle(890, 870, 55, '#9be7ff')}${sparkle(500, 900, 40)}`],
'2027-01-02': ['Confetti', `
  <path d="M170 520 C130 380 260 330 300 420 M830 520 C870 380 740 330 700 420" fill="none" stroke="${O}" stroke-width="44" stroke-linecap="round"/>
  <path d="M170 520 C130 380 260 330 300 420" fill="none" stroke="#ff4b8b" stroke-width="22" stroke-linecap="round"/><path d="M830 520 C870 380 740 330 700 420" fill="none" stroke="#9b5de5" stroke-width="22" stroke-linecap="round"/>
  <path d="M300 860 L250 520 C250 470 750 470 750 520 L700 860Z" fill="#9be7ff" ${st()}/>
  <path d="M265 610 L735 610 M282 720 L718 720" stroke="#ffffff" stroke-width="30" stroke-linecap="round"/>
  <ellipse cx="500" cy="520" rx="250" ry="60" fill="#ffd23f" ${st()}/>
  ${face(500, 690, 0.8)}
  ${confetti([[300, 330, '#ff4b8b'], [420, 240, '#4cd964'], [560, 300, '#ffd23f'], [680, 220, '#9b5de5'], [500, 140, '#ff9f1c'], [350, 130, '#4fc3f7'], [650, 380, '#ff4b8b'], [800, 130, '#4cd964'], [200, 220, '#ffd23f'], [880, 300, '#ff9f1c'], [120, 640, '#4fc3f7'], [880, 660, '#ff4b8b']])}`],
'2027-01-03': ['Sparkler', `
  <path d="M260 900 L520 470" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M260 900 L520 470" stroke="#9aa0b5" stroke-width="30" stroke-linecap="round"/>
  <path d="M290 850 L400 670" stroke="#e3263a" stroke-width="30" stroke-linecap="round"/>
  ${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, r = i % 2 ? 260 : 340; return `<path d="M${560 + 120 * Math.cos(a)} ${400 + 120 * Math.sin(a)} L${560 + r * Math.cos(a)} ${400 + r * Math.sin(a)}" stroke="${O}" stroke-width="36" stroke-linecap="round"/><path d="M${560 + 120 * Math.cos(a)} ${400 + 120 * Math.sin(a)} L${560 + r * Math.cos(a)} ${400 + r * Math.sin(a)}" stroke="${i % 2 ? '#ff9f1c' : '#ffd23f'}" stroke-width="16" stroke-linecap="round"/>`; }).join('')}
  <circle cx="560" cy="400" r="160" fill="#fff3a0" ${st()}/>
  ${face(560, 390, 0.75)}${sparkle(170, 200, 50)}${sparkle(880, 760, 50, '#ffb3d1')}${sparkle(860, 110, 40, '#9be7ff')}`],
'2027-01-04': ['Sun in sunglasses', `
  ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, x = 500 + 400 * Math.cos(a), y = 500 + 400 * Math.sin(a), p = a + Math.PI / 2; return `<path d="M${500 + 300 * Math.cos(a) + 50 * Math.cos(p)} ${500 + 300 * Math.sin(a) + 50 * Math.sin(p)} L${x} ${y} L${500 + 300 * Math.cos(a) - 50 * Math.cos(p)} ${500 + 300 * Math.sin(a) - 50 * Math.sin(p)}Z" fill="#ff9f1c" ${st()}/>`; }).join('')}
  <circle cx="500" cy="500" r="290" fill="#ffd23f" ${st()}/>
  <path d="M330 330 Q380 260 470 250" fill="none" stroke="#fff6b0" stroke-width="30" stroke-linecap="round"/>
  ${shades(500, 480, 1.25)}`],
'2027-01-05': ['Ice cream', `
  <path d="M330 560 L500 940 L670 560Z" fill="#f0b25b" ${st()}/>
  <path d="M380 620 L560 800 M450 600 L610 760 M560 600 L440 840 M640 610 L500 900 M380 660 L470 610" stroke="#c97d2c" stroke-width="18" stroke-linecap="round"/>
  <path d="M330 560 L500 940 L670 560Z" fill="none" ${st()}/>
  <circle cx="500" cy="300" r="170" fill="#ff9cc4" ${st()}/>
  <path d="M280 560 C250 420 400 400 500 430 C600 400 750 420 720 560 C690 620 660 560 630 600 C600 640 580 580 540 610 C500 650 480 580 440 610 C400 640 380 570 350 600 C320 630 300 600 280 560Z" fill="#9ff0c9" ${st()}/>
  ${face(500, 500, 0.6)}
  <path d="M500 140 C520 80 560 60 590 50" fill="none" ${st(16)}/><circle cx="500" cy="150" r="56" fill="#e3263a" ${st()}/><circle cx="482" cy="132" r="14" fill="#fff" opacity=".8"/>
  ${[[420, 260, '#ffd23f'], [580, 250, '#4fc3f7'], [520, 340, '#9b5de5'], [420, 360, '#4cd964'], [610, 340, '#ffd23f']].map(([x, y, c], i) => `<rect x="${x - 22}" y="${y - 9}" width="44" height="18" rx="9" transform="rotate(${i * 50} ${x} ${y})" fill="${c}"/>`).join('')}`],
'2027-01-06': ['Beach ball', `
  <path d="M500 140 A360 360 0 0 0 500 860 A200 360 0 0 1 500 140Z" fill="#e3263a" ${st(16)}/>
  <path d="M500 140 A200 360 0 0 0 500 860 L500 140Z" fill="#fff" ${st(16)}/>
  <path d="M500 140 A200 360 0 0 1 500 860 L500 140Z" fill="#4fc3f7" ${st(16)}/>
  <path d="M500 140 A360 360 0 0 1 500 860 A200 360 0 0 0 500 140Z" fill="#ffd23f" ${st(16)}/>
  <circle cx="500" cy="500" r="360" fill="none" ${st()}/>
  <ellipse cx="500" cy="150" rx="50" ry="26" fill="#fff" ${st(14)}/>
  <path d="M230 360 Q260 280 320 230" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" opacity=".8"/>
  <circle cx="500" cy="520" r="170" fill="#fff" ${st(16)}/>
  ${face(500, 500, 0.7)}`],
'2027-01-07': ['Surfboard', `
  ${waves(800)}
  <g transform="rotate(-35 500 470)">
    <path d="M500 60 C660 160 680 500 640 760 C620 880 380 880 360 760 C320 500 340 160 500 60Z" fill="#ff9f1c" ${st()}/>
    <path d="M500 60 C430 120 400 300 395 420 L605 420 C600 300 570 120 500 60Z" fill="#4fc3f7" ${st(16)}/>
    <path d="M500 80 L500 840" stroke="#fff" stroke-width="18" stroke-dasharray="1 50" stroke-linecap="round"/>
    ${face(500, 560, 0.65)}
  </g>
  ${sparkle(160, 180, 50)}${sparkle(860, 140, 45, '#9be7ff')}`],
'2027-01-08': ['Sandcastle', `
  ${waves(860)}
  <path d="M170 870 L170 470 L230 470 L230 430 L280 430 L280 470 L330 470 L330 870Z M670 870 L670 470 L720 470 L720 430 L770 430 L770 470 L830 470 L830 870Z" fill="#f2c66d" ${st()}/>
  <path d="M300 870 L300 380 L360 380 L360 330 L420 330 L420 380 L470 380 L470 330 L530 330 L530 380 L580 380 L580 330 L640 330 L640 380 L700 380 L700 870Z" fill="#f6d58e" ${st()}/>
  <path d="M500 330 L500 150" ${st(16)}/><path d="M500 150 L640 195 L500 240Z" fill="#e3263a" ${st(16)}/>
  <path d="M440 870 L440 760 C440 700 560 700 560 760 L560 870Z" fill="#c98b3a" ${st()}/>
  ${face(500, 520, 0.8)}
  <circle cx="250" cy="600" r="18" fill="#c98b3a"/><circle cx="750" cy="640" r="18" fill="#c98b3a"/>
  <path d="M780 780 l20 -40 l20 40 l44 6 l-32 30 l8 44 l-40 -20 l-40 20 l8 -44 l-32 -30Z" fill="#ff9cc4" ${st(12)}/>`],
'2027-01-09': ['Flip-flops', `
  <g transform="rotate(-12 320 520)">
    <path d="M320 140 C440 140 460 300 430 460 C410 580 450 700 430 800 C410 900 230 900 210 800 C190 700 230 580 210 460 C180 300 200 140 320 140Z" fill="#ff4b8b" ${st()}/>
    <path d="M220 430 C240 330 320 300 320 230 C320 300 400 330 420 430" fill="none" stroke="${O}" stroke-width="54" stroke-linecap="round"/><path d="M220 430 C240 330 320 300 320 230 C320 300 400 330 420 430" fill="none" stroke="#ffd23f" stroke-width="30" stroke-linecap="round"/>
    ${face(320, 600, 0.6)}
  </g>
  <g transform="rotate(12 680 520)">
    <path d="M680 140 C800 140 820 300 790 460 C770 580 810 700 790 800 C770 900 590 900 570 800 C550 700 590 580 570 460 C540 300 560 140 680 140Z" fill="#4fc3f7" ${st()}/>
    <path d="M580 430 C600 330 680 300 680 230 C680 300 760 330 780 430" fill="none" stroke="${O}" stroke-width="54" stroke-linecap="round"/><path d="M580 430 C600 330 680 300 680 230 C680 300 760 330 780 430" fill="none" stroke="#ffd23f" stroke-width="30" stroke-linecap="round"/>
    ${face(680, 600, 0.6)}
  </g>
  <circle cx="320" cy="225" r="26" fill="#ff9cc4" ${st(12)}/>`],
'2027-01-10': ['Watermelon', `
  <path d="M90 360 L910 360 C910 660 720 860 500 860 C280 860 90 660 90 360Z" fill="#2e9e4f" ${st()}/>
  <path d="M150 360 L850 360 C850 620 690 800 500 800 C310 800 150 620 150 360Z" fill="#c8f5a0"/>
  <path d="M190 360 L810 360 C810 600 670 760 500 760 C330 760 190 600 190 360Z" fill="#ff4b5c" ${st(16)}/>
  ${[[300, 450], [420, 600], [700, 460], [600, 640], [500, 700], [260, 560], [740, 580]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="24" transform="rotate(${i * 15 - 40} ${x} ${y})" fill="${O}"/>`).join('')}
  ${face(500, 470, 0.85)}
  <path d="M500 360 L500 120" fill="none"/>${sparkle(180, 180, 50)}${sparkle(830, 200, 45, '#9be7ff')}`],
'2027-01-11': ['Pool float', `
  <ellipse cx="500" cy="820" rx="420" ry="90" fill="#4fc3f7" ${st()}/>
  <ellipse cx="500" cy="660" rx="370" ry="190" fill="#ffd23f" ${st()}/>
  <ellipse cx="500" cy="680" rx="170" ry="80" fill="#4fc3f7" ${st()}/>
  <path d="M190 620 Q260 560 340 560" fill="none" stroke="#fff6b0" stroke-width="30" stroke-linecap="round"/>
  <path d="M640 520 C600 380 620 260 700 220 C800 170 900 240 880 340 C870 400 820 430 800 520Z" fill="#ffd23f" ${st()}/>
  <path d="M860 300 C930 290 980 320 960 350 C940 380 880 370 860 350Z" fill="#ff9f1c" ${st()}/>
  <ellipse cx="790" cy="285" rx="24" ry="30" fill="${O}"/><ellipse cx="760" cy="335" rx="30" ry="20" fill="#ff8fa3"/>
  ${face(330, 700, 0.5)}${sparkle(150, 220, 55)}${sparkle(420, 140, 40, '#9be7ff')}`],
'2027-01-12': ['Palm tree', `
  ${waves(870)}
  <path d="M180 880 C260 760 740 760 820 880Z" fill="#f6d58e" ${st()}/>
  <path d="M460 820 C470 640 520 460 600 300 L660 320 C590 470 550 640 560 820Z" fill="#c98b3a" ${st()}/>
  ${[400, 520, 640].map((y) => `<path d="M${470 + (820 - y) * 0.08} ${y} L${560 + (820 - y) * 0.12} ${y + 10}" ${st(14)}/>`).join('')}
  ${frond(630, 300, 190, 1.3)}${frond(630, 300, 150, 1.2, '#2e9e4f')}${frond(630, 300, -20, 1.2)}${frond(630, 300, 20, 1.1, '#2e9e4f')}${frond(630, 300, -100, 1, '#4cc26b')}
  <circle cx="590" cy="350" r="56" fill="#8a4b25" ${st()}/><circle cx="680" cy="360" r="56" fill="#8a4b25" ${st()}/>
  ${face(520, 650, 0.55)}${sparkle(860, 140, 50)}`],
'2027-01-13': ['Barbecue', `
  <path d="M300 720 L220 920 M700 720 L780 920 M500 760 L500 920" ${st(36)}/>
  <circle cx="250" cy="920" r="40" fill="#555" ${st(16)}/>
  <path d="M160 450 L840 450 C840 650 700 780 500 780 C300 780 160 650 160 450Z" fill="#e3263a" ${st()}/>
  <path d="M130 440 L870 440" ${st(40)}/>
  ${face(500, 590, 0.85)}
  <path d="M260 410 C260 360 450 360 450 410Z" fill="#c4572a" ${st(18)}/><path d="M480 410 C480 350 690 350 690 410Z" fill="#b5462a" ${st(18)}/>
  <path d="M300 380 L320 400 M360 375 L380 395 M540 370 L560 392 M610 370 L630 392" ${st(12)}/>
  <path d="M330 300 C290 250 360 210 320 150 M520 290 C480 240 550 200 510 140 M690 300 C650 250 720 210 680 150" fill="none" stroke="#c9c9d6" stroke-width="30" stroke-linecap="round"/>`],
'2027-01-14': ['Cricket bat and ball', `
  <g transform="rotate(30 440 520)">
    <rect x="410" y="80" width="60" height="230" rx="20" fill="#1d1d2b" ${st()}/>
    ${[120, 170, 220, 270].map((y) => `<path d="M415 ${y} L465 ${y - 20}" stroke="#555" stroke-width="12"/>`).join('')}
    <path d="M440 300 L330 360 C320 560 330 760 360 900 C380 940 500 940 520 900 C550 760 560 560 550 360Z" fill="#f2d39b" ${st()}/>
    <path d="M440 360 L440 880" stroke="#d8ae66" stroke-width="20" stroke-linecap="round"/>
    ${face(440, 560, 0.6)}
  </g>
  <circle cx="760" cy="760" r="140" fill="#d8202f" ${st()}/>
  <path d="M650 680 C720 740 720 800 660 860 M870 680 C800 740 800 800 860 860" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="20 18"/>
  ${face(760, 740, 0.5)}${sparkle(820, 200, 55)}`],
'2027-01-15': ['Beach umbrella', `
  ${sand(860)}
  <path d="M500 400 L520 900" ${st(40)}/><path d="M500 400 L520 900" stroke="#fff" stroke-width="16"/>
  <path d="M100 440 C120 200 300 100 500 100 C700 100 880 200 900 440 C840 400 780 400 740 450 C700 400 620 400 580 450 C540 400 460 400 420 450 C380 400 300 400 260 450 C220 400 160 400 100 440Z" fill="#ff4b5c" ${st()}/>
  <path d="M500 100 C420 200 400 350 420 450 L580 450 C600 350 580 200 500 100Z M260 450 C240 300 330 160 500 100 M740 450 C760 300 670 160 500 100" fill="#fff" ${st(16)}/>
  <circle cx="500" cy="90" r="30" fill="#ffd23f" ${st(16)}/>
  ${face(500, 300, 0.55)}
  <path d="M640 800 C640 740 800 740 800 800Z" fill="#4fc3f7" ${st(16)}/>`],
'2027-01-16': ['Crab', `
  ${[-1, 1].map((d) => [0, 1, 2].map((k) => `<path d="M${500 + d * 200} ${600 + k * 50} C${500 + d * 320} ${600 + k * 60} ${500 + d * 360} ${680 + k * 70} ${500 + d * 360} ${760 + k * 50}" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M${500 + d * 200} ${600 + k * 50} C${500 + d * 320} ${600 + k * 60} ${500 + d * 360} ${680 + k * 70} ${500 + d * 360} ${760 + k * 50}" fill="none" stroke="#ff6b4a" stroke-width="30" stroke-linecap="round"/>`).join('')).join('')}
  <path d="M300 520 C230 450 200 380 200 330 M700 520 C770 450 800 380 800 330" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M300 520 C230 450 200 380 200 330 M700 520 C770 450 800 380 800 330" fill="none" stroke="#ff6b4a" stroke-width="30" stroke-linecap="round"/>
  <path d="M200 340 C110 320 100 200 170 160 C190 230 230 230 250 200 C290 260 260 340 200 340Z M800 340 C890 320 900 200 830 160 C810 230 770 230 750 200 C710 260 740 340 800 340Z" fill="#ff4b3a" ${st()}/>
  <ellipse cx="500" cy="600" rx="270" ry="190" fill="#ff4b3a" ${st()}/>
  <path d="M420 430 L400 300 M580 430 L600 300" ${st(26)}/>
  <circle cx="400" cy="280" r="50" fill="#fff" ${st()}/><circle cx="600" cy="280" r="50" fill="#fff" ${st()}/><circle cx="408" cy="290" r="24" fill="${O}"/><circle cx="592" cy="290" r="24" fill="${O}"/>
  <ellipse cx="370" cy="640" rx="40" ry="26" fill="#ff8fa3"/><ellipse cx="630" cy="640" rx="40" ry="26" fill="#ff8fa3"/>
  <path d="M440 640 Q500 700 560 640" fill="none" ${st(26)}/>`],
'2027-01-17': ['Icy pole', `
  <rect x="455" y="680" width="90" height="260" rx="40" fill="#f0c98a" ${st()}/>
  <path d="M290 230 C290 120 380 80 500 80 C620 80 710 120 710 230 L710 640 C710 730 650 760 500 760 C350 760 290 730 290 640Z" fill="#ff4b8b" ${st()}/>
  <path d="M290 420 L710 420 L710 640 C710 730 650 760 500 760 C350 760 290 730 290 640Z" fill="#ffd23f" ${st()}/>
  <path d="M290 570 L710 570 L710 640 C710 730 650 760 500 760 C350 760 290 730 290 640Z" fill="#4fc3f7" ${st()}/>
  <path d="M600 80 C640 120 700 110 710 160 L710 120 C700 90 660 80 600 80Z" fill="#fff"/>
  <circle cx="680" cy="110" r="60" fill="#fff"/><path d="M630 82 C650 130 700 150 712 150" fill="none" ${st()}/>
  <path d="M350 160 L350 360" stroke="#ffb3d1" stroke-width="30" stroke-linecap="round"/>
  ${face(500, 280, 0.75)}<path d="M340 760 C340 800 320 820 330 850" fill="none" stroke="#4fc3f7" stroke-width="30" stroke-linecap="round"/>`],
'2027-01-18': ['Lemonade', `
  <path d="M590 340 L700 60 L760 70" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/><path d="M590 340 L700 60 L760 70" fill="none" stroke="#ff4b8b" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M250 250 L310 880 C315 920 685 920 690 880 L750 250Z" fill="#e6f7ff" ${st()}/>
  <path d="M270 400 L305 860 C310 890 690 890 695 860 L730 400Z" fill="#ffe14d"/>
  <rect x="330" y="420" width="110" height="110" rx="20" transform="rotate(-12 385 475)" fill="#fff" opacity=".7" ${st(12)}/>
  <rect x="560" y="430" width="110" height="110" rx="20" transform="rotate(14 615 485)" fill="#fff" opacity=".7" ${st(12)}/>
  <path d="M250 250 L310 880 C315 920 685 920 690 880 L750 250Z" fill="none" ${st()}/>
  <path d="M640 250 A130 130 0 0 1 900 250Z" fill="#ffd23f" ${st()}/><path d="M670 250 A100 100 0 0 1 870 250Z" fill="#fff6b0" ${st(12)}/>
  <path d="M770 250 L770 160 M770 250 L700 180 M770 250 L840 180" stroke="${O}" stroke-width="10"/>
  ${face(500, 640, 0.8)}`],
'2027-01-19': ['Sun hat', `
  <ellipse cx="500" cy="640" rx="440" ry="190" fill="#f2d39b" ${st()}/>
  <ellipse cx="500" cy="640" rx="360" ry="130" fill="none" stroke="#d8ae66" stroke-width="16" stroke-dasharray="30 22"/>
  <path d="M280 620 C260 360 360 240 500 240 C640 240 740 360 720 620 C640 680 360 680 280 620Z" fill="#f6dfad" ${st()}/>
  <path d="M285 540 C380 600 620 600 715 540 L720 620 C640 680 360 680 280 620Z" fill="#ff4b8b" ${st()}/>
  ${[0, 72, 144, 216, 288].map((a) => { const r = a * Math.PI / 180; return `<circle cx="${680 + 50 * Math.cos(r)}" cy="${560 + 50 * Math.sin(r)}" r="44" fill="#fff" ${st(16)}/>`; }).join('')}<circle cx="680" cy="560" r="34" fill="#ffd23f" ${st(16)}/>
  ${face(480, 400, 0.7)}${sparkle(150, 200, 55)}${sparkle(860, 220, 45, '#9be7ff')}`],
'2027-01-20': ['Kite', `
  <path d="M500 640 C470 720 560 760 520 830 C480 900 560 940 540 980" fill="none" ${st(16)}/>
  ${[[500, 730], [535, 830], [530, 930]].map(([x, y], i) => `<path d="M${x} ${y} L${x - 50} ${y - 30} L${x - 50} ${y + 30}Z M${x} ${y} L${x + 50} ${y - 30} L${x + 50} ${y + 30}Z" fill="${['#ff4b8b', '#ffd23f', '#4cd964'][i]}" ${st(14)}/>`).join('')}
  <path d="M500 80 L790 360 L500 640 L210 360Z" fill="#4fc3f7" ${st()}/>
  <path d="M500 80 L500 360 L210 360Z M500 360 L790 360 L500 640Z" fill="#9b5de5" ${st(16)}/>
  <path d="M500 80 L500 640 M210 360 L790 360" ${st(14)}/>
  <circle cx="500" cy="360" r="140" fill="#ffd23f" ${st()}/>
  ${face(500, 350, 0.6)}<path d="M120 900 C200 860 160 820 240 780" fill="none" stroke="#c9c9d6" stroke-width="20" stroke-linecap="round"/>`],
'2027-01-21': ['Seashell', `
  <path d="M500 860 L240 760 C120 640 120 420 230 300 C330 190 670 190 770 300 C880 420 880 640 760 760Z" fill="#ffb3c7" ${st()}/>
  ${[-3, -2, -1, 0, 1, 2, 3].map((k) => `<path d="M500 840 C${500 + k * 60} 640 ${500 + k * 100} 400 ${500 + k * 90} 230" fill="none" stroke="#e57a9a" stroke-width="18" stroke-linecap="round"/>`).join('')}
  <path d="M500 860 L240 760 C120 640 120 420 230 300 C330 190 670 190 770 300 C880 420 880 640 760 760Z" fill="none" ${st()}/>
  <path d="M400 860 L420 930 L580 930 L600 860Z" fill="#ff9cc4" ${st()}/>
  ${face(500, 470, 0.85)}
  <circle cx="820" cy="840" r="70" fill="#f8f4ff" ${st()}/><circle cx="800" cy="818" r="20" fill="#fff"/>
  ${sparkle(150, 160, 50, '#9be7ff')}`],
'2027-01-22': ['Snorkel fish', `
  ${[[180, 200, 40], [140, 340, 28], [230, 120, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e6f7ff" ${st(12)}/>`).join('')}
  <path d="M800 520 L940 380 C960 520 960 560 940 680Z" fill="#ff9f1c" ${st()}/>
  <ellipse cx="520" cy="540" rx="320" ry="280" fill="#ff9f1c" ${st()}/>
  <path d="M560 270 C620 180 720 190 740 290Z M520 810 C580 900 680 890 700 800Z" fill="#ffc15e" ${st()}/>
  <path d="M640 400 C700 500 700 600 640 700" fill="none" stroke="#ffc15e" stroke-width="40" stroke-linecap="round"/>
  <rect x="250" y="400" width="360" height="190" rx="80" fill="#9be7ff" opacity=".9" ${st()}/>
  <path d="M430 400 L430 590" ${st(16)}/>
  <ellipse cx="350" cy="495" rx="24" ry="30" fill="${O}"/><ellipse cx="510" cy="495" rx="24" ry="30" fill="${O}"/>
  <path d="M280 430 L320 430" stroke="#fff" stroke-width="16" stroke-linecap="round"/>
  <path d="M350 650 Q420 700 490 650" fill="none" ${st(26)}/>
  <path d="M600 420 L660 420 L660 110" fill="none" stroke="${O}" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/><path d="M600 420 L660 420 L660 110" fill="none" stroke="#4cd964" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`],
'2027-01-23': ['Pineapple', `
  ${leaf(500, 300, -90, 1.4, '#2e9e4f')}${leaf(500, 300, -125, 1.3, '#4cc26b')}${leaf(500, 300, -55, 1.3, '#4cc26b')}${leaf(500, 300, -155, 1.1)}${leaf(500, 300, -25, 1.1)}
  <ellipse cx="500" cy="620" rx="270" ry="320" fill="#ffc12b" ${st()}/>
  <defs><clipPath id="pa"><ellipse cx="500" cy="620" rx="270" ry="320"/></clipPath></defs>
  <g clip-path="url(#pa)">${Array.from({ length: 9 }, (_, i) => `<path d="M${120 + i * 100} 280 L${-200 + i * 100} 980 M${-120 + i * 100} 280 L${200 + i * 100} 980" stroke="#e08a12" stroke-width="16"/>`).join('')}</g>
  <ellipse cx="500" cy="620" rx="270" ry="320" fill="none" ${st()}/>
  <ellipse cx="500" cy="640" rx="170" ry="120" fill="#ffd84d"/>
  ${face(500, 620, 0.8)}`],
'2027-01-24': ['Bucket and spade', `
  ${sand(850)}
  <path d="M220 420 C220 300 720 300 720 420" fill="none" ${st(20)}/>
  <path d="M190 420 L750 420 L690 860 L250 860Z" fill="#4fc3f7" ${st()}/>
  <path d="M175 400 L765 400 L765 450 L175 450Z" fill="#2b9ed8" ${st()}/>
  ${face(470, 620, 0.85)}
  <g transform="translate(0 90) rotate(15 800 520)">
    <path d="M800 160 L800 600" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M800 160 L800 600" stroke="#ffd23f" stroke-width="30" stroke-linecap="round"/>
    <path d="M760 140 C760 100 840 100 840 140" fill="none" stroke="${O}" stroke-width="40"/>
    <path d="M720 580 L880 580 L880 700 C880 780 720 780 720 700Z" fill="#e3263a" ${st()}/>
  </g>
  <path d="M130 760 l20 -40 l20 40 l44 6 l-32 30 l8 44 l-40 -20 l-40 20 l8 -44 l-32 -30Z" fill="#ff9f1c" ${st(12)}/>`],
'2027-01-25': ['Sunscreen', `
  <rect x="380" y="100" width="240" height="120" rx="30" fill="#ff9f1c" ${st()}/>
  <path d="M300 220 L700 220 C760 220 760 260 760 300 L740 860 C740 900 260 900 260 860 L240 300 C240 260 240 220 300 220Z" fill="#fff3d6" ${st()}/>
  <path d="M250 560 L750 560 L742 780 L258 780Z" fill="#4fc3f7" ${st(16)}/>
  ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${500 + 100 * Math.cos(a)} ${670 + 70 * Math.sin(a)} L${500 + 150 * Math.cos(a)} ${670 + 100 * Math.sin(a)}" stroke="#ffd23f" stroke-width="22" stroke-linecap="round"/>`; }).join('')}
  <circle cx="500" cy="670" r="70" fill="#ffd23f" ${st(16)}/>
  ${face(500, 370, 0.75)}
  ${sparkle(830, 160, 50)}`],
'2027-01-26': ['Seagull', `
  <path d="M420 860 L400 940 M560 860 L580 940" ${st(26)}/><path d="M360 945 L440 945 M540 945 L620 945" ${st(26)}/>
  <path d="M250 640 C220 470 320 360 460 360 C470 280 520 200 620 200 C720 200 780 280 770 380 C770 560 720 860 480 870 C330 870 270 760 250 640Z" fill="#fff" ${st()}/>
  <path d="M300 520 C380 480 520 520 560 640 C580 720 520 780 400 760 C300 740 240 640 300 520Z" fill="#b7bccb" ${st()}/>
  <path d="M120 600 L270 560 L260 660Z" fill="#b7bccb" ${st()}/>
  <path d="M740 320 L900 350 L760 400Z" fill="#ffb31a" ${st()}/>
  <rect x="860" y="240" width="40" height="150" rx="12" transform="rotate(25 880 315)" fill="#ffd84d" ${st(14)}/>
  <ellipse cx="660" cy="300" rx="28" ry="34" fill="${O}"/><ellipse cx="640" cy="370" rx="36" ry="22" fill="#ff8fa3"/>`],
'2027-01-27': ['Tennis', `
  <g transform="rotate(-30 420 460)">
    <rect x="390" y="620" width="60" height="320" rx="24" fill="#4fc3f7" ${st()}/>
    <path d="M420 560 L390 640 L450 640Z" fill="#e3263a" ${st(16)}/>
    <ellipse cx="420" cy="340" rx="230" ry="280" fill="#fff" ${st(46)}/>
    <defs><clipPath id="tr"><ellipse cx="420" cy="340" rx="230" ry="280"/></clipPath></defs>
    <g clip-path="url(#tr)">${Array.from({ length: 9 }, (_, i) => `<path d="M${200 + i * 55} 40 L${200 + i * 55} 640 M150 ${100 + i * 60} L700 ${100 + i * 60}" stroke="#b7bccb" stroke-width="10"/>`).join('')}</g>
    <ellipse cx="420" cy="340" rx="230" ry="280" fill="none" stroke="#e3263a" stroke-width="26"/>
  </g>
  <circle cx="720" cy="720" r="160" fill="#d7f23a" ${st()}/>
  <path d="M590 620 C680 680 680 780 610 830 M850 620 C760 680 760 780 830 830" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round"/>
  ${face(720, 700, 0.55)}`],
'2027-01-28': ['Coconut drink', `
  <path d="M560 420 L700 120" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M560 420 L700 120" stroke="#ff4b8b" stroke-width="30" stroke-linecap="round"/>
  <path d="M600 300 C640 160 800 140 860 250Z" fill="#4fc3f7" ${st()}/><path d="M730 200 L700 330" ${st(14)}/>
  <path d="M160 450 L840 450 C840 700 700 870 500 870 C300 870 160 700 160 450Z" fill="#8a4b25" ${st()}/>
  <path d="M220 450 L780 450 C780 520 640 560 500 560 C360 560 220 520 220 450Z" fill="#fffaf0" ${st(16)}/>
  <ellipse cx="500" cy="450" rx="340" ry="60" fill="#fffaf0" ${st()}/>
  ${[[300, 700], [420, 800], [680, 680], [600, 790]].map(([x, y]) => `<path d="M${x} ${y} l20 10" stroke="#5e2f14" stroke-width="12" stroke-linecap="round"/>`).join('')}
  ${[0, 72, 144, 216, 288].map((a) => { const r = a * Math.PI / 180; return `<ellipse cx="${260 + 50 * Math.cos(r)}" cy="${420 + 50 * Math.sin(r)}" rx="46" ry="34" transform="rotate(${a} ${260 + 50 * Math.cos(r)} ${420 + 50 * Math.sin(r)})" fill="#ff4b5c" ${st(14)}/>`; }).join('')}<circle cx="260" cy="420" r="26" fill="#ffd23f" ${st(12)}/>
  ${face(500, 650, 0.8)}`],
'2027-01-29': ['Starfish', `
  <path d="M500 90 C560 90 580 330 620 360 C660 390 900 340 920 400 C940 460 720 560 710 610 C700 660 830 860 780 900 C730 940 560 780 500 780 C440 780 270 940 220 900 C170 860 300 660 290 610 C280 560 60 460 80 400 C100 340 340 390 380 360 C420 330 440 90 500 90Z" fill="#ff8a3d" ${st()}/>
  ${[[500, 220], [500, 300], [780, 420], [690, 440], [700, 790], [640, 700], [300, 790], [360, 700], [220, 420], [310, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#ffc15e"/>`).join('')}
  ${face(500, 520, 0.85)}${sparkle(150, 160, 50, '#9be7ff')}${sparkle(860, 170, 45)}`],
'2027-01-30': ['Sailboat', `
  ${waves(820)}
  <path d="M500 140 L500 700" ${st(30)}/>
  <path d="M520 160 C700 300 780 500 800 640 L520 640Z" fill="#fff" ${st()}/>
  <path d="M480 220 C360 340 280 500 260 640 L480 640Z" fill="#ff4b5c" ${st()}/>
  <path d="M310 560 L470 560 M330 470 L470 470" stroke="#fff" stroke-width="24" stroke-linecap="round"/>
  <path d="M500 140 L600 100 L500 70Z" fill="#ffd23f" ${st(16)}/>
  <path d="M170 680 L830 680 C800 800 700 840 500 840 C300 840 200 800 170 680Z" fill="#ffc12b" ${st()}/>
  ${face(500, 730, 0.6)}${sparkle(160, 200, 50)}`],
'2027-01-31': ['Sunflower', `
  <path d="M500 640 C490 760 510 860 500 960" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M500 640 C490 760 510 860 500 960" fill="none" stroke="#2e9e4f" stroke-width="30" stroke-linecap="round"/>
  ${leaf(500, 840, -160, 1.1)}${leaf(500, 800, -20, 1.1)}
  ${Array.from({ length: 14 }, (_, i) => { const a = i * 360 / 14; return `<ellipse cx="500" cy="190" rx="70" ry="140" transform="rotate(${a} 500 420)" fill="${i % 2 ? '#ffc12b' : '#ffd84d'}" ${st()}/>`; }).join('')}
  <circle cx="500" cy="420" r="190" fill="#8a4b25" ${st()}/>
  ${[[400, 330], [600, 330], [380, 480], [620, 480], [500, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#5e2f14"/>`).join('')}
  ${face(500, 410, 0.75)}`],
};
module.exports = ART;
