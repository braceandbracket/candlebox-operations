import mondaySdk from "monday-sdk-js";
import type { MondayContext } from "@/types/monday";
import { ORDER_BOARD_COLUMNS, PRODUCTION_BOARD_ID } from "@/config";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

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

type OrderInput = {
  boardId?: number;
  customer: string;
  scents: [string, string, string];
  quantity: number;
  inscription?: string;
};

export async function createOrderItem(input: OrderInput): Promise<string> {
  const mutation = `
    mutation CreateOrderItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;
  const columnValues = JSON.stringify({
    [ORDER_BOARD_COLUMNS.clientFirstName]: input.customer,
    [ORDER_BOARD_COLUMNS.clientLastName]: "",
    [ORDER_BOARD_COLUMNS.scentProfiles]: { labels: input.scents },
    [ORDER_BOARD_COLUMNS.quantity]: input.quantity,
    [ORDER_BOARD_COLUMNS.inscription]: input.inscription ?? "",
  });

  const payload = await monday.api<{ data: { create_item: { id: string } } }>(mutation, {
    variables: {
      boardId: input.boardId ?? PRODUCTION_BOARD_ID,
      itemName: `${input.customer} (${input.quantity} kits)`,
      columnValues,
    },
  });

  return payload.data.create_item.id;
}
