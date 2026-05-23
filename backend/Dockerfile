FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg openssl && \
    addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p uploads && chown -R appuser:appgroup uploads
USER appuser
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/src/main"]
