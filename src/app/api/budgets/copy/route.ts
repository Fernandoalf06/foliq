import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { budgetCopySchema } from "@/lib/validators";

function getPreviousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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
    const parsed = budgetCopySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid month" },
        { status: 400 },
      );
    }

    const { targetMonth } = parsed.data;
    const sourceMonth = getPreviousMonthKey(targetMonth);

    const [sourceBudgets, targetBudgets] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id, month: sourceMonth },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month: targetMonth },
        select: { categoryId: true },
      }),
    ]);

    if (sourceBudgets.length === 0) {
      return NextResponse.json(
        { error: `No budgets found in ${sourceMonth} to copy.` },
        { status: 404 },
      );
    }

    const existingCategoryIds = new Set(targetBudgets.map((b) => b.categoryId));
    const toCreate = sourceBudgets
      .filter((b) => !existingCategoryIds.has(b.categoryId))
      .map((b) => ({
        userId: user.id,
        categoryId: b.categoryId,
        month: targetMonth,
        limitAmount: b.limitAmount,
      }));

    if (toCreate.length > 0) {
      await prisma.budget.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(
      {
        copied: toCreate.length,
        skippedExisting: sourceBudgets.length - toCreate.length,
        sourceMonth,
        targetMonth,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Budget copy POST error:", error);
    return NextResponse.json(
      { error: "Failed to copy budgets from previous month" },
      { status: 500 },
    );
  }
}
