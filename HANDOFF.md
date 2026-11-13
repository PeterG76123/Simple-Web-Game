# Handoff (13 Nov 2026)

Start new sessions from this repo (PeterG76123/Simple-Web-Game), branch
`ccr-8fe50b6a-4s957b`: its `.claude/settings.json` allows the Supabase tools
and the picture calendar's database/comments without prompts.

## Daily picture puzzles: where things are

- Picture calendar page (claude.ai artifact): https://claude.ai/artifact/8wFiGkkMGxHyvvbhvQXfzF
  - Its `uploads` collection holds Peter's uploads. Today rows are keyed by idea
    (e.g. `sea-nov--whale`); the redesign below keys them by day.
- Pipeline: README.md, "Daily picture puzzles (from the picture calendar)".
  - `node tools/daily-picture.js picture.png --day YYYY-MM-DD --title "Name" --out levels-daily/pictures`
    makes the day's puzzles: Insane = the picture (40x40, jams, picture=true);
    Easy/Medium/Hard = spare bank levels in the picture's colours (picture=false).
    `--reuse-insane 1` keeps an Insane puzzle already made.
  - `tools/picture-grid.py` trims, removes black outlines (keeps solid black such
    as pupils), removes stray marks, and recolours colours that would vanish
    into the sea (blues -> a bright unused colour; very dark ones lifted).
  - `python3 tools/render-level.py levels-daily/pictures/<day>.json 3 puzzle.png reward.png`
    draws the Insane puzzle as the player sees it and the reward picture.
  - Run the day's SQL (`levels-daily/pictures/<day>.sql`) on Supabase project
    `ikekuyyvunkulgvhwpqi` (table `eel_daily_puzzles`, column `picture` added).
- Peter decided (13 Nov): watermarked reference images (e.g. Alamy previews) are
  fine to use as reference; the picture is redrawn as a 40x40 eel grid.

## Status of picture days (13 Nov, end of session)

All loaded into Supabase and md5-checked against levels-daily/pictures/<day>.sql,
and shown as "In the game" on the calendar with preview, puzzle and reward:

13 Nov Clownfish, 14 Sea turtle, 15 Whale, 16 Octopus, 17 Crab, 18 Starfish,
19 Jellyfish, 20 Pufferfish, 21 Shark, 22 Anchor, 23 Treasure chest,
24 Lighthouse, 25 Submarine, 26 Turkey, 27 Shell, 28 Coral, 29 Seahorse,
30 Manta ray, 1 Dec Christmas tree.

Tool changes this session:
- picture-grid.py: big uploads shrunk to 1000 px first; white parts inside the
  subject (stripes, eye whites) keep a white colour instead of turning to sea.
  `--inside-gap N` (default 60; smaller N = wider gap allowed) tunes how wide an
  opening to the background may be before a white area counts as background:
  the clownfish needed 16, the jellyfish 120.
- daily-spare.js: Hard spares are solved with the staged solver first and a
  capped full search, and a spare too big to solve is swapped for another
  (the starfish and pufferfish builds had run out of memory).
- daily-picture.js passes --inside-gap, --keep-outlines, --keep-marks, --auto
  through to picture-grid.py.

## Calendar page (rebuilt 13 Nov as the 52-week grid)

Source: `tools/picture-calendar.html` (publish it to the artifact URL above).
Rows = weeks Mon-Sun from the current week. Each day shows the suggested idea
(the next unused idea of the shortest theme covering that day), the uploaded
picture with its status, and for ready days a View dialog with the original,
the Insane eel puzzle and the reward picture. Upload by clicking a day, dropping
onto it, or clicking a day and pasting.

`uploads` rows are now keyed by day (doc id YYYY-MM-DD): fields day, name,
theme, asset, url, status (new/making/ready/problem), note, preview, puzzle,
reward (`/_blob/<id>` urls). The four finished days (14, 15, 16 Nov and 1 Dec)
are in this form. Rows still keyed by idea (clownfish, seahorse, crab, starfish,
jellyfish, pufferfish, shark: all status "new", no puzzles made yet) appear in
a "needs a day" tray where Peter picks a day and presses Move.

## Other open items

- The calendar page shows a live build bar from its `build/now` doc
  ({active, total, done, day, name, queue}) and each upload's `progress`
  ({stage: eels|spares|loading, at}); set active false when nothing is building.
- No hourly uploads check is scheduled; new uploads arrive as "Send to Claude"
  comments on the calendar, which wake the session watching the artifact.
- Remove the TEMPORARY "Unlock all levels" setting before production.
- Insane tier: all 150 levels done and checked (tools/check-levels.js).
