# Máy chủ chơi online (docs/ONLINE.md) — dùng cho Render / Railway / Fly.io / VPS có Docker. Không cần gói npm nào.
FROM node:22-alpine
WORKDIR /app
COPY src ./src
COPY server ./server
ENV NODE_ENV=production STATIC=0 PORT=8080
EXPOSE 8080
CMD ["node", "server/index.mjs"]
