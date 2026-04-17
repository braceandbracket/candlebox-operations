# Candlebox Operations — monday.com Board View App

## Project Context
This is a React + Vite app deployed as a monday.com Board View feature.
It is hosted on monday's CDN via mapps CLI. Do not suggest Next.js, SSR, or server routes.

## Stack
- React 18, Vite 6, JSX
- monday-sdk-js for all board data access
- @mondaycom/apps-sdk for server/storage utilities
- @vibe/core for UI components (monday's design system)
- Deployed via: `mapps code:push --client-side -d "build" -i 14083495`

## App IDs
- App ID: 14083495
- Feature: Board View — "Candlebox Builder"
- Unique key: justinrings1s-team_candlebox-ops::candlebox-builder
- monday user_id: 102362837

## monday SDK Usage
Always use `monday.api()` for GraphQL queries/mutations.
Always call `monday.setApiVersion("2023-10")` on init.
Use `monday.get("context")` to read board/item/user context.
Never use fetch() directly against monday's API — always use the SDK.

## Deploy Loop
```bash
npm run deploy:build
mapps code:push --client-side -d "build" -i 14083495
```

## MCP Server
monday MCP is connected. Use it to inspect live board structure,
column IDs, and item data before writing GraphQL queries.

## Rules
- All UI work goes in src/App.jsx and child components under src/
- Do not modify src/index.jsx or vite.config.js without reason
- Do not add node_modules to any deployment command
- Keep components small and co-located with their CSS