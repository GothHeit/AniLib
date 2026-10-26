# MoonRoom

> MoonRoom é o nome provisório (antes AniLib); o repositório continua GothHeit/AniLib. O nome ainda pode mudar. Ele fica só em `APP_NAME` (API) e `NEXT_PUBLIC_APP_NAME` (web).
> MoonRoom is the working name (formerly AniLib); the repo is still GothHeit/AniLib. The name may still change. It only lives in `APP_NAME` (API) and `NEXT_PUBLIC_APP_NAME` (web).

Biblioteca de anime para você e seus amigos: catálogo do MyAnimeList, sincronização da sua lista e
assistir episódios num app privado, só por convite. Web primeiro; apps de celular, desktop e TV depois.

An anime library for you and your friends: MyAnimeList catalog, list sync and private, invite-only
watching. Web first; phone, desktop and TV apps later.

## Estrutura / Layout

```
apps/api/             FastAPI + PostgreSQL (SQLAlchemy, Alembic)
apps/web/             Next.js + next-intl (pt, en)
packages/api-client/  TypeScript client generated from the API's OpenAPI spec
legacy/               the original MongoDB + vanilla JS version, kept for reference until Phase 1 replaces it
```

## Rodando localmente / Running locally

Requisitos / Requirements: Docker, [uv](https://docs.astral.sh/uv/), Node 22, pnpm.

```bash
# 1. Database
docker compose up -d db

# 2. API (http://localhost:8000/docs)
cd apps/api
cp .env.example .env          # fill JWT_SECRET, TOKEN_ENCRYPTION_KEY and the MAL keys
uv sync                       # add --extra allanime for the private video source
uv run alembic upgrade head
uv run python -m app.cli invite        # prints an invite code for the first account
uv run uvicorn app.main:app --reload

# 3. Web (http://localhost:3000)
pnpm install
pnpm dev:web          # reads API_URL (default http://localhost:8000) on the server side;
                      # cookies are Secure in production, set COOKIE_SECURE=false to serve plain http on a LAN
```

Depois de criar sua conta com o convite / After registering with the invite:
`uv run python -m app.cli promote <username>` makes you an admin, so you can create invites for
friends through `POST /invites`.

## Fontes de vídeo / Video sources

Video comes through a `VideoSource` plug-in (`apps/api/src/app/sources/`). The only one today is
`allanime`, which scrapes an **unlicensed** site. It is off by default and must only be enabled on a
private, invite-only deployment (`VIDEO_SOURCES=allanime`, installed with `--extra allanime`).
A licensed catalog would be another plug-in, with no changes to the player or the rest of the app.

## Testes / Tests

```bash
cd apps/api && uv run pytest        # needs Postgres: DATABASE_URL defaults to .../app_test
pnpm lint && pnpm typecheck
pnpm --filter web build && pnpm --filter web test:e2e
pnpm gen:api                        # regenerate the TS client after changing the API
```

CI runs all of the above on every pull request.
