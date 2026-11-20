import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionCreateSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid transaction data" },
        { status: 400 },
      );
    }

    const { type, amount, walletId, targetWalletId, categoryId, note, occurredAt } =
      parsed.data;

    // Verify ownership of source wallet
    const sourceWallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: user.id, isArchived: false },
    });
    if (!sourceWallet) {
      return NextResponse.json(
        { error: "Source wallet not found" },
        { status: 404 },
      );
    }

    if (type === "TRANSFER" && targetWalletId) {
      const destinationWallet = await prisma.wallet.findFirst({
        where: { id: targetWalletId, userId: user.id, isArchived: false },
      });
      if (!destinationWallet) {
        return NextResponse.json(
          { error: "Destination wallet not found" },
          { status: 404 },
        );
      }
    }

    if (type !== "TRANSFER" && categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: user.id, type },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Selected category does not match transaction type" },
          { status: 400 },
        );
      }
    }

    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        type,
        amount,
        walletId,
        targetWalletId: type === "TRANSFER" ? targetWalletId ?? null : null,
        categoryId: type === "TRANSFER" ? null : categoryId ?? null,
        note: note ?? "",
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
      include: {
        wallet: { select: { id: true, name: true, type: true } },
        targetWallet: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    return NextResponse.json(
      {
        transaction: {
          id: created.id,
          type: created.type,
          amount: Number(created.amount.toString()),
          note: created.note,
          occurredAt: created.occurredAt.toISOString(),
          wallet: created.wallet,
          targetWallet: created.targetWallet,
          category: created.category,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Transaction POST error:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 },
    );
  }
}
