# HData Project

Monorepo: `backend/` (NestJS) and `frontend/` (Next.js). No root workspace.

## Run Commands

| Package | Command | Notes |
|---------|---------|-------|
| backend | `npm run start` | Port 3001 |
| backend | `npm run start:dev` | Watch mode |
| frontend | `npm run dev` | Port 3000 |
| frontend | `npm run dev:tunnel` | Dev with network-address (for phone access) |
| frontend | `npm run build` | Production build |

## Development Commands

```bash
# Backend
cd backend && npm run lint     # ESLint with --fix
cd backend && npm run test    # Jest all tests
cd backend && npm run test -- --testPathPattern=filename  # Single test file
cd backend && npm run format   # Prettier

# Frontend
cd frontend && npm run lint    # ESLint (2 warnings in codebase)
```

## Architecture

- **backend/src/main.ts**: NestJS entry, serves `/media` from `uploads/`, CORS origin: `*`
- **frontend/app/**: Next.js 16 App Router with Tailwind CSS v4
- **frontend/app/globals.css**: Tailwind CSS v4 (`@import "tailwindcss"`)

## Notes

- Backend: Jest (`test:watch`, `test:cov`, `test:e2e` available)
- Frontend uses `@tailwindcss/postcss` v4
- No typecheck script in either package (ESLint runs type-aware rules)
- **Termux**: Install ffmpeg via `pkg install ffmpeg` for thumbnail generation
