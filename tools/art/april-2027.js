// Cute farm / garden bugs / Anzac Day / space drawings for April 2027, 1000x1000, transparent background.
// Render: node tools/art/render.js $PWD/tools/art/april-2027.js <out-dir>
const { O, W, st, face, leaf, sparkle, heart } = require('./helpers.js');

const dots = (pts, c, r = 22, w = 10) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st(w)}/>`).join('');
const line = (d, c, w = 40) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 24}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const cheeks = (cx, cy, dx, s = 1) => `<ellipse cx="${cx - dx}" cy="${cy}" rx="${30 * s}" ry="${20 * s}" fill="#ff8fa3"/><ellipse cx="${cx + dx}" cy="${cy}" rx="${30 * s}" ry="${20 * s}" fill="#ff8fa3"/>`;
const eyes = (cx, cy, dx, s = 1) => `<ellipse cx="${cx - dx}" cy="${cy}" rx="${22 * s}" ry="${28 * s}" fill="${O}"/><ellipse cx="${cx + dx}" cy="${cy}" rx="${22 * s}" ry="${28 * s}" fill="${O}"/>`;
const smile = (cx, cy, w, s = 1) => `<path d="M${cx - w} ${cy} Q${cx} ${cy + w} ${cx + w} ${cy}" fill="none" ${st(18 * s)}/>`;
const flower = (x, y, r, c, mid = '#ffd23f') => Array.from({ length: 6 }, (_, i) => {
  const a = i * Math.PI / 3;
  return `<circle cx="${x + r * Math.cos(a)}" cy="${y + r * Math.sin(a)}" r="${r * 0.75}" fill="${c}" ${st(14)}/>`;
}).join('') + `<circle cx="${x}" cy="${y}" r="${r * 0.7}" fill="${mid}" ${st(14)}/>`;
const wing = (x, y, rx, ry, rot, c = '#dff4ff') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${c}" ${st(16)}/>`;
const antenna = (x1, y1, x2, y2, bend) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2 + bend} ${Math.min(y1, y2) - 40} ${x2} ${y2}" fill="none" ${st(16)}/><circle cx="${x2}" cy="${y2}" r="24" fill="${O}"/>`;
const star = (x, y, r, c = '#ffd23f') => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${x + rr * Math.cos(a)} ${y + rr * Math.sin(a)} `; }
  return `<path d="${d}Z" fill="${c}" ${st(14)}/>`;
};

const ART = {
'2027-04-01': ['Cow', `
  <path d="M250 300 C150 260 90 320 120 370 C150 410 230 390 270 360Z M750 300 C850 260 910 320 880 370 C850 410 770 390 730 360Z" fill="#fff" ${st()}/>
  <path d="M330 230 C320 160 290 130 260 130 M670 230 C680 160 710 130 740 130" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M330 230 C320 160 290 130 260 130 M670 230 C680 160 710 130 740 130" fill="none" stroke="#ffe8a8" stroke-width="30" stroke-linecap="round"/>
  <path d="M500 200 C320 200 240 300 250 460 C260 560 300 620 330 650 L670 650 C700 620 740 560 750 460 C760 300 680 200 500 200Z" fill="#fff" ${st()}/>
  <path d="M260 380 C280 290 340 240 400 250 C420 320 380 400 300 430Z M620 230 C690 240 720 300 700 350 C650 340 610 290 620 230Z" fill="#3b3b4a"/>
  ${eyes(410, 430, 0)}${eyes(590, 430, 0)}
  <ellipse cx="500" cy="660" rx="230" ry="150" fill="#ffb3c7" ${st()}/>
  <ellipse cx="420" cy="640" rx="30" ry="40" fill="#d9768f"/><ellipse cx="580" cy="640" rx="30" ry="40" fill="#d9768f"/>
  ${smile(500, 720, 60)}
  ${cheeks(500, 510, 200)}
  <path d="M440 810 L560 810 L560 860 C560 900 440 900 440 860Z" fill="#ffc12b" ${st(16)}/>`],
'2027-04-02': ['Pig', `
  <path d="M250 260 L220 120 L380 210Z M750 260 L780 120 L620 210Z" fill="#ffa8c0" ${st()}/>
  <circle cx="500" cy="510" r="330" fill="#ffbdd0" ${st()}/>
  ${eyes(500, 420, 130)}
  <ellipse cx="500" cy="580" rx="140" ry="100" fill="#ff94b2" ${st()}/>
  <ellipse cx="455" cy="580" rx="24" ry="36" fill="#c45c7c"/><ellipse cx="545" cy="580" rx="24" ry="36" fill="#c45c7c"/>
  ${cheeks(500, 520, 230)}
  ${smile(500, 720, 50)}
  ${heart(820, 180, 0.3, '#ff6b8f')}`],
'2027-04-03': ['Hen', `
  <path d="M430 200 C410 130 460 110 480 150 C490 100 550 100 550 160 C580 120 630 140 610 200Z" fill="#e8302f" ${st()}/>
  <path d="M770 480 C860 380 920 420 900 500 C950 500 950 580 880 600 C900 660 840 700 790 650Z" fill="#fff" ${st()}/>
  <path d="M500 200 C340 200 260 320 270 480 C200 560 210 760 360 830 C470 880 640 870 740 800 C860 710 860 540 760 470 C720 300 640 200 500 200Z" fill="#fff" ${st()}/>
  <path d="M420 560 C480 520 600 520 660 600 C640 700 520 720 440 660Z" fill="#f2ead8" ${st(16)}/>
  ${eyes(500, 360, 70)}
  <path d="M470 420 L540 420 L505 470Z" fill="#ffa62b" ${st(12)}/>
  <path d="M490 470 C470 520 520 530 520 480" fill="#e8302f" ${st(12)}/>
  ${cheeks(500, 440, 130)}
  <path d="M420 840 L400 920 M600 840 L620 920" stroke="#ffa62b" stroke-width="30" stroke-linecap="round"/>
  <ellipse cx="160" cy="850" rx="70" ry="90" fill="#fff4e0" ${st()}/>`],
'2027-04-04': ['Horse', `
  <path d="M330 270 L300 130 L420 220Z M670 270 L700 130 L580 220Z" fill="#b5703c" ${st()}/>
  <path d="M380 220 C420 120 520 110 560 170 C620 110 700 160 660 240 C620 300 420 300 380 220Z" fill="#5e3a1d" ${st()}/>
  <path d="M500 230 C340 230 300 350 310 480 C320 600 330 690 350 750 C380 860 620 860 650 750 C670 690 680 600 690 480 C700 350 660 230 500 230Z" fill="#c98446" ${st()}/>
  <ellipse cx="500" cy="740" rx="170" ry="120" fill="#f2c79a" ${st()}/>
  <ellipse cx="450" cy="720" rx="22" ry="30" fill="${O}"/><ellipse cx="550" cy="720" rx="22" ry="30" fill="${O}"/>
  <path d="M460 790 Q500 820 540 790" fill="none" ${st(16)}/>
  ${eyes(500, 460, 100)}${cheeks(500, 540, 140)}
  <path d="M460 230 L540 230 L500 330Z" fill="#fff" ${st(14)}/>`],
'2027-04-05': ['Red barn', `
  <path d="M80 880 C300 850 700 850 920 880" fill="none" stroke="#5aa845" stroke-width="40" stroke-linecap="round"/>
  <path d="M170 450 L500 160 L830 450 L830 860 L170 860Z" fill="#e8402e" ${st()}/>
  <path d="M120 470 L500 130 L880 470" fill="none" stroke="${O}" stroke-width="70" stroke-linejoin="round" stroke-linecap="round"/><path d="M120 470 L500 130 L880 470" fill="none" stroke="#fff" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="500" cy="350" r="60" fill="#fff" ${st()}/>
  <rect x="340" y="560" width="320" height="300" fill="#fff" ${st()}/>
  <path d="M340 560 L660 860 M660 560 L340 860" ${st(18)}/>
  ${eyes(500, 340, 22, 0.6)}<path d="M480 370 Q500 390 520 370" fill="none" ${st(12)}/>
  ${sparkle(130, 180, 50)}`],
'2027-04-06': ['Tractor', `
  <path d="M220 640 L220 380 L470 380 L520 520 L800 520 C840 520 860 540 860 580 L860 700 L220 700Z" fill="#3cb75a" ${st()}/>
  <path d="M260 380 L260 220 L470 220 L470 380" fill="#bfe8ff" ${st()}/>
  <rect x="240" y="200" width="250" height="40" rx="14" fill="#2e9e4f" ${st()}/>
  <path d="M720 520 L720 380" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M720 520 L720 380" stroke="#888" stroke-width="30" stroke-linecap="round"/>
  <circle cx="330" cy="740" r="170" fill="#3b3b4a" ${st()}/><circle cx="330" cy="740" r="80" fill="#ffc12b" ${st()}/>
  <circle cx="750" cy="780" r="110" fill="#3b3b4a" ${st()}/><circle cx="750" cy="780" r="50" fill="#ffc12b" ${st()}/>
  ${eyes(680, 600, 60, 0.8)}${smile(680, 650, 30)}
  ${[[700, 320], [740, 250]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${36 + i * 16}" fill="#e6e6ee" ${st(12)}/>`).join('')}`],
'2027-04-07': ['Rooster', `
  <path d="M640 520 C760 360 900 320 920 400 C860 420 840 460 900 470 C940 520 880 580 820 560 C860 620 820 680 740 640Z" fill="#2e7de0" ${st()}/>
  <path d="M700 560 C800 480 880 500 880 540 C820 560 770 600 720 620Z" fill="#3cb75a" ${st(16)}/>
  <path d="M380 150 C360 80 410 60 430 100 C440 40 510 40 510 110 C540 60 600 80 580 150 C610 130 640 160 610 200 L400 220Z" fill="#e8302f" ${st()}/>
  <path d="M480 200 C320 200 260 330 280 470 C220 560 260 760 420 820 C560 870 700 820 740 720 C780 600 720 520 640 480 C660 320 610 200 480 200Z" fill="#ff9a2e" ${st()}/>
  <path d="M300 520 C380 480 520 500 600 600 C560 720 420 740 340 680Z" fill="#e8662b" ${st(16)}/>
  ${eyes(460, 340, 60)}
  <path d="M430 400 L510 400 L470 455Z" fill="#ffc12b" ${st(12)}/>
  <path d="M460 455 C440 510 500 520 495 460" fill="#e8302f" ${st(12)}/>
  ${cheeks(460, 420, 120)}
  <path d="M440 820 L420 920 M580 820 L600 920" stroke="#ffc12b" stroke-width="30" stroke-linecap="round"/>`],
'2027-04-08': ['Puppy', `
  <path d="M230 270 C120 280 100 520 180 560 C250 590 290 460 300 360Z M770 270 C880 280 900 520 820 560 C750 590 710 460 700 360Z" fill="#8a5a33" ${st()}/>
  <path d="M500 220 C320 220 250 340 260 480 C270 640 380 760 500 760 C620 760 730 640 740 480 C750 340 680 220 500 220Z" fill="#f2c79a" ${st()}/>
  <path d="M560 260 C640 260 690 330 680 420 C620 430 570 390 560 260Z" fill="#c98446"/>
  ${eyes(500, 450, 100)}
  <ellipse cx="500" cy="560" rx="60" ry="40" fill="${O}"/>
  <path d="M440 610 Q470 650 500 610 Q530 650 560 610" fill="none" ${st(16)}/>
  <path d="M480 640 C480 700 520 700 520 640" fill="#ff8fa3" ${st(12)}/>
  ${cheeks(500, 560, 170)}
  <path d="M340 760 C380 820 620 820 660 760 L640 840 C580 880 420 880 360 840Z" fill="#e8302f" ${st()}/>
  <circle cx="500" cy="850" r="40" fill="#ffc12b" ${st(16)}/>`],
'2027-04-09': ['Kitten', `
  <path d="M760 760 C900 760 940 620 860 560" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/><path d="M760 760 C900 760 940 620 860 560" fill="none" stroke="#ffb05a" stroke-width="50" stroke-linecap="round"/>
  <path d="M300 640 C260 760 300 860 500 870 C700 860 740 760 700 640Z" fill="#ffb05a" ${st()}/>
  <path d="M230 160 L380 270 L250 360Z M770 160 L620 270 L750 360Z" fill="#ffb05a" ${st()}/>
  <path d="M260 210 L340 270 L270 320Z M740 210 L660 270 L730 320Z" fill="#ffb3c7"/>
  <ellipse cx="500" cy="450" rx="270" ry="230" fill="#ffbd70" ${st()}/>
  <path d="M440 240 L450 300 M500 230 L500 300 M560 240 L550 300" stroke="#e08a2e" stroke-width="18" stroke-linecap="round"/>
  ${eyes(500, 450, 100)}
  <path d="M480 510 L520 510 L500 535Z" fill="#ff8fa3" ${st(10)}/>
  <path d="M460 555 Q480 580 500 555 Q520 580 540 555" fill="none" ${st(14)}/>
  <path d="M290 500 L180 480 M290 540 L180 560 M710 500 L820 480 M710 540 L820 560" ${st(10)}/>
  ${cheeks(500, 530, 160)}
  ${dots([[160, 820]], '#7a9cff', 60, 16)}<path d="M110 820 L210 820 M160 770 L160 870" stroke="#4a6ce0" stroke-width="10"/>`],
'2027-04-10': ['Mouse with cheese', `
  <path d="M120 900 L120 680 L560 560 L560 780Z" fill="#ffd23f" ${st()}/><path d="M120 680 L560 560 L780 640 L340 760Z" fill="#ffe066" ${st()}/><path d="M560 780 L560 560 L780 640 L780 860Z" fill="#ffc12b" ${st()}/>
  ${dots([[220, 780], [380, 820], [460, 680], [660, 720]], '#e8a512', 26, 12)}
  <circle cx="400" cy="260" r="110" fill="#c0c4d4" ${st()}/><circle cx="700" cy="260" r="110" fill="#c0c4d4" ${st()}/>
  <circle cx="400" cy="260" r="64" fill="#ffb3c7"/><circle cx="700" cy="260" r="64" fill="#ffb3c7"/>
  <path d="M550 290 C400 290 360 400 380 480 C400 560 470 610 550 610 C630 610 700 560 720 480 C740 400 700 290 550 290Z" fill="#d4d8e4" ${st()}/>
  ${eyes(550, 440, 70)}
  <circle cx="550" cy="520" r="24" fill="#ff8fa3" ${st(10)}/>
  ${smile(550, 555, 30, 0.8)}
  <path d="M430 510 L340 490 M430 540 L340 560 M670 510 L760 490 M670 540 L760 560" ${st(10)}/>`],
'2027-04-11': ['Scarecrow', `
  <path d="M500 520 L500 920" stroke="${O}" stroke-width="64" stroke-linecap="round"/><path d="M500 520 L500 920" stroke="#a8703c" stroke-width="36" stroke-linecap="round"/>
  <path d="M120 560 L880 560" stroke="${O}" stroke-width="64" stroke-linecap="round"/><path d="M120 560 L880 560" stroke="#a8703c" stroke-width="36" stroke-linecap="round"/>
  <path d="M330 500 L670 500 L700 800 L300 800Z" fill="#4a8fe0" ${st()}/>
  <path d="M330 500 L500 500 L500 800 L300 800Z" fill="#e8402e" ${st()}/>
  <path d="M160 580 L120 640 M180 580 L170 650 M840 580 L880 640 M820 580 L830 650 M340 800 L320 860 M660 800 L680 860" stroke="#ffd23f" stroke-width="20" stroke-linecap="round"/>
  <circle cx="500" cy="370" r="150" fill="#f2d2a6" ${st()}/>
  <path d="M280 260 C320 260 680 260 720 260 L620 120 C600 90 400 90 380 120Z" fill="#c98446" ${st()}/>
  <rect x="380" y="230" width="240" height="40" fill="#e8402e" ${st(14)}/>
  ${face(500, 370, 0.6)}
  <path d="M800 220 C840 180 900 190 920 220 M820 280 C860 250 900 260 920 280" fill="none" ${st(16)}/>`],
'2027-04-12': ['Milk bottle', `
  <path d="M380 140 L620 140 L620 260 C720 330 760 400 760 500 L760 820 C760 880 720 910 660 910 L340 910 C280 910 240 880 240 820 L240 500 C240 400 280 330 380 260Z" fill="#f4fbff" ${st()}/>
  <rect x="360" y="100" width="280" height="80" rx="20" fill="#4a8fe0" ${st()}/>
  <path d="M240 560 L760 560 L760 780 L240 780Z" fill="#4a8fe0" ${st()}/>
  ${face(500, 640, 0.65)}
  <path d="M300 400 C300 360 330 320 360 310" fill="none" stroke="#d6ecff" stroke-width="40" stroke-linecap="round"/>
  ${[[300, 840], [420, 860], [580, 860], [700, 840]].map(([x, y]) => `<path d="M${x - 30} ${y} C${x - 30} ${y - 30} ${x + 30} ${y - 30} ${x + 30} ${y}" fill="none" stroke="#c9d8e8" stroke-width="10"/>`).join('')}
  ${heart(160, 260, 0.28, '#ff8fa3')}${sparkle(860, 300, 44)}`],
'2027-04-13': ['Frog', `
  <path d="M120 860 C300 820 700 820 880 860 C700 920 300 920 120 860Z" fill="#6ec6ff" ${st(16)}/>
  <ellipse cx="500" cy="680" rx="300" ry="190" fill="#5cc45c" ${st()}/>
  <ellipse cx="500" cy="740" rx="180" ry="110" fill="#c9f2a8"/>
  <circle cx="330" cy="300" r="110" fill="#5cc45c" ${st()}/><circle cx="670" cy="300" r="110" fill="#5cc45c" ${st()}/>
  <path d="M220 500 C220 340 340 300 500 300 C660 300 780 340 780 500 C780 600 660 640 500 640 C340 640 220 600 220 500Z" fill="#5cc45c"/>
  <path d="M232 420 C250 360 300 330 360 330 M640 330 C700 330 750 360 768 420" fill="none" stroke="${O}" stroke-width="22"/>
  <circle cx="330" cy="300" r="70" fill="#fff" ${st(14)}/><circle cx="670" cy="300" r="70" fill="#fff" ${st(14)}/>
  <circle cx="340" cy="310" r="36" fill="${O}"/><circle cx="660" cy="310" r="36" fill="${O}"/>
  <path d="M360 500 Q500 600 640 500" fill="none" ${st(22)}/>
  ${cheeks(500, 470, 230)}
  <path d="M260 800 C200 850 180 880 220 900 M740 800 C800 850 820 880 780 900" fill="none" ${st(30)}/>
  ${flower(850, 760, 40, '#ffb3d1')}`],
'2027-04-14': ['Corn', `
  ${leaf(500, 860, -110, 2.1, '#5cc45c')}${leaf(500, 860, -70, 2.1, '#5cc45c')}
  <path d="M500 120 C640 120 680 300 670 500 C660 700 600 820 500 820 C400 820 340 700 330 500 C320 300 360 120 500 120Z" fill="#ffd23f" ${st()}/>
  ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 4 }, (_, c) => `<ellipse cx="${395 + c * 70}" cy="${220 + r * 95}" rx="26" ry="34" fill="#ffe680" stroke="#e8a512" stroke-width="10"/>`).join('')).join('')}
  <path d="M300 860 C300 640 380 600 440 700 C460 760 470 820 500 860 C530 820 540 760 560 700 C620 600 700 640 700 860Z" fill="#7bd66b" ${st()}/>
  ${face(500, 430, 0.7)}`],
'2027-04-15': ['Ladybug', `
  ${antenna(440, 300, 340, 170, -40)}${antenna(560, 300, 660, 170, 40)}
  <circle cx="500" cy="360" r="140" fill="#3b3b4a" ${st()}/>
  <path d="M500 330 C260 330 160 480 170 620 C180 780 330 880 500 880 C670 880 820 780 830 620 C840 480 740 330 500 330Z" fill="#ef3b3b" ${st()}/>
  <path d="M500 340 L500 880" ${st(20)}/>
  ${dots([[330, 520], [670, 520], [300, 700], [700, 700], [420, 800], [580, 800]], '#3b3b4a', 44, 0)}
  <ellipse cx="450" cy="340" rx="20" ry="26" fill="#fff"/><ellipse cx="550" cy="340" rx="20" ry="26" fill="#fff"/>
  <path d="M470 390 Q500 410 530 390" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
  ${flower(140, 200, 40, '#ffb3d1')}${flower(860, 840, 40, '#b8e0ff')}`],
'2027-04-16': ['Bee', `
  ${wing(380, 320, 140, 100, -30)}${wing(620, 320, 140, 100, 30)}
  <path d="M800 560 L920 560 L800 610Z" fill="#3b3b4a" ${st(14)}/>
  <ellipse cx="520" cy="560" rx="300" ry="230" fill="#ffd23f" ${st()}/>
  <defs><clipPath id="b16"><ellipse cx="520" cy="560" rx="300" ry="230"/></clipPath></defs>
  <g clip-path="url(#b16)">${[540, 680].map((x) => `<rect x="${x}" y="300" width="70" height="520" fill="#3b3b4a"/>`).join('')}</g>
  <ellipse cx="520" cy="560" rx="300" ry="230" fill="none" ${st()}/>
  ${antenna(320, 380, 250, 230, -30)}${antenna(400, 360, 420, 210, 20)}
  ${face(360, 540, 0.65)}
  <path d="M120 820 C200 760 260 840 340 780" fill="none" stroke="#c9b8a8" stroke-width="12" stroke-dasharray="20 24" stroke-linecap="round"/>`],
'2027-04-17': ['Butterfly', `
  <path d="M480 470 C380 200 140 120 130 300 C120 440 300 500 480 490Z M520 470 C620 200 860 120 870 300 C880 440 700 500 520 490Z" fill="#7a9cff" ${st()}/>
  <path d="M480 520 C300 520 180 620 220 740 C260 840 420 780 480 560Z M520 520 C700 520 820 620 780 740 C740 840 580 780 520 560Z" fill="#ff8fc0" ${st()}/>
  ${dots([[260, 300], [740, 300], [320, 680], [680, 680]], '#fff', 44, 14)}
  ${dots([[360, 400], [640, 400]], '#ffd23f', 26, 12)}
  <path d="M500 330 C560 330 560 760 500 780 C440 760 440 330 500 330Z" fill="#5e3a8a" ${st()}/>
  ${antenna(480, 330, 400, 170, -30)}${antenna(520, 330, 600, 170, 30)}
  <circle cx="500" cy="320" r="70" fill="#5e3a8a" ${st()}/>
  <ellipse cx="475" cy="315" rx="12" ry="16" fill="#fff"/><ellipse cx="525" cy="315" rx="12" ry="16" fill="#fff"/>
  <path d="M480 345 Q500 360 520 345" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`],
'2027-04-18': ['Caterpillar', `
  <path d="M90 800 C250 700 750 700 920 800 C750 900 250 900 90 800Z" fill="#8bd96b" ${st()}/><path d="M120 800 L880 800" fill="none" ${st(12)}/>
  ${[[260, 640, '#5cc45c'], [380, 600, '#7bd66b'], [500, 620, '#5cc45c'], [620, 600, '#7bd66b']].map(([x, y, c]) => `<path d="M${x - 20} ${y + 90} L${x - 30} ${y + 150} M${x + 20} ${y + 90} L${x + 30} ${y + 150}" ${st(16)}/><circle cx="${x}" cy="${y}" r="100" fill="${c}" ${st()}/>`).join('')}
  ${antenna(720, 430, 660, 260, -30)}${antenna(770, 430, 830, 260, 30)}
  <circle cx="750" cy="520" r="130" fill="#ffd23f" ${st()}/>
  ${face(750, 510, 0.6)}
  ${dots([[380, 570], [620, 570]], '#ffd23f', 20, 0)}`],
'2027-04-19': ['Dragonfly', `
  ${wing(330, 330, 230, 70, 20)}${wing(670, 330, 230, 70, -20)}${wing(330, 480, 210, 60, -15)}${wing(670, 480, 210, 60, 15)}
  <path d="M500 400 C560 400 540 900 500 920 C460 900 440 400 500 400Z" fill="#3cc8c8" ${st()}/>
  ${[520, 600, 680, 760, 840].map((y) => `<path d="M470 ${y} L530 ${y}" stroke="#239a9a" stroke-width="12"/>`).join('')}
  <ellipse cx="500" cy="380" rx="70" ry="90" fill="#3cc8c8" ${st()}/>
  <circle cx="500" cy="230" r="110" fill="#3cc8c8" ${st()}/>
  <circle cx="440" cy="200" r="46" fill="#fff" ${st(14)}/><circle cx="560" cy="200" r="46" fill="#fff" ${st(14)}/>
  <circle cx="445" cy="208" r="22" fill="${O}"/><circle cx="555" cy="208" r="22" fill="${O}"/>
  ${smile(500, 270, 30, 0.8)}${cheeks(500, 270, 75, 0.7)}`],
'2027-04-20': ['Beehive', `
  <path d="M500 60 L500 160" ${st(20)}/>
  <path d="M500 150 C380 150 340 200 340 240 L660 240 C660 200 620 150 500 150Z" fill="#ffc12b" ${st()}/>
  <path d="M340 240 C260 260 240 310 260 340 L740 340 C760 310 740 260 660 240Z" fill="#ffd23f" ${st()}/>
  <path d="M260 340 C180 370 170 430 200 460 L800 460 C830 430 820 370 740 340Z" fill="#ffc12b" ${st()}/>
  <path d="M200 460 C140 500 140 560 180 590 L820 590 C860 560 860 500 800 460Z" fill="#ffd23f" ${st()}/>
  <path d="M180 590 C150 640 170 700 220 720 L780 720 C830 700 850 640 820 590Z" fill="#ffc12b" ${st()}/>
  <path d="M220 720 C210 770 250 820 320 830 L680 830 C750 820 790 770 780 720Z" fill="#ffd23f" ${st()}/>
  <path d="M430 830 C430 720 570 720 570 830Z" fill="#5e3a1d" ${st()}/>
  ${face(500, 500, 0.75)}
  ${[[820, 220], [150, 260]].map(([x, y]) => `${wing(x - 20, y - 40, 40, 28, -30)}${wing(x + 20, y - 40, 40, 28, 30)}<ellipse cx="${x}" cy="${y}" rx="56" ry="40" fill="#ffd23f" ${st(14)}/><path d="M${x - 10} ${y - 38} L${x - 10} ${y + 38} M${x + 18} ${y - 34} L${x + 18} ${y + 34}" stroke="#3b3b4a" stroke-width="14"/>`).join('')}`],
'2027-04-21': ['Watering can', `
  <path d="M700 460 L880 300" stroke="${O}" stroke-width="80" stroke-linecap="round"/><path d="M700 460 L880 300" stroke="#4fb3e8" stroke-width="50" stroke-linecap="round"/>
  <path d="M850 250 L930 330 L960 290 L890 220Z" fill="#4fb3e8" ${st()}/>
  ${[[920, 420], [960, 500], [890, 520]].map(([x, y]) => `<path d="M${x} ${y - 30} C${x + 24} ${y} ${x + 18} ${y + 24} ${x} ${y + 24} C${x - 18} ${y + 24} ${x - 24} ${y} ${x} ${y - 30}Z" fill="#9be7ff" ${st(10)}/>`).join('')}
  <path d="M300 340 C300 180 640 180 640 340" fill="none" stroke="${O}" stroke-width="70"/><path d="M300 340 C300 180 640 180 640 340" fill="none" stroke="#4fb3e8" stroke-width="40"/>
  <path d="M200 380 L740 380 L700 860 L240 860Z" fill="#5ec4f2" ${st()}/>
  <rect x="180" y="350" width="580" height="70" rx="30" fill="#4fb3e8" ${st()}/>
  ${face(470, 620, 0.85)}
  ${flower(150, 800, 50, '#ffb3d1')}`],
'2027-04-22': ['Beetle', `
  ${[[300, 520, 180, 470], [300, 640, 170, 660], [300, 760, 190, 840], [700, 520, 820, 470], [700, 640, 830, 660], [700, 760, 810, 840]].map(([a, b, c, d]) => `<path d="M${a} ${b} L${c} ${d}" ${st(22)}/>`).join('')}
  ${antenna(450, 260, 360, 120, -40)}${antenna(550, 260, 640, 120, 40)}
  <ellipse cx="500" cy="330" rx="150" ry="110" fill="#2b2b38" ${st()}/>
  <path d="M500 400 C300 400 250 560 260 680 C270 820 380 900 500 900 C620 900 730 820 740 680 C750 560 700 400 500 400Z" fill="#3ccf8a" ${st()}/>
  <path d="M500 410 L500 900" ${st(18)}/>
  <path d="M340 520 C360 480 400 460 440 460" fill="none" stroke="#9ff0c8" stroke-width="30" stroke-linecap="round"/>
  <ellipse cx="450" cy="320" rx="20" ry="26" fill="#fff"/><ellipse cx="550" cy="320" rx="20" ry="26" fill="#fff"/>
  <path d="M470 370 Q500 390 530 370" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>`],
'2027-04-23': ['Ant', `
  ${[[470, 560, 380, 720], [520, 560, 520, 760], [570, 560, 660, 720]].map(([a, b, c, d]) => `<path d="M${a} ${b} Q${(a + c) / 2} ${b + 40} ${c} ${d} L${c + (c > a ? 40 : -40)} ${d}" fill="none" ${st(22)}/>`).join('')}
  <ellipse cx="760" cy="560" rx="160" ry="130" fill="#c8402e" ${st()}/>
  <ellipse cx="520" cy="540" rx="100" ry="80" fill="#c8402e" ${st()}/>
  ${antenna(250, 350, 160, 200, -30)}${antenna(320, 340, 370, 180, 20)}
  <circle cx="300" cy="460" r="150" fill="#d9503c" ${st()}/>
  ${face(290, 450, 0.6)}
  <path d="M90 880 C300 840 700 840 920 880" fill="none" stroke="#5aa845" stroke-width="36" stroke-linecap="round"/>
  <path d="M640 380 L700 220 L860 200 L820 360Z" fill="#7bd66b" ${st(16)}/>`],
'2027-04-24': ['Flower pot', `
  <path d="M500 640 L500 360" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M500 640 L500 360" stroke="#3cb75a" stroke-width="30" stroke-linecap="round"/>
  ${leaf(500, 560, -150, 0.9)}${leaf(500, 520, -30, 0.9)}
  ${flower(500, 270, 100, '#ff8fc0')}
  ${face(500, 255, 0.45)}
  <path d="M260 620 L740 620 L680 920 L320 920Z" fill="#e8784a" ${st()}/>
  <rect x="230" y="590" width="540" height="90" rx="30" fill="#f2905e" ${st()}/>
  ${heart(500, 790, 0.4, '#ffd0e0')}`],
'2027-04-25': ['Poppy', `
  <path d="M500 560 C520 700 480 820 510 940" fill="none" stroke="${O}" stroke-width="56" stroke-linecap="round"/><path d="M500 560 C520 700 480 820 510 940" fill="none" stroke="#3a8a46" stroke-width="30" stroke-linecap="round"/>
  ${leaf(505, 800, -160, 0.9, '#3a8a46')}
  ${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a} 500 440)"><path d="M500 440 C380 420 300 300 360 220 C410 160 480 170 500 220 C520 170 590 160 640 220 C700 300 620 420 500 440Z" fill="#d9262e" ${st()}/></g>`).join('')}
  <circle cx="500" cy="440" r="110" fill="#1d1d2b" ${st()}/>
  ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M500 440 L${500 + 80 * Math.cos(a * Math.PI / 180)} ${440 + 80 * Math.sin(a * Math.PI / 180)}" stroke="#3b3b4a" stroke-width="12" stroke-linecap="round"/>`).join('')}
  <circle cx="500" cy="440" r="36" fill="#3a8a46" ${st(10)}/>`],
'2027-04-26': ['Rocket', `
  <path d="M420 760 C400 860 460 920 500 960 C540 920 600 860 580 760Z" fill="#ff9a2e" ${st()}/><path d="M460 770 C455 840 480 880 500 900 C520 880 545 840 540 770Z" fill="#ffe066"/>
  <path d="M340 600 L200 780 L360 760Z M660 600 L800 780 L640 760Z" fill="#e8402e" ${st()}/>
  <path d="M500 80 C640 180 680 380 660 560 L640 780 L360 780 L340 560 C320 380 360 180 500 80Z" fill="#f4f4fa" ${st()}/>
  <path d="M500 80 C580 140 620 220 640 280 L360 280 C380 220 420 140 500 80Z" fill="#e8402e" ${st()}/>
  <circle cx="500" cy="440" r="100" fill="#9be7ff" ${st()}/>
  ${face(500, 430, 0.5)}
  ${star(170, 220, 50)}${star(840, 330, 40)}${star(180, 520, 30)}${sparkle(820, 120, 40)}`],
'2027-04-27': ['Ringed planet', `
  <path d="M110 600 C80 500 900 340 900 420" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/>
  <path d="M110 600 C80 500 900 340 900 420" fill="none" stroke="#ffd23f" stroke-width="50" stroke-linecap="round"/>
  <circle cx="500" cy="500" r="270" fill="#b07aff" ${st()}/>
  <path d="M250 420 C350 380 650 380 750 420 M240 560 C380 600 620 600 760 560" fill="none" stroke="#9a5ef0" stroke-width="40" stroke-linecap="round"/>
  <path d="M110 600 C150 680 900 520 900 420" fill="none" stroke="${O}" stroke-width="80" stroke-linecap="round"/>
  <path d="M110 600 C150 680 900 520 900 420" fill="none" stroke="#ffd23f" stroke-width="50" stroke-linecap="round"/>
  ${face(500, 470, 0.85)}
  ${star(170, 180, 50)}${star(840, 820, 46, '#9be7ff')}${star(800, 160, 30)}${sparkle(200, 820, 40)}`],
'2027-04-28': ['Moon and stars', `
  <path d="M640 140 C420 120 220 300 220 520 C220 740 420 900 640 880 C470 820 380 680 380 510 C380 340 470 200 640 140Z" fill="#ffe066" ${st()}/>
  ${dots([[330, 300], [480, 780]], '#f2c94c', 26, 0)}
  ${eyes(310, 470, 0, 0.8)}<ellipse cx="400" cy="460" rx="20" ry="26" fill="${O}"/>
  <path d="M300 560 Q340 600 380 560" fill="none" ${st(16)}/>
  <ellipse cx="270" cy="530" rx="26" ry="16" fill="#ff8fa3"/>
  ${star(690, 360, 80)}${star(800, 620, 60, '#9be7ff')}${star(640, 720, 40, '#ffb3d1')}${sparkle(820, 200, 46)}
`],
'2027-04-29': ['Alien friend', `
  ${antenna(420, 260, 330, 110, -30)}${antenna(580, 260, 670, 110, 30)}
  <circle cx="330" cy="110" r="30" fill="#ffd23f" ${st(12)}/><circle cx="670" cy="110" r="30" fill="#ffd23f" ${st(12)}/>
  <path d="M330 640 C280 760 300 880 500 890 C700 880 720 760 670 640Z" fill="#7bd66b" ${st()}/>
  <path d="M300 680 L200 600 M700 680 L800 600" fill="none" stroke="${O}" stroke-width="60" stroke-linecap="round"/><path d="M300 680 L200 600 M700 680 L800 600" fill="none" stroke="#7bd66b" stroke-width="34" stroke-linecap="round"/>
  <ellipse cx="500" cy="440" rx="290" ry="230" fill="#8be07b" ${st()}/>
  <circle cx="500" cy="400" r="100" fill="#fff" ${st()}/><circle cx="510" cy="410" r="52" fill="${O}"/><circle cx="530" cy="390" r="18" fill="#fff"/>
  ${smile(500, 560, 60)}${cheeks(500, 540, 170)}
  ${star(150, 300, 44)}${star(860, 360, 40, '#ffb3d1')}`],
'2027-04-30': ['UFO', `
  <path d="M380 680 L260 940 L740 940 L620 680Z" fill="#fff6a8" opacity="0.8"/>
  <path d="M320 420 C320 240 680 240 680 420Z" fill="#bfefff" ${st()}/>
  <ellipse cx="500" cy="400" rx="120" ry="110" fill="#8be07b" ${st()}/>
  ${eyes(500, 390, 45, 0.8)}${smile(500, 430, 26, 0.8)}
  <ellipse cx="500" cy="550" rx="400" ry="140" fill="#b4bccd" ${st()}/>
  <path d="M100 540 C300 600 700 600 900 540" fill="none" stroke="#8a93a8" stroke-width="20"/>
  <path d="M320 430 C420 460 580 460 680 430" fill="none" ${st()}/>
  ${[220, 360, 500, 640, 780].map((x, i) => `<circle cx="${x}" cy="${i % 4 ? 610 : 590}" r="30" fill="${['#ff5a7a', '#ffd23f', '#5cd65c', '#4fa8ff', '#ff9a2e'][i]}" ${st(12)}/>`).join('')}
  <ellipse cx="500" cy="680" rx="160" ry="40" fill="#8a93a8" ${st()}/>
  ${star(140, 200, 44)}${star(860, 180, 36, '#ffb3d1')}`],
};
module.exports = ART;
