FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json . 2>/dev/null || true
COPY pnpm-lock.yaml . 2>/dev/null || true
RUN npm i -g pnpm@9
COPY . .
RUN pnpm i --frozen-lockfile || pnpm i
RUN pnpm build
EXPOSE 8080
CMD ["node", "dist/main.js"]
