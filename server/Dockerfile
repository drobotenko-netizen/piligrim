# Runtime image that runs TypeScript directly with tsx (avoids typecheck during build)
FROM node:20-bullseye-slim
WORKDIR /app

# Install app dependencies (include dev to have tooling)
COPY package*.json ./
# Use npm install to avoid strict lockfile requirement (no local lockfile)
RUN npm install --omit=dev

# Ensure OpenSSL 1.1 is available for Prisma engines on Debian bullseye
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# App sources
COPY src ./src

# Install tsx runner
RUN npm i -g tsx@4.19.2 prisma@5.19.1

# SQLite data volume by default
RUN mkdir -p /data
VOLUME /data
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL="file:/data/dev.db"

EXPOSE 4000
CMD ["tsx", "src/index.ts"]


