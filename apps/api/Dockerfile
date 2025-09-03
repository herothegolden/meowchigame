FROM node:20-alpine AS base
WORKDIR /app

# Copy the app manifest
COPY package.json ./

# Install pnpm and dependencies (no lockfile required here)
RUN npm i -g pnpm@9
RUN pnpm i

# Copy the rest of the API source
COPY . .

# Build the API
RUN pnpm build

EXPOSE 8080
CMD ["node", "dist/main.js"]
