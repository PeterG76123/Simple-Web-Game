// Cute autumn / St Patrick's Day / Easter drawings for March 2027, 1000x1000, transparent background.
// Render: node tools/art/render.js $PWD/tools/art/march-2027.js <out-dir>
const { O, W, st, face, leaf, sparkle, heart, bubbles } = require('./helpers.js');

// A round blob outline from centre, radii.
const ell = (cx, cy, rx, ry, c, w = W) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${st(w)}/>`;
// Thick coloured line with an outline.
const line = (d, c, w = 40) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 24}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// A maple-ish autumn leaf.
const maple = (x, y, rot, s, c) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 -300 L60 -170 L170 -230 L140 -90 L280 -110 L200 0 L270 60 L120 70 L150 190 L30 120 L0 260 L-30 120 L-150 190 L-120 70 L-270 60 L-200 0 L-280 -110 L-140 -90 L-170 -230 L-60 -170Z" fill="${c}" ${st(W / s)}/><path d="M0 260 L0 -200 M0 0 L170 -150 M0 0 L-170 -150 M0 80 L150 60 M0 80 L-150 60" fill="none" stroke="${O}" stroke-width="${12 / s}" stroke-linecap="round"/></g>`;
const clover = (x, y, r, c = '#3cb75a', four = false) => {
  const n = four ? 4 : 3, a0 = four ? 45 : -90;
  return Array.from({ length: n }, (_, i) => {
    const a = (a0 + i * 360 / n) * Math.PI / 180, cx = x + r * Math.cos(a), cy = y + r * Math.sin(a);
    return `<g transform="rotate(${a0 + i * 360 / n + 90} ${cx} ${cy})">${heart(cx, cy - r * 0.1, r / 170, c)}</g>`;
  }).join('');
};
const egg = (cx, cy, rx, ry, c, deco = '') => `<path d="M${cx} ${cy - ry} C${cx + rx * 1.1} ${cy - ry} ${cx + rx} ${cy + ry} ${cx} ${cy + ry} C${cx - rx} ${cy + ry} ${cx - rx * 1.1} ${cy - ry} ${cx} ${cy - ry}Z" fill="${c}" ${st()}/>${deco}`;
const zig = (x1, x2, y, h, c) => { let d = `M${x1} ${y}`; for (let x = x1, k = 0; x < x2; x += 50, k++) d += ` L${x + 50} ${y + (k % 2 ? 0 : -h)}`; return `<path d="${d}" fill="none" stroke="${c}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`; };
const dots = (pts, c, r = 22) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st(10)}/>`).join('');
const bunnyEars = (cx, top, c = '#fff', inner = '#ffb3c7') => `<path d="M${cx - 120} ${top + 260} C${cx - 220} ${top + 100} ${cx - 190} ${top - 120} ${cx - 120} ${top - 120} C${cx - 50} ${top - 120} ${cx - 40} ${top + 100} ${cx - 50} ${top + 260}Z M${cx + 120} ${top + 260} C${cx + 220} ${top + 100} ${cx + 190} ${top - 120} ${cx + 120} ${top - 120} C${cx + 50} ${top - 120} ${cx + 40} ${top + 100} ${cx + 50} ${top + 260}Z" fill="${c}" ${st()}/><path d="M${cx - 110} ${top + 220} C${cx - 160} ${top + 100} ${cx - 150} ${top - 60} ${cx - 118} ${top - 60} C${cx - 86} ${top - 60} ${cx - 80} ${top + 100} ${cx - 86} ${top + 220}Z M${cx + 110} ${top + 220} C${cx + 160} ${top + 100} ${cx + 150} ${top - 60} ${cx + 118} ${top - 60} C${cx + 86} ${top - 60} ${cx + 80} ${top + 100} ${cx + 86} ${top + 220}Z" fill="${inner}"/>`;

const ART = {
'2027-03-01': ['Autumn leaf', `
  ${maple(500, 470, -8, 1.45, '#f07a1f')}
  <path d="M470 840 C480 900 470 940 440 960" fill="none" ${st(30)}/>
  ${face(500, 430, 0.85)}
  ${maple(150, 160, 20, 0.35, '#e8452c')}${maple(860, 820, -25, 0.32, '#f5b81c')}`],
'2027-03-02': ['Acorn', `
  <path d="M500 110 C500 70 530 50 560 50" fill="none" ${st(30)}/>
  <path d="M260 600 C260 800 400 920 500 920 C600 920 740 800 740 600Z" fill="#d9944a" ${st()}/>
  <path d="M210 420 C210 260 340 190 500 190 C660 190 790 260 790 420 C790 520 720 600 500 600 C280 600 210 520 210 420Z" fill="#8a5a2b" ${st()}/>
  <path d="M260 380 L740 380 M240 470 L760 470 M330 280 L670 280 M300 330 L330 560 M420 220 L420 590 M580 220 L580 590 M700 330 L670 560" stroke="#6b4220" stroke-width="16" stroke-linecap="round"/>
  ${face(500, 700, 0.7)}
  ${leaf(560, 140, -30, 0.9, '#e8a33a')}`],
'2027-03-03': ['Mushroom', `
  <path d="M370 520 C350 700 360 830 400 880 L600 880 C640 830 650 700 630 520Z" fill="#fff4e0" ${st()}/>
  <path d="M120 540 C120 300 300 140 500 140 C700 140 880 300 880 540 C760 580 240 580 120 540Z" fill="#e8402e" ${st()}/>
  ${dots([[300, 330], [500, 240], [690, 330], [400, 450], [610, 450], [800, 470], [200, 470]], '#fff', 40)}
  ${face(500, 680, 0.65)}
  <path d="M80 900 C300 860 700 860 920 900" fill="none" stroke="#5aa845" stroke-width="40" stroke-linecap="round"/>`],
'2027-03-04': ['Hedgehog', `
  <path d="M170 650 C130 520 160 380 240 300 L220 230 L300 260 L320 180 L390 230 L430 150 L480 220 L540 150 L580 230 L650 170 L670 250 L750 210 L740 290 L830 290 C870 400 860 540 820 650Z" fill="#8a5a33" ${st()}/>
  <path d="M290 360 L330 300 M400 320 L430 250 M520 310 L540 240 M640 330 L670 260 M740 390 L790 340 M350 470 L380 410 M600 450 L640 390" stroke="#5e3a1d" stroke-width="18" stroke-linecap="round"/>
  <path d="M170 650 C170 540 260 470 380 470 C450 470 500 520 520 600 C560 720 480 830 340 830 C240 830 170 760 170 650Z" fill="#f2d2a6" ${st()}/>
  <circle cx="190" cy="660" r="34" fill="${O}"/>
  <ellipse cx="320" cy="620" rx="22" ry="28" fill="${O}"/><ellipse cx="420" cy="620" rx="22" ry="28" fill="${O}"/>
  <ellipse cx="440" cy="690" rx="30" ry="20" fill="#ff8fa3"/>
  <path d="M290 700 Q330 740 370 700" fill="none" ${st(18)}/>
  <path d="M360 830 L360 900 M680 800 L680 900" stroke="${O}" stroke-width="60" stroke-linecap="round"/>
  ${dots([[700, 560]], '#e8402e', 50)}<path d="M700 510 L710 480" ${st(14)}/>`],
'2027-03-05': ['Squirrel', `
  <path d="M600 820 C900 820 960 560 860 380 C790 250 640 240 620 360 C700 330 760 400 740 480 C700 620 560 640 600 820Z" fill="#e0782c" ${st()}/>
  <path d="M700 380 C760 420 790 520 740 600" fill="none" stroke="#f5a85a" stroke-width="30" stroke-linecap="round"/>
  <path d="M260 230 L290 120 L360 210Z M500 210 L540 110 L590 220Z" fill="#e0782c" ${st()}/>
  <path d="M300 620 C260 760 300 860 420 880 C540 880 600 780 580 640Z" fill="#e0782c" ${st()}/>
  <ellipse cx="440" cy="760" rx="90" ry="110" fill="#ffe2c2" ${st(16)}/>
  <ellipse cx="420" cy="400" rx="220" ry="200" fill="#e98a3c" ${st()}/>
  <ellipse cx="420" cy="470" rx="120" ry="80" fill="#ffe2c2"/>
  ${face(420, 390, 0.8)}
  <g transform="translate(440 660)"><path d="M-70 0 C-70 80 -30 120 0 120 C30 120 70 80 70 0Z" fill="#d9944a" ${st(16)}/><path d="M-90 0 C-90 -60 90 -60 90 0Z" fill="#8a5a2b" ${st(16)}/></g>`],
'2027-03-06': ['Pumpkin', `
  <path d="M500 230 C490 160 510 110 560 80" fill="none" stroke="${O}" stroke-width="64" stroke-linecap="round"/><path d="M500 230 C490 160 510 110 560 80" fill="none" stroke="#5aa845" stroke-width="38" stroke-linecap="round"/>
  ${leaf(540, 180, -10, 0.9)}
  <path d="M500 250 C300 210 120 330 120 540 C120 760 300 860 500 840 C700 860 880 760 880 540 C880 330 700 210 500 250Z" fill="#ff8a1f" ${st()}/>
  <path d="M500 250 C380 300 360 780 500 840 M500 250 C620 300 640 780 500 840 M330 260 C200 360 200 740 320 830 M670 260 C800 360 800 740 680 830" fill="none" stroke="#d9620a" stroke-width="20"/>
  ${face(500, 520, 1)}`],
'2027-03-07': ['Apple', `
  <path d="M500 280 C500 200 520 140 560 100" fill="none" stroke="${O}" stroke-width="44" stroke-linecap="round"/>
  ${leaf(540, 170, -20, 1)}
  <path d="M500 290 C400 210 160 230 160 500 C160 740 330 900 440 880 C470 875 480 860 500 860 C520 860 530 875 560 880 C670 900 840 740 840 500 C840 230 600 210 500 290Z" fill="#e8302f" ${st()}/>
  <path d="M260 420 C270 360 310 320 360 310" fill="none" stroke="#ff8a80" stroke-width="40" stroke-linecap="round"/>
  ${face(500, 540, 0.95)}`],
'2027-03-08': ['Owl', `
  <path d="M300 840 L320 900 M380 850 L380 910 M620 850 L620 910 M700 840 L680 900" stroke="#f5a623" stroke-width="40" stroke-linecap="round"/>
  <path d="M220 230 L280 110 L380 210 C460 190 540 190 620 210 L720 110 L780 230 C860 330 860 500 840 620 C820 780 680 860 500 860 C320 860 180 780 160 620 C140 500 140 330 220 230Z" fill="#8a6a4a" ${st()}/>
  <path d="M320 560 C320 760 420 820 500 820 C580 820 680 760 680 560 C680 480 600 460 500 460 C400 460 320 480 320 560Z" fill="#e8d2b0" ${st(16)}/>
  ${[[420, 600], [520, 580], [460, 680], [570, 680], [510, 760]].map(([x, y]) => `<path d="M${x - 30} ${y} Q${x} ${y + 30} ${x + 30} ${y}" fill="none" stroke="#a88a66" stroke-width="12"/>`).join('')}
  <circle cx="380" cy="360" r="110" fill="#fff" ${st()}/><circle cx="620" cy="360" r="110" fill="#fff" ${st()}/>
  <circle cx="390" cy="370" r="54" fill="${O}"/><circle cx="610" cy="370" r="54" fill="${O}"/>
  <circle cx="410" cy="350" r="18" fill="#fff"/><circle cx="630" cy="350" r="18" fill="#fff"/>
  <path d="M470 440 L530 440 L500 500Z" fill="#f5a623" ${st(14)}/>
  <ellipse cx="270" cy="470" rx="36" ry="24" fill="#ff8fa3"/><ellipse cx="730" cy="470" rx="36" ry="24" fill="#ff8fa3"/>
  <path d="M190 540 C120 600 140 720 200 760 M810 540 C880 600 860 720 800 760" fill="none" ${st(20)}/>`],
'2027-03-09': ['Pinecone', `
  <path d="M500 150 C500 100 520 70 560 60" fill="none" ${st(30)}/>
  <path d="M500 150 C330 170 230 330 240 520 C250 720 380 900 500 900 C620 900 750 720 760 520 C770 330 670 170 500 150Z" fill="#a8703c" ${st()}/>
  ${[[400, 270], [600, 270], [330, 400], [500, 360], [670, 400], [330, 560], [670, 560], [400, 700], [600, 700], [500, 820]].map(([x, y]) => `<path d="M${x - 70} ${y - 30} C${x - 50} ${y + 40} ${x + 50} ${y + 40} ${x + 70} ${y - 30}" fill="#c98c4f" ${st(14)}/>`).join('')}
  ${face(500, 500, 0.75)}
  ${leaf(150, 200, 30, 0.6, '#2e7d4a')}${leaf(850, 760, 200, 0.6, '#2e7d4a')}`],
'2027-03-10': ['Fox', `
  <path d="M640 800 C860 840 960 680 900 560 C860 650 760 700 660 680Z" fill="#f07a1f" ${st()}/>
  <path d="M900 560 C930 610 940 660 920 700 C880 720 850 700 840 670Z" fill="#fff" ${st(16)}/>
  <path d="M340 600 C300 740 340 860 480 870 C620 880 690 760 660 600Z" fill="#f07a1f" ${st()}/>
  <path d="M430 640 C400 760 430 840 500 840 C570 840 600 760 570 640Z" fill="#fff4e8"/>
  <path d="M200 140 L330 300 L250 360Z M800 140 L670 300 L750 360Z" fill="#f07a1f" ${st()}/>
  <path d="M225 190 L300 290 L262 320Z M775 190 L700 290 L738 320Z" fill="#3b2416"/>
  <path d="M500 640 L230 420 C220 320 320 250 500 250 C680 250 780 320 770 420Z" fill="#f58a2e" ${st()}/>
  <path d="M500 640 L340 500 C380 470 440 480 500 520 C560 480 620 470 660 500Z" fill="#fff4e8" ${st(14)}/>
  <ellipse cx="420" cy="420" rx="24" ry="30" fill="${O}"/><ellipse cx="580" cy="420" rx="24" ry="30" fill="${O}"/>
  <ellipse cx="340" cy="470" rx="30" ry="20" fill="#ff8fa3"/><ellipse cx="660" cy="470" rx="30" ry="20" fill="#ff8fa3"/>
  <ellipse cx="500" cy="625" rx="34" ry="24" fill="${O}"/>
  ${maple(150, 820, 15, 0.25, '#e8452c')}`],
'2027-03-11': ['Umbrella in the rain', `
  <path d="M500 450 L500 820 C500 900 400 900 400 830" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M500 450 L500 820 C500 900 400 900 400 830" fill="none" stroke="#8a5a2b" stroke-width="30" stroke-linecap="round"/>
  <path d="M120 470 C140 240 300 140 500 140 C700 140 860 240 880 470 C820 420 760 420 700 470 C640 420 560 420 500 470 C440 420 360 420 300 470 C240 420 180 420 120 470Z" fill="#7a5cff" ${st()}/>
  <path d="M500 140 C420 220 390 350 400 450 M500 140 C580 220 610 350 600 450" fill="none" stroke="#5a3ee0" stroke-width="18"/>
  <circle cx="500" cy="130" r="26" fill="#ffd23f" ${st(14)}/>
  ${face(500, 300, 0.7)}
  ${[[150, 600], [250, 720], [780, 600], [870, 740], [680, 820], [180, 860]].map(([x, y]) => `<path d="M${x} ${y - 50} C${x + 40} ${y} ${x + 30} ${y + 40} ${x} ${y + 40} C${x - 30} ${y + 40} ${x - 40} ${y} ${x} ${y - 50}Z" fill="#6ec6ff" ${st(14)}/>`).join('')}`],
'2027-03-12': ['Rain boots', `
  <path d="M220 200 L420 200 L430 640 C540 650 600 700 600 780 L600 860 L200 860 Z" fill="#ffc12b" ${st()}/>
  <path d="M200 790 L600 790" ${st(18)}/><rect x="210" y="180" width="220" height="60" rx="20" fill="#ffd95a" ${st(18)}/>
  <path d="M520 160 L720 160 L730 600 C840 610 900 660 900 740 L900 820 L500 820 Z" fill="#ff5a7a" ${st()}/>
  <path d="M500 750 L900 750" ${st(18)}/><rect x="510" y="140" width="220" height="60" rx="20" fill="#ff8aa2" ${st(18)}/>
  ${face(620, 420, 0.6)}${face(320, 460, 0.6)}
  ${dots([[700, 600], [770, 660], [280, 650]], '#fff', 16)}
  <path d="M100 900 C300 870 700 870 920 900 C700 940 300 940 100 900Z" fill="#6ec6ff" ${st(16)}/>`],
'2027-03-13': ['Snail', `
  <path d="M120 800 C120 700 200 680 300 700 L800 720 C880 730 900 800 860 830 C700 860 300 860 120 800Z" fill="#ffd6a0" ${st()}/>
  <path d="M220 700 C180 560 160 400 220 330 L250 220 M220 330 L180 230" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/>
  <path d="M220 700 C180 560 160 400 220 330 L250 220 M220 330 L180 230" fill="none" stroke="#ffd6a0" stroke-width="30" stroke-linecap="round"/>
  <circle cx="250" cy="215" r="28" fill="#ffd6a0" ${st(14)}/><circle cx="178" cy="225" r="28" fill="#ffd6a0" ${st(14)}/>
  <circle cx="560" cy="500" r="270" fill="#c873d9" ${st()}/>
  <path d="M560 500 C560 450 620 450 620 500 C620 580 500 590 490 500 C480 380 680 370 690 500 C700 660 420 670 410 500 C400 300 760 290 770 500" fill="none" stroke="${O}" stroke-width="22" stroke-linecap="round"/>
  <ellipse cx="200" cy="420" rx="18" ry="24" fill="${O}"/><ellipse cx="260" cy="420" rx="18" ry="24" fill="${O}"/>
  <path d="M190 480 Q230 510 270 480" fill="none" ${st(16)}/>
  <ellipse cx="170" cy="470" rx="22" ry="15" fill="#ff8fa3"/><ellipse cx="290" cy="470" rx="22" ry="15" fill="#ff8fa3"/>`],
'2027-03-14': ['Hot cocoa', `
  ${[400, 500, 600].map((x) => `<path d="M${x} 300 C${x - 40} 240 ${x + 40} 200 ${x} 130" fill="none" stroke="#c9b8a8" stroke-width="26" stroke-linecap="round"/>`).join('')}
  <path d="M720 470 C880 460 880 700 710 690" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/><path d="M720 470 C880 460 880 700 710 690" fill="none" stroke="#5aa0e8" stroke-width="44" stroke-linecap="round"/>
  <path d="M220 360 L780 360 L740 780 C730 850 680 880 620 880 L380 880 C320 880 270 850 260 780Z" fill="#5aa0e8" ${st()}/>
  <ellipse cx="500" cy="360" rx="280" ry="60" fill="#8a5a33" ${st()}/>
  ${[[400, 340], [520, 320], [600, 360], [460, 380]].map(([x, y]) => `<rect x="${x - 34}" y="${y - 30}" width="68" height="60" rx="16" fill="#fff" ${st(12)}/>`).join('')}
  ${face(500, 560, 0.85)}
  ${heart(500, 790, 0.3, '#ff8fa3')}`],
'2027-03-15': ['Four-leaf clover', `
  <path d="M500 520 C520 700 480 820 560 940" fill="none" stroke="${O}" stroke-width="64" stroke-linecap="round"/><path d="M500 520 C520 700 480 820 560 940" fill="none" stroke="#2e9e4f" stroke-width="36" stroke-linecap="round"/>
  ${clover(500, 440, 190, '#3cb75a', true)}
  <circle cx="500" cy="440" r="50" fill="#3cb75a"/>
  ${face(500, 410, 0.7)}
  ${sparkle(150, 150, 60)}${sparkle(870, 200, 45)}${sparkle(860, 820, 50)}`],
'2027-03-16': ['Rainbow', `
  ${['#ff4b5c', '#ff9a2e', '#ffd23f', '#5cd65c', '#4fa8ff', '#9a6bff'].map((c, i) => `<path d="M${140 + i * 45} 700 C${140 + i * 45} ${440 + i * 20} ${300 + i * 25} ${250 + i * 45} 500 ${250 + i * 45} C${700 - i * 25} ${250 + i * 45} ${860 - i * 45} ${440 + i * 20} ${860 - i * 45} 700" fill="none" stroke="${c}" stroke-width="48"/>`).join('')}
  <path d="M116 700 C116 420 290 226 500 226 C710 226 884 420 884 700 M406 700 C406 640 450 500 500 500 C550 500 594 640 594 700" fill="none" ${st(16)}/>
  ${[[180, 720], [820, 720]].map(([x, y]) => `<path d="M${x - 150} ${y + 60} C${x - 170} ${y - 20} ${x - 90} ${y - 60} ${x - 40} ${y - 30} C${x - 20} ${y - 100} ${x + 90} ${y - 100} ${x + 100} ${y - 20} C${x + 170} ${y - 30} ${x + 190} ${y + 60} ${x + 120} ${y + 80} L${x - 120} ${y + 80}Z" fill="#fff" ${st()}/>`).join('')}
  ${face(180, 710, 0.45)}${face(820, 710, 0.45)}`],
'2027-03-17': ['Pot of gold', `
  ${[[350, 300], [430, 250], [520, 240], [610, 270], [680, 320], [390, 360], [470, 320], [560, 310], [640, 360], [510, 380]].map(([x, y]) => `<ellipse cx="${x}" cy="${y + 60}" rx="62" ry="42" fill="#ffc12b" ${st(16)}/><ellipse cx="${x}" cy="${y + 56}" rx="34" ry="20" fill="none" stroke="#e08a12" stroke-width="10"/>`).join('')}
  <path d="M200 440 L800 440 C860 520 860 760 760 840 C680 900 320 900 240 840 C140 760 140 520 200 440Z" fill="#3b3b4a" ${st()}/>
  <rect x="170" y="410" width="660" height="80" rx="40" fill="#4a4a5c" ${st()}/>
  <path d="M260 560 C270 520 300 500 330 495" fill="none" stroke="#6a6a80" stroke-width="30" stroke-linecap="round"/>
  ${face(500, 630, 0.85)}
  ${sparkle(170, 220, 55)}${sparkle(840, 210, 60)}${sparkle(760, 120, 30)}`],
'2027-03-18': ['Green hat', `
  <path d="M120 760 C120 680 300 650 500 650 C700 650 880 680 880 760 C880 830 700 860 500 860 C300 860 120 830 120 760Z" fill="#2e9e4f" ${st()}/>
  <path d="M290 720 L330 260 C340 200 660 200 670 260 L710 720 C640 760 360 760 290 720Z" fill="#3cb75a" ${st()}/>
  <path d="M310 560 C400 600 600 600 690 560 L700 650 C600 690 400 690 300 650Z" fill="#2b2b38" ${st()}/>
  <rect x="440" y="560" width="120" height="110" rx="14" fill="#ffc12b" ${st(18)}/><rect x="475" y="595" width="50" height="40" rx="6" fill="#2b2b38"/>
  ${clover(820, 200, 60, '#3cb75a')}${sparkle(170, 220, 50)}
  ${face(500, 380, 0.6)}`],
'2027-03-19': ['Horseshoe', `
  <path d="M260 860 L220 560 C190 300 330 150 500 150 C670 150 810 300 780 560 L740 860 L600 860 L640 560 C660 380 590 300 500 300 C410 300 340 380 360 560 L400 860Z" fill="#c0c8d4" ${st()}/>
  ${[[240, 720], [230, 560], [260, 400], [340, 260], [760, 720], [770, 560], [740, 400], [660, 260]].map(([x, y]) => `<circle cx="${x + (x < 500 ? 25 : -25)}" cy="${y}" r="16" fill="#7a8494"/>`).join('')}
  ${clover(500, 640, 90, '#3cb75a', true)}
  ${sparkle(140, 160, 50)}${sparkle(870, 150, 44)}`],
'2027-03-20': ['Easter egg', `
  ${egg(500, 500, 300, 380, '#ffb3d1')}
  <defs><clipPath id="e20"><path d="M500 120 C830 120 800 880 500 880 C200 880 170 120 500 120Z"/></clipPath></defs>
  <g clip-path="url(#e20)">${zig(150, 850, 320, 60, '#7a5cff')}${zig(150, 850, 720, 60, '#3cb7c8')}
  <rect x="100" y="380" width="800" height="80" fill="#ffe066"/>${dots([[300, 640], [420, 650], [580, 650], [700, 640]], '#7be08f', 22)}</g>
  ${egg(500, 500, 300, 380, 'none')}
  ${face(500, 530, 0.85)}
  ${sparkle(140, 200, 50, '#ffe066')}${sparkle(860, 820, 44, '#9be7ff')}`],
'2027-03-21': ['Bunny', `
  ${bunnyEars(500, 160)}
  <ellipse cx="500" cy="760" rx="260" ry="170" fill="#fff" ${st()}/>
  <ellipse cx="380" cy="890" rx="90" ry="50" fill="#fff" ${st()}/><ellipse cx="620" cy="890" rx="90" ry="50" fill="#fff" ${st()}/>
  <ellipse cx="500" cy="530" rx="250" ry="210" fill="#fff" ${st()}/>
  ${face(500, 520, 0.8)}
  <path d="M480 560 L520 560 L500 585Z" fill="#ff8fa3" ${st(10)}/>
  <path d="M300 560 L190 540 M300 590 L190 600 M700 560 L810 540 M700 590 L810 600" ${st(10)}/>
  <circle cx="780" cy="790" r="60" fill="#fff" ${st()}/>`],
'2027-03-22': ['Chick hatching', `
  <path d="M260 560 C260 800 380 900 500 900 C620 900 740 800 740 560 L680 520 L630 590 L570 510 L500 590 L430 510 L370 590 L320 520Z" fill="#fff8ec" ${st()}/>
  <path d="M320 520 C340 300 420 220 500 220 C580 220 660 300 680 520 L630 590 L570 510 L500 590 L430 510 L370 590Z" fill="#ffd94a" ${st()}/>
  <path d="M470 220 C460 170 490 140 520 150 C510 180 540 190 560 170 C560 210 530 230 500 225" fill="#ffd94a" ${st(16)}/>
  <path d="M260 100 L320 140 L280 160 Z" fill="#fff8ec" ${st(16)}/>
  <path d="M290 160 C280 230 300 260 330 270 C340 230 330 190 290 160Z" fill="#fff8ec" ${st(16)}/>
  ${face(500, 380, 0.6)}
  <path d="M470 440 L530 440 L500 480Z" fill="#ff9a2e" ${st(12)}/>
  ${dots([[380, 720], [600, 700], [500, 800]], '#ffd0e0', 26)}`],
'2027-03-23': ['Basket of eggs', `
  <path d="M220 470 C220 160 780 160 780 470" fill="none" stroke="${O}" stroke-width="70"/><path d="M220 470 C220 160 780 160 780 470" fill="none" stroke="#d9944a" stroke-width="40"/>
  ${egg(330, 430, 90, 120, '#ffb3d1', '')}${egg(500, 400, 95, 130, '#9be7ff', '')}${egg(670, 430, 90, 120, '#c9f27b', '')}
  ${zig(260, 400, 440, 30, '#7a5cff')}${zig(600, 740, 430, 30, '#ff5a7a')}
  ${dots([[470, 380], [530, 420], [490, 460]], '#ffe066', 16)}
  <path d="M160 480 L840 480 L760 860 C750 890 720 900 690 900 L310 900 C280 900 250 890 240 860Z" fill="#d9944a" ${st()}/>
  <path d="M200 590 L800 590 M220 700 L780 700 M240 800 L760 800" stroke="#a8703c" stroke-width="16"/>
  <rect x="140" y="450" width="720" height="70" rx="30" fill="#e8a85a" ${st()}/>
  ${face(500, 680, 0.6)}`],
'2027-03-24': ['Bilby', `
  <path d="M300 470 C200 300 200 80 270 60 C340 50 370 280 380 420Z M520 420 C560 260 640 60 710 80 C780 110 700 330 600 470Z" fill="#9aa0b4" ${st()}/>
  <path d="M310 400 C250 280 250 130 280 120 C320 120 340 280 345 380Z M560 380 C590 270 650 130 690 140 C720 160 660 300 600 400Z" fill="#ffb3c7"/>
  <path d="M640 860 C820 880 900 820 940 760 C900 800 820 800 760 780Z" fill="#2b2b38" ${st(16)}/><path d="M900 790 C930 780 950 760 960 740 L930 800Z" fill="#fff" ${st(10)}/>
  <ellipse cx="480" cy="720" rx="230" ry="170" fill="#a8aec2" ${st()}/>
  <ellipse cx="480" cy="770" rx="130" ry="100" fill="#e8e8f0"/>
  <path d="M260 560 C260 420 380 380 460 400 C560 420 620 480 720 560 C760 590 760 620 720 630 C620 650 520 640 420 640 C320 640 260 620 260 560Z" fill="#b4bacd" ${st()}/>
  <circle cx="735" cy="600" r="26" fill="#ff8fa3" ${st(12)}/>
  <ellipse cx="420" cy="510" rx="22" ry="28" fill="${O}"/><ellipse cx="540" cy="520" rx="22" ry="28" fill="${O}"/>
  <ellipse cx="370" cy="580" rx="30" ry="20" fill="#ff8fa3"/>
  <path d="M520 580 Q560 610 600 580" fill="none" ${st(16)}/>
  <ellipse cx="380" cy="890" rx="70" ry="40" fill="#a8aec2" ${st()}/><ellipse cx="580" cy="890" rx="70" ry="40" fill="#a8aec2" ${st()}/>`],
'2027-03-25': ['Hot cross bun', `
  <ellipse cx="500" cy="760" rx="360" ry="90" fill="#cfe8ff" ${st()}/>
  <path d="M170 650 C150 380 310 230 500 230 C690 230 850 380 830 650 C760 740 240 740 170 650Z" fill="#d98a3c" ${st()}/>
  <path d="M260 370 C280 320 330 280 390 270" fill="none" stroke="#f2b46e" stroke-width="40" stroke-linecap="round"/>
  <path d="M220 470 C400 420 600 420 780 470 M500 240 C460 400 460 560 500 710" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/>
  <path d="M220 470 C400 420 600 420 780 470 M500 240 C460 400 460 560 500 710" fill="none" stroke="#fff4e0" stroke-width="50" stroke-linecap="round"/>
  ${dots([[330, 360], [680, 380], [340, 590], [660, 600], [600, 330]], '#5e3a1d', 14)}
  <ellipse cx="350" cy="525" rx="22" ry="28" fill="${O}"/><ellipse cx="650" cy="525" rx="22" ry="28" fill="${O}"/>
  <ellipse cx="290" cy="580" rx="30" ry="20" fill="#ff8fa3"/><ellipse cx="710" cy="580" rx="30" ry="20" fill="#ff8fa3"/>
  <path d="M440 600 Q500 650 560 600" fill="none" ${st(20)}/>`],
'2027-03-26': ['Carrot', `
  <path d="M500 280 C440 180 380 120 300 110 C330 190 400 250 470 290 M500 280 C500 170 520 90 570 50 C590 150 560 230 520 290 M510 290 C580 200 660 160 730 170 C700 240 620 290 540 310" fill="#5cc45c" ${st()}/>
  <path d="M320 330 C380 270 620 270 680 330 C720 380 640 600 560 800 C530 880 470 880 440 800 C360 600 280 380 320 330Z" fill="#ff8a1f" ${st()}/>
  <path d="M390 520 L450 510 M560 600 L620 590 M420 700 L470 690 M560 430 L620 420" stroke="#d9620a" stroke-width="18" stroke-linecap="round"/>
  ${face(500, 410, 0.65)}`],
'2027-03-27': ['Tulips', `
  ${[[300, 400, '#ff5a7a', -12], [500, 320, '#ffc12b', 0], [700, 400, '#b07aff', 12]].map(([x, y, c, r]) => `<path d="M${x} ${y + 120} C${x + r * 4} ${y + 300} 500 600 500 760" fill="none" stroke="${O}" stroke-width="44"/><path d="M${x} ${y + 120} C${x + r * 4} ${y + 300} 500 600 500 760" fill="none" stroke="#3cb75a" stroke-width="20"/><g transform="rotate(${r} ${x} ${y})"><path d="M${x - 100} ${y - 60} L${x - 50} ${y - 10} L${x} ${y - 80} L${x + 50} ${y - 10} L${x + 100} ${y - 60} C${x + 120} ${y + 60} ${x + 80} ${y + 130} ${x} ${y + 130} C${x - 80} ${y + 130} ${x - 120} ${y + 60} ${x - 100} ${y - 60}Z" fill="${c}" ${st()}/></g>`).join('')}
  ${leaf(500, 720, -140, 1.1, '#2e9e4f')}${leaf(500, 720, -40, 1.1, '#2e9e4f')}
  <path d="M330 740 L670 740 L630 920 L370 920Z" fill="#ff8a5a" ${st()}/>
  ${face(500, 820, 0.42)}
  ${face(500, 330, 0.42)}`],
'2027-03-28': ['Chocolate bunny', `
  ${bunnyEars(500, 150, '#8a5a33', '#6b4220')}
  <path d="M260 880 C220 720 260 560 340 500 L660 500 C740 560 780 720 740 880Z" fill="#8a5a33" ${st()}/>
  <ellipse cx="500" cy="420" rx="220" ry="190" fill="#9a6a3e" ${st()}/>
  <path d="M290 650 L710 650 L710 760 L290 760Z" fill="#ff5a7a" ${st()}/>
  <path d="M500 650 C440 600 400 620 410 660 C420 700 470 690 500 660 C530 690 580 700 590 660 C600 620 560 600 500 650Z" fill="#ffc12b" ${st(14)}/>
  <ellipse cx="420" cy="410" rx="22" ry="28" fill="${O}"/><ellipse cx="580" cy="410" rx="22" ry="28" fill="${O}"/>
  <ellipse cx="370" cy="460" rx="30" ry="20" fill="#ff8fa3"/><ellipse cx="630" cy="460" rx="30" ry="20" fill="#ff8fa3"/>
  <path d="M480 450 L520 450 L500 475Z" fill="#ffb3c7" ${st(10)}/>
  <path d="M460 500 Q500 530 540 500" fill="none" ${st(16)}/>
  <path d="M330 300 C340 270 370 250 400 245" fill="none" stroke="#c49060" stroke-width="26" stroke-linecap="round"/>
  ${sparkle(150, 200, 50)}${sparkle(860, 220, 44, '#ff9cc4')}`],
'2027-03-29': ['Lamb', `
  <path d="M340 760 L340 900 M440 780 L440 900 M580 780 L580 900 M680 760 L680 900" stroke="#3b3b4a" stroke-width="60" stroke-linecap="round"/>
  ${[[300, 520], [400, 450], [530, 440], [660, 470], [760, 560], [740, 690], [620, 760], [480, 770], [350, 720], [270, 630], [520, 600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="110" fill="#fff" ${st()}/>`).join('')}
  ${[[300, 520], [400, 450], [530, 440], [660, 470], [760, 560], [740, 690], [620, 760], [480, 770], [350, 720], [270, 630]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="96" fill="#fff"/>`).join('')}
  <circle cx="520" cy="600" r="200" fill="#fff"/>
  <path d="M160 420 C90 410 80 480 140 500 Z M440 420 C510 410 520 480 460 500Z" fill="#3b3b4a" ${st(16)}/>
  <ellipse cx="300" cy="460" rx="150" ry="140" fill="#ffe8d6" ${st()}/>
  ${[[230, 330], [300, 310], [370, 330]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="56" fill="#fff" ${st(16)}/>`).join('')}
  ${face(300, 460, 0.5)}`],
'2027-03-30': ['Duckling', `
  <path d="M120 820 C300 780 700 780 900 820 C700 880 300 880 120 820Z" fill="#6ec6ff" ${st(16)}/>
  <path d="M260 600 C220 760 380 840 540 830 C760 820 860 700 820 560 C780 640 700 650 640 620 C700 560 660 480 600 470Z" fill="#ffd94a" ${st()}/>
  <path d="M520 640 C600 600 680 640 700 700 C620 700 560 690 520 640Z" fill="#ffc12b" ${st(16)}/>
  <circle cx="420" cy="420" r="190" fill="#ffd94a" ${st()}/>
  <path d="M400 230 C380 180 420 150 450 170 C440 200 460 220 480 210" fill="#ffd94a" ${st(16)}/>
  <path d="M190 450 C120 440 110 500 150 520 C200 540 240 510 250 480Z" fill="#ff9a2e" ${st()}/>
  ${face(440, 400, 0.6)}`],
'2027-03-31': ['Painted egg', `
  ${egg(500, 500, 300, 380, '#9be7ff')}
  <defs><clipPath id="e31"><path d="M500 120 C830 120 800 880 500 880 C200 880 170 120 500 120Z"/></clipPath></defs>
  <g clip-path="url(#e31)"><rect x="100" y="250" width="800" height="70" fill="#ff8fc0"/><rect x="100" y="680" width="800" height="70" fill="#ff8fc0"/>
  ${[260, 380, 500, 620, 740].map((x) => `<path d="M${x} 380 L${x + 40} 420 L${x} 460 L${x - 40} 420Z" fill="#ffe066" ${st(10)}/>`).join('')}
  ${[200, 320, 440, 560, 680, 800].map((x) => `<circle cx="${x}" cy="200" r="20" fill="#c9f27b" ${st(10)}/><circle cx="${x}" cy="800" r="20" fill="#c9f27b" ${st(10)}/>`).join('')}</g>
  ${egg(500, 500, 300, 380, 'none')}
  ${face(500, 540, 0.75)}
  ${sparkle(150, 200, 50, '#ffe066')}${sparkle(850, 800, 44, '#ff9cc4')}`],
};
module.exports = ART;
