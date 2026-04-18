import { SERVER_BASE_URL } from "@/config";
import { getSessionToken } from "@/lib/monday";
import type { Fragrance, FragranceInput } from "@/types/fragrance";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const response = await fetch(`${SERVER_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getFragrances(): Promise<Fragrance[]> {
  const payload = await apiRequest<{ data: unknown }>("/fragrances");
  const data = payload.data;
  return Array.isArray(data) ? (data as Fragrance[]) : [];
}

export async function createFragrance(payload: FragranceInput): Promise<Fragrance> {
  const result = await apiRequest<{ data: Fragrance }>("/fragrances", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateFragrance(
  id: string,
  payload: Partial<FragranceInput>
): Promise<Fragrance> {
  const result = await apiRequest<{ data: Fragrance }>(`/fragrances/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteFragrance(id: string): Promise<void> {
  await apiRequest<void>(`/fragrances/${id}`, { method: "DELETE" });
}
