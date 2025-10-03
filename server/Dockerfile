# Runtime image that runs TypeScript directly with tsx (avoids typecheck during build)
FROM node:20-alpine
WORKDIR /app

# Install app dependencies (include dev to have tooling)
COPY package*.json ./
RUN npm ci

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


