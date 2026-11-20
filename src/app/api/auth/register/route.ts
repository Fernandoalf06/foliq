import { NextRequest, NextResponse } from "next/server";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  createSession,
  getAllowedOwnerEmail,
  hashPassword,
  isOwnerEmailAllowed,
} from "@/lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rate = checkAuthRateLimit(`register:${ip}`);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    if (!getAllowedOwnerEmail()) {
      return NextResponse.json(
        {
          error:
            "OWNER_EMAIL is not configured on the server. Set OWNER_EMAIL in environment variables before registering.",
        },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration data" },
        { status: 400 },
      );
    }

    const { name, email, password, currency } = parsed.data;

    if (!isOwnerEmailAllowed(email)) {
      return NextResponse.json(
        {
          error:
            "Registration is locked to the configured owner email for this Foliq instance.",
        },
        { status: 403 },
      );
    }

    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: "Owner account already exists. Please sign in instead." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          currency,
        },
        select: {
          id: true,
          email: true,
          name: true,
          currency: true,
        },
      });

      await tx.wallet.createMany({
        data: DEFAULT_WALLETS.map((w) => ({
          userId: created.id,
          name: w.name,
          type: w.type,
          initialBalance: w.initialBalance,
          currency,
        })),
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId: created.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          isDefault: true,
        })),
      });

      return created;
    });

    await createSession(user.id, request.headers.get("user-agent"));
    clearAuthRateLimit(`register:${ip}`);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to create owner account" },
      { status: 500 },
    );
  }
}
