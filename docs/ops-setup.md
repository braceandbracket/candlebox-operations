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
  - Client shipping address (Location column): `location` (`VITE_MONDAY_COL_ADDRESS`) — app sends `{ lat, lng, address }` with **placeholder** `lat`/`lng` of `"0"` when only a street address is entered (no geocoding). Override coords later in monday if needed.
  - Order received (date/time): `date_1` (`VITE_MONDAY_COL_ORDER_RECEIVED`)
  - Scent profiles: `dropdown` (`VITE_MONDAY_COL_SCENT_PROFILES`)
  - Quantity: `numbers` (`VITE_MONDAY_COL_QUANTITY`)
  - Inscription request: `text5` (`VITE_MONDAY_COL_INSCRIPTION`)
  - Status: `status` (used by automations / SLA webhook, not set on create from the app)
  - Order complete date (SLA target): `date_13`

Confirm column ids in the board column menu; wrong ids will cause `create_item` to fail.

If your board differs, update `.env.local` (preferred) or `src/config.ts`.

## Automation recipes

Configure in monday UI:

### 1. Status on new order

1. Open `Production Orders` board.
2. Add automation: **When an item is created → set Status to "New Order"** (exact wording depends on monday’s recipe picker).
3. Save recipe.

Note: The SLA webhook (below) still sets status to **In Queue** after it runs, so the final status for new items remains **In Queue**.

### 2. SLA webhook

1. Open `Production Orders` board.
2. Add automation: **When an item is created, send a webhook**.
3. Webhook URL: `<server_base_url>/webhooks/sla` (for local dev this is your tunneled server URL).
4. Save recipe.

Server expects:

- Header: `x-monday-token` from monday webhook
- Payload with `pulseId` and `boardId`

The webhook calculates due date as `today + ceil(quantity/10) business days`, then updates:

- `date_13` (Order Complete Date)
- `status` to `In Queue`

Override these via env:

- `MONDAY_QTY_COLUMN_ID`
- `MONDAY_DUE_DATE_COLUMN_ID`
- `MONDAY_STATUS_COLUMN_ID`

## Dashboard setup

Create a monday dashboard connected to `Production Orders`:

1. Numbers widget: count orders created this week.
2. Battery widget: group by `status`.
3. Chart widget: trend by `Order Complete Date` and status.

Recommended SLA chart:

- X axis: week (Order Complete Date)
- Metric: % items reaching final state by due date

## Deployment notes

- Client deployed to CDN via `npm run deploy:client`
- Server deploy command: `npm run deploy:server`
- Check server deployment status: `mapps code:status -v 14083495`
