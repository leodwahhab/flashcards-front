# Flashcards (front-end)

React + Vite + TypeScript + Tailwind v4 + shadcn/ui. Consome a API `flashcards-back` (`/api/v1`).

## Rodar localmente

Pré-requisitos: Node 22+ e o back-end em `http://localhost:8080` (veja o README do `flashcards-back`).

```bash
npm install
npm run dev        # http://localhost:5173, usa .env.development (API local)
```

Para apontar para outra API: `VITE_API_URL=https://.../api/v1 npm run dev`.

## Rodar em container (build de produção)

```bash
docker compose up --build        # http://localhost:5173
VITE_API_URL=https://minha-api/api/v1 docker compose up --build   # outra API
```

A URL da API é embutida no bundle em tempo de build, então mudou a URL, rebuilde.
O CORS do back deve liberar a origem do front (`app.cors.allowed-origins`; o padrão já inclui `http://localhost:5173`).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |

## Deploy

`.github/workflows/deploy-pages.yml` publica o `dist/` no GitHub Pages a cada push em `main`
(HashRouter + base relativa, funciona em qualquer subcaminho). O build do Pages usa a API de produção padrão;
defina a variável `VITE_API_URL` no workflow se precisar de outra.
