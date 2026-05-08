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
| frontend | `npm run dev` | Port 3000 |
| frontend | `npm run build` | Static export to `out/` |
| frontend | `npm run lint` | ESLint (Next.js core-web-vitals + TS) |

For single test: `npm run test -- --testPathPattern=filename`

## Architecture

- **Backend entry**: `backend/src/main.ts` — CORS `*`, serves `/media` from `uploads/`
- **Modules**: `UploadModule` (CRUD + tags/collections/settings/sync/thumbnails) and `MediaModule` (file serving with subdirectory support)
- **Persistence**: JSON files in `uploads/` — no database. Files: `tags.json`, `file-tags.json`, `collections.json`, `file-collections.json`, `settings.json`
- **Frontend**: Next.js 16 App Router, Tailwind CSS v4 (`@import "tailwindcss"`), static export (`output: 'export'`, `trailingSlash: true`). Path alias `@/*`
- **API base** (frontend): `http://localhost:3001`
- **Upload limit**: 100 MB (multer config in controller)

## Key details

- **Backend ESLint**: type-aware (`tseslint.configs.recommendedTypeChecked`), `noImplicitAny: off`, `endOfLine: auto` for Prettier
- **Thumbnails**: ffmpeg required on PATH for video thumbnail generation (auto-triggered on upload)
- **No tests exist yet** for either package (Jest configured but no `*.spec.ts` files)
- **No CI/CD** configured
- **`uploads/`** is gitignored in backend; `out/` gitignored in frontend

## Docker

```bash
docker compose up --build
```

- Frontend nginx serves static files on port 80 AND proxies `/uploads/` and `/media/` to backend
- Backend relative URLs (`/media/...`), set via `API_URL=` env
- `docker-compose.yml` at repo root
- Access via `http://server.local` (add `127.0.0.1 server.local` to hosts)

For local dev without Docker: `npm run dev` in both packages, API uses `http://localhost:3001` directly.
