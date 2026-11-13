#!/usr/bin/env python3
"""
Draws a daily puzzle as two pictures, for the picture calendar page:

  python3 tools/render-level.py levels-daily/pictures/2026-11-15.json 3 puzzle.png reward.png

- puzzle.png: the board as the player first sees it, every eel in place
  (see-through parts paler, heads marked).
- reward.png: what the player sees once it's solved: each eel's squares
  filled in its colour on the sea (the game's picture reveal).

Arguments: the day's rows (from tools/daily-picture.js), which difficulty
(0-3), and the two output files.
"""
import json
import subprocess
import sys

from PIL import Image, ImageDraw

SEA = '#14365c'
BOARD = '#0a1d31'


def decode(level):
    js = ("require('./rules.js');const L=ArrowRules.decodeLevel(process.argv[1]);"
          "console.log(JSON.stringify({size:L.size,lines:L.lines.map(l=>({cells:l.cells,dir:l.dir,clear:l.clear||[],color:l.color}))}))")
    out = subprocess.run(['node', '-e', js, level], capture_output=True, text=True, check=True,
                         cwd=__file__.rsplit('/tools/', 1)[0])
    return json.loads(out.stdout)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def main():
    rows_file, diff, puzzle_out, reward_out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    row = next(r for r in json.load(open(rows_file)) if r['difficulty'] == diff)
    L = decode(row['level'])
    n = L['size']

    # Reward: squares in each eel's colour.
    px = max(4, 480 // n)
    img = Image.new('RGB', (n * px, n * px), SEA)
    d = ImageDraw.Draw(img)
    for line in L['lines']:
        c = rgb(line['color'] or '#9fd8ff')
        for x, y in line['cells']:
            d.rectangle([x * px, y * px, (x + 1) * px - 1, (y + 1) * px - 1], fill=c)
    img.save(reward_out)

    # Puzzle: eels drawn as bodies through their squares, heads marked.
    s = max(8, 720 // n)
    img = Image.new('RGB', (n * s, n * s), BOARD)
    d = ImageDraw.Draw(img)
    w = max(2, round(s * 0.56))
    centre = lambda x, y: (x * s + s / 2, y * s + s / 2)
    for line in L['lines']:
        base = rgb(line['color'] or '#9fd8ff')
        if sum(abs(a - b) for a, b in zip(base, rgb(SEA))) < 30:  # sea-coloured eels: a touch lighter, as in the game
            base = mix(base, (255, 255, 255), 0.22)
        cells = line['cells']
        k = len(cells)
        clear = set(line['clear'])  # see-through segments, counted from the tail
        for i in range(k - 1):
            seg_tail_index = k - 1 - i
            col = mix(base, rgb(BOARD), 0.6) if seg_tail_index in clear else base
            d.line([centre(*cells[i]), centre(*cells[i + 1])], fill=col, width=w)
        for i, (x, y) in enumerate(cells):
            col = mix(base, rgb(BOARD), 0.6) if (k - 1 - i) in clear else base
            cx, cy = centre(x, y)
            r = w / 2
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        # Head: a bigger blob with a dark eye, pointing its way.
        hx, hy = centre(*cells[0])
        r = w * 0.62
        d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=base)
        dx, dy = [(0, -1), (1, 0), (0, 1), (-1, 0)][line['dir']]
        ex, ey = hx + dx * r * 0.35, hy + dy * r * 0.35
        er = max(1, r * 0.28)
        d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(10, 20, 30))
    img.save(puzzle_out)


if __name__ == '__main__':
    main()
