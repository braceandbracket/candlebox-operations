import { MONDAY_API_URL, MONDAY_API_VERSION } from "./config";

/**
 * Server-side monday GraphQL helper with pinned API version and normalized errors.
 * Use this for all monday API calls in backend routes.
 */
export async function mondayGraphql<T>(
  query: string,
  token: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "API-Version": MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((item) => item.message).join("; ") ?? response.statusText;
    throw new Error(`mondayGraphql failed: ${message}`);
  }
  if (!payload.data) {
    throw new Error("mondayGraphql failed: missing data.");
  }
  return payload.data;
}

type CreateSubItemMutationResponse = {
  create_subitem: { id: string };
};

export async function createSubItem(
  token: string,
  parentItemId: number,
  itemName: string
): Promise<string> {
  const mutation = `
    mutation CreateSubItem($parentItemId: ID!, $itemName: String!) {
      create_subitem(parent_item_id: $parentItemId, item_name: $itemName) {
        id
      }
    }
  `;
  const payload = await mondayGraphql<CreateSubItemMutationResponse>(mutation, token, {
    parentItemId,
    itemName,
  });
  return payload.create_subitem.id;
}

type CreateUpdateMutationResponse = {
  create_update: { id: string };
};

export async function addItemUpdate(token: string, itemId: number, body: string): Promise<string> {
  const mutation = `
    mutation CreateUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
      }
    }
  `;
  const payload = await mondayGraphql<CreateUpdateMutationResponse>(mutation, token, {
    itemId,
    body,
  });
  return payload.create_update.id;
}
