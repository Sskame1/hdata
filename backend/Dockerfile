# Двухстадийная сборка NestJS бэкенда.
# Builder: ffmpeg + npm ci + prisma generate + nest build
# Runner: только dist + node_modules + prisma (для migrate deploy)
FROM node:22-alpine AS builder

RUN apk add --no-cache ffmpeg poppler-utils

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache ffmpeg poppler-utils
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 4000
CMD ["node", "dist/main"]
