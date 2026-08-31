# Cloud IDE

A focused browser-based workspace for creating HTML, CSS, and JavaScript projects.

## Local setup

Prerequisites:

- Node.js 20 or later
- Docker Desktop, or an available PostgreSQL database

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Open `http://localhost:3000` in a browser.

The repository includes committed Prisma migrations. Use `npm run db:deploy` when setting up a fresh clone. `npm run db:migrate` is for creating a new migration during development after intentionally changing the Prisma schema.

## Environment configuration

Copy `.env.example` to `.env` before running the app. Configure:

- `DATABASE_URL` for PostgreSQL
- `AUTH_SECRET` with a high-entropy secret
- `AUTH_TRUST_HOST=true` for local and deployed Auth.js hosts

Generate a local secret with:

```bash
openssl rand -base64 32
```

The included `docker-compose.yml` supplies local PostgreSQL settings matching `.env.example`. For production, use managed PostgreSQL and set the same variables in the deployment environment.

## Verification

Run the automated regression suites:

```bash
npm run test:account-uniqueness
npm run test:concurrency
npm run test:medium-low
npm run test:zip-import
```

Run static and production checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Included features

- Account entry and editable profile
- Project dashboard with search, sorting, rename, duplication, deletion, and recent metadata
- Blank, portfolio, landing page, and JavaScript app templates
- Nested file and folder explorer with create, rename, delete, and collapse controls
- Monaco multi-tab editing with language-aware HTML, CSS, JavaScript, JSON, and Markdown modes
- Auto-persisted workspaces, unsaved indicators, and keyboard save/preview shortcuts
- Sandboxed live preview with desktop, tablet, mobile, refresh, and external-window modes
- Public/private share controls and shareable project links
- ZIP import/export with path validation, archive/file limits, and static image/font preservation
- Persistent dark/light preference

## Architecture

- Prisma persists users, projects, nested project files, visibility, and public share identifiers in PostgreSQL.
- Auth.js uses securely hashed credentials and signed JWT sessions.
- Every private project API checks the authenticated owner before loading or mutating records.
- ZIP import is processed on the server with archive, path, nesting, entry-count, and size limits.
- Project source is stored in PostgreSQL for Version 1. Browser storage is used only for the non-sensitive light/dark preference.

## Rate-limit deployment note

Login, registration, and ZIP import throttling use the current process-local rate-limit store. This is appropriate for a single Node.js deployment, but production deployments with multiple instances should replace it with a shared store such as Redis so limits apply consistently across instances.
