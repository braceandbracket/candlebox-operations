import mondaySdk from "monday-sdk-js";
import type { MondayContext } from "@/types/monday";
import { national10Digits } from "@/lib/usPhone";
import { ORDER_BOARD_COLUMNS, PRODUCTION_BOARD_ID } from "@/config";

const monday = mondaySdk();
monday.setApiVersion("2025-07");

export function getMondayClient() {
  return monday;
}

export async function getContext(): Promise<MondayContext> {
  const response = await monday.get<MondayContext>("context");
  return response.data;
}

export async function getSessionToken(): Promise<string> {
  const response = await monday.get<string>("sessionToken");
  return response.data;
}

type DropdownLabel = { id: number; name: string };
type DropdownSettings = {
  labels?: DropdownLabel[] | Record<string, string>;
};

export async function getScentCategories(boardId: number): Promise<string[]> {
  const query = `
    query GetScentCategories($boardId: [ID!]!, $columnId: [String!]!) {
      boards(ids: $boardId) {
        columns(ids: $columnId) {
          settings_str
        }
      }
    }
  `;

  const payload = await monday.api<{
    data?: {
      boards?: Array<{
        columns?: Array<{ settings_str?: string | null }>;
      }>;
    };
  }>(query, {
    variables: {
      boardId: [boardId],
      columnId: [ORDER_BOARD_COLUMNS.scentProfiles],
    },
  });

  const settingsStr = payload.data?.boards?.[0]?.columns?.[0]?.settings_str;
  if (!settingsStr) {
    return [];
  }

  try {
    const settings = JSON.parse(settingsStr) as DropdownSettings;
    const labels = settings.labels ?? [];
    if (Array.isArray(labels)) {
      return labels.map((l) => l.name).filter(Boolean);
    }
    return Object.values(labels).filter(Boolean);
  } catch {
    return [];
  }
}

export type ScentRef = {
  name: string;
  category: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local date + time for monday date column (supports optional time in column settings). */
function orderReceivedColumnValue(): { date: string; time: string } {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
}

function isEmailColumnId(columnId: string): boolean {
  return columnId === "email" || columnId.startsWith("email_");
}

function isPhoneColumnId(columnId: string): boolean {
  return columnId === "phone" || columnId.startsWith("phone_");
}

function isLocationColumnId(columnId: string): boolean {
  return columnId === "location" || columnId.startsWith("location_");
}

function emailValueForColumn(columnId: string, email: string): string | { email: string; text: string } {
  if (isEmailColumnId(columnId)) {
    return { email, text: email };
  }
  return email;
}

function phoneValueForColumn(
  columnId: string,
  national10: string
): string | { phone: string; countryShortName: string } {
  if (isPhoneColumnId(columnId)) {
    return { phone: national10, countryShortName: "US" };
  }
  return national10;
}

/** monday Location columns require lat/lng alongside address; no geocoding in this app so coords default to "0". */
function locationValueForColumn(
  columnId: string,
  address: string
): string | { lat: string; lng: string; address: string } {
  const trimmed = address.trim();
  if (isLocationColumnId(columnId)) {
    return { lat: "0", lng: "0", address: trimmed };
  }
  return trimmed;
}

type OrderInput = {
  boardId?: number;
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone?: string;
  address: string;
  scents: [ScentRef, ScentRef, ScentRef];
  quantity: number;
  inscription?: string;
};

function buildItemDisplayName(input: OrderInput): string {
  const company = input.company?.trim();
  const person = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const who = company && company.length > 0 ? company : person;
  const scentNames = input.scents.map((scent) => scent.name).join(", ");
  return `${who} - ${scentNames} (${input.quantity} kits)`;
}

export async function createOrderItem(input: OrderInput): Promise<string> {
  const mutation = `
    mutation CreateOrderItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;

  const phoneTrimmed = input.phone?.trim() ?? "";
  const companyTrimmed = input.company?.trim() ?? "";
  const nationalPhone = phoneTrimmed.length > 0 ? national10Digits(phoneTrimmed) : null;

  const columnRecord: Record<string, unknown> = {
    [ORDER_BOARD_COLUMNS.clientFirstName]: input.firstName.trim(),
    [ORDER_BOARD_COLUMNS.clientLastName]: input.lastName.trim(),
    [ORDER_BOARD_COLUMNS.scentProfiles]: { labels: input.scents.map((scent) => scent.category) },
    [ORDER_BOARD_COLUMNS.quantity]: input.quantity,
    [ORDER_BOARD_COLUMNS.inscription]: input.inscription ?? "",
    [ORDER_BOARD_COLUMNS.email]: emailValueForColumn(ORDER_BOARD_COLUMNS.email, input.email.trim()),
    [ORDER_BOARD_COLUMNS.address]: locationValueForColumn(ORDER_BOARD_COLUMNS.address, input.address.trim()),
    [ORDER_BOARD_COLUMNS.orderReceived]: orderReceivedColumnValue(),
  };

  if (companyTrimmed.length > 0) {
    columnRecord[ORDER_BOARD_COLUMNS.company] = companyTrimmed;
  }

  if (nationalPhone) {
    columnRecord[ORDER_BOARD_COLUMNS.phone] = phoneValueForColumn(ORDER_BOARD_COLUMNS.phone, nationalPhone);
  }

  const columnValues = JSON.stringify(columnRecord);

  const payload = await monday.api<{ data: { create_item: { id: string } } }>(mutation, {
    variables: {
      boardId: input.boardId ?? PRODUCTION_BOARD_ID,
      itemName: buildItemDisplayName(input),
      columnValues,
    },
  });

  return payload.data.create_item.id;
}
