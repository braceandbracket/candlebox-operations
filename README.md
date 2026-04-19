# Candlebox Production Builder

A monday.com board-view app that powers Candlebox's gift box production workflow. Staff use it directly inside monday.com to submit new candle kit orders and manage the fragrance library.

---

## What this app does

The app surfaces as a panel inside a monday.com board view and has two tabs:

| Tab | Purpose |
|---|---|
| **New Order** | Choose 3 distinct fragrances, enter customer contact fields (first/last name, optional company, email, optional phone, address), kit quantity, and optional inscription, then submit. Submitting creates a new item on the `Production Orders` monday board via GraphQL and stamps **Order received** with the current date/time. |
| **Manage Fragrances** | Add, edit, and delete fragrances from the internal library. The library is what populates the dropdowns on the New Order tab. |

After an order item is created, a monday automation fires a webhook at the backend. The backend reads the 3 selected scents, creates 3 production sub-items (one per candle), and posts recipe notes from the fragrance library descriptions.

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

`SERVER_PORT=3001` is pre-set in `.env.local.example` and should not need changing for local dev.

For auth, keep `SKIP_AUTH=false` for normal tunnel development. Set `SKIP_AUTH=true` only when testing backend endpoints outside the monday iframe. This bypass is disabled in production.

The board ID is configured in `src/config.ts` and can be overridden as needed; webhook scent column can be configured with `MONDAY_COL_SCENT_PROFILES`.

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
│       └── fragrance.ts        # Re-exported shared TypeScript types
│
├── server/src/                 # Fastify backend
│   ├── index.ts                # Route definitions
│   ├── auth.ts                 # JWT middleware (requireSessionToken)
│   ├── config.ts               # Port config and client secret accessor
│   ├── fragrance-store.ts      # SecureStorage read/write helpers
│   ├── fragrance.ts            # Re-exported shared TypeScript types
├── shared/
│   └── fragrance.ts            # Shared fragrance interfaces used by client + server
│
│   ├── schema.ts               # Zod validation schemas
│   ├── seed.ts                 # Default fragrance library (8 entries)
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
| `POST` | `/webhooks/production-tasks` | Called by monday automation on item creation. Creates 3 sub-items and posts recipe notes. |

### Production tasks webhook

The `/webhooks/production-tasks` endpoint expects:

- **URL setup (challenge):** monday may POST `{ "challenge": "<token>" }` once to verify the URL. Respond with **200** and body `{ "challenge": "<same token>" }`. No auth header on that request.
- **Real events — Auth**: Requests must include a signed `Authorization` JWT. The server verifies this using `MONDAY_SIGNING_SECRET` (or `MONDAY_CLIENT_SECRET` fallback) before doing any work.
- **GraphQL token resolution**: Board automations usually send no `x-monday-token`, so the server uses `MONDAY_API_TOKEN` from env for monday GraphQL. If monday sends `x-monday-token` or `Authorization`, that value wins.
- **Real events — Body**: `{ pulseId, boardId, userId?, inputFields? }` (or wrapped in `{ event: { ... } }` depending on recipe)

It reads the order's scent dropdown values, maps each scent to a fragrance description in SecureStorage, creates three sub-items (`Candle 1/2/3 - <Scent>`), and posts each scent recipe as an update on the sub-item.

---

## Authentication

The frontend calls `monday.get("sessionToken")` to obtain a short-lived JWT signed by monday, then attaches it as a `Bearer` token to every API request. The server verifies the signature using `MONDAY_CLIENT_SECRET`.

**Local development shortcut** — `SKIP_AUTH=true` only works when `NODE_ENV !== "production"`. This prevents accidental auth bypass in monday-code production runtimes.

### OAuth scopes required

Manifest scopes are audited for current behavior:

- `boards:read`
- `boards:write`
- `webhooks:read`
- `webhooks:write`
- `updates:write`
- `me:read`

---

## SLA tracking (no-code)

SLA tracking is configured directly in monday without backend code:

- Add Formula column `SLA Days` with `ROUNDUP({Quantity}/10, 0)`
- Use dashboard widgets against `Order Received`, `Order Complete Date`, and status for reporting

---

## Deploying

The client (static bundle) and server are deployed separately to monday's hosting infrastructure. Order matters — deploy the server first so you have its URL before building the client.

### 1. Set the client secret in monday *(one time)*

`MONDAY_CLIENT_SECRET` lives in monday's encrypted Secrets store, not in a `.env` file.

```bash
npx mapps code:secret -i  <monday-app-id> -m set -k MONDAY_CLIENT_SECRET -v <your-client-secret>
```

Also set **`MONDAY_API_TOKEN`** (personal API token with access to `Production Orders`) so board webhook automations can run GraphQL:

```bash
npx mapps code:secret -i  <monday-app-id> -m set -k MONDAY_API_TOKEN -v <your-api-token>
```

For local dev, put the same value in `.env.local` (see `.env.local.example`).

### 2. Deploy the server

```bash
npm run deploy:server
```

The production server URL is visible in monday Developer Centre → Host on monday → Server-side code → General, or via:

```bash
npx mapps code:status -v  <app-version-id>
```

### 3. Deploy the client

Pass the production server URL inline so it gets baked into the bundle without changing `.env`:

```bash
VITE_SERVER_BASE_URL=<production-server-url> npm run deploy:client
```

### 4. Switch the board view deployment type *(one time)*

In monday Developer Centre → Your App → Features → Board View → Deployment, change from **External hosting** to **Client-side code via CLI (mapps)**. Monday will now serve the app from its CDN instead of your tunnel. Only needs to be done once.

### 5. Update the production webhook URL *(one time)*

In the `Production Orders` board automation recipe, update the webhook URL to:

```
<production-server-url>/webhooks/production-tasks
```

See `docs/ops-setup.md` for the automation recipe setup.

### Re-deploying after changes

```bash
# Server changes only
npm run deploy:server

# Client changes only
VITE_SERVER_BASE_URL=<production-server-url> npm run deploy:client
```

---

## Future Enhancements

- Lock scent profile editing on orders once they move into an in-progress production status.
- Add explicit versioning guidance for fragrance names (for example, `Red Rose v2`) when formulas evolve.
- Add a migration utility to normalize existing fragrance categories in storage against current board labels.
- Add a automation to Product Orders borad when all sub items status's = done, then move the entire order to done.
- Add a new group in Product Orders for order that have shipped.
- Lock date columns once they change status to "Working on it"

## Common issues

**"Unable to read monday context"** — The app is running outside a monday board view (e.g., opened directly in a browser tab). The monday SDK can only read context when embedded inside monday.com. Use the board view in your monday account to test.

**"Missing Bearer token" / 401 errors** — Either `SKIP_AUTH` is `false` and `MONDAY_CLIENT_SECRET` is missing, or the frontend isn't running inside monday so it can't obtain a session token. Set `SKIP_AUTH=true` only for direct backend testing outside monday iframe.

**Ports already in use** — `npm start` runs `kill-port` first, but if that fails run `npm run stop` manually before restarting.

**Fragrances not loading** — Check that the backend server is running (`http://localhost:3001/health` should return `{"ok":true}`) and that `VITE_SERVER_BASE_URL` in `.env` is set to your tunnel URL (not `localhost:3001` — the React app can't reach localhost directly when running inside monday).

**Fragrance library is empty** — On first run the store seeds itself with 8 defaults automatically. If the list is empty after the server has started, the SecureStorage write may have failed — check the server logs for errors.
