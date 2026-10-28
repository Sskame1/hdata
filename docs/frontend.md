# Фронтенд HData

## Стек

Next.js 16.2.7 (App Router) + React 19.2.4 + TypeScript 5.9 + Tailwind CSS v4.

> **Важно**: Next.js 16 — нестандартная версия. Перед изменением читай `node_modules/next/dist/docs/`.

## Структура

```
frontend/
├── app/                    # Страницы и API-роуты Next.js
│   ├── page.tsx            # / → Dashboard
│   ├── media/page.tsx      # /media → Media (галерея)
│   ├── shop/page.tsx       # /shop → ShopApp (магазин)
│   ├── sorting/page.tsx    # /sorting → SortingPage (сортировка)
│   ├── layout.tsx          # RootLayout (Geist шрифты, тёмный фон)
│   ├── globals.css         # @import "tailwindcss"
│   └── api/                # JSON fallback (автономный режим)
│       ├── tags/route.ts
│       ├── collections/route.ts
│       ├── tags-media/route.ts
│       └── collections-media/route.ts
├── features/               # Клиентские компоненты ("use client")
│   ├── Dashboard/          # Landing + админ-панель
│   ├── Media/              # Медиатека + SortView
│   ├── ShopApp/            # Магазин приложений
│   └── Sorting/            # Обёртка загрузки + SortView
├── components/             # Переиспользуемые UI
│   └── FilterDropdown.tsx  # Универсальный мультиселект
├── lib/                    # Клиентская логика
│   ├── api.ts              # API-клиент (все эндпоинты)
│   ├── types.ts            # TypeScript-типы
│   └── store.ts            # Чтение/запись JSON (только сервер)
├── data/                   # JSON-файлы для fallback API
├── public/                 # Статика
├── next.config.ts          # Rewrite /api/backend/* → backend:4000
├── eslint.config.mjs       # eslint-config-next/core-web-vitals + ts
├── postcss.config.mjs      # @tailwindcss/postcss
└── tsconfig.json           # strict: true, paths: @/*
```

## Роутинг

| Путь | Компонент | Описание |
|---|---|---|
| `/` | `Dashboard` | Landing, ссылки на разделы, админ-панель |
| `/media` | `Media` | Галерея, фильтры, модалка, upload |
| `/sorting` | `SortingPage` + `SortView` | Сортировка/фильтрация, batch-операции |
| `/shop` | `ShopApp` | Магазин проектов с детальным модалом |
| `/api/backend/*` | rewrite → backend :4000 | Прокси к бэкенду |

## API-клиент (`lib/api.ts`)

### Два базовых URL

- **`API_BASE`** — для чтения/CRUD. Определяется из `NEXT_PUBLIC_API_URL`: если не задан → `"/api"` (локальные Route Handlers / rewrite), если задан → идёт напрямую к бэкенду.
- **`BACKEND_BASE`** — для upload и админ-операций. Всегда идёт на `hostname:4000` напрямую, минуя Next.js прокси (ограничение 10MB / таймаут).

### Модули эндпоинтов

| Модуль | Эндпоинты |
|---|---|
| `tagsApi` | list, create, delete |
| `collectionsApi` | list, create, delete |
| `tagMediaApi` | list, link, unlink, bulkLink |
| `collectionMediaApi` | list, link, unlink, bulkLink |
| `filesApi` | list, get, delete, upload, thumbnailUrl, downloadUrl, storageStats, cacheStats, clearCache, regenerateThumbnails, syncFromStorage |
| `appsApi` | list, get, create, delete, coverUrl, mediaUrl, downloadUrl |
| `loadAllMetadata()` | Параллельный запрос tags + collections + tagMedia + collectionMedia |

### Upload

```typescript
filesApi.upload(file, type) // → POST http://hostname:4000/files/upload?type=...
```
Формирует FormData и отправляет напрямую на BACKEND_BASE.
Тип определяется из расширения файла: `mp4/webm/mov → "video"`, `gif → "gif"`, иначе `"img"`.

## Компоненты

### `"use client"` — все feature-компоненты

Каждый компонент использует `useState` + `useEffect`. Нет внешних сторов (Redux, Zustand и т.д.).

### Media (533 строки)

Главная галерея:
- **Загрузка**: `filesApi.list()` + `loadAllMetadata()` при монтировании
- **Табы**: all / img / video / gif
- **Фильтры**: теги + коллекции с режимами AND/OR/NOT
- **Сортировка**: по дате / размеру, ↑↓
- **Upload**: drag-and-drop + input (прямо на бэкенд)
- **Drawer**: боковая панель для CRUD тегов/коллекций с поиском
- **Модалка**: предпросмотр с назначением тегов/коллекций
- **Blur**: переключатель из localStorage (`hdata:blurMedia`)

Все CRUD-операции → вызов API → `load()` (перезагрузка всего состояния).

### SortView (392 строки)

Пакетная обработка:
- **Мультиселект**: клик — выделить, двойной клик — предпросмотр
- **Bulk assign**: назначить теги/коллекции всем выделенным
- **Bulk delete**: массовое удаление
- **Фильтры**: No Tags, No Collections, коллекция (одиночный), теги (AND/OR/NOT)
- **Sticky bar**: снизу при выделении

### Dashboard (272 строки)

Landing:
- Карточки-ссылки на /media, /sorting, /shop
- Статистика: количество файлов, аппов
- Админ-панель: blur, регенерация превью, cache stats, S3 sync
- `Promise.all` для параллельной загрузки данных

### ShopApp (328 строк)

Магазин приложений:
- **Grid**: карточки с обложкой, названием, версией, размером
- **Поиск**: фильтрация по имени
- **Upload-модал**: multipart (cover, screenshots, videos, files)
- **Detail-модал**: превью, скриншоты, видео, скачивание, удаление
- `Escape` закрывает модалки

### FilterDropdown (75 строк)

Универсальный мультиселект:
- Generic-тип `Props<T extends { id: string }>`
- Поиск (фильтрация на клиенте)
- Checkbox UI
- Outside click → закрытие
- "Снять все" при выборе

## JSON fallback (`app/api/*`)

4 файла в `app/api/` — Next.js Route Handlers.

Каждый файл содержит GET/POST/DELETE, читает/пишет JSON через `lib/store.ts`:
```typescript
readJson<T>("filename.json", [])  // fs.readFile → JSON.parse
writeJson("filename.json", data)  // JSON.stringify → fs.writeFile
```

Особенности:
- ID генерируются как `String(Date.now())` (коллизии возможны, но для dev ок)
- DELETE каскадно чистит link-таблицы
- `tags-media` и `collections-media` принимают и `body.media`, и `body.fileId` для совместимости
- Нет авторизации/валидации

## Tailwind v4

- `@import "tailwindcss"` (не `@tailwind`)
- Тёмная тема: `bg-gray-950`, `border-gray-800`, `text-gray-100`
- Адаптив: `sm:`, `md:` префиксы
- Border и rounded-key дизайн

## Команды

```bash
cd frontend
npm run dev         # next dev -H 0.0.0.0 :3000
npm run build       # next build
npm run lint        # eslint (перед коммитом)
```
