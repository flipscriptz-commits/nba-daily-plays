# NBA Daily Plays

Static report page (`index.html`) plus a Netlify Function (`netlify/functions/live.mjs`) that powers live player stats.

## Files
- `index.html` - the daily report. Replace this file each day.
- `netlify.toml` - tells Netlify to publish the repo root and find the function.
- `netlify/functions/live.mjs` - fetches NBA live scoreboard and box scores (served at `/.netlify/functions/live`).

## Connect to Netlify
1. Push these files to a GitHub repo (keep the `netlify/functions/` folder path).
2. Netlify: Add new site > Import an existing project > GitHub > pick the repo.
3. Build command: leave empty. Publish directory: `.` Deploy.
4. Daily: upload the new `index.html` to the repo; Netlify redeploys in about a minute.

## Check live stats
Open `https://YOUR-SITE.netlify.app/.netlify/functions/live`. It should start with `{"ok":true,...}`.
During games the picks show live numbers; before tip they show "Not started".
