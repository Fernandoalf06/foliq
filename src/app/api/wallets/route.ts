import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { walletCreateSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    wallets: wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency,
      initialBalance: Number(w.initialBalance.toString()),
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = walletCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid wallet data" },
        { status: 400 },
      );
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        initialBalance: parsed.data.initialBalance,
        currency: user.currency,
      },
    });

    return NextResponse.json(
      {
        wallet: {
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          currency: wallet.currency,
          initialBalance: Number(wallet.initialBalance.toString()),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Wallet POST error:", error);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 },
    );
  }
}
