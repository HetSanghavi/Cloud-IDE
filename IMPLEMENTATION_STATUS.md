# Version 1 Implementation Status

| Requirement area | Status | Notes |
| --- | --- | --- |
| Next.js, React, TypeScript | Fully implemented | App Router project with typed client and server modules. |
| PostgreSQL persistence | Fully implemented | Prisma schema, committed migrations, and PostgreSQL Docker setup are included. A configured `DATABASE_URL` is required for each environment. |
| Authentication | Fully implemented | Auth.js credentials sessions, bcrypt password hashes, case-insensitive account uniqueness, registration/login feedback, logout, and profile updates are implemented. `AUTH_SECRET` is required per environment. |
| Project dashboard | Fully implemented | Create, open, search, sort, rename, delete, duplicate, and metadata are backed by authenticated APIs. |
| Templates | Fully implemented | Blank, portfolio, landing page, and JavaScript app starters are persisted on creation. |
| File and folder explorer | Fully implemented | Nested create, open, rename, move, delete, and expand/collapse persist through the workspace API. |
| Monaco editor and tabs | Fully implemented | Monaco language modes, tabs, unsaved state, built-in find/replace, themes, save shortcut, and editing are available. |
| Save/load | Fully implemented | Project workspace writes to PostgreSQL through an owner-authorized API. |
| Run and live preview | Fully implemented with a browser limitation | Sandboxed HTML/CSS/JS iframe preview, refresh, external preview, device modes, and in-IDE runtime/unhandled-rejection error reporting are included. Safari runtime-error forwarding remains unverified and has previously failed in manual Safari testing. |
| Responsive preview | Fully implemented | Desktop, tablet, and mobile viewports are available. Custom viewport entry is not implemented. |
| Project duplication | Fully implemented | Database clone creates independent project and file records. |
| ZIP import/export | Fully implemented | Server-side ZIP import/export with archive size, entry count, nesting, path, name, and project-size limits. |
| Sharing and public viewing | Fully implemented | Public/private database visibility, opaque share identifiers, read-only public viewer, and authenticated copy flow are implemented. |
| Dark/light theme | Fully implemented | Preference is persisted locally as non-sensitive UI configuration. |
| Security | Implemented with deployment limitations | Ownership checks, credential hashing, validation, path controls, ZIP limits, sandboxing, external-preview isolation, optimistic concurrency, and registration/import rate limiting are implemented. Production deployment still needs HTTPS, platform edge security headers, and a shared rate-limit store for multi-instance deployments. |
| Resizable panels | Fully implemented | Desktop and tablet layouts support draggable and keyboard-accessible editor/preview resizing with responsive minimum widths. |
| Automated validation | Passing locally | `test:account-uniqueness` (8 tests), `test:concurrency` (11 tests), `test:medium-low` (5 tests), `test:zip-import` (12 tests), typecheck, lint, and production build pass with dependencies and PostgreSQL configured. |

## Known limitations

- The login, registration, and ZIP import rate limiter is process-local. Multi-instance production deployments need a shared store such as Redis.
- Safari runtime errors in the sandboxed preview error tray remain unverified and require live Safari validation before being treated as supported.
- Full interactive browser QA is not automated in the current environment.
