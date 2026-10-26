// Title, progress and streaming endpoints for the fake API, with a stubbed video source.
import { readFileSync } from "node:fs";

const CLIP = readFileSync(new URL("./fixtures/clip.webm", import.meta.url));
const SOURCE = "stub";
const EPISODES = { sub: [1, 2, 3], dub: [1] };
// Episode 1 comes with subtitle tracks; the others have none.
const SUBTITLE_EPISODE = 1;
const VTT = "WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nHello moon\n";

function details(id) {
  const watchable = id !== 2;
  return {
    id,
    title: watchable ? `Moon Test ${id}` : "Tracking Only Test",
    alternative_titles: { en: "The Moon Test", ja: null, synonyms: [] },
    main_picture: null,
    synopsis: "A test title about the moon.",
    mean: 8.51,
    genres: [{ id: 1, name: "Action" }],
    studios: [{ id: 1, name: "Test Studio" }],
    start_season: { year: 2026, season: "fall" },
    media_type: "tv",
    status: "currently_airing",
    num_episodes: 3,
    pictures: [],
    available_sources: watchable ? [SOURCE] : [],
    related_anime: [
      { relation_type: "sequel", relation_type_formatted: "Sequel", anime: { id: 10, title: "Moon Test Sequel" } },
    ],
    recommendations: [{ num_recommendations: 4, anime: { id: 11, title: "Sun Test" } }],
  };
}

// anime id -> episode -> progress. Anime 1 is read by the title page tests, anime 4 is
// written by the player tests.
const progress = new Map();
function seed(animeId, episode, position, completed) {
  if (!progress.has(animeId)) progress.set(animeId, new Map());
  progress.get(animeId).set(episode, {
    anime_id: animeId,
    episode,
    position_seconds: position,
    duration_seconds: 40,
    completed,
    updated_at: new Date(Date.now() + episode).toISOString(),
  });
}
seed(1, 1, 40, true);
seed(1, 2, 12, false);
seed(4, 2, 12, false);

// anime id -> MAL list status. Anime 4 starts as completed.
const listStatus = new Map([[4, "completed"]]);

function serveClip(req, res) {
  const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
  if (!match) {
    res.writeHead(200, { "Content-Type": "video/webm", "Content-Length": CLIP.length, "Accept-Ranges": "bytes" });
    return res.end(CLIP);
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), CLIP.length - 1) : CLIP.length - 1;
  if (start >= CLIP.length) {
    res.writeHead(416, { "Content-Range": `bytes */${CLIP.length}` });
    return res.end();
  }
  res.writeHead(206, {
    "Content-Type": "video/webm",
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${CLIP.length}`,
    "Accept-Ranges": "bytes",
  });
  res.end(CLIP.subarray(start, end + 1));
}

/** Handles the request and returns true, or returns false when the path isn't one of these. */
export async function handleWatch(req, res, { url, send, error, body, authed }) {
  const path = url.pathname;
  const reply = (status, json) => {
    send(status, json);
    return true;
  };

  if (path === "/__progress") {
    const all = [...progress.values()].flatMap((m) => [...m.values()]);
    return reply(200, all);
  }
  if (path === "/watch/subtitles") {
    res.writeHead(200, { "Content-Type": "text/vtt" });
    res.end(VTT);
    return true;
  }
  if (path === "/watch/video") {
    // The playback token stands in for the session, like the real API.
    if (!url.searchParams.get("token")?.startsWith("ep-")) return reply(401, error("invalid_token"));
    serveClip(req, res);
    return true;
  }

  let m = /^\/anime\/(\d+)$/.exec(path);
  if (m) {
    if (!authed) return reply(401, error("not_authenticated"));
    return reply(200, details(Number(m[1])));
  }
  m = /^\/me\/progress\/(\d+)(?:\/(\d+))?$/.exec(path);
  if (m) {
    if (!authed) return reply(401, error("not_authenticated"));
    const animeId = Number(m[1]);
    if (req.method === "PUT") {
      const { position_seconds, duration_seconds, completed } = await body(req);
      const episode = Number(m[2]);
      const was = progress.get(animeId)?.get(episode)?.completed ?? false;
      seed(animeId, episode, position_seconds, was || completed || position_seconds >= 0.9 * duration_seconds);
      return reply(200, progress.get(animeId).get(episode));
    }
    return reply(200, [...(progress.get(animeId)?.values() ?? [])]);
  }
  m = /^\/me\/animelist\/(\d+)$/.exec(path);
  if (m) {
    if (!authed) return reply(401, error("not_authenticated"));
    const animeId = Number(m[1]);
    if (req.method === "PATCH") {
      listStatus.set(animeId, (await body(req)).status);
      return reply(200, { status: listStatus.get(animeId) });
    }
    return reply(200, { linked: true, status: listStatus.get(animeId) ?? null, score: 0, num_episodes_watched: 0 });
  }
  m = /^\/watch\/([^/]+)\/(\d+)\/episodes(?:\/(\d+)\/play)?$/.exec(path);
  if (m) {
    if (!authed) return reply(401, error("not_authenticated"));
    if (m[1] !== SOURCE) return reply(404, error("source_not_found"));
    const lang = url.searchParams.get("lang") === "dub" ? "dub" : "sub";
    if (!m[3]) return reply(200, { source: SOURCE, source_title: "Moon Test", episodes: EPISODES[lang] });
    const episode = Number(m[3]);
    if (!EPISODES[lang].includes(episode)) return reply(404, error("not_available"));
    const subtitles =
      episode === SUBTITLE_EPISODE
        ? [
            { lang: "en", label: "English", url: "/watch/subtitles?l=en" },
            { lang: "pt-BR", label: "Portuguese", url: "/watch/subtitles?l=pt-BR" },
          ]
        : [];
    return reply(200, {
      kind: "mp4",
      resolution: 720,
      url: `/watch/video?token=ep-${episode}-${lang}`,
      subtitles,
    });
  }
  return false;
}
