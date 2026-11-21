import { NextRequest, NextResponse } from "next/server";
import {
  checkPersistentAuthRateLimit,
  clearPersistentAuthRateLimit,
  createSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { passwordChangeSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateKey = `password-change:${currentUser.id}`;
    const rate = await checkPersistentAuthRateLimit(rateKey);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many password attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password payload" },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    });

    if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const nextHash = hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash: nextHash },
      }),
      // Revoke all existing sessions across other devices for safety
      prisma.session.deleteMany({
        where: { userId: dbUser.id },
      }),
    ]);

    // Issue a fresh session for the current browser/device and reset rate limit
    await createSession(dbUser.id, request.headers.get("user-agent"));
    await clearPersistentAuthRateLimit(rateKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
