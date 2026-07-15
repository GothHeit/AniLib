# AniLib Web

Frontend da plataforma AniLib, desenvolvido em JavaScript puro (Vanilla JS), consumindo uma API REST para consulta de animes, autenticação de usuários e integração com MyAnimeList.

## 📖 Sobre o Projeto

AniLib é uma aplicação web voltada para descoberta e gerenciamento de animes.

A plataforma permite:

- Visualizar animes recentes
- Pesquisar animes
- Visualizar informações detalhadas de cada anime
- Assistir episódios diretamente pelo player integrado
- Cadastro e login de usuários
- Integração com MyAnimeList (MAL)
- Gerenciamento de watchlist pessoal
- Perfil de usuário

## 🚀 Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6 Modules)
- REST API
- JWT Authentication
- MyAnimeList OAuth

## 📂 Estrutura do Projeto

```text
web/
├── css/
│   └── style.css
│
├── js/
│   ├── api/
│   │   ├── animes.js
│   │   ├── users.js
│   │   ├── mal.js
│   │   └── http.js
│   │
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── paginaAnime.js
│   │   ├── perfil.js
│   │   ├── login.js
│   │   └── cadastro.js
│   │
│   ├── ui/
│   │   └── nsfw.js
│   │
│   ├── config.js
│   └── main.js
│
└── index.html
```

## ⚙️ Configuração

Configure a URL da API no arquivo:

```js
// js/config.js

export const API_URL = "http://127.0.0.1:8000";
```

Substitua pelo endereço do seu backend:

```js
export const API_URL = "https://api.seudominio.com";
```

## ▶️ Executando o Projeto

Como o projeto utiliza módulos ES6, recomenda-se servir os arquivos por um servidor HTTP.

### Python

```bash
python -m http.server 5500
```

Acesse:

```text
http://localhost:5500
```

### VS Code

Instale a extensão:

- Live Server

Clique em:

```text
Open with Live Server
```

## 🔐 Autenticação

O sistema utiliza autenticação baseada em JWT.

Após o login, o token é armazenado em cookie:

```text
token=<jwt>
```

Esse token é enviado automaticamente para rotas protegidas da API.

## 🎬 Funcionalidades

### Dashboard

- Listagem de animes recentes
- Top animes
- Busca de animes

### Página de Anime

- Informações detalhadas
- Lista de episódios
- Reprodução por streaming
- Integração com MyAnimeList

### Perfil

- Visualização da conta
- Conexão com MyAnimeList
- Gerenciamento da watchlist
- Histórico de animes


## 🔗 Integração MyAnimeList

O projeto suporta:

- Login OAuth com MyAnimeList
- Sincronização de listas
- Atualização de status
- Remoção de animes da lista

## 📌 Requisitos

Backend compatível com os endpoints:

```text
GET    /anime
GET    /anime/search
GET    /anime/topanimes
GET    /anime/{id}
GET    /anime/{id}/episodes
GET    /anime/{id}/stream

POST   /users
POST   /users/login
GET    /users

GET    /me/mal
DELETE /me/mal

GET    /me/animelist
PATCH  /me/animelist/{id}
DELETE /me/animelist/{id}
```

## 📄 Licença

Este projeto está disponível para fins educacionais e de desenvolvimento pessoal.
