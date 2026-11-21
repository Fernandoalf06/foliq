import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advanceRecurringDate } from "@/lib/recurring";
import { assertSameOrigin } from "@/lib/security";
import { uuidSchema } from "@/lib/validators";

export async function POST(
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
      return NextResponse.json(
        { error: "Invalid recurring rule ID" },
        { status: 400 },
      );
    }

    const rule = await prisma.recurringRule.findFirst({
      where: { id, userId: user.id },
      include: {
        wallet: { select: { id: true, isArchived: true } },
      },
    });
    if (!rule) {
      return NextResponse.json(
        { error: "Recurring rule not found" },
        { status: 404 },
      );
    }

    if (rule.wallet.isArchived) {
      return NextResponse.json(
        {
          error:
            "The linked wallet is archived. Restore the wallet before recording this recurring entry.",
        },
        { status: 400 },
      );
    }

    const nextDue = advanceRecurringDate(rule.nextDueDate, rule.cadence);
    const noteText = rule.note ? `${rule.title} · ${rule.note}` : rule.title;

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.recurringRule.updateMany({
        where: {
          id: rule.id,
          userId: user.id,
          nextDueDate: rule.nextDueDate,
        },
        data: { nextDueDate: nextDue },
      });

      if (claimed.count === 0) {
        return null;
      }

      const createdTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: rule.type,
          amount: rule.amount,
          walletId: rule.walletId,
          categoryId: rule.categoryId,
          note: noteText.slice(0, 240),
          occurredAt: new Date(),
        },
      });

      return { transactionId: createdTx.id, nextDueDate: nextDue.toISOString() };
    });

    if (!result) {
      return NextResponse.json(
        { error: "This recurring cycle was already recorded." },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Recurring record POST error:", error);
    return NextResponse.json(
      { error: "Failed to record recurring entry" },
      { status: 500 },
    );
  }
}
