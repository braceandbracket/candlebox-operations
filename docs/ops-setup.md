# Candlebox Ops Setup

## Installed board and column IDs

- Board: `Production Orders`
- Board ID: `18409136052`
- Column mapping used by app (defaults in `src/config.ts`; override with `VITE_MONDAY_COL_*` in `.env.local`):
  - Client first name: `text` (`VITE_MONDAY_COL_CLIENT_FIRST_NAME`)
  - Client last name: `text6` (`VITE_MONDAY_COL_CLIENT_LAST_NAME`)
  - Company name: `text_mm2h5g3q` (`VITE_MONDAY_COL_COMPANY`)
  - Client email (Email column): `email` (`VITE_MONDAY_COL_EMAIL`) — app sends `{ email, text }` for `email` / `email_*` column ids.
  - Client phone (Phone column): `phone` (`VITE_MONDAY_COL_PHONE`) — app sends 10-digit national number + `countryShortName: "US"`; New Order tab formats input as xxx-xxx-xxxx.
  - Client shipping address (Location column): `location` (`VITE_MONDAY_COL_ADDRESS`) — app sends `{ address }` for location columns.
  - Order received (date/time): `date_1` (`VITE_MONDAY_COL_ORDER_RECEIVED`)
  - Scent profiles: `dropdown` (`VITE_MONDAY_COL_SCENT_PROFILES`)
  - Quantity: `numbers` (`VITE_MONDAY_COL_QUANTITY`)
  - Inscription request: `text5` (`VITE_MONDAY_COL_INSCRIPTION`)
  - Status: `status` (set by board automation)
  - Order complete date (optional dashboard target): `date_13`

Confirm column ids in the board column menu; wrong ids will cause `create_item` to fail.

If your board differs, update `.env.local` (preferred) or `src/config.ts`.

## Automation recipes

Configure in monday UI:

### 1. Status on new order

1. Open `Production Orders` board.
2. Add automation: **When an item is created → set Status to "New Order"** (exact wording depends on monday’s recipe picker).
3. Save recipe.

### 2. Production tasks webhook

1. Open `Production Orders` board.
2. Add automation: **When an item is created, send a webhook**.
3. Webhook URL: `<server_base_url>/webhooks/production-tasks` (for local dev this is your tunneled server URL).
4. Save recipe.

Server expects:

- **First request (URL verification):** monday POSTs `{ "challenge": "..." }`. Server must reply **200** with `{ "challenge": "..." }` (same value). No `x-monday-token` on this call.
- **After that:** JSON body with `pulseId` and `boardId` (shape may vary). Request must include a signed `Authorization` JWT; server verifies signature using `MONDAY_SIGNING_SECRET` (or `MONDAY_CLIENT_SECRET` fallback). Server then calls monday GraphQL using **`MONDAY_API_TOKEN`** on the host (board recipes usually send no `x-monday-token`). Optional: `x-monday-token` if present.

The webhook reads scent profiles from the created order, then creates 3 sub-items:

- `Candle 1 - <Scent>`
- `Candle 2 - <Scent>`
- `Candle 3 - <Scent>`
- Posts a sub-item update note with the scent recipe from fragrance description

## Dashboard setup

Create a monday dashboard connected to `Production Orders`:

1. Numbers widget: count orders created this week.
2. Battery widget: group by `status`.
3. Chart widget: trend by `Order Complete Date` and status.

Recommended SLA chart:

- X axis: week (Order Complete Date)
- Metric: % items reaching final state by due date

### No-code SLA approximation

If you want SLA tracking without code:

1. Add Formula column `SLA Days`.
2. Formula: `ROUNDUP({Quantity}/10, 0)`.
3. Use this value in dashboard widgets to track expected throughput.

## Deployment notes

- Client deployed to CDN via `npm run deploy:client`
- Server deploy command: `npm run deploy:server`
- Check server deployment status: `mapps code:status -v 14083495`
