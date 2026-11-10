# 🐻 오픈 샤봇 (ShaBot) Multi-Stage Dockerfile
# 치지직 스트리머용 방송 챗봇 & 통합 대시보드 올인원 이미지

FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install --no-audit --no-fund
RUN npm --prefix client install --no-audit --no-fund

COPY . .

RUN npm --prefix client run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=24700

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && mkdir -p /app/data

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/release.config.json ./release.config.json
COPY --from=builder /app/version.json ./version.json

VOLUME ["/app/data"]

EXPOSE 24700

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:24700/api/version || exit 1

CMD ["node", "server/server.js"]
