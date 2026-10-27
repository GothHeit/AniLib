# Deploying MoonRoom

One Docker Compose stack: Postgres, the API (migrations run on start), the web app in production
mode, Caddy (routing) and, optionally, a Cloudflare Tunnel. Only Caddy is reachable from outside;
the database and the API are never published.

```
friends -> Cloudflare -> cloudflared -> Caddy -> web (Next.js) -> api -> db
                                          \-> api (only /mal/callback)
```

## What needs you

1. A domain on Cloudflare (buy one, or move an existing one's DNS to Cloudflare).
2. A free Cloudflare Zero Trust account, then a tunnel: Zero Trust > Networks > Tunnels > Create a
   tunnel > Cloudflared. Copy its token into `TUNNEL_TOKEN`. In the tunnel's "Public hostnames"
   add your hostname (for example `moonroom.example.com`) with service `http://caddy:80`.
3. A MyAnimeList app (https://myanimelist.net/apiconfig) whose redirect URL is exactly
   `https://<your hostname>/mal/callback`. Keep `http://localhost:8000/mal/callback` too if you
   still run the dev setup, since MAL accepts several.
4. Docker with the Compose plugin on the PC, set to start on boot.

## First run

```bash
cd deploy
cp .env.example .env     # fill every empty value; the file explains how to generate each
docker compose up -d --build
docker compose exec api python -m app.cli invite    # invite code for the first account
docker compose exec api python -m app.cli promote <username>   # after registering, to become admin
```

Open `PUBLIC_URL`. Check the stack with `docker compose ps` (all `healthy`) and
`docker compose logs -f api`.

## Updating

```bash
git pull
cd deploy && docker compose up -d --build
```

The API applies pending migrations when it starts. Roll back by checking out the previous commit and
running the same command (migrations are not undone automatically).

## Backups

`deploy/backup.sh` writes a compressed dump to `deploy/backups/` and keeps the last 14. Schedule it
with cron. Restore into a running stack:

```bash
gunzip -c backups/moonroom-<stamp>.sql.gz | docker compose exec -T db psql -U app app
```

Keep a copy off the PC too (cloud drive, another disk). Also back up `deploy/.env`: losing
`TOKEN_ENCRYPTION_KEY` makes linked MAL accounts unreadable, and changing `JWT_SECRET` logs everyone out.

## Proxy and cookie settings

- `TRUST_PROXY_HEADERS=true` on the API is safe here because only Caddy can reach it, and Caddy
  replaces `X-Forwarded-For` with the visitor address Cloudflare reports. Never expose the API port
  directly while this is on, or anyone could fake their IP and dodge the login rate limits.
- `COOKIE_SECURE=true` (default) keeps the login cookies HTTPS-only. Browsers see https at
  Cloudflare, so this works behind the tunnel. Set it to `false` only to try the stack over plain
  http on your own network.

## Video sources

`VIDEO_SOURCES` lists unlicensed sources and is meant for this private deployment only. Leave it
empty (and `API_EXTRAS` too) for anything public or any store build.

## Moving to a VPS later

Copy the repo and `.env`, restore a backup, then:

1. In `.env`: remove `COMPOSE_PROFILES`, set `SITE_ADDRESS` to your domain.
2. Point the domain's DNS at the VPS.
3. `docker compose -f compose.yaml -f compose.vps.yaml up -d --build` (publishes 80 and 443;
   Caddy gets the certificate by itself).
