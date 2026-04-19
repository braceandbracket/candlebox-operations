import { SERVER_BASE_URL } from "@/config";
import { getSessionToken } from "@/lib/monday";
import type { Fragrance, FragranceInput } from "@/types/fragrance";
import { z } from "zod";

const fragranceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const fragranceListPayloadSchema = z.object({
  data: z.array(fragranceSchema),
});

const fragrancePayloadSchema = z.object({
  data: fragranceSchema,
});

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
  const payload = await apiRequest<unknown>("/fragrances");
  const parsed = fragranceListPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid fragrances payload from server.");
  }
  return parsed.data.data;
}

export async function createFragrance(payload: FragranceInput): Promise<Fragrance> {
  const result = await apiRequest<unknown>("/fragrances", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const parsed = fragrancePayloadSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("Invalid fragrance payload from server.");
  }
  return parsed.data.data;
}

export async function updateFragrance(
  id: string,
  payload: Partial<FragranceInput>
): Promise<Fragrance> {
  const result = await apiRequest<unknown>(`/fragrances/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const parsed = fragrancePayloadSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("Invalid fragrance payload from server.");
  }
  return parsed.data.data;
}

export async function deleteFragrance(id: string): Promise<void> {
  await apiRequest<void>(`/fragrances/${id}`, { method: "DELETE" });
}
