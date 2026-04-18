export const SERVER_BASE_URL =
  import.meta.env.VITE_SERVER_BASE_URL ?? "http://localhost:3000";

export const PRODUCTION_BOARD_ID = 18409136052;

export const ORDER_BOARD_COLUMNS = {
  clientFirstName: "text",
  clientLastName: "text6",
  scentProfiles: "dropdown",
  quantity: "numbers",
  inscription: "text5",
} as const;
