import { NextRequest, NextResponse } from "next/server";

/**
 * Defense-in-depth CSRF check for mutating API endpoints (POST, PATCH, DELETE).
 * Verifies that an incoming browser Origin header matches the request Host
 * (or configured NEXT_PUBLIC_APP_URL host).
 */
export function isOriginAllowed(
  originHeader: string | null,
  hostHeader: string | null,
  configuredAppUrl?: string,
): boolean {
  if (!originHeader) return true;

  let originHost: string;
  try {
    originHost = new URL(originHeader).host.toLowerCase();
  } catch {
    return false;
  }

  const allowedHosts = new Set<string>();
  if (hostHeader) {
    allowedHosts.add(hostHeader.trim().toLowerCase());
  }
  if (configuredAppUrl) {
    try {
      allowedHosts.add(new URL(configuredAppUrl).host.toLowerCase());
    } catch {
      // Ignore malformed NEXT_PUBLIC_APP_URL
    }
  }

  if (allowedHosts.size === 0) return false;
  return allowedHosts.has(originHost);
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host");

  if (!isOriginAllowed(origin, host, process.env.NEXT_PUBLIC_APP_URL)) {
    return NextResponse.json(
      { error: "Cross-origin mutation request rejected" },
      { status: 403 },
    );
  }
  return null;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}
