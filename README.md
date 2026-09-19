# Cloud IDE

A focused browser-based workspace for creating HTML, CSS, and JavaScript projects.

## Local setup

Prerequisites:

- Node.js 24.x
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
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` when enabling Google OAuth

Generate a local secret with:

```bash
openssl rand -base64 32
```

The included `docker-compose.yml` supplies local PostgreSQL settings matching `.env.example`. It is development-only: its credentials, exposed database port, and local volume must not be used for production. Use managed PostgreSQL and deployment-managed environment variables in production.

## Deployment notes

Deploy on a Node.js 24 host with a managed PostgreSQL database. Dependencies run Prisma Client generation automatically during installation; build and release with:

```bash
npm ci
npm run db:deploy
npm run build
npm run start
```

`DATABASE_URL` and `AUTH_SECRET` are secrets. Use a production PostgreSQL URL rather than the local Docker URL, retain a stable high-entropy `AUTH_SECRET`, and configure `AUTH_TRUST_HOST=true` only behind a trusted proxy that provides a correct host header.

To enable Google OAuth, create a Google OAuth web client and add `https://your-domain/api/auth/callback/google` as an authorized redirect URI. Store its client ID in `AUTH_GOOGLE_ID` and its client secret in `AUTH_GOOGLE_SECRET` as deployment-managed secrets.

ZIP import accepts archives up to 8 MB. Configure the hosting platform or reverse proxy request-body limit above 8 MB so the application can apply its archive validation itself.

Normal application and API routes send production security headers. The preview routes intentionally retain their route-specific CSP and sandbox headers so user project JavaScript stays isolated. The application CSP permits inline scripts, inline styles, and eval for Next.js and Monaco compatibility; a nonce-based CSP can be evaluated in a future hardening pass.

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

Login, registration, and ZIP import throttling use the current process-local rate-limit store. It resets when the process restarts, and separate application instances do not share buckets. This is appropriate for a single private/test deployment, but horizontally scaled production deployments need a shared store such as Redis so limits apply consistently across instances.

## Dependency note

The project currently uses an Auth.js beta release. Authentication behavior is unchanged, but upgrade to a stable supported Auth.js release should be evaluated before an internet-facing production launch.
