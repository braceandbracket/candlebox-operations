export const FRAGRANCE_STORAGE_KEY = "fragrances:index";
export const APP_PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3001);
export const MONDAY_API_URL = "https://api.monday.com/v2";
export const MONDAY_API_VERSION = "2025-07";
export const WEBHOOK_SCENT_COLUMN_ID =
  process.env.MONDAY_COL_SCENT_PROFILES?.trim() ||
  process.env.VITE_MONDAY_COL_SCENT_PROFILES?.trim() ||
  "dropdown";

// Session tokens from monday.get('sessionToken') are signed with the app's
// Client Secret — not the Signing Secret (which is for webhook HMAC verification).
// In monday code hosting, EnvironmentVariablesManager (initialised in index.ts)
// injects env vars into process.env before any request is handled.
export function getClientSecret(): string {
  const secret = process.env.MONDAY_CLIENT_SECRET ?? "";
  if (!secret) {
    throw new Error("MONDAY_CLIENT_SECRET is not configured.");
  }
  return secret;
}

/** Personal API token for server-side GraphQL (board webhooks usually send no session token). */
export function getMondayApiTokenFromEnv(): string | null {
  const token = process.env.MONDAY_API_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}
