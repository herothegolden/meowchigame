# apps/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# System deps needed by Prisma on Alpine (musl)
RUN apk add --no-cache openssl libc6-compat

# Copy manifests first for better caching
COPY package.json ./

# Use npm (present by default) to install deps
RUN npm install --omit=dev

# Copy the rest of the API source
COPY . .

# Generate Prisma client (required at build-time)
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TypeScript -> dist
RUN npm run build

EXPOSE 8080

# Run migrations, then start the server (Fastify listens on $PORT)
CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"
