import { NextRequest, NextResponse } from "next/server";
import {
  checkPersistentAuthRateLimit,
  clearPersistentAuthRateLimit,
  consumeDummyPasswordVerify,
  createSession,
  isOwnerEmailAllowed,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, getClientIp } from "@/lib/security";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const ip = getClientIp(request);
    const rate = await checkPersistentAuthRateLimit(`login:${ip}`);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many sign-in attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    if (!isOwnerEmailAllowed(email)) {
      consumeDummyPasswordVerify(password);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        currency: true,
        passwordHash: true,
      },
    });

    if (!user) {
      consumeDummyPasswordVerify(password);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await createSession(user.id, request.headers.get("user-agent"));
    await clearPersistentAuthRateLimit(`login:${ip}`);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to sign in" },
      { status: 500 },
    );
  }
}
