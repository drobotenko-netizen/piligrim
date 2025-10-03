# Build and run the Express API (TypeScript) with Prisma
FROM node:20-alpine AS base
WORKDIR /app

# Install deps first (better layer caching)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy project sources
COPY server/tsconfig.json ./
COPY server/prisma ./prisma
COPY server/src ./src

# Generate Prisma client (uses schema from ./prisma)
RUN npx prisma generate

# Build TypeScript -> dist
RUN npm run build

# Final runtime image
FROM node:20-alpine
WORKDIR /app

# Create a place for the SQLite database by default
RUN mkdir -p /data
VOLUME /data

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL="file:/data/dev.db"

# Copy built app and prisma schema (for runtime client)
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/index.js"]


