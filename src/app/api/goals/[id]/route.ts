import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeGoalProgress } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { savingsGoalUpdateSchema, uuidSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = savingsGoalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid goal update" },
        { status: 400 },
      );
    }

    if (parsed.data.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: parsed.data.walletId, userId: user.id, isArchived: false },
      });
      if (!wallet) {
        return NextResponse.json(
          { error: "Selected active wallet not found" },
          { status: 404 },
        );
      }
    }

    const existingCurrent = Number(existing.currentAmount.toString());
    const existingTarget = Number(existing.targetAmount.toString());

    const nextTarget = parsed.data.targetAmount ?? existingTarget;
    let nextCurrent = existingCurrent;
    if (parsed.data.currentAmount !== undefined) {
      nextCurrent = parsed.data.currentAmount;
    } else if (parsed.data.deltaAmount !== undefined) {
      nextCurrent = Math.max(
        0,
        Math.round((existingCurrent + parsed.data.deltaAmount) * 100) / 100,
      );
    }

    const nextCompleted =
      parsed.data.isCompleted !== undefined
        ? parsed.data.isCompleted
        : nextCurrent >= nextTarget;

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        targetAmount: nextTarget,
        currentAmount: nextCurrent,
        isCompleted: nextCompleted,
        ...(parsed.data.currency !== undefined
          ? { currency: parsed.data.currency }
          : {}),
        ...(parsed.data.targetDate !== undefined
          ? {
              targetDate: parsed.data.targetDate
                ? new Date(parsed.data.targetDate)
                : null,
            }
          : {}),
        ...(parsed.data.walletId !== undefined
          ? { walletId: parsed.data.walletId }
          : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      },
      include: {
        wallet: { select: { id: true, name: true, currency: true } },
      },
    });

    const targetNum = Number(updated.targetAmount.toString());
    const currentNum = Number(updated.currentAmount.toString());

    return NextResponse.json({
      goal: {
        id: updated.id,
        name: updated.name,
        targetAmount: targetNum,
        currentAmount: currentNum,
        currency: updated.currency,
        targetDate: updated.targetDate ? updated.targetDate.toISOString() : null,
        note: updated.note,
        isCompleted: updated.isCompleted,
        wallet: updated.wallet,
        ...computeGoalProgress(currentNum, targetNum),
      },
    });
  } catch (error) {
    console.error("Goals PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update savings goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 },
      );
    }

    await prisma.savingsGoal.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Goals DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete savings goal" },
      { status: 500 },
    );
  }
}
