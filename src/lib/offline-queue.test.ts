import { describe, expect, it } from "vitest";
import {
  clearOfflineQueue,
  enqueueOfflineTransaction,
  readOfflineQueue,
  removeOfflineTransaction,
} from "./offline-queue";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("offline transaction queue", () => {
  it("enqueues, reads, removes, and clears entries cleanly", () => {
    const storage = createMemoryStorage();
    expect(readOfflineQueue(storage)).toEqual([]);

    const first = enqueueOfflineTransaction(
      {
        type: "EXPENSE",
        amount: 45000,
        walletId: "550e8400-e29b-41d4-a716-446655440001",
        targetWalletId: null,
        categoryId: "550e8400-e29b-41d4-a716-446655440002",
        note: "Coffee on flight",
        occurredAt: "2026-06-10T08:00:00.000Z",
      },
      storage,
    );

    const second = enqueueOfflineTransaction(
      {
        type: "INCOME",
        amount: 250000,
        walletId: "550e8400-e29b-41d4-a716-446655440001",
        targetWalletId: null,
        categoryId: "550e8400-e29b-41d4-a716-446655440003",
        note: "Refund",
        occurredAt: "2026-06-10T09:00:00.000Z",
      },
      storage,
    );

    expect(readOfflineQueue(storage)).toHaveLength(2);
    expect(readOfflineQueue(storage)[0].localId).toBe(first.localId);

    const remaining = removeOfflineTransaction(first.localId, storage);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].localId).toBe(second.localId);

    clearOfflineQueue(storage);
    expect(readOfflineQueue(storage)).toEqual([]);
  });

  it("handles corrupted storage JSON gracefully", () => {
    const brokenStorage = {
      getItem: () => "{not-valid-json",
      setItem: () => {},
    };
    expect(readOfflineQueue(brokenStorage)).toEqual([]);
  });
});
