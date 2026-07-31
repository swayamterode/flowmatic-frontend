# Flowmatic

Flowmatic is an AI workflow builder — wire up data sources, AI models, and
outreach steps on a visual canvas, then run and monitor the results from a
dashboard.

This repository is the **Next.js frontend**. It acts as a Backend-For-Frontend
(BFF) in front of a separate Spring Boot API: the browser only ever talks to
Next.js Route Handlers, which in turn call the Spring Boot backend server-side.
See [`CLAUDE.md`](./CLAUDE.md) for the full architecture rules this codebase
follows.

## Features

- **Auth** — login, signup, email verification via OTP, session refresh, and
  logout, backed by httpOnly cookies (no tokens in `localStorage`)
- **Dashboard** — execution stats, run duration, trigger breakdown, and
  failure-cause charts, plus recent activity
- **Workflow editor** — a node-based visual canvas (built on React Flow) with
  AI, email, datasource, and manual-trigger nodes, and live run/execution
  status
- **AI prompt refinement** — assisted prompt editing for AI nodes
- **File uploads** for workflow datasources

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) / Radix primitives
- [@xyflow/react](https://reactflow.dev) for the workflow canvas
- [Recharts](https://recharts.org) for dashboard charts
- ESLint + Prettier, enforced on commit via Husky + lint-staged

## Getting started

### Prerequisites

- Node.js and [pnpm](https://pnpm.io)
- A running instance of the Flowmatic Spring Boot backend

### Setup

```bash
pnpm install
cp .env.example .env.local
```

Set `SPRING_API_URL` in `.env.local` to your backend's base URL (e.g.
`http://localhost:8080`). This variable is server-only and must never be
prefixed with `NEXT_PUBLIC_` — the browser never calls Spring Boot directly.

### Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Start the Next.js dev server                   |
| `pnpm build`        | Build for production                           |
| `pnpm start`        | Start the production server                    |
| `pnpm lint`         | Run ESLint                                     |
| `pnpm format`       | Format all files with Prettier                 |
| `pnpm format:check` | Check formatting without writing changes       |
| `pnpm check`        | Run lint, format, and format:check in sequence |

## Contributing / committing

Husky runs `lint-staged` on every commit, auto-fixing and formatting staged
files. See [`COMMIT_GUIDE.md`](./COMMIT_GUIDE.md) for the full commit
workflow.

## Project structure

```
app/            Routes (App Router): pages + API route handlers (BFF layer)
components/     UI components, incl. dashboard/ and workflow/ (canvas + nodes)
features/       Feature-specific logic (e.g. prompt-refine)
lib/            API client, endpoint constants, auth/cookie helpers, utils
services/       Domain service layer, one file per module (auth, workflow, ...)
types/          Request/response types per module
```
