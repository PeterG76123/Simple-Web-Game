# Arrow Escape

A puzzle game for the browser. The board is a tangle of lines, each with an arrow at one end. Drag a line the way its arrow points and the rest of it follows the head like a worm. You can stop partway, and a line is cleared once it slides off the board. Double-tap a line to send it straight out; if something is in the way, it bumps into it and springs back.

Solid parts of lines block each other. Some lines have dashed, see-through sections that other lines can pass through. Sometimes you have to slide a line only partway, so its see-through gap lines up and another line can get out. If you slide one too far, drag it back. Lines can go back as far as where they started, but no further. There's also **Undo**.

There are three groups of 25 levels, and each group starts easy and gets harder:

- **Group 1: Solid lines.** Boards grow from 4×4 to 10×10.
- **Group 2: See-through lines.** Five short tutorials, then boards from 6×6 to 10×10 that need more and more partial slides.
- **Group 3: Reflectors.** Triangles that fill half a square. A line that hits the slanted side turns 90° and keeps going, with its body following around the bend. The flat sides block. A mix of solid and see-through levels from 5×5 to 10×10, with 1 to 7 reflectors.

Levels unlock one at a time within a group. Finish 10 levels in a group to unlock the next one. After each level you see how close you came to the fewest possible moves.

## Play

Open `index.html` in a browser. There is no build step and nothing to install.

To serve it locally instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

- `index.html`: front screen, game screen and dialogs
- `style.css`: layout and light/dark themes
- `rules.js`: how lines move, block each other and bounce off reflectors, plus the solver
- `levels-data.js`: all 75 levels (generated; don't edit by hand)
- `game.js`: dragging, drawing, undo, groups and menus
- `tools/build-levels.js`, `tools/generator.js`, `tools/pool-worker.js`: generate `levels-data.js`. Run `node tools/build-levels.js` to rebuild everything (slow), or `--only=3` to rebuild one group and keep the rest.
- `tools/check-levels.js`: re-solves every level to prove it can be done (`node tools/check-levels.js`, add `--show` to print each board)

## How the levels are guaranteed to work

- **Group 1** levels are built so lines can always be slid straight out in reverse order of placement.
- **Group 2** starts with five hand-built tutorials. The generated levels after them are random boards that the solver has proven can be solved. Each one also needs at least one partial slide, and can't be solved if its see-through parts were solid, so the see-through parts always matter.
- **Group 3** solid levels are built the same way as Group 1, with paths that bend around reflectors. Its see-through levels are checked the same way as Group 2. In every level, each reflector is on at least one line's way out.
- The solver searches every combination of partial slides, forward and back. It always takes free lines straight off, which never hurts, and from that it works out the fewest moves for each level.
- Seeds are fixed, so the build always produces the same levels.
