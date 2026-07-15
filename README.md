# AniLib

Monorepo do AniLib: backend (FastAPI + MongoDB) e frontend (Vanilla JS) no mesmo lugar.

## Estrutura

```
.
├── backend/    # FastAPI, MongoDB, integração MyAnimeList — ver backend/README.md
├── frontend/   # HTML/CSS/JS puro, consome a API do backend — ver frontend/README.md
├── start.sh    # sobe Mongo (Docker) + backend + frontend
├── stop.sh     # derruba tudo
└── COMO_SUBIR.md
```

## Rodando o projeto

```bash
./start.sh
```

- Backend: http://localhost:8000/docs
- Frontend: http://localhost:5500

Veja [`COMO_SUBIR.md`](COMO_SUBIR.md) para o passo a passo detalhado (Docker, `.env`, etc).
