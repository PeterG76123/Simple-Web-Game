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

## Status of picture days

| Day | Picture | Files | In Supabase |
|---|---|---|---|
| 2026-11-14 | Sea turtle | done | yes (checked by md5) |
| 2026-11-15 | Whale | done | yes (checked by md5) |
| 2026-11-16 | Octopus | done | yes (checked by md5) |
| 2026-12-01 | Christmas tree | done (new version, no outlines) | yes, new version (checked by md5) |

After loading, update the calendar's `uploads` rows (whale, octopus: status
"ready", day, preview/puzzle/reward assets; turtle too), reply on any "Send to
Claude" threads, and resolve them.

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

- The hourly "Picture uploads check" scheduled task and the artifact watch are
  tied to the old session: recreate them in the new one (watch the artifact
  with ArtifactComments action "watch"; hourly send_later/create_trigger).
- Remove the TEMPORARY "Unlock all levels" setting before production.
- Insane tier: all 150 levels done and checked (tools/check-levels.js).
