export const SERVER_BASE_URL =
  import.meta.env.VITE_SERVER_BASE_URL ?? "http://localhost:3001";

export const PRODUCTION_BOARD_ID = 18409136052;

function envColumn(key: string, fallback: string): string {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const value = env[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/**
 * Monday column IDs for Production Orders board.
 * Override with VITE_MONDAY_COL_* in .env.local if your board differs.
 * See docs/ops-setup.md.
 */
export const ORDER_BOARD_COLUMNS = {
  clientFirstName: envColumn("VITE_MONDAY_COL_CLIENT_FIRST_NAME", "text"),
  clientLastName: envColumn("VITE_MONDAY_COL_CLIENT_LAST_NAME", "text6"),
  company: envColumn("VITE_MONDAY_COL_COMPANY", "text_mm2h5g3q"),
  email: envColumn("VITE_MONDAY_COL_EMAIL", "email"),
  phone: envColumn("VITE_MONDAY_COL_PHONE", "phone"),
  address: envColumn("VITE_MONDAY_COL_ADDRESS", "location"),
  orderReceived: envColumn("VITE_MONDAY_COL_ORDER_RECEIVED", "date_1"),
  scentProfiles: envColumn("VITE_MONDAY_COL_SCENT_PROFILES", "dropdown"),
  quantity: envColumn("VITE_MONDAY_COL_QUANTITY", "numbers"),
  inscription: envColumn("VITE_MONDAY_COL_INSCRIPTION", "text5"),
} as const;
