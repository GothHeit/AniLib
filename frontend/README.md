# AniLib Web

Frontend da plataforma AniLib, em JavaScript puro (Vanilla JS, ES6 modules), consumindo a API do `backend/`.

Instalação e execução: ver [`COMO_SUBIR.md`](../COMO_SUBIR.md) na raiz do repo.
Endpoints da API: ver [`backend/README.md`](../backend/README.md) ou `/docs` com o backend rodando.

A URL da API é configurada em `js/config.js` (`API_URL`).

## Funcionalidades

### Dashboard

- Animes recentes, top animes, busca

### Página de Anime

- Detalhes, lista de episódios, reprodução por streaming, integração com MyAnimeList

### Perfil

- Conta, conexão com MyAnimeList, watchlist, histórico

## Autenticação

JWT armazenado em cookie (`token=<jwt>`), enviado automaticamente pra rotas protegidas da API.
