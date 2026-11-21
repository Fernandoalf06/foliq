import type { TransactionType } from "./types";

export interface QueuedTransaction {
  localId: string;
  type: TransactionType;
  amount: number;
  walletId: string;
  targetWalletId: string | null;
  categoryId: string | null;
  note: string;
  occurredAt: string;
  queuedAt: string;
}

const STORAGE_KEY = "foliq_offline_queue_v1";
const EMPTY_QUEUE: QueuedTransaction[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: QueuedTransaction[] = EMPTY_QUEUE;

function emitQueueChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function safeReadStorage(storage?: Pick<Storage, "getItem">): QueuedTransaction[] {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return EMPTY_QUEUE;
  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_QUEUE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedTransaction[]) : EMPTY_QUEUE;
  } catch {
    return EMPTY_QUEUE;
  }
}

function safeWriteStorage(
  items: QueuedTransaction[],
  storage?: Pick<Storage, "setItem">,
): void {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return;
  try {
    const serialized = JSON.stringify(items);
    target.setItem(STORAGE_KEY, serialized);
    if (!storage) {
      cachedRaw = serialized;
      cachedItems = items.length > 0 ? items : EMPTY_QUEUE;
      emitQueueChange();
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function getOfflineQueueSnapshot(): QueuedTransaction[] {
  if (typeof window === "undefined") return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedItems;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedItems = EMPTY_QUEUE;
      return cachedItems;
    }
    const parsed = JSON.parse(raw);
    cachedItems = Array.isArray(parsed)
      ? (parsed as QueuedTransaction[])
      : EMPTY_QUEUE;
    return cachedItems;
  } catch {
    cachedRaw = null;
    cachedItems = EMPTY_QUEUE;
    return cachedItems;
  }
}

export function getOfflineQueueServerSnapshot(): QueuedTransaction[] {
  return EMPTY_QUEUE;
}

export function subscribeOfflineQueue(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function readOfflineQueue(
  storage?: Pick<Storage, "getItem">,
): QueuedTransaction[] {
  return safeReadStorage(storage);
}

export function enqueueOfflineTransaction(
  entry: Omit<QueuedTransaction, "localId" | "queuedAt">,
  storage?: Pick<Storage, "getItem" | "setItem">,
): QueuedTransaction {
  const item: QueuedTransaction = {
    ...entry,
    localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  const current = safeReadStorage(storage);
  safeWriteStorage([...current, item], storage);
  return item;
}

export function removeOfflineTransaction(
  localId: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
): QueuedTransaction[] {
  const next = safeReadStorage(storage).filter((i) => i.localId !== localId);
  safeWriteStorage(next, storage);
  return next;
}

export function clearOfflineQueue(storage?: Pick<Storage, "setItem">): void {
  safeWriteStorage([], storage);
}
