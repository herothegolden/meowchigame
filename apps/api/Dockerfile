# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Prisma on Alpine (musl) needs OpenSSL 1.1 compatibility libs
RUN apk add --no-cache openssl1.1-compat

# Install deps for THIS directory (apps/api)
COPY package.json tsconfig.json ./
RUN npm install

# Copy source and Prisma schema
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/main.js"]
