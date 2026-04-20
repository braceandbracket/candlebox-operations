export function splitScents(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** monday.com URL verification: POST body `{ "challenge": "..." }` → echo same JSON (200). */
export function readMondayWebhookChallenge(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const challenge = (body as { challenge?: unknown }).challenge;
  return typeof challenge === "string" && challenge.length > 0 ? challenge : null;
}

export function readMondayAuthHeader(headers: Record<string, unknown>): string | null {
  const mondayToken = headers["x-monday-token"];
  if (typeof mondayToken === "string" && mondayToken.length > 0) {
    return mondayToken;
  }
  const auth = headers.authorization;
  if (typeof auth !== "string" || auth.length === 0) {
    return null;
  }
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : auth.trim();
}
