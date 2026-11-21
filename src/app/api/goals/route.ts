import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeGoalProgress } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { savingsGoalCreateSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    include: {
      wallet: { select: { id: true, name: true, currency: true } },
    },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    goals: goals.map((g) => {
      const targetAmount = Number(g.targetAmount.toString());
      const currentAmount = Number(g.currentAmount.toString());
      return {
        id: g.id,
        name: g.name,
        targetAmount,
        currentAmount,
        currency: g.currency,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        note: g.note,
        isCompleted: g.isCompleted,
        wallet: g.wallet,
        ...computeGoalProgress(currentAmount, targetAmount),
      };
    }),
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
    const parsed = savingsGoalCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid savings goal" },
        { status: 400 },
      );
    }

    const { name, targetAmount, currentAmount, currency, targetDate, walletId, note } =
      parsed.data;

    let linkedWalletCurrency: string | null = null;
    if (walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId: user.id, isArchived: false },
        select: { id: true, currency: true },
      });
      if (!wallet) {
        return NextResponse.json(
          { error: "Selected active wallet not found" },
          { status: 404 },
        );
      }
      linkedWalletCurrency = wallet.currency;
    }

    const effectiveCurrency = currency ?? linkedWalletCurrency ?? user.currency;
    const isCompleted = currentAmount >= targetAmount;

    const created = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name,
        targetAmount,
        currentAmount,
        currency: effectiveCurrency,
        targetDate: targetDate ? new Date(targetDate) : null,
        walletId: walletId ?? null,
        note,
        isCompleted,
      },
      include: {
        wallet: { select: { id: true, name: true, currency: true } },
      },
    });

    const targetNum = Number(created.targetAmount.toString());
    const currentNum = Number(created.currentAmount.toString());

    return NextResponse.json(
      {
        goal: {
          id: created.id,
          name: created.name,
          targetAmount: targetNum,
          currentAmount: currentNum,
          currency: created.currency,
          targetDate: created.targetDate ? created.targetDate.toISOString() : null,
          note: created.note,
          isCompleted: created.isCompleted,
          wallet: created.wallet,
          ...computeGoalProgress(currentNum, targetNum),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Goals POST error:", error);
    return NextResponse.json(
      { error: "Failed to create savings goal" },
      { status: 500 },
    );
  }
}
