# JomDekan

Centralized academic resources, discussion, and tutoring platform for
Malaysian university students. Full-stack: React + TypeScript + Vite
frontend, Node.js + TypeScript + Express REST API, PostgreSQL database.

Read `docs/implementation-plan.md` for what's built vs. planned, and
`docs/architecture.md` for how the pieces fit together.

## Quick start

Full beginner walkthrough: **[docs/setup.md](docs/setup.md)**.

```bash
docker compose up --build -d         # Full stack: frontend + backend + Postgres + Redis

cd backend && cp .env.example .env && npm install
npm run migrate && npm run seed
npm run dev                          # http://localhost:3000

# new terminal
cd frontend && cp .env.example .env && npm install
npm run dev                          # http://localhost:5173
```

## Open in VS Code

1. **Install VS Code**: https://code.visualstudio.com/ if you don't
   have it.
2. **Open the project folder** — not a subfolder. From a terminal:

   ```bash
   code /path/to/jomdekan
   ```

   Or in VS Code: `File → Open Folder…` and pick the `jomdekan`
   folder (the one containing this `README.md`, `backend/`,
   `frontend/`, and `database/`).

3. **Install recommended extensions** when VS Code prompts you (or
   open the Extensions panel, ⇧⌘X / Ctrl+Shift+X, and install):
   - **ESLint** (`dbaeumer.vscode-eslint`)
   - **Prettier** (`esbenp.prettier-vscode`) — optional but recommended
   - **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
   - **PostgreSQL** or **SQLTools** — optional, for browsing the
     database from the editor

4. **Two integrated terminals** — this project is two servers plus a
   database, so run backend and frontend side by side:

   - Open a terminal: `` Ctrl+` `` (backtick) or `Terminal → New
     Terminal`.
   - Split it (the split-terminal icon, top-right of the terminal
     panel, or `Ctrl+Shift+5`) so you have two panes.
   - **Left pane:**
     ```bash
     cd backend
     npm run dev
     ```
   - **Right pane:**
     ```bash
     cd frontend
     npm run dev
     ```
   - Make sure `docker compose up -d postgres redis` (or a local Postgres) is running when starting Node locally
     first — see step 1 of `docs/setup.md`.

5. **Debugging in VS Code** (optional): a `.vscode/launch.json` is
   included so you can attach the debugger to the backend. Open the
   "Run and Debug" panel (⇧⌘D / Ctrl+Shift+D), pick **"Debug backend
   (tsx)"**, and press ▶. Set breakpoints in any `backend/src/**/*.ts`
   file by clicking left of the line number.

6. **Env files**: VS Code will show `backend/.env` and `frontend/.env`
   as regular files once you `cp .env.example .env` in each folder
   (see Quick start above). They're gitignored — never commit them.

7. Visit **http://localhost:5173** in your browser once both dev
   servers are running.

## Project layout

```
backend/     Express + TypeScript REST API (see docs/architecture.md)
frontend/    React + TypeScript + Vite SPA
database/    SQL schema, numbered migrations, seed data
docs/        Architecture, API reference, setup guide, traceability
docker-compose.yml   Local Postgres + Redis
```

## Scripts reference

| Task | Command |
|---|---|
| Run backend dev server | `npm --prefix backend run dev` |
| Run frontend dev server | `npm --prefix frontend run dev` |
| Apply DB migrations | `npm --prefix backend run migrate` |
| Seed sample data | `npm --prefix backend run seed` |
| Promote a user to admin | `npm --prefix backend run create-admin -- --email you@example.com` |
| Backend lint / typecheck / test / build | `npm --prefix backend run lint\|typecheck\|test\|build` |
| Frontend lint / typecheck / test / build | `npm --prefix frontend run lint\|typecheck\|test\|build` |
| Frontend E2E (Playwright) | `npm --prefix frontend run test:e2e` |

## Status

Milestone 0 (foundation) and the core of Milestone 1 (password
authentication, sessions, protected routes) are implemented and
tested. See `docs/implementation-plan.md` for the full milestone
breakdown and the exact next vertical slice.
