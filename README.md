# Eel Escape

A puzzle game for the browser. The board is a tangle of lines, each with an arrow at one end. Drag a line the way its arrow points and the rest of it follows the head like a worm. You can stop partway, and a line is cleared once it slides off the board. Tap a line to send it straight out; if something is in the way, it bumps into it and springs back. Drag a line to move it exactly as far as you want.

Solid parts of lines block each other. Some lines have dashed, see-through sections that other lines can pass through. Sometimes you have to slide a line only partway, so its see-through gap lines up and another line can get out. If you slide one too far, drag it back. Lines can go back as far as where they started, but no further. There's also **Undo**.

There are three difficulty settings, each with five groups:

- **Easy:** 25 levels per group, on boards from 4×4 to 10×10.
- **Medium:** 20 levels per group, on boards from 11×11 to 20×20.
- **Hard:** 20 levels per group, on boards from 21×21 to 30×30.

On big boards, pinch with two fingers to zoom in and move around. There are also zoom buttons beside Hint, and a mouse wheel works on desktop. One finger still taps and drags lines.

The groups are:

- **Group 1, Kelp Shallows: solid lines.** Boards grow from 4×4 to 10×10.
- **Group 2, Jellyfish Bay: see-through lines.** Five short tutorials, then boards from 6×6 to 10×10 that need more and more partial slides.
- **Group 3, Crystal Reef: reflectors.** Triangles that fill half a square. A line that hits the slanted side turns 90° and keeps going, with its body following around the bend. The flat sides block. A mix of solid and see-through levels from 5×5 to 10×10, with 1 to 7 reflectors.
- **Group 4, Whirlpool: turning reflectors.** Tap a reflector to turn it a quarter turn. A reflector can't turn while a line is on it, or while a line that went through it is still on the board. Every level needs at least one turn, and later levels need several.
- **Group 5, Sunken Wreck: gates and plates.** Coloured gates block lines. A gate is open while any line sits on a plate of the same colour, and it can't close on a line inside it. Plates sit under lines, so a line leaving can close a gate, and a line slid partway onto a plate can reopen it. Every level needs its gates.
- **Group 6, Mirror Lagoon: twin eels.** The first 10 levels of each difficulty are twins alone; after that the other mechanics join in. Easy mixes in see-through eels, fixed and turning reflectors, and gates (its last level has all of them); Medium has turning reflectors and gates on its smaller boards and see-through eels or reflectors on the bigger ones; Hard has fixed reflectors. With gates, a twin can hold a gate open or press a plate for its partner as they move. Banded twins share a colour and always slide together, the same number of squares along their own paths; if either is blocked, neither moves. Once one twin has left, the other is an ordinary eel. Each level takes more moves with its twins than without, and the usual way of clearing it no longer works.

Levels unlock one at a time within a group. Finish 10 levels in a group to unlock the next group in that setting. Each group's level buttons have their own colour.

