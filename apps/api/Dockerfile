# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install deps for the API workspace only
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
WORKDIR /app/apps/api
RUN npm ci || npm i

# Copy API source and prisma schema
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/main.js"]
