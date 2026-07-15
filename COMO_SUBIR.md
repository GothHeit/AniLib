# 🚀 Como subir o projeto (nesta máquina)

Caminhos desta máquina:
- Projeto (monorepo): `/home/kafka/projetos/anilib-monorepo`
- Backend: `/home/kafka/projetos/anilib-monorepo/backend`
- Frontend: `/home/kafka/projetos/anilib-monorepo/frontend`
- MongoDB: container Docker (`docker-compose.yml` do backend), sem dados soltos na home

---

## Atalho rápido

Da raiz do repo:

```bash
./start.sh   # sobe Mongo (Docker) + backend (porta 8000) + frontend (porta 5500)
./stop.sh    # derruba os três
```

Logs do backend/frontend ficam em `.logs/` (ignorado pelo git).

---

## Passo a passo manual

### 1. MongoDB (Docker)

```bash
cd backend
docker compose up -d
```

Conferir:
```bash
docker compose ps
```

### 2. Backend (FastAPI / uvicorn)

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

- API: http://localhost:8000
- Docs (Swagger): http://localhost:8000/docs

> Deixe esse terminal **aberto** — é nele que aparecem os logs/erros (ex.:
> ao testar o "conectar ao MAL", erros como `"Falha ao autenticar com o MAL"`
> ou `"State inválido"` aparecem aqui).

### 3. Frontend (estático)

```bash
cd frontend
python3 -m http.server 5500
```

Acessar em http://localhost:5500

(Alternativa: abrir a pasta `frontend` no VS Code e usar a extensão **Live Server**,
que já sobe em `http://localhost:5500`.)

---

## ✅ Checklist antes de testar o MAL

1. [ ] MongoDB rodando (`docker compose ps` mostra `mongodb` up, porta 27017)
2. [ ] Backend rodando (porta 8000)
3. [ ] Arquivo `.env` (dentro de `backend/`) preenchido com valores **reais**
   (não os placeholders do `.env.example`):
   - `MAL_CLIENT_ID`
   - `MAL_CLIENT_SECRET`
   - `MAL_REDIRECT_URI=http://localhost:8000/auth/mal/callback`
   - `MONGO_URL=mongodb://localhost:27017`
   - `JWT_SECRET=<sua chave>`

> Lembrete: o `.env` **não** vem do git (está no `.gitignore`).
> Cada máquina precisa ter o seu, preenchido à mão.

---

## 🛑 Como parar tudo

**Via script:** `./stop.sh` na raiz do projeto.

**Manual:**
```bash
pkill -f "uvicorn main:app"
pkill -f "http.server 5500"
cd backend && docker compose stop
```

Conferir que parou tudo:
```bash
ps aux | grep -iE "uvicorn|http.server" | grep -v grep
docker compose ps
```

---

## ⚠️ Zerar o banco (apaga TODOS os usuários!)

```bash
cd backend
docker compose down -v   # remove o container e o volume mongo_data
docker compose up -d     # sobe de novo, banco vazio
```
