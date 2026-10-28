# Бэкенд HData

## Стек

NestJS 11 + Prisma 6 + PostgreSQL 17 + MinIO (S3) + sharp + fluent-ffmpeg.

## Структура

```
backend/
├── prisma/
│   ├── schema.prisma           # Схема БД (4 файла миграций)
│   └── migrations/
├── src/
│   ├── main.ts                 # Точка входа, CORS, ValidationPipe, BigInt patch
│   ├── app.module.ts           # Корневой модуль (6 feature-модулей)
│   ├── prisma/                 # PrismaService (глобальный)
│   ├── minio/                  # MinioService (глобальный)
│   ├── tags/                   # CRUD тегов
│   ├── collections/            # CRUD коллекций
│   ├── files/                  # Файлы: список, загрузка, удаление, превью, кэш
│   ├── links/                  # Связи M:N (теги + коллекции + bulk)
│   ├── apps/                   # Приложения (магазин)
│   └── common/
│       └── thumbnails.ts       # Генерация превью (sharp + ffmpeg)
├── Dockerfile                  # apk add ffmpeg, npx prisma generate, nest build
├── .env                        # DATABASE_URL, MINIO_*
├── nest-cli.json               # deleteOutDir: true
└── tsconfig.json               # ES2021, commonjs, decorators
```

## Модули

### prisma (глобальный)

```typescript
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
```

`PrismaService` extends `PrismaClient`, подключается к PostgreSQL. Доступен во всех модулях без импорта.

### minio (глобальный)

```typescript
@Global()
@Module({ providers: [MinioService], exports: [MinioService] })
```

`MinioService` — обёртка над `minio` Client:
- `upload(key, stream, size, mimeType)` — запись в bucket
- `download(key)` — получение stream из bucket
- `downloadRange(key, start, end)` — частичная загрузка
- `stat(key)` — метаданные объекта
- `remove(key)` — удаление
- `list(prefix)` — список всех объектов
- `getUrl(key)` — публичный URL

При инициализации создаёт bucket `hdata`, если не существует.
Bucket и credentials из переменных окружения.

### tags

CRUD для тегов. `GET /tags`, `POST /tags`, `DELETE /tags?id=`.
DTO: `CreateTagDto { name: string, color?: string }` с class-validator.

### collections

CRUD для коллекций. `GET /collections`, `POST /collections`, `DELETE /collections?id=`.
DTO: `CreateCollectionDto { name: string }`.

### files

Основной модуль — работа с медиафайлами.

**Контроллер** (`files.controller.ts`):

| Метод | Путь | Описание |
|---|---|---|
| GET | `/files` | Список с фильтрацией (?type, ?tagIds, ?collectionIds) |
| GET | `/files/storage-stats` | Статистика диска (du/df) с кэшем 60с |
| GET | `/files/cache-stats` | Размер локального кэша |
| POST | `/files/clear-cache` | Очистка кэша |
| GET | `/files/:id` | Один файл |
| DELETE | `/files/:id` | Удаление (файл + превью из MinIO + запись из БД) |
| POST | `/files/upload` | Загрузка (multipart, 10GB лимит) |
| GET | `/files/:id/thumbnail` | Превью (stream) |
| GET | `/files/:id/download` | Скачивание (stream с кэшированием) |
| POST | `/files/:id/reprocess` | Переобработка видео (+transcode) |
| POST | `/files/regenerate-thumbnails` | Регенерация всех превью |
| POST | `/files/sync-from-storage` | Синхронизация из MinIO (создаёт записи для новых файлов) |

**Сервис** (`files.service.ts`):

- `list()` — Prisma запрос с фильтрацией по типу, тегам, коллекциям. Исключает ключи, содержащие `_thumb.jpg` или `/thumbnails/`.
- `upload()` — загрузка файла в MinIO + генерация превью:
  - **img**: sharp resize 300×300 → `{uuid}_thumb.jpg`
  - **gif**: sharp(animated: false) первый кадр → `gif/thumbnails/{uuid}.jpg`
  - **video**: ffmpeg screenshots → `video/thumbnails/{uuid}.jpg`, плюс `-movflags +faststart` для ускорения интернет-проигрывания
- `getLocalPath()` — кэширование файла из MinIO локально в `uploads/cache/`
- `reprocess()` — перекодировка видео через ffmpeg (опционально транскодинг в h264)
- `regenerateThumbnails()` — проверяет все превью, пересоздаёт отсутствующие
- `syncFromStorage()` — сканирует MinIO, создаёт записи в Prisma для файлов без записи

### links

Управление связями M:N:

| Метод | Путь | Описание |
|---|---|---|
| GET | `/tags-media` | Все связи тег↔файл |
| POST | `/tags-media` | Создать связь |
| DELETE | `/tags-media` | Удалить связь |
| POST | `/tags-media/bulk` | Массовое связывание |
| GET | `/collections-media` | Все связи коллекция↔файл |
| POST | `/collections-media` | Создать связь |
| DELETE | `/collections-media` | Удалить связь |
| POST | `/collections-media/bulk` | Массовое связывание |

`bulkLink` в `links.service.ts`:
1. Получает существующие связи
2. Вычисляет недостающие
3. `createMany` новых
4. Возвращает количество созданных

### apps

Приложения для магазина:

| Метод | Путь | Описание |
|---|---|---|
| GET | `/apps` | Все приложения (с included screenshots, videos, downloads) |
| GET | `/apps/:id` | Одно приложение |
| POST | `/apps` | Создать (multipart: cover + screenshots + videos + files) |
| DELETE | `/apps/:id` | Удалить (все файлы из MinIO + запись из БД) |
| GET | `/apps/:id/download/:downloadId` | Скачать файл приложения |
| GET | `/apps/:id/media/:type/:mediaId` | Скриншот/видео (stream) |
| GET | `/apps/:id/cover` | Обложка (stream) |

Загрузка файлов приложения в MinIO: `app/{name}/screenshots/`, `app/{name}/videos/`, `app/{name}/downloads/`.

### common/thumbnails.ts

Три функции генерации превью:

1. **`generateImageThumbnail(buffer, objectKey, minio)`** — sharp resize 300×300, JPEG 80%, upload в MinIO
2. **`generateGifThumbnail(buffer, objectKey, minio)`** — sharp(animated: false), первый кадр, JPEG
3. **`generateVideoThumbnail(tmpPath, objectKey, minio)`** — ffmpeg screenshots + `ffprobe` для длительности

## Точка входа (`main.ts`)

```typescript
BigInt.prototype.toJSON = function() { return Number(this); };  // сериализация BigInt

app.enableCors({ origin: true });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.listen(process.env.PORT ?? 4000);
```

## Dockerfile

Двухстадийная сборка на `node:22-alpine`:
1. Builder: `apk add ffmpeg` → `npm ci` → `npx prisma generate` → `nest build`
2. Production: `apk add ffmpeg` → копирует `dist/`, `node_modules/`, `prisma/`

## .env (локальный)

```
PORT=4000
DATABASE_URL=postgresql://hdata:hdata@localhost:5432/hdata
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=hdata
```

## Команды

```bash
cd backend
npm run start:dev           # nest start --watch :4000
npx prisma generate         # после изменений schema.prisma
npx prisma migrate dev      # создать миграцию
npx prisma db push          # синхронизация схемы без миграции
```
