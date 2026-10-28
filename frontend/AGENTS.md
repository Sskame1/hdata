!!!Работать с postgresql можно НО читать что там хранится нельзя!!!

> См. `docs/` в корне проекта — архитектура, описание фронта и бэкенда.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HData

Хранилище медиа (img/gif/video) и ПО (.apk/.exe) с веб-интерфейсом, тегами, коллекциями и S3-совместимым хранилищем.

## Stack

| Слой | Технологии |
|---|---|
| Frontend | Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5.9, Tailwind CSS v4 |
| Backend | NestJS 11, Prisma 6, PostgreSQL 17, MinIO (S3), sharp, fluent-ffmpeg |
| Инфра | Docker Compose (postgres + minio + backend + frontend) |

## Commands

```bash
# Frontend
cd frontend
npm run dev      # next dev
npm run build    # next build
npm run lint     # eslint

# Backend
cd backend
npm run start:dev    # nest start --watch
npm run build        # nest build
npx prisma generate  # после изменений schema.prisma
npx prisma migrate dev  # создать миграцию
npx prisma db push      # синхронизировать схему без миграции

# Полный запуск (из корня)
docker compose up --build
```

## Структура проекта

```
D:\Git\HData\
├── docker-compose.yml   # postgres :5432 + minio :9000/:9001 + backend :4000 + frontend :3000
├── frontend/
│   ├── app/             # Next.js pages (/, /media, /shop)
│   ├── features/
│   │   ├── Dashboard/   # Landing с карточками-ссылками
│   │   ├── Media/       # Медиатека: grid, фильтры по типу/тегам/коллекциям, модалка
│   │   │   └── mediaData.ts   # Статический массив items (временно), будет заменён на API
│   │   └── ShopApp/     # Магазин приложений
│   ├── components/
│   │   └── FilterDropdown.tsx  # Мультиселект с поиском (теги/коллекции)
│   └── lib/
│       ├── api.ts       # API-клиент с настраиваемым API_BASE, все эндпоинты типизированы
│       ├── types.ts     # Tag, Collection, MediaItem, Tab…
│       └── store.ts     # Серверная read/write JSON (для встроенных API-роутов)
└── backend/
    ├── prisma/
    │   └── schema.prisma  # 6 таблиц: File, Tag, FileTag, Collection, FileCollection, App
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── prisma/       # PrismaService (подключение к PostgreSQL)
        ├── minio/        # MinioService (загрузка/скачивание/удаление из S3)
        ├── tags/         # GET/POST/DELETE /tags
        ├── collections/  # GET/POST/DELETE /collections
        ├── files/        # GET /files, POST /files/upload, GET /files/:id/thumbnail, DELETE
        ├── links/        # GET/POST/DELETE /tags-media и /collections-media
        ├── apps/         # CRUD /apps + multipart upload
        └── common/
            └── thumbnails.ts  # sharp (img/gif) + fluent-ffmpeg (video) → превью 300×300
```

## MinIO архитектура (bucket: hdata)

```
img/{uuid}.ext               # оригинал
gif/{uuid}.gif               # оригинал
gif/thumbnails/{uuid}.jpg    # превью
video/{uuid}.mp4             # оригинал
video/thumbnails/{uuid}.jpg  # превью (первый кадр)
app/{name}/{file}.apk        # файл приложения
app/{name}/img/{uuid}.jpg    # иконка/превью приложения
```

## API эндпоинты (backend :4000)

```
GET    /tags                          → Tag[]
POST   /tags            { name, color? } → Tag
DELETE /tags?id=                       → { ok }
GET    /tags-media                     → TagMedia[]
POST   /tags-media     { media, tagId }  → { ok }
DELETE /tags-media?media=&tagId=       → { ok }
GET    /collections                    → Collection[]
POST   /collections   { name }          → Collection
DELETE /collections?id=                → { ok }
GET    /collections-media              → CollectionMedia[]
POST   /collections-media { media, collectionId } → { ok }
DELETE /collections-media?media=&collectionId=   → { ok }
GET    /files?type=&tagIds=&collectionIds=  → File[]
POST   /files/upload   (multipart: file, query: type) → { id, path, thumbnail? }
GET    /files/:id                      → File
DELETE /files/:id                      → { ok }
GET    /files/:id/thumbnail            → image/jpeg (stream)
GET    /files/:id/download             → file stream
GET    /apps                           → App[]
POST   /apps          (multipart: file + image + fields) → App
GET    /apps/:id                       → App
DELETE /apps/:id                       → { ok }
GET    /apps/:id/download              → file download
```

## Ключевые архитектурные решения

- **API_BASE** в `lib/api.ts` настраивается через `NEXT_PUBLIC_API_URL` — достаточно сменить URL, чтобы фронт работал с удалённым бэкендом
- **Теги и коллекции** используют таблицы связей `file_tags` / `file_collections` (M:N)
- **AND-фильтрация** — если выбраны теги A и B, показываются только файлы, у которых есть оба
- **Превью** генерируются автоматически при загрузке: для img/gif через sharp (resize 300×300), для video через fluent-ffmpeg (первый кадр)
- **JSON-файлы** в `frontend/data/` — временное локальное хранилище для тегов/коллекций, пока бэкенд не запущен. Фронтенд может работать и без бэкенда через встроенные API-роуты Next.js (`app/api/`)

## Workflow

- Пользователь пишет логику; агент полирует, правит баги, ассистирует по запросу
- `npm run lint` перед коммитом (фронт)
- `npx prisma generate` после изменений схемы
- `docker compose up --build` для полного теста
