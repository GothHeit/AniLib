// Minimal stand-in for the API, so the web e2e tests need no database.
import { createServer } from "node:http";

import { handleWatch } from "./fake-watch.mjs";

// The saved subtitle choice, like the real account setting.
let subtitleLang = null;

const PORT = Number(process.env.FAKE_API_PORT ?? 4010);
const accessTokens = new Set();
const spentRefresh = new Set();
const liveRefresh = new Set();
let counter = 0;
let refreshCalls = 0;

function issue(tag = "") {
  counter += 1;
  const tokens = {
    access_token: `access-${tag}${counter}`,
    refresh_token: `refresh-${counter}`,
    token_type: "bearer",
    expires_in: 900,
  };
  accessTokens.add(tokens.access_token);
  liveRefresh.add(tokens.refresh_token);
  return tokens;
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

const card = (id, title, genres = []) => ({ id, title, genres, mean: 8.4, start_season: { year: 2024, season: "fall" } });
const CATALOG = [
  card(1, "Frieren", [{ id: 1, name: "Adventure" }]),
  card(2, "Dungeon Meshi", [{ id: 2, name: "Fantasy" }]),
  card(3, "Fullmetal Alchemist", [{ id: 1, name: "Adventure" }]),
];
const GENRES = [
  { id: 1, name: "Adventure", kind: "genre", nsfw: false },
  { id: 2, name: "Fantasy", kind: "genre", nsfw: false },
];
const HOME = {
  hero: { anime: CATALOG[0], synopsis: "A mage walks on.", backdrop: null },
  rows: [
    {
      id: "continue_watching",
      items: [
        {
          anime: CATALOG[1],
          resume_episode: 4,
          progress: { anime_id: 2, episode: 4, position_seconds: 600, duration_seconds: 1200, completed: false, updated_at: "2026-01-01T00:00:00Z" },
        },
      ],
    },
    { id: "seasonal", items: CATALOG.map((anime) => ({ anime })) },
  ],
};

const error = (code) => ({ error: { code, message: code } });

createServer(async (req, res) => {
  const send = (status, json) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(json === undefined ? undefined : JSON.stringify(json));
  };
  const url = new URL(req.url, "http://x");

  if (url.pathname === "/health") return send(200, { status: "ok" });
  if (url.pathname === "/__stats") return send(200, { refreshCalls });

  if (url.pathname === "/auth/login") {
    const { username, password } = await body(req);
    // "expired" signs in fine but has a MyAnimeList link whose token has expired.
    return (username === "kafka" || username === "expired") && password === "password123"
      ? send(200, issue(username === "expired" ? "expired-" : ""))
      : send(401, error("invalid_credentials"));
  }
  if (url.pathname === "/auth/register") {
    const { invite_code, username } = await body(req);
    if (invite_code !== "GOOD-INVITE") return send(400, error("invalid_invite"));
    if (username === "kafka") return send(409, error("username_taken"));
    return send(201, issue());
  }
  if (url.pathname === "/auth/refresh") {
    refreshCalls += 1;
    const { refresh_token } = await body(req);
    // Like the real API: a rotated token can be used once, a second use is rejected.
    if (!liveRefresh.has(refresh_token) || spentRefresh.has(refresh_token)) {
      return send(401, error("invalid_refresh_token"));
    }
    spentRefresh.add(refresh_token);
    return send(200, issue());
  }
  if (url.pathname === "/auth/logout") {
    const { refresh_token } = await body(req);
    liveRefresh.delete(refresh_token);
    return send(204);
  }
  const token = req.headers.authorization?.replace("Bearer ", "");
  const authed = Boolean(token && accessTokens.has(token));
  if (await handleWatch(req, res, { url, send, error, body, authed })) return;
  if (url.pathname === "/me") {
    if (!authed) return send(401, error("not_authenticated"));
    if (req.method === "PATCH") {
      const patch = await body(req);
      if ("subtitle_lang" in patch) subtitleLang = patch.subtitle_lang;
    }
    return send(200, {
      id: "1",
      username: "kafka",
      locale: "en",
      show_nsfw: false,
      subtitle_lang: subtitleLang,
      is_admin: false,
    });
  }
  if (url.pathname === "/me/mal") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !accessTokens.has(token)) return send(401, error("not_authenticated"));
    return send(200, { connected: token.includes("expired") });
  }
  if (url.pathname === "/me/animelist") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !accessTokens.has(token)) return send(401, error("not_authenticated"));
    return send(401, error("mal_session_expired"));
  }
  if (url.pathname.startsWith("/anime/") || url.pathname === "/home") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !accessTokens.has(token)) return send(401, error("not_authenticated"));
    if (url.pathname === "/home") return send(200, HOME);
    if (url.pathname === "/anime/genres") return send(200, GENRES);
    if (url.pathname === "/anime/search") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      return send(200, { data: CATALOG.filter((a) => a.title.toLowerCase().includes(q)) });
    }
    if (url.pathname === "/anime/browse") {
      const genre = Number(url.searchParams.get("genre"));
      const data = genre ? CATALOG.filter((a) => a.genres.some((g) => g.id === genre)) : CATALOG;
      return send(200, { data, page: 1, has_next: false });
    }
  }
  send(404, error("not_found"));
}).listen(PORT, () => console.log(`fake api on ${PORT}`));
