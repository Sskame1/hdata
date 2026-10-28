# HData

Медиатека + магазин приложений + манга. Next.js 16.2 (frontend) + NestJS 11 (backend) + PostgreSQL 17 + MinIO (S3).

> Есть отдельный `frontend/AGENTS.md` — всегда читай его перед работой с фронтом.
> Полная документация в `docs/` (architecture.md, frontend.md, backend.md).

## Запреты

!!!Работать с postgresql можно НО читать что там хранится нельзя!!!

## Структура

```
root/
├── frontend/       Next.js 16 App Router, React 19, TS 5, Tailwind v4
│   ├── app/        Страницы (/, /media, /shop, /manga, /sorting, /stat)
│   ├── app/api/    JSON-based fallback API (работает без бэкенда)
│   ├── features/   Dashboard, Media, Manga, ShopApp, Sorting, Stat, Organize
│   ├── lib/        api.ts, types.ts, store.ts
│   └── components/ FilterDropdown, etc.
├── backend/        NestJS 11, Prisma 6, sharp, fluent-ffmpeg
│   ├── prisma/     schema.prisma (12 моделей)
│   └── src/        tags, collections, files, links, apps, manga, minio, prisma
└── docker-compose.yml  postgres:5432 + minio:9000/9001 + backend:4000 + frontend:3000
```

## Команды

```bash
# Фронт (один, без бэкенда) — работает на JSON-файлах в app/api/
cd frontend && npm run dev     # next dev -H 0.0.0.0 :3000
npm run lint                   # eslint (перед коммитом)
npm run build                  # next build

# Бэкенд (требует postgres + minio запущенных)
cd backend
npm run start:dev              # nest start --watch :4000
npx prisma generate            # после изменений schema.prisma
npx prisma migrate dev         # создать миграцию
npx prisma db push             # синхронизация без миграции

# Полный стек
docker compose up --build      # из корня
```

## Ключевые архитектурные детали

- **Upload bypass**: загрузка файлов идёт напрямую на `BACKEND_BASE` (порт 4000), минуя Next.js proxy (лимит 10MB / таймаут). Чтение и CRUD — через Next.js rewrite `/api/backend/*` → `backend:4000`.
- **Два режима фронта**: `NEXT_PUBLIC_API_URL` не задан → использует `app/api/` (JSON fallback, только tags/collections/groups). Задан → идёт в реальный бэкенд.
- **Превью** генерируются автоматически при загрузке: img/gif через sharp (300×300), video через fluent-ffmpeg (первый кадр).
- **AND-фильтрация**: если выбраны теги A и B — только файлы с обоими.
- **Prisma**: `onDelete: Cascade` на junction-таблицах, BigInt сериализуется через monkey-patch в `backend/src/main.ts`.
- **ffmpeg + poppler-utils** обязательны для видео/PDF — устанавливаются в Dockerfile бэкенда.
- **MinIO bucket `hdata`**: `img/{uuid}.ext`, `gif/{uuid}.gif`, `gif/thumbnails/{uuid}.jpg`, `video/{uuid}.mp4`, `video/thumbnails/{uuid}.jpg`, `app/{name}/...`, `manga/{id}/...`.
- **Все feature-компоненты** — `"use client"`, состояние на `useState`, нет внешних сторов.
- **Tailwind v4**: `@import "tailwindcss"` (не `@tailwind`).

## Next.js 16 — нестандартный

Перед написанием кода читай `node_modules/next/dist/docs/`. API, конвенции и структура файлов могут отличаться от документации.

## TODO

См. `TODO.md` в корне.
