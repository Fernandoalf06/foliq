import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { uuidSchema, walletUpdateSchema } from "@/lib/validators";

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
      return NextResponse.json({ error: "Invalid wallet ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = walletUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid wallet update" },
        { status: 400 },
      );
    }

    const existing = await prisma.wallet.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (parsed.data.isArchived === true && !existing.isArchived) {
      const activeCount = await prisma.wallet.count({
        where: { userId: user.id, isArchived: false },
      });
      if (activeCount <= 1) {
        return NextResponse.json(
          { error: "You must keep at least one active wallet" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.wallet.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      wallet: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        currency: updated.currency,
        initialBalance: Number(updated.initialBalance.toString()),
        isArchived: updated.isArchived,
      },
    });
  } catch (error) {
    console.error("Wallet PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update wallet" },
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
      return NextResponse.json({ error: "Invalid wallet ID" }, { status: 400 });
    }

    const existing = await prisma.wallet.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!existing.isArchived) {
      const activeCount = await prisma.wallet.count({
        where: { userId: user.id, isArchived: false },
      });
      if (activeCount <= 1) {
        return NextResponse.json(
          { error: "You must keep at least one active wallet" },
          { status: 400 },
        );
      }
    }

    const txCount = await prisma.transaction.count({
      where: {
        userId: user.id,
        OR: [{ walletId: id }, { targetWalletId: id }],
      },
    });

    if (txCount > 0) {
      await prisma.wallet.update({
        where: { id },
        data: { isArchived: true },
      });
      return NextResponse.json({ archived: true });
    }

    await prisma.wallet.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Wallet DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove wallet" },
      { status: 500 },
    );
  }
}
