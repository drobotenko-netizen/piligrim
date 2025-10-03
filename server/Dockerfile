# Build and run the Express API (TypeScript) with Prisma
FROM node:20-alpine AS deps
WORKDIR /app

# Install ALL deps for build (prisma etc.)
COPY package*.json ./
RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and transpile TS to JS without type-checking (SWC)
RUN npx prisma generate && npx -y @swc/cli@0.1.62 -p @swc/core@1.7.26 swc src -d dist -D --config '{"jsc":{"target":"es2021"},"module":{"type":"es6"}}'

# Production-only dependencies
FROM node:20-alpine AS proddeps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Final runtime image
FROM node:20-alpine
WORKDIR /app

# Place for SQLite database by default
RUN mkdir -p /data
VOLUME /data

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL="file:/data/dev.db"

# Copy production deps and built app
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/index.js"]


