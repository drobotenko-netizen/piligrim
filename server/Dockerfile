# Runtime image that runs TypeScript directly with tsx (avoids typecheck during build)
FROM node:20-bookworm-slim
WORKDIR /app

# Install app dependencies (include dev to have tooling)
COPY package*.json ./
# Use npm install to avoid strict lockfile requirement (no local lockfile)
RUN npm install --omit=dev

# Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# App sources
COPY src ./src

# Install tsx runner
RUN npm i -g tsx@4.19.2

# SQLite data volume by default
RUN mkdir -p /data
VOLUME /data
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL="file:/data/dev.db"

EXPOSE 4000
CMD ["tsx", "src/index.ts"]


