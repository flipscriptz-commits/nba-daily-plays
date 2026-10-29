// Fetches the NBA's public live data on Netlify's servers (browsers are blocked from it)
// and returns it to the page. Only games that have started are included.
const BASE = "https://cdn.nba.com/static/json/liveData";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NBA-Daily-Plays/1.0)",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
  Accept: "application/json",
};

async function getJson(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

export default async () => {
  const out = { ok: false, fetchedAt: new Date().toISOString(), date: null, games: [], boxes: {} };
  try {
    const sb = (await getJson(`${BASE}/scoreboard/todaysScoreboard_00.json`)).scoreboard || {};
    out.date = sb.gameDate || null;
    out.games = (sb.games || []).map((g) => ({
      gameId: g.gameId,
      gameStatus: g.gameStatus,
      gameStatusText: g.gameStatusText,
      awayTeam: { teamTricode: g.awayTeam.teamTricode, score: g.awayTeam.score },
      homeTeam: { teamTricode: g.homeTeam.teamTricode, score: g.homeTeam.score },
    }));
    const started = out.games.filter((g) => g.gameStatus >= 2);
    await Promise.all(
      started.map(async (g) => {
        try {
          const b = (await getJson(`${BASE}/boxscore/boxscore_${g.gameId}.json`)).game || {};
          const slim = (t) => ({
            players: (t.players || []).map((p) => ({
              name: p.name,
              status: p.status,
              statistics: {
                minutes: p.statistics && p.statistics.minutes,
                points: p.statistics && p.statistics.points,
                reboundsTotal: p.statistics && p.statistics.reboundsTotal,
                assists: p.statistics && p.statistics.assists,
                threePointersMade: p.statistics && p.statistics.threePointersMade,
              },
            })),
          });
          out.boxes[g.gameId] = { homeTeam: slim(b.homeTeam || {}), awayTeam: slim(b.awayTeam || {}) };
        } catch (e) {
          /* skip this game's box score; the page shows "Has not played yet" */
        }
      })
    );
    out.ok = true;
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }
  return new Response(JSON.stringify(out), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=0, s-maxage=20" },
  });
};
