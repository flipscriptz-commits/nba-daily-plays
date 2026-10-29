// Live stats for the NBA Daily Plays page.
// Primary source: ESPN's public JSON (works from cloud servers). Fallback: NBA.com live data
// (NBA.com returns 403 to many cloud hosts, which is why it is no longer first).
// Output shape is what index.html expects: { ok, games:[{gameId,gameStatus 1|2|3,gameStatusText,awayTeam,homeTeam}], boxes:{gameId:{homeTeam:{players},awayTeam:{players}}} }
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const NBA = "https://cdn.nba.com/static/json/liveData";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NBA-Daily-Plays/1.0)",
  Accept: "application/json",
};
const NBA_HEADERS = { ...HEADERS, Referer: "https://www.nba.com/", Origin: "https://www.nba.com" };
// ESPN abbreviations that differ from the NBA three-letter codes used in the page.
const TRI = { NO: "NOP", NY: "NYK", GS: "GSW", SA: "SAS", UTAH: "UTA", WSH: "WAS" };
const tri = (a) => TRI[a] || a;

async function getJson(url, headers = HEADERS) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

function etDate() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p.replace(/-/g, "");
}

function parseEspnPlayers(team) {
  const players = [];
  for (const grp of team.statistics || []) {
    const labels = grp.labels || [];
    const ix = (l) => labels.indexOf(l);
    for (const a of grp.athletes || []) {
      const s = a.stats || [];
      const num = (l) => {
        const v = s[ix(l)];
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      };
      const threes = ix("3PT") >= 0 ? parseInt(String(s[ix("3PT")] || "0").split("-")[0], 10) || 0 : 0;
      const played = !a.didNotPlay && s.length > 0;
      players.push({
        name: (a.athlete && a.athlete.displayName) || "",
        status: played ? "ACTIVE" : "INACTIVE",
        statistics: played
          ? {
              minutes: `PT${Math.round(num("MIN"))}M`,
              points: num("PTS"),
              reboundsTotal: num("REB"),
              assists: num("AST"),
              threePointersMade: threes,
            }
          : null,
      });
    }
  }
  return { players };
}

async function fromEspn() {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${etDate()}`);
  const games = [];
  for (const ev of sb.events || []) {
    const comp = (ev.competitions || [])[0] || {};
    const home = (comp.competitors || []).find((c) => c.homeAway === "home");
    const away = (comp.competitors || []).find((c) => c.homeAway === "away");
    if (!home || !away) continue;
    const st = (ev.status && ev.status.type) || {};
    games.push({
      gameId: String(ev.id),
      gameStatus: st.state === "in" ? 2 : st.state === "post" ? 3 : 1,
      gameStatusText: st.shortDetail || st.detail || "",
      awayTeam: { teamTricode: tri(away.team.abbreviation), score: Number(away.score) || 0 },
      homeTeam: { teamTricode: tri(home.team.abbreviation), score: Number(home.score) || 0 },
    });
  }
  const boxes = {};
  await Promise.all(
    games
      .filter((g) => g.gameStatus >= 2)
      .map(async (g) => {
        try {
          const sm = await getJson(`${ESPN}/summary?event=${g.gameId}`);
          const out = {};
          for (const t of (sm.boxscore && sm.boxscore.players) || []) {
            const code = tri(t.team && t.team.abbreviation);
            const key = code === g.homeTeam.teamTricode ? "homeTeam" : "awayTeam";
            out[key] = parseEspnPlayers(t);
          }
          boxes[g.gameId] = { homeTeam: out.homeTeam || { players: [] }, awayTeam: out.awayTeam || { players: [] } };
        } catch (e) {
          /* skip this game's box score */
        }
      })
  );
  return { date: etDate(), games, boxes, source: "espn" };
}

async function fromNba() {
  const sb = (await getJson(`${NBA}/scoreboard/todaysScoreboard_00.json`, NBA_HEADERS)).scoreboard || {};
  const games = (sb.games || []).map((g) => ({
    gameId: g.gameId,
    gameStatus: g.gameStatus,
    gameStatusText: g.gameStatusText,
    awayTeam: { teamTricode: g.awayTeam.teamTricode, score: g.awayTeam.score },
    homeTeam: { teamTricode: g.homeTeam.teamTricode, score: g.homeTeam.score },
  }));
  const boxes = {};
  await Promise.all(
    games
      .filter((g) => g.gameStatus >= 2)
      .map(async (g) => {
        try {
          const b = (await getJson(`${NBA}/boxscore/boxscore_${g.gameId}.json`, NBA_HEADERS)).game || {};
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
          boxes[g.gameId] = { homeTeam: slim(b.homeTeam || {}), awayTeam: slim(b.awayTeam || {}) };
        } catch (e) {
          /* skip */
        }
      })
  );
  return { date: sb.gameDate || null, games, boxes, source: "nba" };
}

export default async () => {
  const out = { ok: false, fetchedAt: new Date().toISOString(), date: null, games: [], boxes: {} };
  const errors = [];
  for (const src of [fromEspn, fromNba]) {
    try {
      const r = await src();
      if (r.games.length) {
        Object.assign(out, r, { ok: true });
        break;
      }
      errors.push(`${r.source}: no games`);
    } catch (e) {
      errors.push(String(e && e.message ? e.message : e));
    }
  }
  if (!out.ok) out.error = errors.join(" | ");
  return new Response(JSON.stringify(out), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=0, s-maxage=20" },
  });
};