Every level has a difficulty rating from 1.0 to 10.0, shown while you play. Each group is ordered from its easiest level to its hardest.

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
- `style.css`: layout and the Deep Sea look
- `rules.js`: how lines move, block each other and bounce off reflectors; the solver; the compact level format
- `levels-data.js`: the levels the game plays (generated; don't edit by hand)
- `settings.js`: music, sound and sea-creature settings (saved on the device) and the settings screen
- `audio.js`: sound effects and calm generated underwater music, made with the Web Audio API (no sound files)
- `sea-life.js`: the glowing creatures that swim across the background
- `art.js`: pictures shared by the board and the demos (the reef-rock reflectors with their mother-of-pearl faces)
- `intro.js`: each group's welcome popup, a looping demo of its new mechanic (also opened with the ? button)
- `config.js` + `remote-config.json`: the monetisation settings (free hints, ad timing, prices…); the live copy of `remote-config.json` on the web site overrides the defaults without an app update
- `wallet.js`: the player's hints, purchases and ad bookkeeping, saved on the device
- `ads.js`: Google AdMob ads in the phone app; a stand-in test ad on the web
- `aquarium.js`: the aquarium screen: three tanks to buy with pearls and swipe between, fish that swim, school, feed and get startled, plants that sway, things to drag about and sell
- `aquarium-items.js`: the tanks and everything that can go in them (10 fish, 5 plants, 5 decorations per tank; simple outline art for now: each item's picture is its `svg`)
- `shop.js`: the shop, the out-of-hints offer and the starter bundle (purchases are a stand-in for now)
- `fonts/`: the game's fonts (Fredoka, Nunito), bundled so nothing is fetched from Google
- `privacy.html`: the privacy policy the app stores ask for
- `game.js`: dragging, drawing, undo, hints, groups and menus

## Making levels

Every level fills the whole board: there are no empty squares, and every line is at least 3 squares long.

1. **The generator** (`tools/fullgen.js`) splits the board into long winding paths, which become the lines. With reflectors, it starts by aiming one line at each reflector. Then it picks which end of each line is the arrow, flipping stuck lines until the board can be cleared.
   - **Big boards (over 12×12):** instead of flipping, it **peels** the board. It repeatedly finds a line that could leave right now, points its arrow that way, and takes it off. That makes the board solvable by construction. If no line can leave, it cuts a stuck line in two where one piece can leave.
   - **Reflectors and gates on big boards** are **carved** into an already-solved board. Each goes on a square that's on some line's way out and is the tail end of another line, which gets one square shorter. So every piece is used, and every square stays filled.
   - **Turning-reflector levels:** start from a solvable board with every reflector set right, then turn some reflectors away. A level is kept only if the solver proves it can't be solved without turning, and that it needs at least the minimum number of turns.
   - **Gate levels:** aim a line through each gate and make the board solvable as if the gates were open. Then place plates until the solver proves the level can be solved with the real rules, but not with the gates shut.
   - **See-through levels:** start from a solvable board, add see-through sections, then flip a few arrows so the lines jam. The level is kept only if the solver proves it can be solved, it needs at least one partial slide, and it can't be solved with the see-through parts made solid.
2. **The level bank** (`levels-bank/`) stores verified levels by kind, board size and number of reflectors, one per line. Grow it with:

   ```sh
   node tools/bank.js --kind=solid --size=8 --count=500
   node tools/bank.js --kind=clear --size=10 --mirrors=4 --count=100
   ```

   Kinds are listed in `tools/kinds.js` (`solid`, `clear`, `rotate`, `gates`). The bank keeps one worker per CPU core busy across every kind at once, handing out one level at a time, so no core sits idle. It skips duplicates, and each run finds new levels.
3. **The plan** (`tools/level-plan.js`) lists each difficulty setting's size range and each group's levels as `[size, kind, reflectors]`.
4. **The difficulty scale** (`tools/difficulty.js`) scores each level on what makes it hard. In order of weight:
   - partial slides needed
   - how many positions the solver had to search
   - the longest chain of lines that must leave before others
   - how few lines are free at the start
   - the number of lines, board size, and lines that bounce off reflectors

   Scores become ratings from 1.0 to 10.0, scaled separately for each difficulty setting and group.
5. **The builder** (`node tools/build-levels.js`) tops up the bank where needed, picks a spread of levels for each group, rates them, orders each group from easiest to hardest, and writes `levels-data.js`.
6. **The checker** (`node tools/check-levels.js`, add `--show` to print boards) re-solves every level and confirms the rules above.
7. **`node tools/rescore-twins.js`** re-checks every twin level in the bank against the current rules, drops any that no longer qualify (the next build makes new ones) and refreshes the saved solutions.
8. **`node tools/stamp-versions.js`** adds version tags to the CSS and JS links in `index.html`, so browsers don't mix a new page with old cached scripts. Run it after changing any of those files.

Levels are stored in a compact text format (about 80–150 characters for a 10×10 board), so thousands of levels stay small.

## Money: hints, ads and the shop

- **Hints:** 3 free a day (they don't carry over). Watch an ad for 1 more (up to 10 a day), take a once-a-day bonus of 3 for one ad, or buy packs. A hint is only charged when it shows a move, and pressing Hint again before moving is free.
- **Ads between levels:** none for a player's first 10 finished levels; after that at most one every 2 levels and 3 minutes, shown when the player leaves the win screen. "Remove ads" stops these (ads a player chooses to watch stay).
- **Skip a level:** on Hard, when out of hints, watch an ad to skip the level.
- **Shop:** remove ads, three hint packs, and a starter bundle (no ads + 25 hints) that is also offered once after 10 levels. **Buying is a stand-in:** it confirms and gives the item; real purchases need the App Store / Google Play (e.g. RevenueCat or the stores' billing plugins).
- **Pearls and the aquarium:** finishing a level earns pearls (10/20/30 by difficulty, plus bonuses for a first clear and, once per level, a best-possible solve; replaying a finished level pays 2/4/6), a daily gift of 25, 10 for feeding the fish once a day, and pearl packs in the shop. On the win screen a player can watch an ad to double that level's pearls (this counts as the between-levels ad). Pearls buy tanks (goldfish 100, tropical 250, marine 500, each with a free fish), then fish, plants and decorations for them; tap one in the tank to sell it back for half.
- **Tuning:** change `remote-config.json`, commit and push: every player picks it up on their next launch. Track retention (day 1 / day 7) and revenue per daily player when changing ad frequency or hint counts.

## The phone app (Capacitor)

The game is wrapped as an Android and iPhone app with [Capacitor](https://capacitorjs.com). The web files are copied into `www/` and packed into the app.

1. `npm install`
2. `npm run android` (needs Android Studio) or `npm run ios` (needs a Mac with Xcode; run `pod install` in `ios/App` the first time). These copy the game into `www/`, sync it into the native projects and open them.
3. Run on a phone or emulator from Android Studio / Xcode.

Both apps are locked to portrait. Ads use the `@capacitor-community/admob` plugin: on first launch the app shows Google's consent form where the law needs one (EU/UK) and, on iPhone, Apple's tracking prompt. Settings has a "Privacy choices" button to change consent later.

### Before release

- [ ] Change the app ID `com.eelescape.game` in `capacitor.config.json` (and the Android / iOS projects) to one you own.
- [ ] Create an AdMob account and app, then replace Google's **test** IDs: the app IDs in `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist`, and the ad unit IDs in `ads.js` (or set `ads.units` in `remote-config.json`).
- [ ] Add the remaining SKAdNetwork IDs AdMob lists to `Info.plist`.
- [ ] Hook up real purchases (App Store / Google Play) in `shop.js`, including Restore purchases.
- [ ] Set `unlockAll` to `false` in `remote-config.json` so groups unlock as players progress.
- [ ] Fill in `privacy.html` (release date, contact email) and give its web address to both stores; complete Google Play's Data safety form and Apple's privacy details.
- [ ] Set the age rating for a general audience (not "designed for children").
- [ ] App icons and splash screens (e.g. `npx @capacitor/assets generate`).
