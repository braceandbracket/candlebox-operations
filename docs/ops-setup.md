# Candlebox Ops Setup

## Installed board and column IDs

- Board: `Production Orders`
- Board ID: `18409136052`
- Column mapping used by app:
  - Client first name: `text`
  - Client last name: `text6`
  - Scent profiles: `dropdown`
  - Quantity: `numbers`
  - Inscription request: `text5`
  - Status: `status`
  - Order complete date (SLA target): `date_13`

If your board differs, update `.env` and `src/config.ts`.

## Automation recipe

Configure in monday UI:

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
