const PRIVACY_KEY = "foliq_privacy_mode_v1";
const LAST_WALLET_KEY = "foliq_last_wallet_v1";

const privacyListeners = new Set<() => void>();

function emitPrivacyChange(): void {
  for (const listener of privacyListeners) {
    listener();
  }
}

export function getPrivacySnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRIVACY_KEY) === "1";
  } catch {
    return false;
  }
}

export function getPrivacyServerSnapshot(): boolean {
  return false;
}

export function subscribePrivacy(callback: () => void): () => void {
  privacyListeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PRIVACY_KEY) {
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    privacyListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function setPrivacyMode(hidden: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRIVACY_KEY, hidden ? "1" : "0");
    emitPrivacyChange();
  } catch {
    // Ignore restricted storage mode
  }
}

export function maskAmount(formatted: string, privacyMode: boolean): string {
  return privacyMode ? "••••••••" : formatted;
}

export function readLastWalletId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_WALLET_KEY);
  } catch {
    return null;
  }
}

export function saveLastWalletId(walletId: string): void {
  if (typeof window === "undefined" || !walletId) return;
  try {
    window.localStorage.setItem(LAST_WALLET_KEY, walletId);
  } catch {
    // Ignore restricted storage mode
  }
}
