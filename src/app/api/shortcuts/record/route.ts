import { NextRequest, NextResponse } from "next/server";
import {
  checkPersistentAuthRateLimit,
  clearPersistentAuthRateLimit,
  hashApiToken,
  isPersistentAuthRateLimited,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";
import { shortcutRecordSchema, uuidSchema } from "@/lib/validators";

/**
 * Bearer-authenticated webhook endpoint for Apple Shortcuts (Back Tap / Action Button / Siri).
 * Uses revocable flq_ API tokens instead of browser cookies, so cross-device Shortcuts calls work safely.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateKey = `shortcut-auth:${ip}`;

    const preCheck = await isPersistentAuthRateLimited(rateKey);
    if (preCheck.limited) {
      return NextResponse.json(
        {
          error: `Too many invalid token attempts. Try again in ${preCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(\S+)$/i);
    const rawToken = match?.[1]?.trim();

    if (!rawToken || !rawToken.startsWith("flq_") || rawToken.length < 24) {
      const rate = await checkPersistentAuthRateLimit(rateKey);
      if (!rate.allowed) {
        return NextResponse.json(
          {
            error: `Too many invalid token attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "Missing or invalid Bearer API token" },
        { status: 401 },
      );
    }

    const tokenHash = hashApiToken(rawToken);
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, currency: true } },
      },
    });

    if (!apiToken) {
      const rate = await checkPersistentAuthRateLimit(rateKey);
      if (!rate.allowed) {
        return NextResponse.json(
          {
            error: `Too many invalid token attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "Invalid or revoked API token" },
        { status: 401 },
      );
    }

    await clearPersistentAuthRateLimit(rateKey);

    const body = await request.json().catch(() => null);
    const parsed = shortcutRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid shortcut payload" },
        { status: 400 },
      );
    }

    const { amount, type, wallet: walletRef, category: categoryRef, note, occurredAt } =
      parsed.data;

    const [wallets, categories] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId: apiToken.user.id, isArchived: false },
        orderBy: { createdAt: "asc" },
      }),
      prisma.category.findMany({
        where: { userId: apiToken.user.id, type },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: "No active wallet available on this Foliq account" },
        { status: 400 },
      );
    }
    if (categories.length === 0) {
      return NextResponse.json(
        { error: `No ${type.toLowerCase()} category available on this Foliq account` },
        { status: 400 },
      );
    }

    // Match wallet by UUID or case-insensitive name, falling back to first active wallet
    const resolvedWallet = walletRef
      ? wallets.find((w) =>
          uuidSchema.safeParse(walletRef).success
            ? w.id === walletRef
            : w.name.toLowerCase() === walletRef.toLowerCase(),
        ) ?? wallets[0]
      : wallets[0];

    // Match category by UUID or case-insensitive name, falling back to first matching category
    const resolvedCategory = categoryRef
      ? categories.find((c) =>
          uuidSchema.safeParse(categoryRef).success
            ? c.id === categoryRef
            : c.name.toLowerCase() === categoryRef.toLowerCase(),
        ) ?? categories[0]
      : categories[0];

    const [created] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: apiToken.user.id,
          type,
          amount,
          walletId: resolvedWallet.id,
          categoryId: resolvedCategory.id,
          note: note ?? "",
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        },
        include: {
          wallet: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      {
        recorded: true,
        transaction: {
          id: created.id,
          type: created.type,
          amount: Number(created.amount.toString()),
          currency: resolvedWallet.currency,
          wallet: created.wallet.name,
          category: created.category?.name ?? null,
          note: created.note,
          occurredAt: created.occurredAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Shortcut record POST error:", error);
    return NextResponse.json(
      { error: "Failed to record shortcut transaction" },
      { status: 500 },
    );
  }
}
