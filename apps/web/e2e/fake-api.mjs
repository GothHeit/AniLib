// Minimal stand-in for the API's auth endpoints, so the web e2e tests need no database.
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_API_PORT ?? 4010);
const accessTokens = new Set();
const spentRefresh = new Set();
const liveRefresh = new Set();
let counter = 0;
let refreshCalls = 0;

function issue() {
  counter += 1;
  const tokens = {
    access_token: `access-${counter}`,
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
    return username === "kafka" && password === "password123"
      ? send(200, issue())
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
  if (url.pathname === "/me") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !accessTokens.has(token)) return send(401, error("not_authenticated"));
    return send(200, { id: "1", username: "kafka", locale: "en", show_nsfw: false, is_admin: false });
  }
  send(404, error("not_found"));
}).listen(PORT, () => console.log(`fake api on ${PORT}`));
