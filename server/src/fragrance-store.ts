import { SecureStorage } from "@mondaycom/apps-sdk";
import { randomUUID } from "node:crypto";
import type { Fragrance, FragranceInput } from "./fragrance";
import { FRAGRANCE_STORAGE_KEY } from "./config";
import { fragranceSeedData } from "./seed";

const secureStorage = new SecureStorage();

/** SecureStorage.set() wants JsonValue (index signature). Domain rows are plain JSON; bridge once here. */
type SecureStorageSetArg = Parameters<InstanceType<typeof SecureStorage>["set"]>[1];
function persistFragrances(rows: Fragrance[]): SecureStorageSetArg {
  return rows as unknown as SecureStorageSetArg;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toFragrance(input: FragranceInput): Fragrance {
  const timestamp = nowIso();
  return {
    id: randomUUID(),
    ...input,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function listFragrances(): Promise<Fragrance[]> {
  let stored = await secureStorage.get<Fragrance[]>(FRAGRANCE_STORAGE_KEY);

  // SecureStorage local dev mode may return a JSON string instead of a parsed object
  if (typeof stored === "string") {
    try {
      stored = JSON.parse(stored) as Fragrance[];
    } catch {
      stored = null;
    }
  }

  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const seeded = fragranceSeedData.map(toFragrance);
    await secureStorage.set(FRAGRANCE_STORAGE_KEY, persistFragrances(seeded));
    return seeded;
  }
  return stored;
}

export async function createFragrance(input: FragranceInput): Promise<Fragrance> {
  const fragrances = await listFragrances();
  const next = toFragrance(input);
  await secureStorage.set(FRAGRANCE_STORAGE_KEY, persistFragrances([...fragrances, next]));
  return next;
}

export async function updateFragrance(
  id: string,
  patch: Partial<FragranceInput>
): Promise<Fragrance | null> {
  const fragrances = await listFragrances();
  const idx = fragrances.findIndex((item) => item.id === id);
  if (idx < 0) {
    return null;
  }

  const updated: Fragrance = {
    ...fragrances[idx],
    ...patch,
    updated_at: nowIso(),
  };

  const next = [...fragrances];
  next[idx] = updated;
  await secureStorage.set(FRAGRANCE_STORAGE_KEY, persistFragrances(next));
  return updated;
}

export async function deleteFragrance(id: string): Promise<boolean> {
  const fragrances = await listFragrances();
  const next = fragrances.filter((item) => item.id !== id);
  if (next.length === fragrances.length) {
    return false;
  }
  await secureStorage.set(FRAGRANCE_STORAGE_KEY, persistFragrances(next));
  return true;
}
