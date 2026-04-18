# Candlebox Production Builder

A monday.com board-view app that powers Candlebox's gift box production workflow. Staff use it directly inside monday.com to submit new candle kit orders and manage the fragrance library.

---

## What this app does

The app surfaces as a panel inside a monday.com board view and has two tabs:

| Tab | Purpose |
|---|---|
| **New Order** | Choose 3 distinct fragrances, enter customer contact fields (first/last name, optional company, email, optional phone, address), kit quantity, and optional inscription, then submit. Submitting creates a new item on the `Production Orders` monday board via GraphQL and stamps **Order received** with the current date/time. |
| **Manage Fragrances** | Add, edit, and delete fragrances from the internal library. The library is what populates the dropdowns on the New Order tab. |

After an order item is created, a monday automation fires a webhook at the backend. The backend calculates an SLA due date (`ceil(quantity / 10)` business days from today), stamps the item's `Order Complete Date` column, and sets its status to **In Queue**.

---

## Architecture overview

**Local development**
```
monday iframe → tunnel (8301) → Vite dev server → Vite proxy → Fastify (3001)
                                                                      │
                                                               monday SecureStorage
                                                               monday GraphQL API
```

**Production**
```
monday iframe → monday CDN (React bundle) → Fastify on monday code
                                                    │
                                             monday SecureStorage
                                             monday GraphQL API
```

**Frontend** (`src/`) — React 18, TypeScript, Vite, `@vibe/core` component library, `monday-sdk-js` for context, session tokens, and direct GraphQL mutations.

**Backend** (`server/src/`) — Fastify server, TypeScript compiled with `tsc`, `zod` for request validation, `jsonwebtoken` for verifying monday session tokens.

**Data storage** — Fragrances are stored in `@mondaycom/apps-sdk` `SecureStorage` under the key `fragrances:index`. On first read the store is automatically seeded with 8 default fragrances. Orders are written directly to the monday board and never stored locally.

---

## Prerequisites

- **Node.js** ≥ 18
- **monday.com account** with developer access
- **monday apps CLI** (`@mondaycom/apps-cli`) — already a dev-dependency, available as `mapps` via `npx` or after `npm install`

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

The `.env.local` file is for **local development only**. The only values you should need to change are:

