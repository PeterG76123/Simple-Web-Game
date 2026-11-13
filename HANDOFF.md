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

## Next: calendar page redesign (Peter's request)

A 7 x 52 grid for the year (rows = weeks Mon-Sun, from this week): each day
shows its suggested picture (from the themes), the uploaded picture and its
build status if there is one, and, when complete, a link that pops up the
original image, the eel puzzle and the reward picture. Upload by clicking a
day, pasting or dropping onto it; uploads keyed by day (doc id = YYYY-MM-DD)
so the day is Peter's choice. A draft of the page is in the previous session's
scratchpad (not saved); rebuild from this description and the current page.

## Other open items

- The hourly "Picture uploads check" scheduled task and the artifact watch are
  tied to the old session: recreate them in the new one (watch the artifact
  with ArtifactComments action "watch"; hourly send_later/create_trigger).
- Remove the TEMPORARY "Unlock all levels" setting before production.
- Insane tier: all 150 levels done and checked (tools/check-levels.js).
