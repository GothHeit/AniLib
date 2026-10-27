# MoonRoom

Um app de anime para você e seus amigos: acompanhe sua lista, assista episódios, veja junto com amigos. Privado, só por convite, grátis.
Disponível em português (pt-BR) e inglês.

An anime app for you and your friends: track your list, watch episodes and watch together. Private, invite-only, free.
Available in Portuguese (pt-BR) and English.

## Recursos / Features

- Catálogo e lista de anime (MyAnimeList) / Catalog and list sync (MyAnimeList)
- Player com fontes de vídeo plugáveis / Player with pluggable video sources
- Assistir junto em salas / Watch together in rooms
- Amigos, perfis e notificações / Friends, profiles and notifications
- Funciona no iPhone, com "Adicionar à Tela de Início" / Works on iPhone, with Add to Home Screen

## Estrutura / Layout

```
apps/api/             FastAPI + PostgreSQL
apps/web/             Next.js + TypeScript
packages/api-client/  TypeScript client generated from the API's OpenAPI spec
deploy/               production stack
legacy/               the original version, kept for reference
```

## Rodando localmente / Running locally

Requisitos / Requirements: Docker, [uv](https://docs.astral.sh/uv/), Node 22, pnpm.

```bash
docker compose up -d db

cd apps/api
cp .env.example .env              # fill JWT_SECRET, TOKEN_ENCRYPTION_KEY and the MAL keys
uv sync
uv run alembic upgrade head
uv run python -m app.cli invite   # invite code for the first account
uv run uvicorn app.main:app --reload   # http://localhost:8000/docs

pnpm install
pnpm dev:web                      # http://localhost:3000
```

After registering: `uv run python -m app.cli promote <username>` makes you an admin.

Tests / Testes: `cd apps/api && uv run pytest`, `pnpm lint && pnpm typecheck`, `pnpm --filter web build`.

## Publicando / Deploying

Production and auto-deploy: [deploy/README.md](deploy/README.md).
