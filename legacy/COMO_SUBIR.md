# Rodando manualmente (sem start.sh/stop.sh)

## MongoDB

```
cd backend
docker compose up -d
```

## Backend

```
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

API em http://localhost:8000, docs em http://localhost:8000/docs.

## Frontend

```
cd frontend
python3 -m http.server 5500
```

Acessar em http://localhost:5500.

## Parar tudo

```
pkill -f "uvicorn main:app"
pkill -f "http.server 5500"
cd backend && docker compose stop
```

## .env

O backend precisa de um `backend/.env` (não vem do git) com:

```
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=<sua chave>
MAL_CLIENT_ID=<id>
MAL_CLIENT_SECRET=<secret>
MAL_REDIRECT_URI=http://localhost:8000/auth/mal/callback
FRONTEND_URL=http://localhost:5500
```

## Zerar o banco

```
cd backend
docker compose down -v
docker compose up -d
```
