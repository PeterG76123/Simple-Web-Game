# Arrow Escape

A small puzzle game for the browser. The board is a tangle of lines, each with an arrow at one end. Tap a line to send it sliding off the board in the direction of its arrow. It only escapes if the straight path from the arrow to the edge is clear. If another line is in the way, the line bumps into it and you lose one of your 3 lives.

## Play

Open `index.html` in a browser. There is no build step and nothing to install.

To serve it locally instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

It can also be hosted as-is on GitHub Pages (Settings → Pages → deploy from the `main` branch).

## Files

- `index.html`: front screen, game screen and dialogs
- `style.css`: layout and light/dark themes
- `levels.js`: level generator and solver
- `game.js`: game logic, animation and input
- `tools/check-levels.js`: confirms every level is solvable (`node tools/check-levels.js`)

## How the levels are always solvable

Lines are placed one at a time, and a new line is only accepted if the path from its arrow to the edge is empty when it is placed. Removing the lines in the reverse order of placement is therefore always a valid solution. Each level is picked from 60 seeded candidates. The pick favours boards that are well filled, take many steps to clear and have few lines free at the start. Every level is checked with a solver before it is used. Because the seeds are fixed, everyone gets the same 5 levels (5×5 up to 10×10).