| Variable | Description |
|---|---|
| `VITE_SERVER_BASE_URL` | The tunnel URL printed when `npm start` runs (e.g. `https://460d9306c754.apps-tunnel.monday.app`). Points the React app at the backend. In production this is passed inline at build time — see [Deploying](#deploying). |
| `TUNNEL_SUBDOMAIN` | Set this to the subdomain portion of your tunnel URL (e.g. `460d9306c754`) to keep the URL stable across restarts. Leave blank to get a random one each run. |

`SKIP_AUTH=true` and `SERVER_PORT=3001` are pre-set in `.env.local.example` and should not need changing for local dev.

The board ID and SLA column IDs are hardcoded in source (`src/config.ts` and `server/src/index.ts`). If the board schema changes, update them there.

### 3. Link to the monday app

Run the initialisation wizard once to authenticate the CLI and connect to the app:

```bash
npx mapps init -l
```

This stores credentials in `.mappsrc` so that tunnel and deploy commands work.

---

## Running locally

```bash
npm start
```

This single command does three things in parallel:

1. **Vite dev server** (port `8301`) — serves the React app with hot-module reload.
2. **mapps tunnel** — creates a public HTTPS URL that proxies to port `8301`. The URL is printed in the terminal.
3. **Fastify server** (port `3001`) — runs the backend API with `tsx watch` so it restarts on file changes.

> Port cleanup runs first (`kill-port`) so stale processes from a previous run won't block startup.

**How the API routing works locally:** `VITE_SERVER_BASE_URL` is set to the tunnel URL (not `localhost:3001`). When the React app running inside monday makes an API call, the request travels: monday iframe → tunnel → Vite dev server → Vite proxy (`/fragrances`, `/webhooks`, `/health`) → Fastify on port `3001`. This is why `VITE_SERVER_BASE_URL` points at the tunnel rather than directly at the backend.

### Pointing monday to your local app

1. Open monday.com → Developers → Your App → Build → Features → Board View.
2. Set the deployment type to **External hosting** and paste your tunnel URL.
3. Open any board, add the app as a board view, and the app will load inside monday.

---

## Project structure

```
candlebox-operations/
├── src/                        # React frontend
│   ├── App.tsx                 # Root component, tab router, data loading
│   ├── config.ts               # Server base URL (from env at build time) and hardcoded board/column IDs
│   ├── init.ts                 # monday SDK initialisation
│   ├── api/
│   │   └── fragranceApi.ts     # HTTP client for /fragrances endpoints
│   ├── components/
│   │   ├── NewOrderTab.tsx     # Order form (3 fragrance pickers + details)
│   │   └── ManageFragrancesTab.tsx  # Fragrance CRUD table + form
│   ├── lib/
│   │   └── monday.ts           # monday SDK wrapper, GraphQL mutations
│   └── types/
│       └── fragrance.ts        # Shared TypeScript types
│
├── server/src/                 # Fastify backend
│   ├── index.ts                # Route definitions
│   ├── auth.ts                 # JWT middleware (requireSessionToken)
│   ├── config.ts               # Port config and client secret accessor
│   ├── fragrance-store.ts      # SecureStorage read/write helpers
│   ├── fragrance.ts            # Fragrance TypeScript types
│   ├── schema.ts               # Zod validation schemas
│   ├── seed.ts                 # Default fragrance library (8 entries)
│   ├── sla.ts                  # SLA due-date calculation logic
│   └── monday-api.ts           # Server-side monday GraphQL helper
│
├── docs/
│   ├── ops-setup.md            # Board/column IDs, automation recipe, deploy notes
│   └── requirements.md         # Product requirements and feature notes
│
├── .env                        # Committed base config (no secrets); .env.local overrides locally
├── .env.local.example          # Template — copy to .env.local and fill in secrets
└── vite.config.ts              # Vite config (path aliases, proxy)
```

---

## Backend API reference

All `/fragrances` endpoints require a `Authorization: Bearer <monday-session-token>` header. The frontend gets this token automatically from `monday.get("sessionToken")`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check — returns `{ ok: true }`. No auth required. |
| `GET` | `/fragrances` | List all fragrances from SecureStorage. |
| `POST` | `/fragrances` | Create a new fragrance. Body: `{ name, description, category }`. |
| `PUT` | `/fragrances/:id` | Update an existing fragrance by UUID. Partial body accepted. |
| `DELETE` | `/fragrances/:id` | Delete a fragrance by UUID. Returns `204 No Content`. |
| `POST` | `/webhooks/sla` | Called by monday automation on item creation. Calculates and writes the SLA due date. |

### SLA webhook

The `/webhooks/sla` endpoint expects:

- **Header**: `x-monday-token` — the token monday sends with every webhook call.
- **Body**: `{ pulseId, boardId, userId?, inputFields? }`

It reads the `quantity` column of the new item, calculates the due date as `ceil(quantity / 10)` business days from today, then runs a GraphQL mutation to update `date_13` (due date) and `status` to `"In Queue"`.

---

## Authentication

The frontend calls `monday.get("sessionToken")` to obtain a short-lived JWT signed by monday, then attaches it as a `Bearer` token to every API request. The server verifies the signature using `MONDAY_CLIENT_SECRET`.

**Local development shortcut** — Set `SKIP_AUTH=true` in `.env.local` to bypass JWT verification entirely. Never use this in production.

---

## SLA logic

Located in `server/src/sla.ts`:

```
due date = today + ceil(quantity / 10) business days
```

Examples:
- 1–10 kits → 1 business day
- 11–20 kits → 2 business days
- 50 kits → 5 business days

Weekends are skipped. The calculation is pure TypeScript with no external dependencies and is easy to unit test.

---

## Deploying

The client (static bundle) and server are deployed separately to monday's hosting infrastructure. Order matters — deploy the server first so you have its URL before building the client.

### 1. Set the client secret in monday *(one time)*

`MONDAY_CLIENT_SECRET` lives in monday's encrypted Secrets store, not in a `.env` file.

```bash
npx mapps code:secret -i 11140006 -m set -k MONDAY_CLIENT_SECRET -v <your-client-secret>
```

### 2. Deploy the server

```bash
npm run deploy:server
```

The production server URL is visible in monday Developer Centre → Host on monday → Server-side code → General, or via:

```bash
npx mapps code:status -v 14083495
```

Current production server URL: `https://e807a-service-34720162-cb941312.us.monday.app`

### 3. Deploy the client

Pass the production server URL inline so it gets baked into the bundle without changing `.env`:

```bash
VITE_SERVER_BASE_URL=https://e807a-service-34720162-cb941312.us.monday.app npm run deploy:client
```

### 4. Switch the board view deployment type *(one time)*

In monday Developer Centre → Your App → Features → Board View → Deployment, change from **External hosting** to **Client-side code via CLI (mapps)**. Monday will now serve the app from its CDN instead of your tunnel. Only needs to be done once.

### 5. Update the SLA webhook URL *(one time)*

In the `Production Orders` board automation recipe, update the webhook URL to:

```
https://e807a-service-34720162-cb941312.us.monday.app/webhooks/sla
```

See `docs/ops-setup.md` for the automation recipe setup.

### Re-deploying after changes

```bash
# Server changes only
npm run deploy:server

# Client changes only
VITE_SERVER_BASE_URL=https://e807a-service-34720162-cb941312.us.monday.app npm run deploy:client
```

---

## Future Enhancements

- Lock scent profile editing on orders once they move into an in-progress production status.
- Add explicit versioning guidance for fragrance names (for example, `Red Rose v2`) when formulas evolve.
- Add a migration utility to normalize existing fragrance categories in storage against current board labels.

## Common issues

**"Unable to read monday context"** — The app is running outside a monday board view (e.g., opened directly in a browser tab). The monday SDK can only read context when embedded inside monday.com. Use the board view in your monday account to test.

**"Missing Bearer token" / 401 errors** — Either `SKIP_AUTH` is not `true` and `MONDAY_CLIENT_SECRET` is missing, or the frontend isn't running inside monday so it can't obtain a session token. Set `SKIP_AUTH=true` in `.env.local` for local testing.

**Ports already in use** — `npm start` runs `kill-port` first, but if that fails run `npm run stop` manually before restarting.

**Fragrances not loading** — Check that the backend server is running (`http://localhost:3001/health` should return `{"ok":true}`) and that `VITE_SERVER_BASE_URL` in `.env` is set to your tunnel URL (not `localhost:3001` — the React app can't reach localhost directly when running inside monday).

**Fragrance library is empty** — On first run the store seeds itself with 8 defaults automatically. If the list is empty after the server has started, the SecureStorage write may have failed — check the server logs for errors.
