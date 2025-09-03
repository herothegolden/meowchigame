# apps/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Prisma native engine needs these on Alpine (musl)
RUN apk add --no-cache openssl libc6-compat

# Copy manifest first for better layer caching
COPY package.json ./

# Install ALL deps (incl. dev) so tsc/prisma CLI exist at build time
RUN npm install

# Copy the rest of the source (TS, prisma, etc.)
COPY . .

# Generate Prisma client (required before building)
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TypeScript -> dist
RUN npm run build

# Slim the final image: keep only production deps
RUN npm prune --omit=dev

EXPOSE 8080

# Run migrations, then start Fastify
CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"
