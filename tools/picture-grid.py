#!/usr/bin/env python3
"""
Turns a picture into a small grid of colours, for a picture level.

  python3 tools/picture-grid.py picture.png out.json [--size 40] [--colors "black=#000000,white=#f5f5f5,..."]
                                [--preview preview.png] [--background "#14365c"]

Each square of the grid takes the colour covering most of its part of the
picture (thin outlines and small details get extra weight so they survive
shrinking). Pixels of the picture's plain background that touch its border
become the "background" colour (the game's dark sea). Patches of fewer than
3 squares are merged into a neighbouring colour, since every eel needs at
least 3 squares.

The palette is given as name=#hex pairs: every pixel takes the nearest one.
Weights for small details: name=#hex*1.8 gives that colour 1.8x weight. A name
given more than once (red=#d83a33,red=#92201c) maps both shades to one colour.

Output JSON: { size, palette: [{ name, hex }], grid: [[colour index per square]] }
(colour 0 is the background).
"""
import json
import sys
from collections import Counter, deque

from PIL import Image


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def main():
    args = sys.argv[1:]
    src, out = args[0], args[1]
    opt = {k.lstrip('-'): v for k, v in zip(args[2::2], args[3::2])}
    size = int(opt.get('size', 40))
    background = opt.get('background', '#14365c')
    pal = [('background', background, 1.0)]
    for part in opt['colors'].split(','):
        name, rest = part.split('=')
        hx, _, w = rest.partition('*')
        pal.append((name.strip(), hx.strip(), float(w or 1)))
    refs = [hex_rgb(p[1]) for p in pal]
    # A name given more than once (e.g. red=#d83a33,red=#92201c for its shading) is one colour.
    first = {}
    alias = []
    for i, p in enumerate(pal):
        alias.append(first.setdefault(p[0], i))

    im = Image.open(src).convert('RGBA')
    flat = Image.new('RGBA', im.size, (255, 255, 255, 255))
    flat.alpha_composite(im)
    im = flat.convert('RGB')
    W, H = im.size
    px = im.load()

    # Nearest palette colour for every pixel (1..n; background is decided next).
    def nearest(rgb):
        best, bi = None, 1
        for i in range(1, len(refs)):
            r = refs[i]
            d = (rgb[0] - r[0]) ** 2 + (rgb[1] - r[1]) ** 2 + (rgb[2] - r[2]) ** 2
            if best is None or d < best:
                best, bi = d, i
        return bi

    cache = {}
    cls = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            rgb = px[x, y]
            k = (rgb[0] >> 2, rgb[1] >> 2, rgb[2] >> 2)
            if k not in cache:
                cache[k] = alias[nearest(rgb)]
            cls[y][x] = cache[k]

    # The picture's own background: near-white pixels connected to its border.
    def plain(rgb):
        return min(rgb) > 232

    seen = [[False] * W for _ in range(H)]
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if plain(px[x, y]) and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if plain(px[x, y]) and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        cls[y][x] = 0
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and plain(px[nx, ny]):
                seen[ny][nx] = True
                q.append((nx, ny))

    # Shrink: each square takes its (weighted) most common colour.
    grid = [[0] * size for _ in range(size)]
    for gy in range(size):
        for gx in range(size):
            x0, x1 = gx * W // size, (gx + 1) * W // size
            y0, y1 = gy * H // size, (gy + 1) * H // size
            c = Counter()
            for y in range(y0, y1):
                row = cls[y]
                for x in range(x0, x1):
                    c[row[x]] += 1
            grid[gy][gx] = max(c, key=lambda i: c[i] * pal[i][2])

    # Merge patches of fewer than 3 squares into their most common neighbouring colour.
    def patches():
        seen = [[False] * size for _ in range(size)]
        res = []
        for y in range(size):
            for x in range(size):
                if seen[y][x]:
                    continue
                col = grid[y][x]
                cells, q = [], deque([(x, y)])
                seen[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    cells.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < size and 0 <= ny < size and not seen[ny][nx] and grid[ny][nx] == col:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                res.append(cells)
        return res

    for _ in range(10):
        small = [p for p in patches() if len(p) < 3]
        if not small:
            break
        for cells in small:
            col = grid[cells[0][1]][cells[0][0]]
            around = Counter()
            for cx, cy in cells:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < size and 0 <= ny < size and grid[ny][nx] != col:
                        around[grid[ny][nx]] += 1
            if around:
                new = around.most_common(1)[0][0]
                for cx, cy in cells:
                    grid[cy][cx] = new

    # Drop the alias entries: renumber colours to the distinct names.
    keep = sorted(set(alias))
    renum = {old: new for new, old in enumerate(keep)}
    grid = [[renum[c] for c in row] for row in grid]
    pal = [pal[i] for i in keep]
    used = sorted({c for row in grid for c in row})
    data = {'size': size, 'palette': [{'name': p[0], 'hex': p[1]} for p in pal], 'grid': grid}
    json.dump(data, open(out, 'w'))
    print(f'{size}x{size}, {len(used)} colours used:', ', '.join(f'{pal[i][0]} ({sum(r.count(i) for r in grid)})' for i in used))

    if 'preview' in opt:
        scale = 16
        img = Image.new('RGB', (size * scale, size * scale))
        for y in range(size):
            for x in range(size):
                img.paste(hex_rgb(pal[grid[y][x]][1]), (x * scale, y * scale, (x + 1) * scale, (y + 1) * scale))
        img.save(opt['preview'])


if __name__ == '__main__':
    main()
