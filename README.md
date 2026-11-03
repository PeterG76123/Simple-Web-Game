# Arrow Escape

A puzzle game for the browser. The board is a tangle of lines, each with an arrow at one end. Drag a line the way its arrow points and the rest of it follows the head like a worm. You can stop partway, and a line is cleared once it slides off the board.

Solid parts of lines block each other. Some lines have dashed, see-through sections that other lines can pass through. Sometimes you have to slide a line only partway, so its see-through gap lines up and another line can get out. If you slide one too far, drag it back. Lines can go back as far as where they started, but no further. There's also **Undo**.

There are 10 levels. Levels 1–5 use solid lines only, and levels 6–10 teach see-through sections. After each level you see how close you came to the fewest possible moves.

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
- `levels.js`: the rules, the level generator, the hand-built levels and the solver
- `game.js`: dragging, drawing, undo and menus
- `tools/check-levels.js`: solves every level to prove it can be done (`node tools/check-levels.js --show` also prints each board)

## How the levels are guaranteed to work

- **Levels 1–5** are generated from fixed seeds. Lines are placed one at a time, and each is only placed where its path out is empty, so removing them in reverse order always works.
- **Levels 6–10** are hand-built. A solver tries every possible sequence of slides, including partial ones and slides back, to confirm each level can be solved and to find the fewest moves. For levels 7–10 it also confirms that sliding lines straight out can't solve the level: you have to use a partial slide.

The game runs the same solver when it loads, and refuses to start if a hand-built level can't be solved.
