// Original drawings for the December 2026 daily pictures (drawn for the game, no licence needed).
// Render: node tools/art/render.js ./tools/art/december-2026.js <out-dir>   (one PNG per day)
// Cute Christmas / New Year drawings, 1000x1000, transparent background.
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
const leaf = (x, y, rot, s = 1, c = '#2e9e4f') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C40 -60 120 -70 170 -40 C150 -20 165 10 140 20 C150 50 120 60 100 50 C90 80 50 70 40 50 C20 60 5 30 0 0Z" fill="${c}" ${st()}/><path d="M10 5 Q90 -20 150 -30" fill="none" ${st(10)}/></g>`;
const berry = (x, y, r = 40) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e3263a" ${st()}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="#fff" opacity=".8"/>`;
const sparkle = (x, y, r, c = '#ffd23f') => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${c}" ${st(14)}/>`;

const ART = {
'2026-12-09': ['Present', `
  <rect x="200" y="420" width="600" height="440" rx="40" fill="#e3263a" ${st()}/>
  <rect x="455" y="420" width="90" height="440" fill="#ffd23f" ${st()}/>
  <rect x="170" y="330" width="660" height="130" rx="30" fill="#ff4b5c" ${st()}/>
  <rect x="455" y="330" width="90" height="130" fill="#ffd23f" ${st()}/>
  <path d="M500 330 C380 170 240 210 300 300 C330 340 420 340 500 330Z" fill="#ffd23f" ${st()}/>
  <path d="M500 330 C620 170 760 210 700 300 C670 340 580 340 500 330Z" fill="#ffd23f" ${st()}/>
  <circle cx="500" cy="320" r="48" fill="#ffb31a" ${st()}/>
  ${face(330, 620, 0.9)}<circle cx="700" cy="560" r="22" fill="#fff" opacity=".9"/><circle cx="740" cy="760" r="16" fill="#fff" opacity=".9"/>`],
'2026-12-10': ['Bells', `
  <g transform="rotate(-18 360 560)"><path d="M360 300 C250 300 230 420 225 520 C220 620 170 660 150 700 L570 700 C550 660 500 620 495 520 C490 420 470 300 360 300Z" fill="#ffc12b" ${st()}/><circle cx="360" cy="730" r="48" fill="#e89a10" ${st()}/>${face(360, 540, 0.75)}</g>
  <g transform="rotate(18 640 560)"><path d="M640 300 C530 300 510 420 505 520 C500 620 450 660 430 700 L850 700 C830 660 780 620 775 520 C770 420 750 300 640 300Z" fill="#ffd84d" ${st()}/><circle cx="640" cy="730" r="48" fill="#e89a10" ${st()}/>${face(640, 540, 0.75)}</g>
  ${leaf(500, 250, -150, 1.1)}${leaf(500, 250, -30, 1.1)}
  <path d="M500 250 C400 150 330 200 380 260 C410 290 470 270 500 250Z M500 250 C600 150 670 200 620 260 C590 290 530 270 500 250Z" fill="#e3263a" ${st()}/>
  ${berry(500, 250, 46)}`],
'2026-12-11': ['Star', `
  <path d="M500 110 C530 110 560 300 590 330 C620 360 860 360 870 390 C880 420 690 540 680 580 C670 620 760 830 735 850 C710 870 540 740 500 740 C460 740 290 870 265 850 C240 830 330 620 320 580 C310 540 120 420 130 390 C140 360 380 360 410 330 C440 300 470 110 500 110Z" fill="#ffd23f" ${st()}/>
  <path d="M500 190 C515 190 535 340 560 360" fill="none" stroke="#fff6b0" stroke-width="26" stroke-linecap="round"/>
  ${face(500, 500, 1.05)}${sparkle(170, 170, 70)}${sparkle(850, 180, 55, '#9be7ff')}${sparkle(860, 780, 60, '#ffb3d1')}${sparkle(150, 790, 50, '#9be7ff')}`],
'2026-12-12': ['Wreath', `
  <circle cx="500" cy="480" r="300" fill="none" stroke="${O}" stroke-width="210"/>
  <circle cx="500" cy="480" r="300" fill="none" stroke="#2e9e4f" stroke-width="166"/>
  ${[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => { const r = a * Math.PI / 180; return `<circle cx="${500 + 300 * Math.cos(r)}" cy="${480 + 300 * Math.sin(r)}" r="70" fill="#4cc26b"/>`; }).join('')}
  ${[20, 100, 170, 250, 330].map((a) => { const r = a * Math.PI / 180; return berry(500 + 300 * Math.cos(r), 480 + 300 * Math.sin(r), 34); }).join('')}
  ${[60, 140, 210, 290].map((a) => { const r = a * Math.PI / 180; return `<circle cx="${500 + 330 * Math.cos(r)}" cy="${480 + 330 * Math.sin(r)}" r="30" fill="#ffd23f" ${st(16)}/>`; }).join('')}
  <path d="M500 790 C380 660 250 700 300 800 C330 860 440 830 500 790Z M500 790 C620 660 750 700 700 800 C670 860 560 830 500 790Z" fill="#e3263a" ${st()}/>
  <path d="M480 800 L420 940 L470 920 L500 960 L510 810Z M520 800 L580 940 L530 920 L500 960Z" fill="#c4162a" ${st()}/>
  <circle cx="500" cy="790" r="48" fill="#ff4b5c" ${st()}/>`],
'2026-12-13': ['Christmas pudding', `
  <path d="M180 560 C180 360 330 250 500 250 C670 250 820 360 820 560 C820 760 680 860 500 860 C320 860 180 760 180 560Z" fill="#8a4b25" ${st()}/>
  ${[[300, 650], [420, 760], [640, 740], [720, 600], [380, 560]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" fill="#4a2410"/>`).join('')}
  <path d="M200 470 C230 330 360 260 500 260 C640 260 770 330 800 470 C770 480 760 540 730 520 C700 500 690 560 650 540 C610 520 600 580 560 550 C520 520 500 590 460 550 C420 520 400 580 360 550 C320 520 300 570 270 530 C240 500 230 500 200 470Z" fill="#fff8ea" ${st()}/>
  ${leaf(500, 260, -140, 0.9)}${leaf(500, 260, -40, 0.9)}${berry(470, 250, 36)}${berry(535, 240, 36)}
  ${face(500, 660, 0.95)}`],
'2026-12-14': ['Elf hat', `
  <path d="M230 700 C260 470 360 280 560 200 C700 150 800 200 830 300 C760 270 690 290 650 350 C610 420 680 560 760 700Z" fill="#2fae55" ${st()}/>
  <path d="M560 200 C620 180 690 190 740 230" fill="none" stroke="#7ee39a" stroke-width="24" stroke-linecap="round"/>
  <path d="M330 520 C450 500 560 500 680 530 M290 610 C430 590 580 590 720 620" fill="none" stroke="#e3263a" stroke-width="40" stroke-linecap="round"/>
  <rect x="150" y="680" width="700" height="150" rx="75" fill="#fff" ${st()}/>
  ${[220, 330, 440, 560, 670, 780].map((x) => `<path d="M${x} 690 L${x + 40} 755 L${x} 820" fill="none" stroke="#e3263a" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
  <circle cx="830" cy="330" r="70" fill="#ffd23f" ${st()}/><path d="M800 345 L860 345" ${st(14)}/><circle cx="830" cy="370" r="10" fill="${O}"/>
  ${face(470, 830 - 290, 0.6)}`],
'2026-12-15': ['Holly', `
  ${leaf(500, 560, -170, 1.9)}${leaf(500, 560, -10, 1.9)}${leaf(500, 560, -95, 1.7, '#3bb862')}
  <circle cx="420" cy="590" r="105" fill="#e3263a" ${st()}/><circle cx="590" cy="600" r="105" fill="#ff3b4e" ${st()}/><circle cx="505" cy="720" r="105" fill="#e3263a" ${st()}/>
  <circle cx="390" cy="555" r="22" fill="#fff" opacity=".8"/><circle cx="560" cy="565" r="22" fill="#fff" opacity=".8"/><circle cx="475" cy="685" r="22" fill="#fff" opacity=".8"/>
  ${face(505, 720, 0.55)}${face(590, 600, 0.45)}${face(420, 590, 0.45)}`],
'2026-12-16': ['Angel', `
  <path d="M330 470 C140 380 90 560 160 660 C210 730 300 690 360 610Z" fill="#fff" ${st()}/><path d="M670 470 C860 380 910 560 840 660 C790 730 700 690 640 610Z" fill="#fff" ${st()}/>
  <path d="M500 470 C380 470 330 600 290 760 C270 840 300 880 500 880 C700 880 730 840 710 760 C670 600 620 470 500 470Z" fill="#ffe4f0" ${st()}/>
  <path d="M330 800 Q500 840 670 800" fill="none" stroke="#ff9cc4" stroke-width="22" stroke-linecap="round"/>
  <circle cx="500" cy="360" r="170" fill="#ffd9b8" ${st()}/>
  <path d="M330 360 C320 220 420 170 500 170 C600 170 690 230 670 370 C640 300 590 270 540 300 C500 260 430 280 400 320 C370 300 350 330 330 360Z" fill="#ffd23f" ${st()}/>
  <path d="M330 360 C300 450 320 520 350 540 M670 370 C700 450 680 520 650 540" fill="none" stroke="#ffd23f" stroke-width="40" stroke-linecap="round"/>
  <ellipse cx="500" cy="130" rx="130" ry="36" fill="none" stroke="${O}" stroke-width="58"/><ellipse cx="500" cy="130" rx="130" ry="36" fill="none" stroke="#ffd23f" stroke-width="30"/>
  ${face(500, 390, 0.75)}${sparkle(200, 230, 45)}${sparkle(820, 250, 40)}`],
'2026-12-17': ['Candle', `
  <path d="M500 90 C580 190 600 270 560 330 C530 370 470 370 440 330 C400 270 430 190 500 90Z" fill="#ffb31a" ${st()}/>
  <path d="M500 190 C535 240 540 280 520 310 C505 330 490 330 478 310 C462 280 470 240 500 190Z" fill="#fff3a0"/>
  <path d="M500 340 L500 400" ${st(18)}/>
  <rect x="330" y="390" width="340" height="460" rx="40" fill="#f2f0e6" ${st()}/>
  <path d="M330 450 C330 400 670 400 670 450 L670 470 C640 470 640 540 610 540 C580 540 590 480 560 480 C530 480 530 600 500 600 C470 600 470 490 440 490 C410 490 410 520 380 520 C350 520 360 470 330 470Z" fill="#fff" ${st()}/>
  <path d="M370 600 L370 800" stroke="#e8e2cf" stroke-width="30" stroke-linecap="round"/>
  ${face(520, 690, 0.8)}
  ${leaf(500, 860, -175, 1.3)}${leaf(500, 860, -5, 1.3)}${berry(470, 870, 40)}${berry(535, 870, 40)}`],
'2026-12-18': ['Sleigh', `
  <path d="M140 800 L800 800 C880 800 900 860 840 880 M260 700 L260 800 M650 700 L650 800" fill="none" stroke="${O}" stroke-width="58" stroke-linecap="round"/>
  <path d="M140 800 L800 800 C880 800 900 860 840 880 M260 700 L260 800 M650 700 L650 800" fill="none" stroke="#ffd23f" stroke-width="26" stroke-linecap="round"/>
  <path d="M180 360 L240 700 L760 700 C860 700 880 560 820 520 C780 490 740 520 720 560 L240 560 C220 470 230 400 260 360Z" fill="#e3263a" ${st()}/>
  <path d="M300 620 C420 660 600 660 700 620" fill="none" stroke="#ffd23f" stroke-width="26" stroke-linecap="round"/>
  <rect x="300" y="400" width="170" height="170" rx="16" fill="#2fae55" ${st()}/><rect x="370" y="400" width="30" height="170" fill="#ffd23f"/>
  <rect x="460" y="330" width="200" height="240" rx="16" fill="#9b5de5" ${st()}/><rect x="545" y="330" width="34" height="240" fill="#fff"/>
  <path d="M560 330 C510 260 470 290 500 320 Z M560 330 C610 260 650 290 620 320Z" fill="#fff" ${st(14)}/>
  <circle cx="410" cy="650" r="30" fill="#ffd23f" ${st(14)}/><circle cx="590" cy="650" r="30" fill="#ffd23f" ${st(14)}/>
  ${sparkle(150, 200, 50)}${sparkle(850, 260, 60, '#9be7ff')}`],
'2026-12-19': ['Penguin in a scarf', `
  <ellipse cx="330" cy="860" rx="90" ry="40" fill="#ff9f1c" ${st()}/><ellipse cx="670" cy="860" rx="90" ry="40" fill="#ff9f1c" ${st()}/>
  <path d="M500 170 C330 170 230 330 230 560 C230 760 340 860 500 860 C660 860 770 760 770 560 C770 330 670 170 500 170Z" fill="#2b2b3a" ${st()}/>
  <path d="M220 520 C140 600 150 700 210 720 C240 650 250 600 250 560Z M780 520 C860 600 850 700 790 720 C760 650 750 600 750 560Z" fill="#2b2b3a" ${st()}/>
  <path d="M500 330 C390 330 330 420 330 560 C330 720 410 800 500 800 C590 800 670 720 670 560 C670 420 610 330 500 330Z" fill="#fffaf2" ${st()}/>
  ${face(500, 440, 0.85)}<path d="M465 500 L535 500 L500 545Z" fill="#ff9f1c" ${st(14)}/>
  <path d="M280 600 C400 650 600 650 720 600 L720 680 C600 720 400 720 280 680Z" fill="#e3263a" ${st()}/>
  <path d="M600 660 L640 860 L720 850 L680 650Z" fill="#e3263a" ${st()}/><path d="M640 860 L630 900 M680 855 L690 900 M720 850 L740 890" ${st(14)}/>
  <path d="M340 625 L340 680 M420 640 L420 700 M500 645 L500 705 M580 640 L580 700" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
  <path d="M330 220 C350 110 650 110 670 220 C620 200 380 200 330 220Z" fill="#2fa8e0" ${st()}/><circle cx="500" cy="110" r="50" fill="#fff" ${st()}/>`],
'2026-12-20': ['Mistletoe', `
  <path d="M500 60 L500 300" ${st(18)}/>
  <path d="M500 300 C400 220 350 260 380 310 C410 350 470 330 500 300Z M500 300 C600 220 650 260 620 310 C590 350 530 330 500 300Z" fill="#e3263a" ${st()}/>
  <path d="M480 310 L430 420 L470 405 L490 440 L505 320Z M520 310 L570 420 L530 405Z" fill="#c4162a" ${st()}/>
  <circle cx="500" cy="300" r="40" fill="#ff4b5c" ${st()}/>
  ${leaf(500, 400, 120, 1.7, '#7cc04b')}${leaf(500, 400, 60, 1.7, '#7cc04b')}${leaf(500, 400, 160, 1.4, '#5aa63a')}${leaf(500, 400, 20, 1.4, '#5aa63a')}
  ${[[460, 520], [540, 520], [500, 590]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="70" fill="#fffdf2" ${st()}/>`).join('')}
  
  <path d="M500 860 C380 760 300 690 360 640 C410 600 470 640 500 680 C530 640 590 600 640 640 C700 690 620 760 500 860Z" fill="#ff7aa8" ${st()}/>`],
'2026-12-21': ['Nutcracker', `
  <rect x="340" y="90" width="320" height="230" rx="30" fill="#55556a" ${st()}/><rect x="340" y="270" width="320" height="50" fill="#ffd23f" ${st()}/>
  <path d="M500 100 L500 40" ${st(18)}/><circle cx="500" cy="40" r="26" fill="#e3263a" ${st(14)}/>
  <rect x="350" y="320" width="300" height="240" rx="20" fill="#ffd9b8" ${st()}/>
  ${face(500, 400, 0.65)}
  <path d="M350 470 C360 600 420 640 500 640 C580 640 640 600 650 470 C600 510 400 510 350 470Z" fill="#fff" ${st()}/>
  <rect x="300" y="560" width="400" height="260" rx="30" fill="#e3263a" ${st()}/>
  <path d="M500 560 L500 820" stroke="#ffd23f" stroke-width="20"/>${[620, 690, 760].map((y) => `<circle cx="500" cy="${y}" r="20" fill="#ffd23f" ${st(12)}/>`).join('')}
  <rect x="230" y="580" width="80" height="200" rx="30" fill="#e3263a" ${st()}/><rect x="690" y="580" width="80" height="200" rx="30" fill="#e3263a" ${st()}/>
  <rect x="340" y="820" width="140" height="120" rx="20" fill="#55556a" ${st()}/><rect x="520" y="820" width="140" height="120" rx="20" fill="#55556a" ${st()}/>
  <rect x="280" y="560" width="440" height="40" rx="16" fill="#ffd23f" ${st(16)}/>`],
'2026-12-22': ['Snowflake', `
  ${[0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a} 500 500)"><path d="M500 500 L500 110 M500 260 L410 180 M500 260 L590 180 M500 370 L430 310 M500 370 L570 310" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/><path d="M500 500 L500 110 M500 260 L410 180 M500 260 L590 180 M500 370 L430 310 M500 370 L570 310" fill="none" stroke="#e6f7ff" stroke-width="40" stroke-linecap="round"/><circle cx="500" cy="110" r="40" fill="#9be7ff" ${st(18)}/></g>`).join('')}
  <circle cx="500" cy="500" r="170" fill="#bfeeff" ${st()}/>${face(500, 480, 0.8)}`],
'2026-12-23': ['Bon-bon', `
  <path d="M290 380 L110 250 C90 300 130 340 90 380 C130 420 90 460 120 500 C90 540 120 600 110 620 L290 520Z" fill="#2fae55" ${st()}/>
  <path d="M710 380 L890 250 C910 300 870 340 910 380 C870 420 910 460 880 500 C910 540 880 600 890 620 L710 520Z" fill="#2fae55" ${st()}/>
  <rect x="270" y="340" width="460" height="220" rx="60" fill="#e3263a" ${st()}/>
  <rect x="340" y="340" width="50" height="220" fill="#ffd23f"/><rect x="610" y="340" width="50" height="220" fill="#ffd23f"/>
  <rect x="270" y="340" width="460" height="220" rx="60" fill="none" ${st()}/>
  ${face(500, 430, 0.75)}
  ${sparkle(500, 200, 70)}${sparkle(240, 760, 50, '#9be7ff')}${sparkle(760, 760, 50, '#ffb3d1')}
  <path d="M400 650 Q440 700 400 760 M600 650 Q560 700 600 760" fill="none" stroke="#ffd23f" stroke-width="22" stroke-linecap="round"/>`],
'2026-12-24': ['Robin', `
  <path d="M200 560 C120 520 100 600 140 640 C120 680 160 720 200 690Z" fill="#c08a5c" ${st()}/>
  <path d="M500 220 C320 220 200 380 200 560 C200 750 340 840 500 840 C680 840 800 730 800 560 C800 380 680 220 500 220Z" fill="#c08a5c" ${st()}/>
  <path d="M500 420 C380 420 320 520 320 620 C320 740 410 800 500 800 C600 800 690 740 690 620 C690 520 620 420 500 420Z" fill="#ff5a36" ${st()}/>
  <path d="M500 640 C420 640 380 700 400 780 C440 820 570 820 600 780 C620 700 580 640 500 640Z" fill="#fff4e6"/>
  <path d="M320 560 C260 620 280 720 360 740 C370 680 360 620 330 560Z" fill="#a06c44" ${st()}/>
  ${face(500, 360, 0.95)}<path d="M470 470 L530 470 L500 510Z" fill="#ffb31a" ${st(14)}/>
  <path d="M440 840 L430 910 M560 840 L570 910 M400 910 L460 910 M540 910 L600 910" ${st(34)}/>
  ${leaf(560, 225, -150, 0.8)}${leaf(560, 225, -60, 0.8)}${berry(560, 225, 32)}`],
'2026-12-25': ['Santa on a surfboard', `
  <path d="M60 820 C200 760 300 860 450 800 C600 740 700 840 940 780 L940 960 L60 960Z" fill="#2ec4b6" ${st()}/>
  <path d="M60 820 C200 760 300 860 450 800 C600 740 700 840 940 780" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/>
  <path d="M120 760 C300 700 700 640 900 660 C920 690 880 720 840 730 C640 760 300 820 150 820 C100 820 90 780 120 760Z" fill="#ffb31a" ${st()}/>
  <path d="M200 770 C400 730 650 700 830 690" fill="none" stroke="#e3263a" stroke-width="24" stroke-linecap="round"/>
  <path d="M400 720 L380 600 L460 600 L470 710Z M560 700 L590 590 L660 600 L630 700Z" fill="#e3263a" ${st()}/>
  <rect x="360" y="690" width="110" height="40" rx="18" fill="#2b2b3a" ${st(14)}/><rect x="560" y="680" width="110" height="40" rx="18" fill="#2b2b3a" ${st(14)}/>
  <path d="M380 620 C360 480 400 420 520 420 C640 420 680 480 660 620Z" fill="#e3263a" ${st()}/>
  <rect x="370" y="560" width="300" height="50" fill="#2b2b3a" ${st(16)}/><rect x="490" y="560" width="60" height="50" fill="#ffd23f" ${st(12)}/>
  <path d="M400 470 L230 380 M640 470 L800 360" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/><path d="M400 470 L230 380 M640 470 L800 360" fill="none" stroke="#e3263a" stroke-width="44" stroke-linecap="round"/>
  <circle cx="220" cy="375" r="36" fill="#fff" ${st(16)}/><circle cx="810" cy="355" r="36" fill="#fff" ${st(16)}/>
  <circle cx="520" cy="320" r="120" fill="#ffd9b8" ${st()}/>
  <path d="M400 330 C400 470 460 520 520 520 C580 520 640 470 640 330 C600 380 440 380 400 330Z" fill="#fff" ${st()}/>
  <path d="M400 290 C420 150 600 120 660 230 C700 280 740 300 760 330" fill="#e3263a" ${st()}/><path d="M395 290 C420 260 620 260 645 290" fill="none" stroke="${O}" stroke-width="70" stroke-linecap="round"/><path d="M395 290 C420 260 620 260 645 290" fill="none" stroke="#fff" stroke-width="40" stroke-linecap="round"/>
  <circle cx="765" cy="335" r="40" fill="#fff" ${st(16)}/>
  <rect x="425" y="300" width="80" height="44" rx="18" fill="#2b2b3a"/><rect x="535" y="300" width="80" height="44" rx="18" fill="#2b2b3a"/><path d="M505 315 L535 315" ${st(12)}/>
  <path d="M490 400 Q520 425 550 400" fill="none" ${st(12)}/><circle cx="520" cy="370" r="22" fill="#ff8fa3"/>
  ${sparkle(850, 140, 60)}<circle cx="140" cy="160" r="70" fill="#ffd23f" ${st()}/>`],
'2026-12-26': ['Fireworks', `
  ${Array.from({ length: 12 }, (_, i) => { const a = i * 30, c = ['#ff4b8b', '#ffd23f', '#4cd964', '#9b5de5'][i % 4]; return `<g transform="rotate(${a} 500 470)"><path d="M500 360 L500 110" stroke="${O}" stroke-width="64" stroke-linecap="round"/><path d="M500 360 L500 110" stroke="${c}" stroke-width="32" stroke-linecap="round"/><circle cx="500" cy="80" r="30" fill="${c}" ${st(14)}/></g>`; }).join('')}
  <circle cx="500" cy="470" r="130" fill="#ffe066" ${st()}/>${face(500, 450, 0.65)}
  <path d="M500 600 L470 900" stroke="#ffb31a" stroke-width="20" stroke-dasharray="40 30" stroke-linecap="round"/>
  ${sparkle(150, 820, 55, '#9be7ff')}${sparkle(840, 830, 55, '#ffb3d1')}`],
'2026-12-27': ['Champagne glasses', `
  <g transform="rotate(-16 360 560)"><path d="M210 180 L510 180 C520 420 470 520 360 540 C250 520 200 420 210 180Z" fill="#fff6c9" ${st()}/><path d="M218 300 L502 300 C500 450 450 515 360 528 C270 515 220 450 218 300Z" fill="#ffd23f"/><path d="M210 180 L510 180 C520 420 470 520 360 540 C250 520 200 420 210 180Z" fill="none" ${st()}/><rect x="335" y="540" width="50" height="230" fill="#fff6c9" ${st()}/><rect x="230" y="760" width="260" height="60" rx="30" fill="#fff6c9" ${st()}/>${face(360, 380, 0.6)}</g>
  <g transform="rotate(16 640 560)"><path d="M490 180 L790 180 C800 420 750 520 640 540 C530 520 480 420 490 180Z" fill="#fff6c9" ${st()}/><path d="M498 300 L782 300 C780 450 730 515 640 528 C550 515 500 450 498 300Z" fill="#ffb3d1"/><path d="M490 180 L790 180 C800 420 750 520 640 540 C530 520 480 420 490 180Z" fill="none" ${st()}/><rect x="615" y="540" width="50" height="230" fill="#fff6c9" ${st()}/><rect x="510" y="760" width="260" height="60" rx="30" fill="#fff6c9" ${st()}/>${face(640, 380, 0.6)}</g>
  ${sparkle(500, 90, 80)}${sparkle(130, 260, 50, '#9be7ff')}${sparkle(880, 260, 50, '#9be7ff')}`],
'2026-12-28': ['Party hat', `
  <path d="M500 120 L780 820 C700 870 300 870 220 820Z" fill="#9b5de5" ${st()}/>
  <path d="M440 270 L560 270 M380 420 L620 420 M320 570 L680 570 M270 710 L730 710" stroke="#ffd23f" stroke-width="44"/>
  ${[[450, 340], [560, 500], [400, 640], [620, 650], [500, 780]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#ff7aa8"/>`).join('')}
  <path d="M500 120 L780 820 C700 870 300 870 220 820Z" fill="none" ${st()}/>
  <circle cx="500" cy="110" r="80" fill="#ff4b8b" ${st()}/>${[0, 72, 144, 216, 288].map((a) => `<path d="M500 110 L${500 + 110 * Math.cos(a * Math.PI / 180)} ${110 + 110 * Math.sin(a * Math.PI / 180)}" stroke="${O}" stroke-width="14"/>`).join('')}
  <path d="M220 820 C150 760 120 700 170 650 M780 820 C850 760 880 700 830 650" fill="none" stroke="#4cd964" stroke-width="26" stroke-linecap="round"/>
  ${face(500, 560, 0.55)}${sparkle(170, 230, 50)}${sparkle(840, 300, 50, '#9be7ff')}`],
'2026-12-29': ['Clock striking midnight', `
  <circle cx="300" cy="180" r="90" fill="#ffd23f" ${st()}/><circle cx="700" cy="180" r="90" fill="#ffd23f" ${st()}/>
  <path d="M280 880 L330 780 M720 880 L670 780" ${st(36)}/>
  <circle cx="500" cy="520" r="330" fill="#ff4b5c" ${st()}/><circle cx="500" cy="520" r="260" fill="#fffaf0" ${st()}/>
  ${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<circle cx="${500 + 220 * Math.sin(a)}" cy="${520 - 220 * Math.cos(a)}" r="${i % 3 ? 12 : 22}" fill="${O}"/>`; }).join('')}
  <path d="M500 520 L500 300 M500 520 L500 360" ${st(30)}/><circle cx="500" cy="520" r="30" fill="#ffd23f" ${st(14)}/>
  ${face(500, 600, 0.6)}<path d="M500 190 L500 150" ${st(30)}/>
  ${sparkle(120, 470, 50)}${sparkle(880, 470, 50, '#ffb3d1')}`],
'2026-12-30': ['Party popper', `
  <path d="M170 860 L430 470 L560 600Z" fill="#ff4b8b" ${st()}/>
  <path d="M260 730 L420 650 M330 620 L470 540" stroke="#ffd23f" stroke-width="40" stroke-linecap="round"/>
  <path d="M170 860 L430 470 L560 600Z" fill="none" ${st()}/>
  <ellipse cx="495" cy="535" rx="100" ry="40" transform="rotate(45 495 535)" fill="#ff9cc4" ${st()}/>
  ${face(350, 690, 0.45)}
  <path d="M520 470 C560 340 520 270 600 220 C680 170 640 120 700 90" fill="none" stroke="#4cd964" stroke-width="44" stroke-linecap="round"/>
  <path d="M560 520 C680 520 720 440 800 460 C880 480 900 420 940 400" fill="none" stroke="#9b5de5" stroke-width="44" stroke-linecap="round"/>
  <path d="M540 490 C620 400 700 380 760 300" fill="none" stroke="#ffd23f" stroke-width="44" stroke-linecap="round"/>
  ${[[640, 140, '#ffd23f'], [820, 220, '#ff4b8b'], [880, 560, '#4cd964'], [720, 650, '#ffd23f'], [460, 230, '#9b5de5'], [770, 120, '#4cd964']].map(([x, y, c], i) => `<rect x="${x - 26}" y="${y - 18}" width="52" height="36" rx="8" transform="rotate(${i * 37} ${x} ${y})" fill="${c}" ${st(12)}/>`).join('')}
  ${sparkle(560, 360, 50)}${sparkle(880, 760, 45, '#9be7ff')}`],
'2026-12-31': ['Disco ball', `
  <path d="M500 40 L500 150" ${st(20)}/><rect x="460" y="140" width="80" height="50" rx="10" fill="#c9c9d6" ${st(16)}/>
  <defs><clipPath id="ball"><circle cx="500" cy="520" r="320"/></clipPath></defs>
  <circle cx="500" cy="520" r="320" fill="#d7d9e6"/>
  <g clip-path="url(#ball)">${Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => { const x = 180 + c * 82, y = 200 + r * 82, k = (r * 7 + c * 3) % 9; const col = (r === 0 || r === 7 || c === 0 || c === 7) && k % 3 === 0 ? '#ff9cc4' : k === 4 ? '#b8a4ff' : (r + c) % 2 ? '#f4f5fb' : '#cfd2e0'; return `<rect x="${x}" y="${y}" width="82" height="82" fill="${col}" stroke="#8d90a3" stroke-width="10"/>`; }).join('')).join('')}</g>
  <circle cx="500" cy="520" r="320" fill="none" ${st()}/>
  <circle cx="500" cy="580" r="190" fill="#f4f5fb" ${st(16)}/>
  ${face(500, 560, 0.9)}${sparkle(150, 230, 60)}${sparkle(860, 260, 55, '#ffb3d1')}${sparkle(860, 820, 45, '#9be7ff')}${sparkle(140, 820, 45)}`],
};
module.exports = ART;
