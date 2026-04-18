export const FRAGRANCE_STORAGE_KEY = "fragrances:index";
export const APP_PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3000);
export const MONDAY_API_URL = "https://api.monday.com/v2";

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
