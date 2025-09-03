# Meowchi Mini App — Starter Monorepo

A Telegram Mini App scaffold with:
- **apps/web** — React + Vite + TypeScript (Telegram WebApp bridge + 4-tab shell + Play FAB).
- **apps/api** — Fastify + TypeScript (Telegram `initData` verification, modular routes).
- **packages/config** — shared ESLint / Prettier / TS configs.
- **docker-compose** — local Postgres + Redis + API + Web.
- **CI** — GitHub Actions: lint, typecheck, build.

## Quick Start

```bash
# 1) Prereqs: Node 20+, Docker, pnpm (or npm/yarn)
corepack enable    # enables pnpm if not already

# 2) Install deps
pnpm i

# 3) Copy env templates
cp apps/api/.env.example apps/api/.env

# 4) Run via Docker (DB + Redis + API) in one terminal
docker compose up -d

# 5) Run API locally (hot reload)
pnpm --filter @meowchi/api dev

# 6) Run Web locally (Vite)
pnpm --filter @meowchi/web dev
```

Open the web app via the Telegram Mini App webview (or directly in browser for local dev).

## Environment Variables (API)
See `apps/api/.env.example`. You **must** set `BOT_TOKEN` to verify Telegram `initData`.

## Structure
```
meowchi-miniapp/
  apps/
    web/      # React + Vite + TS
    api/      # Fastify + TS
  packages/
    config/   # shared configs (eslint, prettier, tsconfig)
  .github/workflows/ci.yml
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
```

## License
MIT — replace as needed.
