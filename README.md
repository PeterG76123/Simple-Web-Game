# Arrow Escape

A puzzle game for the browser. The board is a tangle of lines, each with an arrow at one end. Drag a line the way its arrow points and the rest of it follows the head like a worm. You can stop partway, and a line is cleared once it slides off the board. Double-tap a line to send it straight out; if something is in the way, it bumps into it and springs back.

Solid parts of lines block each other. Some lines have dashed, see-through sections that other lines can pass through. Sometimes you have to slide a line only partway, so its see-through gap lines up and another line can get out. If you slide one too far, drag it back. Lines can go back as far as where they started, but no further. There's also **Undo**.

There are three groups of 25 levels, and each group starts easy and gets harder:

- **Group 1: Solid lines.** Boards grow from 4×4 to 10×10.
- **Group 2: See-through lines.** Five short tutorials, then boards from 6×6 to 10×10 that need more and more partial slides.
- **Group 3: Reflectors.** Triangles that fill half a square. A line that hits the slanted side turns 90° and keeps going, with its body following around the bend. The flat sides block. A mix of solid and see-through levels from 5×5 to 10×10, with 1 to 7 reflectors.

Levels unlock one at a time within a group. Finish 10 levels in a group to unlock the next one.

Stuck? Press **Hint** (or the H key). The game works out the best next move from wherever the lines are now. It makes that line glow and says what to do with it. For a partial slide, it also marks the line's route with dots and a ring where its head should stop. Hints are unlimited, and each level counts how many you use. After each level you see how close you came to the fewest possible moves.

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
- `rules.js`: how lines move, block each other and bounce off reflectors; the solver; the compact level format
- `levels-data.js`: the levels the game plays (generated; don't edit by hand)
- `game.js`: dragging, drawing, undo, hints, groups and menus

## Making levels

Every level fills the whole board: there are no empty squares, and every line is at least 3 squares long.

1. **The generator** (`tools/fullgen.js`) splits the board into long winding paths, which become the lines. With reflectors, it starts by aiming one line at each reflector. Then it picks which end of each line is the arrow, flipping stuck lines until the board can be cleared.
   - **See-through levels:** start from a solvable board, add see-through sections, then flip a few arrows so the lines jam. The level is kept only if the solver proves it can be solved, it needs at least one partial slide, and it can't be solved with the see-through parts made solid.
2. **The level bank** (`levels-bank/`) stores verified levels by kind, board size and number of reflectors, one per line. Grow it with:

   ```sh
   node tools/bank.js --kind=solid --size=8 --count=500
   node tools/bank.js --kind=clear --size=10 --mirrors=4 --count=100
   ```

   It runs on every CPU core, skips duplicates, and each run finds new levels.
3. **The plan** (`tools/level-plan.js`) lists each group's levels as `[size, kind, reflectors]`.
4. **The builder** (`node tools/build-levels.js`) tops up the bank where needed, picks levels for each group from easy to hard, and writes `levels-data.js`.
5. **The checker** (`node tools/check-levels.js`, add `--show` to print boards) re-solves every level and confirms the rules above.
6. **`node tools/stamp-versions.js`** adds version tags to the CSS and JS links in `index.html`, so browsers don't mix a new page with old cached scripts. Run it after changing any of those files.

Levels are stored in a compact text format (about 80–150 characters for a 10×10 board), so thousands of levels stay small.
