# HData

Monorepo: `backend/` (NestJS 11) and `frontend/` (Next.js 16 App Router). No root workspace scripts.

## Commands

Each requires `cd backend` or `cd frontend` first.

| Package | Command | Notes |
|---------|---------|-------|
| backend | `npm run start` | Port 3001 |
| backend | `npm run start:dev` | Watch |
| backend | `npm run lint` | ESLint + Prettier --fix |
| backend | `npm run format` | Prettier `src/` `test/` |
| backend | `npm run test` | Jest (`rootDir: src`, `*.spec.ts`) |
| backend | `npm run test:e2e` | requires `test/jest-e2e.json` |
| backend | `npx prisma generate` | Regenerate Prisma client after schema changes |
| backend | `npx prisma migrate dev` | Create & apply migration during dev |
| frontend | `npm run dev` | Port 3000 |
| frontend | `npm run build` | Static export to `out/` |
| frontend | `npm run lint` | ESLint (Next.js core-web-vitals + TS) |

For single test: `npm run test -- --testPathPattern=filename`

## Architecture (v2)

### Storage

- **PostgreSQL** (Docker service `postgres:16-alpine`) — all metadata: files, tags, collections, settings
- **MinIO** (S3-compatible) — file storage, organized by type

MinIO bucket structure:
```
img/<filename>                    — images
video/<filename>                  — videos
video/thumbnails/<filename>.jpg   — video previews
gif/<filename>                    — GIFs
gif/thumbnails/<filename>.jpg     — GIF previews
doc/<filename>                    — documents (pdf, zip, etc.)
```

Files are stored in their final location from upload — **no copying/moving between collections**. Collections are virtual groupings in the database only.

### Backend modules

- **`DatabaseModule`** (`@Global()`) — PrismaService (Prisma 7)
- **`UploadModule`** — CRUD + tags/collections/settings/sync/thumbnails, uses PrismaService + S3Service
- **`MediaModule`** — file serving via catch-all `:path(*)` route, S3-only, supports Range requests (206 Partial Content)
- **`StorageModule`** — S3Service (MinIO via `@aws-sdk/client-s3`)

### Entry points

- `backend/src/main.ts` — CORS `*`, no express static (S3-only in Docker)
- `backend/src/main.ts` — uses `PORT ?? 3001`
- `backend/prisma/schema.prisma` — 6 models: File, Tag, Collection, FileTag, FileCollection, Settings

### API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads` | Upload file (multipart, 2000MB limit) |
| GET | `/uploads` | List all files with tags/collections |
| DELETE | `/uploads/:filename` | Delete file + thumbnail |
| GET | `/uploads/tags` | List tags |
| PUT | `/uploads/tags` | Save tags |
| PUT | `/uploads/:filename/tags` | Update file tags |
| GET | `/uploads/collections` | List collections (with count) |
| PUT | `/uploads/collections` | Save collections |
| PUT | `/uploads/:filename/collection` | Assign file to collection |
| GET | `/uploads/settings` | Get settings |
| PUT | `/uploads/settings` | Save settings |
| POST | `/uploads/thumbnail/:filename` | (Re)generate thumbnail |
| GET | `/uploads/sync` | Get sync data |
| POST | `/uploads/sync` | Compare hashes |
| GET | `/media/:path(*)` | Serve file (S3 key as path, Range-aware) |

### Frontend

Next.js 16 App Router, Tailwind CSS v4 (`@import "tailwindcss"`), static export (`output: 'export'`, `trailingSlash: true`). Path alias `@/*`
- API base: `http://localhost:3001`
- Uses `item.url` and `item.thumbnailUrl` from API (never constructs URLs manually)

## Key details

- **Backend**: NestJS 11, Prisma 7 (`@prisma/client` + `prisma` CLI), `@aws-sdk/client-s3`
- **Backend ESLint**: type-aware (`tseslint.configs.recommendedTypeChecked`), `noImplicitAny: off`, `endOfLine: auto` for Prettier
- **Thumbnails**: ffmpeg on PATH, auto-triggered on upload for video/gif (first frame, 320px wide)
- **No tests yet** (Jest configured but no `*.spec.ts` files)
- **`src/generated/`** is gitignored (Prisma client output)
- **`uploads/`** is gitignored

## Docker

```bash
docker compose up --build
```

Services:
- `postgres` (port 5432) — PostgreSQL 16
- `backend` (port 3001) — NestJS, depends on postgres + minio
- `frontend` (port 80) — nginx static, proxies `/uploads/` and `/media/` to backend
- `minio` (ports 9000, 9001) — S3-compatible storage
- `minio-init` — creates `hdata` bucket on first run

On startup, `npx prisma migrate deploy` runs automatically to apply any pending migrations.

Access via `http://server.local` (add `127.0.0.1 server.local` to hosts).

## Tools

| Tool | Description |
|------|-------------|
| `Tools/migration/migrate-to-v2.mjs` | One-time migration from JSON files + flat MinIO to v2 (DB + structured paths). Set S3 env vars. Add `--cleanup` to remove old flat objects. |
| `Tools/thumbnails/generate-gif-thumbnails.mjs` | Generate thumbnails for existing GIFs |
| `Tools/fetch/` | Download files by URL |
| `Tools/cleaner/` | Delete images in folder |
| `Tools/minio-admin/` | CLI for MinIO (ls, rm, mv, etc.) |
| `Tools/minio-web/` | Web UI for MinIO (port 4000) |
