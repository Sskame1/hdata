# Архитектура HData

## Общая схема

```
Пользователь (браузер)
    │
    ├── Next.js :3000 (фронт)
    │     ├── [NEXT_PUBLIC_API_URL не задан] → app/api/* (JSON fallback, только теги/коллекции)
    │     └── [NEXT_PUBLIC_API_URL задан]    → напрямую к backend :4000
    │
    ├── Next.js rewrite /api/backend/* → backend :4000 (только чтение/CRUD)
    │
    └── Upload → BACKEND_BASE (http://host:4000, напрямую, минуя Next.js прокси)
```

Фронт работает в **двух режимах**:

1. **Автономный** — без бэкенда, `NEXT_PUBLIC_API_URL` не задан. Все вызовы API идут в `app/api/*` (Next.js Route Handlers), которые читают/пишут JSON-файлы в `frontend/data/`. Доступны только теги и коллекции.
2. **Полный стек** — с бэкендом. Для чтения/CRUD используется Next.js rewrite `/api/backend/*` → `backend:4000`. Для загрузки файлов (upload) и некоторых админ-операций — прямой вызов на `BACKEND_BASE` (порт 4000), минуя прокси Next.js (ограничение 10MB и таймаут).

## Компоненты

| Компонент | Технологии | Роль |
|---|---|---|
| frontend/ | Next.js 16, React 19, Tailwind CSS v4 | UI, маршрутизация, клиент API |
| backend/ | NestJS 11, Prisma 6 | REST API, бизнес-логика |
| PostgreSQL 17 | — | Основная БД (файлы, теги, коллекции, приложения) |
| MinIO | S3-совместимое хранилище | Файлы, превью, аппы — всё в bucket `hdata` |

## Поток загрузки файла

1. Пользователь выбирает файл в браузере
2. Фронт определяет тип из расширения: `img`, `gif`, `video`
3. `filesApi.upload()` → FormData → `POST http://hostname:4000/files/upload?type=X`
4. Backend сохраняет в MinIO (`img/{uuid}.ext`, `gif/{uuid}.gif`, `video/{uuid}.mp4` ...)
5. Параллельно генерируется превью:
   - **img/gif** — sharp resize 300×300 → JPEG
   - **video** — fluent-ffmpeg первый кадр → JPEG, плюс `ffmpeg -movflags +faststart` для оптимизации MP4
6. Запись в PostgreSQL (файл + путь + метаданные)

## Поток запроса к API (чтение)

1. Фронт вызывает `filesApi.list()` (`API_BASE/files?...`)
2. Если `NEXT_PUBLIC_API_URL` не задан → `API_BASE = "/api"` → Next.js rewrite `/api/backend/files` → `backend:4000/files`
3. Backend читает из PostgreSQL, возвращает JSON
4. Превью отдаются через `GET /files/:id/thumbnail` (stream из MinIO)

## AND-фильтрация

Теги и коллекции работают как M:N связи через junction-таблицы (`file_tags`, `file_collections`).

Когда выбраны несколько тегов, используем `some + in` в Prisma (один OR-фильтр на каждый тег). На фронте дополнительно есть три режима:

- **И (AND)** — файл должен содержать все выбранные теги
- **ИЛИ (OR)** — файл содержит хотя бы один
- **БЕЗ (NOT)** — файл не содержит ни одного

Реализация AND на бэкенде: `{ tags: { some: { tagId: { in: ids } } } }` — Prisma сама проверяет, что есть хотя бы один из. Чистый AND делается на уровне фронта дополнительной фильтрацией.

## Превью (thumbnails)

Генерируются **автоматически при загрузке** в `backend/src/common/thumbnails.ts`:

- **Image** (`img`): sharp → resize 300×300 cover → JPEG 80% → ключ `{uuid}_thumb.jpg`
- **GIF** (`gif`): sharp(animated: false) → берём первый кадр → JPEG → `gif/thumbnails/{uuid}.jpg`
- **Video** (`video`): fluent-ffmpeg screenshots → 300x? → JPEG → `video/thumbnails/{uuid}.jpg` + длительность

## MinIO bucket: `hdata`

```
img/{uuid}.ext
gif/{uuid}.gif
gif/thumbnails/{uuid}.jpg
video/{uuid}.mp4
video/thumbnails/{uuid}.jpg
app/{name}/screenshots/{uuid}.ext
app/{name}/videos/{uuid}.ext
app/{name}/downloads/{uuid}.ext
```

## Prisma

6 моделей + 3 для магазина приложений:

- `File` — медиафайлы (img/gif/video)
- `Tag` — теги (name, color)
- `FileTag` — M:N файл ↔ тег
- `Collection` — коллекции
- `FileCollection` — M:N файл ↔ коллекция
- `App`, `AppScreenshot`, `AppVideo`, `AppDownload` — приложения

Все junction-таблицы используют `onDelete: Cascade`.
BigInt сериализуется через monkey-patch в `main.ts`: `BigInt.prototype.toJSON = function() { return Number(this) }`.

## Docker Compose

```yaml
postgres:5432 — БД
minio:9000/9001 — S3 (API + Console)
backend:4000 — NestJS
frontend:3000 — Next.js
```

Фронт в Docker собирается с `NEXT_PUBLIC_API_URL=/api/backend`.
Бэкенд при старте выполняет `npx prisma migrate deploy && node dist/main`.

## JSON fallback (автономный режим)

В `frontend/app/api/` лежат 4 Next.js Route Handlers:

- `/api/tags`, `/api/collections` — CRUD для тегов/коллекций
- `/api/tags-media`, `/api/collections-media` — управление связями

Данные хранятся в `frontend/data/*.json`. Читаются/пишутся через `lib/store.ts` (fs.promises).
`files/` и `apps/` эндпоинты не имеют fallback — только через живой бэкенд.
