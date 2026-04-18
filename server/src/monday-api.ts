import { MONDAY_API_URL } from "./config";

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
      "API-Version": "2023-10",
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
