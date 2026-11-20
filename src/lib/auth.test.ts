import { describe, expect, it } from "vitest";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  hashPassword,
  verifyPassword,
} from "./auth";

describe("auth cryptography and rate limiting", () => {
  it("hashes passwords with unique salts and verifies correctly", () => {
    const hashA = hashPassword("StrongPass!2026");
    const hashB = hashPassword("StrongPass!2026");

    expect(hashA).not.toBe(hashB);
    expect(hashA.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("StrongPass!2026", hashA)).toBe(true);
    expect(verifyPassword("wrong-password", hashA)).toBe(false);
    expect(verifyPassword("StrongPass!2026", "invalid-format")).toBe(false);
  });

  it("enforces sliding-window rate limits and resets cleanly", () => {
    const key = `test-rate-${Date.now()}`;
    clearAuthRateLimit(key);

    for (let i = 0; i < 10; i++) {
      expect(checkAuthRateLimit(key).allowed).toBe(true);
    }

    const blocked = checkAuthRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    clearAuthRateLimit(key);
    expect(checkAuthRateLimit(key).allowed).toBe(true);
  });
});
