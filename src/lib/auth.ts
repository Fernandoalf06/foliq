import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "foliq_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// Sliding-window rate limit parameters (10 attempts per 15 minutes per key)
const authAttempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 10;

// Dummy hash for constant-time scrypt execution when user/email does not match
const DUMMY_PASSWORD_HASH =
  "scrypt$00112233445566778899aabbccddeeff$" + "0".repeat(128);

export function checkAuthRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const recent = (authAttempts.get(key) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_MAX_ATTEMPTS) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000),
    );
    authAttempts.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }
  recent.push(now);
  authAttempts.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearAuthRateLimit(key: string): void {
  authAttempts.delete(key);
}

/**
 * Serverless-safe persistent rate limiter stored in Neon PostgreSQL so brute-force
 * limits hold across cold starts and parallel Vercel Lambda instances.
 */
export async function checkPersistentAuthRateLimit(key: string): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  const now = new Date();
  const nowMs = now.getTime();
  const hashedKey = crypto.createHash("sha256").update(key).digest("hex");

  try {
    const existing = await prisma.authRateLimit.findUnique({
      where: { key: hashedKey },
    });

    if (!existing || nowMs - existing.windowStart.getTime() >= RATE_WINDOW_MS) {
      await prisma.authRateLimit.upsert({
        where: { key: hashedKey },
        create: { key: hashedKey, attempts: 1, windowStart: now },
        update: { attempts: 1, windowStart: now },
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.attempts >= RATE_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (RATE_WINDOW_MS - (nowMs - existing.windowStart.getTime())) / 1000,
        ),
      );
      return { allowed: false, retryAfterSeconds };
    }

    await prisma.authRateLimit.update({
      where: { key: hashedKey },
      data: { attempts: { increment: 1 } },
    });
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("Persistent rate limit fallback:", error);
    return checkAuthRateLimit(key);
  }
}

export async function clearPersistentAuthRateLimit(key: string): Promise<void> {
  clearAuthRateLimit(key);
  const hashedKey = crypto.createHash("sha256").update(key).digest("hex");
  await prisma.authRateLimit
    .deleteMany({ where: { key: hashedKey } })
    .catch(() => {});
}

export function getAllowedOwnerEmail(): string | null {
  const raw = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return raw && raw.length > 0 ? raw : null;
}

export function isOwnerEmailAllowed(email: string): boolean {
  const allowed = getAllowedOwnerEmail();
  if (!allowed) return false;
  return email.trim().toLowerCase() === allowed;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production.");
    }
    return "foliq-dev-only-fallback-session-secret";
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, originalHex] = parts;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, "hex");
  if (derivedBuf.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, originalBuf);
}

/**
 * Perform a dummy scrypt verification so invalid-email login paths take comparable CPU time.
 */
export function consumeDummyPasswordVerify(password: string): void {
  verifyPassword(password, DUMMY_PASSWORD_HASH);
}

function hashSessionToken(rawToken: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(rawToken)
    .digest("hex");
}

export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    }),
    prisma.session.create({
      data: {
        tokenHash,
        userId,
        userAgent: userAgent?.slice(0, 200) ?? null,
        expiresAt,
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          currency: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}
