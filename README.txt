NBA DAILY PLAYS - LIVE STATS SETUP (about 15 minutes, one time)

This folder contains:
  index.html                      the report page
  netlify.toml                    tells Netlify where the function is
  netlify/functions/live.mjs      the function that fetches live NBA stats

Why not drag-and-drop? Netlify Drop uploads files only; it does not run functions.
Use ONE of the two methods below.

METHOD A - GitHub (no command line)
1. Create a free account at github.com and click New repository (name: nba-daily-plays, Public or Private).
2. On the new repo page click "uploading an existing file", drag in the CONTENTS of this folder
   (index.html, netlify.toml and the whole netlify folder) and click Commit changes.
   Make sure netlify/functions/live.mjs keeps that folder path.
3. At app.netlify.com click Add new site > Import an existing project > GitHub, pick the repo.
   Leave the build command empty and publish directory as "." then Deploy.
4. To update the report each day, replace index.html in the GitHub repo (Add file > Upload files).
   Netlify redeploys automatically in under a minute.

METHOD B - Netlify command line
1. Install Node.js, then run:  npm i -g netlify-cli
2. In this folder run:  netlify login   then   netlify deploy --prod
   (first time it asks you to create/link a site).

HOW TO CHECK IT WORKS
- Open your site during a game. The line under the heading says "Live stats on - updated ..."
  when it is working, or "Live stats unavailable right now" if the function could not reach the NBA data.
- The function itself can be tested at  https://YOUR-SITE.netlify.app/.netlify/functions/live
  It should show text starting with {"ok":true,...}. If it shows "ok":false, send me the "error" text.
- Stats only appear for games on the NBA's feed for the current day (feed dates are Eastern).

DAILY UPDATE NOTE
Each pick's live line is a small empty box in index.html with data-player, data-game (AWAY@HOME
tricodes), data-stat (pts, reb, ast, 3pm), data-line and data-side. A new day's report needs those
boxes for its own players. Ask Claude to build the day's file with them.
