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

## Automatic deploys

A systemd timer checks `origin/main` every minute and rebuilds production when it changes. It works
in its own clone, `~/moonroom-prod`, so it never touches your dev checkout or uncommitted work. Run
once in WSL (systemd must be on: `/etc/wsl.conf` with `[boot]` / `systemd=true`, then `wsl --shutdown`
from Windows):

```bash
git clone https://github.com/GothHeit/MoonRoom ~/moonroom-prod
cp ~/projetos/AniLib/deploy/.env ~/moonroom-prod/deploy/.env
mkdir -p ~/.config/systemd/user
cp ~/moonroom-prod/deploy/systemd/moonroom-deploy.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now moonroom-deploy.timer
loginctl enable-linger "$USER"    # keep it running when no terminal is open
```

The compose project is named `moonroom`, so the new clone takes over the existing containers and
volumes (database included). Watch it with `journalctl --user -u moonroom-deploy -f`, run it now
with `systemctl --user start moonroom-deploy`. A failed build is retried every minute and the old
version keeps running. Stop it with `systemctl --user disable --now moonroom-deploy.timer`. The
script lives in the clone, so it updates itself with each deploy.

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

Uploaded profile pictures live in the `avatars` Docker volume, not in the database, so the dump does
not include them. Losing them is harmless (people fall back to their MAL picture or initial and can
upload again), but to keep them copy the volume, e.g.
`docker run --rm -v <project>_avatars:/a -v "$PWD/backups":/b alpine tar czf /b/avatars.tgz -C /a .`.
