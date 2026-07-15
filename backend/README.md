# AniLib API

Backend de streaming e gerenciamento de animes construído com FastAPI, MongoDB e integração nativa com MyAnimeList.

Instalação e execução: ver [`COMO_SUBIR.md`](../COMO_SUBIR.md) na raiz do repo.
Detalhes de como o streaming de episódios funciona: ver [`STREAMING.md`](STREAMING.md).

## Funcionalidades

### Autenticação

- Cadastro de usuários, login com JWT, rotas protegidas
- Hash de senha com Argon2

### Catálogo de Animes

- Busca por nome, animes recentes, top animes, detalhes, episódios disponíveis

### Streaming

- Resolução automática de fontes, proxy de vídeo, Range Requests (seek), compatível com players HTML5

### MyAnimeList

- OAuth2 PKCE, vinculação de conta, consulta/atualização/remoção da lista pessoal

## Arquitetura

```text
Client → FastAPI Router → Services → Repositories → MongoDB
```

| Camada | Responsabilidade |
|----------|------------------|
| Router | Receber requisições HTTP |
| Service | Regras de negócio |
| Repository | Persistência de dados |
| Database | Conexão com MongoDB |
| Auth | Segurança e autenticação |

## Tecnologias

FastAPI, Pydantic, Uvicorn · MongoDB + Motor (driver async) · JWT, Argon2, OAuth2 PKCE · MyAnimeList API, AniPy · Docker

## Principais Endpoints

Lista completa e testável em `/docs` (Swagger) com o servidor rodando. Resumo:

| Método | Endpoint |
|----------|----------|
| POST | /users |
| POST | /users/login |
| GET | /anime, /anime/search, /anime/topanimes, /anime/{id}, /anime/{id}/episodes |
| GET | /anime/{id}/episodes/{ep}/stream, /anime/{id}/episodes/{ep}/video |
| GET | /auth/mal/start, /auth/mal/callback |
| GET/DELETE | /me/mal |
| GET/PATCH/DELETE | /me/animelist(/{id}) |
