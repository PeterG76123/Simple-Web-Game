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

With no --colors, the colours are picked from the picture (--auto 7: up to
7 colours), and its background is whatever colour runs round its edge.

The picture is trimmed to its subject and made square (--no-trim 1 keeps it
as it is). With picked colours, ones that would vanish into the game's
dark-blue sea are changed: blues become a bright colour the picture doesn't
use, and black or very dark colours are lifted (--no-recolour 1 keeps them).

Small separate marks outside the main picture (watermarks, signatures,
captions) are removed; --keep-marks 1 keeps them.

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


def border_colour(im):
    """The most common colour round the picture's edge (its background)."""
    W, H = im.size
    px = im.load()
    c = Counter()
    for x in range(W):
        for y in (0, H - 1):
            r, g, b = px[x, y][:3]
            c[(r >> 3, g >> 3, b >> 3)] += 1
    for y in range(H):
        for x in (0, W - 1):
            r, g, b = px[x, y][:3]
            c[(r >> 3, g >> 3, b >> 3)] += 1
    k = c.most_common(1)[0][0]
    return tuple((v << 3) + 4 for v in k)


def load_picture(src, trim=True):
    """The picture on white, trimmed to its subject (plus a small margin) and
    padded to a square with its background colour, so the subject fills the
    board and isn't stretched."""
    im = Image.open(src).convert('RGBA')
    flat = Image.new('RGBA', im.size, (255, 255, 255, 255))
    flat.alpha_composite(im)
    im = flat.convert('RGB')
    if not trim:
        return im
    bg = border_colour(im)
    W, H = im.size
    px = im.load()
    far = lambda p: sum((a - b) ** 2 for a, b in zip(p, bg)) >= 40 ** 2
    xs, ys = [], []
    step = max(1, min(W, H) // 400)
    for y in range(0, H, step):
        for x in range(0, W, step):
            if far(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return im
    x0, x1, y0, y1 = min(xs), max(xs) + step, min(ys), max(ys) + step
    side = max(x1 - x0, y1 - y0)
    side += max(2, side // 25) * 2  # margin
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    out = Image.new('RGB', (side, side), bg)
    out.paste(im.crop((x0, y0, x1, y1)), ((side - (x1 - x0)) // 2, (side - (y1 - y0)) // 2))
    return out


SEA = (0x14, 0x36, 0x5c)  # the game's sea, behind every picture


def lum(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def recolour(pal):
    """Colours that would disappear into the dark-blue sea are changed, cartoon
    style: blues (all shades together) move to a bright colour the picture
    doesn't use, keeping their light and dark; black and very dark colours are
    lifted until they show against the sea. Returns the new palette and notes."""
    import colorsys
    hls = [colorsys.rgb_to_hls(*(v / 255 for v in hex_rgb(h))) for _, h, _ in pal]
    is_blue = [i > 0 and 0.5 <= hh <= 0.75 and ss > 0.2 and contrast(hex_rgb(p[1]), SEA) < 4.5 for i, ((hh, ll, ss), p) in enumerate(zip(hls, pal))]
    notes = []
    out = list(pal)
    if any(is_blue):
        used = [hh for (hh, ll, ss), b in zip(hls, is_blue) if not b and ss > 0.2]
        # orange, green, pink, yellow, purple: the one furthest from the picture's own colours
        cands = [(0.07, 'orange'), (0.31, 'green'), (0.93, 'pink'), (0.14, 'yellow'), (0.80, 'purple')]
        dist = lambda h: min([min(abs(h - u), 1 - abs(h - u)) for u in used] or [1])
        hue, name = max(cands, key=lambda c: dist(c[0]))
        for i, b in enumerate(is_blue):
            if not b:
                continue
            hh, ll, ss = hls[i]
            ll = min(0.75, max(0.5, ll + 0.05))
            r, g, bb = colorsys.hls_to_rgb(hue, ll, max(0.8, ss))
            new = '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(bb * 255))
            notes.append(f'{pal[i][0]} {pal[i][1]} -> {new} (blue into {name})')
            out[i] = (pal[i][0], new, pal[i][2])
    for i, (name, hx, w) in enumerate(out):
        rgb = hex_rgb(hx)
        if i == 0 or contrast(rgb, SEA) >= 1.9:
            continue
        hh, ll, ss = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
        if ss < 0.15:  # black and greys: a dark slate with a touch of violet reads as an outline
            hh, ss = 0.72, 0.18
        while ll < 0.95:
            ll += 0.02
            r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
            rgb = (round(r * 255), round(g * 255), round(b * 255))
            if contrast(rgb, SEA) >= 1.9:
                break
        new = '#%02x%02x%02x' % rgb
        notes.append(f'{name} {hx} -> {new} (too dark against the sea)')
        out[i] = (name, new, w)
    return out, notes


def auto_palette(src, n):
    """Up to n colours for the picture's subject (its background left out):
    its most common clearly different colours, as drawn (clip-art is mostly
    flat colours, so these are the real ones, not blends of them). Small ones
    (outlines, eyes, details) get extra weight so they survive shrinking."""
    im = load_picture(src, trim=True).copy()
    im.thumbnail((300, 300))
    bg = border_colour(im)
    data = im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()
    near = lambda a, b, d: sum((x - y) ** 2 for x, y in zip(a, b)) < d * d
    fg = [p for p in data if not near(p, bg, 40)]
    bins = Counter((r >> 3, g >> 3, b >> 3) for r, g, b in fg)
    chosen = []
    for k, cnt in bins.most_common():
        if cnt < len(fg) * 0.006 or len(chosen) >= n:
            break
        rgb = tuple((v << 3) + 4 for v in k)
        if near(rgb, bg, 60) or any(near(rgb, c, 45) for c, _ in chosen):
            continue
        chosen.append((rgb, cnt))
    out = []
    for rgb, cnt in chosen:
        share = cnt / max(1, len(fg))
        out.append((f'c{len(out) + 1}', '#%02x%02x%02x' % rgb, 2.0 if share < 0.08 else 1.0))
    return out


def main():
    args = sys.argv[1:]
    src, out = args[0], args[1]
    opt = {k.lstrip('-'): v for k, v in zip(args[2::2], args[3::2])}
    size = int(opt.get('size', 40))
    background = opt.get('background', '#14365c')
    pal = [('background', background, 1.0)]
    auto = 'colors' not in opt
    if not auto:
        for part in opt['colors'].split(','):
            name, rest = part.split('=')
            hx, _, w = rest.partition('*')
            pal.append((name.strip(), hx.strip(), float(w or 1)))
    else:
        # No colours given: pick them from the picture itself (up to --auto,
        # default 7), leaving out its plain background (see below).
        pal += auto_palette(src, int(opt.get('auto', 7)))
    refs = [hex_rgb(p[1]) for p in pal]
    # A name given more than once (e.g. red=#d83a33,red=#92201c for its shading) is one colour.
    first = {}
    alias = []
    for i, p in enumerate(pal):
        alias.append(first.setdefault(p[0], i))

    im = load_picture(src, trim=opt.get('no-trim') is None)
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

    # Black outlines: thin black lines (outlines, mouths, eyebrows) take the
    # colour beside them, so the picture is drawn in its own colours. Solid
    # black areas (pupils, a black cat) stay. --keep-outlines 1 keeps them all.
    if auto and opt.get('keep-outlines') is None:
        from PIL import ImageFilter
        darkest = [i for i in range(1, len(pal)) if lum(hex_rgb(pal[i][1])) < 0.02]
        if darkest:
            dark = set(darkest)
            mask = Image.new('L', (W, H), 0)
            mpx = mask.load()
            for y in range(H):
                row = cls[y]
                for x in range(W):
                    if row[x] in dark:
                        mpx[x, y] = 255
            k = max(3, (min(W, H) // 40) | 1)
            solid = mask.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k)).load()
            todo = {(x, y) for y in range(H) for x in range(W) if cls[y][x] in dark and solid[x, y] == 0}
            n0 = len(todo)
            # Fill in from the sides, a pixel at a time, from neighbours that aren't outline.
            for _ in range(4 * k):
                if not todo:
                    break
                done = []
                for (x, y) in todo:
                    c = Counter()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in todo:
                            c[cls[ny][nx]] += 1
                    if c:
                        done.append((x, y, c.most_common(1)[0][0]))
                for x, y, v in done:
                    cls[y][x] = v
                    todo.discard((x, y))
            if n0:
                print(f'removed black outlines ({n0 - len(todo)} pixels)')

    # The picture's own background: pixels connected to its border that are
    # near-white (or, with picked colours, near the border's main colour).
    bg_rgb = border_colour(im) if auto else None

    def plain(rgb):
        if bg_rgb is not None:
            return sum((a - b) ** 2 for a, b in zip(rgb, bg_rgb)) < 40 ** 2
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

    # Watermark text and other thin marks on the background: the picture's
    # subject is solid shapes, text is thin strokes. Shapes thinner than about
    # 3% of the picture, standing on their own in the background, go.
    if opt.get('keep-marks') is None:
        from PIL import ImageFilter
        mask = Image.new('L', (W, H), 0)
        mpx = mask.load()
        for y in range(H):
            row = cls[y]
            for x in range(W):
                if row[x] != 0:
                    mpx[x, y] = 255
        k = max(3, (min(W, H) // 30) | 1)
        opened = mask.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))
        # Keep the outlines and details that touch the solid parts.
        near = opened.filter(ImageFilter.MaxFilter(k))
        npx = near.load()
        thin = 0
        for y in range(H):
            row = cls[y]
            for x in range(W):
                if row[x] != 0 and npx[x, y] == 0:
                    row[x] = 0
                    thin += 1
        if thin:
            print(f'removed {thin} pixels of thin marks (watermark text?) on the background')

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

    # Watermarks and stray marks: keep the picture's main subject (its biggest
    # patch of non-background squares), anything inside its outline box, and
    # any other big part; small separate bits outside it (a logo in a corner,
    # a signature, a line of text along the bottom) become background.
    if opt.get('keep-marks') is None:
        seen = [[False] * size for _ in range(size)]
        comps = []
        for y in range(size):
            for x in range(size):
                if seen[y][x] or grid[y][x] == 0:
                    continue
                cells, q = [], deque([(x, y)])
                seen[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    cells.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < size and 0 <= ny < size and not seen[ny][nx] and grid[ny][nx] != 0:
                                seen[ny][nx] = True
                                q.append((nx, ny))
                comps.append(cells)
        if comps:
            main_part = max(comps, key=len)
            xs = [c[0] for c in main_part]; ys = [c[1] for c in main_part]
            box = (min(xs), min(ys), max(xs), max(ys))
            dropped = 0
            for cells in comps:
                if cells is main_part or len(cells) >= 0.1 * len(main_part):
                    continue
                inside = sum(box[0] <= cx <= box[2] and box[1] <= cy <= box[3] for cx, cy in cells)
                if inside * 2 >= len(cells):
                    continue
                # Part of the picture standing apart (a whale's spout, bubbles) is near it;
                # marks to drop are off in the margins: along an edge, or well away.
                edge = max(2, size // 12)
                at_edge = any(cx < edge or cy < edge or cx >= size - edge or cy >= size - edge for cx, cy in cells)
                gap = min(max(abs(cx - mx), abs(cy - my)) for cx, cy in cells for mx, my in main_part[::3])
                if not at_edge and gap <= max(2, size // 10):
                    continue
                for cx, cy in cells:
                    grid[cy][cx] = 0
                dropped += len(cells)
            if dropped:
                print(f'removed {dropped} squares of stray marks (watermarks?) outside the picture')

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
    # Colours that would vanish into the sea are changed (picked colours only;
    # --no-recolour 1 keeps them). Squares were matched to the picture's real
    # colours above; only the colours the eels are drawn in change.
    if auto and opt.get('no-recolour') is None:
        pal, notes = recolour(pal)
        for n in notes:
            print('recoloured', n)
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
