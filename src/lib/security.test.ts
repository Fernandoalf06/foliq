import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "./security";

describe("CSRF same-origin validation", () => {
  it("allows requests matching the Host header or configured app URL", () => {
    expect(
      isOriginAllowed("https://foliq-sepia.vercel.app", "foliq-sepia.vercel.app"),
    ).toBe(true);
    expect(
      isOriginAllowed(
        "https://foliq-sepia.vercel.app",
        "internal-proxy.local",
        "https://foliq-sepia.vercel.app",
      ),
    ).toBe(true);
    expect(isOriginAllowed(null, "foliq-sepia.vercel.app")).toBe(true);
  });

  it("rejects cross-origin and malformed Origin headers", () => {
    expect(
      isOriginAllowed("https://evil.example", "foliq-sepia.vercel.app"),
    ).toBe(false);
    expect(isOriginAllowed("not-a-valid-url", "foliq-sepia.vercel.app")).toBe(
      false,
    );
    expect(isOriginAllowed("https://foliq-sepia.vercel.app", null)).toBe(false);
  });
});
