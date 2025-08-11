# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and route handlers.
- `components/`: Reusable React components (prefer `PascalCase` folders/files).
- `lib/`, `services/`, `hooks/`: Core logic, service integrations, and custom hooks.
- `convex/`: Convex backend functions and generated types.
- `e2e/`: Playwright end‑to‑end tests (reports in `test-results/`).
- `public/`: Static assets. `scripts/`: Dev/ops scripts. `languages/` + `i18n/`: translations.

## Build, Test, and Development Commands
- `pnpm dev`: Run Next.js and Convex locally (see `dev:*` scripts).
- `pnpm build`: Build the app (use `build:t` for Turbo, `build:wp` for webpack fallback).
- `pnpm start`: Start a production build locally.
- `pnpm test`: Run Vitest in watch mode. `pnpm test:unit`: CI-friendly run.
- `pnpm test:coverage`: Unit test coverage (V8).
- `pnpm test:e2e`: Playwright tests (spins dev server via config).
- `pnpm lint`: ESLint via Next. `pnpm analyze`: Bundle analyzer.
- Env helpers: `pnpm env:validate`, `pnpm env:dev`, `pnpm sync-env`.

## Coding Style & Naming Conventions
- Formatting: Prettier (2 spaces, single quotes, no semicolons, width 100).
- Linting: ESLint (`next/core-web-vitals`, Prettier plugin). Fix before PR.
- Naming: Components `PascalCase` (`components/MyWidget.tsx`); hooks `useSomething` in `hooks/`.
- Routes: `app/feature/page.tsx`, server code in `app/api/*` or `convex/`.

## Testing Guidelines
- Unit: Vitest + React Testing Library (`*.test.ts|tsx`). Include files in `app/`, `components/`, `lib/`, `hooks/`, `services/`.
- Coverage: Global thresholds 70% lines/branches/functions/statements.
- E2E: Playwright in `e2e/` (config in `playwright.config.ts`). Use `test-results/` artifacts.
- Example: `pnpm test:coverage && pnpm test:e2e` before pushing.

## Commit & Pull Request Guidelines
- Commits: Conventional style — `feat(scope): ...`, `fix: ...`, `refactor: ...`, `docs: ...`.
- PRs: Clear description, linked issues, screenshots for UI, and notes for schema or env changes.
- CI Expectations: Lint passes, unit coverage ≥ 70%, Playwright suite green.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local` (see `.env.*` samples). Validate with `pnpm env:validate`.
- Backend services: Convex, Clerk, Stripe, and Supabase keys must be set for non-test runs.

## Architecture Overview
- Next.js App Router frontend + Convex serverless backend; Supabase and third‑party services for data/auth/payments; i18n via `next-intl` in `languages/`.
# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages/layouts/handlers (e.g., `app/[locale]/...`).
- `components/`: Reusable React UI (PascalCase, e.g., `components/MyWidget.tsx`).
- `lib/`, `services/`, `hooks/`: Core utilities, service clients, custom hooks.
- `convex/`: Convex backend functions and generated types.
- `e2e/`: Playwright tests (`test-results/` holds reports).
- `public/`: Static assets. `scripts/`: Dev/ops scripts. `languages/` + `i18n/`: translations.

## Build, Test, and Development Commands
- `pnpm dev`: Run Next.js + Convex locally (see `dev:*` scripts).
- `pnpm build`: Production build (use `build:t` for Turbo, `build:wp` for webpack fallback).
- `pnpm start`: Serve the production build.
- `pnpm test`: Vitest in watch mode. `pnpm test:unit`: CI-friendly run.
- `pnpm test:coverage`: Unit coverage (V8). `pnpm test:e2e`: Playwright suite.
- Linting: `pnpm lint`. Analyze bundles: `pnpm analyze`.

## Coding Style & Naming Conventions
- Formatting: Prettier (2 spaces, single quotes, no semicolons, width 100).
- Linting: ESLint (`next/core-web-vitals`, Prettier plugin). Fix before PR.
- Naming: Components in PascalCase; hooks as `useSomething` under `hooks/`.
- Routes: `app/feature/page.tsx`; server code in `app/api/*` or `convex/`.

## Testing Guidelines
- Unit: Vitest + React Testing Library for `app/`, `components/`, `lib/`, `hooks/`, `services/`.
- Coverage: Global thresholds ≥ 70% (lines/branches/functions/statements).
- E2E: Playwright (`e2e/`, config in `playwright.config.ts`).
- Typical run: `pnpm test:coverage && pnpm test:e2e` before pushing.

## Commit & Pull Request Guidelines
- Commits: Conventional commits (e.g., `feat(reservation): add coupon step`).
- PRs: Clear description, linked issues, screenshots for UI, and notes for schema/env changes.
- CI: Lint passes, unit coverage ≥ 70%, and Playwright green.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` (see `.env.*` samples). Validate via `pnpm env:validate`.
- External services: Convex, Clerk, Stripe, Supabase keys required for non-test runs.

## Architecture Overview
- Next.js App Router frontend + Convex serverless backend; Supabase/third‑party services for data/auth/payments; i18n via `next-intl` in `languages/`.
